import { bigCardHasAbility, JIHAN_DAMAGE_GROWTH_ID, JIHAN_INHERIT_ID } from "../bigCards/abilities";
import { isBigSkillMode } from "../modes";
import { INFINITE_DAMAGE, type GameState, type PendingDamageItem, type PlayerId, type PlayerState } from "../types";
import { ALL_SKILLS_SEALED_BUFF_ID } from "./effectCategories";
import { findPlayer, getActiveSkillCount } from "./gameFactory";

export function getJihanCards(player: PlayerState | undefined, abilityId: string) {
  const cards = player?.bigCards?.filter((card) => bigCardHasAbility(card, abilityId)) ?? [];
  return cards.length > 0 && getActiveSkillCount(player, abilityId) > 0 ? cards : [];
}

export function jihanScaledValue(base: number, growth: number, limit: number): number {
  return base + growth > limit ? INFINITE_DAMAGE : base + growth;
}

export function getJihanReboundDamageSources(state: GameState, item: PendingDamageItem): PlayerId[] {
  if (!isBigSkillMode(state.config.skillMode) || !item.fromAttack || !item.actionRebounderIds) return [];
  return [...new Set(item.actionRebounderIds)].filter((id) => id !== item.sourceId &&
    getJihanCards(findPlayer(state, id), JIHAN_INHERIT_ID).length > 0);
}

export function recordJihanDamage(source: PlayerState | undefined, amount: number): void {
  for (const card of getJihanCards(source, JIHAN_DAMAGE_GROWTH_ID)) {
    card.jihanDamage = Math.min(100, (card.jihanDamage ?? 0) + amount);
  }
}

export function applyJihanSkillSeal(state: GameState, sourceId: PlayerId, target: PlayerState, duration: number,
  unit: "turn" | "round"): void {
  const id = `${ALL_SKILLS_SEALED_BUFF_ID}:${unit}`;
  const boundary = unit === "turn" ? "expiresAtTurn" : "expiresAtRound";
  const infinite = duration >= INFINITE_DAMAGE;
  const expiry = (unit === "turn" ? state.turnNumber + 1 : state.roundNumber) + duration;
  const existing = target.buffs.find((buff) => buff.id === id);
  if (existing) {
    existing.stacks = Math.max(existing.stacks, duration);
    if (infinite) {
      existing.infinite = true;
      delete existing[boundary];
    } else if (!existing.infinite) {
      existing[boundary] = Math.max(existing[boundary] ?? 0, expiry);
    }
  } else {
    target.buffs.push({ id, name: "技能封锁", stateType: ALL_SKILLS_SEALED_BUFF_ID, stacks: duration,
      sourcePlayerId: sourceId, ...(infinite ? { infinite } : { [boundary]: expiry }) });
  }
}
