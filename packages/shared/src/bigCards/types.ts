/** Stable IDs from 技能ID对照表; existing small-skill IDs remain separate. */
export type BigCardId = string;
export type BigCardAbilityId = string;

export interface BigCardAbilityDefinition {
  id: BigCardAbilityId;
  order: number;
  description: string;
  implementedRules?: string;
  sourceCell: string;
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
  verdictProgress?: { wins: number; losses: number; streak: number };
  junengDisabled?: boolean;
  junengResponse?: { disabledRound: number; duration: number; multiplier: number; divisor: number; started?: boolean };
  onlyAbilityId?: BigCardAbilityId;
  abilityUses?: Record<BigCardAbilityId, number>;
  abilityUseBonuses?: Record<BigCardAbilityId, number>;
  grantedSkillUses?: Record<string, number>;
  borrowedUntilRound?: number;
  publiclyRevealed?: boolean;
  openingCopyAvailable?: boolean;
  lostAbilityIds?: BigCardAbilityId[];
  guidanceDamageRemainder?: number;
  guidanceHealingRemainder?: number;
  guidanceHealingUses?: number;
  guidanceHealingUnlimited?: boolean;
  instanceId: string;
  cardId: BigCardId;
  initialized?: boolean;
  jihanDamage?: number;
  jihanBlocks?: number;
  jihanSeals?: number;
}
