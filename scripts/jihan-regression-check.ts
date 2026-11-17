import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALL_SKILLS_SEALED_BUFF_ID, INFINITE_DAMAGE, JIHAN_CARD_ID, JIHAN_ULTIMATE_ID, POLAR_GALAXY_ID,
  FENTIAN_CARD_ID, LAVA_ARMOR_ID, DRAGON_CARD_ID, DRAGON_DOMINION_ID, VERDICT_CARD_ID, VERDICT_ACTION_ID,
  STAR_CARD_ID, STAR_RESIST_ID, combatValue,
  NEGATIVE_STATUS_IMMUNITY_BUFF_ID, addPlayerToGame, advanceActionWindow, appendSkillInstances,
  createGame, createPlayer, formatPlayerHp, getActiveFusionCount, getActiveSkillCount, startGame,
  beginActionPrompt, getSkillUseLimit, getTurnSkillActionCost, previewPlayerAttackStats, submitActionWindowSkill,
  submitPlayerAction, submitPointGameAction, toPublicGameState, validateAction, type GameState, type PlayerAction, type SkillAction
} from "@bing/shared";
import { YUAN_CARD_ID, YUAN_VOID_ID } from "../packages/shared/src/engine/yuanIds";

const cake: PlayerAction = { type: "gain_cake" };
const small: PlayerAction = { type: "defense", defense: "small" };
const stone: PlayerAction = { type: "defense", defense: "stone" };
const electricShock = "1035";
const bagua = "1049";
const holyRealm = "1074";
const skillReflection = { id: "test-skill-rebound", name: "技能反弹", stacks: 1, stateType: "skill_rebound", expiresAtTurn: 2 };
const player = (state: GameState, index = 0) => state.players[index]!;
const card = (state: GameState, index = 0) => player(state, index).bigCards![0]!;
const sha = (state: GameState, target: number, stacks = 1): PlayerAction =>
  ({ type: "attack", attackId: "sha", stacks, targetId: player(state, target).id });
const cast = (skillId: string, targetId?: string): SkillAction =>
  ({ type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {}) });
const rebound = (state: GameState, target: number): PlayerAction =>
  ({ type: "defense", defense: "rebound", targetId: player(state, target).id });
const iceCounter = (state: GameState) => state.eventLog.filter((event) =>
  event.type === "damage" && event.attackName === "极寒之拥·冰伤反击");

function drain(state: GameState, stop?: string): GameState {
  for (let index = 0; index < 100 && state.phase === "action_window" && state.activeTimingPhase !== stop; index++) {
    state = advanceActionWindow(state);
  }
  return state;
}

function fixture(count = 4, owners = [0], extraCards: string[][] = []): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 1 + Math.max(0, ...extraCards.map((cards) => cards.length)), firstTurnNoAttack: false });
  for (let index = 1; index < count; index++) state = addPlayerToGame(state, createPlayer(String.fromCharCode(65 + index)));
  for (const index of owners) player(state, index).bigCards = [{ cardId: JIHAN_CARD_ID, instanceId: `jihan-${index}` }];
  for (const [index, cards] of extraCards.entries()) for (const [copy, cardId] of cards.entries()) {
    (player(state, index).bigCards ??= []).push({ cardId, instanceId: `extra-${index}-${copy}` });
  }
  state = startGame(state);
  state.players.forEach((p) => { p.hp = 1300; p.cakes = 50; });
  return drain(state);
}

function turn(state: GameState, actions: PlayerAction[], change?: (revealed: GameState) => GameState): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, p] of state.players.entries()) {
    if (p.status !== "alive" || state.pendingActions[p.id]) continue;
    const action = actions[index] ?? cake;
    const validation = validateAction(state, p.id, action);
    assert.ok(validation.ok, JSON.stringify(validation));
    state = submitPlayerAction(state, p.id, action).state;
  }
  if (change) {
    state = drain(state, "turn_change_action");
    assert.equal(state.activeTimingPhase, "turn_change_action");
    state = change(state);
  }
  return drain(state, "turn_end_action");
}

test("开局授予极寒风暴，普通反弹按实际扣血记账，技能反弹不记账", () => {
  let state = fixture(4, [1]);
  assert.equal(getActiveFusionCount(player(state, 1), "极寒风暴"), 1);
  assert.equal(getActiveFusionCount(player(state, 1), "大雪球"), 1);
  assert.equal(getActiveFusionCount(player(state, 1), "极寒"), 1);
  assert.equal(getActiveFusionCount(player(state, 1), "弹力球"), 1);
  player(state, 1).buffs.push({ id: "sealed_skill:1057", name: "封印散弹", stacks: 1 });
  appendSkillInstances(player(state, 2), [bagua]);
  state = turn(state, [sha(state, 1, 3), rebound(state, 2), cake, cake]);
  assert.equal(card(state, 1).jihanDamage, 2);
  assert.equal(player(state, 2).hp, 1298);
  assert.equal(iceCounter(state).length, 0);

  state = fixture(4, [1]);
  player(state, 1).buffs.push(skillReflection);
  state = turn(state, [sha(state, 1, 3), cake, cake, cake]);
  assert.equal(player(state).hp, 1297);
  assert.equal(card(state, 1).jihanDamage ?? 0, 0);
});

test("极寒的霜落大地限两次，回自己八血、符合条件的他人两血", () => {
  let state = fixture();
  const frostfall = "1013";
  appendSkillInstances(player(state, 1), ["1015"]);
  assert.equal(getSkillUseLimit(player(state), frostfall), 2);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, player(state).id, cast(frostfall));
  assert.deepEqual(state.players.map(({ hp }) => hp), [1308, 1300, 1302, 1302]);
  assert.equal(getActiveSkillCount(player(state, 1), "1015"), 0);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, player(state).id, cast(frostfall));
  assert.deepEqual(state.players.map(({ hp }) => hp), [1316, 1302, 1304, 1304]);
  beginActionPrompt(state, "turn_before_action");
  assert.throws(() => submitActionWindowSkill(state, player(state).id, cast(frostfall)), /次数上限/);
});

test("极寒保护冰系技能免遭消除，但仍承受火烧大地的法伤", () => {
  let state = fixture();
  const burningEarth = "1012", frostBlade = "1017";
  appendSkillInstances(player(state, 1), [burningEarth]);
  appendSkillInstances(player(state, 2), [frostBlade]);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, player(state, 1).id, cast(burningEarth));
  assert.equal(player(state).hp, 1298);
  assert.equal(getActiveFusionCount(player(state), "极寒"), 1);
  assert.equal(getActiveSkillCount(player(state), frostBlade), 1);
  assert.equal(getActiveSkillCount(player(state, 2), frostBlade), 0);
});

test("极寒的冰漩决只耗一饼，凛冬与寒冰剑同用时保留强化后的伤害", () => {
  let state = fixture();
  const iceVortex = "1117";
  assert.equal(getTurnSkillActionCost(player(state), cast(iceVortex)), 1);
  player(state).cakes = 1;
  state = turn(state, [cast(iceVortex, player(state, 2).id), cake, cake, cake]);
  assert.equal(player(state).cakes, 0);
  state = drain(state);
  player(state).cakes = 1;
  player(state).buffs.push({ id: "winter_mark", name: "凛冬印记", stacks: 1 });
  for (const [index, p] of state.players.entries()) {
    if (state.pendingActions[p.id]) continue;
    state = submitPlayerAction(state, p.id, index === 0 ? sha(state, 1) : cake).state;
  }
  state = drain(state, "turn_change_action");
  state = submitActionWindowSkill(state, player(state).id, cast("1021"));
  state = submitActionWindowSkill(state, player(state).id, cast("1017"));
  const stats = previewPlayerAttackStats(state, player(state).id).stats[0]!;
  assert.deepEqual([stats.power, stats.level, stats.freezeTurns], [2, 2, 1]);
  state = drain(state, "turn_end_action");
  assert.equal(player(state, 1).hp, 1298);
  assert.ok(player(state, 1).buffs.some(({ id }) => id.startsWith("skill_disabled_until_round:")));
});

test("反弹伤害触发持卡人的嗜血，并保留原攻击来源", () => {
  let state = fixture(4, [1]);
  player(state, 1).buffs.push({ id: "sealed_skill:1057", name: "封印散弹", stacks: 1 });
  appendSkillInstances(player(state, 1), ["1045"]);
  appendSkillInstances(player(state, 2), [bagua]);
  state = turn(state, [sha(state, 1, 5), rebound(state, 2), cake, cake]);
  assert.equal(player(state, 1).hp, 1301);
  assert.equal(card(state, 1).jihanDamage, 4);
  const damage = state.eventLog.find((event) => event.type === "damage");
  assert.equal(damage?.sourceId, player(state).id);
  assert.deepEqual(damage?.reboundSkillSourceIds, [player(state, 1).id]);
  const publicDamage = toPublicGameState(state, player(state, 2).id).eventLog.find((event) => event.type === "damage");
  assert.equal(publicDamage?.reboundSkillSourceIds, undefined);
});

test("同一判定点每次命中各反击一次，按点前计数打其他玩家", () => {
  let state = fixture();
  state = turn(state, [cake, sha(state, 0), sha(state, 0), cake]);
  assert.equal(player(state).hp, 1298);
  assert.equal(iceCounter(state).length, 6);
  assert.ok(iceCounter(state).every((event) => event.type === "damage" && event.amount === 1 && event.targetId !== player(state).id));
  assert.equal(card(state).jihanDamage, 6);
  state = drain(state);
  player(state, 1).cakes = 1;
  state = turn(state, [cake, sha(state, 0), cake, cake]);
  assert.deepEqual(iceCounter(state).slice(-3).map((event) => event.type === "damage" && event.amount), [7, 7, 7]);
});

test("冰伤反击穿透伤害免疫和伤害无视，仍受整条锁定技或大卡无视", () => {
  let state = fixture(5);
  appendSkillInstances(player(state, 1), [holyRealm]);
  player(state, 1).buffs.push({ id: "test-damage-ignore", name: "无视法伤和冰伤", stacks: 1,
    ignoredDamageKinds: ["spell"], ignoredDamageElements: ["ice"] });
  player(state, 2).buffs.push({ id: "test-locked-ignore", name: "无视锁定技", stacks: 1, ignoredSkillTypeTags: ["锁定技"] });
  player(state, 3).buffs.push({ id: "test-card-ignore", name: "无视极寒之拥", stacks: 1, ignoredBigCardIds: [JIHAN_CARD_ID] });
  player(state, 4).buffs.push({ id: "temp_six_star_immunity", name: "六芒星", stacks: 1, expiresAtTurn: 1, sixStarMaxDamage: 0 });
  state = turn(state, [cake, sha(state, 0), cake, cake, cake]);
  assert.deepEqual(iceCounter(state).map((event) => event.type === "damage" && event.targetId),
    [player(state, 1).id, player(state, 4).id]);
});

test("冰伤反击看未防住，回避和减伤触发，无敌和抵挡计为防住", () => {
  let state = fixture();
  appendSkillInstances(player(state), [bagua]);
  state = turn(state, [cake, sha(state, 0), cake, cake]);
  assert.equal(iceCounter(state).length, 3);
  for (const protection of ["temp_invulnerable", "temp_absolute_invulnerable", "temp_shield_normal", "jin_zhong_zhao", "skill_attack_block"]) {
    state = fixture();
    player(state).buffs.push({ id: protection, name: protection, stacks: 1, expiresAtTurn: protection === "skill_attack_block" ? 2 : 1,
      ...(protection === "jin_zhong_zhao" ? { sourcePlayerId: player(state, 1).id } : {}),
      ...(protection === "skill_attack_block" ? { skillAttackBlockLimit: combatValue(10) } : {}) });
    state = turn(state, [cake, sha(state, 0), cake, cake]);
    assert.equal(iceCounter(state).length, 0, protection);
    assert.equal(card(state).jihanBlocks ?? 0, 1, protection);
  }
  state = fixture();
  state = turn(state, [small, sha(state, 0), cake, cake]);
  assert.equal(iceCounter(state).length, 0);
  state = fixture();
  state = turn(state, [sha(state, 1), sha(state, 0), cake, cake]);
  assert.equal(iceCounter(state).length, 0);
});

test("闪现回避多段攻击仍只触发一次冰伤反击，不增加防住计数或触发命中效果", () => {
  let state = fixture();
  appendSkillInstances(player(state), ["1102"]);
  appendSkillInstances(player(state, 1), ["1017", "1095"]);
  state = turn(state, [cake, cast("1095", player(state).id), cake, cake], (revealed) => {
    const enhanced = submitActionWindowSkill(revealed, player(revealed, 1).id, cast("1017"));
    return submitActionWindowSkill(enhanced, player(enhanced).id, cast("1102"));
  });
  assert.equal(player(state).hp, 1300);
  assert.ok(!player(state).buffs.some(({ id }) => id.startsWith("skill_disabled_until_round:")));
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === player(state).id &&
    event.blockKind === "dodge" && event.protectionName === "闪现"));
  assert.equal(iceCounter(state).length, 3);
  assert.equal(card(state).jihanBlocks ?? 0, 0);
});

test("虚元回避指向攻击同样触发冰伤反击", () => {
  let state = fixture(4, [0], [[YUAN_CARD_ID]]);
  state = turn(state, [cast(YUAN_VOID_ID), sha(state, 0), cake, cake]);
  assert.equal(player(state).hp, 1300);
  assert.ok(state.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === player(state).id &&
    event.blockKind === "dodge" && event.protectionName === "虚元"));
  assert.equal(iceCounter(state).length, 3);
  assert.equal(card(state).jihanBlocks ?? 0, 0);
});

test("变伤阶段抵御卷子的退游点伤害，命中点仍判为未防住", () => {
  let state = fixture(4, [0], [[STAR_CARD_ID]]);
  player(state).buffs.push({ id: "defense_value", name: "防御值", stacks: 3 });
  appendSkillInstances(player(state, 1), ["1094"]);
  state = [cake, cast("1094", player(state).id), cake, cake]
    .reduce((current, action, index) => submitPlayerAction(current, player(current, index).id, action).state, state);
  state = drain(state, "turn_damage_modify");
  const damage = state.pendingDamageItems?.find((item) => item.targetId === player(state).id && item.pointDefeatLevel === 2);
  assert.ok(damage);
  state = drain(submitActionWindowSkill(state, player(state).id, { ...cast(STAR_RESIST_ID), targetDamageId: damage.id }), "turn_end_action");
  assert.equal(player(state).hp, 1300);
  assert.equal(iceCounter(state).length, 3);
  assert.equal(card(state).jihanBlocks ?? 0, 0);
});

test("免疫来袭攻击仍会反击，法伤超过100时变为无限", () => {
  let state = fixture();
  appendSkillInstances(player(state), [holyRealm]);
  card(state).jihanDamage = 100;
  state = turn(state, [cake, { type: "attack", attackId: "he_bao", stacks: 1, targetId: player(state).id }, cake, cake]);
  assert.equal(player(state).hp, 1300);
  assert.deepEqual(iceCounter(state).map((event) => event.type === "damage" && event.amount),
    [INFINITE_DAMAGE, INFINITE_DAMAGE, INFINITE_DAMAGE]);
});

test("极地银河按目标检查石头和回血，一个目标防住就冰封整组", () => {
  let state = fixture();
  state = turn(state, [cast(POLAR_GALAXY_ID), stone, cake, cake]);
  assert.equal(player(state).hp, 1320);
  assert.deepEqual(state.players.slice(1).map((p) => p.buffs.find((b) => b.id === "frozen")?.stacks), [2, 2, 2]);
  assert.equal(card(state).jihanDamage, 8);

  state = fixture();
  state = turn(state, [cast(POLAR_GALAXY_ID), rebound(state, 0), stone, cake]);
  assert.equal(player(state).hp, 1320, "普通反弹挡下攻击仍未用石头防住");
  assert.equal(player(state, 1).hp, 1300);
  assert.equal(player(state, 1).buffs.find((buff) => buff.id === "frozen")?.stacks, 2);

  state = fixture();
  player(state, 1).buffs.push({ id: "temp_invulnerable", name: "无敌", stacks: 1, expiresAtTurn: 1 });
  appendSkillInstances(player(state, 2), ["1102"]);
  player(state, 3).buffs.push({ id: "temp_shield_skill", name: "鬼罩", stacks: 1, expiresAtTurn: 1 });
  state = turn(state, [cast(POLAR_GALAXY_ID), cake, cake, cake], (revealed) =>
    submitActionWindowSkill(revealed, player(revealed, 2).id, cast("1102")));
  assert.equal(player(state).hp, 1330);
  assert.ok(state.players.slice(1).every((p) => p.hp === 1300 && p.buffs.some((b) => b.id === "frozen")));
});

test("饼防和出招弹防同样可触发冰封和增加计数", () => {
  let state = fixture();
  state = turn(state, [small, sha(state, 0), sha(state, 0), cake]);
  assert.equal(card(state).jihanBlocks, 2);
  state = turn(state, [sha(state, 1), small, cake, cake]);
  assert.equal(player(state, 1).buffs.find((b) => b.id === "frozen")?.stacks, 6);

  state = fixture();
  state = turn(state, [{ type: "attack", attackId: "chao_he_bao", stacks: 1, targetId: player(state, 1).id }, cake, cake, cake]);
  assert.equal(player(state, 1).buffs.find((b) => b.id === "frozen")?.stacks, 2);
  state = fixture();
  state = turn(state, [cake, { type: "attack", attackId: "chao_he_bao", stacks: 1, targetId: player(state).id }, cake, cake]);
  assert.equal(card(state).jihanBlocks, 1);
  assert.equal(iceCounter(state).length, 0);
  state = fixture(4, [0, 1]);
  player(state).buffs.push({ id: "sealed_skill:1056", name: "封印绝弹", stacks: 1 });
  state = turn(state, [rebound(state, 2), cast(POLAR_GALAXY_ID), cake, cake]);
  assert.equal(card(state).jihanBlocks, 1);
  state = fixture();
  card(state).jihanBlocks = 10;
  state = turn(state, [cast(POLAR_GALAXY_ID), rebound(state, 0), cake, cake]);
  assert.ok(player(state, 1).buffs.some((buff) => buff.id === "frozen" && buff.infinite && buff.expiresAtTurn === undefined));
  assert.equal(card(state).jihanBlocks, 10);
});

test("成功反弹与目标丢失均不触发原目标的冰伤反击或防住计数", () => {
  for (const kind of ["rebound", "skill_rebound", "lost"]) {
    let state = fixture();
    if (kind === "skill_rebound") player(state).buffs.push(skillReflection);
    const result = [kind === "rebound" ? rebound(state, 2) : cake, sha(state, 0), cake, cake]
      .reduce((current, action, index) => submitPlayerAction(current, player(current, index).id, action).state, state);
    if (kind === "lost") player(result).status = "dead";
    state = drain(result, "turn_end_action");
    assert.equal(iceCounter(state).length, 0, kind);
    assert.equal(card(state).jihanBlocks ?? 0, 0, kind);
  }
});

test("整招无视仍判石头防；伤害无视与整招无视使用各自的穿透条件", () => {
  for (const [ignoredKind, whole, damage, defend, expectedHp] of [
    ["move", false, true, false, 1300], ["move", true, false, false, 1296], ["move", true, true, true, 1300],
    ["damage", true, false, false, 1300], ["damage", false, true, false, 1296]
  ] as const) {
    let state = fixture();
    player(state, 1).buffs.push({ id: "test-ignore", name: "测试无视", stacks: 1,
      ...(ignoredKind === "move" ? { ignoredBigCardIds: [JIHAN_CARD_ID] } : { ignoredDamageKinds: ["attack"] }) });
    state = [cast(POLAR_GALAXY_ID), defend ? stone : cake, cake, cake]
      .reduce((current, action, index) => submitPlayerAction(current, player(current, index).id, action).state, state);
    player(state).buffs.push({ id: "test-move-resolution", name: "测试出招判定", stacks: 1,
      attackActionIndex: 0, expiresAtTurn: state.turnNumber,
      moveResolution: { ignoreMoveWhenUndefended: whole, ignoreDamageWhenUndefended: damage } });
    state = drain(state, "turn_end_action");
    assert.equal(player(state, 1).hp, expectedHp);
    assert.equal(player(state).hp, defend ? 1320 : 1330);
    assert.equal(player(state, 2).buffs.find((buff) => buff.id === "frozen")?.stacks, defend ? 2 : undefined);
  }
});

test("用出招防住无限散弹时增加至冰封成长上限", () => {
  let state = fixture(5);
  appendSkillInstances(player(state, 1), ["1057"]);
  appendSkillInstances(player(state, 2), ["1057"]);
  state = turn(state, [small, rebound(state, 2), rebound(state, 1), sha(state, 1), cake]);
  assert.equal(card(state).jihanBlocks, 10);
  assert.equal(iceCounter(state).length, 0);
});

test("电击法术出招命中或被出招弹防住都会触发封锁，按回合末解除", () => {
  let state = fixture(4, [0]);
  appendSkillInstances(player(state), [electricShock]);
  appendSkillInstances(player(state, 1), [bagua, electricShock]);
  state = turn(state, [cast(electricShock, player(state, 1).id), cake, cake, cake]);
  assert.equal(card(state).jihanSeals, 1);
  assert.equal(getActiveSkillCount(player(state, 1), bagua), 0);
  state = drain(state);
  assert.equal(state.turnNumber, 2);
  assert.equal(getActiveSkillCount(player(state, 1), bagua), 0);
  assert.equal(validateAction(state, player(state, 1).id, cast(electricShock, player(state).id)).ok, false);
  state = drain(turn(state, [cake, cake, cake, cake]));
  assert.equal(state.turnNumber, 3);
  assert.equal(getActiveSkillCount(player(state, 1), bagua), 1);

  state = fixture();
  appendSkillInstances(player(state, 1), [bagua, electricShock]);
  player(state).buffs.push({ id: "sealed_skill:1056", name: "封印绝弹", stacks: 1 });
  card(state).jihanSeals = 10;
  state = turn(state, [rebound(state, 1), cast(electricShock, player(state).id), cake, cake]);
  assert.equal(getActiveSkillCount(player(state, 1), bagua), 0);
  assert.ok(player(state, 1).buffs.some((buff) => buff.id === `${ALL_SKILLS_SEALED_BUFF_ID}:turn` && buff.infinite));
  assert.equal(card(state).jihanBlocks ?? 0, 0);

  state = fixture();
  appendSkillInstances(player(state, 1), [electricShock]);
  player(state).buffs.push({ id: "temp_shield_skill", name: "鬼罩", stacks: 1, expiresAtTurn: 1 });
  state = turn(state, [cake, cast(electricShock, player(state).id), cake, cake]);
  assert.equal(card(state).jihanSeals, 1);
  assert.ok(player(state, 1).buffs.some((buff) => buff.stateType === ALL_SKILLS_SEALED_BUFF_ID));
  assert.ok(!player(state).buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
});

test("8饼非攻击大招施加冰封和封锁，只有冰封被不良状态免疫拦下", () => {
  let state = fixture(5);
  appendSkillInstances(player(state, 1), [bagua]);
  player(state, 1).buffs.push({ id: NEGATIVE_STATUS_IMMUNITY_BUFF_ID, name: "免疫不良", stacks: 1, expiresAtTurn: 1 });
  appendSkillInstances(player(state, 2), [holyRealm]);
  player(state, 4).buffs.push({ id: "test-card-ignore", name: "无视极寒之拥", stacks: 1, ignoredBigCardIds: [JIHAN_CARD_ID] });
  state = turn(state, [cast(JIHAN_ULTIMATE_ID), cake, cake, cake, cake]);
  assert.equal(player(state).cakes, 42);
  assert.equal(player(state).hp, 1300);
  assert.equal(formatPlayerHp(player(state, 1)), "−∞+1300");
  assert.equal(player(state, 1).defeatLevel, 1);
  assert.equal(getActiveSkillCount(player(state, 1), bagua), 0);
  assert.ok(!player(state, 1).buffs.some((buff) => buff.id === "frozen"));
  assert.equal(player(state, 2).hp, 1300);
  assert.equal(player(state, 3).buffs.find((buff) => buff.id === "frozen")?.expiresAtRound, state.roundNumber + 3);
  assert.equal(player(state, 3).buffs.find((buff) => buff.id === `${ALL_SKILLS_SEALED_BUFF_ID}:round`)?.expiresAtRound, state.roundNumber + 2);
  assert.equal(player(state, 4).hp, 1300);
  assert.equal(card(state).jihanSeals, 2);
  assert.equal(card(state).jihanDamage, 100);
  assert.equal(iceCounter(state).length, 0);
  assert.equal(getActiveFusionCount(player(state), "大雪球"), 1);
});

test("熔岩天甲和霸龙只给成功作用到的玩家计入非攻击命中", () => {
  let state = fixture(4, [0], [[FENTIAN_CARD_ID]]);
  player(state, 2).buffs.push({ id: NEGATIVE_STATUS_IMMUNITY_BUFF_ID, name: "免疫不良", stacks: 1, expiresAtTurn: 1 });
  state = turn(state, [{ ...cast(LAVA_ARMOR_ID), targetIds: [player(state, 1).id, player(state, 2).id] }, cake, cake, cake]);
  const sealed = (index: number) => player(state, index).buffs.some((buff) => buff.stateType === ALL_SKILLS_SEALED_BUFF_ID);
  assert.equal(card(state).jihanSeals, 1);
  assert.equal(sealed(1), true);
  assert.equal(sealed(2), false);

  state = fixture(4, [0], [[DRAGON_CARD_ID], [FENTIAN_CARD_ID], [VERDICT_CARD_ID]]);
  player(state, 2).buffs.push({ id: NEGATIVE_STATUS_IMMUNITY_BUFF_ID, name: "免疫不良", stacks: 1, expiresAtTurn: 1 });
  state = turn(state, [cast(DRAGON_DOMINION_ID), cake, cake, cake]);
  assert.equal(card(state).jihanSeals, 1);
  assert.equal(sealed(1), true);
  assert.equal(sealed(2), false);
  assert.equal(sealed(3), false);
});

test("成功发起御秽裁决即触发封锁，胜负不影响命中", () => {
  let state = fixture(4, [0], [[VERDICT_CARD_ID]]);
  state = [cast(VERDICT_ACTION_ID, player(state, 1).id), cake, cake, cake]
    .reduce((current, action, index) => submitPlayerAction(current, player(current, index).id, action).state, state);
  state = drain(state, "turn_reveal_check");
  for (const [index, move] of (["rock", "paper"] as const).entries()) {
    const id = player(state, index).id;
    const game = toPublicGameState(state, id).pointGame!;
    state = submitPointGameAction(state, id, { kind: "move", gameId: game.id, round: game.round, move });
  }
  state = drain(state, "turn_end_action");
  assert.equal(card(state).jihanSeals, 1);
  assert.ok(player(state, 1).buffs.some((buff) => buff.stateType === ALL_SKILLS_SEALED_BUFF_ID));
});
