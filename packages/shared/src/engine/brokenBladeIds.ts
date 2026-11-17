import type { BigCardInstance } from "../bigCards/types";
import type { JudgmentRank } from "./judgmentRank";

export const BROKEN_BLADE_CARD_ID = "10558";
export const BLADE_REVIVAL_ID = "1055801";
export const BLADE_INHERIT_ID = "1055802";
export const BLADE_REWARD_ID = "1055803";
export const BLADE_ROUND_ID = "1055804";
export const BLADE_MAINTENANCE_IDS = ["1055805", "1055806", "1055807", "1055808"] as const;
export const BLADE_QINGGANG_ID = "1029";
export const BLADE_DOUBLE_EDGE_ID = "1030";

export type BrokenBladeTier = 0 | 1 | 2 | 3 | 4;
export interface BrokenBladeState {
  tier: BrokenBladeTier;
  /** Null is an unlimited allowance. */
  remaining: number | null;
  fusionInstanceId?: string;
}

export const BROKEN_BLADE_TIERS: ReadonlyArray<{ name: string; rank: JudgmentRank; maxUses: number | null }> = [
  { name: "青釭剑", rank: "I", maxUses: 10 },
  { name: "破天圣剑", rank: "II", maxUses: 25 },
  { name: "锋利的破天圣剑", rank: "III", maxUses: 50 },
  { name: "极·破天圣剑", rank: "IV", maxUses: 100 },
  { name: "真·破天圣剑", rank: "V", maxUses: null }
];

export function isBrokenBladeMaintenance(skillId: string): boolean {
  return BLADE_MAINTENANCE_IDS.some((id) => skillId === id || skillId === `${id}_reforge`);
}

export function getBrokenBlade(card: BigCardInstance): BrokenBladeState {
  return card.brokenBlade ?? { tier: 0, remaining: 10 };
}

export function brokenBladeGrants(card: BigCardInstance): readonly string[] {
  return card.inheritedSkillInstances?.[BLADE_INHERIT_ID] ?? [];
}

export function isBoundBrokenBladeFusion(cards: readonly BigCardInstance[] | undefined, fusionId: string): boolean {
  return cards?.some((card) => card.brokenBlade?.fusionInstanceId === fusionId) ?? false;
}
