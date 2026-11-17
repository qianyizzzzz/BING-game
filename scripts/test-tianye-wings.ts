import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BASE_ATTACKS, EXECUTE_EFFECT_POWER, VANISH_EFFECT_POWER, addPlayerToGame, advanceActionWindow, appendSkillInstances,
  createGame, createPlayer, getCombatSeatNumbers, getSkillUseLimit, getStackedAttackStats, settleSunPuppetClock,
  startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState, validateAction,
  validateActionWindowSkill, type GameState, type PlayerAction, type SkillTimingPhase
} from "../packages/shared/src";
import { setPlayerBar } from "../packages/shared/src/engine/bars";
import { combatValue } from "../packages/shared/src/engine/combatValues";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { getStoredDamages, setStoredDamages } from "../packages/shared/src/engine/storedDamage";
import { lockSunClockAtNoon, nextSunClockBoundaryAt } from "../packages/shared/src/engine/sunClock";
import { SUN_CARD_ID, SUN_NIGHT_CAP_ID, SUN_PLAYER_ID, SUN_WHEEL_ID } from "../packages/shared/src/engine/sunIds";
import { tianyeChoiceOptions } from "../packages/shared/src/engine/tianye";
import { WIND_TRACE } from "../packages/shared/src/engine/ultimateWind";
import {
  TIAN_YE_CARD_ID, TIAN_YE_CHOICE_ID, TIAN_YE_FALL_ID, TIAN_YE_GALE_STATE, TIAN_YE_PURGE_STATE,
  TIAN_YE_REBOUND_LOCK, TIAN_YE_SOARING_ID, TIAN_YE_SOARING_STATE
} from "../packages/shared/src/engine/tianyeIds";

const cardId = "tianye-test-card";
const cake = { type: "gain_cake" } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const rebound = (targetId: string): PlayerAction => ({ type: "defense", defense: "rebound", targetId });
const player = (state: GameState, index: number) => state.players[index]!;

function withRoll<T>(draws: number[], run: () => T): T {
  const random = Math.random;
  let index = 0;
  Math.random = () => draws[index++] ?? random();
  try {
    return run();
  } finally {
    Math.random = random;
  }
}

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let steps = 0; steps < 60 && state.phase === "action_window"; steps++) {
    if (state.activeTimingPhase === stop) return state;
    state = advanceActionWindow(state);
  }
  assert.notEqual(state.phase, "action_window", "行动阶段应在有限步骤内结束");
  return state;
}

function fixture(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", firstTurnNoAttack: false, initialHp: 30 });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  player(state, 0).bigCards = [{ cardId: TIAN_YE_CARD_ID, instanceId: cardId }];
  state = advance(startGame(state), "round_before_action");
  assert.equal(state.activeTimingPhase, "round_before_action");
  for (const member of state.players) member.cakes = 30;
  return state;
}

function enterTurnBefore(state: GameState, wingDraw: number, successDraw = 0): GameState {
  state = withRoll([wingDraw, successDraw], () => advanceActionWindow(state));
  assert.equal(state.activeTimingPhase, "turn_before_action");
  return state;
}

function reveal(state: GameState, moves: PlayerAction[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, { id, status, summon }] of state.players.entries()) {
    if (status !== "alive" || summon || state.pendingActions[id]) continue;
    const move = moves[index] ?? cake;
    const validation = validateAction(state, id, move);
    assert.equal(validation.ok, true, validation.error);
    state = submitPlayerAction(state, id, move).state;
  }
  return state;
}

test("天野之翼在回合前公开给持有者选择，确认后于回合初赋予旋空", () => {
  let state = enterTurnBefore(fixture(), 0.99);
  const owner = player(state, 0);
  const target = player(state, 1);
  const choice = { type: "skill", skillId: TIAN_YE_CHOICE_ID, stacks: 1, tianyeWingChoice: TIAN_YE_SOARING_ID } as const;
  const publicState = toPublicGameState(state, owner.id);
  assert.equal("tianyeTurn" in publicState, false);
  assert.deepEqual(tianyeChoiceOptions(publicState.players.find(({ id }) => id === owner.id), state.turnNumber), [cardId]);
  const opponentView = toPublicGameState(state, target.id);
  assert.deepEqual(tianyeChoiceOptions(opponentView.players.find(({ id }) => id === owner.id), state.turnNumber), []);
  assert.ok(!opponentView.eventLog.some((event) => event.type === "system" && event.message.startsWith("闪灭之翼抽中")));
  assert.equal(validateActionWindowSkill(state, owner.id, choice).ok, true);
  assert.equal(validateActionWindowSkill(state, target.id, choice).ok, false);
  assert.equal(owner.buffs.some(({ stateType }) => stateType === TIAN_YE_SOARING_STATE), false);
  state = submitActionWindowSkill(state, owner.id, choice);
  assert.equal(validateActionWindowSkill(state, owner.id, choice).ok, false);
  state = advance(state);
  assert.equal(getCombatSeatNumbers(state).get(owner.id), Infinity);
  assert.equal(validateAction(state, target.id, sha(owner.id)).ok, false);
  assert.equal(validateAction(state, owner.id, sha(target.id)).ok, true);

  state = advance(reveal(state, [cake, { type: "attack", attackId: "wan_jian", stacks: 1 }]), "turn_end_action");
  assert.equal(player(state, 0).hp, 30);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === owner.id && event.blockKind === "dodge"));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === player(state, 2).id));
});

test("天野之翼未选时由随机结果落实一项翼效果", () => {
  let state = enterTurnBefore(fixture(), 0.99);
  assert.deepEqual(tianyeChoiceOptions(player(state, 0), state.turnNumber), [cardId]);
  state = withRoll([0], () => advanceActionWindow(state));
  assert.equal(state.phase, "collecting_actions");
  assert.deepEqual(tianyeChoiceOptions(player(state, 0), state.turnNumber), []);
  assert.equal(getCombatSeatNumbers(state).get(player(state, 0).id), Infinity);
});

test("旋空被风踪选中并绕过回避时，确立无敌挡消失点攻击，必杀点攻击穿透", () => {
  for (const [power, trait, defeat] of [
    [VANISH_EFFECT_POWER, "defeat_vanish", undefined],
    [EXECUTE_EFFECT_POWER, "defeat_execute", 4]
  ] as const) {
    let state = advance(enterTurnBefore(fixture(), 0));
    const [owner, attacker] = state.players;
    assert.ok(owner && attacker);
    owner.buffs.push({ id: WIND_TRACE, stateType: WIND_TRACE, name: "风踪", stacks: 1, sourcePlayerId: attacker.id });
    state = reveal(state, [cake, sha(owner.id)]);
    state.turnAttackStats = { [attacker.id]: { 0: { ...getStackedAttackStats(BASE_ATTACKS.sha, 1), power, traits: [trait] } } };
    state = advance(state, "turn_end_action");
    assert.equal(player(state, 0).defeatLevel, defeat);
    assert.equal(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === owner.id &&
      event.blockKind === "invulnerable" && event.protectionName?.includes("确立无敌")), defeat === undefined);
  }
});

test("未成功的闪灭抽选也不允许下一回合重复抽到同一翼", () => {
  let state = advance(enterTurnBefore(fixture(), 0, 0.5));
  assert.equal(player(state, 0).bigCards![0]!.tianyeLastWing, TIAN_YE_SOARING_ID);
  assert.equal(getCombatSeatNumbers(state).get(player(state, 0).id), 1);
  state = advance(reveal(state, []), "turn_after_interval_action");
  assert.equal(state.activeTimingPhase, "turn_after_interval_action");
  state = advance(enterTurnBefore(state, 0));
  assert.equal(player(state, 0).buffs.some(({ stateType }) => stateType === TIAN_YE_PURGE_STATE), true);
});

test("绝坠把杀变成群体退游点伤害，并给本回合出反弹者永久禁弹", () => {
  let state = advance(enterTurnBefore(fixture(), 0.45));
  const [owner, reflector, defender, bystander] = state.players.map(({ id }) => id);
  assert.equal(state.tianyeTurn?.activations[0]?.wing, TIAN_YE_FALL_ID);
  state = advance(reveal(state, [sha(reflector!), rebound(owner!), { type: "defense", defense: "small" }, cake]));
  assert.equal(state.players.find(({ id }) => id === owner)!.hp, 30);
  for (const id of [reflector, defender, bystander]) {
    assert.equal(state.players.find((member) => member.id === id)?.defeatLevel, 2);
    assert.ok(state.eventLog.some((event) => event.type === "damage" && event.sourceId === owner && event.targetId === id));
  }
  assert.ok(!state.eventLog.some((event) => event.type === "attack_reflected"));
  const lock = state.players.find(({ id }) => id === reflector)!.buffs.find(({ stateType }) => stateType === TIAN_YE_REBOUND_LOCK);
  assert.ok(lock);
  assert.equal(lock.expiresAtTurn, undefined);
  assert.equal(lock.expiresAtRound, undefined);
});

test("绝坠的永久不良从下一回合禁止提交反弹", () => {
  let state = advance(enterTurnBefore(fixture(), 0.45));
  const [owner, reflector, ordinary] = state.players.map(({ id }) => id);
  state = advance(reveal(state, [cake, rebound(owner!), cake]), "turn_after_interval_action");
  state = advance(enterTurnBefore(state, 0.45, 0.5));
  assert.equal(state.phase, "collecting_actions");
  for (const member of state.players) member.cakes = 30;
  assert.match(validateAction(state, reflector!, rebound(owner!)).error ?? "", /绝坠之翼/);
  assert.equal(validateAction(state, ordinary!, rebound(owner!)).ok, true);
  assert.equal(validateAction(state, reflector!, { type: "defense", defense: "small" }).ok, true);
});

test("风袭清空限定技次数、破碎其他小空间，并使普通出招持续十回合", () => {
  let state = fixture();
  const target = player(state, 3);
  const owner = player(state, 0);
  target.spaceId = "other-space";
  state.smallSpaces = { [target.spaceId]: { kind: "self_isolation", name: "自我封闭", expiresAtRound: 20, cakeMultiplier: 3 } };
  appendSkillInstances(owner, ["1012"]);
  assert.ok((getSkillUseLimit(owner, "1012") ?? 0) > 0);
  state = advance(enterTurnBefore(state, 0.65));
  assert.equal(state.phase, "collecting_actions");
  assert.equal(state.smallSpaces?.["other-space"], undefined);
  assert.equal(player(state, 3).defeatLevel, 3);
  assert.equal(getSkillUseLimit(player(state, 0), "1012"), 0);
  assert.ok(player(state, 0).buffs.some(({ stateType }) => stateType === TIAN_YE_GALE_STATE));
  state = advance(reveal(state, []), "turn_end_action");
  const continuations = toPublicGameState(state, owner.id).statusOverview?.continuations ?? [];
  assert.ok(continuations.some(({ label, value }) => `${label} ${value}`.includes("10")));
});

test("风袭保留持有者所在空间，续发普通出饼恰好持续十回合", () => {
  let state = fixture();
  const owner = player(state, 0);
  const doomed = player(state, 3);
  owner.spaceId = "owner-space";
  doomed.spaceId = "other-space";
  state.smallSpaces = {
    [owner.spaceId]: { kind: "self_isolation", name: "自我封闭", expiresAtRound: 20, cakeMultiplier: 3 },
    [doomed.spaceId]: { kind: "self_isolation", name: "自我封闭", expiresAtRound: 20, cakeMultiplier: 3 }
  };
  state = advance(enterTurnBefore(state, 0.65));
  assert.equal(player(state, 0).spaceId, owner.spaceId);
  assert.ok(state.smallSpaces?.[owner.spaceId]);
  assert.equal(player(state, 3).defeatLevel, 3);

  for (let turn = 1; turn <= 11; turn++) {
    assert.equal(state.turnNumber, turn);
    const before = player(state, 0).cakes;
    state = advance(reveal(state, []), "turn_after_interval_action");
    assert.equal(player(state, 0).cakes - before, turn > 1 && turn <= 10 ? 6 : 3, `第 ${turn} 回合的实际饼收益`);
    if (turn < 11) state = advance(enterTurnBefore(state, 0, 0.5));
  }
});

test("破阵先清全场在场效果，再挂自己的特殊状态，保留元素与进度条", () => {
  let state = fixture();
  const [owner, target] = state.players;
  assert.ok(owner && target);
  target.spareLives = [{ hp: 7 }];
  setStoredDamages(target, [{ id: "test-purge-stock", amountValue: combatValue(4), spellDamage: true }]);
  target.buffs.push({ id: "defense_value", name: "防御值", stacks: 12 },
    { id: "temp_invulnerable", name: "临时无敌", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
  changeElementAmount(target, "聚", 2);
  setPlayerBar(target, { id: "tianye-test-progress", kind: "progress", label: "进度", value: 5 });
  target.spaceId = "other-space";
  state.smallSpaces = { [target.spaceId]: { kind: "self_isolation", name: "自我封闭", expiresAtRound: 20, cakeMultiplier: 3 } };
  state.totems = [{ id: "test-totem", ownerId: owner.id, primaryTargetId: target.id, kind: "flame", range: "both",
    firstTurn: state.turnNumber, expiresAtTurn: state.turnNumber + 20 }];
  state.players.push({ ...createPlayer("测试猎犬"), summon: { kind: "hound", ownerId: owner.id, targetId: target.id,
    firstTurn: state.turnNumber, expiresAtTurn: state.turnNumber + 10 } });
  state = advance(enterTurnBefore(state, 0.25));
  assert.equal(state.phase, "collecting_actions");
  assert.equal(state.players.some(({ summon }) => summon), false);
  assert.equal(state.totems, undefined);
  assert.equal(state.smallSpaces, undefined);
  assert.equal(player(state, 1).spaceId, undefined);
  assert.equal(player(state, 1).spareLives, undefined);
  assert.deepEqual(getStoredDamages(player(state, 1)), []);
  assert.ok(!player(state, 1).buffs.some(({ id }) => id === "defense_value" || id === "temp_invulnerable"));
  assert.ok(player(state, 1).buffs.some(({ id, stacks }) => id.startsWith("element:") && stacks === 2));
  assert.equal(player(state, 1).bars?.[0]?.value, 5);
  assert.ok(player(state, 0).buffs.some(({ stateType }) => stateType === TIAN_YE_PURGE_STATE));
});

test("破阵持有者本回合不受随后锁定的正午影响，其他玩家仍使用场地时间", (context) => {
  const night = Date.parse("2026-11-12T23:00:00+08:00");
  context.mock.method(Date, "now", () => night);
  let state = advance(enterTurnBefore(fixture(), 0.25));
  const [owner, other, target] = state.players;
  assert.ok(owner && other && target);
  owner.bigCards!.push({ cardId: SUN_CARD_ID, instanceId: "purge-wheel", onlyAbilityId: SUN_WHEEL_ID });
  other.bigCards = [{ cardId: SUN_CARD_ID, instanceId: "sun-wheel", onlyAbilityId: SUN_WHEEL_ID },
    { cardId: SUN_CARD_ID, instanceId: "sun-night", onlyAbilityId: SUN_NIGHT_CAP_ID }];
  lockSunClockAtNoon(state);
  assert.equal(settleSunPuppetClock(state, night), true);
  assert.ok(owner.nightHpCap);
  assert.equal(other.nightHpCap, undefined);
  assert.equal(nextSunClockBoundaryAt(state, night), Date.parse("2026-11-13T06:00:00+08:00"));

  state = advance(reveal(state, [sha(target.id), sha(target.id)]), "turn_end_action");
  assert.equal(state.eventLog.filter((event) => event.type === "damage" && event.sourceId === SUN_PLAYER_ID &&
    event.targetId === target.id).length, 1);
});
