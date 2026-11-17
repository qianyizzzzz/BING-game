import assert from "node:assert/strict";
import { test } from "node:test";
import { addPlayerToGame, advanceActionWindow, beginActionPrompt, createGame, createPlayer, getActiveFusionCount, getActiveSkillCount,
  getAttackActionCost, getFreeMoveChoices, startGame, submitActionWindowSkill, submitPlayerAction, validateAction,
  type ActionSubmission, type GameState, type SkillAction } from "../packages/shared/src";
import { changeSwarmInsects, produceQueenInsects, swarmInventory } from "../packages/shared/src/engine/swarm";
import { SWARM_CARD_ID, SWARM_RETURN_ID, VETERAN_DECENCY_ID, VETERAN_SHATTER_ID, VETERAN_SHATTER_USES } from "../packages/shared/src/engine/swarmIds";
import { getOrdinaryDefenseTotal } from "../packages/shared/src/engine/starDragon";
import { combatValue } from "../packages/shared/src/engine/combatValues";
import { appendSkillInstances } from "../packages/shared/src/engine/skillInventory";

const cake = { type: "gain_cake" } as const;
const guard = (defense: "small" | "stone" | "youtiao" | "rebound", targetId?: string) =>
  ({ type: "defense", defense, ...(targetId ? { targetId } : {}) } as const);
const cast = (skillId: string, targetId?: string): SkillAction => ({ type: "skill", skillId, targetId, stacks: 1 });
const attack = (targetId: string) => ({ type: "attack", attackId: "sha", targetId, stacks: 1 } as const);

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 80; i++) state = advanceActionWindow(state);
  return state;
}

function setup(otherSwarm = false): GameState {
  let state = createGame("虫", { skillMode: "big_test_select", skillCount: 1, initialHp: 18, firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  state.players[0]!.bigCards = [{ cardId: SWARM_CARD_ID, instanceId: "swarm" }];
  if (otherSwarm) state.players[1]!.bigCards = [{ cardId: SWARM_CARD_ID, instanceId: "other-swarm" }];
  return drain(startGame(state));
}

function turn(state: GameState, ...actions: ActionSubmission[]): GameState {
  for (const [index, action] of actions.entries()) {
    const id = state.players[index]!.id;
    const validation = validateAction(state, id, action);
    assert.equal(validation.ok, true, validation.error);
    state = submitPlayerAction(state, id, action).state;
  }
  return drain(state);
}

test("发放实际四融合及梵钟，节操提供碎机会，碎与日积飞虫并减免分数饼", () => {
  let state = setup();
  const [owner, enemy] = state.players;
  owner!.cakes = 30;
  assert.equal(getActiveFusionCount(owner, "猥琐老司机"), 1);
  for (const id of ["1080", "1081", "1082", "1083", "1084", "1085", VETERAN_DECENCY_ID, VETERAN_SHATTER_ID])
    assert.equal(getActiveSkillCount(owner, id), 1);
  changeSwarmInsects(owner!, "fly", 2);
  assert.equal(getAttackActionCost(state, owner!, attack(enemy!.id)), 0.5);
  assert.equal(validateAction(state, owner!.id, cast(VETERAN_SHATTER_ID, enemy!.id)).ok, false);
  state = turn(state, cast(VETERAN_DECENCY_ID, enemy!.id), cake, cake);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === VETERAN_SHATTER_USES)?.stacks, 3);
  state = turn(state, cast(VETERAN_SHATTER_ID, enemy!.id), guard("youtiao"), cake);
  assert.equal(swarmInventory(state.players[0]!).fly, 3);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === VETERAN_SHATTER_USES)?.stacks, 2);
  state = turn(state, cast("1081", enemy!.id), guard("small"), cake);
  assert.equal(swarmInventory(state.players[0]!).fly, 4);
});

test("甲虫累积撸的攻击成长，并允许按对手累积钟罩", () => {
  let state = setup();
  const [owner, enemy] = state.players;
  owner!.cakes = 30;
  state = turn(state, cast("1084", enemy!.id), cake, cake);
  state.players[0]!.cakes = 30;
  state = turn(state, cast("1084", enemy!.id), cake, cake);
  assert.equal(state.players[0]!.buffs.find(({ id, sourcePlayerId }) => id === "jin_zhong_zhao" && sourcePlayerId === enemy!.id)?.stacks, 2);
  state.players[0]!.cakes = 30;
  state = turn(state, cast("1080", enemy!.id), cake, cake);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === "swarm_lu_power")?.stacks, 3);
  assert.equal(state.players[0]!.buffs.find(({ id }) => id === "lu_growth")?.stacks, 1);
});

test("甲虫逐笔减免法伤，跳虫对剩余实际伤害反伤，反噬不减免也不反伤", () => {
  let state = setup();
  const [owner, enemy] = state.players;
  appendSkillInstances(enemy!, ["1012", "1012"]);
  changeSwarmInsects(owner!, "beetle", 1);
  changeSwarmInsects(owner!, "hopper", 2);
  beginActionPrompt(state, "round_pre_interval_action");
  state = drain(submitActionWindowSkill(state, enemy!.id, cast("1012")));
  assert.equal(state.players[0]!.hp, 18);
  assert.equal(state.players[1]!.hp, 18);
  changeSwarmInsects(state.players[0]!, "beetle", -1);
  beginActionPrompt(state, "round_pre_interval_action");
  state = drain(submitActionWindowSkill(state, enemy!.id, cast("1012")));
  assert.equal(state.players[0]!.hp, 17);
  assert.equal(state.players[1]!.hp, 16);
  changeSwarmInsects(state.players[0]!, "beetle", 3);
  state.players[0]!.cakes = 5;
  state = turn(state, attack(owner!.id), cake, cake);
  assert.equal(state.players[0]!.hp, 16);
});

test("虫后各自从获取轮开始计时，满三轮生产一套", () => {
  const state = setup();
  const owner = state.players[0]!;
  changeSwarmInsects(owner, "queen", 1, 1);
  changeSwarmInsects(owner, "queen", 2, 2);
  produceQueenInsects(owner, 3);
  assert.deepEqual(swarmInventory(owner), { beetle: 0, fly: 0, hopper: 0, queen: 3 });
  produceQueenInsects(owner, 4);
  assert.deepEqual(swarmInventory(owner), { beetle: 1, fly: 1, hopper: 1, queen: 3 });
  produceQueenInsects(owner, 5);
  assert.deepEqual(swarmInventory(owner), { beetle: 3, fly: 3, hopper: 3, queen: 3 });
});

test("终招按扣虫前库存发免费机会，首回合抵消，五步正确时防住", () => {
  let state = setup();
  const [owner, defender, counter] = state.players;
  owner!.cakes = 20;
  counter!.cakes = 5;
  owner!.hp = 3;
  owner!.buffs.push({ id: "defense_value", name: "防御值", stacks: 3, defenseValue: combatValue(3) });
  changeSwarmInsects(owner!, "beetle", 3);
  changeSwarmInsects(owner!, "fly", 4);
  changeSwarmInsects(owner!, "hopper", 2);
  changeSwarmInsects(owner!, "queen", 1);
  assert.equal(validateAction(state, owner!.id, cast(SWARM_RETURN_ID)).ok, false);
  const finale = { ...cast(SWARM_RETURN_ID), swarmAllocation: { beetle: 3, fly: 4, hopper: 2, queen: 1 } };
  state = turn(state, finale, guard("small"), attack(owner!.id));
  assert.equal(state.players[0]!.hp, 18);
  assert.deepEqual(getOrdinaryDefenseTotal(state.players[0]!), combatValue(10));
  assert.deepEqual(swarmInventory(state.players[0]!), { beetle: 0, fly: 0, hopper: 0, queen: 0 });
  assert.deepEqual(Object.fromEntries(getFreeMoveChoices(state.players[0]).flatMap(({ move, remaining }) =>
    move.type === "skill" ? [[move.skillId, remaining]] : [])), { "1080": 3, "1081": 4, "1083": 2, "1082": 1 });
  assert.deepEqual(state.cannonDefenses?.map(({ attack, next }) => [attack.targetId, next]), [[defender!.id, "youtiao"]]);
  for (const defense of [guard("youtiao"), guard("stone"), cake, guard("rebound", counter!.id)])
    state = turn(state, cake, defense, cake);
  assert.equal(state.cannonDefenses?.length, 0);
  assert.equal(state.players[1]!.hp, 18);
  assert.equal(state.players[2]!.hp, 18);
});

test("防御顺序出错立即吃无限份1点，单只甲虫逐份减免", () => {
  let state = setup(true);
  const [owner, armored, plain] = state.players;
  owner!.cakes = 20;
  changeSwarmInsects(owner!, "beetle", 10);
  changeSwarmInsects(armored!, "beetle", 1);
  state = turn(state, { ...cast(SWARM_RETURN_ID), swarmAllocation: { beetle: 10 } }, cake, guard("small"));
  assert.equal(state.players[1]!.hp, 18);
  state = turn(state, cake, cake, guard("stone"));
  assert.equal(state.players[2]!.status, "dead");
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === plain!.id &&
    event.infiniteCopies && event.perCopyAmount === 1));
});

test("终招也与对向带等级的非攻击出招抵消", () => {
  let state = setup(true);
  const [owner, counter] = state.players;
  owner!.cakes = 20;
  counter!.cakes = 20;
  changeSwarmInsects(owner!, "beetle", 10);
  state = turn(state, { ...cast(SWARM_RETURN_ID), swarmAllocation: { beetle: 10 } },
    cast(VETERAN_DECENCY_ID, owner!.id), guard("small"));
  assert.equal(state.players[1]!.hp, 18);
  assert.equal(state.players[1]!.buffs.some(({ id }) => id === VETERAN_SHATTER_USES), false);
  assert.ok(state.eventLog.some((event) => event.type === "clash" && event.result.includes("万翼归巢与 节操 互相抵消")));
});
