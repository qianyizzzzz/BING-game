import type { GameState, PlayerId, PlayerState } from "../types";

export function shareSpace(a: PlayerState | undefined, b: PlayerState | undefined): boolean {
  return Boolean(a && b && a.spaceId === b.spaceId);
}

export function playersInSpace(state: Pick<GameState, "players">, playerId: PlayerId): PlayerState[] {
  const source = state.players.find((player) => player.id === playerId);
  return state.players.filter((player) => shareSpace(source, player));
}

export function canAffectAcrossSpace(state: Pick<GameState, "players">, sourceId: PlayerId | undefined, targetId: PlayerId): boolean {
  const source = sourceId ? state.players.find((player) => player.id === sourceId) : undefined;
  return !source || shareSpace(source, state.players.find((player) => player.id === targetId));
}

export function getSpaceCakeMultiplier(state: Pick<GameState, "smallSpaces">, player: PlayerState): number {
  return (player.spaceId ? state.smallSpaces?.[player.spaceId]?.cakeMultiplier ?? 1 : 1) *
    3 ** player.buffs.filter((buff) => buff.stateType === "kuiji_cake_growth").length;
}

export function getSpaceReversal(state: GameState, playerId: PlayerId): GameState["reversalState"] {
  const spaceId = state.players.find((player) => player.id === playerId)?.spaceId;
  return spaceId ? state.spaceReversalStates?.[spaceId] : state.reversalState;
}

export function isReversalResponseRestricted(state: GameState, playerId: PlayerId): boolean {
  return Boolean(state.reversalResponseOnly && getSpaceReversal(state, playerId)?.turnNumber === state.turnNumber);
}

/** Run a synchronous effect with only the players it can see. Keep any new occupants in the same space. */
export function withPlayerSpace<T>(state: GameState, playerId: PlayerId, effect: () => T): T {
  const all = state.players;
  const player = all.find((item) => item.id === playerId);
  if (!player || all.every((item) => item.spaceId === player.spaceId)) return effect();
  const local = playersInSpace(state, playerId);
  const localIds = new Set(local.map((item) => item.id));
  state.players = local;
  try {
    return effect();
  } finally {
    const updated = state.players;
    const byId = new Map(updated.map((item) => [item.id, item]));
    const existingIds = new Set(all.map((item) => item.id));
    state.players = all.flatMap((item) => localIds.has(item.id) ? (byId.has(item.id) ? [byId.get(item.id)!] : []) : [item]);
    for (const occupant of updated.filter((item) => !existingIds.has(item.id))) {
      if (player.spaceId) occupant.spaceId = player.spaceId;
      state.players.push(occupant);
    }
  }
}
