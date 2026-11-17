import assert from "node:assert/strict";
import { test } from "node:test";
import { getLifeEffects } from "../packages/shared/src/engine/lifeEffects";
import {
  ABYSS_CARD_ID, addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer,
  getActiveFusionCount, getActiveSkillCount, getFusionSkillId, getSkillUseLimit, GREED_CHAIN_ID, KAIGE_CARD_ID, KAIGE_HOLY_ID,
  LIFE_CHANNEL_ID, SIPHON_ABYSS_ID, SOUL_PACT_CARD_ID, SOUL_SINK_ID, SOUL_SIPHON_ID, startGame, submitActionWindowSkill, submitPlayerAction,
  TIANMANG_CAKE_ID, TIANMANG_CARD_ID, TIANMANG_ELEMENT, type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { addSpareLife, hasKaigeAbility } from "../packages/shared/src/engine/kaige";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { removeStateCategory, stateHasCategory } from "../packages/shared/src/engine/effectCategories";
import { getOrdinaryDefenseTotal } from "../packages/shared/src/engine/starDragon";
import { combatValue } from "../packages/shared/src/engine/combatValues";
import { GREED_CHAIN_STATE, LIFE_CHANNEL_STATE, SIPHON_ABYSS_STATE, siphonRevivalUses } from "../packages/shared/src/engine/siphon";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const cast = (skillId: string, targetId?: string): SkillAction => ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) });
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const player = (state: GameState, id: string) => state.players.find((entry) => entry.id === id)!;

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; i < 100 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++)
    state = advanceActionWindow(state);
  return state;
}

function setup(opponent?: string) {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 3, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  const [a, b, c, d] = state.players.map(({ id }) => id) as [string, string, string, string];
  player(state, a).bigCards = [{ instanceId: "abyss-test", cardId: ABYSS_CARD_ID }];
  if (opponent) player(state, b).bigCards = [{ instanceId: "target-card", cardId: opponent }];
  state = advance(startGame(state));
  for (const entry of state.players) { entry.hp = 30; entry.cakes = 30; }
  return { state, a, b, c, d };
}

function reveal(state: GameState, moves: Record<string, PlayerAction>): GameState {
  state = advance(state);
  for (const { id } of state.players.filter((entry) => entry.status === "alive")) {
    state = submitPlayerAction(state, id, moves[id] ?? cake).state;
  }
  return state;
}

test("传承的轮回吞噬群吸6，每层博学者只为这份群吸乘4", () => {
  let { state, a, b, c } = setup();
  assert.equal(getActiveFusionCount(player(state, a), "轮回吞噬"), 1);
  assert.equal(getActiveFusionCount(player(state, a), "博学者之怒"), 0);
  for (const entry of state.players) entry.hp = 200;
  for (let i = 0; i < 2; i++) grantInitializedSkill(state, a, getFusionSkillId("博学者之怒"), "回归测试");
  grantInitializedSkill(state, a, getFusionSkillId("魔域"), "回归测试");
  state.roundNumber = 3;
  state = advance(reveal(state, { [c]: sha(b) }));
  const damages = state.eventLog.filter((event) => event.type === "damage" && event.sourceId === a);
  assert.deepEqual(damages.filter((event) => event.attackName === "轮回吞噬").map((event) => event.amount), [96, 96, 96]);
  assert.deepEqual(damages.filter((event) => event.attackName === "魔域").map((event) => event.amount), [4, 4, 4]);
});

test("生命通道挂在施术者身上，从下一回合起共吸20次，不重开", () => {
  let { state, a, b } = setup();
  state = advance(reveal(state, { [a]: cast(LIFE_CHANNEL_ID, b) }), "turn_end_action");
  assert.equal(player(state, b).hp, 30);
  assert.ok(player(state, a).buffs.some((buff) => buff.stateType === LIFE_CHANNEL_STATE && stateHasCategory(buff, "positive")));
  assert.ok(!player(state, b).buffs.some((buff) => buff.stateType === LIFE_CHANNEL_STATE));
  state = advance(state);
  assert.equal(player(state, b).hp, 29);
  for (let i = 0; i < 20; i++) state = advance(reveal(state, {}));
  assert.equal(player(state, b).hp, 10);
  assert.equal(player(state, a).hp, 50);
  assert.equal(state.roundNumber, 1);
});

test("灵魂虹吸可被小防挡住，未防住时拿走最新的凯歌命及圣洁", () => {
  let { state, a, b, c } = setup(KAIGE_CARD_ID);
  const before = player(state, b).spareLives!.length;
  state = advance(reveal(state, { [a]: cast(SOUL_SIPHON_ID, b), [b]: small }));
  assert.equal(player(state, b).spareLives?.length, before);
  state = advance(reveal(state, { [a]: cast(SOUL_SIPHON_ID, b) }));
  assert.equal(player(state, b).spareLives?.length, before - 1);
  assert.ok(getLifeEffects(player(state, a).spareLives![0]!).some((effect) =>
    effect.kind === "kaige" && effect.transferredAbilities?.includes(KAIGE_HOLY_ID)));
  assert.equal(hasKaigeAbility(player(state, a), KAIGE_HOLY_ID), false);
  player(state, a).hp = 0;
  player(state, c).cakes = 1;
  state = advance(reveal(state, { [c]: sha(a) }));
  assert.ok(hasKaigeAbility(player(state, a), KAIGE_HOLY_ID));
  assert.ok(!player(state, a).bigCards?.some((card) => card.cardId === KAIGE_CARD_ID));
});

test("灵魂虹吸保留旧存档的魂沉备用命及其已用次数", () => {
  let { state, a, b, c } = setup(SOUL_PACT_CARD_ID);
  const donor = player(state, b);
  const original = donor.bigCards![0]!;
  original.abilityUses = { [SOUL_SINK_ID]: 2 };
  donor.spareLives = [{ hp: 9, soulLife: { cardInstanceId: original.instanceId, abilityId: SOUL_SINK_ID, uses: { [SOUL_SINK_ID]: 1 } } }];
  state = advance(reveal(state, { [a]: cast(SOUL_SIPHON_ID, b) }));
  assert.equal(player(state, b).spareLives?.length, 0);
  const recipient = player(state, a);
  const soul = getLifeEffects(recipient.spareLives![0]!).find(({ kind }) => kind === "soul");
  assert.equal(soul?.uses[SOUL_SINK_ID], 2);
  assert.notEqual(soul?.cardInstanceId, original.instanceId);
  recipient.hp = 0;
  state = advance(reveal(state, { [c]: sha(a) }));
  assert.equal(player(state, a).hp, 9);
  assert.deepEqual(player(state, a).bigCards?.map(({ onlyAbilityId }) => onlyAbilityId), [SOUL_SINK_ID]);
});

test("吸走当前命并普通致死，另转移1次治愈术，偷来的次数可以实际使用", () => {
  let { state, a, b, c } = setup();
  appendSkillInstances(player(state, b), ["1063"]);
  state = advance(reveal(state, { [a]: cast(SOUL_SIPHON_ID, b) }));
  assert.equal(player(state, b).defeatLevel, 1);
  assert.equal(player(state, a).spareLives?.[0]?.hp, 30);
  assert.equal(player(state, b).buffs.find((buff) => buff.id === "skill_used:1063")?.stacks, 1);
  assert.equal(getActiveSkillCount(player(state, a), "1063"), 1);
  assert.equal(siphonRevivalUses(player(state, a), "1063"), 1);
  player(state, a).spareLives = [];
  player(state, a).hp = 0;
  player(state, c).cakes = 1;
  state = advance(reveal(state, { [c]: sha(a) }), "revival_action");
  state = submitActionWindowSkill(state, a, cast("1063"));
  assert.equal(player(state, a).hp, 18);
  assert.equal(siphonRevivalUses(player(state, a), "1063"), 0);
});

test("生命或次数扣不动时，各自都不给施术者增加", () => {
  let { state, a, b } = setup();
  const victim = player(state, b);
  victim.spareLives = [{ hp: 11 }];
  appendSkillInstances(victim, ["1063"]);
  victim.buffs.push({ id: "test_loss_immunity", name: "免失去", stacks: 1, immuneEffectCategories: ["life_loss", "skill_loss"] });
  state = advance(reveal(state, { [a]: cast(SOUL_SIPHON_ID, b) }));
  assert.equal(player(state, b).spareLives?.length, 1);
  assert.equal(getSkillUseLimit(player(state, b), "1063"), 1);
  assert.equal(player(state, a).spareLives?.length ?? 0, 0);
  assert.equal(siphonRevivalUses(player(state, a), "1063"), 0);
});

test("贪婪锁链单向共享加血、防御值、多余命和良好，收益不会再沿锁链传递", () => {
  let { state, a, b, c } = setup(TIANMANG_CARD_ID);
  state = advance(reveal(state, { [a]: cast(GREED_CHAIN_ID, b) }));
  const chain = player(state, b).buffs.find((buff) => buff.stateType === GREED_CHAIN_STATE)!;
  assert.ok(chain && !stateHasCategory(chain, "positive") && !stateHasCategory(chain, "negative"));
  assert.equal(chain.expiresAtRound, state.roundNumber + 4);
  addSpareLife(player(state, b), { hp: 11 }, state);
  addSpareLife(player(state, a), { hp: 9 }, state);
  assert.deepEqual(player(state, a).spareLives?.map(({ hp }) => hp), [11, 9]);
  assert.deepEqual(player(state, b).spareLives?.map(({ hp }) => hp), [11]);
  player(state, c).buffs.push({ ...chain, id: "second-chain", sourcePlayerId: b });
  addSpareLife(player(state, c), { hp: 7 }, state);
  assert.deepEqual(player(state, b).spareLives?.map(({ hp }) => hp), [11, 7]);
  assert.deepEqual(player(state, a).spareLives?.map(({ hp }) => hp), [11, 9]);
  appendSkillInstances(player(state, b), ["1047", "1065"]);
  state = advance(reveal(state, {}), "turn_change_action");
  state = submitActionWindowSkill(state, b, cast("1047"));
  assert.deepEqual(getOrdinaryDefenseTotal(player(state, a)), combatValue(4));
  state = advance(state, "turn_end_action");
  state = submitActionWindowSkill(state, b, cast("1065"));
  assert.equal(player(state, a).hp, 36);
  state = advance(state);
  changeElementAmount(player(state, b), TIANMANG_ELEMENT, 99);
  state = advance(reveal(state, { [b]: cast(TIANMANG_CAKE_ID) }), "turn_end_action");
  assert.ok(player(state, a).buffs.some((buff) => buff.stateType === "tianmang_cake_growth"));
});

test("虹吸之渊首回合生效、后续免费自动出招，良好清除后停止", () => {
  let { state, a, b, c } = setup();
  player(state, b).spareLives = [{ hp: 11 }, { hp: 12 }, { hp: 13 }];
  player(state, a).hp = 0;
  appendSkillInstances(player(state, a), ["1068"]);
  appendSkillInstances(player(state, c), ["1005"]);
  state = advance(reveal(state, { [a]: cast(SIPHON_ABYSS_ID, b), [b]: small, [c]: sha(a) }), "turn_end_action");
  assert.ok(player(state, a).buffs.some((buff) => buff.stateType === SIPHON_ABYSS_STATE && stateHasCategory(buff, "positive")));
  assert.equal(player(state, a).status, "alive");
  assert.equal(player(state, a).hp, 1);
  assert.equal(player(state, b).spareLives?.length, 3);
  state = advance(state);
  state = advance(reveal(state, {}), "turn_end_action");
  assert.equal(player(state, b).spareLives?.length, 2);
  assert.equal(player(state, a).cakes, 1);
  removeStateCategory(player(state, a), "positive");
  state = advance(reveal(state, {}), "turn_end_action");
  assert.equal(player(state, b).spareLives?.length, 2);
});
