import { bigCardHasAbility, SAKURA_BLOOM_ID, SAKURA_ELEMENT, SAKURA_FALL_ID, SAKURA_FINALE_ID, SAKURA_RAIN_ID } from "../bigCards/abilities";
import type { DamageEvent, GameState, PlayerId, PlayerState } from "../types";
import { getSkill, getSkillPlay, getSkillUseLimit } from "../skills/registry";
import { countSuppressedFusionMaterials, getOwnedSkillIds, isFusionActive, restoreStarShiftUses } from "../skills/fusion";
import { canDiscardBigCard, removeBigCardInstance } from "./bigCards";
import { canGainStatus } from "./karmaSong";
import { compareCombatValues, combatValue, type CombatValue } from "./combatValues";
import { changeElementAmount, getElementAmount } from "./elementResources";
import { effectCategoryIsSuppressed, registerEffectCategories, registerStateDefinition, SPRING_GRASS_BOOST, SPRING_ICE_FIRE_DISABLED } from "./effectCategories";
import { createBaseEvent, findPlayer, getActiveSkillCount, isPlayerSkillDisabled } from "./gameFactory";
import { applyNegativeStatus, registerNegativeStatus } from "./negativeStatuses";
import { shareSpace } from "./spaces";
import { recoverColdLightUses } from "./nineTribulations";
import { isSleeping } from "./utopia";
import { getBigCardLimitedRemaining, getSkillUseBalanceAdjustment, setBigCardUseBalanceAdjustment,
  setSkillUseBalanceAdjustment } from "./limitedUseBalance";

export const SAKURA_GROWTH = "sakura_growth";
const FREE_FALL = "sakura_free_fall";
registerStateDefinition({ id: SAKURA_GROWTH, name: "狂乱绽放", categories: ["positive"] });
registerStateDefinition({ id: SPRING_GRASS_BOOST, name: "春之歌·草系有利数值翻倍", categories: ["positive"] });
registerNegativeStatus({ id: SPRING_ICE_FIRE_DISABLED, name: "春之歌·冰火系技能失效" });
registerEffectCategories(SAKURA_FALL_ID, ["skill_discard"]);
registerEffectCategories(SAKURA_FINALE_ID, ["skill_discard"]);

export interface SakuraCardChoice {
  playerId: PlayerId;
  instanceId: string;
  number: number;
  visibleCardId?: string;
  remainingDiscards: number;
}

function discardLedger(player: PlayerState, targetId: PlayerId) {
  return ((player.sakuraDiscards ??= {})[targetId] ??= { used: 0, extra: 0 });
}

export function addSakuraDiscardAllowance(player: PlayerState, targetId: PlayerId, amount: number): void {
  discardLedger(player, targetId).extra += amount;
}

export function getSakuraCardChoices(state: GameState, source: PlayerState, mode: "death" | "free" | "finale", pending = true): SakuraCardChoice[] {
  if (source.status !== "alive" || mode !== "finale" && (isPlayerSkillDisabled(source) || isSleeping(source, state.turnNumber))) return [];
  if (mode === "death" && (!getActiveSkillCount(source, SAKURA_FALL_ID) || getElementAmount(source, SAKURA_ELEMENT) < 10)) return [];
  if (mode === "free" && !source.buffs.some((buff) => buff.id === FREE_FALL)) return [];
  return state.players.flatMap((target) => {
    if (target.id === source.id && mode !== "free" || target.kind === "spectator" || mode !== "finale" && !shareSpace(source, target) ||
      mode === "death" && (target.status !== "alive" || pending && !target.buffs.some((buff) => buff.id === "pending_death"))) return [];
    const ledger = source.sakuraDiscards?.[target.id];
    const remainingDiscards = 2 + (ledger?.extra ?? 0) - (ledger?.used ?? 0);
    if (remainingDiscards <= 0) return [];
    return (target.bigCards ?? []).map((card, index) => ({
      playerId: target.id, instanceId: card.instanceId, number: index + 1, remainingDiscards,
      ...(target.id === source.id || card.publiclyRevealed || state.peekBigCardsByViewer?.[source.id]?.includes(card.instanceId) ?
        { visibleCardId: card.cardId } : {})
    }));
  });
}

export function getDiscardableSakuraChoices(state: GameState, choices: SakuraCardChoice[]): SakuraCardChoice[] {
  return choices.filter(({ playerId, instanceId }) => {
    const target = findPlayer(state, playerId);
    const card = target?.bigCards?.find((entry) => entry.instanceId === instanceId);
    return Boolean(target && card && canDiscardBigCard(target, card));
  });
}

export function canDiscardAllSakuraCards(player: PlayerState): boolean {
  return (player.bigCards ?? []).every((card) => canDiscardBigCard(player, card));
}

export function validateSakuraCards(choices: SakuraCardChoice[], selected: unknown, max: number, minimum: number): selected is string[] {
  if (!Array.isArray(selected) || selected.length < minimum || selected.length > max || new Set(selected).size !== selected.length) return false;
  const counts = new Map<PlayerId, number>();
  return selected.every((id) => {
    const choice = choices.find((item) => item.instanceId === id);
    if (!choice) return false;
    const count = (counts.get(choice.playerId) ?? 0) + 1;
    counts.set(choice.playerId, count);
    return count <= choice.remainingDiscards;
  });
}

export function getSakuraFinaleDiscardCount(choices: SakuraCardChoice[]): number {
  const counts = new Map<PlayerId, number>();
  for (const choice of choices)
    counts.set(choice.playerId, Math.min(choice.remainingDiscards, (counts.get(choice.playerId) ?? 0) + 1));
  return Math.min(30, [...counts.values()].reduce((total, count) => total + count, 0));
}

export function applySakuraDiscards(state: GameState, source: PlayerState, mode: "death" | "free" | "finale", ids: readonly string[]): void {
  if (effectCategoryIsSuppressed(source, "skill_discard")) return;
  const choices = getSakuraCardChoices(state, source, mode === "death" ? "finale" : mode);
  for (const id of ids.slice(0, mode === "finale" ? 30 : 1)) {
    const choice = choices.find((item) => item.instanceId === id);
    if (!choice) continue;
    const target = findPlayer(state, choice.playerId)!;
    if (mode === "death" && (!shareSpace(source, target) || !target.buffs.some((buff) => buff.id === "pending_death"))) continue;
    const ledger = discardLedger(source, choice.playerId);
    if (ledger.used < 2 + ledger.extra && removeBigCardInstance(state, target.id, id, "discard")) ledger.used++;
  }
  if (mode === "free") clearFreeSakuraFall(source);
}

export function recordSakuraDamage(state: GameState, target: PlayerState, before: CombatValue, events: DamageEvent[], ordinaryDeath: boolean): void {
  const earned = events.reduce((sum, event) => sum + (ordinaryDeath ? 5 :
    compareCombatValues(event.amountValue ?? combatValue(event.amount), before) >= 0 ? 3 : 1), 0);
  if (!earned) return;
  for (const player of state.players) if (player.status === "alive" && shareSpace(player, target)) {
    const copies = getActiveSkillCount(player, SAKURA_FALL_ID);
    if (copies) changeElementAmount(player, SAKURA_ELEMENT, copies * earned);
  }
}

export function openSakuraBloom(state: GameState, player: PlayerState, instanceId?: string): void {
  const card = player.bigCards?.find((item) => item.instanceId === instanceId);
  if (card && bigCardHasAbility(card, SAKURA_RAIN_ID))
    (card.abilityUseBonuses ??= {})[SAKURA_RAIN_ID] = (card.abilityUseBonuses?.[SAKURA_RAIN_ID] ?? 0) + 1;
  if (!canGainStatus(player)) return;
  player.buffs.push({ id: SAKURA_GROWTH, stateType: SAKURA_GROWTH, name: "狂乱绽放", stacks: 18,
    sourceAbilityId: SAKURA_BLOOM_ID, ...(instanceId ? { sourceBigCardInstanceId: instanceId } : {}),
    expiresAtRound: state.roundNumber + 1 });
}

export function settleSakuraBloom(state: GameState, endRound = false): boolean {
  let open = false;
  for (const player of state.players) {
    for (const buff of player.buffs.filter((item) => item.stateType === SAKURA_GROWTH && item.expiresAtRound === state.roundNumber + 1)) {
      if (endRound ? state.roundTurnNumber !== 1 || buff.expiresAtTurn !== undefined : buff.lastTickTurn === state.turnNumber) continue;
      if (endRound) buff.expiresAtTurn = state.turnNumber + 1;
      else buff.lastTickTurn = state.turnNumber;
      const balance = getElementAmount(player, SAKURA_ELEMENT);
      changeElementAmount(player, SAKURA_ELEMENT, Math.min(buff.stacks, balance * (endRound ? 9 : 1)));
      buff.stacks -= getElementAmount(player, SAKURA_ELEMENT) - balance;
      if (endRound && player.status === "alive") {
        player.buffs.push({ id: FREE_FALL, name: "免费樱落", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
        open ||= getSakuraCardChoices(state, player, "free").length > 0;
      }
    }
  }
  return open;
}

export function hasFreeSakuraFall(player: Pick<PlayerState, "buffs"> | undefined): boolean {
  return player?.buffs.some((buff) => buff.id === FREE_FALL) ?? false;
}

export function clearFreeSakuraFall(player: PlayerState): void {
  if (hasFreeSakuraFall(player)) player.buffs = player.buffs.filter((buff) => buff.id !== FREE_FALL);
}

function refreshLimitedUses(player: PlayerState): void {
  recoverColdLightUses(player);
  for (const id of new Set(getOwnedSkillIds(player))) {
    const base = getSkillPlay(id)?.usesPerGame;
    if (!base || !getSkill(id)?.typeTags.includes("限定技")) continue;
    const big = player.bigCards?.filter((card) => bigCardHasAbility(card, id)) ?? [];
    if (big.length) {
      for (const card of big) {
        if (getBigCardLimitedRemaining(card, id, base) >= base) continue;
        if (card.abilityUses?.[id]) card.abilityUses[id] = Math.min(card.abilityUses[id], card.abilityUseBonuses?.[id] ?? 0);
        const remaining = getBigCardLimitedRemaining(card, id, base);
        if (remaining < base) setBigCardUseBalanceAdjustment(card, id, (card.abilityUseBalanceAdjustments?.[id] ?? 0) + base - remaining);
      }
      continue;
    }
    const used = player.buffs.find((buff) => buff.id === `skill_used:${id}`);
    const adjustment = getSkillUseBalanceAdjustment(player, id);
    if (!used && !adjustment) continue;
    const copies = Math.max(0, player.skills.filter((skillId) => skillId === id).length - countSuppressedFusionMaterials(player, id)) +
      (player.skillFusions ?? []).filter((fusion) => fusion.skillId === id && isFusionActive(player, fusion)).length;
    const remaining = (getSkillUseLimit(player, id) ?? 0) - (used?.stacks ?? 0);
    const deficit = Math.max(0, base * copies - remaining);
    const restoreUsage = Math.min(used?.stacks ?? 0, deficit);
    if (used) {
      used.stacks -= restoreUsage;
      restoreStarShiftUses(player, id, restoreUsage);
    }
    if (deficit > restoreUsage) setSkillUseBalanceAdjustment(player, id, adjustment + deficit - restoreUsage);
  }
}

export function applySakuraSpring(state: GameState, source: PlayerState): void {
  for (const target of state.players) {
    if (target.kind === "spectator") continue;
    if (!state.sakuraSpringStarted) {
      applyNegativeStatus(state, target.id, SPRING_ICE_FIRE_DISABLED, (recipient) => {
        if (!recipient.buffs.some((buff) => buff.id === SPRING_ICE_FIRE_DISABLED))
          recipient.buffs.push({ id: SPRING_ICE_FIRE_DISABLED, stateType: SPRING_ICE_FIRE_DISABLED, name: "春之歌·冰火系技能失效", stacks: 1 });
      }, source.id);
      if (canGainStatus(target)) target.buffs.push({ id: SPRING_GRASS_BOOST, stateType: SPRING_GRASS_BOOST, name: "春之歌·草系有利数值翻倍", stacks: 1 });
    }
    refreshLimitedUses(target);
  }
  state.sakuraSpringStarted = true;
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: "春之歌刷新了全场限定技剩余次数" });
}
