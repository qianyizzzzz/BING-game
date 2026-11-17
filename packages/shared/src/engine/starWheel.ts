import type { BuffState, GameState, PlayerAction, PlayerId, PlayerState } from "../types";
import { getSkill, getSkillUseLimit } from "../skills/registry";
import { createId, getActiveSkillCount } from "./gameFactory";
import { isTypedSkillSuppressed } from "./effectCategories";
import type { ReboundAttack } from "./scatterRebound";
import { getActionLabel } from "./attacks";
import { canGainStatus } from "./karmaSong";
import { STAR_WHEEL_INHERIT, STAR_WHEEL_POSITION, STAR_WHEEL_REDIRECT, STAR_WHEEL_RELEASE, STAR_WHEEL_REVERSE, STAR_WHEEL_SEAL,
  STAR_WHEEL_SHUFFLE, STAR_WHEEL_VICTORY } from "./starWheelIds";

export interface StarWheelMove {
  id: string;
  keeperId: PlayerId;
  round: number;
  label: string;
  attacks: ReboundAttack[];
  effects: Array<{ sourceId: PlayerId; originalSourceId: PlayerId; action: PlayerAction }>;
}

export function starWheelMoveView(move: StarWheelMove) {
  return { id: move.id, keeperId: move.keeperId, round: move.round, label: move.label,
    deliveries: [...new Map([...move.attacks.map(({ sourceId, targetId }) => ({ sourceId, targetId })),
      ...move.effects.flatMap(({ sourceId, action }) => "targetId" in action && action.targetId ? [{ sourceId, targetId: action.targetId }] : [])]
      .map((entry) => [entry.sourceId + ":" + entry.targetId, entry])).values()] };
}

export interface StarWheelStatus {
  id: string;
  targetId: PlayerId;
  sourceId?: PlayerId;
  statusType: string;
  label: string;
  buffs: BuffState[];
  replacedIds: string[];
  bypassImmunity?: boolean;
  markCap?: number;
}

export type StarWheelMoveView = ReturnType<typeof starWheelMoveView>;

export function makeStarWheelMove(state: GameState, keeperId: PlayerId, action: PlayerAction): StarWheelMove {
  return { id: createId("star_wheel_move"), keeperId, round: state.roundNumber, label: getActionLabel(action), attacks: [], effects: [] };
}

export function starWheelChoices<T extends Pick<StarWheelMove, "id" | "keeperId" | "round" | "label">>(state: { roundNumber: number; starWheelMoves?: readonly T[] }, player?: PlayerState): T[] {
  if (!player || !getActiveSkillCount(player, STAR_WHEEL_SEAL)) return [];
  return (state.starWheelMoves ?? []).filter((move) => move.keeperId === player.id && move.round === state.roundNumber);
}

export function starWheelCanRedirect(player: PlayerState | undefined): boolean {
  return getActiveSkillCount(player, STAR_WHEEL_INHERIT) > 0;
}

export function starWheelStatusChoices<T extends Pick<StarWheelStatus, "id" | "targetId" | "label">>(state: { starWheelPendingStatuses?: T[] }, player?: PlayerState): T[] {
  return starWheelCanRedirect(player) ? (state.starWheelPendingStatuses ?? []).filter(({ targetId }) => targetId === player!.id) : [];
}

export function deferStarWheelStatus(state: GameState, target: PlayerState, statusType: string, label: string,
  sourceId: PlayerId | undefined, apply?: (player: PlayerState, source?: PlayerId) => void, bypassImmunity = false): boolean {
  if (target.status !== "alive" || !starWheelCanRedirect(target) ||
    !starWheelRemaining(target, STAR_WHEEL_REDIRECT)) return false;
  const draft = structuredClone(target);
  apply?.(draft, sourceId);
  const original = new Map(target.buffs.map((buff) => [buff.id, buff]));
  const buffs = draft.buffs.filter((buff) => JSON.stringify(original.get(buff.id)) !== JSON.stringify(buff));
  const replacedIds = target.buffs.filter((buff) => !draft.buffs.some(({ id }) => id === buff.id) ||
    buffs.some(({ id }) => id === buff.id)).map(({ id }) => id);
  if (apply && !buffs.length && !replacedIds.length) return false;
  (state.starWheelPendingStatuses ??= []).push({ id: createId("star_wheel_status"), targetId: target.id,
    ...(sourceId ? { sourceId } : {}), statusType, label, buffs, replacedIds, bypassImmunity });
  return true;
}

export function applyStarWheelIncomingMark(state: GameState, target: PlayerState, sourceId: PlayerId,
  mark: BuffState, cap?: number): void {
  if (!canGainStatus(target)) return;
  const effect: StarWheelStatus = { id: mark.id, targetId: target.id, sourceId,
    statusType: "mark", label: mark.name, buffs: [mark], replacedIds: [], ...(cap !== undefined ? { markCap: cap } : {}) };
  if (!queueStarWheelMark(state, target, effect)) placeStarWheelStatus(target, effect);
}

export function queueStarWheelMark(state: GameState, target: PlayerState, effect: StarWheelStatus): boolean {
  if (target.status !== "alive" || !starWheelCanRedirect(target) ||
    !starWheelRemaining(target, STAR_WHEEL_REDIRECT)) return false;
  (state.starWheelPendingStatuses ??= []).push({ ...effect, id: createId("star_wheel_mark"), targetId: target.id });
  return true;
}

export function placeStarWheelStatus(target: PlayerState, effect: StarWheelStatus): void {
  if (!canGainStatus(target)) return;
  target.buffs = target.buffs.filter(({ id }) => !effect.replacedIds.includes(id));
  for (const buff of effect.buffs) {
    const index = target.buffs.findIndex(({ id }) => id === buff.id);
    if (index < 0) target.buffs.push(structuredClone(buff));
    else if (effect.statusType === "mark") {
      const current = target.buffs[index]!;
      current.stacks = Math.min(effect.markCap ?? Infinity, current.stacks + buff.stacks);
      if (buff.expiresAtTurn !== undefined) current.expiresAtTurn = Math.max(current.expiresAtTurn ?? 0, buff.expiresAtTurn);
      if (buff.expiresAtRound !== undefined) current.expiresAtRound = Math.max(current.expiresAtRound ?? 0, buff.expiresAtRound);
    } else target.buffs[index] = structuredClone(buff);
  }
}

export function starWheelRemaining(player: PlayerState | undefined, skillId: string): number {
  if (!player || !getActiveSkillCount(player, skillId) || isTypedSkillSuppressed(player, getSkill(skillId))) return 0;
  const used = player.buffs.find(({ id }) => id === "skill_used:" + skillId)?.stacks ?? 0;
  return Math.max(0, (getSkillUseLimit(player, skillId) ?? 0) - used);
}

export function starWheelCost(skillId: string): { reversal: number; redirect: number } | undefined {
  if (skillId === STAR_WHEEL_SHUFFLE) return { reversal: 1, redirect: 1 };
  if (skillId === STAR_WHEEL_VICTORY) return { reversal: 8, redirect: 12 };
  return undefined;
}

export function canPayStarWheel(player: PlayerState, skillId: string): boolean {
  const cost = starWheelCost(skillId);
  return !cost || starWheelRemaining(player, STAR_WHEEL_REVERSE) >= cost.reversal &&
    starWheelRemaining(player, STAR_WHEEL_REDIRECT) >= cost.redirect;
}

export function isStarWheelWindowMove(id: string): boolean {
  return id === STAR_WHEEL_POSITION || id === STAR_WHEEL_RELEASE;
}
