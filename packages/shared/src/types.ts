import type { BigCardInstance } from "./bigCards/types";
import type { BigCardPackId } from "./bigCards/catalog";
import type { CombatValue } from "./engine/combatValues";

export type GameId = string;
export type PlayerId = string;
export type SkillId = string;
export type BuffId = string;

export const INITIAL_HP = 6;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const MAX_ACTION_STACKS = 1000;
export const INFINITE_DAMAGE = 999;
export const RETIRE_EFFECT_POWER = 100000;
export const VANISH_EFFECT_POWER = RETIRE_EFFECT_POWER * 2;
export const EXECUTE_EFFECT_POWER = RETIRE_EFFECT_POWER * 3;
export const EXPLODE_EFFECT_POWER = RETIRE_EFFECT_POWER * 4;

export type PlayerStatus = "alive" | "dead";
export type PlayerKind = "human" | "ai" | "spectator";
export type DefeatLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const DEFEAT_LEVEL_LABELS: Record<DefeatLevel, string> = {
  1: "死亡",
  2: "退游",
  3: "消失",
  4: "被必杀",
  5: "爆炸了",
  6: "失败"
};

export type GamePhase =
  | "lobby"
  | "action_window"
  | "collecting_actions"
  | "resolving"
  | "finished";

export type SkillTimingPhase =
  | "game_start_check"
  | "opening_action"
  | "round_pre_interval_action"
  | "round_before_action"
  | "round_start_check"
  | "turn_before_action"
  | "turn_start_check"
  | "turn_action"
  | "turn_reveal_check"
  | "turn_change_action"
  | "turn_hit_check"
  | "turn_damage_modify"
  | "turn_damage_check"
  | "revival_action"
  | "turn_end_action"
  | "turn_end_check"
  | "turn_after_interval_action"
  | "round_end_check"
  | "round_after_interval_action"
  | "victory_counter_action"
  | "retirement_counter_action"
  | "passive_check";

export type ActionWindowMode = "prompt" | "active";

export type DefenseKind = "small" | "youtiao" | "stone" | "rebound" | "self_destruct";

export type DefenseTag =
  | "small"
  | "small_or_youtiao"
  | "youtiao"
  | "stone"
  | "any"
  | "cake"
  | "rebound"
  | "unblockable";

export type AttackElement =
  | "physical"
  | "fire"
  | "electric"
  | "ice"
  | "poison";

export type AttackTrait =
  | "area"
  | "fire"
  | "electric"
  | "ice"
  | "poison"
  | "defeat_retire"
  | "defeat_vanish"
  | "defeat_execute"
  | "defeat_explode"
  | "frost_blade"
  | "pierce_rebound"
  | "ignore_protection"
  | "skill";

export type AttackId =
  | "sha"
  | "qin"
  | "wan_jian"
  | "nan_man"
  | "shan_dian"
  | "huo_wu"
  | "he_bao"
  | "chao_he_bao"
  | "miao_sha";

export interface BaseAttackDefinition {
  id: AttackId;
  name: string;
  cost: number;
  power: number | "infinity";
  level: number;
  powerValue?: CombatValue;
  levelValue?: CombatValue;
  defenseTag: DefenseTag;
  traits: AttackTrait[];
  element: AttackElement;
  isArea: boolean;
}

export interface MoveResolutionRules {
  mustResolve?: boolean;
  ignoreMoveWhenUndefended?: boolean;
  ignoreDamageWhenUndefended?: boolean;
}

export interface AttackStats {
  nineColdProgress?: Partial<Record<import("./engine/nineTribulations").ColdLightField, { stage: number; uses: number }>>;
  sevenStarPierce?: number;
  sevenStarAfterhand?: true;
  sevenStarIgnoreMoveDefense?: true;
  sevenStarIgnoreDefenseValue?: true;
  sevenStarIgnoreShieldId?: string;
  yiyuanIgnoreTargetMove?: true;
  eraSelfTarget?: true;
  moveDurationTurns?: number | "permanent";
  timeRiftDuration?: NonNullable<SkillAction["spaceTimeDuration"]>;
  shadowPriority?: true;
  shadowCombo?: number;
  shadowLimitedFreeAttack?: { power: CombatValue; pierces: boolean; pointDefeat: boolean };
  noClashLevel?: true;
  divineFlame?: true;
  divineRift?: true;
  divineRiftRank?: 2 | 3 | 4;
  divineCross?: number;
  curtainReflectionOnly?: boolean;
  curtainFinale?: { count: number; veils: number };
  defensePiercing?: true;
  piercesDefenseMoves?: true;
  defenseShattering?: true;
  psychicPierce?: true;
  chaosIgnoreTargetMove?: true;
  nonAttackMove?: true;
  xielingDrainRate?: number;
  xielingSpellOnHit?: CombatValue[];
  fixedPointPower?: boolean;
  tianlieRaging?: boolean;
  cannotDodge?: boolean;
  targetSkillIgnore?: import("./engine/skillIgnore").SkillIgnore;
  repeatedDamageParts?: boolean;
  waveId?: string;
  honghuangLastRetires?: boolean;
  moveResolution?: MoveResolutionRules;
  pierceInvulnerability?: boolean;
  attackDamageMultiplier?: number;
  cannonDefensePending?: boolean;
  noReviveOrExtraLives?: boolean;
  ignoreRebounds?: boolean;
  tianyeFall?: true;
  id: AttackId | SkillId;
  name: string;
  cost: number;
  power: number;
  level: number;
  powerValue?: CombatValue;
  levelValue?: CombatValue;
  costValue?: CombatValue;
  damagePartValues?: CombatValue[];
  defenseTag: DefenseTag;
  traits: AttackTrait[];
  element: AttackElement;
  elements: AttackElement[];
  isArea: boolean;
  stacks: number;
  isSkill: boolean;
  freezeTurns?: number;
  /** Separate damage ticks of one attack, retained when its source is reversed. */
  damageHits?: number;
  /** Unequal damage segments of a single attack, using the same defense and target-transfer path. */
  damageParts?: number[];
  sourceBigCardInstanceId?: string;
  /** Granted only to the attack modified by 宗师之力's 毁灭之力. */
  ignoreEarthBreak?: boolean;
  includeSelf?: boolean;
  frostBladeKeepsDamage?: boolean;
  ignoreSwordProtections?: boolean;
  heavenSword?: { ignoreProtection?: boolean; ignoreSwordProtections?: boolean; pierceRebound?: boolean };
  saintCrystalTriggered?: true;
  /** 火眼金睛 (v4): remove 绝弹's permission to reflect nuclear/skill actions. */
  ignoreAbsoluteRebound?: boolean;
  requiresAbsoluteRebound?: boolean;
  /** 根源之目: remove 弹力球's extra resistance to piercing. */
  ignoreElasticRebound?: boolean;
}

export interface KaigeLifeStage {
  cardInstanceId: string;
  stage: number;
  transferredAbilities?: SkillId[];
}

export interface SoulLifeEffect {
  abilityId: SkillId;
  cardInstanceId: string;
  uses: Record<SkillId, number>;
}

export type LifeEffect =
  | ({ kind: "kaige" } & KaigeLifeStage)
  | ({ kind: "soul" } & SoulLifeEffect)
  | { kind: "red_lotus" }
  | { kind: "starting_defense"; amount: number };

export interface SpareLife {
  hp: number;
  hpValue?: CombatValue;
  acquiredOrder?: number;
  sourceBigCardInstanceId?: string;
  effects?: LifeEffect[];
  /** Legacy serialized life effects. */
  kaigeLife?: KaigeLifeStage;
  soulLife?: SoulLifeEffect;
}

export interface PlayerState {
  mirroredSkillIds?: SkillId[];
  yiyuanMimic?: import("./engine/yiyuan").YiyuanSkillSnapshot;
  eraDurationMultiplier?: number;
  redLotusFinaleUsed?: true;
  karmaReincarnation?: true;
  shadowCombo?: number;
  youkaiLayers?: number;
  youkaiHalfRounds?: number;
  starWheelOriginalPosition?: boolean;
  tableSeat?: number;
  /** A body can occupy a position behind another occupant while its table graphic stays put. */
  shadowCombatSeat?: { groupId: PlayerId; spaceId?: string; order: number };
  summon?: import("./engine/beastTraits").SummonedEntity;
  entityClasses?: Array<"animal" | "hound" | "demon">;
  lastSettledDamage?: SettledDamage;
  defeatBlocksRevival?: true;
  charityInitialHpHalvings?: number;
  /** The seat keeps its existing player ID while the owner is in a private space. */
  emptyCityBodySpaceId?: string;
  emptyCityBody?: PlayerState;
  emptyCityOwnerId?: PlayerId;
  emptyCityBodyDefeatId?: PlayerId;
  emptyCityPhantomDefeat?: true;
  emptyCitySkillsSuspended?: true;
  emptyCityRecovery?: import("./engine/illusionRules").EmptyCityRecovery;
  bars?: import("./engine/bars").PlayerBar[];
  eternalMoves?: Record<string, import("./engine/eternalThought").EternalMove>;
  sakuraDiscards?: Record<PlayerId, { used: number; extra: number }>;
  verdictShadowInstanceId?: string;
  kaigeLife?: KaigeLifeStage;
  soulLife?: SoulLifeEffect;
  effects?: LifeEffect[];
  spareLives?: SpareLife[];
  spaceId?: string;
  /** Legacy inventory in older snapshots. New packets are kept in a counted status. */
  storedDamages?: StoredDamage[];
  /** Serialized separately from the finite display value, avoiding JS Infinity/null. */
  hpIsInfinite?: boolean;
  hpValue?: CombatValue;
  /** The nighttime cap follows settled HP losses and is removed when daylight returns. */
  nightHpCap?: CombatValue;
  /** The current cap supplied by the field, independent of a player's own reductions. */
  decayFieldHpCap?: true;
  decayReducedHpCap?: CombatValue;
  /** Recovery capped at exactly zero can leave a player alive with zero HP. */
  hpCappedRecoveryAtZero?: true;
  /** Room starting HP before skill modifiers. Older games fall back to 6. */
  baseInitialHp?: number;
  id: PlayerId;
  accountId?: string;
  name: string;
  avatarUrl?: string;
  kind: PlayerKind;
  hp: number;
  cakes: number;
  /** Current cakes that came from this round's gain_cake actions. */
  actionCakes?: number;
  hunyaoAwakened?: boolean;
  status: PlayerStatus;
  defeatLevel?: DefeatLevel;
  connected: boolean;
  skills: SkillId[];
  /** Exclusive to big-skill modes; never inserted into the legacy small-skill list. */
  bigCards?: BigCardInstance[];
  bigCardSlotCount?: number;
  skillInventory?: Array<{ instanceId: string; skillId: SkillId; sourceBigCardInstanceId?: string; acquisitionOrder?: number;
    curtainRebirthElement?: Exclude<AttackElement, "physical">; convertedMaterial?: true;
    judgmentRank?: import("./engine/judgmentRank").JudgmentRank }>;
  /** The two underlying material slots remain in skills, covered by one fusion card. */
  skillFusions?: SkillFusionState[] | undefined;
  fusionRequestIds?: string[] | undefined;
  /** Private opening selections, reused when a wither fusion is formed later. */
  witherSelections?: number[] | undefined;
  kurongCakeDiscount?: 0 | 1 | 3;
  skillSlotCount?: number;
  /** Viewer-only authoritative prices, never accepted as client input. */
  attackCostOverrides?: Partial<Record<AttackId, number>> | undefined;
  revealedSkillIds: SkillId[];
  buffs: BuffState[];
}

export interface BuffState {
  huiyueAllowsMoves?: true;
  storedDamages?: StoredDamage[];
  moveBlockedFromTurn?: number;
  periodicUseBalance?: { startedAt: number; interval: number; quota: number };
  sourceJudgmentRank?: import("./engine/judgmentRank").JudgmentRank | number;
  loneStarCharges?: Record<PlayerId, number>;
  beastProtectedPlayerId?: PlayerId;
  beastRolledTurn?: number;
  beastRoarActive?: boolean;
  charityGroup?: PlayerId[];
  psychicPuppet?: true;
  talismanNextTick?: number;
  talismanDuration?: number;
  ignoredEffectCategories?: import("./engine/effectCategories").EffectCategory[];
  unaffectedByNegativeStatuses?: true;
  continuationStartedTurn?: number;
  sharedByGreedChain?: true;
  siphonTargetId?: PlayerId;
  siphonNextTick?: number;
  soulDeathIgnores?: Array<{ payerId: PlayerId; ownerId: PlayerId; skillId: SkillId }>;
  asuraSwordLayer?: true;
  sandVortexNextTick?: number;
  sandDelayedMove?: { action: PlayerAction; dueTurn: number };
  resourceValue?: import("./engine/combatValues").CombatValue;
  mountainSealNumbers?: { favorableMultiplier: number; otherDivisor: number };
  reflectedMoveKeys?: string[];
  sourceMoveIndex?: number;
  shadowGrantTurn?: number;
  shadowIgnoreLimited?: true;
  roarContinuation?: { action: PlayerAction; firstTurn: number };
  timeRiftDeadline?: Readonly<{ turn: number; round: number }>;
  dreamEntryTurn?: number;
  dreamRoundBefore?: number;
  lifeAbsorptionDueRound?: number;
  startsAtRound?: number;
  startsAtTurn?: number;
  xielingMarkValue?: CombatValue;
  saintYield?: { turnNumber: number; element?: string };
  jueyingHarvestHealing?: number;
  freeMove?: import("./engine/wujin").FreeMove;
  tianlieWave?: { action: AttackAction | SkillAction; stats: AttackStats };
  itemKind?: string;
  thunderDamageRemainder?: number;
  junengDivisor?: number;
  cannotGainSpareLives?: boolean;
  cannotSwitchSpareLives?: boolean;
  lifeCountLimit?: number;
  defenseValue?: CombatValue;
  /** Value limit for one damage packet or a direct retirement. */
  damageShieldLimit?: CombatValue;
  grantsNegativeImmunityWhileHeld?: boolean;
  clearsDamageShieldsOnExpiry?: boolean;
  waveAttack?: { skillId: SkillId; targetId?: PlayerId; cardId: string; firstTurn: number; power: CombatValue; level: CombatValue;
    defeatTrait?: AttackTrait; honghuangEnhanced?: boolean; skyStrikeAllDefended?: boolean };
  defenseResponse?: { phase: SkillTimingPhase; value: CombatValue; turnNumber: number; targetId?: PlayerId };
  immuneEffectCategories?: import("./engine/effectCategories").EffectCategory[];
  skillReflectLimit?: CombatValue;
  skillReflectExclusive?: true;
  uncleansable?: true;
  chaosWave?: { ignoreSkill: boolean; ignoreMove: boolean };
  chaosStartRound?: number;
  chaosBlockedKeys?: string[];
  skillAttackBlockLimit?: CombatValue;
  preventsTargetSelection?: boolean;
  damageTakenValue?: CombatValue;
  ignoredSkillIds?: SkillId[];
  ignoredSkillTypeTags?: string[];
  temporaryLostAbility?: { cardId: string; abilityId: SkillId };
  temporaryGrantedCardId?: string;
  purplePower?: number | undefined;
  purpleLevel?: number | undefined;
  ignoredBigCardIds?: string[];
  ignoredDamageKinds?: Array<"attack" | "spell">;
  ignoredDamageElements?: AttackElement[];
  continuationBlocks?: Array<"revival" | "reentry" | "reappearance" | "initial_reset">;
  stateType?: string;
  sourceBigCardInstanceId?: string;
  sourceAbilityId?: SkillId;
  lastTickTurn?: number;
  suppressedEffectCategories?: import("./engine/effectCategories").EffectCategory[];
  infinite?: boolean;
  id: BuffId;
  name: string;
  stacks: number;
  expiresAtRound?: number;
  expiresAtTurn?: number;
  sourcePlayerId?: PlayerId;
  sourceFusionId?: string;
  fusionMarkKind?: "ice_fire" | "solar_lava" | "ice_rain";
  markKeepsAttackElement?: boolean;
  /** Revealed action slot receiving a spent offensive mark. */
  attackActionIndex?: number;
  /** Rules added to one revealed action slot during the change phase. */
  moveResolution?: MoveResolutionRules;
  traumaCakePaid?: boolean;
  /** Six-star recovery follows the largest individual damage through this turn. */
  sixStarMaxDamage?: number;
  sixStarRecoveryPaid?: number;
  sixStarMaxDamageValue?: CombatValue;
  sixStarAllDamage?: true;
  sixStarTotalDamageValue?: CombatValue;
  sixStarRecoveryPaidValue?: CombatValue;
  tianmangAbsorbed?: CombatValue;
}

export interface SkillFusionState {
  judgmentRank?: import("./engine/judgmentRank").JudgmentRank | number;
  uncappedIceFireMarks?: true;
  starShiftUses?: Partial<Record<"1092" | "1093", number>>;
  acquisitionOrder?: number;
  rerollCompletedSlotIds?: string[];
  slotMachineExtraInstanceIds?: string[];
  materialInstanceIds?: string[];
  /** The ingredient fusions stay on the player's ledger under this cover. */
  materialFusionIds?: string[];
  sourceBigCardInstanceId?: string;
  id: string;
  skillId: SkillId;
  materialSkillIds: SkillId[];
  witherSelectionIndex?: number;
  witherSelectionWidth?: number;
  /** Independent acquisition choices; retained when the cover is serialized or resumed. */
  acquisition?: {
    smallUsed: boolean;
    fusionUsed: boolean;
    mirrorMaterialUsed?: boolean;
    smallUseRecorded?: boolean;
    bonusSkillId?: SkillId;
    bonusSkillInstanceId?: string;
  };
}

export interface GainCakeAction {
  freeMoveId?: string;
  type: "gain_cake";
}

export interface DefenseAction {
  antiCakeSpent?: number;
  youkaiCakeSpent?: number;
  freeMoveId?: string;
  type: "defense";
  defense: DefenseKind;
  targetId?: PlayerId;
  /** A scatter branch made directional by a partial reversal. */
  fixedReboundTarget?: true;
}

export interface AttackAction {
  antiCakeSpent?: number;
  youkaiCakeSpent?: number;
  freeMoveId?: string;
  tianlieContinuationId?: string;
  type: "attack";
  attackId: AttackId;
  stacks: number;
  targetId?: PlayerId;
}

export interface LeafAbilityChoice {
  cardInstanceId: string;
  abilityId: SkillId;
}

export interface LeafCardChoice {
  ownerId: PlayerId;
  cardInstanceId: string;
  cardId: string;
  abilityIds: SkillId[];
}

export interface KarmaCardChoice {
  playerId: PlayerId;
  instanceId: string;
  number: number;
  visibleCardId?: string;
}

export interface KarmaCardChange {
  cardInstanceId: string;
  replacementCardId: string;
}

export interface SkillAction {
  coldLightField?: import("./engine/nineTribulations").ColdLightField;
  yiyuanRepeat?: boolean;
  eraMoveIndex?: number;
  eraMoveSourceId?: PlayerId;
  karmaConvertFromSkillId?: SkillId;
  karmaConvertToSkillId?: SkillId;
  karmaCardChanges?: KarmaCardChange[];
  cheatCardInstanceId?: string;
  cheatTransferFrom?: string;
  cheatTransferTo?: string;
  tianyeWingChoice?: import("./engine/tianyeIds").TianyeWingChoice;
  shadowMoveMode?: "insert" | "behind";
  /** Combo length stamped by the server when this action is revealed. */
  shadowCombo?: number;
  demonId?: PlayerId;
  demonOrder?: import("./engine/demonIds").DemonOrder;
  demonPlacement?: import("./engine/demonIds").DemonPlacement;
  demonPoweredWhirlwind?: true;
  crystalMarkCount?: number;
  starWheelMoveIds?: string[];
  starWheelStatusId?: string;
  starWheelUseOriginal?: boolean;
  starWheelPinned?: true;
  totemKind?: import("./engine/totemIds").TotemKind;
  totemRange?: import("./engine/totemIds").TotemRange;
  totemAfterId?: PlayerId;
  cardForm?: string;
  fiveElementsLevelOperation?: import("./engine/fiveElementsIds").FiveElementsOperation;
  tigerPower?: number;
  swarmAllocation?: import("./engine/swarmIds").SwarmAllocation;
  swarmPaidInventory?: import("./engine/swarmIds").SwarmAllocation;
  antiCakeSpent?: number;
  youkaiCakeSpent?: number;
  vacuumUse?: "normal" | "extra";
  charityRestoreInitial?: true;
  sakuraPaid?: number;
  gameSwitchMode?: import("./engine/gameSwitch").GameSwitchMode;
  bloodQiSpent?: number;
  sandGrantedUse?: true;
  leafAbilityChoices?: LeafAbilityChoice[];
  xielingMarkCost?: number;
  saintElement?: string;
  freeMoveId?: string;
  tianlieContinuationId?: string;
  attackResponseId?: string;
  waveContinuationId?: string;
  sacredBeast?: import("./engine/honghuang").SacredBeast;
  defenseGainId?: string;
  removeSkillInstanceIds?: string[];
  rerollFusionInstanceId?: string;
  dragonBloodTotal?: CombatValue;
  targetBigCardInstanceId?: string;
  storedDamageId?: string;
  bigCardInstanceId?: string;
  type: "skill";
  skillId: SkillId;
  stacks: number;
  freeStacks?: number;
  targetId?: PlayerId;
  targetIds?: PlayerId[];
  spaceTimeDuration?: { turns: number; rounds: number };
  spaceTimeSource?: "left" | "right" | "sky";
  targetSkillId?: SkillId;
  materialSkillIds?: SkillId[];
  fusionMaterialInstanceIds?: string[];
  fusionRequestId?: string;
  targetDamageId?: string;
  attackStatModifier?: AttackStatModifierChoice;
  switchActionIndex?: number;
  purplePower?: number;
  purpleLevel?: number;
  purpleInsightChoice?: "lose" | "gain";
  switchToAction?: AttackAction | DefenseAction | GainCakeAction;
  doubleEdgeMode?: "ignore_defense" | "pierce_rebound" | "ignore_all_defense";
  absoluteGuardToSky?: boolean;
}

export interface DiscardSkillAction {
  type: "discard_skill";
  targetSkillId: SkillId;
}

export type AttackStatModifierChoice =
  | "swap_power_level"
  | "swap_cost_power"
  | "swap_cost_level"
  | "rotate_cost_power_level"
  | "rotate_cost_level_power"
  | "power_plus_1_level_minus_1"
  | "power_minus_1_level_plus_1"
  | "power_plus_2_level_minus_2"
  | "power_minus_2_level_plus_2"
  | "power_times_3_level_to_zero"
  | "power_to_zero_level_times_4"
  | "power_plus_2_level_minus_1"
  | "power_minus_1_level_plus_2"
  | "power_plus_4_level_minus_2"
  | "power_minus_2_level_plus_4"
  | "power_times_6_level_to_zero"
  | "power_to_zero_level_times_8"
  | "power_times_infinity"
  | "level_times_infinity";

export type PlayerAction = (
  | GainCakeAction
  | DefenseAction
  | AttackAction
  | SkillAction
  | DiscardSkillAction
) & {
  roarContinuationId?: string;
  sandDelayedActionId?: string;
  spaceTimeReplay?: {
    turn: number;
    duration: number | "permanent";
    wave?: NonNullable<BuffState["waveAttack"]>;
    tianlie?: NonNullable<BuffState["tianlieWave"]>;
  };
};

export interface PlayerActionPlan {
  actions: PlayerAction[];
  moveEligibilityAutoPass?: true;
}

export type ActionSubmission = PlayerAction | PlayerActionPlan;

export type PendingActionMap = Partial<Record<PlayerId, PlayerActionPlan>>;
export type SkillKnowledgeMap = Partial<
  Record<PlayerId, Partial<Record<PlayerId, SkillId[]>>>
>;

export type SkillMode = "none" | "small_intro" | "test_select" | "big_random" | "big_test_select";
export type SpeedMode = "normal";

export interface GameConfig {
  maxPlayers: number;
  allowAI: boolean;
  firstTurnNoAttack: boolean;
  hideCakeCounts: boolean;
  turnTimeLimitSeconds: number;
  speedMode: SpeedMode;
  skillMode: SkillMode;
  skillCount: number;
  /** Optional override for skill modes. */
  initialHp?: number;
  /** Omitted means every pack. An empty selection prevents starting a random deal. */
  bigCardPackIds?: BigCardPackId[];
  /** Random big cards may repeat across players by default. */
  allowDuplicateBigCards?: boolean;
}

type OpeningRoundEffect =
  | { kind: "collapse"; playerId: PlayerId; finaleFusionId?: string }
  | { kind: "past_time"; playerId: PlayerId; rounds: number }
  | { kind: "self_isolation"; playerId: PlayerId; expiresAtRound: number }
  | { kind: "jushen"; targetId: PlayerId; expiresAtRound: number }
  | { kind: "xieling_body"; playerId: PlayerId; instanceId?: string }
  | { kind: "mountain_seal" };

export interface GameState {
  yiyuanRequests?: import("./engine/yiyuan").YiyuanRequest[];
  yiyuanNextMoves?: import("./engine/yiyuan").YiyuanSchedule[];
  starMoonCardHits?: { playerId: PlayerId; targetId: PlayerId; turn: number }[];
  fusionClosedByStarMoon?: true;
  tianyeTurn?: import("./engine/tianye").TianyeTurn;
  /** Field effect overriding the room server's time of day, in Beijing time. */
  sunClockOverride?: { hour: number; minute: number; effectName: string };
  /** The opening draw pool stays fixed across full game restarts. */
  openingBigCardDeal?: { pool: string[]; allowDuplicateAcrossPlayers: boolean };
  shadowInsertedSeats?: Array<{ id: string; afterId: string; spaceId?: string }>;
  starWheelMoves?: import("./engine/starWheel").StarWheelMove[];
  starWheelReleasedMoves?: import("./engine/starWheel").StarWheelMove[];
  starWheelPendingStatuses?: import("./engine/starWheel").StarWheelStatus[];
  starWheelRevealedPlans?: { turn: number; plans: Record<PlayerId, PlayerActionPlan> };
  starWheelShuffleIds?: PlayerId[];
  starWheelPointResume?: { moves: import("./engine/starWheel").StarWheelMove[];
    resume: import("./engine/retirementCounter").RetirementCounterState["resume"]; previous?: GameState["verdictTurn"] };
  totems?: import("./engine/totems").AncestralTotem[];
  totemYoutiaoDefense?: { turnNumber: number; playerIds: PlayerId[] };
  totemMoveRolls?: { turnNumber: number; results: Record<string, boolean> };
  eternalCheckpoints?: Record<string, import("./engine/eternalThought").EternalCheckpoint>;
  eternalProgressCheckedTurn?: number;
  eternalFrozenPlayerIds?: PlayerId[];
  sakuraSpringStarted?: boolean;
  sakuraDue?: { playerId: PlayerId; turn: number; lives?: number }[];
  sakuraTurnEndResponse?: boolean;
  purpleInsights?: Record<PlayerId, import("./engine/purpleEye").PurpleInsight>;
  purpleForesights?: Record<PlayerId, import("./engine/purpleEye").PurpleForesight>;
  gameSwitch?: import("./engine/gameSwitch").GameSwitchSession;
  queuedGameSwitches?: import("./engine/gameSwitch").GameSwitchDeclaration[];
  gameSwitchAftermath?: true;
  pendingSandTowerDamage?: Array<{ sourceId: PlayerId; targetId: PlayerId; value: import("./engine/combatValues").CombatValue }>;
  openingRoundEffects?: { entries: OpeningRoundEffect[]; settling?: true };
  retirementCounter?: import("./engine/retirementCounter").RetirementCounterState;
  soulRetirementRevival?: import("./engine/retirementCounter").RetirementCounterState["resume"];
  bloodRitual?: {
    sourceId: PlayerId;
    targets: PlayerId[];
    level: 2 | 3;
    step: number;
    stage: "apply" | "reversal" | "soul" | "victory";
    changed: boolean;
    resistance?: { window: import("./engine/retirementCounter").RetirementCounterState["resume"]; previousDamage: PendingDamageItem[] };
  };
  pendingRetirementCounterPlayerIds?: PlayerId[];
  victoryCounter?: import("./engine/victoryCounter").VictoryCounterState;
  jueyingRevivalRestart?: boolean;
  spentBoardVictoryPlayerIds?: PlayerId[];
  verdictBlockedMoves?: string[];
  verdictOrdinaryMoves?: Array<{ sourceId: PlayerId; targetId: PlayerId; key: string }>;
  curtainTurnPlans?: { turnNumber: number; plans: Record<PlayerId, PlayerActionPlan> };
  verdictTurn?: import("./engine/pointGame").VerdictTurn;
  windSeatChange?: { turnNumber: number; casters: PlayerId[]; occupants: Record<PlayerId, PlayerId>; wheelCasters?: PlayerId[] };
  borrowedBigCards?: Array<{
    ownerId: PlayerId;
    borrowerId: PlayerId;
    copyId: string;
    expiresAtRound: number;
    skipReturn?: boolean;
    card: BigCardInstance;
    inventory: NonNullable<PlayerState["skillInventory"]>;
    fusions: NonNullable<PlayerState["skillFusions"]>;
    buffs: BuffState[];
    spareLives: NonNullable<PlayerState["spareLives"]>;
    kaigeStage?: number;
    kaigeLifePosition?: number;
  }>;
  pendingDragonFireBonuses?: Array<{ playerId: PlayerId; cardInstanceId: string; dueRound: number }>;
  smallSpaces?: Record<string, { name: string; kind?: "self_isolation" | "dream_utopia" | "soul_exile" | "vacuum_exile" | "yuan_void" | "space_burst"; expiresAtRound: number; cakeMultiplier: number;
    expiresAtTurn?: number;
    countsForVictory?: true;
    targetLock?: GameState["junengTargetLock"] }>;
  spaceTimeFields?: import("./engine/spaceTime").SpaceTimeFields;
  eraFields?: import("./engine/era").EraField[];
  eraTargetEdits?: import("./engine/era").EraTargetEdit[];
  spaceBurstBridges?: Array<{ sourceId: PlayerId; targetId: PlayerId }>;
  peekBigCardsByViewer?: Record<PlayerId, string[]>;
  leafCardsByViewer?: Record<PlayerId, LeafCardChoice[]>;
  junengTargetLock?: { targetId: PlayerId; expiresAtRound: number };
  cannonDefenses?: CannonDefense[];
  tianlieAttackResponses?: import("./engine/tianlie").TianlieAttackResponse[];
  thornPierceResponses?: import("./engine/thornDance").ThornPierceResponse[];
  bubbleDreamHits?: import("./engine/bubbleDream").BubbleDreamHit[];
  bubbleDeferredSelfDestructs?: Array<{ playerId: PlayerId; late: boolean }>;
  bubbleFinaleTurn?: number;
  bubbleGameSwitchTurn?: number;
  initialPlayerSnapshots?: Partial<Record<PlayerId, PlayerState>>;
  roundStartSnapshots?: import("./engine/honghuang").RoundStartSnapshot[];
  /** Legacy rooms captured only starting Hunyao holders. */
  initialHunyaoPlayers?: Partial<Record<PlayerId, PlayerState>>;
  /** Private event IDs from each player's latest committed damage batch. */
  damageAttribution?: Record<PlayerId, string[]>;
  turnEndStatusPending?: { turnNumber: number; healthChangedBefore: boolean; qianqiu?: true; responses?: true };
  nineTribulationEnd?: { turn: number; attempts: Array<{ ownerId: PlayerId; cardId: string; targetId: PlayerId; previous: number }>; fromEvent: number };
  previousTurnEndCakes?: Record<PlayerId, number>;
  id: GameId;
  ownerId: PlayerId;
  phase: GamePhase;
  roundNumber: number;
  roundTurnNumber: number;
  turnNumber: number;
  activeTimingPhase: SkillTimingPhase;
  fiveElementsIceAttempts?: Partial<Record<PlayerId, { turn: number; key: string }>>;
  turnResolutionStarted?: boolean;
  turnHealthChanged?: boolean;
  youkaiRitualDefenses?: { turn: number; byMove: Record<string, "small" | "youtiao" | "stone"> };
  damageModifyReturnPhase?: SkillTimingPhase;
  damageModifyAfterTurnResolution?: boolean;
  preemptiveRestartSnapshot?: PreemptiveRestartSnapshot;
  actionWindowMode?: ActionWindowMode;
  /** Ordinary changes are closed; only reversal responses or passing remain. */
  reversalResponseOnly?: boolean;
  actionWindowDeadlineAt?: number;
  actionWindowPlayerIds: PlayerId[];
  actionWindowPassPlayerIds: PlayerId[];
  turnStartedAt: number;
  turnDeadlineAt?: number;
  players: PlayerState[];
  pendingActions: PendingActionMap;
  hexagramNegativeAtReveal?: PlayerId[];
  sevenStarLegacyPending?: Record<PlayerId, string[]>;
  sevenStarLegacyResume?: import("./engine/sevenStar").SevenStarLegacyResume;
  sevenStarHitRolls?: { turn: number; results: Record<string, boolean> };
  turnMoveSuppression?: { turnNumber: number; invalidated: Partial<Record<PlayerId, number[]>>; yuanReturnResolved?: true; yuanVoidPrepared?: true; eraPrepared?: true;
    skillEffects: Partial<Record<PlayerId, number[]>>; delayed?: Partial<Record<PlayerId, number[]>>;
    vacuumReturned?: Partial<Record<PlayerId, number[]>>;
    sandInvalidated?: Partial<Record<PlayerId, number[]>> };
  turnActionCosts?: Partial<Record<PlayerId, number[]>>;
  turnActionReceipts?: Partial<Record<PlayerId, TurnActionReceipt>>;
  yuanVoidEntries?: { turnNumber: number; playerIds: PlayerId[] };
  turnAttackStats?: Partial<Record<PlayerId, Record<number, AttackStats>>>;
  pendingDamageItems?: PendingDamageItem[];
  retaliationRevivalPending?: boolean;
  /** Private, reversible action receipts and attacks captured when reversal is first used. */
  reversalState?: { turnNumber: number; attacks: import("./engine/scatterRebound").ReboundAttack[];
    suppressed: boolean; receipts: Partial<Record<PlayerId, TurnActionReceipt>>; fusions: Record<PlayerId, SkillFusionState[]> };
  spaceReversalStates?: Record<string, NonNullable<GameState["reversalState"]>>;
  /** Private; deliberately excluded from preemptive snapshots and public projections. */
  retaliationResponses?: { turnNumber: number; counts: Record<PlayerId, Partial<Record<SkillId, number>>> };
  roundEndDamagePending?: { skipSmallSpaceTick: boolean };
  pendingSkillChoices?: PendingSkillChoice[];
  skillKnowledge: SkillKnowledgeMap;
  eventLog: GameEvent[];
  winnerIds: PlayerId[];
  skillVictoryUnaffectedPlayerIds?: PlayerId[];
  config: GameConfig;
  createdAt: number;
  updatedAt: number;
}

export interface TurnActionReceipt {
  benefitsBySlot?: Partial<Record<number, Array<Omit<TurnActionReceipt, "benefitsBySlot">>>>;
  cakesSpent: number;
  youkaiCakePayments?: number[];
  cakesGained: number;
  actionCakeDelta?: number;
  seaGodDuskUseCardId?: string;
  buffsBefore: BuffState[];
  buffsAfter: BuffState[];
  addedFusionIds: string[];
  addedSkillInstances?: NonNullable<PlayerState["skillInventory"]>;
}

export interface CannonDefense {
  dueTurn: number;
  next: "cake" | "stone" | "rebound" | "youtiao";
  attack: import("./engine/scatterRebound").ReboundAttack;
}

export interface StoredDamage {
  id: string;
  amountValue: CombatValue;
  pointDefeatLevel?: DefeatLevel;
  attackName?: string;
  element?: AttackElement;
  elements?: AttackElement[];
  fromAttack?: boolean;
  spellDamage?: boolean;
  internalDamage?: boolean;
}

export interface PreemptiveRestartSnapshot {
  spaceTimeFields?: GameState["spaceTimeFields"];
  eraFields?: GameState["eraFields"];
  borrowedBigCards?: GameState["borrowedBigCards"];
  pendingDragonFireBonuses?: GameState["pendingDragonFireBonuses"];
  smallSpaces?: GameState["smallSpaces"];
  junengTargetLock?: GameState["junengTargetLock"];
  cannonDefenses?: CannonDefense[];
  damageAttribution?: Record<PlayerId, string[]>;
  roundNumber: number;
  roundTurnNumber: number;
  turnNumber: number;
  activeTimingPhase: SkillTimingPhase;
  turnStartedAt: number;
  players: PlayerState[];
  pendingActions: PendingActionMap;
  pendingSkillChoices?: PendingSkillChoice[];
}

export interface PublicGameState
  extends Omit<
    GameState,
    | "hexagramNegativeAtReveal"
    | "sevenStarLegacyPending" | "sevenStarLegacyResume" | "sevenStarHitRolls"
    | "openingBigCardDeal"
    | "tianyeTurn"
    | "openingRoundEffects"
    | "spaceBurstBridges"
    | "eraTargetEdits"
    | "verdictTurn"
    | "victoryCounter"
    | "retirementCounter"
    | "pendingRetirementCounterPlayerIds"
    | "jueyingRevivalRestart"
    | "spentBoardVictoryPlayerIds"
    | "verdictBlockedMoves"
    | "verdictOrdinaryMoves"
    | "curtainTurnPlans"
    | "starWheelMoves"
    | "starWheelReleasedMoves"
    | "starWheelPendingStatuses"
    | "starWheelRevealedPlans"
    | "starWheelShuffleIds"
    | "starWheelPointResume"
    | "totemMoveRolls"
    | "totemYoutiaoDefense"
    | "borrowedBigCards"
    | "pendingDragonFireBonuses"
    | "pendingActions"
    | "turnMoveSuppression"
    | "peekBigCardsByViewer"
    | "sakuraDue"
    | "leafCardsByViewer"
    | "cannonDefenses"
    | "tianlieAttackResponses"
    | "thornPierceResponses"
    | "bubbleDreamHits"
    | "bubbleDeferredSelfDestructs"
    | "skillKnowledge"
    | "pendingSkillChoices"
    | "preemptiveRestartSnapshot"
    | "damageModifyAfterTurnResolution"
    | "turnActionCosts"
    | "turnActionReceipts"
    | "yuanVoidEntries"
    | "turnAttackStats"
    | "retaliationRevivalPending"
    | "reversalState"
    | "spaceReversalStates"
    | "retaliationResponses"
    | "roundEndDamagePending"
    | "damageAttribution"
    | "turnEndStatusPending"
    | "nineTribulationEnd"
    | "previousTurnEndCakes"
    | "initialHunyaoPlayers"
    | "initialPlayerSnapshots"
    | "roundStartSnapshots"
    | "eternalCheckpoints"
    | "eternalProgressCheckedTurn"
    | "soulRetirementRevival"
    | "bloodRitual"
    | "gameSwitch"
    | "queuedGameSwitches"
    | "gameSwitchAftermath"
    | "purpleInsights"
    | "purpleForesights"
  > {
  starWheelMoves?: import("./engine/starWheel").StarWheelMoveView[];
  starWheelPendingStatuses?: Array<Pick<import("./engine/starWheel").StarWheelStatus, "id" | "targetId" | "label">>;
  victoryCounter?: import("./engine/victoryCounter").VictoryCounterView;
  retirementCounter?: import("./engine/retirementCounter").RetirementCounterView;
  bloodRitualResistance?: true;
  emptyCityAttackTargets?: Array<{ id: PlayerId; name: string }>;
  basicGameSwitch?: PublicGameState;
  gameSwitchDeadlineAt?: number;
  purpleInsight?: { targetId: PlayerId; abilityId: SkillId; sourceCardId: string };
  purpleForesight?: import("./engine/purpleEye").PurpleForesightView;
  pointGame?: { id: string; sourceId: PlayerId; targetId: PlayerId; round: number; submittedPlayerIds: PlayerId[];
    kind?: import("./engine/pointGame").PointGame["kind"] | "game_switch"; participantIds?: PlayerId[] };
  statusOverview?: import("./engine/statusOverview").StatusOverview;
  verdictRemovalPlayerId?: PlayerId;
  blindSkillChoices?: import("./engine/blindSkillRemoval").BlindSkillChoice[];
  sakuraCardChoices?: import("./engine/sakura").SakuraCardChoice[];
  sakuraFinaleDiscardCount?: number;
  karmaCardChoices?: KarmaCardChoice[];
  karmaReplacementIds?: string[];
  cheatCardChoices?: KarmaCardChoice[];
  starMoonCardChoices?: { targetId: PlayerId; instanceId: string; label: string }[];
  hexagramCopyChoices?: Array<{ targetId: PlayerId; targetBigCardInstanceId: string; targetSkillId: SkillId }>;
  sevenStarLegacy?: { choices: import("./engine/sevenStar").SevenStarLegacyChoice[] };
  yiyuanRepeatChoice?: { casterNames: string[]; moves: string[] };
  cheatTransferChoices?: import("./engine/cheatServerUses").CheatServerUseOption[];
  eternalMoveChoices?: { index: number; label: string }[];
  eternalReadySkills?: SkillId[];
  cannonDefenseSteps?: Array<{ targetId: PlayerId; sourceId?: PlayerId; dueTurn: number; next: CannonDefense["next"]; attackName?: string; requiresAntiPiercing?: true }>;
  tianlieResponseChoices?: Array<{ id: string; skillId: SkillId; label: string }>;
  thornPierceChoices?: Array<{ id: string; skillId: SkillId; label: string }>;
  bubbleDreamHitChoices?: Array<{ id: string; label: string; sourceId: PlayerId }>;
  eraTargetChoices?: import("./engine/era").EraTargetChoice[];
  pendingActionPlayerIds: PlayerId[];
  pendingSkillChoices?: PendingSkillChoice[];
  revealedActions?: PendingActionMap;
  revealedActionCosts?: Partial<Record<PlayerId, number[]>>;
  revealedAttackStats?: Partial<Record<PlayerId, Record<number,
    Pick<AttackStats, "cost" | "power" | "level" | "damageParts" | "powerValue" | "levelValue" | "costValue" | "damagePartValues">>>>;
  revealedActionTargets?: Partial<Record<PlayerId, PlayerId[][]>>;
  viewerPlayerId?: PlayerId;
  leafCardChoices?: LeafCardChoice[];
}

export type GameEvent =
  | GameCreatedEvent
  | PlayerJoinedEvent
  | PlayerReadyEvent
  | ActionSwitchedEvent
  | ActionCancelledEvent
  | ActionSubmittedEvent
  | PlayerRenamedEvent
  | PlayerLeftEvent
  | PlayerKickedEvent
  | SettingsUpdatedEvent
  | SkillRevealedEvent
  | SkillUsedEvent
  | TurnRevealedEvent
  | CakeChangedEvent
  | AttackBlockedEvent
  | AttackReflectedEvent
  | ReboundBrokenEvent
  | ClashEvent
  | DamageEvent
  | HealEvent
  | RoundEndedEvent
  | PlayerDiedEvent
  | GameFinishedEvent
  | SystemEvent;

export interface BaseGameEvent {
  id: string;
  type: string;
  at: number;
  roundNumber: number;
  turnNumber: number;
  privatePlayerId?: PlayerId;
}

export interface GameCreatedEvent extends BaseGameEvent {
  type: "game_created";
  gameId: GameId;
}

export interface PlayerJoinedEvent extends BaseGameEvent {
  type: "player_joined";
  playerId: PlayerId;
  name: string;
}

export interface PlayerReadyEvent extends BaseGameEvent {
  type: "player_ready";
  playerId: PlayerId;
}

export interface ActionSubmittedEvent extends BaseGameEvent {
  type: "action_submitted";
  playerId: PlayerId;
}

export interface ActionSwitchedEvent extends BaseGameEvent {
  coveredByTianlieIgnoredFusion?: boolean;
  type: "action_switched";
  playerId: PlayerId;
  skillId: SkillId;
  skillName: string;
  actionIndex: number;
  before: PlayerAction;
  after: PlayerAction;
  cost: number;
}

export interface ActionCancelledEvent extends BaseGameEvent {
  type: "action_cancelled";
  playerId: PlayerId;
  reason: string;
}

export interface PlayerRenamedEvent extends BaseGameEvent {
  type: "player_renamed";
  playerId: PlayerId;
  name: string;
}

export interface PlayerLeftEvent extends BaseGameEvent {
  type: "player_left";
  playerId: PlayerId;
  name: string;
}

export interface PlayerKickedEvent extends BaseGameEvent {
  type: "player_kicked";
  playerId: PlayerId;
  name: string;
  byPlayerId: PlayerId;
}

export interface SettingsUpdatedEvent extends BaseGameEvent {
  type: "settings_updated";
  byPlayerId: PlayerId;
  config: GameConfig;
}

export interface SkillRevealedEvent extends BaseGameEvent {
  type: "skill_revealed";
  playerId: PlayerId;
  skillId: SkillId;
  skillName: string;
  viewerPlayerId?: PlayerId;
  reason: string;
}

export interface SkillUsedEvent extends BaseGameEvent {
  timingPhase?: SkillTimingPhase;
  type: "skill_used";
  playerId: PlayerId;
  skillId: SkillId;
  skillName: string;
  reason: string;
}

export interface TurnRevealedEvent extends BaseGameEvent {
  type: "turn_revealed";
  actions: Record<PlayerId, PlayerActionPlan>;
}

export interface CakeChangedEvent extends BaseGameEvent {
  type: "cake_changed";
  playerId: PlayerId;
  before: number;
  after: number;
  reason: string;
}

export interface AttackBlockedEvent extends BaseGameEvent {
  type: "attack_blocked";
  sourceId: PlayerId;
  targetId: PlayerId;
  attackName: string;
  defense?: DefenseKind | "gain_cake";
  blockKind?: "block" | "dodge" | "reduce" | "invulnerable" | "shield" | "immune" | "invalid" | "ignored";
  protectionName?: string;
}

export interface AttackReflectedEvent extends BaseGameEvent {
  type: "attack_reflected";
  sourceId: PlayerId;
  originalTargetId: PlayerId;
  reflectedTargetId: PlayerId;
  attackName: string;
}

export interface ReboundBrokenEvent extends BaseGameEvent {
  type: "rebound_broken";
  sourceId: PlayerId;
  targetId: PlayerId;
  attackName: string;
}

export interface ClashEvent extends BaseGameEvent {
  type: "clash";
  attackerAId: PlayerId;
  attackerBId: PlayerId;
  result: string;
}

export interface SettledDamage {
  eventId: string;
  amount: CombatValue;
  pointDefeatLevel?: DefeatLevel;
}

export interface DamageEvent extends BaseGameEvent {
  spellDamage?: true;
  shadowFatalVanish?: true;
  blocksRevival?: true;
  attackDamage?: true;
  sourceAbilityId?: SkillId;
  sourceBigCardInstanceId?: string;
  noReviveOrExtraLives?: boolean;
  purpleNoRevival?: boolean;
  ignoresRevivalSkills?: true;
  amountValue?: CombatValue;
  pointDefeatLevel?: DefeatLevel;
  /** Extra sources for the rebounders' personal skill judgments. */
  reboundSkillSourceIds?: PlayerId[];
  internalDamage?: boolean;
  reflected?: boolean;
  infiniteCopies?: boolean;
  perCopyAmount?: number;
  perCopyAmountValue?: CombatValue;
  type: "damage";
  sourceId?: PlayerId;
  targetId: PlayerId;
  amount: number;
  attackName?: string;
  element?: AttackElement;
  elements?: AttackElement[];
  traits?: AttackTrait[];
}

export interface PendingDamageItem {
  sevenStarAfterhand?: true;
  sevenStarIgnoreShieldId?: string;
  piercesDefenseMoves?: true;
  damagingMove?: true;
  shadowPriority?: true;
  shadowFatalVanish?: true;
  shadowMoveIndex?: number;
  crystalAttackLevel?: import("./engine/combatValues").CombatValue;
  blocksRevival?: true;
  defensePiercing?: true;
  defenseShattering?: true;
  sandArrow?: true;
  xielingDrainRate?: number;
  noRoundRestart?: boolean;
  targetSkillIgnore?: import("./engine/skillIgnore").SkillIgnore;
  attackFamilyKey?: string;
  defenseReward?: CombatValue;
  verdictMoveKey?: string;
  bypassMoveIgnore?: boolean;
  ordinaryAttack?: boolean;
  skillEffect?: true;
  directDefeat?: true;
  sourceAbilityId?: SkillId;
  sourceBigCardInstanceId?: string;
  noReviveOrExtraLives?: boolean;
  purpleNoRevival?: boolean;
  ignoresRevivalSkills?: true;
  bypassDamageReflection?: boolean;
  amountValue?: CombatValue;
  pointDefeatLevel?: DefeatLevel;
  /** Recover the actual settled spell damage for its source; prevented or redirected packets do not pay. */
  drainHealing?: boolean;
  internalDamage?: boolean;
  /** Explicit spell damage, independent of elemental attributes. */
  spellDamage?: boolean;
  unprocessedSpell?: boolean;
  retaliation?: boolean;
  reflected?: boolean;
  actionRebounderIds?: PlayerId[];
  bypassDamageImmunity?: boolean;
  infiniteCopies?: boolean;
  id: string;
  sourceId?: PlayerId;
  targetId: PlayerId;
  amount: number;
  attackName?: string;
  element?: AttackElement;
  elements?: AttackElement[];
  traits?: AttackTrait[];
  fromAttack?: boolean;
  isLastHit?: boolean;
  attackKey?: string;
  attackPower?: number;
  attackPowerValue?: CombatValue;
  redirectedByPlayerIds?: PlayerId[];
  damageModifierIds?: string[];
}

export interface PendingSkillChoice {
  id: string;
  playerId: PlayerId;
  sourcePlayerId: PlayerId;
  skillId: SkillId;
  kind: "steal_skill";
}

export interface HealEvent extends BaseGameEvent {
  amountValue?: CombatValue;
  /** The intended recipient when ordinary healing was claimed by another player. */
  originalTargetId?: PlayerId;
  infinite?: boolean;
  type: "heal";
  sourceId?: PlayerId;
  targetId: PlayerId;
  amount: number;
  reason: string;
  /** Only ordinary healing is affected by amplification, suppression or redirection. */
  recoveryKind?: "healing" | "full_restore" | "revival" | "reentry" | "reappearance" | "conversion";
}

export interface RoundEndedEvent extends BaseGameEvent {
  type: "round_ended";
  reason: string;
}

export interface PlayerDiedEvent extends BaseGameEvent {
  type: "player_died";
  playerId: PlayerId;
  defeatLevel?: DefeatLevel;
  sourceId?: PlayerId;
  sourceAbilityId?: SkillId;
  reason?: string;
}

export interface GameFinishedEvent extends BaseGameEvent {
  type: "game_finished";
  winnerIds: PlayerId[];
}

export interface SystemEvent extends BaseGameEvent {
  probabilityChecks?: { skillId: SkillId; playerId: PlayerId; chance: number;
    attempts: import("./engine/combatValues").CombatValue; successes: import("./engine/combatValues").CombatValue };
  removalKind?: "burn" | "remove" | "discard" | "disappear" | "absorb";
  type: "system";
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export interface SubmitActionResult {
  state: GameState;
  resolved: boolean;
}

export interface MatchSummary {
  id: GameId;
  phase: GamePhase;
  playerNames: string[];
  winnerNames: string[];
  turnNumber: number;
  roundNumber: number;
  updatedAt: number;
}

export interface MatchTrainingSample {
  gameId: GameId;
  at: number;
  playerId: PlayerId;
  playerKind: PlayerKind;
  action: PlayerActionPlan;
  state: PublicGameState;
}
