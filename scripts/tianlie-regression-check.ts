import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer, getActiveFusionCount,
  getActiveSkillCount, getFusionSkillId, getSkillAttackStats, getSkillUseLimit, previewPlayerAttackStats, startGame, submitActionWindowSkill,
  submitPlayerAction, toPublicGameState, TIANLIE_ATTACK_ID, TIANLIE_CARD_ID, TIANLIE_CONTINUE_ID, TIANLIE_FEEDBACK_ID, TIANLIE_MIGHT_ID,
  TIANLIE_RAGE_ID, ETERNAL_THUNDER_ID, type GameState, type PlayerAction, type SkillAction, type SkillTimingPhase
} from "@bing/shared";
import { getAttackFieldBlocker } from "../packages/shared/src/engine/attackFields";
import { BASE_ATTACKS, getStackedAttackStats } from "../packages/shared/src/engine/attacks";
import { grantInitializedSkill } from "../packages/shared/src/engine/skillAcquisition";
import { recordSkillUse } from "../packages/shared/src/skills/fusion";
import { pruneRegisteredStates } from "../packages/shared/src/engine/effectCategories";
import { INFINITY_VALUE, VANISH_VALUE } from "../packages/shared/src/engine/combatValues";

const cake = { type: "gain_cake" } as const;
const small = { type: "defense", defense: "small" } as const;
const stone = { type: "defense", defense: "stone" } as const;
const youtiao = { type: "defense", defense: "youtiao" } as const;
const cast = (skillId: string, fields: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId, stacks: 1, ...fields });
const owner = (state: GameState) => state.players[0]!;
const enemy = (state: GameState) => state.players[1]!;
const sha = (targetId: string, stacks = 1): PlayerAction => ({ type: "attack", attackId: "sha", stacks, targetId });
const choices = (state: GameState, id: string) => toPublicGameState(state, owner(state).id).tianlieResponseChoices?.filter(({ skillId }) => skillId === id) ?? [];

function drain(state: GameState, stop?: SkillTimingPhase): GameState {
  for (let i = 0; state.phase === "action_window" && state.activeTimingPhase !== stop && i < 80; i++) state = advanceActionWindow(state);
  return state;
}

function fixture(): GameState {
  let state = createGame("A", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false });
  for (const name of ["B", "C", "D"]) state = addPlayerToGame(state, createPlayer(name));
  owner(state).bigCards = [{ cardId: TIANLIE_CARD_ID, instanceId: "tianlie" }];
  state = drain(startGame(state));
  for (const player of state.players) { player.hp = 100; player.cakes = 40; }
  return state;
}

function reveal(state: GameState, ...actions: PlayerAction[]): GameState {
  state = drain(state);
  assert.equal(state.phase, "collecting_actions");
  for (const [index, player] of state.players.entries()) {
    if (player.status === "alive" && !state.pendingActions[player.id])
      state = submitPlayerAction(state, player.id, actions[index] ?? cake).state;
  }
  return state;
}

function fixedRoll<T>(roll: number, run: () => T): T {
  const random = Math.random;
  Math.random = () => roll + random() / 100;
  try { return run(); } finally { Math.random = random; }
}

test("开局授予三份真融合，终结的火烧大地和雷裂残阳强化", () => {
  let state = fixture();
  for (const name of ["断绝", "终结", "山河破碎"]) assert.equal(getActiveFusionCount(owner(state), name), 1);
  assert.equal(getSkillUseLimit(owner(state), "1012"), 3);
  enemy(state).hp = 6;
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, owner(state).id, cast("1106"));
  assert.equal(enemy(drain(state)).defeatLevel, 2);
});

test("终结的沦陷保留本融合三项主动技，火烧大地仍结算2点法伤", () => {
  let state = fixture();
  beginActionPrompt(state, "turn_before_action");
  state = submitActionWindowSkill(state, owner(state).id, cast("1009"));
  assert.equal(getActiveSkillCount(owner(state), "1012"), 1);
  assert.equal(getActiveSkillCount(owner(state), "1014"), 1);
  assert.equal(getActiveSkillCount(owner(state), "1106"), 1);
  assert.equal(getActiveSkillCount(owner(state), TIANLIE_MIGHT_ID), 0);
  const before = enemy(state).hp;
  beginActionPrompt(state, "turn_end_action");
  state = drain(submitActionWindowSkill(state, owner(state).id, cast("1012")));
  assert.equal(enemy(state).hp, before - 2);
});

test("无待结算伤害也开放斗神之魄，初次未命中加随后两回合", () => {
  let state = fixture();
  const startTurn = state.turnNumber;
  state = drain(reveal(state, sha(enemy(state).id), small), "turn_damage_modify");
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  assert.equal(state.pendingDamageItems?.length ?? 0, 0);
  const choice = choices(state, TIANLIE_CONTINUE_ID)[0];
  assert.ok(choice);
  const before = owner(state).cakes;
  state = submitActionWindowSkill(state, owner(state).id, cast(TIANLIE_CONTINUE_ID, { attackResponseId: choice.id }));
  assert.equal(owner(state).cakes, before - 2);
  assert.equal(owner(state).buffs.find((buff) => buff.tianlieWave)?.expiresAtTurn, startTurn + 3);
  state = drain(state);
  assert.equal(enemy(state).hp, 100);
  const continued = reveal(state, cake, cake);
  assert.ok(continued.eventLog.some((event) => event.type === "cake_changed" &&
    event.playerId === owner(continued).id && event.turnNumber === continued.turnNumber && event.reason === "出饼"));
  state = drain(continued);
  assert.equal(enemy(state).hp, 98);
  state = drain(reveal(state, cake, cake));
  assert.equal(enemy(state).hp, 96);
  state = drain(reveal(state, cake, cake));
  assert.equal(enemy(state).hp, 96);
});

test("群攻一人未命中即可延续整招", () => {
  let state = fixture();
  owner(state).buffs.push({ id: "sealed_skill:1041", name: "封印破地", stacks: 1 });
  state = drain(reveal(state, { type: "attack", attackId: "wan_jian", stacks: 1 }, small), "turn_damage_modify");
  const choice = choices(state, TIANLIE_CONTINUE_ID)[0];
  assert.ok(choice);
  state = drain(submitActionWindowSkill(state, owner(state).id, cast(TIANLIE_CONTINUE_ID, { attackResponseId: choice.id })));
  const hp = state.players.map((player) => player.hp);
  state = drain(reveal(state, cake, cake));
  assert.ok(enemy(state).hp < hp[1]!);
  assert.ok(state.players[2]!.hp < hp[2]!);
});

test("战神之威在完全对撞抵消后按原攻值反馈无属性法伤", () => {
  let state = fixture();
  owner(state).buffs.push({ id: "sealed_skill:1041", name: "封印破地", stacks: 1 });
  state = drain(reveal(state, sha(enemy(state).id, 4), sha(owner(state).id, 4)), "turn_damage_modify");
  const choice = choices(state, TIANLIE_FEEDBACK_ID)[0];
  assert.ok(choice);
  assert.equal(state.pendingDamageItems?.length ?? 0, 0);
  state = drain(submitActionWindowSkill(state, owner(state).id, cast(TIANLIE_FEEDBACK_ID, { attackResponseId: choice.id })));
  assert.equal(enemy(state).hp, 92);
  const damage = state.eventLog.find((event) => event.type === "damage" && event.attackName === "战神之威");
  assert.ok(damage?.type === "damage" && damage.element === undefined && damage.amount === 8);
});

test("连续防御完全防住才算未命中，斗神之魄续攻保留原防御序列", () => {
  let state = fixture();
  const sourceId = owner(state).id, targetId = enemy(state).id;
  grantInitializedSkill(state, targetId, getFusionSkillId("弹力球"), "测试", false);
  state.cannonDefenses = [{ next: "rebound", dueTurn: state.turnNumber, attack: {
    key: "prior-thunder", reboundFamilyKey: "prior-thunder", sourceId, targetId, originalTargetId: targetId, actionIndex: 0, reflected: false,
    stats: { ...getSkillAttackStats(ETERNAL_THUNDER_ID, 1)!, cannonDefensePending: true }
  } }];
  state = drain(reveal(state, cake, { type: "defense", defense: "rebound", targetId: sourceId }), "turn_damage_modify");
  const choice = choices(state, TIANLIE_CONTINUE_ID)[0];
  assert.ok(choice);
  state = drain(submitActionWindowSkill(state, sourceId, cast(TIANLIE_CONTINUE_ID, { attackResponseId: choice.id })));
  state = drain(reveal(state, cake, stone));
  assert.equal(state.cannonDefenses?.[0]?.next, "stone");
});

test("破势变招按实际额外耗饼同步乘攻等", () => {
  let state = fixture();
  state = reveal(state, sha(enemy(state).id));
  assert.equal(state.activeTimingPhase, "turn_change_action");
  const before = owner(state).cakes;
  state = submitActionWindowSkill(state, owner(state).id, cast(TIANLIE_MIGHT_ID, { stacks: 3, switchActionIndex: 0 }));
  const stats = previewPlayerAttackStats(state, owner(state).id).stats[0]!;
  assert.equal(owner(state).cakes, before - 3);
  assert.equal(stats.power, 3);
  assert.equal(stats.level, 3);
});

test("狂化临时次数优先使用，重复狂化独立记账", () => {
  let state = fixture();
  recordSkillUse(owner(state), "1012");
  state = drain(reveal(state, cast(TIANLIE_RAGE_ID)));
  assert.equal(getSkillUseLimit(owner(state), "1012"), 5);
  recordSkillUse(owner(state), "1012");
  assert.equal(getSkillUseLimit(owner(state), "1012"), 4);
  assert.equal(owner(state).buffs.find((buff) => buff.id === "skill_used:1012")?.stacks, 1);
  state = drain(reveal(state, cast(TIANLIE_RAGE_ID)));
  assert.equal(getSkillUseLimit(owner(state), "1012"), 7);
  state.roundNumber += 5;
  pruneRegisteredStates(state);
  assert.equal(getSkillUseLimit(owner(state), "1012"), 3);
});

test("狂化使攻击不可回避，天裂圣威仅将小防和石头视为其他防御", () => {
  let state = fixture();
  state = drain(reveal(state, cast(TIANLIE_RAGE_ID)));
  state = fixedRoll(.9, () => reveal(state, cast(TIANLIE_ATTACK_ID), cake, small, stone));
  enemy(state).buffs.push({ id: "temp_flash_dodge", name: "闪现", stacks: 1, expiresAtTurn: state.turnNumber });
  assert.deepEqual(previewPlayerAttackStats(state, owner(state).id).stats[0]?.powerValue, INFINITY_VALUE);
  state = drain(state);
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.targetId === enemy(state).id &&
    event.attackName === "天裂圣威"));
  assert.notEqual(enemy(state).defeatLevel, 2);
  assert.equal(state.players[2]!.defeatLevel, 2);
  assert.equal(state.players[3]!.defeatLevel, 2);
});

test("狂化发招只掷一次消失，伤害位固定，等级仍可变招", () => {
  let state = fixture();
  appendSkillInstances(owner(state), ["1044"]);
  state = drain(reveal(state, cast(TIANLIE_RAGE_ID)));
  state = fixedRoll(.01, () => reveal(state, cast(TIANLIE_ATTACK_ID), youtiao, youtiao, youtiao));
  assert.deepEqual(previewPlayerAttackStats(state, owner(state).id).stats[0]?.powerValue, VANISH_VALUE);
  state = submitActionWindowSkill(state, owner(state).id, cast("1044", { switchActionIndex: 0, attackStatModifier: "power_plus_1_level_minus_1" }));
  const stats = previewPlayerAttackStats(state, owner(state).id).stats[0]!;
  assert.deepEqual(stats.powerValue, VANISH_VALUE);
  assert.notDeepEqual(stats.levelValue, VANISH_VALUE);
});

test("无视枯萎覆盖的衰竭，独立衰竭仍能让擒无效", () => {
  const state = fixture();
  owner(state).buffs.push({ id: "sealed_skill:1041", name: "封印破地", stacks: 1 });
  grantInitializedSkill(state, enemy(state).id, getFusionSkillId("枯萎"), "测试", false);
  const qin = getStackedAttackStats(BASE_ATTACKS.qin, 1);
  assert.equal(getAttackFieldBlocker(state, owner(state).id, qin), undefined);
  appendSkillInstances(enemy(state), ["1010"]);
  assert.equal(getAttackFieldBlocker(state, owner(state).id, qin)?.name, "衰竭");
  assert.ok(getActiveSkillCount(enemy(state), "1010") > 1);
});

test("无视纯净苍穹素材的幻防，但同一玩家另有独立幻防时照常生效", () => {
  for (const independent of [false, true]) {
    let state = fixture();
    owner(state).buffs.push({ id: "sealed_skill:1029", name: "封印青钢", stacks: 1 });
    grantInitializedSkill(state, enemy(state).id, getFusionSkillId("纯净苍穹"), "测试", false);
    if (independent) appendSkillInstances(enemy(state), ["1088"]);
    state = reveal(state, cast(TIANLIE_ATTACK_ID), small, youtiao, youtiao);
    state = drain(submitActionWindowSkill(state, enemy(state).id, cast("1088", { switchActionIndex: 0, switchToAction: youtiao })));
    if (independent) assert.equal(enemy(state).hp, 100);
    else assert.ok(enemy(state).hp < 100);
  }
});
