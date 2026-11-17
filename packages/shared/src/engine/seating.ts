import type { GameState, PlayerId, PlayerState } from "../types";
import { hasSkillTypeTag } from "../skills/registry";
import { isSkillIgnorable } from "./skillIgnore";
import { canBypassTargetSelection } from "./spaces";
import { tianyeSoaringStateIsActive } from "./tianye";
import { TIAN_YE_SOARING_STATE } from "./tianyeIds";

type SeatingState = Pick<GameState, "players" | "shadowInsertedSeats">;

/** Freeze the table layout before the rules insert or reorder combatants. */
export function initializeTableSeats(state: Pick<GameState, "players">): void {
  const players = state.players.filter((player) => player.kind !== "spectator" && !player.summon);
  players.forEach((player, index) => { player.tableSeat ??= index; });
}

export function getTablePlayers(state: Pick<GameState, "players">): PlayerState[] {
  return state.players.filter((player) => player.kind !== "spectator" && !player.summon)
    .sort((a, b) => (a.tableSeat ?? Infinity) - (b.tableSeat ?? Infinity));
}

/** The stored order reserves a return position for absent combatants; ranks count present units only. */
export function getPhysicalCombatSeats(state: Pick<GameState, "players">, spaceId?: string): PlayerState[] {
  return state.players.filter((player) => player.spaceId === spaceId && player.kind !== "spectator" &&
    player.status === "alive" && player.defeatLevel === undefined && !player.summon?.tableFrontPlayerId &&
    !player.buffs.some((buff) => buff.id === "pending_death" || buff.id === "direct_non_damage_death"));
}

export function getCombatSeats(state: SeatingState, spaceId?: string): PlayerState[] {
  return getCombatSeatGroups(state, spaceId).flat();
}

export function hasInfiniteCombatSeat(player: Pick<PlayerState, "buffs" | "bigCards"> | undefined): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === TIAN_YE_SOARING_STATE && tianyeSoaringStateIsActive(player, buff)));
}

function shadowSeatOf(player: PlayerState, spaceId?: string): PlayerState["shadowCombatSeat"] {
  const seat = player.shadowCombatSeat;
  return seat?.spaceId === spaceId ? seat : undefined;
}

function physicalCombatSlots(state: SeatingState, spaceId?: string): PlayerState[][] {
  const slots = new Map<PlayerId, PlayerState[]>();
  for (const player of getPhysicalCombatSeats(state, spaceId)) {
    // An active player who moved behind another seat keeps a vacant slot at their original position.
    if (!slots.has(player.id)) slots.set(player.id, []);
    const groupId = shadowSeatOf(player, spaceId)?.groupId ?? player.id;
    if (!slots.has(groupId)) slots.set(groupId, []);
    slots.get(groupId)!.push(player);
  }
  const insertions = new Map<string, string[]>();
  for (const slot of state.shadowInsertedSeats ?? []) {
    if (slot.spaceId !== spaceId) continue;
    const siblings = insertions.get(slot.afterId) ?? [];
    siblings.push(slot.id);
    insertions.set(slot.afterId, siblings);
  }
  const result: PlayerState[][] = [];
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    visited.add(id);
    const occupants = slots.get(id);
    if (occupants) {
      occupants.sort((a, b) => (shadowSeatOf(a, spaceId)?.order ?? 0) - (shadowSeatOf(b, spaceId)?.order ?? 0));
      result.push(occupants);
    }
    for (const child of (insertions.get(id) ?? []).reverse()) visit(child);
  };
  for (const { id } of state.players) visit(id);
  for (const id of slots.keys()) visit(id);
  return result;
}

/** Only occupied main positions contribute to distances. Co-seated bodies share that position. */
export function getCombatSeatGroups(state: SeatingState, spaceId?: string): PlayerState[][] {
  const slots = physicalCombatSlots(state, spaceId);
  const infinite = slots.flat().filter(hasInfiniteCombatSeat);
  const groups = slots.map((slot) => slot.filter((player) => !hasInfiniteCombatSeat(player))).filter((group) => group.length > 0);
  if (!spaceId) {
    const original = groups.flat().filter((player) => player.starWheelOriginalPosition && player.tableSeat !== undefined)
      .sort((a, b) => a.tableSeat! - b.tableSeat!);
    for (const player of original) {
      const index = groups.findIndex((group) => group.includes(player));
      const group = groups[index]!;
      group.splice(group.indexOf(player), 1);
      if (!group.length) groups.splice(index, 1);
      groups.splice(player.tableSeat!, 0, [player]);
    }
  }
  for (const player of infinite) groups.push([player]);
  return groups;
}

export function getCombatSeatDistance(groups: readonly PlayerState[][], fromId: PlayerId, toId: PlayerId): number | undefined {
  const from = groups.findIndex((group) => group.some(({ id }) => id === fromId));
  const to = groups.findIndex((group) => group.some(({ id }) => id === toId));
  if (from === -1 || to === -1) return undefined;
  if (fromId === toId) return 0;
  if (hasInfiniteCombatSeat(groups[from]?.[0]) || hasInfiniteCombatSeat(groups[to]?.[0])) return Infinity;
  const finiteCount = groups.filter((group) => !hasInfiniteCombatSeat(group[0])).length;
  const distance = Math.abs(from - to);
  return Math.min(distance, finiteCount - distance);
}

export function getCombatFarthestPlayers(groups: readonly PlayerState[][], fromId: PlayerId): PlayerState[] {
  if (groups.length <= 1) return [];
  const from = groups.findIndex((group) => group.some(({ id }) => id === fromId));
  if (from === -1) return [];
  if (hasInfiniteCombatSeat(groups[from]?.[0])) return groups.flat().filter(({ id }) => id !== fromId);
  const infinite = groups.filter((group) => hasInfiniteCombatSeat(group[0]));
  if (infinite.length) return infinite.flat();
  const farthest = Math.floor(groups.length / 2);
  return groups.flatMap((group, index) => {
    const distance = Math.abs(from - index);
    return Math.min(distance, groups.length - distance) === farthest ? group : [];
  });
}

export function areCombatTargetsContiguous(players: readonly PlayerState[], targetIds: readonly PlayerId[]): boolean {
  const targets = new Set(targetIds);
  if (targets.size <= 1) return true;
  const finite = players.filter((player) => !hasInfiniteCombatSeat(player));
  return finite.length >= targets.size && finite.some((_, index) =>
    Array.from({ length: targets.size }, (_, offset) => finite[(index + offset) % finite.length]!)
      .every(({ id }) => targets.has(id)));
}

export function shadowSeatChoices(
  state: SeatingState,
  source: Pick<PlayerState, "id" | "spaceId">,
  mode: "insert" | "behind",
  combo = 0
): Array<{ player: PlayerState; primary: number; behind: number }> {
  return physicalCombatSlots(state, source.spaceId).flatMap((group, index) => {
    const choices = group.flatMap((player, memberIndex) => !canUseShadowSeatAnchor(state, source, player, mode, combo) ? [] :
      [{ player, primary: index + 1, behind: memberIndex + 1 }]);
    return mode === "insert" ? choices.slice(-1) : choices;
  });
}

export function canUseShadowSeatAnchor(
  state: Pick<GameState, "players">,
  source: Pick<PlayerState, "id" | "spaceId">,
  target: PlayerState,
  mode: "insert" | "behind",
  combo = 0
): boolean {
  if (source.id === target.id || source.spaceId !== target.spaceId) return false;
  if (hasInfiniteCombatSeat(target)) return false;
  if (mode === "insert" || canBypassTargetSelection(state, source.id, target)) return true;
  return target.buffs.every((buff) => {
    if (!buff.preventsTargetSelection || buff.stateType === TIAN_YE_SOARING_STATE && !tianyeSoaringStateIsActive(target, buff)) return true;
    const skillId = buff.sourceAbilityId ?? buff.sourceFusionId;
    return combo >= 3 && skillId !== undefined && isSkillIgnorable(skillId) && hasSkillTypeTag(skillId, "限定技");
  });
}

export function moveShadowSeat(
  state: SeatingState,
  source: PlayerState,
  target: PlayerState,
  mode: "insert" | "behind"
): boolean {
  const present = getPhysicalCombatSeats(state, source.spaceId);
  if (source.id === target.id || !present.includes(source) || !present.includes(target) || hasInfiniteCombatSeat(target)) return false;
  initializeTableSeats(state);
  const spaceId = source.spaceId;
  const targetGroup = shadowSeatOf(target, spaceId)?.groupId ?? target.id;
  if (mode === "behind") {
    const order = (shadowSeatOf(target, spaceId)?.order ?? 0) + 1;
    for (const player of state.players) {
      const seat = shadowSeatOf(player, spaceId);
      if (player !== source && seat?.groupId === targetGroup && seat.order >= order) seat.order++;
    }
    source.shadowCombatSeat = { groupId: targetGroup, order, ...(spaceId === undefined ? {} : { spaceId }) };
    return true;
  }

  const slots = state.shadowInsertedSeats ??= [];
  const groupId = `shadow_slot_${slots.length + 1}`;
  slots.push({ id: groupId, afterId: targetGroup, ...(spaceId === undefined ? {} : { spaceId }) });
  source.shadowCombatSeat = { groupId, order: 0, ...(spaceId === undefined ? {} : { spaceId }) };
  return true;
}

/** Shuffles transfer seat coordinates along with the occupied positions. */
export function applyCombatSeatPermutation(state: SeatingState, occupants: Record<PlayerId, PlayerId>): void {
  const players = new Map(state.players.map((player) => [player.id, player]));
  const movedSeats = state.players.map((player) => {
    const seat = player.shadowCombatSeat;
    return { player: players.get(occupants[player.id] ?? "") ?? player,
      seat: seat && { ...seat, groupId: occupants[seat.groupId] ?? seat.groupId } };
  });
  for (const { player, seat } of movedSeats) {
    if (seat) player.shadowCombatSeat = seat;
    else delete player.shadowCombatSeat;
  }
  for (const slot of state.shadowInsertedSeats ?? []) slot.afterId = occupants[slot.afterId] ?? slot.afterId;
  state.players = movedSeats.map(({ player }) => player);
}

export function getCombatSeatNumbers(state: SeatingState): Map<PlayerId, number> {
  const numbers = new Map<PlayerId, number>();
  for (const spaceId of new Set(state.players.map((player) => player.spaceId))) {
    physicalCombatSlots(state, spaceId).forEach((group, index) => {
      for (const player of group) numbers.set(player.id, hasInfiniteCombatSeat(player) ? Infinity : index + 1);
    });
  }
  return numbers;
}
