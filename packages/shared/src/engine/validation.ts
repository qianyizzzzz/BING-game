import { ERA_CHOOSE_TARGETS, ERA_RESTART } from "./eraIds";
import { eraFireRevivalBypass, eraRestartSource, eraTargetChoices } from "./era";
import { BUBBLE_ENHANCE, BUBBLE_FINALE, BUBBLE_FORGET, BUBBLE_REBUILD, BUBBLE_REBUILD_STOCK } from "./bubbleDreamIds";
import { isRedLotusAnytimeSkill, RED_LOTUS_FINALE, RED_LOTUS_KARMA, RED_LOTUS_NINE } from "./redLotusIds";
import { STAR_MOON_CHOOSE_CARD, STAR_MOON_FREE_HUIYUE, STAR_MOON_HUIYUE_STOCK } from "./starMoonIds";
import { getStarMoonCardChoices } from "./starMoon";
import { YIYUAN_MIMIC, YIYUAN_REPEAT, YIYUAN_RESTORE } from "./yiyuanIds";
import { redLotusFlameCount } from "./redLotus";
import { bubbleDreamEnhancement, bubbleDreamHitChoices, bubbleDreamMoveEnhanced, bubbleDreamStock } from "./bubbleDream";
import { FALLEN_SPLENDOR_CONVERT, FALLEN_SPLENDOR_DOUBLE, FALLEN_SPLENDOR_EXECUTION, FALLEN_SPLENDOR_PIERCE,
  FALLEN_SPLENDOR_RELEASE, ORIGIN_SHOT_FUSION, ORIGIN_SHOT_STOCK } from "./fallenSplendorIds";
import { fallenSplendorExecutionStock, fallenSplendorHealingRemaining, fallenSplendorTargets } from "./fallenSplendor";
import { SPACE_BURST, SPACE_SHATTER, TIME_RIFT } from "./spaceTimeIds";
import { spaceTimeMaxRounds, validSpaceTimeDuration } from "./spaceTime";
import { LONE_STAR_FINALE_ID, LONE_STAR_PASSIVE_ID, LONE_STAR_PIERCE_ID } from "./loneStarIds";
import { shadowSeatChoices } from "./seating";
import { hasShadowDance, isShadowComboMove, recordShadowCombo } from "./shadowCombo";
import { swordArrayPiBlocksSkill } from "./swordArrayControl";
import { getPeriodicUses, periodicCardUseKey } from "./limitedUseBalance";
import { SEA_GOD_RETURN_ID, SEA_GOD_WAVES_ID } from "./seaGodIds";
import { validKarmaCardChanges } from "./karmaCycle";
import { KARMA_CYCLE_ID } from "./karmaCycleIds";
import { getCheatCardChoices, getCheatSharpDamageUses, isCheatServerAnytimeSkill } from "./cheatServer";
import { CHEAT_NOGLUES_ID, CHEAT_SHARP_DAMAGE_ID, CHEAT_TRANSFER_ID } from "./cheatServerIds";
import { validateCheatServerUseTransfer } from "./cheatServerUses";
import { getReadySeaGodReturnInstance, isSeaGodReturnReady } from "./seaGodMoves";
import { canPlaceSwordArray } from "./swordArray";
import { SWORD_ARRAY_PLACE_ID } from "./swordArrayIds";
import { getBrokenBlade, isBrokenBladeMaintenance } from "./brokenBladeIds";
import { canMaintainBrokenBlade, selectBrokenBladeDoubleEdge } from "./brokenBlade";
import { canSummonMoon, hasMoon } from "./moon";
import { MOON_DANCE_ID, MOON_GRIEF_ID, MOON_PUNISH_ID, MOON_RITUAL_ID, MOON_SHADOW_ID, MOON_TIDE_ID } from "./moonIds";
import { SHADOW_FOLLOW_ID, SHADOW_LEAVE_ID, SHADOW_WIND_DANCE_ID } from "./shadowIds";
import { areCombatTargetsContiguous, getCombatFarthestPlayers, getCombatSeatDistance, getCombatSeatGroups } from "./seating";
import { houndBiteIsArea } from "./beast";
import { HOUND_SUMMON_ID } from "./beastTraits";
import { THORN_PIERCE_ID } from "./thornDanceIds";
import { thornPierceChoices } from "./thornDance";
import { antiCakeCount, antiCakesForAction, validCakePayment, vacuumMode, vacuumOptions, inVacuumSpace, youkaiCakesForAction } from "./vacuum";
import { YOUKAI_ELEMENT, YOUKAI_RITUAL_ID } from "./youkaiIds";
import { canStartYoukaiRitual } from "./youkai";
import { ANTI_CAKE_MOVE_ID, VACUUM_ENTER_ID, VACUUM_EXTRACT_ID, VACUUM_MAX_ID } from "./vacuumIds";
import { KARMA_CONVERT_ID, KARMA_REBIRTH_ID, KARMA_SONG_END_ID } from "./karmaCycleIds";
import { canUseKarmaRebirth, validKarmaConversion } from "./karmaInheritance";
import { loneStarDuelOpponent, loneStarFarthest } from "./loneStar";
import { BEAR_ROAR_ID, participantCount } from "./beastTraits";
import { beastIgnoresDistance } from "./beast";
import { getFatalDamageSourceIds } from "./damageAttribution";
import { CHAOS_EXILE_ID, CHAOS_WAVE_ID } from "../bigCards/abilities";
import { getChaosExileStats, getChaosWave, hasChaosDefenseLock } from "./chaos";
import type { PublicGameState } from "../types";
import { isBigSkillMode } from "../modes";
import { BIG_CARD_SKILLS, DRAGON_BLOOD_FIELD_ID, isHunyaoPursuit, STAR_RESIST_ID } from "../bigCards/abilities";
import { canUseStarResistance, getDragonBloodMode, getDragonBloodTotal, isStarResistible, shapeDragonBloodAttack } from "./starDragon";
import { bigAbilitySource, canReceiveBigCard } from "./bigCards";
import { canRestoreTemporalState } from "./jueying";
import { getSaintElements, getSaintMoveMultiplier, isSaintMove } from "./saint";
import { XIELING_BODY_ID, XIELING_RESET_ID, XIELING_TRANSFORM_ID, XIELING_ULTIMATE_ID } from "../bigCards/abilities";
import { getDueXieyuCount, getXielingConversionLimit } from "./xieling";
import { FOUR_EMPTINESS_ID, SLOT_MACHINE_ID, VERDICT_ACTION_ID, QIANQIU_RESPONSE_ID } from "../bigCards/abilities";
import { getQianqiuDefenseGains } from "./qianqiu";
import { hasThunderRite, thunderBallCapacity, thunderBallCount } from "./thunderItems";
import { THUNDER_BALL_ID, THUNDER_RITE_ID } from "../bigCards/abilities";
import { ignoresSkill } from "./skillIgnore";
import { getFinaleCollapseSource } from "../skills/fusion";
import { TIANLIE_CONTINUE_ID, TIANLIE_FEEDBACK_ID, TIANLIE_MIGHT_ID } from "../bigCards/abilities";
import { spendTianlieTemporaryUse, tianlieResponseChoices } from "./tianlie";
import { getFreeMoveId, getMatchingFreeMove, isNextWujinReboundFree } from "./wujin";
import { getBlindSkillChoices } from "./blindSkillRemoval";
import { getReadySlotMachines } from "./skillAcquisition";
import { combatValue, compareCombatValues, fromLegacyCombatStat, INFINITY_VALUE } from "./combatValues";
import { isDamageWithinLimit, pendingDamageValue } from "./damageKinds";
import { effectHasCategory, isAllSkillsSealedBuff } from "./effectCategories";
import { applyHunyaoRiStats, getHunyaoExpandedTargets, getHunyaoPursuitTargets, hasContinuationBlock } from "./hunyao";
import { canRecoverWithHpCap } from "./infiniteValues";
﻿import {
  ActionSubmission,
  AttackAction,
  DamageEvent,
  GameState,
  AttackStats,
  INFINITE_DAMAGE,
  MAX_ACTION_STACKS,
  PlayerAction,
  PlayerActionPlan,
  PlayerId,
  PlayerState,
  SkillId,
  SkillAction,
  SkillTimingPhase,
  ValidationResult
} from "../types";
import { BASE_ATTACKS, canActionDefend, getStackedAttackStats } from "./attacks";
import { getActionSwitchPlan, validateActionSwitch } from "./actionSwitch";
import { getAttackFieldBlocker } from "./attackFields";
import { discountCakeCost, getAttackActionCost, getReboundCakeCost, getSkillElementCosts, getTurnSkillActionCost, hasReboundCakeBalance } from "./actionCosts";
import { KURONG_LEAF_ID } from "../bigCards/abilities";
import { SAKURA_FALL_ID, SAKURA_FINALE_ID } from "../bigCards/abilities";
import { ETERNAL_BIND_ID, ETERNAL_REPLACE_ID, ETERNAL_THOUGHT_ID } from "../bigCards/abilities";
import { eternalMoveChoices, readyEternalCard } from "./eternalThought";
import { hasTalisman } from "./talismanRules";
import { canDiscardAllSakuraCards, getDiscardableSakuraChoices, getSakuraCardChoices, getSakuraFinaleDiscardCount, hasFreeSakuraFall, validateSakuraCards } from "./sakura";
import { canRecoverEmptyCity } from "./illusionRules";
import { CHARITY_LINK_ID, CHARITY_QUICK_ID, HEALING_ART_ID } from "../bigCards/abilities";
import { getQuickHealingTargets, hasCharityDestiny, quickHealingCard } from "./charity";
import { hasInitialPlayerSnapshot } from "./initialPlayerState";
import { TIANMANG_CLEANSE_ID, TIANMANG_CONVERSION_ID, TIANMANG_FIELD_CLEANSE_ID } from "../bigCards/abilities";
import { SAND_DESOLATION_ID, WIND_PURSUIT_ID, WIND_SCOUT_ID, WIND_TRACK_ID } from "../bigCards/abilities";
import { ASURA_FERRY_ID, ASURA_IMMUNITY_ID, ASURA_RITUAL_UPGRADE_ID, ASURA_SWORD_ID, BLOOD_RITUAL_FUSION_ID } from "../bigCards/abilities";
import { SOUL_EXTINGUISH_ID, SOUL_PACT_ID } from "../bigCards/abilities";
import { soulDeathIgnoresSkill, soulRestorationCard, soulRestoredSkillId } from "./soulPact";
import { hasRevivalRestrictionFlag } from "./siphon";
import { ASURA_RITUAL_UPGRADE, ASURA_SACRIFICE, ASURA_SWORD_GUARD, getSkillBloodQiCosts, hasBloodQi, isAsuraAnytimeSkill } from "./asura";
import { demonAttackStats, demonMoveTarget, evilHoundTarget, isDemonOrderSkill, isDemonSummonSkill, validateDemonAction } from "./demons";
import { isTargetedDemonSummon } from "./demonIds";
import { curtainDiscardQuote, curtainEncoreReady } from "./curtain";
import { CURTAIN_ENCORE_ID, CURTAIN_FINALE_ID } from "./curtainIds";
import { isSwarmAllocationValid } from "./swarm";
import { TIGER_EXTINCTION_MOVE, TIGER_STAB, TIGER_SWITCH, TIGER_RESTORE, tigerMieThirds } from "./netherTigerIds";
import { FIVE_ELEMENTS_CHOOSE, FIVE_ELEMENTS_LEVEL, FIVE_ELEMENTS_LEVEL_PREFIX, FIVE_ELEMENTS_OPERATIONS,
  canChooseFiveElementsForm } from "./fiveElementsIds";
import { canChooseRoundCardForm } from "./cardForms";
import { HEXAGRAM_ABSOLUTE, HEXAGRAM_CHOOSE, HEXAGRAM_RESTORE, HEXAGRAM_SPIRIT } from "./hexagramIds";
import { HEXAGRAM_SIX_STAR, hexagramCopyTarget, hexagramRemainingUses, lostHexagramForms } from "./hexagram";
import { validSevenStarLegacyChoice } from "./sevenStar";
import { lostSevenStarForms, SEVEN_STAR_CHOOSE, SEVEN_STAR_YAOGUANG, SEVEN_STAR_YUHENG } from "./sevenStarIds";
import { TIAN_SHA_FINALE, TIAN_SHA_STAR_BREAK, TIAN_SHA_SWORD, TIAN_SHA_VERDICT } from "./tianShaIds";
import { NINE_COLD } from "./nineTribulationsIds";
import { coldLightSource } from "./nineTribulations";
import { canDiscardTianShaFinale, tianShaSpaceCount, tianShaVerdictPayment } from "./tianSha";
import { DIVINE_FLAME_ENABLED, DIVINE_FLAME_ID } from "./divineReversalIds";
import { SUN_CROWN_COOLDOWN, SUN_CROWN_ID } from "./sunIds";
import { SWARM_RETURN_ID, VETERAN_SHATTER_ID, VETERAN_SHATTER_USES } from "./swarmIds";
import { GAME_SWITCH_ACTION_ID } from "../bigCards/abilities";
import { PURPLE_FORESIGHT_ID, PURPLE_INSIGHT_ID, PURPLE_SCALE_ID, bigCardHasAbility } from "../bigCards/abilities";
import { PURPLE_SCALE_PREFIX, purpleForesightUses, purpleInsightUses, validPurpleValue } from "./purpleEye";
import { attackLevelValue, attackPowerValue } from "./combatValues";
import { getBigCard } from "../bigCards/catalog";
import { isGameSwitchMode } from "./gameSwitch";
import { getWindPursuitTargets, hasWindTrace, isHurricane, validHurricaneTargets } from "./ultimateWind";
import { validateKurongLeaves } from "./kurong";
import { UTOPIA_MOVE_ID } from "../bigCards/abilities";
import { SACRED_BEAST_ID, TIME_REWIND_ID } from "../bigCards/abilities";
import { CLOUD_BYPASS_ID, CLOUD_SEA_ID, LINGTA_VICTORY_ID, SKY_ABSOLUTE_ID, SKY_STRIKE_ID } from "../bigCards/abilities";
import { cloudQuantity, cloudSeaCount, skyAbsoluteActive, hasLingtaField } from "./lingta";
import { availableSacredBeasts, getRewindSnapshot, rewindTargetIds } from "./honghuang";
import { isSleeping } from "./utopia";
import { resolveLightningSpellTargetIds } from "./skillTargets";
import {
  alivePlayers,
  canPlayerSeeSkill,
  cloneGameState,
  findPlayer,
  getActiveSkillCount,
  getPuppetMasterId,
  isPlayerInCollapse,
  isPlayerSkillDisabled,
  isPlayerSkillSealed,
  isSkillBlockedByJingu,
  playerHasActiveSkill
} from "./gameFactory";
import {
  applyAttackModifiers,
  getSkill,
  getSkillActionCost,
  getSkillAttackStats,
  getSkillPlay,
  getSkillUseLimit,
  getSmallSkillIds,
  skillHasTypeTag
} from "../skills/registry";
import { COMMON_FUSION_SKILL_ID, countSuppressedFusionMaterials, getOwnedSkillIds, getDestroyPowerCooldownCount,
  getFlashFamilySlots, getDamageRedirectLimit, getActiveFusionCount, getFusionSkillId,
  hasEnhancedPutianRange, getFreeSkillChargeId, getAbsoluteGuardCost, getFusionEnhancementCount } from "../skills/fusion";
import { getHuiyueCooldownCount } from "../skills/fusion";
import { validateFusionAction } from "./fusion";
import { getDestructionModifiers, getLevelSwapModifiers, hasEnhancedLevelSwap, previewPlayerAttackStats, payableAttackCost } from "./attackStatModifiers";
import { canSpendStarRageMarks, getAttackMarkKind, getAttackMarkCount, getAttackMarkChoices, getAttackMarkCapacity,
  STAR_RAGE_ID, STAR_RAGE_SIX_STAR } from "./attackMarks";
import { isAttackDamageItem } from "./damageKinds";
import { JUSHEN_ID, RELEASE_DAMAGE_ID, STORE_DAMAGE_ID } from "../bigCards/abilities";
import { getStoredDamages } from "./storedDamage";
import { getElementAmount } from "./elementResources";
import { applyJunengTargetLock, getSelectableJunengTarget, isStorableJunengDamage } from "./juneng";
import { KUISHI_ID, SELF_ISOLATION_ID, SHENGLING_ID } from "../bigCards/abilities";
import { findPeekCopyTarget } from "./bigCards";
import { DEAD_REALM_CARD_ID } from "./deadRealmIds";
import { CRYSTAL_GUARD_ID, CRYSTAL_SHIELD_ID, crystalGuardMarkCount, crystalShieldAvailable } from "./divineCrystal";
import { canPayStarWheel, isStarWheelWindowMove, starWheelCanRedirect, starWheelChoices, starWheelStatusChoices } from "./starWheel";
import { STAR_WHEEL_POSITION, STAR_WHEEL_RELEASE, STAR_WHEEL_SHIFT, STAR_WHEEL_VICTORY } from "./starWheelIds";
import { getPhysicalCombatSeats } from "./seating";
import { poisonTotemPreventsAttacks, targetableTotems, validTotemCreation } from "./totems";
import { isTotemCreation } from "./totemIds";
import { getMoveBlockReason } from "./moveEligibility";
import { hasTianyeReboundLock, hasTianyeWing, isTianyeWingChoice, tianyeChoiceOptions } from "./tianye";
import { TIAN_YE_CHOICE_ID, TIAN_YE_FALL_ID } from "./tianyeIds";
import { canAffectAcrossSpace, canBypassTargetSelection, isReversalResponseRestricted, isSoulExiled,
  preventsTargetSelection, reachableEmptyCityBodies, withPlayerSpace } from "./spaces";
import { getAcquisitionSkillChoices, MIRROR_SKILL_ID } from "./skillAcquisition";
import { getFusionRecipe, getFusionTier, getManualDemonDomainCount, isFusionActive, isFusionPreparation, isHigherFusionAreaAttack } from "../skills/fusion";

const PENDING_DEATH_BUFF_ID = "pending_death";
const DOUBLE_EDGE_SWORD_SKILL_ID = "1030";
const DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX = "double_edge_ignore_defense:";
const HELL_OVERLORD_SKILL_ID = "1111";
const SAGE_PROTECTION_SKILL_ID = getFusionSkillId("贤者的庇护");
const LIEGONG_SKILL_ID = "1059";
const LIEGONG_CROSS_BUFF_PREFIX = "liegong_cross:";
const ABSOLUTE_GUARD_SKILL_ID = "1073";
const ABSOLUTE_GUARD_BUFF_PREFIX = "absolute_guard:";
const LUANWU_SKILL_ID = "1053";
const PUTIAN_TONGQING_SKILL_ID = "1097";
const ICE_RAIN_SKILL_ID = "1019";
const CROSS_GUARD_SKILL_ID = "1072";
const XIEYU_SKILL_ID = "1071";
const SHUNSHOU_STEAL_SKILL_ID = "1099";
const SCATTER_REBOUND_SKILL_ID = "1057";
const LIAN_BAO_SKILL_ID = "1086";
const FLASH_DODGE_SKILL_ID = "1102";
const SIX_STAR_SKILL_ID = "1107";
const ACTIVE_REVIVAL_SKILL_IDS = new Set([
  "1063",
  "1065",
  "1067",
  KARMA_REBIRTH_ID,
  HELL_OVERLORD_SKILL_ID,
  SAGE_PROTECTION_SKILL_ID
]);
const MULTI_TARGET_ATTACK_SKILL_IDS = new Set<SkillId>([
  FALLEN_SPLENDOR_EXECUTION,
  "1035",
  "1078",
  "1117",
  "1118", getFusionSkillId("冰火双漩")
]);
const VORTEX_SKILL_IDS = new Set<SkillId>(["1117", "1118", getFusionSkillId("冰火双漩")]);

export function validateAction(
  state: GameState,
  playerId: PlayerId,
  submission: ActionSubmission
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (player.status !== "alive") {
    return invalid("死亡玩家不能出招");
  }
  const moveBlockReason = getMoveBlockReason(state, player);
  if (moveBlockReason) return invalid(moveBlockReason);
  if (player.summon) return invalid("该角色不能手动提交出招");
  if (player.emptyCityOwnerId) return invalid("本体由幻影代为出招");

  if (state.phase !== "collecting_actions") {
    return invalid("当前不能提交出招");
  }

  if (state.pendingActions[playerId]) {
    return invalid("你本回合已经提交出招");
  }

  const actions = normalizeActionPlan(submission).actions.map((action) => applyJunengTargetLock(state, action, player.spaceId, player));
  if (actions.some((action) => action?.type === "skill" && action.waveContinuationId !== undefined)) return invalid("连续攻击由系统自动发出");
  if (actions.some((action) => action?.type === "defense" && action.fixedReboundTarget)) return invalid("逆转反弹目标由系统计算");
  if (actions.some((action) => action?.roarContinuationId !== undefined)) return invalid("怒吼续发由系统自动发出");
  if (actions.some((action) => action?.sandDelayedActionId !== undefined || action?.spaceTimeReplay))
    return invalid("延迟出招由系统自动发出");
  if (actions.some((action) => action && "tianlieContinuationId" in action)) return invalid("连续攻击由系统自动发出");
  if (actions.some((action) => !action)) return invalid("聚神指定的玩家当前无法被选中");
  const plan = { actions: actions.filter((action) => action !== undefined) };
  if (plan.actions.some((action) => action.type === "skill" && action.shadowCombo !== undefined))
    return invalid("连击段数由系统计算");
  const forcedHound = evilHoundTarget(state, player);
  if (forcedHound && plan.actions.some((action) =>
    (action.type === "attack" || action.type === "skill" && action.skillId !== BUBBLE_FINALE) &&
    getActionTargetIds(action).some((id) => id !== forcedHound.id))) return invalid("出招只能指向面前的邪犬");
  if (plan.actions.some((action) => action.type === "skill" && action.swarmPaidInventory !== undefined)) return invalid("虫子支付记录由系统生成");
  if (plan.actions.some((action) => !actionTargetsSameSpace(state, playerId, action))) return invalid("只能选择同一空间内的目标");
  return withPlayerSpace(state, playerId, () => validateActionPlan(state, playerId, plan),
    plan.actions.some((action) => action.type === "skill" && [SAKURA_FINALE_ID, ETERNAL_THOUGHT_ID, SPACE_BURST].includes(action.skillId)) ? "global" : "moves");
}

export function normalizeActionPlan(submission: ActionSubmission): PlayerActionPlan {
  if ("actions" in submission) {
    return {
      actions: submission.actions
    };
  }

  return {
    actions: [submission]
  };
}

function validateActionPlan(
  state: GameState,
  playerId: PlayerId,
  plan: PlayerActionPlan
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (plan.actions.some((move) => move.type === "skill" && move.skillId === LONE_STAR_PIERCE_ID) &&
    plan.actions.some((move) => move.type === "skill" && skillHasTypeTag(getSkill(move.skillId), "控制技")))
    return invalid("星绝击不能与控制技一起提交");
  if (plan.actions.length === 0) {
    return invalid("至少需要选择一个出招");
  }
  const vacuumMoves = plan.actions.flatMap((move) => move.type === "skill" &&
    [VACUUM_EXTRACT_ID, VACUUM_ENTER_ID, VACUUM_MAX_ID].includes(move.skillId) ? [move.skillId] : []);
  if (new Set(vacuumMoves).size !== vacuumMoves.length) return invalid("浩渺真空的各主动出招每回合只能提交一次");
  const shatterSpent = plan.actions.reduce((sum, move) => sum + (move.type === "skill" && move.skillId === VETERAN_SHATTER_ID &&
    !move.freeMoveId ? move.stacks : 0), 0);
  if (shatterSpent > (player.buffs.find((buff) => buff.id === VETERAN_SHATTER_USES)?.stacks ?? 0)) return invalid("碎的剩余次数不足");

  if (plan.actions.length > Math.max(1, alivePlayers(state).length)) {
    return invalid("出招数量超过可选目标数量");
  }

  if (plan.actions.length > 1) {
    if (
      plan.actions.filter(
        (action) => action.type === "skill" && action.skillId === "1078"
      ).length > 1
    ) {
      return invalid("火箭一回合只能作为一次技能出招提交");
    }

    if (
      plan.actions.some(
        (action) => action.type !== "attack" && action.type !== "skill"
      )
    ) {
      return invalid("多招式模式下只能同时选择多个攻击或单体目标技能");
    }

    const targetIds = new Set<string>();
    for (const action of plan.actions) {
      if (action.type !== "attack" && action.type !== "skill") {
        continue;
      }

      const skillPlay = action.type === "skill" ? getSkillPlay(action.skillId) : undefined;
      if (action.type === "skill" && skillPlay?.targetMode !== "single") {
        return invalid("多目标出招里只能混合单体目标技能，全体、资源或自身技能需要单独使用");
      }

      const isArea = isActionEffectivelyArea(state, playerId, action);
      if (isArea) {
        return invalid("群攻招式必须单独使用");
      }

      const actionTargetIds = getActionTargetIds(action);
      if (actionTargetIds.length === 0) {
        return invalid("多招式攻击必须指定目标");
      }

      for (const targetId of actionTargetIds) {
        if (targetIds.has(targetId)) {
          return invalid("一回合里不能对同一个人做多个招式");
        }

        targetIds.add(targetId);
      }
    }
  }

  let totalCost = 0;
  let antiCakeCost = 0;
  let youkaiCakeCost = 0;
  let bloodQiSpent = 0;
  const elementCosts = new Map<string, number>();
  let ballsSpent = 0;
  let totalLianBaoFreeStacks = 0;
  const freeCharges = new Map<string, number>();
  const freeMoves = new Map<string, number>();
  const xielingCasts = new Set<string>();
  const seaGodReturnCasts = new Set<string>();
  let seaGodWavesOwner: PlayerState | undefined;
  let xielingMarks = 0;
  let shadowOwner: PlayerState | undefined;
  for (const submitted of plan.actions) {
    const action = submitted.type === "skill" && isShadowComboMove(submitted)
      ? { ...submitted, shadowCombo: recordShadowCombo(shadowOwner ??= { ...player }, submitted) } : submitted;
    const freeId = getFreeMoveId(action);
    if (freeId) {
      const entry = getMatchingFreeMove(player, action);
      const spent = (freeMoves.get(freeId) ?? 0) + 1;
      if (!entry || spent > entry.stacks) return invalid("免费出招次数不足，或招式与保存的重数不符");
      if (action.type === "skill" && (action.freeStacks || action.bigCardInstanceId)) return invalid("免费出招只使用选中的机会");
      freeMoves.set(freeId, spent);
    }
    const validation = validateSingleAction(state, playerId, action);
    if (!validation.ok) {
      return validation;
    }
    if (freeId) continue;

    if (action.type === "skill" && action.skillId === LIAN_BAO_SKILL_ID) {
      totalLianBaoFreeStacks += action.freeStacks ?? 0;
    }
    if (action.type === "skill") {
      if (action.skillId === SEA_GOD_RETURN_ID) {
        const instanceId = getReadySeaGodReturnInstance(player, state.roundNumber, action.bigCardInstanceId, seaGodReturnCasts);
        if (!instanceId) return invalid("一去不返每张卡每3轮限用1次");
        seaGodReturnCasts.add(instanceId);
      }
      if (action.skillId === SEA_GOD_WAVES_ID) {
        seaGodWavesOwner ??= structuredClone(player);
        const instanceId = bigAbilitySource(seaGodWavesOwner, action, true);
        const card = seaGodWavesOwner.bigCards?.find((entry) => entry.instanceId === instanceId);
        if (!card) return invalid("无定风波的剩余次数不足");
        if (!spendTianlieTemporaryUse(seaGodWavesOwner, action.skillId)) {
          const used = card.abilityUses ??= {};
          used[action.skillId] = (used[action.skillId] ?? 0) + 1;
        }
      }
      const { cost: qiCost, minimum: qiMinimum } = getSkillBloodQiCosts(action.skillId, action.stacks, action.bloodQiSpent);
      if (qiMinimum && !hasBloodQi(player, bloodQiSpent + qiMinimum)) return invalid(`血气不足，需要至少 ${bloodQiSpent + qiMinimum} 点`);
      bloodQiSpent += qiCost;
      if (action.skillId === XIELING_TRANSFORM_ID) xielingMarks += action.xielingMarkCost ?? 0;
      if (action.skillId === XIELING_ULTIMATE_ID) {
        const instanceId = bigAbilitySource(player, action, true)!;
        if (xielingCasts.has(instanceId)) return invalid("每张邪灵无念同一回合只能使用一次");
        xielingCasts.add(instanceId);
      }
      const charge = getFreeSkillChargeId(player, action.skillId);
      if (charge) freeCharges.set(charge, (freeCharges.get(charge) ?? 0) + (action.freeStacks ?? 0));
    }

    antiCakeCost += antiCakesForAction(action) + Number(action.type === "skill" && action.skillId === ANTI_CAKE_MOVE_ID && !action.freeMoveId);
    if (action.type === "defense" && action.defense === "rebound") {
      const cost = getReboundCakeCost(state, player, Boolean(action.freeMoveId));
      totalCost += cost;
      youkaiCakeCost += youkaiCakesForAction(action, player, cost);
    } else {
      youkaiCakeCost += youkaiCakesForAction(action);
    }
    if (action.type === "attack") {
      totalCost += getAttackActionCost(state, player, action);
      continue;
    }

    if (action.type === "skill") {
      totalCost += getEffectiveSkillActionCost(state, player, action);
      for (const pricing of getSkillElementCosts(player, action))
        elementCosts.set(pricing.element, (elementCosts.get(pricing.element) ?? 0) + pricing.perStack * action.stacks);
      ballsSpent += (getSkillPlay(action.skillId)?.itemCost?.perStack ?? 0) * action.stacks;
    }
  }

  const availableLianBaoFreeStacks =
    player.buffs.find((buff) => buff.id === "free_lian_bao")?.stacks ?? 0;
  if (totalLianBaoFreeStacks > availableLianBaoFreeStacks) {
    return invalid(`免费连爆次数不足，需要 ${totalLianBaoFreeStacks} 次`);
  }

  const antiPaid = plan.actions.reduce((sum, action) => sum + antiCakesForAction(action), 0);
  if (totalCost - antiPaid - youkaiCakeCost > player.cakes || antiCakeCost > antiCakeCount(player)) {
    return invalid("该组合的饼或反饼不足");
  }
  if (youkaiCakeCost) elementCosts.set(YOUKAI_ELEMENT, (elementCosts.get(YOUKAI_ELEMENT) ?? 0) + youkaiCakeCost);
  const mieThirds = plan.actions.filter((action) => action.type === "skill" && action.skillId === TIGER_EXTINCTION_MOVE && !action.freeMoveId).length * 3;
  if (mieThirds > tigerMieThirds(player)) return invalid("灭机会不足");
  if (ballsSpent > thunderBallCount(player)) return invalid(`雷球不足，需要 ${ballsSpent} 个`);
  const cloudsSpent = 10 * plan.actions.filter((action) => action.type === "skill" && action.skillId === CLOUD_SEA_ID && !action.freeMoveId).length;
  if (cloudsSpent && compareCombatValues(cloudQuantity(player), combatValue(cloudsSpent)) < 0)
    return invalid(`云不足，需要 ${cloudsSpent} 朵`);
  if (xielingMarks > getXielingConversionLimit(player)) return invalid("邪灵印记不足，或转换后的邪元素数量超出上限");
  for (const [element, cost] of elementCosts) if (getElementAmount(player, element) < cost)
    return invalid(`${element}元素不足，需要 ${cost} 个`);
  for (const [id, spent] of freeCharges) if (spent > (player.buffs.find((buff) => buff.id === id)?.stacks ?? 0)) {
    return invalid("同一回合的免费次数总数不足");
  }

  return valid();
}

function validateSingleAction(
  state: GameState,
  playerId: PlayerId,
  action: PlayerAction
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }
  if (!actionTargetsSameSpace(state, playerId, action)) return invalid("只能选择同一空间内的目标");
  if (action.type === "skill" && action.skillId === VERDICT_ACTION_ID && action.targetId === playerId) return invalid("御秽裁决必须指定其他玩家");

  if (action.type === "gain_cake") {
    return valid();
  }

  if (action.type === "discard_skill") {
    return invalid("丢弃技能需要单独执行");
  }

  if (action.type === "defense") {
    if (action.defense !== "rebound") {
      return action.antiCakeSpent || action.youkaiCakeSpent !== undefined && action.youkaiCakeSpent !== 0
        ? invalid("该防御没有费用") : valid();
    }

    if (hasTianyeReboundLock(player, state.turnNumber)) return invalid("绝坠之翼：无法再次出反弹");
    const reboundCost = getReboundCakeCost(state, player, Boolean(action.freeMoveId));
    if (!validCakePayment(state, player, reboundCost, action.antiCakeSpent ?? 0, youkaiCakesForAction(action, player, reboundCost)) ||
      !hasReboundCakeBalance(state, player) && !action.freeMoveId && !isNextWujinReboundFree(player)) {
      return invalid("反弹必须拥有至少 1 个饼");
    }

    if (!action.targetId) {
      return playerHasActiveSkill(player, SCATTER_REBOUND_SKILL_ID) ? valid() : invalid("反弹必须指定目标");
    }

    if (!isAliveTarget(state, action.targetId) && !targetableTotems(state, player).some(({ id }) => id === action.targetId)) {
      return invalid("反弹目标不存在或已死亡");
    }
    const target = findPlayer(state, action.targetId);
    if (preventsTargetSelection(target) && !canBypassTargetSelection(state, playerId, target))
      return invalid("该玩家当前无法被选中");

    return valid();
  }

  if (action.type === "attack") {
    return validateAttackAction(state, playerId, action);
  }

  return validateSkillAction(state, playerId, action, "turn_action");
}

export function validateActionWindowSkill(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  if (action.targetDamageId && state.pendingDamageItems?.some((item) => item.id === action.targetDamageId && !item.directDefeat &&
    item.sourceId && item.sourceId !== playerId && item.targetId !== playerId &&
    getActiveSkillCount(findPlayer(state, item.sourceId), TIAN_SHA_SWORD))) return invalid("天煞神剑使第三方技能不能改变这份伤害");
  if (state.sevenStarLegacyResume || action.skillId === SEVEN_STAR_YUHENG)
    return action.skillId === SEVEN_STAR_YUHENG && validSevenStarLegacyChoice(state, playerId, action) ?
      valid() : invalid("请在玉衡响应中选择要传承的七星与玩家");
  if (action.skillId === ERA_CHOOSE_TARGETS) {
    const player = findPlayer(state, playerId);
    const choice = eraTargetChoices(state, player).find(({ sourceId, moveIndex }) =>
      sourceId === action.eraMoveSourceId && moveIndex === action.eraMoveIndex);
    const ids = action.targetIds;
    return action.stacks === 1 && choice && Array.isArray(ids) && !state.victoryCounter && !state.retirementCounter &&
      !state.actionWindowPassPlayerIds.includes(playerId) && player && !isSleeping(player, state.turnNumber) &&
      new Set(ids).size === ids.length && ids.every((id) => choice.targets.some((target) => target.id === id))
      ? valid() : invalid("请选择神控纪元可修改的招式及目标");
  }
  if (action.skillId === TIAN_YE_CHOICE_ID) {
    const player = findPlayer(state, playerId);
    const options = tianyeChoiceOptions(player, state.turnNumber);
    return state.phase === "action_window" && state.activeTimingPhase === "turn_before_action" &&
      !state.retirementCounter && !state.victoryCounter && !state.actionWindowPassPlayerIds.includes(playerId) &&
      player?.status === "alive" && !player.emptyCityOwnerId && !isSoulExiled(state, player) &&
      !isSleeping(player, state.turnNumber) && action.stacks === 1 &&
      isTianyeWingChoice(action.tianyeWingChoice) && (action.bigCardInstanceId ? options.includes(action.bigCardInstanceId) : options.length > 0)
      ? valid() : invalid("只有本回合抽中并生效的天野之翼可以选择形态");
  }
  if (action.shadowCombo !== undefined) return invalid("连击段数由系统计算");
  if (action.freeMoveId !== undefined) return invalid("免费出招只能用于主出招");
  if (state.victoryCounter) return invalid("胜利反制阶段请使用专用入口");
  if (state.retirementCounter) return invalid("反制退游窗口请使用专用入口");
  if (state.bloodRitual && action.skillId === BLOOD_RITUAL_FUSION_ID) return invalid("已有祭天正在结算");
  if (state.bloodRitual?.resistance && action.skillId !== STAR_RESIST_ID)
    return invalid("当前只处理祭天的抵御响应");
  if (action.waveContinuationId !== undefined) return invalid("连续攻击由系统自动发出");
  if (action.tianlieContinuationId !== undefined) return invalid("连续攻击由系统自动发出");
  if (action.switchToAction && "roarContinuationId" in action.switchToAction) return invalid("怒吼续发由系统自动发出");
  if (action.skillId === COMMON_FUSION_SKILL_ID) return invalid("请使用公共融合行动");
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (player.status !== "alive") {
    return invalid("死亡玩家不能行动");
  }
  if (action.skillId === YIYUAN_REPEAT)
    return state.phase === "action_window" && state.activeTimingPhase === "turn_change_action" &&
      !state.actionWindowPassPlayerIds.includes(playerId) && action.stacks === 1 && typeof action.yiyuanRepeat === "boolean" &&
      state.yiyuanRequests?.some((request) => request.playerId === playerId && request.turn === state.turnNumber)
      ? valid() : invalid("当前没有一元·永恒待答复");
  if (action.skillId === YIYUAN_RESTORE)
    return player.yiyuanMimic && action.stacks === 1 && (state.phase === "collecting_actions" ||
      state.phase === "action_window" && state.activeTimingPhase !== undefined &&
      getSkill(YIYUAN_RESTORE)?.timingPhases.includes(state.activeTimingPhase) && !state.actionWindowPassPlayerIds.includes(playerId))
      ? valid() : invalid("当前不能解除幻化");
  if (isSoulExiled(state, player)) return invalid("流放地内不能行动");
  if (action.skillId === SHENGLING_ID && state.activeTimingPhase === "turn_change_action") {
    const moveBlockReason = getMoveBlockReason(state, player);
    if (moveBlockReason) return invalid(moveBlockReason);
  }
  if (player.emptyCityOwnerId) return invalid("本体由幻影代为行动");
  if (action.skillId === ORIGIN_SHOT_FUSION) {
    const phase = state.activeTimingPhase;
    return action.stacks === 1 && !action.targetId && !action.targetIds?.length && !isSleeping(player, state.turnNumber) &&
      (state.phase === "collecting_actions" || state.phase === "action_window" &&
        Boolean(phase && getSkill(ORIGIN_SHOT_FUSION)?.timingPhases.includes(phase))) &&
      getActiveSkillCount(player, ORIGIN_SHOT_FUSION) > 0 && !swordArrayPiBlocksSkill(state, player, ORIGIN_SHOT_FUSION)
      ? valid() : invalid("当前无法获得起源弹次数");
  }
  if (action.skillId === KARMA_SONG_END_ID) return player.karmaReincarnation && action.stacks === 1 &&
    (state.phase === "collecting_actions" || state.phase === "action_window" &&
      Boolean(state.activeTimingPhase && getSkill(action.skillId)?.timingPhases.includes(state.activeTimingPhase)))
    ? valid() : invalid("当前没有可以结束的轮回");
  if ((action.skillId === "1103" || action.skillId === SELF_ISOLATION_ID) && !state.openingRoundEffects?.settling &&
    state.openingRoundEffects?.entries.some((effect) =>
      (effect.kind === "past_time" || effect.kind === "self_isolation") && effect.playerId === playerId)) {
    return invalid("你已在开局声明暂时离场");
  }
  if (isSleeping(player, state.turnNumber)) return invalid("睡眠期间不能使用主动技能");
  if (state.phase === "collecting_actions" && isStarWheelWindowMove(action.skillId))
    return validateSkillAction(state, playerId, action, "turn_before_action");
  if (([TIME_REWIND_ID, SKY_ABSOLUTE_ID, LINGTA_VICTORY_ID, CLOUD_BYPASS_ID, CHARITY_QUICK_ID, CURTAIN_FINALE_ID,
    FALLEN_SPLENDOR_CONVERT, FALLEN_SPLENDOR_RELEASE, BUBBLE_REBUILD, HEXAGRAM_SPIRIT, TIAN_SHA_STAR_BREAK].includes(action.skillId) ||
    action.skillId === HEALING_ART_ID && hasCharityDestiny(player) && !isPendingDeathPlayer(player) || isAsuraAnytimeSkill(action.skillId) ||
    isDemonSummonSkill(action.skillId) || isCheatServerAnytimeSkill(action.skillId) || isRedLotusAnytimeSkill(action.skillId) ||
    action.skillId === ERA_RESTART || soulRestoredSkillId(action.skillId)) &&
    (state.phase === "collecting_actions" || state.phase === "action_window" &&
    state.activeTimingPhase !== "turn_reveal_check" &&
    (!(soulRestoredSkillId(action.skillId) || isCheatServerAnytimeSkill(action.skillId)) || state.activeTimingPhase !== "revival_action"))) {
    if (action.skillId === CURTAIN_FINALE_ID || isTargetedDemonSummon(action.skillId)) {
      const locked = applyJunengTargetLock(state, action, player.spaceId, player);
      if (!locked) return invalid("聚神指定的玩家当前无法被选中");
      return withPlayerSpace(state, playerId, () => validateSkillAction(state, playerId, locked, "turn_before_action"));
    }
    if (!actionTargetsSameSpace(state, playerId, action)) return invalid("只能选择同一空间内的目标");
    return withPlayerSpace(state, playerId, () => validateSkillAction(state, playerId, action, "turn_before_action"));
  }

  if (state.phase !== "action_window" || state.actionWindowMode !== "active") {
    return invalid("当前不在可行动阶段");
  }

  if (action.vacuumUse) {
    if (swordArrayPiBlocksSkill(state, player, action.skillId)) return invalid("玄空·圆周只允许使用含 π 或 3 的技能");
    if (isSkillBlockedByJingu(state, FLASH_DODGE_SKILL_ID, player.spaceId, player)) return invalid("禁锢期间无法使用虚无");
    const option = vacuumOptions(state, player).find(({ cardId }) => cardId === action.bigCardInstanceId);
    return action.skillId === FLASH_DODGE_SKILL_ID && action.stacks === 1 && !action.antiCakeSpent &&
      (action.vacuumUse === "normal" ? option?.normal : action.vacuumUse === "extra" && Boolean(option?.extra))
      ? valid() : invalid("当前没有可用的指定虚无次数");
  }

  if (getSkillPlay(action.skillId)?.kind === "attack" &&
    !(action.skillId === THORN_PIERCE_ID && state.activeTimingPhase === "turn_damage_modify")) {
    return invalid("技能攻击只能在出招阶段使用");
  }
  if (isReversalResponseRestricted(state, playerId) && state.activeTimingPhase === "turn_change_action" && action.skillId !== "1092" && !isStarWheelWindowMove(action.skillId)) {
    return invalid("普通变招已结束，当前只能使用逆转响应或跳过");
  }

  const lockedAction = applyJunengTargetLock(state, action, player.spaceId, player);
  if (!lockedAction) return invalid("聚神指定的玩家当前无法被选中");
  if (!actionTargetsSameSpace(state, playerId, lockedAction)) return invalid("只能选择同一空间内的目标");
  return withPlayerSpace(state, playerId, () => validateSkillAction(state, playerId, lockedAction, state.activeTimingPhase), "moves");
}

function validateAttackAction(
  state: GameState,
  playerId: PlayerId,
  action: AttackAction
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }
  if (hasTalisman(player, "wood", state.roundNumber)) return invalid("木之灵符禁止使用普通攻击");
  if (poisonTotemPreventsAttacks(state, player)) return invalid("剧毒图腾范围内，中毒时不能攻击");

  if (state.config.firstTurnNoAttack && state.roundTurnNumber === 1) {
    return invalid("第一回合禁止攻击");
  }

  const definition = BASE_ATTACKS[action.attackId];
  if (!definition) {
    return invalid("未知攻击");
  }

  if (!Number.isSafeInteger(action.stacks) || action.stacks <= 0 || action.stacks > MAX_ACTION_STACKS) {
    return invalid(`攻击重数必须是 1 到 ${MAX_ACTION_STACKS} 的整数`);
  }

  const cost = getAttackActionCost(state, player, action);
  if (!validCakePayment(state, player, cost, action.antiCakeSpent ?? 0, action.youkaiCakeSpent)) {
    return invalid(`饼不足，需要 ${cost} 个饼`);
  }

  const stats = getStackedAttackStats(definition, action.stacks);
  const forcedArea = isActionForcedArea(state, playerId, action, stats);
  if ((forcedArea || stats.isArea) && action.targetId && state.totems?.some(({ id }) => id === action.targetId))
    return invalid("只有单体攻击可以指定图腾");
  if (!forcedArea && !stats.isArea && action.targetId && getActiveSkillCount(player, LONE_STAR_PASSIVE_ID) &&
    !loneStarFarthest(state, player).includes(action.targetId)) return invalid("独只能攻击最远的玩家");
  if (!definition.isArea && !forcedArea) {
    if (!action.targetId) {
      return invalid("单体攻击必须指定目标");
    }

    if (!isAliveTarget(state, action.targetId) && !targetableTotems(state, player).some(({ id }) => id === action.targetId)) {
      return invalid("攻击目标不存在或已死亡");
    }
    if (hasChaosDefenseLock(player, action.targetId)) return invalid("混乱世纪：你的防御值归零前不能攻击这个目标");
    const target = findPlayer(state, action.targetId);
    if (!canBypassTargetSelection(state, playerId, target) && preventsTargetSelection(target)) return invalid("该玩家当前无法被选中");
    if (action.targetId && isPuppetTargetingMaster(state, playerId, action.targetId)) {
      return invalid("傀儡不能攻击主人");
    }
  }

  return valid();
}

function validateSkillAction(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }
  if (spaceTimeMaxRounds(action.skillId) && !validSpaceTimeDuration(action))
    return invalid(`请选择至少1回合和1至${spaceTimeMaxRounds(action.skillId)}轮的持续上限`);
  if (action.skillId === SPACE_SHATTER && !["left", "right", "sky"].includes(action.spaceTimeSource ?? ""))
    return invalid("请选择由左邻、右邻或天施加退游");
  if (action.skillId === SPACE_BURST && action.targetId === playerId) return invalid("空间爆破须选择其他玩家");
  if (action.skillId === ORIGIN_SHOT_FUSION && timingPhase === "turn_action" &&
    !player.buffs.some((buff) => buff.id === ORIGIN_SHOT_STOCK && buff.stacks > 0))
    return invalid("起源弹次数不足");
  if (action.skillId === KARMA_CYCLE_ID && !validKarmaCardChanges(state, player, action.karmaCardChanges))
    return invalid("轮回改卡只可为每名其他玩家替换一张整卡，新卡须在开局卡池内");
  if (action.skillId === CHEAT_NOGLUES_ID) {
    const cards = getCheatCardChoices(state, player);
    if (cards.length ? !cards.some(({ instanceId }) => instanceId === action.cheatCardInstanceId) : action.cheatCardInstanceId !== undefined)
      return invalid("请选择同空间其他玩家的一张完整大卡");
  }
  if (action.skillId === CHEAT_TRANSFER_ID && !validateCheatServerUseTransfer(player, action.cheatTransferFrom, action.cheatTransferTo))
    return invalid("请选择一项有剩余次数的限定技和另一项限定技");
  if (action.skillId === CHEAT_SHARP_DAMAGE_ID && (!getCheatSharpDamageUses(player) || !findPlayer(state, action.targetId ?? "")))
    return invalid("法伤次数不足，或没有选择玩家");
  if (swordArrayPiBlocksSkill(state, player, action.skillId)) return invalid("玄空·圆周只允许使用含 π 或 3 的技能");
  if (action.skillId === KARMA_CONVERT_ID && !validKarmaConversion(player, action))
    return invalid("请选择一项有余额的技能，并转化为同组另一项技能");
  if (action.skillId === KARMA_REBIRTH_ID && (!isPendingDeathPlayer(player) || !canUseKarmaRebirth(state, player)))
    return invalid("没有可响应的普通死亡，或轮回转生无法使用");
  if (action.skillId === YOUKAI_RITUAL_ID && !canStartYoukaiRitual(player))
    return invalid("未央鬼祭需要妖化且妖力沉淀不少于100层");
  if (action.skillId === SHADOW_LEAVE_ID && !hasShadowDance(player)) return invalid("止隐只能在影舞状态使用");
  if (action.skillId === SHADOW_WIND_DANCE_ID || action.skillId === SHADOW_FOLLOW_ID) {
    const mode = action.skillId === SHADOW_FOLLOW_ID ? "behind" : action.shadowMoveMode;
    if (mode !== "insert" && mode !== "behind") return invalid("请选择舞风的移动方式");
    const combo = action.skillId === SHADOW_WIND_DANCE_ID ? action.shadowCombo ?? 0 : 0;
    if (!shadowSeatChoices(state, player, mode, combo).some(({ player: target }) => target.id === action.targetId))
      return invalid("请选择有效的移动座次或可跟随目标");
  }
  if (action.skillId === CRYSTAL_SHIELD_ID && !crystalShieldAvailable(state, player)) return invalid("已有魔晶护盾，或神域魔晶仍被封锁");
  if (isDemonSummonSkill(action.skillId) || isDemonOrderSkill(action.skillId)) {
    const error = validateDemonAction(state, player, action);
    if (error) return invalid(error);
  }
  if (action.starWheelPinned) return invalid("封存出招由系统释放");
  if (!canPayStarWheel(player, action.skillId)) return invalid("逆转或斗转次数不足");
  if (action.skillId === STAR_WHEEL_RELEASE) {
    const ids = action.starWheelMoveIds ?? [];
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length ||
      ids.some((id) => !starWheelChoices(state, player).some((move) => move.id === id))) return invalid("请选择本轮可释放的封存出招");
  }
  if (action.skillId === STAR_WHEEL_POSITION && (typeof action.starWheelUseOriginal !== "boolean" || player.spaceId))
    return invalid("请选择主空间的原位或现位");
  if (action.skillId === STAR_WHEEL_SHIFT && (player.spaceId || action.targetId === player.id ||
    !getPhysicalCombatSeats(state, player.spaceId).some(({ id }) => id === action.targetId))) return invalid("请选择主空间另一座次");
  if (action.skillId === STAR_WHEEL_VICTORY && player.bars?.some(({ sourceAbilityId }) => sourceAbilityId === STAR_WHEEL_VICTORY))
    return invalid("星移飞轮已在计时");
  if (isTotemCreation(action.skillId) && !validTotemCreation(state, player, action)) return invalid("请选择有效的图腾、主目标和范围");
  if (action.skillId === THORN_PIERCE_ID && timingPhase === "turn_damage_modify") {
    return action.stacks === 1 && thornPierceChoices(state, playerId).some((option) => option.id === action.attackResponseId)
      ? valid() : invalid("请选择本次穿可失效的防御");
  }
  if (action.skillId === BUBBLE_FORGET && !bubbleDreamHitChoices(state, playerId).some((option) => option.id === action.attackResponseId))
    return invalid("请选择一份已命中的单攻");
  if (action.skillId === RED_LOTUS_NINE && redLotusFlameCount(player) < 9)
    return invalid("九天红焰至少需要9层焰印记");
  if (action.skillId === ERA_RESTART && !eraRestartSource(player, action.bigCardInstanceId))
    return invalid("这份永恒纪元的新纪元次数已用尽");
  if (action.skillId === RED_LOTUS_FINALE && player.redLotusFinaleUsed && getActiveSkillCount(player, RED_LOTUS_KARMA))
    return invalid("业火红莲已废除红莲天火");
  if (action.skillId === BUBBLE_REBUILD && (!bubbleDreamStock(player, BUBBLE_REBUILD_STOCK) ||
    !player.bigCards?.some((card) => card.instanceId === bigAbilitySource(player, action) && !card.bubbleDreamRebuild)))
    return invalid("需要至少一层改造，且此卡尚未进入改造期");
  if (action.skillId === BUBBLE_ENHANCE) {
    const index = action.switchActionIndex;
    if (index === undefined || !previewPlayerAttackStats(state, playerId, undefined, true).stats[index] || bubbleDreamMoveEnhanced(player, index, state.turnNumber) ||
      !bubbleDreamEnhancement(player, bigAbilitySource(player, action))) return invalid("请选择本回合未用自我改造强化的招式");
  }
  if ([BUBBLE_FORGET, BUBBLE_REBUILD, BUBBLE_ENHANCE, BUBBLE_FINALE].includes(action.skillId) && action.stacks !== 1)
    return invalid("该技能每次只能用一重");
  if (!actionTargetsSameSpace(state, playerId, action)) return invalid("只能选择同一空间内的目标");
  if (player.buffs.some((buff) => isAllSkillsSealedBuff(buff.id))) return invalid("技能已被封锁，不能使用");
  if (state.sakuraTurnEndResponse && action.skillId !== SAKURA_FALL_ID) return invalid("当前仅可使用免费樱落");
  if (action.skillId === COMMON_FUSION_SKILL_ID) return validateFusionAction(state, playerId, action);
  const sakuraFree = action.skillId === SAKURA_FALL_ID && state.sakuraTurnEndResponse && hasFreeSakuraFall(player);
  if (action.skillId === SAKURA_FALL_ID || action.skillId === SAKURA_FINALE_ID) {
    if (action.skillId === SAKURA_FINALE_ID && !canDiscardAllSakuraCards(player)) return invalid("无法弃置自己的全部大卡，不能使用绽尽芳华");
    const mode = action.skillId === SAKURA_FINALE_ID ? "finale" : state.sakuraTurnEndResponse ? "free" : "death";
    const choices = getDiscardableSakuraChoices(state, getSakuraCardChoices(state, player, mode));
    const required = mode === "finale" ? getSakuraFinaleDiscardCount(choices) : 1;
    if (mode === "death" && !isPendingDeathWindow(state) || mode === "free" && !sakuraFree ||
      !validateSakuraCards(choices, action.removeSkillInstanceIds ?? [], required, required))
      return invalid(`请选择 ${required} 张仍可弃置的大卡，并遵守各目标剩余次数`);
  }

  const free = Boolean(action.freeMoveId);
  if ([ETERNAL_BIND_ID, ETERNAL_REPLACE_ID, ETERNAL_THOUGHT_ID].includes(action.skillId)) {
    if (!readyEternalCard(state, player, action)) return invalid("静滞进度或永续改招次数不足，或当前无法回溯");
    if (action.skillId !== ETERNAL_THOUGHT_ID && !eternalMoveChoices(state, playerId).some(({ index }) => index === action.switchActionIndex))
      return invalid("请选择一项本回合有效提交的出招");
  }
  if (!free && !sakuraFree && !getOwnedSkillIds(player).includes(action.skillId)) {
    return invalid("你没有这个技能");
  }
  const fusedCopies = player.skillFusions?.filter((fusion) => fusion.skillId === action.skillId) ?? [];
  if (!free && fusedCopies.length && !fusedCopies.some((fusion) => isFusionActive(player, fusion)))
    return invalid("该融合效果已被覆盖替代或封印");
  if (BIG_CARD_SKILLS[action.skillId] && ![ANTI_CAKE_MOVE_ID, CHEAT_SHARP_DAMAGE_ID].includes(action.skillId) && !sakuraFree && (!isBigSkillMode(state.config.skillMode) || !bigAbilitySource(player, action, true))) {
    return invalid("当前模式或所选大卡实例不能使用此技能");
  }
  if (action.skillId === FALLEN_SPLENDOR_CONVERT) {
    const card = player.bigCards?.find(({ instanceId }) => instanceId === bigAbilitySource(player, action));
    if (!card || !fallenSplendorHealingRemaining(player, card)) return invalid("这张陨落天华没有剩余治愈术");
  }
  if (action.skillId === FALLEN_SPLENDOR_EXECUTION || action.skillId === FALLEN_SPLENDOR_RELEASE) {
    const eligible = fallenSplendorTargets(state, player);
    const required = Math.min(2, eligible.length);
    const selected = normalizeTargetIds(action);
    if (!fallenSplendorExecutionStock(player, bigAbilitySource(player, action))) return invalid("没有剩余的必杀机会");
    if (!required || selected.length !== required || selected.some((id) => !eligible.includes(id) ||
      !canBypassTargetSelection(state, playerId, findPlayer(state, id)!) && preventsTargetSelection(findPlayer(state, id))))
      return invalid(`请选择 ${required} 名可选中的其他存活玩家`);
  }
  if (isBrokenBladeMaintenance(action.skillId) && !canMaintainBrokenBlade(player, action.skillId, action.bigCardInstanceId))
    return invalid("只能修复或重铸当前次数耗尽的战刃");
  if ([MOON_GRIEF_ID, MOON_SHADOW_ID, MOON_PUNISH_ID, MOON_DANCE_ID, MOON_TIDE_ID].includes(action.skillId) && !hasMoon(state, player))
    return invalid("当前无月");
  if (action.skillId === MOON_RITUAL_ID && !canSummonMoon(state, player))
    return invalid("本轮已使用月祭或已有召唤的月亮");
  if (action.skillId === SWORD_ARRAY_PLACE_ID && !canPlaceSwordArray(state))
    return invalid("场上已有诛仙剑阵，不能再布阵");
  if (action.skillId === CURTAIN_ENCORE_ID && !free && !curtainEncoreReady(player, bigAbilitySource(player, action)))
    return invalid("这张谢幕光绮的前四幕尚未全部使用");
  if (action.skillId === CURTAIN_FINALE_ID) {
    const target = action.targetId ? findPlayer(state, action.targetId) : undefined;
    if (action.stacks !== 1 || !target || target.status !== "alive" || target.id === player.id)
      return invalid("请选择一名其他存活玩家作为谢幕光绮的目标");
    if (!canBypassTargetSelection(state, playerId, target) && preventsTargetSelection(target))
      return invalid("该玩家当前无法被选中");
    if (curtainDiscardQuote(player).blocked) return invalid("持有无法弃置的复活技能，不能使用谢幕光绮");
  }
  if (action.skillId === SWARM_RETURN_ID && !free && !isSwarmAllocationValid(player, action.swarmAllocation))
    return invalid("请选择库存中的任意10只虫作为代价");
  if (action.skillId === TIGER_STAB && !Number.isSafeInteger(action.tigerPower)) return invalid("幽冥刺请选择整数攻击值");
  if (action.skillId === TIGER_SWITCH && !player.bigCards?.some((card) =>
    card.instanceId === bigAbilitySource(player, action) && !card.onlyAbilityId && card.tigerForms &&
    card.tigerForms.active !== action.cardForm && card.tigerForms.available.some((form) => form === action.cardForm)))
    return invalid("请选择仍保留且当前未开启的形态");
  if (action.skillId === TIGER_RESTORE && !player.bigCards?.some((card) => !card.onlyAbilityId && card.tigerForms?.active === "nether" &&
    (!action.bigCardInstanceId || card.instanceId === action.bigCardInstanceId))) return invalid("当前没有可恢复的幽冥白虎形态");
  if (action.skillId === FIVE_ELEMENTS_CHOOSE && (timingPhase !== "opening_action" &&
    (timingPhase !== "round_before_action" || state.roundNumber === 1) || !player.bigCards?.some((card) =>
      card.instanceId === bigAbilitySource(player, action) && canChooseFiveElementsForm(card.fiveElementsForms, state.roundNumber) &&
      card.fiveElementsForms?.available.some((form) => form !== "none" && form === action.cardForm))))
    return invalid("请在开局或下一轮轮初选择仍保留的形态，每轮可选一次");
  if (action.skillId === HEXAGRAM_CHOOSE && (timingPhase !== "opening_action" &&
    (timingPhase !== "round_before_action" || state.roundNumber === 1) || !player.bigCards?.some((card) =>
      card.instanceId === bigAbilitySource(player, action) && canChooseRoundCardForm(card.hexagramForms, state.roundNumber) &&
      card.hexagramForms?.available.some((form) => form !== "none" && form === action.cardForm))))
    return invalid("请在开局或下一轮轮初选择仍保留的六芒形态，每轮可选一次");
  if (action.skillId === HEXAGRAM_SPIRIT && (hexagramRemainingUses(player, MIRROR_SKILL_ID) < 2 ||
    !hexagramCopyTarget(state, player, action) || !canReceiveBigCard(player, "skill_copy")))
    return invalid("禁灵需要2次镜像法术，并选择同空间内已暴露的至尊及以下子技能");
  if (action.skillId === HEXAGRAM_ABSOLUTE && (hexagramRemainingUses(player, HEXAGRAM_SIX_STAR) < 2 ||
    player.buffs.some((buff) => buff.sourceAbilityId === HEXAGRAM_ABSOLUTE && buff.expiresAtTurn === state.turnNumber)))
    return invalid("禁绝需要2次六芒星，本回合不可重复使用");
  if (action.skillId === HEXAGRAM_RESTORE && !player.bigCards?.some((card) => card.instanceId === bigAbilitySource(player, action) &&
    card.hexagramRestores && lostHexagramForms(card).some((form) => form === action.cardForm)))
    return invalid("请选择要恢复的一种已失去的六芒形态");
  if (action.skillId === SEVEN_STAR_CHOOSE && (timingPhase !== "opening_action" &&
    (timingPhase !== "round_before_action" || state.roundNumber === 1) || !player.bigCards?.some((card) =>
      card.instanceId === bigAbilitySource(player, action) && canChooseRoundCardForm(card.sevenStarForms, state.roundNumber) &&
      card.sevenStarForms?.available.some((form) => form !== "none" && form === action.cardForm))))
    return invalid("请在开局或下一轮轮初选择仍保留的七星形态，每轮可选一次");
  if (action.skillId === SEVEN_STAR_YAOGUANG && !player.bigCards?.some((card) => card.instanceId === bigAbilitySource(player, action) &&
    lostSevenStarForms(card).some((form) => form === action.cardForm))) return invalid("请选择一种已失去的七星形态");
  if (action.skillId === TIAN_SHA_VERDICT && (tianShaSpaceCount(state, player) > 3 ||
    !tianShaVerdictPayment(player, bigAbilitySource(player, action)).length))
    return invalid("天煞星决需要场上至多 3 人，并持有可弃置的天煞神剑与星宿破灭");
  if (action.skillId === TIAN_SHA_FINALE && !canDiscardTianShaFinale(player))
    return invalid("持有无法弃置的技能，不能使用天煞孤影击");
  if (action.skillId === NINE_COLD) {
    const slot = action.switchActionIndex;
    const stats = slot !== undefined && Number.isSafeInteger(slot) ? previewPlayerAttackStats(state, playerId, undefined, true).stats[slot] : undefined;
    if (!coldLightSource(player, state.turnNumber, action.bigCardInstanceId)) return invalid("本回合的一点寒光次数已用完");
    if (!stats || (action.coldLightField === "power" ? stats.nonAttackMove : action.coldLightField === "level" ? stats.noClashLevel : true))
      return invalid("请选择一份出招的攻击值或等级");
  }
  if (action.skillId === FIVE_ELEMENTS_LEVEL) {
    const slot = action.switchActionIndex;
    if (slot === undefined || !Number.isSafeInteger(slot) || !previewPlayerAttackStats(state, playerId).stats[slot] ||
      !FIVE_ELEMENTS_OPERATIONS.some((operation) => operation === action.fiveElementsLevelOperation) ||
      player.buffs.some((buff) => buff.id.startsWith(`${FIVE_ELEMENTS_LEVEL_PREFIX}${slot}:`) &&
        (buff.expiresAtTurn ?? 0) > state.turnNumber)) return invalid("请选择一份尚未调整的攻击和一种无限运算");
  }
  if (action.skillId === DIVINE_FLAME_ID && (getPeriodicUses(player, DIVINE_FLAME_ID, state.roundNumber, 1) <= 0 ||
    player.buffs.some((buff) => buff.id === DIVINE_FLAME_ENABLED && buff.startsAtRound === state.roundNumber)))
    return invalid("本轮已切换怒炎或次数不足");
  if (action.skillId === SUN_CROWN_ID && (getPeriodicUses(player,
    periodicCardUseKey(SUN_CROWN_ID, bigAbilitySource(player, action) ?? ""), state.roundNumber, 1) <= 0 ||
    player.buffs.some((buff) => buff.id === SUN_CROWN_COOLDOWN &&
    buff.sourceBigCardInstanceId === bigAbilitySource(player, action) && (buff.expiresAtRound ?? 0) > state.roundNumber)))
    return invalid("永恒冕冠每四轮可用一次");
  if (action.skillId === SEA_GOD_RETURN_ID && !free &&
    !isSeaGodReturnReady(player, state.roundNumber, action.bigCardInstanceId))
    return invalid("一去不返仍在冷却");
  if (action.skillId === XIELING_ULTIMATE_ID && !free && getPeriodicUses(player,
    periodicCardUseKey(XIELING_ULTIMATE_ID, bigAbilitySource(player, action) ?? ""), state.turnNumber, 1) <= 0)
    return invalid("邪灵无念仍在冷却");
  if (soulRestoredSkillId(action.skillId) && !soulRestorationCard(player, action)) return invalid("没有已使用的对应限定技次数可恢复");
  if (action.skillId === THUNDER_RITE_ID && hasThunderRite(player, state.roundNumber)) return invalid("雷祭仍在生效，不能叠加");
  if (action.skillId === CHAOS_WAVE_ID && !chaosWaveChoices(state, playerId).some((entry) => entry.index === action.switchActionIndex))
    return invalid("请选择一项尚未附加乱之波动、且以其他玩家为目标的出招");
  if (action.skillId === FOUR_EMPTINESS_ID) {
    const selected = action.removeSkillInstanceIds ?? [];
    const allowed = new Set(getBlindSkillChoices(state, playerId, true).map((choice) => choice.instanceId));
    if (!Array.isArray(selected) || selected.length > 16 || new Set(selected).size !== selected.length ||
      selected.some((id) => !allowed.has(id))) return invalid("请选择至多16个不同且仍可消除的小技能");
  }
  if (action.skillId === SLOT_MACHINE_ID) {
    const ready = getReadySlotMachines(player);
    if (action.rerollFusionInstanceId ? !ready.some((item) => item.id === action.rerollFusionInstanceId) : ready.length !== 1)
      return invalid("请选择一组已完成三次抽取且结果不完全相同的老虎机");
  }
  const materialCount = player.skills.filter((id) => id === action.skillId).length;
  if (!free && materialCount > 0 && countSuppressedFusionMaterials(player, action.skillId) >= materialCount) {
    return invalid("这个素材的效果已被融合替代或封印");
  }

  const skill = getSkill(action.skillId);
  if (action.skillId === YIYUAN_MIMIC && player.yiyuanMimic) return invalid("请先解除当前幻化");
  const vacuum = vacuumMode(state, player);
  if ((action.skillId === VACUUM_EXTRACT_ID || action.skillId === VACUUM_ENTER_ID) && !vacuum)
    return invalid("当前未处于真空状态");
  if (action.skillId === VACUUM_ENTER_ID && inVacuumSpace(state, player)) return invalid("你已在遁入虚空小空间内");
  if (action.skillId === VACUUM_MAX_ID && vacuum !== "absolute") return invalid("需要处于绝对真空");
  if (action.skillId === ANTI_CAKE_MOVE_ID && !free && antiCakeCount(player) < 1) return invalid("需要 1 份反饼");
  if (action.skillId === ANTI_CAKE_MOVE_ID && action.targetId === playerId) return invalid("反饼只能对其他玩家使用");
  if (action.skillId === BEAR_ROAR_ID && !findPlayer(state, playerId)?.bigCards?.some((card) =>
    (!action.bigCardInstanceId || card.instanceId === action.bigCardInstanceId) && card.cardId === "10537" &&
    (card.bearReadyRound ?? 0) <= state.roundNumber &&
    getPeriodicUses(player, periodicCardUseKey(BEAR_ROAR_ID, card.instanceId), state.roundNumber, 1) > 0))
    return invalid("灰熊咆哮仍在冷却");
  const play = getSkillPlay(action.skillId);
  if (action.skillId === LONE_STAR_FINALE_ID && (!action.targetId || loneStarDuelOpponent(state, player) !== action.targetId))
    return invalid("孤星绝煞只能在单挑时对唯一对手使用");
  if (skillHasTypeTag(skill, "控制技") && state.pendingActions[playerId]?.actions.some((move) =>
    move.type === "skill" && move.skillId === LONE_STAR_PIERCE_ID)) return invalid("提交星绝击后，本回合不能使用控制技");
  if (play?.kind === "attack" && !play.nonAttackMove && action.skillId !== "1035" && play.targetMode === "single" &&
    action.targetId && getActiveSkillCount(player, LONE_STAR_PASSIVE_ID) &&
    !playerHasActiveSkill(player, PUTIAN_TONGQING_SKILL_ID) && !playerHasActiveSkill(player, LUANWU_SKILL_ID) &&
    !loneStarFarthest(state, player).includes(action.targetId)) return invalid("独只能攻击最远的玩家");
  if (!skill || !play) {
    return invalid("这个技能当前是锁定技或被动技，不能主动施放");
  }
  if (play.kind === "attack" && !play.nonAttackMove && action.skillId !== "1035" && poisonTotemPreventsAttacks(state, player))
    return invalid("剧毒图腾范围内，中毒时不能攻击");
  if (timingPhase === "turn_action") {
    const skillAttack = play.kind === "attack" && !play.nonAttackMove;
    if (skillAttack && hasTalisman(player, "fire", state.roundNumber)) return invalid("火之灵符禁止使用技能攻击");
    if (!skillAttack && hasTalisman(player, "water", state.roundNumber)) return invalid("水之灵符禁止使用非攻击技能出招");
  }
  if (action.skillId === GAME_SWITCH_ACTION_ID && !isGameSwitchMode(action.gameSwitchMode)) return invalid("请选择要切换的游戏");
  if (action.skillId === PURPLE_INSIGHT_ID || action.skillId === PURPLE_FORESIGHT_ID) {
    const card = player.bigCards?.find((entry) => entry.instanceId === bigAbilitySource(player, action));
    if (!card) return invalid("没有可用的紫极魔瞳子技能");
    if (action.skillId === PURPLE_INSIGHT_ID) {
      if (timingPhase !== "round_before_action" || state.roundNumber % 3 !== 0) return invalid("入微只在第3、6、9…轮轮初可用");
      const pending = state.purpleInsights?.[playerId];
      if (action.purpleInsightChoice !== undefined) {
        return pending?.round === state.roundNumber && pending.sourceCardId === card.instanceId && !action.targetId &&
          (action.purpleInsightChoice === "lose" || action.purpleInsightChoice === "gain") ? valid() : invalid("请先用入微私下查看结果");
      }
      if (pending?.round === state.roundNumber || purpleInsightUses(state.roundNumber, player, card) <= 0)
        return invalid("请先处理结果，或本轮入微次数不足");
      const target = action.targetId && findPlayer(state, action.targetId);
      if (!target || target.id === playerId || target.status !== "alive" || !target.bigCards?.some((entry) =>
        getBigCard(entry.cardId)?.abilities.some(({ id }) => bigCardHasAbility(entry, id)))) return invalid("请选择持有大卡子技能的其他存活玩家");
    } else if (timingPhase !== "turn_before_action" || purpleForesightUses(state.roundNumber, card) <= 0 || action.targetId === playerId) {
      return invalid("芥子须在回合前选择其他玩家，并且还有剩余次数");
    }
  }
  if (action.skillId === PURPLE_SCALE_ID) {
    const index = action.switchActionIndex;
    const stats = index === undefined ? undefined : previewPlayerAttackStats(state, playerId, undefined, true).stats[index];
    if (!stats || player.buffs.some((buff) => buff.id.startsWith(`${PURPLE_SCALE_PREFIX}${index}:`) && (buff.expiresAtTurn ?? 0) > state.turnNumber) ||
      action.purplePower === undefined && action.purpleLevel === undefined || action.purplePower !== undefined &&
      (stats.nonAttackMove || stats.fixedPointPower || !validPurpleValue(attackPowerValue(stats), action.purplePower)) ||
      action.purpleLevel !== undefined && !validPurpleValue(attackLevelValue(stats), action.purpleLevel))
      return invalid("请选择尚未使用浩瀚的本回合出招，将已有攻等改为原值0至5倍内的整数");
  }
  if (action.skillId === TIANMANG_CLEANSE_ID && isPlayerSkillDisabled(player))
    return invalid("技能失效期间不能使用真·净化");
  if (action.skillId === CLOUD_SEA_ID && !action.freeMoveId && compareCombatValues(cloudQuantity(player), combatValue(10)) < 0)
    return invalid("合成云海需要10朵云");
  if (action.skillId === SKY_ABSOLUTE_ID && cloudSeaCount(player) < 4) return invalid("凌空·天绝需要4个云海");
  if (action.skillId === LINGTA_VICTORY_ID && cloudSeaCount(player) < 9) return invalid("凌踏九霄需要9个云海");
  if (action.skillId === SKY_STRIKE_ID && !skyAbsoluteActive(player, state.roundNumber)) return invalid("天击只能在凌空·天绝状态下使用");
  if (isSaintMove(action.skillId) && getSaintMoveMultiplier(player, action.skillId, action.bigCardInstanceId, state.roundNumber) === 0)
    return invalid("当前无法使用这项圣系出招");
  if (action.saintElement !== undefined && (!isSaintMove(action.skillId) || !getSaintElements(player).includes(action.saintElement)))
    return invalid("请为圣系出招选择一种已持有的元素");
  if (action.skillId === XIELING_TRANSFORM_ID && !free && (!Number.isSafeInteger(action.xielingMarkCost) ||
    action.xielingMarkCost! <= 0 || action.xielingMarkCost! > getXielingConversionLimit(player)))
    return invalid("请选择要消耗的邪灵印记层数");
  if (action.skillId === SACRED_BEAST_ID && (!action.sacredBeast ||
    !availableSacredBeasts(player, state.roundNumber, action.bigCardInstanceId).includes(action.sacredBeast)))
    return invalid("请选择本轮可开启、且本段六轮内尚未开启过的神兽");
  if (action.skillId === TIME_REWIND_ID && !getRewindSnapshot(state, rewindTargetIds(action)))
    return invalid("时溯只能选仍可继续游戏且有对应轮初快照的目标");
  if (effectHasCategory(skill.id, "return_to_past") || effectHasCategory(skill.id, "restore_initial")) {
    const ids = getActionTargetIds(action);
    const targets = ids.length > 0 ? state.players.filter(({ id }) => ids.includes(id)) : [player];
    if (targets.some((target) => !canRestoreTemporalState(state, target)))
      return invalid("目标无法回到过去的状态或恢复至初始");
  }
  if (skill.name === "魔域") {
    if (timingPhase !== "turn_end_action" || state.roundNumber % 3 !== 0) return invalid("魔域只能在第3x轮回合末选择目标");
    const manual = getManualDemonDomainCount(player);
    if (!manual) return invalid("轮回吞噬会自动吸取全体，无需选择魔域目标");
    const ids = action.targetIds ?? [];
    if (getSelectableJunengTarget(state, player.spaceId) ? ids.length !== 1 :
      ids.length !== 3 || ids.some((id) => id === playerId || !isAliveTarget(state, id))) return invalid("魔域需要选择三次其他存活玩家，允许重复");
    if (player.buffs.filter((buff) => buff.id === "demon_domain_target").length >= 3 * manual) return invalid("本轮魔域目标已经指定");
  }

  if (isPlayerInCollapse(player) && !getFinaleCollapseSource(player, action.skillId)) {
    return invalid("沦陷状态下不能使用技能");
  }

  const pendingDeathWindow = isPendingDeathWindow(state);
  const pendingDeathPlayer = isPendingDeathPlayer(player);
  const activeHealingArt = action.skillId === HEALING_ART_ID && hasCharityDestiny(player);
  if (activeHealingArt && timingPhase === "turn_action") return invalid("天命的治愈术是主动技能，请使用技能窗口");
  if (action.skillId === HEALING_ART_ID && pendingDeathPlayer && hasContinuationBlock(state, player, "revival", "none"))
    return invalid("受到复活限制，无法使用治愈术恢复");
  if (action.charityRestoreInitial && (!activeHealingArt || !hasInitialPlayerSnapshot(state, playerId) || !canRestoreTemporalState(state, player)))
    return invalid("当前无法使用天命恢复至初始");
  if (action.skillId === CHARITY_QUICK_ID && (!quickHealingCard(player, action, state.roundNumber) ||
    !getQuickHealingTargets(state, playerId).some(({ id }) => id === action.targetId)))
    return invalid("速愈需选择一名有受伤记录的其他存活玩家，且本轮尚有次数");
  if (action.skillId === CHARITY_LINK_ID && (!action.targetIds?.length || action.targetIds.includes(playerId)))
    return invalid("献身慈爱至少指定一名其他存活玩家");
  const revivalSkill = ACTIVE_REVIVAL_SKILL_IDS.has(action.skillId);
  if (pendingDeathPlayer && revivalSkill && !canRecoverWithHpCap(player))
    return invalid("血量上限低于 0，无法通过复活恢复存活");
  const soulResponse = action.skillId === SOUL_EXTINGUISH_ID || action.skillId === SAKURA_FALL_ID || Boolean(soulRestoredSkillId(action.skillId));
  if (pendingDeathWindow && !pendingDeathPlayer && !soulResponse && action.skillId !== CHARITY_QUICK_ID && !activeHealingArt) {
    return invalid("当前是复活窗口，只有已死亡玩家可以行动");
  }

  if (pendingDeathWindow && !revivalSkill && !soulResponse && action.skillId !== FALLEN_SPLENDOR_CONVERT) {
    return invalid("已死亡时只能使用复活系技能");
  }
  if (action.skillId === SOUL_EXTINGUISH_ID && (!pendingDeathWindow || !state.players.some((target) =>
    isPendingDeathPlayer(target) && canAffectAcrossSpace(state, playerId, target.id))))
    return invalid("当前没有可响应的普通死亡");

  if (revivalSkill && pendingDeathPlayer && (hasNoRevive(player) || soulDeathIgnoresSkill(player, player.id, action.skillId) ||
    player.buffs.some((buff) => buff.id === "direct_non_damage_death" && buff.sourceAbilityId === SOUL_PACT_ID))) {
    return invalid(`受到${player.buffs.find((buff) => buff.id === "no_revive")?.name ?? "致死效果"}限制，无法复活`);
  }

  if (
    (action.skillId === HEALING_ART_ID && !activeHealingArt || action.skillId === "1067" || action.skillId === SAGE_PROTECTION_SKILL_ID) &&
    (!pendingDeathWindow || !pendingDeathPlayer)
  ) {
    return invalid(`${skill.name} 只能在复活阶段使用`);
  }

  if (action.skillId === "1023" && player.hp !== 0) {
    return invalid("神隐青莲只能在你的血量为 0 时使用");
  }

  if (isPlayerSkillSealed(player, action.skillId)) {
    return invalid("这个技能已被封锁，不能使用");
  }

  if (isSkillBlockedByJingu(state, action.skillId, player.spaceId, player)) {
    return invalid(`${skill.name} 已被禁锢封锁，不能使用`);
  }

  if (action.skillId === getFusionSkillId("辉月")) {
    if (getHuiyueCooldownCount(player, state.roundNumber) >= getActiveFusionCount(player, "辉月")) return invalid("辉月仍在冷却中");
    if (player.buffs.some((buff) => buff.id === "huiyue_stasis" && (buff.expiresAtTurn ?? -1) > state.turnNumber)) return invalid("本回合已经使用辉月");
  }
  if (action.skillId === STAR_MOON_FREE_HUIYUE && (!player.buffs.some((buff) => buff.stateType === STAR_MOON_HUIYUE_STOCK && buff.stacks > 0) ||
    player.buffs.some((buff) => buff.id === "huiyue_stasis" && (buff.expiresAtTurn ?? -1) > state.turnNumber)))
    return invalid("当前没有可用的免费辉月");
  if (action.skillId === STAR_MOON_CHOOSE_CARD &&
    !getStarMoonCardChoices(state, playerId).some(({ instanceId }) => instanceId === action.targetBigCardInstanceId))
    return invalid("请选择本次命中目标持有的一张大卡");

  if (!skill.timingPhases.includes(timingPhase) && !activeHealingArt && action.skillId !== CURTAIN_FINALE_ID) {
    return invalid(`${skill.name} 不能在当前阶段使用`);
  }
  if (action.skillId === KUISHI_ID && (state.roundNumber !== 1 || state.turnNumber !== 1 ||
    !findPeekCopyTarget(state, playerId, action.targetBigCardInstanceId))) return invalid("窥视只能在开局选择一张已知的其他玩家大卡");
  if (action.skillId === KURONG_LEAF_ID && !validateKurongLeaves(state, player, action.leafAbilityChoices))
    return invalid("叶落彼岸只能在开局从至多三张已抽取的大卡各选择一个子技能");
  if (action.skillId === SELF_ISOLATION_ID && player.spaceId) return invalid("已在小空间内，不能自我封闭");

  if (
    timingPhase === "turn_damage_modify" && action.skillId !== STAR_MOON_CHOOSE_CARD && !isStarWheelWindowMove(action.skillId) &&
    !isBrokenBladeMaintenance(action.skillId) &&
    action.skillId !== FALLEN_SPLENDOR_CONVERT && action.skillId !== FALLEN_SPLENDOR_RELEASE && action.skillId !== BUBBLE_FORGET && action.skillId !== BUBBLE_REBUILD &&
    action.skillId !== KARMA_CONVERT_ID &&
    action.skillId !== "1093" &&
    action.skillId !== SIX_STAR_SKILL_ID &&
    ![TIANMANG_CLEANSE_ID, TIANMANG_CONVERSION_ID, TIANMANG_FIELD_CLEANSE_ID, WIND_PURSUIT_ID].includes(action.skillId) &&
    !isAsuraAnytimeSkill(action.skillId) &&
    !isCheatServerAnytimeSkill(action.skillId) &&
    !isRedLotusAnytimeSkill(action.skillId) &&
    !isDemonSummonSkill(action.skillId) &&
    action.skillId !== ICE_RAIN_SKILL_ID &&
    action.skillId !== CROSS_GUARD_SKILL_ID && action.skillId !== CRYSTAL_GUARD_ID &&
    action.skillId !== STORE_DAMAGE_ID && action.skillId !== STAR_RESIST_ID && action.skillId !== RELEASE_DAMAGE_ID && action.skillId !== JUSHEN_ID && action.skillId !== SELF_ISOLATION_ID &&
    action.skillId !== FOUR_EMPTINESS_ID && action.skillId !== SLOT_MACHINE_ID && action.skillId !== QIANQIU_RESPONSE_ID &&
    action.skillId !== TIANLIE_CONTINUE_ID && action.skillId !== TIANLIE_FEEDBACK_ID &&
    action.skillId !== XIELING_BODY_ID && action.skillId !== XIELING_RESET_ID &&
    !isHunyaoPursuit(action.skillId)
  ) {
    return invalid("变伤阶段只能使用斗转星移或印记技能");
  }

  if (action.targetDamageId && state.pendingDamageItems?.some((item) =>
    item.id === action.targetDamageId && ignoresSkill(item.targetSkillIgnore, action.skillId))) {
    return invalid("这份伤害无视该技能");
  }
  if ((action.skillId === TIANLIE_CONTINUE_ID || action.skillId === TIANLIE_FEEDBACK_ID) &&
    !tianlieResponseChoices(state, player).some((entry) => entry.id === action.attackResponseId && entry.skillId === action.skillId))
    return invalid("请选择本回合符合条件的一次未命中攻击");
  if (action.skillId === TIANLIE_MIGHT_ID && (action.switchActionIndex === undefined || !Number.isSafeInteger(action.switchActionIndex) ||
    !previewPlayerAttackStats(state, playerId).stats[action.switchActionIndex]))
    return invalid("请选择你本回合的一次攻击");
  if (action.skillId === FALLEN_SPLENDOR_DOUBLE) {
    const index = action.switchActionIndex;
    const stats = index === undefined ? undefined : previewPlayerAttackStats(state, playerId).stats[index];
    if (!stats || stats.nonAttackMove || player.buffs.some((buff) => buff.id ===
      `fallen_splendor_double:${index}:${bigAbilitySource(player, action)}` && buff.expiresAtTurn === state.turnNumber + 1))
      return invalid("请选择本回合尚未被这张陨落天华强化的一次攻击");
  }
  if (action.skillId === WIND_TRACK_ID && (action.switchActionIndex === undefined ||
    !previewPlayerAttackStats(state, playerId).stats[action.switchActionIndex] ||
    player.buffs.some((buff) => buff.stateType === "wind_track" && buff.attackActionIndex === action.switchActionIndex)))
    return invalid("请选择自己本回合尚未附加风·跟踪的一次攻击");
  if (action.skillId === WIND_PURSUIT_ID && !getWindPursuitTargets(state, player).some((target) => target.id === action.targetId))
    return invalid("请选择本回合被你命中且有你的风踪印记的目标");
  if (action.skillId === ASURA_FERRY_ID && (!Number.isSafeInteger(action.bloodQiSpent) || (action.bloodQiSpent ?? 0) < 1 ||
    !hasBloodQi(player, (action.bloodQiSpent ?? 0) + 30) || action.switchActionIndex === undefined ||
    !previewPlayerAttackStats(state, playerId).stats[action.switchActionIndex]))
    return invalid("请选择本回合的一次攻击，投入至少1点血气，并保留至少30点血气");
  if (action.skillId === ASURA_RITUAL_UPGRADE_ID && player.buffs.some((buff) => buff.id === ASURA_RITUAL_UPGRADE))
    return invalid("祭天已升级为消失");
  if (action.skillId === ASURA_IMMUNITY_ID && (!hasBloodQi(player, 1) || player.buffs.some((buff) => buff.id === "asura_immunity_used" &&
    buff.expiresAtTurn === state.turnNumber + 1) || !state.pendingActions[playerId]?.actions.some((move) => move.type === "skill" &&
      move.skillId === ASURA_SWORD_ID && !move.sandDelayedActionId) && !player.buffs.some((buff) => buff.id === ASURA_SWORD_GUARD &&
        buff.expiresAtTurn === state.turnNumber + 1))) return invalid("须在本回合出修罗血剑斩后，消耗至少1点血气");
  const { minimum: requiredQi } = getSkillBloodQiCosts(action.skillId, action.stacks, action.bloodQiSpent);
  if (requiredQi > 0 && !hasBloodQi(player, requiredQi)) return invalid(`血气不足，需要至少 ${requiredQi} 点`);
  if (action.skillId === QIANQIU_RESPONSE_ID && (!action.targetId || action.targetId === playerId ||
    !getQianqiuDefenseGains({ ...state, activeTimingPhase: timingPhase }, player).some((buff) => buff.id === action.defenseGainId))) {
    return invalid("请选择当前窗口的一笔防御值和另一名玩家，每回合限一次");
  }
  if (action.skillId === STAR_RESIST_ID && (!canUseStarResistance(player) || !state.pendingDamageItems?.some((item) =>
    item.id === action.targetDamageId && item.targetId === playerId && isStarResistible(item)))) {
    return invalid("异星共振需要持有防御值，并选择一份无限伤害或一次退游");
  }
  if (!Number.isSafeInteger(action.stacks) || action.stacks <= 0 || action.stacks > MAX_ACTION_STACKS) {
    return invalid(`技能重数必须是 1 到 ${MAX_ACTION_STACKS} 的整数`);
  }

  if (action.stacks > play.maxStacks) {
    return invalid(`技能重数不能超过 ${play.maxStacks}`);
  }
  if (action.skillId === THUNDER_BALL_ID && thunderBallCount(player) + action.stacks > thunderBallCapacity(player, state.roundNumber)) {
    return invalid("雷球已达到上限");
  }
  if (action.skillId === STAR_RAGE_ID) {
    if (!canSpendStarRageMarks(player)) return invalid("星怒需要3层星印记");
    if (action.targetSkillId !== STAR_RAGE_ID && action.targetSkillId !== STAR_RAGE_SIX_STAR) return invalid("请选择发动星怒或六芒星");
  }
  for (const { element, perStack } of getSkillElementCosts(player, action)) {
    const payer = action.skillId === JUSHEN_ID || action.skillId === XIELING_BODY_ID
      ? state.preemptiveRestartSnapshot?.players.find((candidate) => candidate.id === playerId) ?? player : player;
    const cost = perStack * action.stacks + (element === YOUKAI_ELEMENT ? action.youkaiCakeSpent ?? 0 : 0);
    if (getElementAmount(player, element) < cost || getElementAmount(payer, element) < cost)
      return invalid(`${element}元素不足，需要 ${cost} 个`);
  }
  if (action.skillId === STORE_DAMAGE_ID && !state.pendingDamageItems?.some((item) =>
    item.id === action.targetDamageId && item.targetId === playerId && isStorableJunengDamage(item))) {
    return invalid("请选择自己即将受到的一份不超过退游的伤害");
  }
  if (action.skillId === RELEASE_DAMAGE_ID && !getStoredDamages(player).some((item) => item.id === action.storedDamageId))
    return invalid("请选择一份已储存的伤害");

  const lianBaoFreeValidation = free ? valid() : validateLianBaoFreeStacks(player, action);
  if (!lianBaoFreeValidation.ok) {
    return lianBaoFreeValidation;
  }

  const resourceValidation = free ? valid() : validateSkillResourceCost(player, action);
  if (!resourceValidation.ok) {
    return resourceValidation;
  }

  if (getAttackMarkKind(action.skillId)) {
    const choices = getAttackMarkChoices(state, playerId);
    if (!choices.length) return invalid("当前没有可使用印记强化的攻击");
    if (action.switchActionIndex === undefined && choices.length > 1) return invalid("请选择使用印记强化的攻击");
    if (action.switchActionIndex !== undefined && (!Number.isInteger(action.switchActionIndex) ||
      !choices.some((choice) => choice.actionIndex === action.switchActionIndex))) return invalid("只能选择自己本回合发出的攻击");
    const index = action.switchActionIndex ?? choices[0]!.actionIndex;
    if (action.stacks > getAttackMarkCapacity(player, action.skillId, index))
      return invalid(`同一次攻击最多使用${MAX_ACTION_STACKS}层同类印记`);
  }

  const actionSwitchValidation = validateActionSwitch(state, playerId, action);
  if (!actionSwitchValidation.ok) {
    return actionSwitchValidation;
  }

  const attackStatModifierValidation = validateAttackStatModifier(
    state,
    playerId,
    player,
    action,
    timingPhase
  );
  if (!attackStatModifierValidation.ok) {
    return attackStatModifierValidation;
  }

  const doubleEdgeValidation = validateDoubleEdgeSwordV2(
    state,
    playerId,
    player,
    action,
    timingPhase
  );
  if (!doubleEdgeValidation.ok) {
    return doubleEdgeValidation;
  }

  const liegongValidation = validateLiegongCross(
    state,
    playerId,
    player,
    action,
    timingPhase
  );
  if (!liegongValidation.ok) {
    return liegongValidation;
  }

  const absoluteGuardValidation = validateAbsoluteGuard(
    state,
    playerId,
    player,
    action,
    timingPhase
  );
  if (!absoluteGuardValidation.ok) {
    return absoluteGuardValidation;
  }

  const sandTargetValidation = validateSandTransformTarget(state, player, action, skill);
  if (!sandTargetValidation.ok) {
    return sandTargetValidation;
  }

  const coagulationIntervalValidation = validateCoagulationIntervalUse(
    player,
    action,
    state.roundNumber,
    timingPhase
  );
  if (!coagulationIntervalValidation.ok) {
    return coagulationIntervalValidation;
  }

  const flashDodgeValidation = validateFlashDodgeUse(
    player,
    action,
    timingPhase,
    state.roundNumber
  );
  if (!flashDodgeValidation.ok) {
    return flashDodgeValidation;
  }

  const sixStarValidation = validateSixStarUse(state, playerId, action, timingPhase);
  if (!sixStarValidation.ok) {
    return sixStarValidation;
  }

  const damageRedirectValidation = validateDamageRedirectTarget(
    state,
    playerId,
    action,
    timingPhase
  );
  if (!damageRedirectValidation.ok) {
    return damageRedirectValidation;
  }

  const damageMarkValidation = validateDamageMarkUse(state, playerId, player, action, timingPhase);
  if (!damageMarkValidation.ok) {
    return damageMarkValidation;
  }

  const stealSkillValidation = validateShunshouStealChoice(state, playerId, action, timingPhase);
  if (!stealSkillValidation.ok) {
    return stealSkillValidation;
  }

  const xieyuValidation = validateXieyuTarget(state, playerId, action, timingPhase);
  if (!xieyuValidation.ok) {
    return xieyuValidation;
  }

  const activeSkillCount = getActiveSkillCount(player, action.skillId);
  if (
    !free && play.usesPerGame &&
    getSkillUseCount(player, action.skillId) >= (getSkillUseLimit(player, action.skillId) ?? play.usesPerGame * activeSkillCount)
  ) {
    return invalid(`${skill.name} 已经达到本局使用次数上限`);
  }

  if (
    play.kind === "attack" &&
    (action.skillId !== DRAGON_BLOOD_FIELD_ID || getDragonBloodMode(getDragonBloodTotal(state, playerId)) !== "heal") &&
    state.config.firstTurnNoAttack &&
    state.roundTurnNumber === 1
  ) {
    return invalid("第一回合只能出饼或防御");
  }

  const cost = getEffectiveSkillActionCost(state, player, action);
  if (!validCakePayment(state, player, cost, action.antiCakeSpent ?? 0, action.youkaiCakeSpent)) {
    return invalid(`饼不足，需要 ${cost} 个饼`);
  }

  const forcedAreaSkillAttack = isActionEffectivelyArea(state, playerId, action) ||
    action.skillId === HOUND_SUMMON_ID && houndBiteIsArea(player);
  if (action.skillId !== BUBBLE_FINALE && action.skillId !== PURPLE_FORESIGHT_ID && action.skillId !== SHADOW_WIND_DANCE_ID && action.skillId !== SHADOW_FOLLOW_ID &&
    !forcedAreaSkillAttack && play.targetMode !== "all" &&
    (play.kind === "attack" || action.skillId === CHAOS_EXILE_ID || play.targetMode === "single") &&
    getActionTargetIds(action).some((id) => !canBypassTargetSelection(state, playerId, findPlayer(state, id)) &&
      preventsTargetSelection(findPlayer(state, id))))
    return invalid("该玩家当前无法被选中");
  if (getActionTargetIds(action).some((id) => state.totems?.some((totem) => totem.id === id)) &&
    (forcedAreaSkillAttack || !canSkillSelectTotem(action.skillId)))
    return invalid("该技能不能指定图腾");
  if (play.kind === "attack" && action.skillId !== "1035" && !forcedAreaSkillAttack && play.targetMode !== "all" &&
    getActionTargetIds(action).some((id) => hasChaosDefenseLock(player, id)))
    return invalid("混乱世纪：你的防御值归零前不能攻击这个目标");
  if (action.skillId === HELL_OVERLORD_SKILL_ID) {
    const hellTargetValidation = validateHellOverlordTarget(
      state,
      playerId,
      action,
      pendingDeathWindow,
      pendingDeathPlayer
    );
    if (!hellTargetValidation.ok) {
      return hellTargetValidation;
    }
  } else if (action.skillId === BLOOD_RITUAL_FUSION_ID) {
    const ids = normalizeTargetIds(action);
    const opponents = state.players.filter((target) => target.id !== playerId && target.status === "alive" &&
      canAffectAcrossSpace(state, playerId, target.id));
    const count = Math.min(2, opponents.length);
    if (!count || ids.length !== count || ids.some((id) => !opponents.some((target) => target.id === id) ||
      (!hasWindTrace(findPlayer(state, id), playerId) && preventsTargetSelection(findPlayer(state, id)))))
      return invalid(count === 1 ? "祭天需要选择唯一的其他存活玩家" : "祭天需要两名不同的其他可选存活玩家");
  } else if (isHunyaoPursuit(action.skillId)) {
    if (!getHunyaoPursuitTargets(state, action.skillId).some((target) => target.id === action.targetId)) {
      return invalid(`${skill.name}需要选择一名符合条件、已结束常规复活判定的玩家`);
    }
  } else if (action.skillId === "1067") {
    const lishangTargetValidation = validateLishangTargets(state, playerId, action);
    if (!lishangTargetValidation.ok) {
      return lishangTargetValidation;
    }
  } else if (action.skillId === "1110") {
    const balanceTargetValidation = getSelectableJunengTarget(state, player.spaceId) ? valid() : validateBalanceTargets(state, playerId, action);
    if (!balanceTargetValidation.ok) {
      return balanceTargetValidation;
    }
  } else if (action.skillId === "1034") {
    const lightningTargetValidation = getSelectableJunengTarget(state, player.spaceId) ? valid() : validateLightningSpellTargets(state, playerId, action);
    if (!lightningTargetValidation.ok) {
      return lightningTargetValidation;
    }
  } else if (action.skillId === "1078" && !forcedAreaSkillAttack) {
    const rocketTargetValidation = validateRocketTargets(state, playerId, action);
    if (!rocketTargetValidation.ok) {
      return rocketTargetValidation;
    }
  } else if (action.skillId === "1035" || action.skillId === UTOPIA_MOVE_ID) {
    const electricShockTargetValidation = validateElectricShockTargets(state, player, action);
    if (!electricShockTargetValidation.ok) {
      return electricShockTargetValidation;
    }
  } else if (isHurricane(action.skillId) && !hasTianyeWing(player, TIAN_YE_FALL_ID, state.turnNumber)) {
    const ids = normalizeTargetIds(action);
    if (!validHurricaneTargets(state, player, ids) || ids.some((id) => !hasWindTrace(findPlayer(state, id), playerId) &&
      preventsTargetSelection(findPlayer(state, id))))
      return invalid("飓风须选择同空间连续的 1 至 3 名其他存活玩家");
  } else if (VORTEX_SKILL_IDS.has(action.skillId) && !forcedAreaSkillAttack) {
    const vortexTargetValidation = validateVortexTargets(state, action);
    if (!vortexTargetValidation.ok) {
      return vortexTargetValidation;
    }
  } else if (action.skillId === DRAGON_BLOOD_FIELD_ID && !hasTianyeWing(player, TIAN_YE_FALL_ID, state.turnNumber)) {
    const mode = getDragonBloodMode(getDragonBloodTotal(state, playerId));
    if (mode === "single") {
      const targetId = getSelectableJunengTarget(state, player.spaceId) ?? action.targetIds?.[0] ?? action.targetId;
      if (!targetId || !isAliveTarget(state, targetId) || (action.targetIds?.length ?? 0) > 1)
        return invalid("总血量超过100，鲜血金龙领域必须指定一名存活玩家");
    }
  } else if (play.optionalTargetCount !== undefined) {
    const targets = action.targetIds ?? [];
    if (targets.length > play.optionalTargetCount || new Set(targets).size !== targets.length || targets.some((id) => !isAliveTarget(state, id))) {
      return invalid(`请选择至多${play.optionalTargetCount}名不同的存活玩家`);
    }
  } else if (play.targetMode === "single" && ![FALLEN_SPLENDOR_EXECUTION, FALLEN_SPLENDOR_RELEASE].includes(action.skillId) &&
    !forcedAreaSkillAttack && !(action.skillId === "1093" && starWheelCanRedirect(player))) {
    if (action.skillId === WIND_SCOUT_ID && action.targetId === playerId) return invalid("风·探查须选择其他玩家");
    if (action.skillId === SAND_DESOLATION_ID && action.targetId === playerId) return invalid("尘埃寂灭须指定其他玩家");
    if (!action.targetId) {
      return invalid("技能必须指定目标");
    }

    if (!isAliveTarget(state, action.targetId) && !targetableTotems(state, player).some(({ id }) => id === action.targetId)) {
      return invalid("技能目标不存在或已死亡");
    }
  }

  const exposedTargetValidation = validateExposedSkillTarget(
    state,
    playerId,
    action,
    skill
  );
  if (!exposedTargetValidation.ok) {
    return exposedTargetValidation;
  }

  return valid();
}

function needsExposedSkillTarget(skill: NonNullable<ReturnType<typeof getSkill>>): boolean {
  return skill.id === "1004" || (skill.description.includes("暴露") && skill.description.includes("技能"));
}

/** Dedicated player, card and seat selections cannot be satisfied by a creation. */
export function canSkillSelectTotem(skillId: SkillId): boolean {
  const skill = getSkill(skillId);
  return Boolean(skill?.play?.targetMode === "single" &&
    !needsExposedSkillTarget(skill) &&
    skill.name !== "魔域" && !isTotemCreation(skillId) &&
    ![HELL_OVERLORD_SKILL_ID, BLOOD_RITUAL_FUSION_ID, "1067", "1110", "1034", "1093",
      HEALING_ART_ID, CHARITY_QUICK_ID, CHARITY_LINK_ID, TIME_REWIND_ID, DRAGON_BLOOD_FIELD_ID,
      HOUND_SUMMON_ID, SHADOW_FOLLOW_ID, SHADOW_WIND_DANCE_ID, WIND_PURSUIT_ID,
      PURPLE_FORESIGHT_ID, PURPLE_INSIGHT_ID, CURTAIN_FINALE_ID, THORN_PIERCE_ID].includes(skillId) &&
    !isHunyaoPursuit(skillId) && !isHurricane(skillId) && !isTargetedDemonSummon(skillId) &&
    !VORTEX_SKILL_IDS.has(skillId));
}

function validateExposedSkillTarget(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  skill: NonNullable<ReturnType<typeof getSkill>>
): ValidationResult {
  if (skill.play?.effect === "sand_transform" || skill.id === "1067") {
    return valid();
  }

  if (!needsExposedSkillTarget(skill)) {
    return valid();
  }

  if (!action.targetId || !action.targetSkillId) {
    return invalid(`${skill.name} 必须选择一个已暴露技能作为目标`);
  }

  const target = findPlayer(state, action.targetId);
  if (!target || target.status !== "alive") {
    return invalid("技能目标不存在或已死亡");
  }

  if (!getOwnedSkillIds(target).includes(action.targetSkillId)) {
    return invalid("目标玩家没有这个技能");
  }

  if (!canPlayerSeeSkill(state, playerId, action.targetId, action.targetSkillId)) {
    return invalid("你当前视野里看不到这个技能");
  }

  if (skill.id === MIRROR_SKILL_ID && getFusionRecipe(action.targetSkillId)) return invalid("普通镜像只能复制小技能，二融合请使用天魔舞入口");
  if (skill.id === getFusionSkillId("天魔舞") && (getFusionTier(action.targetSkillId) !== 2 || action.targetSkillId === skill.id)) {
    return invalid("天魔舞只能复制其他已暴露二融合，不能自我复制");
  }

  if (skill.id === "1004") {
    const targetSkill = getSkill(action.targetSkillId);
    if (!skillHasTypeTag(targetSkill, "锁定技") ||
      (action.targetSkillId.startsWith(DEAD_REALM_CARD_ID) && !target.bigCards?.some((card) =>
        !card.deadRealmUnlocked && bigCardHasAbility(card, action.targetSkillId!)))) {
      return invalid("封印只能选择已暴露的锁定技");
    }
  }

  return valid();
}

function validateSandTransformTarget(
  state: GameState,
  player: PlayerState,
  action: SkillAction,
  skill: NonNullable<ReturnType<typeof getSkill>>
): ValidationResult {
  if (skill.play?.effect !== "sand_transform") {
    return valid();
  }

  if (!action.targetSkillId) {
    return invalid("沙子必须选择一个小技能作为变化目标");
  }

  if (skill.id === getFusionSkillId("猥琐小叔叔") && !isFusionPreparation(state)) return invalid("猥琐小叔叔只能在开局准备选择技能");
  if (!getAcquisitionSkillChoices(player, skill.id).includes(action.targetSkillId)) {
    return invalid("只能选择此入口允许的技能，不能自我复制或重复选择素材");
  }

  if (!getSkill(action.targetSkillId)) {
    return invalid("沙子的变化目标不存在");
  }

  return valid();
}

function validateCoagulationIntervalUse(
  player: { skills: SkillId[]; buffs: Array<{ id: string; stacks?: number }> },
  action: SkillAction,
  roundNumber: number,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== "1046") {
    return valid();
  }

  const used =
    player.buffs.find((buff) => buff.id === coagulationIntervalBuffId(roundNumber, timingPhase))
      ?.stacks ?? 0;
  if (used > 0) {
    return invalid("凝血之力不能在同一个轮间重复使用");
  }

  return valid();
}

function validateFlashDodgeUse(
  player: { skills: SkillId[]; buffs: Array<{ id: string; expiresAtRound?: number }> },
  action: SkillAction,
  timingPhase: SkillTimingPhase,
  roundNumber: number
): ValidationResult {
  if (action.skillId !== FLASH_DODGE_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("闪现只能在变招阶段使用");
  }

  if (!getFlashFamilySlots(player, roundNumber).some((slot) => slot.kind === "flash" && slot.ready <= roundNumber)) {
    return invalid("闪现仍在冷却中");
  }

  return valid();
}

function validateSixStarUse(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== SIX_STAR_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_damage_modify") {
    return invalid("六芒星只能在变伤阶段使用");
  }

  if (!getHighestPendingDamageItem(state, playerId)) {
    return invalid("六芒星需要你当前有即将承受的伤害");
  }

  return valid();
}

function validateDamageRedirectTarget(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== "1093") {
    return valid();
  }

  if (timingPhase !== "turn_damage_modify") {
    return invalid("斗转星移只能在变伤阶段使用");
  }

  const player = findPlayer(state, playerId)!;
  const automatic = starWheelCanRedirect(player);
  if (action.starWheelStatusId) return automatic && !action.targetDamageId && action.stacks === 1 &&
    starWheelStatusChoices(state, player).some(({ id }) => id === action.starWheelStatusId) ? valid() : invalid("请选择待结算的不良或印记");
  if (!automatic && !action.targetId) {
    return invalid("斗转星移必须选择转移目标");
  }

  if (!automatic && !isAliveTarget(state, action.targetId!)) {
    return invalid("斗转星移目标不存在或已死亡");
  }

  if (!action.targetDamageId) {
    return invalid("斗转星移必须选择一条即将承受的伤害");
  }

  const damage = state.pendingDamageItems?.find(
    (item) =>
      item.id === action.targetDamageId &&
      item.targetId === playerId &&
      !getActiveSkillCount(findPlayer(state, item.sourceId ?? ""), FALLEN_SPLENDOR_PIERCE) &&
      isDamageWithinLimit(item, fromLegacyCombatStat(getDamageRedirectLimit(findPlayer(state, playerId)!))) &&
      (automatic || !(item.redirectedByPlayerIds ?? []).includes(playerId))
  );
  if (!damage) {
    return invalid("这条伤害不能被斗转星移转移");
  }

  return valid();
}

function validateDamageMarkUse(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== ICE_RAIN_SKILL_ID && action.skillId !== CROSS_GUARD_SKILL_ID && action.skillId !== CRYSTAL_GUARD_ID) {
    return valid();
  }

  if (timingPhase !== "turn_damage_modify") {
    return invalid("印记只能在变伤阶段使用");
  }

  if (!action.targetDamageId) {
    return invalid("必须选择一条即将承受的伤害");
  }

  const damage = state.pendingDamageItems?.find((item) => item.id === action.targetDamageId);
  if (!damage || damage.amount <= 0) {
    return invalid("这条伤害不存在或不能被印记影响");
  }
  if (!isAttackDamageItem(damage)) return invalid("十字与冰雨印记只能作用于攻击伤害");
  if (action.skillId === CRYSTAL_GUARD_ID) {
    const count = action.crystalMarkCount ?? 1;
    return damage.targetId === playerId && !damage.internalDamage && !hasDamageModifier(damage, "huyou") &&
      Number.isSafeInteger(count) && count > 0 && count <= crystalGuardMarkCount(player) ? valid() :
      invalid("请选择自己将承受的攻击伤害和有效的护佑印记层数");
  }

  if (action.skillId === ICE_RAIN_SKILL_ID) {
    if (
      damage.targetId !== playerId ||
      !damage.sourceId ||
      damage.sourceId === playerId ||
      hasDamageModifier(damage, "ice_rain") ||
      !findPlayer(state, damage.sourceId)?.buffs.some(
        (buff) => buff.id === `ice_rain:${playerId}` && buff.stacks > 0
      )
    ) {
      return invalid("这条伤害不能使用冰雨印记");
    }
    return valid();
  }

  if (damage.targetId === playerId) {
    if (damage.internalDamage) return invalid("反噬伤害不能使用护佑减伤");
    if (
      hasDamageModifier(damage, "huyou") ||
      !player.buffs.some((buff) => buff.id === "huyou_mark" && buff.stacks > 0)
    ) {
      return invalid("这条伤害不能使用护佑印记");
    }
    return valid();
  }

  if (
    hasDamageModifier(damage, "cross") ||
    !player.buffs.some((buff) => buff.id === "cross_mark" && buff.stacks > 0) ||
    !areAdjacentAlivePlayers(state, playerId, damage.targetId)
  ) {
    return invalid("这条伤害不能使用十字印记");
  }

  return valid();
}

function validateShunshouStealChoice(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== SHUNSHOU_STEAL_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "opening_action") {
    return invalid("顺手牵羊只能在开局阶段选择技能");
  }

  if (!action.targetSkillId) {
    return invalid("顺手牵羊必须选择要获得的技能");
  }

  const choices = (state.pendingSkillChoices ?? []).filter(
    (choice) => choice.kind === "steal_skill" && choice.playerId === playerId
  );
  if (!choices.some((choice) => choice.skillId === action.targetSkillId)) {
    return invalid("顺手牵羊只能选择开局获知的技能");
  }

  return valid();
}

function validateXieyuTarget(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== XIEYU_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_end_action") return invalid("邪域只能在到期轮的回合末选择目标");

  if (!action.targetId) {
    return invalid("邪域必须选择吸取目标");
  }

  if (action.targetId === playerId) {
    return invalid("邪域不能吸取自己");
  }

  if (!isAliveTarget(state, action.targetId)) {
    return invalid("邪域目标不存在或已死亡");
  }

  const player = state.players.find((item) => item.id === playerId);
  const selectedCount = player?.buffs.filter((buff) => buff.id === "xieyu_target").length ?? 0;
  if (!player || selectedCount >= getDueXieyuCount(player, state.roundNumber)) {
    return invalid("本轮邪域目标已经选择完毕");
  }

  return valid();
}

function hasDamageModifier(
  damage: NonNullable<GameState["pendingDamageItems"]>[number],
  modifierId: string
): boolean {
  return Boolean(damage.damageModifierIds?.includes(modifierId));
}

function areAdjacentAlivePlayers(state: GameState, playerId: PlayerId, otherPlayerId: PlayerId): boolean {
  return getCombatSeatDistance(getCombatSeatGroups(state, findPlayer(state, playerId)?.spaceId), playerId, otherPlayerId) === 1;
}

function getHighestPendingDamageItem(
  state: GameState,
  playerId: PlayerId
): NonNullable<GameState["pendingDamageItems"]>[number] | undefined {
  return (state.pendingDamageItems ?? [])
    .filter((item) => item.targetId === playerId && isDamageWithinLimit(item, INFINITY_VALUE) && !item.bypassDamageImmunity &&
      !ignoresSkill(item.targetSkillIgnore, SIX_STAR_SKILL_ID))
    .sort((a, b) => compareCombatValues(pendingDamageValue(b), pendingDamageValue(a)))[0];
}

function validateAttackStatModifier(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== "1044" && action.skillId !== "1090") {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("这个技能只能在变招阶段使用");
  }

  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const pendingAction = state.pendingActions[playerId]?.actions[actionIndex];
  if (!pendingAction || !isAttackLikeAction(pendingAction)) {
    return invalid("请选择一个当前已经亮出的攻击");
  }

  if (action.skillId === "1090") {
    const modifier = action.attackStatModifier ?? "swap_power_level";
    if (!getLevelSwapModifiers(player, pendingAction).includes(modifier)) return invalid(hasEnhancedLevelSwap(player)
      ? "无耗饼攻击没有耗饼数值，不能交换所选数值" : "普通级换只能交换攻击和等级");
    const preview = previewPlayerAttackStats(state, playerId, { id: "candidate", actionIndex,
      modifier, enhanced: hasEnhancedLevelSwap(player) });
    const failure = preview.failures.find((item) => item.id === "candidate");
    if (failure) return invalid(failure.error);
    return valid();
  }

  if (
    getDestroyPowerCooldownCount(player, state.roundNumber) >=
    getActiveSkillCount(player, "1044")
  ) {
    return invalid("毁灭之力仍在冷却中");
  }
  if (pendingAction.type === "skill" && pendingAction.skillId === ASURA_SWORD_ID &&
    player.buffs.some((buff) => buff.id === ASURA_SACRIFICE && buff.expiresAtTurn === state.turnNumber + 1))
    return invalid("最后一条命已献出");

  if (
    !action.attackStatModifier ||
    !getDestructionModifiers(player).includes(action.attackStatModifier)
  ) {
    return invalid("毁灭之力必须选择一种攻击/等级变化");
  }

  return valid();
}

function validateDoubleEdgeSword(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== DOUBLE_EDGE_SWORD_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("双刃剑只能在变招阶段使用");
  }

  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const pendingAction = state.pendingActions[playerId]?.actions[actionIndex];
  if (!pendingAction || !isAttackLikeAction(pendingAction)) {
    return invalid("双刃剑必须选择你当前已亮出的攻击");
  }

  const targetId = getPrimaryActionTargetId(pendingAction);
  if (!targetId) {
    return invalid("双刃剑只能用于指向单个目标的攻击");
  }

  const targetAction = getDefensiveAction(state.pendingActions[targetId]);
  if (targetAction?.type !== "defense" || targetAction.defense === "rebound") {
    return invalid("双刃剑只能无视非反弹的防御出招");
  }

  const stats = getDoubleEdgeAttackStats(state, playerId, pendingAction);
  if (!stats || !canActionDefend(targetAction, stats.defenseTag)) {
    return invalid("目标的防御出招没有防住这次攻击，不能使用双刃剑");
  }

  if (Boolean(getAttackFieldBlocker(state, playerId, stats, action.targetId))) {
    return invalid("这次攻击已被全局效果无效化，不能使用双刃剑");
  }

  if (
    player.buffs.some((buff) => {
      const parsed = parseDoubleEdgeIgnoreDefenseBuff(buff.id);
      return parsed?.actionIndex === actionIndex && parsed.targetId === targetId;
    })
  ) {
    return invalid("这次攻击已经使用过双刃剑");
  }

  return valid();
}

function validateDoubleEdgeSwordV2(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== DOUBLE_EDGE_SWORD_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("双刃剑只能在变招阶段使用");
  }

  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const pendingAction = state.pendingActions[playerId]?.actions[actionIndex];
  if (!pendingAction || !isAttackLikeAction(pendingAction)) {
    return invalid("双刃剑必须选择你当前已亮出的攻击");
  }

  const stats = getDoubleEdgeAttackStats(state, playerId, pendingAction);
  const mode = action.doubleEdgeMode ?? "ignore_defense";
  const blade = selectBrokenBladeDoubleEdge(player, mode, action.bigCardInstanceId);
  if (action.bigCardInstanceId && !blade) return invalid("所选战刃当前没有可用的双刃剑");
  const trueBlade = blade && getBrokenBlade(blade).tier === 4 && !hasLingtaField(state, player.id);
  if (mode === "pierce_rebound") {
    if (hasLingtaField(state, player.id) || getFusionEnhancementCount(player, DOUBLE_EDGE_SWORD_SKILL_ID, ["破天圣剑"]) <= 0)
      return invalid("当前双刃剑没有破弹能力");
    if (player.buffs.some((buff) => buff.id === `double_edge_pierce:${actionIndex}`)) return invalid("这个攻击已经使用过双刃剑破弹");
    return stats && (trueBlade || !getAttackFieldBlocker(state, playerId, stats, action.targetId)) ? valid() : invalid("这个攻击当前不能破弹");
  }
  if (mode === "ignore_all_defense" && getFusionEnhancementCount(player, DOUBLE_EDGE_SWORD_SKILL_ID, ["破军"]) <= 0) return invalid("当前双刃剑没有群破防能力");
  if (mode !== "ignore_defense" && mode !== "ignore_all_defense") return invalid("双刃剑模式无效");
  if (mode === "ignore_all_defense" && player.buffs.some((buff) => buff.id === `double_edge_group:${actionIndex}`)) return invalid("这个攻击已经群破防");
  const targetIds = !stats ? [] : trueBlade && mode === "ignore_defense" ?
    getActionAttackTargetIds(state, playerId, pendingAction) : getDoubleEdgeAttackTargetIds(state, playerId, pendingAction, stats);
  const targetId =
    action.targetId ??
    findFirstDoubleEdgeDefendedTarget(state, player, actionIndex, targetIds, stats) ??
    (targetIds.length === 1 ? targetIds[0] : getPrimaryActionTargetId(pendingAction));
  if (!targetId || !targetIds.includes(targetId)) {
    return invalid(trueBlade && mode === "ignore_defense" ? "双刃剑必须选择这次攻击的目标" : "双刃剑必须选择这次攻击目标中防住你的玩家");
  }

  const targetAction = getDefensiveActionForDoubleEdge(state, player, targetId);
  if (!(trueBlade && mode === "ignore_defense") && (
    !targetAction ||
    targetAction.type === "attack" ||
    targetAction.type === "skill" ||
    (targetAction.type === "defense" && targetAction.defense === "rebound")
  )) {
    return invalid("双刃剑只能无视非反弹的防御出招或饼防");
  }

  if (!stats || !(trueBlade && mode === "ignore_defense") && !canActionDefend(targetAction, stats.defenseTag)) {
    return invalid("目标的出招没有防住这次攻击，不能使用双刃剑");
  }

  if (!(trueBlade && mode === "ignore_defense") && getAttackFieldBlocker(state, playerId, stats, action.targetId)) {
    return invalid("这次攻击已被全局效果无效化，不能使用双刃剑");
  }

  if (
    player.buffs.some((buff) => {
      const parsed = parseDoubleEdgeIgnoreDefenseBuff(buff.id);
      return parsed?.actionIndex === actionIndex && parsed.targetId === targetId;
    })
  ) {
    return invalid("这次攻击对该目标已经使用过双刃剑");
  }

  return valid();
}

function validateLiegongCross(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== LIEGONG_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("烈弓只能在变招阶段使用");
  }

  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const pendingAction = state.pendingActions[playerId]?.actions[actionIndex];
  if (!pendingAction || !isAttackLikeAction(pendingAction)) {
    return invalid("烈弓必须选择你当前已亮出的攻击");
  }

  const stats = getDoubleEdgeAttackStats(state, playerId, pendingAction);
  const targetIds = stats
    ? getDoubleEdgeAttackTargetIds(state, playerId, pendingAction, stats)
    : [];
  const targetId =
    action.targetId ??
    findFirstLiegongCounterTarget(state, player, actionIndex, targetIds);
  if (!targetId || !targetIds.includes(targetId)) {
    return invalid("烈弓必须选择这次攻击中与你相向攻击的玩家");
  }

  if (hasQueuedLiegongCross(player, actionIndex, targetId)) {
    return invalid("这次攻击对该目标已经使用过烈弓");
  }

  if (!hasIncomingAttackFromTarget(state, targetId, playerId)) {
    return invalid("目标玩家没有对你使用可交错的攻击");
  }

  return valid();
}

function validateAbsoluteGuard(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== ABSOLUTE_GUARD_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("绝对守护只能在变招阶段使用");
  }

  const candidate = getAbsoluteGuardCandidate(state, playerId, action);
  if (!candidate) {
    return invalid("绝对守护必须选择本回合将要攻击你的攻击");
  }

  const source = findPlayer(state, candidate.sourceId);
  if (!source || hasAbsoluteGuardQueued(source, candidate.actionIndex)) {
    return invalid("这次攻击已经被绝对守护改变过");
  }

  if (!validCakePayment(state, player, candidate.cost, action.antiCakeSpent ?? 0, action.youkaiCakeSpent)) {
    return invalid(`饼不足，绝对守护需要 ${candidate.cost} 个饼`);
  }

  return valid();
}

function getAbsoluteGuardCandidate(
  state: GameState,
  guardPlayerId: PlayerId,
  action: SkillAction
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

  const stats = getDoubleEdgeAttackStats(state, sourceId, sourceAction);
  if (!stats) {
    return undefined;
  }

  const targetIds = getDoubleEdgeAttackTargetIds(state, sourceId, sourceAction, stats);
  if (!targetIds.includes(guardPlayerId)) {
    return undefined;
  }

  const area = stats.isArea || isActionForcedArea(state, sourceId, sourceAction, stats);
  const guard = findPlayer(state, guardPlayerId)!;
  if (action.absoluteGuardToSky && (!area || getFusionEnhancementCount(guard, ABSOLUTE_GUARD_SKILL_ID, ["绝对天盾"]) <= 0)) return undefined;
  const mode = area ? action.absoluteGuardToSky ? "area_to_sky" : "area_to_self" : "single_to_area";
  const rawCost =
    sourceAction.type === "attack"
      ? getAttackActionCost(state, source, sourceAction)
      : getEffectiveSkillActionCost(state, source, sourceAction);
  return {
    sourceId,
    actionIndex,
    mode,
    cost: discountCakeCost(state, guard, getAbsoluteGuardCost(guard, payableAttackCost(stats.cost)))
  };
}

function isActionEffectivelyArea(
  state: GameState,
  sourceId: PlayerId,
  action: PlayerAction
): boolean {
  const stats = getBaseAttackStatsForAction(action);
  const source = findPlayer(state, sourceId);
  return Boolean(stats && (isHigherFusionAreaAttack(source, stats.id) || applyHunyaoRiStats(source, stats).isArea ||
    isActionForcedArea(state, sourceId, action, stats)));
}

function getBaseAttackStatsForAction(action: PlayerAction): AttackStats | undefined {
  if (action.type === "attack") {
    const definition = BASE_ATTACKS[action.attackId];
    return definition ? getStackedAttackStats(definition, action.stacks) : undefined;
  }

  if (action.type === "skill") {
    return getChaosExileStats(action) ?? getSkillAttackStats(action.skillId, action.stacks);
  }

  return undefined;
}

function isActionForcedArea(
  state: GameState,
  sourceId: PlayerId,
  action: PlayerAction,
  stats: AttackStats
): boolean {
  if ([FALLEN_SPLENDOR_EXECUTION, SPACE_BURST, TIME_RIFT].includes(stats.id)) return false;
  if (!stats.nonAttackMove && stats.id !== "1035" && hasTianyeWing(findPlayer(state, sourceId), TIAN_YE_FALL_ID, state.turnNumber)) return true;
  if (stats.id === SAND_DESOLATION_ID) return false;
  const source = findPlayer(state, sourceId);
  const isElectricShockAction =
    action.type === "skill" && action.skillId === "1035";
  return Boolean(
    !isElectricShockAction &&
      !stats.nonAttackMove &&
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

function findFirstLiegongCounterTarget(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number,
  targetIds: PlayerId[]
): PlayerId | undefined {
  return targetIds.find(
    (targetId) =>
      !hasQueuedLiegongCross(player, actionIndex, targetId) &&
      hasIncomingAttackFromTarget(state, targetId, player.id)
  );
}

function hasIncomingAttackFromTarget(
  state: GameState,
  sourceId: PlayerId,
  targetId: PlayerId
): boolean {
  const plan = state.pendingActions[sourceId];
  if (!plan) {
    return false;
  }

  return plan.actions.some((action) => {
    if (!isAttackLikeAction(action)) {
      return false;
    }

    const stats = getDoubleEdgeAttackStats(state, sourceId, action);
    return stats
      ? getDoubleEdgeAttackTargetIds(state, sourceId, action, stats).includes(targetId)
      : false;
  });
}

function hasQueuedLiegongCross(
  source: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number,
  targetId: PlayerId
): boolean {
  const prefix = `${LIEGONG_CROSS_BUFF_PREFIX}${actionIndex}:${targetId}:`;
  return source.buffs.some((buff) => buff.id.startsWith(prefix));
}

function getDoubleEdgeAttackStats(
  state: GameState,
  playerId: PlayerId,
  action: PlayerAction
): AttackStats | undefined {
  const index = state.pendingActions[playerId]?.actions.indexOf(action) ?? -1;
  const preview = previewPlayerAttackStats(state, playerId).stats[index];
  if (preview) return preview;
  const base =
    action.type === "attack"
      ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks)
      : action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack"
        ? getSkillAttackStats(action.skillId, action.stacks)
        : undefined;
  if (!base) {
    return undefined;
  }

  return applyAttackModifiers(cloneGameState(state), playerId, base, index);
}

export function chaosWaveChoices(view: GameState | PublicGameState, playerId: PlayerId): Array<{ index: number; action: PlayerAction }> {
  const state = ("pendingActions" in view ? view : { ...view, pendingActions: view.revealedActions ?? {} }) as GameState;
  const source = findPlayer(state, playerId);
  return (state.pendingActions[playerId]?.actions ?? []).flatMap((action, index) => {
    if (getChaosWave(source, index, state.turnNumber)) return [];
    const play = action.type === "skill" ? getSkillPlay(action.skillId) : undefined;
    const selected = "targetId" in action ? [action.targetId] : [];
    if ("targetIds" in action) selected.push(...(action.targetIds ?? []));
    const hasTarget = (id: PlayerId | undefined) => id && id !== playerId &&
      findPlayer(state, id)?.status === "alive" && canAffectAcrossSpace(state, playerId, id);
    const scatters = action.type === "defense" && action.defense === "rebound" && playerHasActiveSkill(source, "1057");
    const eligible = getActionAttackTargetIds(state, playerId, action).some(hasTarget) ||
      (action.type === "defense" && (selected.some(hasTarget) || scatters && state.players.some(({ id }) => hasTarget(id)))) ||
      (action.type === "skill" && play?.kind === "effect" &&
        (play.targetMode === "all" ? state.players.some(({ id }) => hasTarget(id)) : selected.some(hasTarget)));
    return eligible ? [{ index, action }] : [];
  });
}

export function getActionAttackTargetIds(state: GameState, sourceId: PlayerId, action: PlayerAction): PlayerId[] {
  if (action.type === "skill" && action.skillId === BUBBLE_FINALE) return getActionTargetIds(action);
  const source = findPlayer(state, sourceId);
  const raw = demonAttackStats(source, action, getBaseAttackStatsForAction(action));
  const base = raw && shapeDragonBloodAttack(state, sourceId, action, raw);
  if (!base) return [];
  const forcedHound = evilHoundTarget(state, source);
  if (forcedHound) return [forcedHound.id];
  // Preview modifiers may consume pending marks; copy player buffers without cloning the growing event history.
  const preview = { ...state, players: state.players.map((player) => ({ ...player, buffs: player.buffs.map((buff) => ({ ...buff })) })) };
  const actionIndex = state.pendingActions[sourceId]?.actions.indexOf(action) ?? -1;
  const stats = applyAttackModifiers(preview, sourceId, base, actionIndex);
  const index = state.pendingActions[sourceId]?.actions.indexOf(action) ?? -1;
  const override = source?.buffs.find((buff) => buff.id.startsWith(`absolute_guard:${index}:`));
  if (override) {
    const [mode, guardId] = override.id.slice(`absolute_guard:${index}:`.length).split(":");
    if (mode === "area_to_sky") return [];
    if (mode === "area_to_self" && guardId) {
      return canAffectAcrossSpace(state, sourceId, guardId) ?
        getHunyaoExpandedTargets(state, sourceId, { ...stats, isArea: false }, [guardId]) ?? [guardId] : [];
    }
    if (mode === "single_to_area") return state.players.filter((player) => player.status === "alive" && player.id !== sourceId &&
      canAffectAcrossSpace(state, sourceId, player.id)).map((player) => player.id);
  }
  const targets = getDoubleEdgeAttackTargetIds(state, sourceId, action, stats).filter((id) => canAffectAcrossSpace(state, sourceId, id));
  const isArea = stats.isArea || isActionForcedArea(state, sourceId, action, stats);
  const expanded = getHunyaoExpandedTargets(state, sourceId, { ...stats, isArea }, targets);
  const bodyTargets = (isArea || expanded) && !stats.nonAttackMove && stats.id !== "1035"
    ? reachableEmptyCityBodies(state, sourceId).map(({ id }) => id) : [];
  return [...new Set([...(expanded ?? targets), ...bodyTargets])].filter((id) =>
    (stats.nonAttackMove || stats.id === "1035" || !hasChaosDefenseLock(source, id)) &&
    (!source || stats.nonAttackMove || stats.id === "1035" || !getActiveSkillCount(source, LONE_STAR_PASSIVE_ID) || loneStarFarthest(state, source).includes(id)) &&
    (isArea || expanded || canBypassTargetSelection(state, sourceId, findPlayer(state, id)) ||
      !preventsTargetSelection(findPlayer(state, id))))
    .map((id) => demonMoveTarget(state, sourceId, id, Boolean(isArea || expanded)));
}

function getDoubleEdgeAttackTargetIds(
  state: GameState,
  sourceId: PlayerId,
  action: PlayerAction,
  stats: AttackStats
): PlayerId[] {
  const source = findPlayer(state, sourceId);
  const forcedArea = isActionForcedArea(state, sourceId, action, stats);
  if (stats.isArea || forcedArea) {
    const targetIds = alivePlayers(state)
      .filter((player) => player.id !== sourceId || stats.includeSelf)
      .map((player) => player.id);
    return filterPutianTongqingBlindSpotTargetIds(state, sourceId, targetIds, !stats.nonAttackMove && stats.id !== "1035");
  }

  if (action.type === "skill" && (MULTI_TARGET_ATTACK_SKILL_IDS.has(action.skillId) || isHurricane(action.skillId))) {
    return Array.from(
      new Set([...(action.targetIds ?? []), action.targetId].filter(Boolean) as PlayerId[])
    );
  }

  const targetId = getPrimaryActionTargetId(action);
  return targetId ? [targetId] : [];
}

function filterPutianTongqingBlindSpotTargetIds(
  state: GameState,
  sourceId: PlayerId,
  targetIds: PlayerId[],
  isAttack: boolean
): PlayerId[] {
  const source = findPlayer(state, sourceId);
  if (isAttack && source && getActiveSkillCount(source, LONE_STAR_PASSIVE_ID)) {
    const farthest = loneStarFarthest(state, source);
    return targetIds.filter((id) => farthest.includes(id));
  }
  if (!playerHasActiveSkill(source, PUTIAN_TONGQING_SKILL_ID) || hasEnhancedPutianRange(source) || beastIgnoresDistance(source, state.turnNumber)) {
    return targetIds;
  }

  const farthest = getFarthestAlivePlayerIds(state, sourceId);
  if (farthest.size === 0) {
    return targetIds;
  }

  return targetIds.filter((targetId) => !farthest.has(targetId));
}

function getFarthestAlivePlayerIds(state: GameState, sourceId: PlayerId): Set<PlayerId> {
  const groups = getCombatSeatGroups(state, findPlayer(state, sourceId)?.spaceId);
  return new Set(participantCount(groups.flat()) > 3 ? getCombatFarthestPlayers(groups, sourceId).map(({ id }) => id) : []);
}

function findFirstDoubleEdgeDefendedTarget(
  state: GameState,
  source: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number,
  targetIds: PlayerId[],
  stats: AttackStats | undefined
): PlayerId | undefined {
  if (!stats) {
    return undefined;
  }

  return targetIds.find((targetId) => {
    if (hasQueuedDoubleEdgeTarget(source, actionIndex, targetId)) {
      return false;
    }

    const targetAction = getDefensiveActionForDoubleEdge(state, source, targetId);
    return (
      targetAction &&
      targetAction.type !== "attack" &&
      targetAction.type !== "skill" &&
      !(targetAction.type === "defense" && targetAction.defense === "rebound") &&
      canActionDefend(targetAction, stats.defenseTag)
    );
  });
}

function hasQueuedDoubleEdgeTarget(
  source: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number,
  targetId: PlayerId
): boolean {
  const prefix = `${DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX}${actionIndex}:${targetId}:`;
  return source.buffs.some((buff) => buff.id.startsWith(prefix));
}

function getPrimaryActionTargetId(action: PlayerAction): PlayerId | undefined {
  return "targetId" in action ? action.targetId : undefined;
}

function getDefensiveAction(plan: PlayerActionPlan | undefined): PlayerAction | undefined {
  return plan?.actions.find(
    (action) => action.type === "defense" || action.type === "gain_cake"
  );
}

function getDefensiveActionForDoubleEdge(
  state: GameState,
  source: NonNullable<ReturnType<typeof findPlayer>>,
  targetId: PlayerId
): PlayerAction | undefined {
  const actionWithIndex = getDefensiveActionWithIndex(state.pendingActions[targetId]);
  if (!actionWithIndex) {
    return undefined;
  }

  if (!playerHasActiveSkill(source, "1029")) {
    return actionWithIndex.action;
  }

  return (
    getOriginalDefenseBeforeQinggangIgnoredSwitch(
      state,
      targetId,
      actionWithIndex.actionIndex
    ) ?? actionWithIndex.action
  );
}

function getDefensiveActionWithIndex(
  plan: PlayerActionPlan | undefined
): { action: PlayerAction; actionIndex: number } | undefined {
  const actionIndex = plan?.actions.findIndex(
    (action) => action.type === "defense" || action.type === "gain_cake"
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
      (event.skillId === "1087" || event.skillId === "1088") &&
      event.actionIndex === actionIndex &&
      event.before.type === "defense"
  );

  return switchEvent?.type === "action_switched" ? switchEvent.before : undefined;
}

function isAttackGloballyBlockedForDoubleEdge(
  state: GameState,
  stats: AttackStats
): boolean {
  return (
    ((stats.level === 0 || stats.power === 0 || stats.power >= INFINITE_DAMAGE) &&
      hasActiveSkill(state, "1010")) ||
    (stats.power > 2 &&
      stats.power < 6 &&
      hasActiveSkill(state, "1041")) ||
    (stats.power > 4 && hasActiveSkill(state, "1042")) ||
    (stats.power < 4 && hasActiveSkill(state, "1043"))
  );
}

function hasActiveSkill(state: GameState, skillId: SkillId): boolean {
  return state.players.some(
    (player) => player.status === "alive" && playerHasActiveSkill(player, skillId)
  );
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

function coagulationIntervalBuffId(
  roundNumber: number,
  timingPhase: SkillTimingPhase
): string {
  return `coagulation_used_interval:${roundNumber}:${timingPhase}`;
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

function validateSkillResourceCost(
  player: PlayerState,
  action: SkillAction
): ValidationResult {
  const marks = getAttackMarkCount(player, action.skillId);
  if (marks !== undefined) return marks >= action.stacks ? valid() : invalid("印记不足");
  const resource = skillResourceRequirement(action.skillId);
  if (!resource) {
    return valid();
  }

  const available = player.buffs.find((buff) => buff.id === resource.buffId)?.stacks ?? 0;
  if (available < action.stacks) {
    return invalid(`${resource.name}不足，需要 ${action.stacks} 次`);
  }

  return valid();
}

function validateLianBaoFreeStacks(
  player: PlayerState,
  action: SkillAction
): ValidationResult {
  const charge = getFreeSkillChargeId(player, action.skillId);
  if (!charge) return action.freeStacks ? invalid("这个技能当前没有免费机会") : valid();

  const freeStacks = action.freeStacks ?? 0;
  if (!Number.isInteger(freeStacks) || freeStacks < 0) {
    return invalid("免费连爆重数必须是非负整数");
  }

  if (freeStacks > action.stacks) {
    return invalid("免费连爆重数不能超过总重数");
  }

  const available = player.buffs.find((buff) => buff.id === charge)?.stacks ?? 0;
  if (freeStacks > available) {
    return invalid(`免费连爆次数不足，需要 ${freeStacks} 次`);
  }

  return valid();
}

function skillResourceRequirement(skillId: string): { buffId: string; name: string } | undefined {
  if (skillId === "1036") {
    return { buffId: "guidao_charge", name: "鬼道次数" };
  }

  if (skillId === "1020") {
    return { buffId: "lava_mark", name: "熔岩印记" };
  }

  if (skillId === "1021") {
    return { buffId: "winter_mark", name: "凛冬印记" };
  }

  return undefined;
}

function getSkillUseCount(player: { buffs: Array<{ id: string; stacks: number }> }, skillId: string): number {
  return player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
}

function getEffectiveSkillActionCost(state: GameState, player: PlayerState, action: SkillAction): number {
  if (action.skillId === ABSOLUTE_GUARD_SKILL_ID) {
    const candidate = getAbsoluteGuardCandidate(state, player.id, action);
    if (candidate) return candidate.cost;
  }
  const swap = getActionSwitchPlan(state, player.id, action);
  if (swap) return swap.cost;
  return getTurnSkillActionCost(player, action, state);
}

function getActionTargetIds(action: AttackAction | SkillAction): PlayerId[] {
  if (
    action.type === "skill" &&
    (MULTI_TARGET_ATTACK_SKILL_IDS.has(action.skillId) || isHurricane(action.skillId))
  ) {
    return normalizeTargetIds(action);
  }

  return action.targetId ? [action.targetId] : [];
}

function normalizeTargetIds(action: SkillAction): PlayerId[] {
  return Array.from(
    new Set([...(action.targetIds ?? []), action.targetId].filter(Boolean) as PlayerId[])
  );
}

function actionTargetsSameSpace(state: GameState, playerId: PlayerId, action: PlayerAction): boolean {
  const targets = action.type === "skill" ? normalizeTargetIds(action) :
    "targetId" in action && action.targetId ? [action.targetId] : [];
  return targets.every((id) => {
    const target = findPlayer(state, id);
    if (state.totems?.some((totem) => totem.id === id)) return canAffectAcrossSpace(state, playerId, id);
    if (!target) return true;
    if (action.type === "skill" && action.skillId === SPACE_BURST && target.id !== playerId) return true;
    if (target.emptyCityOwnerId && action.type !== "attack" &&
      (action.type !== "skill" || getSkillPlay(action.skillId)?.kind !== "attack" || action.skillId === "1035")) return false;
    return canAffectAcrossSpace(state, playerId, id);
  }) &&
    (action.type !== "skill" || !action.switchToAction || actionTargetsSameSpace(state, playerId, action.switchToAction));
}

function validateRocketTargets(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  if (targetIds.length < 1 || targetIds.length > 2) {
    return invalid("火箭需要选择连续的 1 到 2 名目标");
  }

  if (targetIds.length === 1 && targetableTotems(state, findPlayer(state, playerId)).some(({ id }) => id === targetIds[0]))
    return valid();

  for (const targetId of targetIds) {
    if (!isAliveTarget(state, targetId)) {
      return invalid("火箭目标不存在或已死亡");
    }
  }

  if (
    targetIds.length === 2 &&
    !areCombatTargetsContiguous(alivePlayers(state), targetIds)
  ) {
    return invalid("火箭的两个目标必须是座次连续的玩家");
  }

  return valid();
}

function validateVortexTargets(
  state: GameState,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  if (targetIds.length < 1 || targetIds.length > 3) {
    return invalid("Vortex skills must choose 1 to 3 targets");
  }

  for (const targetId of targetIds) {
    if (!isAliveTarget(state, targetId)) {
      return invalid("Vortex target is not alive");
    }
  }

  if (!areCombatTargetsContiguous(alivePlayers(state), targetIds)) {
    return invalid("Vortex targets must be consecutive players");
  }

  return valid();
}

function validateElectricShockTargets(
  state: GameState,
  player: PlayerState,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  if (targetIds.length < 1 || targetIds.length > 2) {
    return invalid(`${getSkill(action.skillId)?.name ?? "技能"}需要选择 1 到 2 名目标`);
  }

  for (const targetId of targetIds) {
    if (!isAliveTarget(state, targetId) && !targetableTotems(state, player).some(({ id }) => id === targetId)) {
      return invalid("技能目标不存在、无法被选中或已死亡");
    }
  }

  return valid();
}

function validateBalanceTargets(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  if (targetIds.length !== 2) {
    return invalid("制衡必须选择除你外 2 名玩家");
  }

  for (const targetId of targetIds) {
    if (targetId === playerId) {
      return invalid("制衡不能选择自己");
    }

    if (!isAliveTarget(state, targetId)) {
      return invalid("制衡目标不存在或已死亡");
    }
  }

  return valid();
}

function validateLightningSpellTargets(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  const resolvedTargetIds = resolveLightningSpellTargetIds(
    state.players,
    playerId,
    targetIds
  );
  if (!resolvedTargetIds) {
    return invalid("雷电法术必须选择血量最高规则允许的 2 名目标");
  }

  if (resolvedTargetIds.length === 0) {
    return invalid("雷电法术没有可选择的目标");
  }

  return valid();
}

function validateLishangTargets(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  if (!action.targetId) {
    return invalid("离殇必须选择一名致死者");
  }

  if (!getFatalSourceIds(state, playerId).includes(action.targetId)) {
    return invalid("离殇只能选择本回合对你造成致死伤害的玩家");
  }

  const target = findPlayer(state, action.targetId);
  if (!target) {
    return invalid("离殇目标不存在或已死亡");
  }

  if (!action.targetSkillId) {
    return valid();
  }

  if (!target.skills.includes(action.targetSkillId)) {
    return invalid("目标玩家没有这个技能");
  }

  if (!getSmallSkillIds().includes(action.targetSkillId)) {
    return invalid("离殇只能丢弃已暴露小技能");
  }

  if (!canPlayerSeeSkill(state, playerId, action.targetId, action.targetSkillId)) {
    return invalid("离殇只能丢弃你当前视野里已暴露的技能");
  }

  return valid();
}

function validateHellOverlordTarget(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  pendingDeathWindow: boolean,
  pendingDeathPlayer: boolean
): ValidationResult {
  if (pendingDeathWindow) {
    if (!pendingDeathPlayer) {
      return invalid("复活阶段只有已死亡玩家可以使用地狱主宰自救");
    }

    if (action.targetId && action.targetId !== playerId) {
      return invalid("复活阶段的地狱主宰只能对自己使用");
    }

    return valid();
  }

  if (!action.targetId) {
    return invalid("地狱主宰必须选择一名死亡玩家");
  }

  if (action.targetId === playerId) {
    return invalid("地狱主宰只能在自己的复活阶段对自己使用");
  }

  const target = findPlayer(state, action.targetId);
  if (!target || target.status !== "dead" || target.defeatLevel !== 1) {
    return invalid("地狱主宰只能选择死亡玩家");
  }
  if (!canRecoverWithHpCap(target) || !canRecoverEmptyCity(target, findPlayer(state, playerId), HELL_OVERLORD_SKILL_ID))
    return invalid("这项技能无法恢复该玩家");

  if (hasNoRevive(target) && !(eraFireRevivalBypass(state, findPlayer(state, playerId), HELL_OVERLORD_SKILL_ID) &&
    !hasContinuationBlock(state, target, "revival", "all"))) {
    return invalid("被裂魂杀死的玩家不能被地狱主宰复活");
  }

  return valid();
}

function isPendingDeathWindow(state: GameState): boolean {
  return (
    state.phase === "action_window" &&
    state.activeTimingPhase === "revival_action" &&
    state.players.some((player) => isPendingDeathPlayer(player))
  );
}

function isPendingDeathPlayer(player: { hp: number; buffs: Array<{ id: string }> }): boolean {
  return player.buffs.some((buff) => buff.id === PENDING_DEATH_BUFF_ID);
}

const hasNoRevive = hasRevivalRestrictionFlag;

function isPuppetTargetingMaster(
  state: GameState,
  playerId: PlayerId,
  targetId: PlayerId
): boolean {
  const player = findPlayer(state, playerId);
  return Boolean(player && getPuppetMasterId(player) === targetId);
}

function getFatalSourceIds(state: GameState, playerId: PlayerId): PlayerId[] {
  return getFatalDamageSourceIds(state, playerId);
}

function isAliveTarget(state: GameState, playerId: PlayerId): boolean {
  return findPlayer(state, playerId)?.status === "alive";
}

function valid(): ValidationResult {
  return { ok: true };
}

function invalid(error: string): ValidationResult {
  return { ok: false, error };
}
