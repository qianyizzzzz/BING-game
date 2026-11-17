import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer,
  getAllSkills, getFusionSkillId, getVisibleStatusOverview, nextSunClockBoundaryAt, sampleSunClock, settleSunPuppetClock,
  startGame, submitActionWindowSkill, submitPlayerAction, toPublicGameState,
  type GameState, type PlayerAction
} from "../packages/shared/src";
import {
  SUN_CARD_ID, SUN_CROWN_ID, SUN_GLORY_ID, SUN_NIGHT_CAP_ID, SUN_PLAYER_ID, SUN_PUPPET_ID, SUN_PUPPET_STATE, SUN_RETURN_ID, SUN_WHEEL_ID
} from "../packages/shared/src/engine/sunIds";
import { STAR_WHEEL_CARD, STAR_WHEEL_SHIFT } from "../packages/shared/src/engine/starWheelIds";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const cast = (skillId: string) => ({ type: "skill", skillId, stacks: 1 } as const);
const sha = (targetId: string, stacks = 1) => ({ type: "attack", attackId: "sha", stacks, targetId } as const);
const atBeijing = (time: string) => Date.parse(`2026-11-12T${time}+08:00`);

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 80; i++) state = advanceActionWindow(state);
  assert.notEqual(state.phase, "action_window", `尚未离开 ${state.activeTimingPhase}`);
  return state;
}

function game(abilityId: string, keepOpening = false): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.bigCards = [{ cardId: SUN_CARD_ID, instanceId: "sun", onlyAbilityId: abilityId }];
  state = startGame(state);
  if (!keepOpening) state = drain(state);
  for (const player of state.players) player.cakes = 32;
  return state;
}

function submit(state: GameState, ...moves: PlayerAction[]): GameState {
  for (const [index, player] of state.players.entries()) {
    if (state.phase === "collecting_actions" && player.status === "alive")
      state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  }
  return state;
}

test("日轮按北京时间复刻已有属性和攻值，由虚拟日独立对同一目标出招", (context) => {
  context.mock.method(Date, "now", () => atBeijing("06:00:00.000"));
  let state = game(SUN_WHEEL_ID);
  const [owner, target, other] = state.players;
  const fireBlade = getAllSkills().find(({ name }) => name === "火焰刀");
  assert.ok(fireBlade);
  appendSkillInstances(owner!, [fireBlade.id]);
  state = drain(submit(state, sha(target!.id)));
  const attacks = state.eventLog.filter((event) => event.type === "damage").filter(({ targetId }) => targetId === target!.id);
  assert.deepEqual(attacks.map(({ sourceId, amount, element }) => [sourceId, amount, element]),
    [[owner!.id, 2, "fire"], [SUN_PLAYER_ID, 2, "fire"]]);
  assert.equal(state.players.find(({ id }) => id === target!.id)!.hp, 14);
  assert.equal(state.players.find(({ id }) => id === other!.id)!.hp, 18);
  assert.equal(toPublicGameState(state).players.some(({ id }) => id === SUN_PLAYER_ID), false);
});

test("日轮在北京时间 18:00 停止，星移飞轮持有者存活时白天也拦截日轮", (context) => {
  let now = atBeijing("18:00:00.000");
  context.mock.method(Date, "now", () => now);
  for (const suppressed of [false, true]) {
    if (suppressed) now = atBeijing("17:59:59.999");
    let state = game(SUN_WHEEL_ID);
    if (suppressed) state.players[2]!.bigCards = [{ cardId: STAR_WHEEL_CARD, instanceId: "star", onlyAbilityId: STAR_WHEEL_SHIFT }];
    const id = state.players[1]!.id;
    state = drain(submit(state, sha(id)));
    assert.equal(state.players[1]!.hp, 17);
    assert.ok(!state.eventLog.some((event) => event.type === "damage" && event.sourceId === SUN_PLAYER_ID));
  }
});

test("日轮复刻的攻击仍可被目标防御", (context) => {
  context.mock.method(Date, "now", () => atBeijing("09:00:00.000"));
  let state = game(SUN_WHEEL_ID);
  const id = state.players[1]!.id;
  state = drain(submit(state, sha(id), small));
  assert.equal(state.players[1]!.hp, 18);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.sourceId === SUN_PLAYER_ID && event.targetId === id));
});

test("反弹能分别转移原招和日轮复刻，对撞只影响真正相向的攻击", (context) => {
  context.mock.method(Date, "now", () => atBeijing("09:00:00.000"));
  const fixture = game(SUN_WHEEL_ID);
  const [owner, target, redirect] = fixture.players;
  const rebound: PlayerAction = { type: "defense", defense: "rebound", targetId: redirect!.id };
  const reflected = drain(submit(structuredClone(fixture), sha(target!.id), rebound));
  assert.equal(reflected.players[1]!.hp, 18);
  assert.equal(reflected.players[2]!.hp, 16);
  assert.ok(reflected.eventLog.some((event) => event.type === "attack_reflected" && event.sourceId === SUN_PLAYER_ID &&
    event.reflectedTargetId === redirect!.id));

  const clashed = drain(submit(fixture, sha(target!.id), sha(owner!.id)));
  assert.equal(clashed.players[0]!.hp, 18);
  assert.equal(clashed.players[1]!.hp, 17);
  assert.ok(clashed.eventLog.some((event) => event.type === "damage" && event.sourceId === SUN_PLAYER_ID && event.targetId === target!.id));
});

test("普通死亡在白天变成 0 血傀儡，跳过治愈术响应，日落或强制夜间时消失", (context) => {
  const daylight = atBeijing("17:59:59.999");
  const sunset = atBeijing("18:00:00.000");
  context.mock.method(Date, "now", () => daylight);
  let state = game(SUN_PUPPET_ID);
  const target = state.players[1]!;
  target.hp = 0;
  const healingArt = getAllSkills().find(({ name }) => name === "治愈术");
  assert.ok(healingArt);
  appendSkillInstances(target, [healingArt.id, "1068"]);
  state = submit(state, sha(target.id));
  for (let i = 0; state.phase === "action_window" && i < 80; i++) {
    assert.notEqual(state.activeTimingPhase, "revival_action");
    state = advanceActionWindow(state);
  }
  assert.equal(state.players[1]!.hp, 0);
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(state.eventLog.filter((event) => event.type === "player_died" && event.playerId === target.id).length, 1);
  assert.ok(state.players[1]!.buffs.some(({ id }) => id === SUN_PUPPET_STATE));
  assert.equal(getVisibleStatusOverview(toPublicGameState(state, state.ownerId), target.id)?.special[0]?.label, "日的傀儡");
  assert.equal(nextSunClockBoundaryAt(state, daylight), sunset);
  const forced = structuredClone(state);
  forced.sunClockOverride = { hour: 23, minute: 0, effectName: "强制夜间" };
  for (const [room, now] of [[state, sunset], [forced, daylight]] as const) {
    assert.equal(settleSunPuppetClock(room, now), true);
    assert.equal(room.players[1]!.defeatLevel, 3);
    assert.ok(!room.players[1]!.buffs.some(({ id }) => id === SUN_PUPPET_STATE));
    assert.equal(settleSunPuppetClock(room, now), false);
  }
});

test("万物留存之源在日出解除夜间血量上限，已扣血保留", (context) => {
  const night = atBeijing("05:59:59.999");
  context.mock.method(Date, "now", () => night);
  let state = game(SUN_NIGHT_CAP_ID);
  const target = state.players[1]!;
  assert.equal(nextSunClockBoundaryAt(state, night), atBeijing("06:00:00.000"));
  settleSunPuppetClock(state, night);
  assert.deepEqual(target.nightHpCap, [{ exponent: 0, coefficient: 18 }]);
  state = drain(submit(state, sha(target.id)));
  assert.equal(state.players[1]!.hp, 11, "1 点攻击伤害和轮末降低 6 点上限都应结算");
  assert.deepEqual(state.players[1]!.nightHpCap, [{ exponent: 0, coefficient: 11 }]);
  assert.equal(settleSunPuppetClock(state, atBeijing("06:00:00.000")), true);
  assert.equal(state.players[1]!.nightHpCap, undefined);
  assert.equal(state.players[1]!.hp, 11);
});

test("夜间同批伤害和嗜血按净变化降低上限，回合末的额外回血不触发繁荣", (context) => {
  context.mock.method(Date, "now", () => atBeijing("23:00:00.000"));
  let state = game(SUN_NIGHT_CAP_ID);
  const [, healer, attacker, victim] = state.players;
  const bloodthirst = getAllSkills().find(({ name }) => name === "嗜血");
  const frostfall = getAllSkills().find(({ name }) => name === "霜落大地");
  assert.ok(bloodthirst && frostfall);
  appendSkillInstances(healer!, [bloodthirst.id, frostfall.id]);
  grantInitializedSkill(state, victim!.id, getFusionSkillId("繁荣"), "测试繁荣");

  state = submit(state, cake, sha(victim!.id, 8), sha(healer!.id, 3));
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== "turn_end_action" && i < 80; i++)
    state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "turn_end_action");
  assert.equal(state.players[1]!.hp, 17);
  assert.deepEqual(state.players[1]!.nightHpCap, [{ exponent: 0, coefficient: 17 }]);
  const healingEvents = state.eventLog.filter((event) => event.type === "heal");
  assert.deepEqual(healingEvents.map(({ targetId, reason, amount }) => [targetId, reason, amount]),
    [[healer!.id, "嗜血", 2], [victim!.id, "繁荣", 2]]);
  assert.equal(state.players[3]!.hp, 12);

  const firstFrostEvent = state.eventLog.length;
  state = submitActionWindowSkill(state, healer!.id, cast(frostfall.id));
  assert.equal(state.players[1]!.hp, 17);
  const frostEvents = state.eventLog.slice(firstFrostEvent);
  assert.ok(frostEvents.some((event) => event.type === "skill_used" && event.skillId === frostfall.id));
  assert.ok(!frostEvents.some((event) => event.type === "heal"));
});

test("夜间血量上限可以为负，治愈术不能把玩家拉回存活，也不会反复开启复活阶段", (context) => {
  const night = atBeijing("23:00:00.000");
  context.mock.method(Date, "now", () => night);
  let state = game(SUN_NIGHT_CAP_ID);
  const target = state.players[1]!;
  const other = state.players[2]!;
  const healingArt = getAllSkills().find(({ name }) => name === "治愈术");
  assert.ok(healingArt);
  appendSkillInstances(target, [healingArt.id]);
  target.hp = 5;
  state = drain(submit(state, sha(other.id)));
  const defeated = state.players[1]!;
  assert.equal(defeated.status, "dead");
  assert.equal(defeated.defeatLevel, 1);
  assert.equal(defeated.hp, -1);
  assert.deepEqual(defeated.nightHpCap, [{ exponent: 0, coefficient: -1 }]);
  assert.equal(state.phase, "collecting_actions");
});

test("荣光照耀让未防住的玩家退游，让出防御的玩家普通死亡", (context) => {
  context.mock.method(Date, "now", () => atBeijing("12:00:00.000"));
  const state = drain(submit(game(SUN_GLORY_ID), cast(SUN_GLORY_ID), small, cake, stone));
  assert.equal(state.players[1]!.status, "dead");
  assert.equal(state.players[2]!.defeatLevel, 2);
  assert.equal(state.players[3]!.status, "dead");
  assert.ok(state.eventLog.some((event) => event.type === "player_died" && event.playerId === state.players[1]!.id && event.defeatLevel === 1));
});

test("太阳神的归返防住时清血和防御值，整招只追加一次，并在施术者退场后保留正午", (context) => {
  const night = atBeijing("23:00:00.000");
  context.mock.method(Date, "now", () => night);
  let state = game(SUN_RETURN_ID);
  const [owner, first, second] = state.players;
  first!.buffs.push({ id: "defense_value", name: "防御值", stacks: 9 });
  state = drain(submit(state, cast(SUN_RETURN_ID), small, stone));
  assert.deepEqual(state.players.slice(1, 3).map(({ hp, status }) => [hp, status]), [[0, "alive"], [0, "alive"]]);
  assert.equal(state.players[3]!.defeatLevel, 3);
  assert.ok(!state.players[1]!.buffs.some(({ id }) => id === "defense_value"));
  for (const { id } of [first!, second!]) assert.equal(state.eventLog.filter((event) => event.type === "attack_blocked" &&
    event.sourceId === owner!.id && event.targetId === id && event.attackName === "太阳神的归返").length, 2);
  state.players[0]!.status = "dead";
  assert.equal(sampleSunClock(state, night).hour, 12);
  assert.equal(nextSunClockBoundaryAt(state, night), undefined);
  const view = toPublicGameState(state, first!.id);
  assert.deepEqual(getVisibleStatusOverview(view, first!.id)?.field, getVisibleStatusOverview(view, second!.id)?.field);
  assert.match(getVisibleStatusOverview(view, first!.id)?.field[0]?.value ?? "", /12:00/);
});

test("永恒冕冠于轮前发动，仅对非目标造成火系法伤且可用石头防", (context) => {
  context.mock.method(Date, "now", () => atBeijing("12:00:00.000"));
  let state = game(SUN_CROWN_ID, true);
  const [owner, originalTarget, stoneDefender, extraTarget] = state.players;
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== "round_pre_interval_action" && i < 20; i++)
    state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "round_pre_interval_action");
  state = drain(submitActionWindowSkill(state, owner!.id, cast(SUN_CROWN_ID)));
  state = drain(submit(state, sha(originalTarget!.id), cake, stone, cake));
  const crownDamage = state.eventLog.filter((event) => event.type === "damage").filter(({ sourceAbilityId }) => sourceAbilityId === SUN_CROWN_ID);
  assert.deepEqual(crownDamage.map(({ targetId, amount, element, attackDamage }) => [targetId, amount, element, attackDamage]),
    [[extraTarget!.id, 3000, "fire", undefined]]);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === stoneDefender!.id && event.attackName === "永恒冕冠"));
  assert.equal(state.players[1]!.hp, 17);
  assert.equal(state.players[2]!.hp, 18);
});
