import { negativeStatusesHaveNoEffect } from "./effectCategories";
import { THORN_POISON } from "./thornDanceIds";
import { isSkillIgnored } from "./skillIgnore";
import type { GameState, PlayerId, PlayerState, SkillAction } from "../types";
import { createBaseEvent, createId } from "./gameFactory";
import { getCombatSeatGroups, getCombatSeats, hasInfiniteCombatSeat } from "./seating";
import { TOTEM_CHOOSE_ID, TOTEM_KINDS, TOTEM_RANGES, type TotemKind, type TotemRange } from "./totemIds";

export interface AncestralTotem {
  id: string;
  ownerId: PlayerId;
  primaryTargetId: PlayerId;
  range: TotemRange;
  kind: TotemKind;
  spaceId?: string;
  tableZoneAfterPlayerId?: PlayerId;
  firstTurn: number;
  expiresAtTurn: number;
  lastTickTurn?: number;
  rewardedDeaths?: Record<PlayerId, string>;
}

type TotemContext = Pick<GameState, "players" | "totems" | "turnNumber">;

export function getTotemTargets(state: Pick<GameState, "players">, totem: AncestralTotem): PlayerState[] {
  const seats = getCombatSeatGroups(state, totem.spaceId);
  const index = seats.findIndex((group) => group.some(({ id }) => id === totem.primaryTargetId));
  if (index < 0) return [];
  if (hasInfiniteCombatSeat(seats[index]?.[0])) return seats[index]!;
  const finite = seats.filter((group) => !hasInfiniteCombatSeat(group[0]));
  const offsets = totem.range === "both" ? [-1, 0, 1] : totem.range === "left" ? [-1, 0] :
    totem.range === "right" ? [0, 1] : [0];
  return [...new Set(offsets.flatMap((offset) => finite[(index + offset + finite.length) % finite.length]!))];
}

export function activeTotems(state: Pick<GameState, "totems" | "turnNumber">): AncestralTotem[] {
  return (state.totems ?? []).filter((totem) => totem.expiresAtTurn > state.turnNumber);
}

export function totemsCovering(
  state: TotemContext, player: PlayerState | undefined, kind: TotemKind
): AncestralTotem[] {
  if (!player || isSkillIgnored(player, TOTEM_KINDS[kind].id)) return [];
  return activeTotems(state).filter((totem) => totem.kind === kind && totem.spaceId === player.spaceId &&
    getTotemTargets(state, totem).includes(player));
}

export function hasActivePoison(player: PlayerState, state: Pick<GameState, "turnNumber" | "roundNumber">): boolean {
  return !negativeStatusesHaveNoEffect(player) && player.buffs.some((buff) => buff.stateType === THORN_POISON &&
    (buff.expiresAtTurn ?? Infinity) > state.turnNumber && (buff.expiresAtRound ?? Infinity) > state.roundNumber);
}

export function poisonTotemPreventsAttacks(state: GameState, player: PlayerState): boolean {
  return hasActivePoison(player, state) && totemsCovering(state, player, "poison").length > 0;
}

export function successfulTotemMoveRolls(
  state: GameState, player: PlayerState | undefined, kind: "sun" | "wing", moveKey: string
): AncestralTotem[] {
  const totems = totemsCovering(state, player, kind);
  if (!totems.length) return [];
  if (state.totemMoveRolls?.turnNumber !== state.turnNumber) state.totemMoveRolls = { turnNumber: state.turnNumber, results: {} };
  const rolls = state.totemMoveRolls.results;
  return totems.filter(({ id }) => rolls[id + ":" + moveKey] ??= Math.random() < 0.5);
}

export function rollTotemMove(state: GameState, player: PlayerState | undefined, kind: "sun" | "wing", moveKey: string): boolean {
  return successfulTotemMoveRolls(state, player, kind, moveKey).length > 0;
}

export function targetableTotems(state: TotemContext, player: Pick<PlayerState, "spaceId"> | undefined): AncestralTotem[] {
  return player ? activeTotems(state).filter((totem) => totem.spaceId === player.spaceId) : [];
}

export function validTotemCreation(state: Pick<GameState, "players">, source: PlayerState, action: SkillAction): boolean {
  const seats = getCombatSeats(state, source.spaceId);
  return Boolean(action.totemRange && Object.hasOwn(TOTEM_RANGES, action.totemRange) &&
    seats.some(({ id }) => id === action.targetId) &&
    (action.totemAfterId === undefined || seats.some(({ id }) => id === action.totemAfterId)) &&
    (action.skillId === TOTEM_CHOOSE_ID ? action.totemKind && Object.hasOwn(TOTEM_KINDS, action.totemKind) :
      action.totemKind === undefined));
}

export function placeAncestralTotem(state: GameState, source: PlayerState, action: SkillAction): void {
  if (!validTotemCreation(state, source, action) || !action.targetId || !action.totemRange) return;
  const kinds = Object.keys(TOTEM_KINDS) as TotemKind[];
  const kind = action.totemKind ?? kinds[Math.floor(Math.random() * kinds.length)]!;
  const after = state.players.find(({ id }) => id === action.totemAfterId);
  const zone = after?.summon?.tableZoneAfterPlayerId ?? (after?.summon ? undefined : after?.id);
  (state.totems ??= []).push({ id: createId("totem"), ownerId: source.id, primaryTargetId: action.targetId,
    range: action.totemRange, kind, firstTurn: state.turnNumber, expiresAtTurn: state.turnNumber + 30,
    ...(source.spaceId ? { spaceId: source.spaceId } : {}), ...(zone ? { tableZoneAfterPlayerId: zone } : {}) });
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: source.name + " 创建了" + TOTEM_KINDS[kind].name });
}

export function hitAncestralTotem(state: GameState, totem: AncestralTotem): void {
  const expiry = state.turnNumber + 3;
  if (expiry >= totem.expiresAtTurn) return;
  totem.expiresAtTurn = expiry;
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: TOTEM_KINDS[totem.kind].name + "被单体攻击命中，将在3回合后消失" });
}
