import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANNIHILATION_CANNON_ID, addPlayerToGame, advanceActionWindow, createGame, createPlayer, getFusionSkillId,
  startGame, submitActionWindowSkill, submitPlayerAction, validateAction,
  type GameState, type PlayerAction, type SkillTimingPhase
} from "../packages/shared/src";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { STAR_WHEEL_CARD, STAR_WHEEL_REDIRECT } from "../packages/shared/src/engine/starWheelIds";
import { SWORD_ARRAY_CARD_ID, SWORD_ARRAY_EXECUTE_ID, SWORD_ARRAY_PLACE_ID } from "../packages/shared/src/engine/swordArrayIds";
import { changeSwarmInsects } from "../packages/shared/src/engine/swarm";
import { SWARM_CARD_ID, SWARM_RETURN_ID } from "../packages/shared/src/engine/swarmIds";
import { giveTianyeWing } from "../packages/shared/src/engine/tianye";
import { TIAN_YE_FALL_ID, TIAN_YE_REBOUND_LOCK } from "../packages/shared/src/engine/tianyeIds";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const rebound = (targetId: string): PlayerAction => ({ type: "defense", defense: "rebound", targetId });

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let steps = 0; steps < 80 && state.phase === "action_window"; steps++) {
    if (state.activeTimingPhase === stop) return state;
    state = advanceActionWindow(state);
  }
  assert.notEqual(state.phase, "action_window", `未退出 ${state.activeTimingPhase}`);
  return state;
}

function game(ownerCard?: string, targetCard?: string): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false, initialHp: 30 });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  if (ownerCard) state.players[0]!.bigCards = [{ cardId: ownerCard, instanceId: "owner-card" }];
  if (targetCard) state.players[1]!.bigCards = [{ cardId: targetCard, instanceId: "target-card" }];
  state = advance(startGame(state));
  for (const player of state.players) player.cakes = 30;
  return state;
}

function fall(state: GameState): void {
  giveTianyeWing(state.players[0]!, TIAN_YE_FALL_ID, state.turnNumber, "test-fall");
}

function reveal(state: GameState, ...moves: PlayerAction[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, { id, status }] of state.players.entries()) {
    if (status !== "alive") continue;
    state = submitPlayerAction(state, id, moves[index] ?? cake).state;
  }
  assert.equal(state.activeTimingPhase, "turn_change_action");
  return state;
}

test("变招改成反弹当场挂禁反弹，本回合仍可正常反弹", () => {
  let state = game();
  fall(state);
  const [owner, reflector] = state.players;
  grantInitializedSkill(state, reflector!.id, getFusionSkillId("天•幻"), "test");
  state = reveal(state, cake, small, sha(reflector!.id));
  const turn = state.turnNumber;
  state = submitActionWindowSkill(state, reflector!.id, {
    type: "skill", skillId: getFusionSkillId("虚幻"), stacks: 1, switchActionIndex: 0,
    switchToAction: rebound(owner!.id)
  });
  assert.deepEqual(state.players[1]!.buffs.filter(({ stateType }) => stateType === TIAN_YE_REBOUND_LOCK)
    .map(({ moveBlockedFromTurn }) => moveBlockedFromTurn), [turn + 1]);
  state = advance(state);
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" && event.reflectedTargetId === owner!.id));
  assert.match(validateAction(state, reflector!.id, rebound(owner!.id)).error ?? "", /绝坠之翼/);
});

test("变招触发的绝坠不良可先斗转，且返回同回合变招阶段", () => {
  let state = game(undefined, STAR_WHEEL_CARD);
  fall(state);
  const [owner, reflector] = state.players;
  grantInitializedSkill(state, reflector!.id, getFusionSkillId("天•幻"), "test");
  state = reveal(state, cake, small);
  const turn = state.turnNumber;
  state = submitActionWindowSkill(state, reflector!.id, {
    type: "skill", skillId: getFusionSkillId("虚幻"), stacks: 1, switchActionIndex: 0,
    switchToAction: rebound(owner!.id)
  });
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.equal(state.starWheelPendingStatuses?.length, 1);
  assert.equal(state.players[1]!.buffs.some(({ stateType }) => stateType === TIAN_YE_REBOUND_LOCK), false);
  state = submitActionWindowSkill(state, reflector!.id, {
    type: "skill", skillId: STAR_WHEEL_REDIRECT, stacks: 1,
    starWheelStatusId: state.starWheelPendingStatuses![0]!.id
  });
  state = advance(state, "turn_change_action");
  assert.equal(state.activeTimingPhase, "turn_change_action");
  assert.equal(state.turnNumber, turn);
  assert.equal(state.players.filter((player) => player.buffs.some(({ stateType }) =>
    stateType === TIAN_YE_REBOUND_LOCK)).length, 1);
  assert.equal(state.players[1]!.buffs.some(({ stateType }) => stateType === TIAN_YE_REBOUND_LOCK), false);
});

test("绝坠转换万翼归巢，去掉原招的特殊对撞、连续防御及无限份伤害", () => {
  let state = game(SWARM_CARD_ID);
  fall(state);
  const [owner, counter, ...others] = state.players;
  changeSwarmInsects(owner!, "beetle", 10);
  state = advance(reveal(state, {
    type: "skill", skillId: SWARM_RETURN_ID, stacks: 1, swarmAllocation: { beetle: 10 }
  }, sha(owner!.id), small));
  assert.ok(state.eventLog.some((event) => event.type === "clash" && !event.result.includes("互相抵消")));
  assert.equal(state.players.find(({ id }) => id === counter!.id)?.status, "alive");
  for (const target of others) {
    assert.equal(state.players.find(({ id }) => id === target.id)?.defeatLevel, 2);
    const hits = state.eventLog.filter((event) => event.type === "damage" && event.sourceId === owner!.id &&
      event.targetId === target.id && event.attackName === "万翼归巢");
    assert.equal(hits.length, 1);
    assert.ok(hits[0]?.type === "damage");
    assert.equal(hits[0].pointDefeatLevel, 2);
    assert.equal(Boolean(hits[0].infiniteCopies), false);
  }
  assert.equal(state.cannonDefenses?.length ?? 0, 0);
});

test("绝坠转换诛灭后，有阵目标也只承受退游点攻击", () => {
  let state = game(SWORD_ARRAY_CARD_ID);
  const [owner, target, ...others] = state.players;
  state = advance(reveal(state, { type: "skill", skillId: SWORD_ARRAY_PLACE_ID, stacks: 1, targetId: target!.id }));
  state.players[0]!.cakes = 30;
  fall(state);
  state = advance(reveal(state, { type: "skill", skillId: SWORD_ARRAY_EXECUTE_ID, stacks: 1, targetId: target!.id }));
  for (const opponent of [target!, ...others]) {
    const hits = state.eventLog.filter((event) => event.type === "damage" && event.sourceId === owner!.id &&
      event.targetId === opponent.id && event.attackName === "诛灭");
    assert.equal(hits.length, 1);
    assert.ok(hits[0]?.type === "damage");
    assert.equal(hits[0].pointDefeatLevel, 2);
  }
});

test("绝坠转换湮灭炮，保留指定目标的一次独立非伤害判定", (context) => {
  let state = game("10504");
  fall(state);
  const [owner, target, ...others] = state.players;
  changeElementAmount(owner!, "聚", 14);
  context.mock.method(Math, "random", () => 0.1);
  state = advance(reveal(state, {
    type: "skill", skillId: ANNIHILATION_CANNON_ID, stacks: 1, targetIds: [target!.id]
  }, stone, stone, stone));
  assert.equal(state.players.find(({ id }) => id === target!.id)?.defeatLevel, 4);
  for (const opponent of others) assert.equal(state.players.find(({ id }) => id === opponent.id)?.defeatLevel, 2);
  assert.equal(state.eventLog.filter((event) =>
    event.type === "system" && event.message.includes("聚能湮灭炮·直接退游")).length, 1);
  assert.equal(state.cannonDefenses?.length ?? 0, 0);
});
