import type { GameState, PlayerId, PlayerState } from "../types";
import { isVirtualCombatPlayer, SKY_PLAYER_ID } from "./sky";
import { UTOPIA_MOVE_ID } from "../bigCards/abilities";
import { findPlayer, getActiveSkillCount } from "./gameFactory";
import { hasWindTrace } from "./ultimateWind";
import { emptyCityBodies, refreshEmptyCitySuspension } from "./illusionRules";
import { EAGLE_EYE_ID } from "./beastTraits";
import { tianyeSoaringStateIsActive } from "./tianye";
import { TIAN_YE_SOARING_STATE } from "./tianyeIds";

type SpaceContext = Pick<GameState, "players" | "smallSpaces"> & Partial<Pick<GameState, "totems" | "turnNumber">>;

export function shareSpace(a: PlayerState | undefined, b: PlayerState | undefined): boolean {
  return Boolean(a && b && a.spaceId === b.spaceId);
}

export function playersInSpace(state: Pick<GameState, "players">, playerId: PlayerId): PlayerState[] {
  const source = state.players.find((player) => player.id === playerId);
  return state.players.filter((player) => shareSpace(source, player));
}

export function isDreamSpace(state: Pick<GameState, "smallSpaces">, player: Pick<PlayerState, "spaceId">): boolean {
  return Boolean(player.spaceId && state.smallSpaces?.[player.spaceId]?.kind === "dream_utopia");
}

export function isSoulExiled(state: Pick<GameState, "smallSpaces">, player: Pick<PlayerState, "spaceId"> | undefined): boolean {
  return Boolean(player?.spaceId && state.smallSpaces?.[player.spaceId]?.kind === "soul_exile");
}

export function isInYuanVoidSpace(state: Pick<GameState, "smallSpaces">, player: Pick<PlayerState, "spaceId"> | undefined): boolean {
  return Boolean(player?.spaceId && state.smallSpaces?.[player.spaceId]?.kind === "yuan_void");
}

export function canAffectAcrossSpace(state: SpaceContext & Pick<GameState, "spaceBurstBridges">, sourceId: PlayerId | undefined, targetId: PlayerId): boolean {
  const source = sourceId ? findPlayer(state, sourceId) : undefined;
  const target = findPlayer(state, targetId);
  if (isSoulExiled(state, source)) return false;
  if (state.spaceBurstBridges?.some((entry) => entry.sourceId === sourceId && entry.targetId === targetId)) return true;
  if (isSoulExiled(state, target)) return false;
  const sourceTotem = state.totems?.find((totem) => totem.id === sourceId);
  const targetTotem = state.totems?.find((totem) => totem.id === targetId);
  if (targetTotem) return targetTotem.expiresAtTurn > (state.turnNumber ?? 0) &&
    (sourceId !== SKY_PLAYER_ID && isVirtualCombatPlayer(sourceId) || Boolean(source && source.spaceId === targetTotem.spaceId));
  if (sourceTotem) return Boolean(target && target.spaceId === sourceTotem.spaceId);
  if (target?.emptyCityOwnerId) return !target.spaceId || isVirtualCombatPlayer(sourceId) || sourceId === target.id ||
    canBypassTargetSelection(state, sourceId, target);
  if (isVirtualCombatPlayer(sourceId) || isVirtualCombatPlayer(targetId)) return true;
  if (!source || shareSpace(source, target) || hasWindTrace(target, sourceId)) return true;
  return Boolean(target && getActiveSkillCount(source, UTOPIA_MOVE_ID) > 0 &&
    (!source.spaceId || isDreamSpace(state, source)) && (!target.spaceId || isDreamSpace(state, target)));
}

export function canBypassTargetSelection(state: Pick<GameState, "players">, sourceId: PlayerId | undefined, target: PlayerState | undefined): boolean {
  return getActiveSkillCount(state.players.find((player) => player.id === sourceId), EAGLE_EYE_ID) > 0 || hasWindTrace(target, sourceId) ||
    Boolean(target?.emptyCityOwnerId && hasWindTrace(findPlayer(state, target.emptyCityOwnerId), sourceId));
}

export function preventsTargetSelection(player: { buffs?: PlayerState["buffs"]; bigCards?: PlayerState["bigCards"] } | undefined): boolean {
  if (!player?.buffs) return false;
  const { buffs, bigCards } = player;
  return buffs.some((buff) => buff.preventsTargetSelection &&
    (buff.stateType !== TIAN_YE_SOARING_STATE || tianyeSoaringStateIsActive({ buffs, ...(bigCards ? { bigCards } : {}) }, buff)));
}

export function reachableEmptyCityBodies(state: SpaceContext, sourceId: PlayerId): PlayerState[] {
  return emptyCityBodies(state).filter((body) => canAffectAcrossSpace(state, sourceId, body.id));
}

export function playersInMoveReach(state: SpaceContext, sourceId: PlayerId): PlayerState[] {
  return state.players.filter((target) => canAffectAcrossSpace(state, sourceId, target.id));
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
export function withPlayerSpace<T>(state: GameState, playerId: PlayerId, effect: () => T, scope: "local" | "moves" | "combat" | "global" = "local"): T {
  const all = state.players;
  const player = all.find((item) => item.id === playerId);
  if (scope === "global" || !player || all.every((item) => item.spaceId === player.spaceId)) return effect();
  const occupants = playersInSpace(state, playerId);
  const local = scope === "moves" ? playersInMoveReach(state, playerId) :
    scope === "combat" ? all.filter((target) => occupants.some((source) =>
      source.status === "alive" && canAffectAcrossSpace(state, source.id, target.id)) || shareSpace(player, target)) : occupants;
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
    if (all.some((item) => item.emptyCitySkillsSuspended || item.emptyCityRecovery) ||
      state.players.some((item) => item.emptyCitySkillsSuspended || item.emptyCityRecovery)) refreshEmptyCitySuspension(state);
  }
}
