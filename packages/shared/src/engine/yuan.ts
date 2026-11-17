import type { GameState, PlayerState } from "../types";
import { removeBigCardInstance } from "./bigCards";
import { effectCategoryIsSuppressed, effectIsSuppressed, ignoresEffectCategory } from "./effectCategories";
import { createBaseEvent, createId } from "./gameFactory";
import { restorePlayerInitialState } from "./initialPlayerState";
import { isSkillIgnored } from "./skillIgnore";
import { canGainStatus } from "./karmaSong";
import { isSoulExiled, shareSpace } from "./spaces";
import { YUAN_RETURN_ID, YUAN_VOID_DODGE, YUAN_VOID_ID } from "./yuanIds";

function isYuanParticipant(player: PlayerState): boolean {
  return player.status === "alive" && player.kind !== "spectator" && !player.summon && !player.emptyCityOwnerId;
}

export function yuanOtherTargets(state: Pick<GameState, "players" | "smallSpaces">, source: PlayerState): PlayerState[] {
  return state.players.filter((target) => target.id !== source.id && isYuanParticipant(target) &&
    shareSpace(source, target) && !isSoulExiled(state, target));
}

export function grantYuanInvulnerability(state: GameState, player: PlayerState): void {
  if (!canGainStatus(player)) return;
  if (effectIsSuppressed(player, YUAN_RETURN_ID)) return;
  const id = "yuan_return_invulnerable";
  player.buffs = player.buffs.filter((buff) => buff.id !== id);
  player.buffs.push({ id, stateType: "gather_invulnerability", name: "归元·无敌", stacks: 1,
    sourceAbilityId: YUAN_RETURN_ID, expiresAtTurn: state.turnNumber + 1 });
}

export function grantYuanVoidDodge(state: GameState, player: PlayerState): void {
  if (!canGainStatus(player)) return;
  if (effectIsSuppressed(player, YUAN_VOID_ID)) return;
  player.buffs = player.buffs.filter((buff) => buff.id !== YUAN_VOID_DODGE);
  player.buffs.push({ id: YUAN_VOID_DODGE, stateType: YUAN_VOID_DODGE, name: "虚元·回避指向出招", stacks: 1,
    sourceAbilityId: YUAN_VOID_ID, expiresAtTurn: state.turnNumber + 1 });
}

export function hasYuanVoidDodge(state: Pick<GameState, "turnNumber">, target: PlayerState | undefined): boolean {
  return Boolean(target && !isSkillIgnored(target, YUAN_VOID_ID) && !effectIsSuppressed(target, YUAN_VOID_ID) &&
    target.buffs.some((buff) => buff.id === YUAN_VOID_DODGE && (buff.expiresAtTurn ?? 0) > state.turnNumber));
}

export function queueYuanVoidSpace(state: GameState, target: PlayerState): void {
  if (state.yuanVoidEntries?.turnNumber !== state.turnNumber)
    state.yuanVoidEntries = { turnNumber: state.turnNumber, playerIds: [] };
  if (!state.yuanVoidEntries.playerIds.includes(target.id)) state.yuanVoidEntries.playerIds.push(target.id);
}

export function enterYuanVoidSpace(state: GameState, target: PlayerState): void {
  if (!isYuanParticipant(target)) return;
  const id = createId("yuan_void");
  (state.smallSpaces ??= {})[id] = { kind: "yuan_void", name: "虚元·异空间",
    expiresAtRound: state.roundNumber + 5, cakeMultiplier: 1 };
  target.spaceId = id;
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${target.name} 进入虚元异空间，持续5轮` });
}

export function applyYuanVoidEntries(state: GameState): void {
  const entries = state.yuanVoidEntries;
  delete state.yuanVoidEntries;
  if (entries?.turnNumber !== state.turnNumber) return;
  for (const player of state.players)
    if (entries.playerIds.includes(player.id)) enterYuanVoidSpace(state, player);
}

export function randomYuanSkillDisappearance(state: GameState, source: PlayerState, target: PlayerState): boolean {
  if (effectCategoryIsSuppressed(source, "skill_disappearance") || ignoresEffectCategory(target, "skill_disappearance")) return false;
  const cards = (target.bigCards ?? []).filter((card) => !card.onlyAbilityId);
  if (!cards.length) return false;
  const chosen = cards[Math.floor(Math.random() * cards.length)]!;
  return removeBigCardInstance(state, target.id, chosen.instanceId, "disappear");
}

export function applyYuanOrigin(state: GameState, source: PlayerState, target: PlayerState | undefined, restoreSource: boolean): {
  targetRestored: boolean; sourceRestored: boolean;
} {
  if (target) randomYuanSkillDisappearance(state, source, target);
  const restore = (player: PlayerState): boolean => {
    if (effectCategoryIsSuppressed(source, "restore_initial") || ignoresEffectCategory(player, "restore_initial") ||
      !restorePlayerInitialState(state, player)) return false;
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${player.name} 因初元恢复至初始` });
    return true;
  };
  const targetRestored = Boolean(target && restore(target));
  const sourceRestored = restoreSource && restore(source);
  return { targetRestored, sourceRestored };
}
