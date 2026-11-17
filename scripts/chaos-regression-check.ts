import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, CHAOS_ATTACK_ID, CHAOS_CARD_ID,
  CHAOS_DEFENSE_ID, CHAOS_ELEMENT, CHAOS_EXILE_ID, CHAOS_GAIN_ID, CHAOS_PAID_GAIN_ID, CHAOS_RELEASE_ID, CHAOS_WAVE_ID,
  createGame, createPlayer, enterActionWindow, getActiveFusionCount, getActiveSkillCount, getDefenseTotal, getElementAmount,
  hasChaosDefenseLock, JIHAN_CARD_ID, startGame, submitActionWindowSkill, submitPlayerAction, validateAction, WUJIN_CARD_ID,
  type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { CHAOS_GUARD, chaosReleaseCake, consumeChaosGuard } from "../packages/shared/src/engine/chaos";
import { removeStateCategory } from "../packages/shared/src/engine/effectCategories";
import { getStatusOverview } from "../packages/shared/src/engine/statusOverview";
import { getFreeMoveChoices } from "../packages/shared/src/engine/wujin";

const at = (state: GameState, index = 0) => state.players[index]!;
const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const small = { type: "defense", defense: "small" } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let index = 0; index < 80 && state.phase === "action_window"; index++) {
    if (state.activeTimingPhase === stop) return state.actionWindowMode === "prompt" ? enterActionWindow(state, at(state).id) : state;
    state = advanceActionWindow(state);
  }
  return state;
}

function game(cards = [[CHAOS_CARD_ID], [], [], []]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 3, firstTurnNoAttack: false });
  for (let index = 1; index < cards.length; index++) state = addPlayerToGame(state, createPlayer(`玩家${index}`));
  for (const [index, player] of state.players.entries()) {
    player.bigCards = cards[index]!.map((cardId) => ({ cardId, instanceId: `card-${index}-${cardId}` }));
  }
  state = drain(startGame(state));
  for (const player of state.players) {
    player.hp = 50;
    player.cakes = 20;
  }
  return state;
}

function turn(state: GameState, moves: PlayerAction[], stop?: SkillTimingPhase): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) if (player.status === "alive")
    state = submitPlayerAction(state, player.id, moves[index] ?? stone).state;
  return drain(state, stop);
}

function withRandom<T>(value: number, run: () => T): T {
  const original = Math.random;
  Math.random = () => value;
  try { return run(); } finally { Math.random = original; }
}

test("获得三份实技能，免费乱只能一重，付费每重换两乱", () => {
  let state = game();
  assert.equal(getActiveSkillCount(at(state), "1005"), 1);
  assert.equal(getActiveFusionCount(at(state), "魔域"), 1);
  assert.equal(validateAction(state, at(state).id, cast(CHAOS_GAIN_ID, { stacks: 2 })).ok, false);
  state = turn(state, [cast(CHAOS_GAIN_ID)]);
  assert.equal(getElementAmount(at(state), CHAOS_ELEMENT), 1);
  assert.equal(at(state).cakes, 20);
  state = turn(state, [cast(CHAOS_PAID_GAIN_ID, { stacks: 3 })]);
  assert.equal(getElementAmount(at(state), CHAOS_ELEMENT), 7);
  assert.equal(at(state).cakes, 14);
});

test("混乱世纪单独掷D100及每人D10，禁攻随防御值归零消失，太古反回仍带禁攻", () => {
  let state = game([[CHAOS_CARD_ID], ["10518"], [], []]);
  changeElementAmount(at(state), CHAOS_ELEMENT, 2);
  state = withRandom(.31, () => turn(state, [cast(CHAOS_DEFENSE_ID), cast("1051805"), stone, stone]));
  assert.equal(getDefenseTotal(at(state))[0]?.coefficient, 36);
  assert.equal(getDefenseTotal(at(state, 1)).length, 0);
  assert.equal(getDefenseTotal(at(state, 2))[0]?.coefficient, 4);
  assert.equal(state.eventLog.filter((event) => event.type === "system" && event.message.includes("混乱世纪 D10：")).length, 3);
  assert.ok(hasChaosDefenseLock(at(state), at(state).id));
  assert.ok(hasChaosDefenseLock(at(state, 2), at(state).id));
  at(state, 2).cakes = 20;
  assert.equal(validateAction(state, at(state, 2).id, sha(at(state).id)).ok, false);
  assert.ok(getStatusOverview(state, at(state, 2)).counted.some(({ label }) => label.includes("禁攻")));
  const casterHp = at(state).hp;
  const casterDefense = getDefenseTotal(at(state));
  state = turn(state, [stone, stone, { type: "attack", attackId: "wan_jian", stacks: 1 }, stone]);
  assert.equal(at(state).hp, casterHp);
  assert.deepEqual(getDefenseTotal(at(state)), casterDefense);
  at(state, 2).cakes = 20;
  at(state, 2).buffs = at(state, 2).buffs.filter((buff) => buff.id !== "defense_value");
  assert.equal(validateAction(state, at(state, 2).id, sha(at(state).id)).ok, true);

  state = game([[CHAOS_CARD_ID], [], []]);
  changeElementAmount(at(state), CHAOS_ELEMENT, 2);
  state = withRandom(.31, () => turn(state, [cast(CHAOS_DEFENSE_ID)]));
  assert.equal(getDefenseTotal(at(state))[0]?.coefficient, 32);
  assert.ok(!hasChaosDefenseLock(at(state), at(state).id));
  assert.equal(getDefenseTotal(at(state, 1)).length, 0);
});

test("混乱世纪逐人记录非攻击命中，自身的D100不计入", () => {
  for (const playerCount of [3, 4]) {
    const cards = [[CHAOS_CARD_ID, JIHAN_CARD_ID, WUJIN_CARD_ID], ...Array.from({ length: playerCount - 1 }, () => [])];
    let state = game(cards);
    const casterId = at(state).id;
    changeElementAmount(at(state), CHAOS_ELEMENT, 2);
    state = withRandom(.31, () => turn(state, [cast(CHAOS_DEFENSE_ID)], "turn_end_action"));
    const hits = playerCount === 4 ? 3 : 0;
    assert.equal(at(state).bigCards?.find(({ cardId }) => cardId === JIHAN_CARD_ID)?.jihanSeals ?? 0, hits);
    assert.equal(state.players.slice(1).filter((player) => hasChaosDefenseLock(player, casterId)).length, hits);
    assert.ok(!hasChaosDefenseLock(at(state), casterId));
    const free = getFreeMoveChoices(at(state));
    assert.equal(free.length, hits ? 1 : 0);
    if (hits) {
      assert.deepEqual(free[0]!.move, { type: "skill", skillId: CHAOS_DEFENSE_ID, stacks: 1 });
      assert.equal(free[0]!.remaining, hits);
    }
  }
});

test("D40按指定区间分配，零饼时只反弹小于无限的攻击", () => {
  assert.deepEqual(Array.from({ length: 40 }, (_, i) => chaosReleaseCake(i + 1)), [
    ...Array(12).fill(0), ...Array(6).fill(1), ...Array(6).fill(2), ...Array(4).fill(3),
    ...Array(4).fill(4), 5, 5, 6, 6, 7, 8, 9, 10
  ]);
  let state = game();
  changeElementAmount(at(state), CHAOS_ELEMENT, 1);
  const target = at(state).id;
  state = withRandom(0, () => turn(state, [cast(CHAOS_RELEASE_ID), sha(target)]));
  assert.equal(at(state).hp, 50);
  assert.equal(at(state, 1).hp, 49);
  assert.equal(getElementAmount(at(state), CHAOS_ELEMENT), 0);

  state = game();
  changeElementAmount(at(state), CHAOS_ELEMENT, 1);
  appendSkillInstances(at(state, 1), ["1026"]);
  state = withRandom(0, () => turn(state, [cast(CHAOS_RELEASE_ID), cast("1026", { targetId: at(state).id })]));
  assert.equal(at(state).hp, 50);
  assert.ok(!state.eventLog.some((event) => event.type === "attack_reflected" && event.originalTargetId === at(state).id));
});

test("流放是饼防非攻击，命中取消当回合伤害、保留费用、完整离场一轮", () => {
  let state = game();
  changeElementAmount(at(state), CHAOS_ELEMENT, 6);
  const targetId = at(state, 1).id;
  const otherId = at(state, 2).id;
  state = turn(state, [cast(CHAOS_EXILE_ID, { targetId }), cake]);
  assert.equal(at(state, 1).status, "alive");
  assert.equal(state.roundNumber, 1);
  assert.equal(getElementAmount(at(state), CHAOS_ELEMENT), 3);
  state = turn(state, [cast(CHAOS_EXILE_ID, { targetId }), stone, stone, sha(otherId)]);
  assert.equal(at(state, 1).defeatLevel, 2);
  assert.equal(at(state, 2).hp, 50);
  assert.equal(getElementAmount(at(state), CHAOS_ELEMENT), 0);
  assert.equal(state.roundNumber, 2);
  for (const player of state.players) player.cakes = 20;
  state = turn(state, [sha(otherId), stone, stone, stone]);
  assert.equal(state.roundNumber, 3);
  assert.equal(at(state, 1).status, "alive");
  assert.equal(at(state, 1).hp, 50);
});

test("太古的怒吼把流放转回发出者，原目标留在场上", () => {
  let state = game([[CHAOS_CARD_ID], ["10518"], [], []]);
  changeElementAmount(at(state), CHAOS_ELEMENT, 3);
  state = turn(state, [cast(CHAOS_EXILE_ID, { targetId: at(state, 1).id }), cast("1051805")]);
  assert.equal(at(state).defeatLevel, 2);
  assert.equal(at(state, 1).status, "alive");
  assert.equal(state.roundNumber, 2);
  assert.equal(getElementAmount(at(state), CHAOS_ELEMENT), 0);
});

test("乱之波动独立触发三项，只改所选出招，定向来招目标丢失", () => {
  let state = game();
  changeElementAmount(at(state), CHAOS_ELEMENT, 1);
  appendSkillInstances(at(state, 1), ["1031"]);
  const sourceId = at(state).id;
  const targetId = at(state, 1).id;
  state = turn(state, [sha(targetId), small, sha(sourceId), stone], "turn_change_action");
  state = withRandom(0, () => submitActionWindowSkill(state, sourceId, cast(CHAOS_WAVE_ID, { switchActionIndex: 0 })));
  assert.ok(at(state).buffs.some((buff) => buff.preventsTargetSelection));
  assert.equal(state.eventLog.filter((event) => event.type === "system" && event.probabilityChecks && event.message.includes("乱之波动")).length, 3);
  state = drain(state);
  assert.equal(at(state).hp, 50);
  assert.equal(at(state, 1).hp, 49);
  assert.ok(!at(state).buffs.some((buff) => buff.preventsTargetSelection));

  state = game();
  changeElementAmount(at(state), CHAOS_ELEMENT, 1);
  const caster = at(state).id, rival = at(state, 1).id;
  state = turn(state, [sha(rival), small, sha(caster), stone], "turn_change_action");
  state = withRandom(.2, () => submitActionWindowSkill(state, caster, cast(CHAOS_WAVE_ID, { switchActionIndex: 0 })));
  assert.ok(!at(state).buffs.some((buff) => buff.preventsTargetSelection));
  state = drain(state);
  assert.equal(at(state).hp, 49);
  assert.equal(at(state, 1).hp, 50);
});

test("魔闪命中从下轮起禁技且无法解除，未命中给下一轮五次专属防护", () => {
  let state = game();
  changeElementAmount(at(state), CHAOS_ELEMENT, 5);
  const ownerId = at(state).id;
  state = turn(state, [cast(CHAOS_ATTACK_ID), stone, small, stone], "turn_end_action");
  assert.equal(at(state, 2).hp, 40);
  assert.ok(at(state, 2).buffs.some((buff) => buff.stateType === "skill_disabled" && buff.chaosStartRound === state.roundNumber + 1));
  assert.equal(removeStateCategory(at(state, 2), "negative"), 0);
  state = drain(state);
  assert.equal(state.roundNumber, 2);
  assert.ok(at(state, 2).buffs.some((buff) => buff.id.startsWith("skill_disabled_until_round:") && buff.uncleansable));
  const guard = at(state).buffs.find((buff) => buff.stateType === CHAOS_GUARD && buff.sourcePlayerId === at(state, 1).id);
  assert.equal(guard?.stacks, 5);
  appendSkillInstances(at(state, 1), ["1034"]);
  appendSkillInstances(at(state, 3), ["1038"]);
  at(state).hp = 90;
  at(state, 1).cakes = 20;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, at(state, 1).id, cast("1034", { targetIds: [ownerId, at(state, 3).id] }));
  assert.equal(at(state).hp, 90);
  assert.equal(at(state).buffs.find((buff) => buff.stateType === CHAOS_GUARD && buff.sourcePlayerId === at(state, 1).id)?.stacks, 4);
  const sourceId = at(state, 1).id;
  assert.equal(consumeChaosGuard(state, at(state), at(state, 2).id, "other source"), false);
  for (let index = 0; index < 4; index++)
    assert.equal(consumeChaosGuard(state, at(state), sourceId, `skill ${index}`), "blocked");
  assert.equal(consumeChaosGuard(state, at(state), sourceId, "skill 3"), "cached");
  assert.equal(consumeChaosGuard(state, at(state), sourceId, "skill 4"), false);
});
