import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, BLADE_DOUBLE_EDGE_ID, BLADE_MAINTENANCE_IDS, BROKEN_BLADE_CARD_ID, BROKEN_BLADE_TIERS,
  beginActionPrompt, createGame, createPlayer, enterActionWindow, getBigCard, getBrokenBlade,
  getSkill, getSkillUseLimit, getVisibleStatusOverview, startGame, submitActionWindowSkill,
  submitPlayerAction, toPublicGameState, validateActionWindowSkill, type GameState, type SkillAction
} from "../packages/shared/src";

function fixture(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 1, firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("乙"));
  state.players[0]!.bigCards = [{ instanceId: "blade", cardId: BROKEN_BLADE_CARD_ID }];
  state = startGame(state);
  state.players[0]!.cakes = 40;
  return state;
}

function maintenance(skillId: string): SkillAction {
  return { type: "skill", skillId, stacks: 1 };
}

test("战刃次数仅在限定技与限定次数栏展示，修复重铸不带限定技标签", () => {
  const state = fixture();
  const [owner, opponent] = state.players;
  assert.equal(getBigCard(BROKEN_BLADE_CARD_ID)?.implemented, true);
  assert.deepEqual(getVisibleStatusOverview(toPublicGameState(state, owner!.id), owner!.id)?.limited.find(
    ({ label }) => label === "青釭剑"), { label: "青釭剑", value: "剩 10/10 次 · 判定 I（小技能）" });
  assert.equal(getVisibleStatusOverview(toPublicGameState(state, opponent!.id), owner!.id)?.limited.some(
    ({ label }) => label === "青釭剑"), false);
  for (const base of BLADE_MAINTENANCE_IDS) for (const id of [base, `${base}_reforge`]) {
    assert.equal(getSkill(id)?.play?.usesPerGame, undefined);
    assert.equal(getSkill(id)?.typeTags.includes("限定技"), false);
    assert.equal(getSkillUseLimit(owner!, id), undefined);
  }
});

test("战刃耗尽才能修复或重铸，普通行动窗口支付对应饼费并获得该阶次数", () => {
  let state = fixture();
  const id = state.players[0]!.id;
  beginActionPrompt(state, "turn_change_action");
  state = enterActionWindow(state, id);
  assert.equal(validateActionWindowSkill(state, id, maintenance(BLADE_MAINTENANCE_IDS[0])).ok, false);

  for (const [tier, base] of BLADE_MAINTENANCE_IDS.entries()) {
    const owner = state.players[0]!;
    const card = owner.bigCards![0]!;
    card.brokenBlade = { ...getBrokenBlade(card), remaining: 0 };
    const cakes = owner.cakes;
    state = submitActionWindowSkill(state, id, maintenance(base));
    assert.equal(state.players[0]!.cakes, cakes - (tier + 1));
    let blade = getBrokenBlade(state.players[0]!.bigCards![0]!);
    assert.equal(blade.tier, tier);
    assert.equal(blade.remaining, BROKEN_BLADE_TIERS[tier]!.maxUses);

    state.players[0]!.bigCards![0]!.brokenBlade = { ...blade, remaining: 0 };
    state = submitActionWindowSkill(state, id, maintenance(`${base}_reforge`));
    assert.equal(state.players[0]!.cakes, cakes - (tier + 1) - 5);
    blade = getBrokenBlade(state.players[0]!.bigCards![0]!);
    assert.equal(blade.tier, tier + 1);
    assert.equal(blade.remaining, BROKEN_BLADE_TIERS[tier + 1]!.maxUses);
    const fusion = state.players[0]!.skillFusions?.find(({ id }) => id === blade.fusionInstanceId);
    assert.equal(fusion?.judgmentRank, BROKEN_BLADE_TIERS[tier + 1]!.rank);
  }
  assert.match(getVisibleStatusOverview(toPublicGameState(state, id), id)?.limited.find(
    ({ label }) => label === "真·破天圣剑")?.value ?? "", /无限次 · 判定 V/);
});

test("只有真·破天圣剑允许双刃剑选择没有出对应防御的攻击目标", () => {
  for (const reforges of [1, 4]) {
    let state = fixture();
    const [owner, target] = state.players;
    beginActionPrompt(state, "turn_before_action");
    state = enterActionWindow(state, owner!.id);
    for (const base of BLADE_MAINTENANCE_IDS.slice(0, reforges)) {
      const card = state.players[0]!.bigCards![0]!;
      card.brokenBlade = { ...getBrokenBlade(card), remaining: 0 };
      state = submitActionWindowSkill(state, owner!.id, maintenance(`${base}_reforge`));
    }
    state = advanceActionWindow(state);
    state = submitPlayerAction(state, owner!.id, { type: "attack", attackId: "sha", targetId: target!.id, stacks: 1 }).state;
    state = submitPlayerAction(state, target!.id, { type: "gain_cake" }).state;
    state = enterActionWindow(state, owner!.id);
    const action = { ...maintenance(BLADE_DOUBLE_EDGE_ID), targetId: target!.id, switchActionIndex: 0 };
    assert.equal(validateActionWindowSkill(state, owner!.id, action).ok, reforges === 4);
    assert.equal(validateActionWindowSkill(state, owner!.id, { ...action, targetId: owner!.id }).ok, false);
  }
});

test("真·破天圣剑的两种双刃剑可选择被永远之夜或破地之力无效的攻击", () => {
  for (const [fieldId, stacks] of [["1043", 1], ["1041", 3]] as const) for (const reforges of [1, 4]) {
    let state = fixture();
    const [owner, target] = state.players;
    appendSkillInstances(target!, [fieldId]);
    beginActionPrompt(state, "turn_before_action");
    state = enterActionWindow(state, owner!.id);
    for (const base of BLADE_MAINTENANCE_IDS.slice(0, reforges)) {
      const card = state.players[0]!.bigCards![0]!;
      card.brokenBlade = { ...getBrokenBlade(card), remaining: 0 };
      state = submitActionWindowSkill(state, owner!.id, maintenance(`${base}_reforge`));
    }
    state = advanceActionWindow(state);
    state = submitPlayerAction(state, owner!.id, { type: "attack", attackId: "sha", targetId: target!.id, stacks }).state;
    state = submitPlayerAction(state, target!.id, { type: "defense", defense: "small" }).state;
    state = enterActionWindow(state, owner!.id);
    for (const doubleEdgeMode of ["ignore_defense", "pierce_rebound"] as const) {
      const action = { ...maintenance(BLADE_DOUBLE_EDGE_ID), targetId: target!.id, switchActionIndex: 0, doubleEdgeMode };
      const result = validateActionWindowSkill(state, owner!.id, action);
      assert.equal(result.ok, reforges === 4, `${fieldId} ${doubleEdgeMode} ${JSON.stringify(result)}`);
    }
  }
});
