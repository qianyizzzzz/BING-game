import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, createGame, createPlayer, getActiveSkillCount, getCakeGainAmount,
  getElementAmount, getSkillAttackStats, getTurnSkillActionCost, KURONG_ATTACK_ID,
  SAKURA_BLOOM_ID, SAKURA_ELEMENT, SAKURA_FALL_ID, SAKURA_FINALE_ID, SAKURA_RAIN_ID, SAKURA_SPRING_ID,
  startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState,
  type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { changeElementAmount, setElementValue } from "../packages/shared/src/engine/elementResources";
import { INFINITY_VALUE } from "../packages/shared/src/engine/combatValues";

const gain = { type: "gain_cake" } as const;
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const player = (state: GameState, index = 0) => state.players[index]!;

function drain(state: GameState, stop: (state: GameState) => boolean = () => false): GameState {
  for (let i = 0; i < 50 && state.phase === "action_window" && !stop(state); i++) state = advanceActionWindow(state);
  return state;
}

function fixture(cards = [["10531"], ["10504"], ["10510"]]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (let index = 1; index < cards.length; index++) state = addPlayerToGame(state, createPlayer(`玩家 ${index}`));
  for (const [index, owner] of state.players.entries())
    owner.bigCards = cards[index]!.map((cardId, n) => ({ cardId, instanceId: `card-${index}-${n}` }));
  state = drain(startGame(state));
  for (const owner of state.players) { owner.cakes = 15; owner.hp = 10; }
  return state;
}

function submit(state: GameState, ...moves: PlayerAction[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, owner] of state.players.entries())
    if (owner.status === "alive") state = submitPlayerAction(state, owner.id, moves[index] ?? gain).state;
  return state;
}

test("樱上限覆盖普通和符号元素来源，叠加容量后才可到 30", () => {
  const state = fixture();
  const owner = player(state);
  changeElementAmount(owner, SAKURA_ELEMENT, 100);
  assert.equal(getElementAmount(owner, SAKURA_ELEMENT), 20);
  setElementValue(owner, SAKURA_ELEMENT, INFINITY_VALUE);
  assert.equal(getElementAmount(owner, SAKURA_ELEMENT), 20);
  owner.bigCards!.push({ cardId: "10626", instanceId: "capacity" });
  changeElementAmount(owner, SAKURA_ELEMENT, 100);
  assert.equal(getElementAmount(owner, SAKURA_ELEMENT), 40);
});

test("同批两笔伤害致死各给 5 樱，并可在死亡窗口盲选大卡", () => {
  let state = fixture([["10531"], ["10504"], ["10510"], []]);
  const targetId = player(state, 1).id;
  player(state, 1).hp = 5;
  const sha = { type: "attack", attackId: "sha", targetId, stacks: 3 } as const;
  state = drain(submit(state, gain, gain, sha, sha), (next) => next.activeTimingPhase === "revival_action");
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(getElementAmount(player(state), SAKURA_ELEMENT), 10);
  const choices = toPublicGameState(state, player(state).id).sakuraCardChoices!;
  assert.deepEqual(choices.map(({ number, visibleCardId }) => [number, visibleCardId]), [[1, undefined]]);
  state = submitActionWindowSkill(state, player(state).id, cast(SAKURA_FALL_ID, { removeSkillInstanceIds: [choices[0]!.instanceId] }));
  assert.equal(getElementAmount(player(state), SAKURA_ELEMENT), 0);
  assert.equal(player(state, 1).bigCards?.length, 0);
});

test("狂乱绽放翻倍与一回合轮末倍率共享额度，并开放免费弃置", () => {
  let state = fixture();
  const targetId = player(state, 2).id;
  player(state).bigCards!.push({ cardId: "10626", instanceId: "capacity" });
  changeElementAmount(player(state), SAKURA_ELEMENT, 5);
  state = drain(submit(state, cast(SAKURA_BLOOM_ID), { type: "attack", attackId: "sha", targetId, stacks: 1 }),
    (next) => Boolean(next.sakuraTurnEndResponse));
  assert.ok(state.sakuraTurnEndResponse);
  assert.equal(getElementAmount(player(state), SAKURA_ELEMENT), 21);
  const choices = toPublicGameState(state, player(state).id).sakuraCardChoices!;
  const chosen = choices.find((choice) => choice.playerId === player(state, 1).id)!;
  assert.ok(choices.some((choice) => choice.playerId === player(state).id));
  state = submitActionWindowSkill(state, player(state).id, cast(SAKURA_FALL_ID, { removeSkillInstanceIds: [chosen.instanceId] }));
  assert.equal(getElementAmount(player(state), SAKURA_ELEMENT), 21);
  assert.equal(player(state, 1).bigCards?.length, 0);
  state = drain(state);
  assert.equal(state.roundNumber, 2);
  assert.equal(player(state).bigCards?.[0]?.abilityUseBonuses?.[SAKURA_RAIN_ID], 1);
});

test("樱之雨扣除当前命并跳过后续命，最后一命走普通死亡窗口", () => {
  let state = fixture([["10531"], ["10504"], ["10510"], []]);
  const owner = player(state);
  owner.bigCards![0]!.abilityUseBonuses = { [SAKURA_RAIN_ID]: 1 };
  owner.spareLives = [{ hp: 7 }, { hp: 8 }, { hp: 9 }];
  player(state, 1).spareLives = [{ hp: 4 }, { hp: 5 }, { hp: 6 }];
  changeElementAmount(owner, SAKURA_ELEMENT, 2);
  state = drain(submit(state, cast(SAKURA_RAIN_ID)));
  assert.equal(player(state, 1).hp, 5);
  assert.equal(player(state, 1).spareLives?.length, 1);
  assert.equal(player(state, 2).defeatLevel, 1);
  assert.equal(player(state).hp, 8);
  assert.equal(getElementAmount(player(state), SAKURA_ELEMENT), 0);
});

test("春之歌永久挂状态，刷新保留超过初始的剩余次数", () => {
  let state = fixture([["10531"], ["10501"], ["10510"]]);
  const fire = player(state, 1).bigCards![0]!;
  const thunder = player(state, 2).bigCards![0]!;
  fire.abilityUses = { "1050104": 1 };
  thunder.abilityUses = { "1051005": 1 };
  thunder.abilityUseBonuses = { "1051005": 4 };
  changeElementAmount(player(state), SAKURA_ELEMENT, 10);
  state = drain(submit(state, cast(SAKURA_SPRING_ID)));
  assert.equal(getActiveSkillCount(player(state, 1), "1050101"), 0);
  assert.equal(player(state).buffs.filter((buff) => buff.id === "spring_grass_boost").length, 1);
  state = drain(submit(state, cast(SAKURA_SPRING_ID)));
  assert.equal(player(state).buffs.filter((buff) => buff.id === "spring_grass_boost").length, 1);
  assert.equal(player(state, 2).bigCards![0]!.abilityUses?.["1051005"], 1);
});

test("春之歌只放大草系有利数值，保留招式原价和最低费用", () => {
  let state = fixture([["10531"], ["10516"], ["10510"]]);
  changeElementAmount(player(state), SAKURA_ELEMENT, 5);
  state = drain(submit(state, cast(SAKURA_SPRING_ID)));
  const grass = player(state, 1);
  const attack = getSkillAttackStats(KURONG_ATTACK_ID, 1, grass)!;
  assert.equal(attack.power, 12);
  assert.equal(attack.level, 20);
  assert.equal(attack.cost, 4);
  grass.cakes = 0;
  assert.equal(getCakeGainAmount(state, grass), 6);
  assert.equal(getTurnSkillActionCost(grass, cast(KURONG_ATTACK_ID), state), 1);
});

test("春之歌在当回合攻击判定前生效，已提交的冰火招式仍付费", () => {
  let state = fixture([["10531"], ["10501"], ["10510"]]);
  const targetId = player(state, 2).id;
  changeElementAmount(player(state), SAKURA_ELEMENT, 5);
  state = drain(submit(state, cast(SAKURA_SPRING_ID), cast("1050101", { targetId })));
  assert.equal(player(state, 1).cakes, 11);
  assert.equal(player(state, 2).hp, 10);
});

test("终招破除小空间、只清长期状态并按常规胜利先结算", () => {
  let state = fixture();
  const owner = player(state);
  owner.bigCards!.push({ cardId: "10626", instanceId: "capacity" });
  changeElementAmount(owner, SAKURA_ELEMENT, 30);
  player(state, 1).spaceId = "test-space";
  state.junengTargetLock = { targetId: owner.id, expiresAtRound: state.roundNumber + 3 };
  player(state, 2).buffs.push({ id: "defense_value", name: "防御值", stacks: 8 },
    { id: "burning", name: "烧伤", stateType: "burning", stacks: 1 });
  assert.throws(() => submit(state, cast(SAKURA_FINALE_ID, { removeSkillInstanceIds: ["card-1-0"] })), /2 张/);
  state = drain(submit(state, cast(SAKURA_FINALE_ID, { removeSkillInstanceIds: ["card-1-0", "card-2-0"] })));
  assert.equal(state.phase, "finished");
  assert.equal(player(state).status, "alive");
  assert.equal(player(state, 1).defeatLevel, 4);
  assert.equal(player(state, 1).spaceId, undefined);
  assert.equal(state.junengTargetLock, undefined);
  assert.ok(player(state, 2).buffs.some((buff) => buff.id === "defense_value"));
  assert.ok(!player(state, 2).buffs.some((buff) => buff.id === "burning"));
});
