import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, startGame, submitActionWindowSkill,
  submitPlayerAction, validateAction, FATE_ELEMENT, FATE_EYE_CARD_ID, FATE_EYE_GATHER, FATE_EYE_STRIKE, FATE_EYE_SWEEP,
  FATE_EYE_WARD, getActiveSkillCount, getSkill, previewPlayerAttackStats, type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { changeElementAmount, getElementAmount } from "../packages/shared/src/engine/elementResources";
import { getOrdinaryDefenseTotal } from "../packages/shared/src/engine/starDragon";
import { combatValue } from "../packages/shared/src/engine/combatValues";
import { grantYuanVoidDodge } from "../packages/shared/src/engine/yuan";

const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const skill = (skillId: string, options: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...options });

function advance(state: GameState, phase?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 60 && state.phase === "action_window" && state.activeTimingPhase !== phase; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(abilityA?: string, abilityB?: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false, initialHp: 40 });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ instanceId: "fate-a", cardId: FATE_EYE_CARD_ID, ...(abilityA ? { onlyAbilityId: abilityA } : {}) }];
  if (abilityB) state.players[1]!.bigCards = [{ instanceId: "fate-b", cardId: FATE_EYE_CARD_ID, onlyAbilityId: abilityB }];
  state = advance(startGame(state));
  for (const player of state.players) player.cakes = 12;
  return state;
}

function turn(state: GameState, ...actions: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    if (player.status !== "alive" || state.phase !== "collecting_actions") continue;
    const response = submitPlayerAction(state, player.id, actions[index] ?? cake);
    assert.equal(response.error, undefined);
    state = response.state;
  }
  return state;
}

test("积累命元素免费且每次仅加1命，和单体攻击使用两个独立入口", () => {
  let state = fixture(FATE_EYE_GATHER);
  const owner = state.players[0]!, target = state.players[1]!;
  assert.equal(validateAction(state, owner.id, skill(FATE_EYE_GATHER, { stacks: 2 })).ok, false);
  assert.equal(validateAction(state, owner.id, skill(FATE_EYE_STRIKE, { targetId: target.id })).ok, false);
  state = advance(turn(state, skill(FATE_EYE_GATHER)));
  assert.equal(getElementAmount(state.players[0], FATE_ELEMENT), 1);
  assert.equal(state.players[0]!.cakes, 12);
  assert.equal(validateAction(state, owner.id, skill(FATE_EYE_STRIKE, { targetId: target.id })).ok, true);
});

test("命按重消耗元素并叠加攻等，任意防可挡下", () => {
  let state = fixture(FATE_EYE_GATHER);
  const owner = state.players[0]!, target = state.players[1]!;
  changeElementAmount(owner, FATE_ELEMENT, 3);
  const attack = skill(FATE_EYE_STRIKE, { targetId: target.id, stacks: 3 });
  const submitted = submitPlayerAction(state, owner.id, attack);
  assert.equal(submitted.error, undefined);
  const stats = previewPlayerAttackStats(submitted.state, owner.id).stats[0]!;
  assert.deepEqual([stats.power, stats.level, stats.defenseTag], [45, 45, "any"]);
  state = advance(turn(state, attack, stone));
  assert.equal(state.players[1]!.hp, 40);
  assert.equal(getElementAmount(state.players[0], FATE_ELEMENT), 0);
  assert.equal(state.players[0]!.cakes, 12);
});

test("命只在使用当回合提供后盾，能挡住补刀", () => {
  let state = fixture(FATE_EYE_GATHER);
  const owner = state.players[0]!, victim = state.players[2]!;
  changeElementAmount(owner, FATE_ELEMENT, 1);
  state = advance(turn(state, skill(FATE_EYE_STRIKE, { targetId: victim.id }), sha(owner.id), stone));
  assert.equal(state.players[0]!.hp, 40);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === owner.id && event.blockKind === "invulnerable"));
  assert.equal(getActiveSkillCount(state.players[0], "1025"), 0);
  state = advance(turn(state, cake, sha(owner.id)));
  assert.equal(state.players[0]!.hp, 39);
});

test("群攻任意防，对持有者在防御或回避前免疫并加5防御", () => {
  let state = fixture(FATE_EYE_WARD, FATE_EYE_SWEEP);
  const owner = state.players[0]!, source = state.players[1]!;
  changeElementAmount(source, FATE_ELEMENT, 2);
  state = advance(turn(state, stone, skill(FATE_EYE_SWEEP), stone));
  assert.equal(state.players[0]!.hp, 40);
  assert.equal(state.players[2]!.hp, 40);
  assert.equal(state.players[3]!.hp, 10);
  assert.deepEqual(getOrdinaryDefenseTotal(state.players[0]!), combatValue(5));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === owner.id && event.blockKind === "immune"));
  assert.ok(!state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === owner.id && event.blockKind === "block"));

  state = fixture(FATE_EYE_WARD, FATE_EYE_GATHER);
  const target = state.players[0]!;
  grantYuanVoidDodge(state, target);
  changeElementAmount(state.players[1]!, FATE_ELEMENT, 1);
  state = advance(turn(state, cake, skill(FATE_EYE_STRIKE, { targetId: target.id })));
  assert.deepEqual(getOrdinaryDefenseTotal(state.players[0]!), combatValue(5));
  assert.ok(!state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === target.id && event.blockKind === "dodge"));
});

test("技能攻击对撞抵消时不加防御，胜出后到达命中判定才免疫", () => {
  let state = fixture(undefined, FATE_EYE_GATHER);
  const [a, b] = state.players;
  changeElementAmount(a!, FATE_ELEMENT, 1);
  changeElementAmount(b!, FATE_ELEMENT, 1);
  state = advance(turn(state, skill(FATE_EYE_STRIKE, { targetId: b!.id }), skill(FATE_EYE_STRIKE, { targetId: a!.id })));
  assert.ok(state.eventLog.some((event) => event.type === "clash" && event.result.includes("互相抵消")));
  assert.deepEqual(getOrdinaryDefenseTotal(state.players[0]!), []);

  state = fixture(FATE_EYE_WARD, FATE_EYE_GATHER);
  const [first, second] = state.players;
  changeElementAmount(second!, FATE_ELEMENT, 1);
  state = advance(turn(state, sha(second!.id), skill(FATE_EYE_STRIKE, { targetId: first!.id })));
  assert.equal(state.players[0]!.hp, 40);
  assert.deepEqual(getOrdinaryDefenseTotal(state.players[0]!), combatValue(5));
});

test("锁定技、控制技和限定技的无视只影响与持有者相关的结算", () => {
  let state = fixture(FATE_EYE_WARD);
  const source = state.players[1]!;
  appendSkillInstances(source!, ["1015", "1044"]);
  state = advance(turn(state, cake, { type: "attack", attackId: "wan_jian", stacks: 1 }), "turn_change_action");
  state = submitActionWindowSkill(state, source!.id, skill("1044", { switchActionIndex: 0, attackStatModifier: "power_times_3_level_to_zero" }));
  state = advance(state);
  assert.equal(state.players[0]!.hp, 38);
  assert.ok(state.players[2]!.hp < 38);
  assert.deepEqual(getOrdinaryDefenseTotal(state.players[0]!), []);

  state = fixture(FATE_EYE_WARD);
  appendSkillInstances(state.players[1]!, ["1012"]);
  state = advance(turn(state), "turn_end_action");
  state = advance(submitActionWindowSkill(state, state.players[1]!.id, skill("1012")));
  assert.equal(state.players[0]!.hp, 40);
  assert.equal(state.players[2]!.hp, 39);
  assert.ok(!getSkill(FATE_EYE_WARD)?.description.includes("先制"));
});
