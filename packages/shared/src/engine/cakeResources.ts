import type { GameState, PlayerId } from "../types";
import { createBaseEvent, findPlayer } from "./gameFactory";

export function changeCakes(
  state: GameState,
  playerId: PlayerId,
  nextCakes: number,
  reason: string,
  origin?: "action" | { actionCakeDelta: number }
): void {
  const player = findPlayer(state, playerId);
  if (!player) return;
  const before = player.cakes;
  player.cakes = Math.max(0, nextCakes);
  if (player.actionCakes !== undefined) {
    const added = origin === "action" ? Math.max(0, player.cakes - before) : origin?.actionCakeDelta ?? 0;
    // Spends draw from other sources first. Reversing a receipt restores its original sources.
    player.actionCakes = Math.max(0, Math.min(player.cakes, player.actionCakes + added));
  }
  if (before !== player.cakes) state.eventLog.push({
    ...createBaseEvent(state, "cake_changed"), type: "cake_changed",
    playerId, before, after: player.cakes, reason
  });
}
