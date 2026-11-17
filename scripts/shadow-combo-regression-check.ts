import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, createGame, createPlayer, getActiveFusionCount, getSkillAttackStats, getTurnSkillActionCost,
  SHADOW_BLADE_DANCE_ID, SHADOW_BLADE_ID, SHADOW_CARD_ID, SHADOW_FOLLOW_ID, SHADOW_LEAVE_ID, SHADOW_SHRIEK_ID,
  SHADOW_STOP_SHRIEK_ID, SHADOW_WIND_DANCE_ID, startGame, validateAction, validateActionWindowSkill,
  type GameState, type PlayerState, type SkillAction
} from "../packages/shared/src";
import { recordShadowCombo, shadowComboForAction } from "../packages/shared/src/engine/shadowCombo";
import { enterShadowDance, setShadowActionLock } from "../packages/shared/src/engine/shadowDance";

const move = (skillId: string, targetId?: string): SkillAction => ({
  type: "skill", skillId, stacks: 1, ...(targetId ? { targetId } : {})
});

function game(): GameState {
  let state = createGame("隐", { skillMode: "big_test_select", firstTurnNoAttack: false });
  state = addPlayerToGame(state, createPlayer("甲"));
  state = addPlayerToGame(state, createPlayer("乙"));
  state.players[0]!.bigCards = [{ cardId: SHADOW_CARD_ID, instanceId: "shadow" }];
  return state;
}

test("杀之缭舞按指定顺序连击，其他出招不打断，乱序归零", () => {
  const state = game();
  const owner = state.players[0]!;
  const steps = [SHADOW_BLADE_ID, SHADOW_BLADE_DANCE_ID, SHADOW_WIND_DANCE_ID, SHADOW_SHRIEK_ID, SHADOW_STOP_SHRIEK_ID];
  const costs = [1, 1, 0, 1, 2];
  assert.equal(recordShadowCombo(owner, move(SHADOW_BLADE_DANCE_ID)), 0);
  for (const [index, id] of steps.entries()) {
    const action = move(id);
    assert.equal(shadowComboForAction(owner, action), index + 1);
    assert.equal(getTurnSkillActionCost(owner, action, state), costs[index]);
    const combo = recordShadowCombo(owner, action);
    assert.equal(combo, index + 1);
    assert.equal(getTurnSkillActionCost(owner, { ...action, shadowCombo: combo }, state), costs[index]);
    assert.equal(recordShadowCombo(owner, { type: "gain_cake" }), 0);
    assert.equal(recordShadowCombo(owner, move(SHADOW_FOLLOW_ID)), 0);
    assert.equal(owner.shadowCombo, index + 1);
  }
  assert.equal(recordShadowCombo(owner, move(SHADOW_STOP_SHRIEK_ID)), 0);
  assert.equal(owner.shadowCombo, undefined);
  assert.equal(recordShadowCombo(owner, move(SHADOW_BLADE_ID)), 1);
  assert.equal(recordShadowCombo(owner, move(SHADOW_BLADE_ID)), 1);
});

test("同一计划依次计算连击费用，预检不消耗连击也不允许伪造段数", () => {
  const state = game();
  const [owner, first, second] = state.players as [PlayerState, PlayerState, PlayerState];
  state.phase = "collecting_actions";
  owner.cakes = 2;
  const blade = move(SHADOW_BLADE_ID, first.id);
  const dance = move(SHADOW_BLADE_DANCE_ID, second.id);
  assert.equal(validateAction(state, owner.id, { actions: [blade, dance] }).ok, true);
  assert.equal(validateAction(state, owner.id, { actions: [dance, blade] }).ok, false);
  assert.equal(validateAction(state, owner.id, { ...dance, shadowCombo: 5 }).ok, false);
  assert.equal(owner.shadowCombo, undefined);
  assert.equal(owner.cakes, 2);
});

test("开局继承真实融合，风唳按非攻击计算，止隐须在影舞阶段使用", () => {
  const state = startGame(game());
  const owner = state.players[0]!;
  assert.equal(getActiveFusionCount(owner, "空之轨迹"), 1);
  assert.equal(getActiveFusionCount(owner, "末世"), 1);
  const stats = getSkillAttackStats(SHADOW_SHRIEK_ID, 1, owner);
  assert.equal(stats?.nonAttackMove, true);
  assert.equal(stats?.noClashLevel, true);
  assert.equal(stats?.defenseTag, "stone");
  state.phase = "action_window";
  state.actionWindowMode = "active";
  state.activeTimingPhase = "turn_before_action";
  const leave = move(SHADOW_LEAVE_ID);
  assert.equal(validateActionWindowSkill(state, owner.id, leave).ok, false);
  enterShadowDance(owner);
  assert.equal(validateActionWindowSkill(state, owner.id, leave).ok, true);
  state.phase = "collecting_actions";
  setShadowActionLock(state, owner, state.players[1]!.id);
  state.turnNumber++;
  assert.equal(validateAction(state, owner.id, { type: "gain_cake" }).ok, false);
});
