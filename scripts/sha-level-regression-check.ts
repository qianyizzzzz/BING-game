import assert from "node:assert/strict";
import {
  GameState, PlayerAction, ActionSubmission, SkillAction, AttackStatModifierChoice,
  COMMON_FUSION_SKILL_ID, BASE_ATTACKS, INFINITE_DAMAGE, RETIRE_EFFECT_POWER, VANISH_EFFECT_POWER,
  EXECUTE_EFFECT_POWER, createGame, addPlayerToGame, createPlayer, startGame, createId,
  getAllSkills, getFusionSkillId, submitPlayerAction, submitActionWindowSkill, advanceActionWindow,
  previewPlayerAttackStats, applyAttackStatModifierChoice, payableAttackCost, getStackedAttackStats,
  getSkillCakeCostKind, getLevelSwapModifiers, hasNegativeStatusImmunity, getAttackFieldBlocker, toPublicGameState
} from "@bing/shared";
import { chooseAiActionWindowSkill } from "../apps/server/src/ai";

const skill = (name: string) => {
  const entry = getAllSkills().find((item) => item.name === name);
  assert.ok(entry, name);
  return entry.id;
};
const cast = (name: string, extra: Partial<SkillAction> = {}): SkillAction => ({ type: "skill", skillId: skill(name), stacks: 1, ...extra });
const gain = { type: "gain_cake" } as const;
function fuse(state: GameState, name: string): GameState {
  return submitPlayerAction(state, state.players[0]!.id, { type: "skill", skillId: COMMON_FUSION_SKILL_ID,
    stacks: 1, targetSkillId: getFusionSkillId(name), fusionRequestId: createId("request") }).state;
}
function fixture(extra: string[] = [], fused = true): GameState {
  let state = createGame("A", { firstTurnNoAttack: false, skillMode: "test_select", skillCount: 2 + extra.length });
  for (const name of ["B", "C"]) state = addPlayerToGame(state, createPlayer(name));
  state.players[0]!.skills = ["杀换", "级换", ...extra].map(skill);
  state = startGame(state);
  if (fused) state = fuse(state, "杀级换");
  for (const player of state.players) player.hp = 40;
  return state;
}
function collecting(initial: GameState): GameState {
  let state = initial;
  for (let guard = 0; state.phase === "action_window" && guard < 40; guard++) state = advanceActionWindow(state);
  assert.equal(state.phase, "collecting_actions");
  return state;
}
function reveal(initial: GameState, action: ActionSubmission, cakes = 20, opponent: PlayerAction = gain): GameState {
  let state = collecting(initial);
  state.players[0]!.cakes = cakes;
  for (const [index, player] of state.players.entries()) {
    state = submitPlayerAction(state, player.id, index === 0 ? action : index === 1 ? opponent : gain).state;
  }
  assert.equal(state.activeTimingPhase, "turn_change_action");
  return state;
}
function sha(state: GameState, stacks = 1): PlayerAction {
  return { type: "attack", attackId: "sha", stacks, targetId: state.players[1]!.id };
}
function modify(state: GameState, modifier: AttackStatModifierChoice, index = 0): GameState {
  return submitActionWindowSkill(state, state.players[0]!.id, cast("级换", { attackStatModifier: modifier, switchActionIndex: index }));
}
function destroy(state: GameState, modifier: AttackStatModifierChoice): GameState {
  return submitActionWindowSkill(state, state.players[0]!.id, cast("毁灭之力", { attackStatModifier: modifier, switchActionIndex: 0 }));
}
function finish(initial: GameState): GameState {
  let state = initial;
  for (let guard = 0; state.phase === "action_window" && state.activeTimingPhase !== "turn_end_action" && guard < 40; guard++) state = advanceActionWindow(state);
  assert.ok(state.phase === "finished" || state.activeTimingPhase === "turn_end_action");
  return state;
}
const values = (state: GameState, index = 0) => {
  const stats = previewPlayerAttackStats(state, state.players[0]!.id).stats[index]!;
  assert.ok(stats);
  return [stats.cost, stats.power, stats.level];
};
let passed = 0;
const failed: string[] = [];
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`ok - ${name}`); }
  catch (error) { failed.push(name); console.error(`not ok - ${name}\n${error instanceof Error ? error.stack : error}`); }
}

check("enhanced sha/qin switch is inherently no-cake and works with an empty cake bank", () => {
  let state = fixture();
  state = reveal(state, sha(state), 1);
  state = submitActionWindowSkill(state, state.players[0]!.id, cast("杀换", { switchActionIndex: 0,
    switchToAction: { type: "attack", attackId: "qin", stacks: 1, targetId: state.players[1]!.id } }));
  assert.equal(state.players[0]!.cakes, 0);
  assert.equal(getSkillCakeCostKind(skill("杀换"), state.players[0]!), "none");
  assert.deepEqual(values(state), [1, 3, 0]);
});

check("enhanced no-cake sha switch does not trigger pure sky", () => {
  let state = fuse(fixture(["绝对守护", "幻防"]), "纯净苍穹");
  state = reveal(state, sha(state), 1);
  state = submitActionWindowSkill(state, state.players[0]!.id, cast("杀换", { switchActionIndex: 0,
    switchToAction: { type: "attack", attackId: "qin", stacks: 1, targetId: state.players[1]!.id } }));
  assert.ok(!hasNegativeStatusImmunity(state.players[0]!, state.turnNumber));
});

check("nuclear swap reads discounted total cost plus crystal and wine final bonuses", () => {
  let state = fixture(["神族水晶", "酒", "核反应堆"]);
  state = reveal(state, { type: "attack", attackId: "he_bao", stacks: 1, targetId: state.players[1]!.id }, 10);
  assert.deepEqual(values(state), [3, 7, 7]);
  state = modify(state, "swap_cost_power");
  assert.deepEqual(values(state), [7, 3, 7]);
  assert.equal(state.players[0]!.cakes, 7, "the extra four cakes remain unpaid during turn-change");
  state = finish(state);
  assert.equal(state.players[0]!.cakes, 3);
  assert.equal(state.players[1]!.hp, 37);
  assert.deepEqual(values(state), [7, 3, 7]);
});

check("crystal level moves into cost and is not added back after a later destruction", () => {
  let state = fixture(["神族水晶", "酒", "核反应堆", "毁灭之力"]);
  state = reveal(state, { type: "attack", attackId: "he_bao", stacks: 1, targetId: state.players[1]!.id }, 10);
  state = modify(state, "swap_cost_level");
  assert.deepEqual(values(state), [7, 7, 3]);
  state = destroy(state, "power_times_3_level_to_zero");
  assert.deepEqual(values(state), [7, 21, 0]);
});

check("destruction then triple rotation produces 0/4/1 and refunds one cake only at the hit point", () => {
  let state = fixture(["毁灭之力"]);
  state = reveal(state, sha(state), 2);
  state = destroy(state, "power_to_zero_level_times_4");
  assert.deepEqual(values(state), [1, 0, 4]);
  state = modify(state, "rotate_cost_power_level");
  assert.deepEqual(values(state), [0, 4, 1]);
  assert.equal(state.players[0]!.cakes, 1);
  state = finish(state);
  assert.equal(state.players[0]!.cakes, 2);
  assert.equal(state.players[1]!.hp, 36);
});

check("triple rotation before destruction instead produces the original 1/0/4", () => {
  let state = fixture(["毁灭之力"]);
  state = reveal(state, sha(state), 2);
  state = modify(state, "rotate_cost_power_level");
  state = destroy(state, "power_to_zero_level_times_4");
  assert.deepEqual(values(state), [1, 0, 4]);
  state = finish(state);
  assert.equal(state.players[0]!.cakes, 1);
  assert.equal(state.players[1]!.hp, 40);
});

check("negative cost remains minus one while its payable amount is zero and refund is capped at one", () => {
  let state = fixture(["毁灭之力"]);
  state = reveal(state, sha(state), 2);
  state = destroy(state, "power_plus_2_level_minus_2");
  assert.deepEqual(values(state), [1, 3, -1]);
  state = modify(state, "swap_cost_level");
  assert.deepEqual(values(state), [-1, 3, 1]);
  assert.equal(state.players[0]!.cakes, 1);
  state = finish(state);
  assert.equal(state.players[0]!.cakes, 2);
  assert.deepEqual(values(state), [-1, 3, 1]);
});

check("a negative cost can move back into power without creating extra refunds", () => {
  let state = fixture(["毁灭之力"]);
  state = reveal(state, sha(state), 4);
  state = destroy(state, "power_plus_2_level_minus_2");
  state = modify(state, "swap_cost_level");
  state = modify(state, "swap_cost_power");
  assert.deepEqual(values(state), [3, -1, 1]);
  state = finish(state);
  assert.equal(state.players[0]!.cakes, 1);
  assert.equal(state.players[1]!.hp, 40);
});

check("negative levels are not silently replaced with zero for decay", () => {
  let state = fixture(["毁灭之力"]);
  state.players[2]!.skills = [skill("衰竭")];
  state = reveal(state, sha(state), 2);
  state = destroy(state, "power_plus_2_level_minus_2");
  assert.deepEqual(values(state), [1, 3, -1]);
  assert.equal(getAttackFieldBlocker(state, state.players[0]!.id, previewPlayerAttackStats(state, state.players[0]!.id).stats[0]!, state.players[1]!.id), undefined);
  state = finish(state);
  assert.equal(state.players[1]!.hp, 37);
});

check("no-cake rocket and blizzard have no cost slot but still allow power/level swapping", () => {
  for (const name of ["火箭", "狂风骤雪"]) {
    let state = fixture([name]);
    state = reveal(state, cast(name, name === "火箭" ? { targetIds: [state.players[1]!.id] } : {}));
    assert.deepEqual(getLevelSwapModifiers(state.players[0], state.pendingActions[state.players[0]!.id]!.actions[0]!), ["swap_power_level"]);
    assert.throws(() => modify(state, "swap_cost_power"), /无耗饼/);
    state = modify(state, "swap_power_level");
    assert.equal(state.players[0]!.cakes, 20);
  }
});

check("a free lianbao retains a priced zero cost and pays its new cost at the hit point", () => {
  let state = fixture(["连爆"]);
  state.players[0]!.buffs.push({ id: "free_lian_bao", name: "免费连爆", stacks: 1 });
  state = reveal(state, cast("连爆", { targetId: state.players[1]!.id, freeStacks: 1 }), 2);
  assert.deepEqual(values(state), [0, 1, 2]);
  state = modify(state, "swap_cost_level");
  assert.deepEqual(values(state), [2, 1, 0]);
  assert.equal(state.players[0]!.cakes, 2);
  state = finish(state);
  assert.equal(state.players[0]!.cakes, 0);
});

check("an unaffordable cost swap is rejected atomically and leaves the attack and cakes unchanged", () => {
  let state = fixture(["毁灭之力"]);
  state = reveal(state, sha(state), 1);
  state = destroy(state, "power_plus_2_level_minus_2");
  const before = structuredClone(state);
  assert.throws(() => modify(state, "swap_cost_power"), /饼不足/);
  assert.deepEqual(state, before);
  state = finish(state);
  assert.deepEqual(values(state), [1, 3, -1]);
  assert.equal(state.players[0]!.cakes, 0);
});

check("infinite cost always fails even when the numeric cake bank exceeds the infinity sentinel", () => {
  let state = fixture();
  state = reveal(state, { type: "attack", attackId: "miao_sha", stacks: 1, targetId: state.players[1]!.id }, 2000);
  assert.throws(() => modify(state, "swap_cost_power"), /无限耗饼/);
  assert.deepEqual(values(state), [14, INFINITE_DAMAGE, 14]);
});

check("retire, reserved vanish/execute and negative infinity can move into the cost slot", () => {
  for (const power of [INFINITE_DAMAGE, RETIRE_EFFECT_POWER, VANISH_EFFECT_POWER, EXECUTE_EFFECT_POWER, -INFINITE_DAMAGE, -EXECUTE_EFFECT_POWER]) {
    const stats = applyAttackStatModifierChoice({ ...getStackedAttackStats(BASE_ATTACKS.sha, 1), power }, "swap_cost_power");
    assert.equal(stats.cost, power >= INFINITE_DAMAGE ? INFINITE_DAMAGE : power);
    assert.equal(payableAttackCost(stats.cost), power > 0 ? INFINITE_DAMAGE : 0);
    assert.equal(stats.power, 1);
  }
});

check("retire moved out of power no longer retires the target through its old trait", () => {
  let state = fixture(["卷子", "毁灭之力"]);
  state = reveal(state, cast("卷子", { targetId: state.players[1]!.id }));
  state = destroy(state, "power_times_3_level_to_zero");
  state = modify(state, "swap_power_level");
  assert.deepEqual(values(state), [0, 0, RETIRE_EFFECT_POWER]);
  state = finish(state);
  assert.equal(state.players[1]!.status, "alive");
  assert.equal(state.players[1]!.hp, 40);
});

check("later window spending can invalidate an earlier queued swap at final settlement without a negative bank", () => {
  let state = fixture(["毁灭之力", "绝对守护"]);
  state.players[1]!.cakes = 2;
  state = reveal(state, sha(state), 3, { type: "attack", attackId: "sha", stacks: 2, targetId: state.players[0]!.id });
  state = destroy(state, "power_plus_2_level_minus_2");
  state = modify(state, "swap_cost_power");
  assert.deepEqual(values(state), [3, 1, -1]);
  state = submitActionWindowSkill(state, state.players[0]!.id, cast("绝对守护", { targetId: state.players[1]!.id, switchActionIndex: 0 }));
  assert.equal(state.players[0]!.cakes, 1);
  state = finish(state);
  assert.deepEqual(values(state), [1, 3, -1]);
  assert.equal(state.players[0]!.cakes, 1);
  assert.ok(state.eventLog.some((event) => event.type === "system" && event.message.includes("属性交换失败")));
});

check("multiple attacks share one affordability budget in skill-use order", () => {
  let state = fixture(["酒"]);
  state = reveal(state, { actions: [sha(state), { type: "attack", attackId: "sha", stacks: 1, targetId: state.players[2]!.id }] }, 3);
  state = modify(state, "swap_cost_power", 1);
  assert.throws(() => modify(state, "swap_cost_power", 0), /饼不足/);
  state = finish(state);
  assert.deepEqual(state.turnActionCosts?.[state.players[0]!.id], [1, 2]);
  assert.equal(state.players[0]!.cakes, 0);
});

check("a queued refund can fund another queued price change while neither settles early", () => {
  let state = fixture(["酒"]);
  state = reveal(state, { actions: [sha(state), { type: "attack", attackId: "qin", stacks: 1, targetId: state.players[2]!.id }] }, 2);
  state = modify(state, "swap_cost_level", 1);
  state = modify(state, "swap_cost_power", 0);
  assert.equal(state.players[0]!.cakes, 0);
  state = finish(state);
  assert.deepEqual(state.turnActionCosts?.[state.players[0]!.id], [2, 0]);
  assert.equal(state.players[0]!.cakes, 0);
});

check("price adjustment is not a cake-priced control skill and cannot trigger pure sky", () => {
  let state = fuse(fixture(["酒", "绝对守护", "幻防"]), "纯净苍穹");
  state = reveal(state, sha(state), 2);
  state = modify(state, "swap_cost_power");
  assert.ok(!hasNegativeStatusImmunity(state.players[0]!, state.turnNumber));
  state = finish(state);
  assert.equal(state.players[0]!.cakes, 0);
});

check("public previews expose authoritative numbers after reveal without exposing the hidden fusion", () => {
  let state = fixture(["毁灭之力"]);
  const beforeReveal = toPublicGameState(state, state.players[1]!.id);
  assert.equal(beforeReveal.revealedAttackStats, undefined);
  state = reveal(state, sha(state), 2);
  state = destroy(state, "power_to_zero_level_times_4");
  state = modify(state, "rotate_cost_power_level");
  const other = toPublicGameState(state, state.players[1]!.id);
  assert.deepEqual(other.revealedAttackStats?.[state.players[0]!.id]?.[0], { cost: 0, power: 4, level: 1 });
  assert.ok(!("turnAttackStats" in other));
  assert.ok(!("pendingActions" in other));
  assert.ok(!JSON.stringify(other).includes(getFusionSkillId("杀级换")));
  const stats = previewPlayerAttackStats(other, state.players[0]!.id).stats[0]!;
  assert.deepEqual([stats.cost, stats.power, stats.level], [0, 4, 1]);
});

check("ordinary level swap cannot forge enhanced cost permutations", () => {
  let state = fixture([], false);
  state = reveal(state, sha(state));
  assert.throws(() => modify(state, "swap_cost_power"), /不能交换|只能/);
});

check("moon cancellation refunds the original payment without later settling a cancelled swap", () => {
  let state = fuse(fixture(["酒", "神之庇护", "闪现"]), "辉月");
  state = reveal(state, sha(state), 2);
  state = modify(state, "swap_cost_power");
  state = submitActionWindowSkill(state, state.players[0]!.id, { type: "skill", skillId: getFusionSkillId("辉月"), stacks: 1 });
  assert.equal(state.players[0]!.cakes, 2);
  state = finish(state);
  assert.equal(state.players[0]!.cakes, 2);
});

check("AI passes instead of endlessly performing identity permutations", () => {
  let state = fixture();
  state = reveal(state, { type: "attack", attackId: "huo_wu", stacks: 1, targetId: state.players[1]!.id });
  assert.deepEqual(values(state), [5, 5, 5]);
  assert.equal(chooseAiActionWindowSkill(state, state.players[0]!.id), undefined);
});

check("AI's free sha/qin and stat switches terminate after actual improvements", () => {
  let state = fixture();
  state = reveal(state, sha(state));
  let count = 0;
  for (; count < 20; count++) {
    const action = chooseAiActionWindowSkill(state, state.players[0]!.id);
    if (!action) break;
    state = submitActionWindowSkill(state, state.players[0]!.id, action);
  }
  assert.ok(count > 0 && count < 20, `AI must stop switching; used ${count} skills`);
  assert.equal(state.players[0]!.cakes, 19);
});

console.log(`sha-level checks: ${passed} passed, ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
