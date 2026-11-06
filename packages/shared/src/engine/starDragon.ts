import { DRAGON_BLOOD_FIELD_ID, STAR_RESIST_ID } from "../bigCards/abilities";
import type { SkillDefinition } from "../skills/types";
import type { AttackStats, GameState, PendingDamageItem, PlayerAction, PlayerId, PlayerState } from "../types";
import { INFINITY_VALUE, addCombatValues, combatValue, compareCombatValues, subtractCombatValues, withAttackLevel,
  withAttackPower, type CombatValue } from "./combatValues";
import { pendingDamageValue } from "./damageKinds";
import { getSkillActivationKind } from "./effectCategories";
import { getActiveSkillCount } from "./gameFactory";
import { getPlayerHpValue } from "./infiniteValues";
import { playersInSpace } from "./spaces";

export function getDefenseTotal(player: Pick<PlayerState, "buffs">): CombatValue {
  return player.buffs.filter((buff) => buff.id === "defense_value").reduce<CombatValue>((total, buff) =>
    addCombatValues(total, buff.defenseValue ?? (buff.infinite ? INFINITY_VALUE : combatValue(buff.stacks))), []);
}

export function canUseStarResistance(player: PlayerState): boolean {
  return getActiveSkillCount(player, STAR_RESIST_ID) > 0 && compareCombatValues(getDefenseTotal(player), []) > 0;
}

export function isStarResistible(item: PendingDamageItem): boolean {
  return item.pointDefeatLevel === 2 || (!item.pointDefeatLevel && !item.unprocessedSpell &&
    compareCombatValues(pendingDamageValue(item), []) > 0 && compareCombatValues(pendingDamageValue(item), INFINITY_VALUE) <= 0);
}

export function getDragonBloodTotal(state: Pick<GameState, "players">, playerId: PlayerId): CombatValue {
  return playersInSpace(state, playerId).filter((player) => player.status === "alive" && player.kind !== "spectator")
    .reduce<CombatValue>((total, player) => addCombatValues(total, getPlayerHpValue(player)), []);
}

export function getDragonBloodMode(total: CombatValue): "area" | "heal" | "single" {
  if (compareCombatValues(total, combatValue(60)) <= 0) return "area";
  return compareCombatValues(total, combatValue(100)) <= 0 ? "heal" : "single";
}

export function shapeDragonBloodAttack(state: Pick<GameState, "players">, playerId: PlayerId,
  action: PlayerAction, stats: AttackStats): AttackStats | undefined {
  if (action.type !== "skill" || action.skillId !== DRAGON_BLOOD_FIELD_ID) return stats;
  const total = action.dragonBloodTotal ?? getDragonBloodTotal(state, playerId);
  const mode = getDragonBloodMode(total);
  if (mode === "heal") return undefined;
  const area = mode === "area";
  const value = area ? subtractCombatValues(combatValue(60), total) : subtractCombatValues(total, combatValue(95));
  return withAttackLevel(withAttackPower({ ...stats, isArea: area, defenseTag: area ? "youtiao" : "stone",
    traits: area ? [...stats.traits, "area"] : stats.traits }, value), value);
}

export function ignoresOtherActiveSkill(target: PlayerState | undefined, sourceId: PlayerId | undefined,
  skill: Pick<SkillDefinition, "timingPhases"> | undefined): boolean {
  return Boolean(target && sourceId && sourceId !== target.id && skill && getSkillActivationKind(skill) === "active" &&
    target.buffs.some((buff) => buff.stateType === "dragon_active_immunity"));
}
