/** Stable IDs from 技能ID对照表; existing small-skill IDs remain separate. */
export type BigCardId = string;
export type BigCardAbilityId = string;

export interface BigCardAbilityDefinition {
  id: BigCardAbilityId;
  order: number;
  description: string;
  implementedRules?: string;
  sourceCell: string;
  typeTags?: import("../skills/types").SkillTypeTag[];
}

export interface BigCardCatalogEntry {
  id: BigCardId;
  name: string;
  kind: "native" | "fusion";
  /** Numbering group; rare judgment-rank exceptions will be implemented separately. */
  rankCode: string;
  sourceGroup: string;
  attribute: string;
  sourceRow: number;
  abilities: BigCardAbilityDefinition[];
}

export interface BigCardDefinition extends BigCardCatalogEntry {
  implemented: boolean;
  implementationStatus: "pending" | "partial" | "implemented";
}

export interface BigCardInstance {
  nineColdLight?: { turn: number; used: number };
  nineTribulationWounds?: number;
  nineTribulationMisses?: Record<string, number>;
  nineFateReturnRound?: number;
  starMoonTemporary?: true;
  eraRestartUsed?: true;
  bubbleDreamTriggered?: BigCardAbilityId[];
  bubbleDreamRebuild?: { firstTurn: number; endTurn: number; active?: true };
  tianyeLastWing?: import("../engine/tianyeIds").TianyeWing;
  brokenBlade?: import("../engine/brokenBladeIds").BrokenBladeState;
  decayDamage?: import("../engine/combatValues").CombatValue;
  decayUnlocked?: true;
  demonGrantStartTurn?: number;
  deadRealmUnlocked?: true;
  deadRealmGuardReadyRound?: number;
  tigerForms?: import("../engine/cardForms").CardForms<import("../engine/netherTigerIds").TigerForm>;
  fiveElementsForms?: import("../engine/fiveElementsIds").FiveElementsForms;
  hexagramForms?: import("../engine/hexagramIds").HexagramForms;
  hexagramSpentStars?: number;
  hexagramRestores?: number;
  hexagramSpiritWounds?: 1;
  sevenStarForms?: import("../engine/sevenStarIds").SevenStarForms;
  tianShaCrowded?: boolean;
  sevenStarLegacy?: { giverId: string; recipientId: string };
  bearReadyRound?: number;
  gameSwitchWins?: number;
  gameSwitchWinsByMode?: Partial<Record<import("../engine/gameSwitch").GameSwitchMode, number>>;
  sacredBeasts?: Partial<Record<import("../engine/honghuang").SacredBeast, import("../engine/honghuang").SacredBeastState>>;
  mountainSealReadyRound?: number;
  acquisitionOrder?: number;
  verdictProgress?: { wins: number; losses: number; streak: number };
  godKingProgress?: { results: Record<string, "win" | "loss">; attacks?: number; misses?: number;
    deaths?: number; retirements?: number; wounds?: number; round: number; lastCakeRewardRound?: number };
  junengDisabled?: boolean;
  junengResponse?: { disabledRound: number; duration: number; multiplier: number; divisor: number; started?: boolean };
  onlyAbilityId?: BigCardAbilityId;
  abilityUses?: Record<BigCardAbilityId, number>;
  abilityUseBonuses?: Record<BigCardAbilityId, number>;
  /** Signed changes to a remaining-use balance that are not skill uses. */
  abilityUseBalanceAdjustments?: Record<BigCardAbilityId, number>;
  grantedSkillUses?: Record<string, number>;
  wujinGrantInventory?: Record<BigCardAbilityId, string[]>;
  jueyingGrantInventory?: Record<BigCardAbilityId, string[]>;
  chaofanGrantInventory?: Record<BigCardAbilityId, string[]>;
  xielingGrantInventory?: string[];
  xielingCooldown?: { remaining: number; castTurn: number };
  jueyingDeathHealing?: number;
  borrowedUntilRound?: number;
  temporarilyLostAbilityIds?: BigCardAbilityId[];
  inheritedSkillInstances?: Partial<Record<BigCardAbilityId, string[]>>;
  fallenSplendorStage?: number;
  fallenSplendorAppliedStages?: BigCardAbilityId[];
  purpleForesightFirstRound?: number;
  purpleInsightUsedRound?: number;
  purpleTemporaryGrant?: true;
  publiclyRevealed?: boolean;
  openingCopyAvailable?: boolean;
  lostAbilityIds?: BigCardAbilityId[];
  guidanceDamageRemainder?: number;
  guidanceHealingRemainder?: number;
  guidanceHealingUses?: number;
  charityHealingRefunds?: number;
  charityQuickUses?: { round: number; count: number };
  guidanceHealingUnlimited?: boolean;
  instanceId: string;
  cardId: BigCardId;
  initialized?: boolean;
  jihanDamage?: number;
  jihanBlocks?: number;
  jihanSeals?: number;
}
