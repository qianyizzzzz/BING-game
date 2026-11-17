import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount, startGame,
  submitPlayerAction, validateAction, type GameState, type PlayerAction
} from "../packages/shared/src";
import { BASE_ATTACKS, getStackedAttackStats } from "../packages/shared/src/engine/attacks";
import { attackLevelValue, attackPowerValue, combatValue, INFINITY_VALUE, RETIRE_VALUE } from "../packages/shared/src/engine/combatValues";
import { changeElementAmount, getElementAmount } from "../packages/shared/src/engine/elementResources";
import { shapeYoukaiAttack, startYoukaiRitual } from "../packages/shared/src/engine/youkai";
import {
  YOUKAI_CARD_ID, YOUKAI_ELEMENT, YOUKAI_FULL_ID, YOUKAI_FULL_STATE, YOUKAI_HALF_ID, YOUKAI_HALF_STATE,
  YOUKAI_LAYERS_ID, YOUKAI_RITUAL_ID, YOUKAI_RITUAL_STATE, YOUKAI_WIND_ID
} from "../packages/shared/src/engine/youkaiIds";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const youtiao = { type: "defense", defense: "youtiao" } as const;
const cast = (skillId: string, stacks = 1): PlayerAction => ({ type: "skill", skillId, stacks });
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 60; i++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window");
  return state;
}

function game(abilities: string[] = []): GameState {
  let state = createGame("妖", { skillMode: "big_test_select", skillCount: 6, initialHp: 18, firstTurnNoAttack: false });
  for (const name of ["乙", "丙"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = abilities.length ? abilities.map((id) => ({ cardId: YOUKAI_CARD_ID, instanceId: id, onlyAbilityId: id })) :
    [{ cardId: YOUKAI_CARD_ID, instanceId: "full-card" }];
  return drain(startGame(state));
}

function turn(state: GameState, ...moves: PlayerAction[]): GameState {
  state = drain(state);
  for (const [index, player] of state.players.entries()) {
    if (player.status !== "alive" || state.pendingActions[player.id] || state.phase !== "collecting_actions") continue;
    state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  }
  return drain(state);
}

function odds<T>(value: number, run: () => T): T {
  const original = Math.random;
  let calls = 0;
  Math.random = () => value + (++calls % 1000) * 1e-8;
  try { return run(); } finally { Math.random = original; }
}

function prepareRitual(state: GameState): void {
  const owner = state.players[0]!;
  owner.youkaiLayers = 100;
  owner.buffs.push({ id: YOUKAI_FULL_STATE, stateType: YOUKAI_FULL_STATE, name: "妖化", stacks: 1, sourceAbilityId: YOUKAI_FULL_ID });
  changeElementAmount(owner, YOUKAI_ELEMENT, 64);
}

test("沉淀主出招叠加，半妖化以余额即时启停并分别乘普通和技能攻击的攻等", () => {
  let state = game();
  const owner = state.players[0]!;
  changeElementAmount(owner, YOUKAI_ELEMENT, 6);
  const base = getStackedAttackStats(BASE_ATTACKS.sha, 1);
  assert.ok(owner.buffs.some(({ stateType }) => stateType === YOUKAI_HALF_STATE));
  const ordinary = shapeYoukaiAttack(owner, base);
  const skill = shapeYoukaiAttack(owner, { ...base, isSkill: true });
  assert.deepEqual(attackPowerValue(ordinary), combatValue(8));
  assert.deepEqual(attackLevelValue(ordinary), combatValue(8));
  assert.deepEqual(attackPowerValue(skill), combatValue(4));
  assert.deepEqual(attackLevelValue(skill), combatValue(4));
  state.players[1]!.cakes = 1;
  state = turn(state, cast(YOUKAI_LAYERS_ID, 2), sha(owner.id), cake);
  const after = state.players[0]!;
  assert.equal(after.youkaiLayers, 2);
  assert.equal(getElementAmount(after, YOUKAI_ELEMENT), 4);
  assert.equal(after.buffs.some(({ stateType }) => stateType === YOUKAI_HALF_STATE), false);
  assert.equal(after.hp, 17);
  const stats = shapeYoukaiAttack(after, base);
  assert.deepEqual(attackPowerValue(stats), combatValue(3));
  assert.deepEqual(attackLevelValue(stats), combatValue(5));
});

test("201 层沉淀的杀半妖化后造成 1616 点伤害，对撞按 3224 级结算", () => {
  let state = game();
  const [owner, target] = state.players;
  changeElementAmount(owner!, YOUKAI_ELEMENT, 201);
  state = turn(state, cast(YOUKAI_LAYERS_ID, 201));
  assert.equal(state.players[0]!.youkaiLayers, 201);
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 0);
  assert.ok(state.players[0]!.buffs.some(({ stateType }) => stateType === YOUKAI_HALF_STATE));

  state.players[0]!.cakes = 1;
  state.players[1]!.hp = 5000;
  state.players[2]!.cakes = 1;
  state = turn(state, sha(target!.id), cake, sha(owner!.id));
  assert.equal(state.players[1]!.hp, 3384);
  assert.equal(state.players[0]!.hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" &&
    event.targetId === owner!.id && event.protectionName === "半妖化·无视伤害"));

  state.players[0]!.cakes = 1;
  state.players[1]!.cakes = 1;
  const eventStart = state.eventLog.length;
  state = turn(state, sha(target!.id), sha(owner!.id));
  const events = state.eventLog.slice(eventStart);
  const damage = events.find((event) => event.type === "damage" && event.sourceId === owner!.id && event.targetId === target!.id);
  assert.ok(damage?.type === "damage");
  assert.equal(damage.amount, 1616 * 3223 / 3224);
  assert.ok(events.some((event) => event.type === "clash"));
});

test("低于门槛打断连续计数，连续六轮半妖化后失去半妖化子技能并自动妖化", () => {
  let state = game([YOUKAI_HALF_ID, YOUKAI_FULL_ID]);
  const runRound = () => {
    state.players[1]!.cakes = 1;
    state = turn(state, small, sha(state.players[2]!.id), cake);
  };
  changeElementAmount(state.players[0]!, YOUKAI_ELEMENT, 5);
  runRound();
  assert.equal(state.players[0]!.youkaiHalfRounds, 1);
  changeElementAmount(state.players[0]!, YOUKAI_ELEMENT, -1);
  changeElementAmount(state.players[0]!, YOUKAI_ELEMENT, 1);
  for (let i = 0; i < 5; i++) runRound();
  assert.equal(state.players[0]!.youkaiHalfRounds, 5);
  runRound();
  const owner = state.players[0]!;
  assert.equal(getActiveSkillCount(owner, YOUKAI_HALF_ID), 0);
  assert.ok(owner.buffs.some(({ stateType }) => stateType === YOUKAI_FULL_STATE));
  const stats = shapeYoukaiAttack(owner, getStackedAttackStats(BASE_ATTACKS.sha, 1));
  assert.deepEqual(attackPowerValue(stats), combatValue(16));
  assert.deepEqual(attackLevelValue(stats), combatValue(16));
});

test("妖化乘各段攻击，保留无等级和退游点伤害", () => {
  const state = game();
  prepareRitual(state);
  const owner = state.players[0]!;
  const base = getStackedAttackStats(BASE_ATTACKS.sha, 1);
  const stats = shapeYoukaiAttack(owner, { ...base, isSkill: true, level: 0, noClashLevel: true,
    damageParts: [1, 2, 0], damagePartValues: [combatValue(1), combatValue(2), RETIRE_VALUE] });
  assert.deepEqual(attackPowerValue(stats), combatValue(1616));
  assert.deepEqual(stats.damagePartValues, [combatValue(1616), combatValue(1632), RETIRE_VALUE]);
  assert.equal(stats.noClashLevel, true);
  assert.deepEqual(attackLevelValue(stats), []);
});

test("妖化无视低于无限的伤害，使用技能攻击当回合额外无视朝自己的普通攻击", () => {
  let state = game();
  prepareRitual(state);
  state.players[1]!.cakes = 10;
  state = turn(state, cast(YOUKAI_WIND_ID), { type: "attack", attackId: "wan_jian", stacks: 1 }, cake);
  assert.equal(state.players[0]!.hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" &&
    event.protectionName === "妖化·无视普通攻击"));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === state.players[2]!.id &&
    event.sourceId === state.players[1]!.id));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === state.players[0]!.id));
  assert.equal(state.players[0]!.youkaiLayers, 110);
  assert.deepEqual(attackLevelValue(shapeYoukaiAttack(state.players[0]!, { ...getStackedAttackStats(BASE_ATTACKS.sha, 1),
    levelValue: INFINITY_VALUE })), [{ exponent: 1, coefficient: 16 }, { exponent: 0, coefficient: 3520 }]);
});

test("鬼祭从发动当回合起续发八次，统一随机防法，层数只作门槛", () => {
  let state = game();
  const ownerId = state.players[0]!.id;
  assert.equal(validateAction(state, ownerId, cast(YOUKAI_RITUAL_ID)).ok, false);
  prepareRitual(state);
  assert.equal(validateAction(state, ownerId, cast(YOUKAI_RITUAL_ID)).ok, true);
  state = odds(0.5, () => turn(state, cast(YOUKAI_RITUAL_ID), youtiao, youtiao));
  assert.equal(getElementAmount(state.players[0]!, YOUKAI_ELEMENT), 0);
  assert.equal(state.players[0]!.youkaiLayers, 100);
  state.players[1]!.hp = -2;
  for (let i = 0; i < 7; i++) state = odds(0.5, () => turn(state, cake, youtiao, youtiao));
  assert.equal(state.players[0]!.buffs.some(({ stateType }) => stateType === YOUKAI_RITUAL_STATE), false);
  assert.equal(state.players[1]!.defeatLevel, 1);
  assert.equal(state.eventLog.filter((event) => event.type === "system" &&
    event.message.endsWith("的未央鬼祭本回合为油条防")).length, 8);
  assert.equal(state.eventLog.filter((event) => event.type === "system" && event.probabilityChecks?.skillId === YOUKAI_RITUAL_ID).length, 8);
});

test("回合末一次20%判定命中时，独立于当回合群攻防法并对两人造成退游法伤", () => {
  let state = game();
  prepareRitual(state);
  state = odds(0.1, () => turn(state, cast(YOUKAI_RITUAL_ID), small, small));
  assert.equal(state.players[1]!.defeatLevel, 2);
  assert.equal(state.players[2]!.defeatLevel, 2);
  const ticks = state.eventLog.filter((event) => event.type === "damage" && event.attackName === "未央鬼祭·回合末");
  assert.equal(ticks.length, 2);
  assert.ok(ticks.every((event) => event.type === "damage" && !event.attackDamage && event.pointDefeatLevel === 2));
});

test("鬼祭者退场时终止已有鬼祭，退场前的多份鬼祭不会互相覆盖", () => {
  let state = game();
  const [owner, attacker] = state.players;
  startYoukaiRitual(state, owner!, "first");
  startYoukaiRitual(state, owner!, "second");
  const juanzi = "1094";
  attacker!.cakes = 100;
  appendSkillInstances(attacker!, [juanzi]);
  state = odds(0.5, () => turn(state, cake, { type: "skill", skillId: juanzi, stacks: 1, targetId: owner!.id }, cake));
  assert.equal(state.players[0]!.defeatLevel, 2);
  assert.equal(state.players[0]!.buffs.some(({ stateType }) => stateType === YOUKAI_RITUAL_STATE), false);
});
