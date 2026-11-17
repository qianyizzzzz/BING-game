import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, combatValue, createGame, createPlayer, getActiveFusionCount,
  getDueXieyuCount, getElementAmount, getSkillAttackStats, getXielingMarkValue, INFINITY_VALUE, RETIRE_VALUE, startGame,
  submitActionWindowSkill, submitPlayerAction, validateAction, XIELING_AMBUSH_ID, XIELING_BODY_ID, XIELING_ELEMENT,
  XIELING_INVASION_ID, XIELING_RESET_ID, XIELING_TRANSFORM_ID, XIELING_ULTIMATE_ID,
  type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeElementAmount } from "../packages/shared/src/engine/elementResources";
import { changeXielingMarks, shapeXielingAttack, XIELING_BODY_STATE } from "../packages/shared/src/engine/xieling";

const at = (state: GameState, index = 0) => state.players[index]!;
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const cake = { type: "gain_cake" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", stacks: 1, targetId });
const card = (state: GameState) => at(state).bigCards![0]!;
const damage = (state: GameState, reason: string) => state.eventLog.flatMap((event) =>
  event.type === "damage" && event.attackName === reason ? [event] : []);
const heals = (state: GameState, reason: string) => state.eventLog.flatMap((event) =>
  event.type === "heal" && event.reason === reason ? [event] : []);

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 90; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  at(state).bigCards = [{ cardId: "10515", instanceId: "xieling-card" }];
  state = drain(startGame(state));
  for (const player of state.players) { player.cakes = 20; player.hp = 200; }
  return state;
}

function reveal(state: GameState, ...moves: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) if (player.status === "alive")
    state = submitPlayerAction(state, player.id, moves[index] ?? cake).state;
  return state;
}

test("暗影战斧真授予；实际吸血增加印记，战斧的伤害回血不累计", () => {
  let state = fixture();
  assert.equal(getActiveFusionCount(at(state), "暗影战斧"), 1);
  assert.equal(getDueXieyuCount(at(state), 2), 1);
  assert.equal(getDueXieyuCount(at(state), 3), 0);
  state.roundNumber = 2;
  changeXielingMarks(at(state), combatValue(5));
  appendSkillInstances(at(state, 1), ["1011"]);
  state = drain(reveal(state, cake, { ...sha(at(state, 2).id), stacks: 4 } as PlayerAction));
  assert.equal(damage(state, "邪域").at(-1)?.amount, 2);
  assert.equal(heals(state, "邪域").at(-1)?.amount, 2);
  assert.ok(heals(state, "暗影战斧").length > 0);
  assert.deepEqual(getXielingMarkValue(at(state)), combatValue(7));
});

test("邪灵变扣饼和指定印记；反弹麻痹；被攻击时回合末吸血但不重开", () => {
  let state = fixture();
  changeXielingMarks(at(state), combatValue(5));
  appendSkillInstances(at(state, 1), ["1035"]);
  assert.equal(validateAction(state, at(state).id, cast(XIELING_TRANSFORM_ID, { xielingMarkCost: 6 })).ok, false);
  state = drain(reveal(state, cast(XIELING_TRANSFORM_ID, { xielingMarkCost: 3 }),
    cast("1035", { targetId: at(state).id }), sha(at(state).id)));
  assert.equal(at(state).cakes, 19);
  assert.equal(getElementAmount(at(state), XIELING_ELEMENT), 3);
  assert.equal(state.roundNumber, 1);
  assert.equal(state.roundTurnNumber, 2);
  assert.equal(damage(state, "邪灵变").length, 3);
  assert.deepEqual(getXielingMarkValue(at(state)), combatValue(5));
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("将麻痹反弹给 乙")));
  assert.ok(!at(state).buffs.some((buff) => buff.name === "麻痹"));
});

test("邪灵入侵四段群攻，按实际伤害吸血50%，按一招合计伤害减冷却", () => {
  let state = fixture();
  changeElementAmount(at(state), XIELING_ELEMENT, 8);
  card(state).xielingCooldown = { remaining: 50, castTurn: 0 };
  state = drain(reveal(state, cast(XIELING_INVASION_ID), { type: "defense", defense: "youtiao" }));
  assert.deepEqual(damage(state, "邪灵入侵").map((event) => event.amount), Array(8).fill(4));
  assert.equal(heals(state, "邪灵入侵").reduce((n, event) => n + event.amount, 0), 16);
  assert.equal(card(state).xielingCooldown?.remaining, 41);
});

test("邪灵暗袭补刀打退游伤害并减少冷却", () => {
  let state = fixture();
  changeElementAmount(at(state), XIELING_ELEMENT, 10);
  card(state).xielingCooldown = { remaining: 50, castTurn: 0 };
  state = drain(reveal(state, cast(XIELING_AMBUSH_ID, { targetId: at(state, 1).id }), sha(at(state, 2).id)));
  assert.equal(damage(state, "邪灵暗袭")[0]?.pointDefeatLevel, 2);
  assert.equal(card(state).xielingCooldown?.remaining, 39);
});

test("不灭魔躯先制重开后回合初脉冲，普通攻击翻攻与附带法伤，冷却每回合减3", () => {
  let state = fixture();
  changeElementAmount(at(state), XIELING_ELEMENT, 28);
  card(state).xielingCooldown = { remaining: 50, castTurn: 0 };
  state = drain(reveal(state, cake, sha(at(state).id)), "turn_change_action");
  // In the normal flow the payer had its resources at the start of this turn.
  const snapshot = state.preemptiveRestartSnapshot!.players[0]!;
  changeElementAmount(snapshot, XIELING_ELEMENT, 28);
  snapshot.bigCards![0]!.xielingCooldown = { remaining: 50, castTurn: 0 };
  state = drain(submitActionWindowSkill(state, at(state).id, cast(XIELING_BODY_ID)));
  assert.equal(state.roundNumber, 2);
  assert.equal(getElementAmount(at(state), XIELING_ELEMENT), 0);
  assert.deepEqual(damage(state, "邪·不灭魔躯").map((event) => event.amount), [1, 1, 1]);
  at(state).cakes = 2;
  state = drain(reveal(state, sha(at(state, 1).id)));
  assert.equal(state.roundNumber, 2);
  assert.equal(state.roundTurnNumber, 2);
  assert.equal(damage(state, "杀").at(-1)?.amount, 2);
  assert.equal(damage(state, "杀·附带法伤").at(-1)?.amount, 1);
  assert.equal(card(state).xielingCooldown?.remaining, 47);
  assert.equal(damage(state, "邪·不灭魔躯").length, 6);
});

test("魔躯的邪域先加成再翻倍，轮末再翻倍；其他人造成伤害仍会重开", () => {
  let state = fixture();
  at(state).buffs.push({ id: XIELING_BODY_STATE, stateType: XIELING_BODY_STATE, name: "邪·不灭魔躯",
    stacks: 1, expiresAtRound: 5, sourceBigCardInstanceId: card(state).instanceId });
  changeXielingMarks(at(state), combatValue(5));
  assert.equal(getDueXieyuCount(at(state), 1), 1);
  state = drain(reveal(state, cake, sha(at(state, 2).id)));
  assert.equal(state.roundNumber, 2);
  assert.equal(damage(state, "邪域").at(-1)?.amount, 8);
  assert.equal(heals(state, "邪域").at(-1)?.amount, 8);
  assert.deepEqual(getXielingMarkValue(at(state)), combatValue(13));
});

test("逆转只转方向，魔躯强化仍取出招者，接手攻击的人不会补上自己的魔躯强化", () => {
  for (const owner of [0, 1]) {
    let state = fixture();
    at(state, owner).buffs.push({ id: XIELING_BODY_STATE, stateType: XIELING_BODY_STATE, name: "邪·不灭魔躯",
      stacks: 1, expiresAtRound: 5 });
    appendSkillInstances(at(state, 3), ["1092"]);
    const originalTarget = at(state, 1).id;
    state = drain(reveal(state, sha(originalTarget)), "turn_change_action");
    state = drain(submitActionWindowSkill(state, at(state, 3).id, cast("1092")));
    const hit = damage(state, "杀")[0];
    assert.equal(hit?.sourceId, originalTarget);
    assert.equal(hit?.targetId, at(state).id);
    assert.equal(hit?.amount, owner === 0 ? 2 : 1);
    assert.equal(damage(state, "杀·附带法伤").length, owner === 0 ? 1 : 0);
  }
});

test("大招被石头防住没有附带法伤；绝弹转移后仍保留对原反弹目标的强化", () => {
  let state = fixture();
  appendSkillInstances(at(state, 1), ["1056"]);
  const defender = at(state, 2).id;
  const redirected = at(state, 3).id;
  state = drain(reveal(state, cast(XIELING_ULTIMATE_ID), { type: "defense", defense: "rebound", targetId: redirected }, stone));
  assert.ok(!damage(state, "邪灵无念·附带法伤").some((event) => event.targetId === defender));
  assert.ok(damage(state, "邪灵无念").some((event) => event.targetId === redirected && event.amountValue?.[0]?.exponent === 1));
  assert.equal(card(state).xielingCooldown?.remaining, 50);
  assert.equal(validateAction(state, at(state).id, cast(XIELING_ULTIMATE_ID)).ok, false);
});

test("不灭魔躯只把邪灵无念的已有无限升退游或必杀，攻等法伤的基础10变无限", () => {
  const base = getSkillAttackStats(XIELING_ULTIMATE_ID, 1)!;
  const ordinary = shapeXielingAttack(base, true, false, false, () => 0.5);
  assert.deepEqual(ordinary.powerValue, INFINITY_VALUE);
  assert.deepEqual(ordinary.levelValue, INFINITY_VALUE);
  assert.deepEqual(ordinary.xielingSpellOnHit?.[0], INFINITY_VALUE);
  assert.deepEqual(shapeXielingAttack(base, true, true, false, () => 0.5).powerValue, RETIRE_VALUE);
  assert.ok(shapeXielingAttack(base, true, true, false, () => 0.009).traits.includes("defeat_execute"));
  assert.ok(shapeXielingAttack({ ...base, powerValue: INFINITY_VALUE }, true, false, false, () => 0.5).traits.includes("defeat_retire"));
  const other = shapeXielingAttack({ ...base, id: "sha", powerValue: INFINITY_VALUE }, true, false, false, () => 0.001);
  assert.deepEqual(other.powerValue, [{ coefficient: 2, exponent: 1 }]);
  assert.ok(!other.traits.includes("defeat_execute"));
});

test("冷却跨轮递减，邪念闪即时清空", () => {
  let state = fixture();
  state = drain(reveal(state, cast(XIELING_ULTIMATE_ID), stone, stone, stone));
  for (let index = 0; index < 7; index++) {
    for (const player of state.players) player.cakes = 8;
    state = drain(reveal(state, cake, index === 2 ? sha(at(state, 2).id) : cake));
  }
  assert.equal(state.roundNumber, 2);
  assert.equal(card(state).xielingCooldown?.remaining, 43);
  at(state).cakes = 5;
  state = drain(reveal(state), "turn_change_action");
  state = submitActionWindowSkill(state, at(state).id, cast(XIELING_RESET_ID));
  assert.equal(card(state).xielingCooldown?.remaining, 0);
  assert.equal(at(state).cakes, 1);
});
