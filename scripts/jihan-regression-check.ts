import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALL_SKILLS_SEALED_BUFF_ID, INFINITE_DAMAGE, JIHAN_CARD_ID, JIHAN_ULTIMATE_ID, POLAR_GALAXY_ID,
  NEGATIVE_STATUS_IMMUNITY_BUFF_ID, addPlayerToGame, advanceActionWindow, appendSkillInstances,
  createGame, createPlayer, formatPlayerHp, getActiveFusionCount, getActiveSkillCount, startGame,
  beginActionPrompt, getSkillUseLimit, getTurnSkillActionCost, previewPlayerAttackStats, submitActionWindowSkill,
  submitPlayerAction, toPublicGameState, validateAction, type GameState, type PlayerAction, type SkillAction
} from "@bing/shared";

const cake: PlayerAction = { type: "gain_cake" };
const small: PlayerAction = { type: "defense", defense: "small" };
const stone: PlayerAction = { type: "defense", defense: "stone" };
const electricShock = "skill_36_14343";
const bagua = "skill_50_50034";
const holyRealm = "skill_75_68329";
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

function fixture(count = 4, owners = [0]): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false });
  for (let index = 1; index < count; index++) state = addPlayerToGame(state, createPlayer(String.fromCharCode(65 + index)));
  for (const index of owners) player(state, index).bigCards = [{ cardId: JIHAN_CARD_ID, instanceId: `jihan-${index}` }];
  state = startGame(state);
  state.players.forEach((p) => { p.hp = 1300; p.cakes = 50; });
  return drain(state);
}

function turn(state: GameState, actions: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, p] of state.players.entries()) {
    if (p.status !== "alive" || state.pendingActions[p.id]) continue;
    const action = actions[index] ?? cake;
    const validation = validateAction(state, p.id, action);
    assert.ok(validation.ok, JSON.stringify(validation));
    state = submitPlayerAction(state, p.id, action).state;
  }
  return drain(state, "turn_end_action");
}

test("开局授予极寒风暴，普通反弹按实际扣血记账，技能反弹不记账", () => {
  let state = fixture(4, [1]);
  assert.equal(getActiveFusionCount(player(state, 1), "极寒风暴"), 1);
  assert.equal(getActiveFusionCount(player(state, 1), "大雪球"), 1);
  assert.equal(getActiveFusionCount(player(state, 1), "极寒"), 1);
  assert.equal(getActiveFusionCount(player(state, 1), "弹力球"), 1);
  player(state, 1).buffs.push({ id: "sealed_skill:skill_58_88471", name: "封印散弹", stacks: 1 });
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
  const frostfall = "skill_14_46860";
  appendSkillInstances(player(state, 1), ["huo_yan_dao"]);
  assert.equal(getSkillUseLimit(player(state), frostfall), 2);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, player(state).id, cast(frostfall));
  assert.deepEqual(state.players.map(({ hp }) => hp), [1308, 1300, 1302, 1302]);
  assert.equal(getActiveSkillCount(player(state, 1), "huo_yan_dao"), 0);
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, player(state).id, cast(frostfall));
  assert.deepEqual(state.players.map(({ hp }) => hp), [1316, 1302, 1304, 1304]);
  beginActionPrompt(state, "turn_before_action");
  assert.throws(() => submitActionWindowSkill(state, player(state).id, cast(frostfall)), /次数上限/);
});

test("极寒保护冰系技能免遭消除，但仍承受火烧大地的法伤", () => {
  let state = fixture();
  const burningEarth = "skill_13_68869", frostBlade = "skill_18_34323";
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
  const iceVortex = "skill_118_53580";
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
  state = submitActionWindowSkill(state, player(state).id, cast("skill_22_54978"));
  state = submitActionWindowSkill(state, player(state).id, cast("skill_18_34323"));
  const stats = previewPlayerAttackStats(state, player(state).id).stats[0]!;
  assert.deepEqual([stats.power, stats.level, stats.freezeTurns], [2, 2, 1]);
  state = drain(state, "turn_end_action");
  assert.equal(player(state, 1).hp, 1298);
  assert.ok(player(state, 1).buffs.some(({ id }) => id.startsWith("skill_disabled_until_round:")));
});

test("反弹伤害触发持卡人的嗜血，并保留原攻击来源", () => {
  let state = fixture(4, [1]);
  player(state, 1).buffs.push({ id: "sealed_skill:skill_58_88471", name: "封印散弹", stacks: 1 });
  appendSkillInstances(player(state, 1), ["skill_46_3651"]);
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

test("减伤到零仍命中，基础防御、对撞抵消、回避、无敌和抵挡均排除", () => {
  let state = fixture();
  appendSkillInstances(player(state), [bagua]);
  state = turn(state, [cake, sha(state, 0), cake, cake]);
  assert.equal(iceCounter(state).length, 3);
  for (const protection of ["temp_flash_dodge", "temp_invulnerable", "temp_shield_normal"]) {
    state = fixture();
    player(state).buffs.push({ id: protection, name: protection, stacks: 1, expiresAtTurn: 1 });
    state = turn(state, [cake, sha(state, 0), cake, cake]);
    assert.equal(iceCounter(state).length, 0, protection);
  }
  state = fixture();
  state = turn(state, [small, sha(state, 0), cake, cake]);
  assert.equal(iceCounter(state).length, 0);
  state = fixture();
  state = turn(state, [sha(state, 1), sha(state, 0), cake, cake]);
  assert.equal(iceCounter(state).length, 0);
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
  for (const [index, id] of ["temp_invulnerable", "temp_flash_dodge", "temp_shield_skill"].entries()) {
    player(state, index + 1).buffs.push({ id, name: id, stacks: 1, expiresAtTurn: 1 });
  }
  state = turn(state, [cast(POLAR_GALAXY_ID), cake, cake, cake]);
  assert.equal(player(state).hp, 1330);
  assert.ok(state.players.slice(1).every((p) => p.hp === 1300 && !p.buffs.some((b) => b.id === "frozen")));
});

test("只有基础防御增加冰封计数，超核爆饼防和出招弹防技能可触发冰封", () => {
  let state = fixture();
  state = turn(state, [small, sha(state, 0), sha(state, 0), cake]);
  assert.equal(card(state).jihanBlocks, 2);
  state = turn(state, [sha(state, 1), small, cake, cake]);
  assert.equal(player(state, 1).buffs.find((b) => b.id === "frozen")?.stacks, 6);

  state = fixture();
  state = turn(state, [{ type: "attack", attackId: "chao_he_bao", stacks: 1, targetId: player(state, 1).id }, cake, cake, cake]);
  assert.equal(player(state, 1).buffs.find((b) => b.id === "frozen")?.stacks, 2);
  state = fixture();
  card(state).jihanBlocks = 10;
  state = turn(state, [cast(POLAR_GALAXY_ID), rebound(state, 0), cake, cake]);
  assert.ok(player(state, 1).buffs.some((buff) => buff.id === "frozen" && buff.infinite && buff.expiresAtTurn === undefined));
  assert.equal(card(state).jihanBlocks, 10);
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
  card(state).jihanSeals = 10;
  state = turn(state, [rebound(state, 1), cast(electricShock, player(state).id), cake, cake]);
  assert.equal(getActiveSkillCount(player(state, 1), bagua), 0);
  assert.ok(player(state, 1).buffs.some((buff) => buff.id === `${ALL_SKILLS_SEALED_BUFF_ID}:turn` && buff.infinite));
  assert.equal(card(state).jihanBlocks ?? 0, 0);
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
