import {
  AttackStatModifierChoice,
  AttackStats,
  AttackBlockedEvent,
  DEFEAT_LEVEL_LABELS,
  DefeatLevel,
  DamageEvent,
  GameState,
  HealEvent,
  INITIAL_HP,
  INFINITE_DAMAGE,
  ActionSubmission,
  PendingDamageItem,
  PendingActionMap,
  PlayerDiedEvent,
  PlayerAction,
  PlayerActionPlan,
  PlayerId,
  PlayerState,
  PreemptiveRestartSnapshot,
  RETIRE_EFFECT_POWER,
  SkillAction,
  SkillId,
  SkillTimingPhase,
  SubmitActionResult
} from "../types";
import {
  BASE_ATTACKS,
  addAttackElement,
  attackHasElement,
  canActionDefend,
  getActionLabel,
  getAttackElements,
  getDefenseForEvent,
  getStackedAttackStats
} from "./attacks";
import { applyActionSwitch, getActionSwitchPlan } from "./actionSwitch";
import { resolveLightningSpellTargetIds } from "./skillTargets";
import {
  ACTION_WINDOW_SECONDS,
  COLLAPSE_BUFF_PREFIX,
  SKILL_DISABLED_BUFF_PREFIX,
  applyFrozenAutoActions,
  alivePlayers,
  beginBasicTurnAction,
  beginActionPrompt,
  cloneGameState,
  createBaseEvent,
  createId,
  findPlayer,
  getActiveSkillCount,
  getCakeGainAmount,
  getPlayerInitialHp,
  getPuppetMasterId,
  getTurnDeadline,
  isPlayerInCollapse,
  isPlayerSkillDisabled,
  isPuppetPlayer,
  markSkillActivated,
  playerHasActiveSkill,
  PUPPET_BUFF_PREFIX,
  SKILL_ACTIVATED_BUFF_PREFIX,
  recordSkillUsed,
  revealSkillOnTrigger,
  revealSkillOnUse,
  revealSkillOnWin,
  revealSkillToAll,
  victoryEligiblePlayers,
  usesSkillActionWindows
} from "./gameFactory";
import { normalizeActionPlan, validateAction, validateActionWindowSkill } from "./validation";
import { shouldFinishGame } from "../state/machine";
import {
  applyAttackModifiers,
  getSkill,
  getSkillActionCost,
  getSkillAttackStats,
  getSkillPlay,
  getSmallSkillIds,
  skillHasTypeTag
} from "../skills/registry";
import { SkillAttribute } from "../skills/types";

interface AttackInstance {
  key: string;
  sourceId: PlayerId;
  originalTargetId: PlayerId;
  targetId: PlayerId;
  actionIndex: number;
  stats: AttackStats;
  reflected: boolean;
  skipClash?: boolean;
  notLastHit?: boolean;
}

interface HealthDelta {
  damage: number;
  healing: number;
  defeatLevel?: DefeatLevel;
  defeatReason?: string;
  defeatSourceId?: PlayerId;
}

interface DamageContext {
  fromAttack?: boolean;
  isLastHit?: boolean;
}

interface ReversedDamageIntent {
  sourceId?: PlayerId;
  targetId: PlayerId;
  amount: number;
  attackName?: string;
  stats?: AttackStats;
  attack?: AttackInstance;
  isLastHit?: boolean;
}

interface ReboundDamagePacket extends ReversedDamageIntent {
  sourceId: PlayerId;
  visitedRebounderIds: PlayerId[];
}

const SKILL_GUESS_FAILED_BUFF_PREFIX = "skill_guess_failed";
const PENDING_DEATH_BUFF_ID = "pending_death";
const NO_REVIVE_BUFF_ID = "no_revive";
const FROST_BLADE_ATTACK_BUFF_ID = "frost_blade_attack";
const ATTACK_STAT_MODIFIER_BUFF_PREFIX = "pending_attack_stat_modifier:";
const DOUBLE_EDGE_SWORD_SKILL_ID = "skill_31_80497";
const DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX = "double_edge_ignore_defense:";
const LIEGONG_SKILL_ID = "skill_60_57192";
const LIEGONG_CROSS_BUFF_PREFIX = "liegong_cross:";
const ABSOLUTE_GUARD_SKILL_ID = "skill_74_34920";
const ABSOLUTE_GUARD_BUFF_PREFIX = "absolute_guard:";
const LUANWU_SKILL_ID = "skill_54_99719";
const PUTIAN_TONGQING_SKILL_ID = "skill_98_7182";
const ICE_RAIN_SKILL_ID = "skill_20_63089";
const ICE_VORTEX_SKILL_ID = "skill_118_53580";
const CROSS_GUARD_SKILL_ID = "skill_73_76567";
const XIEYU_SKILL_ID = "skill_72_53933";
const SHUNSHOU_STEAL_SKILL_ID = "skill_100_45717";
const SCATTER_REBOUND_SKILL_ID = "skill_58_88471";
const LU_ATTACK_SKILL_ID = "skill_81_59663";
const DING_ATTACK_SKILL_ID = "skill_83_32356";
const KOU_ATTACK_SKILL_ID = "skill_84_6114";
const LIAN_BAO_SKILL_ID = "skill_87_44771";
const JUANZI_SKILL_ID = "skill_95_91337";
const DESTROY_POWER_COOLDOWN_BUFF_ID = "destroy_power_cooldown";
const REVERSAL_SKILL_ID = "skill_93_50224";
const REVERSAL_TURN_BUFF_ID = "reversal_turn";
const PAST_TIME_SKILL_ID = "skill_104_71181";
const HELL_OVERLORD_SKILL_ID = "skill_112_59292";
const SELF_DESTRUCTER_DEATH_SKILL_ID = "skill_102_5546";
const SELF_DESTRUCT_COUNT_BUFF_ID = "self_destruct_count";
const LATE_SELF_DESTRUCT_USED_BUFF_ID = "late_self_destruct_used";
const SMALL_SPACE_BUFF_PREFIX = "small_space:";
const PAST_TIME_SPACE_BUFF_ID = `${SMALL_SPACE_BUFF_PREFIX}past_time`;
const PAST_TIME_SPACE_ROUNDS = 5;
const FLASH_DODGE_SKILL_ID = "skill_103_56259";
const FLASH_DODGE_BUFF_ID = "temp_flash_dodge";
const FLASH_DODGE_COOLDOWN_BUFF_ID = "flash_dodge_cooldown";
const SIX_STAR_SKILL_ID = "skill_108_76133";
const SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID = "temp_six_star_immunity";
const SAINT_SKILL_IDS = new Set<SkillId>(["skill_61_59049", "skill_62_8008"]);
const FOREST_LOW_SING_SKILL_ID = "skill_77_30612";
const PARALYSIS_NEXT_ACTION_BUFF_PREFIX = "paralysis_next_action:";
const PARALYSIS_NO_CAKE_GAIN_BUFF_ID = "paralysis_no_cake_gain";
const ACTIVE_REVIVAL_SKILL_IDS: SkillId[] = [
  "skill_64_60978",
  "skill_66_82448",
  "skill_68_57581",
  HELL_OVERLORD_SKILL_ID
];
const ELECTRIC_SHOCK_SKILL_ID = "skill_36_14343";
const MULTI_TARGET_ATTACK_SKILL_IDS = new Set<SkillId>([
  ELECTRIC_SHOCK_SKILL_ID,
  "skill_79_36319",
  "skill_118_53580",
  "skill_119_78843"
]);

function attributeDamageStats(
  id: SkillId,
  name: string,
  power: number,
  attribute: SkillAttribute
): AttackStats {
  return {
    id,
    name,
    cost: 0,
    power,
    level: 0,
    defenseTag: "unblockable",
    traits: ["skill", attribute],
    element: attribute,
    elements: [attribute],
    isArea: false,
    stacks: 1,
    isSkill: true
  };
}

function fireDamageStats(id: SkillId, name: string, power: number): AttackStats {
  return attributeDamageStats(id, name, power, "fire");
}

function electricShockStats(): AttackStats {
  const skill = getSkill(ELECTRIC_SHOCK_SKILL_ID);
  return {
    ...attributeDamageStats(
      ELECTRIC_SHOCK_SKILL_ID,
      skill?.name ?? "电击法术",
      0,
      "electric"
    ),
    level: INFINITE_DAMAGE,
    defenseTag: "unblockable"
  };
}

function pushAttackBlockedEvent(
  state: GameState,
  options: {
    sourceId: PlayerId | undefined;
    targetId: PlayerId;
    attackName: string;
    defense?: AttackBlockedEvent["defense"];
    blockKind?: AttackBlockedEvent["blockKind"];
    protectionName?: string;
    protectionSkillId?: SkillId;
  }
): void {
  if (options.protectionSkillId) {
    revealSkillOnTrigger(
      state,
      options.targetId,
      options.protectionSkillId,
      `触发${options.protectionName ?? "防御技能"}`
    );
  }

  const event: AttackBlockedEvent = {
    ...createBaseEvent(state, "attack_blocked"),
    type: "attack_blocked",
    sourceId: options.sourceId ?? options.targetId,
    targetId: options.targetId,
    attackName: options.attackName
  };
  if (options.defense) {
    event.defense = options.defense;
  }
  if (options.blockKind) {
    event.blockKind = options.blockKind;
  }
  if (options.protectionName) {
    event.protectionName = options.protectionName;
  }
  state.eventLog.push(event);
}

function normalizeForcedAreaAttackPlan(
  state: GameState,
  playerId: PlayerId,
  plan: PlayerActionPlan
): PlayerActionPlan {
  return {
    actions: plan.actions.map((action) => {
      const stats = getBaseAttackStatsForSubmittedAction(action);
      if (!stats || !isActionForcedArea(state, playerId, action, stats)) {
        return action;
      }

      if (action.type === "attack") {
        const { targetId: _targetId, ...rest } = action;
        return rest;
      }

      if (action.type === "skill") {
        const { targetId: _targetId, targetIds: _targetIds, ...rest } = action;
        return rest;
      }

      return action;
    })
  };
}

function getBaseAttackStatsForSubmittedAction(action: PlayerAction): AttackStats | undefined {
  if (action.type === "attack") {
    const definition = BASE_ATTACKS[action.attackId];
    return definition ? getStackedAttackStats(definition, action.stacks) : undefined;
  }

  if (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack") {
    return getSkillAttackStats(action.skillId, action.stacks);
  }

  return undefined;
}

export function submitPlayerAction(
  state: GameState,
  playerId: PlayerId,
  submission: ActionSubmission
): SubmitActionResult {
  const discardSkillId = getDiscardSkillSubmissionTarget(submission);
  if (discardSkillId) {
    return submitDiscardSkillAction(state, playerId, discardSkillId);
  }

  if (isSelfDestructSubmission(submission)) {
    return submitSelfDestructAction(state, playerId);
  }

  const validation = validateAction(state, playerId, submission);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const actionPlan = normalizeForcedAreaAttackPlan(
    state,
    playerId,
    normalizeActionPlan(submission)
  );
  const next = cloneGameState(state);
  next.pendingActions[playerId] = actionPlan;
  next.updatedAt = Date.now();
  next.eventLog.push({
    ...createBaseEvent(next, "action_submitted"),
    type: "action_submitted",
    playerId
  });

  const readyPlayerIds = new Set(Object.keys(next.pendingActions));
  const allReady = alivePlayers(next).every((player) => readyPlayerIds.has(player.id));

  if (!allReady) {
    return { state: next, resolved: false };
  }

  return {
    state: resolveTurn(next),
    resolved: true
  };
}

function getDiscardSkillSubmissionTarget(submission: ActionSubmission): SkillId | undefined {
  const plan = normalizeActionPlan(submission);
  const action = plan.actions.length === 1 ? plan.actions[0] : undefined;
  return action?.type === "discard_skill" ? action.targetSkillId : undefined;
}

function isDiscardSkillSubmission(submission: ActionSubmission): boolean {
  return Boolean(getDiscardSkillSubmissionTarget(submission));
}

function submitDiscardSkillAction(
  state: GameState,
  playerId: PlayerId,
  targetSkillId: SkillId | undefined
): SubmitActionResult {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    throw new Error("当前玩家不能丢弃技能");
  }

  if (state.phase !== "action_window" || state.actionWindowMode !== "active") {
    throw new Error("当前不能丢弃技能");
  }

  if (state.activeTimingPhase === "revival_action") {
    throw new Error("复活阶段不能丢弃技能");
  }

  if (!targetSkillId || !player.skills.includes(targetSkillId)) {
    throw new Error("只能丢弃自己持有的技能");
  }

  const next = cloneGameState(state);
  resolveDiscardSkill(next, playerId, targetSkillId);
  next.updatedAt = Date.now();
  return {
    state: next,
    resolved: false
  };
}

function resolveDiscardSkill(
  state: GameState,
  playerId: PlayerId,
  targetSkillId: SkillId
): void {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive" || !player.skills.includes(targetSkillId)) {
    return;
  }

  const skill = getSkill(targetSkillId);
  const activated = hasSkillBeenActivated(player, targetSkillId);
  removeOneSkillFromPlayerKnowledge(state, player, targetSkillId);
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 丢弃了技能 ${skill?.name ?? targetSkillId}`
  });

  if (!activated) {
    applyDiscardSkillHeal(state, playerId);
  }
}

function hasSkillBeenActivated(
  player: NonNullable<ReturnType<typeof findPlayer>>,
  skillId: SkillId
): boolean {
  return player.buffs.some(
    (buff) =>
      buff.id === `${SKILL_ACTIVATED_BUFF_PREFIX}${skillId}` ||
      buff.id === `skill_used:${skillId}`
  );
}

function applyDiscardSkillHeal(state: GameState, playerId: PlayerId): void {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    return;
  }

  if (isGlobalSkillActive(state, "skill_12_79004")) {
    for (const owner of activePlayersWithSkill(state, "skill_12_79004")) {
      revealSkillOnTrigger(state, owner.id, "skill_12_79004", "触发血之哀");
    }
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 的丢弃技能回血被血之哀压制`
    });
    return;
  }

  player.hp += 1;
  if (player.hp > 0) {
    clearPendingDeath(player);
  }
  state.eventLog.push({
    ...createBaseEvent(state, "heal"),
    type: "heal",
    sourceId: playerId,
    targetId: playerId,
    amount: 1,
    reason: "丢弃技能"
  });
}

function isSelfDestructSubmission(submission: ActionSubmission): boolean {
  const plan = normalizeActionPlan(submission);
  return plan.actions.length === 1 && isSelfDestructAction(plan.actions[0]);
}

function isSelfDestructAction(action: PlayerAction | undefined): boolean {
  return action?.type === "defense" && action.defense === "self_destruct";
}

function submitSelfDestructAction(
  state: GameState,
  playerId: PlayerId
): SubmitActionResult {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    throw new Error("当前玩家不能自爆");
  }

  const isTurnBeforeWindow =
    state.phase === "action_window" && state.activeTimingPhase === "turn_before_action";
  const isLateSelfDestructWindow = canUseLateSelfDestruct(state, playerId);
  if (state.phase !== "collecting_actions" && !isTurnBeforeWindow && !isLateSelfDestructWindow) {
    if (state.phase === "action_window" && state.activeTimingPhase === "turn_change_action") {
      throw new Error("后期自爆次数不足");
    }
    throw new Error("自爆只能在回合前或作为出招使用");
  }

  if (state.phase === "action_window" && state.actionWindowPassPlayerIds.includes(playerId)) {
    throw new Error("你已经放弃本阶段行动");
  }

  const next = cloneGameState(state);
  resolveSelfDestruct(next, playerId, { late: isLateSelfDestructWindow });
  next.updatedAt = Date.now();
  return {
    state: next,
    resolved: true
  };
}

function canUseLateSelfDestruct(state: GameState, playerId: PlayerId): boolean {
  if (state.phase !== "action_window" || state.activeTimingPhase !== "turn_change_action") {
    return false;
  }

  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    return false;
  }

  const limit = getLateSelfDestructLimit(player);
  return limit > 0 && getLateSelfDestructUseCount(player) < limit;
}

function getLateSelfDestructLimit(
  player: NonNullable<ReturnType<typeof findPlayer>>
): number {
  return 2 * getActiveSkillCount(player, SELF_DESTRUCTER_DEATH_SKILL_ID);
}

function getLateSelfDestructUseCount(player: { buffs: Array<{ id: string; stacks: number }> }): number {
  return player.buffs.find((buff) => buff.id === LATE_SELF_DESTRUCT_USED_BUFF_ID)?.stacks ?? 0;
}

function incrementLateSelfDestructUseCount(player: NonNullable<ReturnType<typeof findPlayer>>): void {
  const existing = player.buffs.find((buff) => buff.id === LATE_SELF_DESTRUCT_USED_BUFF_ID);
  if (existing) {
    existing.stacks += 1;
    return;
  }

  player.buffs.push({
    id: LATE_SELF_DESTRUCT_USED_BUFF_ID,
    name: "后期自爆次数",
    stacks: 1
  });
}

function resolveSelfDestruct(
  state: GameState,
  playerId: PlayerId,
  options: { late?: boolean } = {}
): void {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    return;
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 主动自爆：本回合所有出招无效，立即进入轮末判定点`
  });

  restorePreemptiveRestartSnapshot(state);
  const restoredPlayer = findPlayer(state, playerId);
  if (!restoredPlayer || restoredPlayer.status !== "alive") {
    return;
  }

  if (options.late) {
    incrementLateSelfDestructUseCount(restoredPlayer);
  }
  const count = incrementSelfDestructCount(restoredPlayer);
  applySelfDestructPenalty(state, playerId, count);
  state.pendingActions = {};
  state.actionWindowPlayerIds = [];
  state.actionWindowPassPlayerIds = [];
  delete state.pendingDamageItems;
  delete state.turnResolutionStarted;
  delete state.turnHealthChanged;
  delete state.damageModifyReturnPhase;
  delete state.damageModifyAfterTurnResolution;
  delete state.preemptiveRestartSnapshot;
  delete state.turnDeadlineAt;
  delete state.actionWindowMode;
  delete state.actionWindowDeadlineAt;

  endRound(state);
  beginAfterPreemptiveRoundEnd(state);
}

function incrementSelfDestructCount(
  player: NonNullable<ReturnType<typeof findPlayer>>
): number {
  const existing = player.buffs.find((buff) => buff.id === SELF_DESTRUCT_COUNT_BUFF_ID);
  if (existing) {
    existing.stacks += 1;
    return existing.stacks;
  }

  player.buffs.push({
    id: SELF_DESTRUCT_COUNT_BUFF_ID,
    name: "自爆次数",
    stacks: 1
  });
  return 1;
}

function applySelfDestructPenalty(
  state: GameState,
  playerId: PlayerId,
  count: number
): void {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    return;
  }

  if (playerHasActiveSkill(player, SELF_DESTRUCTER_DEATH_SKILL_ID)) {
    revealSkillOnTrigger(state, playerId, SELF_DESTRUCTER_DEATH_SKILL_ID, "触发自爆者死");
    applySelfDestructHpLoss(state, playerId);
    return;
  }

  const punishers = alivePlayers(state).filter(
    (candidate) =>
      candidate.id !== playerId &&
      playerHasActiveSkill(candidate, SELF_DESTRUCTER_DEATH_SKILL_ID)
  );
  if (punishers.length > 0) {
    for (const punisher of punishers) {
      revealSkillOnTrigger(state, punisher.id, SELF_DESTRUCTER_DEATH_SKILL_ID, "触发自爆者死");
    }
    applySelfDestructDefeat(state, playerId, getSelfDestructPunishedLevel(count), "自爆者死");
    return;
  }

  if (count === 1) {
    applySelfDestructHpLoss(state, playerId);
    return;
  }

  if (count === 2) {
    player.hp = 0;
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 第 2 次自爆，生命值直接变为 0`
    });
    if (playerHasActiveSkill(player, "skill_69_22138")) {
      finalizePlayerCannotContinue(state, player, [], 1, playerId, "自爆");
    }
    return;
  }

  applySelfDestructDefeat(state, playerId, getSelfDestructBaseLevel(count), "自爆");
}

function applySelfDestructHpLoss(state: GameState, playerId: PlayerId): void {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    return;
  }

  player.hp -= 1;
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 因自爆损失 1 点生命，当前 ${player.hp} 血`
  });
}

function applySelfDestructDefeat(
  state: GameState,
  playerId: PlayerId,
  defeatLevel: DefeatLevel,
  reason: string
): void {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    return;
  }

  finalizePlayerCannotContinue(state, player, [], defeatLevel, playerId, reason);
}

function getSelfDestructBaseLevel(count: number): DefeatLevel {
  return clampDefeatLevel(count - 1);
}

function getSelfDestructPunishedLevel(count: number): DefeatLevel {
  if (count <= 3) {
    return 2;
  }

  return clampDefeatLevel(count - 1);
}

function clampDefeatLevel(value: number): DefeatLevel {
  return Math.max(1, Math.min(5, value)) as DefeatLevel;
}

function beginAfterPreemptiveRoundEnd(state: GameState): void {
  if (shouldFinishGame(state)) {
    finishGame(state);
    return;
  }

  if (!usesSkillActionWindows(state)) {
    beginBasicTurnAction(state);
    return;
  }

  beginSkippedAwareActionPrompt(state, "round_pre_interval_action");
}

export function enterActionWindow(state: GameState, playerId: PlayerId): GameState {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    throw new Error("当前玩家不能行动");
  }
  if (state.phase !== "action_window") {
    throw new Error("当前不在行动阶段");
  }

  const next = cloneGameState(state);
  beginActiveActionWindow(next, playerId);
  next.updatedAt = Date.now();
  return next;
}

export function passActionWindow(state: GameState, playerId: PlayerId): GameState {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    throw new Error("当前玩家不能行动");
  }
  if (state.phase !== "action_window") {
    throw new Error("当前不在行动阶段");
  }

  const next = cloneGameState(state);
  markSkippedActionWindowPasses(next);
  if (!next.actionWindowPassPlayerIds.includes(playerId)) {
    next.actionWindowPassPlayerIds.push(playerId);
  }

  if (alivePlayers(next).every((item) => next.actionWindowPassPlayerIds.includes(item.id))) {
    advanceCurrentActionWindow(next);
    advanceFullySkippedActionWindows(next);
  }

  next.updatedAt = Date.now();
  return next;
}

export function skipActionWindowsUntilTurnAction(state: GameState, playerId: PlayerId): GameState {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    throw new Error("当前玩家不能行动");
  }
  if (state.phase !== "action_window") {
    throw new Error("只能在行动阶段启用连续跳过");
  }

  const next = cloneGameState(state);
  const nextPlayer = findPlayer(next, playerId);
  if (!nextPlayer) {
    throw new Error("玩家不存在");
  }

  upsertBuff(nextPlayer, {
    id: "skip_action_windows_until_turn_action",
    name: "跳过至出招",
    stacks: 1
  });
  markSkippedActionWindowPasses(next);
  if (alivePlayers(next).every((item) => next.actionWindowPassPlayerIds.includes(item.id))) {
    advanceCurrentActionWindow(next);
    advanceFullySkippedActionWindows(next);
  }
  next.updatedAt = Date.now();
  return next;
}

export function submitActionWindowSkill(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): GameState {
  if (state.phase === "action_window" && state.actionWindowMode === "prompt") {
    state = enterActionWindow(state, playerId);
  }

  const validation = validateActionWindowSkill(state, playerId, action);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const next = cloneGameState(state);
  const player = findPlayer(next, playerId);
  if (!player) {
    throw new Error("玩家不存在");
  }

  const wasRevivalWindow = isRevivalWindow(next);
  revealSkillOnUse(next, playerId, action.skillId, "使用技能");
  recordSkillUsed(next, playerId, action.skillId, "action_window");
  const cost = getEffectiveSkillActionCost(player, action, next, playerId);
  if (cost > 0) {
    changeCakes(next, playerId, player.cakes - cost, "阶段技能消耗");
  }

  const play = getSkillPlay(action.skillId);
  const skillDisabled = isPlayerSkillDisabled(player);
  let healthChangeOccurred = false;

  if (!skillDisabled && action.skillId === "skill_10_9488") {
    const preemptiveSkillId = action.skillId;
    const collapseEndRound = announceCollapse(next, playerId);
    restorePreemptiveRestartSnapshot(next);
    const restoredPlayer = findPlayer(next, playerId);
    if (restoredPlayer) {
      markSkillUse(restoredPlayer, preemptiveSkillId);
      markSkillActivated(next, playerId, preemptiveSkillId);
    }
    next.pendingActions = {};
    delete next.pendingDamageItems;
    delete next.turnResolutionStarted;
    delete next.turnHealthChanged;
    delete next.damageModifyReturnPhase;
    delete next.damageModifyAfterTurnResolution;
    delete next.preemptiveRestartSnapshot;
    endRound(next);
    applyCollapseBuffs(next, playerId, collapseEndRound);
    if (shouldFinishGame(next)) {
      finishGame(next);
    } else {
      beginSkippedAwareActionPrompt(next, "round_pre_interval_action");
    }
    next.updatedAt = Date.now();
    return next;
  }

  if (!skillDisabled && action.skillId === PAST_TIME_SKILL_ID) {
    markSkillUse(player, action.skillId);
    enterPastTimeSmallSpace(next, playerId);
    next.pendingActions = {};
    delete next.pendingDamageItems;
    delete next.turnResolutionStarted;
    delete next.turnHealthChanged;
    endRound(next, { skipSmallSpaceTick: true });
    if (shouldFinishGame(next)) {
      finishGame(next);
    } else {
      beginSkippedAwareActionPrompt(next, "round_pre_interval_action");
    }
    next.updatedAt = Date.now();
    return next;
  }

  if (!skillDisabled && play?.kind === "resource") {
    const gain = (play.resourceGainPerStack ?? 0) * action.stacks;
    if (gain > 0) {
      changeCakes(next, playerId, player.cakes + gain, `${getSkill(action.skillId)?.name ?? "技能"}生效`);
    }
  } else if (!skillDisabled && play?.kind === "effect") {
    applySkillPreparationEffect(next, playerId, action);
    healthChangeOccurred = resolveImmediateSkillEffect(next, playerId, action);
    if (healthChangeOccurred) {
      next.turnHealthChanged = true;
    }
    if (isDamageModifyWindow(next)) {
      markSkillUse(player, action.skillId);
      next.actionWindowPassPlayerIds = next.actionWindowPassPlayerIds.filter((id) => id !== playerId);
      refreshDamageModifyPasses(next);
      if (alivePlayers(next).every((item) => next.actionWindowPassPlayerIds.includes(item.id))) {
        advanceCurrentActionWindow(next);
        advanceFullySkippedActionWindows(next);
      } else {
        next.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;
      }
      next.updatedAt = Date.now();
      return next;
    }
    const delayUntilTurnResolution = shouldDelayWindowDamageUntilTurnResolution(next);
    const pendingDeathWindow = delayUntilTurnResolution
      ? false
      : updateDeaths(next, { allowPending: true });
    if (wasRevivalWindow && pendingDeathWindow) {
      markSkillUse(player, action.skillId);
      next.actionWindowPassPlayerIds = next.actionWindowPassPlayerIds.filter((id) => id !== playerId);
      markSkippedActionWindowPasses(next);
      if (alivePlayers(next).every((item) => next.actionWindowPassPlayerIds.includes(item.id))) {
        advanceCurrentActionWindow(next);
        advanceFullySkippedActionWindows(next);
      } else if (next.phase === "action_window") {
        next.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;
      }
      next.updatedAt = Date.now();
      return next;
    }

    if (wasRevivalWindow) {
      markSkillUse(player, action.skillId);
      next.actionWindowPassPlayerIds = next.actionWindowPassPlayerIds.filter((id) => id !== playerId);
      finishRevivalWindow(next);
      next.updatedAt = Date.now();
      return next;
    }

    if (pendingDeathWindow) {
      markSkillUse(player, action.skillId);
      next.pendingActions = {};
      beginSkippedAwareActionPrompt(next, "revival_action");
      next.updatedAt = Date.now();
      return next;
    }

    const keepResolutionWindowAfterHealthChange =
      healthChangeOccurred &&
      (delayUntilTurnResolution ||
        (next.turnResolutionStarted &&
          (next.activeTimingPhase === "turn_end_action" ||
            action.skillId === DOUBLE_EDGE_SWORD_SKILL_ID)));

    if (keepResolutionWindowAfterHealthChange) {
      // 回合末行动造成的伤害先留在本回合，等回合末窗口结束后统一推进。
    } else if (healthChangeOccurred) {
      next.pendingActions = {};
      delete next.turnResolutionStarted;
      delete next.turnHealthChanged;
      finishHealthChangedActionWindow(next, next.activeTimingPhase);
    }
  }

  const keepCurrentActionWindowAfterHealthChange =
    healthChangeOccurred &&
    (shouldDelayWindowDamageUntilTurnResolution(next) ||
      (next.turnResolutionStarted &&
        (next.activeTimingPhase === "turn_end_action" ||
          action.skillId === DOUBLE_EDGE_SWORD_SKILL_ID)));
  const shouldFinishTurnChangeAfterReversal =
    !skillDisabled &&
    action.skillId === REVERSAL_SKILL_ID &&
    next.phase === "action_window" &&
    next.activeTimingPhase === "turn_change_action";

  markSkillUse(player, action.skillId);
  next.actionWindowPassPlayerIds = next.actionWindowPassPlayerIds.filter((id) => id !== playerId);
  if (shouldFinishTurnChangeAfterReversal) {
    advanceCurrentActionWindow(next);
    advanceFullySkippedActionWindows(next);
  } else if (shouldFinishGame(next)) {
    finishGame(next);
  } else if (
    healthChangeOccurred &&
    !keepCurrentActionWindowAfterHealthChange &&
    next.phase !== "action_window"
  ) {
    beginSkippedAwareActionPrompt(next, "round_pre_interval_action");
  } else if (next.phase === "action_window") {
    next.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;
  }
  next.updatedAt = Date.now();
  return next;
}

export function guessPlayerSkill(
  state: GameState,
  playerId: PlayerId,
  targetPlayerId: PlayerId,
  targetSkillId: SkillId
): GameState {
  if (state.phase === "action_window" && state.actionWindowMode === "prompt") {
    state = enterActionWindow(state, playerId);
  }

  validateSkillGuess(state, playerId, targetPlayerId, targetSkillId);

  const next = cloneGameState(state);
  const actor = findPlayer(next, playerId);
  const target = findPlayer(next, targetPlayerId);
  const targetSkill = getSkill(targetSkillId);
  if (!actor || !target || !targetSkill) {
    throw new Error("技能猜测目标不存在");
  }

  const guessedCorrectly = target.skills.includes(targetSkillId);
  if (!guessedCorrectly) {
    upsertBuff(actor, {
      id: skillGuessFailedBuffId(next.turnNumber),
      name: "技能猜测失败",
      stacks: 1,
      expiresAtTurn: next.turnNumber
    });
    next.eventLog.push({
      ...createBaseEvent(next, "system"),
      type: "system",
      message: `${actor.name} 猜测 ${target.name} 持有 ${targetSkill.name}，猜错了`
    });
    next.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;
    next.updatedAt = Date.now();
    return next;
  }

  const beforeHp = new Map(next.players.map((player) => [player.id, player.hp]));
  const revealed = revealSkillToAll(next, targetPlayerId, targetSkillId, "技能猜测");
  next.eventLog.push({
    ...createBaseEvent(next, "system"),
    type: "system",
    message: revealed
      ? `${actor.name} 猜中了 ${target.name} 的 ${targetSkill.name}，该技能暴露`
      : `${actor.name} 猜中了 ${target.name} 的 ${targetSkill.name}，该技能已经暴露`
  });

  const healthChangeOccurred = next.players.some(
    (player) => beforeHp.get(player.id) !== player.hp
  );
  if (healthChangeOccurred) {
    next.turnHealthChanged = true;
  }
  const pendingDeathWindow = updateDeaths(next, { allowPending: true });

  if (shouldFinishGame(next)) {
    finishGame(next);
  } else if (pendingDeathWindow) {
    next.pendingActions = {};
    beginSkippedAwareActionPrompt(next, "revival_action");
  } else if (
    healthChangeOccurred &&
    next.turnResolutionStarted &&
    next.activeTimingPhase === "turn_end_action"
  ) {
    next.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;
  } else if (healthChangeOccurred) {
    next.pendingActions = {};
    delete next.turnResolutionStarted;
    delete next.turnHealthChanged;
    endRound(next);
    beginSkippedAwareActionPrompt(next, "round_pre_interval_action");
  } else if (next.phase === "action_window") {
    next.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;
  }

  next.updatedAt = Date.now();
  return next;
}

function validateSkillGuess(
  state: GameState,
  playerId: PlayerId,
  targetPlayerId: PlayerId,
  targetSkillId: SkillId
): void {
  if (state.phase !== "action_window" || state.activeTimingPhase !== "turn_end_action") {
    throw new Error("只能在回合末阶段进行技能猜测");
  }

  if (state.actionWindowMode !== "active") {
    throw new Error("请先进入行动阶段再进行技能猜测");
  }

  const actor = findPlayer(state, playerId);
  if (!actor || actor.status !== "alive") {
    throw new Error("只有存活玩家可以进行技能猜测");
  }

  if (state.actionWindowPassPlayerIds.includes(playerId)) {
    throw new Error("你已经结束本次行动窗口");
  }

  if (actor.buffs.some((buff) => buff.id === skillGuessFailedBuffId(state.turnNumber))) {
    throw new Error("你本回合已经猜错过，不能再次进行技能猜测");
  }

  const target = findPlayer(state, targetPlayerId);
  if (!target || target.status !== "alive") {
    throw new Error("技能猜测目标不存在或已死亡");
  }

  if (!getSmallSkillIds().includes(targetSkillId)) {
    throw new Error("技能猜测只能选择小技能池中的技能");
  }

  if (!getSkill(targetSkillId)) {
    throw new Error("技能猜测目标技能不存在");
  }
}

function skillGuessFailedBuffId(turnNumber: number): string {
  return `${SKILL_GUESS_FAILED_BUFF_PREFIX}:${turnNumber}`;
}

export function advanceActionWindow(state: GameState): GameState {
  if (state.phase !== "action_window") {
    return state;
  }

  const next = cloneGameState(state);
  advanceCurrentActionWindow(next);
  advanceFullySkippedActionWindows(next);
  next.updatedAt = Date.now();
  return next;
}

function beginSkippedAwareActionPrompt(
  state: GameState,
  timingPhase: SkillTimingPhase,
  options: { preservePendingActions?: boolean; promptSeconds?: number } = {}
): void {
  const promptOptions =
    timingPhase === "revival_action"
      ? {
          ...options,
          promptSeconds: Math.max(
            options.promptSeconds ?? ACTION_WINDOW_SECONDS,
            ACTION_WINDOW_SECONDS
          )
        }
      : options;
  beginActionPrompt(state, timingPhase, promptOptions);
  markSkippedActionWindowPasses(state);
  advanceFullySkippedActionWindows(state);
}

function markSkippedActionWindowPasses(state: GameState): void {
  if (state.phase !== "action_window") {
    return;
  }

  const pendingDeathWindow = isPendingDeathWindow(state);
  const damageModifyWindow = isDamageModifyWindow(state);
  for (const player of alivePlayers(state)) {
    const shouldAutoPass =
      (pendingDeathWindow && !isPendingDeathPlayer(player)) ||
      (pendingDeathWindow && !playerCanUseRevivalAction(state, player)) ||
      (damageModifyWindow && !playerCanUseDamageModifyAction(state, player)) ||
      isPlayerInCollapse(player) ||
      player.buffs.some((buff) => buff.id === "skip_action_windows_until_turn_action");
    if (shouldAutoPass && !state.actionWindowPassPlayerIds.includes(player.id)) {
      state.actionWindowPassPlayerIds.push(player.id);
    }
  }
}

function refreshDamageModifyPasses(state: GameState): void {
  if (!isDamageModifyWindow(state)) {
    return;
  }

  state.actionWindowPassPlayerIds = state.actionWindowPassPlayerIds.filter((playerId) => {
    const player = findPlayer(state, playerId);
    return player ? !playerCanUseDamageModifyAction(state, player) : true;
  });
  markSkippedActionWindowPasses(state);
}

function advanceFullySkippedActionWindows(state: GameState): void {
  let guard = 0;
  while (
    state.phase === "action_window" &&
    guard < 12 &&
    alivePlayers(state).length > 0 &&
    alivePlayers(state).every((player) => state.actionWindowPassPlayerIds.includes(player.id))
  ) {
    guard += 1;
    advanceCurrentActionWindow(state);
    markSkippedActionWindowPasses(state);
  }
}

function applyCollapseBuffs(
  state: GameState,
  sourceId: PlayerId,
  expiresAtRoundEnd: number
): void {
  for (const player of state.players) {
    if (player.status !== "alive") {
      continue;
    }
    upsertBuff(player, {
      id: `${COLLAPSE_BUFF_PREFIX}${expiresAtRoundEnd}`,
      name: "沦陷",
      stacks: 1,
      sourcePlayerId: sourceId
    });
  }
}

function announceCollapse(state: GameState, sourceId: PlayerId): number {
  const source = findPlayer(state, sourceId);
  const expiresAtRoundEnd = state.roundNumber + 1;
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source?.name ?? "未知玩家"} 发动沦陷：本轮立即结束，全场无技能状态持续到第 ${expiresAtRoundEnd} 轮轮末判定点`
  });
  return expiresAtRoundEnd;
}

function enterPastTimeSmallSpace(state: GameState, playerId: PlayerId): void {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    return;
  }

  clearPendingDeath(player);
  player.status = "dead";
  player.defeatLevel = 2;
  player.buffs = player.buffs.filter((buff) => !buff.id.startsWith(SMALL_SPACE_BUFF_PREFIX));
  player.buffs.push({
    id: PAST_TIME_SPACE_BUFF_ID,
    name: `小空间：过往时空（${player.name}）`,
    stacks: PAST_TIME_SPACE_ROUNDS,
    sourcePlayerId: player.id
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 进入小空间：过往时空，主空间视为退游，${PAST_TIME_SPACE_ROUNDS} 轮后返回`
  });
}

function tickSmallSpaces(state: GameState): void {
  for (const player of state.players) {
    const spaceBuff = player.buffs.find((buff) => buff.id.startsWith(SMALL_SPACE_BUFF_PREFIX));
    if (!spaceBuff || spaceBuff.id !== PAST_TIME_SPACE_BUFF_ID) {
      continue;
    }

    spaceBuff.stacks -= 1;
    if (spaceBuff.stacks > 0) {
      continue;
    }

    player.buffs = player.buffs.filter((buff) => buff !== spaceBuff);
    player.status = "alive";
    delete player.defeatLevel;
    clearPendingDeath(player);
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 从小空间：过往时空返回主空间`
    });
  }
}

export function resolveTurn(state: GameState): GameState {
  const next = cloneGameState(state);
  next.phase = "resolving";

  const revealedActions = getRevealedActions(next);
  next.eventLog.push({
    ...createBaseEvent(next, "turn_revealed"),
    type: "turn_revealed",
    actions: revealedActions
  });

  applyActionCostsAndGains(next, revealedActions);
  next.turnResolutionStarted = true;
  delete next.turnHealthChanged;
  if (!usesSkillActionWindows(next)) {
    finishTurnResolution(next);
    next.updatedAt = Date.now();
    return next;
  }

  beginSkippedAwareActionPrompt(next, "turn_change_action", { preservePendingActions: true });
  next.updatedAt = Date.now();
  return next;
}

function finishTurnResolution(state: GameState): void {
  state.phase = "resolving";
  const revealedActions = getRevealedActions(state);
  const createdAttacks = createAttackInstances(state, revealedActions);
  const reversed = isReversalActive(state);
  const attacksBeforeRebound = reversed
    ? reverseAttackInstances(state, createdAttacks)
    : createdAttacks;
  const resolutionActions = reversed
    ? createReversedResolutionActions(state, revealedActions, attacksBeforeRebound)
    : revealedActions;

  const healthDeltas = new Map<PlayerId, HealthDelta>();
  if (reversed) {
    resolveReversedAttacks(state, attacksBeforeRebound, resolutionActions, healthDeltas);
  } else {
    const attacks = applyRebounds(
      state,
      attacksBeforeRebound,
      resolutionActions
    );
    const handledAttackKeys = new Set<string>();
    resolveClashes(state, attacks, handledAttackKeys, healthDeltas, resolutionActions);
    resolveUnopposedAttacks(
      state,
      attacks,
      handledAttackKeys,
      healthDeltas,
      resolutionActions
    );
  }
  resolveActiveSkillEffects(state, revealedActions, healthDeltas);

  if (applyHealthDeltas(state, healthDeltas)) {
    state.turnHealthChanged = true;
  }

  if (handlePendingDamageItems(state)) {
    return;
  }

  completeDamagePoint(state);
}

function finishRevivalWindow(state: GameState): void {
  updateDeaths(state, { allowPending: false });
  if (!state.turnResolutionStarted) {
    const healthChangeOccurred = Boolean(state.turnHealthChanged);
    const returnPhase = state.damageModifyReturnPhase ?? state.activeTimingPhase;
    delete state.turnHealthChanged;
    delete state.damageModifyReturnPhase;
    delete state.damageModifyAfterTurnResolution;
    if (shouldFinishGame(state)) {
      finishGame(state);
      return;
    }
    if (healthChangeOccurred) {
      finishHealthChangedActionWindow(state, returnPhase);
      return;
    }
    if (state.phase === "action_window") {
      state.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;
    }
    return;
  }
  beginTurnEndAfterDamage(state);
}

function finishDamageModifyWindow(state: GameState): void {
  if (applyPendingDamageItems(state)) {
    state.turnHealthChanged = true;
  }

  if (handlePendingDamageItems(state)) {
    return;
  }

  completeDamagePoint(state);
}

function handlePendingDamageItems(state: GameState): boolean {
  let guard = 0;
  while ((state.pendingDamageItems?.length ?? 0) > 0 && guard < 8) {
    guard += 1;
    if (usesSkillActionWindows(state) && alivePlayers(state).some((player) => playerCanUseDamageModifyAction(state, player))) {
      beginDamageModifyPrompt(state);
      return state.phase === "action_window" && state.activeTimingPhase === "turn_damage_modify";
    }

    if (applyPendingDamageItems(state)) {
      state.turnHealthChanged = true;
    }
  }

  return false;
}

function beginDamageModifyPrompt(state: GameState): void {
  if (state.activeTimingPhase !== "turn_damage_modify") {
    state.damageModifyReturnPhase = state.activeTimingPhase;
  }
  state.damageModifyAfterTurnResolution = state.phase === "resolving";
  beginSkippedAwareActionPrompt(state, "turn_damage_modify", {
    preservePendingActions: true,
    promptSeconds: ACTION_WINDOW_SECONDS
  });
}

function playerCanUseDamageModifyAction(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>
): boolean {
  return (
    player.status === "alive" &&
    ((playerHasActiveSkill(player, "skill_94_627") &&
      getSkillUseCount(player, "skill_94_627") < 2 * getActiveSkillCount(player, "skill_94_627") &&
      getRedirectableDamageItems(state, player.id).length > 0) ||
      (playerHasActiveSkill(player, SIX_STAR_SKILL_ID) &&
        getSkillUseCount(player, SIX_STAR_SKILL_ID) < getActiveSkillCount(player, SIX_STAR_SKILL_ID) &&
        Boolean(getHighestPendingDamageItem(state, player.id))) ||
      (playerHasActiveSkill(player, ICE_RAIN_SKILL_ID) &&
        getIceRainMarkDamageItems(state, player.id).length > 0) ||
      (playerHasActiveSkill(player, CROSS_GUARD_SKILL_ID) &&
        getCrossGuardDamageItems(state, player.id).length > 0))
  );
}

function getRedirectableDamageItems(
  state: GameState,
  playerId: PlayerId
): PendingDamageItem[] {
  return (state.pendingDamageItems ?? []).filter(
    (item) =>
      item.targetId === playerId &&
      item.amount <= 3 &&
      !(item.redirectedByPlayerIds ?? []).includes(playerId)
  );
}

function getIceRainMarkDamageItems(
  state: GameState,
  playerId: PlayerId
): PendingDamageItem[] {
  return (state.pendingDamageItems ?? []).filter((item) => {
    if (
      item.targetId !== playerId ||
      item.amount <= 0 ||
      !item.sourceId ||
      hasPendingDamageModifier(item, "ice_rain")
    ) {
      return false;
    }

    return Boolean(
      findPlayer(state, item.sourceId)?.buffs.some(
        (buff) => buff.id === `ice_rain:${playerId}` && buff.stacks > 0
      )
    );
  });
}

function getCrossGuardDamageItems(
  state: GameState,
  playerId: PlayerId
): PendingDamageItem[] {
  const player = findPlayer(state, playerId);
  if (!player) {
    return [];
  }

  return (state.pendingDamageItems ?? []).filter((item) => {
    if (item.amount <= 0) {
      return false;
    }

    if (
      item.targetId === playerId &&
      player.buffs.some((buff) => buff.id === "huyou_mark" && buff.stacks > 0)
    ) {
      return !hasPendingDamageModifier(item, "huyou");
    }

    if (
      areNeighborPlayers(state, playerId, item.targetId) &&
      player.buffs.some((buff) => buff.id === "cross_mark" && buff.stacks > 0)
    ) {
      return !hasPendingDamageModifier(item, "cross");
    }

    return false;
  });
}

function hasPendingDamageModifier(item: PendingDamageItem, modifierId: string): boolean {
  return Boolean(item.damageModifierIds?.includes(modifierId));
}

function completeDamagePoint(state: GameState): void {
  const returnPhase = state.damageModifyReturnPhase ?? "round_pre_interval_action";
  if (shouldResumeTurnChangeBeforeResolution(state, returnPhase)) {
    delete state.damageModifyReturnPhase;
    delete state.damageModifyAfterTurnResolution;
    beginSkippedAwareActionPrompt(state, "turn_change_action", { preservePendingActions: true });
    return;
  }

  const pendingDeathWindow = updateDeaths(state, { allowPending: true });
  clearTurnTemporaryBuffs(state);
  state.pendingActions = {};

  if (pendingDeathWindow) {
    if (!state.turnResolutionStarted) {
      state.damageModifyReturnPhase = returnPhase;
    }
    beginSkippedAwareActionPrompt(state, "revival_action");
    return;
  }

  if (state.turnResolutionStarted) {
    beginTurnEndAfterDamage(state);
    return;
  }

  const healthChangeOccurred = Boolean(state.turnHealthChanged);
  delete state.turnHealthChanged;
  delete state.damageModifyReturnPhase;
  delete state.damageModifyAfterTurnResolution;
  if (shouldFinishGame(state)) {
    finishGame(state);
    return;
  }

  if (healthChangeOccurred) {
    finishHealthChangedActionWindow(state, returnPhase);
    return;
  }

  beginSkippedAwareActionPrompt(state, returnPhase);
}

function shouldResumeTurnChangeBeforeResolution(
  state: GameState,
  returnPhase: SkillTimingPhase
): boolean {
  return Boolean(
    state.turnResolutionStarted &&
      !state.damageModifyAfterTurnResolution &&
      returnPhase === "turn_change_action"
  );
}

function shouldDelayWindowDamageUntilTurnResolution(state: GameState): boolean {
  return Boolean(
    state.turnResolutionStarted &&
      !state.damageModifyAfterTurnResolution &&
      (state.activeTimingPhase === "turn_change_action" ||
        state.damageModifyReturnPhase === "turn_change_action")
  );
}

function shouldEndRoundAfterWindowHealthChange(timingPhase: SkillTimingPhase): boolean {
  return timingPhase !== "round_pre_interval_action" && timingPhase !== "round_after_interval_action";
}

function finishHealthChangedActionWindow(
  state: GameState,
  timingPhase: SkillTimingPhase
): void {
  if (shouldEndRoundAfterWindowHealthChange(timingPhase)) {
    endRound(state);
    beginSkippedAwareActionPrompt(state, "round_pre_interval_action");
    return;
  }

  beginSkippedAwareActionPrompt(state, timingPhase);
}

function beginTurnEndAfterDamage(state: GameState): void {
  if (shouldFinishGame(state)) {
    finishGame(state);
    return;
  }

  if (!usesSkillActionWindows(state)) {
    finishTurnAfterEndAction(state);
    return;
  }

  beginSkippedAwareActionPrompt(state, "turn_end_action");
}

function finishTurnAfterEndAction(state: GameState): void {
  const healthChangeOccurred = Boolean(state.turnHealthChanged);

  if (healthChangeOccurred) {
    endRound(state);
  } else {
    state.roundTurnNumber += 1;
  }

  state.turnNumber += 1;
  state.pendingActions = {};
  delete state.turnResolutionStarted;
  delete state.turnHealthChanged;
  delete state.damageModifyReturnPhase;
  delete state.damageModifyAfterTurnResolution;
  delete state.preemptiveRestartSnapshot;
  state.turnStartedAt = Date.now();

  if (shouldFinishGame(state)) {
    finishGame(state);
    return;
  }

  if (!usesSkillActionWindows(state)) {
    beginBasicTurnAction(state);
    return;
  }

  if (healthChangeOccurred) {
    beginSkippedAwareActionPrompt(state, "round_pre_interval_action");
  } else {
    beginSkippedAwareActionPrompt(state, "turn_after_interval_action");
  }
}

function finishGame(state: GameState): void {
  const winners = determineWinnerIds(state);
  state.phase = "finished";
  delete state.turnDeadlineAt;
  delete state.turnResolutionStarted;
  delete state.turnHealthChanged;
  delete state.damageModifyReturnPhase;
  delete state.damageModifyAfterTurnResolution;
  delete state.preemptiveRestartSnapshot;
  delete state.pendingDamageItems;
  delete state.actionWindowMode;
  delete state.actionWindowDeadlineAt;
  state.actionWindowPlayerIds = [];
  state.actionWindowPassPlayerIds = [];
  state.winnerIds = winners;
  state.eventLog.push({
    ...createBaseEvent(state, "game_finished"),
    type: "game_finished",
    winnerIds: winners
  });
}

function determineWinnerIds(state: GameState): PlayerId[] {
  const alive = alivePlayers(state);
  const victoryAlive = victoryEligiblePlayers(state);
  const instantWinners = alive.filter((player) =>
    player.buffs.some((buff) => buff.id.startsWith("instant_win:"))
  );
  if (instantWinners.length > 0) {
    return includePuppetVictoryPartners(state, instantWinners.map((player) => player.id));
  }

  if (victoryAlive.length === 2) {
    const whiteboard = victoryAlive.find((player) => playerHasActiveSkill(player, "skill_105_48309"));
    if (whiteboard) {
      revealSkillOnTrigger(state, whiteboard.id, "skill_105_48309", "触发白板胜利");
      const blackboard = victoryAlive.find((player) => playerHasActiveSkill(player, "skill_106_59962"));
      if (blackboard) {
        revealSkillOnTrigger(state, blackboard.id, "skill_106_59962", "触发黑板胜利");
      }
      return includePuppetVictoryPartners(state, [blackboard?.id ?? whiteboard.id]);
    }
  }

  const baseWinners =
    victoryAlive.length > 0
      ? victoryAlive.map((player) => player.id)
      : alive.filter((player) => isPuppetPlayer(player)).map((player) => player.id);
  return includePuppetVictoryPartners(state, baseWinners);
}

function includePuppetVictoryPartners(state: GameState, winnerIds: PlayerId[]): PlayerId[] {
  const winners = new Set(winnerIds);
  for (const player of state.players) {
    const masterId = getPuppetMasterId(player);
    if (!masterId) {
      continue;
    }

    if (winners.has(player.id)) {
      winners.add(masterId);
    }
    if (player.status === "alive" && winners.has(masterId)) {
      winners.add(player.id);
    }
  }

  return state.players
    .filter((player) => winners.has(player.id))
    .map((player) => player.id);
}

function beginActiveActionWindow(state: GameState, playerId?: PlayerId): void {
  state.phase = "action_window";
  state.actionWindowMode = "active";
  state.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;
  if (playerId && !state.actionWindowPlayerIds.includes(playerId)) {
    state.actionWindowPlayerIds.push(playerId);
  }
  state.actionWindowPassPlayerIds = [];
  delete state.turnDeadlineAt;
}

function advanceCurrentActionWindow(state: GameState): void {
  if (shouldFinishGame(state)) {
    finishGame(state);
    return;
  }

  const current = state.activeTimingPhase;
  if (current === "round_pre_interval_action") {
    applyDefaultShunshouStealChoices(state);
    beginSkippedAwareActionPrompt(state, "round_before_action");
    return;
  }

  if (current === "round_before_action") {
    applyRoundStartSkills(state);
    beginSkippedAwareActionPrompt(state, "turn_before_action");
    return;
  }

  if (current === "turn_before_action") {
    beginTurnActionPhase(state);
    return;
  }

  if (current === "turn_change_action") {
    finishTurnResolution(state);
    return;
  }

  if (current === "turn_damage_modify") {
    finishDamageModifyWindow(state);
    advanceFullySkippedActionWindows(state);
    return;
  }

  if (current === "revival_action") {
    finishRevivalWindow(state);
    return;
  }

  if (current === "turn_end_action") {
    if (state.turnResolutionStarted) {
      finishTurnAfterEndAction(state);
    } else {
      beginTurnActionPhase(state);
    }
    return;
  }

  if (current === "turn_after_interval_action") {
    beginSkippedAwareActionPrompt(state, "turn_before_action");
    return;
  }

  if (current === "round_after_interval_action") {
    beginSkippedAwareActionPrompt(state, "round_pre_interval_action");
    return;
  }

  beginTurnActionPhase(state);
}

function beginTurnActionPhase(state: GameState): void {
  state.phase = "collecting_actions";
  state.activeTimingPhase = "turn_action";
  state.actionWindowPlayerIds = [];
  state.actionWindowPassPlayerIds = [];
  delete state.actionWindowMode;
  delete state.actionWindowDeadlineAt;
  delete state.damageModifyReturnPhase;
  delete state.damageModifyAfterTurnResolution;
  delete state.pendingDamageItems;
  state.pendingActions = {};
  clearSkipUntilTurnActionBuffs(state);
  state.turnStartedAt = Date.now();
  applyTurnStartSkills(state);
  applyParalysisAutoActions(state);
  applyFrozenAutoActions(state);
  capturePreemptiveRestartSnapshot(state);
  const deadline = getTurnDeadline(state);
  if (deadline) {
    state.turnDeadlineAt = deadline;
  } else {
    delete state.turnDeadlineAt;
  }

  if (
    alivePlayers(state).length > 0 &&
    alivePlayers(state).every((player) => state.pendingActions[player.id])
  ) {
    replaceStateContents(state, resolveTurn(state));
  }
}

function capturePreemptiveRestartSnapshot(state: GameState): void {
  const snapshot: PreemptiveRestartSnapshot = {
    roundNumber: state.roundNumber,
    roundTurnNumber: state.roundTurnNumber,
    turnNumber: state.turnNumber,
    activeTimingPhase: state.activeTimingPhase,
    turnStartedAt: state.turnStartedAt,
    players: clonePlayers(state.players),
    pendingActions: clonePendingActions(state.pendingActions),
    ...(state.pendingSkillChoices
      ? { pendingSkillChoices: JSON.parse(JSON.stringify(state.pendingSkillChoices)) }
      : {})
  };
  state.preemptiveRestartSnapshot = snapshot;
}

function restorePreemptiveRestartSnapshot(state: GameState): void {
  const snapshot = state.preemptiveRestartSnapshot;
  if (!snapshot) {
    return;
  }

  state.roundNumber = snapshot.roundNumber;
  state.roundTurnNumber = snapshot.roundTurnNumber;
  state.turnNumber = snapshot.turnNumber;
  state.activeTimingPhase = snapshot.activeTimingPhase;
  state.turnStartedAt = snapshot.turnStartedAt;
  state.players = clonePlayers(snapshot.players);
  state.pendingActions = clonePendingActions(snapshot.pendingActions);
  if (snapshot.pendingSkillChoices) {
    state.pendingSkillChoices = JSON.parse(JSON.stringify(snapshot.pendingSkillChoices));
  } else {
    delete state.pendingSkillChoices;
  }
}

function clonePlayers(players: PlayerState[]): PlayerState[] {
  return JSON.parse(JSON.stringify(players)) as PlayerState[];
}

function clonePendingActions(actions: PendingActionMap): PendingActionMap {
  return JSON.parse(JSON.stringify(actions)) as PendingActionMap;
}

function getRevealedActions(state: GameState): Record<PlayerId, PlayerActionPlan> {
  const actions: Record<PlayerId, PlayerActionPlan> = {};
  for (const player of alivePlayers(state)) {
    const action = state.pendingActions[player.id];
    if (action) {
      actions[player.id] = action;
    }
  }
  return actions;
}

function applyParalysisAutoActions(state: GameState): void {
  for (const player of alivePlayers(state)) {
    const paralysisBuff = player.buffs.find((buff) =>
      buff.id.startsWith(PARALYSIS_NEXT_ACTION_BUFF_PREFIX)
    );
    if (!paralysisBuff) {
      continue;
    }

    player.buffs = player.buffs.filter(
      (buff) => !buff.id.startsWith(PARALYSIS_NEXT_ACTION_BUFF_PREFIX)
    );
    const fixedAction = parseParalysisFixedAction(paralysisBuff.id);
    if (fixedAction?.type === "gain_cake") {
      upsertBuff(player, {
        id: PARALYSIS_NO_CAKE_GAIN_BUFF_ID,
        name: "麻痹固定饼不加饼",
        stacks: 1,
        expiresAtTurn: state.turnNumber
      });
    }

    state.pendingActions[player.id] = {
      actions: fixedAction ? [fixedAction] : []
    };
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: fixedAction
        ? `${player.name} 处于麻痹，固定出招为 ${getActionLabel(fixedAction)}`
        : `${player.name} 处于麻痹，本回合视为没有出招`
    });
  }
}

function parseParalysisFixedAction(id: string): PlayerAction | undefined {
  const value = id.slice(PARALYSIS_NEXT_ACTION_BUFF_PREFIX.length);
  if (value === "gain_cake") {
    return { type: "gain_cake" };
  }

  if (value === "small" || value === "youtiao" || value === "stone") {
    return { type: "defense", defense: value };
  }

  return undefined;
}

function consumeParalysisNoCakeGain(
  player: { buffs: Array<{ id: string; stacks: number }> }
): boolean {
  const buff = player.buffs.find((item) => item.id === PARALYSIS_NO_CAKE_GAIN_BUFF_ID);
  if (!buff) {
    return false;
  }

  buff.stacks -= 1;
  player.buffs = player.buffs.filter((item) => item.stacks > 0);
  return true;
}

function replaceStateContents(state: GameState, next: GameState): void {
  for (const key of Object.keys(state)) {
    delete (state as unknown as Record<string, unknown>)[key];
  }
  Object.assign(state, next);
}

function applyActionCostsAndGains(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>
): void {
  for (const [playerId, plan] of Object.entries(actions)) {
    const player = findPlayer(state, playerId);
    if (!player) {
      continue;
    }

    if (plan.actions.length === 1 && plan.actions[0]?.type === "gain_cake") {
      if (consumeParalysisNoCakeGain(player)) {
        state.eventLog.push({
          ...createBaseEvent(state, "system"),
          type: "system",
          message: `${player.name} 因麻痹固定为饼出招，本回合不加饼`
        });
        continue;
      }
      changeCakes(state, playerId, player.cakes + getCakeGainAmount(state), "出饼");
      continue;
    }

    const reboundAction = plan.actions.find(
      (action) => action.type === "defense" && action.defense === "rebound"
    );
    if (reboundAction) {
      changeCakes(state, playerId, 0, "反弹消耗全部饼");
      continue;
    }

    rememberRoundActionUse(player, plan, state);

    const totalActionCost = plan.actions.reduce((sum, action) => {
      if (action.type === "attack") {
        return sum + getEffectiveAttackActionCost(player, action);
      }

      if (action.type === "skill") {
        return sum + getEffectiveSkillActionCost(player, action);
      }

      return sum;
    }, 0);

    if (totalActionCost > 0) {
      changeCakes(state, playerId, player.cakes - totalActionCost, "招式消耗");
    }

    consumeFreeSkillBuffs(player, plan);
    consumeSkillResourceBuffs(player, plan);

    for (const action of plan.actions) {
      if (action.type !== "skill") {
        continue;
      }

      revealSkillOnUse(state, playerId, action.skillId, "使用技能");
      recordSkillUsed(state, playerId, action.skillId, "turn_action");
      const play = getSkillPlay(action.skillId);
      const skillDisabled = isPlayerSkillDisabled(player);
      if (skillDisabled) {
        if (play?.kind !== "attack" || play?.usesPerGame) {
          markSkillUse(player, action.skillId);
        }
        continue;
      }

      if (play?.kind !== "resource") {
        if (play?.kind === "effect") {
          applySkillPreparationEffect(state, playerId, action);
          markSkillUse(player, action.skillId);
        } else if (play?.usesPerGame) {
          markSkillUse(player, action.skillId);
        }
        continue;
      }

      const gain = (play.resourceGainPerStack ?? 0) * action.stacks;
      if (gain > 0) {
        const current = findPlayer(state, playerId);
        changeCakes(state, playerId, (current?.cakes ?? 0) + gain, `${getSkill(action.skillId)?.name ?? "技能"}生效`);
      }
      markSkillUse(player, action.skillId);
    }
  }
}

function rememberRoundActionUse(
  player: {
    id: PlayerId;
    buffs: Array<{ id: string; name: string; stacks: number; expiresAtRound?: number }>;
    skills: string[];
    hp: number;
  },
  plan: PlayerActionPlan,
  state: GameState
): void {
  const roundNumber = state.roundNumber;
  if (
    plan.actions.some(
      (action) =>
        action.type === "attack" ||
        (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack")
    )
  ) {
    upsertBuff(player, {
      id: `used_attack_round:${roundNumber}`,
      name: "本轮已攻击",
      stacks: 1,
      expiresAtRound: roundNumber + 1
    });
  }

  const attackActionCount = plan.actions.filter(
    (action) =>
      action.type === "attack" ||
      (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack")
  ).length;
  if (
    attackActionCount > 0 &&
    playerHasActiveSkill(player, "skill_117_55768") &&
    player.hp <= Math.floor(INITIAL_HP / 2)
  ) {
    addCountingMark(player, "bailian_attack_count", "百炼攻击计数", attackActionCount);
    const counter = player.buffs.find((buff) => buff.id === "bailian_attack_count");
    if ((counter?.stacks ?? 0) >= 25) {
      revealSkillOnWin(state, player.id, "skill_117_55768", "百炼成神胜利");
      upsertBuff(player, {
        id: "instant_win:bailian",
        name: "百炼成神胜利",
        stacks: 1
      });
    }
  }

  const stoneDefenses = plan.actions.filter(
    (action) => action.type === "defense" && action.defense === "stone"
  ).length;
  const lavaSkillCount = getActiveSkillCount(player, "skill_21_36332");
  if (stoneDefenses > 0 && lavaSkillCount > 0) {
    addCountingMark(player, "stone_defense_count", "石头计数", stoneDefenses);
    const counter = player.buffs.find((buff) => buff.id === "stone_defense_count");
    if (counter && counter.stacks >= 3) {
      const gained = Math.floor(counter.stacks / 3);
      counter.stacks %= 3;
      addCappedMark(player, "lava_mark", "熔岩印记", gained * lavaSkillCount, 3);
    }
  }

  const youtiaoDefenses = plan.actions.filter(
    (action) => action.type === "defense" && action.defense === "youtiao"
  ).length;
  const winterSkillCount = getActiveSkillCount(player, "skill_22_54978");
  if (youtiaoDefenses > 0 && winterSkillCount > 0) {
    addCountingMark(player, "youtiao_defense_count", "油条计数", youtiaoDefenses);
    const counter = player.buffs.find((buff) => buff.id === "youtiao_defense_count");
    if (counter && counter.stacks >= 3) {
      const gained = Math.floor(counter.stacks / 3);
      counter.stacks %= 3;
      addCappedMark(player, "winter_mark", "凛冬印记", gained * winterSkillCount, 3);
    }
  }
}

function addCountingMark(
  player: { buffs: Array<{ id: string; name: string; stacks: number }> },
  id: string,
  name: string,
  amount: number
): void {
  const existing = player.buffs.find((buff) => buff.id === id);
  if (existing) {
    existing.stacks += amount;
    return;
  }

  player.buffs.push({
    id,
    name,
    stacks: amount
  });
}

function addCappedMark(
  player: { buffs: Array<{ id: string; name: string; stacks: number }> },
  id: string,
  name: string,
  amount: number,
  maxStacks: number
): void {
  const existing = player.buffs.find((buff) => buff.id === id);
  if (existing) {
    existing.stacks = Math.min(maxStacks, existing.stacks + amount);
    return;
  }

  player.buffs.push({
    id,
    name,
    stacks: Math.min(maxStacks, amount)
  });
}

function upsertBuff(
  player: { buffs: Array<{ id: string; name: string; stacks: number; expiresAtRound?: number; expiresAtTurn?: number; sourcePlayerId?: PlayerId }> },
  nextBuff: { id: string; name: string; stacks: number; expiresAtRound?: number; expiresAtTurn?: number; sourcePlayerId?: PlayerId }
): void {
  const existing = player.buffs.find(
    (buff) => buff.id === nextBuff.id && buff.sourcePlayerId === nextBuff.sourcePlayerId
  );
  if (existing) {
    existing.stacks = nextBuff.stacks;
    if (nextBuff.expiresAtRound !== undefined) {
      existing.expiresAtRound = nextBuff.expiresAtRound;
    }
    if (nextBuff.expiresAtTurn !== undefined) {
      existing.expiresAtTurn = nextBuff.expiresAtTurn;
    }
    return;
  }

  player.buffs.push(nextBuff);
}

function applySkillPreparationEffect(
  state: GameState,
  playerId: PlayerId,
  action: Extract<PlayerAction, { type: "skill" }>
): void {
  const player = findPlayer(state, playerId);
  const skill = getSkill(action.skillId);
  const play = skill?.play;
  if (!player || !skill || !play || play.kind !== "effect") {
    return;
  }

  if (skill.id === "skill_45_30424" || skill.id === "skill_91_89631") {
    queueAttackStatModifier(state, player, skill.id, skill.name, action);
    return;
  }

  if (skill.id === DOUBLE_EDGE_SWORD_SKILL_ID) {
    queueDoubleEdgeDefenseIgnore(state, player, skill.name, action);
    return;
  }

  if (skill.id === LIEGONG_SKILL_ID) {
    queueLiegongCross(state, player, skill.name, action);
    return;
  }

  if (skill.id === ABSOLUTE_GUARD_SKILL_ID) {
    queueAbsoluteGuard(state, player, skill.name, action);
    return;
  }

  if (skill.id === REVERSAL_SKILL_ID) {
    applyReversalPreparationEffect(state, player, skill.name);
    return;
  }

  if (skill.id === FLASH_DODGE_SKILL_ID) {
    upsertBuff(player, {
      id: FLASH_DODGE_BUFF_ID,
      name: skill.name,
      stacks: 1,
      expiresAtTurn: state.turnNumber,
      sourcePlayerId: skill.id
    });
    player.buffs.push({
      id: `${FLASH_DODGE_COOLDOWN_BUFF_ID}:${createId("cooldown")}`,
      name: "闪现冷却",
      stacks: 1,
      expiresAtRound: state.roundNumber + 3,
      sourcePlayerId: skill.id
    });
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 使用 ${skill.name}，本回合回避所有攻击`
    });
    return;
  }

  if (skill.id === "skill_18_34323") {
    upsertBuff(player, {
      id: FROST_BLADE_ATTACK_BUFF_ID,
      name: skill.name,
      stacks: 1,
      expiresAtTurn: state.turnNumber
    });
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 使用 ${skill.name}，本回合攻击变为冰系`
    });
    return;
  }

  if (play.effect === "lava_mark" || play.effect === "winter_mark") {
    const sourceBuffId = play.effect === "lava_mark" ? "lava_mark" : "winter_mark";
    const pendingBuffId =
      play.effect === "lava_mark" ? "pending_lava_mark" : "pending_winter_mark";
    const markName = play.effect === "lava_mark" ? "熔岩" : "凛冬";
    if (!consumePlayerBuff(player, sourceBuffId, action.stacks)) {
      return;
    }

    upsertBuff(player, {
      id: pendingBuffId,
      name: `${markName}强化`,
      stacks: action.stacks,
      expiresAtTurn: state.turnNumber
    });
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 消耗 ${action.stacks} 层${markName}印记，强化本回合攻击`
    });
  }

  const buff = createTemporaryProtectionBuff(play.effect, skill.id, skill.name, state.turnNumber);
  if (buff) {
    player.buffs.push(buff);
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 使用 ${skill.name}，本回合获得保护效果`
    });
  }

  const switchPlan = applyActionSwitch(state, playerId, action);
  if (switchPlan) {
    state.eventLog.push({
      ...createBaseEvent(state, "action_switched"),
      type: "action_switched",
      playerId,
      skillId: skill.id,
      skillName: skill.name,
      actionIndex: switchPlan.actionIndex,
      before: switchPlan.before,
      after: switchPlan.after,
      cost: switchPlan.cost
    });
    return;
  }

  if (skill.id === "skill_25_51277") {
    addDefenseValue(state, player.id, 8, skill.name);
  }

  if (skill.id === "skill_48_26455" || play.effect === "gain_defense_value") {
    addDefenseValue(state, player.id, 4, skill.name);
  }
}

function applyReversalPreparationEffect(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  skillName: string
): void {
  if (isReversalActive(state)) {
    return;
  }

  upsertBuff(player, {
    id: REVERSAL_TURN_BUFF_ID,
    name: skillName,
    stacks: 1,
    expiresAtTurn: state.turnNumber,
    sourcePlayerId: player.id
  });
  suppressReversedResourceActions(state);
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 使用 ${skillName}，逆转所有指向性出招并结束变招阶段`
  });
}

function suppressReversedResourceActions(state: GameState): void {
  for (const [playerId, plan] of Object.entries(state.pendingActions)) {
    const player = findPlayer(state, playerId);
    if (!player || !plan) {
      continue;
    }

    if (plan.actions.length === 1 && plan.actions[0]?.type === "gain_cake") {
      changeCakes(state, playerId, Math.max(0, player.cakes - 1), "逆转扣除出饼收益");
      continue;
    }

    if (isPlayerSkillDisabled(player)) {
      continue;
    }

    for (const action of plan.actions) {
      if (action.type !== "skill" || !SAINT_SKILL_IDS.has(action.skillId)) {
        continue;
      }

      const gain = (getSkillPlay(action.skillId)?.resourceGainPerStack ?? 0) * action.stacks;
      if (gain > 0) {
        const current = findPlayer(state, playerId);
        changeCakes(state, playerId, Math.max(0, (current?.cakes ?? 0) - gain), "逆转使圣不加饼");
      }
    }
  }
}

function queueAttackStatModifier(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  skillId: SkillId,
  skillName: string,
  action: Extract<PlayerAction, { type: "skill" }>
): void {
  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const modifier =
    skillId === "skill_91_89631"
      ? "swap_power_level"
      : action.attackStatModifier;
  if (!modifier) {
    return;
  }

  player.buffs.push({
    id: pendingAttackStatModifierBuffId(actionIndex, modifier),
    name: skillName,
    stacks: 1,
    expiresAtTurn: state.turnNumber
  });

  if (skillId === "skill_45_30424") {
    player.buffs.push({
      id: `${DESTROY_POWER_COOLDOWN_BUFF_ID}:${createId("cooldown")}`,
      name: "毁灭之力冷却",
      stacks: 1,
      expiresAtRound: state.roundNumber + 2
    });
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 使用 ${skillName}，将修改第 ${actionIndex + 1} 个攻击：${attackStatModifierLabel(modifier)}`
  });
}

function queueDoubleEdgeDefenseIgnore(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  skillName: string,
  action: Extract<PlayerAction, { type: "skill" }>
): void {
  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const pendingAction = state.pendingActions[player.id]?.actions[actionIndex];
  const targetId =
    action.targetId ??
    inferDoubleEdgeTargetId(state, player.id, actionIndex, pendingAction);
  if (!targetId) {
    return;
  }

  player.buffs.push({
    id: doubleEdgeIgnoreDefenseBuffId(actionIndex, targetId),
    name: skillName,
    stacks: 1,
    expiresAtTurn: state.turnNumber,
    sourcePlayerId: targetId
  });

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 使用 ${skillName}，将无视第 ${actionIndex + 1} 个攻击目标的防御出招`
  });
}

function queueLiegongCross(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  skillName: string,
  action: Extract<PlayerAction, { type: "skill" }>
): void {
  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const targetId = action.targetId;
  if (!targetId) {
    return;
  }

  const target = findPlayer(state, targetId);
  player.buffs.push({
    id: liegongCrossBuffId(actionIndex, targetId),
    name: skillName,
    stacks: 1,
    expiresAtTurn: state.turnNumber
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 使用 ${skillName}，本回合第 ${actionIndex + 1} 个攻击将和 ${target?.name ?? "目标"} 的相向攻击交错`
  });
}

function queueAbsoluteGuard(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  skillName: string,
  action: Extract<PlayerAction, { type: "skill" }>
): void {
  const candidate = getAbsoluteGuardCandidate(state, player.id, action);
  if (!candidate) {
    return;
  }

  const source = findPlayer(state, candidate.sourceId);
  if (!source) {
    return;
  }

  source.buffs.push({
    id: absoluteGuardBuffId(candidate.actionIndex, candidate.mode, player.id),
    name: skillName,
    stacks: 1,
    expiresAtTurn: state.turnNumber,
    sourcePlayerId: player.id
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message:
      candidate.mode === "area_to_self"
        ? `${player.name} 使用 ${skillName}，将 ${source.name} 的第 ${candidate.actionIndex + 1} 个群体攻击改为只攻击自己`
        : `${player.name} 使用 ${skillName}，将 ${source.name} 的第 ${candidate.actionIndex + 1} 个单体攻击改为群体攻击`
  });
}

function inferDoubleEdgeTargetId(
  state: GameState,
  playerId: PlayerId,
  actionIndex: number,
  pendingAction: PlayerAction | undefined
): PlayerId | undefined {
  if (!pendingAction) {
    return undefined;
  }

  const stats = getDoubleEdgeAttackStats(state, playerId, actionIndex, pendingAction);
  if (!stats) {
    return "targetId" in pendingAction ? pendingAction.targetId : undefined;
  }

  const targets = getDoubleEdgeAttackTargetIds(state, playerId, pendingAction, stats);
  const source = findPlayer(state, playerId);
  const defendedTarget = targets.find((targetId) => {
    if (source && hasQueuedDoubleEdgeTarget(source, actionIndex, targetId)) {
      return false;
    }

    const attack: AttackInstance = {
      key: `${playerId}:${targetId}:double_edge_probe`,
      sourceId: playerId,
      originalTargetId: targetId,
      targetId,
      actionIndex,
      stats,
      reflected: false
    };
    const targetAction = getDefensiveActionForAttack(
      state,
      attack,
      state.pendingActions[targetId]
    );
    return canActionDefend(targetAction, stats.defenseTag);
  });

  return defendedTarget ?? targets[0];
}

function hasQueuedDoubleEdgeTarget(
  player: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number,
  targetId: PlayerId
): boolean {
  const prefix = `${DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX}${actionIndex}:${targetId}:`;
  return player.buffs.some((buff) => buff.id.startsWith(prefix));
}

function getDoubleEdgeAttackStats(
  state: GameState,
  playerId: PlayerId,
  actionIndex: number,
  action: PlayerAction
): AttackStats | undefined {
  const isElectricShockAction =
    action.type === "skill" && action.skillId === ELECTRIC_SHOCK_SKILL_ID;
  const baseStats =
    action.type === "attack"
      ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks)
      : action.type === "skill"
        ? isElectricShockAction
          ? electricShockStats()
          : getSkillAttackStats(action.skillId, action.stacks)
        : undefined;
  if (!baseStats) {
    return undefined;
  }

  let stats = isElectricShockAction
    ? baseStats
    : applyAttackModifiers(cloneGameState(state), playerId, baseStats);
  if (!isElectricShockAction) {
    stats = applyPendingAttackStatModifiers(cloneGameState(state), playerId, actionIndex, stats);
  }
  return stats;
}

function getDoubleEdgeAttackTargetIds(
  state: GameState,
  sourceId: PlayerId,
  action: PlayerAction,
  stats: AttackStats
): PlayerId[] {
  const source = findPlayer(state, sourceId);
  const isElectricShockAction =
    action.type === "skill" && action.skillId === ELECTRIC_SHOCK_SKILL_ID;
  const forcedArea = Boolean(
    !isElectricShockAction &&
      (playerHasActiveSkill(source, LUANWU_SKILL_ID) ||
        playerHasActiveSkill(source, PUTIAN_TONGQING_SKILL_ID))
  );

  if (stats.isArea || forcedArea) {
    const areaTargetIds = filterPuppetAttackTargetIds(
      state,
      sourceId,
      alivePlayers(state)
        .filter((player) => player.id !== sourceId)
        .map((player) => player.id)
    );
    return filterPutianTongqingBlindSpotTargetIds(state, sourceId, areaTargetIds);
  }

  if (action.type === "skill" && MULTI_TARGET_ATTACK_SKILL_IDS.has(action.skillId)) {
    return filterPuppetAttackTargetIds(
      state,
      sourceId,
      Array.from(
        new Set([...(action.targetIds ?? []), action.targetId].filter(Boolean) as PlayerId[])
      )
    );
  }

  return filterPuppetAttackTargetIds(
    state,
    sourceId,
    "targetId" in action && action.targetId ? [action.targetId] : []
  );
}

function getAbsoluteGuardCandidate(
  state: GameState,
  guardPlayerId: PlayerId,
  action: Extract<PlayerAction, { type: "skill" }>
): {
  sourceId: PlayerId;
  actionIndex: number;
  mode: "area_to_self" | "single_to_area";
  cost: number;
} | undefined {
  const sourceId = action.targetId;
  if (!sourceId) {
    return undefined;
  }

  const source = findPlayer(state, sourceId);
  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const sourceAction = state.pendingActions[sourceId]?.actions[actionIndex];
  if (!source || !sourceAction || !isAttackLikeAction(sourceAction)) {
    return undefined;
  }

  const stats = getDoubleEdgeAttackStats(state, sourceId, actionIndex, sourceAction);
  if (!stats) {
    return undefined;
  }

  const forcedArea = isActionForcedArea(state, sourceId, sourceAction, stats);
  const targetIds = getDoubleEdgeAttackTargetIds(state, sourceId, sourceAction, stats);
  if (!targetIds.includes(guardPlayerId)) {
    return undefined;
  }

  const mode = stats.isArea || forcedArea ? "area_to_self" : "single_to_area";
  const rawCost =
    sourceAction.type === "attack"
      ? getEffectiveAttackActionCost(source, sourceAction)
      : getEffectiveSkillActionCost(source, sourceAction, state, sourceId);
  return {
    sourceId,
    actionIndex,
    mode,
    cost: Math.ceil(rawCost / 2)
  };
}

function isActionForcedArea(
  state: GameState,
  sourceId: PlayerId,
  action: PlayerAction,
  stats: AttackStats
): boolean {
  const source = findPlayer(state, sourceId);
  const isElectricShockAction =
    action.type === "skill" && action.skillId === ELECTRIC_SHOCK_SKILL_ID;
  return Boolean(
    !isElectricShockAction &&
      !stats.isArea &&
      (playerHasActiveSkill(source, LUANWU_SKILL_ID) ||
        playerHasActiveSkill(source, PUTIAN_TONGQING_SKILL_ID))
  );
}

function hasAbsoluteGuardQueued(
  source: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number
): boolean {
  const prefix = `${ABSOLUTE_GUARD_BUFF_PREFIX}${actionIndex}:`;
  return source.buffs.some((buff) => buff.id.startsWith(prefix));
}

function consumeAbsoluteGuardTargetOverride(
  state: GameState,
  source: NonNullable<ReturnType<typeof findPlayer>> | undefined,
  actionIndex: number
): { mode: "area_to_self" | "single_to_area"; guardPlayerId: PlayerId } | undefined {
  if (!source) {
    return undefined;
  }

  const prefix = `${ABSOLUTE_GUARD_BUFF_PREFIX}${actionIndex}:`;
  const buffIndex = source.buffs.findIndex((buff) => buff.id.startsWith(prefix) && buff.stacks > 0);
  if (buffIndex < 0) {
    return undefined;
  }

  const buff = source.buffs[buffIndex];
  const parsed = parseAbsoluteGuardBuff(buff?.id);
  if (!buff || !parsed) {
    return undefined;
  }

  buff.stacks -= 1;
  source.buffs = source.buffs.filter((item) => item.stacks > 0);
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message:
      parsed.mode === "area_to_self"
        ? `${source.name} 的攻击被绝对守护改为只攻击 ${getPlayerName(state, parsed.guardPlayerId)}`
        : `${source.name} 的攻击被绝对守护改为群体攻击`
  });
  return parsed;
}

function clearSkipUntilTurnActionBuffs(state: Pick<GameState, "players">): void {
  for (const player of state.players) {
    player.buffs = player.buffs.filter(
      (buff) => buff.id !== "skip_action_windows_until_turn_action"
    );
  }
}

function createTemporaryProtectionBuff(
  effect: string | undefined,
  skillId: SkillId,
  skillName: string,
  turnNumber: number
): { id: string; name: string; stacks: number; expiresAtTurn: number; sourcePlayerId?: PlayerId } | undefined {
  if (effect === "six_star") {
    return {
      id: SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID,
      name: skillName,
      stacks: 1,
      expiresAtTurn: turnNumber,
      sourcePlayerId: skillId
    };
  }

  if (effect === "invulnerable_turn") {
    return {
      id: "temp_invulnerable",
      name: skillName,
      stacks: 1,
      expiresAtTurn: turnNumber,
      sourcePlayerId: skillId
    };
  }

  if (effect === "shield_normal") {
    return {
      id: "temp_shield_normal",
      name: skillName,
      stacks: 1,
      expiresAtTurn: turnNumber,
      sourcePlayerId: skillId
    };
  }

  if (effect === "shield_skill") {
    return {
      id: "temp_shield_skill",
      name: skillName,
      stacks: 1,
      expiresAtTurn: turnNumber,
      sourcePlayerId: skillId
    };
  }

  return undefined;
}

function markSkillUse(player: { buffs: Array<{ id: string; name: string; stacks: number }> }, skillId: string): void {
  const id = `skill_used:${skillId}`;
  const existing = player.buffs.find((buff) => buff.id === id);
  if (existing) {
    existing.stacks += 1;
    return;
  }

  player.buffs.push({
    id,
    name: "技能使用次数",
    stacks: 1
  });
}

function getSkillUseCount(
  player: { buffs: Array<{ id: string; stacks: number }> },
  skillId: string
): number {
  return player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
}

function getEffectiveSkillActionCost(
  player: { buffs: Array<{ id: string; stacks: number }> },
  action: Extract<PlayerAction, { type: "skill" }>,
  state?: GameState,
  playerId?: PlayerId
): number {
  if (state && playerId && action.skillId === ABSOLUTE_GUARD_SKILL_ID) {
    const candidate = getAbsoluteGuardCandidate(state, playerId, action);
    if (candidate) {
      return candidate.cost;
    }
  }

  if (state && playerId) {
    const switchPlan = getActionSwitchPlan(state, playerId, action);
    if (switchPlan) {
      return switchPlan.cost;
    }
  }

  if (action.skillId === LIAN_BAO_SKILL_ID) {
    const freeStacks = getLianBaoFreeStacks(action);
    return getSkillActionCost(action.skillId, action.stacks - freeStacks);
  }

  return getSkillActionCost(action.skillId, action.stacks);
}

function getEffectiveAttackActionCost(
  player: { skills: string[]; buffs: Array<{ id: string }> },
  action: Extract<PlayerAction, { type: "attack" }>
): number {
  const stats = getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks);
  const reactorCount = getActiveSkillCount(player, "skill_80_20445");
  if (reactorCount > 0 && (action.attackId === "he_bao" || action.attackId === "chao_he_bao")) {
    return Math.max(0, stats.cost - 3 * reactorCount * action.stacks);
  }

  if (playerHasActiveSkill(player, PUTIAN_TONGQING_SKILL_ID) && action.attackId === "qin") {
    return stats.cost / 2;
  }

  return stats.cost;
}

function consumeFreeSkillBuffs(player: { buffs: Array<{ id: string; stacks: number }> }, plan: PlayerActionPlan): void {
  for (const action of plan.actions) {
    if (action.type !== "skill" || action.skillId !== LIAN_BAO_SKILL_ID) {
      continue;
    }

    const freeStacks = getLianBaoFreeStacks(action);
    if (freeStacks <= 0) {
      continue;
    }
    const buff = player.buffs.find((item) => item.id === "free_lian_bao" && item.stacks > 0);
    if (!buff) {
      continue;
    }

    buff.stacks -= freeStacks;
    if (buff.stacks <= 0) {
      player.buffs = player.buffs.filter((item) => item !== buff);
    }
  }
}

function getLianBaoFreeStacks(action: Extract<PlayerAction, { type: "skill" }>): number {
  if (action.skillId !== LIAN_BAO_SKILL_ID) {
    return 0;
  }

  const freeStacks = action.freeStacks ?? 0;
  if (!Number.isInteger(freeStacks) || freeStacks <= 0) {
    return 0;
  }

  return Math.min(action.stacks, freeStacks);
}

function consumeSkillResourceBuffs(
  player: { buffs: Array<{ id: string; stacks: number }> },
  plan: PlayerActionPlan
): void {
  for (const action of plan.actions) {
    if (action.type !== "skill") {
      continue;
    }

    if (action.skillId === "skill_37_68416") {
      consumePlayerBuff(player, "guidao_charge", action.stacks);
    }
  }
}

function consumePlayerBuff(
  player: { buffs: Array<{ id: string; stacks: number }> },
  buffId: string,
  amount: number
): boolean {
  const buff = player.buffs.find((item) => item.id === buffId && item.stacks > 0);
  if (!buff || buff.stacks < amount) {
    return false;
  }

  buff.stacks -= amount;
  player.buffs = player.buffs.filter((item) => item.stacks > 0);
  return true;
}

function createAttackInstances(
  state: GameState,
  plans: Record<PlayerId, PlayerActionPlan>
): AttackInstance[] {
  const attacks: AttackInstance[] = [];

  for (const [sourceId, plan] of Object.entries(plans)) {
    for (const [actionIndex, action] of plan.actions.entries()) {
      const source = findPlayer(state, sourceId);
      if (action.type === "skill" && (isPlayerSkillDisabled(source) || isPlayerInCollapse(source))) {
        continue;
      }

      const isElectricShockAction =
        action.type === "skill" && action.skillId === ELECTRIC_SHOCK_SKILL_ID;
      const baseStats =
        action.type === "attack"
          ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks)
          : action.type === "skill"
            ? isElectricShockAction
              ? electricShockStats()
              : getSkillAttackStats(action.skillId, action.stacks)
            : undefined;
      if (!baseStats) {
        continue;
      }
      let stats = isElectricShockAction
        ? baseStats
        : applyAttackModifiers(state, sourceId, baseStats);
      if (!isElectricShockAction) {
        stats = applyPendingAttackStatModifiers(state, sourceId, actionIndex, stats);
      }
      if (!isElectricShockAction && isFrostBladeAttackActive(source)) {
        stats = addAttackElement(
          {
            ...stats,
            traits: Array.from(new Set([...stats.traits, "frost_blade"]))
          },
          "ice"
        );
      }
      if (!isElectricShockAction && isDecayBlockingAttack(state, sourceId, stats)) {
        continue;
      }
      const forcedArea = Boolean(
        !isElectricShockAction &&
          (playerHasActiveSkill(source, LUANWU_SKILL_ID) ||
            playerHasActiveSkill(source, PUTIAN_TONGQING_SKILL_ID))
      );
      const absoluteGuardOverride = !isElectricShockAction
        ? consumeAbsoluteGuardTargetOverride(state, source, actionIndex)
        : undefined;
      if (absoluteGuardOverride?.mode === "area_to_self") {
        stats = {
          ...stats,
          isArea: false,
          traits: stats.traits.filter((trait) => trait !== "area")
        };
      } else if (absoluteGuardOverride?.mode === "single_to_area") {
        stats = {
          ...stats,
          isArea: true,
          traits: Array.from(new Set([...stats.traits, "area"]))
        };
      }
      const targets = absoluteGuardOverride?.mode === "area_to_self"
        ? [absoluteGuardOverride.guardPlayerId]
        : getAttackTargetIds(
            state,
            sourceId,
            action,
            stats,
            forcedArea || absoluteGuardOverride?.mode === "single_to_area"
          );

      for (const targetId of targets) {
        attacks.push({
          key: `${sourceId}:${targetId}:${attacks.length}`,
          sourceId,
          originalTargetId: targetId,
          targetId,
          actionIndex,
          stats,
          reflected: false
        });
      }
    }
  }

  return attacks;
}

function getAttackTargetIds(
  state: GameState,
  sourceId: PlayerId,
  action: PlayerAction,
  stats: AttackStats,
  forcedArea: boolean
): PlayerId[] {
  if (stats.isArea || forcedArea) {
    const targetIds = filterPuppetAttackTargetIds(
      state,
      sourceId,
      alivePlayers(state)
        .filter((player) => player.id !== sourceId)
        .map((player) => player.id)
    );
    return filterPutianTongqingBlindSpotTargetIds(state, sourceId, targetIds);
  }

  if (
    action.type === "skill" &&
    MULTI_TARGET_ATTACK_SKILL_IDS.has(action.skillId)
  ) {
    return filterPuppetAttackTargetIds(
      state,
      sourceId,
      Array.from(
        new Set([...(action.targetIds ?? []), action.targetId].filter(Boolean) as PlayerId[])
      )
    );
  }

  return filterPuppetAttackTargetIds(
    state,
    sourceId,
    "targetId" in action && action.targetId ? [action.targetId] : []
  );
}

function filterPuppetAttackTargetIds(
  state: GameState,
  sourceId: PlayerId,
  targetIds: PlayerId[]
): PlayerId[] {
  const source = findPlayer(state, sourceId);
  const masterId = getPuppetMasterId(source);
  return masterId ? targetIds.filter((targetId) => targetId !== masterId) : targetIds;
}

function filterPutianTongqingBlindSpotTargetIds(
  state: GameState,
  sourceId: PlayerId,
  targetIds: PlayerId[]
): PlayerId[] {
  const source = findPlayer(state, sourceId);
  if (!playerHasActiveSkill(source, PUTIAN_TONGQING_SKILL_ID)) {
    return targetIds;
  }

  const farthest = getFarthestAlivePlayerIds(state, sourceId);
  if (farthest.size === 0) {
    return targetIds;
  }

  return targetIds.filter((targetId) => !farthest.has(targetId));
}

function getFarthestAlivePlayerIds(state: GameState, sourceId: PlayerId): Set<PlayerId> {
  const alive = alivePlayers(state);
  const sourceIndex = alive.findIndex((player) => player.id === sourceId);
  if (sourceIndex < 0 || alive.length <= 3) {
    return new Set();
  }

  const maxDistance = Math.floor(alive.length / 2);
  return new Set(
    alive
      .filter((player, index) => {
        if (player.id === sourceId) {
          return false;
        }
        const distance = Math.abs(index - sourceIndex);
        return Math.min(distance, alive.length - distance) === maxDistance;
      })
      .map((player) => player.id)
  );
}

function isReversalActive(state: GameState): boolean {
  return state.players.some((player) =>
    player.buffs.some((buff) => buff.id === REVERSAL_TURN_BUFF_ID && buff.stacks > 0)
  );
}

function reverseAttackInstances(
  state: GameState,
  attacks: AttackInstance[]
): AttackInstance[] {
  if (attacks.length === 0) {
    return attacks;
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: "逆转生效：所有指向性出招的发出者和目标交换"
  });

  return attacks.map((attack, index) => ({
    ...attack,
    key: `${attack.key}:reversed:${index}`,
    sourceId: attack.targetId,
    originalTargetId: attack.sourceId,
    targetId: attack.sourceId,
    stats: makeSingleTargetReversedStats(attack.stats),
    reflected: false
  }));
}

function makeSingleTargetReversedStats(stats: AttackStats): AttackStats {
  if (!stats.isArea && !stats.traits.includes("area")) {
    return stats;
  }

  return {
    ...stats,
    isArea: false,
    traits: stats.traits.filter((trait) => trait !== "area")
  };
}

function createReversedResolutionActions(
  state: GameState,
  originalActions: Record<PlayerId, PlayerActionPlan>,
  reversedAttacks: AttackInstance[]
): Record<PlayerId, PlayerActionPlan> {
  const actions = Object.fromEntries(
    alivePlayers(state).map((player) => [player.id, { actions: [] as PlayerAction[] }])
  ) as Record<PlayerId, PlayerActionPlan>;

  for (const [playerId, plan] of Object.entries(originalActions)) {
    const targetPlan = actions[playerId];
    if (!targetPlan) {
      continue;
    }

    for (const action of plan.actions) {
      if (action.type === "gain_cake") {
        targetPlan.actions.push({ type: "gain_cake" });
      } else if (action.type === "defense" && action.defense !== "rebound") {
        targetPlan.actions.push({ type: "defense", defense: action.defense });
      }
    }
  }

  for (const [sourceId, plan] of Object.entries(originalActions)) {
    for (const action of plan.actions) {
      if (action.type !== "defense" || action.defense !== "rebound") {
        continue;
      }

      for (const rebounderId of getReversedRebounderIds(state, sourceId, action)) {
        actions[rebounderId]?.actions.push({
          type: "defense",
          defense: "rebound",
          targetId: sourceId
        });
      }
    }
  }

  for (const attack of reversedAttacks) {
    const action = attackInstanceToResolutionAction(attack);
    if (action) {
      actions[attack.sourceId]?.actions.push(action);
    }
  }

  return actions;
}

function getReversedRebounderIds(
  state: GameState,
  sourceId: PlayerId,
  action: Extract<PlayerAction, { type: "defense" }>
): PlayerId[] {
  const source = findPlayer(state, sourceId);
  if (!source) {
    return [];
  }

  if (playerHasActiveSkill(source, SCATTER_REBOUND_SKILL_ID)) {
    revealSkillOnUse(state, sourceId, SCATTER_REBOUND_SKILL_ID, "逆转散弹反弹");
    return alivePlayers(state)
      .filter((player) => player.id !== sourceId)
      .map((player) => player.id);
  }

  const target = action.targetId ? findPlayer(state, action.targetId) : undefined;
  return target?.status === "alive" ? [target.id] : [];
}

function attackInstanceToResolutionAction(attack: AttackInstance): PlayerAction | undefined {
  if (attack.stats.isSkill) {
    return {
      type: "skill",
      skillId: String(attack.stats.id),
      stacks: attack.stats.stacks,
      targetId: attack.targetId
    };
  }

  if (!Object.prototype.hasOwnProperty.call(BASE_ATTACKS, attack.stats.id)) {
    return undefined;
  }

  return {
    type: "attack",
    attackId: attack.stats.id as keyof typeof BASE_ATTACKS,
    stacks: attack.stats.stacks,
    targetId: attack.targetId
  };
}

function applyPendingAttackStatModifiers(
  state: GameState,
  ownerId: PlayerId,
  actionIndex: number,
  stats: AttackStats
): AttackStats {
  const owner = findPlayer(state, ownerId);
  if (!owner) {
    return stats;
  }

  let modified = stats;
  const consumed = new Set<string>();
  owner.buffs.forEach((buff, buffIndex) => {
    const parsed = parsePendingAttackStatModifierBuff(buff.id);
    if (!parsed || parsed.actionIndex !== actionIndex) {
      return;
    }

    modified = applyAttackStatModifierChoice(modified, parsed.modifier);
    consumed.add(`${buff.id}:${buffIndex}`);
  });

  if (consumed.size > 0) {
    let index = -1;
    owner.buffs = owner.buffs.filter((buff) => {
      index += 1;
      return !consumed.has(`${buff.id}:${index}`);
    });
  }

  return modified;
}

function applyAttackStatModifierChoice(
  attack: AttackStats,
  modifier: AttackStatModifierChoice
): AttackStats {
  const power = attack.power;
  const level = attack.level;
  switch (modifier) {
    case "swap_power_level":
      return {
        ...attack,
        power: level,
        level: power
      };
    case "power_plus_1_level_minus_1":
      return {
        ...attack,
        power: addFiniteStat(power, 1),
        level: Math.max(0, addFiniteStat(level, -1))
      };
    case "power_minus_1_level_plus_1":
      return {
        ...attack,
        power: Math.max(0, addFiniteStat(power, -1)),
        level: addFiniteStat(level, 1)
      };
    case "power_plus_2_level_minus_2":
      return {
        ...attack,
        power: addFiniteStat(power, 2),
        level: Math.max(0, addFiniteStat(level, -2))
      };
    case "power_minus_2_level_plus_2":
      return {
        ...attack,
        power: Math.max(0, addFiniteStat(power, -2)),
        level: addFiniteStat(level, 2)
      };
    case "power_times_3_level_to_zero":
      return {
        ...attack,
        power: multiplyFiniteStat(power, 3),
        level: 0
      };
    case "power_to_zero_level_times_4":
      return {
        ...attack,
        power: 0,
        level: multiplyFiniteStat(level, 4)
      };
    default:
      return attack;
  }
}

function addFiniteStat(value: number, delta: number): number {
  return value >= INFINITE_DAMAGE ? value : value + delta;
}

function multiplyFiniteStat(value: number, factor: number): number {
  return value >= INFINITE_DAMAGE ? value : value * factor;
}

function parsePendingAttackStatModifierBuff(
  id: string
): { actionIndex: number; modifier: AttackStatModifierChoice } | undefined {
  if (!id.startsWith(ATTACK_STAT_MODIFIER_BUFF_PREFIX)) {
    return undefined;
  }

  const [actionIndexText, modifier] = id
    .slice(ATTACK_STAT_MODIFIER_BUFF_PREFIX.length)
    .split(":");
  const actionIndex = Number(actionIndexText);
  if (!Number.isInteger(actionIndex) || !isAttackStatModifierChoice(modifier)) {
    return undefined;
  }

  return {
    actionIndex,
    modifier
  };
}

function pendingAttackStatModifierBuffId(
  actionIndex: number,
  modifier: AttackStatModifierChoice
): string {
  return `${ATTACK_STAT_MODIFIER_BUFF_PREFIX}${actionIndex}:${modifier}:${createId("attack_stat")}`;
}

function normalizeAttackStatActionIndex(value: number | undefined): number {
  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : 0;
}

function isAttackLikeAction(
  action: PlayerAction
): action is Extract<PlayerAction, { type: "attack" }> | Extract<PlayerAction, { type: "skill" }> {
  return (
    action.type === "attack" ||
    (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack")
  );
}

function isAttackStatModifierChoice(
  value: string | undefined
): value is AttackStatModifierChoice {
  return (
    value === "swap_power_level" ||
    value === "power_plus_1_level_minus_1" ||
    value === "power_minus_1_level_plus_1" ||
    value === "power_plus_2_level_minus_2" ||
    value === "power_minus_2_level_plus_2" ||
    value === "power_times_3_level_to_zero" ||
    value === "power_to_zero_level_times_4"
  );
}

function attackStatModifierLabel(modifier: AttackStatModifierChoice): string {
  switch (modifier) {
    case "swap_power_level":
      return "攻击与等级交换";
    case "power_plus_1_level_minus_1":
      return "攻击+1，等级-1";
    case "power_minus_1_level_plus_1":
      return "攻击-1，等级+1";
    case "power_plus_2_level_minus_2":
      return "攻击+2，等级-2";
    case "power_minus_2_level_plus_2":
      return "攻击-2，等级+2";
    case "power_times_3_level_to_zero":
      return "攻击×3，等级变为0";
    case "power_to_zero_level_times_4":
      return "攻击变为0，等级×4";
    default:
      return "攻击属性变化";
  }
}

function isDecayBlockingAttack(
  state: GameState,
  sourceId: PlayerId,
  stats: AttackStats
): boolean {
  const globalBlocks = [
    {
      skillId: "skill_11_89360",
      name: "衰竭",
      active: stats.level === 0 || stats.power === 0 || stats.power >= INFINITE_DAMAGE
    },
    {
      skillId: "skill_42_94266",
      name: "破地之力",
      active: stats.power > 2 && stats.power < 6
    },
    {
      skillId: "skill_43_74082",
      name: "阳光普照",
      active: stats.power > 4
    },
    {
      skillId: "skill_44_20092",
      name: "永远之夜",
      active: stats.power < 4
    }
  ];

  const blocker = globalBlocks.find(
    (item) => item.active && isGlobalSkillActive(state, item.skillId)
  );
  if (!blocker) {
    return false;
  }

  for (const owner of activePlayersWithSkill(state, blocker.skillId)) {
    revealSkillOnTrigger(state, owner.id, blocker.skillId, `触发${blocker.name}`);
  }
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${getPlayerName(state, sourceId)} 的 ${stats.name} 被${blocker.name}抹除`
  });
  return true;
}

function applyRebounds(
  state: GameState,
  attacks: AttackInstance[],
  actions: Record<PlayerId, PlayerActionPlan>
): AttackInstance[] {
  const resolved: AttackInstance[] = [];

  for (const attack of attacks) {
    const scatter = tryScatterRebound(state, attack, actions);
    if (scatter) {
      resolved.push(...scatter);
      continue;
    }

    const finalAttack = resolveReboundChain(state, attack, actions);
    if (finalAttack) {
      resolved.push(finalAttack);
    }
  }

  return resolved;
}

function tryScatterRebound(
  state: GameState,
  attack: AttackInstance,
  actions: Record<PlayerId, PlayerActionPlan>
): AttackInstance[] | undefined {
  const targetAction = getReboundAction(actions[attack.targetId]);
  const reflector = findPlayer(state, attack.targetId);
  if (
    targetAction?.defense !== "rebound" ||
    !reflector ||
    !playerHasActiveSkill(reflector, SCATTER_REBOUND_SKILL_ID)
  ) {
    return undefined;
  }

  const absoluteRebound =
    playerHasActiveSkill(reflector, "skill_57_59843") &&
    (attack.stats.isSkill ||
      attack.stats.id === "he_bao" ||
      attack.stats.id === "chao_he_bao");

  if (attack.stats.traits.includes("pierce_rebound") && !absoluteRebound) {
    state.eventLog.push({
      ...createBaseEvent(state, "rebound_broken"),
      type: "rebound_broken",
      sourceId: attack.sourceId,
      targetId: attack.targetId,
      attackName: attack.stats.name
    });
    return [attack];
  }

  if (attack.stats.isSkill && !absoluteRebound) {
    state.eventLog.push({
      ...createBaseEvent(state, "attack_blocked"),
      type: "attack_blocked",
      sourceId: attack.sourceId,
      targetId: attack.targetId,
      attackName: attack.stats.name,
      defense: "rebound"
    });
    return [];
  }

  const targets = alivePlayers(state).filter((player) => player.id !== attack.targetId);
  revealSkillOnUse(state, reflector.id, SCATTER_REBOUND_SKILL_ID, "散弹触发");
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${reflector.name} 的散弹反弹将 ${attack.stats.name} 扩散给除自己外所有人`
  });

  return targets.map((target, index) => {
    state.eventLog.push({
      ...createBaseEvent(state, "attack_reflected"),
      type: "attack_reflected",
      sourceId: attack.sourceId,
      originalTargetId: attack.targetId,
      reflectedTargetId: target.id,
      attackName: attack.stats.name
    });
    return {
      ...attack,
      key: `${attack.key}:scatter:${target.id}:${index}`,
      targetId: target.id,
      reflected: true
    };
  });
}

function resolveReboundChain(
  state: GameState,
  attack: AttackInstance,
  actions: Record<PlayerId, PlayerActionPlan>
): AttackInstance | undefined {
  let current = attack;
  const visitedReflectors = new Set<PlayerId>();
  const path: PlayerId[] = [];

  while (true) {
    const targetAction = getReboundAction(actions[current.targetId]);
    if (targetAction?.defense !== "rebound") {
      return current;
    }

    if (visitedReflectors.has(current.targetId)) {
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `反弹形成环：${[...path, current.targetId]
          .map((playerId) => getPlayerName(state, playerId))
          .join(" → ")}，环上无人受伤`
      });
      return undefined;
    }

    const reflector = findPlayer(state, current.targetId);
    const absoluteRebound =
      playerHasActiveSkill(reflector, "skill_57_59843") &&
      (current.stats.isSkill ||
        current.stats.id === "he_bao" ||
        current.stats.id === "chao_he_bao");

    if (current.stats.traits.includes("pierce_rebound") && !absoluteRebound) {
      state.eventLog.push({
        ...createBaseEvent(state, "rebound_broken"),
        type: "rebound_broken",
        sourceId: current.sourceId,
        targetId: current.targetId,
        attackName: current.stats.name
      });
      return current;
    }

    if (current.stats.isSkill && !absoluteRebound) {
      state.eventLog.push({
        ...createBaseEvent(state, "attack_blocked"),
        type: "attack_blocked",
        sourceId: current.sourceId,
        targetId: current.targetId,
        attackName: current.stats.name,
        defense: "rebound"
      });
      return undefined;
    }

    if (!targetAction.targetId) {
      return current;
    }

    visitedReflectors.add(current.targetId);
    path.push(current.targetId);
    state.eventLog.push({
      ...createBaseEvent(state, "attack_reflected"),
      type: "attack_reflected",
      sourceId: current.sourceId,
      originalTargetId: current.targetId,
      reflectedTargetId: targetAction.targetId,
      attackName: current.stats.name
    });

    current = {
      ...current,
      key: `${current.key}:reflected:${targetAction.targetId}`,
      targetId: targetAction.targetId,
      reflected: true
    };
  }
}

function resolveClashes(
  state: GameState,
  attacks: AttackInstance[],
  handledAttackKeys: Set<string>,
  healthDeltas: Map<PlayerId, HealthDelta>,
  actions: Record<PlayerId, PlayerActionPlan>
): void {
  for (const attack of attacks) {
    if (handledAttackKeys.has(attack.key) || attack.reflected || attack.skipClash) {
      continue;
    }

    const counter = attacks.find(
      (candidate) =>
        !candidate.reflected &&
        !candidate.skipClash &&
        candidate.key !== attack.key &&
        !handledAttackKeys.has(candidate.key) &&
        candidate.sourceId === attack.targetId &&
        candidate.targetId === attack.sourceId
    );

    if (!counter) {
      continue;
    }

    if (applyLiegongCross(state, attack, counter)) {
      continue;
    }

    handledAttackKeys.add(attack.key);
    handledAttackKeys.add(counter.key);
    resolveSingleClash(state, attack, counter, healthDeltas, actions);
  }
}

function resolveReversedAttacks(
  state: GameState,
  attacks: AttackInstance[],
  actions: Record<PlayerId, PlayerActionPlan>,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  const handledAttackKeys = new Set<string>();
  const intents: ReversedDamageIntent[] = [];

  resolveReversedClashes(state, attacks, handledAttackKeys, intents, healthDeltas);
  collectReversedUnopposedAttackIntents(
    state,
    attacks,
    handledAttackKeys,
    actions,
    intents,
    healthDeltas
  );
  resolveReversedDamageIntents(state, actions, intents, healthDeltas);
}

function resolveReversedClashes(
  state: GameState,
  attacks: AttackInstance[],
  handledAttackKeys: Set<string>,
  intents: ReversedDamageIntent[],
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  for (const attack of attacks) {
    if (handledAttackKeys.has(attack.key) || attack.reflected || attack.skipClash) {
      continue;
    }

    const counter = attacks.find(
      (candidate) =>
        !candidate.reflected &&
        !candidate.skipClash &&
        candidate.key !== attack.key &&
        !handledAttackKeys.has(candidate.key) &&
        candidate.sourceId === attack.targetId &&
        candidate.targetId === attack.sourceId
    );

    if (!counter) {
      continue;
    }

    if (applyLiegongCross(state, attack, counter)) {
      continue;
    }

    handledAttackKeys.add(attack.key);
    handledAttackKeys.add(counter.key);
    resolveSingleReversedClash(state, attack, counter, intents, healthDeltas);
  }
}

function resolveSingleReversedClash(
  state: GameState,
  a: AttackInstance,
  b: AttackInstance,
  intents: ReversedDamageIntent[],
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  const special = resolveSpecialReversedClash(state, a, b, intents, healthDeltas);
  if (special) {
    return;
  }

  if (a.stats.level === b.stats.level) {
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: `${a.stats.name} 与 ${b.stats.name} 等级相同，互相抵消`
    });
    return;
  }

  const high = a.stats.level > b.stats.level ? a : b;
  const low = high === a ? b : a;
  const damage = calculateClashDamage(high.stats, low.stats);
  intents.push({
    sourceId: high.sourceId,
    targetId: low.sourceId,
    amount: damage,
    attackName: high.stats.name,
    stats: high.stats,
    attack: high
  });
  state.eventLog.push({
    ...createBaseEvent(state, "clash"),
    type: "clash",
    attackerAId: a.sourceId,
    attackerBId: b.sourceId,
    result: `${high.stats.name} 等级更高，对 ${getPlayerName(state, low.sourceId)} 造成 ${formatDamage(damage)} 点伤害`
  });
}

function resolveSpecialReversedClash(
  state: GameState,
  a: AttackInstance,
  b: AttackInstance,
  intents: ReversedDamageIntent[],
  healthDeltas: Map<PlayerId, HealthDelta>
): boolean {
  if (resolveDingSpecialClash(state, a, b, healthDeltas)) {
    return true;
  }

  const isShaVsQin =
    (a.stats.id === "sha" && b.stats.id === "qin") ||
    (a.stats.id === "qin" && b.stats.id === "sha");

  if (isShaVsQin) {
    const sha = a.stats.id === "sha" ? a : b;
    const qin = sha === a ? b : a;
    if (qin.stats.level >= sha.stats.level) {
      return false;
    }

    const damage = calculateClashDamage(sha.stats, qin.stats);
    intents.push({
      sourceId: sha.sourceId,
      targetId: qin.sourceId,
      amount: damage,
      attackName: sha.stats.name,
      stats: sha.stats,
      attack: sha
    });
    addHeal(state, healthDeltas, sha.sourceId, qin.stats.stacks, sha.sourceId, "杀擒对撞回血");
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: `杀 vs 擒：${getPlayerName(state, sha.sourceId)} 等级更高，按对撞造成 ${formatDamage(damage)} 点伤害并额外回复 ${qin.stats.stacks} 血`
    });
    return true;
  }

  const isShaVsNanMan =
    (a.stats.id === "sha" && b.stats.id === "nan_man") ||
    (a.stats.id === "nan_man" && b.stats.id === "sha");

  if (isShaVsNanMan) {
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: "杀 vs 南蛮入侵：相互抵消"
    });
    return true;
  }

  return false;
}

function resolveDingSpecialClash(
  state: GameState,
  a: AttackInstance,
  b: AttackInstance,
  healthDeltas: Map<PlayerId, HealthDelta>
): boolean {
  const ding =
    a.stats.id === DING_ATTACK_SKILL_ID
      ? a
      : b.stats.id === DING_ATTACK_SKILL_ID
        ? b
        : undefined;
  if (!ding) {
    return false;
  }

  const other = ding === a ? b : a;
  if (other.stats.id === JUANZI_SKILL_ID) {
    return false;
  }

  if (other.stats.id === KOU_ATTACK_SKILL_ID) {
    addDefeatEffect(
      state,
      healthDeltas,
      ding.sourceId,
      2,
      other.sourceId,
      "丁与抠特殊对撞",
      other.stats
    );
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: `丁与抠对撞：${getPlayerName(state, ding.sourceId)} 被退游`
    });
    return true;
  }

  state.eventLog.push({
    ...createBaseEvent(state, "clash"),
    type: "clash",
    attackerAId: a.sourceId,
    attackerBId: b.sourceId,
    result: `丁与 ${other.stats.name} 对撞：双方固定抵消`
  });
  return true;
}

function collectReversedUnopposedAttackIntents(
  state: GameState,
  attacks: AttackInstance[],
  handledAttackKeys: Set<string>,
  actions: Record<PlayerId, PlayerActionPlan>,
  intents: ReversedDamageIntent[],
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  for (const attack of attacks) {
    if (handledAttackKeys.has(attack.key)) {
      continue;
    }

    const target = findPlayer(state, attack.targetId);
    if (!target || target.status !== "alive") {
      continue;
    }

    const hasRebound = getReboundActions(actions[attack.targetId]).length > 0;
    if (!hasRebound) {
      const targetAction = getDefensiveActionForAttack(state, attack, actions[attack.targetId]);
      const defendedByAction = canActionDefend(targetAction, attack.stats.defenseTag);
      if (
        (defendedByAction && !consumeDoubleEdgeDefenseIgnore(state, attack, targetAction)) ||
        canShaParryNanMan(attack, actions[attack.targetId])
      ) {
        const event: AttackBlockedEvent = {
          ...createBaseEvent(state, "attack_blocked"),
          type: "attack_blocked",
          sourceId: attack.sourceId,
          targetId: attack.targetId,
          attackName: attack.stats.name,
          blockKind: "block"
        };
        const defense = getDefenseForEvent(targetAction);
        if (defense) {
          event.defense = defense;
        }
        state.eventLog.push(event);
        awardGuidaoCharge(state, attack, targetAction);
        applyBlockedAttackEffects(state, attack, healthDeltas);
        continue;
      }

      if (
        absorbWithGhostSkillShieldV2(
          state,
          attack.targetId,
          attack.sourceId,
          attack.stats.name,
          attack.stats
        )
      ) {
        continue;
      }
    }

    const isLastHit = isLastHitAttack(attack, attacks);
    if (attack.stats.id === "skill_96_33279") {
      intents.push(createReversedDamageIntent(attack, isLastHit));
      intents.push(createReversedDamageIntent(attack, isLastHit));
    } else {
      intents.push(createReversedDamageIntent(attack, isLastHit));
    }
  }
}

function createReversedDamageIntent(
  attack: AttackInstance,
  isLastHit: boolean
): ReversedDamageIntent {
  return {
    sourceId: attack.sourceId,
    targetId: attack.targetId,
    amount: attack.stats.power,
    attackName: attack.stats.name,
    stats: attack.stats,
    attack,
    isLastHit
  };
}

function resolveReversedDamageIntents(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>,
  intents: ReversedDamageIntent[],
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  const reboundGroups = new Map<PlayerId, ReversedDamageIntent[]>();
  for (const intent of intents) {
    if (collectReboundableIntent(state, actions, intent, healthDeltas, reboundGroups)) {
      continue;
    }
    applyReversedIntentWithoutRebound(state, actions, intent, healthDeltas);
  }

  const queue: ReboundDamagePacket[] = [];
  for (const [rebounderId, items] of reboundGroups.entries()) {
    enqueueReboundPackets(state, actions, queue, rebounderId, items, [rebounderId]);
  }

  let guard = 0;
  while (queue.length > 0 && guard < 64) {
    guard += 1;
    const packet = queue.shift()!;
    if (collectReboundPacket(state, actions, packet, healthDeltas, queue)) {
      continue;
    }
    applyReversedIntentWithoutRebound(state, actions, packet, healthDeltas);
  }
}

function collectReboundableIntent(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>,
  intent: ReversedDamageIntent,
  healthDeltas: Map<PlayerId, HealthDelta>,
  reboundGroups: Map<PlayerId, ReversedDamageIntent[]>
): boolean {
  const reboundActions = getReboundActions(actions[intent.targetId]);
  if (reboundActions.length === 0 || !intent.stats) {
    return false;
  }

  const target = findPlayer(state, intent.targetId);
  const absoluteRebound =
    playerHasActiveSkill(target, "skill_57_59843") &&
    (intent.stats.isSkill ||
      intent.stats.id === "he_bao" ||
      intent.stats.id === "chao_he_bao");

  if (intent.stats.traits.includes("pierce_rebound") && !absoluteRebound) {
    state.eventLog.push({
      ...createBaseEvent(state, "rebound_broken"),
      type: "rebound_broken",
      sourceId: intent.sourceId ?? intent.targetId,
      targetId: intent.targetId,
      attackName: intent.attackName ?? intent.stats.name
    });
    return false;
  }

  if (intent.stats.isSkill && !absoluteRebound) {
    state.eventLog.push({
      ...createBaseEvent(state, "attack_blocked"),
      type: "attack_blocked",
      sourceId: intent.sourceId ?? intent.targetId,
      targetId: intent.targetId,
      attackName: intent.attackName ?? intent.stats.name,
      defense: "rebound",
      blockKind: "block"
    });
    return true;
  }

  const items = reboundGroups.get(intent.targetId) ?? [];
  items.push(intent);
  reboundGroups.set(intent.targetId, items);
  return true;
}

function collectReboundPacket(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>,
  packet: ReboundDamagePacket,
  healthDeltas: Map<PlayerId, HealthDelta>,
  queue: ReboundDamagePacket[]
): boolean {
  const reboundActions = getReboundActions(actions[packet.targetId]);
  if (reboundActions.length === 0) {
    return false;
  }

  if (packet.visitedRebounderIds.includes(packet.targetId)) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `反弹形成环：${[...packet.visitedRebounderIds, packet.targetId]
        .map((playerId) => getPlayerName(state, playerId))
        .join(" → ")}，环上无人受伤`
    });
    return true;
  }

  enqueueReboundPackets(
    state,
    actions,
    queue,
    packet.targetId,
    [packet],
    [...packet.visitedRebounderIds, packet.targetId]
  );
  return true;
}

function enqueueReboundPackets(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>,
  queue: ReboundDamagePacket[],
  rebounderId: PlayerId,
  items: ReversedDamageIntent[],
  visitedRebounderIds: PlayerId[]
): void {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) {
    return;
  }

  const rebounder = findPlayer(state, rebounderId);
  const stats = items[0]?.stats;
  const attackName = items.length === 1 ? items[0]?.attackName : "反弹";
  for (const reboundAction of getReboundActions(actions[rebounderId])) {
    if (!reboundAction.targetId) {
      continue;
    }

    state.eventLog.push({
      ...createBaseEvent(state, "attack_reflected"),
      type: "attack_reflected",
      sourceId: rebounderId,
      originalTargetId: rebounderId,
      reflectedTargetId: reboundAction.targetId,
      attackName: attackName ?? "反弹"
    });
    const packet: ReboundDamagePacket = {
      sourceId: rebounderId,
      targetId: reboundAction.targetId,
      amount: total,
      attackName: attackName ?? `${rebounder?.name ?? "玩家"}的反弹`,
      visitedRebounderIds
    };
    if (stats) {
      packet.stats = stats;
    }
    queue.push(packet);
  }
}

function applyReversedIntentWithoutRebound(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>,
  intent: ReversedDamageIntent,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  const target = findPlayer(state, intent.targetId);
  if (!target || target.status !== "alive" || intent.amount <= 0) {
    return;
  }

  const targetAction = intent.attack
    ? getDefensiveActionForAttack(state, intent.attack, actions[intent.targetId])
    : getDefensiveActionWithIndex(actions[intent.targetId])?.action;
  if (canActionDefend(targetAction, intent.stats?.defenseTag ?? "unblockable")) {
    const event: AttackBlockedEvent = {
      ...createBaseEvent(state, "attack_blocked"),
      type: "attack_blocked",
      sourceId: intent.sourceId ?? intent.targetId,
      targetId: intent.targetId,
      attackName: intent.attackName ?? intent.stats?.name ?? "攻击",
      blockKind: "block"
    };
    const defense = getDefenseForEvent(targetAction);
    if (defense) {
      event.defense = defense;
    }
    state.eventLog.push(event);
    if (intent.attack) {
      awardGuidaoCharge(state, intent.attack, targetAction);
      applyBlockedAttackEffects(state, intent.attack, healthDeltas);
    }
    return;
  }

  const context: DamageContext = { fromAttack: true };
  if (intent.isLastHit !== undefined) {
    context.isLastHit = intent.isLastHit;
  }

  const eventStart = state.eventLog.length;
  addDamage(
    state,
    healthDeltas,
    intent.targetId,
    intent.amount,
    intent.sourceId,
    intent.attackName,
    intent.stats,
    context
  );
  if (intent.attack) {
    applySkillHitEffectsIfAttackHit(
      state,
      eventStart,
      intent.attack,
      actions,
      healthDeltas
    );
  }
}

function applyLiegongCross(
  state: GameState,
  a: AttackInstance,
  b: AttackInstance
): boolean {
  const usedByA = consumeLiegongCrossBuff(state, a);
  const usedByB = consumeLiegongCrossBuff(state, b);
  if (!usedByA && !usedByB) {
    return false;
  }

  a.skipClash = true;
  b.skipClash = true;
  a.notLastHit = true;
  b.notLastHit = true;
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${getPlayerName(state, a.sourceId)} 的 ${a.stats.name} 与 ${getPlayerName(state, b.sourceId)} 的 ${b.stats.name} 交错而过，不视为对撞或补刀`
  });
  return true;
}

function consumeLiegongCrossBuff(state: GameState, attack: AttackInstance): boolean {
  const source = findPlayer(state, attack.sourceId);
  if (!source) {
    return false;
  }

  const prefix = `${LIEGONG_CROSS_BUFF_PREFIX}${attack.actionIndex}:${attack.targetId}:`;
  const buffIndex = source.buffs.findIndex((buff) => buff.id.startsWith(prefix) && buff.stacks > 0);
  if (buffIndex < 0) {
    return false;
  }

  const buff = source.buffs[buffIndex];
  if (!buff) {
    return false;
  }
  buff.stacks -= 1;
  source.buffs = source.buffs.filter((item) => item.stacks > 0);
  return true;
}

function resolveSingleClash(
  state: GameState,
  a: AttackInstance,
  b: AttackInstance,
  healthDeltas: Map<PlayerId, HealthDelta>,
  actions: Record<PlayerId, PlayerActionPlan>
): void {
  const special = resolveSpecialClash(state, a, b, healthDeltas, actions);
  if (special) {
    return;
  }

  if (a.stats.level === b.stats.level) {
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: `${a.stats.name} 与 ${b.stats.name} 等级相同，互相抵消`
    });
    return;
  }

  const high = a.stats.level > b.stats.level ? a : b;
  const low = high === a ? b : a;
  const damage = calculateClashDamage(high.stats, low.stats);
  if (
    absorbWithGhostSkillShieldV2(
      state,
      low.sourceId,
      high.sourceId,
      high.stats.name,
      high.stats
    )
  ) {
    return;
  }
  const eventStart = state.eventLog.length;
  addDamage(
    state,
    healthDeltas,
    low.sourceId,
    damage,
    high.sourceId,
    high.stats.name,
    high.stats,
    { fromAttack: true }
  );
  applySkillHitEffectsIfAttackHit(
    state,
    eventStart,
    high,
    actions,
    healthDeltas
  );

  state.eventLog.push({
    ...createBaseEvent(state, "clash"),
    type: "clash",
    attackerAId: a.sourceId,
    attackerBId: b.sourceId,
    result: `${high.stats.name} 等级更高，对 ${getPlayerName(state, low.sourceId)} 造成 ${formatDamage(damage)} 点伤害`
  });
}

function resolveSpecialClash(
  state: GameState,
  a: AttackInstance,
  b: AttackInstance,
  healthDeltas: Map<PlayerId, HealthDelta>,
  actions: Record<PlayerId, PlayerActionPlan>
): boolean {
  if (resolveDingSpecialClash(state, a, b, healthDeltas)) {
    return true;
  }

  const isShaVsQin =
    (a.stats.id === "sha" && b.stats.id === "qin") ||
    (a.stats.id === "qin" && b.stats.id === "sha");

  if (isShaVsQin) {
    const sha = a.stats.id === "sha" ? a : b;
    const qin = sha === a ? b : a;
    if (qin.stats.level >= sha.stats.level) {
      return false;
    }

    const damage = calculateClashDamage(sha.stats, qin.stats);
    const eventStart = state.eventLog.length;
    addDamage(
      state,
      healthDeltas,
      qin.sourceId,
      damage,
      sha.sourceId,
      sha.stats.name,
      sha.stats,
      { fromAttack: true }
    );
    applySkillHitEffectsIfAttackHit(
      state,
      eventStart,
      sha,
      actions,
      healthDeltas
    );
    addHeal(state, healthDeltas, sha.sourceId, qin.stats.stacks, sha.sourceId, "杀擒对撞回血");
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: `杀 vs 擒：${getPlayerName(state, sha.sourceId)} 等级更高，按对撞造成 ${formatDamage(damage)} 点伤害并额外回复 ${qin.stats.stacks} 血`
    });
    return true;
  }

  const isShaVsNanMan =
    (a.stats.id === "sha" && b.stats.id === "nan_man") ||
    (a.stats.id === "nan_man" && b.stats.id === "sha");

  if (isShaVsNanMan) {
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: "杀 vs 南蛮入侵：相互抵消"
    });
    return true;
  }

  return false;
}

function resolveUnopposedAttacks(
  state: GameState,
  attacks: AttackInstance[],
  handledAttackKeys: Set<string>,
  healthDeltas: Map<PlayerId, HealthDelta>,
  actions: Record<PlayerId, PlayerActionPlan>
): void {
  for (const attack of attacks) {
    if (handledAttackKeys.has(attack.key)) {
      continue;
    }

    const target = findPlayer(state, attack.targetId);
    if (!target || target.status !== "alive") {
      continue;
    }

    const targetAction = getDefensiveActionForAttack(state, attack, actions[attack.targetId]);
    const defendedByAction = canActionDefend(targetAction, attack.stats.defenseTag);
    if (
      (defendedByAction && !consumeDoubleEdgeDefenseIgnore(state, attack, targetAction)) ||
      canShaParryNanMan(attack, actions[attack.targetId])
    ) {
      const event: AttackBlockedEvent = {
        ...createBaseEvent(state, "attack_blocked"),
        type: "attack_blocked",
        sourceId: attack.sourceId,
        targetId: attack.targetId,
        attackName: attack.stats.name,
        blockKind: "block"
      };
      const defense = getDefenseForEvent(targetAction);
      if (defense) {
        event.defense = defense;
      }
      state.eventLog.push(event);
      awardGuidaoCharge(state, attack, targetAction);
      applyBlockedAttackEffects(state, attack, healthDeltas);
      continue;
    }

    const isLastHit = isLastHitAttack(attack, attacks);
    if (
      absorbWithGhostSkillShieldV2(
        state,
        attack.targetId,
        attack.sourceId,
        attack.stats.name,
        attack.stats
      )
    ) {
      continue;
    }
    const eventStart = state.eventLog.length;
    if (attack.stats.id === "skill_96_33279") {
      addDamage(
        state,
        healthDeltas,
        attack.targetId,
        attack.stats.power,
        attack.sourceId,
        attack.stats.name,
        attack.stats,
        { fromAttack: true }
      );
      addDamage(
        state,
        healthDeltas,
        attack.targetId,
        attack.stats.power,
        attack.sourceId,
        attack.stats.name,
        attack.stats,
        { fromAttack: true, isLastHit }
      );
    } else {
      addDamage(
        state,
        healthDeltas,
        attack.targetId,
        attack.stats.power,
        attack.sourceId,
        attack.stats.name,
        attack.stats,
        { fromAttack: true, isLastHit }
      );
    }
    applySkillHitEffectsIfAttackHit(
      state,
      eventStart,
      attack,
      actions,
      healthDeltas
    );
  }
}

function canShaParryNanMan(
  attack: AttackInstance,
  plan: PlayerActionPlan | undefined
): boolean {
  return (
    attack.stats.id === "nan_man" &&
    Boolean(plan?.actions.some((action) => action.type === "attack" && action.attackId === "sha"))
  );
}

function consumeDoubleEdgeDefenseIgnore(
  state: GameState,
  attack: AttackInstance,
  targetAction: PlayerAction | undefined
): boolean {
  if (
    !targetAction ||
    targetAction.type === "attack" ||
    targetAction.type === "skill" ||
    (targetAction.type === "defense" && targetAction.defense === "rebound")
  ) {
    return false;
  }

  const source = findPlayer(state, attack.sourceId);
  if (!source) {
    return false;
  }

  const buffIndex = source.buffs.findIndex((buff) => {
    const parsed = parseDoubleEdgeIgnoreDefenseBuff(buff.id);
    return (
      parsed?.actionIndex === attack.actionIndex &&
      parsed.targetId === attack.targetId
    );
  });
  if (buffIndex < 0) {
    return false;
  }

  const buff = source.buffs[buffIndex];
  if (!buff || buff.stacks <= 0) {
    return false;
  }

  buff.stacks -= 1;
  source.buffs = source.buffs.filter((item) => item.stacks > 0);
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 的双刃剑无视了 ${getPlayerName(state, attack.targetId)} 的 ${getActionLabel(targetAction)}`
  });
  return true;
}

function doubleEdgeIgnoreDefenseBuffId(actionIndex: number, targetId: PlayerId): string {
  return `${DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX}${actionIndex}:${targetId}:${createId("double_edge")}`;
}

function liegongCrossBuffId(actionIndex: number, targetId: PlayerId): string {
  return `${LIEGONG_CROSS_BUFF_PREFIX}${actionIndex}:${targetId}:${createId("liegong")}`;
}

function absoluteGuardBuffId(
  actionIndex: number,
  mode: "area_to_self" | "single_to_area",
  guardPlayerId: PlayerId
): string {
  return `${ABSOLUTE_GUARD_BUFF_PREFIX}${actionIndex}:${mode}:${guardPlayerId}:${createId("absolute_guard")}`;
}

function parseAbsoluteGuardBuff(
  id: string | undefined
): { mode: "area_to_self" | "single_to_area"; guardPlayerId: PlayerId } | undefined {
  if (!id?.startsWith(ABSOLUTE_GUARD_BUFF_PREFIX)) {
    return undefined;
  }

  const [, mode, guardPlayerId] = id
    .slice(ABSOLUTE_GUARD_BUFF_PREFIX.length)
    .split(":");
  if ((mode !== "area_to_self" && mode !== "single_to_area") || !guardPlayerId) {
    return undefined;
  }

  return { mode, guardPlayerId };
}

function parseDoubleEdgeIgnoreDefenseBuff(
  id: string
): { actionIndex: number; targetId: PlayerId } | undefined {
  if (!id.startsWith(DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX)) {
    return undefined;
  }

  const [actionIndexText, targetId] = id
    .slice(DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX.length)
    .split(":");
  const actionIndex = Number(actionIndexText);
  if (!Number.isInteger(actionIndex) || actionIndex < 0 || !targetId) {
    return undefined;
  }

  return { actionIndex, targetId };
}

function applyBlockedAttackEffects(
  state: GameState,
  attack: AttackInstance,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  if (attack.stats.id !== "skill_27_23816") {
    return;
  }

  addDamage(
    state,
    healthDeltas,
    attack.sourceId,
    3,
    attack.sourceId,
    "全力一击反噬",
    undefined
  );
}

function awardGuidaoCharge(
  state: GameState,
  attack: AttackInstance,
  targetAction: PlayerAction | undefined
): void {
  if (targetAction?.type !== "defense" || targetAction.defense !== "small") {
    return;
  }

  const target = findPlayer(state, attack.targetId);
  const guidaoCount = target ? getActiveSkillCount(target, "skill_37_68416") : 0;
  if (!target || guidaoCount <= 0) {
    return;
  }

  const gained = attack.stats.stacks * guidaoCount;
  addCountingMark(target, "guidao_charge", "鬼道次数", gained);
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${target.name} 小防成功，获得 ${gained} 次鬼道`
  });
}

function isLastHitAttack(attack: AttackInstance, attacks: AttackInstance[]): boolean {
  if (attack.reflected || attack.notLastHit) {
    return false;
  }

  return attacks.some(
    (candidate) =>
      !candidate.reflected &&
      candidate.sourceId === attack.targetId &&
      candidate.targetId !== attack.sourceId
  );
}

function getDefenseAction(plan: PlayerActionPlan | undefined): Extract<PlayerAction, { type: "defense" }> | undefined {
  return plan?.actions.find(
    (action): action is Extract<PlayerAction, { type: "defense" }> =>
      action.type === "defense" && action.defense !== "self_destruct"
  );
}

function getReboundAction(plan: PlayerActionPlan | undefined): Extract<PlayerAction, { type: "defense" }> | undefined {
  return plan?.actions.find(
    (action): action is Extract<PlayerAction, { type: "defense" }> =>
      action.type === "defense" && action.defense === "rebound"
  );
}

function getReboundActions(plan: PlayerActionPlan | undefined): Array<Extract<PlayerAction, { type: "defense" }>> {
  return (plan?.actions ?? []).filter(
    (action): action is Extract<PlayerAction, { type: "defense" }> =>
      action.type === "defense" && action.defense === "rebound"
  );
}

function getDefensiveAction(plan: PlayerActionPlan | undefined): PlayerAction | undefined {
  return plan?.actions.find(
    (action) => action.type === "defense" || action.type === "gain_cake"
  );
}

function getDefensiveActionForAttack(
  state: GameState,
  attack: AttackInstance,
  plan: PlayerActionPlan | undefined
): PlayerAction | undefined {
  const actionWithIndex = getDefensiveActionWithIndex(plan);
  if (!actionWithIndex) {
    return undefined;
  }

  const source = findPlayer(state, attack.sourceId);
  if (!playerHasActiveSkill(source, "skill_30_38815")) {
    return actionWithIndex.action;
  }

  return (
    getOriginalDefenseBeforeQinggangIgnoredSwitch(
      state,
      attack.targetId,
      actionWithIndex.actionIndex
    ) ?? actionWithIndex.action
  );
}

function getDefensiveActionWithIndex(
  plan: PlayerActionPlan | undefined
): { action: PlayerAction; actionIndex: number } | undefined {
  const actionIndex = plan?.actions.findIndex(
    (action) =>
      (action.type === "defense" && action.defense !== "rebound") ||
      action.type === "gain_cake"
  );
  if (actionIndex === undefined || actionIndex < 0 || !plan) {
    return undefined;
  }

  const action = plan.actions[actionIndex];
  return action ? { action, actionIndex } : undefined;
}

function getOriginalDefenseBeforeQinggangIgnoredSwitch(
  state: GameState,
  playerId: PlayerId,
  actionIndex: number
): PlayerAction | undefined {
  const switchEvent = state.eventLog.find(
    (event) =>
      event.type === "action_switched" &&
      event.playerId === playerId &&
      event.roundNumber === state.roundNumber &&
      event.turnNumber === state.turnNumber &&
      (event.skillId === "skill_88_62906" || event.skillId === "skill_89_99375") &&
      event.actionIndex === actionIndex &&
      event.before.type === "defense"
  );

  return switchEvent?.type === "action_switched" ? switchEvent.before : undefined;
}

function resolveActiveSkillEffects(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  for (const [sourceId, plan] of Object.entries(actions)) {
    for (const action of plan.actions) {
      if (action.type !== "skill") {
        continue;
      }

      const skill = getSkill(action.skillId);
      const play = skill?.play;
      const source = findPlayer(state, sourceId);
      if (isPlayerSkillDisabled(source)) {
        continue;
      }
      if (!skill || !play || play.kind !== "effect") {
        continue;
      }

      if (skill.id === DOUBLE_EDGE_SWORD_SKILL_ID) {
        applyDoubleEdgeSwordCost(state, sourceId, skill.name);
        continue;
      }

      if (skill.id === "skill_5_34881" && action.targetId && action.targetSkillId) {
        sealExposedSkill(state, sourceId, action.targetId, action.targetSkillId);
        continue;
      }

      if (skill.id === "skill_101_4254" && action.targetId && action.targetSkillId) {
        mirrorExposedSkill(state, sourceId, action.targetId, action.targetSkillId);
        continue;
      }

      if (skill.id === "skill_13_68869") {
        resolveBurningEarth(state, healthDeltas, sourceId);
        continue;
      }

      if (skill.id === "skill_14_46860") {
        resolveFrostfall(state, healthDeltas, sourceId);
        continue;
      }

      if (skill.id === "skill_15_64971") {
        resolvePurifyingWind(state, healthDeltas, sourceId);
        continue;
      }

      if (skill.id === "skill_94_627" && action.targetId && action.targetDamageId) {
        resolveDamageRedirect(state, sourceId, action.targetId, action.targetDamageId);
        continue;
      }

      if (skill.id === SIX_STAR_SKILL_ID) {
        resolveSixStar(state, healthDeltas, sourceId, skill.name);
        continue;
      }

      if (skill.id === ICE_RAIN_SKILL_ID && action.targetDamageId) {
        resolveIceRainMarkUse(state, sourceId, action.targetDamageId);
        continue;
      }

      if (skill.id === CROSS_GUARD_SKILL_ID && action.targetDamageId) {
        resolveCrossGuardMarkUse(state, sourceId, action.targetDamageId);
        continue;
      }

      if (skill.id === "skill_35_16792") {
        resolveLightningSpell(state, healthDeltas, sourceId, action);
        continue;
      }

      if (skill.id === "skill_111_51056") {
        resolveBalance(state, sourceId, action);
        continue;
      }

      if (skill.id === "skill_107_53513") {
        resolveThunderCrackSunset(state, healthDeltas, sourceId);
        continue;
      }

      if (skill.id === "skill_24_71363") {
        resolveShenyinQinglian(state, healthDeltas, sourceId);
        continue;
      }

      if (skill.id === "skill_47_94841") {
        resolveCoagulationPower(state, sourceId);
        continue;
      }

      if (skill.id === "skill_115_74459" && action.targetId) {
        resolveSameFate(state, healthDeltas, sourceId, action.targetId);
        continue;
      }

      if (skill.id === XIEYU_SKILL_ID && action.targetId) {
        selectXieyuTarget(state, sourceId, action.targetId);
        continue;
      }

      if (skill.id === SHUNSHOU_STEAL_SKILL_ID && action.targetSkillId) {
        resolveShunshouStealChoice(state, sourceId, action.targetSkillId);
        continue;
      }

      if (play.effect === "reroll_skill") {
        rerollAgainSkill(state, sourceId);
        continue;
      }

      if (play.effect === "sand_transform" && action.targetSkillId) {
        resolveSandTransform(state, healthDeltas, sourceId, action.targetSkillId);
        continue;
      }

      if (skill.id === "skill_64_60978") {
        resolveHealingRevival(state, sourceId);
        continue;
      }

      if (skill.id === "skill_68_57581" && action.targetId) {
        resolveLishang(state, sourceId, action);
        continue;
      }

      if (skill.id === HELL_OVERLORD_SKILL_ID) {
        resolveHellOverlord(state, sourceId, action);
        continue;
      }

      if (play.effect === "abs_plus") {
        const player = findPlayer(state, sourceId);
        if (player) {
          const before = player.hp;
          player.hp = Math.abs(player.hp) + (play.selfHeal ?? 0);
          state.eventLog.push({
            ...createBaseEvent(state, "heal"),
            type: "heal",
            sourceId,
            targetId: sourceId,
            amount: Math.max(0, player.hp - before),
            reason: skill.name
          });
        }
        continue;
      }

      if (isReversalActive(state) && skill.id === FOREST_LOW_SING_SKILL_ID) {
        continue;
      }

      if (play.selfDamage && !isSkillEffectImmune(state, sourceId, skill, sourceId)) {
        addDamage(
          state,
          healthDeltas,
          sourceId,
          play.selfDamage,
          sourceId,
          skill.name,
          getSkillEffectDamageStats(skill, play.selfDamage)
        );
      }

      if (play.selfHeal && !isSkillEffectImmune(state, sourceId, skill, sourceId)) {
        addHeal(state, healthDeltas, sourceId, play.selfHeal, sourceId, skill.name);
      }

      const targets = selectSkillEffectTargets(state, sourceId, action.targetId, play, skill);
      for (const targetId of targets) {
        if (play.allEnemyDamage === undefined && play.targetDamage === undefined) {
          continue;
        }

        if (isSkillEffectImmune(state, targetId, skill, sourceId)) {
          continue;
        }

        const amount = play.targetDamage ?? play.allEnemyDamage ?? 0;
        if (amount > 0) {
          addDamage(
            state,
            healthDeltas,
            targetId,
            amount,
            sourceId,
            skill.name,
            getSkillEffectDamageStats(skill, amount)
          );
        } else if (amount < 0) {
          addHeal(state, healthDeltas, targetId, Math.abs(amount), sourceId, skill.name);
        }
      }
    }
  }
}

function resolveImmediateSkillEffect(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): boolean {
  const beforeHp = new Map(state.players.map((player) => [player.id, player.hp]));
  const beforeTurnHealthChanged = Boolean(state.turnHealthChanged);
  const healthDeltas = new Map<PlayerId, HealthDelta>();
  resolveActiveSkillEffects(state, { [playerId]: { actions: [action] } }, healthDeltas);
  const changedByDeltas = applyHealthDeltas(state, healthDeltas);
  if (handlePendingDamageItems(state)) {
    return changedByDeltas || state.players.some(
      (player) => beforeHp.get(player.id) !== player.hp
    );
  }
  const changedDirectly = state.players.some(
    (player) => beforeHp.get(player.id) !== player.hp
  );
  const changedByPending = Boolean(state.turnHealthChanged) && !beforeTurnHealthChanged;
  return changedByDeltas || changedDirectly || changedByPending;
}

function applyDoubleEdgeSwordCost(
  state: GameState,
  playerId: PlayerId,
  skillName: string
): void {
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") {
    return;
  }

  player.hp -= 1;
  const event: DamageEvent = {
    ...createBaseEvent(state, "damage"),
    type: "damage",
    sourceId: playerId,
    targetId: playerId,
    amount: 1,
    attackName: skillName
  };
  state.eventLog.push(event);
  rememberDamageTaken(state, playerId, playerId, 1);
}

function getSkillEffectDamageStats(
  skill: NonNullable<ReturnType<typeof getSkill>>,
  amount: number
): AttackStats | undefined {
  return skill.attribute
    ? attributeDamageStats(skill.id, skill.name, amount, skill.attribute)
    : undefined;
}

function sealExposedSkill(
  state: GameState,
  sourceId: PlayerId,
  targetId: PlayerId,
  targetSkillId: string
): void {
  const source = findPlayer(state, sourceId);
  const target = findPlayer(state, targetId);
  const targetSkill = getSkill(targetSkillId);
  if (!source || !target || !targetSkill) {
    return;
  }

  const sealedTargetBuffId = `sealed_player:${targetId}`;
  const sealedTargetCount = source.buffs.filter((buff) => buff.id === sealedTargetBuffId).length;
  const sealLimit = getActiveSkillCount(source, "skill_5_34881");
  if (sealedTargetCount >= sealLimit) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${source.name} 已经封锁过 ${target.name} 的一个技能，本次封印无效`
    });
    return;
  }

  source.buffs.push({
    id: sealedTargetBuffId,
    name: `已封锁：${target.name}`,
    stacks: 1,
    sourcePlayerId: targetId
  });
  upsertBuff(target, {
    id: `sealed_skill:${targetSkillId}`,
    name: `被封印：${targetSkill.name}`,
    stacks: 1,
    sourcePlayerId: sourceId
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 封印了 ${target.name} 的 ${targetSkill.name}`
  });
}

function mirrorExposedSkill(
  state: GameState,
  sourceId: PlayerId,
  targetId: PlayerId,
  targetSkillId: SkillId
): void {
  const source = findPlayer(state, sourceId);
  const target = findPlayer(state, targetId);
  const targetSkill = getSkill(targetSkillId);
  if (!source || !target || !targetSkill) {
    return;
  }

  source.skills.push(targetSkillId);
  revealSkillToAll(state, sourceId, targetSkillId, "镜像法术复制");
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 复制了 ${target.name} 已暴露的 ${targetSkill.name}`
  });
}

function normalizeSkillTargetIds(action: SkillAction): PlayerId[] {
  return Array.from(
    new Set([...(action.targetIds ?? []), action.targetId].filter(Boolean) as PlayerId[])
  );
}

function resolveBalance(
  state: GameState,
  sourceId: PlayerId,
  action: SkillAction
): void {
  const source = findPlayer(state, sourceId);
  const skill = getSkill("skill_111_51056");
  const targetIds = normalizeSkillTargetIds(action);
  if (!source || !skill || targetIds.length !== 2) {
    return;
  }

  const targets = targetIds
    .map((targetId) => findPlayer(state, targetId))
    .filter(
      (target): target is NonNullable<ReturnType<typeof findPlayer>> =>
        Boolean(target && target.status === "alive" && target.id !== sourceId)
    );
  if (targets.length !== 2) {
    return;
  }

  const purifiedTargets = targets.filter((target) =>
    isPurificationImmune(state, target.id, skill, sourceId)
  );
  if (purifiedTargets.length > 0) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${source.name} 的制衡被净化抵消，未产生效果`
    });
    return;
  }

  const totalHp = source.hp + targets[0]!.hp + targets[1]!.hp;
  const low = Math.floor(totalHp / 3);
  const high = Math.ceil(totalHp / 3);
  const sourceHp = totalHp % 3 === 2 ? low : high;
  const targetHp = totalHp % 3 === 2 ? high : low;
  source.hp = sourceHp;
  for (const target of targets) {
    target.hp = targetHp;
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 发动制衡，将三名玩家的血量重新分配`
  });
}

function resolvePurifyingWind(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId
): void {
  const source = findPlayer(state, sourceId);
  const skill = getSkill("skill_15_64971");
  if (!source || !skill) {
    return;
  }

  const previousUses = getSkillUseCount(source, skill.id);
  const targetParity = previousUses % 2 === 0 ? 1 : 0;
  for (const target of alivePlayers(state)) {
    if (target.id === sourceId || Math.abs(target.hp) % 2 !== targetParity) {
      continue;
    }

    if (isSkillEffectImmune(state, target.id, skill, sourceId)) {
      continue;
    }

    addDamage(state, healthDeltas, target.id, 1, sourceId, skill.name);
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message:
      previousUses % 2 === 0
        ? `${source.name} 发动净化之风：奇数血量玩家受到 1 点伤害`
        : `${source.name} 发动净化之风：偶数血量玩家受到 1 点伤害`
  });
}

function resolveLightningSpell(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId,
  action: SkillAction
): void {
  const skill = getSkill("skill_35_16792");
  if (!skill) {
    return;
  }

  const targetIds = resolveLightningSpellTargetIds(
    state.players,
    sourceId,
    normalizeSkillTargetIds(action)
  );
  if (!targetIds) {
    return;
  }

  for (const targetId of targetIds) {
    addDamage(
      state,
      healthDeltas,
      targetId,
      2,
      sourceId,
      skill.name,
      attributeDamageStats(skill.id, skill.name, 2, "electric")
    );
  }
}

function resolveDamageRedirect(
  state: GameState,
  sourceId: PlayerId,
  targetId: PlayerId,
  damageId: string
): void {
  const source = findPlayer(state, sourceId);
  const target = findPlayer(state, targetId);
  const damage = state.pendingDamageItems?.find(
    (item) =>
      item.id === damageId &&
      item.targetId === sourceId &&
      item.amount <= 3 &&
      !(item.redirectedByPlayerIds ?? []).includes(sourceId)
  );
  if (!source || !target || !damage) {
    return;
  }

  damage.targetId = targetId;
  damage.redirectedByPlayerIds = [
    ...(damage.redirectedByPlayerIds ?? []),
    sourceId
  ];
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 发动斗转星移，将 ${damage.attackName ?? "伤害"} 的 ${damage.amount} 点伤害转移给 ${target.name}`
  });
  refreshDamageModifyPasses(state);
}

function resolveSixStar(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId,
  skillName: string
): void {
  const source = findPlayer(state, sourceId);
  const damage = getHighestPendingDamageItem(state, sourceId);
  if (!source || !damage) {
    return;
  }

  const removed = (state.pendingDamageItems ?? []).filter(
    (item) => item.targetId === sourceId && item.amount > 0
  );
  state.pendingDamageItems = (state.pendingDamageItems ?? []).filter((item) => !removed.includes(item));
  addHeal(state, healthDeltas, sourceId, damage.amount + 6, sourceId, skillName);
  for (const item of removed) {
    pushAttackBlockedEvent(state, {
      sourceId: item.sourceId,
      targetId: sourceId,
      attackName: item.attackName ?? "伤害",
      blockKind: "immune",
      protectionName: "六芒星"
    });
  }
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 发动${skillName}，免疫当前待承受伤害，并将最高的 ${damage.amount} 点伤害转化为 ${damage.amount + 6} 点治疗`
  });
  refreshDamageModifyPasses(state);
}

function resolveIceRainMarkUse(
  state: GameState,
  playerId: PlayerId,
  damageId: string
): void {
  const damage = getPendingDamageItem(state, damageId);
  if (
    !damage ||
    damage.targetId !== playerId ||
    !damage.sourceId ||
    hasPendingDamageModifier(damage, "ice_rain")
  ) {
    return;
  }

  const source = findPlayer(state, damage.sourceId);
  if (!consumeSourceMark(source, `ice_rain:${playerId}`)) {
    return;
  }

  damage.amount = Math.max(0, damage.amount - 2);
  addPendingDamageModifier(damage, "ice_rain");
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${getPlayerName(state, playerId)} 消耗冰雨印记，使 ${source?.name ?? "攻击者"} 的 ${damage.attackName ?? "伤害"} 伤害-2`
  });
  refreshDamageModifyPasses(state);
}

function resolveCrossGuardMarkUse(
  state: GameState,
  playerId: PlayerId,
  damageId: string
): void {
  const player = findPlayer(state, playerId);
  const damage = getPendingDamageItem(state, damageId);
  if (!player || !damage || damage.amount <= 0) {
    return;
  }

  if (damage.targetId === playerId) {
    if (
      hasPendingDamageModifier(damage, "huyou") ||
      !consumePlayerBuff(player, "huyou_mark", 1)
    ) {
      return;
    }
    damage.amount = Math.floor(damage.amount / 2);
    addPendingDamageModifier(damage, "huyou");
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 消耗护佑印记，使 ${damage.attackName ?? "伤害"} 伤害减半`
    });
    refreshDamageModifyPasses(state);
    return;
  }

  if (
    !areNeighborPlayers(state, playerId, damage.targetId) ||
    hasPendingDamageModifier(damage, "cross") ||
    !consumePlayerBuff(player, "cross_mark", 1)
  ) {
    return;
  }

  damage.amount *= 2;
  addPendingDamageModifier(damage, "cross");
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 消耗十字印记，使 ${getPlayerName(state, damage.targetId)} 承受的 ${damage.attackName ?? "伤害"} 伤害翻倍`
  });
  refreshDamageModifyPasses(state);
}

function getPendingDamageItem(state: GameState, damageId: string): PendingDamageItem | undefined {
  return (state.pendingDamageItems ?? []).find((item) => item.id === damageId);
}

function addPendingDamageModifier(item: PendingDamageItem, modifierId: string): void {
  item.damageModifierIds = Array.from(new Set([...(item.damageModifierIds ?? []), modifierId]));
}

function getHighestPendingDamageItem(
  state: GameState,
  playerId: PlayerId
): PendingDamageItem | undefined {
  return (state.pendingDamageItems ?? [])
    .filter((item) => item.targetId === playerId && item.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0];
}

function resolveThunderCrackSunset(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId
): void {
  const skill = getSkill("skill_107_53513");
  if (!skill) {
    return;
  }

  for (const target of alivePlayers(state)) {
    if (target.id === sourceId || target.hp > 3) {
      continue;
    }

    addDefeatEffect(
      state,
      healthDeltas,
      target.id,
      2,
      sourceId,
      skill.name,
      attributeDamageStats(skill.id, skill.name, RETIRE_EFFECT_POWER, "electric")
    );
  }
}

function resolveShenyinQinglian(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId
): void {
  const source = findPlayer(state, sourceId);
  if (!source || source.hp !== 0) {
    return;
  }

  addHeal(state, healthDeltas, sourceId, 3, sourceId, "神隐青莲");
  addScheduledCakeBuff(
    source,
    `qinglian_cake_round:${state.roundNumber + 1}`,
    "神隐青莲轮初加饼",
    1,
    state.roundNumber + 2
  );
}

function resolveCoagulationPower(state: GameState, sourceId: PlayerId): void {
  const source = findPlayer(state, sourceId);
  if (!source) {
    return;
  }

  const intervalBuffId = coagulationIntervalBuffId(state.roundNumber, state.activeTimingPhase);
  addCountingMark(source, intervalBuffId, "凝血之力本轮间已使用", 1);
  const intervalBuff = source.buffs.find((buff) => buff.id === intervalBuffId);
  if (intervalBuff) {
    intervalBuff.expiresAtRound = state.roundNumber + 1;
  }
  const previousDamage = getRoundDamageTaken(source, state.roundNumber - 1);
  const cakeGain = Math.min(4, previousDamage);
  if (cakeGain <= 0) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${source.name} 发动凝血之力，但上一轮未受到伤害`
    });
    return;
  }

  addScheduledCakeBuff(
    source,
    `coagulation_cake_round:${state.roundNumber}`,
    "凝血之力轮初加饼",
    cakeGain,
    state.roundNumber + 1
  );
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 发动凝血之力：上一轮受到 ${previousDamage} 点伤害，本轮轮初+${cakeGain}饼`
  });
}

function resolveSameFate(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId,
  targetId: PlayerId
): void {
  const source = findPlayer(state, sourceId);
  const target = findPlayer(state, targetId);
  const skill = getSkill("skill_115_74459");
  if (!source || !target || !skill) {
    return;
  }

  const damageTaken = getRoundDamageTaken(source, state.roundNumber);
  if (damageTaken <= 0) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${source.name} 发动同生共死，但本回合未受到伤害`
    });
    return;
  }

  if (isSkillEffectImmune(state, targetId, skill, sourceId)) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${target.name} 免疫了 ${source.name} 的同生共死`
    });
    return;
  }

  addDamage(
    state,
    healthDeltas,
    targetId,
    damageTaken,
    sourceId,
    skill.name
  );
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 发动同生共死：本回合受到 ${damageTaken} 点伤害，令 ${target.name} 承受等量法术伤害`
  });
}

function resolveHealingRevival(state: GameState, sourceId: PlayerId): void {
  const source = findPlayer(state, sourceId);
  if (!source) {
    return;
  }

  reviveToFullHp(state, source, "治愈术");
}

function resolveLishang(
  state: GameState,
  sourceId: PlayerId,
  action: SkillAction
): void {
  const source = findPlayer(state, sourceId);
  const target = action.targetId ? findPlayer(state, action.targetId) : undefined;
  const skill = getSkill("skill_68_57581");
  if (!source || !target || !skill) {
    return;
  }

  const fatalSourceIds = getFatalSourceIds(state, sourceId);
  if (!fatalSourceIds.includes(target.id)) {
    return;
  }

  if (isPurificationImmune(state, target.id, skill, sourceId)) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${source.name} 的离殇被 ${target.name} 的净化抵消，未产生效果`
    });
    return;
  }

  const targetHpBase = target.id === source.id ? Math.abs(target.hp) : Math.max(0, target.hp);
  const sourceHp = Math.ceil(targetHpBase / 2);
  const targetHp = Math.floor(targetHpBase / 2);
  if (target.id === source.id) {
    source.hp = Math.max(1, sourceHp);
  } else {
    source.hp = sourceHp;
    target.hp = targetHp;
  }
  clearPendingDeath(source);

  if (action.targetSkillId) {
    removeOneSkillFromPlayerKnowledge(state, target, action.targetSkillId);
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 发动离殇，与 ${target.name} 平分生命`
  });
}

function resolveHellOverlord(
  state: GameState,
  sourceId: PlayerId,
  action: SkillAction
): void {
  const source = findPlayer(state, sourceId);
  const skill = getSkill(HELL_OVERLORD_SKILL_ID);
  const targetId = action.targetId ?? sourceId;
  const target = findPlayer(state, targetId);
  if (!source || !target || !skill) {
    return;
  }

  const selfRevival = target.id === source.id;
  if (!selfRevival && isPurificationImmune(state, target.id, skill, sourceId)) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${source.name} 的地狱主宰被 ${target.name} 的净化抵消，未产生效果`
    });
    return;
  }

  if (selfRevival) {
    const beforeHp = source.hp;
    clearAllSkillsFromPlayer(state, source);
    source.status = "alive";
    delete source.defeatLevel;
    source.hp = INITIAL_HP;
    clearPendingDeath(source);
    state.eventLog.push({
      ...createBaseEvent(state, "heal"),
      type: "heal",
      sourceId,
      targetId: sourceId,
      amount: Math.max(0, INITIAL_HP - beforeHp),
      reason: skill.name
    });
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${source.name} 发动地狱主宰自救，6血复活并失去全部技能`
    });
    return;
  }

  if (target.status !== "dead" || target.defeatLevel !== 1 || hasNoRevive(target)) {
    return;
  }

  const beforeHp = target.hp;
  clearAllSkillsFromPlayer(state, target);
  target.status = "alive";
  delete target.defeatLevel;
  target.hp = INITIAL_HP;
  clearPendingDeath(target);
  target.buffs = target.buffs.filter((buff) => !buff.id.startsWith(PUPPET_BUFF_PREFIX));
  upsertBuff(target, {
    id: `${PUPPET_BUFF_PREFIX}${sourceId}`,
    name: `${source.name}的傀儡`,
    stacks: 1,
    sourcePlayerId: sourceId
  });
  state.eventLog.push({
    ...createBaseEvent(state, "heal"),
    type: "heal",
    sourceId,
    targetId: target.id,
    amount: Math.max(0, INITIAL_HP - beforeHp),
    reason: skill.name
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 发动地狱主宰，使 ${target.name} 6血复活并成为 ${source.name}的傀儡`
  });
}

function rerollAgainSkill(state: GameState, sourceId: PlayerId): void {
  const choices = getSmallSkillIds();
  const nextSkillId = choices[Math.floor(Math.random() * choices.length)];
  if (!nextSkillId) {
    return;
  }

  transformSkill(state, sourceId, "skill_3_56718", nextSkillId, "再来一次变化", {
    revealResult: false
  });
}

function resolveSandTransform(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId,
  targetSkillId: SkillId
): void {
  const source = findPlayer(state, sourceId);
  const targetSkill = getSkill(targetSkillId);
  if (!source || !targetSkill) {
    return;
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 声明沙子变化为 ${targetSkill.name}`
  });

  const duplicateHolders = alivePlayers(state).filter((player) =>
    player.skills.includes(targetSkillId)
  );
      if (duplicateHolders.length > 0) {
        for (const holder of duplicateHolders) {
          revealSkillToAll(state, holder.id, targetSkillId, "沙子检测");
        }
        state.eventLog.push({
      ...createBaseEvent(state, "system"),
          type: "system",
          message: `${source.name} 的沙子变化失败：场上已有 ${targetSkill.name}，${source.name} 退游`
        });
    addDefeatEffect(state, healthDeltas, sourceId, 2, sourceId, "沙子变化失败");
    return;
  }

  transformSkill(state, sourceId, "skill_4_65637", targetSkillId, "沙子变化");
}

function transformSkill(
  state: GameState,
  playerId: PlayerId,
  fromSkillId: SkillId,
  toSkillId: SkillId,
  reason: string,
  options: { revealResult?: boolean } = {}
): void {
  const player = findPlayer(state, playerId);
  const nextSkill = getSkill(toSkillId);
  if (!player || !nextSkill) {
    return;
  }

  const index = player.skills.indexOf(fromSkillId);
  if (index === -1) {
    return;
  }

  player.skills[index] = toSkillId;

  player.revealedSkillIds = player.revealedSkillIds.filter(
    (skillId) => skillId !== fromSkillId && player.skills.includes(skillId)
  );
  for (const viewerKnowledge of Object.values(state.skillKnowledge ?? {})) {
    const known = viewerKnowledge?.[playerId];
    if (known) {
      viewerKnowledge[playerId] = known.filter(
        (skillId) => skillId !== fromSkillId && player.skills.includes(skillId)
      );
    }
  }

  upsertBuff(player, {
    id: `skill_transformed:${toSkillId}`,
    name: reason,
    stacks: 1
  });
  if (options.revealResult ?? true) {
    revealSkillToAll(state, playerId, toSkillId, reason);
  }
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 的${reason}：获得 ${nextSkill.name}`
  });
}

function selectXieyuTarget(
  state: GameState,
  sourceId: PlayerId,
  targetId: PlayerId
): void {
  const source = findPlayer(state, sourceId);
  const target = findPlayer(state, targetId);
  if (!source || !target) {
    return;
  }

  source.buffs.push({
    id: "xieyu_target",
    name: `邪域目标：${target.name}`,
    stacks: 1,
    sourcePlayerId: targetId
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 选择 ${target.name} 作为邪域吸取目标`
  });
}

function resolveShunshouStealChoice(
  state: GameState,
  playerId: PlayerId,
  skillId: SkillId
): void {
  const choice = getPendingShunshouChoices(state, playerId).find(
    (item) => item.skillId === skillId
  );
  if (!choice) {
    return;
  }

  grantShunshouSkill(state, playerId, choice.skillId, false);
  const player = findPlayer(state, playerId);
  consumePendingShunshouChoice(state, playerId, choice.id);
  if (
    player &&
    getSkillUseCount(player, SHUNSHOU_STEAL_SKILL_ID) + 1 >=
      getActiveSkillCount(player, SHUNSHOU_STEAL_SKILL_ID)
  ) {
    clearPendingShunshouChoices(state, playerId);
  }
}

function applyDefaultShunshouStealChoices(state: GameState): void {
  if (state.roundNumber !== 1) {
    return;
  }

  for (const player of alivePlayers(state)) {
    if (
      !playerHasActiveSkill(player, SHUNSHOU_STEAL_SKILL_ID) ||
      getSkillUseCount(player, SHUNSHOU_STEAL_SKILL_ID) >=
        getActiveSkillCount(player, SHUNSHOU_STEAL_SKILL_ID)
    ) {
      clearPendingShunshouChoices(state, player.id);
      continue;
    }

    const remainingUses =
      getActiveSkillCount(player, SHUNSHOU_STEAL_SKILL_ID) -
      getSkillUseCount(player, SHUNSHOU_STEAL_SKILL_ID);
    for (let index = 0; index < remainingUses; index += 1) {
      const choices = getPendingShunshouChoices(state, player.id);
      if (choices.length === 0) {
        break;
      }

      const choice =
        choices.find((item) => !player.skills.includes(item.skillId)) ?? choices[0];
      if (!choice) {
        break;
      }

      grantShunshouSkill(state, player.id, choice.skillId, true);
      markSkillUse(player, SHUNSHOU_STEAL_SKILL_ID);
      consumePendingShunshouChoice(state, player.id, choice.id);
    }
    if (
      getSkillUseCount(player, SHUNSHOU_STEAL_SKILL_ID) >=
      getActiveSkillCount(player, SHUNSHOU_STEAL_SKILL_ID)
    ) {
      clearPendingShunshouChoices(state, player.id);
    }
  }
}

function getPendingShunshouChoices(state: GameState, playerId: PlayerId) {
  return (state.pendingSkillChoices ?? []).filter(
    (choice) => choice.kind === "steal_skill" && choice.playerId === playerId
  );
}

function clearPendingShunshouChoices(state: GameState, playerId: PlayerId): void {
  state.pendingSkillChoices = (state.pendingSkillChoices ?? []).filter(
    (choice) => choice.kind !== "steal_skill" || choice.playerId !== playerId
  );
  if (state.pendingSkillChoices.length === 0) {
    delete state.pendingSkillChoices;
  }
}

function consumePendingShunshouChoice(state: GameState, playerId: PlayerId, choiceId: string): void {
  state.pendingSkillChoices = (state.pendingSkillChoices ?? []).filter(
    (choice) =>
      choice.kind !== "steal_skill" ||
      choice.playerId !== playerId ||
      choice.id !== choiceId
  );
  if (state.pendingSkillChoices.length === 0) {
    delete state.pendingSkillChoices;
  }
}

function grantShunshouSkill(
  state: GameState,
  playerId: PlayerId,
  skillId: SkillId,
  automatic: boolean
): void {
  const player = findPlayer(state, playerId);
  const skill = getSkill(skillId);
  if (!player || !skill) {
    return;
  }

  player.skills.push(skillId);
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: automatic
      ? `${player.name} 的顺手牵羊默认获得 ${skill.name}`
      : `${player.name} 的顺手牵羊获得 ${skill.name}`
  });
}

function selectSkillEffectTargets(
  state: GameState,
  sourceId: PlayerId,
  requestedTargetId: PlayerId | undefined,
  play: NonNullable<ReturnType<typeof getSkillPlay>>,
  skill: NonNullable<ReturnType<typeof getSkill>>
): PlayerId[] {
  const enemies = alivePlayers(state).filter((player) => {
    if (player.id === sourceId) {
      return false;
    }

    if (isPurificationImmune(state, player.id, skill, sourceId)) {
      return false;
    }

    return true;
  });
  if (play.effect === "highest_hp_damage") {
    return [...enemies]
      .sort((a, b) => b.hp - a.hp)
      .slice(0, play.selectedTargetCount ?? 1)
      .map((player) => player.id);
  }

  if (play.effect === "low_hp_execute") {
    return enemies
      .filter((player) => player.hp <= (play.hpThreshold ?? 3))
      .map((player) => player.id);
  }

  if (play.effect === "odd_hp_damage") {
    return enemies.filter((player) => Math.abs(player.hp) % 2 === 1).map((player) => player.id);
  }

  if (play.effect === "even_hp_damage") {
    return enemies.filter((player) => Math.abs(player.hp) % 2 === 0).map((player) => player.id);
  }

  if (play.targetMode === "single" && requestedTargetId) {
    if (
      requestedTargetId !== sourceId &&
      isPurificationImmune(state, requestedTargetId, skill, sourceId)
    ) {
      return [];
    }

    return [requestedTargetId];
  }

  if (play.targetMode === "all") {
    if (skill.id === "skill_14_46860") {
      return enemies
        .filter((player) => !playerHasFireSkill(player))
        .map((player) => player.id);
    }

    return enemies.map((player) => player.id);
  }

  return [];
}

function playerHasFireSkill(player: { skills: string[] }): boolean {
  return player.skills.some((skillId) => {
    return isFireSkillId(skillId);
  });
}

function isFireSkillId(skillId: string): boolean {
  return getSkill(skillId)?.attribute === "fire";
}

function isAttributeSkillEffectImmune(
  state: GameState,
  playerId: PlayerId,
  skill: NonNullable<ReturnType<typeof getSkill>>
): boolean {
  const player = findPlayer(state, playerId);
  const active = Boolean(skill.attribute && playerHasActiveSkill(player, "skill_75_68329"));
  if (active) {
    revealSkillOnTrigger(state, playerId, "skill_75_68329", "触发圣灵之境");
  }
  return active;
}

function isSkillEffectImmune(
  state: GameState,
  playerId: PlayerId,
  skill: NonNullable<ReturnType<typeof getSkill>>,
  sourceId: PlayerId | undefined
): boolean {
  return (
    isAttributeSkillEffectImmune(state, playerId, skill) ||
    isPurificationImmune(state, playerId, skill, sourceId)
  );
}

function isPurificationImmune(
  state: GameState,
  playerId: PlayerId,
  skill: NonNullable<ReturnType<typeof getSkill>>,
  sourceId: PlayerId | undefined
): boolean {
  if (sourceId === playerId || !skillHasTypeTag(skill, "限定技")) {
    return false;
  }

  const player = findPlayer(state, playerId);
  const active = playerHasActiveSkill(player, "skill_7_35434");
  if (active) {
    revealSkillOnTrigger(state, playerId, "skill_7_35434", "触发净化");
  }
  return active;
}

function resolveBurningEarth(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId
): void {
  const sourceSkill = getSkill("skill_13_68869");
  const targets = alivePlayers(state).filter((player) => player.id !== sourceId);
  for (const target of targets) {
    if (sourceSkill && isSkillEffectImmune(state, target.id, sourceSkill, sourceId)) {
      continue;
    }

    const amount = playerHasIceSkill(target) ? 2 : 1;
    addDamage(
      state,
      healthDeltas,
      target.id,
      amount,
      sourceId,
      "火烧大地",
      fireDamageStats("skill_13_68869", "火烧大地", amount)
    );
  }
  removeEnemyIceSkills(state, sourceId);
}

function playerHasIceSkill(player: { skills: string[] }): boolean {
  return player.skills.some((skillId) => isIceSkillId(skillId));
}

function isIceSkillId(skillId: string): boolean {
  return getSkill(skillId)?.attribute === "ice";
}

function removeEnemyIceSkills(state: GameState, sourceId: PlayerId): void {
  const sourceSkill = getSkill("skill_13_68869");
  for (const player of state.players) {
    if (player.id === sourceId || player.status !== "alive") {
      continue;
    }
    if (sourceSkill && isSkillEffectImmune(state, player.id, sourceSkill, sourceId)) {
      continue;
    }

    const removed = player.skills.filter((skillId) => isIceSkillId(skillId));
    if (removed.length === 0) {
      continue;
    }

    removeSkillsFromPlayerKnowledge(state, player, removed);
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `火烧大地消除了 ${player.name} 的 ${removed.length} 个冰系技能`
    });
  }
}

function resolveFrostfall(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId
): void {
  const sourceSkill = getSkill("skill_14_46860");
  if (!sourceSkill) {
    return;
  }

  if (!isSkillEffectImmune(state, sourceId, sourceSkill, sourceId)) {
    addHeal(state, healthDeltas, sourceId, 4, sourceId, "霜落大地");
  }

  const fireSkillHolderIds = new Set(
    alivePlayers(state)
      .filter((player) => player.id !== sourceId && playerHasFireSkill(player))
      .map((player) => player.id)
  );

  for (const target of alivePlayers(state)) {
    if (
      target.id === sourceId ||
      fireSkillHolderIds.has(target.id) ||
      isSkillEffectImmune(state, target.id, sourceSkill, sourceId)
    ) {
      continue;
    }
    addHeal(state, healthDeltas, target.id, 1, sourceId, "霜落大地");
  }

  removeEnemyFireSkills(state, sourceId);
}

function removeEnemyFireSkills(state: GameState, sourceId: PlayerId): void {
  const sourceSkill = getSkill("skill_14_46860");
  for (const player of state.players) {
    if (player.id === sourceId || player.status !== "alive") {
      continue;
    }
    if (sourceSkill && isSkillEffectImmune(state, player.id, sourceSkill, sourceId)) {
      continue;
    }

    const removed = player.skills.filter((skillId) => isFireSkillId(skillId));
    if (removed.length === 0) {
      continue;
    }

    removeSkillsFromPlayerKnowledge(state, player, removed);
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `霜落大地消除了 ${player.name} 的 ${removed.length} 个火系技能`
    });
  }
}

function removeSkillsFromPlayerKnowledge(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  removed: string[]
): void {
  const removedSet = new Set(removed);
  player.skills = player.skills.filter((skillId) => !removedSet.has(skillId));
  player.revealedSkillIds = player.revealedSkillIds.filter(
    (skillId) => !removedSet.has(skillId)
  );
  for (const viewerKnowledge of Object.values(state.skillKnowledge ?? {})) {
    const known = viewerKnowledge?.[player.id];
    if (known) {
      viewerKnowledge[player.id] = known.filter((skillId) => !removedSet.has(skillId));
    }
  }
}

function clearAllSkillsFromPlayer(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>
): void {
  removeSkillsFromPlayerKnowledge(state, player, [...player.skills]);
  player.skills = [];
  player.revealedSkillIds = [];
}

function removeOneSkillFromPlayerKnowledge(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  skillId: SkillId
): void {
  const index = player.skills.indexOf(skillId);
  if (index === -1) {
    return;
  }

  player.skills.splice(index, 1);
  if (player.skills.includes(skillId)) {
    return;
  }

  player.revealedSkillIds = player.revealedSkillIds.filter((knownSkillId) => knownSkillId !== skillId);
  for (const viewerKnowledge of Object.values(state.skillKnowledge ?? {})) {
    const known = viewerKnowledge?.[player.id];
    if (known) {
      viewerKnowledge[player.id] = known.filter((knownSkillId) => knownSkillId !== skillId);
    }
  }
}

function applyElectricShockParalysis(
  state: GameState,
  attack: AttackInstance,
  targetId: PlayerId
): void {
  if (attack.stats.id !== "skill_36_14343") {
    return;
  }

  const source = findPlayer(state, attack.sourceId);
  const target = findPlayer(state, targetId);
  if (!source || !target || target.status !== "alive") {
    return;
  }

  if (isElectricShockParalysisImmune(state, attack, targetId)) {
    return;
  }

  const fixedAction = getParalysisFixedAction(state.pendingActions[targetId]);
  target.buffs = target.buffs.filter(
    (buff) => !buff.id.startsWith(PARALYSIS_NEXT_ACTION_BUFF_PREFIX)
  );
  target.buffs.push({
    id: paralysisNextActionBuffId(fixedAction),
    name: "麻痹",
    stacks: 1,
    sourcePlayerId: attack.sourceId
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: fixedAction
      ? `${source.name} 的 ${attack.stats.name} 命中 ${target.name}，使其麻痹：下回合固定为 ${getActionLabel(fixedAction)}`
      : `${source.name} 的 ${attack.stats.name} 命中 ${target.name}，使其麻痹：下回合视为没有出招`
  });
}

function isElectricShockParalysisImmune(
  state: GameState,
  attack: AttackInstance,
  targetId: PlayerId
): boolean {
  if (!attackHasElement(attack.stats, "electric")) {
    return false;
  }

  const target = findPlayer(state, targetId);
  if (!target) {
    return true;
  }

  if (playerHasActiveSkill(target, "skill_75_68329")) {
    pushAttackBlockedEvent(state, {
      sourceId: attack.sourceId,
      targetId,
      attackName: attack.stats.name,
      blockKind: "immune",
      protectionName: "圣灵之境",
      protectionSkillId: "skill_75_68329"
    });
    return true;
  }

  const earthHeartCount = getActiveSkillCount(target, "skill_39_77400");
  if (earthHeartCount > 0) {
    addDefenseValue(state, targetId, 4 * earthHeartCount, "大地之心");
    pushAttackBlockedEvent(state, {
      sourceId: attack.sourceId,
      targetId,
      attackName: attack.stats.name,
      blockKind: "immune",
      protectionName: "大地之心",
      protectionSkillId: "skill_39_77400"
    });
    return true;
  }

  return false;
}

function getParalysisFixedAction(plan: PlayerActionPlan | undefined): PlayerAction | undefined {
  if (!plan || plan.actions.length !== 1) {
    return undefined;
  }

  const action = plan.actions[0];
  if (!action) {
    return undefined;
  }

  if (action.type === "gain_cake") {
    return { type: "gain_cake" };
  }

  if (
    action.type === "defense" &&
    (action.defense === "small" || action.defense === "youtiao" || action.defense === "stone")
  ) {
    return { type: "defense", defense: action.defense };
  }

  return undefined;
}

function paralysisNextActionBuffId(action: PlayerAction | undefined): string {
  if (!action) {
    return `${PARALYSIS_NEXT_ACTION_BUFF_PREFIX}none`;
  }

  if (action.type === "gain_cake") {
    return `${PARALYSIS_NEXT_ACTION_BUFF_PREFIX}gain_cake`;
  }

  if (action.type === "defense") {
    return `${PARALYSIS_NEXT_ACTION_BUFF_PREFIX}${action.defense}`;
  }

  return `${PARALYSIS_NEXT_ACTION_BUFF_PREFIX}none`;
}

function applySkillHitEffects(
  state: GameState,
  attack: AttackInstance,
  actions: Record<PlayerId, PlayerActionPlan>,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  const source = findPlayer(state, attack.sourceId);
  const target = findPlayer(state, attack.targetId);
  if (!source || !target) {
    return;
  }

  if (attack.stats.id === LU_ATTACK_SKILL_ID) {
    const before = source.buffs.find((buff) => buff.id === "lu_growth")?.stacks ?? 0;
    if (before < 3) {
      addCountingMark(source, "lu_growth", "撸成长", 1);
      const after = Math.min(3, source.buffs.find((buff) => buff.id === "lu_growth")?.stacks ?? 0);
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `${source.name} 的撸命中 ${target.name}，撸成长为攻${after + 1}、${after + 1}级`
      });
    }
  }

  const iceRainCount = getActiveSkillCount(source, "skill_20_63089");
  if (iceRainCount > 0 && attack.stats.id === "wan_jian") {
    addCountingMark(target, `ice_rain:${source.id}`, `冰雨：${source.name}`, iceRainCount);
    const iceRainBuff = target.buffs.find((buff) => buff.id === `ice_rain:${source.id}`);
    if (iceRainBuff) {
      iceRainBuff.sourcePlayerId = source.id;
    }
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${target.name} 获得 ${iceRainCount} 层来自 ${source.name} 的冰雨印记`
    });
  }

  const canFreeze =
    attack.stats.id === ICE_VORTEX_SKILL_ID || attack.stats.freezeTurns !== undefined;
  if (
    canFreeze &&
    attackHasElement(attack.stats, "ice") &&
    !attack.stats.traits.includes("frost_blade") &&
    !isAttackAttributeEffectImmune(state, attack, target.id)
  ) {
    const freezeTurns = Math.min(3, Math.max(1, attack.stats.freezeTurns ?? 1));
    const existingFrozen = target.buffs.find((buff) => buff.id === "frozen");
    const expiresAtTurn = state.turnNumber + freezeTurns;
    upsertBuff(target, {
      id: "frozen",
      name: "冰冻",
      stacks: Math.max(existingFrozen?.stacks ?? 0, freezeTurns),
      expiresAtTurn: Math.max(existingFrozen?.expiresAtTurn ?? 0, expiresAtTurn)
    });
  }

  if (attack.stats.id === "skill_36_14343") {
    applyElectricShockParalysis(state, attack, attack.targetId);
  }

  if (attack.stats.id === "skill_78_18866") {
    applyFireballSplash(state, attack, actions, healthDeltas);
  }

  const skill = getSkill(String(attack.stats.id));
  const effect = skill?.play?.effect;
  if (!effect) {
    return;
  }

  if (effect === "zhong_shield") {
    source.buffs = source.buffs.filter((buff) => buff.id !== "jin_zhong_zhao");
    source.buffs.push({
      id: "jin_zhong_zhao",
      name: `金钟罩：${getPlayerName(state, attack.targetId)}`,
      stacks: 1,
      sourcePlayerId: attack.targetId
    });

    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${getPlayerName(state, attack.sourceId)} 获得 1 层对 ${getPlayerName(state, attack.targetId)} 的金钟罩`
    });
    return;
  }

  if (effect === "lian_bao_free") {
    addCountingMark(source, "free_lian_bao", "免费连爆机会", 1);
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${getPlayerName(state, attack.sourceId)} 获得 1 次免费连爆机会`
    });
  }
}

function applySkillHitEffectsIfAttackHit(
  state: GameState,
  eventStart: number,
  attack: AttackInstance,
  actions: Record<PlayerId, PlayerActionPlan>,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  if (!attackCountsAsHit(state, eventStart, attack)) {
    return;
  }

  applySkillHitEffects(state, attack, actions, healthDeltas);
}

function attackCountsAsHit(
  state: GameState,
  eventStart: number,
  attack: AttackInstance
): boolean {
  const nonHitBlockKinds = new Set<AttackBlockedEvent["blockKind"]>([
    "block",
    "dodge",
    "invulnerable",
    "shield"
  ]);
  return !state.eventLog.slice(eventStart).some((event) => {
    if (
      event.type !== "attack_blocked" ||
      event.sourceId !== attack.sourceId ||
      event.targetId !== attack.targetId ||
      event.attackName !== attack.stats.name
    ) {
      return false;
    }

    return event.blockKind === undefined || nonHitBlockKinds.has(event.blockKind);
  });
}

function isAttackAttributeEffectImmune(
  state: GameState,
  attack: AttackInstance,
  targetId: PlayerId
): boolean {
  const target = findPlayer(state, targetId);
  if (!target || !playerHasActiveSkill(target, "skill_75_68329")) {
    return false;
  }

  if (getAttackElements(attack.stats).every((element) => element === "physical")) {
    return false;
  }

  revealSkillOnTrigger(state, targetId, "skill_75_68329", "触发圣灵之境");
  return true;
}

function applyFireballSplash(
  state: GameState,
  attack: AttackInstance,
  actions: Record<PlayerId, PlayerActionPlan>,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  const splashStats = fireDamageStats("skill_78_18866", "火球溅射", 1);
  for (const candidate of alivePlayers(state)) {
    if (
      candidate.id === attack.sourceId ||
      candidate.id === attack.targetId ||
      !areAdjacentPlayers(state, attack.targetId, candidate.id)
    ) {
      continue;
    }

    if (getDefenseAction(actions[candidate.id])?.defense === "stone") {
      state.eventLog.push({
        ...createBaseEvent(state, "attack_blocked"),
        type: "attack_blocked",
        sourceId: attack.sourceId,
        targetId: candidate.id,
        attackName: "火球溅射",
        defense: "stone"
      });
      continue;
    }

    addDamage(
      state,
      healthDeltas,
      candidate.id,
      1,
      attack.sourceId,
      "火球溅射",
      splashStats
    );
  }
}

function applyHealthDeltas(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>
): boolean {
  let changed = false;

  for (const [playerId, delta] of healthDeltas.entries()) {
    const player = findPlayer(state, playerId);
    if (!player || player.status !== "alive") {
      continue;
    }

    const before = player.hp;
    player.hp = player.hp - delta.damage + delta.healing;

    if (delta.damage > 0) {
      changed = true;
    }

    if (delta.healing > 0) {
      changed = true;
    }

    if (player.hp !== before) {
      changed = true;
    }

    if (delta.defeatLevel && delta.defeatLevel > 1) {
      finalizePlayerCannotContinue(
        state,
        player,
        [],
        delta.defeatLevel,
        delta.defeatSourceId,
        delta.defeatReason
      );
      changed = true;
    }
  }

  return changed;
}

function updateDeaths(
  state: GameState,
  options: { allowPending?: boolean } = {}
): boolean {
  for (const player of state.players) {
    if (player.status !== "alive") {
      continue;
    }

    if (player.hp > 0) {
      clearPendingDeath(player);
      continue;
    }

    if (!isDeathCandidate(player)) {
      if (player.hp === 0 && playerHasActiveSkill(player, "skill_23_90895")) {
        player.hp += 1;
        clearPendingDeath(player);
        state.eventLog.push({
          ...createBaseEvent(state, "heal"),
          type: "heal",
          sourceId: player.id,
          targetId: player.id,
          amount: 1,
          reason: "神隐红莲"
        });
        continue;
      }

      clearPendingDeath(player);
      continue;
    }

    const fatalDamageEvents = getFatalDamageEvents(state, player.id);

    applyNoReviveFromFatalDamage(state, player, fatalDamageEvents);
    const revivalBlocked = hasNoRevive(player);

    if (!revivalBlocked && player.hp < 0 && playerHasActiveSkill(player, "skill_69_22138")) {
      const before = player.hp;
      player.hp = Math.abs(player.hp);
      clearPendingDeath(player);
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `${player.name} 的绝对值触发：${before} 血变为 ${player.hp} 血`
      });
      continue;
    }

    if (
      !revivalBlocked &&
      playerHasActiveSkill(player, "skill_65_71994") &&
      canRebirthByFire(player, fatalDamageEvents)
    ) {
      reviveToFullHp(state, player, "浴火重生");
      continue;
    }

    if (options.allowPending) {
      markPendingDeath(state, player);
      continue;
    }

    finalizePlayerCannotContinue(state, player, fatalDamageEvents, 1);
  }

  return hasPendingDeaths(state);
}

function isDeathCandidate(
  player: NonNullable<ReturnType<typeof findPlayer>>
): boolean {
  return player.hp < 0 || (player.hp === 0 && playerHasActiveSkill(player, "skill_69_22138"));
}

function canRebirthByFire(
  player: NonNullable<ReturnType<typeof findPlayer>>,
  fatalDamageEvents: DamageEvent[]
): boolean {
  return (
    fatalDamageEvents.some((event) => isFireDamageEvent(event)) ||
    player.cakes >= 4
  );
}

function reviveToFullHp(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  reason: string
): void {
  const before = player.hp;
  const nextHp = getPlayerInitialHp(player);
  player.hp = nextHp;
  clearPendingDeath(player);
  state.eventLog.push({
    ...createBaseEvent(state, "heal"),
    type: "heal",
    sourceId: player.id,
    targetId: player.id,
    amount: Math.max(0, nextHp - before),
    reason
  });
}

function finalizePlayerCannotContinue(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  fatalDamageEvents: DamageEvent[],
  defeatLevel: DefeatLevel = 1,
  sourceId?: PlayerId,
  reason?: string
): void {
  if (
    defeatLevel === 1 &&
    player.hp <= 0 &&
    playerHasActiveSkill(player, "skill_113_88141") &&
    !player.buffs.some((buff) => buff.id === "war_spirit_used")
  ) {
    revealSkillOnUse(state, player.id, "skill_113_88141", "触发无限战意");
    player.buffs.push({
      id: "war_spirit_used",
      name: "无限战意已触发",
      stacks: 1
    });
    player.buffs.push({
      id: "war_spirit",
      name: "无限战意",
      stacks: 1,
      expiresAtRound: state.roundNumber + 3
    });
    clearPendingDeath(player);
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 的无限战意触发：负血量下继续游戏 2 整轮`
    });
    return;
  }

  if (defeatLevel === 1 && player.hp <= 0 && player.buffs.some((buff) => buff.id === "war_spirit")) {
    clearPendingDeath(player);
    return;
  }

  clearPendingDeath(player);
  player.status = "dead";
  player.defeatLevel = defeatLevel;
  player.cakes = 0;
  const event: PlayerDiedEvent = {
    ...createBaseEvent(state, "player_died"),
    type: "player_died",
    playerId: player.id,
    defeatLevel
  };
  if (sourceId) {
    event.sourceId = sourceId;
  }
  if (reason) {
    event.reason = reason;
  }
  state.eventLog.push(event);
  if (defeatLevel === 1) {
    applyDeathWatchSkills(state, player.id, fatalDamageEvents);
  }
}

function applyDeathWatchSkills(
  state: GameState,
  deadPlayerId: PlayerId,
  fatalDamageEvents: DamageEvent[]
): void {
  for (const player of state.players) {
    if (
      player.id === deadPlayerId ||
      player.status !== "alive" ||
      getActiveSkillCount(player, "skill_70_79685") <= 0
    ) {
      continue;
    }

    if (isGlobalSkillActive(state, "skill_12_79004")) {
      continue;
    }

    const healing = fatalDamageEvents.reduce(
      (sum, event) => sum + Math.floor(event.amount / 2),
      0
    ) * getActiveSkillCount(player, "skill_70_79685");
    if (healing <= 0) {
      continue;
    }

    player.hp += healing;
    state.eventLog.push({
      ...createBaseEvent(state, "heal"),
      type: "heal",
      sourceId: player.id,
      targetId: player.id,
      amount: healing,
      reason: "死神之镰"
    });
  }
}

function getFatalDamageEvents(state: GameState, playerId: PlayerId): DamageEvent[] {
  return state.eventLog.filter(
    (event): event is DamageEvent =>
      event.type === "damage" &&
      event.targetId === playerId &&
      event.amount > 0 &&
      event.roundNumber === state.roundNumber &&
      event.turnNumber === state.roundTurnNumber
  );
}

function getFatalSourceIds(state: GameState, playerId: PlayerId): PlayerId[] {
  return Array.from(
    new Set(
      getFatalDamageEvents(state, playerId)
        .map((event) => event.sourceId)
        .filter((sourceId): sourceId is PlayerId => Boolean(sourceId))
    )
  );
}

function isFireDamageEvent(event: DamageEvent): boolean {
  return (
    event.element === "fire" ||
    Boolean(event.elements?.includes("fire")) ||
    Boolean(event.traits?.includes("fire"))
  );
}

function applyNoReviveFromFatalDamage(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  fatalDamageEvents: DamageEvent[]
): void {
  if (hasNoRevive(player) || !isGlobalSkillActive(state, "skill_6_503")) {
    return;
  }

  const sourceIds = Array.from(
    new Set(
      fatalDamageEvents
        .map((event) => event.sourceId)
        .filter((sourceId): sourceId is PlayerId => Boolean(sourceId))
    )
  );
  for (const sourceId of sourceIds) {
    const source = findPlayer(state, sourceId);
    if (!playerHasActiveSkill(source, "skill_6_503")) {
      continue;
    }

    revealSkillOnTrigger(state, sourceId, "skill_6_503", "触发裂魂");
    upsertBuff(player, {
      id: NO_REVIVE_BUFF_ID,
      name: "裂魂",
      stacks: 1
    });
    return;
  }
}

function hasNoRevive(player: { buffs: Array<{ id: string }> }): boolean {
  return player.buffs.some((buff) => buff.id === NO_REVIVE_BUFF_ID);
}

function markPendingDeath(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>
): void {
  const alreadyPending = player.buffs.some((buff) => buff.id === PENDING_DEATH_BUFF_ID);
  upsertBuff(player, {
    id: PENDING_DEATH_BUFF_ID,
    name: "已死亡",
    stacks: 1
  });
  if (alreadyPending) {
    return;
  }
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 已死亡，进入复活阶段`
  });
}

function clearPendingDeath(player: { buffs: Array<{ id: string }> }): void {
  player.buffs = player.buffs.filter((buff) => buff.id !== PENDING_DEATH_BUFF_ID);
}

function hasPendingDeaths(state: GameState): boolean {
  return state.players.some(
    (player) => player.status === "alive" && isPendingDeathPlayer(player)
  );
}

function isPendingDeathWindow(state: GameState): boolean {
  return isRevivalWindow(state);
}

function isRevivalWindow(state: GameState): boolean {
  return (
    state.phase === "action_window" &&
    state.activeTimingPhase === "revival_action" &&
    hasPendingDeaths(state)
  );
}

function isDamageModifyWindow(state: GameState): boolean {
  return (
    state.phase === "action_window" &&
    state.activeTimingPhase === "turn_damage_modify" &&
    (state.pendingDamageItems?.length ?? 0) > 0
  );
}

function isPendingDeathPlayer(player: { hp: number; buffs: Array<{ id: string }> }): boolean {
  return player.buffs.some((buff) => buff.id === PENDING_DEATH_BUFF_ID);
}

function playerCanUseRevivalAction(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>
): boolean {
  if (!isPendingDeathPlayer(player)) {
    return false;
  }

  return ACTIVE_REVIVAL_SKILL_IDS.some((skillId) => {
    if (!playerHasActiveSkill(player, skillId)) {
      return false;
    }
    const play = getSkillPlay(skillId);
    if (!play) {
      return false;
    }
    if (skillId === "skill_24_71363" && (player.hp !== 0 || player.cakes < play.cost)) {
      return false;
    }
    return (
      !play.usesPerGame ||
      getSkillUseCount(player, skillId) < play.usesPerGame * getActiveSkillCount(player, skillId)
    );
  });
}

function isFrostBladeAttackActive(player: { buffs: Array<{ id: string }> } | undefined): boolean {
  return Boolean(player?.buffs.some((buff) => buff.id === FROST_BLADE_ATTACK_BUFF_ID));
}

function clearRoundEndSkillSuppressionBuffs(state: GameState): boolean {
  let clearedSuppression = false;
  for (const player of state.players) {
    player.buffs = player.buffs.filter((buff) => {
      if (buff.id === FROST_BLADE_ATTACK_BUFF_ID) {
        return false;
      }

      const collapseEndRound = getRoundTimedBuffEndRound(buff.id, COLLAPSE_BUFF_PREFIX);
      if (collapseEndRound !== undefined) {
        if (collapseEndRound <= state.roundNumber) {
          clearedSuppression = true;
        }
        return collapseEndRound > state.roundNumber;
      }

      const disabledEndRound = getRoundTimedBuffEndRound(buff.id, SKILL_DISABLED_BUFF_PREFIX);
      if (disabledEndRound !== undefined) {
        if (disabledEndRound <= state.roundNumber) {
          clearedSuppression = true;
        }
        return disabledEndRound > state.roundNumber;
      }

      return true;
    });
  }

  if (clearedSuppression) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: "轮末判定点结束，沦陷或技能失效状态解除"
    });
  }
  return clearedSuppression;
}

function getRoundTimedBuffEndRound(id: string, prefix: string): number | undefined {
  if (!id.startsWith(prefix)) {
    return undefined;
  }
  const value = Number(id.slice(prefix.length));
  return Number.isFinite(value) ? value : undefined;
}

function clearTurnTemporaryBuffs(state: GameState): void {
  const temporaryBuffIds = new Set([
    "temp_invulnerable",
    "temp_shield_normal",
    "temp_shield_skill",
    REVERSAL_TURN_BUFF_ID,
    FLASH_DODGE_BUFF_ID,
    SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID
  ]);

  for (const player of state.players) {
    player.buffs = player.buffs.filter(
      (buff) =>
        !temporaryBuffIds.has(buff.id) &&
        (buff.expiresAtRound === undefined || buff.expiresAtRound > state.roundNumber) &&
        (buff.expiresAtTurn === undefined || buff.expiresAtTurn > state.turnNumber)
    );
  }
}

function endRound(
  state: GameState,
  options: { skipSmallSpaceTick?: boolean } = {}
): void {
  state.eventLog.push({
    ...createBaseEvent(state, "round_ended"),
    type: "round_ended",
    reason: "有人血量发生变化，所有饼清零"
  });

  applyRoundEndSkills(state);
  updateDeaths(state);

  const preservedCakes = new Map<PlayerId, number>();
  for (const player of state.players) {
    if (
      player.status === "alive" &&
      playerHasActiveSkill(player, "skill_52_22171") &&
      !player.buffs.some((buff) => buff.id === `used_attack_round:${state.roundNumber}`)
    ) {
      preservedCakes.set(player.id, Math.floor(player.cakes / 3));
    }
  }

  for (const player of state.players) {
    if (player.cakes > 0) {
      changeCakes(state, player.id, 0, "轮结束清零");
    }
  }

  for (const [playerId, preserved] of preservedCakes.entries()) {
    if (preserved > 0) {
      changeCakes(state, playerId, preserved, "克己保留");
    }
  }

  if (clearRoundEndSkillSuppressionBuffs(state)) {
    updateDeaths(state);
  }

  state.roundNumber += 1;
  state.roundTurnNumber = 1;
  if (!options.skipSmallSpaceTick) {
    tickSmallSpaces(state);
  }
}

function applyRoundStartSkills(state: GameState): void {
  for (const player of state.players) {
    if (player.status !== "alive") {
      continue;
    }

    const dictatorCount = getActiveSkillCount(player, "skill_53_62958");
    if (dictatorCount > 0) {
      changeCakes(state, player.id, player.cakes + dictatorCount, `独裁轮初+${dictatorCount}饼`);
    }

    const legacyCount = getActiveSkillCount(player, "skill_49_75347");
    if (
      legacyCount > 0 &&
      player.buffs.some((buff) => buff.id === `took_damage_round:${state.roundNumber - 1}`)
    ) {
      changeCakes(state, player.id, player.cakes + 2 * legacyCount, `遗计轮初+${2 * legacyCount}饼`);
    }

    const qinglianBuff = player.buffs.find(
      (buff) => buff.id === `qinglian_cake_round:${state.roundNumber}`
    );
    if (qinglianBuff) {
      changeCakes(state, player.id, player.cakes + qinglianBuff.stacks, "神隐青莲轮初加饼");
    }

    const coagulationBuff = player.buffs.find(
      (buff) => buff.id === `coagulation_cake_round:${state.roundNumber}`
    );
    if (coagulationBuff) {
      changeCakes(state, player.id, player.cakes + coagulationBuff.stacks, "凝血之力轮初加饼");
    }

    const traumaBuff = player.buffs.find(
      (buff) => buff.id === `trauma_converge:${state.roundNumber}`
    );
    if (traumaBuff) {
      changeCakes(state, player.id, player.cakes + traumaBuff.stacks, `创伤聚合轮初+${traumaBuff.stacks}饼`);
      if (!isGlobalSkillActive(state, "skill_12_79004")) {
        const healing = 3 * traumaBuff.stacks;
        player.hp += healing;
        state.eventLog.push({
          ...createBaseEvent(state, "heal"),
          type: "heal",
          sourceId: player.id,
          targetId: player.id,
          amount: healing,
          reason: "创伤聚合"
        });
      }
    }
  }
}

function applyRoundEndSkills(state: GameState): void {
  if (state.roundNumber % 3 !== 0) {
    return;
  }

  for (const player of state.players) {
    if (player.status !== "alive") {
      continue;
    }

    const sanctuaryCount = getActiveSkillCount(player, "skill_71_40087");
    if (sanctuaryCount > 0) {
      if (isGlobalSkillActive(state, "skill_12_79004")) {
        state.eventLog.push({
          ...createBaseEvent(state, "system"),
          type: "system",
          message: `${player.name} 的圣域回血被血之哀压制`
        });
      } else {
        const healing = 3 * sanctuaryCount;
        player.hp += healing;
        state.eventLog.push({
          ...createBaseEvent(state, "heal"),
          type: "heal",
          sourceId: player.id,
          targetId: player.id,
          amount: healing,
          reason: "圣域"
        });
      }
    }

    const xieyuCount = getActiveSkillCount(player, "skill_72_53933");
    if (xieyuCount > 0) {
      const selectedTargetIds = player.buffs
        .filter((buff) => buff.id === "xieyu_target" && buff.sourcePlayerId)
        .map((buff) => buff.sourcePlayerId!)
        .slice(0, xieyuCount);
      const fallbackTargets = alivePlayers(state)
        .filter((candidate) => candidate.id !== player.id)
        .sort((a, b) => b.hp - a.hp);
      player.buffs = player.buffs.filter((buff) => buff.id !== "xieyu_target");
      for (let index = 0; index < xieyuCount; index += 1) {
        const selectedTargetId = selectedTargetIds[index];
        const selectedTarget = selectedTargetId ? findPlayer(state, selectedTargetId) : undefined;
        const target =
          selectedTarget?.status === "alive" && selectedTarget.id !== player.id
            ? selectedTarget
            : fallbackTargets[0];
      if (!target) {
        continue;
      }
      target.hp -= 1;
      if (!isGlobalSkillActive(state, "skill_12_79004")) {
        player.hp += 1;
      }
      state.eventLog.push({
        ...createBaseEvent(state, "damage"),
        type: "damage",
        sourceId: player.id,
        targetId: target.id,
        amount: 1,
        attackName: "邪域"
      });
      }
    }
  }
}

function applyTurnStartSkills(state: GameState): void {
  if (state.roundTurnNumber % 4 !== 0) {
    return;
  }

  for (const player of state.players) {
    const holyWaterCount = getActiveSkillCount(player, "skill_63_72549");
    if (player.status === "alive" && holyWaterCount > 0) {
      changeCakes(state, player.id, player.cakes + holyWaterCount, `圣水收集器回合初+${holyWaterCount}饼`);
    }
  }
}

function changeCakes(
  state: GameState,
  playerId: PlayerId,
  nextCakes: number,
  reason: string
): void {
  const player = findPlayer(state, playerId);
  if (!player) {
    return;
  }

  const before = player.cakes;
  player.cakes = Math.max(0, nextCakes);
  if (before === player.cakes) {
    return;
  }

  state.eventLog.push({
    ...createBaseEvent(state, "cake_changed"),
    type: "cake_changed",
    playerId,
    before,
    after: player.cakes,
    reason
  });
}

function calculateClashDamage(high: AttackStats, low: AttackStats): number {
  if (high.power >= INFINITE_DAMAGE) {
    return INFINITE_DAMAGE;
  }

  if (high.level <= 0) {
    return high.power;
  }

  return Math.ceil(((high.level - low.level) / high.level) * high.power);
}

function addDamage(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  targetId: PlayerId,
  amount: number,
  sourceId?: PlayerId,
  attackName?: string,
  stats?: AttackStats,
  context: DamageContext = {}
): void {
  const target = findPlayer(state, targetId);
  if (!target || amount <= 0) {
    return;
  }

  const attackDefeatLevel = getAttackDefeatLevel(stats);
  if (attackDefeatLevel) {
    addDefeatEffect(
      state,
      healthDeltas,
      targetId,
      attackDefeatLevel,
      sourceId,
      attackName ?? stats?.name ?? "无法继续游戏效果",
      stats
    );
    return;
  }

  const sourceSkill = stats?.isSkill ? getSkill(stats.id) : undefined;
  if (sourceSkill && isPurificationImmune(state, targetId, sourceSkill, sourceId)) {
    return;
  }

  const lockedAdjusted = applyLockedDamageRules(
    state,
    targetId,
    amount,
    sourceId,
    attackName,
    stats,
    context
  );
  if (lockedAdjusted <= 0) {
    return;
  }

  const normalizedAmount = Math.min(lockedAdjusted, INFINITE_DAMAGE);
  if (sourceId && absorbWithTemporaryProtectionV2(state, targetId, sourceId, normalizedAmount, attackName, stats, context)) {
    return;
  }

  if (sourceId && absorbWithShieldV2(state, targetId, sourceId, normalizedAmount, attackName)) {
    return;
  }

  const finalAmount = absorbWithDefenseValueV2(
    state,
    targetId,
    normalizedAmount,
    attackName,
    stats,
    sourceId
  );
  if (finalAmount <= 0) {
    return;
  }

  if (nullifyFrostBladeDamage(state, targetId, finalAmount, sourceId, attackName, stats)) {
    return;
  }

  queuePendingDamage(state, targetId, finalAmount, sourceId, attackName, stats, context);
}

function queuePendingDamage(
  state: GameState,
  targetId: PlayerId,
  amount: number,
  sourceId: PlayerId | undefined,
  attackName: string | undefined,
  stats: AttackStats | undefined,
  context: DamageContext
): void {
  const item: PendingDamageItem = {
    id: createId("pending_damage"),
    targetId,
    amount,
    fromAttack: Boolean(context.fromAttack),
    isLastHit: Boolean(context.isLastHit)
  };
  if (sourceId) {
    item.sourceId = sourceId;
  }
  if (attackName) {
    item.attackName = attackName;
  }
  if (stats) {
    item.element = stats.element;
    item.elements = getAttackElements(stats);
    item.traits = [...stats.traits];
  }
  state.pendingDamageItems = [...(state.pendingDamageItems ?? []), item];
}

function applyPendingDamageItems(state: GameState): boolean {
  const pending = state.pendingDamageItems ?? [];
  if (pending.length === 0) {
    return false;
  }

  state.pendingDamageItems = [];
  const healthDeltas = new Map<PlayerId, HealthDelta>();
  for (const item of pending) {
    const target = findPlayer(state, item.targetId);
    if (!target || target.status !== "alive" || item.amount <= 0) {
      continue;
    }

    recordDamageDelta(state, healthDeltas, item.targetId, item.amount);
    const event: DamageEvent = {
      ...createBaseEvent(state, "damage"),
      type: "damage",
      targetId: item.targetId,
      amount: item.amount
    };
    if (item.sourceId) {
      event.sourceId = item.sourceId;
    }
    if (item.attackName) {
      event.attackName = item.attackName;
    }
    if (item.element) {
      event.element = item.element;
    }
    if (item.elements) {
      event.elements = [...item.elements];
    }
    if (item.traits) {
      event.traits = [...item.traits];
    }
    state.eventLog.push(event);
    rememberDamageTaken(state, item.targetId, item.sourceId, item.amount);

    const source = item.sourceId ? findPlayer(state, item.sourceId) : undefined;
    if (
      item.fromAttack &&
      source &&
      playerHasActiveSkill(source, "skill_116_97172") &&
      source.buffs.some((buff) => buff.id === `revenge_target:${item.targetId}`)
    ) {
      addCountingMark(source, "revenge_hit_count", "复仇计数", 1);
      source.buffs = source.buffs.filter((buff) => buff.id !== `revenge_target:${item.targetId}`);
      const counter = source.buffs.find((buff) => buff.id === "revenge_hit_count");
      if ((counter?.stacks ?? 0) >= 5) {
        revealSkillOnWin(state, source.id, "skill_116_97172", "复仇之刃胜利");
        upsertBuff(source, {
          id: "instant_win:revenge",
          name: "复仇之刃胜利",
          stacks: 1
        });
      }
    }

    const imperialFlameCount = getActiveSkillCount(target, "skill_76_76044");
    if (item.sourceId && imperialFlameCount > 0 && item.attackName !== "帝炎之境") {
      for (let index = 0; index < imperialFlameCount; index += 1) {
        addDamage(
          state,
          healthDeltas,
          item.sourceId,
          1,
          item.targetId,
          "帝炎之境",
          fireDamageStats("skill_76_76044", "帝炎之境", 1)
        );
      }
    }

    const bloodthirstCount = getActiveSkillCount(source, "skill_46_3651");
    if (item.fromAttack && source && bloodthirstCount > 0 && item.amount < INFINITE_DAMAGE) {
      const healing = Math.floor(item.amount / 4);
      if (healing > 0) {
        addHeal(state, healthDeltas, source.id, healing * bloodthirstCount, source.id, "嗜血");
      }
    }
  }

  return applyHealthDeltas(state, healthDeltas);
}

function addDefeatEffect(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  targetId: PlayerId,
  defeatLevel: DefeatLevel,
  sourceId?: PlayerId,
  reason?: string,
  stats?: AttackStats
): void {
  const target = findPlayer(state, targetId);
  if (!target || target.status !== "alive") {
    return;
  }

  if (defeatLevel <= 1) {
    addDamage(
      state,
      healthDeltas,
      targetId,
      INFINITE_DAMAGE,
      sourceId,
      reason,
      stats
    );
    return;
  }

  if (isDefeatEffectBlocked(state, targetId, sourceId, reason, stats)) {
    return;
  }

  const delta = ensureDelta(healthDeltas, targetId);
  if (!delta.defeatLevel || defeatLevel > delta.defeatLevel) {
    delta.defeatLevel = defeatLevel;
    if (reason) {
      delta.defeatReason = reason;
    } else {
      delete delta.defeatReason;
    }
    if (sourceId) {
      delta.defeatSourceId = sourceId;
    } else {
      delete delta.defeatSourceId;
    }
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${target.name} 受到${reason ? ` ${reason} 的` : ""}${DEFEAT_LEVEL_LABELS[defeatLevel]}效果`
  });
}

function isDefeatEffectBlocked(
  state: GameState,
  targetId: PlayerId,
  sourceId: PlayerId | undefined,
  reason: string | undefined,
  stats: AttackStats | undefined
): boolean {
  const target = findPlayer(state, targetId);
  if (!target) {
    return true;
  }

  const sourceSkill = stats?.isSkill ? getSkill(stats.id) : undefined;
  if (sourceSkill && isPurificationImmune(state, targetId, sourceSkill, sourceId)) {
    return true;
  }

  if (
    playerHasActiveSkill(target, "skill_75_68329") &&
    stats &&
    !isNonSpellDamage(stats)
  ) {
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: reason ?? stats.name,
      blockKind: "immune",
      protectionName: "圣灵之境",
      protectionSkillId: "skill_75_68329"
    });
    return true;
  }

  const earthHeartCount = getActiveSkillCount(target, "skill_39_77400");
  if (stats && earthHeartCount > 0 && attackHasElement(stats, "electric")) {
    addDefenseValue(state, targetId, 4 * earthHeartCount, "大地之心");
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: reason ?? stats.name,
      blockKind: "immune",
      protectionName: "大地之心",
      protectionSkillId: "skill_39_77400"
    });
    return true;
  }

  return false;
}

function isDefeatEffectBlockedLegacy(
  _state: GameState,
  _targetId: PlayerId,
  _sourceId: PlayerId | undefined,
  _reason: string | undefined,
  _stats: AttackStats | undefined
): boolean {
  return false;
}

function nullifyFrostBladeDamage(
  state: GameState,
  targetId: PlayerId,
  finalAmount: number,
  sourceId: PlayerId | undefined,
  attackName: string | undefined,
  stats: AttackStats | undefined
): boolean {
  if (!stats?.traits.includes("frost_blade") || finalAmount <= 0) {
    return false;
  }

  const target = findPlayer(state, targetId);
  const source = sourceId ? findPlayer(state, sourceId) : undefined;
  if (!target || !source) {
    return false;
  }

  state.turnHealthChanged = true;
  const frostBlade = getSkill("skill_18_34323");
  const immune = frostBlade
    ? isSkillEffectImmune(state, target.id, frostBlade, source.id)
    : false;
  if (!immune) {
    upsertBuff(target, {
      id: `${SKILL_DISABLED_BUFF_PREFIX}${state.roundNumber + 1}`,
      name: "技能失效",
      stacks: 1,
      sourcePlayerId: source.id
    });
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: immune
      ? `${source.name} 的寒冰剑命中 ${target.name}，原本 ${finalAmount} 点伤害归零，但技能失效状态被免疫；本轮仍然重开`
      : `${source.name} 的寒冰剑命中 ${target.name}，原本 ${finalAmount} 点${attackName ?? stats.name}伤害归零，${target.name} 技能失效 1 轮`
  });
  return true;
}

function applyLockedDamageRules(
  state: GameState,
  targetId: PlayerId,
  amount: number,
  sourceId: PlayerId | undefined,
  attackName: string | undefined,
  stats: AttackStats | undefined,
  context: DamageContext = {}
): number {
  const target = findPlayer(state, targetId);
  if (!target) {
    return 0;
  }
  const source = sourceId ? findPlayer(state, sourceId) : undefined;
  const ignoreProtection = Boolean(stats?.traits.includes("ignore_protection"));

  if (
    context.isLastHit &&
    isAttackDamage(stats, context) &&
    playerHasActiveSkill(target, "skill_26_70243")
  ) {
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: attackName ?? stats?.name ?? "攻击",
      blockKind: "invulnerable",
      protectionName: "无敌",
      protectionSkillId: "skill_26_70243"
    });
    return 0;
  }

  if (
    playerHasActiveSkill(target, "skill_75_68329") &&
    stats &&
    !isNonSpellDamage(stats)
  ) {
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: attackName ?? stats.name,
      blockKind: "immune",
      protectionName: "圣灵之境",
      protectionSkillId: "skill_75_68329"
    });
    return 0;
  }

  if (
    !ignoreProtection &&
    isAttackDamage(stats, context) &&
    playerHasActiveSkill(target, "skill_32_19017") &&
    state.roundTurnNumber <= 2
  ) {
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: attackName ?? stats?.name ?? "攻击",
      blockKind: "invulnerable",
      protectionName: "无敌",
      protectionSkillId: "skill_32_19017"
    });
    return 0;
  }

  if (
    !ignoreProtection &&
    sourceId &&
    isAttackDamage(stats, context) &&
    playerHasActiveSkill(target, "skill_99_65551") &&
    alivePlayers(state).length > 3 &&
    areAdjacentPlayers(state, targetId, sourceId)
  ) {
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: attackName ?? stats?.name ?? "攻击",
      blockKind: "invulnerable",
      protectionName: "无敌",
      protectionSkillId: "skill_99_65551"
    });
    return 0;
  }

  const earthHeartCount = getActiveSkillCount(target, "skill_39_77400");
  if (stats && earthHeartCount > 0 && attackHasElement(stats, "electric")) {
    addDefenseValue(state, targetId, 4 * earthHeartCount, "大地之心");
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: attackName ?? stats.name,
      blockKind: "immune",
      protectionName: "大地之心",
      protectionSkillId: "skill_39_77400"
    });
    return 0;
  }

  if (
    getActiveSkillCount(target, "skill_51_92674") > 0 &&
    stats &&
    !ignoreProtection &&
    ["sha", "wan_jian", "nan_man"].includes(String(stats.id))
  ) {
    const isFire = isFireDamage(stats);
    if (!isFire) {
      pushAttackBlockedEvent(state, {
        sourceId,
        targetId,
        attackName: attackName ?? stats.name,
        blockKind: "immune",
        protectionName: "藤甲",
        protectionSkillId: "skill_51_92674"
      });
      return 0;
    }
  }

  if (
    !ignoreProtection &&
    getActiveSkillCount(target, "skill_51_92674") > 0 &&
    isFireDamage(stats) &&
    amount < INFINITE_DAMAGE
  ) {
    revealSkillOnTrigger(state, targetId, "skill_51_92674", "触发藤甲");
    amount += getActiveSkillCount(target, "skill_51_92674");
  }

  const baguaCount = getActiveSkillCount(target, "skill_50_50034");
  if (!ignoreProtection && baguaCount > 0 && amount < INFINITE_DAMAGE) {
    revealSkillOnTrigger(state, targetId, "skill_50_50034", "触发八卦阵");
    amount = Math.max(0, amount - baguaCount);
  }

  const gudingCount = getActiveSkillCount(source, "skill_29_96125");
  if (
    gudingCount > 0 &&
    isAttackDamage(stats, context) &&
    target.cakes <= 0 &&
    amount < INFINITE_DAMAGE
  ) {
    amount *= 2 ** gudingCount;
  }

  const sniperCount = getActiveSkillCount(source, "skill_28_42646");
  if (
    sniperCount > 0 &&
    context.isLastHit &&
    amount < INFINITE_DAMAGE
  ) {
    amount *= 2 ** sniperCount;
  }

  if (
    playerHasActiveSkill(target, "skill_114_87583") &&
    target.hp - amount < 0 &&
    amount !== 1 &&
    amount < INFINITE_DAMAGE
  ) {
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: attackName ?? stats?.name ?? "攻击",
      blockKind: "immune",
      protectionName: "不死金身",
      protectionSkillId: "skill_114_87583"
    });
    return 0;
  }

  return amount;
}

function absorbWithTemporaryProtectionV2(
  state: GameState,
  targetId: PlayerId,
  sourceId: PlayerId,
  amount: number,
  attackName: string | undefined,
  stats: AttackStats | undefined,
  context: DamageContext
): boolean {
  const target = findPlayer(state, targetId);
  if (!target || amount <= 0 || !isAttackDamage(stats, context)) {
    return false;
  }

  const protection = target.buffs.find((buff) => {
    if (buff.stacks <= 0) {
      return false;
    }
    if (buff.id === FLASH_DODGE_BUFF_ID || buff.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID) {
      return true;
    }
    if (buff.id === "temp_invulnerable") {
      return true;
    }
    if (buff.id === "temp_shield_normal") {
      return !stats?.isSkill;
    }
    if (buff.id === "temp_shield_skill") {
      return Boolean(stats?.isSkill);
    }
    return false;
  });
  if (!protection) {
    return false;
  }

  const blockKind =
    protection.id === FLASH_DODGE_BUFF_ID
      ? "dodge"
      : protection.id === "temp_shield_normal" || protection.id === "temp_shield_skill"
        ? "shield"
        : protection.sourcePlayerId === "skill_25_51277" ||
            protection.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID
          ? "immune"
          : "invulnerable";
  const protectionName =
    protection.id === FLASH_DODGE_BUFF_ID
      ? "闪现"
      : protection.id === "temp_shield_normal"
        ? "神罩"
        : protection.id === "temp_shield_skill"
          ? "鬼罩"
          : protection.sourcePlayerId === "skill_25_51277"
            ? "暗影盾"
            : protection.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID
              ? "六芒星"
              : "无敌";
  pushAttackBlockedEvent(state, {
    sourceId,
    targetId,
    attackName: attackName ?? stats?.name ?? "攻击",
    blockKind,
    protectionName
  });
  return true;
}

function absorbWithGhostSkillShieldV2(
  state: GameState,
  targetId: PlayerId,
  sourceId: PlayerId,
  attackName: string | undefined,
  stats: AttackStats | undefined
): boolean {
  const target = findPlayer(state, targetId);
  if (
    !target ||
    !stats?.isSkill ||
    getAttackDefeatLevel(stats) !== undefined ||
    !target.buffs.some((buff) => buff.id === "temp_shield_skill" && buff.stacks > 0)
  ) {
    return false;
  }

  pushAttackBlockedEvent(state, {
    sourceId,
    targetId,
    attackName: attackName ?? stats.name,
    blockKind: "shield",
    protectionName: "鬼罩"
  });
  return true;
}

function absorbWithShieldV2(
  state: GameState,
  targetId: PlayerId,
  sourceId: PlayerId,
  amount: number,
  attackName: string | undefined
): boolean {
  const target = findPlayer(state, targetId);
  if (!target || amount <= 0 || amount > INFINITE_DAMAGE) {
    return false;
  }

  const buffIndex = target.buffs.findIndex(
    (buff) => buff.id === "jin_zhong_zhao" && buff.sourcePlayerId === sourceId && buff.stacks > 0
  );
  if (buffIndex === -1) {
    return false;
  }

  const buff = target.buffs[buffIndex]!;
  buff.stacks -= 1;
  if (buff.stacks <= 0) {
    target.buffs.splice(buffIndex, 1);
  }

  pushAttackBlockedEvent(state, {
    sourceId,
    targetId,
    attackName: attackName ?? "攻击",
    blockKind: "shield",
    protectionName: "金钟罩"
  });
  return true;
}

function addDefenseValue(
  state: GameState,
  playerId: PlayerId,
  amount: number,
  reason: string
): void {
  const player = findPlayer(state, playerId);
  if (!player || amount <= 0) {
    return;
  }

  const existing = player.buffs.find((buff) => buff.id === "defense_value");
  if (existing) {
    existing.stacks += amount;
  } else {
    player.buffs.push({
      id: "defense_value",
      name: "防御值",
      stacks: amount
    });
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 获得 ${amount} 点防御值（${reason}）`
  });
}

function absorbWithDefenseValueV2(
  state: GameState,
  targetId: PlayerId,
  amount: number,
  attackName: string | undefined,
  stats: AttackStats | undefined,
  sourceId?: PlayerId
): number {
  const target = findPlayer(state, targetId);
  if (!target || amount <= 0 || amount >= INFINITE_DAMAGE || !isNonSpellDamage(stats)) {
    return amount;
  }

  const defense = target.buffs.find((buff) => buff.id === "defense_value" && buff.stacks > 0);
  if (!defense) {
    return amount;
  }

  const absorbed = Math.min(defense.stacks, amount);
  defense.stacks -= absorbed;
  target.buffs = target.buffs.filter((buff) => buff.stacks > 0);
  pushAttackBlockedEvent(state, {
    sourceId,
    targetId,
    attackName: attackName ?? stats?.name ?? "伤害",
    blockKind: "reduce",
    protectionName: `防御值:${absorbed}`
  });
  return amount - absorbed;
}

function isNonSpellDamage(stats: AttackStats | undefined): boolean {
  const elements = getAttackElements(stats);
  return elements.length === 1 && elements[0] === "physical";
}

function isAttackDamage(
  stats: AttackStats | undefined,
  context: DamageContext
): boolean {
  return Boolean(stats && context.fromAttack);
}

function getAttackDefeatLevel(stats: AttackStats | undefined): DefeatLevel | undefined {
  if (!stats) {
    return undefined;
  }

  if (stats.traits.includes("defeat_explode")) {
    return 5;
  }

  if (stats.traits.includes("defeat_execute")) {
    return 4;
  }

  if (stats.traits.includes("defeat_vanish")) {
    return 3;
  }

  if (stats.traits.includes("defeat_retire") || stats.power >= RETIRE_EFFECT_POWER) {
    return 2;
  }

  return undefined;
}

function isFireDamage(stats: AttackStats | undefined): boolean {
  return attackHasElement(stats, "fire");
}

function addHeal(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  targetId: PlayerId,
  amount: number,
  sourceId: PlayerId | undefined,
  reason: string
): void {
  if (amount <= 0) {
    return;
  }

  if (isGlobalSkillActive(state, "skill_12_79004")) {
    for (const owner of activePlayersWithSkill(state, "skill_12_79004")) {
      revealSkillOnTrigger(state, owner.id, "skill_12_79004", "触发血之哀");
    }
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${getPlayerName(state, targetId)} \u7684\u56de\u8840\u88ab\u8840\u4e4b\u54c0\u538b\u5236`
    });
    return;
  }

  const delta = ensureDelta(healthDeltas, targetId);
  delta.healing += amount;
  const event: HealEvent = {
    ...createBaseEvent(state, "heal"),
    type: "heal",
    targetId,
    amount,
    reason
  };
  if (sourceId) {
    event.sourceId = sourceId;
  }
  state.eventLog.push(event);
}

function recordDamageDelta(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  targetId: PlayerId,
  amount: number
): void {
  const delta = ensureDelta(healthDeltas, targetId);
  const target = findPlayer(state, targetId);
  if (
    playerHasActiveSkill(target, "skill_38_81245") &&
    amount < INFINITE_DAMAGE &&
    delta.damage > 0
  ) {
    delta.damage = Math.min(delta.damage, amount);
    return;
  }

  delta.damage += amount;
}

function rememberDamageTaken(
  state: GameState,
  targetId: PlayerId,
  sourceId: PlayerId | undefined,
  amount: number
): void {
  const target = findPlayer(state, targetId);
  if (!target) {
    return;
  }

  upsertBuff(target, {
    id: `took_damage_round:${state.roundNumber}`,
    name: "本轮受伤",
    stacks: 1,
    expiresAtRound: state.roundNumber + 2
  });
  addCountingMark(
    target,
    `damage_taken_round:${state.roundNumber}`,
    "本轮累计受伤",
    amount
  );
  const damageTakenBuff = target.buffs.find(
    (buff) => buff.id === `damage_taken_round:${state.roundNumber}`
  );
  if (damageTakenBuff) {
    damageTakenBuff.expiresAtRound = state.roundNumber + 2;
  }

  const crossGuardCount = getActiveSkillCount(target, "skill_73_76567");
  if (crossGuardCount > 0) {
    addCountingMark(target, "huyou_mark", "护佑印记", crossGuardCount);
    addCountingMark(target, "cross_mark", "十字印记", crossGuardCount);
  }

  const traumaCount = getActiveSkillCount(target, "skill_120_85509");
  if (traumaCount > 0) {
    const traumaBuffId = `trauma_converge:${state.roundNumber + 3}`;
    addCountingMark(target, traumaBuffId, "创伤聚合", traumaCount);
    const traumaBuff = target.buffs.find((buff) => buff.id === traumaBuffId);
    if (traumaBuff) {
      traumaBuff.expiresAtRound = state.roundNumber + 4;
    }
  }

  if (playerHasActiveSkill(target, "skill_116_97172") && sourceId && sourceId !== targetId) {
    upsertBuff(target, {
      id: `revenge_target:${sourceId}`,
      name: `复仇目标：${getPlayerName(state, sourceId)}`,
      stacks: 1
    });
  }
}

function getRoundDamageTaken(
  player: { buffs: Array<{ id: string; stacks: number }> },
  roundNumber: number
): number {
  return player.buffs.find((buff) => buff.id === `damage_taken_round:${roundNumber}`)?.stacks ?? 0;
}

function coagulationIntervalBuffId(
  roundNumber: number,
  timingPhase: SkillTimingPhase
): string {
  return `coagulation_used_interval:${roundNumber}:${timingPhase}`;
}

function addScheduledCakeBuff(
  player: { buffs: Array<{ id: string; name: string; stacks: number; expiresAtRound?: number }> },
  id: string,
  name: string,
  amount: number,
  expiresAtRound: number
): void {
  const existing = player.buffs.find((buff) => buff.id === id);
  if (existing) {
    existing.stacks += amount;
    existing.expiresAtRound = expiresAtRound;
    return;
  }

  player.buffs.push({
    id,
    name,
    stacks: amount,
    expiresAtRound
  });
}

function ensureDelta(
  healthDeltas: Map<PlayerId, HealthDelta>,
  playerId: PlayerId
): HealthDelta {
  const existing = healthDeltas.get(playerId);
  if (existing) {
    return existing;
  }

  const next: HealthDelta = {
    damage: 0,
    healing: 0
  };
  healthDeltas.set(playerId, next);
  return next;
}

function isGlobalSkillActive(state: GameState, skillId: string): boolean {
  const brokenByPoE = alivePlayers(state).some((player) =>
    playerHasActiveSkill(player, "skill_9_93219")
  );
  if (brokenByPoE) {
    return false;
  }

  return activePlayersWithSkill(state, skillId).length > 0;
}

function activePlayersWithSkill(state: GameState, skillId: string): ReturnType<typeof alivePlayers> {
  return alivePlayers(state).filter((player) => playerHasActiveSkill(player, skillId));
}

function areAdjacentPlayers(
  state: GameState,
  playerId: PlayerId,
  otherPlayerId: PlayerId
): boolean {
  const alive = alivePlayers(state);
  const index = alive.findIndex((player) => player.id === playerId);
  const otherIndex = alive.findIndex((player) => player.id === otherPlayerId);
  if (index === -1 || otherIndex === -1 || alive.length <= 3) {
    return false;
  }

  return (
    otherIndex === (index + 1) % alive.length ||
    otherIndex === (index - 1 + alive.length) % alive.length
  );
}

function areNeighborPlayers(
  state: GameState,
  playerId: PlayerId,
  otherPlayerId: PlayerId
): boolean {
  const alive = alivePlayers(state);
  const index = alive.findIndex((player) => player.id === playerId);
  const otherIndex = alive.findIndex((player) => player.id === otherPlayerId);
  if (index === -1 || otherIndex === -1 || alive.length <= 1) {
    return false;
  }

  return (
    otherIndex === (index + 1) % alive.length ||
    otherIndex === (index - 1 + alive.length) % alive.length
  );
}

function consumeSourceMark(
  player: { buffs: Array<{ id: string; stacks: number }> } | undefined,
  buffId: string
): boolean {
  if (!player) {
    return false;
  }

  const buff = player.buffs.find((item) => item.id === buffId && item.stacks > 0);
  if (!buff) {
    return false;
  }

  buff.stacks -= 1;
  player.buffs = player.buffs.filter((item) => item.stacks > 0);
  return true;
}

function getPlayerName(state: GameState, playerId: PlayerId): string {
  return findPlayer(state, playerId)?.name ?? "未知玩家";
}

function formatDamage(amount: number): string {
  return amount >= INFINITE_DAMAGE ? "∞" : String(amount);
}

