import type { BigCardInstance } from "../bigCards/types";
import type { BuffState, GameState, PlayerActionPlan, PlayerId, PlayerState, SkillId } from "../types";
import type { AttackInstance } from "./resolver";
import { BUBBLE_AVENGER, BUBBLE_DESTINY, BUBBLE_DREAM_CARD, BUBBLE_ENHANCED_MOVE, BUBBLE_ENHANCE_STOCK, BUBBLE_FATE,
  BUBBLE_FINALE, BUBBLE_FORGET, BUBBLE_FORCED_TARGET, BUBBLE_NO_RESTART, BUBBLE_REBUILD, BUBBLE_REBUILD_STOCK,
  BUBBLE_VENGEANCE_STOCK, BUBBLE_WITCH } from "./bubbleDreamIds";

export interface BubbleDreamHit {
  attack: AttackInstance;
  plans: Record<PlayerId, PlayerActionPlan>;
  isLastHit: boolean;
  fromClash: boolean;
  parts: import("./combatValues").CombatValue[];
}

const triggeredAbilities = [BUBBLE_AVENGER, BUBBLE_WITCH, BUBBLE_DESTINY, BUBBLE_FORGET, BUBBLE_REBUILD, BUBBLE_FINALE];

/** Returns true exactly once, when a whole copy has seen all six other lines take effect. */
export function markBubbleDreamCard(card: BigCardInstance, abilityId: SkillId): boolean {
  if (card.cardId !== BUBBLE_DREAM_CARD || card.onlyAbilityId || card.lostAbilityIds?.includes(BUBBLE_FATE) ||
    card.temporarilyLostAbilityIds?.includes(BUBBLE_FATE) || !triggeredAbilities.includes(abilityId)) return false;
  const triggered = card.bubbleDreamTriggered ??= [];
  if (triggered.includes(abilityId)) return false;
  triggered.push(abilityId);
  return triggeredAbilities.every((id) => triggered.includes(id));
}

export function bubbleDreamStock(player: Pick<PlayerState, "buffs">, id: typeof BUBBLE_VENGEANCE_STOCK | typeof BUBBLE_REBUILD_STOCK): number {
  return player.buffs.find((buff) => buff.id === id)?.stacks ?? 0;
}

export function bubbleDreamEnhancement(player: Pick<PlayerState, "buffs">, instanceId?: string): BuffState | undefined {
  return player.buffs.find((buff) => buff.stateType === BUBBLE_ENHANCE_STOCK && buff.stacks > 0 &&
    (!instanceId || buff.sourceBigCardInstanceId === instanceId));
}

export function bubbleDreamMoveEnhanced(player: Pick<PlayerState, "buffs">, index: number, turn: number): boolean {
  return player.buffs.some((buff) => buff.stateType === BUBBLE_ENHANCED_MOVE && buff.attackActionIndex === index && buff.expiresAtTurn === turn + 1);
}

export function bubbleDreamForcedTargets(player: Pick<PlayerState, "buffs">): PlayerId[] {
  return [...new Set(player.buffs.flatMap((buff) => buff.stateType === BUBBLE_FORCED_TARGET && buff.sourcePlayerId ? [buff.sourcePlayerId] : []))];
}

export function bubbleDreamStopsRestart(state: Pick<GameState, "players" | "turnNumber">): boolean {
  return state.players.some((player) => player.buffs.some((buff) => buff.id.startsWith(`${BUBBLE_NO_RESTART}:`) &&
    (buff.startsAtTurn ?? 0) <= state.turnNumber && (buff.expiresAtTurn ?? 0) > state.turnNumber));
}

export function pruneBubbleDream(state: Pick<GameState, "players" | "turnNumber">): void {
  for (const player of state.players) for (const card of player.bigCards ?? []) {
    const rebuild = card.bubbleDreamRebuild;
    if (!rebuild) continue;
    if (rebuild.endTurn <= state.turnNumber) delete card.bubbleDreamRebuild;
    else if (rebuild.firstTurn <= state.turnNumber) rebuild.active = true;
    else delete rebuild.active;
  }
}

export function bubbleDreamHitChoices(state: Pick<GameState, "bubbleDreamHits">, playerId: PlayerId) {
  return (state.bubbleDreamHits ?? []).filter(({ attack }) => attack.targetId === playerId).map(({ attack }) => ({
    id: attack.key, label: attack.stats.name, sourceId: attack.sourceId
  }));
}
