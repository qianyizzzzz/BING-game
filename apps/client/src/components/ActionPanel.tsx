import { BUBBLE_ENHANCE, BUBBLE_FINALE, BUBBLE_FORGET, BUBBLE_REBUILD, BUBBLE_REBUILD_STOCK, bubbleDreamEnhancement,
  bubbleDreamMoveEnhanced, bubbleDreamStock } from "@bing/shared";
import { isRedLotusAnytimeSkill, RED_LOTUS_FINALE, RED_LOTUS_KARMA, RED_LOTUS_NINE, redLotusFlameCount } from "@bing/shared";
import { ERA_CHOOSE_TARGETS, ERA_RESTART, eraRestartSource } from "@bing/shared";
import { FALLEN_SPLENDOR_CONVERT, FALLEN_SPLENDOR_DOUBLE, FALLEN_SPLENDOR_EXECUTION, FALLEN_SPLENDOR_RELEASE,
  ORIGIN_SHOT_FUSION, ORIGIN_SHOT_STOCK,
  fallenSplendorExecutionStock, fallenSplendorHealingRemaining, fallenSplendorTargets } from "@bing/shared";
import { SPACE_BURST, SPACE_SHATTER, TIME_RIFT, spaceTimeMaxRounds } from "@bing/shared";
import { canChooseRoundCardForm, HEXAGRAM_ABSOLUTE, HEXAGRAM_CHOOSE, HEXAGRAM_FORMS, HEXAGRAM_RESTORE, HEXAGRAM_SIX_STAR,
  HEXAGRAM_SPIRIT, hexagramRemainingUses, lostHexagramForms } from "@bing/shared";
import { lostSevenStarForms, SEVEN_STAR_CHOOSE, SEVEN_STAR_FORMS, SEVEN_STAR_YAOGUANG, SEVEN_STAR_YUHENG } from "@bing/shared";
import { TIAN_SHA_STAR_BREAK } from "@bing/shared";
import { NINE_COLD, coldLightSource, type ColdLightField } from "@bing/shared";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { PhaseSkillSelect } from "./PhaseSkillSelect";
import { Cookie, FastForward, Plus, RotateCcw, Search, Send, Shield, Sparkles, Swords, Trash2 } from "lucide-react";
import { formatSkillCakeCost, formatAttackStatNumber, formatAttackDamageParts, formatDamage } from "../lib/format";
import { canMaintainBrokenBlade, getBrokenBlade, getBrokenBladeDoubleEdge, hasLingtaField, isBrokenBladeMaintenance,
  selectBrokenBladeDoubleEdge, swordArrayPiBlocksSkill } from "@bing/shared";
import { formatCombatValue, shapeDecayAttack } from "@bing/shared";
import { isSeaGodReturnReady, SEA_GOD_RETURN_ID, SEA_GOD_WAVES_ID } from "@bing/shared";
import { getKarmaConversionSources, getKarmaConversionTargets, KARMA_CONVERT_ID, KARMA_CYCLE_ID, KARMA_REBIRTH_ID,
  KARMA_SONG_END_ID, type KarmaCardChange } from "@bing/shared";
import { STAR_MOON_CHOOSE_CARD, STAR_MOON_FREE_HUIYUE, STAR_MOON_HUIYUE_STOCK } from "@bing/shared";
import { YIYUAN_MIMIC_STATE, YIYUAN_REPEAT, YIYUAN_RESTORE } from "@bing/shared";
import { CHEAT_NOGLUES_ID, CHEAT_SHARP_DAMAGE_ID, CHEAT_TRANSFER_ID,
  getCheatSharpDamageUses, isCheatServerAnytimeSkill } from "@bing/shared";
import { PURPLE_FORESIGHT_ID, PURPLE_INSIGHT_ID, PURPLE_SCALE_ID, PURPLE_SCALE_PREFIX, purpleForesightUses,
  validPurpleValue, attackPowerValue, attackLevelValue } from "@bing/shared";
import { canPayStarWheel, isStarWheelWindowMove, starWheelCanRedirect, starWheelChoices, starWheelStatusChoices,
  STAR_WHEEL_POSITION, STAR_WHEEL_RELEASE, STAR_WHEEL_SHIFT } from "@bing/shared";
import { hasTianyeReboundLock, hasTianyeWing, tianyeChoiceOptions, TIAN_YE_CHOICE_ID, TIAN_YE_FALL_ID,
  TIAN_YE_SOARING_ID, TIAN_YE_WING_DETAILS, TIAN_YE_WINGS, type TianyeWingChoice } from "@bing/shared";
import { CRYSTAL_GUARD_ID, CRYSTAL_SHIELD_ID, crystalGuardMarkCount, crystalShieldAvailable } from "@bing/shared";
import { areCombatTargetsContiguous, getCombatSeatDistance, getCombatSeatGroups, getCombatFarthestPlayers,
  getCombatSeats, getCombatSeatNumbers, isTotemCreation, targetableTotems, TOTEM_CHOOSE_ID,
  canSkillSelectTotem, TOTEM_KINDS, TOTEM_RANGES, type TotemKind, type TotemRange } from "@bing/shared";
import { shadowComboForAction, shadowSeatChoices, SHADOW_FOLLOW_ID, SHADOW_LEAVE_ID, SHADOW_STANCE_STATE,
  SHADOW_STOP_SHRIEK_ID, SHADOW_WIND_DANCE_ID } from "@bing/shared";
import { GAME_SWITCH_ACTION_ID, GAME_SWITCH_MODES, type GameSwitchMode } from "@bing/shared";
import { CURTAIN_ENCORE_ID, CURTAIN_FINALE_ID, curtainDiscardQuote, curtainEncoreReady } from "@bing/shared";
import { BEAST_HUNT_ID, HOUND_SUMMON_ID, houndBiteIsArea } from "@bing/shared";
import { DEMON_GUARD_ID, DEMON_GUARD_ORDER_ID, DEMON_IMP_ORDER_ID,
  controlledDemons, demonOrderAvailable, demonOrderTargets, demonSummonTargets, demonSummonUses, evilHoundTarget, isDemonSummonSkill,
  isTargetedDemonSummon,
  type DemonOrder, type DemonPlacement } from "@bing/shared";
import { TIGER_SWITCH, TIGER_STAB, TIGER_EXTINCTION_MOVE, TIGER_FORM_NAMES, shapeTigerStab, tigerMieThirds } from "@bing/shared";
import { FIVE_ELEMENTS_CHOOSE, FIVE_ELEMENTS_FORMS, FIVE_ELEMENTS_LEVEL, FIVE_ELEMENTS_LEVEL_PREFIX,
  FIVE_ELEMENTS_OPERATIONS, canChooseFiveElementsForm, type FiveElementsOperation } from "@bing/shared";
import { DIVINE_FLAME_ENABLED, DIVINE_FLAME_ID } from "@bing/shared";
import { SWARM_INSECTS, SWARM_INSECT_LABELS, SWARM_RETURN_ID, VETERAN_SHATTER_ID, VETERAN_SHATTER_USES,
  isSwarmAllocationValid, swarmInsectCount, type SwarmAllocation } from "@bing/shared";
import { CHARITY_LINK_ID, CHARITY_QUICK_ID, getQuickHealingTargets, hasCharityDestiny, hasCharityHealingUses,
  HEALING_ART_ID, quickHealingCard } from "@bing/shared";
import {
  ActionSubmission,
  ASURA_FERRY_ID, ASURA_IMMUNITY_ID, ASURA_RITUAL_UPGRADE_ID, ASURA_SWORD_ID, BLOOD_RITUAL_FUSION_ID, bloodQiNumber, getSkillBloodQiCosts, hasBloodQi,
  SOUL_ELEMENT, SOUL_EXTINGUISH_ID, SOUL_RESTORE_EXTINGUISH_ID, SOUL_RESTORE_SINK_ID, SOUL_SINK_ID,
  canAffectAcrossSpace, canBypassTargetSelection, preventsTargetSelection,
  CHAOS_WAVE_ID, chaosWaveChoices, hasChaosDefenseLock,
  isSleeping,
  isSoulExiled,
  getMoveBlockReason,
  getParalysisFixedMove,
  hasRevivalRestrictionFlag,
  UTOPIA_MOVE_ID,
  CLOUD_BYPASS_ID, CLOUD_BYPASS_STATE, CLOUD_SEA_ID, SHENGLING_ID, cloudSeaCount,
  LING_ELEMENT, LINGTA_VICTORY_ID, SKY_ABSOLUTE_ID, SKY_STRIKE_ID, skyAbsoluteActive,
  availableSacredBeasts,
  SACRED_BEASTS,
  SACRED_BEAST_ID,
  TIME_REWIND_ID,
  AttackId,
  AttackStatModifierChoice,
  ATTACK_ORDER,
  BASE_ATTACKS,
  MAX_ACTION_STACKS,
  getAffordableSkillStacks,
  ANNIHILATION_CANNON_ID,
  KUISHI_ID,
  KURONG_LEAF_ID, discountCakeCost, getReboundCakeCost, hasReboundCakeBalance,
  SPIRIT_GUIDANCE_ID,
  SELF_ISOLATION_ID,
  FOUR_EMPTINESS_ID, SLOT_MACHINE_ID, VERDICT_ACTION_ID, getReadySlotMachines,
  SAKURA_FALL_ID, SAKURA_FINALE_ID, SAKURA_RAIN_ID,
  ETERNAL_BIND_ID, ETERNAL_REPLACE_ID, ETERNAL_THOUGHT_ID,
  getBigCard, getBigCards,
  getCakeGainAmount,
  JUNENG_CARD_ID,
  JUNENG_ELEMENT,
  JUSHEN_ID,
  RELEASE_DAMAGE_ID, SWORD_ARRAY_EXECUTE_ID,
  getStoredDamages,
  STORE_DAMAGE_ID,
  QIANQIU_RESPONSE_ID, getQianqiuDefenseGains,
  TIANLIE_CONTINUE_ID, TIANLIE_FEEDBACK_ID, TIANLIE_MIGHT_ID,
  THORN_PIERCE_ID,
  antiCakeCount, availableCakeBalance, canUseAntiCakes, getFlashFamilySlots, vacuumMode, vacuumOptions, youkaiCakeCount,
  YOUKAI_ELEMENT, YOUKAI_RESOURCE_ID,
  VACUUM_ENTER_ID, VACUUM_EXTRACT_ID, VACUUM_MAX_ID, VACUUM_FLASH_SKILL_ID,
  XIELING_BODY_ID, XIELING_RESET_ID, XIELING_TRANSFORM_ID, XIELING_ULTIMATE_ID, GOD_KING_JUDGMENT_ID, bigAbilitySource,
  TIANMANG_CLEANSE_ID, TIANMANG_CONVERSION_ID, TIANMANG_FIELD_CLEANSE_ID,
  WIND_PURSUIT_ID, WIND_TRACK_ID, getWindPursuitTargets, hasWindTrace, isHurricane, validHurricaneTargets,
  SAND_DESOLATION_ID,
  getDueXieyuCount, getXielingConversionLimit,
  STAR_CARD_ID, STAR_ELEMENT, STAR_RESIST_ID, DRAGON_BLOOD_FIELD_ID, canUseStarResistance, isStarResistible,
  getDragonBloodMode, getDragonBloodTotal, shapeDragonBloodAttack, type SkillPlayDefinition,
  getElementAmount,
  thunderBallCount,
  getJunengTargetLock,
  getSelectableJunengTarget,
  isStorableJunengDamage,
  canActionDefend,
  DamageEvent,
  DEFENSE_LABELS,
  DEFENSE_TAG_LABELS,
  DefenseKind,
  PlayerAction,
  PublicGameState,
  SkillId,
  SkillAction,
  getActionLabel,
  getFreeMoveChoices,
  isNextWujinReboundFree,
  getAttackMarkKind,
  getAttackMarkCount,
  getAttackMarkChoices,
  getAttackMarkCapacity,
  canSpendStarRageMarks,
  STAR_RAGE_ID,
  STAR_RAGE_SIX_STAR,
  getActionSwitchChoicesForAction,
  getLevelSwapModifiers,
  getDestructionModifiers,
  actionHasCakeCost,
  payableAttackCost,
  hasEnhancedLevelSwap,
  previewPlayerAttackStats,
  attackStatModifierLabel as sharedAttackStatModifierLabel,
  getActiveSkillCount,
  getDestroyPowerCooldownCount,
  getHuiyueCooldownCount,
  isHuiyueActive,
  isAttackDamageItem,
  getDamageRedirectLimit,
  offsetAttackStats,
  fromLegacyCombatStat,
  isDamageWithinLimit,
  getOwnedSkillIds,
  getAttackActionCost,
  getTurnSkillActionCost,
  getSkillElementCost,
  getSkillElementCosts,
  scaleJunengAttack,
  getFusionSkillId,
  getActiveFusionCount,
  getFusionEnhancementCount,
  getFreeSkillChargeId,
  getAbsoluteGuardCost,
  hasEnhancedPutianRange,
  getLightningSpellTargetPlan,
  getSkill,
  getSkillAttackStats,
  applyHunyaoRiStats,
  RI_SKILL_ID,
  getHunyaoPursuitTargets,
  isHunyaoPursuit,
  getSkillPlay,
  getSkillUseLimit,
  getSkillResourceGainPerStack,
  getSaintElements,
  getSaintMoveMultiplier,
  isSaintMove,
  getUnfusedSkillIds,
  getAllSkills,
  getAcquisitionSkillChoices,
  getFusionRecipe,
  getFusionTier,
  getManualDemonDomainCount,
  getSmallSkills,
  getStackedAttackStats,
  isPlayerInCollapse,
  isSkillBlockedByJingu,
  isActionSwitchSkillId,
  resolveLightningSpellTargetIds,
  skillHasTypeTag
} from "@bing/shared";
import { BlindSkillPicker } from "./PointGamePanel";
import { isBigSkillMode } from "@bing/shared";

const DEMON_ORDER_LABELS: Record<DemonOrder, string> = {
  standby: "待命",
  fireball: "火球",
  whirlwind: "旋风斩",
  power: "恶魔力量",
  legion_area: "军团打击（群攻）",
  legion_single: "军团打击（单攻）"
};
const IMP_ORDERS: readonly DemonOrder[] = ["standby", "fireball"];
const GUARD_ORDERS: readonly DemonOrder[] = ["standby", "whirlwind", "power", "legion_area", "legion_single"];
const DEMON_DEPLOYMENTS: ReadonlyArray<[DemonPlacement, string]> = [
  ["left", "左侧傀儡区"], ["front", "面前傀儡区"], ["right", "右侧傀儡区"]
];
const VACUUM_WINDOW_OPTION = "vacuum_dodge";

interface ActionPanelProps {
  fusionControls?: ReactNode;
  lastActionSubmission?: ActionSubmission | null;
  state: PublicGameState;
  submitting: boolean;
  onSubmit: (action: ActionSubmission) => void;
  onEnterActionWindow: () => void;
  onPassActionWindow: () => void;
  onSkipToNextAction: () => void;
  onGuessSkill: (targetPlayerId: string, targetSkillId: SkillId) => void;
  onPreviewTargets?: (targetIds: string[]) => void;
  onSubmitWindowSkill: (action: SkillAction) => void;
}

type Mode = "gain_cake" | "defense" | "attack" | "skill";
type PhaseSkillOption = { value: string; label: string; controls: ReactNode };
interface AttackRow extends SpaceTimeMoveDraft {
  bigCardInstanceId?: string;
  id: string;
  kind: "attack" | "skill";
  attackId: AttackId;
  skillId: SkillId;
  stacks: number;
  freeStacks?: number;
  targetId: string;
  extraTargetIds?: string[];
}
interface ActionSwitchOption {
  key: string;
  actionIndex: number;
  current: PlayerAction;
  action: NonNullable<SkillAction["switchToAction"]>;
  cost: number;
  label: string;
}
interface AttackStatModifierOption {
  key: string;
  actionIndex: number;
  current: PlayerAction;
  modifier: AttackStatModifierChoice;
  error?: string;
  label: string;
}
interface DoubleEdgeOption {
  key: string;
  actionIndex: number;
  current: PlayerAction;
  targetId: string;
  label: string;
  mode?: SkillAction["doubleEdgeMode"];
  cardId?: string;
}
interface LiegongOption {
  key: string;
  actionIndex: number;
  current: PlayerAction;
  targetId: string;
  counter: PlayerAction;
  label: string;
}
interface AbsoluteGuardOption {
  key: string;
  sourceId: string;
  actionIndex: number;
  action: PlayerAction;
  mode: "area_to_self" | "single_to_area" | "area_to_sky";
  cost: number;
  label: string;
}
const FIRST_ATTACK_ID = ATTACK_ORDER[0]!;
const ACTIVE_REVIVAL_SKILL_IDS = new Set<SkillId>([
  "1063",
  "1065",
  "1067",
  "1111",
  KARMA_REBIRTH_ID,
  getFusionSkillId("贤者的庇护")
]);
const ELECTRIC_SHOCK_SKILL_ID = "1035";
const DOUBLE_EDGE_SWORD_SKILL_ID = "1030";
const HELL_OVERLORD_SKILL_ID = "1111";
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
const LU_ATTACK_SKILL_ID = "1080";
const LIAN_BAO_SKILL_ID = "1086";
const FLASH_DODGE_SKILL_ID = "1102";
const SIX_STAR_SKILL_ID = "1107";
const SELF_DESTRUCTER_DEATH_SKILL_ID = "1101";
const LATE_SELF_DESTRUCT_USED_BUFF_ID = "late_self_destruct_used";
const MULTI_TARGET_ATTACK_SKILL_IDS = new Set<SkillId>([
  FALLEN_SPLENDOR_EXECUTION,
  ELECTRIC_SHOCK_SKILL_ID,
  UTOPIA_MOVE_ID,
  "1078",
  "1117",
  "1118", getFusionSkillId("冰火双漩")
]);
const CONTIGUOUS_MULTI_TARGET_SKILL_IDS = new Set<SkillId>([
  "1078",
  "1117",
  "1118", getFusionSkillId("冰火双漩")
]);

export function ActionPanel({
  fusionControls,
  lastActionSubmission,
  state,
  submitting,
  onSubmit,
  onEnterActionWindow,
  onPassActionWindow,
  onSkipToNextAction,
  onGuessSkill,
  onPreviewTargets,
  onSubmitWindowSkill
}: ActionPanelProps) {
  const fusionSection = fusionControls ? (
    <details className="fusion-controls mt-3" data-testid="fusion-controls">
      <summary>融合与分解</summary>
      {fusionControls}
    </details>
  ) : null;
  const viewer = useMemo(
    () => state.players.find((player) => player.id === state.viewerPlayerId),
    [state.players, state.viewerPlayerId]
  );
  const lockedHound = state.phase === "collecting_actions" ? evilHoundTarget(state, viewer) : undefined;
  const junengLock = getJunengTargetLock(state, viewer?.spaceId);
  const junengTargetId = getSelectableJunengTarget(state, viewer?.spaceId);
  const junengBlocked = Boolean(junengLock && !junengTargetId);
  const junengAmount = getElementAmount(viewer, JUNENG_ELEMENT);
  const dragonBloodMode = viewer ? getDragonBloodMode(getDragonBloodTotal(state, viewer.id)) : undefined;
  const hasStarCard = viewer?.bigCards?.some((card) => card.cardId === STAR_CARD_ID);
  const cakeGain = getCakeGainAmount(state, viewer);
  const gathersYoukai = getActiveSkillCount(viewer, YOUKAI_RESOURCE_ID) > 0;
  const cannonSteps = state.cannonDefenseSteps?.filter((step) => step.targetId === viewer?.id && step.dueTurn === state.turnNumber) ?? [];
  const junengStatus = junengLock || cannonSteps.length || hasStarCard || viewer?.bigCards?.some((card) => card.cardId === JUNENG_CARD_ID) ? (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-2 text-sm text-teal-900" data-testid="juneng-status">
      {viewer?.bigCards?.some((card) => card.cardId === JUNENG_CARD_ID) ? <div>聚元素 {junengAmount}</div> : null}
      {hasStarCard ? <div>星元素 {getElementAmount(viewer, STAR_ELEMENT)}</div> : null}
      {junengLock ? <div>聚神 · {junengBlocked ? "当前无法选择目标" :
        `仅可选择 ${state.players.find((player) => player.id === junengTargetId)?.name}`} · 持续至第 {junengLock.expiresAtRound - 1} 轮轮末</div> : null}
      {cannonSteps.map((step, index) => <div key={index}>
        {step.attackName ?? "聚能湮灭炮"} · 本回合需出{step.next === "cake" ? "饼" : step.next === "stone" ? "石头" :
          step.next === "youtiao" ? "油条" : "反弹"}
        {step.requiresAntiPiercing ? "，并具备无视破弹" : ""}
      </div>)}
    </div>
  ) : null;
  const enemies = useMemo(
    () => {
      const alive = state.players.filter((player) => player.status === "alive" &&
        (viewer ? canAffectAcrossSpace(state, viewer.id, player.id) : !player.spaceId) &&
        (!lockedHound || player.id === lockedHound.id) &&
        (!junengLock || player.id === junengTargetId));
      if (!viewer) {
        return alive;
      }

      return [
        ...alive.filter((player) => player.id !== viewer.id),
        ...alive.filter((player) => player.id === viewer.id)
      ];
    },
    [state, viewer, lockedHound, junengLock, junengTargetId]
  );
  const selectableEnemies = useMemo(() => enemies.filter((player) => !preventsTargetSelection(player) ||
    canBypassTargetSelection(state, viewer?.id, player)), [enemies, state, viewer?.id]);
  const attackEnemies = [...selectableEnemies, ...(junengLock || lockedHound ? [] : state.emptyCityAttackTargets ?? [])]
    .filter((player) => !hasChaosDefenseLock(viewer, player.id));
  const totemOptions = useMemo(() => junengLock || lockedHound ? [] : targetableTotems(state, viewer)
    .map((totem) => ({ id: totem.id, name: TOTEM_KINDS[totem.kind].name + "（造物）" })), [state, viewer, junengLock, lockedHound]);
  const reboundTargets = useMemo(() => [...selectableEnemies, ...totemOptions], [selectableEnemies, totemOptions]);
  const balanceTargetOptions = useMemo(
    () => enemies.filter((player) => player.id !== viewer?.id),
    [enemies, viewer?.id]
  );
  const lightningTargetPlan = useMemo(
    () =>
      viewer
        ? getLightningSpellTargetPlan(state.players.filter((player) => canAffectAcrossSpace(state, viewer.id, player.id)), viewer.id)
        : {
            lockedTargets: [],
            selectableTargets: [],
            requiredSelectableCount: 0,
            targetCount: 0
          },
    [state, viewer]
  );
  const lightningFirstTargetOptions = useMemo(() => {
    if (lightningTargetPlan.lockedTargets[0]) {
      return [lightningTargetPlan.lockedTargets[0]];
    }

    return lightningTargetPlan.selectableTargets;
  }, [lightningTargetPlan]);
  const lightningSecondTargetOptions = useMemo(() => {
    if (lightningTargetPlan.targetCount < 2) {
      return [];
    }

    if (lightningTargetPlan.lockedTargets[1]) {
      return [lightningTargetPlan.lockedTargets[1]];
    }

    return lightningTargetPlan.selectableTargets;
  }, [lightningTargetPlan]);
  const pendingDeathWindow =
    state.phase === "action_window" &&
    state.activeTimingPhase === "revival_action" &&
    state.players.some((player) => isPendingDeathPlayer(player));
  const viewerPendingDeath = Boolean(viewer && isPendingDeathPlayer(viewer));
  const viewerNoRevive = Boolean(viewer && hasRevivalRestrictionFlag(viewer));
  const kaigeSpareLives = viewerPendingDeath &&
    (viewer?.kaigeLife || viewer?.spareLives?.some((life) => life.kaigeLife)) ? viewer?.spareLives?.length ?? 0 : 0;
  const fatalSourceOptions = useMemo(() => {
    if (!viewer) {
      return [];
    }

    const sourceIds = new Set(
      state.eventLog
        .filter(
          (event): event is DamageEvent =>
            event.type === "damage" &&
            event.targetId === viewer.id &&
            event.amount > 0 &&
            event.roundNumber === state.roundNumber &&
            event.turnNumber === state.roundTurnNumber &&
            Boolean(event.sourceId)
        )
        .map((event) => event.sourceId)
        .filter((sourceId): sourceId is string => Boolean(sourceId))
    );
    return state.players.filter((player) => sourceIds.has(player.id));
  }, [state.eventLog, state.players, state.roundNumber, state.turnNumber, viewer]);
  const hellOverlordTargetOptions = useMemo(() => {
    if (!viewer) {
      return [];
    }

    if (pendingDeathWindow && viewerPendingDeath) {
      return [viewer];
    }

    return state.players.filter(
      (player) =>
        player.id !== viewer.id &&
        player.status === "dead" &&
        player.defeatLevel === 1 &&
        !player.buffs.some((buff) => buff.id === "no_revive")
    );
  }, [pendingDeathWindow, state.players, viewer, viewerPendingDeath]);

  const [mode, setMode] = useState<Mode>("gain_cake");
  const [tigerPower, setTigerPower] = useState("0");
  const [freeMoveId, setFreeMoveId] = useState("");
  const [defense, setDefense] = useState<DefenseKind>("small");
  const [targetId, setTargetId] = useState(reboundTargets[0]?.id ?? "");
  const [skillId, setSkillId] = useState<SkillId>("");
  const [sevenStarRestoreId, setSevenStarRestoreId] = useState("");
  const [discardSkillId, setDiscardSkillId] = useState<SkillId>("");
  const [skillStacks, setSkillStacks] = useState(1);
  const [spaceTimeOptions, setSpaceTimeOptions] = useState<SpaceTimeMoveDraft>({});
  const [swarmAllocation, setSwarmAllocation] = useState<SwarmAllocation>({});
  const [saintElement, setSaintElement] = useState("");
  const [xielingMarkCost, setXielingMarkCost] = useState(1);
  const [skillTargetId, setSkillTargetId] = useState(enemies[0]?.id ?? "");
  const [shadowMoveMode, setShadowMoveMode] = useState<NonNullable<SkillAction["shadowMoveMode"]>>("insert");
  const [shadowAnchorId, setShadowAnchorId] = useState("");
  const [skillExtraTargetIds, setSkillExtraTargetIds] = useState<string[]>([]);
  const [windowSkillId, setWindowSkillId] = useState<SkillId>("");
  const [fiveElementsOperation, setFiveElementsOperation] = useState<FiveElementsOperation>("add");
  const [coldLightField, setColdLightField] = useState<ColdLightField>("power");
  const [vacuumChoiceId, setVacuumChoiceId] = useState("");
  const [demonPlacement, setDemonPlacement] = useState<DemonPlacement>("front");
  const [demonId, setDemonId] = useState("");
  const [demonOrder, setDemonOrder] = useState<DemonOrder>("standby");
  const [demonTargetId, setDemonTargetId] = useState("");
  const [blindSelected, setBlindSelected] = useState<string[]>([]);
  const [sakuraSelected, setSakuraSelected] = useState<string[]>([]);
  const [karmaChanges, setKarmaChanges] = useState<{ turn: number; byPlayer: Record<string, Partial<KarmaCardChange>> }>({ turn: -1, byPlayer: {} });
  const [karmaConvertFrom, setKarmaConvertFrom] = useState<SkillId>("");
  const [karmaConvertTo, setKarmaConvertTo] = useState<SkillId>("");
  const [cheatCardId, setCheatCardId] = useState("");
  const [starMoonCardId, setStarMoonCardId] = useState("");
  const [cheatTransferFrom, setCheatTransferFrom] = useState("");
  const [cheatTransferTo, setCheatTransferTo] = useState("");
  const [slotMachineId, setSlotMachineId] = useState("");
  const [useFreeVerdict, setUseFreeVerdict] = useState(true);
  const [windowSkillStacks, setWindowSkillStacks] = useState(1);
  const [antiCakeChoices, setAntiCakeChoices] = useState<Record<string, number>>({});
  const [youkaiCakeChoices, setYoukaiCakeChoices] = useState<Record<string, number>>({});
  const [windowSkillTargetId, setWindowSkillTargetId] = useState(enemies[0]?.id ?? "");
  const [windowSkillExtraTargetId, setWindowSkillExtraTargetId] = useState(enemies[1]?.id ?? "");
  const [windowTargetSkillId, setWindowTargetSkillId] = useState<SkillId>("");
  const [windowExposedSkillQuery, setWindowExposedSkillQuery] = useState("");
  const [windowSandSkillId, setWindowSandSkillId] = useState<SkillId>("");
  const [windowSandSkillQuery, setWindowSandSkillQuery] = useState("");
  const [windowGuessTargetId, setWindowGuessTargetId] = useState(enemies[0]?.id ?? "");
  const [windowGuessSkillId, setWindowGuessSkillId] = useState<SkillId>("");
  const [windowGuessSkillQuery, setWindowGuessSkillQuery] = useState("");
  const [windowDamageId, setWindowDamageId] = useState("");
  const [crystalMarkCount, setCrystalMarkCount] = useState(1);
  const [tianlieResponseId, setTianlieResponseId] = useState("");
  const [bubbleHitId, setBubbleHitId] = useState("");
  const bubbleHit = state.bubbleDreamHitChoices?.find(({ id }) => id === bubbleHitId) ?? state.bubbleDreamHitChoices?.[0];
  const [tianlieAttackIndex, setTianlieAttackIndex] = useState(0);
  const [eternalMoveIndex, setEternalMoveIndex] = useState(0);
  const [purplePower, setPurplePower] = useState("");
  const [purpleLevel, setPurpleLevel] = useState("");
  const [asuraFerryQi, setAsuraFerryQi] = useState(1);
  const [defenseGainId, setDefenseGainId] = useState("");
  const [storedDamageId, setStoredDamageId] = useState("");
  const [attackExtraEffectTargetId, setAttackExtraEffectTargetId] = useState("");
  const [peekTargetInstanceId, setPeekTargetInstanceId] = useState("");
  const [leafSelections, setLeafSelections] = useState<Record<string, string>>({});
  const leafCards = state.leafCardChoices ?? [];
  const leafAbilityChoices = leafCards.flatMap(({ cardInstanceId, abilityIds }) => {
    const abilityId = leafSelections[cardInstanceId];
    return abilityId && abilityIds.includes(abilityId) ? [{ cardInstanceId, abilityId }] : [];
  });
  const peekTargets = state.players.filter((player) => player.id !== viewer?.id).flatMap((player) =>
    (player.bigCards ?? []).filter((card) => !card.publiclyRevealed).map((card) => ({ ...card, ownerName: player.name })));
  const peekTarget = peekTargets.find((card) => card.instanceId === peekTargetInstanceId) ?? peekTargets[0];
  const storedDamageOptions = getStoredDamages(viewer);
  const selectedStoredDamage = storedDamageOptions.find((item) => item.id === storedDamageId) ?? storedDamageOptions[0];
  const storableDamages = (state.pendingDamageItems ?? []).filter((item) => item.targetId === viewer?.id && isStorableJunengDamage(item));
  const storableDamage = storableDamages.find((item) => item.id === windowDamageId) ?? storableDamages[0];
  const resistibleDamages = (state.pendingDamageItems ?? []).filter((item) => item.targetId === viewer?.id && isStarResistible(item));
  const resistibleDamage = resistibleDamages.find((item) => item.id === windowDamageId) ?? resistibleDamages[0];
  function storedDamageSelect() {
    return <label className="block text-sm">
      释放哪一份伤害
      <select className="soft-input mt-1 w-full" value={selectedStoredDamage?.id ?? ""}
        onChange={(event) => setStoredDamageId(event.target.value)}>
        {storedDamageOptions.map((item) => <option key={item.id} value={item.id}>
          {item.attackName ?? "伤害"} · {item.pointDefeatLevel === 2 ? "退游" : formatAttackStatNumber(0, item.amountValue)}
        </option>)}
      </select>
    </label>;
  }
  const [magicThirdTargetId, setMagicThirdTargetId] = useState("");
  const [windowSwitchKey, setWindowSwitchKey] = useState("");
  const [windowAttackStatModifierKey, setWindowAttackStatModifierKey] = useState("");
  const [windowMarkAttackIndex, setWindowMarkAttackIndex] = useState(0);
  const [windowDoubleEdgeKey, setWindowDoubleEdgeKey] = useState("");
  const [windowLiegongKey, setWindowLiegongKey] = useState("");
  const [windowAbsoluteGuardKey, setWindowAbsoluteGuardKey] = useState("");
  const [attackRows, setAttackRows] = useState<AttackRow[]>([
    {
      id: "attack_1",
      kind: "attack",
      attackId: FIRST_ATTACK_ID,
      skillId: "",
      stacks: 1,
      targetId: enemies[0]?.id ?? ""
    }
  ]);

  const alreadySubmitted =
    Boolean(viewer?.id) && state.pendingActionPlayerIds.includes(viewer!.id);
  const sleeping = isSleeping(viewer, state.turnNumber);
  const moveBlockReason = getMoveBlockReason(state, viewer);
  const selfDestructBlockReason = moveBlockReason ?? (getParalysisFixedMove(state, viewer) ? "麻痹期间只能使用固定出招" : undefined);
  const moveAutoPassLabel = moveBlockReason
    ? isHuiyueActive(viewer, state.turnNumber) ? "辉月：自动空过" : "自动空过"
    : "";
  const canAct =
    state.phase === "collecting_actions" &&
    viewer?.status === "alive" &&
    !alreadySubmitted && !moveBlockReason;
  const viewerHasScatterRebound = viewerCanUseSkill(state, viewer, SCATTER_REBOUND_SKILL_ID);
  const discardableSkills = useMemo(
    () =>
      (viewer ? getUnfusedSkillIds(viewer) : []).map((id, index) => ({
        id,
        index,
        skill: getSkill(id)
      })),
    [viewer?.skills, viewer?.skillFusions]
  );
  const huntLabel = (id: string, name: string) => id === "1109" && getActiveSkillCount(viewer, BEAST_HUNT_ID) ? "猎杀" : name;

  const firstTurnAttackLocked =
    state.config.firstTurnNoAttack && state.roundTurnNumber === 1;
  const playableSkills = useMemo(
    () =>
      (viewer ? isBigSkillMode(state.config.skillMode)
        ? [...new Set([...getOwnedSkillIds(viewer), ...(state.sakuraTurnEndResponse && state.sakuraCardChoices?.length ? [SAKURA_FALL_ID] : [])])]
        : getOwnedSkillIds(viewer) : [])
        .map((id) => {
          const skill = getSkill(id);
          const play = getSkillPlay(id);
          return skill && play ? { skill, play } : undefined;
        })
        .filter((item) => {
          if (!item || !viewer) {
            return false;
          }

          if (!(state.sakuraTurnEndResponse && item.skill.id === SAKURA_FALL_ID) && !viewerCanUseSkill(state, viewer, item.skill.id)) {
            return false;
          }
          if ([ETERNAL_BIND_ID, ETERNAL_REPLACE_ID, ETERNAL_THOUGHT_ID].includes(item.skill.id) &&
            !state.eternalReadySkills?.includes(item.skill.id)) return false;
          if (isSaintMove(item.skill.id) && !getSaintMoveMultiplier(viewer, item.skill.id, undefined, state.roundNumber)) return false;

          if (
            pendingDeathWindow &&
            item.skill.id !== SOUL_EXTINGUISH_ID &&
            item.skill.id !== SAKURA_FALL_ID &&
            (!viewerPendingDeath ||
              !ACTIVE_REVIVAL_SKILL_IDS.has(item.skill.id) && item.skill.id !== FALLEN_SPLENDOR_CONVERT)
          ) {
            return false;
          }

          const resourceStacks = getSkillResourceStacks(viewer, item.skill.id);
          if (resourceStacks !== undefined && resourceStacks <= 0) {
            return false;
          }

          return (
            item.play.usesPerGame === undefined ||
            getSkillUseCount(viewer, item.skill.id) <
              (getSkillUseLimit(viewer, item.skill.id) ?? item.play.usesPerGame * getActiveSkillCount(viewer, item.skill.id))
          );
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [pendingDeathWindow, state, viewer, viewerNoRevive, viewerPendingDeath]
  );
  const freeMoveChoices = getFreeMoveChoices(viewer).filter(({ move }) =>
    move.type !== "skill" || !swordArrayPiBlocksSkill(state, viewer, move.skillId) &&
      (!isSaintMove(move.skillId) || getSaintMoveMultiplier(viewer, move.skillId) > 0));
  const selectedFreeMove = freeMoveChoices.find(({ id }) => id === freeMoveId);
  const swordExecuteSources = viewer?.bigCards?.flatMap((card, index) =>
    bigAbilitySource(viewer, { skillId: SWORD_ARRAY_EXECUTE_ID, bigCardInstanceId: card.instanceId }) ?
      [{ id: card.instanceId, label: `${card.onlyAbilityId ? "单独子技能" : "完整卡"} · 第 ${index + 1} 张` }] : []) ?? [];
  const borrowedSkillId = selectedFreeMove?.move.type === "skill" ? selectedFreeMove.move.skillId : undefined;
  const borrowedSkill = borrowedSkillId ? getSkill(borrowedSkillId) : undefined;
  const borrowedPlay = borrowedSkillId ? getSkillPlay(borrowedSkillId) : undefined;
  const availableTurnSkills = borrowedSkill && borrowedPlay && (!isSaintMove(borrowedSkill.id) || getSaintMoveMultiplier(viewer, borrowedSkill.id)) &&
    !playableSkills.some(({ skill }) => skill.id === borrowedSkill.id)
    ? [...playableSkills, { skill: borrowedSkill, play: borrowedPlay }] : playableSkills;
  const isShadowDancing = viewer?.buffs.some(({ stateType }) => stateType === SHADOW_STANCE_STATE);
  const turnActionSkills = availableTurnSkills.filter(({ skill }) =>
    (skill.id !== CRYSTAL_SHIELD_ID || viewer && crystalShieldAvailable(state, viewer)) &&
    (skill.id !== SHADOW_LEAVE_ID || isShadowDancing) &&
    (!viewer || canPayStarWheel(viewer, skill.id) || selectedFreeMove?.move.type === "skill" && selectedFreeMove.move.skillId === skill.id) &&
    (skill.id !== TIGER_EXTINCTION_MOVE || selectedFreeMove || viewer && tigerMieThirds(viewer) >= 3) && skill.timingPhases.includes("turn_action") && (skill.id !== SKY_STRIKE_ID || skyAbsoluteActive(viewer, state.roundNumber))
  );
  const actionSkills = turnActionSkills.filter(
    ({ skill, play }) =>
      skill.timingPhases.includes("turn_action") &&
      play.kind === "attack" && (skill.id !== DRAGON_BLOOD_FIELD_ID || dragonBloodMode !== "heal") &&
      skill.id !== ELECTRIC_SHOCK_SKILL_ID && skill.id !== SWARM_RETURN_ID
  );
  const nonAttackSkills = turnActionSkills.filter(
    ({ skill, play }) => (play.kind !== "attack" || skill.id === ELECTRIC_SHOCK_SKILL_ID || skill.id === SWARM_RETURN_ID ||
      skill.id === DRAGON_BLOOD_FIELD_ID && dragonBloodMode === "heal") &&
      (skill.id !== RELEASE_DAMAGE_ID || storedDamageOptions.length > 0)
  );
  const qianqiuGains = getQianqiuDefenseGains(state, viewer);
  const qianqiuGain = qianqiuGains.find((buff) => buff.id === defenseGainId) ?? qianqiuGains[0];
  const purpleForesightCard = viewer?.bigCards?.find((card) => bigAbilitySource(viewer, {
    skillId: PURPLE_FORESIGHT_ID, bigCardInstanceId: card.instanceId
  }) && purpleForesightUses(state.roundNumber, card) > 0);
  const purpleInsightCard = viewer?.bigCards?.find((card) => bigAbilitySource(viewer, {
    skillId: PURPLE_INSIGHT_ID, bigCardInstanceId: card.instanceId
  }) && card.purpleInsightUsedRound !== state.roundNumber);
  const imps = viewer ? controlledDemons(state, viewer.id, DEMON_IMP_ORDER_ID) : [];
  const demonGuards = viewer ? controlledDemons(state, viewer.id, DEMON_GUARD_ORDER_ID) : [];
  const cheatCardChoices = state.cheatCardChoices ?? [];
  const starMoonChoices = state.starMoonCardChoices ?? [];
  const selectedStarMoonCard = starMoonChoices.find(({ instanceId }) => instanceId === starMoonCardId);
  const cheatUseChoices = state.cheatTransferChoices ?? [];
  const cheatDonors = cheatUseChoices.filter(({ remaining }) => remaining > 0);
  const cheatDamageUses = getCheatSharpDamageUses(viewer);
  const regularWindowSkills = playableSkills.filter(
    ({ skill, play }) =>
      state.phase === "action_window" &&
      !(moveBlockReason && skill.id === SHENGLING_ID) &&
      ![TIGER_SWITCH, FIVE_ELEMENTS_CHOOSE, HEXAGRAM_CHOOSE, HEXAGRAM_SPIRIT, HEXAGRAM_ABSOLUTE, HEXAGRAM_RESTORE, SEVEN_STAR_CHOOSE,
        SACRED_BEAST_ID, TIME_REWIND_ID, CLOUD_BYPASS_ID, SKY_ABSOLUTE_ID, LINGTA_VICTORY_ID,
        SOUL_RESTORE_EXTINGUISH_ID, SOUL_RESTORE_SINK_ID, CHARITY_QUICK_ID, TIAN_YE_CHOICE_ID, CURTAIN_FINALE_ID,
        ORIGIN_SHOT_FUSION, THORN_PIERCE_ID, YIYUAN_REPEAT, YIYUAN_RESTORE, KARMA_SONG_END_ID, TIAN_SHA_STAR_BREAK].includes(skill.id) &&
      (skill.id !== HEALING_ART_ID || !hasCharityDestiny(viewer)) &&
      (skill.id !== SHADOW_LEAVE_ID || isShadowDancing) &&
      (!state.bloodRitualResistance || skill.id === STAR_RESIST_ID) &&
      skill.timingPhases.includes(state.activeTimingPhase) &&
      (skill.id !== KARMA_CONVERT_ID || getKarmaConversionSources(viewer).length > 0) &&
      (skill.id !== NINE_COLD || Boolean(viewer && coldLightSource(viewer, state.turnNumber))) &&
      (skill.id !== CHEAT_TRANSFER_ID || cheatDonors.length > 0 && cheatUseChoices.length > 1) &&
      (skill.id !== CHEAT_SHARP_DAMAGE_ID || cheatDamageUses > 0 && selectableEnemies.length > 0) &&
      (skill.id !== DEMON_IMP_ORDER_ID || imps.length > 0) &&
      (skill.id !== DEMON_GUARD_ORDER_ID || demonGuards.length > 0) &&
      (!isDemonSummonSkill(skill.id) || viewer && demonSummonUses(state, viewer, skill.id) > 0) &&
      (!state.sakuraTurnEndResponse || skill.id === SAKURA_FALL_ID) &&
      (skill.id !== SAKURA_FALL_ID || Boolean(state.sakuraCardChoices?.length)) &&
      (![ETERNAL_BIND_ID, ETERNAL_REPLACE_ID].includes(skill.id) || Boolean(state.eternalMoveChoices?.length)) &&
      (skill.id !== PURPLE_FORESIGHT_ID || Boolean(purpleForesightCard)) &&
      (skill.id !== PURPLE_INSIGHT_ID || state.roundNumber % 3 === 0 && !state.purpleInsight && Boolean(purpleInsightCard)) &&
      (skill.id !== ASURA_RITUAL_UPGRADE_ID || hasBloodQi(viewer, 50) && !viewer?.buffs.some((buff) => buff.id === "asura_ritual_upgrade")) &&
      (skill.id !== FALLEN_SPLENDOR_RELEASE) &&
      (skill.id !== RED_LOTUS_NINE || redLotusFlameCount(viewer) >= 9) &&
      (skill.id !== RED_LOTUS_FINALE || !viewer?.redLotusFinaleUsed || !getActiveSkillCount(viewer, RED_LOTUS_KARMA)) &&
      (skill.id !== ERA_RESTART || Boolean(viewer && eraRestartSource(viewer))) &&
      skill.id !== ERA_CHOOSE_TARGETS &&
      skill.id !== BUBBLE_FORGET &&
      (skill.id !== STAR_MOON_CHOOSE_CARD || starMoonChoices.length > 0) &&
      (skill.id !== STAR_MOON_FREE_HUIYUE || viewer?.buffs.some((buff) =>
        buff.stateType === STAR_MOON_HUIYUE_STOCK && buff.stacks > 0)) &&
      (skill.id !== BUBBLE_REBUILD || viewer && Boolean(bubbleDreamStock(viewer, BUBBLE_REBUILD_STOCK)) &&
        viewer.bigCards?.some((card) => !card.bubbleDreamRebuild && bigAbilitySource(viewer, { skillId: BUBBLE_REBUILD, bigCardInstanceId: card.instanceId }))) &&
      (skill.id !== BUBBLE_ENHANCE || viewer && Boolean(bubbleDreamEnhancement(viewer))) &&
      (skill.id !== FALLEN_SPLENDOR_CONVERT || viewer && viewer.bigCards?.some((card) =>
        bigAbilitySource(viewer, { skillId: FALLEN_SPLENDOR_CONVERT, bigCardInstanceId: card.instanceId }) &&
        fallenSplendorHealingRemaining(viewer, card) > 0)) &&
      (skill.id !== BLOOD_RITUAL_FUSION_ID || selectableEnemies.some((target) => target.id !== viewer?.id)) &&
      (skill.id !== ASURA_FERRY_ID || hasBloodQi(viewer, 31)) &&
      (skill.id !== ASURA_IMMUNITY_ID || viewer && bloodQiNumber(viewer) > 0 &&
        !viewer.buffs.some((buff) => buff.id === "asura_immunity_used") &&
        Object.values(previewPlayerAttackStats(state, viewer.id).stats).some((stats) => stats.id === ASURA_SWORD_ID)) &&
      (!state.reversalResponseOnly || skill.id === "1092") && !isStarWheelWindowMove(skill.id) &&
      (!viewer || canPayStarWheel(viewer, skill.id)) &&
      (skill.id !== KUISHI_ID || state.roundNumber === 1 && state.turnNumber === 1 && peekTargets.length > 0 &&
        viewer?.bigCards?.some((card) => card.openingCopyAvailable)) &&
      (skill.id !== KURONG_LEAF_ID || leafCards.length > 0) &&
      (skill.id !== SELF_ISOLATION_ID || viewer && !viewer.spaceId &&
        viewer.cakes + youkaiCakeCount(viewer) >= getTurnSkillActionCost(viewer, { type: "skill", skillId: skill.id, stacks: 1 }, state)) &&
      (skill.id !== CRYSTAL_GUARD_ID || crystalGuardMarkCount(viewer) > 0) &&
      (skill.id !== STORE_DAMAGE_ID || junengAmount > 0 && storableDamages.length > 0) &&
      (skill.id !== QIANQIU_RESPONSE_ID || qianqiuGains.length > 0) &&
      (skill.id !== WIND_PURSUIT_ID || viewer && getWindPursuitTargets(state, viewer).length > 0) &&
      (![TIANLIE_CONTINUE_ID, TIANLIE_FEEDBACK_ID].includes(skill.id) ||
        state.tianlieResponseChoices?.some((choice) => choice.skillId === skill.id)) &&
      (skill.id !== STAR_RESIST_ID || viewer && canUseStarResistance(viewer) && resistibleDamages.length > 0) &&
      (skill.id !== RELEASE_DAMAGE_ID || storedDamageOptions.length > 0) &&
      (skill.id !== JUSHEN_ID || junengAmount >= (getSkillElementCost(viewer, { skillId: JUSHEN_ID })?.perStack ?? 7)) &&
      (skill.id !== XIELING_RESET_ID || viewer?.bigCards?.some((card) => card.xielingCooldown?.remaining)) &&
      (skill.id !== SLOT_MACHINE_ID || viewer && getReadySlotMachines(viewer).length > 0) &&
      (!isHunyaoPursuit(skill.id) || getHunyaoPursuitTargets(state, skill.id).length > 0) &&
      (state.activeTimingPhase !== "turn_damage_modify" ||
        skill.id === STAR_MOON_CHOOSE_CARD ||
        isBrokenBladeMaintenance(skill.id) ||
        isDemonSummonSkill(skill.id) ||
        isCheatServerAnytimeSkill(skill.id) ||
        isRedLotusAnytimeSkill(skill.id) ||
        skill.id === ERA_RESTART ||
        skill.id === FALLEN_SPLENDOR_CONVERT || skill.id === BUBBLE_REBUILD ||
        skill.id === KARMA_CONVERT_ID ||
        skill.id === "1093" ||
        skill.id === SIX_STAR_SKILL_ID ||
        [TIANMANG_CLEANSE_ID, TIANMANG_CONVERSION_ID, TIANMANG_FIELD_CLEANSE_ID, WIND_PURSUIT_ID,
          ASURA_RITUAL_UPGRADE_ID, BLOOD_RITUAL_FUSION_ID].includes(skill.id) ||
        skill.id === ICE_RAIN_SKILL_ID ||
        skill.id === CROSS_GUARD_SKILL_ID || skill.id === CRYSTAL_GUARD_ID || skill.id === STORE_DAMAGE_ID || skill.id === STAR_RESIST_ID || skill.id === RELEASE_DAMAGE_ID ||
        skill.id === JUSHEN_ID || skill.id === SELF_ISOLATION_ID || skill.id === FOUR_EMPTINESS_ID || skill.id === SLOT_MACHINE_ID ||
        skill.id === QIANQIU_RESPONSE_ID || skill.id === TIANLIE_CONTINUE_ID || skill.id === TIANLIE_FEEDBACK_ID ||
        skill.id === XIELING_BODY_ID || skill.id === XIELING_RESET_ID ||
        isHunyaoPursuit(skill.id)) &&
      (skill.id !== XIEYU_SKILL_ID ||
        (viewer !== undefined &&
          viewer.buffs.filter((buff) => buff.id === "xieyu_target").length <
            getDueXieyuCount(viewer, state.roundNumber))) &&
      (skill.id !== getFusionSkillId("魔域") || (state.roundNumber % 3 === 0 && viewer &&
        viewer.buffs.filter((buff) => buff.id === "demon_domain_target").length < 3 * getManualDemonDomainCount(viewer))) &&
      play.kind !== "attack"
  );
  const vacuumSources = viewer && state.phase === "action_window" && !state.bloodRitualResistance &&
    !swordArrayPiBlocksSkill(state, viewer, VACUUM_FLASH_SKILL_ID) &&
    !isSkillBlockedByJingu(state, VACUUM_FLASH_SKILL_ID, viewer.spaceId, viewer) ? vacuumOptions(state, viewer) : [];
  const vacuumChoices = (["normal", "extra"] as const).flatMap((mode) => vacuumSources.map((source, index) => ({
    id: `${source.cardId}:${mode}`,
    cardId: source.cardId,
    mode,
    available: mode === "normal" ? source.normal : source.extra > 0,
    label: `${vacuumSources.length > 1 ? `第 ${index + 1} 份 · ` : ""}${mode === "normal" ? "普通虚无" :
      `额外虚无（${source.extra} 次）`} · 判定 ${source.rank}`
  })));
  const selectedVacuumChoice = vacuumChoices.find(({ id, available }) => id === vacuumChoiceId && available) ??
    vacuumChoices.find(({ available }) => available);
  const vacuumSkill = selectedVacuumChoice ? getSkill(VACUUM_FLASH_SKILL_ID) : undefined;
  const vacuumPlay = selectedVacuumChoice ? getSkillPlay(VACUUM_FLASH_SKILL_ID) : undefined;
  const windowSkills = regularWindowSkills.map((item) => ({ ...item, optionId: item.skill.id }));
  if (vacuumSkill && vacuumPlay) windowSkills.push({ skill: vacuumSkill, play: vacuumPlay, optionId: VACUUM_WINDOW_OPTION });
  const selectedSkill = nonAttackSkills.find((item) => item.skill.id === skillId) ?? nonAttackSkills[0];
  const sevenStarRestorations = selectedSkill?.skill.id === SEVEN_STAR_YAOGUANG ? (viewer?.bigCards ?? []).flatMap((card) =>
    bigAbilitySource(viewer!, { skillId: SEVEN_STAR_YAOGUANG, bigCardInstanceId: card.instanceId }) ?
      lostSevenStarForms(card).map((cardForm) => ({ id: `${card.instanceId}:${cardForm}`, cardForm, bigCardInstanceId: card.instanceId })) : []) : [];
  const sevenStarRestoration = sevenStarRestorations.find(({ id }) => id === sevenStarRestoreId) ?? sevenStarRestorations[0];
  const selectedWindowSkill =
    windowSkills.find((item) => item.optionId === windowSkillId) ?? windowSkills[0];
  const skillCanTargetTotem = Boolean(selectedSkill && canSkillSelectTotem(selectedSkill.skill.id));
  const windowSkillCanTargetTotem = Boolean(selectedWindowSkill && canSkillSelectTotem(selectedWindowSkill.skill.id));
  const isVacuumWindowSkill = selectedWindowSkill?.optionId === VACUUM_WINDOW_OPTION;
  const isKarmaConvert = selectedWindowSkill?.skill.id === KARMA_CONVERT_ID;
  const karmaConversionSources = viewer && isKarmaConvert ? getKarmaConversionSources(viewer) : [];
  const selectedKarmaConvertFrom = karmaConversionSources.includes(karmaConvertFrom) ? karmaConvertFrom : "";
  const karmaConversionTargets = selectedKarmaConvertFrom ? getKarmaConversionTargets(selectedKarmaConvertFrom) : [];
  const selectedKarmaConvertTo = karmaConversionTargets.includes(karmaConvertTo) ? karmaConvertTo : "";
  const isCheatCardPick = selectedWindowSkill?.skill.id === CHEAT_NOGLUES_ID;
  const isCheatTransfer = selectedWindowSkill?.skill.id === CHEAT_TRANSFER_ID;
  const isCheatSharpDamage = selectedWindowSkill?.skill.id === CHEAT_SHARP_DAMAGE_ID;
  const selectedCheatCard = cheatCardChoices.find(({ instanceId }) => instanceId === cheatCardId);
  const selectedCheatDonor = cheatDonors.find(({ id }) => id === cheatTransferFrom);
  const cheatRecipients = cheatUseChoices.filter(({ id }) => id !== selectedCheatDonor?.id);
  const selectedCheatRecipient = cheatRecipients.find(({ id }) => id === cheatTransferTo);
  const cheatDamageTargets = selectableEnemies;
  const cheatDamageTarget = cheatDamageTargets.find(({ id }) => id === windowSkillTargetId) ?? cheatDamageTargets[0];
  const cheatAnytimeSkills = playableSkills.filter(({ skill }) => isCheatServerAnytimeSkill(skill.id) &&
    (skill.id !== CHEAT_TRANSFER_ID || cheatDonors.length > 0 && cheatUseChoices.length > 1) &&
    (skill.id !== CHEAT_SHARP_DAMAGE_ID || cheatDamageUses > 0 && cheatDamageTarget));
  const cheatActionIncomplete = (id: SkillId) =>
    id === CHEAT_NOGLUES_ID && cheatCardChoices.length > 0 && !selectedCheatCard ||
    id === CHEAT_TRANSFER_ID && (!selectedCheatDonor || !selectedCheatRecipient) ||
    id === CHEAT_SHARP_DAMAGE_ID && (!cheatDamageUses || !cheatDamageTarget);
  const addCheatActionChoices = (action: SkillAction) => {
    if (action.skillId === CHEAT_NOGLUES_ID && selectedCheatCard) action.cheatCardInstanceId = selectedCheatCard.instanceId;
    if (action.skillId === CHEAT_TRANSFER_ID && selectedCheatDonor && selectedCheatRecipient) {
      action.cheatTransferFrom = selectedCheatDonor.id;
      action.cheatTransferTo = selectedCheatRecipient.id;
    }
    if (action.skillId === CHEAT_SHARP_DAMAGE_ID && cheatDamageTarget) action.targetId = cheatDamageTarget.id;
  };
  const cheatCardPicker = () => cheatCardChoices.length ? (
    <label className="block text-sm font-medium text-gray-700">
      要获得的大卡
      <select className="soft-input mt-1 w-full" value={selectedCheatCard?.instanceId ?? ""}
        onChange={(event) => setCheatCardId(event.currentTarget.value)}>
        <option value="">请选择其他玩家的大卡</option>
        {cheatCardChoices.map((choice) => <option key={choice.instanceId} value={choice.instanceId}>
          {state.players.find(({ id }) => id === choice.playerId)?.name ?? "玩家"} · 大卡 {choice.number}
          {choice.visibleCardId ? ` · ${getBigCard(choice.visibleCardId)?.name ?? choice.visibleCardId}` : ""}
        </option>)}
      </select>
    </label>
  ) : null;
  const cheatTransferPickers = () => <div className="grid gap-2 sm:grid-cols-2">
    <label className="block text-sm">减少 1 次的限定技
      <select className="soft-input mt-1 w-full" value={selectedCheatDonor?.id ?? ""} onChange={(event) => {
        setCheatTransferFrom(event.currentTarget.value);
        setCheatTransferTo("");
      }}>
        <option value="">请选择限定技</option>
        {cheatDonors.map(({ id, label, remaining }) => <option key={id} value={id}>{label} · 剩余 {remaining} 次</option>)}
      </select>
    </label>
    <label className="block text-sm">增加 1 次的限定技
      <select className="soft-input mt-1 w-full" value={selectedCheatRecipient?.id ?? ""}
        disabled={!selectedCheatDonor} onChange={(event) => setCheatTransferTo(event.currentTarget.value)}>
        <option value="">请选择限定技</option>
        {cheatRecipients.map(({ id, label, remaining }) => <option key={id} value={id}>{label} · 剩余 {remaining} 次</option>)}
      </select>
    </label>
  </div>;
  const isImpOrder = selectedWindowSkill?.skill.id === DEMON_IMP_ORDER_ID;
  const isGuardOrder = selectedWindowSkill?.skill.id === DEMON_GUARD_ORDER_ID;
  const isDemonOrder = isImpOrder || isGuardOrder;
  const isDemonSummon = Boolean(selectedWindowSkill && isDemonSummonSkill(selectedWindowSkill.skill.id));
  const isHoundSummon = isTargetedDemonSummon(selectedWindowSkill?.skill.id);
  const houndSummonTargets = isHoundSummon && viewer ? demonSummonTargets(state, viewer) : [];
  const houndSummonTarget = houndSummonTargets.find(({ id }) => id === windowSkillTargetId) ?? houndSummonTargets[0];
  const summonUses = isDemonSummon && selectedWindowSkill && viewer ?
    demonSummonUses(state, viewer, selectedWindowSkill.skill.id) : undefined;
  const orderDemons = isImpOrder ? imps : isGuardOrder ? demonGuards : [];
  const selectedDemon = orderDemons.find(({ id }) => id === demonId) ?? orderDemons[0];
  const availableOrders = isImpOrder ? IMP_ORDERS : GUARD_ORDERS;
  const selectedDemonOrder = availableOrders.includes(demonOrder) ? demonOrder : "standby";
  const needsDemonTarget = selectedDemonOrder === "fireball" || selectedDemonOrder === "legion_area" || selectedDemonOrder === "legion_single";
  const demonTargets = selectedDemon && needsDemonTarget ? demonOrderTargets(state, selectedDemon) : [];
  const selectedDemonTarget = demonTargets.find(({ id }) => id === demonTargetId);
  const currentDemonOrder = selectedDemon?.summon?.demonOrder ?? "standby";
  const automaticStarWheel = starWheelCanRedirect(viewer);
  const selectedWindowSkillPlay = selectedWindowSkill?.skill.id === "1093" && automaticStarWheel ?
    { ...selectedWindowSkill.play, targetMode: "none" as const } : selectedWindowSkill?.play;
  const isBloodRitual = selectedWindowSkill?.skill.id === BLOOD_RITUAL_FUSION_ID;
  const ritualOpponents = enemies.filter((target) => target.id !== viewer?.id);
  const ritualTargets = selectableEnemies.filter((target) => target.id !== viewer?.id);
  const ritualNeedsSecond = ritualOpponents.length > 1;
  const ritualFirst = ritualTargets.find(({ id }) => id === windowSkillTargetId) ?? ritualTargets[0];
  const ritualSecondChoices = ritualTargets.filter(({ id }) => id !== ritualFirst?.id);
  const ritualSecond = ritualSecondChoices.find(({ id }) => id === windowSkillExtraTargetId) ?? ritualSecondChoices[0];
  const isTianlieResponse = selectedWindowSkill?.skill.id === TIANLIE_CONTINUE_ID || selectedWindowSkill?.skill.id === TIANLIE_FEEDBACK_ID;
  const isTianlieMight = selectedWindowSkill?.skill.id === TIANLIE_MIGHT_ID;
  const isPurpleScale = selectedWindowSkill?.skill.id === PURPLE_SCALE_ID;
  const isFiveElementsLevel = selectedWindowSkill?.skill.id === FIVE_ELEMENTS_LEVEL;
  const isColdLight = selectedWindowSkill?.skill.id === NINE_COLD;
  const isBubbleEnhance = selectedWindowSkill?.skill.id === BUBBLE_ENHANCE;
  const isAsuraFerry = selectedWindowSkill?.skill.id === ASURA_FERRY_ID;
  const isAttackAttachment = isTianlieMight || isAsuraFerry || isPurpleScale || isBubbleEnhance || isFiveElementsLevel || isColdLight ||
    selectedWindowSkill?.skill.id === WIND_TRACK_ID || selectedWindowSkill?.skill.id === FALLEN_SPLENDOR_DOUBLE;
  const isEternalMove = selectedWindowSkill?.skill.id === ETERNAL_BIND_ID || selectedWindowSkill?.skill.id === ETERNAL_REPLACE_ID;
  const eternalMove = state.eternalMoveChoices?.find(({ index }) => index === eternalMoveIndex) ?? state.eternalMoveChoices?.[0];
  const isChaosWave = selectedWindowSkill?.skill.id === CHAOS_WAVE_ID;
  const chaosMoves = isChaosWave && viewer ? chaosWaveChoices(state, viewer.id) : [];
  const chaosMove = chaosMoves.find(({ index }) => index === tianlieAttackIndex) ?? chaosMoves[0];
  const tianlieChoices = isTianlieResponse ?
    state.tianlieResponseChoices?.filter((choice) => choice.skillId === selectedWindowSkill?.skill.id) ?? [] : [];
  const tianlieResponse = tianlieChoices.find((choice) => choice.id === tianlieResponseId) ?? tianlieChoices[0];
  const tianlieAttacks = isAttackAttachment && viewer ? Object.entries(previewPlayerAttackStats(state, viewer.id, undefined, isPurpleScale || isBubbleEnhance || isColdLight).stats)
    .filter(([index, stats]) => isPurpleScale ? !viewer.buffs.some((buff) => buff.id.startsWith(`${PURPLE_SCALE_PREFIX}${index}:`) &&
      (buff.expiresAtTurn ?? 0) > state.turnNumber) : isBubbleEnhance ?
      !bubbleDreamMoveEnhanced(viewer, Number(index), state.turnNumber) : isColdLight ? !stats.nonAttackMove || !stats.noClashLevel : !stats.nonAttackMove)
    .filter(([index]) => selectedWindowSkill?.skill.id !== WIND_TRACK_ID ||
      !viewer.buffs.some((buff) => buff.stateType === "wind_track" && buff.attackActionIndex === Number(index)))
    .filter(([index]) => !isFiveElementsLevel || !viewer.buffs.some((buff) =>
      buff.id.startsWith(`${FIVE_ELEMENTS_LEVEL_PREFIX}${index}:`) && (buff.expiresAtTurn ?? 0) > state.turnNumber)) : [];
  const tianlieAttack = tianlieAttacks.find(([index]) => Number(index) === tianlieAttackIndex) ?? tianlieAttacks[0];
  const coldTargetField = tianlieAttack?.[1].nonAttackMove ? "level" : tianlieAttack?.[1].noClashLevel ? "power" : coldLightField;
  const purpleCanSetPower = Boolean(tianlieAttack && !tianlieAttack[1].nonAttackMove && !tianlieAttack[1].fixedPointPower);
  const readySlotMachines = viewer ? getReadySlotMachines(viewer) : [];
  const chosenSlotMachine = readySlotMachines.find((entry) => entry.id === slotMachineId) ?? readySlotMachines[0];
  const selectedBlindIds = blindSelected.filter((id) => state.blindSkillChoices?.some((choice) => choice.instanceId === id));
  const selectedSakuraIds = sakuraSelected.filter((id) => state.sakuraCardChoices?.some((choice) => choice.instanceId === id));
  const karmaSelections = karmaChanges.turn === state.turnNumber ? karmaChanges.byPlayer : {};
  const karmaTargetIds = [...new Set(state.karmaCardChoices?.map(({ playerId }) => playerId))];
  const isKarmaChangedCardValid = ({ cardInstanceId }: Partial<KarmaCardChange>, playerId: string) =>
    state.karmaCardChoices?.some((choice) => choice.playerId === playerId && choice.instanceId === cardInstanceId);
  const karmaCardChanges = karmaTargetIds.flatMap((playerId): KarmaCardChange[] => {
    const choice = karmaSelections[playerId];
    return choice?.cardInstanceId && choice.replacementCardId && isKarmaChangedCardValid(choice, playerId) &&
      state.karmaReplacementIds?.includes(choice.replacementCardId) ?
      [{ cardInstanceId: choice.cardInstanceId, replacementCardId: choice.replacementCardId }] : [];
  });
  const karmaSelectionIncomplete = mode === "skill" && selectedSkill?.skill.id === KARMA_CYCLE_ID && karmaTargetIds.some((playerId) => {
    const selection = karmaSelections[playerId];
    return Boolean(selection?.cardInstanceId && isKarmaChangedCardValid(selection, playerId) &&
      (!selection.replacementCardId || !state.karmaReplacementIds?.includes(selection.replacementCardId)));
  });
  const setKarmaSelection = (playerId: string, choice: Partial<KarmaCardChange>) =>
    setKarmaChanges({ turn: state.turnNumber, byPlayer: { ...karmaSelections, [playerId]: choice } });
  const sakuraPicker = (limit: number) => (
    <fieldset className="grid max-h-56 gap-1 overflow-y-auto text-sm">
      <legend>{state.sakuraTurnEndResponse || pendingDeathWindow ? "选择要弃置的一张大卡" :
        `选择要弃置的大卡（${selectedSakuraIds.length}/${limit}）`}</legend>
      {state.sakuraCardChoices?.map((choice) => {
        const checked = selectedSakuraIds.includes(choice.instanceId);
        const playerCount = state.sakuraCardChoices?.filter((item) => item.playerId === choice.playerId &&
          selectedSakuraIds.includes(item.instanceId)).length ?? 0;
        const name = state.players.find((player) => player.id === choice.playerId)?.name;
        return <label key={choice.instanceId} className="flex items-center gap-2">
          <input type={state.sakuraTurnEndResponse || pendingDeathWindow ? "radio" : "checkbox"} name="sakura-card" checked={checked}
            disabled={!state.sakuraTurnEndResponse && !pendingDeathWindow && !checked && (selectedSakuraIds.length >= limit || playerCount >= choice.remainingDiscards)}
            onChange={() => setSakuraSelected(state.sakuraTurnEndResponse || pendingDeathWindow ? [choice.instanceId] : checked ?
              selectedSakuraIds.filter((id) => id !== choice.instanceId) : [...selectedSakuraIds, choice.instanceId])} />
          {name} · 大卡 {choice.number}{choice.visibleCardId ? ` · ${getBigCard(choice.visibleCardId)?.name ?? choice.visibleCardId}` : ""}
          {limit > 1 ? `（该玩家剩 ${choice.remainingDiscards} 次）` : ""}
        </label>;
      })}
    </fieldset>
  );
  const verdictFreeAvailable = viewer?.buffs.some((buff) => buff.id === "free_imperial_verdict" && buff.stacks > 0) ?? false;
  const freeVerdict = !selectedFreeMove && selectedSkill?.skill.id === VERDICT_ACTION_ID && verdictFreeAvailable && useFreeVerdict;
  const isWindowAttackMark = Boolean(selectedWindowSkill && getAttackMarkKind(selectedWindowSkill.skill.id));
  const windowMarkAttackOptions = viewer ? getAttackMarkChoices(state, viewer.id) : [];
  const selectedWindowMarkAttack = windowMarkAttackOptions.find((option) => option.actionIndex === windowMarkAttackIndex) ?? windowMarkAttackOptions[0];
  const isWindowActionSwitch =
    selectedWindowSkill ? isActionSwitchSkillId(selectedWindowSkill.skill.id) : false;
  const isWindowAttackStatModifier =
    selectedWindowSkill?.skill.id === "1044" ||
    selectedWindowSkill?.skill.id === "1090";
  const isWindowDoubleEdge = isDoubleEdgeSwordSkill(selectedWindowSkill?.skill);
  const isWindowLiegong = selectedWindowSkill?.skill.id === LIEGONG_SKILL_ID;
  const isWindowAbsoluteGuard = isAbsoluteGuardSkill(selectedWindowSkill?.skill);
  const isWindowSandTransform = selectedWindowSkillPlay?.effect === "sand_transform";
  const isWindowDamageRedirect = selectedWindowSkill?.skill.id === "1093";
  const isWindowBalance = selectedWindowSkill?.skill.id === "1110";
  const isWindowLightning = selectedWindowSkill?.skill.id === "1034";
  const isWindowLishang = selectedWindowSkill?.skill.id === "1067";
  const isWindowHellOverlord = selectedWindowSkill?.skill.id === HELL_OVERLORD_SKILL_ID;
  const pursuitSkillId = selectedWindowSkill &&
    (isHunyaoPursuit(selectedWindowSkill.skill.id) || selectedWindowSkill.skill.id === WIND_PURSUIT_ID) ? selectedWindowSkill.skill.id : undefined;
  const pursuitTargetOptions = useMemo(() => pursuitSkillId === WIND_PURSUIT_ID && viewer ? getWindPursuitTargets(state, viewer) :
    pursuitSkillId ? getHunyaoPursuitTargets(state, pursuitSkillId) : [], [state, viewer, pursuitSkillId]);
  const isWindowIceRain = selectedWindowSkill?.skill.id === ICE_RAIN_SKILL_ID;
  const isWindowCrossGuard = selectedWindowSkill?.skill.id === CROSS_GUARD_SKILL_ID;
  const isWindowCrystalGuard = selectedWindowSkill?.skill.id === CRYSTAL_GUARD_ID;
  const maxCrystalMarks = crystalGuardMarkCount(viewer);
  const isWindowDamageMark = isWindowIceRain || isWindowCrossGuard || isWindowCrystalGuard;
  const isWindowShunshouSteal = selectedWindowSkill?.skill.id === SHUNSHOU_STEAL_SKILL_ID;
  const isWindowMagic = selectedWindowSkill?.skill.id === getFusionSkillId("魔域");
  const smallSkills = useMemo(
    () => getSmallSkills(),
    []
  );
  const guessBigCard = isBigSkillMode(state.config.skillMode);
  const guessSkills = useMemo(() => guessBigCard
    ? getBigCards().map(({ id, name }) => ({ id, label: `${id} · ${name}`, search: `${id} ${name}` }))
    : getAllSkills({ includeFusions: true }).map((skill) => ({
      id: skill.id, label: `${skill.name} #${skill.sourceRow}`, search: searchSkillText(skill)
    })), [guessBigCard]);
  const sandSkills = viewer && selectedWindowSkill ? getAcquisitionSkillChoices(viewer, selectedWindowSkill.skill.id)
    .map(getSkill).filter((skill): skill is NonNullable<ReturnType<typeof getSkill>> => Boolean(skill)) : smallSkills;
  const filteredSandSkills = useMemo(() => {
    const normalized = windowSandSkillQuery.trim();
    const filtered = normalized
      ? sandSkills.filter((skill) =>
          searchSkillText(skill).includes(normalized)
        )
      : sandSkills;
    const selectedSkill = sandSkills.find((skill) => skill.id === windowSandSkillId);
    if (selectedSkill && !filtered.some((skill) => skill.id === selectedSkill.id)) {
      return [selectedSkill, ...filtered];
    }
    return filtered;
  }, [sandSkills, windowSandSkillId, windowSandSkillQuery]);
  const windowSwitchOptions = useMemo(
    () =>
      selectedWindowSkill && viewer
        ? buildActionSwitchOptions(state, viewer.id, selectedWindowSkill.skill.id)
        : [],
    [selectedWindowSkill, state, viewer]
  );
  const selectedWindowSwitch =
    windowSwitchOptions.find((option) => option.key === windowSwitchKey) ??
    windowSwitchOptions[0];
  const windowAttackStatModifierOptions = useMemo(
    () =>
      selectedWindowSkill && viewer
        ? buildAttackStatModifierOptions(state, viewer.id, selectedWindowSkill.skill.id)
        : [],
    [selectedWindowSkill, state, viewer]
  );
  const selectedWindowAttackStatModifier =
    windowAttackStatModifierOptions.find(
      (option) => option.key === windowAttackStatModifierKey
    ) ?? windowAttackStatModifierOptions[0];
  const windowDoubleEdgeOptions = useMemo(
    () =>
      viewer
        ? buildDoubleEdgeOptionsV2(state, viewer.id)
        : [],
    [state, viewer]
  );
  const selectedWindowDoubleEdge =
    windowDoubleEdgeOptions.find((option) => option.key === windowDoubleEdgeKey) ??
    windowDoubleEdgeOptions[0];
  const windowLiegongOptions = useMemo(
    () =>
      viewer
        ? buildLiegongOptions(state, viewer.id)
        : [],
    [state, viewer]
  );
  const selectedWindowLiegong =
    windowLiegongOptions.find((option) => option.key === windowLiegongKey) ??
    windowLiegongOptions[0];
  const windowAbsoluteGuardOptions = useMemo(
    () =>
      viewer
        ? buildAbsoluteGuardOptions(state, viewer.id)
        : [],
    [state, viewer]
  );
  const selectedWindowAbsoluteGuard =
    windowAbsoluteGuardOptions.find((option) => option.key === windowAbsoluteGuardKey) ??
    windowAbsoluteGuardOptions[0];
  const hasWindowAttackAction = Boolean(
    viewer &&
      state.revealedActions?.[viewer.id]?.actions.some((action) => isAttackLikeAction(action))
  );
  const selectedWindowTarget = state.players.find((player) => player.id === windowSkillTargetId);
  const exposedTargetSkills = (selectedWindowTarget?.skills ?? [])
    .map((id) => getSkill(id))
    .filter((skill): skill is NonNullable<ReturnType<typeof getSkill>> => Boolean(skill))
    .filter((skill) => {
      if (selectedWindowSkill?.skill.id === "1004") {
        return skillHasTypeTag(skill, "锁定技");
      }
      if (isWindowLishang) {
        return smallSkills.some((smallSkill) => smallSkill.id === skill.id);
      }
      if (selectedWindowSkill?.skill.id === "1100") return !getFusionRecipe(skill.id);
      if (selectedWindowSkill?.skill.id === getFusionSkillId("天魔舞")) return getFusionTier(skill.id) === 2 && skill.id !== getFusionSkillId("天魔舞");
      return true;
    });
  const filteredExposedTargetSkills = useMemo(() => {
    const normalized = windowExposedSkillQuery.trim();
    const filtered = normalized
      ? exposedTargetSkills.filter((skill) => searchSkillText(skill).includes(normalized))
      : exposedTargetSkills;
    const selectedSkill = exposedTargetSkills.find((skill) => skill.id === windowTargetSkillId);
    if (selectedSkill && !filtered.some((skill) => skill.id === selectedSkill.id)) {
      return [selectedSkill, ...filtered];
    }
    return filtered;
  }, [exposedTargetSkills, windowExposedSkillQuery, windowTargetSkillId]);
  const filteredGuessSkills = useMemo(() => {
    const normalized = windowGuessSkillQuery.trim();
    const filtered = normalized
      ? guessSkills.filter((skill) => skill.search.includes(normalized))
      : guessSkills;
    const selectedSkill = guessSkills.find((skill) => skill.id === windowGuessSkillId);
    if (selectedSkill && !filtered.some((skill) => skill.id === selectedSkill.id)) {
      return [selectedSkill, ...filtered];
    }
    return filtered;
  }, [guessSkills, windowGuessSkillId, windowGuessSkillQuery]);
  const redirectableDamageOptions = useMemo(
    () => {
      if (!viewer?.id) {
        return [];
      }

      return (state.pendingDamageItems ?? []).filter(
        (item) =>
          item.targetId === viewer.id &&
          isDamageWithinLimit(item, fromLegacyCombatStat(getDamageRedirectLimit(viewer))) &&
          (automaticStarWheel || !(item.redirectedByPlayerIds ?? []).includes(viewer.id))
      );
    },
    [state.pendingDamageItems, viewer, automaticStarWheel]
  );
  const starWheelStatusOptions = useMemo(() => starWheelStatusChoices(state, viewer), [state.starWheelPendingStatuses, viewer]);
  const iceRainDamageOptions = useMemo(() => {
    if (!viewer?.id) {
      return [];
    }

    return (state.pendingDamageItems ?? []).filter((item) => {
      if (
        item.targetId !== viewer.id ||
        !isAttackDamageItem(item) ||
        item.amount <= 0 ||
        !item.sourceId ||
        item.sourceId === viewer.id ||
        item.damageModifierIds?.includes("ice_rain")
      ) {
        return false;
      }

      const source = state.players.find((player) => player.id === item.sourceId);
      return Boolean(
        source?.buffs.some((buff) => buff.id === `ice_rain:${viewer.id}` && buff.stacks > 0)
      );
    });
  }, [state.pendingDamageItems, state.players, viewer?.id]);
  const crossGuardDamageOptions = useMemo(() => {
    if (!viewer?.id) {
      return [];
    }

    const hasHuyou = Boolean(
      viewer.buffs.some((buff) => buff.id === "huyou_mark" && buff.stacks > 0)
    );
    const hasCross = Boolean(
      viewer.buffs.some((buff) => buff.id === "cross_mark" && buff.stacks > 0)
    );
    return (state.pendingDamageItems ?? []).filter((item) => {
      if (item.amount <= 0 || !isAttackDamageItem(item)) {
        return false;
      }

      if (
        item.targetId === viewer.id &&
        !item.internalDamage &&
        hasHuyou &&
        !item.damageModifierIds?.includes("huyou")
      ) {
        return true;
      }

      return Boolean(
        hasCross &&
          !item.damageModifierIds?.includes("cross") &&
          areAdjacentPlayerIds(state, viewer.id, item.targetId)
      );
    });
  }, [state, viewer]);
  const damageMarkOptions = useMemo(
    () =>
      isWindowIceRain
        ? iceRainDamageOptions
        : isWindowCrossGuard
          ? crossGuardDamageOptions
          : isWindowCrystalGuard ? crossGuardDamageOptions.filter((item) => item.targetId === viewer?.id) : [],
    [crossGuardDamageOptions, iceRainDamageOptions, isWindowCrossGuard, isWindowCrystalGuard, isWindowIceRain, viewer?.id]
  );
  const shunshouChoiceOptions = useMemo(
    () =>
      (state.pendingSkillChoices ?? [])
        .filter((choice) => choice.kind === "steal_skill" && choice.playerId === viewer?.id)
        .map((choice) => {
          const skill = getSkill(choice.skillId);
          const source = state.players.find((player) => player.id === choice.sourcePlayerId);
          return skill
            ? {
                choice,
                skill,
                sourceName: source?.name ?? "未知玩家"
              }
            : undefined;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [state.pendingSkillChoices, state.players, viewer?.id]
  );
  const alreadyFailedSkillGuess = Boolean(
    viewer?.buffs.some((buff) => buff.id === `skill_guess_failed:${state.turnNumber}`)
  );
  const selectedSkillPlay = selectedSkill?.skill.id === HOUND_SUMMON_ID && houndBiteIsArea(viewer)
    ? { ...selectedSkill.play, targetMode: "all" as const } : selectedSkill?.play;
  const [totemKind, setTotemKind] = useState<TotemKind>("flame");
  const [totemRange, setTotemRange] = useState<TotemRange>("center");
  const [totemAfterId, setTotemAfterId] = useState("");
  const [totemPrimaryId, setTotemPrimaryId] = useState("");
  const selectingTotem = mode === "skill" && Boolean(selectedSkill && isTotemCreation(selectedSkill.skill.id));
  const totemSeats = selectingTotem ? getCombatSeats(state, viewer?.spaceId) : [];
  const totemSeatNumbers = selectingTotem ? getCombatSeatNumbers(state) : undefined;
  const totemPrimary = totemSeats.find(({ id }) => id === (junengLock ? junengTargetId : totemPrimaryId)) ??
    (junengLock ? undefined : totemSeats[0]);
  const totemAfter = totemSeats.find(({ id }) => id === totemAfterId);
  const selectingShadowWind = mode === "skill" && selectedSkill?.skill.id === SHADOW_WIND_DANCE_ID;
  const selectingShadowFollow = mode === "skill" && selectedSkill?.skill.id === SHADOW_FOLLOW_ID;
  const selectingShadowMove = selectingShadowWind || selectingShadowFollow;
  const shadowSeatMode = selectingShadowFollow ? "behind" : shadowMoveMode;
  const shadowCombo = selectingShadowWind && viewer ? shadowComboForAction(viewer,
    { type: "skill", skillId: SHADOW_WIND_DANCE_ID, stacks: 1 }) : 0;
  const shadowAnchors = selectingShadowMove && viewer ? shadowSeatChoices(state, viewer, shadowSeatMode, shadowCombo)
    .filter(({ player }) => (!junengLock || player.id === junengTargetId) && (!lockedHound || player.id === lockedHound.id)) : [];
  const selectedShadowAnchor = shadowAnchors.find(({ player }) => player.id === shadowAnchorId) ?? shadowAnchors[0];
  const selectedShadowAnchorId = selectedShadowAnchor?.player.id;
  const shadowAnchorOptions = shadowAnchors.map(({ player, primary, behind }) => ({
    id: player.id,
    name: shadowSeatMode === "insert" ? `座次 ${primary} 和 ${primary + 1} 之间` :
      `${player.name} · 座次 ${behind > 1 ? `(${primary}, ${behind})` : primary}`
  }));
  const [gameSwitchMode, setGameSwitchMode] = useState<GameSwitchMode>("rock_paper_scissors");
  const selectedSaint = Boolean(selectedSkill && isSaintMove(selectedSkill.skill.id));
  const saintElements = selectedSaint ? getSaintElements(viewer) : [];
  const selectedSaintElement = saintElements.includes(saintElement) ? saintElement : undefined;
  const saintResource = selectedSaintElement ? { saintElement: selectedSaintElement } : {};
  const selectedXielingTransform = !selectedFreeMove && selectedSkill?.skill.id === XIELING_TRANSFORM_ID;
  const xielingMarkLimit = getXielingConversionLimit(viewer);
  const invalidXielingMarks = selectedXielingTransform &&
    (!Number.isSafeInteger(xielingMarkCost) || xielingMarkCost < 1 || xielingMarkCost > xielingMarkLimit);
  const selectedSkillElementCost = selectedSkill && !selectedFreeMove
    ? getSkillElementCosts(viewer, { skillId: selectedSkill.skill.id, ...saintResource }) : [];
  const selectedBaseSkillStats =
    selectedSkill &&
    (selectedSkillPlay?.kind === "attack" && selectedSkill.skill.id !== ELECTRIC_SHOCK_SKILL_ID ||
      selectedSkill.skill.id === SEA_GOD_WAVES_ID)
      ? getSkillAttackStats(selectedSkill.skill.id, skillStacks)
      : undefined;
  const selectedSkillStats = selectedBaseSkillStats && shapeDecayAttack(viewer, selectedBaseSkillStats);
  const skillTargetIds =
    selectingShadowMove ? (selectedShadowAnchorId ? [selectedShadowAnchorId] : []) :
    selectedSkill && isMultiTargetAttackSkill(selectedSkill.skill.id)
      ? Array.from(
          new Set(
            [skillTargetId, ...skillExtraTargetIds].filter(
              (id): id is string => Boolean(id)
            )
          )
        )
      : skillTargetId
        ? [skillTargetId]
        : [];
  const selectedSkillTargetError =
    selectedSkill?.skill.id === SEVEN_STAR_YAOGUANG && !sevenStarRestoration ? "当前没有已失去的七星形态" :
    selectedSkill && isMultiTargetAttackSkill(selectedSkill.skill.id)
      ? multiTargetSkillTargetErrorForIds(
          state,
          selectedSkill.skill.id,
          skillTargetIds
        )
      : undefined;
  const skillMaxStacks = selectedFreeMove?.move.type === "skill" ? selectedFreeMove.move.stacks : selectedSkill && viewer
    ? Math.max(1, getAffordableSkillStacks(state, viewer, selectedSkill.skill.id, freeVerdict ? 1 : 0, selectedSaintElement))
    : 1;
  const skillCost = selectedFreeMove ? 0 : selectedSkill && viewer ? getTurnSkillActionCost(viewer, {
    type: "skill", skillId: selectedSkill.skill.id, stacks: skillStacks, ...saintResource, ...(freeVerdict ? { freeStacks: 1 } : {})
  }, state) : selectedSkillPlay ? selectedSkillPlay.cost * skillStacks : 0;
  const windowSkillMaxStacks = selectedWindowSkill && viewer && !isDemonOrder && !isDemonSummon && !isVacuumWindowSkill
    ? Math.max(1, Math.min(
        getAffordableSkillStacks(state, viewer, selectedWindowSkill.skill.id),
        isWindowAttackMark && selectedWindowMarkAttack
          ? getAttackMarkCapacity(viewer, selectedWindowSkill.skill.id, selectedWindowMarkAttack.actionIndex)
          : MAX_ACTION_STACKS
      ))
    : 1;
  const windowSkillCost = isVacuumWindowSkill ? 0 : selectedWindowSwitch
    ? selectedWindowSwitch.cost
    : isWindowAbsoluteGuard && selectedWindowAbsoluteGuard
      ? selectedWindowAbsoluteGuard.cost
    : selectedWindowSkill && viewer
      ? getTurnSkillActionCost(viewer, { type: "skill", skillId: selectedWindowSkill.skill.id, stacks: windowSkillStacks }, state)
      : 0;
  const antiCakeBalance = viewer && canUseAntiCakes(state, viewer) ? antiCakeCount(viewer) : 0;
  const youkaiCakeBalance = youkaiCakeCount(viewer);
  const chooseAntiCakes = (key: string, cost: number, cakes = viewer?.cakes ?? 0, anti = antiCakeBalance): number => {
    const max = Math.max(0, Math.min(Math.floor(cost), anti));
    const fallback = cakes >= cost ? 0 : max >= cost ? cost : Math.ceil(cost - cakes);
    return Math.max(0, Math.min(max, antiCakeChoices[key] ?? fallback));
  };
  const changeAntiCakeChoice = (key: string, amount: number) => setAntiCakeChoices((previous) => ({ ...previous, [key]: amount }));
  const chooseYoukaiCakes = (key: string, cost: number, cakes: number, youkai: number): number =>
    Math.max(0, Math.min(cost, youkai, youkaiCakeChoices[key] ?? Math.max(0, cost - cakes)));
  const changeYoukaiCakeChoice = (key: string, amount: number) => setYoukaiCakeChoices((previous) => ({ ...previous, [key]: amount }));
  const windowPrice = !isVacuumWindowSkill && selectedWindowSkill ? getSkillElementCost(viewer, { skillId: selectedWindowSkill.skill.id }) : undefined;
  const windowYoukaiBalance = Math.max(0, youkaiCakeBalance - (windowPrice?.element === YOUKAI_ELEMENT ? windowPrice.perStack * windowSkillStacks : 0));
  const windowAntiCakes = chooseAntiCakes("window", windowSkillCost, (viewer?.cakes ?? 0) + windowYoukaiBalance);
  const windowYoukaiCakes = chooseYoukaiCakes("window", windowSkillCost - windowAntiCakes, viewer?.cakes ?? 0, windowYoukaiBalance);
  const attackCost = attackRows.reduce((sum, row) => {
    return sum + rowCost(row);
  }, 0);
  const elementCosts = new Map<string, number>();
  let thunderBallCost = 0;
  let bloodQiSpent = 0;
  let bloodQiRequired = 0;
  const chargeElement = (cost: SkillPlayDefinition["elementCost"], stacks: number) => {
    if (cost) elementCosts.set(cost.element, (elementCosts.get(cost.element) ?? 0) + cost.perStack * stacks);
  };
  const chargeBloodQi = (skillId: SkillId, stacks: number) => {
    const { cost, minimum } = getSkillBloodQiCosts(skillId, stacks);
    bloodQiRequired = Math.max(bloodQiRequired, bloodQiSpent + minimum);
    bloodQiSpent += cost;
  };
  if (!selectedFreeMove && mode === "attack") for (const row of attackRows) {
    if (row.kind === "skill") {
      for (const cost of getSkillElementCosts(viewer, { skillId: row.skillId })) chargeElement(cost, row.stacks);
      thunderBallCost += (getSkillPlay(row.skillId)?.itemCost?.perStack ?? 0) * row.stacks;
      chargeBloodQi(row.skillId, row.stacks);
    }
  }
  if (!selectedFreeMove && mode === "skill") {
    for (const cost of selectedSkillElementCost) chargeElement(cost, skillStacks);
    thunderBallCost = (selectedSkillPlay?.itemCost?.perStack ?? 0) * skillStacks;
    if (selectedSkill) chargeBloodQi(selectedSkill.skill.id, skillStacks);
  }
  const elementShortage = [...elementCosts].find(([element, cost]) => cost > getElementAmount(viewer, element));
  const thunderBallShortage = thunderBallCost > thunderBallCount(viewer);
  const bloodQiShortage = bloodQiRequired > 0 && !hasBloodQi(viewer, bloodQiRequired);
  const resourceCostLabel = [...[...elementCosts].map(([element, cost]) => `${cost} ${element}`),
    ...(thunderBallCost > 0 ? [`${thunderBallCost} 雷球`] : []),
    ...(bloodQiSpent > 0 ? [`${bloodQiSpent} 血气`] : [])].join(" ＋ ");
  const freeRebound = selectedFreeMove?.move.type === "defense" || isNextWujinReboundFree(viewer);
  const reboundCost = viewer ? getReboundCakeCost(state, viewer, freeRebound) : 0;
  let remainingCakes = viewer?.cakes ?? 0;
  let remainingAntiCakes = antiCakeBalance;
  let remainingYoukaiCakes = Math.max(0, youkaiCakeBalance - (elementCosts.get(YOUKAI_ELEMENT) ?? 0));
  const paymentRows = (mode === "attack" ? attackRows.map((row, index) => ({ key: row.id, cost: rowCost(row), label: `第 ${index + 1} 招` })) :
    [{ key: "main", cost: mode === "skill" ? skillCost : mode === "defense" && defense === "rebound" ? reboundCost : 0, label: "本次出招" }])
    .map((row) => {
      const anti = chooseAntiCakes(row.key, row.cost, remainingCakes + remainingYoukaiCakes, remainingAntiCakes);
      const maxYoukai = Math.min(row.cost - anti, remainingYoukaiCakes);
      const youkai = chooseYoukaiCakes(row.key, row.cost - anti, remainingCakes, remainingYoukaiCakes);
      remainingCakes -= row.cost - anti - youkai;
      remainingAntiCakes -= anti;
      remainingYoukaiCakes -= youkai;
      return { ...row, anti, youkai, maxYoukai };
    });
  const attackCostTooHigh = mode === "attack" && remainingCakes < 0;
  const skillCostTooHigh = mode === "skill" && remainingCakes < 0;
  const reboundLocked = hasTianyeReboundLock(viewer, state.turnNumber);
  const reboundUnavailable = mode === "defense" && defense === "rebound" &&
    (reboundLocked || !freeRebound && (!viewer || !hasReboundCakeBalance(state, viewer) || remainingCakes < 0));
  const attackTargets = mode === "attack" ? attackRows.flatMap((row) => rowTargetIds(row)).filter(Boolean) : [];
  const duplicatedTargets = new Set(attackTargets).size !== attackTargets.length;
  const hasAreaMixed =
    mode === "attack" && attackRows.length > 1 && attackRows.some((row) => rowIsArea(row));
  const hasInvalidMultiTargetSkillTargets = mode === "attack" && attackRows.some((row) =>
    Boolean(multiTargetSkillTargetError(state, row))
  );
  const missingTarget =
    (mode === "attack" &&
      attackRows.some((row) => !rowIsArea(row) && rowTargetIds(row).length === 0)) ||
    (mode === "defense" && defense === "rebound" && !viewerHasScatterRebound &&
      !reboundTargets.some((target) => target.id === targetId)) ||
    (selectingTotem && !totemPrimary) ||
    (selectingShadowMove && !selectedShadowAnchorId) ||
    (mode === "skill" && (!selectingTotem && !selectingShadowMove && selectedSkillPlay?.targetMode === "single" && !skillTargetId ||
      selectedSkill?.skill.id === CHARITY_LINK_ID && !skillExtraTargetIds.some(Boolean)));
  const sakuraFinaleIncomplete = mode === "skill" && selectedSkill?.skill.id === SAKURA_FINALE_ID &&
    selectedSakuraIds.length !== (state.sakuraFinaleDiscardCount ?? 0);
  const selectingSwarm = mode === "skill" && selectedSkill?.skill.id === SWARM_RETURN_ID;
  const selectedSwarmAllocation = Object.fromEntries(SWARM_INSECTS.map((insect) =>
    [insect, Math.min(swarmAllocation[insect] ?? 0, swarmInsectCount(viewer, insect))]));
  const swarmIncomplete = selectingSwarm && !selectedFreeMove && (!viewer || !isSwarmAllocationValid(viewer, selectedSwarmAllocation));
  const tigerStabSelected = mode === "attack" && attackRows.some((row) => row.kind === "skill" && row.skillId === TIGER_STAB);
  const invalidTigerPower = tigerStabSelected && (!tigerPower.trim() || !Number.isSafeInteger(Number(tigerPower)));
  const actionInvalid = Boolean(
    invalidTigerPower ||
    (freeMoveId && !selectedFreeMove) || ((mode === "attack" || selectingSwarm) && firstTurnAttackLocked) || swarmIncomplete ||
      elementShortage || thunderBallShortage || bloodQiShortage || attackCostTooHigh ||
      skillCostTooHigh ||
      (mode === "skill" && invalidXielingMarks) ||
      sakuraFinaleIncomplete || karmaSelectionIncomplete ||
      (mode === "skill" && selectedSkill?.skill.id === RELEASE_DAMAGE_ID && !selectedStoredDamage) ||
      (junengBlocked && ((mode === "attack" && attackRows.some((row) => !rowIsArea(row))) ||
        (mode === "skill" && selectedSkill?.skill.id !== BUBBLE_FINALE && selectedSkillPlay?.targetMode === "single") ||
        (mode === "defense" && defense === "rebound" && !viewerHasScatterRebound))) ||
      (mode === "skill" && (!selectedSkill || !selectedSkillPlay)) ||
      (mode === "skill" && Boolean(selectedSkillTargetError)) ||
      reboundUnavailable ||
      missingTarget ||
      duplicatedTargets ||
      hasAreaMixed ||
      hasInvalidMultiTargetSkillTargets
  );
  const actionInvalidReason = freeMoveId && !selectedFreeMove ? "这次免费机会已用完" :
    invalidTigerPower ? "请输入幽冥刺的整数攻击值" :
    swarmIncomplete ? "请从库存选择合计10只虫" :
    karmaSelectionIncomplete ? "请为选中的大卡指定替换卡" :
    sakuraFinaleIncomplete ? `请选满 ${state.sakuraFinaleDiscardCount} 张可弃置的大卡` :
    (mode === "attack" || selectingSwarm) && firstTurnAttackLocked ? "本轮第一回合不能攻击" :
    mode === "skill" && invalidXielingMarks ? "请选择可转换的邪灵印记层数" :
    thunderBallShortage ? `雷球不足，需要 ${thunderBallCost} 颗` :
    bloodQiShortage ? `血气不足，需要至少 ${bloodQiRequired} 点` :
    elementShortage ? `${elementShortage[0]}不足，需要 ${elementShortage[1]} ${elementShortage[0]}` : attackCostTooHigh
    ? `饼不足，需要 ${attackCost} 饼`
    : skillCostTooHigh
      ? `饼不足，需要 ${skillCost} 饼`
      : mode === "skill" && !selectedSkill
        ? "还没有选择技能"
        : mode === "skill" && !selectedSkillPlay
          ? "这张技能现在不能用"
          : mode === "skill" && selectedSkillTargetError
            ? selectedSkillTargetError
            : reboundUnavailable
              ? reboundLocked ? "绝坠之翼：无法再次出反弹" : "饼不足，不能反弹"
              : missingTarget
                ? "还没有选择目标"
                : duplicatedTargets
                  ? "同一回合不能重复指定同一目标"
                  : hasAreaMixed
                    ? "群攻招式必须单独使用"
                    : hasInvalidMultiTargetSkillTargets
                      ? "追加目标需要补全"
                      : undefined;
  const actionRecoveryHint = !moveBlockReason && actionInvalid
    ? attackCostTooHigh || skillCostTooHigh || reboundUnavailable || thunderBallShortage
      ? "先改选吃饼或降低消耗"
      : missingTarget
        ? "先选择目标"
        : duplicatedTargets
          ? "换一个未指定过的目标"
          : hasAreaMixed
            ? "移除其他招式，只保留群攻"
            : hasInvalidMultiTargetSkillTargets
              ? "补全追加目标"
              : mode === "skill" && !selectedSkill
                ? "先选择一项可用技能"
                : mode === "skill" && !selectedSkillPlay
                  ? "改选当前阶段可用的技能"
                  : undefined
    : undefined;
  const selectedActionSummary = summarizeActionSelection({
    attackRows,
    cakeGain,
    gathersYoukai,
    defense,
    mode,
    selectedSkillName: selectedSkill?.skill.name,
    skillCost,
    skillStacks,
    skillTargetNames:
      selectingShadowMove ? shadowAnchorOptions.filter(({ id }) => id === selectedShadowAnchorId).map(({ name }) => name) :
      selectedSkillPlay?.targetMode === "all"
        ? enemies.filter((enemy) => enemy.id !== viewer?.id).map((enemy) => enemy.name)
        : skillTargetIds.map((id) => getPlayerName(state, id)).filter(Boolean),
    state,
    totalAttackCost: attackCost
  });
  const lockedActionSummary = moveAutoPassLabel ||
    (alreadySubmitted && lastActionSubmission ? summarizeSubmittedAction(lastActionSubmission, state) : "");
  const actionDisplaySummary = lockedActionSummary || selectedActionSummary;
  const selectedActionCost =
    mode === "attack" ? attackCost : mode === "skill" ? skillCost : mode === "defense" && defense === "rebound" ? reboundCost : 0;
  const previewTargetIds = useMemo(() => {
    if (!canAct) {
      return [];
    }

    const ids = new Set<string>();
    const addTarget = (id: string | undefined) => {
      if (id) {
        ids.add(id);
      }
    };

    if (mode === "attack" && lockedHound) {
      addTarget(lockedHound.id);
    } else if (mode === "attack") {
      attackRows.forEach((row) => rowTargetIds(row).forEach(addTarget));
    } else if (mode === "skill") {
      if (selectingShadowMove) {
        addTarget(selectedShadowAnchorId);
      } else if (selectedSkillPlay?.targetMode === "all") {
        enemies
          .filter((enemy) => enemy.id !== viewer?.id)
          .forEach((enemy) => addTarget(enemy.id));
      } else {
        addTarget(skillTargetId);
        skillExtraTargetIds.forEach(addTarget);
      }
    } else if (mode === "defense" && defense === "rebound" && !viewerHasScatterRebound) {
      addTarget(targetId);
    }

    return Array.from(ids);
  }, [
    attackRows,
    canAct,
    defense,
    enemies,
    lockedHound,
    mode,
    selectingShadowMove,
    selectedShadowAnchorId,
    selectedSkillPlay?.targetMode,
    skillExtraTargetIds,
    skillTargetId,
    targetId,
    viewer?.id,
    viewerHasScatterRebound
  ]);
  const previewTargetKey = previewTargetIds.join("|");
  const previewTargetLabel = moveBlockReason ? "—" : previewTargetIds.length > 0
    ? previewTargetIds.map((id) => getPlayerName(state, id)).join("、")
    : mode === "skill" && selectedSkillPlay?.targetMode === "all"
      ? "全体敌人"
      : mode === "gain_cake"
        ? "自己"
        : "无需目标";
  const attackSubmitName = submitNameForAttackRows(attackRows);
  const submitLabel =
    mode === "gain_cake"
      ? gathersYoukai ? `提交：积妖元 +${cakeGain}` : "提交：吃饼 +1"
      : mode === "defense"
        ? "提交：防御"
        : mode === "attack"
          ? `提交：${attackSubmitName}`
          : `提交：${selectedSkill?.skill.name ?? "技能"}`;
  const readinessLabel = moveBlockReason ? `${moveBlockReason}，自动空过` : alreadySubmitted
      ? "已提交，等待亮招"
      : actionInvalid
        ? "还差一步"
      : "可以锁定";
  const actionBlockReason = !viewer
    ? "请选择座位后再出招"
    : moveBlockReason ? moveBlockReason : alreadySubmitted
      ? "已经提交，等待其他玩家"
      : state.phase !== "collecting_actions"
        ? "还没到出招时间"
        : viewer.status !== "alive"
          ? "当前角色不能行动"
          : submitting
            ? "正在提交"
            : actionInvalidReason;
  const actionStatusLabel = actionBlockReason
    ? actionRecoveryHint
      ? `${actionBlockReason} · ${actionRecoveryHint}`
      : actionBlockReason
    : "可以锁定";
  const actionReadyState = alreadySubmitted
    ? "waiting"
    : actionBlockReason
      ? "blocked"
      : "ready";
  const actionCommandLabel = moveAutoPassLabel ? `${moveAutoPassLabel}，无需提交` : alreadySubmitted
    ? lockedActionSummary
      ? `已锁定：${lockedActionSummary}`
      : "等待全部玩家亮招"
    : actionReadyState === "ready"
      ? "点击提交，锁定本回合"
      : "按提示补完再提交";
  const repeatActionError = getRepeatActionError({
    canAct,
    lastActionSubmission,
    state,
    viewerId: viewer?.id
  });
  const canRepeatAction = Boolean(lastActionSubmission && !repeatActionError && !submitting);
  const submitReady = canAct && !submitting && !actionInvalid;

  useEffect(() => {
    setTargetId((current) => reboundTargets.some(({ id }) => id === current) ? current : reboundTargets[0]?.id ?? "");
  }, [reboundTargets]);

  useEffect(() => {
    setAttackRows((rows) => {
      let changed = false;
      const nextRows = rows.map((row) => {
        const enemyIds = new Set(enemies.map((enemy) => enemy.id));
        const patch: Partial<AttackRow> = {};
        const validTotemTarget = (row.kind !== "skill" || canSkillSelectTotem(row.skillId)) &&
          totemOptions.some(({ id }) => id === row.targetId);

        const dedicatedTargets = row.kind === "skill" ? specialMoveTargets(row.skillId) : undefined;
        const available = dedicatedTargets ?? enemies;
        if (available[0] && !available.some(({ id }) => id === row.targetId) && !validTotemTarget) {
          patch.targetId = available[0].id;
        }

        const extraTargetIds = (row.extraTargetIds ?? []).filter((id) =>
          enemyIds.has(id) || canAddTotemAsExtraTarget(row.skillId) && totemOptions.some((totem) => totem.id === id)
        );
        if (
          extraTargetIds.length !== (row.extraTargetIds ?? []).length ||
          (!isMultiTargetAttackSkill(row.skillId) && extraTargetIds.length > 0)
        ) {
          patch.extraTargetIds = isMultiTargetAttackSkill(row.skillId)
            ? extraTargetIds
            : [];
        }

        if (Object.keys(patch).length === 0) {
          return row;
        }

        changed = true;
        return { ...row, ...patch };
      });
      return changed ? nextRows : rows;
    });
    const availableSkillTargets = specialMoveTargets(selectedSkill?.skill.id) ?? enemies;
    if (availableSkillTargets[0] && !availableSkillTargets.some((enemy) => enemy.id === skillTargetId) &&
      !(skillCanTargetTotem && totemOptions.some(({ id }) => id === skillTargetId))) {
      setSkillTargetId(availableSkillTargets[0].id);
    }
    setSkillExtraTargetIds((current) => {
      const next = current.filter(
        (targetId) =>
          targetId !== skillTargetId &&
          (enemies.some((enemy) => enemy.id === targetId) ||
            canAddTotemAsExtraTarget(selectedSkill?.skill.id) && totemOptions.some(({ id }) => id === targetId))
      );
      return next.length === current.length ? current : next;
    });
    const windowTargetOptions = isWindowLightning
      ? lightningFirstTargetOptions
      : isWindowLishang
        ? fatalSourceOptions
        : isWindowHellOverlord
          ? hellOverlordTargetOptions
          : pursuitSkillId ? pursuitTargetOptions : windowSkillCanTargetTotem ? [...enemies, ...totemOptions] : enemies;
    if (
      windowTargetOptions[0] &&
      !windowTargetOptions.some((enemy) => enemy.id === windowSkillTargetId)
    ) {
      setWindowSkillTargetId(windowTargetOptions[0].id);
    }
    if (enemies[1] && !enemies.some((enemy) => enemy.id === windowSkillExtraTargetId)) {
      setWindowSkillExtraTargetId(enemies[1].id);
    }
    if (enemies[0] && !enemies.some((enemy) => enemy.id === windowGuessTargetId)) {
      setWindowGuessTargetId(enemies[0].id);
    }
  }, [
    enemies,
    totemOptions,
    skillCanTargetTotem,
    selectedSkill?.skill.id,
    windowSkillCanTargetTotem,
    fatalSourceOptions,
    hellOverlordTargetOptions,
    isWindowHellOverlord,
    pursuitSkillId,
    pursuitTargetOptions,
    isWindowLishang,
    skillTargetId,
    windowGuessTargetId,
    windowSkillExtraTargetId,
    windowSkillTargetId
  ]);

  useEffect(() => {
    return () => onPreviewTargets?.([]);
  }, [onPreviewTargets]);

  useEffect(() => {
    if (!selectedSkill && nonAttackSkills[0]) {
      setSkillId(nonAttackSkills[0].skill.id);
      setSkillStacks(1);
      return;
    }

    if (skillStacks > skillMaxStacks) {
      setSkillStacks(skillMaxStacks);
    }
  }, [nonAttackSkills, selectedSkill, skillMaxStacks, skillStacks]);

  useEffect(() => {
    const firstSkillId = discardableSkills[0]?.id ?? "";
    if (firstSkillId && !discardableSkills.some((item) => item.id === discardSkillId)) {
      setDiscardSkillId(firstSkillId);
    } else if (!firstSkillId && discardSkillId) {
      setDiscardSkillId("");
    }
  }, [discardSkillId, discardableSkills]);

  useEffect(() => {
    if (!selectedWindowSkill && windowSkills[0]) {
      setWindowSkillId(windowSkills[0].optionId);
      setWindowSkillStacks(1);
      return;
    }

    if (windowSkillStacks > windowSkillMaxStacks) {
      setWindowSkillStacks(windowSkillMaxStacks);
    }

    if (isWindowBalance) {
      const firstBalanceTarget = balanceTargetOptions[0]?.id ?? "";
      const fallbackExtraTarget =
        balanceTargetOptions.find((player) => player.id !== windowSkillTargetId)?.id ?? "";
      if (firstBalanceTarget && !balanceTargetOptions.some((player) => player.id === windowSkillTargetId)) {
        setWindowSkillTargetId(firstBalanceTarget);
      }
      if (
        fallbackExtraTarget &&
        (!balanceTargetOptions.some((player) => player.id === windowSkillExtraTargetId) ||
          windowSkillExtraTargetId === windowSkillTargetId)
      ) {
        setWindowSkillExtraTargetId(fallbackExtraTarget);
      }
    }

    if (isWindowLightning) {
      const firstLightningTarget = lightningFirstTargetOptions[0]?.id ?? "";
      if (
        firstLightningTarget &&
        !lightningFirstTargetOptions.some((player) => player.id === windowSkillTargetId)
      ) {
        setWindowSkillTargetId(firstLightningTarget);
      }

      if (lightningSecondTargetOptions.length === 0) {
        if (windowSkillExtraTargetId) {
          setWindowSkillExtraTargetId("");
        }
      } else {
        const fallbackExtraTarget =
          lightningSecondTargetOptions.find((player) => player.id !== windowSkillTargetId)?.id ??
          lightningSecondTargetOptions[0]?.id ??
          "";
        if (
          fallbackExtraTarget &&
          (!lightningSecondTargetOptions.some((player) => player.id === windowSkillExtraTargetId) ||
            windowSkillExtraTargetId === windowSkillTargetId)
        ) {
          setWindowSkillExtraTargetId(fallbackExtraTarget);
        }
      }
    }

    if (isWindowDamageRedirect || isWindowDamageMark) {
      const activeDamageOptions = isWindowDamageRedirect
        ? [...redirectableDamageOptions, ...starWheelStatusOptions]
        : damageMarkOptions;
      const firstDamageId = activeDamageOptions[0]?.id ?? "";
      if (firstDamageId && !activeDamageOptions.some((item) => item.id === windowDamageId)) {
        setWindowDamageId(firstDamageId);
      } else if (!firstDamageId && windowDamageId) {
        setWindowDamageId("");
      }
    }

    if (isWindowShunshouSteal) {
      const firstSkillId = shunshouChoiceOptions[0]?.skill.id ?? "";
      if (
        firstSkillId &&
        !shunshouChoiceOptions.some((option) => option.skill.id === windowTargetSkillId)
      ) {
        setWindowTargetSkillId(firstSkillId);
      } else if (!firstSkillId && windowTargetSkillId) {
        setWindowTargetSkillId("");
      }
    }

    if (isWindowShunshouSteal) {
      // 顺手牵羊使用开局候选技能列表，不参与封印/镜像的已暴露技能同步。
    } else if (isWindowLishang) {
      if (windowTargetSkillId && !exposedTargetSkills.some((skill) => skill.id === windowTargetSkillId)) {
        setWindowTargetSkillId("");
      }
    } else if (exposedTargetSkills[0] && !exposedTargetSkills.some((skill) => skill.id === windowTargetSkillId)) {
      setWindowTargetSkillId(exposedTargetSkills[0].id);
    } else if (!exposedTargetSkills[0] && windowTargetSkillId) {
      setWindowTargetSkillId("");
    }

    if (sandSkills[0] && !sandSkills.some((skill) => skill.id === windowSandSkillId)) {
      setWindowSandSkillId(sandSkills[0].id);
    }

    if (guessSkills[0] && !guessSkills.some((skill) => skill.id === windowGuessSkillId)) {
      setWindowGuessSkillId(guessSkills[0].id);
    }

    if (
      selectedWindowSwitch &&
      !windowSwitchOptions.some((option) => option.key === windowSwitchKey)
    ) {
      setWindowSwitchKey(selectedWindowSwitch.key);
    }

    if (
      selectedWindowAttackStatModifier &&
      !windowAttackStatModifierOptions.some(
        (option) => option.key === windowAttackStatModifierKey
      )
    ) {
      setWindowAttackStatModifierKey(selectedWindowAttackStatModifier.key);
    }

    if (
      selectedWindowDoubleEdge &&
      !windowDoubleEdgeOptions.some((option) => option.key === windowDoubleEdgeKey)
    ) {
      setWindowDoubleEdgeKey(selectedWindowDoubleEdge.key);
    }

    if (
      selectedWindowLiegong &&
      !windowLiegongOptions.some((option) => option.key === windowLiegongKey)
    ) {
      setWindowLiegongKey(selectedWindowLiegong.key);
    }

    if (
      selectedWindowAbsoluteGuard &&
      !windowAbsoluteGuardOptions.some((option) => option.key === windowAbsoluteGuardKey)
    ) {
      setWindowAbsoluteGuardKey(selectedWindowAbsoluteGuard.key);
    }
  }, [
    balanceTargetOptions,
    exposedTargetSkills,
    isWindowBalance,
    isWindowDamageMark,
    isWindowDamageRedirect,
    isWindowLightning,
    isWindowLishang,
    isWindowShunshouSteal,
    lightningFirstTargetOptions,
    lightningSecondTargetOptions,
    damageMarkOptions,
    redirectableDamageOptions,
    starWheelStatusOptions,
    shunshouChoiceOptions,
    smallSkills,
    selectedWindowSkill,
    selectedWindowAttackStatModifier,
    selectedWindowDoubleEdge,
    selectedWindowLiegong,
    selectedWindowAbsoluteGuard,
    selectedWindowSwitch,
    windowSkillMaxStacks,
    windowSkillStacks,
    windowSkills,
    windowGuessSkillId,
    windowDamageId,
    windowAttackStatModifierKey,
    windowAttackStatModifierOptions,
    windowDoubleEdgeKey,
    windowDoubleEdgeOptions,
    windowLiegongKey,
    windowLiegongOptions,
    windowAbsoluteGuardKey,
    windowAbsoluteGuardOptions,
    windowSandSkillId,
    windowSkillExtraTargetId,
    windowSkillTargetId,
    windowSwitchKey,
    windowSwitchOptions,
    windowTargetSkillId
  ]);

  useEffect(() => {
    if (state.phase !== "action_window") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "SELECT" ||
        target?.tagName === "TEXTAREA" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        onPassActionWindow();
      }

      if (event.key.toLowerCase() === "f" && state.actionWindowMode === "prompt") {
        event.preventDefault();
        onEnterActionWindow();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEnterActionWindow, onPassActionWindow, state.actionWindowMode, state.phase]);

  const collecting = state.phase === "collecting_actions" &&
    !(state.purpleForesight && "mustSubmit" in state.purpleForesight);
  const phaseSkills: PhaseSkillOption[] = [];
  function addPhaseSkill(id: SkillId, controls: ReactNode, label = getSkill(id)?.name ?? id) {
    phaseSkills.push({ value: `phase:${id}`, label, controls });
  }
  function addImmediateSkill(action: SkillAction, label?: string) {
    addPhaseSkill(action.skillId, (
      <button type="button" className="btn-primary w-full justify-center" disabled={submitting}
        onClick={() => onSubmitWindowSkill(action)}>使用技能</button>
    ), label);
  }
  if ((collecting || state.phase === "action_window") && viewer?.status === "alive" &&
    !sleeping && !isSoulExiled(state, viewer) && !viewer.emptyCityOwnerId &&
    !state.actionWindowPassPlayerIds.includes(viewer.id) && !state.bloodRitualResistance &&
    !state.sakuraTurnEndResponse && !state.victoryCounter && !state.retirementCounter &&
    state.activeTimingPhase !== "turn_reveal_check") {
    const usable = (id: SkillId) => viewerCanUseSkill(state, viewer, id);
    if (!state.reversalResponseOnly && !pendingDeathWindow) {
      const starBreak = usable(TIAN_SHA_STAR_BREAK) && bigAbilitySource(viewer, { skillId: TIAN_SHA_STAR_BREAK }, true);
      if (starBreak) addImmediateSkill({ type: "skill", skillId: TIAN_SHA_STAR_BREAK, stacks: 1, bigCardInstanceId: starBreak });
      const beasts = state.activeTimingPhase === "round_before_action" && usable(SACRED_BEAST_ID)
        ? availableSacredBeasts(viewer, state.roundNumber) : [];
      if (beasts.length) addPhaseSkill(SACRED_BEAST_ID,
        <SkillActionChoices label="神兽" submitting={submitting} onSubmit={onSubmitWindowSkill}
          choices={beasts.map((beast) => ({ id: beast, label: SACRED_BEASTS[beast].name,
            action: { type: "skill", skillId: SACRED_BEAST_ID, sacredBeast: beast, stacks: 1 } }))} />);
      if (state.roundNumber >= 2 && usable(TIME_REWIND_ID) && (getSkillUseLimit(viewer, TIME_REWIND_ID) ?? 0) > 0) {
        addPhaseSkill(TIME_REWIND_ID, <RewindControls state={state} player={viewer}
          submitting={submitting} onSubmit={onSubmitWindowSkill} />);
      }
      const tigerForms = ["round_pre_interval_action", "round_after_interval_action"].includes(state.activeTimingPhase) &&
        usable(TIGER_SWITCH) ? tigerFormActions(viewer) : [];
      if (tigerForms.length) addPhaseSkill(TIGER_SWITCH, <SkillActionChoices choices={tigerForms}
        label="切换形态" submitting={submitting} onSubmit={onSubmitWindowSkill} />, "幽冥白虎 · 切换形态");
      if (usable(FIVE_ELEMENTS_CHOOSE) && (state.activeTimingPhase === "opening_action" ||
        state.activeTimingPhase === "round_before_action" && state.roundNumber > 1)) {
        const sources = bigCardActions(viewer, FIVE_ELEMENTS_CHOOSE, (card) =>
          canChooseFiveElementsForm(card.fiveElementsForms, state.roundNumber));
        const choices = sources.flatMap((choice) => viewer.bigCards?.find((card) => card.instanceId === choice.id)?.fiveElementsForms
          ?.available.flatMap((form) => form === "none" ? [] : [{
            id: `${choice.id}:${form}`, label: `${FIVE_ELEMENTS_FORMS[form].name}${sources.length > 1 ? ` · ${choice.label}` : ""}`,
            action: { ...choice.action, cardForm: form }
          }]) ?? []);
        if (choices.length) addPhaseSkill(FIVE_ELEMENTS_CHOOSE, <SkillActionChoices key={FIVE_ELEMENTS_CHOOSE}
          choices={choices} label="五行形态" submitting={submitting} onSubmit={onSubmitWindowSkill} />);
      }
      if (usable(HEXAGRAM_CHOOSE) && (state.activeTimingPhase === "opening_action" ||
        state.activeTimingPhase === "round_before_action" && state.roundNumber > 1)) {
        const sources = bigCardActions(viewer, HEXAGRAM_CHOOSE, (card) => canChooseRoundCardForm(card.hexagramForms, state.roundNumber));
        const choices = sources.flatMap((choice) => viewer.bigCards?.find((card) => card.instanceId === choice.id)?.hexagramForms
          ?.available.flatMap((form) => form === "none" ? [] : [{
            id: `${choice.id}:${form}`, label: `${HEXAGRAM_FORMS[form].name}${sources.length > 1 ? ` · ${choice.label}` : ""}`,
            action: { ...choice.action, cardForm: form }
          }]) ?? []);
        if (choices.length) addPhaseSkill(HEXAGRAM_CHOOSE, <SkillActionChoices key={HEXAGRAM_CHOOSE} choices={choices}
          label="六芒形态" submitting={submitting} onSubmit={onSubmitWindowSkill} />);
      }
      if (usable(SEVEN_STAR_CHOOSE) && (state.activeTimingPhase === "opening_action" ||
        state.activeTimingPhase === "round_before_action" && state.roundNumber > 1)) {
        const sources = bigCardActions(viewer, SEVEN_STAR_CHOOSE, (card) => canChooseRoundCardForm(card.sevenStarForms, state.roundNumber));
        const choices = sources.flatMap((choice) => viewer.bigCards?.find((card) => card.instanceId === choice.id)?.sevenStarForms
          ?.available.flatMap((form) => form === "none" ? [] : [{ id: `${choice.id}:${form}`,
            label: `${SEVEN_STAR_FORMS[form].name}${sources.length > 1 ? ` · ${choice.label}` : ""}`,
            action: { ...choice.action, cardForm: form } }]) ?? []);
        if (choices.length) addPhaseSkill(SEVEN_STAR_CHOOSE, <SkillActionChoices key={SEVEN_STAR_CHOOSE} choices={choices}
          label="七星形态" submitting={submitting} onSubmit={onSubmitWindowSkill} />);
      }
      if (usable(HEXAGRAM_SPIRIT) && hexagramRemainingUses(viewer, "1100") >= 2 && state.hexagramCopyChoices?.length) {
        const choices = state.hexagramCopyChoices.map((choice) => ({
          id: `${choice.targetBigCardInstanceId}:${choice.targetSkillId}`,
          label: `${state.players.find(({ id }) => id === choice.targetId)?.name ?? "玩家"} · ${getSkill(choice.targetSkillId)?.name ?? choice.targetSkillId}`,
          action: { type: "skill" as const, skillId: HEXAGRAM_SPIRIT, stacks: 1, ...choice }
        }));
        addPhaseSkill(HEXAGRAM_SPIRIT, <SkillActionChoices key={HEXAGRAM_SPIRIT} choices={choices}
          label="复制子技能 · 消耗 2 次镜像法术" submitting={submitting} onSubmit={onSubmitWindowSkill} />);
      }
      if (state.activeTimingPhase === "turn_change_action" && usable(HEXAGRAM_ABSOLUTE) && hexagramRemainingUses(viewer, HEXAGRAM_SIX_STAR) >= 2 &&
        !viewer.buffs.some((buff) => buff.sourceAbilityId === HEXAGRAM_ABSOLUTE && buff.expiresAtTurn === state.turnNumber)) {
        addPhaseSkill(HEXAGRAM_ABSOLUTE, <SkillActionChoices key={HEXAGRAM_ABSOLUTE}
          choices={bigCardActions(viewer, HEXAGRAM_ABSOLUTE, () => true)} label="绝对无敌 · 消耗 2 次六芒星"
          submitting={submitting} onSubmit={onSubmitWindowSkill} />);
      }
      if (state.activeTimingPhase === "turn_change_action" && usable(HEXAGRAM_RESTORE)) {
        const choices = bigCardActions(viewer, HEXAGRAM_RESTORE, (card) => Boolean(card.hexagramRestores)).flatMap((choice) => {
          const card = viewer.bigCards?.find((entry) => entry.instanceId === choice.id);
          return card ? lostHexagramForms(card).map((form) => ({ id: `${choice.id}:${form}`,
            label: HEXAGRAM_FORMS[form].name, action: { ...choice.action, cardForm: form } })) : [];
        });
        if (choices.length) addPhaseSkill(HEXAGRAM_RESTORE, <SkillActionChoices key={HEXAGRAM_RESTORE} choices={choices}
          label="恢复已失去的形态" submitting={submitting} onSubmit={onSubmitWindowSkill} />);
      }
      if (state.activeTimingPhase === "turn_before_action" && tianyeChoiceOptions(viewer, state.turnNumber).length) {
        addPhaseSkill(TIAN_YE_CHOICE_ID, <TianyeWingControls state={state} viewer={viewer}
          enabled={!submitting} onSubmit={onSubmitWindowSkill} />);
      }
      if (usable(CURTAIN_FINALE_ID)) addPhaseSkill(CURTAIN_FINALE_ID,
        <CurtainControls state={state} viewer={viewer} submitting={submitting} onSubmit={onSubmitWindowSkill} />, "谢幕光绮 · 即时使用");
      const splendorStock = usable(FALLEN_SPLENDOR_RELEASE) && fallenSplendorExecutionStock(viewer);
      if (splendorStock) addPhaseSkill(FALLEN_SPLENDOR_RELEASE,
        <FallenSplendorControls key={FALLEN_SPLENDOR_RELEASE} state={state} viewer={viewer} stock={splendorStock}
          submitting={submitting} onSubmit={onSubmitWindowSkill} />, "陨落天华 · 即时使用");
      if (getActiveSkillCount(viewer, ORIGIN_SHOT_FUSION) > 0 && !swordArrayPiBlocksSkill(state, viewer, ORIGIN_SHOT_FUSION) &&
        (collecting || getSkill(ORIGIN_SHOT_FUSION)?.timingPhases.includes(state.activeTimingPhase))) {
        addImmediateSkill({ type: "skill", skillId: ORIGIN_SHOT_FUSION, stacks: 1 }, "获得 1 次起源弹");
      }
      if (usable(SKY_ABSOLUTE_ID)) addPhaseSkill(SKY_ABSOLUTE_ID, <LingtaControls player={viewer}
        skillId={SKY_ABSOLUTE_ID} submitting={submitting} onSubmit={onSubmitWindowSkill} />, "凌空·天绝（全部饼、10 凌、4 云海）");
      if (usable(LINGTA_VICTORY_ID)) addPhaseSkill(LINGTA_VICTORY_ID, <LingtaControls player={viewer}
        skillId={LINGTA_VICTORY_ID} submitting={submitting} onSubmit={onSubmitWindowSkill} />, "凌踏九霄（36 凌、9 云海）");
      if (usable(CLOUD_SEA_ID)) addPhaseSkill(CLOUD_BYPASS_ID, <LingtaControls player={viewer}
        skillId={CLOUD_BYPASS_ID} submitting={submitting} onSubmit={onSubmitWindowSkill} />, "云海 · 切换自身出招是否绕过");
      if (viewer.karmaReincarnation && (collecting || getSkill(KARMA_SONG_END_ID)?.timingPhases.includes(state.activeTimingPhase))) {
        addImmediateSkill({ type: "skill", skillId: KARMA_SONG_END_ID, stacks: 1 }, "结束轮回");
      }
    }
    if (!state.reversalResponseOnly) {
      const soulActions = soulRestoreActions(viewer);
      for (const [id, name] of [[SOUL_RESTORE_EXTINGUISH_ID, "灵熄"], [SOUL_RESTORE_SINK_ID, "魂沉"]] as const) {
        const choices = soulActions.filter(({ action }) => action.skillId === id);
        if (choices.length) addPhaseSkill(id, <SkillActionChoices key={id} choices={choices}
          label="次数来源" submitting={submitting} onSubmit={onSubmitWindowSkill} />, `恢复${name}次数（10 魂）`);
      }
      const quickCard = quickHealingCard(viewer, {}, state.roundNumber);
      if (quickCard && !viewerPendingDeath && !pendingDeathWindow) addPhaseSkill(CHARITY_QUICK_ID, <CharityControls key={CHARITY_QUICK_ID}
        state={state} viewer={viewer} quickCard={quickCard} submitting={submitting} onSubmit={onSubmitWindowSkill} />);
      if (hasCharityDestiny(viewer) && hasCharityHealingUses(viewer)) {
        addPhaseSkill(HEALING_ART_ID, <CharityControls key={HEALING_ART_ID} state={state} viewer={viewer}
          submitting={submitting} onSubmit={onSubmitWindowSkill} />);
      }
    }
    if (!pendingDeathWindow) {
      if (!viewer.spaceId && usable(STAR_WHEEL_POSITION)) addPhaseSkill(STAR_WHEEL_POSITION,
        <StarWheelControls key={STAR_WHEEL_POSITION} state={state} viewer={viewer} skillId={STAR_WHEEL_POSITION}
          enabled={!submitting} onSubmit={onSubmitWindowSkill} />, "星移 · 座次判定");
      if (starWheelChoices(state, viewer).length) addPhaseSkill(STAR_WHEEL_RELEASE,
        <StarWheelControls key={STAR_WHEEL_RELEASE} state={state} viewer={viewer} skillId={STAR_WHEEL_RELEASE}
          enabled={!submitting} onSubmit={onSubmitWindowSkill} />, "释放星移飞轮封存的招式");
    }
    if (!state.reversalResponseOnly && !pendingDeathWindow && viewer.buffs.some(({ stateType }) => stateType === YIYUAN_MIMIC_STATE) &&
      (collecting || getSkill(YIYUAN_RESTORE)?.timingPhases.includes(state.activeTimingPhase))) {
      addImmediateSkill({ type: "skill", skillId: YIYUAN_RESTORE, stacks: 1 }, "解除幻化");
    }
    if (collecting) {
      const restartSource = usable(ERA_RESTART) && eraRestartSource(viewer);
      if (restartSource) addImmediateSkill({
        type: "skill", skillId: ERA_RESTART, stacks: 1, bigCardInstanceId: restartSource
      }, "新纪元 · 重新抽卡");
      for (const id of [RED_LOTUS_NINE, RED_LOTUS_FINALE]) {
        const source = usable(id) && bigAbilitySource(viewer, { skillId: id }, true);
        if (source && (id === RED_LOTUS_NINE ? redLotusFlameCount(viewer) >= 9 :
          !viewer.redLotusFinaleUsed || !getActiveSkillCount(viewer, RED_LOTUS_KARMA))) {
          addImmediateSkill({ type: "skill", skillId: id, stacks: 1, bigCardInstanceId: source });
        }
      }
      const rebuildStock = bubbleDreamStock(viewer, BUBBLE_REBUILD_STOCK);
      if (usable(BUBBLE_REBUILD) && rebuildStock > 0) {
        const choices = bigCardActions(viewer, BUBBLE_REBUILD, (card) => !card.bubbleDreamRebuild);
        if (choices.length) addPhaseSkill(BUBBLE_REBUILD, <SkillActionChoices key={BUBBLE_REBUILD} choices={choices}
          label="技能来源" submitting={submitting} onSubmit={onSubmitWindowSkill} />, `自我改造（${rebuildStock} 层）`);
      }
      const conversion = usable(FALLEN_SPLENDOR_CONVERT) && viewer.bigCards?.find((card) =>
        bigAbilitySource(viewer, { skillId: FALLEN_SPLENDOR_CONVERT, bigCardInstanceId: card.instanceId }) &&
        fallenSplendorHealingRemaining(viewer, card) > 0);
      if (conversion) addImmediateSkill({
        type: "skill", skillId: FALLEN_SPLENDOR_CONVERT, stacks: 1, bigCardInstanceId: conversion.instanceId
      }, "治愈术转为离殇");
      for (const { skill } of playableSkills) {
        if (!isDemonSummonSkill(skill.id)) continue;
        const uses = demonSummonUses(state, viewer, skill.id);
        if (uses > 0) addPhaseSkill(skill.id, <DemonSummonControls key={skill.id} state={state} viewer={viewer}
          skillId={skill.id} submitting={submitting} onSubmit={onSubmitWindowSkill} />, `${skill.name} · 剩余 ${uses} 次`);
      }
      for (const { skill } of cheatAnytimeSkills) {
        addPhaseSkill(skill.id, <div className="grid gap-2">
          {skill.id === CHEAT_NOGLUES_ID ? cheatCardPicker() : null}
          {skill.id === CHEAT_TRANSFER_ID ? cheatTransferPickers() : null}
          {skill.id === CHEAT_SHARP_DAMAGE_ID ? <TargetSelect enemies={cheatDamageTargets}
            targetId={cheatDamageTarget?.id ?? ""} onChange={setWindowSkillTargetId} label="技能目标" /> : null}
          <p className="text-sm text-gray-600">{skill.description}</p>
          <button type="button" className="btn-primary w-full justify-center" disabled={submitting || cheatActionIncomplete(skill.id)}
            onClick={() => {
              const action: SkillAction = { type: "skill", stacks: 1, skillId: skill.id };
              addCheatActionChoices(action);
              onSubmitWindowSkill(action);
            }}>使用技能</button>
        </div>, skill.id === CHEAT_SHARP_DAMAGE_ID ? `${skill.name} · 剩余 ${cheatDamageUses} 次` : skill.name);
      }
      if (usable(ASURA_RITUAL_UPGRADE_ID) && hasBloodQi(viewer, 50) &&
        !viewer.buffs.some((buff) => buff.id === "asura_ritual_upgrade")) {
        addImmediateSkill({ type: "skill", skillId: ASURA_RITUAL_UPGRADE_ID, stacks: 1 }, "修罗·祭（50 血气）");
      }
      if (usable(BLOOD_RITUAL_FUSION_ID) && ritualTargets.length) {
        addPhaseSkill(BLOOD_RITUAL_FUSION_ID, <div className="space-y-2">
          <TargetSelect enemies={ritualTargets} targetId={ritualFirst?.id ?? ""} onChange={setWindowSkillTargetId} label="祭天第一目标" />
          {ritualNeedsSecond ? <TargetSelect enemies={ritualSecondChoices} targetId={ritualSecond?.id ?? ""}
            onChange={setWindowSkillExtraTargetId} label="祭天第二目标" /> : null}
          <button type="button" className="btn-primary w-full justify-center"
            disabled={submitting || !ritualFirst || ritualNeedsSecond && !ritualSecond} onClick={() => {
              if (!ritualFirst) return;
              const targetIds = ritualNeedsSecond && ritualSecond ? [ritualFirst.id, ritualSecond.id] : [ritualFirst.id];
              onSubmitWindowSkill({ type: "skill", skillId: BLOOD_RITUAL_FUSION_ID, stacks: 1, targetId: ritualFirst.id, targetIds });
            }}>使用技能</button>
        </div>, "祭天");
      }
    }
  }
  const collectingPhaseSkill = collecting && mode === "skill" ? phaseSkills.find(({ value }) => value === skillId) : undefined;
  const previewingMainAction = !collectingPhaseSkill && !state.sevenStarLegacy;
  useEffect(() => {
    onPreviewTargets?.(previewingMainAction && previewTargetKey ? previewTargetKey.split("|") : []);
  }, [onPreviewTargets, previewTargetKey, previewingMainAction]);

  if (state.sevenStarLegacy) {
    const choices = state.sevenStarLegacy.choices.map(({ targetId, cardInstanceId }, index) => ({
      id: `${cardInstanceId}:${targetId}`,
      label: state.players.find(({ id }) => id === targetId)?.name ?? `玩家 ${index + 1}`,
      action: { type: "skill" as const, skillId: SEVEN_STAR_YUHENG, stacks: 1, targetId, bigCardInstanceId: cardInstanceId }
    }));
    return <section className="surface-card grid gap-3 p-4">
      <h3 className="font-bold">复活阶段</h3>
      {choices.length ? <>
        <PhaseSkillSelect testId="window-skill-select" selected={windowSkillId}
          onChange={setWindowSkillId} moves={[]} phaseSkills={[{ value: `phase:${SEVEN_STAR_YUHENG}`, label: "玉衡" }]} />
        {windowSkillId === `phase:${SEVEN_STAR_YUHENG}` ? <SkillActionChoices choices={choices}
          label="传承给玩家" submitting={submitting} onSubmit={onSubmitWindowSkill} /> : null}
        <button type="button" className="btn-secondary" onClick={onPassActionWindow} disabled={submitting}>放弃传承</button>
      </> : <p>等待玉衡传承结算</p>}
    </section>;
  }
  if (state.phase === "action_window") {
    const alreadyPassed = viewer?.id
      ? state.actionWindowPassPlayerIds.includes(viewer.id)
      : false;
    const showWindowSkillPanel = state.actionWindowMode === "active" || pendingDeathWindow;
    const canUseWindow =
      viewer?.status === "alive" &&
      !alreadyPassed && !sleeping && !isSoulExiled(state, viewer) &&
      (state.actionWindowMode === "active" || pendingDeathWindow &&
        (viewerPendingDeath || windowSkills.some(({ skill }) => skill.id === SOUL_EXTINGUISH_ID || skill.id === SAKURA_FALL_ID)));
    const canSelfDestructBeforeTurn =
      viewer?.status === "alive" &&
      !selfDestructBlockReason &&
      !alreadyPassed &&
      state.activeTimingPhase === "turn_before_action";
    const lateSelfDestructLimit = viewer
      ? 2 * getActiveSkillCount(viewer, SELF_DESTRUCTER_DEATH_SKILL_ID)
      : 0;
    const lateSelfDestructUsed =
      viewer?.buffs.find((buff) => buff.id === LATE_SELF_DESTRUCT_USED_BUFF_ID)?.stacks ?? 0;
    const lateSelfDestructRemaining = Math.max(
      0,
      lateSelfDestructLimit - lateSelfDestructUsed
    );
    const canLateSelfDestruct =
      !state.reversalResponseOnly &&
      viewer?.status === "alive" &&
      !selfDestructBlockReason &&
      !alreadyPassed &&
      state.activeTimingPhase === "turn_change_action" &&
      lateSelfDestructRemaining > 0;

    if (canUseWindow && !state.sakuraTurnEndResponse && !state.bloodRitualResistance) {
      if (state.eraTargetChoices?.length) addPhaseSkill(ERA_CHOOSE_TARGETS,
        <EraTargetControls key={state.turnNumber} state={state} disabled={submitting} onSubmit={onSubmitWindowSkill} />, "神控纪元 · 修改目标");
      if (state.yiyuanRepeatChoice) addPhaseSkill(YIYUAN_REPEAT, <div className="space-y-2">
        <p className="text-sm">{state.yiyuanRepeatChoice.casterNames.join("、")} 发动一元·永恒</p>
        <p className="text-sm">下回合复刻 {state.yiyuanRepeatChoice.moves.join("、") || "空过"}</p>
        <SkillActionChoices key={YIYUAN_REPEAT} label="是否复刻" submitting={submitting} onSubmit={onSubmitWindowSkill}
          choices={[true, false].map((repeat) => ({
            id: String(repeat), label: repeat ? "复刻" : "拒绝",
            action: { type: "skill", skillId: YIYUAN_REPEAT, stacks: 1, yiyuanRepeat: repeat }
          }))} />
      </div>, "一元·永恒 · 复刻响应");
      if (bubbleHit && state.activeTimingPhase === "turn_damage_modify") addPhaseSkill(BUBBLE_FORGET, <div className="space-y-2">
          <label className="block text-sm font-medium">忘却补正 · 选择单攻
            <select className="soft-input mt-1 w-full" value={bubbleHit.id} onChange={(event) => setBubbleHitId(event.currentTarget.value)}>
              {state.bubbleDreamHitChoices?.map(({ id, label, sourceId }) => <option key={id} value={id}>
                {state.players.find((player) => player.id === sourceId)?.name ?? "玩家"} · {label}
              </option>)}
            </select>
          </label>
          <button className="btn-primary w-full justify-center" type="button" disabled={submitting}
            onClick={() => onSubmitWindowSkill({ type: "skill", skillId: BUBBLE_FORGET, stacks: 1, attackResponseId: bubbleHit.id })}>
            无视该招并获得改造
          </button>
        </div>);
      const insight = state.purpleInsight;
      if (insight) addPhaseSkill(PURPLE_INSIGHT_ID, <section className="space-y-2" aria-label="入微私密结果">
        <p>入微 · {state.players.find(({ id }) => id === insight.targetId)?.name} 的子技能「{getSkill(insight.abilityId)?.name ?? insight.abilityId}」</p>
        <SkillActionChoices key={PURPLE_INSIGHT_ID} label="入微效果" submitting={submitting} onSubmit={onSubmitWindowSkill}
          choices={(["lose", "gain"] as const).map((choice) => ({
            id: choice, label: choice === "lose" ? "令其失去 5 轮" : "自己获得 3 轮",
            action: { type: "skill", skillId: PURPLE_INSIGHT_ID, stacks: 1,
              bigCardInstanceId: insight.sourceCardId, purpleInsightChoice: choice }
          }))} />
      </section>);
      if (state.thornPierceChoices?.length) addPhaseSkill(THORN_PIERCE_ID, <SkillActionChoices key={THORN_PIERCE_ID}
        label="穿 · 选择要失效的防御" submitting={submitting} onSubmit={onSubmitWindowSkill}
        choices={state.thornPierceChoices.map(({ id, label }) => ({ id, label, action: {
          type: "skill", skillId: THORN_PIERCE_ID, stacks: 1, attackResponseId: id
        } }))} />, "穿 · 使防御失效");
      if (lateSelfDestructLimit > 0 && !state.reversalResponseOnly && state.activeTimingPhase === "turn_change_action") {
        addPhaseSkill(SELF_DESTRUCTER_DEATH_SKILL_ID, <button type="button" className="btn-secondary w-full"
          disabled={submitting || !canLateSelfDestruct} title={selfDestructBlockReason}
          onClick={() => onSubmit({ type: "defense", defense: "self_destruct" })}>自爆</button>,
        `后期自爆（剩余 ${lateSelfDestructRemaining}）`);
      }
    }
    const selectedPhaseSkill = phaseSkills.find(({ value }) => value === windowSkillId);
    const needsSkillTarget = selectedWindowSkill
      ? requiresExposedSkillTarget(selectedWindowSkill.skill)
      : false;
    const canGuessSkill =
      state.activeTimingPhase === "turn_end_action" &&
      canUseWindow &&
      !pendingDeathWindow;
    const showDiscardSkillControl =
      canUseWindow && !state.reversalResponseOnly && !pendingDeathWindow && discardableSkills.length > 0;
    const canDiscardSkill = Boolean(
      showDiscardSkillControl &&
        discardSkillId &&
        discardableSkills.some((item) => item.id === discardSkillId)
    );
    const guessSkillInvalid = Boolean(
      !canGuessSkill ||
        alreadyFailedSkillGuess ||
        !windowGuessTargetId ||
        !windowGuessSkillId
    );
    const balanceTargetIds = [windowSkillTargetId, windowSkillExtraTargetId].filter(Boolean);
    const balanceTargetsInvalid = Boolean(
      isWindowBalance && !junengTargetId &&
        (balanceTargetIds.length !== 2 ||
          new Set(balanceTargetIds).size !== 2 ||
          balanceTargetIds.some(
            (targetId) => !balanceTargetOptions.some((player) => player.id === targetId)
          ))
    );
    const lightningTargetIds = [windowSkillTargetId, windowSkillExtraTargetId].filter(Boolean);
    const lightningResolvedTargetIds =
      viewer && isWindowLightning
        ? resolveLightningSpellTargetIds(state.players.filter((player) => canAffectAcrossSpace(state, viewer.id, player.id)), viewer.id, lightningTargetIds)
        : undefined;
    const lightningTargetsInvalid = Boolean(
      isWindowLightning && !junengTargetId &&
        (!lightningResolvedTargetIds ||
          lightningResolvedTargetIds.length !== lightningTargetPlan.targetCount)
    );
    const windowElementCost = windowPrice;
    const windowSkillInvalid = Boolean(
        !canUseWindow ||
        !selectedWindowSkill ||
        !selectedWindowSkillPlay ||
        (isVacuumWindowSkill && !selectedVacuumChoice) ||
        (isKarmaConvert && (!selectedKarmaConvertFrom || !selectedKarmaConvertTo)) ||
        (selectedWindowSkill.skill.id === STAR_MOON_CHOOSE_CARD && !selectedStarMoonCard) ||
        cheatActionIncomplete(selectedWindowSkill.skill.id) ||
        (isDemonOrder && (!selectedDemon || !demonOrderAvailable(state, selectedDemon, selectedDemonOrder) ||
          needsDemonTarget && !selectedDemonTarget)) ||
        (isHoundSummon && !houndSummonTarget) ||
        (isBloodRitual && (!ritualFirst || ritualNeedsSecond && !ritualSecond)) ||
        (junengBlocked && selectedWindowSkillPlay.targetMode === "single") ||
        (windowElementCost && windowElementCost.perStack * windowSkillStacks > getElementAmount(viewer, windowElementCost.element)) ||
        (selectedWindowSkill.skill.id === STORE_DAMAGE_ID && !storableDamage) ||
        (selectedWindowSkill.skill.id === QIANQIU_RESPONSE_ID && (!qianqiuGain || windowSkillTargetId === viewer?.id)) ||
        (selectedWindowSkill.skill.id === SAKURA_FALL_ID && selectedSakuraIds.length !== 1) ||
        (isTianlieResponse && !tianlieResponse) || (isAttackAttachment && !tianlieAttack) ||
        (isEternalMove && !eternalMove) ||
        (isPurpleScale && tianlieAttack && ((!(purpleCanSetPower && purplePower) && !purpleLevel) ||
          (purpleCanSetPower && purplePower && !validPurpleValue(attackPowerValue(tianlieAttack[1]), Number(purplePower))) ||
          (purpleLevel && !validPurpleValue(attackLevelValue(tianlieAttack[1]), Number(purpleLevel))))) ||
        (isAsuraFerry && (!Number.isSafeInteger(asuraFerryQi) || asuraFerryQi < 1 || !hasBloodQi(viewer, 30 + asuraFerryQi))) ||
        (isChaosWave && !chaosMove) ||
        (selectedWindowSkill.skill.id === STAR_RESIST_ID && !resistibleDamage) ||
        (selectedWindowSkill.skill.id === RELEASE_DAMAGE_ID && !selectedStoredDamage) ||
        (selectedWindowSkill.skill.id === KUISHI_ID && !peekTarget) ||
        (selectedWindowSkill.skill.id === KURONG_LEAF_ID && (!leafAbilityChoices.length || leafAbilityChoices.length > 3)) ||
        (isWindowAttackMark && (!selectedWindowMarkAttack || (viewer && windowSkillStacks >
          getAttackMarkCapacity(viewer, selectedWindowSkill.skill.id, selectedWindowMarkAttack.actionIndex)))) ||
        (isWindowActionSwitch && !selectedWindowSwitch) ||
        (isWindowAttackStatModifier && (!selectedWindowAttackStatModifier || Boolean(selectedWindowAttackStatModifier.error))) ||
        (isWindowDoubleEdge && !selectedWindowDoubleEdge && !hasWindowAttackAction) ||
        (isWindowLiegong && !selectedWindowLiegong) ||
        (isWindowAbsoluteGuard && !selectedWindowAbsoluteGuard) ||
        (!isWindowActionSwitch && !isHoundSummon && !isCheatSharpDamage && selectedWindowSkillPlay.targetMode === "single" && !windowSkillTargetId) ||
        (!isWindowActionSwitch && needsSkillTarget && !windowSkillTargetId) ||
        (!isWindowActionSwitch && needsSkillTarget && !windowTargetSkillId) ||
        (!isWindowActionSwitch && isWindowSandTransform && !windowSandSkillId) ||
        (!isWindowActionSwitch && isWindowDamageRedirect && !windowDamageId) ||
        (!isWindowActionSwitch && isWindowDamageMark && !damageMarkOptions.some((item) => item.id === windowDamageId)) ||
        (isWindowCrystalGuard && (!Number.isSafeInteger(crystalMarkCount) || crystalMarkCount < 1 || crystalMarkCount > maxCrystalMarks)) ||
        (!isWindowActionSwitch && isWindowShunshouSteal && !windowTargetSkillId) ||
        (!isWindowActionSwitch && balanceTargetsInvalid) ||
        (!isWindowActionSwitch && lightningTargetsInvalid) ||
        (!isWindowActionSwitch &&
          isWindowLishang &&
          (!windowSkillTargetId ||
            !fatalSourceOptions.some((player) => player.id === windowSkillTargetId))) ||
        (!isWindowActionSwitch &&
          isWindowHellOverlord &&
          (!windowSkillTargetId ||
            !hellOverlordTargetOptions.some((player) => player.id === windowSkillTargetId))) ||
        (pursuitSkillId && !pursuitTargetOptions.some((target) => target.id === windowSkillTargetId)) ||
        (viewer && windowSkillCost - windowAntiCakes - windowYoukaiCakes > viewer.cakes)
    );

    return (
      <section className="surface-card action-board p-5">
        {junengStatus}
        {viewer?.spaceId ? <p className="text-sm font-semibold">小空间 · {state.smallSpaces?.[viewer.spaceId]?.name}</p> : null}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-950">
              {pendingDeathWindow ? "复活阶段" : "行动阶段"}
            </h2>
            {pendingDeathWindow && kaigeSpareLives > 0 ? (
              <p className="mt-1 text-sm text-gray-600">剩余 {kaigeSpareLives} 条备用命。复活阶段结束后，若仍未复活，再结算备用命。</p>
            ) : null}
            <p className="mt-1 text-sm text-gray-500">
              第 {state.roundNumber} 轮 · 本轮第 {state.roundTurnNumber} 回合 · {state.reversalResponseOnly ? "逆转响应（普通变招已结束）" : phaseLabel(state.activeTimingPhase)}
            </p>
          </div>
          {alreadyPassed ? (
            <span className="status-pill border-emerald-200 bg-emerald-50 text-emerald-700">
              {pendingDeathWindow ? "已结束" : "已放弃"}
            </span>
          ) : null}
        </div>

        <div className="action-window-scroll-body">
        {!showWindowSkillPanel ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {state.activeTimingPhase === "turn_before_action" ? (
              <button
                className="btn-secondary justify-center border-rose-200 bg-rose-50 py-3 text-rose-700 hover:bg-rose-100 sm:col-span-2"
                disabled={submitting || !canSelfDestructBeforeTurn}
                onClick={() => onSubmit({ type: "defense", defense: "self_destruct" })}
                title={selfDestructBlockReason}
                type="button"
              >
                自爆
              </button>
            ) : null}
            <button
              className="btn-primary justify-center py-3"
              data-testid="enter-action-window"
              disabled={submitting || viewer?.status !== "alive"}
              onClick={onEnterActionWindow}
              type="button"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              行动
            </button>
            <button
              className="btn-secondary justify-center py-3"
              data-testid="pass-action-window"
              disabled={submitting || viewer?.status !== "alive" || alreadyPassed}
              onClick={onPassActionWindow}
              type="button"
            >
              不行动
            </button>
            <button
              className="btn-secondary justify-center py-3 sm:col-span-2"
              data-testid="skip-to-next-action"
              disabled={submitting || viewer?.status !== "alive" || alreadyPassed}
              onClick={onSkipToNextAction}
              type="button"
            >
              <FastForward className="h-4 w-4" aria-hidden="true" />
              跳到下次出招
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {state.activeTimingPhase === "turn_before_action" ? (
              <button
                className="btn-secondary w-full justify-center border-rose-200 bg-rose-50 py-3 text-rose-700 hover:bg-rose-100"
                disabled={submitting || !canSelfDestructBeforeTurn}
                onClick={() => onSubmit({ type: "defense", defense: "self_destruct" })}
                title={selfDestructBlockReason}
                type="button"
              >
                自爆
              </button>
            ) : null}
            {state.activeTimingPhase === "turn_end_action" ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {guessBigCard ? "大卡猜测" : "技能猜测"}
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
                  <TargetSelect
                    enemies={enemies}
                    targetId={windowGuessTargetId}
                    onChange={setWindowGuessTargetId}
                    label="猜测对象"
                  />
                  <label className="block text-sm font-medium text-gray-700">
                    {guessBigCard ? "大卡" : "技能（含融合）"}
                    <input
                      className="soft-input mt-1 w-full"
                      onChange={(event) => setWindowGuessSkillQuery(event.target.value)}
                      placeholder={`搜索 ${guessSkills.length} 张${guessBigCard ? "大卡" : "技能（含融合）"}`}
                      value={windowGuessSkillQuery}
                    />
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowGuessSkillId}
                      onChange={(event) => setWindowGuessSkillId(event.target.value)}
                    >
                      {filteredGuessSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn-secondary self-end justify-center py-3 disabled:opacity-40"
                    disabled={submitting || guessSkillInvalid}
                    onClick={() => onGuessSkill(windowGuessTargetId, windowGuessSkillId)}
                    type="button"
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    猜测
                  </button>
                </div>
                {alreadyFailedSkillGuess ? (
                  <p className="mt-2 text-sm text-amber-700">
                    本回合已猜错，不能再次猜测。
                  </p>
                ) : null}
              </div>
            ) : null}
            {showDiscardSkillControl ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  丢弃技能
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <label className="block text-sm font-medium text-gray-700">
                    自身技能
                    <select
                      className="soft-input mt-1 w-full"
                      value={discardSkillId}
                      onChange={(event) => setDiscardSkillId(event.target.value)}
                    >
                      {discardableSkills.map((item) => (
                        <option key={`${item.id}:${item.index}`} value={item.id}>
                          {huntLabel(item.id, item.skill?.name ?? item.id)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn-secondary self-end justify-center py-3"
                    disabled={submitting || !canDiscardSkill}
                    onClick={() => {
                      if (!discardSkillId) {
                        return;
                      }
                      onSubmit({
                        type: "discard_skill",
                        targetSkillId: discardSkillId
                      });
                    }}
                    type="button"
                  >
                    丢弃
                  </button>
                </div>
              </div>
            ) : null}
            {windowSkills.length > 0 || phaseSkills.length > 0 ? (
              <PhaseSkillSelect testId="window-skill-select" selected={selectedPhaseSkill?.value ?? selectedWindowSkill?.optionId ?? ""}
                onChange={(id) => {
                  setWindowSkillId(id);
                  setWindowSkillStacks(1);
                  setVacuumChoiceId("");
                  setDemonOrder("standby");
                  setDemonTargetId("");
                }}
                moves={windowSkills.map(({ skill, optionId }) => ({
                  value: optionId,
                  label: optionId === VACUUM_WINDOW_OPTION ? "虚无 · 无耗饼" :
                    `${skill.id === BLOOD_RITUAL_FUSION_ID ? "祭天" : skill.name} · ${formatSkillCakeCost(skill.id, undefined, viewer)}`
                }))}
                phaseSkills={phaseSkills} />
            ) : null}
            {selectedPhaseSkill ? selectedPhaseSkill.controls : selectedWindowSkill ? (
              <>
                <div className={isDemonOrder || isDemonSummon || isVacuumWindowSkill ? "grid gap-3 md:grid-cols-2" : "grid gap-3 md:grid-cols-[96px_1fr]"}>
                  {!isDemonOrder && !isDemonSummon && !isVacuumWindowSkill ? <label className="block text-sm font-medium text-gray-700">
                    {isTianlieMight ? "额外耗饼" : "重数"}
                    <input
                      className="soft-input mt-1 w-full"
                      min={1}
                      max={windowSkillMaxStacks}
                      type="number"
                      value={windowSkillStacks}
                      onChange={(event) =>
                        setWindowSkillStacks(
                          Math.max(1, Math.min(windowSkillMaxStacks, Number(event.target.value)))
                        )
                      }
                    />
                  </label> : null}
                  {isVacuumWindowSkill ? (
                    <label className="block text-sm font-medium text-gray-700">
                      次数来源
                      <select className="soft-input mt-1 w-full" value={selectedVacuumChoice?.id ?? ""}
                        onChange={(event) => setVacuumChoiceId(event.currentTarget.value)}>
                        {vacuumChoices.map(({ id, label, available }) =>
                          <option key={id} value={id} disabled={!available}>{label}</option>)}
                      </select>
                    </label>
                  ) : isChaosWave ? (
                    <label className="block text-sm font-medium text-gray-700">
                      选择要附加乱之波动的出招
                      <select className="soft-input mt-1 w-full" value={chaosMove?.index ?? ""}
                        onChange={(event) => setTianlieAttackIndex(Number(event.target.value))}>
                        {chaosMoves.map(({ index, action }) =>
                          <option key={index} value={index}>{index + 1}. {action.type === "skill" ?
                            getSkill(action.skillId)?.name ?? action.skillId : getActionLabel(action)}</option>)}
                      </select>
                    </label>
                  ) : isEternalMove ? (
                    <label className="block text-sm font-medium">
                      选择永久续发的出招
                      <select className="soft-input mt-1 w-full" value={eternalMove?.index ?? ""}
                        onChange={(event) => setEternalMoveIndex(Number(event.currentTarget.value))}>
                        {state.eternalMoveChoices?.map(({ index, label }) => <option key={index} value={index}>{label}</option>)}
                      </select>
                    </label>
                  ) : isTianlieResponse || isAttackAttachment ? (
                    <>
                    <label className="block text-sm font-medium text-gray-700">
                      {isPurpleScale || isBubbleEnhance || isColdLight ? "选择本回合出招" : isAttackAttachment ? "选择本回合攻击" : "选择未命中的攻击"}
                      <select className="soft-input mt-1 w-full" value={isAttackAttachment ? tianlieAttack?.[0] ?? "" : tianlieResponse?.id ?? ""}
                        onChange={(event) => isAttackAttachment ? setTianlieAttackIndex(Number(event.target.value)) : setTianlieResponseId(event.target.value)}>
                        {isAttackAttachment ? tianlieAttacks.map(([index, stats]) => <option key={index} value={index}>{stats.name}</option>) :
                          tianlieChoices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
                      </select>
                    </label>
                    {isFiveElementsLevel && tianlieAttack ? <label className="text-sm">
                      等级运算
                      <select className="soft-input mt-1 w-full" value={fiveElementsOperation}
                        onChange={(event) => setFiveElementsOperation(event.currentTarget.value as FiveElementsOperation)}>
                        {FIVE_ELEMENTS_OPERATIONS.map((operation, index) => <option key={operation} value={operation}>
                          {["加无限", "减无限", "乘无限", "除以无限"][index]}
                        </option>)}
                      </select>
                    </label> : null}
                    {isColdLight && tianlieAttack ? <label className="text-sm">
                      强化数值
                      <select className="soft-input mt-1 w-full" value={coldTargetField}
                        onChange={(event) => setColdLightField(event.currentTarget.value as ColdLightField)}>
                        {!tianlieAttack[1].nonAttackMove && <option value="power">攻击</option>}
                        {!tianlieAttack[1].noClashLevel && <option value="level">等级</option>}
                      </select>
                    </label> : null}
                    {isPurpleScale && tianlieAttack ? <div className="grid grid-cols-2 gap-2">
                      {purpleCanSetPower ? <label className="text-xs">
                        攻击（原值 {formatAttackStatNumber(tianlieAttack[1].power, tianlieAttack[1].powerValue)}）
                        <input aria-label="浩瀚攻击" className="soft-input mt-1 w-full" type="number" step={1} placeholder="留空保留"
                          value={purplePower} onChange={(event) => setPurplePower(event.target.value)} />
                      </label> : null}
                      <label className="text-xs">等级（原值 {formatAttackStatNumber(tianlieAttack[1].level, tianlieAttack[1].levelValue)}）
                        <input aria-label="浩瀚等级" className="soft-input mt-1 w-full" type="number" step={1} placeholder="留空保留"
                          value={purpleLevel} onChange={(event) => setPurpleLevel(event.target.value)} />
                      </label>
                    </div> : null}
                    {isAsuraFerry ? <label className="block text-xs">
                      消耗血气（至少保留 30）
                      <input className="soft-input mt-1 w-full" type="number" min={1} max={Math.floor(bloodQiNumber(viewer) - 30)}
                        value={asuraFerryQi || ""} onChange={(event) => setAsuraFerryQi(Number(event.target.value))} />
                    </label> : null}
                    </>
                  ) : selectedWindowSkill?.skill.id === STAR_RAGE_ID ? (
                    <label className="block text-sm font-medium text-gray-700">
                      消耗 3 层星印记
                      <select className="soft-input mt-1 w-full"
                        value={windowTargetSkillId === STAR_RAGE_SIX_STAR ? STAR_RAGE_SIX_STAR : STAR_RAGE_ID}
                        onChange={(event) => setWindowTargetSkillId(event.target.value)}>
                        <option value={STAR_RAGE_ID}>星怒 · 随机一人受到 6 点法伤</option>
                        <option value={STAR_RAGE_SIX_STAR}>六芒星 · 免疫并回复</option>
                      </select>
                    </label>
                  ) : isWindowDoubleEdge ? (
                    windowDoubleEdgeOptions.length > 0 ? (
                      <label className="block text-sm font-medium text-gray-700">
                        双刃剑目标
                        <select
                          className="soft-input mt-1 w-full"
                          value={selectedWindowDoubleEdge?.key ?? ""}
                          onChange={(event) => setWindowDoubleEdgeKey(event.target.value)}
                        >
                          {windowDoubleEdgeOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        当前没有可用目标
                      </div>
                    )
                  ) : isWindowLiegong ? (
                    windowLiegongOptions.length > 0 ? (
                      <label className="block text-sm font-medium text-gray-700">
                        烈弓交错
                        <select
                          className="soft-input mt-1 w-full"
                          value={selectedWindowLiegong?.key ?? ""}
                          onChange={(event) => setWindowLiegongKey(event.target.value)}
                        >
                          {windowLiegongOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        现在没有可以交错的对攻
                      </div>
                    )
                  ) : isWindowAbsoluteGuard ? (
                    windowAbsoluteGuardOptions.length > 0 ? (
                      <label className="block text-sm font-medium text-gray-700">
                        绝对守护攻击
                        <select
                          className="soft-input mt-1 w-full"
                          value={selectedWindowAbsoluteGuard?.key ?? ""}
                          onChange={(event) => setWindowAbsoluteGuardKey(event.target.value)}
                        >
                          {windowAbsoluteGuardOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        本回合还没人打向你
                      </div>
                    )
                  ) : isWindowShunshouSteal ? (
                    shunshouChoiceOptions.length > 0 ? (
                      <label className="block text-sm font-medium text-gray-700">
                        可获得技能
                        <select
                          className="soft-input mt-1 w-full"
                          value={windowTargetSkillId}
                          onChange={(event) => setWindowTargetSkillId(event.target.value)}
                        >
                          {shunshouChoiceOptions.map((option) => (
                            <option key={option.choice.id} value={option.skill.id}>
                              {option.sourceName} · {option.skill.name} #{option.skill.sourceRow}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        当前没有可获得的候选技能
                      </div>
                    )
                  ) : isBloodRitual ? (
                    <>
                      <TargetSelect enemies={ritualTargets} targetId={ritualFirst?.id ?? ""} onChange={setWindowSkillTargetId} label="祭天第一目标" />
                      {ritualNeedsSecond ? <TargetSelect enemies={ritualSecondChoices}
                        targetId={ritualSecond?.id ?? ""} onChange={setWindowSkillExtraTargetId} label="祭天第二目标" /> : null}
                    </>
                  ) : isDemonOrder ? (
                    <TargetSelect enemies={orderDemons} targetId={selectedDemon?.id ?? ""} label="指挥恶魔" onChange={(id) => {
                      setDemonId(id);
                      setDemonOrder("standby");
                      setDemonTargetId("");
                    }} />
                  ) : selectedWindowSkill?.skill.id === DEMON_GUARD_ID ? (
                    <DemonPlacementSelect value={demonPlacement} onChange={setDemonPlacement} />
                  ) : selectedWindowSkill?.skill.id === STAR_MOON_CHOOSE_CARD ? (
                    <label className="text-sm">
                      获得的大卡
                      <select value={selectedStarMoonCard?.instanceId ?? ""} onChange={(event) => setStarMoonCardId(event.target.value)}>
                        <option value="">请选择命中目标的大卡</option>
                        {starMoonChoices.map(({ targetId, instanceId, label }) => (
                          <option key={instanceId} value={instanceId}>{state.players.find(({ id }) => id === targetId)?.name} · {label}</option>
                        ))}
                      </select>
                    </label>
                  ) : isCheatCardPick ? cheatCardPicker() : isCheatTransfer ? null : selectedWindowSkillPlay?.targetMode === "single" || needsSkillTarget ? (
                    <>
                      <TargetSelect
                        enemies={
                          isWindowBalance
                            ? balanceTargetOptions
                            : isWindowLightning
                              ? lightningFirstTargetOptions
                              : isWindowLishang
                                ? fatalSourceOptions
                                : isWindowHellOverlord
                                  ? hellOverlordTargetOptions
                                  : pursuitSkillId ? pursuitTargetOptions : isHoundSummon ? houndSummonTargets :
                                    isCheatSharpDamage ? cheatDamageTargets : windowSkillCanTargetTotem ? [...enemies, ...totemOptions] : enemies
                        }
                        targetId={isHoundSummon ? houndSummonTarget?.id ?? "" : isCheatSharpDamage ? cheatDamageTarget?.id ?? "" : windowSkillTargetId}
                        onChange={setWindowSkillTargetId}
                        label={
                          isHoundSummon ? "召唤目标" : needsSkillTarget
                            ? "技能持有者"
                            : isWindowLishang
                              ? "致死者"
                              : isWindowLightning
                                ? "雷电目标"
                                : "技能目标"
                        }
                      />
                      {isWindowBalance || (isWindowLightning && lightningSecondTargetOptions.length > 0) ? (
                        <TargetSelect
                          enemies={isWindowLightning ? lightningSecondTargetOptions : balanceTargetOptions}
                          targetId={windowSkillExtraTargetId}
                          onChange={setWindowSkillExtraTargetId}
                          label={isWindowLightning ? "雷电目标" : "技能目标"}
                        />
                      ) : null}
                    </>
                  ) : !isDemonSummon ? (
                    <div className="self-end rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                      {selectedWindowSkillPlay?.targetMode === "all" ? "作用全体敌人" : "不需要目标"}
                    </div>
                  ) : null}
                </div>
                {isDemonOrder && selectedDemon ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-gray-700">
                      下达指令
                      <select className="soft-input mt-1 w-full" value={selectedDemonOrder}
                        onChange={(event) => setDemonOrder(event.currentTarget.value as DemonOrder)}>
                        {availableOrders.map((order) => {
                          const ready = demonOrderAvailable(state, selectedDemon, order);
                          return <option key={order} value={order} disabled={!ready}>
                            {DEMON_ORDER_LABELS[order]}{ready ? "" : "（本回合不可用）"}
                          </option>;
                        })}
                      </select>
                    </label>
                    {needsDemonTarget ? <TargetSelect enemies={demonTargets} targetId={selectedDemonTarget?.id ?? ""}
                      label="指令目标" onChange={setDemonTargetId} allowEmpty
                      emptyLabel={demonTargets.length ? "请选择目标" : "没有可选目标"} /> : null}
                    <p className="text-sm text-gray-600 sm:col-span-2">
                      已设定指令 · {DEMON_ORDER_LABELS[currentDemonOrder]}
                      {currentDemonOrder !== "standby" && selectedDemon.summon?.demonTargetId ?
                        ` → ${state.players.find(({ id }) => id === selectedDemon.summon?.demonTargetId)?.name ?? "目标已离场"}` : ""}
                      {selectedDemon.summon?.demonPowered ? " · 恶魔力量已开启" : ""}
                    </p>
                  </div>
                ) : null}
                {selectedWindowSkill?.skill.id === FOUR_EMPTINESS_ID ? <BlindSkillPicker state={state} selected={selectedBlindIds} onChange={setBlindSelected} limit={16} /> : null}
                {selectedWindowSkill?.skill.id === SAKURA_FALL_ID ? sakuraPicker(1) : null}
                {isKarmaConvert ? <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-sm">使用哪项技能转换
                    <select className="soft-input mt-1 w-full" value={selectedKarmaConvertFrom} onChange={(event) => {
                      setKarmaConvertFrom(event.currentTarget.value);
                      setKarmaConvertTo("");
                    }}>
                      <option value="">请选择技能</option>
                      {karmaConversionSources.map((id) => <option key={id} value={id}>{getSkill(id)?.name ?? id}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm">转换成哪项技能
                    <select className="soft-input mt-1 w-full" value={selectedKarmaConvertTo}
                      disabled={!selectedKarmaConvertFrom} onChange={(event) => setKarmaConvertTo(event.currentTarget.value)}>
                      <option value="">请选择技能</option>
                      {karmaConversionTargets.map((id) => <option key={id} value={id}>{getSkill(id)?.name ?? id}</option>)}
                    </select>
                  </label>
                </div> : null}
                {isCheatTransfer ? cheatTransferPickers() : null}
                {selectedWindowSkill?.skill.id === SLOT_MACHINE_ID && readySlotMachines.length > 1 ? <label className="block text-sm">重抽的老虎机
                  <select className="soft-input mt-1 w-full" value={chosenSlotMachine?.id ?? ""} onChange={(event) => setSlotMachineId(event.target.value)}>
                    {readySlotMachines.map((entry, index) => <option key={entry.id} value={entry.id}>第 {index + 1} 组</option>)}
                  </select>
                </label> : null}
                {selectedWindowSkill?.skill.id === STAR_RESIST_ID ? <label className="block text-sm">
                  抵御目标
                  <select className="soft-input mt-1 w-full" value={resistibleDamage?.id ?? ""} onChange={(event) => setWindowDamageId(event.target.value)}>
                    {resistibleDamages.map((item) => <option key={item.id} value={item.id}>{formatPendingDamageLabel(state, item)}</option>)}
                  </select>
                </label> : null}
                {selectedWindowSkill?.skill.id === STORE_DAMAGE_ID ? <label className="block text-sm">
                  储存哪一份伤害
                  <select className="soft-input mt-1 w-full" value={storableDamage?.id ?? ""}
                    onChange={(event) => setWindowDamageId(event.target.value)}>
                    {storableDamages.map((item) => <option key={item.id} value={item.id}>{formatPendingDamageLabel(state, item)}</option>)}
                  </select>
                </label> : null}
                {selectedWindowSkill?.skill.id === QIANQIU_RESPONSE_ID ? <label className="block text-sm">
                  选择要响应的防御值
                  <select className="soft-input mt-1 w-full" value={qianqiuGain?.id ?? ""} onChange={(event) => setDefenseGainId(event.target.value)}>
                    {qianqiuGains.map((buff) => <option key={buff.id} value={buff.id}>{buff.name}</option>)}
                  </select>
                </label> : null}
                {selectedWindowSkill?.skill.id === RELEASE_DAMAGE_ID ? storedDamageSelect() : null}
                {selectedWindowSkill?.skill.id === KUISHI_ID ? <label className="block text-sm">
                  选择并公开声明要复制的大卡
                  <select className="soft-input mt-1 w-full" value={peekTarget?.instanceId ?? ""}
                    onChange={(event) => setPeekTargetInstanceId(event.target.value)}>
                    {peekTargets.map((card) => <option key={card.instanceId} value={card.instanceId}>
                      {card.ownerName} · {getBigCard(card.cardId)?.name ?? card.cardId}
                    </option>)}
                  </select>
                </label> : null}
                {selectedWindowSkill?.skill.id === KURONG_LEAF_ID && <div className="space-y-2">
                  <p className="text-sm">已选择 {leafAbilityChoices.length}/3 项。每张卡可选一项。</p>
                  {leafCards.map(({ ownerId, cardId, cardInstanceId, abilityIds }) => {
                    const card = getBigCard(cardId);
                    const selected = leafSelections[cardInstanceId] ?? "";
                    return <label key={cardInstanceId} className="block text-sm">
                      {getPlayerName(state, ownerId)} · {card?.name ?? cardId}
                      <select className="soft-input mt-1 w-full" value={selected}
                        disabled={leafAbilityChoices.length >= 3 && !selected}
                        onChange={(event) => setLeafSelections((prior) => ({ ...prior, [cardInstanceId]: event.target.value }))}>
                        <option value="">不选这张卡</option>
                        {card?.abilities.filter(({ id }) => abilityIds.includes(id)).map(({ id, description }) =>
                          <option key={id} value={id}>{id} · {description.length > 62 ? `${description.slice(0, 62)}…` : description}</option>)}
                      </select>
                      {selected && <span className="mt-1 block text-xs text-gray-600">
                        {card?.abilities.find(({ id }) => id === selected)?.description}
                      </span>}
                    </label>;
                  })}
                </div>}
                {isWindowDamageRedirect ? (
                  <label className="block text-sm font-medium text-gray-700">
                    {automaticStarWheel ? "待转移的伤害、不良或印记（按逆时针自动尝试）" : "待转移伤害"}
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowDamageId}
                      onChange={(event) => setWindowDamageId(event.target.value)}
                    >
                      {starWheelStatusOptions.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                      {redirectableDamageOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {formatPendingDamageLabel(state, item)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {isWindowDamageMark ? (
                  <label className="block text-sm font-medium text-gray-700">
                    待处理伤害
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowDamageId}
                      onChange={(event) => setWindowDamageId(event.target.value)}
                    >
                      {damageMarkOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {formatDamageMarkLabel(
                            state,
                            viewer?.id,
                            item,
                            isWindowIceRain ? "ice_rain" : "cross_guard"
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {isWindowCrystalGuard ? (
                  <label className="block text-sm font-medium text-gray-700">
                    消耗护佑印记层数
                    <input type="number" className="soft-input mt-1 w-full" min={1} max={maxCrystalMarks}
                      value={crystalMarkCount} onChange={(event) => setCrystalMarkCount(event.target.valueAsNumber || 0)} />
                  </label>
                ) : null}
                {isWindowActionSwitch ? (
                  windowSwitchOptions.length > 0 ? (
                    <label className="block text-sm font-medium text-gray-700">
                      切换出招
                      <select
                        className="soft-input mt-1 w-full"
                        value={selectedWindowSwitch?.key ?? ""}
                        onChange={(event) => setWindowSwitchKey(event.target.value)}
                      >
                        {windowSwitchOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      当前亮出的出招不能用这个技能切换。
                    </div>
                  )
                ) : null}
                {isWindowAttackMark ? (
                  <label className="block text-sm font-medium text-gray-700">
                    使用印记强化的攻击
                    <select className="soft-input mt-1 w-full" data-testid="mark-attack-select"
                      value={selectedWindowMarkAttack?.actionIndex ?? ""}
                      onChange={(event) => setWindowMarkAttackIndex(Number(event.target.value))}>
                      {windowMarkAttackOptions.map(({ actionIndex, action }) => <option key={actionIndex} value={actionIndex}>
                        第{actionIndex + 1}个攻击：{getActionLabel(action)} → {formatTargetNames(
                          (state.revealedActionTargets?.[viewer!.id]?.[actionIndex] ?? (action.targetId ? [action.targetId] : []))
                            .map((id) => getPlayerName(state, id)), "全体敌人 / 天")}
                      </option>)}
                    </select>
                    {!selectedWindowMarkAttack ? <span className="mt-1 block text-amber-700">本回合没有可强化的攻击。</span> : null}
                  </label>
                ) : null}
                {isWindowAttackStatModifier ? (
                  windowAttackStatModifierOptions.length > 0 ? (
                    <label className="block text-sm font-medium text-gray-700">
                      攻击属性变化
                      <select
                        data-testid="attack-stat-modifier-select"
                        className="soft-input mt-1 w-full"
                        value={selectedWindowAttackStatModifier?.key ?? ""}
                        onChange={(event) => setWindowAttackStatModifierKey(event.target.value)}
                      >
                        {windowAttackStatModifierOptions.map((option) => (
                          <option key={option.key} value={option.key} disabled={Boolean(option.error)}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {selectedWindowAttackStatModifier && viewer ? (() => {
                        const stats = previewPlayerAttackStats(state, viewer.id).stats[selectedWindowAttackStatModifier.actionIndex];
                        const action = state.revealedActions?.[viewer.id]?.actions[selectedWindowAttackStatModifier.actionIndex];
                        return stats && action ? <span className="mt-2 block text-xs" data-testid="attack-stat-current">
                          当前：{actionHasCakeCost(action, viewer) ? `耗饼 ${formatAttackStatNumber(stats.cost, stats.costValue)}` : "无耗饼"} · 攻击 {formatAttackDamageParts(stats)} · {stats.noClashLevel ? "无等级" : `等级 ${formatAttackStatNumber(stats.level, stats.levelValue)}`}
                        </span> : null;
                      })() : null}
                    </label>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      亮出的招里没有可改的攻击。
                    </div>
                  )
                ) : null}
                {isWindowAttackStatModifier && hasEnhancedLevelSwap(viewer) ?
                  <p className="text-xs text-gray-600">按使用顺序交换最终数值；费用差额在变招结束时统一结算。无耗饼攻击只能交换攻击与等级。</p> : null}
                {needsSkillTarget ? (
                  <label className="block text-sm font-medium text-gray-700">
                    已暴露技能
                    <input
                      className="soft-input mt-1 w-full"
                      onChange={(event) => setWindowExposedSkillQuery(event.target.value)}
                      placeholder={`搜索 ${exposedTargetSkills.length} 个已暴露技能`}
                      value={windowExposedSkillQuery}
                    />
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowTargetSkillId}
                      onChange={(event) => setWindowTargetSkillId(event.target.value)}
                    >
                      {filteredExposedTargetSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} #{skill.sourceRow}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {isWindowLishang ? (
                  <label className="block text-sm font-medium text-gray-700">
                    丢弃技能
                    <input
                      className="soft-input mt-1 w-full"
                      onChange={(event) => setWindowExposedSkillQuery(event.target.value)}
                      placeholder={`搜索 ${exposedTargetSkills.length} 个已暴露小技能`}
                      value={windowExposedSkillQuery}
                    />
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowTargetSkillId}
                      onChange={(event) => setWindowTargetSkillId(event.target.value)}
                    >
                      <option value="">不丢弃</option>
                      {filteredExposedTargetSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} #{skill.sourceRow}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {isWindowSandTransform ? (
                  <label className="block text-sm font-medium text-gray-700">
                    {selectedWindowSkill?.skill.id === getFusionSkillId("猥琐小叔叔") ? "选择额外技能" :
                      selectedWindowSkill?.skill.id === getFusionSkillId("沙皇") ? "强化沙子：选择二融合" : "普通沙子：选择小技能"}
                    <input
                      className="soft-input mt-1 w-full"
                      onChange={(event) => setWindowSandSkillQuery(event.target.value)}
                      placeholder={`搜索 ${sandSkills.length} 个可选技能`}
                      value={windowSandSkillQuery}
                    />
                    <select
                      className="soft-input mt-1 w-full"
                      value={windowSandSkillId}
                      onChange={(event) => setWindowSandSkillId(event.target.value)}
                    >
                      {filteredSandSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} #{skill.sourceRow}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {isWindowMagic ? <div className="grid gap-3 sm:grid-cols-3">
                  <TargetSelect enemies={enemies} targetId={windowSkillTargetId || enemies[0]?.id || ""} onChange={setWindowSkillTargetId} label="魔域目标 1" />
                  <TargetSelect enemies={enemies} targetId={windowSkillExtraTargetId || enemies[0]?.id || ""} onChange={setWindowSkillExtraTargetId} label="魔域目标 2" />
                  <TargetSelect enemies={enemies} targetId={magicThirdTargetId || enemies[0]?.id || ""} onChange={setMagicThirdTargetId} label="魔域目标 3" />
                  <p className="text-xs text-gray-500 sm:col-span-3">可重复选择同一玩家，每次吸取 1 血。</p>
                </div> : null}
                {!isVacuumWindowSkill ? (
                  <>
                    <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                      <Stat label="消耗" value={windowElementCost ? `${windowElementCost.perStack * windowSkillStacks} ${windowElementCost.element}` :
                        formatSkillCakeCost(selectedWindowSkill?.skill.id, windowSkillCost, viewer, windowSkillStacks)} />
                      <Stat label="阶段" value={phaseLabel(state.activeTimingPhase)} />
                      <Stat label="次数" value={isCheatSharpDamage ? `剩余 ${cheatDamageUses} 次` : summonUses === undefined ?
                        selectedWindowSkillPlay?.usesPerGame ? "本局限定" : "可重复" : `剩余 ${summonUses} 次`} />
                    </div>
                    <p className="text-sm leading-6 text-gray-600">
                      {selectedWindowSkill?.skill.description}
                    </p>
                  </>
                ) : null}
                <button
                  className="btn-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:bg-gray-300"
                  disabled={submitting || windowSkillInvalid}
                  onClick={() => {
                    if (!selectedWindowSkill) {
                      return;
                    }

                    if (isVacuumWindowSkill && selectedVacuumChoice) {
                      onSubmitWindowSkill({ type: "skill", skillId: VACUUM_FLASH_SKILL_ID, stacks: 1,
                        bigCardInstanceId: selectedVacuumChoice.cardId, vacuumUse: selectedVacuumChoice.mode });
                      return;
                    }

                    if (
                      pendingDeathWindow &&
                      viewerNoRevive &&
                      ACTIVE_REVIVAL_SKILL_IDS.has(selectedWindowSkill.skill.id)
                    ) {
                      window.alert(`受到${viewer?.buffs.find((buff) => buff.id === "no_revive")?.name ?? "致死效果"}限制，无法复活。`);
                      return;
                    }

                    const action: SkillAction = {
                      type: "skill",
                      skillId: selectedWindowSkill.skill.id,
                      stacks: isDemonSummon || isDemonOrder ? 1 : windowSkillStacks,
                      ...(windowAntiCakes ? { antiCakeSpent: windowAntiCakes } : {}),
                      ...(windowYoukaiCakes ? { youkaiCakeSpent: windowYoukaiCakes } : {})
                    };
                    if (action.skillId === DEMON_GUARD_ID) action.demonPlacement = demonPlacement;
                    if (isKarmaConvert) {
                      action.karmaConvertFromSkillId = selectedKarmaConvertFrom;
                      action.karmaConvertToSkillId = selectedKarmaConvertTo;
                    }
                    addCheatActionChoices(action);
                    if (isDemonOrder && selectedDemon) {
                      action.demonId = selectedDemon.id;
                      action.demonOrder = selectedDemonOrder;
                      if (needsDemonTarget && selectedDemonTarget) action.targetId = selectedDemonTarget.id;
                    }
                    if (action.skillId === STORE_DAMAGE_ID && storableDamage) action.targetDamageId = storableDamage.id;
                    if (action.skillId === QIANQIU_RESPONSE_ID && qianqiuGain) action.defenseGainId = qianqiuGain.id;
                    if (isTianlieResponse && tianlieResponse) action.attackResponseId = tianlieResponse.id;
                    if (isAttackAttachment && tianlieAttack) action.switchActionIndex = Number(tianlieAttack[0]);
                    if (isFiveElementsLevel) action.fiveElementsLevelOperation = fiveElementsOperation;
                    if (isColdLight) action.coldLightField = coldTargetField;
                    if (isEternalMove && eternalMove) action.switchActionIndex = eternalMove.index;
                    if (isPurpleScale) {
                      if (purpleCanSetPower && purplePower) action.purplePower = Number(purplePower);
                      if (purpleLevel) action.purpleLevel = Number(purpleLevel);
                    }
                    if (action.skillId === PURPLE_FORESIGHT_ID && purpleForesightCard) action.bigCardInstanceId = purpleForesightCard.instanceId;
                    if (action.skillId === PURPLE_INSIGHT_ID && purpleInsightCard) action.bigCardInstanceId = purpleInsightCard.instanceId;
                    if (isAsuraFerry) action.bloodQiSpent = asuraFerryQi;
                    if (isChaosWave && chaosMove) action.switchActionIndex = chaosMove.index;
                    if (action.skillId === FOUR_EMPTINESS_ID) action.removeSkillInstanceIds = selectedBlindIds;
                    if (action.skillId === SAKURA_FALL_ID) {
                      if (selectedSakuraIds.length !== 1) return;
                      action.removeSkillInstanceIds = selectedSakuraIds;
                      setSakuraSelected([]);
                    }
                    if (action.skillId === SLOT_MACHINE_ID && chosenSlotMachine) action.rerollFusionInstanceId = chosenSlotMachine.id;
                    if (action.skillId === STAR_RESIST_ID && resistibleDamage) action.targetDamageId = resistibleDamage.id;
                    if (action.skillId === RELEASE_DAMAGE_ID && selectedStoredDamage) action.storedDamageId = selectedStoredDamage.id;
                    if (action.skillId === KUISHI_ID && peekTarget) action.targetBigCardInstanceId = peekTarget.instanceId;
                    if (action.skillId === KURONG_LEAF_ID) action.leafAbilityChoices = leafAbilityChoices;
                    if (action.skillId === STAR_RAGE_ID) action.targetSkillId = windowTargetSkillId === STAR_RAGE_SIX_STAR ? STAR_RAGE_SIX_STAR : STAR_RAGE_ID;
                    if (isWindowActionSwitch && selectedWindowSwitch) {
                      action.switchActionIndex = selectedWindowSwitch.actionIndex;
                      action.switchToAction = selectedWindowSwitch.action;
                    }
                    if (isWindowAttackMark && selectedWindowMarkAttack) {
                      action.switchActionIndex = selectedWindowMarkAttack.actionIndex;
                    }
                    if (isWindowAttackStatModifier && selectedWindowAttackStatModifier) {
                      action.switchActionIndex = selectedWindowAttackStatModifier.actionIndex;
                      action.attackStatModifier = selectedWindowAttackStatModifier.modifier;
                    }
                    if (isWindowDoubleEdge && selectedWindowDoubleEdge) {
                      action.switchActionIndex = selectedWindowDoubleEdge.actionIndex;
                      action.targetId = selectedWindowDoubleEdge.targetId;
                      if (selectedWindowDoubleEdge.mode) action.doubleEdgeMode = selectedWindowDoubleEdge.mode;
                      if (selectedWindowDoubleEdge.cardId) action.bigCardInstanceId = selectedWindowDoubleEdge.cardId;
                    } else if (isWindowDoubleEdge) {
                      action.switchActionIndex = 0;
                    }
                    if (isWindowLiegong && selectedWindowLiegong) {
                      action.switchActionIndex = selectedWindowLiegong.actionIndex;
                      action.targetId = selectedWindowLiegong.targetId;
                    }
                    if (isWindowAbsoluteGuard && selectedWindowAbsoluteGuard) {
                      action.switchActionIndex = selectedWindowAbsoluteGuard.actionIndex;
                      action.targetId = selectedWindowAbsoluteGuard.sourceId;
                      if (selectedWindowAbsoluteGuard.mode === "area_to_sky") action.absoluteGuardToSky = true;
                    }
                    if (!isWindowActionSwitch && selectedWindowSkillPlay?.targetMode === "single") {
                      action.targetId = houndSummonTarget?.id ?? (isCheatSharpDamage ? cheatDamageTarget?.id ?? "" : windowSkillTargetId);
                    }
                    if (!isWindowActionSwitch && isWindowDamageRedirect) {
                      if (starWheelStatusOptions.some(({ id }) => id === windowDamageId)) action.starWheelStatusId = windowDamageId;
                      else action.targetDamageId = windowDamageId;
                    }
                    if (!isWindowActionSwitch && isWindowDamageMark) {
                      action.targetDamageId = windowDamageId;
                      if (isWindowCrystalGuard) action.crystalMarkCount = crystalMarkCount;
                    }
                    if (!isWindowActionSwitch && isWindowShunshouSteal) {
                      action.targetSkillId = windowTargetSkillId;
                    }
                    if (!isWindowActionSwitch && isWindowBalance) {
                      action.targetIds = [windowSkillTargetId, windowSkillExtraTargetId];
                    }
                    if (isBloodRitual && ritualFirst) {
                      action.targetId = ritualFirst.id;
                      action.targetIds = ritualNeedsSecond && ritualSecond ? [ritualFirst.id, ritualSecond.id] : [ritualFirst.id];
                    }
                    if (isWindowMagic) action.targetIds = [windowSkillTargetId || enemies[0]?.id, windowSkillExtraTargetId || enemies[0]?.id,
                      magicThirdTargetId || enemies[0]?.id].filter((id): id is string => Boolean(id));
                    if (!isWindowActionSwitch && isWindowLightning) {
                      action.targetIds = [windowSkillTargetId, windowSkillExtraTargetId].filter(Boolean);
                    }
                    if (!isWindowActionSwitch && isWindowLishang && windowTargetSkillId) {
                      action.targetSkillId = windowTargetSkillId;
                    }
                    if (!isWindowActionSwitch && needsSkillTarget) {
                      action.targetId = windowSkillTargetId;
                      action.targetSkillId = windowTargetSkillId;
                    }
                    if (!isWindowActionSwitch && isWindowSandTransform) {
                      action.targetSkillId = windowSandSkillId;
                    }
                    if (action.skillId === STAR_MOON_CHOOSE_CARD) {
                      if (!selectedStarMoonCard) return;
                      action.targetBigCardInstanceId = selectedStarMoonCard.instanceId;
                    }
                    onSubmitWindowSkill(action);
                  }}
                  type="button"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {isDemonOrder ? "下达指令" : isDemonSummon ? "召唤" : "使用技能"}
                </button>
                {antiCakeBalance > 0 && windowSkillCost > 0 ? <AntiCakePayment key="window" label="本次技能" cost={windowSkillCost}
                  balance={antiCakeBalance} anti={windowAntiCakes} onChange={(amount) => changeAntiCakeChoice("window", amount)} /> : null}
                {windowYoukaiBalance > 0 && windowSkillCost > 0 ? <YoukaiCakePayment label="本次技能"
                  max={Math.min(windowYoukaiBalance, windowSkillCost - windowAntiCakes)} amount={windowYoukaiCakes}
                  onChange={(amount) => changeYoukaiCakeChoice("window", amount)} /> : null}
              </>
            ) : phaseSkills.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                当前阶段没有可主动使用的技能。
              </div>
            ) : null}
            <button
              className="btn-secondary w-full justify-center py-3"
              data-testid="pass-action-window"
              disabled={submitting || alreadyPassed}
              onClick={onPassActionWindow}
              type="button"
            >
              {pendingDeathWindow ? "结束复活响应" : "结束行动"}
            </button>
            <button
              className="btn-secondary w-full justify-center py-3"
              data-testid="skip-to-next-action"
              disabled={submitting || alreadyPassed}
              onClick={onSkipToNextAction}
              type="button"
            >
              <FastForward className="h-4 w-4" aria-hidden="true" />
              跳到下次出招
            </button>
          </div>
        )}
        {fusionSection}
        </div>
      </section>
    );
  }

  function selectMode(nextMode: Mode) {
    setFreeMoveId("");
    setMode(nextMode);
  }

  function selectFreeMove(id: string) {
    setFreeMoveId(id);
    const move = freeMoveChoices.find((choice) => choice.id === id)?.move;
    if (!move) return;
    if (move.type === "defense") {
      setMode("defense");
      setDefense(move.defense);
    } else if (move.type === "gain_cake") {
      setMode("gain_cake");
    } else if (move.type === "skill" && (getSkillPlay(move.skillId)?.kind !== "attack" ||
      move.skillId === ELECTRIC_SHOCK_SKILL_ID || move.skillId === SWARM_RETURN_ID ||
      move.skillId === DRAGON_BLOOD_FIELD_ID && dragonBloodMode === "heal")) {
      setMode("skill");
      setSkillId(move.skillId);
      setSkillStacks(move.stacks);
      setSkillExtraTargetIds([]);
    } else {
      setMode("attack");
      setAttackExtraEffectTargetId("");
      setAttackRows([{ id: "free-move", kind: move.type, attackId: move.type === "attack" ? move.attackId : "sha",
        skillId: move.type === "skill" ? move.skillId : "", stacks: move.stacks, targetId: enemies[0]?.id ?? "" }]);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canAct || submitting || actionInvalid || collectingPhaseSkill) {
      return;
    }
    const withPayment = (action: PlayerAction, anti: number, youkai: number): PlayerAction =>
      action.type === "attack" || action.type === "skill" || action.type === "defense"
        ? { ...action, ...(anti ? { antiCakeSpent: anti } : {}), ...(youkai ? { youkaiCakeSpent: youkai } : {}) }
        : action;
    const submitMove = (action: Exclude<PlayerAction, { type: "discard_skill" }>) =>
      onSubmit(selectedFreeMove ? { ...action, freeMoveId: selectedFreeMove.id } :
        withPayment(action, paymentRows[0]?.anti ?? 0, paymentRows[0]?.youkai ?? 0));

    if (mode === "gain_cake") {
      submitMove({ type: "gain_cake" });
      return;
    }

    if (mode === "defense") {
      if (defense === "rebound") {
        submitMove({
          type: "defense",
          defense,
          ...(viewerHasScatterRebound ? {} : { targetId })
        });
        return;
      }

      submitMove({
        type: "defense",
        defense
      });
      return;
    }

    if (mode === "skill") {
      if (!selectedSkill || !selectedSkillPlay) {
        return;
      }

      if (selectingTotem && totemPrimary) {
        submitMove({ type: "skill", skillId: selectedSkill.skill.id, stacks: 1, targetId: totemPrimary.id, totemRange,
          ...(selectedSkill.skill.id === TOTEM_CHOOSE_ID ? { totemKind } : {}),
          ...(totemAfter ? { totemAfterId: totemAfter.id } : {}) });
        return;
      }
      if (selectingShadowMove && selectedShadowAnchorId) {
        submitMove({ type: "skill", skillId: selectedSkill.skill.id, stacks: skillStacks, targetId: selectedShadowAnchorId,
          ...(selectingShadowWind ? { shadowMoveMode } : {}) });
        return;
      }
      if (selectedSkillPlay.optionalTargetCount !== undefined && selectedSkill.skill.id !== DRAGON_BLOOD_FIELD_ID) {
        submitMove({ type: "skill", skillId: selectedSkill.skill.id, stacks: skillStacks,
          targetIds: skillExtraTargetIds.filter(Boolean) });
        return;
      }

      if (selectedSkillPlay.targetMode === "single") {
        if (isMultiTargetAttackSkill(selectedSkill.skill.id)) {
          submitMove({
            type: "skill",
            skillId: selectedSkill.skill.id,
            stacks: skillStacks,
            targetId: skillTargetId,
            targetIds: skillTargetIds
          });
          return;
        }

        submitMove({
          type: "skill",
          skillId: selectedSkill.skill.id,
          stacks: skillStacks,
          targetId: skillTargetId,
          ...spaceTimeMoveOptions(selectedSkill.skill.id, spaceTimeOptions),
          ...(freeVerdict ? { freeStacks: 1 } : {}),
          ...(selectedSkill.skill.id === RELEASE_DAMAGE_ID && selectedStoredDamage ? { storedDamageId: selectedStoredDamage.id } : {})
        });
        return;
      }

      submitMove({
        type: "skill",
        skillId: selectedSkill.skill.id,
        stacks: skillStacks,
        ...saintResource,
        ...(selectedSkill.skill.id === SEVEN_STAR_YAOGUANG && sevenStarRestoration ?
          { cardForm: sevenStarRestoration.cardForm, bigCardInstanceId: sevenStarRestoration.bigCardInstanceId } : {}),
        ...spaceTimeMoveOptions(selectedSkill.skill.id, spaceTimeOptions),
        ...(selectedSkill.skill.id === GAME_SWITCH_ACTION_ID ? { gameSwitchMode } : {}),
        ...(selectedSkill.skill.id === KARMA_CYCLE_ID && karmaCardChanges.length ? { karmaCardChanges } : {}),
        ...(selectedSkill.skill.id === SAKURA_FINALE_ID ? { removeSkillInstanceIds: selectedSakuraIds } : {}),
        ...(selectedSkill.skill.id === SWARM_RETURN_ID && !selectedFreeMove ? { swarmAllocation: selectedSwarmAllocation } : {}),
        ...(selectedXielingTransform ? { xielingMarkCost } : {})
      });
      return;
    }

    const actions = attackRows.map((row) => {
      if (row.kind === "skill") {
        const swordSource = row.skillId === SWORD_ARRAY_EXECUTE_ID && !selectedFreeMove ? swordExecuteSource(row) : undefined;
        const freeStacks =
          Boolean(!selectedFreeMove && viewer && getFreeSkillChargeId(viewer, row.skillId))
            ? Math.min(row.stacks, row.freeStacks ?? 0, getFreeLianBaoStacks(row.skillId))
            : 0;
        const freePatch = { ...(freeStacks > 0 ? { freeStacks } : {}),
          ...spaceTimeMoveOptions(row.skillId, row),
          ...(row.skillId === TIGER_STAB ? { tigerPower: Number(tigerPower) } : {}),
          ...(swordSource ? { bigCardInstanceId: swordSource } : {}) };
        if (rowIsArea(row)) {
          return {
            type: "skill" as const,
            skillId: row.skillId,
            stacks: row.stacks,
            ...([ANNIHILATION_CANNON_ID, SPIRIT_GUIDANCE_ID].includes(row.skillId) &&
              enemies.some((player) => player.id === attackExtraEffectTargetId) ? { targetIds: [attackExtraEffectTargetId] } : {}),
            ...freePatch
          };
        }

        if (isMultiTargetAttackSkill(row.skillId)) {
          return {
            type: "skill" as const,
            skillId: row.skillId,
            stacks: row.stacks,
            ...freePatch,
            targetId: row.targetId,
            targetIds: rowTargetIds(row)
          };
        }

        return {
          type: "skill" as const,
          skillId: row.skillId,
          stacks: row.stacks,
          ...freePatch,
          targetId: row.targetId
        };
      }

      if (rowIsArea(row)) {
        return {
          type: "attack" as const,
          attackId: row.attackId,
          stacks: row.stacks
        };
      }

      return {
        type: "attack" as const,
        attackId: row.attackId,
        stacks: row.stacks,
        targetId: row.targetId
      };
    });

    if (actions.length === 0) {
      return;
    }

    if (actions.length === 1) {
      submitMove(actions[0]!);
      return;
    }

    onSubmit({
      actions: actions.map((action, index) => withPayment(action, paymentRows[index]?.anti ?? 0, paymentRows[index]?.youkai ?? 0))
    });
  }

  return (
    <section
      className="surface-card action-board p-5"
      data-action-invalid={actionInvalid ? "true" : "false"}
      data-already-submitted={alreadySubmitted ? "true" : "false"}
      data-can-submit={submitReady && !collectingPhaseSkill ? "true" : "false"}
      data-locked-action={lockedActionSummary}
      data-ready-state={actionReadyState}
      data-round-number={state.roundNumber}
      data-round-turn-number={state.roundTurnNumber}
      data-selected-action={actionDisplaySummary}
      data-submit-ready={submitReady && !collectingPhaseSkill ? "true" : "false"}
      data-testid="action-board"
      data-viewer-id={viewer?.id ?? ""}
    >
      {junengStatus}
      {viewer?.spaceId ? <p className="text-sm font-semibold">小空间 · {state.smallSpaces?.[viewer.spaceId]?.name}
        {(state.smallSpaces?.[viewer.spaceId]?.cakeMultiplier ?? 1) > 1 ? ` · 出饼×${state.smallSpaces![viewer.spaceId]!.cakeMultiplier}` : ""}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-950">出招</h2>
          <p className="mt-1 text-sm text-gray-500">
            第 {state.roundNumber} 轮 · 本轮第 {state.roundTurnNumber} 回合
          </p>
        </div>
        {alreadySubmitted ? (
          <span className="status-pill border-emerald-200 bg-emerald-50 text-emerald-700">
            等待他人
          </span>
        ) : null}
      </div>

      {!collectingPhaseSkill ? <div
        className={[
          "action-command-strip",
          `action-command-strip-${actionReadyState}`
        ].join(" ")}
        data-testid="action-command-strip"
        data-ready-state={actionReadyState}
        data-block-reason={actionBlockReason ?? ""}
        data-next-step={actionCommandLabel}
        data-target-count={previewTargetIds.length}
        data-target-ids={previewTargetKey}
        data-next-action-hint={actionRecoveryHint ?? ""}
        data-selected-action={actionDisplaySummary}
        data-locked-action={lockedActionSummary}
        aria-live="polite"
      >
        <div>
          <span>出牌提示</span>
          <strong>{actionCommandLabel}</strong>
        </div>
        <div>
          <span>目标</span>
          <strong>{previewTargetLabel}</strong>
        </div>
        <div>
          <span>牌面状态</span>
          <strong>{actionStatusLabel}</strong>
        </div>
      </div> : null}

      <form className="action-form mt-4" onSubmit={submit}>
        {!collectingPhaseSkill && antiCakeBalance > 0 && paymentRows.some(({ cost }) => cost > 0) ? <div className="space-y-2">
          {paymentRows.filter(({ cost }) => cost > 0).map(({ key, cost, label, anti }) => <AntiCakePayment key={key} label={label}
            cost={cost} balance={antiCakeBalance} anti={anti} onChange={(amount) => changeAntiCakeChoice(key, amount)} />)}
        </div> : null}
        {!collectingPhaseSkill && youkaiCakeBalance > 0 && paymentRows.some(({ cost }) => cost > 0) ? <div className="space-y-2">
          {paymentRows.filter(({ cost }) => cost > 0).map(({ key, label, maxYoukai, youkai }) =>
            <YoukaiCakePayment key={key} label={label} max={maxYoukai} amount={youkai}
              onChange={(amount) => changeYoukaiCakeChoice(key, amount)} />)}
        </div> : null}
        <div className="action-scroll-body space-y-4">
          <div className="action-mode-grid grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ModeButton
            active={mode === "gain_cake"}
            disabled={Boolean(moveBlockReason)}
            icon={<Cookie className="h-4 w-4" aria-hidden="true" />}
            label={gathersYoukai ? "积妖元" : "吃饼"}
            onClick={() => selectMode("gain_cake")}
            testId="action-mode-gain-cake"
          />
          <ModeButton
            active={mode === "defense"}
            disabled={Boolean(moveBlockReason)}
            icon={<Shield className="h-4 w-4" aria-hidden="true" />}
            label="防御"
            onClick={() => selectMode("defense")}
            testId="action-mode-defense"
          />
          <ModeButton
            active={mode === "attack"}
            disabled={Boolean(moveBlockReason) || firstTurnAttackLocked}
            icon={<Swords className="h-4 w-4" aria-hidden="true" />}
            label="攻击"
            onClick={() => selectMode("attack")}
            testId="action-mode-attack"
          />
          <ModeButton
            active={mode === "skill"}
            disabled={phaseSkills.length === 0 && (Boolean(moveBlockReason) || nonAttackSkills.length === 0)}
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            label="技能"
            onClick={() => selectMode("skill")}
            testId="action-mode-skill"
          />
          </div>

          {lockedHound ? <p className="text-sm font-semibold">受邪犬限制，指向性出招只能以 {lockedHound.name} 为目标。</p> : null}

          {freeMoveChoices.length > 0 || freeMoveId ? (
            <label className="block text-sm font-medium text-gray-700">
              免费出招
              <select className="soft-input mt-1 w-full" data-testid="free-move-select"
                value={freeMoveId} onChange={(event) => selectFreeMove(event.target.value)}>
                <option value="">使用普通出招</option>
                {freeMoveId && !selectedFreeMove ? <option value={freeMoveId}>机会已用完</option> : null}
                {freeMoveChoices.map(({ id, move, remaining }) => (
                  <option key={id} value={id}>{getActionLabel(move)} · 剩 {remaining} 次</option>
                ))}
              </select>
            </label>
          ) : null}

          {tigerStabSelected ? <label className="block text-sm font-medium">幽冥刺攻击值
            <input className="soft-input mt-1 w-full" type="number" step={1} value={tigerPower}
              onChange={(event) => setTigerPower(event.target.value)} />
          </label> : null}
          {mode === "defense" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              防御
              <select
                className="soft-input mt-1 w-full"
                data-testid="defense-select"
                value={defense}
                disabled={Boolean(selectedFreeMove)}
                onChange={(event) => setDefense(event.target.value as typeof defense)}
              >
                {(["small", "youtiao", "stone", "rebound", "self_destruct"] as const).map((item) => (
                  <option key={item} value={item} disabled={item === "rebound" && reboundLocked}>
                    {DEFENSE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            {defense === "rebound" && viewerHasScatterRebound ? (
              <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                散弹：群体反弹
              </div>
            ) : defense === "rebound" ? (
              <TargetSelect
                enemies={reboundTargets}
                targetId={targetId}
                onChange={setTargetId}
                label="反弹目标"
                allowEmpty={!reboundTargets.length}
                emptyLabel="没有可选目标"
              />
            ) : defense === "self_destruct" ? (
              <div className="self-end rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                自爆：无目标，本回合所有出招无效并进入轮末判定点
              </div>
            ) : null}
          </div>
          ) : null}

          {mode === "attack" ? (
          <div className="space-y-3">
            {attackRows.map((row, index) => {
              const stats = rowStats(row);
              const play = row.kind === "skill" ? getSkillPlay(row.skillId) : undefined;
              const isArea = rowIsArea(row);
              const maxStacks = rowMaxStacks(row);
              const lianBaoFreeMax =
                row.kind === "skill" && Boolean(viewer && getFreeSkillChargeId(viewer, row.skillId))
                  ? Math.min(row.stacks, getFreeLianBaoStacks(row.skillId))
                  : 0;
              const extraTargetSlotCount =
                row.kind === "skill" ? getExtraTargetSlotCount(row.skillId) : 0;
              const targetError =
                row.kind === "skill" ? multiTargetSkillTargetError(state, row) : undefined;
              return (
                <div key={row.id} className="action-row" data-testid={`attack-row-${index}`}>
                  <div
                    className={
                      row.kind === "skill" && Boolean(viewer && getFreeSkillChargeId(viewer, row.skillId))
                        ? "attack-row-fields grid gap-3 md:grid-cols-[1fr_96px_110px_1fr_auto]"
                        : "attack-row-fields grid gap-3 md:grid-cols-[1fr_96px_1fr_auto]"
                    }
                  >
                    <label className="block text-sm font-medium text-gray-700">
                      攻击 / 技能
                      <select
                        className="soft-input mt-1 w-full"
                        data-testid={`attack-row-kind-${index}`}
                        disabled={Boolean(selectedFreeMove)}
                        value={rowValue(row)}
                        onChange={(event) => updateRowKind(row.id, event.target.value)}
                      >
                        <optgroup label="基础招式">
                          {ATTACK_ORDER.map((id) => {
                            const item = BASE_ATTACKS[id];
                            return (
                              <option key={id} value={`attack:${id}`}>
                                {item.name} · {item.cost}饼
                              </option>
                            );
                          })}
                        </optgroup>
                        {actionSkills.length > 0 ? (
                          <optgroup label="技能招式">
                            {actionSkills.map(({ skill, play }) => (
                              <option key={skill.id} value={`skill:${skill.id}`}>
                                {huntLabel(skill.id, play.attackName ? `${play.attackName}（${skill.name}）` : skill.name)} · {formatSkillCakeCost(skill.id)}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                    </label>
                    <label className="attack-row-stacks block text-sm font-medium text-gray-700">
                      重数
                      <input
                        className="soft-input mt-1 w-full"
                        min={1}
                        max={maxStacks}
                        readOnly={Boolean(selectedFreeMove)}
                        type="number"
                        value={row.stacks}
                        onChange={(event) =>
                          updateAttackRow(row.id, {
                            stacks: Math.max(
                              1,
                              Math.min(maxStacks, Number(event.target.value))
                            )
                          })
                        }
                      />
                    </label>
                    {row.kind === "skill" ? <SpaceTimeMoveOptions id={row.id} skillId={row.skillId} options={row}
                      onChange={(patch) => updateAttackRow(row.id, patch)} /> : null}
                    {!selectedFreeMove && row.kind === "skill" && Boolean(viewer && getFreeSkillChargeId(viewer, row.skillId)) ? (
                      <label className="attack-row-free-stacks block text-sm font-medium text-gray-700">
                        免费重数
                        <select
                          className="soft-input mt-1 w-full"
                          value={Math.min(row.freeStacks ?? 0, lianBaoFreeMax)}
                          onChange={(event) =>
                            updateAttackRow(row.id, {
                              freeStacks: Math.max(
                                0,
                                Math.min(lianBaoFreeMax, Number(event.target.value))
                              )
                            })
                          }
                        >
                          {Array.from({ length: lianBaoFreeMax + 1 }, (_, value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {!isArea ? (
                      <div
                        className={
                          extraTargetSlotCount > 0
                            ? extraTargetSlotCount > 1
                              ? "attack-row-targets grid gap-2 sm:grid-cols-3"
                              : "attack-row-targets grid gap-2 sm:grid-cols-2"
                            : "attack-row-targets"
                        }
                      >
                        <TargetSelect
                          enemies={attackRowTargetOptions(row)}
                          targetId={row.targetId}
                          testId={`attack-row-target-${index}`}
                          onChange={(nextTargetId) =>
                            updateAttackRow(row.id, {
                              targetId: nextTargetId,
                              extraTargetIds: (row.extraTargetIds ?? []).filter(
                                (id) => id !== nextTargetId
                              )
                            })
                          }
                          label="攻击目标"
                        />
                        {Array.from(
                          { length: extraTargetSlotCount },
                          (_, extraIndex) => (
                            <TargetSelect
                              allowEmpty
                              enemies={extraTargetOptions(row, extraIndex)}
                              key={extraIndex}
                              targetId={(row.extraTargetIds ?? [])[extraIndex] ?? ""}
                              testId={`attack-row-extra-target-${index}-${extraIndex}`}
                              onChange={(nextTargetId) =>
                                updateAttackRowExtraTarget(row.id, extraIndex, nextTargetId)
                              }
                              label={`追加目标 ${extraIndex + 1}`}
                            />
                          )
                        )}
                      </div>
                    ) : (
                      <div className="attack-row-area self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        群攻全体
                        {row.kind === "skill" && [ANNIHILATION_CANNON_ID, SPIRIT_GUIDANCE_ID].includes(row.skillId) ? <TargetSelect allowEmpty
                          enemies={enemies} targetId={attackExtraEffectTargetId} onChange={setAttackExtraEffectTargetId}
                          label={row.skillId === SPIRIT_GUIDANCE_ID ? "出招无效目标（可不选）" : "立即退游目标（可不选）"} /> : null}
                      </div>
                    )}
                    <button
                      aria-label={`移除第 ${index + 1} 个攻击`}
                      className="attack-row-remove self-end rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:border-red-200 hover:text-red-700 disabled:opacity-40"
                      disabled={attackRows.length === 1}
                      onClick={() => removeAttackRow(row.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  {row.kind === "skill" && row.skillId === SWORD_ARRAY_EXECUTE_ID && !selectedFreeMove && swordExecuteSources.length > 1 && (
                    <label className="mt-3 block text-sm">诛灭来源
                      <select className="soft-input mt-1 w-full" value={swordExecuteSource(row)}
                        onChange={(event) => updateAttackRow(row.id, { bigCardInstanceId: event.target.value })}>
                        {swordExecuteSources.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                      </select>
                    </label>
                  )}
                  <div className="attack-row-stats mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-4">
                    <Stat label="消耗" value={`${rowCost(row)}饼`} />
                    {stats ? (
                      <>
                        <Stat label="攻击" value={row.skillId === SHADOW_STOP_SHRIEK_ID ? "目标血量 + 1" : formatAttackDamageParts(stats)} />
                        <Stat label="等级" value={row.skillId === SHADOW_STOP_SHRIEK_ID ? "等同攻击" :
                          stats.noClashLevel ? "无等级" : formatAttackStatNumber(stats.level, stats.levelValue)} />
                        <Stat label="防御" value={row.skillId === SHADOW_STOP_SHRIEK_ID ? "出招即可防" : DEFENSE_TAG_LABELS[stats.defenseTag]} />
                      </>
                    ) : (
                      <>
                        <Stat label="类型" value={play?.kind === "effect" ? "效果" : "技能"} />
                        <Stat label="目标" value="单体" />
                        <Stat label="说明" value={getSkill(row.skillId)?.name ?? "技能"} />
                      </>
                    )}
                  </div>
                  {duplicatedTargets && index === 0 ? (
                    <p className="mt-2 text-sm text-red-600">
                      一回合里不能对同一个人做多个招式。
                    </p>
                  ) : null}
                  {targetError ? (
                    <p className="mt-2 text-sm text-red-600">
                      {targetError}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-3">
              <button
                className="btn-secondary disabled:opacity-40"
                data-testid="add-attack-row"
                disabled={
                  Boolean(selectedFreeMove) || attackRows.length >= enemies.length ||
                  attackRows.some((row) => rowIsArea(row))
                }
                onClick={addAttackRow}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                添加目标
              </button>
              <div className="text-sm font-medium text-gray-600">
                总消耗：{[attackCost > 0 || !resourceCostLabel ? `${attackCost} 饼` : "", resourceCostLabel].filter(Boolean).join(" ＋ ")}
              </div>
            </div>
            {hasAreaMixed ? (
              <p className="text-sm text-red-600">群攻招式必须单独使用。</p>
            ) : null}
          </div>
          ) : null}

          {mode === "skill" ? (
          <div className="action-row space-y-3">
            {!collectingPhaseSkill && !selectedFreeMove && selectedSkill?.skill.id === VERDICT_ACTION_ID && verdictFreeAvailable ? <label className="flex gap-2 text-sm">
              <input type="checkbox" checked={useFreeVerdict} onChange={(event) => setUseFreeVerdict(event.target.checked)} /> 使用一次免费裁决
            </label> : null}
            {nonAttackSkills.length > 0 || phaseSkills.length > 0 ? (
              <PhaseSkillSelect testId="skill-action-select" selected={collectingPhaseSkill?.value ?? selectedSkill?.skill.id ?? ""}
                disabled={Boolean(selectedFreeMove)} onChange={(id) => {
                  setSkillId(id);
                  setSkillStacks(1);
                  setSkillExtraTargetIds([]);
                }}
                moves={nonAttackSkills.map(({ skill }) => ({
                  value: skill.id, label: `${skill.name} · ${formatSkillCakeCost(skill.id)}`, disabled: Boolean(moveBlockReason)
                }))}
                phaseSkills={phaseSkills} standardLabel="主出招" />
            ) : null}
            {collectingPhaseSkill ? collectingPhaseSkill.controls : nonAttackSkills.length > 0 ? (
              <>
                <div className="grid gap-3 md:grid-cols-[96px_1fr]">
                  <label className="block text-sm font-medium text-gray-700">
                    重数
                    <input
                      className="soft-input mt-1 w-full"
                      min={1}
                      max={skillMaxStacks}
                      readOnly={Boolean(selectedFreeMove)}
                      type="number"
                      value={skillStacks}
                      onChange={(event) =>
                        setSkillStacks(
                          Math.max(1, Math.min(skillMaxStacks, Number(event.target.value)))
                        )
                      }
                    />
                  </label>
                  {selectedSkill?.skill.id === SEVEN_STAR_YAOGUANG ? (
                    <label className="block text-sm font-medium text-gray-700">
                      恢复形态
                      <select className="soft-input mt-1 w-full" value={sevenStarRestoration?.id ?? ""}
                        onChange={(event) => setSevenStarRestoreId(event.currentTarget.value)}>
                        {sevenStarRestorations.map(({ id, cardForm }) => <option key={id} value={id}>{SEVEN_STAR_FORMS[cardForm].name}</option>)}
                      </select>
                    </label>
                  ) : selectedSkill?.skill.id === GAME_SWITCH_ACTION_ID ? (
                    <label className="block text-sm font-medium text-gray-700">
                      切换游戏
                      <select className="soft-input mt-1 w-full" data-testid="game-switch-mode" value={gameSwitchMode}
                        onChange={(event) => setGameSwitchMode(event.currentTarget.value as GameSwitchMode)}>
                        {Object.entries(GAME_SWITCH_MODES).map(([mode, label]) => <option key={mode} value={mode}>{label}</option>)}
                      </select>
                    </label>
                  ) : selectingSwarm && !selectedFreeMove ? (
                    <fieldset className="grid grid-cols-2 gap-2">
                      <legend>选择要消耗的虫（{Object.values(selectedSwarmAllocation).reduce((total, count) => total + count, 0)}/10）</legend>
                      {SWARM_INSECTS.map((insect) => {
                        const stock = swarmInsectCount(viewer, insect);
                        return <label key={insect} className="text-sm">{SWARM_INSECT_LABELS[insect]}（{stock}只）
                          <select className="soft-input mt-1 w-full" value={selectedSwarmAllocation[insect]}
                            onChange={(event) => setSwarmAllocation({ ...selectedSwarmAllocation, [insect]: Number(event.currentTarget.value) })}>
                            {Array.from({ length: Math.min(stock, 10) + 1 }, (_, count) => <option key={count}>{count}</option>)}
                          </select>
                        </label>;
                      })}
                    </fieldset>
                  ) : selectedSkill?.skill.id === KARMA_CYCLE_ID && karmaTargetIds.length > 0 && state.karmaReplacementIds?.length ? (
                    <fieldset className="col-span-full grid max-h-72 gap-2 overflow-y-auto text-sm" data-testid="karma-card-changes">
                      <legend>改变大卡（每人可选一张）</legend>
                      {karmaTargetIds.map((playerId) => {
                        const choice = karmaSelections[playerId] ?? {};
                        const name = state.players.find((player) => player.id === playerId)?.name ?? "玩家";
                        const selectedId = isKarmaChangedCardValid(choice, playerId) ? choice.cardInstanceId : "";
                        return <div key={playerId} className="grid gap-1 sm:grid-cols-2">
                          <label className="min-w-0">{name}的大卡
                            <select className="soft-input mt-1 w-full" value={selectedId ?? ""} onChange={(event) =>
                              setKarmaSelection(playerId, event.currentTarget.value ? { cardInstanceId: event.currentTarget.value } : {})}>
                              <option value="">保留</option>
                              {state.karmaCardChoices?.filter((card) => card.playerId === playerId).map((card) =>
                                <option key={card.instanceId} value={card.instanceId}>
                                  大卡 {card.number}{card.visibleCardId ? ` · ${getBigCard(card.visibleCardId)?.name ?? card.visibleCardId}` : ""}
                                </option>)}
                            </select>
                          </label>
                          {selectedId ? <label className="min-w-0">更换为
                            <select className="soft-input mt-1 w-full" value={choice.replacementCardId ?? ""} onChange={(event) =>
                              setKarmaSelection(playerId, { cardInstanceId: selectedId, replacementCardId: event.currentTarget.value })}>
                              <option value="">请选择大卡</option>
                              {state.karmaReplacementIds?.map((id) => <option key={id} value={id}>{id} · {getBigCard(id)?.name ?? id}</option>)}
                            </select>
                          </label> : null}
                        </div>;
                      })}
                    </fieldset>
                  ) : selectedSkill?.skill.id === SAKURA_FINALE_ID ? sakuraPicker(state.sakuraFinaleDiscardCount ?? 0) :
                    selectedSkill?.skill.id === SAKURA_RAIN_ID ? (
                      <p className="text-sm">消耗当前持有的全部樱（{getElementAmount(viewer, "樱")} 个）</p>
                  ) : selectedSkill && isDoubleEdgeSwordSkill(selectedSkill.skill) ? (
                    <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      双刃剑请在变招阶段选择被防住的攻击目标
                    </div>
                  ) : selectedSkill && isAbsoluteGuardSkill(selectedSkill.skill) ? (
                    <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      绝对守护请在变招阶段选择本回合攻击你的攻击
                    </div>
                  ) : selectedSkillPlay?.optionalTargetCount !== undefined && selectedSkill?.skill.id !== DRAGON_BLOOD_FIELD_ID ? (
                    <div className="grid gap-2">
                      {Array.from({ length: selectedSkillPlay.optionalTargetCount }, (_, index) => (
                        <TargetSelect key={index} allowEmpty label={selectedSkill?.skill.id === CHARITY_LINK_ID ?
                          `共享目标 ${index + 1}` : `限制目标 ${index + 1}（可不选）`}
                          enemies={(selectedSkill?.skill.id === CHARITY_LINK_ID ? selectableEnemies.filter(({ id }) => id !== viewer?.id) : enemies)
                            .filter((enemy) => !skillExtraTargetIds.some((id, position) => position !== index && id === enemy.id))}
                          targetId={skillExtraTargetIds[index] ?? ""} testId={`skill-optional-target-${index}`}
                          onChange={(id) => setSkillExtraTargetIds((current) => Array.from({ length: selectedSkillPlay.optionalTargetCount! }, (_, position) => position === index ? id : current[position] ?? ""))} />
                      ))}
                    </div>
                  ) : selectingShadowMove ? (
                    <div className="grid gap-2">
                      {selectingShadowWind && <label className="block text-sm font-medium text-gray-700">
                        移动方式
                        <select className="soft-input mt-1 w-full" data-testid="shadow-move-mode" value={shadowMoveMode}
                          onChange={(event) => {
                            setShadowMoveMode(event.currentTarget.value as typeof shadowMoveMode);
                            setShadowAnchorId("");
                          }}>
                          <option value="insert">移到两个座次之间</option>
                          <option value="behind">移到目标身后</option>
                        </select>
                      </label>}
                      <TargetSelect label={shadowSeatMode === "insert" ? "插入位置" : "目标"} testId="shadow-move-target"
                        targetId={selectedShadowAnchorId ?? ""} onChange={setShadowAnchorId}
                        allowEmpty={shadowAnchors.length === 0} emptyLabel="没有可用位置"
                        enemies={shadowAnchorOptions} />
                    </div>
                  ) : selectingTotem ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <TargetSelect enemies={junengLock ? totemSeats.filter(({ id }) => id === junengTargetId) : totemSeats}
                        targetId={totemPrimary?.id ?? ""} onChange={setTotemPrimaryId} label="图腾主目标" testId="totem-primary-target" />
                      <label className="block text-sm">生效范围
                        <select className="soft-input mt-1 w-full" value={totemRange}
                          onChange={(event) => setTotemRange(event.currentTarget.value as TotemRange)}>
                          {Object.entries(TOTEM_RANGES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                        </select>
                      </label>
                      <label className="block text-sm">摆放位置
                        <select className="soft-input mt-1 w-full" value={totemAfter?.id ?? ""}
                          onChange={(event) => setTotemAfterId(event.currentTarget.value)}>
                          <option value="">附属造物区（其他物品）</option>
                          {totemSeats.map(({ id, name }) =>
                            <option key={id} value={id}>座次 {totemSeatNumbers?.get(id) === Infinity ? "∞" : totemSeatNumbers?.get(id)} · {name}之后</option>)}
                        </select>
                      </label>
                      {selectedSkill?.skill.id === TOTEM_CHOOSE_ID && <label className="block text-sm">图腾种类
                        <select className="soft-input mt-1 w-full" value={totemKind}
                          onChange={(event) => setTotemKind(event.currentTarget.value as TotemKind)}>
                          {Object.entries(TOTEM_KINDS).map(([id, { name }]) => <option key={id} value={id}>{name}</option>)}
                        </select>
                      </label>}
                    </div>
                  ) : selectedSkillPlay?.targetMode === "single" ? (
                    <div
                      className={
                        selectedSkill && getExtraTargetSlotCount(selectedSkill.skill.id) > 0
                          ? "grid gap-2 sm:grid-cols-2"
                          : ""
                      }
                    >
                      <TargetSelect
                        enemies={specialMoveTargets(selectedSkill?.skill.id) ??
                          (skillCanTargetTotem ? [...selectableEnemies, ...totemOptions] : selectableEnemies)}
                        targetId={skillTargetId}
                        testId="skill-action-target"
                        onChange={(nextTargetId) => {
                          setSkillTargetId(nextTargetId);
                          setSkillExtraTargetIds((current) =>
                            current.filter((id) => id !== nextTargetId)
                          );
                        }}
                        label="技能目标"
                      />
                      {selectedSkill
                        ? Array.from(
                            { length: getExtraTargetSlotCount(selectedSkill.skill.id) },
                            (_, extraIndex) => (
                              <TargetSelect
                                allowEmpty
                                enemies={skillExtraTargetOptions(extraIndex)}
                                key={extraIndex}
                                targetId={skillExtraTargetIds[extraIndex] ?? ""}
                                testId={`skill-action-extra-target-${extraIndex}`}
                                onChange={(nextTargetId) =>
                                  updateSkillExtraTarget(extraIndex, nextTargetId)
                                }
                                label={`追加目标 ${extraIndex + 1}`}
                              />
                            )
                          )
                        : null}
                    </div>
                  ) : (
                    <div className="self-end rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                      {selectedSkillPlay?.targetMode === "all" ? "作用全体敌人" : "不需要目标"}
                    </div>
                  )}
                </div>
                {selectedSkill?.skill.id === RELEASE_DAMAGE_ID ? storedDamageSelect() : null}
                {selectedSkill ? <SpaceTimeMoveOptions id="main" skillId={selectedSkill.skill.id} options={spaceTimeOptions}
                  onChange={(patch) => setSpaceTimeOptions((current) => ({ ...current, ...patch }))} /> : null}
                {selectedXielingTransform && (
                  <label className="block text-sm font-medium text-gray-700">
                    转为邪元素的邪灵印记层数（可转换 {xielingMarkLimit} 层）
                    <input className="soft-input mt-1 w-full" type="number" min={1} max={xielingMarkLimit}
                      data-testid="xieling-mark-cost" value={xielingMarkCost}
                      onChange={(event) => setXielingMarkCost(Number(event.target.value))} />
                  </label>
                )}
                {selectedSaint && saintElements.length > 0 && (
                  <label className="block text-sm font-medium text-gray-700">
                    倍增资源
                    <select className="soft-input mt-1 w-full" value={selectedSaintElement ?? ""}
                      data-testid="saint-resource-select" onChange={(event) => setSaintElement(event.target.value)}>
                      <option value="">饼</option>
                      {saintElements.map((element) => (
                        <option key={element} value={element}>{element}（现有 {getElementAmount(viewer, element)}）</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-4">
                  <Stat label="消耗" value={resourceCostLabel || formatSkillCakeCost(selectedSkill?.skill.id, skillCost, viewer, skillStacks)} />
                  {selectedSkillPlay?.kind === "resource" ? (
                    <>
                      <Stat
                        label={selectedSaint ? "回合末获得" : "获得"}
                        value={`${getSkillResourceGainPerStack(viewer, selectedSkill?.skill.id ?? "", undefined, state.roundNumber) * skillStacks}${selectedSaintElement ?? "饼"}`}
                      />
                      <Stat label="类型" value="资源" />
                      <Stat label="目标" value="自身" />
                    </>
                  ) : selectedSkillStats ? (
                    <>
                      {!selectedSkillStats.nonAttackMove && <Stat label="攻击" value={formatAttackDamageParts(selectedSkillStats)} />}
                      <Stat label="等级" value={formatCombatValue(attackLevelValue(selectedSkillStats))} />
                      <Stat label="防御" value={DEFENSE_TAG_LABELS[selectedSkillStats.defenseTag]} />
                    </>
                  ) : null}
                </div>
                {selectedSkillTargetError ? (
                  <p className="text-sm text-red-600">{selectedSkillTargetError}</p>
                ) : null}
                <p className="text-sm leading-6 text-gray-600">
                  {selectedSkill?.skill.description}
                </p>
              </>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                你当前没有资源/效果型主动技能。攻击型技能请在“攻击”面板里和基础招式一起选择。
              </div>
            )}
          </div>
          ) : null}

          {mode === "gain_cake" && !moveBlockReason ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 shadow-sm">
            本回合获得 {cakeGain} {gathersYoukai ? "妖元" : "个饼"}。若对方使用超核爆，出饼也能作为“饼防”。
          </div>
          ) : null}

          {!collectingPhaseSkill ? <div
          className={[
            "action-summary-panel",
            actionInvalid ? "action-summary-panel-warning" : ""
          ].join(" ")}
        >
          <div>
            <span>{lockedActionSummary ? "已锁定" : "当前选择"}</span>
            <strong>{actionDisplaySummary}</strong>
          </div>
          <div className="action-summary-meta">
            <span>{readinessLabel}</span>
            {!moveBlockReason ? <>
              <span>{selectedActionCost > 0 || resourceCostLabel
                ? `消耗 ${[selectedActionCost > 0 ? `${selectedActionCost} 饼` : "", resourceCostLabel].filter(Boolean).join(" ＋ ")}` : "无消耗"}</span>
              <span>{previewTargetLabel}</span>
            </> : null}
            {actionRecoveryHint ? <span data-testid="action-recovery-hint">{actionRecoveryHint}</span> : null}
          </div>
          </div> : null}
          {fusionSection}
        </div>

        {!collectingPhaseSkill ? <div
          className="action-command-footer"
          data-testid="action-command-footer"
          data-ready-state={actionReadyState}
        >
          <button
            className="btn-secondary action-repeat-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="repeat-last-action"
            disabled={!canRepeatAction}
            onClick={() => {
              if (lastActionSubmission && canRepeatAction) {
                onSubmit(lastActionSubmission);
              }
            }}
            title={repeatActionError || "照上一手出牌"}
            type="button"
          >
            <FastForward className="h-4 w-4" aria-hidden="true" />
            照上一手
          </button>

          <button
            className="btn-primary action-submit-button w-full justify-center py-3 disabled:cursor-not-allowed disabled:bg-gray-300"
            data-testid="submit-action"
            data-submit-label={submitLabel}
            data-submit-ready={submitReady ? "true" : "false"}
            disabled={!submitReady}
            type="submit"
          >
            {submitting ? (
              <RotateCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {submitLabel}
          </button>
        </div> : null}
      </form>
    </section>
  );

  function addAttackRow() {
    if (selectedFreeMove) return;
    const usedTargets = new Set(attackRows.map((row) => row.targetId));
    const nextTarget = enemies.find((enemy) => !usedTargets.has(enemy.id)) ?? enemies[0];
    if (!nextTarget) {
      return;
    }

    setAttackRows((rows) => [
      ...rows,
      {
        id: `attack_${Date.now()}`,
        kind: "attack",
        attackId: FIRST_ATTACK_ID,
        skillId: "",
        stacks: 1,
        targetId: nextTarget.id
      }
    ]);
  }

  function updateAttackRow(id: string, patch: Partial<AttackRow>) {
    setAttackRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const next = { ...row, ...patch };
        if (next.kind !== "skill" || (!viewer || !getFreeSkillChargeId(viewer, next.skillId))) {
          next.freeStacks = 0;
          return next;
        }

        next.freeStacks = Math.max(
          0,
          Math.min(next.stacks, getFreeLianBaoStacks(next.skillId), next.freeStacks ?? 0)
        );
        return next;
      })
    );
  }

  function updateAttackRowExtraTarget(id: string, extraIndex: number, targetId: string) {
    setAttackRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const extraTargetIds = [...(row.extraTargetIds ?? [])];
        if (targetId) {
          extraTargetIds[extraIndex] = targetId;
        } else {
          extraTargetIds.splice(extraIndex, 1);
        }

        return {
          ...row,
          extraTargetIds: extraTargetIds.filter(Boolean)
        };
      })
    );
  }

  function updateSkillExtraTarget(extraIndex: number, targetId: string) {
    setSkillExtraTargetIds((current) => {
      const next = [...current];
      if (targetId) {
        next[extraIndex] = targetId;
      } else {
        next.splice(extraIndex, 1);
      }
      return next.filter(Boolean);
    });
  }

  function removeAttackRow(id: string) {
    setAttackRows((rows) => rows.filter((row) => row.id !== id));
  }

  function updateRowKind(id: string, value: string) {
    const [kind, rawId] = value.split(":") as ["attack" | "skill", string];
    if (!rawId) {
      return;
    }

    if (kind === "skill") {
      updateAttackRow(id, {
        kind,
        skillId: rawId,
        stacks: 1,
        freeStacks: 0,
        extraTargetIds: []
      });
      return;
    }

    updateAttackRow(id, {
      kind: "attack",
      attackId: rawId as AttackId,
      stacks: 1,
      freeStacks: 0,
      extraTargetIds: []
    });
  }

  function rowValue(row: AttackRow): string {
    return row.kind === "skill" ? `skill:${row.skillId}` : `attack:${row.attackId}`;
  }

  function swordExecuteSource(row: AttackRow): string | undefined {
    return swordExecuteSources.find(({ id }) => id === row.bigCardInstanceId)?.id ?? swordExecuteSources[0]?.id;
  }

  function getFreeLianBaoStacks(id = LIAN_BAO_SKILL_ID): number {
    const charge = viewer && getFreeSkillChargeId(viewer, id);
    return viewer?.buffs.find((buff) => buff.id === charge)?.stacks ?? 0;
  }

  function rowStats(row: AttackRow) {
    if (row.kind === "skill") {
      const baseSkillStats = getSkillAttackStats(row.skillId, row.stacks, viewer);
      const statsForSkill = baseSkillStats && shapeDecayAttack(viewer, baseSkillStats);
      const rawStats = statsForSkill && row.skillId === TIGER_STAB && Number.isSafeInteger(Number(tigerPower))
        ? shapeTigerStab({ type: "skill", skillId: row.skillId, stacks: row.stacks, tigerPower: Number(tigerPower) }, statsForSkill)
        : statsForSkill;
      const raw = rawStats && viewer ? scaleJunengAttack(viewer, rawStats) : rawStats;
      const base = raw && viewer ? shapeDragonBloodAttack(state, viewer.id, { type: "skill", skillId: row.skillId, stacks: row.stacks }, raw) : raw;
      const priorRi = row.skillId === RI_SKILL_ID ? attackRows.slice(0, Math.max(0, attackRows.indexOf(row)))
        .reduce((count, earlier) => count + (earlier.kind === "skill" && earlier.skillId === RI_SKILL_ID ? earlier.stacks : 0), 0) : 0;
      const stats = base && applyHunyaoRiStats(viewer, base, priorRi);
      if (stats && row.skillId === LU_ATTACK_SKILL_ID) {
        const growth = Math.min(
          3,
          Math.max(0, viewer?.buffs.find((buff) => buff.id === "lu_growth")?.stacks ?? 0)
        );
        const bonus = growth * row.stacks;
        return offsetAttackStats(stats, bonus, bonus);
      }
      return stats;
    }

    return getStackedAttackStats(BASE_ATTACKS[row.attackId], row.stacks);
  }

  function rowCost(row: AttackRow): number {
    if (selectedFreeMove) return 0;
    if (row.kind === "skill") {
      if (viewer) return getTurnSkillActionCost(viewer, { type: "skill", skillId: row.skillId, stacks: row.stacks,
        ...(row.freeStacks ? { freeStacks: Math.min(row.freeStacks, getFreeLianBaoStacks(row.skillId)) } : {}) }, state);
      const play = getSkillPlay(row.skillId);
      return (play?.cost ?? 0) * row.stacks;
    }

    return getEffectiveAttackCost(row.attackId, row.stacks);
  }

  function rowIsArea(row: AttackRow): boolean {
    if (row.kind === "skill" && [SAND_DESOLATION_ID, FALLEN_SPLENDOR_EXECUTION, TIME_RIFT, SPACE_BURST].includes(row.skillId)) return false;
    if (hasTianyeWing(viewer, TIAN_YE_FALL_ID, state.turnNumber) &&
      (row.kind !== "skill" || row.skillId !== ELECTRIC_SHOCK_SKILL_ID && !getSkillPlay(row.skillId)?.nonAttackMove)) return true;
    if (viewerHasForcedAreaAttacks()) return true;

    if (row.kind === "skill") {
      return rowStats(row)?.isArea || getSkillPlay(row.skillId)?.targetMode === "all";
    }

    return getStackedAttackStats(BASE_ATTACKS[row.attackId], row.stacks).isArea;
  }

  function viewerHasForcedAreaAttacks(): boolean {
    return Boolean(
      viewerCanUseSkill(state, viewer, LUANWU_SKILL_ID) ||
        viewerCanUseSkill(state, viewer, PUTIAN_TONGQING_SKILL_ID)
    );
  }

  function rowMaxStacks(row: AttackRow): number {
    if (selectedFreeMove?.move.type === "attack" || selectedFreeMove?.move.type === "skill") return selectedFreeMove.move.stacks;
    if (!viewer) return 1;
    if (row.kind === "skill") {
      return Math.max(1, getAffordableSkillStacks(state, viewer, row.skillId, getFreeLianBaoStacks(row.skillId)));
    }
    const cost = getEffectiveAttackCost(row.attackId, 1);
    return cost > 0 ? Math.max(1, Math.min(MAX_ACTION_STACKS, Math.floor(availableCakeBalance(state, viewer) / cost))) : MAX_ACTION_STACKS;
  }

  function getEffectiveAttackCost(attackId: AttackId, stacks: number): number {
    return viewer ? getAttackActionCost(state, viewer, { type: "attack", attackId, stacks }) : BASE_ATTACKS[attackId].cost * stacks;
  }

  function extraTargetOptions(row: AttackRow, extraIndex: number) {
    const excludedTargetIds = new Set([
      row.targetId,
      ...(row.extraTargetIds ?? []).filter((_, index) => index !== extraIndex)
    ]);
    if (row.kind === "skill" && row.skillId === "1078" && totemOptions.some(({ id }) => id === row.targetId)) return [];
    const options = row.kind === "skill" && canAddTotemAsExtraTarget(row.skillId) ? [...selectableEnemies, ...totemOptions] : attackEnemies;
    return options.filter((enemy) => !excludedTargetIds.has(enemy.id));
  }

  function attackRowTargetOptions(row: AttackRow) {
    if (row.kind !== "skill") return [...attackEnemies, ...totemOptions];
    const dedicatedTargets = specialMoveTargets(row.skillId);
    if (dedicatedTargets) return dedicatedTargets;
    const options = canAddTotemAsExtraTarget(row.skillId) ? selectableEnemies : attackEnemies;
    return canSkillSelectTotem(row.skillId) && (row.skillId !== "1078" || !row.extraTargetIds?.length)
      ? [...options, ...totemOptions] : options;
  }

  function specialMoveTargets(id?: SkillId) {
    if (id === BUBBLE_FINALE && viewer) return state.players.filter((target) => target.id !== viewer.id &&
      target.kind !== "spectator" && target.status === "alive" && canAffectAcrossSpace(state, viewer.id, target.id));
    if (id === TIME_RIFT && viewer) return [{ id: viewer.id, name: `${viewer.name}（自己 · 先制重开）` }, ...selectableEnemies];
    if (id === SPACE_BURST && viewer) return state.players.filter((target) => target.id !== viewer.id &&
      target.kind !== "spectator" && target.status === "alive" &&
      (!preventsTargetSelection(target) || canBypassTargetSelection(state, viewer.id, target)));
  }

  function skillExtraTargetOptions(extraIndex: number) {
    const excludedTargetIds = new Set([
      skillTargetId,
      ...skillExtraTargetIds.filter((_, index) => index !== extraIndex)
    ]);
    const options = canAddTotemAsExtraTarget(selectedSkill?.skill.id) ? [...selectableEnemies, ...totemOptions] : selectableEnemies;
    return options.filter((enemy) => !excludedTargetIds.has(enemy.id));
  }
}

function DemonPlacementSelect({ value, onChange }: {
  value: DemonPlacement;
  onChange: (placement: DemonPlacement) => void;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      部署位置
      <select className="soft-input mt-1 w-full" value={value}
        onChange={(event) => onChange(event.currentTarget.value as DemonPlacement)}>
        {DEMON_DEPLOYMENTS.map(([placement, label]) =>
          <option key={placement} value={placement}>{label}</option>)}
      </select>
    </label>
  );
}

function DemonSummonControls({ state, viewer, skillId, submitting, onSubmit }: {
  state: PublicGameState;
  viewer: PublicGameState["players"][number];
  skillId: SkillId;
  submitting: boolean;
  onSubmit: (action: SkillAction) => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [placement, setPlacement] = useState<DemonPlacement>("front");
  const needsTarget = isTargetedDemonSummon(skillId);
  const targets = needsTarget ? demonSummonTargets(state, viewer) : [];
  const target = targets.find(({ id }) => id === targetId) ?? targets[0];
  return (
    <div className="grid gap-2">
      {needsTarget ? <TargetSelect enemies={targets} targetId={target?.id ?? ""} label="召唤目标"
        onChange={setTargetId} allowEmpty={!target} emptyLabel="没有可选目标" /> : null}
      {skillId === DEMON_GUARD_ID ? <DemonPlacementSelect value={placement} onChange={setPlacement} /> : null}
      <button type="button" className="btn-primary w-full justify-center" disabled={submitting || needsTarget && !target}
        onClick={() => onSubmit({ type: "skill", skillId, stacks: 1, ...(target ? { targetId: target.id } : {}),
          ...(skillId === DEMON_GUARD_ID ? { demonPlacement: placement } : {}) })}>召唤</button>
    </div>
  );
}

type SkillActionChoice = { id: string; label: string; action: SkillAction };

function bigCardActions(player: PublicGameState["players"][number], skillId: SkillId,
  available: (card: NonNullable<typeof player.bigCards>[number]) => boolean): SkillActionChoice[] {
  return (player.bigCards ?? []).flatMap((card, index) => available(card) &&
    bigAbilitySource(player, { skillId, bigCardInstanceId: card.instanceId }) ?
    [{ id: card.instanceId, label: `第 ${index + 1} 张`, action: {
      type: "skill", skillId, stacks: 1, bigCardInstanceId: card.instanceId
    } }] : []);
}

function tigerFormActions(player: PublicGameState["players"][number]): SkillActionChoice[] {
  return bigCardActions(player, TIGER_SWITCH, (card) => Boolean(card.tigerForms)).flatMap((choice) => {
    const forms = player.bigCards?.find((card) => card.instanceId === choice.id)?.tigerForms;
    return forms?.available.filter((form) => form !== forms.active).map((form) => ({
      id: `${choice.id}:${form}`, label: `${TIGER_FORM_NAMES[form]}${(player.bigCards?.length ?? 0) > 1 ? ` · ${choice.label}` : ""}`,
      action: { ...choice.action, cardForm: form }
    })) ?? [];
  });
}

function soulRestoreActions(player: PublicGameState["players"][number]): SkillActionChoice[] {
  if (getElementAmount(player, SOUL_ELEMENT) < 10) return [];
  return [[SOUL_RESTORE_EXTINGUISH_ID, SOUL_EXTINGUISH_ID], [SOUL_RESTORE_SINK_ID, SOUL_SINK_ID]].flatMap(([skillId, abilityId]) =>
    getActiveSkillCount(player, skillId!) ? bigCardActions(player, skillId!, (card) =>
      (card.abilityUses?.[abilityId!] ?? 0) > 0 && (!card.onlyAbilityId || card.onlyAbilityId === abilityId) &&
      !card.lostAbilityIds?.includes(abilityId!)) : []);
}

function SkillActionChoices({ choices, label, submitting, onSubmit }: {
  choices: SkillActionChoice[]; label: string; submitting: boolean; onSubmit: (action: SkillAction) => void;
}) {
  const [id, setId] = useState("");
  const selected = choices.find((choice) => choice.id === id) ?? choices[0];
  return <div className="space-y-2">
    <label className="block text-sm font-medium">{label}
      <select className="soft-input mt-1 w-full" value={selected?.id ?? ""} onChange={(event) => setId(event.currentTarget.value)}>
        {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
      </select>
    </label>
    <button type="button" className="btn-primary w-full justify-center" disabled={submitting || !selected}
      onClick={() => { if (selected) onSubmit(selected.action); }}>使用技能</button>
  </div>;
}

function CurtainControls({ state, viewer, submitting, onSubmit }: {
  state: PublicGameState; viewer: PublicGameState["players"][number]; submitting: boolean; onSubmit: (action: SkillAction) => void;
}) {
  const [targetId, setTargetId] = useState("");
  const targets = state.players.filter((player) => player.id !== viewer.id && player.status === "alive" &&
    canAffectAcrossSpace(state, viewer.id, player.id));
  const target = targets.find(({ id }) => id === targetId) ?? targets[0];
  const quote = curtainDiscardQuote(viewer);
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <h3 className="mb-2 text-sm font-semibold">谢幕光绮 · 立即释放</h3>
      <p>{quote.blocked ? "有不可弃置的复活技" : `弃置 ${quote.count} 份复活技（含 ${quote.veils} 份光绮），自身命数归零`}</p>
      <div className="flex flex-wrap gap-2">
        <select className="soft-input" aria-label="谢幕光绮目标" value={target?.id ?? ""} onChange={(event) => setTargetId(event.target.value)}>
          {!target ? <option value="">暂无可选目标</option> : null}
          {targets.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
        <button type="button" className="btn-secondary" disabled={submitting || !target || quote.blocked}
          onClick={() => target && onSubmit({ type: "skill", skillId: CURTAIN_FINALE_ID, stacks: 1, targetId: target.id })}>立即释放</button>
      </div>
    </section>
  );
}

function FallenSplendorControls({ state, viewer, stock, submitting, onSubmit }: {
  state: PublicGameState; viewer: PublicGameState["players"][number];
  stock: NonNullable<ReturnType<typeof fallenSplendorExecutionStock>>; submitting: boolean; onSubmit: (action: SkillAction) => void;
}) {
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const eligible = fallenSplendorTargets(state, viewer);
  const targets = state.players.filter((target) => eligible.includes(target.id) &&
    (!preventsTargetSelection(target) || canBypassTargetSelection(state, viewer.id, target)));
  const first = targets.find(({ id }) => id === firstId) ?? targets[0];
  const others = targets.filter(({ id }) => id !== first?.id);
  const second = others.find(({ id }) => id === secondId) ?? others[0];
  const ids = [first?.id, ...(eligible.length > 1 ? [second?.id] : [])].filter((id): id is string => Boolean(id));
  return <div className="space-y-2">
      <TargetSelect enemies={targets} targetId={first?.id ?? ""} onChange={setFirstId} label="陨落天华第一目标" />
      {eligible.length > 1 ? <TargetSelect enemies={others} targetId={second?.id ?? ""} onChange={setSecondId} label="陨落天华第二目标" /> : null}
      <button type="button" className="btn-secondary" disabled={submitting || !ids.length || ids.length < Math.min(2, eligible.length)}
        onClick={() => onSubmit({ type: "skill", skillId: FALLEN_SPLENDOR_RELEASE, stacks: 1,
          targetIds: ids, ...(stock.sourceBigCardInstanceId ? { bigCardInstanceId: stock.sourceBigCardInstanceId } : {}) })}>立即释放陨落天华</button>
  </div>;
}

type SpaceTimeMoveDraft = Pick<SkillAction, "spaceTimeSource" | "spaceTimeDuration">;

function spaceTimeMoveOptions(skillId: SkillId, draft: SpaceTimeMoveDraft): SpaceTimeMoveDraft {
  if (skillId === SPACE_SHATTER) return { spaceTimeSource: draft.spaceTimeSource ?? "sky" };
  const maxRounds = spaceTimeMaxRounds(skillId);
  if (!maxRounds) return {};
  return { spaceTimeDuration: { turns: draft.spaceTimeDuration?.turns ?? 1,
    rounds: Math.min(maxRounds, draft.spaceTimeDuration?.rounds ?? maxRounds) } };
}

function SpaceTimeMoveOptions({ id, skillId, options, onChange }: {
  id: string; skillId: SkillId; options: SpaceTimeMoveDraft; onChange: (patch: SpaceTimeMoveDraft) => void;
}) {
  const chosen = spaceTimeMoveOptions(skillId, options);
  if (chosen.spaceTimeSource) return <label className="block text-sm">退游来源
    <select className="soft-input mt-1 w-full" value={chosen.spaceTimeSource}
      onChange={(event) => onChange({ spaceTimeSource: event.currentTarget.value as NonNullable<SkillAction["spaceTimeSource"]> })}>
      <option value="left">目标左邻</option>
      <option value="right">目标右邻</option>
      <option value="sky">天</option>
    </select>
  </label>;
  const cap = spaceTimeMaxRounds(skillId);
  const duration = chosen.spaceTimeDuration;
  if (!cap || !duration) return null;
  return <div className="grid gap-2 sm:grid-cols-2">
    <label className="block text-sm">回合上限
      <input className="soft-input mt-1 w-full" type="number" min={1} max={Number.MAX_SAFE_INTEGER}
        list={`space-time-turns-${id}`} value={duration.turns} onChange={(event) => onChange({
          spaceTimeDuration: { ...duration, turns: Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.trunc(event.currentTarget.valueAsNumber || 1))) }
        })} />
      <datalist id={`space-time-turns-${id}`}>
        {[1, 2, 3, 5, 10, 100, 1000].map((turns) => <option key={turns} value={turns} />)}
      </datalist>
    </label>
    <label className="block text-sm">轮上限
      <select className="soft-input mt-1 w-full" value={duration.rounds} onChange={(event) => onChange({
        spaceTimeDuration: { ...duration, rounds: Number(event.currentTarget.value) }
      })}>
        {Array.from({ length: cap }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} 轮</option>)}
      </select>
    </label>
  </div>;
}

function CharityControls({ state, viewer, quickCard, submitting, onSubmit }: {
  state: PublicGameState; viewer: PublicGameState["players"][number];
  quickCard?: NonNullable<ReturnType<typeof quickHealingCard>>; submitting: boolean; onSubmit: (action: SkillAction) => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [youkaiPayment, setYoukaiPayment] = useState<number>();
  const targets = quickCard ? getQuickHealingTargets(state, viewer.id) : [];
  const target = targets.find(({ id }) => id === targetId) ?? targets[0];
  const price = getTurnSkillActionCost(viewer, { type: "skill", skillId: CHARITY_QUICK_ID, stacks: 1 }, state);
  const maxYoukai = Math.min(price, youkaiCakeCount(viewer));
  const youkai = Math.min(maxYoukai, Math.max(0, youkaiPayment ?? price - viewer.cakes));
  const canPay = viewer.cakes >= price - youkai;
  if (!quickCard) return <SkillActionChoices label="治愈方式" submitting={submitting} onSubmit={onSubmit}
    choices={[
      { id: "heal", label: "普通治愈", action: { type: "skill", skillId: HEALING_ART_ID, stacks: 1 } },
      { id: "restore", label: "天命 · 恢复至初始", action: { type: "skill", skillId: HEALING_ART_ID, stacks: 1, charityRestoreInitial: true } }
    ]} />;
  return <div className="space-y-2">
          {maxYoukai > 0 ? <YoukaiCakePayment label="速愈" max={maxYoukai} amount={youkai} onChange={setYoukaiPayment} /> : null}
          <select className="soft-input" aria-label="速愈目标" value={target?.id ?? ""} onChange={(event) => setTargetId(event.target.value)}>
            {!target ? <option value="">暂无可速愈目标</option> : null}
            {targets.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </select>
          <button type="button" className="btn-secondary" disabled={submitting || !target || !canPay} onClick={() => {
            if (target) onSubmit({ type: "skill", skillId: CHARITY_QUICK_ID, stacks: 1, targetId: target.id, bigCardInstanceId: quickCard.instanceId,
              ...(youkai ? { youkaiCakeSpent: youkai } : {}) });
          }}>速愈</button>
  </div>;
}

function RewindControls({ state, player, submitting, onSubmit }: {
  state: PublicGameState; player: PublicGameState["players"][number];
  submitting: boolean; onSubmit: (action: SkillAction) => void;
}) {
  const [targetCount, setTargetCount] = useState<1 | 2>(2);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const targets = state.players.filter((candidate) => candidate.status === "alive" && candidate.hp >= 0 &&
    candidate.defeatLevel === undefined && canAffectAcrossSpace(state, player.id, candidate.id));
  const count = state.roundNumber >= 3 ? targetCount : 2;
  const selected = [first, ...(count === 2 ? [second] : [])];
  const ready = new Set(selected).size === count && selected.every((id) => targets.some((target) => target.id === id));
  return <div className="space-y-2">
    <label className="block text-sm font-medium">时溯范围
      <select className="soft-input mt-1 w-full" value={count} onChange={(event) => setTargetCount(event.target.value === "1" ? 1 : 2)}>
        {state.roundNumber >= 3 ? <option value={1}>1 人回到 2 轮前</option> : null}
        <option value={2}>2 人回到 1 轮前</option>
      </select>
    </label>
    <TargetSelect enemies={targets} label="时溯目标一" allowEmpty emptyLabel="选择目标" targetId={first} onChange={setFirst} />
    {count === 2 ? <TargetSelect enemies={targets.filter((target) => target.id !== first)} label="时溯目标二"
      allowEmpty emptyLabel="选择第二人" targetId={second} onChange={setSecond} /> : null}
    <button className="btn-primary w-full justify-center" type="button" disabled={submitting || !ready}
      onClick={() => onSubmit({ type: "skill", skillId: TIME_REWIND_ID, stacks: 1, targetIds: selected, targetId: selected[0]! })}>
      使用技能
    </button>
  </div>;
}

function LingtaControls({ player, skillId, submitting, onSubmit }: {
  player: PublicGameState["players"][number]; skillId: SkillId; submitting: boolean; onSubmit: (action: SkillAction) => void;
}) {
  const ling = getElementAmount(player, LING_ELEMENT);
  const seas = cloudSeaCount(player);
  const bypass = player.buffs.some((buff) => buff.id === CLOUD_BYPASS_STATE);
  const unavailable = skillId === SKY_ABSOLUTE_ID && (ling < 10 || seas < 4) ||
    skillId === LINGTA_VICTORY_ID && (ling < 36 || seas < 9);
  return <button className="btn-primary w-full justify-center" type="button" disabled={submitting || unavailable}
    onClick={() => onSubmit({ type: "skill", skillId, stacks: 1 })}>
    {skillId === CLOUD_BYPASS_ID ? bypass ? "恢复云海限制" : "自身出招绕过云海" : "使用技能"}
  </button>;
}

function rowTargetIds(row: AttackRow): string[] {
  if (row.kind === "skill" && isMultiTargetAttackSkill(row.skillId)) {
    return Array.from(
      new Set(
        [row.targetId, ...(row.extraTargetIds ?? [])].filter(
          (id): id is string => Boolean(id)
        )
      )
    );
  }

  return row.targetId ? [row.targetId] : [];
}

interface RepeatActionValidationInput {
  canAct: boolean;
  lastActionSubmission?: ActionSubmission | null | undefined;
  state: PublicGameState;
  viewerId?: string | undefined;
}

function getRepeatActionError({
  canAct,
  lastActionSubmission,
  state,
  viewerId
}: RepeatActionValidationInput): string | undefined {
  if (!lastActionSubmission) {
    return "暂无上回合行动";
  }
  if (!canAct) {
    return "当前不能提交行动";
  }

  const viewer = state.players.find((player) => player.id === viewerId);
  if (!viewer) {
    return "未找到当前玩家";
  }

  const actions = actionSubmissionToActions(lastActionSubmission);
  if (actions.length === 0) {
    return "上回合行动为空";
  }
  if (actions.some((action) => action.type === "skill" && action.skillId === KARMA_CYCLE_ID && action.karmaCardChanges?.length)) {
    return "请重新选择要改变的大卡";
  }
  if (
    state.config.firstTurnNoAttack &&
    state.roundTurnNumber === 1 &&
    actions.some((action) => isAttackLikeAction(action))
  ) {
    return "第一回合不能沿用攻击行动";
  }

  const targetIds = new Set([
    ...state.players.filter((player) => player.status === "alive").map((player) => player.id),
    ...targetableTotems(state, viewer).map(({ id }) => id)
  ]);
  const missingTarget = actions
    .flatMap(repeatActionTargetIds)
    .find((targetId) => !targetIds.has(targetId));
  if (missingTarget) {
    return "上回合目标已不可用";
  }

  const missingSkill = actions.find(
    (action) => action.type === "skill" && getActiveSkillCount(viewer, action.skillId) <= 0
  );
  if (missingSkill) {
    return "上回合技能已不可用";
  }

  for (const action of actions) if (action.type === "skill" && action.freeStacks) {
    const charge = getFreeSkillChargeId(viewer, action.skillId);
    if (!charge || action.freeStacks > (viewer.buffs.find((buff) => buff.id === charge)?.stacks ?? 0)) return "上回合使用的免费次数已不足";
  }
  const cost = actions.reduce((sum, action) => sum + repeatActionCost(action, state, viewer), 0);
  if (cost > viewer.cakes) {
    return `饼不足，需要 ${cost} 饼`;
  }

  return undefined;
}

function actionSubmissionToActions(submission: ActionSubmission): PlayerAction[] {
  return "actions" in submission ? submission.actions : [submission];
}

function repeatActionTargetIds(action: PlayerAction): string[] {
  const targetId = "targetId" in action ? action.targetId : undefined;
  const targetIds = "targetIds" in action ? action.targetIds ?? [] : [];
  return Array.from(
    new Set(
      [targetId, ...targetIds].filter(
        (targetId): targetId is string => Boolean(targetId)
      )
    )
  );
}

function repeatActionCost(action: PlayerAction, state: PublicGameState, viewer: PublicGameState["players"][number]): number {
  if (action.type === "attack") {
    return getAttackActionCost(state, viewer, action);
  }
  if (action.type === "skill") {
    return getTurnSkillActionCost(viewer, action, state);
  }
  if (action.type === "defense" && action.defense === "rebound") {
    return 1;
  }
  return 0;
}

function isMultiTargetAttackSkill(skillId: SkillId): boolean {
  return isHurricane(skillId) || MULTI_TARGET_ATTACK_SKILL_IDS.has(skillId);
}

function getMultiTargetLimit(skillId: SkillId): number {
  if (isHurricane(skillId) || skillId === "1117" || skillId === "1118" || skillId === getFusionSkillId("冰火双漩")) {
    return 3;
  }

  if (skillId === "1035" || skillId === "1078" || skillId === UTOPIA_MOVE_ID || skillId === FALLEN_SPLENDOR_EXECUTION) {
    return 2;
  }

  return 1;
}

function getExtraTargetSlotCount(skillId: SkillId): number {
  return Math.max(0, getMultiTargetLimit(skillId) - 1);
}

function EraTargetControls({ state, disabled, onSubmit }: {
  state: PublicGameState;
  disabled: boolean;
  onSubmit: (action: SkillAction) => void;
}) {
  const [moveKey, setMoveKey] = useState("");
  const [draft, setDraft] = useState<{ moveKey: string; previous: string; targetIds: string[] }>();
  const choices = state.eraTargetChoices ?? [];
  const keyFor = (choice: (typeof choices)[number]) => `${choice.sourceId}:${choice.moveIndex}`;
  const choice = choices.find((item) => keyFor(item) === moveKey) ?? choices[0];
  if (!choice) return null;
  const key = keyFor(choice);
  const previous = choice.selectedIds.join(",");
  const selected = draft?.moveKey === key && draft.previous === previous ? draft.targetIds : choice.selectedIds;
  return <div className="space-y-2">
    <label className="block text-sm font-medium">神控纪元 · 选择招式
      <select className="soft-input mt-1 w-full" value={key} disabled={disabled} onChange={(event) => {
        setMoveKey(event.currentTarget.value);
        setDraft(undefined);
      }}>
        {choices.map((item) => <option key={keyFor(item)} value={keyFor(item)}>{item.label}</option>)}
      </select>
    </label>
    <details className="rounded-lg border border-line px-3 py-2">
      <summary className="cursor-pointer text-sm">选择目标（{selected.length}）</summary>
      <div className="mt-2 max-h-44 space-y-1 overflow-auto">
        {choice.targets.map(({ id, name }) => <label className="flex items-center gap-2 text-sm" key={id}>
          <input type="checkbox" checked={selected.includes(id)} disabled={disabled}
            onChange={(event) => setDraft({ moveKey: key, previous, targetIds: event.currentTarget.checked
              ? [...selected, id] : selected.filter((targetId) => targetId !== id) })} />
          {name}
        </label>)}
      </div>
    </details>
    <button className="btn-secondary w-full" type="button" disabled={disabled} onClick={() => {
      onSubmit({ type: "skill", skillId: ERA_CHOOSE_TARGETS, stacks: 1, eraMoveSourceId: choice.sourceId,
        eraMoveIndex: choice.moveIndex, targetIds: selected });
      setDraft(undefined);
    }}>{selected.length ? "确认目标" : "清空目标"}</button>
  </div>;
}

function canAddTotemAsExtraTarget(skillId: SkillId | undefined): boolean {
  return skillId === "1035" || skillId === UTOPIA_MOVE_ID;
}

function multiTargetSkillTargetError(
  state: PublicGameState,
  row: AttackRow
): string | undefined {
  if (row.kind !== "skill" || !isMultiTargetAttackSkill(row.skillId)) {
    return undefined;
  }
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  if (hasTianyeWing(viewer, TIAN_YE_FALL_ID, state.turnNumber) && row.skillId !== ELECTRIC_SHOCK_SKILL_ID &&
    !getSkillPlay(row.skillId)?.nonAttackMove) return undefined;

  return multiTargetSkillTargetErrorForIds(state, row.skillId, rowTargetIds(row));
}

function multiTargetSkillTargetErrorForIds(
  state: PublicGameState,
  skillId: SkillId,
  targetIds: string[]
): string | undefined {
  if (skillId === FALLEN_SPLENDOR_EXECUTION) {
    const viewer = state.players.find(({ id }) => id === state.viewerPlayerId);
    if (!viewer) return "无法确认出招者。";
    const eligible = fallenSplendorTargets(state, viewer);
    const count = Math.min(2, eligible.length);
    return count > 0 && targetIds.length === count && new Set(targetIds).size === count &&
      targetIds.every((id) => eligible.includes(id)) ? undefined : `请选择 ${count} 名其他存活玩家。`;
  }
  if (isHurricane(skillId)) {
    const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
    return viewer && validHurricaneTargets(state, viewer, targetIds) ? undefined : "飓风须选择座位连续的 1 至 3 名其他存活玩家。";
  }
  if (!isMultiTargetAttackSkill(skillId)) {
    return undefined;
  }

  const limit = getMultiTargetLimit(skillId);
  if (targetIds.length < 1 || targetIds.length > limit) {
    return limit === 3
      ? "冰漩决和火漩决需要选择连续的 1 到 3 名目标。"
      : "这个技能需要选择 1 到 2 名目标。";
  }

  const alive = state.players.filter((player) => player.status === "alive");
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const totemIds = canAddTotemAsExtraTarget(skillId) || skillId === "1078" && targetIds.length === 1
    ? targetableTotems(state, viewer).map(({ id }) => id) : [];
  if (targetIds.some((targetId) => !alive.some(({ id }) => id === targetId) && !totemIds.includes(targetId))) {
    return "目标不存在或已死亡。";
  }

  if (
    CONTIGUOUS_MULTI_TARGET_SKILL_IDS.has(skillId) &&
    !areCombatTargetsContiguous(alive, targetIds)
  ) {
    return skillId === "1078"
      ? "火箭的目标必须是座次连续的玩家。"
      : "冰漩决和火漩决的目标必须是座次连续的玩家。";
  }

  return undefined;
}

interface ModeButtonProps {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
}

function summarizeActionSelection({
  attackRows,
  cakeGain,
  gathersYoukai,
  defense,
  mode,
  selectedSkillName,
  skillStacks,
  skillTargetNames,
  state
}: {
  attackRows: AttackRow[];
  cakeGain: number;
  gathersYoukai: boolean;
  defense: DefenseKind;
  mode: Mode;
  selectedSkillName: string | undefined;
  skillCost: number;
  skillStacks: number;
  skillTargetNames: string[];
  state: PublicGameState;
  totalAttackCost: number;
}): string {
  if (mode === "gain_cake") {
    return gathersYoukai ? `本回合积累 ${cakeGain} 妖元` : `吃饼：本回合获得 ${cakeGain} 饼`;
  }

  if (mode === "defense") {
    return `防御：${DEFENSE_LABELS[defense]}`;
  }

  if (mode === "skill") {
    if (!selectedSkillName) {
      return "技能：请选择可用技能";
    }

    const target = skillTargetNames.length > 0
      ? ` -> ${formatTargetNames(skillTargetNames)}`
      : "";
    const stacks = skillStacks > 1 ? ` x${skillStacks}` : "";
    return `技能：${selectedSkillName}${stacks}${target}`;
  }

  if (attackRows.length === 0) {
    return "攻击：请选择攻击招式";
  }

  return attackRows
    .map((row) => {
      const name =
        row.kind === "skill"
          ? getSkill(row.skillId)?.name ?? "技能攻击"
          : BASE_ATTACKS[row.attackId]?.name ?? "攻击";
      const stacks = row.stacks > 1 ? ` x${row.stacks}` : "";
      const target = isAttackRowArea(row)
        ? "全体"
        : formatTargetNames(
            rowTargetIds(row).map((targetId) => getPlayerName(state, targetId)).filter(Boolean),
            "未选目标"
          );
      return `${name}${stacks} -> ${target}`;
    })
    .join(" / ");
}

function summarizeSubmittedAction(submission: ActionSubmission, state: PublicGameState): string {
  return actionSubmissionToActions(submission)
    .map((action) => {
      if (action.type === "gain_cake") {
        return "吃饼 +1";
      }

      if (action.type === "defense") {
        const targetNames = repeatActionTargetIds(action)
          .map((targetId) => getPlayerName(state, targetId))
          .filter(Boolean);
        const target = targetNames.length > 0 ? ` -> ${formatTargetNames(targetNames)}` : "";
        return `防御：${DEFENSE_LABELS[action.defense]}${target}`;
      }

      if (action.type === "attack") {
        const attack = BASE_ATTACKS[action.attackId];
        const stacks = action.stacks > 1 ? ` x${action.stacks}` : "";
        const target = attack.isArea
          ? "全体"
          : formatTargetNames(
              repeatActionTargetIds(action).map((targetId) => getPlayerName(state, targetId)).filter(Boolean),
              "未选目标"
            );
        return `${attack.name}${stacks} -> ${target}`;
      }

      if (action.type === "skill") {
        const skill = getSkill(action.skillId);
        const play = getSkillPlay(action.skillId);
        const stacks = action.stacks > 1 ? ` x${action.stacks}` : "";
        const targetNames = repeatActionTargetIds(action)
          .map((targetId) => getPlayerName(state, targetId))
          .filter(Boolean);
        const target = play?.targetMode === "all"
          ? " -> 全体"
          : targetNames.length > 0
            ? ` -> ${formatTargetNames(targetNames)}`
            : "";
        return `${skill?.name ?? "技能"}${stacks}${target}`;
      }

      return "丢弃技能";
    })
    .join(" / ");
}

function formatTargetNames(names: string[], fallback = "未选目标"): string {
  return names.length > 0 ? names.join(" + ") : fallback;
}

function submitNameForAttackRows(attackRows: AttackRow[]): string {
  const skillNames = attackRows
    .filter((row) => row.kind === "skill")
    .map((row) => getSkill(row.skillId)?.name ?? "技能攻击");

  if (skillNames.length === 0) {
    return "攻击";
  }

  if (skillNames.length === 1 && attackRows.length === 1) {
    return skillNames[0] ?? "技能攻击";
  }

  return "技能连招";
}

function isAttackRowArea(row: AttackRow): boolean {
  if (row.kind === "skill") {
    return getSkillPlay(row.skillId)?.targetMode === "all";
  }

  return Boolean(BASE_ATTACKS[row.attackId]?.isArea);
}

function getPlayerName(state: PublicGameState, playerId: string): string {
  const player = state.players.find(({ id }) => id === playerId);
  const totem = state.totems?.find(({ id }) => id === playerId);
  return player?.name ?? (totem ? TOTEM_KINDS[totem.kind].name : "");
}

function ModeButton({ active, disabled, icon, label, onClick, testId }: ModeButtonProps) {
  return (
    <button
      className={[
        "mode-button",
        active ? "mode-button-active" : "",
        disabled ? "cursor-not-allowed opacity-45" : ""
      ].join(" ")}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

interface TargetSelectProps {
  allowEmpty?: boolean;
  emptyLabel?: string;
  enemies: Array<{ id: string; name: string }>;
  targetId: string;
  label: string;
  onChange: (targetId: string) => void;
  testId?: string;
}

function TianyeWingControls({ state, viewer, enabled, onSubmit }: { state: PublicGameState;
  viewer?: PublicGameState["players"][number] | undefined; enabled: boolean; onSubmit: (action: SkillAction) => void }) {
  const [wing, setWing] = useState<TianyeWingChoice>(TIAN_YE_SOARING_ID);
  const [cardId] = tianyeChoiceOptions(viewer, state.turnNumber);
  if (!cardId || state.activeTimingPhase !== "turn_before_action" || state.pointGame || state.retirementCounter || state.victoryCounter) return null;
  return <div className="flex items-end gap-2">
    <label className="flex-1 text-sm font-medium">
      天野之翼
      <select className="soft-input mt-1 w-full" disabled={!enabled} value={wing}
        onChange={(event) => setWing(event.currentTarget.value as TianyeWingChoice)}>
        {TIAN_YE_WINGS.filter((id) => id !== TIAN_YE_CHOICE_ID).map((id) =>
          <option key={id} value={id}>{TIAN_YE_WING_DETAILS[id].name}</option>)}
      </select>
    </label>
    <button type="button" className="btn-secondary" disabled={!enabled}
      onClick={() => onSubmit({ type: "skill", skillId: TIAN_YE_CHOICE_ID, stacks: 1, bigCardInstanceId: cardId, tianyeWingChoice: wing })}>
      转换
    </button>
  </div>;
}

function StarWheelControls({ state, viewer, skillId, enabled, onSubmit }: { state: PublicGameState;
  viewer: PublicGameState["players"][number]; skillId: SkillId; enabled: boolean; onSubmit: (action: SkillAction) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const moves = starWheelChoices(state, viewer);
  const visibleIds = selected.filter((id) => moves.some((move) => move.id === id));
  const playerName = (id: string) => state.players.find((player) => player.id === id)?.name ?? "已离场";
  if (skillId === STAR_WHEEL_POSITION) {
    const original = !viewer.starWheelOriginalPosition;
    return <button type="button" className="btn-primary w-full justify-center" disabled={!enabled}
      onClick={() => onSubmit({ type: "skill", skillId, stacks: 1, starWheelUseOriginal: original })}>
      {original ? "视为在开局原位" : "按当前座次判定"}
    </button>;
  }
  return <div data-testid="star-wheel-controls">
    <div className="grid gap-2 py-2">
      {moves.map((move) => <label key={move.id} className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={visibleIds.includes(move.id)}
          onChange={(event) => setSelected(event.currentTarget.checked ? [...visibleIds, move.id] : visibleIds.filter((id) => id !== move.id))} />
        <span>{move.label} {move.deliveries.map(({ sourceId, targetId }) => `${playerName(sourceId)} → ${playerName(targetId)}`).join("、")}</span>
      </label>)}
      <button type="button" className="btn-secondary" disabled={!enabled || !visibleIds.length}
        onClick={() => onSubmit({ type: "skill", skillId: STAR_WHEEL_RELEASE, stacks: 1, starWheelMoveIds: visibleIds })}>
        释放选中的招式
      </button>
    </div>
  </div>;
}

function TargetSelect({
  allowEmpty = false,
  emptyLabel = "不追加",
  enemies,
  targetId,
  label,
  onChange,
  testId
}: TargetSelectProps) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <select
        className="soft-input mt-1 w-full"
        data-testid={testId}
        value={targetId}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {enemies.map((enemy) => (
          <option key={enemy.id} value={enemy.id}>
            {enemy.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-chip">
      <span className="block text-xs text-gray-400">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function getSkillUseCount(
  player: PublicGameState["players"][number],
  skillId: SkillId
): number {
  return player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
}

function getSkillResourceStacks(
  player: PublicGameState["players"][number],
  skillId: SkillId
): number | undefined {
  const marks = getAttackMarkCount(player, skillId);
  if (marks !== undefined) return marks;
  if (skillId === "1036") {
    return player.buffs.find((buff) => buff.id === "guidao_charge")?.stacks ?? 0;
  }

  if (skillId === "1020") {
    return player.buffs.find((buff) => buff.id === "lava_mark")?.stacks ?? 0;
  }

  if (skillId === "1021") {
    return player.buffs.find((buff) => buff.id === "winter_mark")?.stacks ?? 0;
  }

  return undefined;
}

function viewerCanUseSkill(
  state: PublicGameState,
  player: PublicGameState["players"][number] | undefined,
  skillId: SkillId
): boolean {
  return Boolean(
    player && getActiveSkillCount(player, skillId) > 0 && !swordArrayPiBlocksSkill(state, player, skillId) &&
      (skillId !== FALLEN_SPLENDOR_EXECUTION || Boolean(fallenSplendorExecutionStock(player))) &&
      (skillId !== ORIGIN_SHOT_FUSION || player.buffs.some((buff) => buff.id === ORIGIN_SHOT_STOCK && buff.stacks > 0)) &&
      (skillId !== SEA_GOD_RETURN_ID || isSeaGodReturnReady(player, state.roundNumber)) &&
      (!isBrokenBladeMaintenance(skillId) || canMaintainBrokenBlade(player, skillId)) &&
      (skillId !== DIVINE_FLAME_ID || !player.buffs.some((buff) =>
        buff.id === DIVINE_FLAME_ENABLED && buff.startsAtRound === state.roundNumber)) &&
      (skillId !== VETERAN_SHATTER_ID || player.buffs.some((buff) => buff.id === VETERAN_SHATTER_USES && buff.stacks > 0)) &&
      (skillId !== CURTAIN_ENCORE_ID || player.bigCards?.some((card) =>
        bigAbilitySource(player, { skillId, bigCardInstanceId: card.instanceId }) && curtainEncoreReady(player, card.instanceId))) &&
      (skillId !== CURTAIN_FINALE_ID || !curtainDiscardQuote(player).blocked) &&
      (skillId !== XIELING_ULTIMATE_ID && skillId !== GOD_KING_JUDGMENT_ID || Boolean(bigAbilitySource(player, { skillId }, true))) &&
      (skillId !== STAR_RAGE_ID || canSpendStarRageMarks(player)) &&
      (skillId !== "1023" || player.hp === 0) &&
      (skillId !== "1044" ||
        getDestroyPowerCooldownCount(player, state.roundNumber) <
          getActiveSkillCount(player, skillId)) &&
      (skillId !== FLASH_DODGE_SKILL_ID || getFlashFamilySlots(player, state.roundNumber).some((slot) => slot.kind === "flash" && slot.ready <= state.roundNumber)) &&
      (![VACUUM_ENTER_ID, VACUUM_EXTRACT_ID].includes(skillId) || Boolean(vacuumMode(state, player))) &&
      (skillId !== VACUUM_MAX_ID || vacuumMode(state, player) === "absolute") &&
      (skillId !== getFusionSkillId("辉月") || (getHuiyueCooldownCount(player, state.roundNumber) < getActiveFusionCount(player, "辉月") &&
        !player.buffs.some((buff) => buff.id === "huiyue_stasis" && (buff.expiresAtTurn ?? -1) > state.turnNumber))) &&
      !isSkillBlockedByJingu(state, skillId, player.spaceId, player)
  );
}

function AntiCakePayment({ label, cost, balance, anti, onChange }: {
  label: string; cost: number; balance: number; anti: number; onChange: (amount: number) => void;
}) {
  return <label className="block text-sm">
    {label} · {cost - anti} 饼 ＋ {anti} 反饼
    <input className="soft-input ml-2 w-20" aria-label={`${label}反饼数量`} type="number" min={0} max={Math.min(Math.floor(cost), balance)}
      step={1} value={anti} onChange={(event) => onChange(Math.max(0, Math.floor(Number(event.currentTarget.value) || 0)))} />
    {anti > 0 && anti < cost ? <span className="ml-2">混付会清空两种资源、退回该招并自退游</span> : null}
  </label>;
}

function YoukaiCakePayment({ label, max, amount, onChange }: {
  label: string; max: number; amount: number; onChange: (amount: number) => void;
}) {
  return <label className="block text-sm">
    {label}用妖元代付
    <input className="soft-input ml-2 w-20" aria-label={`${label}代付妖元数量`} type="number" min={0} max={max}
      step="any" value={amount} onChange={(event) => onChange(Number(event.currentTarget.value) || 0)} />
  </label>;
}

function isPendingDeathPlayer(player: PublicGameState["players"][number]): boolean {
  return (
    player.status === "alive" &&
    player.buffs.some((buff) => buff.id === "pending_death")
  );
}

function buildActionSwitchOptions(
  state: PublicGameState,
  playerId: string,
  skillId: SkillId
): ActionSwitchOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  const payer = state.players.find((player) => player.id === playerId);
  const attackTargets = state.players.filter((target) => target.id !== playerId && target.status === "alive" &&
    canAffectAcrossSpace(state, playerId, target.id) && !preventsTargetSelection(target));
  return plan.actions.flatMap((current, actionIndex) =>
    getActionSwitchChoicesForAction(skillId, current, payer, attackTargets.map(({ id }) => id), (cost) =>
      !payer || discountCakeCost(state, payer, cost) <= payer.cakes + (canUseAntiCakes(state, payer) ? antiCakeCount(payer) : 0)).flatMap<ActionSwitchOption>((choice) => {
      if (choice.action.type === "defense" && choice.action.defense === "rebound") {
        if (hasTianyeReboundLock(payer, state.turnNumber)) return [];
        return state.players.filter((target) => target.status === "alive" && target.id !== playerId &&
          canAffectAcrossSpace(state, playerId, target.id) &&
          (!preventsTargetSelection(target) || canBypassTargetSelection(state, playerId, target))).map((target) => {
          const action = { type: "defense", defense: "rebound", targetId: target.id } as const;
          return { key: `${actionIndex}:${switchActionKey(action)}`, actionIndex, current, action,
            cost: 0, label: `${getActionLabel(current)} → 反弹给 ${target.name}（消耗神罩、鬼罩各1次）` };
        });
      }
      const cost = payer ? discountCakeCost(state, payer, choice.cost) : choice.cost;
      return [{
        key: `${actionIndex}:${switchActionKey(choice.action)}`,
        actionIndex,
        current,
        action: choice.action,
        cost,
        label: `${getActionLabel(current)} -> ${getActionLabel(choice.action)}${choice.action.type === "attack" && choice.action.targetId ?
          " → " + (attackTargets.find(({ id }) => id === (choice.action.type === "attack" ? choice.action.targetId : undefined))?.name ?? "") : ""}
          / ${formatSkillCakeCost(skillId, cost, payer)}`
      }];
    })
  );
}

function buildAttackStatModifierOptions(
  state: PublicGameState,
  playerId: string,
  skillId: SkillId
): AttackStatModifierOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  const player = state.players.find((entry) => entry.id === playerId);
  const modifiers =
    skillId === "1090"
      ? undefined
      : skillId === "1044"
        ? getDestructionModifiers(player)
        : [];

  return plan.actions.flatMap((current, actionIndex) => {
    if (!isAttackLikeAction(current)) {
      return [];
    }

    return (modifiers ?? getLevelSwapModifiers(player, current)).map((modifier) => {
      const preview = previewPlayerAttackStats(state, playerId, { id: "candidate", actionIndex, modifier,
        enhanced: skillId === "1090" && hasEnhancedLevelSwap(player) });
      const failure = preview.failures.find((item) => item.id === "candidate");
      const stats = preview.stats[actionIndex];
      const difference = preview.costs.reduce((sum, cost) => sum + cost, 0) - preview.originalCosts.reduce((sum, cost) => sum + cost, 0);
      const number = formatAttackStatNumber;
      const summary = stats ? ` / ${actionHasCakeCost(current, player) ? `耗${number(stats.cost, stats.costValue)}` : "无耗饼"} 攻${formatAttackDamageParts(stats)} 等${number(stats.level, stats.levelValue)}` : "";
      const settlement = difference > 0 ? ` / 结束补扣${difference}饼` : difference < 0 ? ` / 结束退还${-difference}饼` : "";
      return {
      key: `${actionIndex}:${modifier}`,
      actionIndex,
      current,
      modifier,
      ...(failure ? { error: failure.error } : {}),
      label: `${getActionLabel(current)} -> ${sharedAttackStatModifierLabel(modifier)}${failure ? ` / ${failure.error}` : summary + settlement}`
    }; });
  });
}

function buildDoubleEdgeOptions(
  state: PublicGameState,
  playerId: string
): DoubleEdgeOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  return plan.actions.flatMap((current, actionIndex) => {
    if (!isAttackLikeAction(current)) {
      return [];
    }

    const targetId = "targetId" in current ? current.targetId : undefined;
    if (!targetId) {
      return [];
    }

    const targetPlan = state.revealedActions?.[targetId];
    const targetAction = targetPlan?.actions.find(
      (action) => action.type === "defense" || action.type === "gain_cake"
    );
    if (targetAction?.type !== "defense" || targetAction.defense === "rebound") {
      return [];
    }

    const stats = getActionAttackStats(current);
    if (!stats || !canActionDefend(targetAction, stats.defenseTag)) {
      return [];
    }

    const targetName =
      state.players.find((player) => player.id === targetId)?.name ?? "目标";
    return [
      {
        key: `${actionIndex}:${targetId}`,
        actionIndex,
        current,
        targetId,
        label: `${getActionLabel(current)} -> ${targetName} / 无视 ${getActionLabel(targetAction)}`
      }
    ];
  });
}

function getActionAttackStats(action: PlayerAction) {
  return action.type === "attack"
    ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks)
    : action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack"
      ? getSkillAttackStats(action.skillId, action.stacks)
      : undefined;
}

function buildDoubleEdgeOptionsV2(
  state: PublicGameState,
  playerId: string
): DoubleEdgeOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  const owner = state.players.find((player) => player.id === playerId)!;
  const heavenSwordSuppressed = hasLingtaField(state, owner.id);
  const blade = heavenSwordSuppressed ? undefined : getBrokenBladeDoubleEdge(owner);
  const defaultBlade = selectBrokenBladeDoubleEdge(owner, "ignore_defense");
  const trueBlade = blade && getBrokenBlade(blade).tier === 4 && !heavenSwordSuppressed;
  const defendedOptions = new Set<string>();
  const options: DoubleEdgeOption[] = plan.actions.flatMap((current, actionIndex) => {
    if (!isAttackLikeAction(current)) {
      return [];
    }

    const stats = getActionAttackStats(current);
    if (!stats) {
      return [];
    }

    return getDoubleEdgeTargetIdsForAction(state, playerId, current, stats).flatMap(
      (targetId) => {
        const targetAction = getDefensiveActionForDoubleEdgeOption(
          state,
          playerId,
          targetId
        );
        const defended = targetAction && targetAction.type !== "attack" && targetAction.type !== "skill" &&
          !(targetAction.type === "defense" && targetAction.defense === "rebound") && canActionDefend(targetAction, stats.defenseTag);
        const key = `${actionIndex}:${targetId}`;
        if ((!trueBlade && !defended) || isDoubleEdgeTargetQueued(state, playerId, actionIndex, targetId)) {
          return [];
        }
        if (defended) defendedOptions.add(key);

        const targetName =
          state.players.find((player) => player.id === targetId)?.name ?? "目标";
        const label = `第 ${actionIndex + 1} 招 ${getActionLabel(current)} -> ${targetName}`;
        const choices: DoubleEdgeOption[] = [];
        if (defended && (!trueBlade || !defaultBlade)) choices.push({ key, actionIndex, current, targetId,
          label: `${label} / 无视 ${getActionLabel(targetAction!)}` });
        if (blade && (trueBlade || !defaultBlade && defended)) choices.push({ key: `${key}:blade`, actionIndex, current, targetId,
          cardId: blade.instanceId, label: `${label} / ${trueBlade ? "真·破天圣剑无视技能效果" : "破损战刃无视防御"}` });
        return choices;
      }
    );
  });
  if (getFusionEnhancementCount(owner, DOUBLE_EDGE_SWORD_SKILL_ID, ["破军"]) > 0) {
    const defended = options.filter((item) => defendedOptions.has(`${item.actionIndex}:${item.targetId}`));
    options.push(...defended.filter((item, index, all) => all.findIndex((other) => other.actionIndex === item.actionIndex) === index)
      .map(({ actionIndex, current, targetId }): DoubleEdgeOption => ({ actionIndex, current, targetId,
        key: `${actionIndex}:group`, mode: "ignore_all_defense", label: `第 ${actionIndex + 1} 招 / -1血群破防` })));
  }
  if (!heavenSwordSuppressed && getFusionEnhancementCount(owner, DOUBLE_EDGE_SWORD_SKILL_ID, ["破天圣剑"]) > 0) {
    const defaultReboundBlade = selectBrokenBladeDoubleEdge(owner, "pierce_rebound");
    for (const [actionIndex, current] of plan.actions.entries()) if (isAttackLikeAction(current) &&
      !owner.buffs.some((buff) => buff.id === `double_edge_pierce:${actionIndex}`)) {
      const choice = { actionIndex, current, targetId: playerId, mode: "pierce_rebound" as const };
      if (!trueBlade || !defaultReboundBlade) options.push({ ...choice, key: `${actionIndex}:pierce`, label: `第 ${actionIndex + 1} 招 / -2血破弹` });
      if (blade && (trueBlade || !defaultReboundBlade)) options.push({ ...choice, key: `${actionIndex}:pierce:blade`, cardId: blade.instanceId,
        label: `第 ${actionIndex + 1} 招 / ${trueBlade ? "-2血破弹并无视技能效果" : "破损战刃 -2血破弹"}` });
    }
  }
  return options;
}

function buildLiegongOptions(
  state: PublicGameState,
  playerId: string
): LiegongOption[] {
  const plan = state.revealedActions?.[playerId];
  if (!plan) {
    return [];
  }

  return plan.actions.flatMap((current, actionIndex) => {
    if (!isAttackLikeAction(current)) {
      return [];
    }

    const stats = getActionAttackStats(current);
    if (!stats) {
      return [];
    }

    return getDoubleEdgeTargetIdsForAction(state, playerId, current, stats).flatMap(
      (targetId) => {
        if (isLiegongTargetQueued(state, playerId, actionIndex, targetId)) {
          return [];
        }

        const counter = getIncomingAttackForLiegong(state, targetId, playerId);
        if (!counter) {
          return [];
        }

        const targetName =
          state.players.find((player) => player.id === targetId)?.name ?? "目标";
        return [
          {
            key: `${actionIndex}:${targetId}`,
            actionIndex,
            current,
            targetId,
            counter,
            label: `第 ${actionIndex + 1} 招 ${getActionLabel(current)} 与 ${targetName} 的 ${getActionLabel(counter)} 交错`
          }
        ];
      }
    );
  });
}

function buildAbsoluteGuardOptions(
  state: PublicGameState,
  playerId: string
): AbsoluteGuardOption[] {
  return state.players.flatMap((source) => {
    const plan = state.revealedActions?.[source.id];
    if (!plan || source.id === playerId || source.status !== "alive") {
      return [];
    }

    return plan.actions.flatMap((action, actionIndex) => {
      if (!isAttackLikeAction(action) || isAbsoluteGuardQueued(state, source.id, actionIndex)) {
        return [];
      }

      const stats = getActionAttackStats(action);
      if (!stats) {
        return [];
      }

      const targetIds = getDoubleEdgeTargetIdsForAction(state, source.id, action, stats);
      if (!targetIds.includes(playerId)) {
        return [];
      }

      const mode =
        stats.isArea ||
        isActionForcedArea(state, source.id, action, stats) ||
        isImplicitAreaAction(action, stats)
        ? "area_to_self"
        : "single_to_area";
      const guard = state.players.find((player) => player.id === playerId)!;
      const currentStats = previewPlayerAttackStats(state, source.id).stats[actionIndex];
      const cost = discountCakeCost(state, guard,
        getAbsoluteGuardCost(guard, currentStats ? payableAttackCost(currentStats.cost) : getActionCostForPlayer(state, source, action)));
      const options: AbsoluteGuardOption[] = [
        {
          key: `${source.id}:${actionIndex}`,
          sourceId: source.id,
          actionIndex,
          action,
          mode,
          cost,
          label: `${source.name} 第 ${actionIndex + 1} 招 ${getActionLabel(action)} / ${mode === "area_to_self" ? "群攻改单攻" : "单攻改群攻"} / ${cost}饼`
        }
      ];
      if (mode === "area_to_self" && getFusionEnhancementCount(guard, ABSOLUTE_GUARD_SKILL_ID, ["绝对天盾"]) > 0) options.push({
        ...options[0]!, key: `${source.id}:${actionIndex}:sky`, mode: "area_to_sky", label: `${source.name} 第 ${actionIndex + 1} 招 / 指向天 / ${cost}饼`
      });
      return options;
    });
  });
}

function isDoubleEdgeTargetQueued(
  state: PublicGameState,
  playerId: string,
  actionIndex: number,
  targetId: string
): boolean {
  const player = state.players.find((item) => item.id === playerId);
  const prefix = `double_edge_ignore_defense:${actionIndex}:${targetId}:`;
  return Boolean(player?.buffs.some((buff) => buff.id.startsWith(prefix)));
}

function isLiegongTargetQueued(
  state: PublicGameState,
  playerId: string,
  actionIndex: number,
  targetId: string
): boolean {
  const player = state.players.find((item) => item.id === playerId);
  const prefix = `${LIEGONG_CROSS_BUFF_PREFIX}${actionIndex}:${targetId}:`;
  return Boolean(player?.buffs.some((buff) => buff.id.startsWith(prefix)));
}

function isAbsoluteGuardQueued(
  state: PublicGameState,
  sourceId: string,
  actionIndex: number
): boolean {
  const source = state.players.find((item) => item.id === sourceId);
  const prefix = `${ABSOLUTE_GUARD_BUFF_PREFIX}${actionIndex}:`;
  return Boolean(source?.buffs.some((buff) => buff.id.startsWith(prefix)));
}

function isDoubleEdgeSwordSkill(skill?: { id: string; name?: string } | null): boolean {
  return skill?.id === DOUBLE_EDGE_SWORD_SKILL_ID || skill?.name === "双刃剑";
}

function isAbsoluteGuardSkill(
  skill?: { id: string; name?: string; sourceRow?: number } | null
): boolean {
  return (
    skill?.id === ABSOLUTE_GUARD_SKILL_ID ||
    skill?.name === "绝对守护" ||
    skill?.sourceRow === 74
  );
}

function getDoubleEdgeTargetIdsForAction(
  state: PublicGameState,
  playerId: string,
  action: PlayerAction,
  stats: NonNullable<ReturnType<typeof getActionAttackStats>>
): string[] {
  const actionIndex = state.revealedActions?.[playerId]?.actions.indexOf(action) ?? -1;
  const knownTargets = state.revealedActionTargets?.[playerId]?.[actionIndex];
  if (knownTargets) return knownTargets;
  const alive = state.players.filter((player) => player.status === "alive");
  if (
    stats.isArea ||
    isActionForcedArea(state, playerId, action, stats) ||
    isImplicitAreaAction(action, stats)
  ) {
    const targetIds = alive.filter((player) => player.id !== playerId).map((player) => player.id);
    return filterPutianTongqingBlindSpotTargetIds(state, playerId, targetIds);
  }

  if (action.type === "skill" && MULTI_TARGET_ATTACK_SKILL_IDS.has(action.skillId)) {
    return Array.from(
      new Set([...(action.targetIds ?? []), action.targetId].filter(Boolean) as string[])
    );
  }

  return "targetId" in action && action.targetId ? [action.targetId] : [];
}

function isActionForcedArea(
  state: PublicGameState,
  sourceId: string,
  action: PlayerAction,
  stats: NonNullable<ReturnType<typeof getActionAttackStats>>
): boolean {
  const source = state.players.find((player) => player.id === sourceId);
  const isElectricShockAction =
    action.type === "skill" && action.skillId === ELECTRIC_SHOCK_SKILL_ID;
  return Boolean(
    !isElectricShockAction &&
      !stats.isArea &&
      (!stats.nonAttackMove && hasTianyeWing(source, TIAN_YE_FALL_ID, state.turnNumber) ||
        viewerCanUseSkill(state, source, LUANWU_SKILL_ID) ||
        viewerCanUseSkill(state, source, PUTIAN_TONGQING_SKILL_ID))
  );
}

function filterPutianTongqingBlindSpotTargetIds(
  state: PublicGameState,
  sourceId: string,
  targetIds: string[]
): string[] {
  const source = state.players.find((player) => player.id === sourceId);
  if (!viewerCanUseSkill(state, source, PUTIAN_TONGQING_SKILL_ID) || hasEnhancedPutianRange(source)) {
    return targetIds;
  }

  const farthest = getFarthestAlivePlayerIds(state, sourceId);
  if (farthest.size === 0) {
    return targetIds;
  }

  return targetIds.filter((targetId) => !farthest.has(targetId));
}

function getFarthestAlivePlayerIds(state: PublicGameState, sourceId: string): Set<string> {
  const source = state.players.find(({ id }) => id === sourceId);
  if (!source) return new Set();
  const groups = getCombatSeatGroups(state, source.spaceId);
  return new Set(groups.length <= 3 ? [] : getCombatFarthestPlayers(groups, sourceId).map(({ id }) => id));
}

function isImplicitAreaAction(
  action: PlayerAction,
  stats: NonNullable<ReturnType<typeof getActionAttackStats>>
): boolean {
  return Boolean(!stats.isArea && isAttackLikeAction(action) && !getPrimaryActionTargetId(action));
}

function getPrimaryActionTargetId(action: PlayerAction): string | undefined {
  return "targetId" in action ? action.targetId : undefined;
}

function getActionCostForPlayer(
  state: PublicGameState,
  source: PublicGameState["players"][number],
  action: PlayerAction
): number {
  const actionIndex = state.revealedActions?.[source.id]?.actions.indexOf(action) ?? -1;
  const knownCost = state.revealedActionCosts?.[source.id]?.[actionIndex];
  if (knownCost !== undefined) return knownCost;
  if (action.type === "attack") {
    return getAttackActionCost(state, source, action);
  }

  if (action.type === "skill") {
    return getTurnSkillActionCost(source, action, state);
  }

  return 0;
}

function getDefensiveActionForDoubleEdgeOption(
  state: PublicGameState,
  sourceId: string,
  targetId: string
): PlayerAction | undefined {
  const actionWithIndex = getDefensiveActionWithIndex(state.revealedActions?.[targetId]);
  if (!actionWithIndex) {
    return undefined;
  }

  const source = state.players.find((player) => player.id === sourceId);
  if (!source?.skills.includes("1029")) {
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

function getIncomingAttackForLiegong(
  state: PublicGameState,
  sourceId: string,
  targetId: string
): PlayerAction | undefined {
  return state.revealedActions?.[sourceId]?.actions.find((action) => {
    if (!isAttackLikeAction(action)) {
      return false;
    }

    const stats = getActionAttackStats(action);
    return stats
      ? getDoubleEdgeTargetIdsForAction(state, sourceId, action, stats).includes(targetId)
      : false;
  });
}

function getDefensiveActionWithIndex(
  plan: NonNullable<PublicGameState["revealedActions"]>[string] | undefined
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
  state: PublicGameState,
  playerId: string,
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

function switchActionKey(action: NonNullable<SkillAction["switchToAction"]>): string {
  if (action.type === "gain_cake") return "gain_cake";
  if (action.type === "defense") {
    return `defense:${action.defense}:${action.targetId ?? ""}`;
  }

  return `attack:${action.attackId}:${action.stacks}:${action.targetId ?? ""}`;
}

function isAttackLikeAction(action: PlayerAction): boolean {
  return (
    action.type === "attack" ||
    (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack")
  );
}

function requiresExposedSkillTarget(
  skill: NonNullable<ReturnType<typeof getSkill>>
): boolean {
  if (skill.play?.effect === "sand_transform" || skill.id === "1067") {
    return false;
  }

  return (
    skill.id === "1004" ||
    (skill.description.includes("暴露") && skill.description.includes("技能"))
  );
}

function searchSkillText(skill: {
  name: string;
  description: string;
  tags: string[];
  typeTags: string[];
  sourceRow: number;
}): string {
  return `${skill.name} ${skill.description} ${skill.tags.join(" ")} ${skill.typeTags.join(" ")} #${skill.sourceRow}`;
}

function formatPendingDamageLabel(
  state: PublicGameState,
  item: NonNullable<PublicGameState["pendingDamageItems"]>[number]
): string {
  const sourceName = item.sourceId
    ? state.players.find((player) => player.id === item.sourceId)?.name ?? "未知来源"
    : "系统";
  const elements = item.elements?.filter((element) => element !== "physical").join("/") ?? "";
  const suffix = elements ? ` · ${elements}` : "";
  if (item.directDefeat) return `直接退游 · ${item.attackName ?? "退游"} · 来源 ${sourceName}`;
  const amount = formatDamage(item.amount, item.amountValue);
  if (item.infiniteCopies) return `无限份 · 每份${amount}点 · ${item.attackName ?? "伤害"} · 来源 ${sourceName}${suffix}`;
  return `${amount}点 · ${item.attackName ?? "伤害"} · 来源 ${sourceName}${suffix}`;
}

function formatDamageMarkLabel(
  state: PublicGameState,
  viewerId: string | undefined,
  item: NonNullable<PublicGameState["pendingDamageItems"]>[number],
  markKind: "ice_rain" | "cross_guard"
): string {
  if (markKind === "ice_rain") {
    return `冰雨：${formatPendingDamageLabel(state, item)}`;
  }

  if (viewerId && item.targetId === viewerId) {
    return `护佑：${formatPendingDamageLabel(state, item)}`;
  }

  const targetName = state.players.find((player) => player.id === item.targetId)?.name ?? "未知目标";
  return `十字：${targetName} · ${formatPendingDamageLabel(state, item)}`;
}

function areAdjacentPlayerIds(
  state: PublicGameState,
  playerId: string,
  otherPlayerId: string
): boolean {
  const source = state.players.find(({ id }) => id === playerId);
  return Boolean(source && getCombatSeatDistance(getCombatSeatGroups(state, source.spaceId), playerId, otherPlayerId) === 1);
}

function phaseLabel(phase: PublicGameState["activeTimingPhase"]): string {
  switch (phase) {
    case "opening_action":
      return "开局阶段";
    case "round_pre_interval_action":
      return "轮前轮间";
    case "round_before_action":
      return "轮前";
    case "turn_before_action":
      return "回合前";
    case "turn_change_action":
      return "变招阶段";
    case "turn_damage_modify":
      return "变伤阶段";
    case "revival_action":
      return "复活阶段";
    case "turn_end_action":
      return "回合末";
    case "turn_after_interval_action":
      return "回合后间隙";
    case "round_after_interval_action":
      return "轮后轮间";
    case "turn_action":
      return "出招";
    default:
      return "行动";
  }
}
