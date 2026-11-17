import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeSpaceTimeFields, addPlayerToGame, addSpaceTimeField, advanceActionWindow, createGame, createPlayer, getMoveBlockReason,
  appendSkillInstances, RAGING_WAVES_ID,
  SPACE_BURST, SPACE_SHATTER, SPACE_TIME_CHAOS, SPACE_TIME_GUARD, startGame,
  submitPlayerAction, TIME_CONFUSION, TIME_RIFT, validateAction, type GameState, type PlayerAction, type SkillAction
} from "../packages/shared/src";
import { spaceTimeProtection } from "../packages/shared/src/engine/spaceTime";

const gain = { type: "gain_cake" } as const;
const move = (skillId: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...extra });
const a = (state: GameState) => state.players[0]!;
function advance(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 70; i++) state = advanceActionWindow(state);
  return state;
}
function fixture(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  a(state).bigCards = [{ cardId: "10605", instanceId: "guardian" }];
  return advance(startGame(state));
}
function turn(state: GameState, ...moves: Array<PlayerAction | undefined>): GameState {
  const ids = state.players.map(({ id }) => id);
  for (const [index, id] of ids.entries()) {
    if (state.phase !== "collecting_actions") break;
    const player = state.players.find((entry) => entry.id === id);
    if (player?.status !== "alive" || state.pendingActions[id]) continue;
    player.cakes = 10;
    state = submitPlayerAction(state, id, moves[index] ?? gain).state;
  }
  return state;
}

test("时间裂缝必须声明双期限，对自己先制重开", () => {
  const state = fixture();
  const id = a(state).id;
  a(state).cakes = 10;
  delete state.preemptiveRestartSnapshot;
  assert.equal(validateAction(state, id, move(TIME_RIFT, { targetId: id })).ok, false);
  assert.equal(validateAction(state, id, move(TIME_RIFT, { targetId: id,
    spaceTimeDuration: { turns: 1000, rounds: 6 } })).ok, false);
  const next = submitPlayerAction(state, id, move(TIME_RIFT, { targetId: id,
    spaceTimeDuration: { turns: 1000, rounds: 5 } })).state;
  assert.equal(a(next).defeatLevel, 2);
  assert.equal(a(next).buffs.find(({ timeRiftDeadline }) => timeRiftDeadline)?.timeRiftDeadline?.round, state.roundNumber + 5);
  assert.equal(next.roundNumber, state.roundNumber + 1);
});

test("时间裂缝打向别人可以用油条挡，未防者暂时退游并按回合返回", () => {
  let state = fixture();
  const target = state.players[1]!.id;
  const rift = move(TIME_RIFT, { targetId: target, spaceTimeDuration: { turns: 2, rounds: 5 } });
  state = advance(turn(state, rift, { type: "defense", defense: "youtiao" }));
  assert.equal(state.players[1]!.status, "alive");
  state = advance(turn(state, rift));
  assert.equal(state.players[1]!.defeatLevel, 2);
  state = advance(turn(state));
  assert.equal(state.players[1]!.status, "alive");
});

test("空间爆破被石头防住后仍进入小空间，并按回合期限返回", () => {
  let state = fixture();
  const target = state.players[1]!;
  const burst = move(SPACE_BURST, { targetId: target.id, spaceTimeDuration: { turns: 2, rounds: 2 } });
  const hp = target.hp;
  state = advance(turn(state, burst, { type: "defense", defense: "stone" }));
  assert.equal(state.players[1]!.hp, hp);
  assert.ok(a(state).spaceId);
  assert.match(getMoveBlockReason(state, a(state))!, /不能出招/);
  state = advance(turn(state));
  assert.equal(a(state).spaceId, undefined);
});

test("空间爆破可以直接选择另一小空间的人", () => {
  let state = fixture();
  const target = state.players[1]!;
  target.spaceId = "others-space";
  state.smallSpaces = { "others-space": { name: "测试", kind: "self_isolation", expiresAtRound: state.roundNumber + 7, cakeMultiplier: 1 } };
  const burst = move(SPACE_BURST, { targetId: target.id, spaceTimeDuration: { turns: 1000, rounds: 2 } });
  a(state).cakes = 10;
  assert.equal(validateAction(state, a(state).id, burst).ok, true);
  state = advance(turn(state, burst));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === target.id && event.attackName === "空间爆破"),
    JSON.stringify(state.eventLog.slice(-20).map((event) => "message" in event ? event.message :
      event.type === "attack_blocked" ? [event.type, event.attackName, event.blockKind, event.protectionName] : event.type)));
});

test("1000回合的空间爆破仍在所选轮末强制返场", () => {
  let state = fixture();
  const id = a(state).id;
  const victim = state.players[1]!.id;
  const round = state.roundNumber;
  state = advance(turn(state, move(SPACE_BURST, { targetId: victim, spaceTimeDuration: { turns: 1000, rounds: 2 } }),
    { type: "defense", defense: "stone" }));
  assert.ok(a(state).spaceId);
  state = advance(turn(state, undefined, { type: "defense", defense: "self_destruct" }));
  assert.equal(state.roundNumber, round + 1);
  assert.ok(a(state).spaceId);
  state = advance(turn(state, undefined, undefined, { type: "defense", defense: "self_destruct" }));
  assert.equal(state.roundNumber, round + 2);
  assert.equal(state.players.find((player) => player.id === id)?.spaceId, undefined);
});

test("时间大混乱当回合扣费但延迟出招，同一份延迟到期后正常结算", () => {
  let state = fixture();
  const id = a(state).id;
  const hp = a(state).hp;
  const attack = { type: "attack", attackId: "sha", stacks: 1, targetId: id } as const;
  state = advance(turn(state, move(TIME_CONFUSION), attack));
  assert.equal(a(state).hp, hp);
  assert.equal(state.players[1]!.cakes, 9);
  assert.ok(state.players[1]!.buffs.some(({ sandDelayedMove }) => sandDelayedMove?.action.type === "attack"));
  state = advance(turn(state));
  assert.equal(a(state).hp, hp - 1);
});

test("时间大混乱延迟连续攻击的最后一段，保留原本防法", () => {
  let state = fixture();
  const owner = state.players[1]!;
  const targetId = a(state).id;
  const hp = a(state).hp;
  owner.bigCards = [{ cardId: "10509", instanceId: "wave", initialized: true }];
  owner.buffs.push({ id: "last-wave", name: "怒海狂涛", stacks: 1, stateType: "wave_attack",
    expiresAtTurn: state.turnNumber + 1, waveAttack: { skillId: RAGING_WAVES_ID, targetId, cardId: "wave",
      firstTurn: state.turnNumber - 2, power: [{ exponent: 0, coefficient: 3 }], level: [{ exponent: 0, coefficient: 9 }] } });
  state = advance(turn(state, move(TIME_CONFUSION)));
  assert.equal(a(state).hp, hp);
  assert.ok(state.players[1]!.buffs.some(({ sandDelayedMove }) => sandDelayedMove?.action.spaceTimeReplay?.wave));
  state = advance(turn(state, { type: "defense", defense: "stone" }));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === targetId &&
    event.attackName === "怒海狂涛"));
  assert.equal(a(state).hp, hp);
});

test("空间大破碎移除小空间，并按目标的原主空间邻座归属退游", () => {
  let state = fixture();
  const target = state.players[2]!;
  const neighbor = state.players[1]!.id;
  target.spaceId = "test-space";
  state.smallSpaces = { "test-space": { name: "测试", kind: "self_isolation", expiresAtRound: state.roundNumber + 7, cakeMultiplier: 1 } };
  state = advance(turn(state, move(SPACE_SHATTER, { spaceTimeSource: "left" })));
  assert.equal(state.players[2]!.spaceId, undefined);
  assert.equal(state.players[2]!.defeatLevel, 2);
  assert.ok(state.eventLog.some((event) => event.type === "player_died" && event.playerId === target.id && event.sourceId === neighbor));
  assert.deepEqual(state.smallSpaces, {});
});

test("混沌的每层保护独立并保留原效果，第七次形成共用计数", () => {
  const state = fixture();
  const source = a(state).id;
  addSpaceTimeField(state, source, move(TIME_CONFUSION));
  assert.equal(addSpaceTimeField(state, source, move(SPACE_SHATTER, { spaceTimeSource: "sky" })), 1);
  const active = (id: string) => id === SPACE_TIME_CHAOS || id === SPACE_TIME_GUARD;
  assert.equal(spaceTimeProtection(state, 1, active), undefined);
  assert.equal(spaceTimeProtection(state, 5, active), SPACE_TIME_GUARD);
  assert.equal(addSpaceTimeField(state, source, move(SPACE_SHATTER, { spaceTimeSource: "sky" })), 2);
  assert.equal(spaceTimeProtection(state, 1, active), SPACE_TIME_CHAOS);
  assert.equal(spaceTimeProtection(state, 2, active), SPACE_TIME_CHAOS);
  state.roundNumber += 5;
  assert.equal(activeSpaceTimeFields(state).confusions.length, 0);
  assert.equal(activeSpaceTimeFields(state).chaos.length, 2);
  for (let count = 3; count <= 7; count++)
    assert.equal(addSpaceTimeField(state, source, move(SPACE_SHATTER, { spaceTimeSource: "sky" })), count);
});

test("第一条挡下持续超过四回合的出招，普通一回合攻击仍命中", () => {
  let state = fixture();
  const owner = state.players[1]!;
  const targetId = a(state).id;
  const hp = a(state).hp;
  const attack = { type: "attack", attackId: "sha", stacks: 1, targetId } as const;
  owner.buffs.push({ id: "roar-six", name: "六回合续发", stacks: 1, stateType: "roar_move",
    expiresAtTurn: state.turnNumber + 5, roarContinuation: { action: attack, firstTurn: state.turnNumber - 1 } });
  state = advance(turn(state, undefined, undefined, attack));
  assert.equal(a(state).hp, hp - 1);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" &&
    event.targetId === targetId && event.protectionName === "时空守护"));
});

for (const [defeatLevel, reason] of [[1, "死亡"], [2, "退游"]] as const) {
  test(`第七次合成只让存活持卡者并列获胜，排除${reason}的持卡者`, () => {
    let state = fixture();
    const source = a(state).id;
    const second = state.players[1]!;
    const defeated = state.players[3]!;
    second.bigCards = [{ cardId: "10605", instanceId: "second", initialized: true }];
    defeated.bigCards = [{ cardId: "10605", instanceId: "defeated", initialized: true }];
    defeated.status = "dead";
    defeated.defeatLevel = defeatLevel;
    appendSkillInstances(state.players[2]!, ["1092"]);
    addSpaceTimeField(state, source, move(TIME_CONFUSION));
    for (let i = 0; i < 6; i++) addSpaceTimeField(state, source, move(SPACE_SHATTER, { spaceTimeSource: "sky" }));
    state = advance(turn(state, move(SPACE_SHATTER, { spaceTimeSource: "sky" })), "victory_counter_action");
    assert.equal(state.spaceTimeFields?.fusionCount, 7);
    assert.equal(state.activeTimingPhase, "victory_counter_action");
    const winners = state.victoryCounter?.claims.map(({ playerId }) => playerId);
    assert.deepEqual(new Set(winners), new Set([source, second.id]));
  });
}
