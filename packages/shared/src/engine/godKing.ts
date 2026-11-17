import { GOD_KING_JUDGMENT_ID, GOD_KING_RULES_ID, bigCardHasAbility } from "../bigCards/abilities";
import type { BigCardInstance } from "../bigCards/types";
import type { GameState, PlayerId, PlayerState } from "../types";
import { createBaseEvent, getActiveSkillCount } from "./gameFactory";

type Progress = NonNullable<BigCardInstance["godKingProgress"]>;
type Counter = "attacks" | "misses" | "deaths" | "retirements" | "wounds";

export function getGodKingTotals(card: BigCardInstance): { wins: number; losses: number } {
  const results = Object.values(card.godKingProgress?.results ?? {});
  const wins = results.filter((result) => result === "win").length;
  return { wins, losses: results.length - wins };
}

export function activeGodKingCards(player: PlayerState | undefined): BigCardInstance[] {
  const cards = (player?.bigCards ?? []).filter((card) => !card.junengDisabled &&
    card.godKingProgress && bigCardHasAbility(card, GOD_KING_RULES_ID));
  return cards.length && getActiveSkillCount(player, GOD_KING_RULES_ID) ? cards : [];
}

function milestone(progress: Progress, counter: Counter, period: number): number {
  const count = (progress[counter] ?? 0) + 1;
  progress[counter] = count;
  return period > 0 && count % period === 0 ? count / period : 0;
}

export function godKingAttackFactor(player: PlayerState | undefined): number {
  let factor = 0;
  for (const card of activeGodKingCards(player)) {
    const { losses } = getGodKingTotals(card);
    const step = milestone(card.godKingProgress!, "attacks", losses ** 2);
    if (!step) continue;
    let factorial = 1;
    for (let n = 2; n <= Math.min(step, 171); n++) factorial *= n;
    factor = Math.min(Number.MAX_VALUE, (factor || 1) * factorial);
  }
  return factor;
}

export function recordGodKingJudgmentReward(player: PlayerState | undefined, counter: "misses" | "wounds", events = 1): void {
  for (const card of activeGodKingCards(player)) {
    const { wins, losses } = getGodKingTotals(card);
    const period = counter === "misses" ? losses : wins ** 2;
    for (let n = 0; n < events; n++) {
      const reward = milestone(card.godKingProgress!, counter, period);
      if (!reward) continue;
      const bonuses = card.abilityUseBonuses ??= {};
      bonuses[GOD_KING_JUDGMENT_ID] = Math.min(Number.MAX_SAFE_INTEGER, (bonuses[GOD_KING_JUDGMENT_ID] ?? 0) + reward);
    }
  }
}

export function godKingDeathMilestone(player: PlayerState): boolean {
  let active = false;
  for (const card of activeGodKingCards(player)) {
    const { wins } = getGodKingTotals(card);
    if (milestone(card.godKingProgress!, "deaths", wins)) active = true;
  }
  return active;
}

export function preventGodKingRetirement(state: GameState, player: PlayerState): boolean {
  let protectedThisTime = false;
  for (const card of activeGodKingCards(player)) {
    const { wins } = getGodKingTotals(card);
    if (milestone(card.godKingProgress!, "retirements", wins ** 2)) protectedThisTime = true;
  }
  if (protectedThisTime) state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${player.name} 的神王审判免疫了本次退游` });
  return protectedThisTime;
}

export function flipGodKingResult(state: GameState, player: PlayerState | undefined, targetId: PlayerId, instanceId?: string): void {
  if (!player || player.id === targetId) return;
  const cards = player.bigCards ?? [];
  const card = cards.find((entry) => entry.instanceId === instanceId) ??
    cards.find((entry) => entry.godKingProgress?.results[targetId]);
  const progress = card?.godKingProgress;
  const result = progress?.results[targetId];
  if (!progress || !result) return;
  progress.results[targetId] = result === "win" ? "loss" : "win";
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id,
    message: `审判翻转了你与${state.players.find(({ id }) => id === targetId)?.name ?? "该玩家"}的开局胜负` });
}
