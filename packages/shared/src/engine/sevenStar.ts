import type { GameState, PlayerId, PlayerState, SkillAction, SkillTimingPhase } from "../types";
import type { VictoryResumeKind } from "./victoryCounter";
import { bigAbilitySource, canReceiveBigCard } from "./bigCards";
import { nextRoundCardForm } from "./cardForms";
import { getActiveSkillCount } from "./gameFactory";
import { SEVEN_STAR_CHOOSE, SEVEN_STAR_FORMS, SEVEN_STAR_KEYS, SEVEN_STAR_YUHENG } from "./sevenStarIds";

export type SevenStarLegacyResume =
  | { kind: "prompt"; timing: SkillTimingPhase; preservePendingActions?: boolean; promptSeconds?: number }
  | { kind: "blood_ritual" }
  | { kind: "victory"; timing: SkillTimingPhase; victoryResume: VictoryResumeKind };

export interface SevenStarLegacyChoice {
  cardInstanceId: string;
  targetId: PlayerId;
}

export function sevenStarLegacyChoices(state: Pick<GameState, "players" | "sevenStarLegacyPending">, playerId: PlayerId): SevenStarLegacyChoice[] {
  const player = state.players.find(({ id }) => id === playerId);
  if (!player || player.status !== "dead" || !getActiveSkillCount(player, SEVEN_STAR_YUHENG)) return [];
  const cards = state.sevenStarLegacyPending?.[playerId] ?? [];
  return cards.filter((id) => bigAbilitySource(player, { skillId: SEVEN_STAR_YUHENG, bigCardInstanceId: id })).flatMap((cardInstanceId) =>
    state.players.filter((target) => target.id !== playerId && target.kind !== "spectator" && target.status === "alive" &&
      !target.summon && target.spaceId === player.spaceId && canReceiveBigCard(target, "skill_gain"))
      .map((target) => ({ cardInstanceId, targetId: target.id })));
}

export function validSevenStarLegacyChoice(state: GameState, id: PlayerId, action: SkillAction): boolean {
  return Boolean(state.sevenStarLegacyResume && state.activeTimingPhase === "revival_action" && action.stacks === 1 &&
    !state.actionWindowPassPlayerIds.includes(id) && sevenStarLegacyChoices(state, id).some((choice) =>
      choice.targetId === action.targetId && choice.cardInstanceId === action.bigCardInstanceId));
}

export function includeSevenStarLegacyWinners(state: GameState, ids: readonly PlayerId[]): PlayerId[] {
  const winners = new Set(ids);
  const queue = [...winners];
  for (const id of queue) {
    const winner = state.players.find((player) => player.id === id);
    if (!winner || winner.defeatLevel === 6 || !getActiveSkillCount(winner, SEVEN_STAR_CHOOSE)) continue;
    for (const card of winner.bigCards ?? []) {
      const link = card.sevenStarLegacy;
      if (!link || link.recipientId !== id || winners.has(link.giverId) ||
        !bigAbilitySource(winner, { skillId: SEVEN_STAR_CHOOSE, bigCardInstanceId: card.instanceId })) continue;
      const giver = state.players.find((player) => player.id === link.giverId);
      if (!giver || giver.defeatLevel === 6) continue;
      winners.add(giver.id);
      queue.push(giver.id);
    }
  }
  return [...winners];
}

export function advanceSevenStarForms(state: GameState): void {
  if (state.roundNumber === 1) return;
  for (const player of state.players) {
    if (player.status !== "alive" || !getActiveSkillCount(player, SEVEN_STAR_CHOOSE)) continue;
    for (const card of player.bigCards ?? []) {
      const forms = card.sevenStarForms;
      if (!forms || forms.cleared || forms.chosenRound === state.roundNumber ||
        !bigAbilitySource(player, { skillId: SEVEN_STAR_CHOOSE, bigCardInstanceId: card.instanceId })) continue;
      forms.active = nextRoundCardForm(forms, SEVEN_STAR_KEYS);
      forms.chosenRound = state.roundNumber;
    }
  }
}

export function sevenStarFormLabels(player: PlayerState): string[] {
  return (player.bigCards ?? []).flatMap(({ sevenStarForms: forms }) => !forms || forms.cleared || forms.active === "none" ? [] :
    [`${SEVEN_STAR_FORMS[forms.active].name} · 当前，可用 ${forms.available.flatMap((form) =>
      form === "none" ? [] : [SEVEN_STAR_FORMS[form].name]).join("、")}`]);
}
