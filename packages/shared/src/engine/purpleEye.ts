import type { AttackStats, GameState, PlayerActionPlan, PlayerId, PlayerState, SkillAction, SkillId } from "../types";
import { PURPLE_FORESIGHT_ID, PURPLE_INSIGHT_ID, PURPLE_LOCK_ID, PURPLE_PIERCE_ID } from "../bigCards/abilities";
import type { BigCardInstance } from "../bigCards/types";
import { getActiveSkillCount } from "./gameFactory";
import { getBigCardLimitedRemaining, getPeriodicUses, invertPeriodicUses, periodicCardUseKey } from "./limitedUseBalance";
import { attackLevelValue, attackPowerValue, combatValue, compareCombatValues, scaleCombatValue,
  withAttackLevel, withAttackPower, projectCombatValue } from "./combatValues";
import type { CombatValue } from "./combatValues";

export const PURPLE_LOST = "purple_eye_temporary_skill_loss";
export const PURPLE_GAINED = "purple_eye_temporary_skill_gain";
export const PURPLE_SCALE_PREFIX = "purple_eye_scale:";
export const PURPLE_REVIVAL_BLOCK = "purple_eye_revival_block";

export interface PurpleInsight {
  round: number;
  sourceCardId: string;
  targetId: PlayerId;
  targetCardId: string;
  abilityId: SkillId;
}

export interface PurpleForesight {
  round: number;
  turn: number;
  viewers: PlayerId[];
  plan?: PlayerActionPlan;
}

export type PurpleForesightView = { mustSubmit: true } | { targets: Array<{ targetId: PlayerId; plan?: PlayerActionPlan }> };

export function currentPurpleForesight(state: GameState, targetId: PlayerId): PurpleForesight | undefined {
  const entry = state.purpleForesights?.[targetId];
  return entry?.round === state.roundNumber && entry.turn === state.turnNumber ? entry : undefined;
}

export function purpleForesightView(state: GameState, viewerId: PlayerId | undefined): PurpleForesightView | undefined {
  if (!viewerId || state.activeTimingPhase !== "turn_before_action" && state.activeTimingPhase !== "turn_action") return undefined;
  const own = currentPurpleForesight(state, viewerId);
  if (own && !own.plan && state.activeTimingPhase === "turn_before_action") return { mustSubmit: true };
  const targets = Object.keys(state.purpleForesights ?? {}).flatMap((targetId) => {
    const entry = currentPurpleForesight(state, targetId);
    if (!entry?.viewers.includes(viewerId)) return [];
    // The declaration includes card instance IDs and selections, never the target's private inventory.
    return [{ targetId, ...(entry.plan ? { plan: entry.plan } : {}) }];
  });
  return targets.length ? { targets } : undefined;
}

export function purpleForesightUses(round: number, card: BigCardInstance): number {
  const max = 1 + Math.floor((round - (card.purpleForesightFirstRound ?? 1)) / 7);
  return getBigCardLimitedRemaining(card, PURPLE_FORESIGHT_ID, max);
}

export function purpleInsightUses(round: number, player: Pick<PlayerState, "buffs">, card: BigCardInstance): number {
  if (round % 3 !== 0) return 0;
  return getPeriodicUses(player, periodicCardUseKey(PURPLE_INSIGHT_ID, card.instanceId), round,
    Number(card.purpleInsightUsedRound !== round));
}

export function invertPurpleInsightUses(round: number, player: PlayerState, card: BigCardInstance): void {
  if (round % 3 !== 0) return;
  invertPeriodicUses(player, periodicCardUseKey(PURPLE_INSIGHT_ID, card.instanceId), round,
    Number(card.purpleInsightUsedRound !== round), 3);
}

export function hasPurplePierce(player: PlayerState | undefined): boolean {
  return getActiveSkillCount(player, PURPLE_PIERCE_ID) > 0;
}

export function hasPurpleLock(player: PlayerState | undefined): boolean {
  return getActiveSkillCount(player, PURPLE_LOCK_ID) > 0;
}

export function validPurpleValue(base: CombatValue, requested: unknown): requested is number {
  if (typeof requested !== "number" || !Number.isSafeInteger(requested)) return false;
  const value = combatValue(requested);
  const limit = scaleCombatValue(base, 5);
  return compareCombatValues(limit, []) < 0 ? compareCombatValues(value, limit) >= 0 && requested <= 0 :
    compareCombatValues(value, limit) <= 0 && requested >= 0;
}

export function applyPurpleScale(stats: AttackStats, values: Pick<SkillAction, "purplePower" | "purpleLevel">): AttackStats {
  let result = stats;
  if (!stats.nonAttackMove && !stats.fixedPointPower && validPurpleValue(attackPowerValue(stats), values.purplePower)) {
    const power = combatValue(values.purplePower);
    result = withAttackPower(result, power);
    result.traits = result.traits.filter((trait) => !trait.startsWith("defeat_"));
    if (stats.damageParts) {
      result.damagePartValues = stats.damageParts.map((part, index) => index === 0 || stats.repeatedDamageParts ? power :
        stats.damagePartValues?.[index] ?? combatValue(part));
      result.damageParts = result.damagePartValues.map(projectCombatValue);
    }
  }
  if (validPurpleValue(attackLevelValue(stats), values.purpleLevel)) result = withAttackLevel(result, combatValue(values.purpleLevel));
  return result;
}
