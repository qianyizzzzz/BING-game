import type { PlayerState } from "../types";
import type { CombatValue } from "./combatValues";
import type { DemonCooldown, DemonKind, DemonOrder } from "./demonIds";

export const BEAST_CARD_ID = "10537";
export const BEAST_HUNT_ID = "1053701";
export const HOUND_SUMMON_ID = "1053702";
export const EAGLE_EYE_ID = "1053703";
export const BEAR_ROAR_ID = "1053704";
export const BEAST_KILL_ID = "1053705";
export const ZOO_CARD_ID = "10655";
export const PIG_ID = "1065502";
export const FEAR_STATE = "beast_fear";
export const BEAR_STATE = "beast_bear_roar";

export interface SummonedEntity {
  kind: "hound" | DemonKind;
  ownerId: string;
  targetId: string;
  side?: "left" | "right";
  tableFrontPlayerId?: string;
  tableZoneAfterPlayerId?: string;
  tableCreationOrder?: number;
  firstTurn: number;
  expiresAtTurn: number;
  attackBuiltTurn?: number;
  demonOrdersFromTurn?: number;
  demonOrder?: DemonOrder;
  demonTargetId?: string;
  demonReadyTurns?: Partial<Record<DemonCooldown, number>>;
  demonPowered?: boolean;
  tyrantDrain?: CombatValue;
}

export function hasPig(player: { bigCards?: PlayerState["bigCards"] } | undefined): boolean {
  return Boolean(player?.bigCards?.some((card) => card.cardId === ZOO_CARD_ID &&
    (!card.onlyAbilityId || card.onlyAbilityId === PIG_ID) && !card.lostAbilityIds?.includes(PIG_ID) &&
    !card.temporarilyLostAbilityIds?.includes(PIG_ID) && !card.junengDisabled));
}

export function isAnimal(player: PlayerState | undefined): boolean {
  return Boolean(player?.entityClasses?.includes("animal") || player?.summon?.kind === "hound" || hasPig(player));
}

export function participantCount(players: readonly PlayerState[]): number {
  return players.filter((player) => player.status === "alive" && player.kind !== "spectator" && !player.summon).length;
}

export function isHound(player: PlayerState | undefined): boolean {
  return Boolean(player?.entityClasses?.includes("hound") && !hasPig(player));
}
