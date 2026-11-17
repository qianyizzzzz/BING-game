import type { GameState, PlayerId } from "../types";
import { createBaseEvent, findPlayer } from "./gameFactory";
import { moonCakeGainMultiplier } from "./moon";

export function changeCakes(
  state: GameState,
  playerId: PlayerId,
  nextCakes: number,
  reason: string,
  origin?: "action" | "restore" | { actionCakeDelta: number }
): void {
  const player = findPlayer(state, playerId);
  if (!player) return;
  const before = player.cakes;
  const multiplier = nextCakes > before && (origin === undefined || origin === "action")
    ? moonCakeGainMultiplier(player, state.roundNumber) : 1;
  player.cakes = Math.max(0, multiplier === 1 ? nextCakes : Math.min(Number.MAX_SAFE_INTEGER, before + (nextCakes - before) * multiplier));
  if (player.actionCakes !== undefined) {
    const added = origin === "action" ? Math.max(0, player.cakes - before) : typeof origin === "object" ? origin.actionCakeDelta : 0;
    // Spends draw from other sources first. Reversing a receipt restores its original sources.
    player.actionCakes = Math.max(0, Math.min(player.cakes, player.actionCakes + added));
  }
  if (before !== player.cakes) state.eventLog.push({
    ...createBaseEvent(state, "cake_changed"), type: "cake_changed",
    playerId, before, after: player.cakes, reason
  });
}
