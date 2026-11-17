import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, appendSkillInstances, createGame, createPlayer, getActiveSkillCount,
  removeStateCategory, startGame, submitActionWindowSkill, validateAction, type GameState
} from "../packages/shared/src";
import { applySwordArrayNoCake, applySwordArrayPi } from "../packages/shared/src/engine/swordArrayAfflictions";
import {
  pruneSwordArrayNoCake, swordArrayNoCakeSuppressesSkill, swordArrayRuleContainsPiOrThree
} from "../packages/shared/src/engine/swordArrayControl";

function fixture(): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 6, firstTurnNoAttack: false });
  for (const name of ["乙", "丙"]) state = addPlayerToGame(state, createPlayer(name));
  state = startGame(state);
  for (let i = 0; state.phase === "action_window" && i < 80; i++) state = advanceActionWindow(state);
  assert.equal(state.phase, "collecting_actions");
  for (const player of state.players) player.cakes = 36;
  return state;
}

test("玄空解析完整数值，区分π、3、负数、分数和多位数", () => {
  for (const text of ["+3血", "攻3.0", "持续三回合", "获得π点防御", "附带圆周率π", "级别×３"]) {
    assert.ok(swordArrayRuleContainsPiOrThree(text), text);
  }
  for (const text of ["攻−3", "攻-3", "攻13", "攻3.1", "3%概率", "等于1/3", "冷却x/3",
    "等于π/2", "等于2π", "等于-π", "十三回合", "负三点", "三点五"]) {
    assert.ok(!swordArrayRuleContainsPiOrThree(text), text);
  }
});

test("玄空为可解除的永久不良，只限制主动技能", () => {
  const state = fixture();
  const [source, affected] = state.players;
  assert.ok(source && affected);
  appendSkillInstances(affected, ["1039", "1013", "1032"]);
  assert.ok(applySwordArrayPi(state, affected.id, source.id));
  assert.equal(getActiveSkillCount(affected, "1032"), 1);
  assert.ok(validateAction(state, affected.id, { type: "skill", skillId: "1039", stacks: 1, targetId: source.id }).ok);
  state.phase = "action_window";
  state.activeTimingPhase = "turn_before_action";
  state.actionWindowMode = "active";
  state.actionWindowPlayerIds = [affected.id];
  state.roundNumber += 8;
  assert.throws(() => submitActionWindowSkill(state, affected.id, { type: "skill", skillId: "1013", stacks: 1 }), /玄空·圆周/);
  assert.equal(removeStateCategory(affected, "negative"), 1);
  assert.doesNotThrow(() => submitActionWindowSkill(state, affected.id, { type: "skill", skillId: "1013", stacks: 1 }));
});

test("幻梦在施加轮和下一轮压制无饼价技能，保留固有饼价为零或减免的技能", () => {
  let state = fixture();
  const [source, affected] = state.players;
  assert.ok(source && affected);
  appendSkillInstances(affected, ["1012", "1032", "1073", "1086"]);
  assert.ok(applySwordArrayNoCake(state, affected.id, source.id));
  assert.equal(getActiveSkillCount(affected, "1032"), 0);
  assert.ok(!swordArrayNoCakeSuppressesSkill(state, affected, "1073"));
  assert.ok(!swordArrayNoCakeSuppressesSkill(state, affected, "1086"));
  state.roundNumber++;
  pruneSwordArrayNoCake(state);
  assert.ok(swordArrayNoCakeSuppressesSkill(state, affected, "1012"));
  state.phase = "action_window";
  state.activeTimingPhase = "turn_before_action";
  state.actionWindowMode = "active";
  state.actionWindowPlayerIds = [affected.id];
  const before = source.hp;
  state = submitActionWindowSkill(state, affected.id, { type: "skill", skillId: "1012", stacks: 1 });
  const caster = state.players.find(({ id }) => id === affected.id)!;
  assert.equal(state.players.find(({ id }) => id === source.id)?.hp, before);
  assert.equal(caster.buffs.find((buff) => buff.id === "skill_used:1012")?.stacks, 1);
  state.roundNumber++;
  pruneSwordArrayNoCake(state);
  assert.ok(!swordArrayNoCakeSuppressesSkill(state, caster, "1012"));
  assert.equal(getActiveSkillCount(caster, "1032"), 1);
});
