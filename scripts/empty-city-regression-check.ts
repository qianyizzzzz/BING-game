import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, EMPTY_CITY_CONTROL_ID,
  EMPTY_CITY_GUARD_ID, EMPTY_CITY_ILLUSION_ID, enterActionWindow, getActiveSkillCount, getAllSkills, getPuppetMasterId,
  playerClaimsJingu, PSYCHIC_PIERCE_ID, SAKURA_FALL_ID, SAKURA_FINALE_ID, startGame, submitActionWindowSkill,
  submitPlayerAction, toPublicGameState, validateAction,
  type GameState, type PlayerAction
} from "../packages/shared/src";
import { removeBigCardInstance } from "../packages/shared/src/engine/bigCards";
import { getDiscardableSakuraChoices, getSakuraCardChoices } from "../packages/shared/src/engine/sakura";
import { isEmptyCitySkillSuspended, psychicPiercesDefenses } from "../packages/shared/src/engine/illusionRules";
import { changeElementAmount, getElementAmount } from "../packages/shared/src/engine/elementResources";
import { getHunyaoPursuitTargets } from "../packages/shared/src/engine/hunyao";
import { CHASE_LIGHT_ID, CHASE_SOUL_ID, TIME_REWIND_ID } from "../packages/shared/src/bigCards/abilities";
import { WIND_TRACE } from "../packages/shared/src/engine/ultimateWind";
import { shouldFinishGame } from "../packages/shared/src/state/machine";
import { INFINITY_VALUE, addCombatValues, combatValue } from "../packages/shared/src/engine/combatValues";
import { BASE_ATTACKS } from "../packages/shared/src/engine/attacks";

const gain = { type: "gain_cake" } as const;
const at = (state: GameState, index = 0) => state.players[index]!;
const attack = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });

function drain(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && i < 50; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(abilities: Array<string | undefined> = [PSYCHIC_PIERCE_ID, undefined, undefined]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (let index = 1; index < abilities.length; index++) state = addPlayerToGame(state, createPlayer(`玩家 ${index}`));
  for (const [index, ability] of abilities.entries()) {
    if (ability) at(state, index).bigCards = [{ cardId: ability.slice(0, 5), instanceId: `empty-${index}`,
      ...(ability.length === 7 ? { onlyAbilityId: ability } : {}) }];
  }
  state = drain(startGame(state));
  for (const player of state.players) { player.cakes = 10; player.hp = 20; }
  return state;
}

function turn(state: GameState, ...moves: PlayerAction[]): GameState {
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) if (player.status === "alive")
    state = submitPlayerAction(state, player.id, moves[index] ?? gain).state;
  return drain(state);
}

test("精神穿刺绕过防御值和绝对无敌，保留出招防御与无限上限", () => {
  let state = fixture();
  const target = at(state, 1);
  target.buffs.push({ id: "defense_value", name: "防御值", stacks: 10 },
    { id: "temp_absolute_invulnerable", name: "绝对无敌", stacks: 1, expiresAtTurn: state.turnNumber });
  state = turn(state, attack(target.id));
  assert.equal(at(state, 1).hp, 19);
  assert.equal(at(state, 1).buffs.find(({ id }) => id === "defense_value")?.stacks, 10);
  at(state).cakes = 1;
  state = turn(state, attack(target.id), { type: "defense", defense: "small" });
  assert.equal(at(state, 1).hp, 19);
  assert.equal(psychicPiercesDefenses({ ...BASE_ATTACKS.sha, psychicPierce: true, powerValue: INFINITY_VALUE }), true);
  assert.equal(psychicPiercesDefenses({ ...BASE_ATTACKS.sha, psychicPierce: true,
    powerValue: addCombatValues(INFINITY_VALUE, combatValue(1)) }), false);
});

test("不可弃置的卡仍保留盲选位置，真正可弃置名单不含此卡", () => {
  const state = fixture([undefined, EMPTY_CITY_GUARD_ID, undefined]);
  const target = at(state, 1);
  target.bigCards!.push({ cardId: "10533", instanceId: "discardable" });
  const choices = getSakuraCardChoices(state, at(state), "finale");
  assert.deepEqual(choices.map(({ instanceId, number, visibleCardId }) => [instanceId, number, visibleCardId]),
    [["empty-1", 1, undefined], ["discardable", 2, undefined]]);
  assert.deepEqual(getDiscardableSakuraChoices(state, choices).map(({ instanceId }) => instanceId), ["discardable"]);
  assert.equal(removeBigCardInstance(state, target.id, "empty-1", "discard"), false);
  assert.equal(removeBigCardInstance(state, target.id, "empty-1", "remove"), true);
});

test("极幻即真在无破厄时让控制技失效，仍结算毁灭之力冷却", () => {
  let state = fixture([EMPTY_CITY_CONTROL_ID, undefined, undefined]);
  assert.equal(playerClaimsJingu(at(state)), true);
  assert.equal(getActiveSkillCount(at(state), "1007"), 0);
  const casterId = at(state, 1).id;
  const targetId = at(state, 2).id;
  appendSkillInstances(at(state, 1), ["1044"]);
  state = submitPlayerAction(state, at(state).id, gain).state;
  state = submitPlayerAction(state, casterId, attack(targetId)).state;
  state = submitPlayerAction(state, targetId, gain).state;
  state = enterActionWindow(state, casterId);
  state = submitActionWindowSkill(state, casterId, { type: "skill", skillId: "1044", stacks: 1,
    switchActionIndex: 0, attackStatModifier: "power_plus_1_level_minus_1" });
  assert.ok(at(state, 1).buffs.some(({ id }) => id.startsWith("destroy_power_cooldown:")));
  state = drain(state);
  assert.equal(at(state, 2).hp, 19);
});

test("幻影在原座位可选中，复活只使用临时的治愈术，不公开临时技能", () => {
  let state = fixture(["10534", undefined, undefined]);
  const ownerId = at(state).id;
  const otherId = at(state, 1).id;
  at(state).hp = 1;
  appendSkillInstances(at(state), ["1063"]);
  at(state).spareLives = [{ hp: 12 }];
  at(state).buffs.push({ id: "skill_used:1063", stacks: 1, name: "原有治愈术已使用" });
  appendSkillInstances(at(state, 1), ["1044"]);
  assert.ok(at(state).emptyCityBodySpaceId);
  state = submitPlayerAction(state, ownerId, gain).state;
  state = submitPlayerAction(state, otherId, { ...attack(ownerId), stacks: 2 }).state;
  state = submitPlayerAction(state, at(state, 2).id, gain).state;
  while (state.phase === "action_window" && state.activeTimingPhase !== "revival_action") state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(at(state).hp, -1);
  assert.ok(at(state).emptyCityRecovery);
  assert.equal(at(state).spareLives?.length, 1);
  assert.equal(getActiveSkillCount(at(state), "1063"), 1);
  assert.equal(getActiveSkillCount(at(state, 1), "1044"), 0);
  assert.equal(isEmptyCitySkillSuspended(at(state), CHASE_SOUL_ID), true);
  assert.equal(isEmptyCitySkillSuspended(at(state), TIME_REWIND_ID), true);
  assert.equal(isEmptyCitySkillSuspended(at(state), "1050503"), false);
  const normalTime = { skills: ["1103"], emptyCitySkillsSuspended: true as const,
    skillInventory: [{ instanceId: "past-time", skillId: "1103", sourceBigCardInstanceId: "non-time" }],
    bigCards: [{ instanceId: "non-time", cardId: "10518" }], buffs: [] };
  assert.equal(getActiveSkillCount(normalTime, "1103"), 0);
  normalTime.bigCards[0]!.cardId = "10505";
  assert.equal(getActiveSkillCount(normalTime, "1103"), 1);
  const publicSeat = toPublicGameState(state, otherId).players[0]!;
  assert.equal(publicSeat.bigCardSlotCount, 1);
  assert.equal(publicSeat.skillSlotCount, 1);
  assert.equal(publicSeat.emptyCityRecovery, undefined);
  const blocked = submitActionWindowSkill(enterActionWindow(state, ownerId), ownerId, { type: "skill", skillId: "1065", stacks: 1 });
  assert.equal(at(blocked).hp, -1);
  assert.ok(at(blocked).emptyCityRecovery);
  state.pendingDamageItems = [...state.pendingDamageItems ?? [], { id: "queued-spell", sourceId: otherId, targetId: ownerId,
    amount: 1, attackName: "等待结算的外部效果", spellDamage: true, unprocessedSpell: true }];
  state = enterActionWindow(state, ownerId);
  state = submitActionWindowSkill(state, ownerId, { type: "skill", skillId: "1063", stacks: 1 });
  assert.ok(at(state).hp > 0);
  assert.ok(at(state).emptyCityBodySpaceId);
  assert.equal(at(state).emptyCityRecovery, undefined);
  assert.deepEqual(at(state).skills, ["1063"]);
  assert.equal(at(state).buffs.find(({ id }) => id === "skill_used:1063")?.stacks, 1);
  assert.equal(getActiveSkillCount(at(state, 1), "1044"), 1);
  const healed = state.eventLog.findIndex((event) => event.type === "heal" && event.reason === "治愈术");
  const damaged = state.eventLog.findIndex((event) => event.type === "damage" && event.attackName === "等待结算的外部效果");
  assert.ok(healed >= 0 && damaged > healed);
  assert.ok(toPublicGameState(state, otherId).eventLog.some((event) => event.type === "heal" && event.reason === "治愈术"));
  assert.ok(!toPublicGameState(state, otherId).eventLog.some((event) =>
    (event.type === "skill_used" || event.type === "skill_revealed") && event.skillId === "1063"));
});

test("放弃幻影的死亡响应会正常死亡，清除临时技能和全场技能失效", () => {
  let state = fixture(["10534", undefined, undefined]);
  const id = at(state).id;
  at(state).hp = 1;
  state = turn(state, gain, { ...attack(id), stacks: 2 });
  assert.equal(at(state).status, "dead");
  assert.equal(at(state).defeatLevel, 1);
  assert.equal(at(state).emptyCityRecovery, undefined);
  assert.equal(at(state).bigCards?.length, 1);
  assert.equal(getHunyaoPursuitTargets(state, CHASE_LIGHT_ID).some(({ id }) => id === at(state).id), false);
  assert.ok(state.players.every((player) => !player.emptyCitySkillsSuspended));
});

test("单独持有幻影替身时，其他玩家的技能和本体的非时空恢复照常生效", (context) => {
  context.mock.method(Date, "now", () => Date.parse("2026-11-12T23:00:00+08:00"));
  let state = fixture([EMPTY_CITY_ILLUSION_ID, undefined, undefined]);
  const ownerId = at(state).id;
  const opponentId = at(state, 1).id;
  at(state).hp = 1;
  at(state).spareLives = [{ hp: 12 }];
  appendSkillInstances(at(state, 1), ["1044"]);
  state = turn(state, gain, { ...attack(ownerId), stacks: 2 });
  assert.equal(at(state).status, "alive");
  assert.equal(at(state).hp, 12);
  assert.ok(at(state).emptyCityBody);
  assert.equal(at(state).emptyCityRecovery, undefined);
  assert.equal(getActiveSkillCount(state.players.find(({ id }) => id === opponentId), "1044"), 1);
});

test("精神穿刺留下负血傀儡，期满仍为负血才死亡；0血不转傀儡", () => {
  let state = fixture([PSYCHIC_PIERCE_ID, undefined, undefined, undefined]);
  const targetId = at(state, 1).id;
  at(state, 1).hp = 1;
  state = turn(state, { ...attack(targetId), stacks: 3 });
  assert.equal(at(state, 1).hp, -2);
  assert.equal(at(state, 1).status, "alive");
  assert.equal(getPuppetMasterId(at(state, 1)), at(state).id);
  assert.equal(state.roundNumber, 2);
  at(state, 2).cakes = 1;
  state = turn(state, gain, gain, attack(at(state, 3).id));
  assert.equal(state.roundNumber, 3);
  assert.equal(at(state, 1).status, "dead");
  assert.equal(getPuppetMasterId(at(state, 1)), undefined);

  state = fixture();
  at(state, 1).hp = 1;
  state = turn(state, attack(at(state, 1).id));
  assert.equal(at(state, 1).hp, 0);
  assert.equal(getPuppetMasterId(at(state, 1)), undefined);
});

test("有破厄时，毁灭之力仅对空城目标失效，群攻其他目标照常享受强化", () => {
  let state = fixture([EMPTY_CITY_CONTROL_ID, undefined, undefined, undefined]);
  const sourceId = at(state, 1).id;
  appendSkillInstances(at(state, 1), ["1044"]);
  appendSkillInstances(at(state, 2), ["1008"]);
  for (const [index, player] of state.players.entries())
    state = submitPlayerAction(state, player.id, index === 1 ? { type: "attack", attackId: "wan_jian", stacks: 1 } : gain).state;
  state = enterActionWindow(state, sourceId);
  state = submitActionWindowSkill(state, sourceId, { type: "skill", skillId: "1044", stacks: 1,
    switchActionIndex: 0, attackStatModifier: "power_plus_1_level_minus_1" });
  state = drain(state);
  assert.equal(at(state).hp, 20 - BASE_ATTACKS.wan_jian.power);
  assert.equal(at(state, 2).hp, 19 - BASE_ATTACKS.wan_jian.power);
  assert.equal(at(state, 3).hp, at(state, 2).hp);
});

test("有破厄时，空城持有者的杀看见原防御，旁人仍看见换防后的出招", () => {
  let state = fixture([EMPTY_CITY_CONTROL_ID, undefined, undefined, undefined]);
  const targetId = at(state, 1).id;
  appendSkillInstances(at(state, 1), ["1087"]);
  appendSkillInstances(at(state, 3), ["1008"]);
  for (const [index, player] of state.players.entries())
    state = submitPlayerAction(state, player.id, index === 1 ? { type: "defense", defense: "youtiao" } :
      index === 3 ? gain : attack(targetId)).state;
  state = enterActionWindow(state, targetId);
  state = submitActionWindowSkill(state, targetId, { type: "skill", skillId: "1087", stacks: 1,
    switchActionIndex: 0, switchToAction: { type: "defense", defense: "small" } });
  state = drain(state);
  assert.deepEqual(state.eventLog.flatMap((event) => event.type === "damage" && event.targetId === targetId ?
    [event.sourceId] : []), [at(state).id]);
});

test("幻影退游完成恢复判定后保留退游结果，临时技能不带进后续流程", () => {
  let state = fixture(["10534", undefined, undefined]);
  const paper = getAllSkills().find(({ name }) => name === "卷子")!.id;
  appendSkillInstances(at(state), ["1092", "1092", "1092"]);
  appendSkillInstances(at(state, 1), [paper]);
  at(state, 1).cakes = 50;
  state = turn(state, gain, { type: "skill", skillId: paper, targetId: at(state).id, stacks: 1 });
  assert.equal(at(state).defeatLevel, 2);
  assert.equal(at(state).emptyCityRecovery, undefined);
  assert.equal(at(state).bigCards?.length, 1);
  assert.equal(at(state).skills.filter((id) => id === "1092").length, 3);
  assert.ok(state.players.every((player) => !player.emptyCitySkillsSuspended));
  assert.equal(state.retirementCounter, undefined);
});

function markWind(state: GameState, targetIndex = 0, sourceIndex = 1): void {
  at(state, targetIndex).buffs.push({ id: "test-wind-trace", name: "风踪", stateType: WIND_TRACE,
    sourcePlayerId: at(state, sourceIndex).id, stacks: 1 });
}

function untilRevival(state: GameState): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== "revival_action" && i < 50; i++)
    state = advanceActionWindow(state);
  return state;
}

test("常规胜利不计幻影，白板判定仍计幻影", () => {
  let state = fixture([EMPTY_CITY_ILLUSION_ID, undefined, undefined]);
  appendSkillInstances(at(state, 1), ["1104"]);
  assert.equal(shouldFinishGame(state), false);
  at(state, 2).status = "dead";
  assert.equal(shouldFinishGame(state), true);
  state = turn(state, gain, gain);
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerIds, [at(state, 1).id]);
  assert.equal(state.victoryCounter, undefined);
});

test("普通招式只能打幻影，风踪让指向攻击与群攻触及本体", () => {
  let state = fixture([EMPTY_CITY_ILLUSION_ID, undefined, undefined]);
  const bodyId = at(state).emptyCityBody!.id;
  const source = at(state, 1);
  const bodyHp = at(state).emptyCityBody!.hp;
  assert.equal(validateAction(state, source.id, attack(bodyId)).ok, false);
  assert.equal(validateAction(state, source.id, attack(at(state).id)).ok, true);
  assert.equal(toPublicGameState(state, source.id).emptyCityAttackTargets, undefined);
  markWind(state);
  assert.equal(validateAction(state, source.id, attack(bodyId)).ok, true);
  assert.deepEqual(toPublicGameState(state, source.id).emptyCityAttackTargets?.map(({ id }) => id), [bodyId]);
  state = turn(state, gain, { type: "attack", attackId: "wan_jian", stacks: 1 });
  assert.ok(at(state).emptyCityBody!.hp < bodyHp);
  assert.ok(at(state).hp < 20);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === bodyId));
});

test("本体先死亡时不发动空城之下，原有治愈术可恢复并消耗真实次数", () => {
  let state = fixture([EMPTY_CITY_ILLUSION_ID, undefined, undefined]);
  const ownerId = at(state).id;
  const bodyId = at(state).emptyCityBody!.id;
  at(state).emptyCityBody!.hp = 1;
  appendSkillInstances(at(state), ["1063"]);
  appendSkillInstances(at(state, 1), ["1044"]);
  markWind(state);
  state = submitPlayerAction(state, ownerId, gain).state;
  state = submitPlayerAction(state, at(state, 1).id, { ...attack(bodyId), stacks: 2 }).state;
  state = untilRevival(submitPlayerAction(state, at(state, 2).id, gain).state);
  assert.equal(state.activeTimingPhase, "revival_action");
  assert.equal(at(state).emptyCityBodyDefeatId, bodyId);
  assert.equal(at(state).emptyCityBody, undefined);
  assert.equal(at(state).emptyCityRecovery, undefined);
  assert.equal(getActiveSkillCount(at(state, 1), "1044"), 1);
  const abandoned = drain(state);
  assert.equal(at(abandoned).status, "dead");
  assert.equal(getHunyaoPursuitTargets(abandoned, CHASE_LIGHT_ID).some(({ id }) => id === ownerId), false);
  state = submitActionWindowSkill(enterActionWindow(state, ownerId), ownerId, { type: "skill", skillId: "1063", stacks: 1 });
  assert.ok(at(state).emptyCityBody);
  assert.equal(at(state).emptyCityBodyDefeatId, undefined);
  assert.equal(at(state).buffs.find(({ id }) => id === "skill_used:1063")?.stacks, 1);
});

test("本体靠无限战意留场，期满时与幻影一起死亡", () => {
  let state = fixture([EMPTY_CITY_ILLUSION_ID, undefined, undefined, undefined]);
  const bodyId = at(state).emptyCityBody!.id;
  at(state).emptyCityBody!.hp = 1;
  appendSkillInstances(at(state), ["1112"]);
  markWind(state);
  state = turn(state, gain, { ...attack(bodyId), stacks: 2 });
  assert.equal(at(state).status, "alive");
  assert.equal(at(state).emptyCityBody!.hp, -1);
  const endRound = at(state).emptyCityBody!.buffs.find(({ id }) => id === "war_spirit")!.expiresAtRound!;
  at(state).emptyCityBody!.hp = 1;
  delete at(state).emptyCityBody!.hpValue;
  while (state.roundNumber < endRound) {
    at(state, 2).cakes = 2;
    state = turn(state, gain, gain, attack(at(state, 3).id));
  }
  assert.equal(at(state).status, "dead");
  assert.equal(at(state).emptyCityBody, undefined);
  assert.equal(at(state).emptyCityRecovery, undefined);
});

test("樱落选中未暴露空城会拒绝提交，绽尽芳华也不能支付自身弃置代价", () => {
  let state = fixture(["10531", "10534", undefined, undefined]);
  const casterId = at(state).id;
  const body = at(state, 1).emptyCityBody!;
  body.hp = 1;
  changeElementAmount(at(state), "樱", 10);
  markWind(state, 1, 2);
  const attackBody = { ...attack(body.id), stacks: 2 };
  for (const [index, player] of state.players.entries())
    state = submitPlayerAction(state, player.id, index === 2 ? attackBody : gain).state;
  state = untilRevival(state);
  assert.equal(state.activeTimingPhase, "revival_action");
  const choice = toPublicGameState(state, casterId).sakuraCardChoices?.find(({ instanceId }) => instanceId === "empty-1");
  assert.ok(choice);
  assert.equal(choice.visibleCardId, undefined);
  assert.throws(() => submitActionWindowSkill(enterActionWindow(state, casterId), casterId,
    { type: "skill", skillId: SAKURA_FALL_ID, stacks: 1, removeSkillInstanceIds: [choice.instanceId] }), /仍可弃置/);
  assert.equal(getElementAmount(at(state), "樱"), 10);
  state = fixture(["10531", undefined, undefined]);
  at(state).bigCards!.push({ cardId: "10531", instanceId: "second-sakura" }, { cardId: "10534", instanceId: "protected" });
  changeElementAmount(at(state), "樱", 30);
  assert.equal(getElementAmount(at(state), "樱"), 30);
  const verdict = validateAction(state, at(state).id, { type: "skill", skillId: SAKURA_FINALE_ID, stacks: 1,
    removeSkillInstanceIds: [] });
  assert.equal(verdict.ok, false);
  if (!verdict.ok) assert.match(verdict.error, /无法弃置自己的全部大卡/);
});

test("绽尽芳华破除小空间后直接必杀空城本体，不触发幻影临时恢复", () => {
  let state = fixture(["10531", "10534", undefined, undefined]);
  const bodyId = at(state, 1).emptyCityBody!.id;
  at(state).bigCards!.push({ cardId: "10531", instanceId: "second-sakura" });
  changeElementAmount(at(state), "樱", 30);
  state = turn(state, { type: "skill", skillId: SAKURA_FINALE_ID, stacks: 1, removeSkillInstanceIds: [] });
  assert.equal(at(state, 1).defeatLevel, 4);
  assert.equal(at(state, 1).emptyCityBodyDefeatId, bodyId);
  assert.equal(at(state, 1).emptyCityRecovery, undefined);
});
