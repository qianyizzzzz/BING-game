import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addPlayerToGame, advanceActionWindow, beginActionPrompt, BLADE_MAINTENANCE_IDS, createGame, createPlayer,
  enterActionWindow, getActionSwitchPlan, getBrokenBlade, getCombatSeatNumbers, getFusionSkillId, LAVA_ARMOR_ID,
  startGame, submitActionWindowSkill, submitPlayerAction,
  TIAN_YE_CHOICE_ID, TIAN_YE_SOARING_ID, validateAction, type GameState, type PlayerAction, type SkillTimingPhase
} from "../packages/shared/src";
import { THORN_SKILL_DISABLED } from "../packages/shared/src/engine/effectCategories";
import { giveTianyeWing } from "../packages/shared/src/engine/tianye";
import { WIND_TRACE } from "../packages/shared/src/engine/ultimateWind";

const cake = { type: "gain_cake" } as const;
const sha = (targetId: string): PlayerAction => ({ type: "attack", attackId: "sha", targetId, stacks: 1 });
const rebound = (targetId: string): PlayerAction => ({ type: "defense", defense: "rebound", targetId });
const p = (state: GameState, index: number) => state.players[index]!;

function fixture(cards: string[][]): GameState {
  let state = createGame("甲", { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false, initialHp: 30 });
  for (const name of ["乙", "丙", "丁"]) state = addPlayerToGame(state, createPlayer(name));
  cards.forEach((ids, index) => {
    p(state, index).bigCards = ids.map((cardId) => ({ cardId, instanceId: `card-${index}-${cardId}` }));
  });
  state = startGame(state);
  for (const member of state.players) member.cakes = 100;
  return state;
}

function advance(state: GameState, phase: SkillTimingPhase): GameState {
  for (let i = 0; i < 50 && state.phase === "action_window" && state.activeTimingPhase !== phase; i++)
    state = advanceActionWindow(state);
  assert.equal(state.activeTimingPhase, phase);
  return state;
}

function reveal(state: GameState, moves: PlayerAction[]): GameState {
  for (const [index, { id, status }] of state.players.entries()) {
    if (status === "alive" && !state.pendingActions[id])
      state = submitPlayerAction(state, id, moves[index] ?? cake).state;
  }
  return state;
}

function trace(state: GameState, target: number, source: number): void {
  p(state, target).buffs.push({ id: WIND_TRACE, stateType: WIND_TRACE, name: "风踪", stacks: 1, sourcePlayerId: p(state, source).id });
}

function enableSoaring(state: GameState, playerIndex: number, chosen = false): void {
  const player = p(state, playerIndex);
  giveTianyeWing(player, TIAN_YE_SOARING_ID, state.turnNumber, player.bigCards![0]!.instanceId, chosen);
}

function withRandom<T>(randomValue: () => number, run: () => T): T {
  const random = Math.random;
  Math.random = randomValue;
  try { return run(); } finally { Math.random = random; }
}

function withoutStartingWing<T>(run: () => T): T {
  let draws = 0;
  return withRandom(() => 0.5 + draws++ * 0.000001, run);
}

test("熔岩天甲仅禁回避，直接抽中和天野转换的旋空都保留座次、不可选中与确立无敌", () => {
  for (const choice of [false, true]) {
    let state = withoutStartingWing(() => advance(fixture([["10501"], ["10560"]]), "turn_action"));
    const ownerId = p(state, 1).id;
    state = advance(reveal(state, [{ type: "skill", skillId: LAVA_ARMOR_ID, stacks: 1, targetIds: [ownerId] }]), "turn_after_interval_action");
    assert.ok(p(state, 1).buffs.some((buff) => buff.suppressedEffectCategories?.includes("damage_evasion")));
    const card = p(state, 1).bigCards![0]!;
    delete card.tianyeLastWing;
    let draws = 0;
    state = withRandom(() => draws++ === 0 && choice ? 0.99 : 0, () => advance(state, "turn_before_action"));
    if (choice) state = submitActionWindowSkill(state, ownerId, {
      type: "skill", skillId: TIAN_YE_CHOICE_ID, stacks: 1, tianyeWingChoice: TIAN_YE_SOARING_ID
    });
    state = advance(state, "turn_action");
    assert.equal(getCombatSeatNumbers(state).get(ownerId), Infinity);
    assert.equal(validateAction(state, p(state, 2).id, sha(ownerId)).ok, false);
    state = advance(reveal(state, [cake, cake, { type: "attack", attackId: "wan_jian", stacks: 1 }]), "turn_end_action");
    assert.equal(p(state, 1).hp, 30);
    assert.ok(state.eventLog.some((e) => e.type === "attack_blocked" && e.targetId === ownerId &&
      e.blockKind === "invulnerable" && e.protectionName?.includes("确立无敌")));
  }
});

test("穿禁用直接抽到的整条旋空，必定成立的旋空保留效果", () => {
  for (const chosen of [false, true]) {
    let state = withoutStartingWing(() => advance(fixture([[], ["10560"]]), "turn_action"));
    const owner = p(state, 1);
    enableSoaring(state, 1, chosen);
    owner.buffs.push({ id: `${THORN_SKILL_DISABLED}:${TIAN_YE_SOARING_ID}`, name: "穿·旋空之翼失效",
      stateType: THORN_SKILL_DISABLED, stacks: 1, expiresAtRound: state.roundNumber + 2 });
    assert.equal(getCombatSeatNumbers(state).get(owner.id) === Infinity, chosen);
    assert.equal(validateAction(state, p(state, 2).id, sha(owner.id)).ok, !chosen);
    state = advance(reveal(state, [cake, cake, chosen ? { type: "attack", attackId: "wan_jian", stacks: 1 } : sha(owner.id)]), "turn_end_action");
    assert.equal(p(state, 1).hp, chosen ? 30 : 29);
  }
});

test("精神穿刺和锋利的破天圣剑均不能穿透确立无敌，青釭剑不为此扣次数", () => {
  for (const sword of [false, true]) {
    let state = withoutStartingWing(() => {
      let initial = fixture([[sword ? "10558" : "10534"], ["10560"]]);
      const attackerId = p(initial, 0).id;
      if (sword) {
        beginActionPrompt(initial, "turn_before_action");
        initial = enterActionWindow(initial, attackerId);
        for (const skillId of BLADE_MAINTENANCE_IDS.slice(0, 2)) {
          const blade = p(initial, 0).bigCards![0]!;
          blade.brokenBlade = { ...getBrokenBlade(blade), remaining: 0 };
          initial = submitActionWindowSkill(initial, attackerId, { type: "skill", skillId: `${skillId}_reforge`, stacks: 1 });
        }
      }
      return advance(initial, "turn_action");
    });
    enableSoaring(state, 1);
    trace(state, 1, 0);
    const targetId = p(state, 1).id;
    state = advance(reveal(state, [sha(targetId)]), "turn_end_action");
    assert.equal(p(state, 1).hp, 30);
    assert.ok(state.eventLog.some((e) => e.type === "attack_blocked" && e.targetId === targetId &&
      e.blockKind === "invulnerable" && e.protectionName?.includes("确立无敌")));
    if (sword) assert.equal(getBrokenBlade(p(state, 0).bigCards![0]!).remaining, 50);
  }
});

test("反弹提交拒绝不可选中目标，反弹者有风踪时按他的选取权限继续结算", () => {
  let state = withoutStartingWing(() => advance(fixture([[], ["10560"]]), "turn_action"));
  enableSoaring(state, 1);
  const targetId = p(state, 1).id;
  const rebounderId = p(state, 2).id;
  assert.match(validateAction(state, rebounderId, rebound(targetId)).error ?? "", /无法被选中/);
  trace(state, 1, 2);
  assert.equal(validateAction(state, rebounderId, rebound(targetId)).ok, true);
  state = advance(reveal(state, [sha(rebounderId), cake, rebound(targetId)]), "turn_end_action");
  assert.ok(state.eventLog.some((e) => e.type === "attack_reflected" && e.reflectedTargetId === targetId));
  assert.ok(state.eventLog.some((e) => e.type === "attack_blocked" && e.targetId === targetId && e.blockKind === "dodge"));
});

test("天·幻切换反弹时同样检查反弹目标是否可选", () => {
  let state = withoutStartingWing(() => advance(fixture([["10519"], ["10560"]]), "turn_action"));
  enableSoaring(state, 1);
  const rebounderId = p(state, 0).id;
  const targetId = p(state, 1).id;
  state = advance(reveal(state, [{ type: "defense", defense: "small" }]), "turn_change_action");
  const change = { type: "skill", skillId: getFusionSkillId("虚幻"), stacks: 1, switchActionIndex: 0,
    switchToAction: { type: "defense", defense: "rebound", targetId } } as const;
  assert.equal(getActionSwitchPlan(state, rebounderId, change), undefined);
  trace(state, 1, 0);
  assert.deepEqual(getActionSwitchPlan(state, rebounderId, change)?.after, change.switchToAction);
});
