import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, beginActionPrompt, createGame, createPlayer, decomposeSkill,
  getActiveFusionCount, getActiveSkillCount, getFusionSkillId, getPlayerInitialHp, getSkillUseLimit, KARMA_CARD_ID, KARMA_CONVERT_ID,
  KARMA_INHERIT_ID, KARMA_REBIRTH_ID, startGame, submitActionWindowSkill, submitPlayerAction, submitRetirementCounter, toPublicGameState,
  type GameState, type SkillId
} from "../packages/shared/src";

function drain(state: GameState, stop?: GameState["activeTimingPhase"]): GameState {
  for (let i = 0; i < 45 && state.phase === "action_window" && state.activeTimingPhase !== stop; i++) {
    state = advanceActionWindow(state);
  }
  return state;
}

function game(...abilityIds: string[]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: Math.max(1, abilityIds.length), initialHp: 18, firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  state = addPlayerToGame(state, createPlayer("丙"));
  for (const onlyAbilityId of abilityIds) (state.players[0]!.bigCards ??= []).push({
    instanceId: `karma:${onlyAbilityId}`, cardId: KARMA_CARD_ID, onlyAbilityId
  });
  return startGame(state);
}

const holder = (state: GameState) => state.players[0]!;
function remaining(state: GameState, skillId: SkillId): number {
  return (getSkillUseLimit(holder(state), skillId) ?? 0) -
    (holder(state).buffs.find(({ id }) => id === `skill_used:${skillId}`)?.stacks ?? 0);
}

function convert(state: GameState, from: SkillId, to: SkillId): GameState {
  return submitActionWindowSkill(state, holder(state).id, { type: "skill", skillId: KARMA_CONVERT_ID,
    stacks: 1, karmaConvertFromSkillId: from, karmaConvertToSkillId: to });
}

test("命宇轮回给予破厄、长生、不死和两份逆转星移", () => {
  const state = game(KARMA_INHERIT_ID);
  assert.equal(getActiveSkillCount(holder(state), "1008"), 1);
  assert.equal(getActiveFusionCount(holder(state), "长生"), 1);
  assert.equal(getActiveFusionCount(holder(state), "不死"), 1);
  assert.equal(getActiveFusionCount(holder(state), "逆转星移"), 2);
  assert.equal(remaining(state, "1092"), 2);
  assert.equal(remaining(state, "1093"), 4);
});

test("长生只无视裂魂，并在素材灵魂修复结算时各增加1次复活技", async () => {
  const { hasRevivalRestrictionFlag } = await import("../packages/shared/src/engine/siphon");
  let state = drain(game(KARMA_INHERIT_ID));
  const player = holder(state);
  player.buffs.push({ id: "no_revive", name: "裂魂", stacks: 1 });
  assert.equal(hasRevivalRestrictionFlag(player), false);
  player.buffs.push({ id: "no_revive", name: "修罗血剑斩", stacks: 1 });
  assert.equal(hasRevivalRestrictionFlag(player), true);
  const fusion = player.skillFusions!.find(({ skillId }) => skillId === getFusionSkillId("灵魂修复"))!;
  const art = remaining(state, "1063");
  const soul = remaining(state, "1065");
  player.hp = 2;
  state.players[1]!.cakes = 1;
  player.buffs.push({ id: `trauma_converge:${state.roundNumber + 2}:fusion:${fusion.id}`, name: "灵魂修复", stacks: 1,
    sourceFusionId: fusion.id, traumaCakePaid: true });
  for (const [index, actor] of state.players.entries()) state = submitPlayerAction(state, actor.id, index === 1
    ? { type: "attack", attackId: "sha", stacks: 1, targetId: player.id }
    : { type: "gain_cake" }).state;
  state = drain(state);
  assert.equal(holder(state).hp, getPlayerInitialHp(holder(state)));
  assert.equal(remaining(state, "1063"), art + 1);
  assert.equal(remaining(state, "1065"), soul + 1);
});

test("轮回转生同组每次转化一个次数或副本，当前血量保持", () => {
  let state = game(KARMA_REBIRTH_ID);
  const hp = holder(state).hp;
  appendSkillInstances(holder(state), ["1063", "1092"]);
  state = convert(state, "1063", "1066");
  assert.equal(remaining(state, "1063"), 0);
  assert.equal(getPlayerInitialHp(holder(state)), hp * 3);
  assert.equal(holder(state).hp, hp);
  state = convert(state, "1066", "1065");
  assert.equal(remaining(state, "1065"), 1);
  assert.equal(getPlayerInitialHp(holder(state)), hp);
  assert.equal(holder(state).hp, hp);
  state = convert(state, "1092", "1093");
  assert.equal(remaining(state, "1092"), 0);
  assert.equal(remaining(state, "1093"), 1);
  assert.throws(() => convert(state, "1093", "1063"));
});

test("沐浴圣光可从融合素材转化，融合保留，分解后不重新获得已转化的副本", () => {
  let state = game(KARMA_REBIRTH_ID, KARMA_INHERIT_ID);
  const hp = holder(state).hp;
  assert.equal(getActiveSkillCount(holder(state), "1066"), 1);
  state = convert(state, "1066", "1063");
  assert.equal(holder(state).hp, hp);
  assert.equal(getPlayerInitialHp(holder(state)), hp / 3);
  assert.equal(getActiveSkillCount(holder(state), "1066"), 0);
  assert.equal(getActiveFusionCount(holder(state), "长生"), 1);
  assert.equal(getActiveFusionCount(holder(state), "神之子"), 1);
  for (const name of ["长生", "神之子"]) {
    const fusion = holder(state).skillFusions!.find(({ skillId }) => skillId === getFusionSkillId(name))!;
    state = decomposeSkill(state, holder(state).id, fusion.id);
  }
  assert.equal(holder(state).skills.includes("1066"), false);
  assert.equal(holder(state).skillInventory?.some(({ convertedMaterial }) => convertedMaterial), false);
});

test("轮回转生在普通死亡和必杀时保留本条、恢复初始血量并耗掉唯一次数", () => {
  for (const rank of [1, 4] as const) {
    let state = game(KARMA_REBIRTH_ID);
    const player = holder(state);
    appendSkillInstances(player, ["1066", "1092"]);
    state.pendingDamageItems = [{ id: "defeat", targetId: player.id, sourceId: state.players[1]!.id,
      amount: rank === 1 ? 30 : 1, ...(rank === 4 ? { pointDefeatLevel: rank, directDefeat: true } : {}) }];
    beginActionPrompt(state, "turn_damage_modify");
    state = drain(state, rank === 1 ? "revival_action" : "retirement_counter_action");
    assert.equal(state.activeTimingPhase, rank === 1 ? "revival_action" : "retirement_counter_action");
    if (rank === 1) state = submitActionWindowSkill(state, player.id, { type: "skill", skillId: KARMA_REBIRTH_ID, stacks: 1 });
    else {
      const counter = toPublicGameState(state, player.id).retirementCounter;
      assert.equal(counter?.canUseKarmaRebirth, true);
      state = submitRetirementCounter(state, player.id, { windowId: counter!.id, kind: "karma_rebirth" });
    }
    assert.equal(holder(state).status, "alive");
    assert.equal(holder(state).hp, 18);
    assert.equal(holder(state).skills.length, 0);
    assert.equal(holder(state).bigCards?.length, 1);
    assert.equal(holder(state).bigCards?.[0]?.onlyAbilityId, KARMA_REBIRTH_ID);
    assert.equal(holder(state).bigCards?.[0]?.abilityUses?.[KARMA_REBIRTH_ID], 1);
  }
});

test("不死只允许零血的单笔1点冰系法伤致死，直接死亡不受不死阻拦", () => {
  for (const [hp, amount, element, directDefeat, death] of [
    [0, 1, "ice", false, true], [0, 2, "ice", false, false], [1, 1, "ice", false, false],
    [0, 1, "fire", false, false], [3, 1, "ice", true, true]
  ] as const) {
    let state = game(KARMA_INHERIT_ID);
    holder(state).hp = hp;
    if (directDefeat) holder(state).buffs.push({ id: "direct_non_damage_death", name: "直接死亡", stacks: 1 });
    state.pendingDamageItems = [{ id: "wound", targetId: holder(state).id, sourceId: state.players[1]!.id,
      amount, element, spellDamage: true }];
    beginActionPrompt(state, "turn_damage_modify");
    state = drain(state);
    assert.equal(holder(state).status, death ? "dead" : "alive", JSON.stringify({ hp, amount, element, directDefeat }));
  }
});
