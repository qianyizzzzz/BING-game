import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, ASURA_CARD_ID, ASURA_FERRY_ID, ASURA_IMMUNITY_ID,
  ASURA_RAIN_ID, ASURA_RITUAL_UPGRADE_ID, ASURA_SWORD_ID, attackPowerValue, bloodQiNumber, BLOOD_RITUAL_FUSION_ID,
  combatValue, createGame, createPlayer, getActiveSkillCount, getSkillUseLimit, JUEYING_RETIRE_ID, previewPlayerAttackStats,
  SOUL_PACT_CARD_ID, STAR_CARD_ID, STAR_RESIST_ID, startGame, submitActionWindowSkill, submitPlayerAction, submitRetirementCounter,
  type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { changeBloodQi } from "../packages/shared/src/engine/asura";
import { addSpareLife } from "../packages/shared/src/engine/kaige";

const cake = { type: "gain_cake" } as const;
const sha = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId });
const cast = (skillId: string, targetId?: string): SkillAction => ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) });
const player = (state: GameState, id: string) => state.players.find((entry) => entry.id === id)!;
const qi = (state: GameState, id: string) => bloodQiNumber(player(state, id));

function advance(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 100; i++) state = advanceActionWindow(state);
  return state;
}

function setup(count = 4) {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false });
  for (const name of ["乙", "丙", "丁"].slice(0, count - 1)) state = addPlayerToGame(state, createPlayer(name));
  const [a, b, c, d] = state.players.map(({ id }) => id) as [string, string, string, string];
  player(state, a).bigCards = [{ cardId: ASURA_CARD_ID, instanceId: "asura-test" }];
  state = advance(startGame(state));
  for (const entry of state.players) { entry.hp = 30; entry.cakes = 30; }
  return { state, a, b, c, d };
}

function reveal(state: GameState, moves: Record<string, PlayerAction>): GameState {
  state = advance(state);
  for (const { id } of state.players.filter((entry) => entry.status === "alive")) {
    state = submitPlayerAction(state, id, moves[id] ?? cake).state;
  }
  return state;
}

test("真实传承，血水屏障的反噬免疫但防御值照给", () => {
  let { state, a } = setup();
  assert.equal(getActiveSkillCount(player(state, a), BLOOD_RITUAL_FUSION_ID), 1);
  assert.equal(getSkillUseLimit(player(state, a), "1046"), 10);
  assert.equal(getSkillUseLimit(player(state, a), "1047"), 10);
  state = advance(reveal(state, { [a]: cake }), "turn_change_action");
  state = submitActionWindowSkill(state, a, cast("1047"));
  assert.equal(getSkillUseLimit(player(state, a), "1047"), 10);
  assert.equal(player(state, a).hp, 30);
  assert.equal(player(state, a).buffs.find((buff) => buff.id === "defense_value")?.stacks, 6);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "修罗血剑·自身伤害免疫"));
});

test("普通防御值优先，累计消耗5血气回复1血", () => {
  let { state, a, b } = setup();
  changeBloodQi(player(state, a), 6);
  player(state, a).buffs.push({ id: "defense_value", name: "防御值", stacks: 2 });
  state = advance(reveal(state, { [b]: sha(a, 7) }), "turn_end_action");
  assert.equal(player(state, a).hp, 31);
  assert.equal(qi(state, a), 1);
});

test("血雨腥风逐目标奖励，并按实际血量下降积攒血气", () => {
  let { state, a } = setup();
  changeBloodQi(player(state, a), 3);
  state = advance(reveal(state, { [a]: cast(ASURA_RAIN_ID) }), "turn_end_action");
  assert.equal(qi(state, a), 6);
  assert.equal(getSkillUseLimit(player(state, a), "1047"), 11);
  assert.equal(player(state, a).hp, 33);
});

test("修罗·嗜将攻击吸血提升到1000%，加命按实际增加的命数记血气", () => {
  let { state, a, b } = setup();
  changeBloodQi(player(state, a), 20);
  addSpareLife(player(state, b), { hp: 6 }, state);
  assert.equal(qi(state, a), 21);
  state = advance(reveal(state, { [a]: sha(b) }), "turn_end_action");
  assert.equal(player(state, a).hp, 40);
  assert.equal(player(state, b).hp, 29);
});

test("邪域的1点法伤保留原吸血，再叠加修罗·嗜的10点", () => {
  let { state, a, b } = setup();
  changeBloodQi(player(state, a), 10);
  appendSkillInstances(player(state, a), ["1071"]);
  state.roundNumber = 3;
  state = advance(reveal(state, { [a]: sha(b) }), "round_end_action");
  state = advance(state);
  const drains = state.eventLog.filter((event) => event.type === "heal" && event.targetId === a &&
    (event.reason === "邪域" || event.reason === "修罗·嗜"));
  assert.equal(drains.filter((event) => event.amount === 10).length, 2);
  assert.ok(drains.some((event) => event.amount === 1 && event.reason === "邪域"));
});

test("未达到10血气时，传承的嗜血按一次攻击伤害100%回血", () => {
  let { state, a, b } = setup();
  state = advance(reveal(state, { [a]: sha(b) }), "turn_end_action");
  assert.equal(player(state, a).hp, 31);
  assert.equal(player(state, b).hp, 29);
});

test("血剑斩献掉最新多余命，再献当前命，仍结算并禁止双方复活", () => {
  let { state, a, b } = setup();
  changeBloodQi(player(state, a), 50);
  addSpareLife(player(state, a), { hp: 6 }, state);
  appendSkillInstances(player(state, a), ["1063"]);
  appendSkillInstances(player(state, b), ["1063"]);
  state = advance(reveal(state, { [a]: cast(ASURA_SWORD_ID, b) }), "turn_change_action");
  assert.ok(qi(state, a) >= 30 && qi(state, a) < 50);
  const destroy: SkillAction = { ...cast("1044"), switchActionIndex: 0, attackStatModifier: "power_plus_1_level_minus_1" };
  state = submitActionWindowSkill(state, a, destroy);
  assert.equal(player(state, a).spareLives?.length, 0);
  assert.deepEqual(attackPowerValue(previewPlayerAttackStats(state, a).stats[0]!), combatValue(1, 2));
  state = submitActionWindowSkill(state, a, destroy);
  assert.deepEqual(attackPowerValue(previewPlayerAttackStats(state, a).stats[0]!), combatValue(1, 3));
  state = advance(state);
  for (const id of [a, b]) {
    assert.equal(player(state, id).status, "dead", id === a ? "献命施术者应当死亡" : "血剑斩击杀目标应当死亡");
    assert.ok(player(state, id).buffs.some((buff) => buff.id === "no_revive"));
  }
});

test("修罗·渡保留30血气，血剑斩能主动用尽血气免疫新不良", () => {
  let { state, a, b } = setup();
  changeBloodQi(player(state, a), 55);
  state = advance(reveal(state, { [a]: cast(ASURA_SWORD_ID, b) }), "turn_change_action");
  state = submitActionWindowSkill(state, a, { ...cast(ASURA_FERRY_ID), switchActionIndex: 0, bloodQiSpent: 5 });
  assert.equal(qi(state, a), 30);
  state = submitActionWindowSkill(state, a, cast(ASURA_IMMUNITY_ID));
  assert.equal(qi(state, a), 0);
  assert.ok(player(state, a).buffs.some((buff) => buff.sourceAbilityId === ASURA_SWORD_ID));
});

test("修罗·渡将所选攻击的无视概率推至100%，可穿过八卦阵", () => {
  let { state, a, b } = setup();
  changeBloodQi(player(state, a), 120);
  appendSkillInstances(player(state, b), ["1049"]);
  state = advance(reveal(state, { [a]: sha(b) }), "turn_change_action");
  const ferry = { ...cast(ASURA_FERRY_ID), switchActionIndex: 0, bloodQiSpent: 90 };
  assert.throws(() => submitActionWindowSkill(state, a, { ...ferry, bloodQiSpent: 91 }), /保留至少30/);
  state = submitActionWindowSkill(state, a, ferry);
  state = advance(state, "turn_end_action");
  assert.equal(player(state, b).hp, 29);
});

test("祭天可在收集出招时发动，消失升级不需要保留血气", () => {
  let { state, a, b, c } = setup();
  changeBloodQi(player(state, a), 50);
  state = submitPlayerAction(state, a, cast(ASURA_RITUAL_UPGRADE_ID)).state;
  assert.equal(qi(state, a), 0);
  state = submitPlayerAction(state, a, { ...cast(BLOOD_RITUAL_FUSION_ID, b), targetIds: [b, c] }).state;
  assert.deepEqual([b, a, c].map((id) => player(state, id).defeatLevel), [3, 3, 3]);
  assert.deepEqual(state.eventLog.flatMap((event) => event.type === "player_died" ? [event.playerId] : []), [b, a, c]);
  assert.ok(!state.eventLog.some((event) => event.type === "damage"));
});

test("未升级的祭天按第一目标、自己、第二目标依次退游", () => {
  let { state, a, b, c } = setup();
  state = submitPlayerAction(state, a, { ...cast(BLOOD_RITUAL_FUSION_ID, b), targetIds: [b, c] }).state;
  assert.deepEqual([b, a, c].map((id) => player(state, id).defeatLevel), [2, 2, 2]);
  assert.deepEqual(state.eventLog.flatMap((event) => event.type === "player_died" ? [event.playerId] : []), [b, a, c]);
});

test("两人局第一目标退游后施术者获胜；若第一目标免疫，则施术者退游", () => {
  for (const immune of [false, true]) {
    let { state, a, b } = setup(2);
    if (immune) player(state, b).bigCards = [{ instanceId: "retire-guard", cardId: JUEYING_RETIRE_ID.slice(0, 5), onlyAbilityId: JUEYING_RETIRE_ID }];
    state = submitActionWindowSkill(state, a, cast(BLOOD_RITUAL_FUSION_ID, b));
    assert.equal(state.phase, "finished");
    assert.deepEqual(state.winnerIds, [immune ? b : a]);
    assert.equal(player(state, immune ? a : b).defeatLevel, 2);
  }
});

test("三人局升级祭天逐步判胜，不会再令第二目标消失", () => {
  let { state, a, b, c } = setup(3);
  changeBloodQi(player(state, a), 50);
  state = submitActionWindowSkill(state, a, cast(ASURA_RITUAL_UPGRADE_ID));
  state = submitActionWindowSkill(state, a, { ...cast(BLOOD_RITUAL_FUSION_ID, b), targetIds: [b, c] });
  assert.deepEqual([b, a, c].map((id) => player(state, id).defeatLevel), [3, 3, undefined]);
  assert.deepEqual(state.winnerIds, [c]);
});

test("祭天每步独立开放逆转和魂沉，处理后才判胜或继续", () => {
  let { state, a, b, c } = setup(3);
  appendSkillInstances(player(state, b), ["1092", "1092", "1092"]);
  player(state, c).bigCards = [{ instanceId: "ritual-sink", cardId: SOUL_PACT_CARD_ID }];
  state = submitActionWindowSkill(state, a, { ...cast(BLOOD_RITUAL_FUSION_ID, b), targetIds: [b, c] });
  const reversal = state.retirementCounter!;
  assert.deepEqual(reversal.playerIds, [b]);
  assert.equal(reversal.soulResponderIds, undefined);
  assert.equal(player(state, a).status, "alive");
  state = submitRetirementCounter(state, b, { windowId: reversal.id, kind: "pass" });
  const soul = state.retirementCounter!;
  assert.notEqual(soul.id, reversal.id);
  assert.deepEqual(soul.playerIds, []);
  assert.deepEqual(soul.soulResponderIds, [c]);
  state = submitRetirementCounter(state, c, { windowId: soul.id, kind: "soul_sink" });
  state = advance(state, "retirement_counter_action");
  assert.equal(player(state, b).defeatLevel, 1);
  assert.equal(player(state, a).defeatLevel, 2);
  assert.equal(state.retirementCounter?.ritualTargetId, a);
  state = submitRetirementCounter(state, c, { windowId: state.retirementCounter!.id, kind: "pass" });
  assert.deepEqual(state.winnerIds, [c]);
});

test("祭天的第一目标可先用异星共振抵御，再继续结算自己", () => {
  let { state, a, b } = setup(2);
  player(state, b).bigCards = [{ instanceId: "ritual-star", cardId: STAR_CARD_ID }];
  player(state, b).buffs.push({ id: "defense_value", name: "防御值", stacks: 1 });
  state = submitActionWindowSkill(state, a, cast(BLOOD_RITUAL_FUSION_ID, b));
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.equal(player(state, a).status, "alive");
  state = submitActionWindowSkill(state, b, { ...cast(STAR_RESIST_ID), targetDamageId: state.pendingDamageItems![0]!.id });
  assert.deepEqual(state.winnerIds, [b]);
  assert.equal(player(state, a).defeatLevel, 2);
});
