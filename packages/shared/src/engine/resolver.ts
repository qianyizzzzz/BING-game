import { getTraumaDueRound } from "./statusOverview";
import {
  AttackElement,
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
  EXECUTE_EFFECT_POWER,
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
import { addIceFireMarks, getAttackMarkKind, getAttackMarkChoices, queueAttackMarks, recordIceFireDefenses, recordSolarDefenses,
  recordStarRageDefenses, spendStarRageMarks, STAR_RAGE_ID, STAR_RAGE_MARK_ID, STAR_RAGE_SIX_STAR } from "./attackMarks";
import { SPELL_DAMAGE_NAMES, spellDamageMultiplier } from "./spellDamage";
import { isAttackDamageItem, isDamageWithinLimit, pendingDamageValue, setPendingDamageValue } from "./damageKinds";
import {
  addCombatValues, attackLevelValue, attackPowerValue, calculateClashValue, combatValue,
  compareCombatValues, formatCombatValue, fromLegacyCombatStat, getPointDamageDefeatLevel,
  INFINITY_VALUE, RETIRE_VALUE, isUnboundedCombatValue, multiplyCombatValues, projectCombatValue,
  roundCombatValue, scaleCombatValue, subtractCombatValues, withAttackPower
} from "./combatValues";
import type { CombatValue } from "./combatValues";
import { getPlayerHpValue, setPlayerHpValue } from "./infiniteValues";
import { getFatalDamageEvents, getSkillDamageSourceIds } from "./damageAttribution";
import { applyJihanSkillSeal, getJihanCards, getJihanReboundDamageSources, jihanScaledValue, recordJihanDamage } from "./jihan";
import { BIG_CARD_SKILLS, FENTIAN_ATTACK_ID, LAVA_ARMOR_ID, FENSHI_FLAMES_ID, HUNYAO_AREA_ID, JIHAN_COUNTER_ID,
  JIHAN_FREEZE_ID, JIHAN_FREEZE_GROWTH_ID, JIHAN_SEAL_ID, JIHAN_SEAL_GROWTH_ID, JIHAN_ULTIMATE_ID, POLAR_GALAXY_ID,
  CHASE_LIGHT_ID, CHASE_SHADOW_ID, CHASE_SOUL_ID, isHunyaoPursuit, GATHER_ELEMENT_ID, JUNENG_ELEMENT, JUNENG_SHIELD_ID,
  ELECTROMAGNETIC_CANNON_ID, STORE_DAMAGE_ID, RELEASE_DAMAGE_ID, JUNENG_RESPONSE_ID, JUSHEN_ID, SELF_DESTRUCTER_DEATH_SKILL_ID,
  KUISHI_ID, SELF_ISOLATION_ID, SPIRIT_GUIDANCE_ID, RI_SKILL_ID, GATHER_STAR_ID, STAR_ELEMENT, STAR_STRIKE_ID,
  STAR_RESONANCE_ID, STAR_RESIST_ID, STAR_INHERIT_ID, DRAGON_DANCE_ID, DRAGON_BLOOD_FIELD_ID,
  DRAGON_DISAPPEAR_ID, DRAGON_HEIR_ID, DRAGON_DOMINION_ID, VERDICT_ACTION_ID, FOUR_EMPTINESS_ID, SLOT_MACHINE_ID } from "../bigCards/abilities";
import { POINT_GAME_MOVES, resolvePointGameRound, type PointGame, type PointGameAction } from "./pointGame";
import { announcePointResult, applyVerdictRoundPenalty, blockVerdictMove, notifyPointGameTarget, recordVerdictResult, stripVerdictAttack } from "./imperialVerdict";
import { getBlindSkillChoices, resolveBlindSkillRemoval } from "./blindSkillRemoval";
import { canUseStarResistance, getDefenseTotal, getDragonBloodMode, getDragonBloodTotal, ignoresOtherActiveSkill,
  isStarResistible, shapeDragonBloodAttack } from "./starDragon";
import { canAffectAcrossSpace, getSpaceReversal, isReversalResponseRestricted, playersInSpace, withPlayerSpace } from "./spaces";
import { applyJunengTargetLock, getJunengTargetLock, getSelectableJunengTarget, isCannonAttack, isStorableJunengDamage } from "./juneng";
import { changeElementAmount, getElementAmount } from "./elementResources";
import { addBigCardStatus, applyFentianHitStates, bigAbilitySource, clearFentianBattlefield,
  consumeFenjinAfterRevival, hasFentianInheritance, markFenjinForDeath, copyPeekCard, loseKuijiUltimate,
  absorbBigCardAbility, borrowBigCards, canReceiveBigCard, extendDragonDisappear, grantFreshBigCard, settleDragonRoundChanges } from "./bigCards";
import { appendSkillInstances, removeSkillInstanceAt, replaceSkillInstanceAt } from "./skillInventory";
import { effectIsSuppressed, effectHasCategory, ignoresNegativeStatuses, isBigCardAbilityIgnored, isTypedSkillSuppressed } from "./effectCategories";
import { isBigSkillMode } from "../modes";
import { changeCakes } from "./cakeResources";
import { canQueueAttackInWindow, getHunyaoExpandedTargets, getHunyaoPursuitTargets, hasContinuationBlock,
  countRiStacks, HUNYAO_QUEUED_SHA, isHunyaoAreaAttack, recordRiStacks, restoreHunyaoInitialState } from "./hunyao";
import { resolveOrdinaryHealing } from "./healing";
import { RETALIATION_RESPONSE_LIMIT, takeRetaliationResponses } from "./retaliationResponses";
import { resolveFusionAcquisition, grantInitializedSkill, getReadySlotMachines, getSlotMachineSpin, resetSlotMachine, SAND_SKILL_ID } from "./skillAcquisition";
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
import { applyReboundSkillModifiers, getReboundInteraction } from "./reboundRules";
import { resolveReboundAttacks, type ReboundAttack } from "./scatterRebound";
import { applyHealthAmounts } from "./infiniteValues";
import { getAttackFieldBlocker } from "./attackFields";
import { getAttackActionCost, getSkillElementCost, getTurnSkillActionCost } from "./actionCosts";
import { getJunengCombatNumber, getJunengNumber, scheduleJunengResponse, settleJunengRoundChanges } from "./junengNumbers";
import { resolveLightningSpellTargetIds } from "./skillTargets";
import {
  getActionWindowSeconds,
  COLLAPSE_BUFF_PREFIX,
  SKILL_DISABLED_BUFF_PREFIX,
  applyFrozenAutoActions,
  applyHuiyueAutoActions,
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
  getSkillResourceGainPerStack,
  skillHasCakeCost,
  getSkillUseLimit,
  getSmallSkillIds,
  skillHasTypeTag
} from "../skills/registry";
import { SkillAttribute } from "../skills/types";
import { COMMON_FUSION_SKILL_ID, getFusionRecipe, getOwnedSkillIds, getUnfusedSkillIds, isFusionPreparation,
  reconcileSkillFusions, recordSkillUse, getFusionEnhancementCount, getEnhancedChildFusionIds, isFusionActive, getDamageRedirectLimit,
  getActiveFusionCount, getFusionSkillId, hasEnhancedPutianRange, getFreeSkillChargeId, getAbsoluteGuardCost } from "../skills/fusion";
import { HUIYUE_BUFF_ID, isHuiyueActive, getReadyHuiyueFusionId } from "../skills/fusion";
import { applySkillFusion, fuseSkillsInPreparation } from "./fusion";
import { applyFrozenStatus, applyNegativeStatus, NEGATIVE_STATUS_IMMUNITY_BUFF_ID } from "./negativeStatuses";
import { ATTACK_STAT_MODIFIER_BUFF_PREFIX, previewPlayerAttackStats, attackStatModifierLabel,
  hasEnhancedLevelSwap, PlayerAttackStatPreview, payableAttackCost } from "./attackStatModifiers";

type AttackInstance = ReboundAttack;

interface HealthDelta {
  damageValue?: CombatValue;
  healingValue?: CombatValue;
  damageAtZeroValue?: CombatValue;
  damageEventIds?: string[];
  /** A shield rejects the entire attack, including later damage hits sharing this key. */
  blockedAttackKeys?: Set<string>;
  reflectedAttackKeys?: Set<string>;
  landedAttackKeys?: Set<string>;
  appliedHitEffectKeys?: Set<string>;
  jihanHits?: Set<string>;
  jihanIgnoredHits?: Set<string>;
  jihanActionBlocks?: Map<string, { attack: AttackInstance; basic: boolean }>;
  jihanNonAttackHits?: PlayerId[];
  jihanUltimateSeals?: PlayerId[];
  damage: number;
  lastDamageInternal?: boolean;
  healing: number;
  damageAtZero?: number;
  pendingHitEffects?: Array<{ attack: AttackInstance; actions: Record<PlayerId, PlayerActionPlan> }>;
  defeatLevel?: DefeatLevel;
  defeatReason?: string;
  defeatSourceId?: PlayerId;
}

interface DamageContext {
  verdictMoveKey?: string;
  verdictStripped?: boolean;
  ordinarySelfDamage?: boolean;
  sourceAbilityId?: SkillId;
  sourceBigCardInstanceId?: string;
  fixedStoredDamage?: boolean;
  noReviveOrExtraLives?: boolean;
  pointDefeatLevel?: DefeatLevel;
  zeroClashHit?: boolean;
  drainHealing?: boolean;
  internalDamage?: boolean;
  offenseSnapshot?: AttackInstance["offenseSnapshot"];
  spellDamage?: boolean;
  retaliation?: boolean;
  reflected?: boolean;
  actionRebounderIds?: PlayerId[];
  bypassDamageImmunity?: boolean;
  infiniteCopies?: boolean;
  originSourceId?: PlayerId;
  fromAttack?: boolean;
  isLastHit?: boolean;
  attackKey?: string;
}

const SKILL_GUESS_FAILED_BUFF_PREFIX = "skill_guess_failed";
const PENDING_DEATH_BUFF_ID = "pending_death";
const NO_REVIVE_BUFF_ID = "no_revive";
const FROST_BLADE_ATTACK_BUFF_ID = "frost_blade_attack";
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
const SAGE_PROTECTION_SKILL_ID = getFusionSkillId("贤者的庇护");
const SELF_DESTRUCT_COUNT_BUFF_ID = "self_destruct_count";
const LATE_SELF_DESTRUCT_USED_BUFF_ID = "late_self_destruct_used";
const SMALL_SPACE_BUFF_PREFIX = "small_space:";
const PAST_TIME_SPACE_BUFF_ID = `${SMALL_SPACE_BUFF_PREFIX}past_time`;
const FLASH_DODGE_SKILL_ID = "skill_103_56259";
const FLASH_DODGE_BUFF_ID = "temp_flash_dodge";
const FLASH_DODGE_COOLDOWN_BUFF_ID = "flash_dodge_cooldown";
const SIX_STAR_SKILL_ID = "skill_108_76133";
const SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID = "temp_six_star_immunity";
const SAINT_DAMAGE_TO_ZERO_SKILL_IDS = new Set<SkillId>(["skill_62_8008", getFusionSkillId("圣灵觉醒")]);
const FOREST_LOW_SING_SKILL_ID = "skill_77_30612";
const PARALYSIS_NEXT_ACTION_BUFF_PREFIX = "paralysis_next_action:";
const PARALYSIS_NO_CAKE_GAIN_BUFF_ID = "paralysis_no_cake_gain";
const TURN_DAMAGE_TAKEN_BUFF_PREFIX = "damage_taken_turn:";
const ACTIVE_REVIVAL_SKILL_IDS: SkillId[] = [
  "skill_64_60978",
  "skill_66_82448",
  "skill_68_57581",
  HELL_OVERLORD_SKILL_ID,
  SAGE_PROTECTION_SKILL_ID
];
const ELECTRIC_SHOCK_SKILL_ID = "skill_36_14343";
const MULTI_TARGET_ATTACK_SKILL_IDS = new Set<SkillId>([
  ELECTRIC_SHOCK_SKILL_ID,
  "skill_79_36319",
  "skill_118_53580",
  "skill_119_78843", getFusionSkillId("冰火双漩")
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
        if (getSkillPlay(action.skillId)?.optionalTargetCount !== undefined) return action;
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
  if (state.phase === "collecting_actions" && isHuiyueActive(findPlayer(state, playerId), state.turnNumber)) {
    throw new Error("辉月生效期间不能出招");
  }
  const preparationPlan = normalizeActionPlan(submission);
  const preparationAction = preparationPlan.actions.length === 1 ? preparationPlan.actions[0] : undefined;
  if (preparationAction?.type === "skill" && preparationAction.skillId === COMMON_FUSION_SKILL_ID && isFusionPreparation(state)) {
    const next = fuseSkillsInPreparation(state, playerId, preparationAction);
    if (shouldFinishGame(next)) finishGame(next);
    return { state: next, resolved: false };
  }
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

  const owner = findPlayer(state, playerId);
  const actionPlan = normalizeForcedAreaAttackPlan(
    state,
    playerId,
    { actions: preparationPlan.actions.map((action) => {
      const locked = applyJunengTargetLock(state, action, owner?.spaceId, owner)!;
      if (locked.type !== "skill" || locked.skillId !== DRAGON_BLOOD_FIELD_ID) return locked;
      const dragonBloodTotal = getDragonBloodTotal(state, playerId);
      const { targetId, targetIds, ...rest } = locked;
      const target = getDragonBloodMode(dragonBloodTotal) === "single" ? targetIds?.[0] ?? targetId : undefined;
      return { ...rest, dragonBloodTotal, ...(target ? { targetId: target } : {}) };
    }) }
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
  if (isReversalResponseRestricted(state, playerId)) throw new Error("普通变招已结束，当前只能使用逆转响应或跳过");
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
  if (!getUnfusedSkillIds(player).includes(targetSkillId)) {
    throw new Error("融合素材不能直接丢弃，请先在回合末分解");
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
  applyHealNow(state, playerId, 1, playerId, "丢弃技能");
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
  if (player.spaceId && next.phase === "collecting_actions" && alivePlayers(next).every((item) => next.pendingActions[item.id])) {
    return { state: resolveTurn(next), resolved: true };
  }
  return {
    state: next,
    resolved: true
  };
}

function canUseLateSelfDestruct(state: GameState, playerId: PlayerId): boolean {
  if (isReversalResponseRestricted(state, playerId)) return false;
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

  if (player.spaceId) {
    restartLocalActions(state, player.spaceId);
    const restored = findPlayer(state, playerId)!;
    if (options.late) incrementLateSelfDestructUseCount(restored);
    applySelfDestructPenalty(state, playerId, incrementSelfDestructCount(restored));
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${restored.name} 在小空间内主动自爆` });
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
      candidate.id !== playerId && canAffectAcrossSpace(state, playerId, candidate.id) &&
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
    setPlayerHpValue(player, []);
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

  applyHealthAmounts(player, 1, 0);
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
  if (hasPendingPointGame(state)) throw new Error("主游戏已暂停，等待玩点结算");
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
  if (hasPendingPointGame(state)) throw new Error("主游戏已暂停，等待玩点结算");
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
  if (hasPendingPointGame(state)) throw new Error("主游戏已暂停，等待玩点结算");
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

  const actingPlayer = findPlayer(state, playerId);
  action = applyJunengTargetLock(state, action, actingPlayer?.spaceId, actingPlayer)!;
  const next = cloneGameState(state);
  const player = findPlayer(next, playerId);
  if (!player) {
    throw new Error("玩家不存在");
  }

  const wasRevivalWindow = isRevivalWindow(next);
  const wasDamageModifyWindow = isDamageModifyWindow(next);
  revealSkillOnUse(next, playerId, action.skillId, "使用技能");
  recordSkillUsed(next, playerId, action.skillId, "action_window");
  if (wasDamageModifyWindow) {
    for (const move of next.verdictOrdinaryMoves ?? []) {
      if (move.sourceId === playerId) blockVerdictMove(next, findPlayer(next, move.targetId), playerId, move.key, true);
    }
    next.pendingDamageItems = next.pendingDamageItems?.filter((item) => item.sourceId !== playerId || !item.verdictMoveKey ||
      !blockVerdictMove(next, findPlayer(next, item.targetId), playerId, item.verdictMoveKey, Boolean(item.ordinaryAttack))) ?? [];
  }
  const cost = getEffectiveSkillActionCost(player, action, next, playerId);
  const play = getSkillPlay(action.skillId);
  const elementCost = getSkillElementCost(player, action);
  const skillDisabled = isPlayerSkillDisabled(player) || isTypedSkillSuppressed(player, getSkill(action.skillId));
  if (action.skillId === DRAGON_DISAPPEAR_ID) {
    const instanceId = bigAbilitySource(player, action, true)!;
    action = { ...action, bigCardInstanceId: instanceId };
    const card = player.bigCards!.find((entry) => entry.instanceId === instanceId)!;
    const uses = card.abilityUses ??= {};
    uses[action.skillId] = (uses[action.skillId] ?? 0) + 1;
  }
  if (action.skillId === STAR_RAGE_ID) spendStarRageMarks(player, next.turnNumber);
  if (cost > 0 && (action.skillId !== SELF_ISOLATION_ID || skillDisabled)) {
    changeCakes(next, playerId, player.cakes - cost, "阶段技能消耗");
  }

  if (elementCost && (action.skillId !== JUSHEN_ID || skillDisabled)) {
    changeElementAmount(player, elementCost.element, -elementCost.perStack * action.stacks);
  }
  if (isTypedSkillSuppressed(player, getSkill(action.skillId))) paySuppressedCooldown(next, player, action.skillId);
  if (!isPlayerSkillDisabled(player)) activatePureSkyImmunity(next, player, action.skillId);
  let healthChangeOccurred = false;

  if (!skillDisabled && (action.skillId === "skill_10_9488" || action.skillId === JUSHEN_ID || action.skillId === SELF_ISOLATION_ID)) {
    const preemptiveSkillId = action.skillId;
    const lockEndRound = next.roundNumber + 1 + getJunengNumber(player, "1050407.targetLockRounds", 2, action.bigCardInstanceId);
    if (player.spaceId) {
      restartLocalActions(next, player.spaceId);
      const restored = findPlayer(next, playerId)!;
      if (preemptiveSkillId === JUSHEN_ID && elementCost && action.targetId) {
        changeElementAmount(restored, elementCost.element, -elementCost.perStack * action.stacks);
        const space = next.smallSpaces?.[player.spaceId];
        if (space) space.targetLock = { targetId: action.targetId, expiresAtRound: lockEndRound };
      } else if (preemptiveSkillId === "skill_10_9488") {
        applyCollapseBuffs(next, playerId, next.roundNumber + 1);
      }
      markSkillUse(restored, preemptiveSkillId);
      next.eventLog.push({ ...createBaseEvent(next, "system"), type: "system",
        message: `${restored.name} 发动 ${getSkill(preemptiveSkillId)?.name ?? preemptiveSkillId}，在小空间内重开` });
      next.updatedAt = Date.now();
      return next;
    }
    const collapseEndRound = preemptiveSkillId === "skill_10_9488" ? announceCollapse(next, playerId) : undefined;
    restorePreemptiveRestartSnapshot(next);
    const restoredPlayer = findPlayer(next, playerId);
    if (restoredPlayer) {
      if (preemptiveSkillId === SELF_ISOLATION_ID && cost > 0) {
        changeCakes(next, playerId, Math.max(0, restoredPlayer.cakes - cost), "自我封闭重开扣费");
      }
      if (preemptiveSkillId === JUSHEN_ID && elementCost) {
        changeElementAmount(restoredPlayer, elementCost.element, -elementCost.perStack * action.stacks);
      }
      markSkillUse(restoredPlayer, preemptiveSkillId);
      markSkillActivated(next, playerId, preemptiveSkillId);
    }
    next.pendingActions = {};
    delete next.pendingDamageItems;
    delete next.turnResolutionStarted;
    delete next.verdictTurn;
    delete next.verdictBlockedMoves;
    delete next.verdictOrdinaryMoves;
    delete next.turnHealthChanged;
    delete next.damageModifyReturnPhase;
    delete next.damageModifyAfterTurnResolution;
    delete next.preemptiveRestartSnapshot;
    if (preemptiveSkillId === JUSHEN_ID && action.targetId) {
      next.junengTargetLock = { targetId: action.targetId, expiresAtRound: lockEndRound };
      next.eventLog.push({ ...createBaseEvent(next, "system"), type: "system",
        message: `聚神指定了 ${getPlayerName(next, action.targetId)}，直至第${lockEndRound - 1}轮轮末` });
    }
    endRound(next);
    if (collapseEndRound !== undefined) applyCollapseBuffs(next, playerId, collapseEndRound);
    if (preemptiveSkillId === SELF_ISOLATION_ID && restoredPlayer) {
      const spaceId = createId("self_isolation");
      (next.smallSpaces ??= {})[spaceId] = { name: "自我封闭", cakeMultiplier: 3, expiresAtRound: lockEndRound - 1 };
      restoredPlayer.spaceId = spaceId;
      next.eventLog.push({ ...createBaseEvent(next, "system"), type: "system",
        message: `${restoredPlayer.name} 进入独立小空间「自我封闭」，于第${lockEndRound - 2}轮轮末返回` });
    }
    if (next.roundEndDamagePending) return next;
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
    if (player.spaceId) {
      delete player.spaceId;
      delete next.pendingActions[playerId];
      next.updatedAt = Date.now();
      return next;
    }
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
    const gain = getSkillResourceGainPerStack(player, action.skillId) * action.stacks;
    if (gain > 0) {
      changeCakes(next, playerId, player.cakes + gain, `${getSkill(action.skillId)?.name ?? "技能"}生效`);
    }
  } else if (!skillDisabled && play?.kind === "effect") {
    applySkillPreparationEffect(next, playerId, action);
    if (isHunyaoPursuit(action.skillId)) {
      resolveHunyaoPursuit(next, player, action);
    } else {
      healthChangeOccurred = resolveImmediateSkillEffect(next, playerId, action);
    }
    if (healthChangeOccurred) {
      next.turnHealthChanged = true;
    }
    if (wasDamageModifyWindow && next.phase === "action_window" && next.activeTimingPhase === "turn_damage_modify" &&
      !next.pendingDamageItems?.length) {
      markSkillUse(player, action.skillId);
      finishDamageModifyWindow(next);
      advanceFullySkippedActionWindows(next);
      next.updatedAt = Date.now();
      return next;
    }
    if (isDamageModifyWindow(next)) {
      markSkillUse(player, action.skillId);
      next.actionWindowPassPlayerIds = next.actionWindowPassPlayerIds.filter((id) => id !== playerId);
      refreshDamageModifyPasses(next);
      if (alivePlayers(next).every((item) => next.actionWindowPassPlayerIds.includes(item.id))) {
        advanceCurrentActionWindow(next);
        advanceFullySkippedActionWindows(next);
      } else {
        next.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(next) * 1000;
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
        next.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(next) * 1000;
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
  markSkillUse(player, action.skillId);
  next.actionWindowPassPlayerIds = next.actionWindowPassPlayerIds.filter((id) => id !== playerId);
  if (next.reversalResponseOnly) {
    markSkippedActionWindowPasses(next);
    advanceFullySkippedActionWindows(next);
  }
  if (shouldFinishGame(next)) {
    finishGame(next);
  } else if (
    healthChangeOccurred &&
    !keepCurrentActionWindowAfterHealthChange &&
    next.phase !== "action_window"
  ) {
    beginSkippedAwareActionPrompt(next, "round_pre_interval_action");
  } else if (next.phase === "action_window") {
    next.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(next) * 1000;
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
  const spaceId = findPlayer(state, playerId)?.spaceId;
  if (getJunengTargetLock(state, spaceId)) {
    const lockedTarget = getSelectableJunengTarget(state, spaceId);
    if (!lockedTarget) throw new Error("聚神指定的玩家当前无法被选中");
    targetPlayerId = lockedTarget;
  }
  if (!canAffectAcrossSpace(state, playerId, targetPlayerId)) throw new Error("只能猜测同一空间玩家的技能");

  validateSkillGuess(state, playerId, targetPlayerId, targetSkillId);

  const next = cloneGameState(state);
  const actor = findPlayer(next, playerId);
  const target = findPlayer(next, targetPlayerId);
  const targetSkill = getSkill(targetSkillId);
  if (!actor || !target || !targetSkill) {
    throw new Error("技能猜测目标不存在");
  }

  const guessedCorrectly = getOwnedSkillIds(target).includes(targetSkillId);
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
    next.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(next) * 1000;
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

  if (handlePendingDamageItems(next)) { next.updatedAt = Date.now(); return next; }
  const healthChangeOccurred = next.players.some(
    (player) => !player.spaceId && beforeHp.get(player.id) !== player.hp
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
    next.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(next) * 1000;
  } else if (healthChangeOccurred) {
    next.pendingActions = {};
    delete next.turnResolutionStarted;
    delete next.turnHealthChanged;
    endRound(next);
    beginSkippedAwareActionPrompt(next, "round_pre_interval_action");
  } else if (next.phase === "action_window") {
    next.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(next) * 1000;
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

  if (!getSmallSkillIds().includes(targetSkillId) && !getFusionRecipe(targetSkillId)) {
    throw new Error("技能猜测只能选择小技能或融合技能");
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
  if (hasPendingPointGame(next)) {
    const removal = next.verdictTurn!.removalPlayerId;
    if (removal) submitVerdictRemoval(next, removal, getBlindSkillChoices(next, removal, false).slice(0, 16).map((choice) => choice.instanceId));
    else {
      const game = pendingPointGame(next)!;
      for (const id of [game.sourceId, game.targetId]) game.moves[id] ??= POINT_GAME_MOVES[Math.floor(Math.random() * POINT_GAME_MOVES.length)]!;
      settlePointGameMove(next, game);
    }
    next.updatedAt = Date.now();
    return next;
  }
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
  if (state.roundEndDamagePending && !["turn_damage_modify", "revival_action"].includes(timingPhase)) return;
  const promptOptions =
    timingPhase === "revival_action"
      ? {
          ...options,
          promptSeconds: Math.max(
            options.promptSeconds ?? getActionWindowSeconds(state),
            getActionWindowSeconds(state)
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
    !hasPendingPointGame(state) &&
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
  for (const player of playersInSpace(state, sourceId)) {
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
  const enhancedSpaces = getEnhancedChildFusionIds(player, "风之轻灵", getFusionSkillId("空之轨迹"));
  const duration = enhancedSpaces.size > 0 ? 2 : getFusionEnhancementCount(player, PAST_TIME_SKILL_ID, ["空之轨迹"]) > 0 ? 3 : 5;
  player.status = "dead";
  player.defeatLevel = 2;
  player.buffs = player.buffs.filter((buff) => !buff.id.startsWith(SMALL_SPACE_BUFF_PREFIX));
  player.buffs.push({
    id: PAST_TIME_SPACE_BUFF_ID,
    name: `小空间：过往时空（${player.name}）`,
    stacks: duration,
    sourcePlayerId: player.id
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 进入小空间：过往时空，主空间视为退游，${duration} 轮后返回`
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
    if (getActiveFusionCount(player, "天空之城") > 0) grantLegacyCakes(state, player, "天空之城触发遗计");
  }
}

export function resolveTurn(state: GameState): GameState {
  const next = cloneGameState(state);
  delete next.turnAttackStats;
  next.phase = "resolving";

  const revealedActions = getRevealedActions(next);
  next.eventLog.push({
    ...createBaseEvent(next, "turn_revealed"),
    type: "turn_revealed",
    actions: revealedActions
  });

  // Interval damage remains in round history, but is not damage from this turn.
  for (const player of next.players) {
    player.buffs = player.buffs.filter((buff) => !buff.id.startsWith(TURN_DAMAGE_TAKEN_BUFF_PREFIX));
  }
  const invalidated = findGuidanceInvalidations(next, revealedActions);
  applyActionCostsAndGains(next, revealedActions, invalidated);
  for (const playerId of invalidated) next.pendingActions[playerId] = { actions: [] };
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
  if (prepareVerdictGames(state)) return;
  delete state.reversalResponseOnly;
  state.phase = "resolving";
  const attacksBeforeRebound: AttackInstance[] = [];
  const resolutionActions: Record<PlayerId, PlayerActionPlan> = {};
  const spaces = new Map(state.players.map((player) => [player.spaceId, player.id]));
  for (const anchorId of spaces.values()) withPlayerSpace(state, anchorId, () => {
    const revealedActions = getRevealedActions(state);
    const reversal = getSpaceReversal(state, anchorId);
    const created = reversal?.turnNumber === state.turnNumber ? reversal.attacks : createAttackInstances(state, revealedActions);
    // Record declarations once after their stats are fixed, before target expansion, reflection or blocking.
    for (const [sourceId, plan] of Object.entries(revealedActions)) {
      const stacks = countRiStacks(plan.actions);
      if (stacks === 0) continue;
      const source = findPlayer(state, sourceId);
      if (source && !isPlayerSkillDisabled(source) && !isPlayerInCollapse(source) && !isTypedSkillSuppressed(source, getSkill(RI_SKILL_ID)))
        recordRiStacks(source, stacks);
    }
    const reversed = isReversalActive(state);
    const attacks = reversed ? reverseAttackInstances(state, created) : created;
    attacksBeforeRebound.push(...attacks);
    Object.assign(resolutionActions, reversed ? createReversedResolutionActions(state, revealedActions, attacks) : revealedActions);
  });

  const healthDeltas = new Map<PlayerId, HealthDelta>();
  for (const game of state.verdictTurn?.games ?? []) {
    if (game.winnerId !== game.sourceId) continue;
    for (const target of playersInSpace(state, game.sourceId)) {
      if (target.id !== game.sourceId && target.status === "alive" && !isSkillEffectImmune(state, target.id, getSkill(VERDICT_ACTION_ID)!, game.sourceId)) {
        addDamage(state, healthDeltas, target.id, 10, game.sourceId, "御秽裁决", undefined, { spellDamage: true, drainHealing: true });
      }
    }
  }
  for (const [sourceId, plan] of Object.entries(resolutionActions)) {
    const player = findPlayer(state, sourceId);
    if (!player || !plan.actions.some((action) => action.type === "skill" && action.skillId === getFusionSkillId("三元协奏曲")) ||
      !getActiveFusionCount(player, "三元协奏曲")) continue;
    upsertBuff(player, { id: "temp_absolute_invulnerable", name: "三元协奏曲", stacks: 1, expiresAtTurn: state.turnNumber });
    const [child] = getEnhancedChildFusionIds(player, "三元协奏曲", getFusionSkillId("冰火狂暴曲"));
    if (child) addIceFireMarks(player, child, 6, 6);
  }
  resolveBigCardPreparation(state, resolutionActions);
  const heirAttacks = resolveDragonHeirs(state, resolutionActions, attacksBeforeRebound);
  resolveStarStrikeStatuses(state, heirAttacks);
  const enabledAttacks = heirAttacks.filter((attack) => {
    if (!isStarGroupAttackDisabled(state, attack)) return true;
    pushAttackBlockedEvent(state, { sourceId: attack.sourceId, targetId: attack.targetId,
      attackName: attack.stats.name, blockKind: "block", protectionName: "群攻技能攻击失效" });
    return false;
  });
  const clearing = enabledAttacks.filter((attack) => attack.stats.id === FENTIAN_ATTACK_ID);
  if (clearing.length) clearFentianBattlefield(state, (player) => clearing.some((attack) =>
    !isSkillEffectImmune(state, player.id, getSkill(FENTIAN_ATTACK_ID)!, attack.sourceId)));
  resolveBigCardAbsorptions(state, resolutionActions, enabledAttacks);
  const attacksAfterCannonDefense = resolveCannonDefenses(state, enabledAttacks, resolutionActions, healthDeltas);
  {
    const attacks = applyRebounds(
      state,
      attacksAfterCannonDefense,
      resolutionActions,
      healthDeltas
    );
    state.verdictOrdinaryMoves = attacks.filter((attack) => attack.verdictStripped).map((attack) => ({
      sourceId: attack.sourceId, targetId: attack.targetId, key: `move:${attack.actionIndex}`
    }));
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
  resolveActiveSkillEffects(state, resolutionActions, healthDeltas, true);
  if (isBigSkillMode(state.config.skillMode)) {
    resolveJihanTurnEffects(state, attacksBeforeRebound, resolutionActions, healthDeltas);
  }

  if (applyHealthDeltas(state, healthDeltas)) {
    state.turnHealthChanged = true;
  }

  if (handlePendingDamageItems(state)) {
    return;
  }

  completeDamagePoint(state);
}

function pendingPointGame(state: GameState): PointGame | undefined {
  return state.verdictTurn?.games.find((game) => !game.winnerId);
}

export function hasPendingPointGame(state: GameState): boolean {
  return Boolean(state.verdictTurn?.removalPlayerId || pendingPointGame(state));
}

function prepareVerdictGames(state: GameState): boolean {
  if (state.verdictTurn?.turnNumber === state.turnNumber) return hasPendingPointGame(state);
  delete state.verdictTurn;
  const games: PointGame[] = [];
  for (const [playerId, plan] of Object.entries(state.pendingActions)) {
    const player = findPlayer(state, playerId);
    if (!player || player.status !== "alive" || !playerHasActiveSkill(player, VERDICT_ACTION_ID)) continue;
    for (const [index, action] of (plan?.actions ?? []).entries()) {
      if (action.type !== "skill" || action.skillId !== VERDICT_ACTION_ID || !action.targetId || action.targetId === playerId) continue;
      const target = findPlayer(state, action.targetId);
      if (!target || target.status !== "alive" || !canAffectAcrossSpace(state, playerId, target.id)) continue;
      const reversed = withPlayerSpace(state, playerId, () => isReversalActive(state));
      const source = reversed ? target : player;
      const opponent = reversed ? player : target;
      if (blockVerdictMove(state, opponent, source.id, `move:${index}`, false)) continue;
      const sourceCardId = bigAbilitySource(source, reversed ? { skillId: VERDICT_ACTION_ID } : action);
      games.push({ id: createId("point_game"), sourceId: source.id, targetId: opponent.id, round: 1, moves: {}, ...(sourceCardId ? { sourceCardId } : {}) });
    }
  }
  if (!games.length) return false;
  state.verdictTurn = { turnNumber: state.turnNumber, games };
  beginPointGamePause(state);
  return true;
}

function beginPointGamePause(state: GameState): void {
  const game = pendingPointGame(state);
  if (game && !state.verdictTurn?.removalPlayerId) notifyPointGameTarget(state, game.targetId);
  state.phase = "action_window";
  state.activeTimingPhase = "turn_reveal_check";
  state.actionWindowMode = "active";
  state.actionWindowPassPlayerIds = [];
  state.actionWindowPlayerIds = state.verdictTurn?.removalPlayerId ? [state.verdictTurn.removalPlayerId] : game ? [game.sourceId, game.targetId] : [];
  state.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(state) * 1000;
}

function resumePointGame(state: GameState): void {
  if (hasPendingPointGame(state)) beginPointGamePause(state);
  else {
    finishTurnResolution(state);
    advanceFullySkippedActionWindows(state);
  }
}

function settlePointGameMove(state: GameState, game: PointGame): void {
  const result = resolvePointGameRound(game);
  if (result === "waiting") return;
  if (result === "tie") {
    state.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(state) * 1000;
    return;
  }
  announcePointResult(state, game);
  const removal = recordVerdictResult(state, game);
  const winner = findPlayer(state, game.winnerId!);
  if (winner?.buffs.some((buff) => buff.id === "instant_win:imperial_verdict")) { finishGame(state); return; }
  if (removal && getBlindSkillChoices(state, game.sourceId, false).length) state.verdictTurn!.removalPlayerId = game.sourceId;
  resumePointGame(state);
}

function submitVerdictRemoval(state: GameState, playerId: PlayerId, ids: string[]): void {
  if (state.verdictTurn?.removalPlayerId !== playerId || !Array.isArray(ids)) throw new Error("当前没有可提交的裁决消除");
  const count = Math.min(16, getBlindSkillChoices(state, playerId, false).length);
  if (ids.length !== count) throw new Error(`请选择 ${count} 个非化合态小技能`);
  resolveBlindSkillRemoval(state, playerId, ids, false);
  delete state.verdictTurn.removalPlayerId;
  resumePointGame(state);
}

export function submitPointGameAction(state: GameState, playerId: PlayerId, action: PointGameAction): GameState {
  if (state.phase !== "action_window" || !hasPendingPointGame(state)) throw new Error("当前没有玩点行动");
  const next = cloneGameState(state);
  if (action?.kind === "remove") submitVerdictRemoval(next, playerId, action.instanceIds);
  else {
    const game = pendingPointGame(next);
    if (!game || next.verdictTurn?.removalPlayerId || (playerId !== game.sourceId && playerId !== game.targetId) ||
      game.moves[playerId] || action?.kind !== "move" || action.gameId !== game.id || action.round !== game.round ||
      !POINT_GAME_MOVES.includes(action.move)) throw new Error("当前不能提交石头剪刀布");
    game.moves[playerId] = action.move;
    settlePointGameMove(next, game);
  }
  next.updatedAt = Date.now();
  return next;
}

function resolveCannonDefenses(state: GameState, attacks: AttackInstance[], actions: Record<PlayerId, PlayerActionPlan>,
  deltas: Map<PlayerId, HealthDelta>): AttackInstance[] {
  if (!state.cannonDefenses?.length && !attacks.some((attack) => attack.stats.cannonDefensePending)) return attacks;
  const incoming = attacks.filter((attack) => !attack.stats.cannonDefensePending);
  const declarations = attacks.filter((attack) => attack.stats.cannonDefensePending);
  const pending: NonNullable<GameState["cannonDefenses"]> = [];
  for (const challenge of state.cannonDefenses ?? []) {
    const attack = challenge.attack;
    if (findPlayer(state, attack.targetId)?.status !== "alive" || !canAffectAcrossSpace(state, attack.sourceId, attack.targetId)) continue;
    if (challenge.dueTurn > state.turnNumber) {
      pending.push(challenge);
      continue;
    }
    const plan = actions[attack.targetId]?.actions ?? [];
    const defended = challenge.dueTurn === state.turnNumber && (challenge.next === "cake" ?
      plan.some((action) => action.type === "gain_cake") :
      plan.some((action) => action.type === "defense" && action.defense === "rebound"));
    if (!defended) incoming.push(attack);
    else if (challenge.next === "cake") pending.push({ attack, next: "rebound", dueTurn: state.turnNumber + 1 });
    else pushAttackBlockedEvent(state, { sourceId: attack.sourceId, targetId: attack.targetId, attackName: attack.stats.name,
      blockKind: "block", protectionName: "石头＋饼＋反弹" });
  }
  for (const attack of declarations) {
    const target = findPlayer(state, attack.targetId);
    const ignored = target && (getActiveSkillCount(target, HUNYAO_AREA_ID) > 0 && isHunyaoAreaAttack(attack.stats) ||
      isBigCardAbilityIgnored(target, getSkill(attack.stats.id)!));
    const delivery = { ...attack, skipClash: true };
    if (ignored || attack.sourceId === attack.targetId ||
      !actions[attack.targetId]?.actions.some((action) => action.type === "defense" && action.defense === "stone")) {
      incoming.push(delivery);
      continue;
    }
    pending.push({ attack: delivery, next: "cake", dueTurn: state.turnNumber + 1 });
  }
  state.cannonDefenses = pending;

  for (const [sourceId, plan] of Object.entries(actions)) {
    for (const [actionIndex, action] of plan.actions.entries()) {
      if (!isCannonAttack(action) || !declarations.some((attack) => attack.sourceId === sourceId && attack.actionIndex === actionIndex))
        continue;
      const targetId = action.targetIds?.[0];
      if (!targetId || isSkillEffectImmune(state, targetId, getSkill(action.skillId)!, sourceId)) continue;
      const source = findPlayer(state, sourceId);
      const chance = source ? getJunengNumber(source, "1050408.executeUpgradeChance", 0.25, action.bigCardInstanceId) : 0.25;
      addDefeatEffect(state, deltas, targetId, Math.random() < Math.min(1, chance) ? 4 : 2, sourceId, "聚能湮灭炮·直接退游");
    }
  }
  return incoming;
}

function finishRevivalWindow(state: GameState): void {
  updateDeaths(state, { allowPending: false });
  if (state.retaliationRevivalPending) {
    delete state.retaliationRevivalPending;
    if (!handlePendingDamageItems(state)) completeDamagePoint(state);
    return;
  }
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
      state.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(state) * 1000;
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
  while ((state.pendingDamageItems?.length ?? 0) > 0) {
    if (state.pendingDamageItems?.some((item) => item.retaliation) && updateDeaths(state, { allowPending: true })) {
      state.retaliationRevivalPending = true;
      beginSkippedAwareActionPrompt(state, "revival_action");
      return true;
    }
    state.pendingDamageItems = (state.pendingDamageItems ?? []).filter((item) => !item.retaliation ||
      (findPlayer(state, item.sourceId ?? "")?.status === "alive" && !isDeathCandidate(findPlayer(state, item.sourceId ?? "")!)));
    if (!state.pendingDamageItems?.length) break;
    if (usesSkillActionWindows(state) && alivePlayers(state).some((player) => playerCanUseDamageModifyAction(state, player))) {
      beginDamageModifyPrompt(state);
      return state.phase === "action_window" && state.activeTimingPhase === "turn_damage_modify";
    }

    if (applyPendingDamageItems(state)) {
      state.turnHealthChanged = true;
    }
    // A zero-HP response may be the only producer of the next wave. Keep it in this loop.
    if (!state.pendingDamageItems?.length && updateDeaths(state, { allowPending: true })) {
      state.retaliationRevivalPending = true;
      beginSkippedAwareActionPrompt(state, "revival_action");
      return true;
    }
  }

  return false;
}

function beginDamageModifyPrompt(state: GameState): void {
  if (state.activeTimingPhase !== "turn_damage_modify") {
    state.damageModifyReturnPhase = state.activeTimingPhase;
    state.damageModifyAfterTurnResolution = state.phase === "resolving";
  }
  beginSkippedAwareActionPrompt(state, "turn_damage_modify", {
    preservePendingActions: true,
    promptSeconds: getActionWindowSeconds(state)
  });
}

function playerCanUseDamageModifyAction(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>
): boolean {
  if (getReadySlotMachines(player).length || getActiveSkillCount(player, FOUR_EMPTINESS_ID) > 0 &&
    getSkillUseCount(player, FOUR_EMPTINESS_ID) < (getSkillUseLimit(player, FOUR_EMPTINESS_ID) ?? 0)) return true;
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
        getCrossGuardDamageItems(state, player.id).length > 0) ||
      (playerHasActiveSkill(player, STORE_DAMAGE_ID) && getElementAmount(player, JUNENG_ELEMENT) >= (getSkillElementCost(player, { skillId: STORE_DAMAGE_ID })?.perStack ?? 1) &&
        Boolean(state.pendingDamageItems?.some((item) => item.targetId === player.id && isStorableJunengDamage(item)))) ||
      (canUseStarResistance(player) && Boolean(state.pendingDamageItems?.some((item) => item.targetId === player.id && isStarResistible(item)))) ||
      (playerHasActiveSkill(player, RELEASE_DAMAGE_ID) && Boolean(player.storedDamages?.length) &&
        Boolean(applyJunengTargetLock(state, { type: "skill", skillId: RELEASE_DAMAGE_ID, stacks: 1 }, player.spaceId))) ||
      (playerHasActiveSkill(player, JUSHEN_ID) && [player, state.preemptiveRestartSnapshot?.players.find((candidate) => candidate.id === player.id) ?? player]
        .every((payer) => getElementAmount(payer, JUNENG_ELEMENT) >= (getSkillElementCost(player, { skillId: JUSHEN_ID })?.perStack ?? 7)) &&
        Boolean(applyJunengTargetLock(state, { type: "skill", skillId: JUSHEN_ID, stacks: 1 }, player.spaceId))) ||
      (playerHasActiveSkill(player, SELF_ISOLATION_ID) && !player.spaceId && player.cakes >= 3) ||
      [CHASE_LIGHT_ID, CHASE_SHADOW_ID, CHASE_SOUL_ID].some((id) => playerHasActiveSkill(player, id) &&
        player.cakes >= (getSkillPlay(id)?.cost ?? Infinity) && getHunyaoPursuitTargets(state, id).length > 0))
  );
}

function getRedirectableDamageItems(
  state: GameState,
  playerId: PlayerId
): PendingDamageItem[] {
  return (state.pendingDamageItems ?? []).filter(
    (item) =>
      item.targetId === playerId &&
      isDamageWithinLimit(item, fromLegacyCombatStat(getDamageRedirectLimit(findPlayer(state, playerId)!))) &&
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
      !isAttackDamageItem(item) ||
      item.amount <= 0 ||
      !item.sourceId ||
      item.sourceId === playerId ||
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
    if (item.amount <= 0 || !isAttackDamageItem(item)) {
      return false;
    }

    if (
      item.targetId === playerId &&
      !item.internalDamage &&
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
  if (state.turnEndStatusPending) {
    if (updateDeaths(state, { allowPending: true })) {
      state.retaliationRevivalPending = true;
      beginSkippedAwareActionPrompt(state, "revival_action");
      return;
    }
    if (handlePendingDamageItems(state)) return;
    if (shouldFinishGame(state)) { finishGame(state); return; }
    finishTurnAfterEndAction(state);
    return;
  }
  if (state.roundEndDamagePending) {
    if (updateDeaths(state, { allowPending: true })) {
      state.retaliationRevivalPending = true;
      beginSkippedAwareActionPrompt(state, "revival_action");
      return;
    }
    if (handlePendingDamageItems(state)) return;
    const options = state.roundEndDamagePending;
    delete state.roundEndDamagePending;
    clearSixStarProtection(state);
    endRound(state, { ...options, skipRoundEndSkills: true });
    if (state.turnResolutionStarted) state.turnNumber += 1;
    delete state.preemptiveRestartSnapshot;
    delete state.turnActionReceipts;
    delete state.turnAttackStats;
    delete state.turnResolutionStarted;
    delete state.turnHealthChanged;
    state.pendingActions = {};
    beginSkippedAwareActionPrompt(state, "round_pre_interval_action");
    return;
  }
  const returnPhase = state.damageModifyReturnPhase ?? "round_pre_interval_action";
  if (shouldResumeTurnChangeBeforeResolution(state, returnPhase)) {
    delete state.damageModifyReturnPhase;
    delete state.damageModifyAfterTurnResolution;
    beginSkippedAwareActionPrompt(state, "turn_change_action", { preservePendingActions: true });
    return;
  }

  const pendingDeathWindow = updateDeaths(state, { allowPending: true });
  if (state.pendingDamageItems?.length) {
    if (pendingDeathWindow) {
      state.retaliationRevivalPending = true;
      beginSkippedAwareActionPrompt(state, "revival_action");
      return;
    }
    if (handlePendingDamageItems(state)) return;
    completeDamagePoint(state);
    return;
  }
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
  return timingPhase !== "opening_action" && timingPhase !== "round_pre_interval_action" && timingPhase !== "round_after_interval_action";
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
  if (!state.turnEndStatusPending) {
    const before = Boolean(state.turnHealthChanged);
    const burning = state.players.flatMap((player) => player.status !== "alive" || ignoresNegativeStatuses(player) ? [] : player.buffs
      .filter((buff) => buff.stateType === "burning" && (buff.expiresAtTurn ?? 0) > state.turnNumber && buff.lastTickTurn !== state.turnNumber)
      .map((buff) => ({ player, buff })));
    if (burning.length) {
      state.turnEndStatusPending = { turnNumber: state.turnNumber, healthChangedBefore: before };
      const deltas = new Map<PlayerId, HealthDelta>();
      for (const { player, buff } of burning) {
        buff.lastTickTurn = state.turnNumber;
        addDamage(state, deltas, player.id, 1, undefined, "烧伤", fireDamageStats(FENTIAN_ATTACK_ID, "烧伤", 1), { spellDamage: true });
      }
      applyHealthDeltas(state, deltas);
      if (handlePendingDamageItems(state)) return;
      completeDamagePoint(state);
      return;
    }
  } else {
    state.turnHealthChanged = state.turnEndStatusPending.healthChangedBefore;
    delete state.turnEndStatusPending;
  }
  clearSixStarProtection(state);
  const healthChangeOccurred = Boolean(state.turnHealthChanged || state.verdictTurn?.games.length);

  if (healthChangeOccurred) {
    endRound(state);
    if (state.roundEndDamagePending) return;
  } else {
    state.roundTurnNumber += 1;
  }

  state.turnNumber += 1;
  for (const player of state.players) player.buffs = player.buffs.filter((buff) =>
    ![HUIYUE_BUFF_ID, NEGATIVE_STATUS_IMMUNITY_BUFF_ID].includes(buff.id) || (buff.expiresAtTurn ?? -1) >= state.turnNumber);
  state.pendingActions = {};
  delete state.turnResolutionStarted;
  delete state.turnHealthChanged;
  delete state.damageModifyReturnPhase;
  delete state.damageModifyAfterTurnResolution;
  delete state.preemptiveRestartSnapshot;
  delete state.turnActionReceipts;
  delete state.turnAttackStats;
  delete state.verdictTurn;
  delete state.verdictBlockedMoves;
  delete state.verdictOrdinaryMoves;
  delete state.reversalState;
  delete state.spaceReversalStates;
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
  delete state.verdictTurn;
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
  for (const id of winners) if (getActiveFusionCount(findPlayer(state, id), "黑白板") > 0) {
    revealSkillOnWin(state, id, getFusionSkillId("黑白板"), "黑白板胜利");
  }
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
    const boardWinners = victoryAlive.filter((player) => getActiveFusionCount(player, "黑白板") > 0);
    if (boardWinners.length) return includePuppetVictoryPartners(state, boardWinners.map((player) => player.id));
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

  if (victoryAlive.length <= 3) {
    const boardWinners = victoryAlive.filter((player) => getActiveFusionCount(player, "黑白板") > 0);
    if (boardWinners.length) return includePuppetVictoryPartners(state, boardWinners.map((player) => player.id));
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
  state.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(state) * 1000;
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
  if (current === "opening_action") {
    applyDefaultShunshouStealChoices(state);
    beginSkippedAwareActionPrompt(state, "round_pre_interval_action");
    return;
  }

  if (current === "round_pre_interval_action") {
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
  delete state.turnActionReceipts;
  delete state.turnAttackStats;
  clearSkipUntilTurnActionBuffs(state);
  state.turnStartedAt = Date.now();
  applyTurnStartSkills(state);
  applyParalysisAutoActions(state);
  applyFrozenAutoActions(state);
  applyHuiyueAutoActions(state);
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
    ...(state.smallSpaces ? { smallSpaces: structuredClone(state.smallSpaces) } : {}),
    ...(state.junengTargetLock ? { junengTargetLock: structuredClone(state.junengTargetLock) } : {}),
    ...(state.cannonDefenses ? { cannonDefenses: structuredClone(state.cannonDefenses) } : {}),
    ...(state.borrowedBigCards ? { borrowedBigCards: structuredClone(state.borrowedBigCards) } : {}),
    ...(state.pendingDragonFireBonuses ? { pendingDragonFireBonuses: structuredClone(state.pendingDragonFireBonuses) } : {}),
    roundNumber: state.roundNumber,
    roundTurnNumber: state.roundTurnNumber,
    turnNumber: state.turnNumber,
    activeTimingPhase: state.activeTimingPhase,
    turnStartedAt: state.turnStartedAt,
    players: clonePlayers(state.players),
    pendingActions: clonePendingActions(state.pendingActions),
    ...(state.damageAttribution ? { damageAttribution: structuredClone(state.damageAttribution) } : {}),
    ...(state.pendingSkillChoices
      ? { pendingSkillChoices: JSON.parse(JSON.stringify(state.pendingSkillChoices)) }
      : {})
  };
  state.preemptiveRestartSnapshot = snapshot;
}

function restorePreemptiveRestartSnapshot(state: GameState): void {
  delete state.reversalResponseOnly;
  delete state.reversalState;
  delete state.spaceReversalStates;
  delete state.turnActionReceipts;
  delete state.turnAttackStats;
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
  if (snapshot.smallSpaces) state.smallSpaces = structuredClone(snapshot.smallSpaces);
  else delete state.smallSpaces;
  if (snapshot.junengTargetLock) state.junengTargetLock = structuredClone(snapshot.junengTargetLock);
  else delete state.junengTargetLock;
  if (snapshot.cannonDefenses) state.cannonDefenses = structuredClone(snapshot.cannonDefenses);
  else delete state.cannonDefenses;
  if (snapshot.borrowedBigCards) state.borrowedBigCards = structuredClone(snapshot.borrowedBigCards);
  else delete state.borrowedBigCards;
  if (snapshot.pendingDragonFireBonuses) state.pendingDragonFireBonuses = structuredClone(snapshot.pendingDragonFireBonuses);
  else delete state.pendingDragonFireBonuses;
  if (snapshot.damageAttribution) state.damageAttribution = structuredClone(snapshot.damageAttribution);
  else delete state.damageAttribution;
  delete state.turnEndStatusPending;
  if (snapshot.pendingSkillChoices) {
    state.pendingSkillChoices = JSON.parse(JSON.stringify(snapshot.pendingSkillChoices));
  } else {
    delete state.pendingSkillChoices;
  }
}

function clonePlayers(players: PlayerState[]): PlayerState[] {
  return JSON.parse(JSON.stringify(players)) as PlayerState[];
}

function restartLocalActions(state: GameState, spaceId: string): void {
  const occupants = new Set(state.players.filter((player) => player.spaceId === spaceId).map((player) => player.id));
  const saved = state.preemptiveRestartSnapshot?.players;
  state.players = state.players.map((player) => {
    if (!occupants.has(player.id)) return player;
    const snapshot = saved?.find((entry) => entry.id === player.id && entry.spaceId === spaceId);
    return snapshot ? structuredClone(snapshot) : player;
  });
  for (const id of occupants) {
    state.pendingActions[id] = { actions: [] };
    changeCakes(state, id, 0, "小空间重开清饼");
    if (state.turnActionReceipts) delete state.turnActionReceipts[id];
    if (state.turnAttackStats) delete state.turnAttackStats[id];
  }
  if (state.pendingDamageItems) state.pendingDamageItems = state.pendingDamageItems.filter((item) => !occupants.has(item.targetId));
  if (state.spaceReversalStates) delete state.spaceReversalStates[spaceId];
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
    if (ignoresNegativeStatuses(player)) continue;
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
  actions: Record<PlayerId, PlayerActionPlan>,
  invalidated: ReadonlySet<PlayerId>
): void {
  state.turnActionCosts = Object.fromEntries(Object.entries(actions).map(([id, plan]) => {
    const player = findPlayer(state, id)!;
    return [id, plan.actions.map((action) => action.type === "attack" ? getAttackActionCost(state, player, action) :
      action.type === "skill" ? getTurnSkillActionCost(player, action) : 0)];
  }));
  state.turnActionReceipts = {};
  for (const [playerId, plan] of Object.entries(actions)) {
    const player = findPlayer(state, playerId);
    if (!player) {
      continue;
    }

    const beforeAction = structuredClone(player);
    const ineffective = invalidated.has(playerId);
    const spentCakes = plan.actions.some((action) => action.type === "defense" && action.defense === "rebound")
      ? player.cakes : (state.turnActionCosts[playerId] ?? []).reduce((sum, value) => sum + value, 0);
    try {

    if (plan.actions.length === 1 && plan.actions[0]?.type === "gain_cake") {
      if (ineffective) continue;
      if (consumeParalysisNoCakeGain(player)) {
        state.eventLog.push({
          ...createBaseEvent(state, "system"),
          type: "system",
          message: `${player.name} 因麻痹固定为饼出招，本回合不加饼`
        });
        continue;
      }
      changeCakes(state, playerId, player.cakes + getCakeGainAmount(state, player), "出饼", "action");
      continue;
    }

    const reboundAction = plan.actions.find(
      (action) => action.type === "defense" && action.defense === "rebound"
    );
    if (reboundAction) {
      changeCakes(state, playerId, 0, "反弹消耗全部饼");
      continue;
    }

    if (!ineffective) rememberRoundActionUse(player, plan, state);

    const totalActionCost = (state.turnActionCosts[playerId] ?? []).reduce((sum, value) => sum + value, 0);

    if (totalActionCost > 0) {
      changeCakes(state, playerId, player.cakes - totalActionCost, "招式消耗");
    }

    consumeFreeSkillBuffs(player, plan);
    consumeSkillResourceBuffs(player, plan);

    for (const action of plan.actions) {
      if (action.type !== "skill") {
        continue;
      }

      if (action.skillId === COMMON_FUSION_SKILL_ID) {
        if (!ineffective) applySkillFusion(state, playerId, action.targetSkillId!, action.materialSkillIds, action.fusionRequestId, action.fusionMaterialInstanceIds);
        continue;
      }

      revealSkillOnUse(state, playerId, action.skillId, "使用技能");
      const pricing = getSkillElementCost(player, action);
      if (pricing) changeElementAmount(player, pricing.element, -pricing.perStack * action.stacks);
      recordSkillUsed(state, playerId, action.skillId, "turn_action");
      const play = getSkillPlay(action.skillId);
      if (ineffective) {
        if (play?.usesPerGame) markSkillUse(player, action.skillId);
        continue;
      }
      if (!isPlayerSkillDisabled(player)) activatePureSkyImmunity(state, player, action.skillId);
      const skillDisabled = isPlayerSkillDisabled(player) || isTypedSkillSuppressed(player, getSkill(action.skillId));
      if (skillDisabled) {
        if (isTypedSkillSuppressed(player, getSkill(action.skillId))) paySuppressedCooldown(state, player, action.skillId);
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

      const gain = getSkillResourceGainPerStack(player, action.skillId) * action.stacks;
      if (gain > 0) {
        const current = findPlayer(state, playerId);
        changeCakes(state, playerId, (current?.cakes ?? 0) + gain, `${getSkill(action.skillId)?.name ?? "技能"}生效`);
      }
      markSkillUse(player, action.skillId);
    }
    } finally {
      if (!ineffective) {
        const addedFusions = (player.skillFusions ?? []).filter((fusion) => !beforeAction.skillFusions?.some((old) => old.id === fusion.id));
        const addedSkillInstances = player.skillInventory?.filter((entry) => addedFusions.some((fusion) =>
          fusion.acquisition?.bonusSkillInstanceId === entry.instanceId));
        state.turnActionReceipts[playerId] = {
          cakesSpent: spentCakes, cakesGained: Math.max(0, player.cakes - beforeAction.cakes + spentCakes),
          ...(player.actionCakes === undefined ? {} : { actionCakeDelta: player.actionCakes - (beforeAction.actionCakes ?? 0) }),
          buffsBefore: beforeAction.buffs, buffsAfter: structuredClone(player.buffs), addedFusionIds: addedFusions.map(({ id }) => id),
          ...(addedSkillInstances?.length ? { addedSkillInstances } : {})
        };
      }
    }
  }
}

function findGuidanceInvalidations(state: GameState, actions: Record<PlayerId, PlayerActionPlan>): Set<PlayerId> {
  const invalidated = new Set<PlayerId>();
  const skill = getSkill(SPIRIT_GUIDANCE_ID)!;
  for (const [sourceId, plan] of Object.entries(actions)) {
    const source = findPlayer(state, sourceId);
    if (!source || isPlayerSkillDisabled(source) || isPlayerInCollapse(source) || isTypedSkillSuppressed(source, skill)) continue;
    for (const action of plan.actions) {
      if (action.type !== "skill" || action.skillId !== SPIRIT_GUIDANCE_ID || !bigAbilitySource(source, action)) continue;
      const targetId = action.targetIds?.[0];
      if (!targetId || !actions[targetId] || isSkillEffectImmune(state, targetId, skill, sourceId)) continue;
      invalidated.add(targetId);
      state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
        message: `${source.name} 的灵媒指引使 ${getPlayerName(state, targetId)} 的本回合出招无效` });
    }
  }
  return invalidated;
}

function cancelSubmittedActionForHuiyue(state: GameState, player: PlayerState): void {
  const receipt = state.turnActionReceipts?.[player.id];
  if (receipt) {
    changeCakes(state, player.id, player.cakes + receipt.cakesSpent - receipt.cakesGained,
      "辉月撤销出招：返还实付耗饼、收回出招收益", { actionCakeDelta: -(receipt.actionCakeDelta ?? 0) });
    const key = (buff: PlayerState["buffs"][number]) => JSON.stringify([buff.id, buff.sourcePlayerId, buff.sourceFusionId]);
    const before = new Map(receipt.buffsBefore.map((buff) => [key(buff), buff]));
    const after = new Map(receipt.buffsAfter.map((buff) => [key(buff), buff]));
    for (const buffKey of new Set([...before.keys(), ...after.keys()])) {
      const sample = before.get(buffKey) ?? after.get(buffKey)!;
      if (sample.id.startsWith(SKILL_ACTIVATED_BUFF_PREFIX)) continue; // Revealing a cancelled skill still counts as declaring it.
      const sum = (buffs: PlayerState["buffs"]) => buffs.filter((buff) => key(buff) === buffKey).reduce((total, buff) => total + buff.stacks, 0);
      const delta = sum(receipt.buffsAfter) - sum(receipt.buffsBefore);
      if (delta > 0) {
        let remaining = delta;
        for (const buff of player.buffs.filter((item) => key(item) === buffKey)) {
          const removed = Math.min(Math.max(0, buff.stacks), remaining);
          buff.stacks -= removed;
          remaining -= removed;
        }
      } else if (delta < 0) {
        const current = player.buffs.find((buff) => key(buff) === buffKey);
        if (current) current.stacks -= delta;
        else player.buffs.push({ ...sample, stacks: -delta });
      }
    }
    player.buffs = player.buffs.filter((buff) => buff.stacks > 0);
    changeActionBonusSkills(player, receipt.addedSkillInstances, -1);
    player.skillFusions = player.skillFusions?.filter((fusion) => !receipt.addedFusionIds.includes(fusion.id));
    delete state.turnActionReceipts![player.id];
  }
  state.pendingActions[player.id] = { actions: [] };
  player.buffs = player.buffs.filter((buff) => buff.id !== HUNYAO_QUEUED_SHA);
  if (state.turnActionCosts) state.turnActionCosts[player.id] = [];
  state.eventLog.push({ ...createBaseEvent(state, "action_cancelled"), type: "action_cancelled", playerId: player.id,
    reason: "辉月取消本回合出招，返还出招耗饼并收回出招收益" });
}

function rememberRoundActionUse(
  player: PlayerState,
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
    player.hp <= Math.floor(getPlayerInitialHp(player) / 2)
  ) {
    addCountingMark(player, "bailian_attack_count", "百炼攻击计数", attackActionCount);
    const counter = player.buffs.find((buff) => buff.id === "bailian_attack_count");
    const requiredAttacks = getFusionEnhancementCount(player, "skill_117_55768", ["神界炼魂"]) > 0 ? 20 : 25;
    if ((counter?.stacks ?? 0) >= requiredAttacks) {
      revealSkillOnWin(state, player.id, "skill_117_55768", "百炼成神胜利");
      upsertBuff(player, {
        id: "instant_win:bailian",
        name: "百炼成神胜利",
        stacks: 1
      });
    }
  }

  const markDefenses = plan.actions.filter((action) => action.type === "defense" &&
    ["small", "youtiao", "stone"].includes(action.defense)).length;
  recordIceFireDefenses(player, markDefenses);
  recordStarRageDefenses(player, markDefenses);

  const stoneDefenses = plan.actions.filter(
    (action) => action.type === "defense" && action.defense === "stone"
  ).length;
  recordSolarDefenses(player, plan.actions.filter((action) => action.type === "defense" && ["stone", "youtiao"].includes(action.defense)).length);
  const lavaSkillCount = getActiveSkillCount(player, "skill_21_36332") - getFusionEnhancementCount(player, "skill_21_36332", ["阳炎之怒"]);
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

  if (skill.id === getFusionSkillId("辉月")) {
    const fusionId = getReadyHuiyueFusionId(player, state.roundNumber);
    if (!fusionId) throw new Error("辉月仍在冷却中");
    cancelSubmittedActionForHuiyue(state, player);
    upsertBuff(player, { id: HUIYUE_BUFF_ID, name: "辉月", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
    player.buffs.push({ id: `${FLASH_DODGE_COOLDOWN_BUFF_ID}:${createId("cooldown")}`, name: "闪现冷却",
      stacks: 1, expiresAtRound: state.roundNumber + 3, sourcePlayerId: FLASH_DODGE_SKILL_ID, sourceFusionId: fusionId });
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
    withPlayerSpace(state, playerId, () => applyReversalPreparationEffect(state, player, skill.name));
    return;
  }

  if (skill.id === FLASH_DODGE_SKILL_ID) {
    const sky = getActiveFusionCount(player, "天空之城") > 0;
    if (sky) player.buffs.push({ id: "temp_absolute_invulnerable", name: "天空之城·闪现", stacks: 1,
      expiresAtTurn: state.turnNumber, sourceAbilityId: getFusionSkillId("天空之城") });
    else upsertBuff(player, { id: FLASH_DODGE_BUFF_ID, name: skill.name, stacks: 1,
      expiresAtTurn: state.turnNumber, sourcePlayerId: skill.id });
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
      message: `${player.name} 使用 ${skill.name}，本回合${sky ? "绝对无敌" : "回避所有攻击"}`
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

  if (getAttackMarkKind(skill.id)) {
    const kind = getAttackMarkKind(skill.id);
    const markName = kind === "lava" ? "熔岩" : kind === "winter" ? "凛冬" : "冰火";
    const index = action.switchActionIndex ?? getAttackMarkChoices(state, player.id)[0]!.actionIndex;
    queueAttackMarks(state, player, action);
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 消耗 ${action.stacks} 层${markName}印记，强化本回合第${index + 1}个攻击`
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
    const enhanced = getFusionEnhancementCount(player, skill.id, ["魔女斗篷", "红莲斗篷"]) > 0;
    addDefenseValue(state, player.id, enhanced ? 10 : 8, skill.name);
  }

  if (skill.id === "skill_48_26455" || play.effect === "gain_defense_value") {
    const enhanced = getFusionEnhancementCount(player, skill.id, ["魔女斗篷", "血魔之怒"]) > 0;
    addDefenseValue(state, player.id, enhanced ? 6 : 4, skill.name);
  }
}

function isDirectionalAction(action: PlayerAction): boolean {
  if (action.type === "attack") return true;
  if (action.type === "defense") return action.defense === "rebound";
  if (action.type !== "skill") return false;
  if (action.skillId === DRAGON_BLOOD_FIELD_ID && action.dragonBloodTotal)
    return getDragonBloodMode(action.dragonBloodTotal) !== "heal";
  const play = getSkillPlay(action.skillId);
  return play?.kind === "attack" || action.skillId === ELECTRIC_SHOCK_SKILL_ID ||
    Boolean(action.targetId || action.targetIds?.length || play?.allEnemyDamage !== undefined);
}

function captureOffense(state: GameState, attack: AttackInstance, attacks: AttackInstance[]): NonNullable<AttackInstance["offenseSnapshot"]> {
  const source = findPlayer(state, attack.sourceId), target = findPlayer(state, attack.targetId)!;
  const last = isLastHitAttack(attack, attacks);
  let critical = 1;
  for (let i = 0; i < getActiveFusionCount(source, "无尽战刃"); i++) if (Math.random() < .5) critical *= 2;
  return { guding: target.cakes <= 0 ? 2 ** getActiveSkillCount(source, "skill_29_96125") : 1,
    sniper: last ? 2 ** getActiveSkillCount(source, "skill_28_42646") : 1,
    bonus: target.hp >= Math.floor(getPlayerInitialHp(target) / 2) ? getActiveFusionCount(source, "破军") : 0,
    critical, retirement: last && target.cakes === 0 && getActiveFusionCount(source, "暗影狙击") > 0,
    iceRain: getActiveSkillCount(source, "skill_20_63089"),
    echo: Boolean(source && getFusionEnhancementCount(source, "skill_78_18866", ["回响之杖"]) > 0),
    freeRi: Boolean(source && getFusionEnhancementCount(source, "skill_82_45540", ["后羿•七日连珠"]) > 0) };
}

function applyReversalPreparationEffect(state: GameState, player: PlayerState, skillName: string): void {
  let cache = getSpaceReversal(state, player.id);
  if (cache?.turnNumber !== state.turnNumber) {
    const attacks = createAttackInstances(state, getRevealedActions(state));
    for (const attack of attacks) attack.offenseSnapshot = captureOffense(state, attack, attacks);
    cache = { turnNumber: state.turnNumber, attacks, suppressed: false, receipts: {}, fusions: {} };
    if (player.spaceId) (state.spaceReversalStates ??= {})[player.spaceId] = cache;
    else state.reversalState = cache;
  }
  state.reversalResponseOnly = true;
  state.actionWindowPassPlayerIds = state.actionWindowPassPlayerIds.filter((id) => !findPlayer(state, id));
  const cancelling = isReversalActive(state);
  for (const owner of state.players) owner.buffs = owner.buffs.filter((buff) => buff.id !== REVERSAL_TURN_BUFF_ID);
  if (!cancelling) upsertBuff(player, { id: REVERSAL_TURN_BUFF_ID, name: skillName, stacks: 1,
    expiresAtTurn: state.turnNumber, sourcePlayerId: player.id });
  if (cancelling) {
    for (const [id, receipt] of Object.entries(cache.receipts)) {
      const owner = findPlayer(state, id); if (!owner || !receipt) continue;
      changeActionReceiptEffect(state, owner, receipt, 1);
      owner.skillFusions = [...(owner.skillFusions ?? []), ...(cache.fusions[id] ?? [])];
    }
  } else {
    cache.receipts = {}; cache.fusions = {};
    for (const [id, plan] of Object.entries(state.pendingActions)) {
      if (!plan || plan.actions.some(isDirectionalAction)) continue;
      const owner = findPlayer(state, id), receipt = state.turnActionReceipts?.[id];
      if (!owner || !receipt) continue;
      cache.receipts[id] = receipt;
      cache.fusions[id] = (owner.skillFusions ?? []).filter((fusion) => receipt.addedFusionIds.includes(fusion.id));
      changeActionReceiptEffect(state, owner, receipt, -1);
      owner.skillFusions = owner.skillFusions?.filter((fusion) => !receipt.addedFusionIds.includes(fusion.id));
    }
  }
  cache.suppressed = !cancelling;
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: cancelling
    ? `${player.name} 使用 ${skillName}，取消上一次逆转，恢复原出招及其消耗、收益`
    : `${player.name} 使用 ${skillName}，保存攻击加成并逆转所有指向性出招，非指向性出招取消并退还消耗` });
}

/** Apply only the original submission's deltas; preserve later window actions and their costs. */
function changeActionReceiptEffect(state: GameState, player: PlayerState,
  receipt: NonNullable<GameState["turnActionReceipts"]>[string] & {}, direction: 1 | -1): void {
  changeCakes(state, player.id, Math.max(0, player.cakes + direction * (receipt.cakesGained - receipt.cakesSpent)),
    direction < 0 ? "逆转取消出招并退还消耗" : "二次逆转恢复出招消耗和收益",
    { actionCakeDelta: direction * (receipt.actionCakeDelta ?? 0) });
  const key = (buff: PlayerState["buffs"][number]) => JSON.stringify([buff.id, buff.sourcePlayerId, buff.sourceFusionId]);
  const before = new Map(receipt.buffsBefore.map((buff) => [key(buff), buff]));
  const after = new Map(receipt.buffsAfter.map((buff) => [key(buff), buff]));
  for (const buffKey of new Set([...before.keys(), ...after.keys()])) {
    const sample = before.get(buffKey) ?? after.get(buffKey)!;
    if (sample.id.startsWith(SKILL_ACTIVATED_BUFF_PREFIX)) continue;
    if (sample.id === STAR_RAGE_MARK_ID && player.buffs.some((buff) => buff.id === "star_rage_spent" &&
      buff.sourceFusionId === sample.sourceFusionId && buff.expiresAtTurn === state.turnNumber)) continue;
    const sum = (buffs: PlayerState["buffs"]) => buffs.filter((buff) => key(buff) === buffKey).reduce((n, buff) => n + buff.stacks, 0);
    const delta = direction * (sum(receipt.buffsAfter) - sum(receipt.buffsBefore));
    if (delta > 0) {
      const current = player.buffs.find((buff) => key(buff) === buffKey);
      if (current) current.stacks += delta; else player.buffs.push({ ...sample, stacks: delta });
    } else if (delta < 0) {
      let remaining = -delta;
      for (const buff of player.buffs.filter((buff) => key(buff) === buffKey)) {
        const removed = Math.min(buff.stacks, remaining); buff.stacks -= removed; remaining -= removed;
      }
    }
  }
  player.buffs = player.buffs.filter((buff) => buff.stacks > 0);
  changeActionBonusSkills(player, receipt.addedSkillInstances, direction);
}

function changeActionBonusSkills(player: PlayerState, instances: PlayerState["skillInventory"], direction: 1 | -1): void {
  if (!player.skillInventory) return;
  for (const entry of instances ?? []) {
    const index = player.skillInventory.findIndex(({ instanceId }) => instanceId === entry.instanceId);
    if (direction < 0) removeSkillInstanceAt(player, index);
    else if (index < 0) {
      player.skillInventory.push({ ...entry });
      player.skills.push(entry.skillId);
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
      ? action.attackStatModifier ?? "swap_power_level"
      : action.attackStatModifier;
  if (!modifier) {
    return;
  }

  const modifierBuff: PlayerState["buffs"][number] = {
    id: pendingAttackStatModifierBuffId(actionIndex, modifier),
    name: skillName,
    stacks: 1,
    expiresAtTurn: state.turnNumber
  };
  if (skillId === "skill_45_30424") {
    const fusion = player.skillFusions?.find((item) => isFusionActive(player, item) &&
      getFusionRecipe(item.skillId)?.skill.name === "宗师之力");
    if (fusion) modifierBuff.sourceFusionId = fusion.id;
  }
  if (skillId === "skill_91_89631" && hasEnhancedLevelSwap(player)) {
    const fusion = player.skillFusions?.find((fusion) => isFusionActive(player, fusion) &&
      getFusionRecipe(fusion.skillId)?.skill.name === "杀级换")?.id;
    if (fusion) modifierBuff.sourceFusionId = fusion;
  }
  player.buffs.push(modifierBuff);

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
  if (action.doubleEdgeMode === "pierce_rebound") {
    player.buffs.push({ id: `double_edge_pierce:${actionIndex}`, name: "双刃剑破弹", stacks: 1, expiresAtTurn: state.turnNumber });
    return;
  }
  if (action.doubleEdgeMode === "ignore_all_defense" && pendingAction) {
    const stats = getDoubleEdgeAttackStats(state, player.id, actionIndex, pendingAction);
    if (!stats) return;
    for (const id of getDoubleEdgeAttackTargetIds(state, player.id, pendingAction, stats)) player.buffs.push({
      id: doubleEdgeIgnoreDefenseBuffId(actionIndex, id), name: skillName, stacks: 1, expiresAtTurn: state.turnNumber, sourcePlayerId: id
    });
    player.buffs.push({ id: `double_edge_group:${actionIndex}`, name: "双刃剑群破防", stacks: 1, expiresAtTurn: state.turnNumber });
    return;
  }
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
      candidate.mode === "area_to_sky" ? `${player.name} 使用 ${skillName}，将 ${source.name} 的第 ${candidate.actionIndex + 1} 个群体攻击改为指向天` : candidate.mode === "area_to_self"
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
  const preview = previewPlayerAttackStats(state, playerId).stats[actionIndex];
  if (preview) return preview;
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
    ? applyReboundSkillModifiers(findPlayer(state, playerId), baseStats)
    : applyAttackModifiers(cloneGameState(state), playerId, baseStats, actionIndex);
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
  mode: "area_to_self" | "single_to_area" | "area_to_sky";
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

  const area = stats.isArea || forcedArea;
  const guard = findPlayer(state, guardPlayerId)!;
  if (action.absoluteGuardToSky && (!area || getFusionEnhancementCount(guard, ABSOLUTE_GUARD_SKILL_ID, ["绝对天盾"]) <= 0)) return undefined;
  const mode = area ? action.absoluteGuardToSky ? "area_to_sky" : "area_to_self" : "single_to_area";
  const rawCost =
    sourceAction.type === "attack"
      ? getAttackActionCost(state, source, sourceAction)
      : getEffectiveSkillActionCost(source, sourceAction, state, sourceId);
  return {
    sourceId,
    actionIndex,
    mode,
    cost: getAbsoluteGuardCost(guard, payableAttackCost(stats.cost))
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
      stats.id !== DRAGON_HEIR_ID &&
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
): { mode: "area_to_self" | "single_to_area" | "area_to_sky"; guardPlayerId: PlayerId } | undefined {
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

function markSkillUse(player: PlayerState, skillId: string): void {
  if (skillId === DRAGON_DISAPPEAR_ID) return;
  const before = getSkillUseCount(player, skillId);
  recordSkillUse(player, skillId);
  if (!getSkillPlay(skillId)?.usesPerGame || getSkillUseCount(player, skillId) === before) return;
  for (const card of player.bigCards ?? []) {
    const skillInventory = player.skillInventory?.filter((entry) => entry.sourceBigCardInstanceId === card.instanceId) ?? [];
    const skillFusions = player.skillFusions?.filter((fusion) => fusion.sourceBigCardInstanceId === card.instanceId) ?? [];
    if (!skillInventory.some((entry) => entry.skillId === skillId) && !skillFusions.some((entry) => entry.skillId === skillId)) continue;
    const limit = getSkillUseLimit({ skills: skillInventory.map((entry) => entry.skillId), buffs: player.buffs,
      skillInventory, skillFusions, bigCards: [card] }, skillId) ?? 0;
    const used = card.grantedSkillUses?.[skillId] ?? 0;
    if (used >= limit) continue;
    (card.grantedSkillUses ??= {})[skillId] = used + 1;
    break;
  }
}

function getSkillUseCount(
  player: { buffs: Array<{ id: string; stacks: number }> },
  skillId: string
): number {
  return player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
}

function getEffectiveSkillActionCost(
  player: PlayerState,
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

  return getTurnSkillActionCost(player, action);
}

function consumeFreeSkillBuffs(player: PlayerState, plan: PlayerActionPlan): void {
  for (const action of plan.actions) {
    if (action.type !== "skill") {
      continue;
    }

    const charge = getFreeSkillChargeId(player, action.skillId);
    if (!charge) continue;
    const freeStacks = Math.min(action.stacks, Math.max(0, action.freeStacks ?? 0));
    if (freeStacks <= 0) {
      continue;
    }
    const buff = player.buffs.find((item) => item.id === charge && item.stacks > 0);
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
  player: { buffs: Array<{ id: string; stacks: number; infinite?: boolean }> },
  buffId: string,
  amount: number
): boolean {
  const buff = player.buffs.find((item) => item.id === buffId && item.stacks > 0);
  if (!buff || buff.stacks < amount) {
    return false;
  }

  if (!buff.infinite) buff.stacks -= amount;
  player.buffs = player.buffs.filter((item) => item.stacks > 0);
  return true;
}

function createAttackInstances(
  state: GameState,
  plans: Record<PlayerId, PlayerActionPlan>
): AttackInstance[] {
  const attacks: AttackInstance[] = [];
  const previews = new Map<PlayerId, PlayerAttackStatPreview>();
  for (const sourceId of Object.keys(plans)) previews.set(sourceId, previewPlayerAttackStats(state, sourceId));
  state.turnAttackStats = Object.fromEntries([...previews].map(([id, preview]) => [id, structuredClone(preview.stats)]));
  for (const [sourceId, preview] of previews) {
    const source = findPlayer(state, sourceId)!;
    const difference = preview.costs.reduce((sum, cost) => sum + cost, 0) - preview.originalCosts.reduce((sum, cost) => sum + cost, 0);
    if (difference !== 0) {
      const receipt = state.turnActionReceipts?.[sourceId];
      const previousActionCakes = source.actionCakes;
      const returnedActionCakes = difference < 0 ? Math.min(-difference, Math.max(0, -(receipt?.actionCakeDelta ?? 0))) : 0;
      changeCakes(state, sourceId, source.cakes - difference,
        difference > 0 ? "变招费用结算：补扣差额" : "变招费用结算：退还差额", { actionCakeDelta: returnedActionCakes });
      if (receipt) {
        receipt.cakesSpent += difference;
        if (previousActionCakes !== undefined && source.actionCakes !== undefined) {
          receipt.actionCakeDelta = (receipt.actionCakeDelta ?? 0) + source.actionCakes - previousActionCakes;
        }
      }
    }
    state.turnActionCosts ??= {};
    state.turnActionCosts[sourceId] = preview.costs;
    for (const failure of preview.failures) state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${source.name} 第${failure.actionIndex + 1}个攻击的属性交换失败：${failure.error}` });
  }

  for (const [sourceId, plan] of Object.entries(plans)) {
    for (const [actionIndex, action] of plan.actions.entries()) {
      const source = findPlayer(state, sourceId);
      if (action.type === "skill" && (isPlayerSkillDisabled(source) || isPlayerInCollapse(source) || isTypedSkillSuppressed(source, getSkill(action.skillId)))) {
        continue;
      }

      const isElectricShockAction =
        action.type === "skill" && action.skillId === ELECTRIC_SHOCK_SKILL_ID;
      let baseStats =
        action.type === "attack"
          ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks)
          : action.type === "skill"
            ? isElectricShockAction
              ? electricShockStats()
              : getSkillAttackStats(action.skillId, action.stacks)
            : undefined;
      if (baseStats) baseStats = shapeDragonBloodAttack(state, sourceId, action, baseStats);
      if (!baseStats) {
        continue;
      }
      let stats = isElectricShockAction
        ? applyReboundSkillModifiers(source, baseStats)
        : applyAttackModifiers(state, sourceId, baseStats, actionIndex);
      if (source && action.type === "skill" && BIG_CARD_SKILLS[action.skillId]) {
        const instanceId = bigAbilitySource(source, action);
        if (instanceId) stats = { ...stats, sourceBigCardInstanceId: instanceId };
        if (isCannonAttack(action)) stats = { ...stats, cannonDefensePending: true, noReviveOrExtraLives: true };
      }
      if (!isElectricShockAction) {
        const modified = previews.get(sourceId)?.stats[actionIndex];
        if (modified) stats = { ...stats, cost: modified.cost, power: modified.power,
          level: modified.level, traits: modified.traits, ignoreEarthBreak: Boolean(modified.ignoreEarthBreak),
          ...(modified.powerValue ? { powerValue: modified.powerValue } : {}),
          ...(modified.levelValue ? { levelValue: modified.levelValue } : {}),
          ...(modified.costValue ? { costValue: modified.costValue } : {}),
          ...(modified.damageParts ? { damageParts: [...modified.damageParts] } : {}),
          ...(modified.damagePartValues ? { damagePartValues: modified.damagePartValues } : {}) };
        if (source) source.buffs = source.buffs.filter((buff) => !buff.id.startsWith(`${ATTACK_STAT_MODIFIER_BUFF_PREFIX}${actionIndex}:`));
      }
      if (source?.buffs.some((buff) => buff.id === `double_edge_pierce:${actionIndex}`)) stats = {
        ...stats, traits: Array.from(new Set([...stats.traits, "pierce_rebound"]))
      };
      if (!isElectricShockAction && isFrostBladeAttackActive(source)) {
        stats = addAttackElement(
          {
            ...stats,
            traits: Array.from(new Set([...stats.traits, "frost_blade"])),
            frostBladeKeepsDamage: getFusionEnhancementCount(source!, "skill_18_34323", ["冰霜长矛", "水火双生", "极寒"]) > 0
          },
          "ice"
        );
      }
      const forcedArea = Boolean(
        !isElectricShockAction &&
          stats.id !== DRAGON_HEIR_ID &&
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
      let targets = absoluteGuardOverride?.mode === "area_to_sky" ? [] : absoluteGuardOverride?.mode === "area_to_self"
        ? [absoluteGuardOverride.guardPlayerId]
        : getAttackTargetIds(
            state,
            sourceId,
            action,
            stats,
            forcedArea || absoluteGuardOverride?.mode === "single_to_area"
          );
      if (!isElectricShockAction) {
        if (isBigSkillMode(state.config.skillMode) && forcedArea && !absoluteGuardOverride) {
          stats = { ...stats, isArea: true, traits: Array.from(new Set([...stats.traits, "area"])) };
        }
        const expanded = stats.id === DRAGON_HEIR_ID ? undefined : getHunyaoExpandedTargets(state, sourceId, stats, targets);
        if (expanded) {
          stats = { ...stats, isArea: true, includeSelf: false, traits: Array.from(new Set([...stats.traits, "area"])) };
          targets = filterPuppetAttackTargetIds(state, sourceId, expanded);
        }
      }

      for (const targetId of targets.filter((id) => canAffectAcrossSpace(state, sourceId, id))) {
        if (!isElectricShockAction && isDecayBlockingAttack(state, sourceId, stats, targetId)) continue;
        const instance: AttackInstance = {
          key: `${sourceId}:${targetId}:${attacks.length}`,
          reboundFamilyKey: `${sourceId}:${actionIndex}`,
          sourceId,
          originalTargetId: targetId,
          targetId,
          actionIndex,
          stats,
          reflected: false
        };
        if (stats.id === getFusionSkillId("山崩地裂") || (stats.id === "skill_78_18866" &&
          source && getFusionEnhancementCount(source, stats.id, ["流星雨"]) > 0)) {
          const defense = getDefensiveActionForAttack(state, instance, plans[targetId]);
          if (defense?.type === "defense" && defense.defense === "stone") instance.stats = {
            ...withAttackPower(stats, RETIRE_VALUE), traits: [...stats.traits, "defeat_retire"]
          };
        }
        attacks.push(instance);
      }
    }
  }

  appendQueuedWindowAttacks(state, plans, attacks);
  return attacks;
}

function appendQueuedWindowAttacks(state: GameState, plans: Record<PlayerId, PlayerActionPlan>, attacks: AttackInstance[]): void {
  for (const source of alivePlayers(state)) {
    const queued = source.buffs.filter((buff) => buff.id === HUNYAO_QUEUED_SHA && (buff.expiresAtTurn ?? 0) > state.turnNumber);
    if (!queued.length) continue;
    source.buffs = source.buffs.filter((buff) => buff.id !== HUNYAO_QUEUED_SHA);
    for (let index = 0; index < queued.length; index++) {
      const actionIndex = (plans[source.id]?.actions.length ?? 0) + index;
      const base = getStackedAttackStats(BASE_ATTACKS.sha, 1);
      const stats = applyAttackModifiers(state, source.id, { ...base, name: "追魂者·杀", cost: 0,
        level: EXECUTE_EFFECT_POWER, isArea: true, traits: [...base.traits, "area"] }, actionIndex);
      const key = `${source.id}:hunyao:${actionIndex}`;
      for (const target of playersInSpace(state, source.id).filter((item) => item.status === "alive")) {
        if (target.id === source.id || target.id === getPuppetMasterId(source) ||
          isDecayBlockingAttack(state, source.id, stats, target.id)) continue;
        attacks.push({ key: `${key}:${target.id}`, reboundFamilyKey: key, sourceId: source.id,
          originalTargetId: target.id, targetId: target.id, actionIndex, stats, reflected: false });
      }
    }
  }
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
        .filter((player) => player.id !== sourceId || stats.includeSelf)
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
  if (!playerHasActiveSkill(source, PUTIAN_TONGQING_SKILL_ID) || hasEnhancedPutianRange(source)) {
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
    reboundFamilyKey: `${attack.reboundFamilyKey ?? `${attack.sourceId}:${attack.actionIndex}`}:reversed:${attack.targetId}`,
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
      if (action.type === "skill" && action.skillId === JIHAN_ULTIMATE_ID) {
        targetPlan.actions.push(action);
      } else if (action.type === "skill" && getSkillPlay(action.skillId)?.kind !== "attack" && action.targetId) {
        actions[action.targetId]?.actions.push({ ...action, targetId: playerId });
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

function isDecayBlockingAttack(
  state: GameState,
  sourceId: PlayerId,
  stats: AttackStats,
  targetId?: PlayerId
): boolean {
  const blocker = getAttackFieldBlocker(state, sourceId, stats, targetId);
  if (!blocker) return false;
  if (blocker.skillId === "skill_44_20092" && targetId) awardRevenge(state, findPlayer(state, sourceId), targetId, true);
  for (const id of blocker.ownerIds) revealSkillOnTrigger(state, id, blocker.skillId, `触发${blocker.name}`);
  if (blocker.skillId === "skill_11_89360" && attackLevelValue(stats).length && attackPowerValue(stats).length &&
    compareCombatValues(attackPowerValue(stats), INFINITY_VALUE) < 0) {
    for (const id of blocker.ownerIds) revealSkillOnTrigger(state, id, getFusionSkillId("枯萎"), "枯萎额外正整数无效化攻击");
  }
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${getPlayerName(state, sourceId)} 的 ${stats.name} 被${blocker.name}抹除`
  });
  return true;
}

function applyRebounds(state: GameState, attacks: AttackInstance[], actions: Record<PlayerId, PlayerActionPlan>,
  healthDeltas: Map<PlayerId, HealthDelta>): AttackInstance[] {
  const paidBacklashes = new Set<string>();
  return resolveReboundAttacks(state, attacks, actions,
    (attack) => {
      if (attack.stats.isSkill) recordJihanActionBlock(state, healthDeltas, attack, false);
      applyBlockedAttackEffects(state, attack, healthDeltas);
    },
    (attack, defenses) => {
      if (attack.stats.isSkill) recordJihanActionBlock(state, healthDeltas, attack, false);
      if (attack.stats.id !== KOU_ATTACK_SKILL_ID || !defenses.some((defense) => defense.targetId === attack.sourceId)) return;
      const source = findPlayer(state, attack.sourceId);
      if (source && getFusionEnhancementCount(source, KOU_ATTACK_SKILL_ID, ["抠皇"]) > 0) return;
      const key = `${attack.reboundFamilyKey ?? `${attack.sourceId}:${attack.actionIndex}`}:${attack.targetId}`;
      if (paidBacklashes.has(key)) return;
      paidBacklashes.add(key);
      addDamage(state, healthDeltas, attack.sourceId, 3, attack.sourceId, "抠反噬");
    }, (attack) => {
      const target = findPlayer(state, attack.targetId);
      stripVerdictAttack(target, attack);
      if (blockVerdictMove(state, target, attack.sourceId, `move:${attack.actionIndex}`, !attack.stats.isSkill)) return true;
      const skill = BIG_CARD_SKILLS[attack.stats.id];
      if (ignoresOtherActiveSkill(target, attack.sourceId, getSkill(attack.stats.id))) {
        pushAttackBlockedEvent(state, { sourceId: attack.sourceId, targetId: attack.targetId,
          attackName: attack.stats.name, blockKind: "block", protectionName: "狂龙之舞" });
        return true;
      }
      if (target && skill && isBigCardAbilityIgnored(target, skill)) {
        pushAttackBlockedEvent(state, { sourceId: attack.sourceId, targetId: target.id,
          attackName: attack.stats.name, blockKind: "block", protectionName: "无视" });
        return true;
      }
      if (!isHunyaoAreaAttack(attack.stats) || getActiveSkillCount(target, HUNYAO_AREA_ID) === 0) return false;
      revealSkillOnTrigger(state, attack.targetId, HUNYAO_AREA_ID, "魂耀九州无视群攻");
      state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
        message: `${getPlayerName(state, attack.targetId)} 无视了 ${attack.stats.name} 的群攻` });
      return true;
    });
}

function resolveClashes(
  state: GameState,
  attacks: AttackInstance[],
  handledAttackKeys: Set<string>,
  healthDeltas: Map<PlayerId, HealthDelta>,
  actions: Record<PlayerId, PlayerActionPlan>
): void {
  for (const attack of attacks) {
    if (handledAttackKeys.has(attack.key) || attack.sourceId === attack.targetId || attack.skipClash) {
      continue;
    }

    const counter = attacks.find(
      (candidate) =>
        candidate.sourceId !== candidate.targetId &&
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
    const owner = findPlayer(state, other.sourceId);
    if (owner && owner.id !== ding.sourceId && getFusionEnhancementCount(owner, KOU_ATTACK_SKILL_ID, ["抠皇"]) > 0)
      grantInitializedSkill(state, owner.id, SAND_SKILL_ID, "抠皇对撞奖励", false);
    addDefeatEffect(
      state,
      healthDeltas,
      ding.sourceId,
      2,
      other.sourceId,
      "丁与抠特殊对撞",
      other.stats,
      attackDamageContext(other)
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

  const levelComparison = compareCombatValues(attackLevelValue(a.stats), attackLevelValue(b.stats));
  if (levelComparison === 0) {
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: `${a.stats.name} 与 ${b.stats.name} 等级相同，互相抵消`
    });
    return;
  }

  const high = levelComparison > 0 ? a : b;
  const low = high === a ? b : a;
  const powers = high.stats.damagePartValues ?? high.stats.damageParts?.map(power => combatValue(power)) ?? [attackPowerValue(high.stats)];
  const parts = powers.map(power => calculateClashValue(high.stats, low.stats, power, !isBigSkillMode(state.config.skillMode)));
  const damage = parts.reduce(addCombatValues, []);
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
  for (const part of parts) addDamage(state, healthDeltas, low.sourceId, part, high.sourceId,
    high.stats.name, high.stats, { ...attackDamageContext(high), zeroClashHit: part.length === 0 });
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
    result: `${high.stats.name} 等级更高，对 ${getPlayerName(state, low.sourceId)} 造成 ${formatCombatValue(damage)} 点伤害`
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
    if (compareCombatValues(attackLevelValue(qin.stats), attackLevelValue(sha.stats)) >= 0) {
      return false;
    }

    const damage = calculateClashValue(sha.stats, qin.stats, attackPowerValue(sha.stats), !isBigSkillMode(state.config.skillMode));
    const eventStart = state.eventLog.length;
    addDamage(
      state,
      healthDeltas,
      qin.sourceId,
      damage,
      sha.sourceId,
      sha.stats.name,
      sha.stats,
      { ...attackDamageContext(sha), zeroClashHit: damage.length === 0 }
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
      result: `杀 vs 擒：${getPlayerName(state, sha.sourceId)} 等级更高，按对撞造成 ${formatCombatValue(damage)} 点伤害并额外回复 ${qin.stats.stacks} 血`
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
    const blockedByAction = attack.sourceId !== attack.targetId && defendedByAction &&
      !consumeDoubleEdgeDefenseIgnore(state, attack, targetAction);
    if (
      attack.sourceId !== attack.targetId &&
      (blockedByAction || canShaParryNanMan(attack, actions[attack.targetId]))
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
      if (blockedByAction && defense) recordJihanActionBlock(state, healthDeltas, attack, defense !== "gain_cake");
      state.eventLog.push(event);
      awardGuidaoCharge(state, attack, targetAction);
      applyBlockedAttackEffects(state, attack, healthDeltas);
      continue;
    }

    const isLastHit = isLastHitAttack(attack, attacks);
    if (attack.sourceId !== attack.targetId &&
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
    for (const part of attackDamageParts(attack.stats)) {
      addDamage(state, healthDeltas, attack.targetId, part, attack.sourceId, attack.stats.name,
        withAttackPower(attack.stats, part), attackDamageContext(attack, isLastHit));
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

function attackDamageParts(stats: AttackStats): CombatValue[] {
  return stats.damagePartValues ?? stats.damageParts?.map(power => combatValue(power)) ??
    Array.from({ length: stats.damageHits ?? (stats.id === "skill_96_33279" ? 2 : 1) }, () => attackPowerValue(stats));
}

function jihanAttackFamily(attack: AttackInstance): string {
  return attack.reboundFamilyKey ?? attack.key;
}

function recordJihanActionBlock(state: GameState, deltas: Map<PlayerId, HealthDelta>, attack: AttackInstance, basic: boolean): void {
  if (!isBigSkillMode(state.config.skillMode)) return;
  const blocks = ensureDelta(deltas, attack.targetId).jihanActionBlocks ??= new Map();
  const key = jihanAttackFamily(attack);
  if (!blocks.has(key) || basic) blocks.set(key, { attack, basic });
}

function recordJihanNonAttackHit(state: GameState, deltas: Map<PlayerId, HealthDelta>, sourceId: PlayerId, targetId: PlayerId): void {
  if (!isBigSkillMode(state.config.skillMode) || sourceId === targetId) return;
  (ensureDelta(deltas, sourceId).jihanNonAttackHits ??= []).push(targetId);
}

function resolveJihanTurnEffects(state: GameState, attacks: AttackInstance[], actions: Record<PlayerId, PlayerActionPlan>,
  deltas: Map<PlayerId, HealthDelta>): void {
  const players = alivePlayers(state);
  const counter = getSkill(JIHAN_COUNTER_ID)!;
  const freeze = getSkill(JIHAN_FREEZE_ID)!;
  const seal = getSkill(JIHAN_SEAL_ID)!;
  const frozenFamilies = new Set<string>();
  const galaxyTargets = new Set<string>();

  for (const attack of attacks) {
    if (attack.stats.id !== POLAR_GALAXY_ID || attack.sourceId === attack.targetId) continue;
    const key = `${jihanAttackFamily(attack)}:${attack.targetId}`;
    if (galaxyTargets.has(key)) continue;
    galaxyTargets.add(key);
    if (!actions[attack.targetId]?.actions.some((action) => action.type === "defense" && action.defense === "stone")) {
      addHeal(state, deltas, attack.sourceId, 10, attack.sourceId, "极地银河");
    }
  }

  for (const owner of players) {
    const delta = deltas.get(owner.id);
    for (const card of getJihanCards(owner, JIHAN_COUNTER_ID)) {
      const amount = jihanScaledValue(1, card.jihanDamage ?? 0, 100);
      for (const _hit of delta?.jihanHits ?? []) {
        revealSkillOnTrigger(state, owner.id, counter.id, "受到攻击命中，触发冰伤反击");
        for (const target of players) {
          if (target.id === owner.id || isBigCardAbilityIgnored(target, counter)) continue;
          addDamage(state, deltas, target.id, amount, owner.id, counter.name,
            attributeDamageStats(counter.id, counter.name, amount, "ice"), { spellDamage: true, bypassDamageImmunity: true });
        }
      }
    }
    for (const { attack } of delta?.jihanActionBlocks?.values() ?? []) {
      if (attack.stats.id === ELECTRIC_SHOCK_SKILL_ID) continue;
      const family = jihanAttackFamily(attack);
      if (frozenFamilies.has(family)) continue;
      frozenFamilies.add(family);
      const cards = getJihanCards(findPlayer(state, attack.sourceId), JIHAN_FREEZE_ID);
      if (!cards.length) continue;
      const targetIds = new Set(attacks.filter((item) => jihanAttackFamily(item) === family).map((item) => item.targetId));
      targetIds.add(attack.targetId);
      for (const card of cards) {
        const duration = jihanScaledValue(2, 2 * (card.jihanBlocks ?? 0), 20);
        revealSkillOnTrigger(state, attack.sourceId, freeze.id, "攻击被出招防住，触发冰封");
        for (const id of targetIds) {
          if (!isSkillEffectImmune(state, id, freeze, attack.sourceId)) applyFrozenStatus(state, id, duration, "turn", attack.sourceId);
        }
      }
    }
  }

  // Resolve all hits using the counters from before this judgment point.
  const seals: Array<{ sourceId: PlayerId; target: PlayerState; duration: number; unit: "turn" | "round" }> = [];
  for (const owner of players) {
    const delta = deltas.get(owner.id);
    const blocks = [...(delta?.jihanActionBlocks?.values() ?? [])];
    const blocked = blocks.filter(({ attack, basic }) => basic && attack.stats.id !== ELECTRIC_SHOCK_SKILL_ID).length;
    for (const card of getJihanCards(owner, JIHAN_FREEZE_GROWTH_ID)) {
      if (blocked > 0) card.jihanBlocks = Math.min(10, (card.jihanBlocks ?? 0) + blocked);
    }
    const targets = [
      ...(delta?.jihanNonAttackHits ?? []),
      ...blocks.filter(({ attack }) => attack.stats.id === ELECTRIC_SHOCK_SKILL_ID).map(({ attack }) => attack.sourceId)
    ];
    for (const card of getJihanCards(owner, JIHAN_SEAL_ID)) {
      const duration = jihanScaledValue(1, card.jihanSeals ?? 0, 10);
      for (const id of targets) {
        const target = findPlayer(state, id);
        if (target && !isSkillEffectImmune(state, id, seal, owner.id)) {
          revealSkillOnTrigger(state, owner.id, seal.id, "非攻击招式命中或防住，触发封锁");
          seals.push({ sourceId: owner.id, target, duration, unit: "turn" });
        }
      }
    }
    for (const card of getJihanCards(owner, JIHAN_SEAL_GROWTH_ID)) {
      if (targets.length > 0) card.jihanSeals = Math.min(10, (card.jihanSeals ?? 0) + targets.length);
    }
    for (const id of delta?.jihanUltimateSeals ?? []) {
      const target = findPlayer(state, id);
      if (target) seals.push({ sourceId: owner.id, target, duration: 2, unit: "round" });
    }
  }
  for (const { sourceId, target, duration, unit } of seals) applyJihanSkillSeal(state, sourceId, target, duration, unit);
}

function attackDamageContext(attack: AttackInstance, isLastHit = false): DamageContext {
  return { fromAttack: true, attackKey: attack.key, verdictMoveKey: `move:${attack.actionIndex}`, isLastHit, reflected: attack.reflected,
    ...(attack.verdictStripped ? { verdictStripped: true } : {}),
    ...(attack.stats.sourceBigCardInstanceId ? { sourceAbilityId: attack.stats.id, sourceBigCardInstanceId: attack.stats.sourceBigCardInstanceId } : {}),
    ...(attack.stats.noReviveOrExtraLives ? { noReviveOrExtraLives: true } : {}),
    ...(attack.actionRebounderIds ? { actionRebounderIds: attack.actionRebounderIds } : {}),
    ...(attack.offenseSnapshot ? { offenseSnapshot: attack.offenseSnapshot } : {}),
    ...(attack.infiniteCopies ? { infiniteCopies: true } : {}),
    ...(attack.originSourceId ? { originSourceId: attack.originSourceId } : {}) };
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
  mode: "area_to_self" | "single_to_area" | "area_to_sky",
  guardPlayerId: PlayerId
): string {
  return `${ABSOLUTE_GUARD_BUFF_PREFIX}${actionIndex}:${mode}:${guardPlayerId}:${createId("absolute_guard")}`;
}

function parseAbsoluteGuardBuff(
  id: string | undefined
): { mode: "area_to_self" | "single_to_area" | "area_to_sky"; guardPlayerId: PlayerId } | undefined {
  if (!id?.startsWith(ABSOLUTE_GUARD_BUFF_PREFIX)) {
    return undefined;
  }

  const [, mode, guardPlayerId] = id
    .slice(ABSOLUTE_GUARD_BUFF_PREFIX.length)
    .split(":");
  if ((mode !== "area_to_self" && mode !== "single_to_area" && mode !== "area_to_sky") || !guardPlayerId) {
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
  const source = findPlayer(state, attack.sourceId);
  if (!source) return;

  addDamage(
    state,
    healthDeltas,
    attack.sourceId,
    getFusionEnhancementCount(source, "skill_27_23816", ["毁灭之盾"]) > 0 ? 1 : 3,
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
  if (attack.infiniteCopies) {
    const charge = target.buffs.find((buff) => buff.id === "guidao_charge")!;
    charge.stacks = INFINITE_DAMAGE;
    charge.infinite = true;
  }
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${target.name} 小防成功，获得 ${attack.infiniteCopies ? "无限" : gained} 次鬼道`
  });
}

function isLastHitAttack(attack: AttackInstance, attacks: AttackInstance[]): boolean {
  if (attack.sourceId === attack.targetId || attack.notLastHit) {
    return false;
  }

  return attacks.some(
    (candidate) =>
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

function isStarGroupAttackDisabled(state: GameState, attack: AttackInstance): boolean {
  const source = findPlayer(state, attack.sourceId);
  return Boolean(attack.stats.isArea && attack.stats.isSkill && attack.stats.id !== ELECTRIC_SHOCK_SKILL_ID &&
    !ignoresNegativeStatuses(source) && source?.buffs.some((buff) => buff.stateType === "star_group_attack_disabled" &&
      (buff.expiresAtRound ?? 0) > state.roundNumber));
}

function resolveDragonHeirs(state: GameState, actions: Record<PlayerId, PlayerActionPlan>, attacks: AttackInstance[]): AttackInstance[] {
  const protectedPlayers = new Set<PlayerId>();
  for (const [id, plan] of Object.entries(actions)) {
    const player = findPlayer(state, id);
    const action = plan.actions.find((candidate): candidate is SkillAction => candidate.type === "skill" && candidate.skillId === DRAGON_HEIR_ID);
    if (!player || !action || !getActiveSkillCount(player, DRAGON_HEIR_ID)) continue;
    if (!bigAbilitySource(player, action)) continue;
    const targeted = attacks.some((attack) => attack.sourceId !== id && attack.targetId === id && !attack.reflected) ||
      Object.entries(actions).some(([sourceId, sourcePlan]) => sourceId !== id && canAffectAcrossSpace(state, sourceId, id) &&
        sourcePlan.actions.some((other) => {
          if (other.type === "defense") return other.defense === "rebound" && (other.targetId === id ||
            getActiveSkillCount(findPlayer(state, sourceId), SCATTER_REBOUND_SKILL_ID) > 0);
          if (other.type === "attack") return other.targetId === id;
          if (other.type !== "skill") return false;
          const play = getSkillPlay(other.skillId);
          return other.targetId === id || other.targetIds?.includes(id) ||
            play?.kind !== "attack" && (play?.targetMode === "all" || play?.allEnemyDamage !== undefined);
        }));
    if (targeted) protectedPlayers.add(id);
    player.buffs.push({ id: "temp_absolute_invulnerable", name: "龙子诞辰诀", stacks: 1,
      expiresAtTurn: state.turnNumber, sourceAbilityId: DRAGON_HEIR_ID });
    const lives = player.spareLives ??= [];
    const lifeLimit = Math.min(...player.buffs.map((buff) => buff.lifeCountLimit ?? Infinity));
    if (lives.length + 1 < lifeLimit && !player.buffs.some((buff) => buff.cannotGainSpareLives)) {
      const hp = targeted ? Math.floor(getPlayerInitialHp(player) / 2) : 0;
      lives.push({ hp });
      state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name} 获得一条 ${hp} 血的额外命` });
    }
  }
  return attacks.filter((attack) => attack.stats.id !== DRAGON_HEIR_ID || !protectedPlayers.has(attack.sourceId));
}

function resolveBigCardAbsorptions(state: GameState, actions: Record<PlayerId, PlayerActionPlan>, attacks: AttackInstance[]): void {
  const dominions: PlayerState[] = [];
  const stars: PlayerState[] = [];
  for (const [id, plan] of Object.entries(actions)) {
    const player = findPlayer(state, id);
    if (!player || isPlayerSkillDisabled(player) || isPlayerInCollapse(player)) continue;
    for (const action of plan.actions) {
      if (action.type !== "skill" || (action.skillId !== DRAGON_DOMINION_ID && action.skillId !== GATHER_STAR_ID)) continue;
      const instanceId = bigAbilitySource(player, action);
      if (!instanceId || isTypedSkillSuppressed(player, getSkill(action.skillId))) continue;
      if (action.skillId === GATHER_STAR_ID) { stars.push(player); continue; }
      const card = player.bigCards!.find((entry) => entry.instanceId === instanceId)!;
      extendDragonDisappear(card);
      (state.pendingDragonFireBonuses ??= []).push({ playerId: id, cardInstanceId: instanceId, dueRound: state.roundNumber + 3 });
      addBigCardStatus(state, id, "dragon_dominion_protection", id, DRAGON_DOMINION_ID, instanceId,
        { name: "霸龙·绝对无敌与无视不良", expiresAtRound: state.roundNumber + 1 }, false);
      dominions.push(player);
    }
  }
  for (const player of stars) {
    const ids = new Set(attacks.filter((attack) => attack.targetId === player.id && attack.sourceId !== player.id &&
      !attack.reflected && attack.stats.id !== ELECTRIC_SHOCK_SKILL_ID).map((attack) => attack.sourceId));
    for (const id of ids) {
      const target = findPlayer(state, id);
      if (target && !isSkillEffectImmune(state, id, getSkill(GATHER_STAR_ID)!, player.id)) absorbBigCardAbility(state, player, target);
    }
  }
  for (const player of dominions) for (const target of playersInSpace(state, player.id)) {
    if (target.id !== player.id && target.status === "alive" && target.kind !== "spectator" &&
      !isSkillEffectImmune(state, target.id, getSkill(DRAGON_DOMINION_ID)!, player.id)) borrowBigCards(state, player, target);
  }
}

function resolveStarStrikeStatuses(state: GameState, attacks: AttackInstance[]): void {
  const owners = new Set(attacks.filter((attack) => attack.stats.id === STAR_STRIKE_ID && !attack.reflected &&
    !isStarGroupAttackDisabled(state, attack)).map((attack) => attack.sourceId));
  for (const ownerId of owners) {
    const attackers = new Set(attacks.filter((attack) => attack.targetId === ownerId && attack.sourceId !== ownerId &&
      !attack.reflected && attack.stats.id !== ELECTRIC_SHOCK_SKILL_ID).map((attack) => attack.sourceId));
    for (const attackerId of attackers) {
      const skill = getSkill(STAR_STRIKE_ID)!;
      if (!isSkillEffectImmune(state, attackerId, skill, ownerId))
        addBigCardStatus(state, attackerId, "star_group_attack_disabled", ownerId, STAR_STRIKE_ID, undefined,
          { name: "群攻技能攻击失效", expiresAtRound: state.roundNumber + 5 }, true);
      addBigCardStatus(state, ownerId, "star_negative_guard", attackerId, STAR_STRIKE_ID, undefined,
        { name: "无视指定来源不良", expiresAtRound: state.roundNumber + 3 }, false);
    }
  }
}

function resolveBigCardPreparation(state: GameState, actions: Record<PlayerId, PlayerActionPlan>): void {
  if (!isBigSkillMode(state.config.skillMode)) return;
  for (const [sourceId, plan] of Object.entries(actions)) {
    const source = findPlayer(state, sourceId);
    if (!source || isPlayerSkillDisabled(source) || isPlayerInCollapse(source)) continue;
    for (const action of plan.actions) {
      if (action.type !== "skill" || isTypedSkillSuppressed(source, getSkill(action.skillId))) continue;
      const instanceId = bigAbilitySource(source, action);
      if (!instanceId) continue;
      if (action.skillId === GATHER_ELEMENT_ID || action.skillId === GATHER_STAR_ID) {
        const isStar = action.skillId === GATHER_STAR_ID;
        changeElementAmount(source, isStar ? STAR_ELEMENT : JUNENG_ELEMENT,
          isStar ? 1 : getJunengNumber(source, "1050401.elementGain", 1, instanceId));
        addBigCardStatus(state, sourceId, "gather_invulnerability", sourceId, action.skillId, instanceId,
          { name: isStar ? "星·无敌" : "聚·无敌", expiresAtTurn: state.turnNumber + 1 }, false);
      } else if (action.skillId === STAR_RESONANCE_ID) {
        const others = playersInSpace(state, sourceId).filter((player) => player.id !== sourceId && player.status === "alive" && player.kind !== "spectator");
        const total = others.reduce<CombatValue>((sum, player) => addCombatValues(sum, getDefenseTotal(player)), []);
        const clears = compareCombatValues(total, combatValue(30)) >= 0;
        if (clears) for (const target of others) target.buffs = target.buffs.filter((buff) => buff.id !== "defense_value");
        addDefenseValue(state, sourceId, clears ? 30 : 10, "异星共振");
      } else if (action.skillId === DRAGON_DANCE_ID && playersInSpace(state, sourceId).some((player) =>
        player.status === "alive" && player.kind !== "spectator" && player.cakes === 0)) {
        changeCakes(state, sourceId, source.cakes + 4, "狂龙之舞");
        addDefenseValue(state, sourceId, 3, "狂龙之舞");
        addBigCardStatus(state, sourceId, "dragon_active_immunity", sourceId, action.skillId, instanceId,
          { name: "狂龙之舞·无视主动技能", expiresAtTurn: state.turnNumber + 1 }, false);
        source.buffs.push({ id: "temp_absolute_invulnerable", name: "狂龙之舞", stacks: 1,
          expiresAtTurn: state.turnNumber, sourceAbilityId: DRAGON_DANCE_ID });
      } else if (action.skillId === JUNENG_SHIELD_ID || action.skillId === ELECTROMAGNETIC_CANNON_ID) {
        const shield = action.skillId === JUNENG_SHIELD_ID;
        addBigCardStatus(state, sourceId, "skill_rebound", sourceId, action.skillId, instanceId,
          { name: `${getSkill(action.skillId)?.name}·技能反弹`, expiresAtTurn: state.turnNumber + 1,
            skillReflectLimit: shield ? combatValue(getJunengNumber(source, "1050403.attackReflectPerElement", 3, instanceId) * action.stacks) :
              getJunengCombatNumber(source, "1050404.reflectPowerLimit", INFINITY_VALUE, instanceId) }, false);
        if (shield) {
          addDefenseValue(state, sourceId, getJunengNumber(source, "1050403.defenseGainPerElement", 10, instanceId) * action.stacks, "聚能盾");
          addBigCardStatus(state, sourceId, "skill_attack_block", sourceId, action.skillId, instanceId,
            { name: "聚能盾·技能防御", expiresAtTurn: state.turnNumber + 1,
              skillAttackBlockLimit: combatValue(getJunengNumber(source, "1050403.attackBlockPerElement", 10, instanceId) * action.stacks) }, false);
        }
      }
      if (action.skillId === LAVA_ARMOR_ID) {
        addBigCardStatus(state, sourceId, "skill_rebound", sourceId, action.skillId, instanceId, { expiresAtTurn: state.turnNumber + 1 }, false);
        addDefenseValue(state, sourceId, 4, "熔岩天甲");
        for (const targetId of action.targetIds ?? []) {
          if (isSkillEffectImmune(state, targetId, getSkill(action.skillId)!, sourceId)) continue;
          addBigCardStatus(state, targetId, "mitigation_disabled", sourceId, action.skillId, instanceId,
            { expiresAtRound: state.roundNumber + 1, suppressedEffectCategories: ["damage_reduction", "damage_evasion"] }, true);
        }
      } else if (action.skillId === FENSHI_FLAMES_ID) {
        addBigCardStatus(state, sourceId, "fenshi_flames", sourceId, action.skillId, instanceId, { expiresAtRound: state.roundNumber + 3 }, false);
      }
    }
  }
}

/** A fizzled use pays ordinary use resources; its effect mutation is deliberately omitted. */
function paySuppressedCooldown(state: GameState, player: PlayerState, skillId: SkillId): void {
  if (skillId === "skill_45_30424") player.buffs.push({ id: `${DESTROY_POWER_COOLDOWN_BUFF_ID}:${createId("cooldown")}`,
    name: "毁灭之力冷却", stacks: 1, expiresAtRound: state.roundNumber + 2 });
  if (skillId === FLASH_DODGE_SKILL_ID || skillId === getFusionSkillId("辉月")) {
    const fusionId = skillId === getFusionSkillId("辉月") ? getReadyHuiyueFusionId(player, state.roundNumber) : undefined;
    player.buffs.push({ id: `${FLASH_DODGE_COOLDOWN_BUFF_ID}:${createId("cooldown")}`, name: "闪现冷却", stacks: 1,
      expiresAtRound: state.roundNumber + 3, sourcePlayerId: FLASH_DODGE_SKILL_ID, ...(fusionId ? { sourceFusionId: fusionId } : {}) });
  }
}

function resolveActiveSkillEffects(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>,
  healthDeltas: Map<PlayerId, HealthDelta>,
  mainAction = false
): void {
  for (const [sourceId, plan] of Object.entries(actions)) withPlayerSpace(state, sourceId, () => {
    for (const [index, action] of plan.actions.entries()) {
      if (action.type !== "skill") {
        continue;
      }

      const skill = getSkill(action.skillId);
      const play = skill?.play;
      const source = findPlayer(state, sourceId);
      if (source && skill && !isPlayerSkillDisabled(source) && !isPlayerInCollapse(source) && !isTypedSkillSuppressed(source, skill)) {
        if (action.skillId === FOUR_EMPTINESS_ID) {
          resolveBlindSkillRemoval(state, sourceId, action.removeSkillInstanceIds ?? [], true);
          continue;
        }
        if (action.skillId === SLOT_MACHINE_ID) {
          resetSlotMachine(state, source, action.rerollFusionInstanceId);
          continue;
        }
      }
      if (play?.kind === "effect" && play.targetMode === "single" && action.targetId) {
        const target = findPlayer(state, action.targetId);
        if (ignoresOtherActiveSkill(target, sourceId, skill) ||
          (mainAction && blockVerdictMove(state, target, sourceId, `move:${index}`, false))) continue;
      }
      if (source && skill && !isPlayerSkillDisabled(source) && !isPlayerInCollapse(source) &&
        !isTypedSkillSuppressed(source, skill) && bigAbilitySource(source, action)) {
        if (action.skillId === KUISHI_ID) {
          copyPeekCard(state, source, action);
          continue;
        }
        if (action.skillId === DRAGON_DISAPPEAR_ID) {
          for (const target of alivePlayers(state)) {
            if (target.id === sourceId || compareCombatValues(getPlayerHpValue(target), combatValue(2)) > 0 ||
              isSkillEffectImmune(state, target.id, skill, sourceId)) continue;
            addDefeatEffect(state, healthDeltas, target.id, 3, sourceId, skill.name);
            if (healthDeltas.get(target.id)?.defeatLevel !== 3 || !canReceiveBigCard(source, "skill_gain")) continue;
            for (const card of target.bigCards ?? []) grantFreshBigCard(state, source, card);
          }
          continue;
        }
        if (action.skillId === STAR_RESIST_ID && canUseStarResistance(source)) {
          const pending = state.pendingDamageItems?.find((item) => item.id === action.targetDamageId && item.targetId === sourceId && isStarResistible(item));
          if (pending) {
            const damage = materializeSingleDamageCopy(state, pending);
            state.pendingDamageItems = state.pendingDamageItems!.filter((item) => item.id !== damage.id);
            source.buffs = source.buffs.filter((buff) => buff.id !== "defense_value");
            pushAttackBlockedEvent(state, { sourceId: damage.sourceId, targetId: sourceId, attackName: damage.attackName ?? "伤害",
              blockKind: "block", protectionName: "异星共振·抵御" });
          }
          continue;
        }
        if (action.skillId === DRAGON_BLOOD_FIELD_ID && mainAction) {
          const total = action.dragonBloodTotal ?? getDragonBloodTotal(state, sourceId);
          if (getDragonBloodMode(total) === "heal") addHeal(state, healthDeltas, sourceId, projectCombatValue(total) - 60, sourceId, skill.name);
          continue;
        }
        if (mainAction && action.skillId === ELECTROMAGNETIC_CANNON_ID) {
          for (const target of alivePlayers(state)) {
            if (target.id === sourceId || isSkillEffectImmune(state, target.id, skill, sourceId)) continue;
            addDamage(state, healthDeltas, target.id, getJunengNumber(source, "1050404.spellDamagePerTarget", 20,
              bigAbilitySource(source, action)), sourceId, skill.name, undefined, { spellDamage: true });
            recordJihanNonAttackHit(state, healthDeltas, sourceId, target.id);
          }
          continue;
        }
        if (action.skillId === STORE_DAMAGE_ID) {
          const pending = state.pendingDamageItems?.find((item) => item.id === action.targetDamageId &&
            item.targetId === sourceId && isStorableJunengDamage(item));
          if (pending) {
            const stored = materializeSingleDamageCopy(state, pending);
            state.pendingDamageItems = (state.pendingDamageItems ?? []).filter((item) => item.id !== stored.id);
            const { id, pointDefeatLevel, attackName, element, elements, fromAttack, spellDamage, internalDamage } = stored;
            (source.storedDamages ??= []).push({
              id, fromAttack: Boolean(fromAttack), spellDamage: Boolean(spellDamage), internalDamage: Boolean(internalDamage),
              ...(pointDefeatLevel ? { pointDefeatLevel } : {}), ...(attackName ? { attackName } : {}),
              ...(element ? { element } : {}), ...(elements ? { elements } : {}),
              amountValue: pointDefeatLevel === 2 ? RETIRE_VALUE : scaleCombatValue(pendingDamageValue(stored),
                getJunengNumber(source, "1050405.storedDamageMultiplier", 3, bigAbilitySource(source, action)))
            });
            state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${source.name} 储存了 ${attackName ?? "伤害"}` });
          }
          continue;
        }
        if (action.skillId === RELEASE_DAMAGE_ID && action.targetId) {
          const stored = source.storedDamages?.find((item) => item.id === action.storedDamageId);
          if (!stored) continue;
          source.storedDamages = source.storedDamages!.filter((item) => item.id !== stored.id);
          const element = stored.element ?? "physical";
          const stats: AttackStats = {
            id: skill.id, name: skill.name, cost: 0, power: projectCombatValue(stored.amountValue),
            powerValue: stored.amountValue, level: 0, defenseTag: "unblockable", traits: ["skill"],
            element, elements: stored.elements ?? [element], isArea: false, stacks: 1, isSkill: true
          };
          addDamage(state, healthDeltas, action.targetId, stored.amountValue, sourceId, skill.name, stats, {
            fixedStoredDamage: true, fromAttack: Boolean(stored.fromAttack), spellDamage: Boolean(stored.spellDamage),
            internalDamage: Boolean(stored.internalDamage), ...(stored.pointDefeatLevel ? { pointDefeatLevel: stored.pointDefeatLevel } : {})
          });
          continue;
        }
      }
      if (mainAction && skill?.id === JIHAN_ULTIMATE_ID && source &&
        !isPlayerSkillDisabled(source) && !isPlayerInCollapse(source) && bigAbilitySource(source, action)) {
        for (const target of alivePlayers(state)) {
          if (target.id === sourceId || isSkillEffectImmune(state, target.id, skill, sourceId)) continue;
          addDamage(state, healthDeltas, target.id, INFINITE_DAMAGE, sourceId, skill.name,
            attributeDamageStats(skill.id, skill.name, INFINITE_DAMAGE, "ice"), { spellDamage: true });
          applyFrozenStatus(state, target.id, 3, "round", sourceId);
          (ensureDelta(healthDeltas, sourceId).jihanUltimateSeals ??= []).push(target.id);
          recordJihanNonAttackHit(state, healthDeltas, sourceId, target.id);
        }
        continue;
      }
      if (isPlayerSkillDisabled(source) || isTypedSkillSuppressed(source, skill) || BIG_CARD_SKILLS[action.skillId]) {
        continue;
      }
      if (!skill || !play || play.kind !== "effect") {
        continue;
      }

      const acquired = resolveFusionAcquisition(state, sourceId, action);
      if (acquired) {
        if (acquired === "duplicate") addDefeatEffect(state, healthDeltas, sourceId, 2, sourceId, "沙子变化失败");
        continue;
      }
      if (skill.id === getFusionSkillId("冰火两仪眼")) {
        if (!hasFentianInheritance(state, source)) addHeal(state, healthDeltas, sourceId, 4, sourceId, skill.name);
        for (const target of alivePlayers(state).filter((player) => player.id !== sourceId)) {
          if (isSkillEffectImmune(state, target.id, skill, sourceId)) continue;
          if (mainAction) recordJihanNonAttackHit(state, healthDeltas, sourceId, target.id);
          const removed = getRemovableFireIceSkills(target, ["fire", "ice"]);
          const amount = removed.length ? 2 : 1;
          addDamage(state, healthDeltas, target.id, amount, sourceId, skill.name,
            addAttackElement(attributeDamageStats(skill.id, skill.name, amount, "fire"), "ice"));
          if (removed.length) removeSkillsFromPlayerKnowledge(state, target, removed);
        }
        continue;
      }
      if (skill.id === getFusionSkillId("魔域") && source) {
        const enhanced = getEnhancedChildFusionIds(source, "轮回吞噬", skill.id);
        const fusion = source.skillFusions?.find((item) => item.skillId === skill.id && isFusionActive(source, item) &&
          !enhanced.has(item.id) &&
          source.buffs.filter((buff) => buff.id === "demon_domain_target" && buff.sourceFusionId === item.id).length < 3);
        for (const id of action.targetIds ?? []) source.buffs.push({ id: "demon_domain_target", name: "魔域目标", stacks: 1, sourcePlayerId: id,
          ...(fusion ? { sourceFusionId: fusion.id } : {}) });
        continue;
      }

      if (skill.id === DOUBLE_EDGE_SWORD_SKILL_ID) {
        addDamage(state, healthDeltas, sourceId, action.doubleEdgeMode === "pierce_rebound" ? 2 : 1, sourceId, skill.name);
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
      if (skill.id === STAR_RAGE_ID) {
        if (action.targetSkillId === STAR_RAGE_SIX_STAR) {
          resolveSixStar(state, healthDeltas, sourceId, "星怒·六芒星", []);
        } else {
          const targets = alivePlayers(state).filter((target) => target.id !== sourceId);
          const target = targets[Math.floor(Math.random() * targets.length)];
          if (target) addDamage(state, healthDeltas, target.id, 6, undefined, "星怒", undefined, { spellDamage: true });
        }
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

      if (skill.id === "skill_64_60978" || skill.id === SAGE_PROTECTION_SKILL_ID) {
        resolveHealingRevival(state, sourceId, skill.name, skill.id === SAGE_PROTECTION_SKILL_ID ? 2 : undefined);
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
          const multiplier = getFusionEnhancementCount(player, skill.id, ["神之子"]) > 0 ? 3 : 1;
          const reviving = isPendingDeathPlayer(player);
          const beforeValue = getPlayerHpValue(player);
          setPlayerHpValue(player, scaleCombatValue(beforeValue, before < 0 ? -multiplier : multiplier));
          if (reviving) {
            applyHealthAmounts(player, 0, play.selfHeal ?? 0);
            clearPendingDeath(player);
            state.eventLog.push({ ...createBaseEvent(state, "heal"), type: "heal", sourceId, targetId: sourceId,
              amount: Math.max(0, player.hp - before), reason: skill.name, recoveryKind: "revival" });
            consumeFenjinAfterRevival(state, player);
          } else {
            if (compareCombatValues(getPlayerHpValue(player), beforeValue) !== 0) state.eventLog.push({ ...createBaseEvent(state, "heal"), type: "heal",
              sourceId, targetId: sourceId, amount: Math.max(0, player.hp - before), reason: skill.name, recoveryKind: "conversion" });
            addHeal(state, healthDeltas, sourceId, play.selfHeal ?? 0, sourceId, skill.name);
          }
        }
        continue;
      }

      if (isReversalActive(state) && skill.id === FOREST_LOW_SING_SKILL_ID) {
        continue;
      }

      if (play.selfDamage) {
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
        const multiplier = skill.id === FOREST_LOW_SING_SKILL_ID && source &&
          getFusionEnhancementCount(source, skill.id, ["博学者之怒"]) > 0 ? 2 : 1;
        addHeal(state, healthDeltas, sourceId, play.selfHeal * multiplier, sourceId, skill.name);
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
          if (mainAction) recordJihanNonAttackHit(state, healthDeltas, sourceId, targetId);
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
  });
}

function resolveImmediateSkillEffect(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): boolean {
  const beforeHp = new Map(state.players.map((player) => [player.id, getPlayerHpValue(player)]));
  const beforeTurnHealthChanged = Boolean(state.turnHealthChanged);
  const healthDeltas = new Map<PlayerId, HealthDelta>();
  resolveActiveSkillEffects(state, { [playerId]: { actions: [action] } }, healthDeltas);
  const changedByDeltas = applyHealthDeltas(state, healthDeltas);
  if (handlePendingDamageItems(state)) {
    return changedByDeltas || state.players.some(
      (player) => !player.spaceId && compareCombatValues(beforeHp.get(player.id) ?? [], getPlayerHpValue(player)) !== 0
    );
  }
  const changedDirectly = state.players.some(
    (player) => !player.spaceId && compareCombatValues(beforeHp.get(player.id) ?? [], getPlayerHpValue(player)) !== 0
  );
  const changedByPending = Boolean(state.turnHealthChanged) && !beforeTurnHealthChanged;
  return changedByDeltas || changedDirectly || changedByPending;
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

  grantInitializedSkill(state, sourceId, targetSkillId, "镜像法术复制");
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
  const targetCount = getSelectableJunengTarget(state, source?.spaceId) ? 1 : 2;
  if (!source || !skill || targetIds.length !== targetCount) {
    return;
  }

  const targets = targetIds
    .map((targetId) => findPlayer(state, targetId))
    .filter(
      (target): target is NonNullable<ReturnType<typeof findPlayer>> =>
        Boolean(target && target.status === "alive" && target.id !== sourceId)
    );
  if (targets.length !== targetCount) {
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

  const totalHp = [source, ...targets].map(getPlayerHpValue).reduce(addCombatValues, []);
  const share = scaleCombatValue(totalHp, 1 / 3);
  const low = roundCombatValue(share, Math.floor), high = roundCombatValue(share, Math.ceil);
  const remainder = (totalHp.find(term => term.exponent === 0)?.coefficient ?? 0) % 3;
  setPlayerHpValue(source, remainder === 2 ? low : high);
  for (const target of targets) {
    setPlayerHpValue(target, remainder === 2 ? high : low);
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 发动制衡，将${targetCount + 1}名玩家的血量重新分配`
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
  const hits = getFusionEnhancementCount(source, skill.id, ["烽火赤壁", "风之轻灵"]) > 0 ? 2 : 1;
  const allEnemies = hits === 2 || getFusionEnhancementCount(source, skill.id, ["风语之森"]) > 0;
  for (const target of alivePlayers(state)) {
    if (target.id === sourceId || (!allEnemies && (target.hpIsInfinite || Math.abs(target.hp) % 2 !== targetParity))) {
      continue;
    }

    if (isSkillEffectImmune(state, target.id, skill, sourceId)) {
      continue;
    }

    for (let hit = 0; hit < hits; hit++) addDamage(state, healthDeltas, target.id, 1, sourceId, skill.name);
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message:
      allEnemies
        ? `${source.name} 发动净化之风：其他存活玩家各受到 ${hits} 次 1 点法术伤害`
        : previousUses % 2 === 0
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

  const lockedTarget = getSelectableJunengTarget(state, findPlayer(state, sourceId)?.spaceId);
  const targetIds = lockedTarget ? [lockedTarget] : resolveLightningSpellTargetIds(
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
  let damage = state.pendingDamageItems?.find(
    (item) =>
      item.id === damageId &&
      item.targetId === sourceId &&
      isDamageWithinLimit(item, fromLegacyCombatStat(getDamageRedirectLimit(source!))) &&
      !(item.redirectedByPlayerIds ?? []).includes(sourceId)
  );
  if (!source || !target || !damage) {
    return;
  }

  damage = materializeSingleDamageCopy(state, damage);
  state.pendingDamageItems = state.pendingDamageItems!.filter((item) => item.id !== damage!.id);
  const beforeIds = new Set(state.pendingDamageItems.map((item) => item.id));
  const value = pendingDamageValue(damage);
  const redirected = getActiveSkillCount(source, STAR_INHERIT_ID) > 0 ? multiplyCombatValues(value, INFINITY_VALUE) : value;
  addDamage(state, new Map(), targetId, redirected, sourceId, "斗转星移", undefined, { spellDamage: true });
  for (const item of state.pendingDamageItems) if (!beforeIds.has(item.id)) item.redirectedByPlayerIds = [...(damage.redirectedByPlayerIds ?? []), sourceId];
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${source.name} 发动斗转星移，将 ${damage.attackName ?? "伤害"} 以 ${formatCombatValue(redirected)} 点伤害转移给 ${target.name}`
  });
  refreshDamageModifyPasses(state);
}

function resolveSixStar(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  sourceId: PlayerId,
  skillName: string,
  observedDamage?: CombatValue
): void {
  const source = findPlayer(state, sourceId);
  // Revealing six-star may itself trigger spell damage. Price that damage before finding the maximum.
  const unprocessed = (state.pendingDamageItems ?? []).filter((item) => item.targetId === sourceId && item.unprocessedSpell);
  if (unprocessed.length) {
    state.pendingDamageItems = state.pendingDamageItems!.filter((item) => !unprocessed.includes(item));
    for (const item of unprocessed) addDamage(state, healthDeltas, sourceId, pendingDamageValue(item), item.sourceId,
      item.attackName, undefined, { spellDamage: true });
  }
  const damage = getHighestPendingDamageItem(state, sourceId);
  if (!source || (!damage && observedDamage === undefined)) {
    return;
  }

  const removed = (state.pendingDamageItems ?? []).filter(
    (item) => item.targetId === sourceId && (isDamageWithinLimit(item, INFINITY_VALUE) || item.amount === 0) && !item.bypassDamageImmunity
  );
  state.pendingDamageItems = (state.pendingDamageItems ?? []).filter((item) => !removed.includes(item));
  let protection = source.buffs.find((buff) => buff.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID);
  if (!protection) {
    protection = { id: SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID, name: skillName, stacks: 1, expiresAtTurn: state.turnNumber };
    source.buffs.push(protection);
  }
  const maximum = [protection.sixStarMaxDamageValue ?? fromLegacyCombatStat(protection.sixStarMaxDamage ?? 0),
    damage ? pendingDamageValue(damage) : [], observedDamage ?? []]
    .reduce((max, value) => compareCombatValues(max, value) < 0 ? value : max, []);
  protection.sixStarMaxDamage = projectCombatValue(maximum);
  protection.sixStarMaxDamageValue = maximum;
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
    message: `${source.name} 发动${skillName}，免疫当前待承受伤害，本回合最高单次伤害 ${formatCombatValue(maximum)}，累计治疗额度 ${formatCombatValue(addCombatValues(maximum, combatValue(6)))}`
  });
  refreshDamageModifyPasses(state);
}

/** Queue recovery at a health settlement point, including callers with a throwaway damage map. */
function collectSixStarRecovery(state: GameState, healthDeltas: Map<PlayerId, HealthDelta>): void {
  for (const player of alivePlayers(state)) {
    const protection = player.buffs.find((buff) => buff.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID &&
      (buff.expiresAtTurn ?? -1) >= state.turnNumber && buff.sixStarMaxDamage !== undefined);
    if (!protection) continue;
    const due = sixStarRecoveryDue(protection);
    if (compareCombatValues(due, []) <= 0) continue;
    // A suppressed heal is still spent; ending blood sorrow cannot retroactively restore it.
    protection.sixStarRecoveryPaidValue = addCombatValues(protection.sixStarRecoveryPaidValue ?? combatValue(protection.sixStarRecoveryPaid ?? 0), due);
    protection.sixStarRecoveryPaid = projectCombatValue(protection.sixStarRecoveryPaidValue);
    addHeal(state, healthDeltas, player.id, due, player.id, protection.name);
  }
}

function sixStarRecoveryDue(protection: PlayerState["buffs"][number]): CombatValue {
  const maximum = protection.sixStarMaxDamageValue ?? fromLegacyCombatStat(protection.sixStarMaxDamage ?? 0);
  const paid = protection.sixStarRecoveryPaidValue ?? combatValue(protection.sixStarRecoveryPaid ?? 0);
  return subtractCombatValues(addCombatValues(maximum, combatValue(6)), paid);
}

function clearSixStarProtection(state: GameState): void {
  for (const player of state.players) player.buffs = player.buffs.filter((buff) => buff.id !== SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID);
}

function resolveIceRainMarkUse(
  state: GameState,
  playerId: PlayerId,
  damageId: string
): void {
  let damage = getPendingDamageItem(state, damageId);
  if (
    !damage ||
    !isAttackDamageItem(damage) ||
    damage.targetId !== playerId ||
    !damage.sourceId ||
    damage.sourceId === playerId ||
    hasPendingDamageModifier(damage, "ice_rain")
  ) {
    return;
  }

  const source = findPlayer(state, damage.sourceId);
  if (!consumeSourceMark(source, `ice_rain:${playerId}`)) {
    return;
  }

  damage = materializeSingleDamageCopy(state, damage);
  const reduced = subtractCombatValues(pendingDamageValue(damage), combatValue(2));
  setPendingDamageValue(damage, compareCombatValues(reduced, []) > 0 ? reduced : []);
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
  let damage = getPendingDamageItem(state, damageId);
  if (!player || !damage || damage.amount <= 0 || !isAttackDamageItem(damage)) {
    return;
  }

  if (damage.targetId === playerId) {
    if (
      damage.internalDamage ||
      hasPendingDamageModifier(damage, "huyou") ||
      !consumePlayerBuff(player, "huyou_mark", 1)
    ) {
      return;
    }
    const factor = getFusionEnhancementCount(player, CROSS_GUARD_SKILL_ID, ["神域守护"]) > 0 ? 3 : 2;
    damage = materializeSingleDamageCopy(state, damage);
    setPendingDamageValue(damage, roundCombatValue(scaleCombatValue(pendingDamageValue(damage), 1 / factor), Math.floor));
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

  damage = materializeSingleDamageCopy(state, damage);
  setPendingDamageValue(damage, scaleCombatValue(pendingDamageValue(damage),
    getFusionEnhancementCount(player, CROSS_GUARD_SKILL_ID, ["神域守护"]) > 0 ? 3 : 2));
  addPendingDamageModifier(damage, "cross");
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 消耗十字印记，使 ${getPlayerName(state, damage.targetId)} 承受的 ${damage.attackName ?? "伤害"} 伤害翻倍`
  });
  refreshDamageModifyPasses(state);
}

/** A single-target modifier consumes one copy; the infinite family remains intact. */
function materializeSingleDamageCopy(state: GameState, item: PendingDamageItem): PendingDamageItem {
  if (!item.infiniteCopies) return item;
  const copy = structuredClone(item);
  copy.id = createId("damage_copy");
  delete copy.infiniteCopies;
  state.pendingDamageItems!.push(copy);
  return copy;
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
    .filter((item) => item.targetId === playerId && isDamageWithinLimit(item, INFINITY_VALUE) && !item.bypassDamageImmunity)
    .sort((a, b) => compareCombatValues(pendingDamageValue(b), pendingDamageValue(a)))[0];
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
  const enhanced = getFusionEnhancementCount(source, "skill_47_94841", ["血魔之怒", "无限之力"]) > 0;
  const cakeGain = enhanced ? previousDamage : Math.min(4, previousDamage);
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

  const damageTaken = getTurnDamageTaken(source, state.turnNumber);
  if (compareCombatValues(damageTaken, []) <= 0) {
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
    message: `${source.name} 发动同生共死：本回合受到 ${formatCombatValue(damageTaken)} 点伤害，令 ${target.name} 承受等量法术伤害`
  });
}

function resolveHealingRevival(state: GameState, sourceId: PlayerId, reason = "治愈术", hp?: number): void {
  const source = findPlayer(state, sourceId);
  if (!source) {
    return;
  }

  reviveToHp(state, source, reason, hp);
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

  const value = getPlayerHpValue(target);
  const targetHpBase = target.hp >= 0 ? value : target.id === source.id ? scaleCombatValue(value, -1) : [];
  const share = scaleCombatValue(targetHpBase, 1 / 2);
  const sourceHp = roundCombatValue(share, Math.ceil);
  if (target.id === source.id) {
    setPlayerHpValue(source, compareCombatValues(sourceHp, combatValue(1)) < 0 ? combatValue(1) : sourceHp);
  } else {
    setPlayerHpValue(source, sourceHp);
    setPlayerHpValue(target, roundCombatValue(share, Math.floor));
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

function resolveHunyaoPursuit(state: GameState, source: PlayerState, action: SkillAction): void {
  const target = getHunyaoPursuitTargets(state, action.skillId).find((player) => player.id === action.targetId);
  const skill = getSkill(action.skillId);
  if (!target || !skill) return;

  const roll = (probability: number) => Boolean(source.hunyaoAwakened) || Math.random() < probability;
  const probability = action.skillId === CHASE_LIGHT_ID ? 0.7 : action.skillId === CHASE_SHADOW_ID ? 0.5 : 0.3;
  const success = roll(probability);
  const bypass = action.skillId === CHASE_LIGHT_ID && roll(0.5) ? "three_souls" :
    action.skillId === CHASE_SHADOW_ID && roll(0.4) ? "all" : "none";
  const kind = target.defeatLevel === 1 ? "revival" : target.defeatLevel === 2 ? "reentry" : "reappearance";
  if (success && !hasContinuationBlock(state, target, kind, bypass) &&
    (bypass === "all" || !isSkillEffectImmune(state, target.id, skill, source.id))) {
    target.status = "alive";
    delete target.defeatLevel;
    reviveToHp(state, target, skill.name, getPlayerInitialHp(target), kind, source.id);
  } else {
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${source.name} 使用${skill.name}，${target.name}未能返回游戏` });
  }
  if (action.skillId === CHASE_SOUL_ID && canQueueAttackInWindow(state.activeTimingPhase) && roll(0.3)) {
    source.buffs.push({ id: HUNYAO_QUEUED_SHA, name: "追魂者·待发出的杀", stacks: 1,
      expiresAtTurn: state.turnNumber + 1, expiresAtRound: state.roundNumber + 1 });
  }
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
    const keepSkills = getFusionEnhancementCount(source, HELL_OVERLORD_SKILL_ID, ["天火之狱"]) > 0;
    if (!keepSkills) clearAllSkillsFromPlayer(state, source);
    source.status = "alive";
    delete source.defeatLevel;
    setPlayerHpValue(source, combatValue(INITIAL_HP));
    clearPendingDeath(source);
    state.eventLog.push({
      ...createBaseEvent(state, "heal"),
      type: "heal",
      sourceId,
      targetId: sourceId,
      amount: Math.max(0, INITIAL_HP - beforeHp),
      reason: skill.name,
      recoveryKind: "revival"
    });
    consumeFenjinAfterRevival(state, source);
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${source.name} 发动地狱主宰自救，6血复活${keepSkills ? "并保留技能" : "并失去全部技能"}`
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
  setPlayerHpValue(target, combatValue(INITIAL_HP));
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
    reason: skill.name,
    recoveryKind: "revival"
  });
  consumeFenjinAfterRevival(state, target);
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
  const player = findPlayer(state, sourceId);
  const spin = player && getSlotMachineSpin(player);
  if (spin) spin.fusion.rerollCompletedSlotIds!.push(spin.id);

  transformSkill(state, sourceId, "skill_3_56718", nextSkillId, "再来一次变化", {
    revealResult: false, ...(spin ? { slotIndex: spin.index, privateResult: true } : {})
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
  options: { revealResult?: boolean; slotIndex?: number; privateResult?: boolean } = {}
): void {
  const player = findPlayer(state, playerId);
  const nextSkill = getSkill(toSkillId);
  if (!player || !nextSkill) {
    return;
  }

  const index = options.slotIndex ?? player.skills.indexOf(fromSkillId);
  if (index === -1) {
    return;
  }

  replaceSkillInstanceAt(player, index, toSkillId);

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
    ...(options.privateResult ? { privatePlayerId: playerId } : {}),
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
  if (player) addCountingMark(player, `shunshou_taken:${choice.sourcePlayerId}:${choice.skillId}`, "顺手牵羊已选择", 1);
  consumePendingShunshouChoice(state, playerId, choice.id);
  if (
    player &&
    getSkillUseCount(player, SHUNSHOU_STEAL_SKILL_ID) + 1 >=
      (getSkillUseLimit(player, SHUNSHOU_STEAL_SKILL_ID) ?? 0)
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
        (getSkillUseLimit(player, SHUNSHOU_STEAL_SKILL_ID) ?? 0)
    ) {
      clearPendingShunshouChoices(state, player.id);
      continue;
    }

    const remainingUses =
      (getSkillUseLimit(player, SHUNSHOU_STEAL_SKILL_ID) ?? 0) -
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
      addCountingMark(player, `shunshou_taken:${choice.sourcePlayerId}:${choice.skillId}`, "顺手牵羊已选择", 1);
      markSkillUse(player, SHUNSHOU_STEAL_SKILL_ID);
      consumePendingShunshouChoice(state, player.id, choice.id);
    }
    if (
      getSkillUseCount(player, SHUNSHOU_STEAL_SKILL_ID) >=
      (getSkillUseLimit(player, SHUNSHOU_STEAL_SKILL_ID) ?? 0)
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

  appendSkillInstances(player, [skillId]);
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
      .sort((a, b) => compareCombatValues(getPlayerHpValue(b), getPlayerHpValue(a)))
      .slice(0, play.selectedTargetCount ?? 1)
      .map((player) => player.id);
  }

  if (play.effect === "low_hp_execute") {
    return enemies
      .filter((player) => player.hp <= (play.hpThreshold ?? 3))
      .map((player) => player.id);
  }

  if (play.effect === "odd_hp_damage") {
    return enemies.filter((player) => !player.hpIsInfinite && Math.abs(player.hp) % 2 === 1).map((player) => player.id);
  }

  if (play.effect === "even_hp_damage") {
    return enemies.filter((player) => !player.hpIsInfinite && Math.abs(player.hp) % 2 === 0).map((player) => player.id);
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

function activatePureSkyImmunity(state: GameState, player: PlayerState, skillId: SkillId): void {
  const skill = getSkill(skillId);
  if (!skill || !skillHasTypeTag(skill, "控制技") || !skillHasCakeCost(skillId, player) ||
    getActiveFusionCount(player, "纯净苍穹") === 0) return;
  upsertBuff(player, { id: NEGATIVE_STATUS_IMMUNITY_BUFF_ID, name: "免疫不良", stacks: 1,
    expiresAtTurn: state.turnNumber });
  markSkillActivated(state, player.id, getFusionSkillId("纯净苍穹"));
  revealSkillOnUse(state, player.id, getFusionSkillId("纯净苍穹"), "纯净苍穹启用免疫不良");
}

/** Holy Realm and Nature Spirit share one attribute-immunity path. */
function getAttributeImmunitySkill(player: PlayerState | undefined, elements: readonly AttackElement[]): SkillId | undefined {
  if (elements.some((element) => element !== "physical") && playerHasActiveSkill(player, "skill_75_68329")) {
    return "skill_75_68329";
  }
  if (elements.includes("fire") && getActiveFusionCount(player, "自然之灵") > 0) return getFusionSkillId("自然之灵");
  return undefined;
}

function isAttributeSkillEffectImmune(
  state: GameState,
  playerId: PlayerId,
  skill: NonNullable<ReturnType<typeof getSkill>>
): boolean {
  const player = findPlayer(state, playerId);
  const protection = getAttributeImmunitySkill(player, skill.attribute ? [skill.attribute] : []);
  if (protection) {
    revealSkillOnTrigger(state, playerId, protection, `触发${getSkill(protection)!.name}`);
  }
  return Boolean(protection);
}

function isSkillEffectImmune(
  state: GameState,
  playerId: PlayerId,
  skill: NonNullable<ReturnType<typeof getSkill>>,
  sourceId: PlayerId | undefined
): boolean {
  const target = findPlayer(state, playerId);
  const mainIndex = sourceId && skill.id !== ELECTRIC_SHOCK_SKILL_ID && skill.play?.kind === "effect" ?
    state.pendingActions[sourceId]?.actions.findIndex((action) => action.type === "skill" && action.skillId === skill.id) : undefined;
  return (
    (mainIndex !== undefined && mainIndex >= 0 && blockVerdictMove(state, target, sourceId, `move:${mainIndex}`, false)) ||
    !canAffectAcrossSpace(state, sourceId, playerId) || ignoresOtherActiveSkill(target, sourceId, skill) ||
    Boolean(BIG_CARD_SKILLS[skill.id] && target && isBigCardAbilityIgnored(target, skill)) ||
    effectHasCategory(skill.id, "remove_fire_skills") && hasFentianInheritance(state, target) ||
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
  sourceId: PlayerId,
  context: DamageContext = {}
): void {
  const sourceSkill = getSkill("skill_13_68869");
  const source = findPlayer(state, sourceId);
  const enhanced = source && getFusionEnhancementCount(source, "skill_13_68869", ["炽焰"]) > 0;
  const targets = alivePlayers(state).filter((player) => player.id !== sourceId);
  for (const target of targets) {
    if (sourceSkill && isSkillEffectImmune(state, target.id, sourceSkill, sourceId)) {
      if (getActiveFusionCount(target, "帝灵之境") > 0) addDamage(state, healthDeltas, target.id, 1, sourceId, "火烧大地", undefined, { spellDamage: true });
      continue;
    }

    const amount = enhanced || playerHasIceSkill(target) ? 2 : 1;
    addDamage(
      state,
      healthDeltas,
      target.id,
      amount,
      sourceId,
      "火烧大地",
      fireDamageStats("skill_13_68869", "火烧大地", amount), context
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

function getRemovableFireIceSkills(player: PlayerState, elements: readonly ("fire" | "ice")[]): SkillId[] {
  const fire = elements.includes("fire") && getActiveFusionCount(player, "炽焰") === 0;
  const ice = elements.includes("ice") && getActiveFusionCount(player, "极寒") === 0;
  return player.skills.filter((id) => (fire && isFireSkillId(id)) || (ice && isIceSkillId(id)));
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

    const removed = getRemovableFireIceSkills(player, ["ice"]);
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
  const source = findPlayer(state, sourceId)!;
  const enhanced = getFusionEnhancementCount(source, sourceSkill.id, ["冰霜长矛", "极寒"]) > 0;

  if (!isSkillEffectImmune(state, sourceId, sourceSkill, sourceId)) {
    addHeal(state, healthDeltas, sourceId, enhanced ? 8 : 4, sourceId, "霜落大地");
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
    addHeal(state, healthDeltas, target.id, enhanced ? 2 : 1, sourceId, "霜落大地");
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

    const removed = getRemovableFireIceSkills(player, ["fire"]);
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
  for (let index = player.skills.length - 1; index >= 0; index--) if (removedSet.has(player.skills[index]!)) removeSkillInstanceAt(player, index);
  reconcileSkillFusions(player);
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
  if (player.skillInventory) player.skillInventory = [];
  reconcileSkillFusions(player);
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

  removeSkillInstanceAt(player, index);
  reconcileSkillFusions(player);
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
  targetId: PlayerId,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  if (attack.stats.id !== "skill_36_14343") {
    return;
  }

  const source = findPlayer(state, attack.sourceId);
  const target = findPlayer(state, targetId);
  if (!source || !target || target.status !== "alive") {
    return;
  }

  if (isElectricShockParalysisImmune(state, attack, targetId, healthDeltas)) {
    return;
  }

  const fixedAction = getParalysisFixedAction(state.pendingActions[targetId]);
  const applied = applyNegativeStatus(state, targetId, "paralysis", (player) => {
    player.buffs = player.buffs.filter((buff) => !buff.id.startsWith(PARALYSIS_NEXT_ACTION_BUFF_PREFIX));
    player.buffs.push({ id: paralysisNextActionBuffId(fixedAction), name: "麻痹", stacks: 1,
      sourcePlayerId: attack.sourceId });
  }, attack.sourceId);
  if (!applied) return;
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
  targetId: PlayerId,
  healthDeltas: Map<PlayerId, HealthDelta>
): boolean {
  if (!attackHasElement(attack.stats, "electric")) {
    return false;
  }

  const target = findPlayer(state, targetId);
  if (!target) {
    return true;
  }

  const attributeProtection = getAttributeImmunitySkill(target, getAttackElements(attack.stats));
  if (attributeProtection) {
    pushAttackBlockedEvent(state, {
      sourceId: attack.sourceId,
      targetId,
      attackName: attack.stats.name,
      blockKind: "immune",
      protectionName: getSkill(attributeProtection)!.name,
      protectionSkillId: attributeProtection
    });
    return true;
  }

  const earthHeartCount = getActiveSkillCount(target, "skill_39_77400");
  if (earthHeartCount > 0) {
    rewardEarthHeart(state, healthDeltas, target);
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
  const hits = ensureDelta(healthDeltas, attack.targetId).appliedHitEffectKeys ??= new Set();
  if (hits.has(attack.key)) return;
  hits.add(attack.key);
  if (attack.verdictStripped) return;
  // Electric shock is a non-attack action: its paralysis is the action itself, not an on-hit reward.
  const source = findPlayer(state, attack.sourceId);
  const target = findPlayer(state, attack.targetId);
  if (!source || !target) {
    return;
  }

  if (attack.stats.id === FENTIAN_ATTACK_ID && !isSkillEffectImmune(state, target.id, getSkill(FENTIAN_ATTACK_ID)!, source.id))
    applyFentianHitStates(state, source.id, target.id, attack.stats.sourceBigCardInstanceId);

  if (attack.stats.id === LU_ATTACK_SKILL_ID) {
    const uncapped = getActiveFusionCount(source, "猥琐大叔叔") > 0;
    const existing = source.buffs.find((buff) => buff.id === "lu_growth");
    const before = existing?.stacks ?? 0;
    if ((uncapped && !existing?.infinite) || before < 3) {
      addCountingMark(source, "lu_growth", "撸成长", attack.infiniteCopies && !uncapped ? 3 - before : 1);
      const growth = source.buffs.find((buff) => buff.id === "lu_growth")!;
      if (attack.infiniteCopies && uncapped) growth.infinite = true;
      const after = growth.infinite ? "无限+1" : growth.stacks + 1;
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `${source.name} 的撸命中 ${target.name}，撸成长为攻${after}、${after}级`
      });
    }
  }

  const iceRainCount = attack.offenseSnapshot?.iceRain ?? getActiveSkillCount(source, "skill_20_63089");
  if (iceRainCount > 0 && attack.stats.id === "wan_jian") {
    addCountingMark(target, `ice_rain:${source.id}`, `冰雨：${source.name}`, iceRainCount);
    const iceRainBuff = target.buffs.find((buff) => buff.id === `ice_rain:${source.id}`);
    if (iceRainBuff) {
      iceRainBuff.sourcePlayerId = source.id;
      if (attack.infiniteCopies) { iceRainBuff.stacks = INFINITE_DAMAGE; iceRainBuff.infinite = true; }
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
    applyFrozenStatus(state, target.id, freezeTurns, "turn", source.id);
  }

  if (attack.stats.id === "skill_36_14343") {
    recordJihanNonAttackHit(state, healthDeltas, source.id, target.id);
    applyElectricShockParalysis(state, attack, attack.targetId, healthDeltas);
  }

  if (attack.stats.id === "skill_78_18866") {
    applyFireballSplash(state, attack, actions, healthDeltas);
  }
  if (attack.stats.id === "skill_86_14131" && getFusionEnhancementCount(source, attack.stats.id, ["魔音贯耳"]) > 0)
    addDamage(state, healthDeltas, attack.targetId, 2, source.id, "魔音贯耳·梵", undefined,
      { spellDamage: true, ordinarySelfDamage: true });
  if (attack.stats.id === "skill_82_45540" && (attack.offenseSnapshot?.freeRi ??
    getFusionEnhancementCount(source, "skill_82_45540", ["后羿•七日连珠"]) > 0)) {
    addCountingMark(source, "free_ri", "免费日机会", 1);
  }

  const skill = getSkill(String(attack.stats.id));
  const effect = skill?.play?.effect;
  if (!effect) {
    return;
  }

  if (effect === "zhong_shield") {
    upsertBuff(source, {
      id: "jin_zhong_zhao",
      name: `金钟罩：${getPlayerName(state, attack.targetId)}`,
      stacks: 1,
      sourcePlayerId: attack.targetId
    });
    for (const fusion of source.skillFusions ?? []) {
      if (fusion.skillId !== getFusionSkillId("金胸罩") || !isFusionActive(source, fusion)) continue;
      for (const skillId of ["skill_55_96047", "skill_56_42637"]) {
        const id = `fusion_use_bonus:${skillId}`;
        const bonus = source.buffs.find((buff) => buff.id === id && buff.sourceFusionId === fusion.id);
        if (bonus) bonus.stacks += 1;
        else source.buffs.push({ id, name: "金胸罩·罩次数", stacks: 1, sourceFusionId: fusion.id });
      }
    }

    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${getPlayerName(state, attack.sourceId)} 获得 1 层对 ${getPlayerName(state, attack.targetId)} 的金钟罩`
    });
    return;
  }

  if (effect === "lian_bao_free") {
    addCountingMark(source, "free_lian_bao", "免费连爆机会", 1);
    if (attack.infiniteCopies) {
      const free = source.buffs.find((buff) => buff.id === "free_lian_bao")!;
      free.stacks = INFINITE_DAMAGE; free.infinite = true;
    }
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
  const delta = healthDeltas.get(attack.targetId);
  if (delta?.reflectedAttackKeys?.has(attack.key) && !delta.landedAttackKeys?.has(attack.key)) return;
  const hit = attackCountsAsHit(state, eventStart, attack);
  if (hit && isBigSkillMode(state.config.skillMode) && attack.stats.id !== ELECTRIC_SHOCK_SKILL_ID &&
    !delta?.jihanIgnoredHits?.has(attack.key) && getJihanCards(findPlayer(state, attack.targetId), JIHAN_COUNTER_ID).length > 0) {
    (ensureDelta(healthDeltas, attack.targetId).jihanHits ??= new Set()).add(attack.key);
  }
  if (delta?.blockedAttackKeys?.has(attack.key) || !hit) {
    return;
  }

  if (playerHasActiveSkill(findPlayer(state, attack.targetId), "skill_38_81245") &&
    state.pendingDamageItems?.some((item) => item.attackKey === attack.key)) {
    const delta = ensureDelta(healthDeltas, attack.targetId);
    delta.pendingHitEffects ??= [];
    if (!delta.pendingHitEffects.some((item) => item.attack.key === attack.key)) {
      delta.pendingHitEffects.push({ attack, actions });
    }
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
  const protection = getAttributeImmunitySkill(target, getAttackElements(attack.stats));
  if (!protection) return false;
  revealSkillOnTrigger(state, targetId, protection, `触发${getSkill(protection)!.name}`);
  return true;
}

function applyFireballSplash(
  state: GameState,
  attack: AttackInstance,
  actions: Record<PlayerId, PlayerActionPlan>,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  const source = findPlayer(state, attack.sourceId);
  const enhanced = attack.offenseSnapshot?.echo ?? Boolean(source && getFusionEnhancementCount(source, "skill_78_18866", ["回响之杖"]) > 0);
  const alive = alivePlayers(state);
  const targetIndex = alive.findIndex((player) => player.id === attack.targetId);
  for (const candidate of alivePlayers(state)) {
    const index = alive.findIndex((player) => player.id === candidate.id);
    const distance = Math.min(Math.abs(index - targetIndex), alive.length - Math.abs(index - targetIndex));
    if (
      candidate.id === attack.sourceId ||
      candidate.id === attack.targetId ||
      (enhanced ? distance > 2 : !areAdjacentPlayers(state, attack.targetId, candidate.id))
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

    const amount = enhanced && distance === 1 ? 2 : 1;
    const splashStats = fireDamageStats("skill_78_18866", "火球溅射", amount);
    addDamage(
      state,
      healthDeltas,
      candidate.id,
      amount,
      attack.sourceId,
      "火球溅射",
      splashStats,
      { spellDamage: true, ...(attack.infiniteCopies ? { infiniteCopies: true } : {}) }
    );
  }
}

function applyHealthDeltas(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>
): boolean {
  let changed = false;
  collectSixStarRecovery(state, healthDeltas);

  const immuneAttacks = applyLightningBodyImmunity(state);
  for (const delta of healthDeltas.values()) {
    const effects = delta.pendingHitEffects ?? [];
    delete delta.pendingHitEffects;
    for (const { attack, actions } of effects) {
      if (!immuneAttacks.has(attack.key)) applySkillHitEffects(state, attack, actions, healthDeltas);
    }
  }

  for (const [playerId, delta] of healthDeltas.entries()) {
    const player = findPlayer(state, playerId);
    if (!player || player.status !== "alive") {
      continue;
    }

    const before = getPlayerHpValue(player);
    applyHealthAmounts(player, delta.damage, delta.healing, false, false, delta.damageAtZero, {
      ...(delta.damageValue ? { damage: delta.damageValue } : {}),
      ...(delta.healingValue ? { healing: delta.healingValue } : {}),
      ...(delta.damageAtZeroValue ? { damageAtZero: delta.damageAtZeroValue } : {})
    });
    if (delta.damage > 0) {
      (state.damageAttribution ??= {})[playerId] = delta.damageEventIds ?? [];
      player.buffs = player.buffs.filter((buff) => buff.id !== "internal_zero_hp");
      if (player.hp === 0 && delta.lastDamageInternal) player.buffs.push({ id: "internal_zero_hp", name: "反噬归零", stacks: 1 });
    }

    if (!player.spaceId && (delta.damage > 0 || delta.healing > 0 || compareCombatValues(getPlayerHpValue(player), before) !== 0)) {
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
      if (!player.spaceId) changed = true;
    }
  }

  return changed;
}

function updateDeaths(
  state: GameState,
  options: { allowPending?: boolean } = {}
): boolean {
  const recovery = new Map<PlayerId, HealthDelta>();
  collectSixStarRecovery(state, recovery);
  if (recovery.size && applyHealthDeltas(state, recovery)) state.turnHealthChanged = true;
  for (const player of state.players) {
    if (player.hp !== 0) player.buffs = player.buffs.filter((buff) => !["lotus_zero_hp_triggered", "internal_zero_hp"].includes(buff.id));
    if (player.status !== "alive") {
      continue;
    }

    if (player.hp > 0) {
      clearPendingDeath(player);
      continue;
    }

    if (!isDeathCandidate(player)) {
      const twins = getActiveFusionCount(player, "神隐双莲");
      if (player.hp === 0 && !player.buffs.some((buff) => buff.id === "lotus_zero_hp_triggered") &&
        (twins > 0 || playerHasActiveSkill(player, "skill_23_90895"))) {
        player.buffs.push({ id: "lotus_zero_hp_triggered", name: "本次零血回复已触发", stacks: 1 });
        const healing = twins > 0 ? 3 * twins : 1;
        const healingDeltas = new Map<PlayerId, HealthDelta>();
        addHeal(state, healingDeltas, player.id, healing, player.id, twins > 0 ? "神隐双莲" : "神隐红莲");
        if (healingDeltas.size && applyHealthDeltas(state, healingDeltas)) state.turnHealthChanged = true;
        if (twins > 0) addScheduledCakeBuff(player, `qinglian_cake_round:${state.roundNumber + 1}`,
          "神隐双莲轮初加饼", twins, state.roundNumber + 2);
        clearPendingDeath(player);
        if (twins === 0 && !player.buffs.some((buff) => buff.id === "internal_zero_hp") &&
          getFusionEnhancementCount(player, "skill_23_90895", ["红莲斗篷"]) > 0 &&
          takeRetaliationResponses(state, player.id, getFusionSkillId("红莲斗篷")) > 0) {
          resolveBurningEarth(state, new Map(), player.id, { retaliation: true });
        }
        continue;
      }

      clearPendingDeath(player);
      continue;
    }

    const fatalDamageEvents = getFatalDamageEvents(state, player.id);
    for (const event of fatalDamageEvents) loseKuijiUltimate(state, event);
    markFenjinForDeath(state, player, fatalDamageEvents);

    applyNoReviveFromFatalDamage(state, player, fatalDamageEvents);
    if (!fatalDamageEvents.some((event) => event.noReviveOrExtraLives) &&
      !player.buffs.some((buff) => buff.cannotSwitchSpareLives || (buff.lifeCountLimit ?? Infinity) <= 1)) {
      const nextLife = player.spareLives?.shift();
      if (nextLife) {
        setPlayerHpValue(player, combatValue(nextLife.hp));
        clearPendingDeath(player);
        if (state.damageAttribution) delete state.damageAttribution[player.id];
        state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
          message: `${player.name} 切换到下一条命，生命值为 ${nextLife.hp}` });
        continue;
      }
    }
    const revivalBlocked = hasNoRevive(player);

    if (!revivalBlocked && player.hp < 0 && playerHasActiveSkill(player, "skill_69_22138")) {
      const before = getPlayerHpValue(player);
      setPlayerHpValue(player, scaleCombatValue(before, -1));
      clearPendingDeath(player);
      consumeFenjinAfterRevival(state, player);
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `${player.name} 的绝对值触发：${formatCombatValue(before)} 血变为 ${formatCombatValue(getPlayerHpValue(player))} 血`
      });
      continue;
    }

    if (
      !revivalBlocked &&
      playerHasActiveSkill(player, "skill_65_71994") &&
      canRebirthByFire(player, fatalDamageEvents)
    ) {
      if (!fatalDamageEvents.some(isFireDamageEvent)) changeCakes(state, player.id,
        player.cakes - (getFusionEnhancementCount(player, "skill_65_71994", ["天火之狱"]) > 0 ? 3 : 4), "浴火重生消耗");
      reviveToHp(state, player, "浴火重生");
      continue;
    }

    if (options.allowPending) {
      markPendingDeath(state, player);
      continue;
    }

    finalizePlayerCannotContinue(state, player, fatalDamageEvents, 1);
  }

  if (alivePlayers(state).some((player) => player.buffs.some((buff) => buff.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID &&
    (buff.expiresAtTurn ?? -1) >= state.turnNumber && buff.sixStarMaxDamage !== undefined &&
    compareCombatValues(sixStarRecoveryDue(buff), []) > 0))) return updateDeaths(state, options);
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
    player.cakes >= (getFusionEnhancementCount(player, "skill_65_71994", ["天火之狱"]) > 0 ? 3 : 4)
  );
}

function reviveToHp(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  reason: string,
  nextHp = getPlayerInitialHp(player),
  recoveryKind: "revival" | "reentry" | "reappearance" = "revival",
  sourceId = player.id
): void {
  const before = player.hp;
  setPlayerHpValue(player, combatValue(nextHp));
  clearPendingDeath(player);
  state.eventLog.push({
    ...createBaseEvent(state, "heal"),
    type: "heal",
    sourceId,
    targetId: player.id,
    amount: Math.max(0, nextHp - before),
    reason,
    recoveryKind
  });
  if (recoveryKind === "revival") consumeFenjinAfterRevival(state, player);
  else if (state.damageAttribution) state.damageAttribution[player.id] = [];
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

  if (restoreHunyaoInitialState(state, player, defeatLevel)) return;
  clearPendingDeath(player);
  player.status = "dead";
  player.defeatLevel = defeatLevel;
  player.cakes = 0;
  if (player.actionCakes !== undefined) player.actionCakes = 0;
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
  const sniperOwner = defeatLevel === 2 && reason === "暗影狙击" && sourceId ? findPlayer(state, sourceId) : undefined;
  if (sniperOwner) {
    const soul = getFusionSkillId("暗影之魂");
    const sniper = getFusionSkillId("暗影狙击");
    const snipers = getEnhancedChildFusionIds(sniperOwner, "暗影之魂", sniper);
    for (const fusion of sniperOwner.skillFusions ?? []) {
      if (fusion.skillId !== soul || !fusion.materialFusionIds?.some((id) => snipers.has(id))) continue;
      const id = "fusion_use_bonus:skill_25_51277";
      const bonus = sniperOwner.buffs.find((buff) => buff.id === id && buff.sourceFusionId === fusion.id);
      if (bonus) bonus.stacks++;
      else sniperOwner.buffs.push({ id, name: "暗影盾额外次数", stacks: 1, sourceFusionId: fusion.id });
    }
  }
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
      !canAffectAcrossSpace(state, deadPlayerId, player.id) ||
      player.status !== "alive" ||
      getActiveSkillCount(player, "skill_70_79685") <= 0
    ) {
      continue;
    }

    const baseCount = getActiveSkillCount(player, "skill_70_79685");
    const enhanced = Math.min(baseCount, getEnhancedChildFusionIds(player, "鲜血收割", getFusionSkillId("暗影战斧")).size);
    const healing = fatalDamageEvents.reduce((sum, event) => {
      const value = pendingDamageValue(event);
      const standard = scaleCombatValue(roundCombatValue(scaleCombatValue(value, 1 / 2), Math.floor), baseCount - enhanced);
      return addCombatValues(sum, addCombatValues(standard, scaleCombatValue(value, enhanced)));
    }, [] as CombatValue);
    if (compareCombatValues(healing, []) <= 0) {
      continue;
    }

    applyHealNow(state, player.id, healing, player.id, "死神之镰");
  }
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
  if (hasNoRevive(player)) return;
  if (fatalDamageEvents.some((event) => event.noReviveOrExtraLives)) {
    upsertBuff(player, { id: NO_REVIVE_BUFF_ID, name: "聚能湮灭炮", stacks: 1 });
    return;
  }
  if (!isGlobalSkillActive(state, "skill_6_503", player.id)) {
    return;
  }

  const sourceIds = Array.from(
    new Set(
      fatalDamageEvents.flatMap(getSkillDamageSourceIds)
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
    return !play.usesPerGame ||
      getSkillUseCount(player, skillId) < (getSkillUseLimit(player, skillId) ?? play.usesPerGame * getActiveSkillCount(player, skillId));
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
    "temp_absolute_invulnerable",
    "temp_shield_normal",
    "temp_shield_skill",
    REVERSAL_TURN_BUFF_ID,
    FLASH_DODGE_BUFF_ID,
    SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID
  ]);

  for (const player of state.players) {
    player.buffs = player.buffs.filter(
      (buff) =>
        (buff.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID && state.turnResolutionStarted &&
          (buff.expiresAtTurn ?? -1) >= state.turnNumber) ||
        !temporaryBuffIds.has(buff.id) &&
        (buff.expiresAtRound === undefined || buff.expiresAtRound > state.roundNumber) &&
        (buff.expiresAtTurn === undefined || ([HUIYUE_BUFF_ID, NEGATIVE_STATUS_IMMUNITY_BUFF_ID].includes(buff.id) ? buff.expiresAtTurn >= state.turnNumber : buff.expiresAtTurn > state.turnNumber))
    );
  }
}

function endRound(
  state: GameState,
  options: { skipSmallSpaceTick?: boolean; skipRoundEndSkills?: boolean } = {}
): void {
  state.eventLog.push({
    ...createBaseEvent(state, "round_ended"),
    type: "round_ended",
    reason: "有人血量发生变化，所有饼清零"
  });

  if (!options.skipRoundEndSkills) {
    applyRoundEndSkills(state);
    if (state.pendingDamageItems?.length) {
      state.roundEndDamagePending = { skipSmallSpaceTick: Boolean(options.skipSmallSpaceTick) };
      if (handlePendingDamageItems(state)) return;
      if (updateDeaths(state, { allowPending: true })) {
        state.retaliationRevivalPending = true;
        beginSkippedAwareActionPrompt(state, "revival_action");
        return;
      }
      delete state.roundEndDamagePending;
    }
  }
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
  if (state.verdictTurn?.turnNumber === state.turnNumber) applyVerdictRoundPenalty(state, state.verdictTurn.games);
  settleDragonRoundChanges(state);
  settleJunengRoundChanges(state);
  state.roundTurnNumber = 1;
  for (const [spaceId, space] of Object.entries(state.smallSpaces ?? {})) {
    if (space.expiresAtRound > state.roundNumber) continue;
    for (const player of state.players.filter((item) => item.spaceId === spaceId)) {
      delete player.spaceId;
      state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name} 从「${space.name}」返回主空间` });
    }
    delete state.smallSpaces![spaceId];
  }
  if (!options.skipSmallSpaceTick) {
    tickSmallSpaces(state);
  }
}

function grantLegacyCakes(state: GameState, player: PlayerState, reason: string): void {
  const copies = getActiveSkillCount(player, "skill_49_75347");
  if (!copies) return;
  const gain = 2 * copies + getFusionEnhancementCount(player, "skill_49_75347", ["空城计"]);
  changeCakes(state, player.id, player.cakes + gain, `${reason}+${gain}饼`);
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

    if (player.buffs.some((buff) => buff.id === `took_damage_round:${state.roundNumber - 1}`)) grantLegacyCakes(state, player, "遗计轮初");

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

    const traumaBuffs = player.buffs.filter((buff) =>
      !buff.traumaCakePaid && getTraumaDueRound(player, buff) === state.roundNumber);
    for (const traumaBuff of traumaBuffs) {
      traumaBuff.traumaCakePaid = true;
      changeCakes(state, player.id, player.cakes + traumaBuff.stacks, `创伤聚合轮初+${traumaBuff.stacks}饼`);
    }
  }
}

function applyTraumaRecoveryAtRoundEnd(state: GameState, player: PlayerState): void {
  const due = player.buffs.filter((buff) => getTraumaDueRound(player, buff) === state.roundNumber);
  for (const buff of due) {
    player.buffs = player.buffs.filter((item) => item.id !== buff.id);
    const fusion = player.skillFusions?.find((item) => item.id === buff.sourceFusionId && isFusionActive(player, item));
    if (fusion && getFusionRecipe(fusion.skillId)?.skill.name === "灵魂修复") {
      const before = player.hp;
      setPlayerHpValue(player, combatValue(getPlayerInitialHp(player)));
      if (player.hp > 0) clearPendingDeath(player);
      state.eventLog.push({ ...createBaseEvent(state, "heal"), type: "heal", sourceId: player.id,
        targetId: player.id, amount: Math.max(0, player.hp - before), reason: "灵魂修复", recoveryKind: "full_restore" });
    } else {
      const enhanced = fusion && getFusionRecipe(fusion.skillId)?.skill.name === "霸者重装" &&
        getFusionEnhancementCount(player, "skill_120_85509", ["霸者重装"]) > 0;
      const healing = (enhanced ? 4 : 3) * buff.stacks;
      applyHealNow(state, player.id, healing, player.id, "创伤聚合");
    }
  }
}

function applyRoundEndSkills(state: GameState): void {
  for (const player of state.players) {
    if (player.status !== "alive") {
      continue;
    }

    applyTraumaRecoveryAtRoundEnd(state, player);
    const sanctuaryCount = state.roundNumber % 3 === 0 ? getActiveSkillCount(player, "skill_71_40087") :
      getFusionEnhancementCount(player, "skill_71_40087", ["霸者重装"]);
    if (sanctuaryCount > 0) {
      applyHealNow(state, player.id, 3 * sanctuaryCount, player.id, "圣域");
    }

    const domainId = getFusionSkillId("魔域");
    const sweepingDomains = state.roundNumber % 3 === 0 ? getEnhancedChildFusionIds(player, "轮回吞噬", domainId) : new Set<string>();
    const domains = state.roundNumber % 3 === 0 ? getActiveFusionCount(player, "魔域") - sweepingDomains.size : 0;
    const selected = player.buffs.filter((buff) => buff.id === "demon_domain_target" && player.skillFusions?.some((fusion) =>
      fusion.id === buff.sourceFusionId && isFusionActive(player, fusion))).map((buff) => buff.sourcePlayerId);
    if (state.roundNumber % 3 === 0) player.buffs = player.buffs.filter((buff) => buff.id !== "demon_domain_target");
    if (sweepingDomains.size) {
      const deltas = new Map<PlayerId, HealthDelta>();
      for (const target of playersInSpace(state, player.id)) {
        if (target.id === player.id || target.status !== "alive") continue;
        for (const _id of sweepingDomains) addDamage(state, deltas, target.id, 3, player.id, "魔域", undefined,
          { spellDamage: true, drainHealing: true });
      }
      applyHealthDeltas(state, deltas);
    }
    if (domains > 0) {
      const deltas = new Map<PlayerId, HealthDelta>();
      for (let index = 0; index < domains * 3; index++) {
        const local = playersInSpace(state, player.id);
        const requested = local.find((candidate) => candidate.id === selected[index]);
        const target = requested?.status === "alive" && requested.id !== player.id ? requested :
          local.filter((other) => other.status === "alive" && other.id !== player.id)
            .sort((a, b) => compareCombatValues(getPlayerHpValue(b), getPlayerHpValue(a)))[0];
        if (!target) continue;
        addDamage(state, deltas, target.id, 1, player.id, "魔域", undefined, { spellDamage: true, drainHealing: true });
      }
      applyHealthDeltas(state, deltas);
    }
    const xieyuCount = state.roundNumber % 3 === 0 ? getActiveSkillCount(player, "skill_72_53933") : 0;
    if (xieyuCount > 0) {
      const selectedTargetIds = player.buffs
        .filter((buff) => buff.id === "xieyu_target" && buff.sourcePlayerId)
        .map((buff) => buff.sourcePlayerId!)
        .slice(0, xieyuCount);
      const fallbackTargets = playersInSpace(state, player.id)
        .filter((candidate) => candidate.status === "alive" && candidate.id !== player.id)
        .sort((a, b) => compareCombatValues(getPlayerHpValue(b), getPlayerHpValue(a)));
      player.buffs = player.buffs.filter((buff) => buff.id !== "xieyu_target");
      for (let index = 0; index < xieyuCount; index += 1) {
        const selectedTargetId = selectedTargetIds[index];
        const selectedTarget = selectedTargetId ? findPlayer(state, selectedTargetId) : undefined;
        const target =
          selectedTarget?.status === "alive" && selectedTarget.id !== player.id && canAffectAcrossSpace(state, player.id, selectedTarget.id)
            ? selectedTarget
            : fallbackTargets[0];
      if (!target) {
        continue;
      }
      const deltas = new Map<PlayerId, HealthDelta>();
      addDamage(state, deltas, target.id, 1, player.id, "邪域", undefined, { spellDamage: true, drainHealing: true });
      applyHealthDeltas(state, deltas);
      }
    }
  }
}

function applyTurnStartSkills(state: GameState): void {
  for (const player of state.players) {
    const enhanced = getFusionEnhancementCount(player, "skill_63_72549", ["圣宝"]);
    const standard = Math.max(0, getActiveSkillCount(player, "skill_63_72549") - enhanced);
    const holyWaterCount = (state.roundTurnNumber % 4 === 0 ? standard : 0) + (state.roundTurnNumber % 3 === 0 ? enhanced : 0);
    if (player.status === "alive" && holyWaterCount > 0) {
      changeCakes(state, player.id, player.cakes + holyWaterCount, `圣水收集器回合初+${holyWaterCount}饼`);
    }
  }
}

/** Immunity counters can themselves be immune; iterate instead of recursing through addDamage. */
function resolveImperialSpiritResponses(
  state: GameState, healthDeltas: Map<PlayerId, HealthDelta>, targetId: PlayerId,
  sourceId: PlayerId | undefined, attackName: string | undefined
): void {
  const skillId = getFusionSkillId("帝灵之境");
  while (true) {
    pushAttackBlockedEvent(state, { sourceId, targetId, attackName: attackName ?? "法伤",
      blockKind: "immune", protectionName: "帝灵之境" });
    if (!sourceId || sourceId === targetId || takeRetaliationResponses(state, targetId, skillId) === 0) return;
    if (getActiveFusionCount(findPlayer(state, sourceId), "帝灵之境") > 0) {
      const previousTarget = targetId;
      targetId = sourceId;
      sourceId = previousTarget;
      attackName = "帝灵之境";
      continue;
    }
    addDamage(state, healthDeltas, sourceId, 1, targetId, "帝灵之境",
      fireDamageStats(skillId, "帝灵之境", 1), { spellDamage: true, retaliation: true });
    return;
  }
}

function addDamage(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  targetId: PlayerId,
  inputAmount: number | CombatValue,
  sourceId?: PlayerId,
  attackName?: string,
  stats?: AttackStats,
  context: DamageContext = {}
): void {
  const target = findPlayer(state, targetId);
  if (!target || !canAffectAcrossSpace(state, sourceId, targetId)) {
    return;
  }
  let value = typeof inputAmount === "number" ?
    inputAmount === INFINITE_DAMAGE ? INFINITY_VALUE : combatValue(inputAmount) : inputAmount;
  const attackDefeatLevel = context.pointDefeatLevel ?? getPointDamageDefeatLevel(stats);
  if (attackDefeatLevel === 2) value = RETIRE_VALUE;
  let amount = projectCombatValue(value);

  if (sourceId === targetId && sourceId && stats?.id !== ELECTRIC_SHOCK_SKILL_ID && !context.ordinarySelfDamage) {
    context = { ...context, internalDamage: true, isLastHit: false };
  }

  const spell = Boolean(context.spellDamage || (!context.fromAttack && attackName && SPELL_DAMAGE_NAMES.has(attackName)));
  const skill = stats?.isSkill ? getSkill(stats.id) : undefined;
  const ignoredSkill = ignoresOtherActiveSkill(target, sourceId, skill) || Boolean(skill && BIG_CARD_SKILLS[skill.id] && isBigCardAbilityIgnored(target, skill));
  const ignoredDamage = !context.bypassDamageImmunity && target.buffs.some((buff) =>
    (spell && buff.ignoredDamageKinds?.includes("spell")) ||
    (isAttackDamage(stats, context) && buff.ignoredDamageKinds?.includes("attack")) ||
    getAttackElements(stats).some((element) => buff.ignoredDamageElements?.includes(element)));
  if (ignoredSkill || ignoredDamage) {
    pushAttackBlockedEvent(state, { sourceId, targetId, attackName: attackName ?? stats?.name ?? "伤害",
      blockKind: "block", protectionName: "无视" });
    return;
  }
  if (spell) {
    context = { ...context, spellDamage: true };
    if (!context.fixedStoredDamage && attackDefeatLevel !== 2)
      value = scaleCombatValue(value, spellDamageMultiplier(sourceId ? findPlayer(state, sourceId) : undefined));
    amount = projectCombatValue(value);
    if (!bypassesDamageImmunity(context, getFusionSkillId("帝灵之境")) && getActiveFusionCount(target, "帝灵之境") > 0) {
      resolveImperialSpiritResponses(state, healthDeltas, targetId, sourceId, attackName);
      return;
    }
  }

  const sniperRetirement = Boolean(context.fromAttack && (context.offenseSnapshot ? context.offenseSnapshot.retirement :
    context.isLastHit && target.cakes === 0 && getActiveFusionCount(sourceId ? findPlayer(state, sourceId) : undefined, "暗影狙击") > 0));
  const protectionLevel = attackDefeatLevel && attackDefeatLevel > 2 ? attackDefeatLevel : sniperRetirement ? 2 : attackDefeatLevel;
  const attackPower = stats ? attackPowerValue(stats) : value;
  const sixStar = target.buffs.find((buff) => buff.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID &&
    (buff.expiresAtTurn ?? -1) >= state.turnNumber && buff.sixStarMaxDamage !== undefined);
  if (sixStar && !bypassesDamageImmunity(context, sixStar.id) &&
    (protectionLevel ?? 1) <= 1 && compareCombatValues(value, INFINITY_VALUE) <= 0 &&
    compareCombatValues(attackPower, INFINITY_VALUE) <= 0) {
    const adjusted = applyLockedDamageRules(state, targetId, value, sourceId, attackName, stats, healthDeltas, context);
    resolveSixStar(state, healthDeltas, targetId, sixStar.name, adjusted);
    pushAttackBlockedEvent(state, { sourceId, targetId, attackName: attackName ?? stats?.name ?? "伤害",
      blockKind: "immune", protectionName: "六芒星" });
    rememberBlockedAttack(healthDeltas, targetId, context);
    return;
  }
  if (context.attackKey && healthDeltas.get(targetId)?.blockedAttackKeys?.has(context.attackKey)) return;

  if (!context.fixedStoredDamage && stats && isAttackDamage(stats, context) && getActiveFusionCount(target, "六芒星阵") > 0 &&
    !target.buffs.some((buff) => buff.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID ||
      !stats.pierceInvulnerability && !context.internalDamage && (buff.id === "temp_invulnerable" || buff.stateType === "gather_invulnerability"))) {
    const roll = Math.floor(Math.random() * 12) + 1;
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: targetId, message: `六芒星阵D12：${roll}` });
    const protectionEligible = (attackDefeatLevel ?? 1) <= 1 && compareCombatValues(attackPower, INFINITY_VALUE) <= 0 &&
      !sniperRetirement;
    if ((roll <= 2 || roll === 3) && protectionEligible) {
      upsertBuff(target, { id: roll === 3 ? SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID : "temp_invulnerable", name: "六芒星阵", stacks: 1, expiresAtTurn: state.turnNumber });
      if (roll === 3) {
        const adjusted = applyLockedDamageRules(state, targetId, value, sourceId, attackName, stats, healthDeltas, context);
        queuePendingDamage(state, targetId, adjusted, sourceId, attackName, stats, context);
        resolveSixStar(state, healthDeltas, targetId, "六芒星阵", adjusted);
      }
      // Invulnerability from rolls 1/2 cannot stop backlash; roll 3 is actual damage immunity.
      if (roll === 3 || (!context.internalDamage && !stats.pierceInvulnerability)) {
        if (roll !== 3 && context.attackKey && isBigSkillMode(state.config.skillMode)) {
          (ensureDelta(healthDeltas, targetId).jihanIgnoredHits ??= new Set()).add(context.attackKey);
        }
        rememberBlockedAttack(healthDeltas, targetId, context);
        return;
      }
    }
    if (roll === 4 && sourceId && !context.internalDamage) {
      state.eventLog.push({ ...createBaseEvent(state, "attack_reflected"), type: "attack_reflected", sourceId,
        originalTargetId: targetId, reflectedTargetId: sourceId, attackName: attackName ?? stats.name });
      if (context.attackKey) (ensureDelta(healthDeltas, targetId).reflectedAttackKeys ??= new Set()).add(context.attackKey);
      const redirected: AttackInstance = { key: `${context.attackKey ?? createId("attack")}:six_star_return`,
        sourceId, targetId: sourceId, originalTargetId: targetId, actionIndex: 0, stats, reflected: true,
        ...(context.infiniteCopies ? { infiniteCopies: true } : {}),
        ...(context.offenseSnapshot ? { offenseSnapshot: context.offenseSnapshot } : {}) };
      const start = state.eventLog.length;
      addDamage(state, healthDeltas, sourceId, value, sourceId, attackName, stats,
        { ...context, attackKey: redirected.key, reflected: true, isLastHit: false });
      applySkillHitEffectsIfAttackHit(state, start, redirected, getRevealedActions(state), healthDeltas);
      return;
    }
  }

  if (!context.fixedStoredDamage && blockInvulnerableAttack(state, targetId, sourceId, attackName, stats, context,
    protectionLevel)) {
    rememberBlockedAttack(healthDeltas, targetId, context);
    return;
  }
  if (amount <= 0) {
    if (context.zeroClashHit) {
      const eventStart = state.eventLog.length;
      applyLockedDamageRules(state, targetId, [], sourceId, attackName, stats, healthDeltas, context);
      if (state.eventLog.slice(eventStart).some(event => event.type === "attack_blocked" && event.targetId === targetId &&
        event.blockKind === "immune") || (skill && isPurificationImmune(state, targetId, skill, sourceId))) {
        rememberBlockedAttack(healthDeltas, targetId, context);
        return;
      }
      if (!context.internalDamage && sourceId &&
        absorbWithTemporaryProtectionV2(state, targetId, sourceId, 0, attackName, stats, context)) return;
    }
    if (!context.internalDamage && sourceId && isAttackDamage(stats, context) && !stats?.ignoreSwordProtections &&
      absorbWithShieldV2(state, targetId, sourceId, value, attackName)) rememberBlockedAttack(healthDeltas, targetId, context);
    else {
      rememberAttackHit(healthDeltas, targetId, context);
      if (context.zeroClashHit) nullifyFrostBladeDamage(state, targetId, 0, sourceId, attackName, stats, true);
    }
    return;
  }
  if (attackDefeatLevel && attackDefeatLevel > 1) {
    if (isDefeatEffectBlocked(state, targetId, sourceId, attackName, stats, healthDeltas)) {
      rememberBlockedAttack(healthDeltas, targetId, context);
      return;
    }
    rememberAttackHit(healthDeltas, targetId, context);
    queuePendingDamage(state, targetId, value, sourceId, attackName, stats,
      { ...context, pointDefeatLevel: attackDefeatLevel });
    return;
  }

  if (skill && isPurificationImmune(state, targetId, skill, sourceId)) {
    if (context.attackKey && isBigSkillMode(state.config.skillMode)) {
      (ensureDelta(healthDeltas, targetId).jihanIgnoredHits ??= new Set()).add(context.attackKey);
    }
    return;
  }

  const lockedAdjusted = applyLockedDamageRules(
    state,
    targetId,
    value,
    sourceId,
    attackName,
    stats,
    healthDeltas,
    context
  );
  if (compareCombatValues(lockedAdjusted, []) <= 0) {
    rememberAttackHit(healthDeltas, targetId, context);
    return;
  }

  const normalizedAmount = projectCombatValue(lockedAdjusted);
  if (!context.internalDamage && sourceId && absorbWithTemporaryProtectionV2(state, targetId, sourceId, normalizedAmount, attackName, stats, context)) {
    return;
  }

  if (!context.internalDamage && sourceId && !stats?.ignoreSwordProtections &&
    absorbWithShieldV2(state, targetId, sourceId, lockedAdjusted, attackName) && !context.infiniteCopies) {
    rememberBlockedAttack(healthDeltas, targetId, context);
    return;
  }
  if (!context.internalDamage && context.infiniteCopies && sourceId && !stats?.ignoreSwordProtections) {
    // Every finite shield absorbs one copy; infinitely many other copies remain.
    while (absorbWithShieldV2(state, targetId, sourceId, lockedAdjusted, attackName)) { /* consume finite shields */ }
  }

  let finalValue = context.internalDamage ? lockedAdjusted : absorbWithDefenseValueV2(
    state,
    targetId,
    lockedAdjusted,
    attackName,
    stats,
    sourceId,
    context
  );
  if (!context.internalDamage && context.infiniteCopies && normalizedAmount > 0 && !context.spellDamage) {
    const defense = target.buffs.find((buff) => buff.id === "defense_value" && buff.stacks > 0);
    if (!defense?.infinite) {
      target.buffs = target.buffs.filter((buff) => buff.id !== "defense_value");
      finalValue = lockedAdjusted;
    }
  }
  if (compareCombatValues(finalValue, []) <= 0) {
    return;
  }
  rememberAttackHit(healthDeltas, targetId, context);
  if (sniperRetirement) {
    addDefeatEffect(state, healthDeltas, targetId, 2, sourceId, "暗影狙击", stats, context);
    return;
  }

  if (nullifyFrostBladeDamage(state, targetId, projectCombatValue(finalValue), sourceId, attackName, stats)) {
    return;
  }

  queuePendingDamage(state, targetId, finalValue, sourceId, attackName, stats, context);
}

function queuePendingDamage(
  state: GameState,
  targetId: PlayerId,
  value: CombatValue,
  sourceId: PlayerId | undefined,
  attackName: string | undefined,
  stats: AttackStats | undefined,
  context: DamageContext
): void {
  const item: PendingDamageItem = {
    id: createId("pending_damage"),
    targetId,
    amount: projectCombatValue(value),
    amountValue: value,
    fromAttack: isAttackDamage(stats, context),
    isLastHit: Boolean(context.isLastHit)
  };
  if (context.spellDamage) item.spellDamage = true;
  if (context.verdictMoveKey) {
    item.verdictMoveKey = context.verdictMoveKey;
    item.ordinaryAttack = Boolean(stats && !stats.isSkill);
  }
  if (context.sourceAbilityId) item.sourceAbilityId = context.sourceAbilityId;
  if (context.sourceBigCardInstanceId) item.sourceBigCardInstanceId = context.sourceBigCardInstanceId;
  if (context.fixedStoredDamage) item.bypassDamageReflection = true;
  if (context.noReviveOrExtraLives) item.noReviveOrExtraLives = true;
  if (context.pointDefeatLevel) item.pointDefeatLevel = context.pointDefeatLevel;
  if (context.drainHealing) item.drainHealing = true;
  if (context.retaliation) item.retaliation = true;
  if (context.reflected) item.reflected = true;
  if (context.actionRebounderIds) item.actionRebounderIds = context.actionRebounderIds;
  if (context.bypassDamageImmunity) item.bypassDamageImmunity = true;
  if (context.internalDamage) item.internalDamage = true;
  if (context.infiniteCopies) item.infiniteCopies = true;
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
    if (context.fromAttack) {
      item.attackPower = stats.power;
      item.attackPowerValue = attackPowerValue(stats);
    }
  }
  if (context.attackKey) item.attackKey = context.attackKey;
  state.pendingDamageItems = [...(state.pendingDamageItems ?? []), item];
}

function applyPendingDamageItems(state: GameState): boolean {
  applyLightningBodyImmunity(state);
  const pending = state.pendingDamageItems ?? [];
  if (pending.length === 0) {
    return false;
  }

  state.pendingDamageItems = [];
  const healthDeltas = new Map<PlayerId, HealthDelta>();
  for (const item of pending) {
    const target = findPlayer(state, item.targetId);
    if (!target || target.status !== "alive" || item.amount <= 0 || !canAffectAcrossSpace(state, item.sourceId, item.targetId)) {
      continue;
    }

    if (item.unprocessedSpell) {
      addDamage(state, healthDeltas, item.targetId, item.amountValue ?? item.amount, item.sourceId, item.attackName, undefined,
        { spellDamage: true, ...(item.pointDefeatLevel ? { pointDefeatLevel: item.pointDefeatLevel } : {}),
          drainHealing: Boolean(item.drainHealing) });
      continue;
    }
    const delta = ensureDelta(healthDeltas, item.targetId);
    if (item.directDefeat && item.pointDefeatLevel) {
      recordDefeatDelta(delta, item.pointDefeatLevel, item.sourceId, item.attackName);
      continue;
    }
    const perCopy = pendingDamageValue(item);
    const totalValue = item.infiniteCopies ? multiplyCombatValues(perCopy, INFINITY_VALUE) : perCopy;
    const totalAmount = projectCombatValue(totalValue);
    if (item.pointDefeatLevel) {
      recordDefeatDelta(delta, item.pointDefeatLevel, item.sourceId, item.attackName);
    } else {
      delta.damageValue = addCombatValues(delta.damageValue ?? combatValue(delta.damage), totalValue);
      delta.damage = projectCombatValue(delta.damageValue);
    }
    if (item.fromAttack && !item.internalDamage && !getSpaceReversal(state, item.targetId)?.suppressed && target.hp > 0 && delta.damageAtZero === undefined &&
      state.pendingActions[target.id]?.actions.some((action) => action.type === "skill" && SAINT_DAMAGE_TO_ZERO_SKILL_IDS.has(action.skillId) &&
      getActiveSkillCount(target, action.skillId) > 0)) {
      delta.damageAtZero = delta.damage;
      if (delta.damageValue) delta.damageAtZeroValue = delta.damageValue;
    }
    const event: DamageEvent = {
      ...createBaseEvent(state, "damage"),
      type: "damage",
      targetId: item.targetId,
      amount: totalAmount,
      amountValue: totalValue,
      ...(item.pointDefeatLevel ? { pointDefeatLevel: item.pointDefeatLevel } : {})
    };
    if (item.noReviveOrExtraLives) event.noReviveOrExtraLives = true;
    if (item.sourceAbilityId) event.sourceAbilityId = item.sourceAbilityId;
    if (item.sourceBigCardInstanceId) event.sourceBigCardInstanceId = item.sourceBigCardInstanceId;
    if (item.infiniteCopies) {
      event.infiniteCopies = true;
      event.perCopyAmount = item.amount;
      event.perCopyAmountValue = perCopy;
    }
    if (item.reflected) event.reflected = true;
    if (item.internalDamage) event.internalDamage = true;
    delta.lastDamageInternal = Boolean(item.internalDamage);
    if (item.sourceId) {
      event.sourceId = item.sourceId;
    }
    const reboundSources = getJihanReboundDamageSources(state, item);
    if (reboundSources.length) event.reboundSkillSourceIds = reboundSources;
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
    (delta.damageEventIds ??= []).push(event.id);
    if (item.pointDefeatLevel) continue;
    if (getActiveSkillCount(target, JUNENG_RESPONSE_ID) > 0) scheduleJunengResponse(state, target, item);
    if (item.fromAttack && !item.internalDamage) {
      const count = getActiveFusionCount(target, "炼狱使徒");
      const responses = count ? takeRetaliationResponses(state, target.id, getFusionSkillId("炼狱使徒"),
        item.infiniteCopies ? RETALIATION_RESPONSE_LIMIT : 1) : 0;
      for (let i = 0; i < responses; i++) {
        for (const player of playersInSpace(state, target.id)) {
          if (player.status !== "alive") continue;
          addDamage(state, healthDeltas, player.id, count, target.id, "炼狱使徒",
            fireDamageStats(getFusionSkillId("炼狱使徒"), "炼狱使徒", count),
            { spellDamage: true, retaliation: true, ordinarySelfDamage: true });
        }
      }
    }
    if (item.sourceAbilityId === SPIRIT_GUIDANCE_ID && item.sourceId && item.sourceBigCardInstanceId)
      recordSpiritGuidanceDamage(state, healthDeltas, item.sourceId, item.sourceBigCardInstanceId, totalValue);
    if (item.drainHealing && item.spellDamage && item.sourceId) {
      addHeal(state, healthDeltas, item.sourceId, totalValue, item.sourceId, item.attackName ?? "吸血");
    }
    rememberDamageTaken(state, item.targetId, item.sourceId, totalValue, isAttackDamageItem(item));
    if (item.infiniteCopies) for (const buff of target.buffs) {
      if (isAttackDamageItem(item) && ["huyou_mark", "cross_mark"].includes(buff.id)) {
        buff.stacks = INFINITE_DAMAGE; buff.infinite = true;
      }
    }

    const skillSources = getSkillDamageSourceIds(event).map((id) => findPlayer(state, id));
    for (const source of skillSources) {
      if (isBigSkillMode(state.config.skillMode)) recordJihanDamage(source, totalAmount);
      if (item.fromAttack) awardRevenge(state, source, item.targetId);
    }
    for (const other of alivePlayers(state)) {
      if (!canAffectAcrossSpace(state, item.targetId, other.id)) continue;
      const count = other.id === item.targetId ? 0 : getActiveFusionCount(other, "暗影战斧");
      const enhanced = count ? getEnhancedChildFusionIds(other, "鲜血收割", getFusionSkillId("暗影战斧")).size : 0;
      const healing = addCombatValues(scaleCombatValue(roundCombatValue(scaleCombatValue(perCopy, 1 / 4), Math.floor), count - enhanced),
        scaleCombatValue(perCopy, enhanced));
      if (healing.length) addHeal(state, healthDeltas, other.id,
        item.infiniteCopies ? multiplyCombatValues(healing, INFINITY_VALUE) : healing, other.id, "暗影战斧");
    }

    const imperialFlameCount = getActiveSkillCount(target, "skill_76_76044");
    if (!item.internalDamage && item.sourceId && imperialFlameCount > 0) {
      const inherited = Math.min(imperialFlameCount, getFusionEnhancementCount(target, "skill_76_76044", ["帝灵之境"]));
      // A retained material response belongs to its fusion, not an extra raw-skill quota.
      for (const [skillId, count] of [["skill_76_76044", imperialFlameCount - inherited],
        [getFusionSkillId("帝灵之境"), inherited]] as const) {
        if (count === 0) continue;
        const responses = takeRetaliationResponses(state, item.targetId, skillId,
          item.infiniteCopies ? RETALIATION_RESPONSE_LIMIT : count, "帝炎之境");
        for (let index = 0; index < responses; index += 1) {
          addDamage(state, healthDeltas, item.sourceId, 1, item.targetId, "帝炎之境",
            fireDamageStats("skill_76_76044", "帝炎之境", 1), { spellDamage: true, retaliation: true });
        }
      }
    }

    const armor = getActiveFusionCount(target, "反伤刺甲");
    if (!item.bypassDamageReflection && !item.internalDamage && item.sourceId && item.sourceId !== target.id && armor > 0) {
      const responses = takeRetaliationResponses(state, target.id, getFusionSkillId("反伤刺甲"),
        item.infiniteCopies ? RETALIATION_RESPONSE_LIMIT : 1);
      for (let index = 0; index < responses; index += 1) addDamage(state, healthDeltas, item.sourceId,
        scaleCombatValue(roundCombatValue(scaleCombatValue(perCopy, 1 / 2), Math.ceil), armor),
        target.id, "反伤刺甲", undefined, { spellDamage: true, retaliation: true });
    }

    if (item.fromAttack) {
      for (const source of skillSources) {
        const bloodthirstCount = getActiveSkillCount(source, "skill_46_3651");
        if (!source || bloodthirstCount === 0) continue;
        const fullCount = Math.min(bloodthirstCount, getFusionEnhancementCount(source, "skill_46_3651", ["鲜血收割"]));
        const enhancedCount = getFusionEnhancementCount(source, "skill_46_3651", ["泣血之刃", "末世"]);
        const healing = addCombatValues(scaleCombatValue(perCopy, fullCount), addCombatValues(
          scaleCombatValue(roundCombatValue(scaleCombatValue(perCopy, 1 / 2), Math.floor), enhancedCount),
          scaleCombatValue(roundCombatValue(scaleCombatValue(perCopy, 1 / 4), Math.floor), Math.max(0, bloodthirstCount - enhancedCount - fullCount))
        ));
        if (healing.length) {
          addHeal(state, healthDeltas, source.id, item.infiniteCopies ? multiplyCombatValues(healing, INFINITY_VALUE) : healing,
            source.id, "嗜血");
        }
      }
    }
  }

  return applyHealthDeltas(state, healthDeltas);
}

function recordSpiritGuidanceDamage(state: GameState, deltas: Map<PlayerId, HealthDelta>, sourceId: PlayerId,
  instanceId: string, damage: CombatValue): void {
  const card = findPlayer(state, sourceId)?.bigCards?.find((entry) => entry.instanceId === instanceId);
  if (!card) return;
  const totalDamage = addCombatValues(damage, combatValue(card.guidanceDamageRemainder ?? 0));
  const sets = roundCombatValue(scaleCombatValue(totalDamage, 1 / 5), Math.floor);
  card.guidanceDamageRemainder = totalDamage.find((term) => term.exponent === 0)?.coefficient ?? 0;
  card.guidanceDamageRemainder %= 5;
  if (compareCombatValues(sets, []) <= 0) return;
  addDefenseValue(state, sourceId, scaleCombatValue(sets, 3), "灵媒指引");
  const heal = addHeal(state, deltas, sourceId, scaleCombatValue(sets, 2), sourceId, "灵媒指引");
  if (heal?.targetId !== sourceId) return;
  const actualHealing = heal.amountValue ?? combatValue(heal.amount);
  if (isUnboundedCombatValue(actualHealing)) {
    card.guidanceHealingUnlimited = true;
    return;
  }
  const totalHealing = (card.guidanceHealingRemainder ?? 0) + heal.amount;
  card.guidanceHealingRemainder = totalHealing % 6;
  card.guidanceHealingUses = (card.guidanceHealingUses ?? 0) + Math.floor(totalHealing / 6);
}

function addDefeatEffect(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  targetId: PlayerId,
  defeatLevel: DefeatLevel,
  sourceId?: PlayerId,
  reason?: string,
  stats?: AttackStats,
  context: DamageContext = {}
): void {
  const target = findPlayer(state, targetId);
  if (!target || target.status !== "alive" || !canAffectAcrossSpace(state, sourceId, targetId)) {
    return;
  }

  if (!context.internalDamage && blockInvulnerableAttack(state, targetId, sourceId, reason, stats, context, defeatLevel)) {
    rememberBlockedAttack(healthDeltas, targetId, context);
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
      stats,
      context
    );
    return;
  }

  if (isDefeatEffectBlocked(state, targetId, sourceId, reason, stats, healthDeltas)) {
    return;
  }
  if (defeatLevel === 2 && canUseStarResistance(target)) {
    (state.pendingDamageItems ??= []).push({ id: createId("pending_retirement"), targetId, amount: 1, pointDefeatLevel: 2,
      directDefeat: true, ...(sourceId ? { sourceId } : {}), ...(reason ? { attackName: reason } : {}) });
    return;
  }

  recordDefeatDelta(ensureDelta(healthDeltas, targetId), defeatLevel, sourceId, reason);

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${target.name} 受到${reason ? ` ${reason} 的` : ""}${DEFEAT_LEVEL_LABELS[defeatLevel]}效果`
  });
}

function recordDefeatDelta(delta: HealthDelta, level: DefeatLevel, sourceId?: PlayerId, reason?: string): void {
  if (delta.defeatLevel && delta.defeatLevel >= level) return;
  delta.defeatLevel = level;
  if (sourceId) delta.defeatSourceId = sourceId; else delete delta.defeatSourceId;
  if (reason) delta.defeatReason = reason; else delete delta.defeatReason;
}

function isDefeatEffectBlocked(
  state: GameState,
  targetId: PlayerId,
  sourceId: PlayerId | undefined,
  reason: string | undefined,
  stats: AttackStats | undefined,
  healthDeltas: Map<PlayerId, HealthDelta>
): boolean {
  const target = findPlayer(state, targetId);
  if (!target) {
    return true;
  }

  const sourceSkill = stats?.isSkill ? getSkill(stats.id) : undefined;
  if (sourceSkill && (ignoresOtherActiveSkill(target, sourceId, sourceSkill) || isPurificationImmune(state, targetId, sourceSkill, sourceId))) {
    return true;
  }

  const attributeProtection = stats && getAttributeImmunitySkill(target, getAttackElements(stats));
  if (stats && attributeProtection) {
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: reason ?? stats.name,
      blockKind: "immune",
      protectionName: getSkill(attributeProtection)!.name,
      protectionSkillId: attributeProtection
    });
    return true;
  }

  const earthHeartCount = getActiveSkillCount(target, "skill_39_77400");
  if (stats && earthHeartCount > 0 && attackHasElement(stats, "electric")) {
    rewardEarthHeart(state, healthDeltas, target);
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
  stats: AttackStats | undefined,
  zeroClashHit = false
): boolean {
  if (!stats?.traits.includes("frost_blade") || (finalAmount <= 0 && !zeroClashHit)) {
    return false;
  }

  const target = findPlayer(state, targetId);
  const source = sourceId ? findPlayer(state, sourceId) : undefined;
  if (!target || !source) {
    return false;
  }

  if (!target.spaceId) state.turnHealthChanged = true;
  const frostBlade = getSkill("skill_18_34323");
  const elementImmune = frostBlade
    ? isSkillEffectImmune(state, target.id, frostBlade, source.id)
    : false;
  const applied = !elementImmune && applyNegativeStatus(state, targetId, "skill_disabled", (player) => {
    upsertBuff(player, {
      id: `${SKILL_DISABLED_BUFF_PREFIX}${state.roundNumber + 1}`,
      name: "技能失效",
      stacks: 1,
      sourcePlayerId: source.id
    });
  }, source.id);
  const immune = !applied;

  const damageDescription = stats.frostBladeKeepsDamage ? `保留 ${finalAmount} 点伤害` : `原本 ${finalAmount} 点伤害归零`;
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: immune
      ? `${source.name} 的寒冰剑命中 ${target.name}，${damageDescription}，但技能失效状态被免疫；本轮仍然重开`
      : `${source.name} 的寒冰剑命中 ${target.name}，${damageDescription}，${target.name} 技能失效 1 轮`
  });
  return !stats.frostBladeKeepsDamage;
}

function rememberBlockedAttack(healthDeltas: Map<PlayerId, HealthDelta>, targetId: PlayerId, context: DamageContext): void {
  if (context.attackKey) (ensureDelta(healthDeltas, targetId).blockedAttackKeys ??= new Set()).add(context.attackKey);
}

function rememberAttackHit(healthDeltas: Map<PlayerId, HealthDelta>, targetId: PlayerId, context: DamageContext): void {
  if (context.fromAttack && context.attackKey) {
    (ensureDelta(healthDeltas, targetId).landedAttackKeys ??= new Set()).add(context.attackKey);
  }
}

/** Invulnerability rejects an attack before any damage or on-hit processing, including zero power. */
function blockInvulnerableAttack(
  state: GameState, targetId: PlayerId, sourceId: PlayerId | undefined, attackName: string | undefined,
  stats: AttackStats | undefined, context: DamageContext, defeatLevel?: DefeatLevel
): boolean {
  const target = findPlayer(state, targetId);
  // Electric shock is a non-attack action represented internally as a zero-power packet.
  if (context.internalDamage || !target || !stats || stats.pierceInvulnerability ||
    !isAttackDamage(stats, context) || stats.id === ELECTRIC_SHOCK_SKILL_ID) return false;
  const block = (protectionName: string, protectionSkillId?: SkillId) => {
    pushAttackBlockedEvent(state, { sourceId, targetId, attackName: attackName ?? stats.name,
      blockKind: "invulnerable", protectionName, ...(protectionSkillId ? { protectionSkillId } : {}) });
    return true;
  };
  const absolute = target.buffs.find((buff) => buff.id === "temp_absolute_invulnerable" && buff.expiresAtTurn === state.turnNumber ||
    buff.stateType === "dragon_dominion_protection" && (buff.expiresAtRound ?? 0) > state.roundNumber);
  if (absolute && (defeatLevel ?? 1) <= 2 && compareCombatValues(attackPowerValue(stats), RETIRE_VALUE) <= 0) {
    return block(absolute.name, absolute.sourceAbilityId ?? getFusionSkillId("三元协奏曲"));
  }
  if (state.roundTurnNumber <= 3 && getActiveFusionCount(target, "天空之城") > 0 &&
    (defeatLevel ?? 1) <= 2 && compareCombatValues(attackPowerValue(stats), RETIRE_VALUE) <= 0) {
    return block("天空之城", getFusionSkillId("天空之城"));
  }
  if (state.roundTurnNumber <= 2 && getActiveFusionCount(target, "空城计") > 0 &&
    (defeatLevel === undefined || defeatLevel <= 2) && compareCombatValues(attackPowerValue(stats), RETIRE_VALUE) <= 0) {
    return block("空城计", getFusionSkillId("空城计"));
  }
  if ((defeatLevel ?? 1) > 1 || compareCombatValues(attackPowerValue(stats), INFINITY_VALUE) > 0) return false;
  if (isHuiyueActive(target, state.turnNumber)) return block("辉月");
  const gathering = target.buffs.find((buff) => buff.stateType === "gather_invulnerability" && (buff.expiresAtTurn ?? 0) > state.turnNumber);
  if (gathering) return block(gathering.name);
  const invulnerable = target.buffs.find((buff) => buff.id === "temp_invulnerable" && buff.stacks > 0);
  if (invulnerable) return block(invulnerable.sourcePlayerId === "skill_25_51277" ? "暗影盾" : "无敌");
  if (!stats.ignoreSwordProtections && context.isLastHit && playerHasActiveSkill(target, "skill_26_70243")) {
    return block("无敌", "skill_26_70243");
  }
  const ignoreProtection = stats.traits.includes("ignore_protection");
  if (!ignoreProtection && playerHasActiveSkill(target, "skill_32_19017") && state.roundTurnNumber <=
    (getFusionEnhancementCount(target, "skill_32_19017", ["神域之种"]) > 0 ? 3 : 2)) return block("无敌", "skill_32_19017");
  if (!ignoreProtection && sourceId && playerHasActiveSkill(target, "skill_99_65551") &&
    alivePlayers(state).length > 3 && areAdjacentPlayers(state, targetId, sourceId)) return block("无敌", "skill_99_65551");
  return false;
}

function applyOffensiveDamageRules(state: GameState, targetId: PlayerId, amount: CombatValue,
  sourceId: PlayerId | undefined, stats: AttackStats | undefined, context: DamageContext): CombatValue {
  if (context.verdictStripped || !isAttackDamage(stats, context)) return amount;
  const source = findPlayer(state, sourceId ?? ""), target = findPlayer(state, targetId)!;
  const saved = context.offenseSnapshot;
  const guding = saved?.guding ?? (target.cakes <= 0 ? 2 ** getActiveSkillCount(source, "skill_29_96125") : 1);
  const sniper = sourceId === targetId ? 1 : saved?.sniper ?? (context.isLastHit ? 2 ** getActiveSkillCount(source, "skill_28_42646") : 1);
  const bonus = saved?.bonus ??
    (target.hp >= Math.floor(getPlayerInitialHp(target) / 2) ? getActiveFusionCount(source, "破军") : 0);
  amount = addCombatValues(scaleCombatValue(amount, guding * sniper), combatValue(bonus));
  if (saved) return scaleCombatValue(amount, saved.critical * (stats?.attackDamageMultiplier ?? 1));
  for (let i = 0; i < getActiveFusionCount(source, "无尽战刃"); i++) if (Math.random() < .5) amount = scaleCombatValue(amount, 2);
  return scaleCombatValue(amount, stats?.attackDamageMultiplier ?? 1);
}

function bypassesDamageImmunity(context: DamageContext, effectId: string): boolean {
  return Boolean(context.bypassDamageImmunity && effectHasCategory(effectId, "damage_immunity"));
}

function applyLockedDamageRules(
  state: GameState,
  targetId: PlayerId,
  amount: CombatValue,
  sourceId: PlayerId | undefined,
  attackName: string | undefined,
  stats: AttackStats | undefined,
  healthDeltas: Map<PlayerId, HealthDelta>,
  context: DamageContext = {}
): CombatValue {
  const target = findPlayer(state, targetId);
  if (!target) {
    return [];
  }
  const source = findPlayer(state, context.originSourceId ?? sourceId ?? "");
  const ignoreProtection = Boolean(stats?.traits.includes("ignore_protection"));

  const attributeProtection = stats && getAttributeImmunitySkill(target, getAttackElements(stats));
  if (stats && attributeProtection && !bypassesDamageImmunity(context, attributeProtection)) {
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: attackName ?? stats.name,
      blockKind: "immune",
      protectionName: getSkill(attributeProtection)!.name,
      protectionSkillId: attributeProtection
    });
    return [];
  }

  const earthHeartCount = getActiveSkillCount(target, "skill_39_77400");
  if (stats && earthHeartCount > 0 && attackHasElement(stats, "electric")) {
    rewardEarthHeart(state, healthDeltas, target);
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: attackName ?? stats.name,
      blockKind: "immune",
      protectionName: "大地之心",
      protectionSkillId: "skill_39_77400"
    });
    return [];
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
      return [];
    }
  }

  if (
    !context.internalDamage &&
    !ignoreProtection &&
    getActiveSkillCount(target, "skill_51_92674") > 0 &&
    isFireDamage(stats)
  ) {
    revealSkillOnTrigger(state, targetId, "skill_51_92674", "触发藤甲");
    amount = addCombatValues(amount, combatValue(Math.max(0,
      getActiveSkillCount(target, "skill_51_92674") - getFusionEnhancementCount(target, "skill_51_92674", ["反伤刺甲"]))));
  }

  const baguaCount = getActiveSkillCount(target, "skill_50_50034");
  // Damage origin and element are independent: fire attacks qualify, fire spells do not.
  if (!context.internalDamage && isAttackDamage(stats, context) && !ignoreProtection && baguaCount > 0 &&
    !effectIsSuppressed(target, "skill_50_50034")) {
    revealSkillOnTrigger(state, targetId, "skill_50_50034", "触发八卦阵");
    amount = subtractCombatValues(amount, combatValue(baguaCount + getFusionEnhancementCount(target, "skill_50_50034", ["六芒星阵"])));
    if (compareCombatValues(amount, []) < 0) amount = [];
  }

  if (!context.fixedStoredDamage) amount = applyOffensiveDamageRules(state, targetId, amount, sourceId, stats, context);

  if (
    isAttackDamage(stats, context) && !stats?.ignoreSwordProtections && playerHasActiveSkill(target, "skill_114_87583") &&
    compareCombatValues(getPlayerHpValue(target), amount) < 0 &&
    compareCombatValues(amount, combatValue(1)) !== 0 &&
    !isUnboundedCombatValue(amount)
  ) {
    pushAttackBlockedEvent(state, {
      sourceId,
      targetId,
      attackName: attackName ?? stats?.name ?? "攻击",
      blockKind: "immune",
      protectionName: "不死金身",
      protectionSkillId: "skill_114_87583"
    });
    return [];
  }

  if (isAttackDamage(stats, context) && target.hp === 0 && getActiveFusionCount(target, "名刀司命") > 0 &&
    (state.roundTurnNumber < 3 || state.roundTurnNumber > 5)) return [];

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
  if (!target || (amount <= 0 && !context.zeroClashHit) || !isAttackDamage(stats, context)) {
    return false;
  }

  const protection = target.buffs.find((buff) => {
    if (buff.stacks <= 0) {
      return false;
    }
    if (buff.id === FLASH_DODGE_BUFF_ID && effectIsSuppressed(target, FLASH_DODGE_SKILL_ID)) return false;
    if (stats?.ignoreSwordProtections && [FLASH_DODGE_BUFF_ID, "temp_shield_normal", "temp_shield_skill"].includes(buff.id)) return false;
    if (buff.id === FLASH_DODGE_BUFF_ID || buff.id === SIX_STAR_DAMAGE_IMMUNITY_BUFF_ID) {
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
    !stats?.isSkill || stats.ignoreSwordProtections ||
    getPointDamageDefeatLevel(stats) !== undefined ||
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
  amount: CombatValue,
  attackName: string | undefined
): boolean {
  const target = findPlayer(state, targetId);
  if (!target || compareCombatValues(amount, []) < 0 || compareCombatValues(amount, INFINITY_VALUE) > 0) {
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
  amount: number | CombatValue,
  reason: string
): void {
  const player = findPlayer(state, playerId);
  const value = typeof amount === "number" ? combatValue(amount) : amount;
  if (!player || compareCombatValues(value, []) <= 0) {
    return;
  }

  const defense = player.buffs.find((buff) => buff.id === "defense_value") ?? { id: "defense_value", name: "防御值", stacks: 0 };
  if (!player.buffs.includes(defense)) player.buffs.push(defense);
  setDefenseValue(defense, addCombatValues(defense.defenseValue ?? combatValue(defense.stacks), value));

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${player.name} 获得 ${formatCombatValue(value)} 点防御值（${reason}）`
  });
}

function setDefenseValue(buff: PlayerState["buffs"][number], value: CombatValue): void {
  buff.stacks = projectCombatValue(value);
  if (isUnboundedCombatValue(value)) buff.defenseValue = value;
  else delete buff.defenseValue;
}

function absorbWithDefenseValueV2(
  state: GameState,
  targetId: PlayerId,
  amount: CombatValue,
  attackName: string | undefined,
  stats: AttackStats | undefined,
  sourceId?: PlayerId,
  context: DamageContext = {}
): CombatValue {
  const target = findPlayer(state, targetId);
  if (!target || compareCombatValues(amount, []) <= 0 || compareCombatValues(amount, INFINITY_VALUE) >= 0 ||
    context.spellDamage || !isNonSpellDamage(stats)) {
    return amount;
  }

  const defense = target.buffs.find((buff) => buff.id === "defense_value" && buff.stacks > 0);
  if (!defense) {
    return amount;
  }
  if (defense.infinite) return [];

  const current = defense.defenseValue ?? combatValue(defense.stacks);
  const absorbed = compareCombatValues(current, amount) < 0 ? current : amount;
  setDefenseValue(defense, subtractCombatValues(current, absorbed));
  target.buffs = target.buffs.filter((buff) => buff.stacks > 0);
  pushAttackBlockedEvent(state, {
    sourceId,
    targetId,
    attackName: attackName ?? stats?.name ?? "伤害",
    blockKind: "reduce",
    protectionName: `防御值:${formatCombatValue(absorbed)}`
  });
  return subtractCombatValues(amount, absorbed);
}

function rewardEarthHeart(state: GameState, healthDeltas: Map<PlayerId, HealthDelta>, target: PlayerState): void {
  const count = getActiveSkillCount(target, "skill_39_77400");
  const enhanced = getFusionEnhancementCount(target, "skill_39_77400", ["雷霆之心"]);
  if (count > enhanced) addDefenseValue(state, target.id, 4 * (count - enhanced), "大地之心");
  if (enhanced > 0) addHeal(state, healthDeltas, target.id, 4 * enhanced, target.id, "大地之心");
}

function isNonSpellDamage(stats: AttackStats | undefined): boolean {
  const elements = getAttackElements(stats);
  return elements.length === 1 && elements[0] === "physical";
}

function isAttackDamage(
  stats: AttackStats | undefined,
  context: DamageContext
): boolean {
  return Boolean(stats && context.fromAttack && stats.id !== ELECTRIC_SHOCK_SKILL_ID);
}

function isFireDamage(stats: AttackStats | undefined): boolean {
  return attackHasElement(stats, "fire");
}

function addHeal(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  targetId: PlayerId,
  amount: number | CombatValue,
  sourceId: PlayerId | undefined,
  reason: string,
  infinite = false
): HealEvent | undefined {
  if (!canAffectAcrossSpace(state, sourceId, targetId)) return;
  const value = typeof amount === "number" ? (infinite ? INFINITY_VALUE : combatValue(amount)) : amount;
  if (compareCombatValues(value, []) <= 0) {
    return;
  }

  const resolved = resolveOrdinaryHealing(state, targetId, projectCombatValue(value),
    isGlobalSkillActive(state, "skill_12_79004", targetId), infinite, value);
  if (!resolved) return;
  if (resolved.suppressed) {
    for (const owner of activePlayersWithSkill(state, "skill_12_79004", targetId)) {
      revealSkillOnTrigger(state, owner.id, "skill_12_79004", "触发血之哀");
    }
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${getPlayerName(state, targetId)} \u7684\u56de\u8840\u88ab\u8840\u4e4b\u54c0\u538b\u5236`
    });
    return;
  }

  const delta = ensureDelta(healthDeltas, resolved.targetId);
  delta.healingValue = addCombatValues(delta.healingValue ?? combatValue(delta.healing), resolved.amountValue ?? combatValue(resolved.amount));
  delta.healing = projectCombatValue(delta.healingValue);
  const event: HealEvent = {
    ...createBaseEvent(state, "heal"),
    type: "heal",
    targetId: resolved.targetId,
    amount: resolved.amount,
    reason,
    recoveryKind: "healing"
  };
  if (resolved.infinite) {
    event.infinite = true;
    if (resolved.amountValue) event.amountValue = resolved.amountValue;
  }
  if (resolved.targetId !== targetId) event.originalTargetId = targetId;
  if (sourceId) {
    event.sourceId = sourceId;
  }
  state.eventLog.push(event);
  return event;
}

/** Immediate additive recoveries share the same modifiers without moving their timing point. */
function applyHealNow(state: GameState, targetId: PlayerId, amount: number | CombatValue, sourceId: PlayerId | undefined, reason: string): void {
  const deltas = new Map<PlayerId, HealthDelta>();
  addHeal(state, deltas, targetId, amount, sourceId, reason);
  if (!deltas.size) return;
  applyHealthDeltas(state, deltas);
  for (const id of deltas.keys()) {
    const recipient = findPlayer(state, id);
    if (recipient && recipient.hp > 0) clearPendingDeath(recipient);
  }
}

function applyLightningBodyImmunity(state: GameState): Set<string> {
  const ignoredKeys = new Set<string>();
  const ignoredItems = new Set<string>();
  for (const target of alivePlayers(state)) {
    if (!playerHasActiveSkill(target, "skill_38_81245")) continue;
    const attacks = new Map<string, PendingDamageItem[]>();
    for (const item of state.pendingDamageItems ?? []) {
      if (item.targetId !== target.id || !item.fromAttack || item.amount <= 0 || item.pointDefeatLevel ||
        compareCombatValues(item.attackPowerValue ?? fromLegacyCombatStat(item.attackPower ?? item.amount), INFINITY_VALUE) > 0) continue;
      const key = item.attackKey ?? item.id;
      const hits = attacks.get(key) ?? [];
      hits.push(item);
      attacks.set(key, hits);
    }
    const hasInfinite = [...attacks.values()].some((hits) => hits.some((item) => item.infiniteCopies));
    if (attacks.size < 2 && !hasInfinite) continue;
    const power = (item: PendingDamageItem) => item.attackPowerValue ?? fromLegacyCombatStat(item.attackPower ?? item.amount);
    const [keptKey] = [...attacks].reduce((lowest, current) =>
      compareCombatValues(power(current[1][0]!), power(lowest[1][0]!)) < 0 ? current : lowest);
    for (const [key, hits] of attacks) {
      if (key === keptKey) {
        for (const item of hits) delete item.infiniteCopies;
        continue;
      }
      ignoredKeys.add(key);
      for (const item of hits) ignoredItems.add(item.id);
      const first = hits[0]!;
      pushAttackBlockedEvent(state, { sourceId: first.sourceId, targetId: target.id,
        attackName: first.attackName ?? "攻击", blockKind: "immune", protectionName: "伤害免疫" });
      const gained = getFusionEnhancementCount(target, "skill_38_81245", ["电闪雷鸣"]);
      if (gained > 0) {
        addCountingMark(target, "guidao_charge", "鬼道次数", gained);
        state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: target.id,
          message: `电闪雷鸣免疫一个攻击，获得 ${gained} 次鬼道` });
      }
    }
    if (hasInfinite && getFusionEnhancementCount(target, "skill_38_81245", ["电闪雷鸣"]) > 0) {
      addCountingMark(target, "guidao_charge", "鬼道次数", INFINITE_DAMAGE);
      const charge = target.buffs.find((buff) => buff.id === "guidao_charge")!;
      charge.stacks = INFINITE_DAMAGE; charge.infinite = true;
    }
  }
  if (ignoredItems.size) state.pendingDamageItems = (state.pendingDamageItems ?? []).filter((item) => !ignoredItems.has(item.id));
  return ignoredKeys;
}

function rememberDamageTaken(
  state: GameState,
  targetId: PlayerId,
  sourceId: PlayerId | undefined,
  amount: CombatValue,
  fromAttack = false
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
  const accumulate = (id: string, name: string, expiry: { expiresAtTurn?: number; expiresAtRound?: number }) => {
    const existing = target.buffs.find(buff => buff.id === id);
    const damageTakenValue = addCombatValues(readDamageTotal(existing), amount);
    const next = { id, name, stacks: projectCombatValue(damageTakenValue), damageTakenValue, ...expiry,
      ...(isUnboundedCombatValue(damageTakenValue) ? { infinite: true } : {}) };
    if (existing) Object.assign(existing, next); else target.buffs.push(next);
  };
  accumulate(`damage_taken_round:${state.roundNumber}`, "本轮累计受伤", { expiresAtRound: state.roundNumber + 2 });
  accumulate(`${TURN_DAMAGE_TAKEN_BUFF_PREFIX}${state.turnNumber}`, "本回合累计受伤", { expiresAtTurn: state.turnNumber + 1 });

  const crossGuardCount = getActiveSkillCount(target, "skill_73_76567");
  if (fromAttack && crossGuardCount > 0) {
    addCountingMark(target, "huyou_mark", "护佑印记", crossGuardCount);
    addCountingMark(target, "cross_mark", "十字印记", crossGuardCount);
  }

  const traumaCount = getActiveSkillCount(target, "skill_120_85509");
  const soulRepairs = (target.skillFusions ?? []).filter((fusion) => isFusionActive(target, fusion) &&
    getFusionRecipe(fusion.skillId)?.skill.name === "灵魂修复");
  if (traumaCount > 0 || soulRepairs.length > 0) {
    const fusions = (target.skillFusions ?? []).filter((fusion) => isFusionActive(target, fusion) &&
      getFusionRecipe(fusion.skillId)?.skill.name === "霸者重装");
    const marks = [{ suffix: "", count: traumaCount - fusions.length },
      ...[...fusions, ...soulRepairs].map((fusion) => ({ suffix: `:fusion:${fusion.id}`, count: 1, sourceFusionId: fusion.id }))];
    for (const mark of marks) {
      if (mark.count <= 0) continue;
      const traumaBuffId = `trauma_converge:${state.roundNumber + 3}${mark.suffix}`;
      addCountingMark(target, traumaBuffId, "创伤聚合", mark.count);
      const traumaBuff = target.buffs.find((buff) => buff.id === traumaBuffId)!;
      traumaBuff.expiresAtRound = state.roundNumber + 4;
      if ("sourceFusionId" in mark) traumaBuff.sourceFusionId = mark.sourceFusionId;
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

function readDamageTotal(buff: PlayerState["buffs"][number] | undefined): CombatValue {
  return buff?.damageTakenValue ?? (buff?.infinite ? INFINITY_VALUE : combatValue(buff?.stacks ?? 0));
}

function getTurnDamageTaken(player: PlayerState, turnNumber: number): CombatValue {
  return readDamageTotal(player.buffs.find((buff) => buff.id === `${TURN_DAMAGE_TAKEN_BUFF_PREFIX}${turnNumber}`));
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

function isGlobalSkillActive(state: GameState, skillId: string, anchorId?: PlayerId): boolean {
  const brokenByPoE = activePlayersWithSkill(state, "skill_9_93219", anchorId).length > 0;
  if (brokenByPoE) {
    return false;
  }

  return activePlayersWithSkill(state, skillId, anchorId).length > 0;
}

function activePlayersWithSkill(state: GameState, skillId: string, anchorId?: PlayerId): ReturnType<typeof alivePlayers> {
  return alivePlayers(state).filter((player) => (!anchorId || canAffectAcrossSpace(state, anchorId, player.id)) && playerHasActiveSkill(player, skillId));
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
  player: { buffs: Array<{ id: string; stacks: number; infinite?: boolean }> } | undefined,
  buffId: string
): boolean {
  if (!player) {
    return false;
  }

  const buff = player.buffs.find((item) => item.id === buffId && item.stacks > 0);
  if (!buff) {
    return false;
  }

  if (!buff.infinite) buff.stacks -= 1;
  player.buffs = player.buffs.filter((item) => item.stacks > 0);
  return true;
}

function awardRevenge(state: GameState, source: PlayerState | undefined, targetId: PlayerId, erasedByNight = false): void {
  if (!source || !playerHasActiveSkill(source, "skill_116_97172") ||
    (erasedByNight && getFusionEnhancementCount(source, "skill_116_97172", ["永夜之刃"]) <= 0) ||
    !source.buffs.some((buff) => buff.id === `revenge_target:${targetId}`)) return;
  addCountingMark(source, "revenge_hit_count", "复仇计数", 1);
  source.buffs = source.buffs.filter((buff) => buff.id !== `revenge_target:${targetId}`);
  const threshold = getFusionEnhancementCount(source, "skill_116_97172", ["泣血之刃"]) > 0 ? 4 : 5;
  if ((source.buffs.find((buff) => buff.id === "revenge_hit_count")?.stacks ?? 0) >= threshold) {
    revealSkillOnWin(state, source.id, "skill_116_97172", "复仇之刃胜利");
    upsertBuff(source, { id: "instant_win:revenge", name: "复仇之刃胜利", stacks: 1 });
  }
}

function getPlayerName(state: GameState, playerId: PlayerId): string {
  return findPlayer(state, playerId)?.name ?? "未知玩家";
}
