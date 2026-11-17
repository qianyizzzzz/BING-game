import type { BigCardInstance } from "../bigCards/types";
import { isBigSkillMode } from "../modes";
import type { GameState, PlayerId, PlayerState } from "../types";
import { detachRedrawnBigCard } from "./bigCards";
import { createBaseEvent, createId, drawSkillIds, getOpeningBigCardDeal, getPlayerInitialHp, startGame } from "./gameFactory";

interface OpeningCardSlot {
  originalInstanceId: string;
  card: BigCardInstance;
  redraw: boolean;
}

function dealRedrawnSlots(pool: readonly string[], slots: OpeningCardSlot[]): void {
  const available = new Set(pool);
  for (const { card, redraw } of slots) if (!redraw) available.delete(card.cardId);
  let redrawCount = slots.filter(({ redraw }) => redraw).length;
  // A manually selected test hand can contain more slots than its chosen random pool.
  // Reserve the latest slots first when they cannot all be refilled without repeats.
  for (let index = slots.length - 1; index >= 0 && redrawCount > available.size; index--) {
    const slot = slots[index]!;
    if (!slot.redraw) continue;
    slot.redraw = false;
    available.delete(slot.card.cardId);
    redrawCount--;
  }
  const replacements = drawSkillIds([...available], redrawCount);
  let replacementIndex = 0;
  for (const slot of slots) {
    if (!slot.redraw) continue;
    slot.card = { cardId: replacements[replacementIndex++]!, instanceId: createId("big_card") };
  }
}

function openingPlayer(original: PlayerState, current: PlayerState | undefined, slots: readonly OpeningCardSlot[]): PlayerState {
  const restored = structuredClone(original);
  if (current) {
    restored.name = current.name;
    restored.connected = current.connected;
    if (current.accountId === undefined) delete restored.accountId;
    else restored.accountId = current.accountId;
    if (current.avatarUrl === undefined) delete restored.avatarUrl;
    else restored.avatarUrl = current.avatarUrl;
  }
  if (!slots.some(({ redraw }) => redraw)) return restored;
  for (const { originalInstanceId, redraw } of slots) if (redraw) detachRedrawnBigCard(restored, originalInstanceId);
  const keptCards = new Map(restored.bigCards?.map((card) => [card.instanceId, card]));
  restored.bigCards = slots.map(({ originalInstanceId, card, redraw }) => redraw ? card : keptCards.get(originalInstanceId)!);
  return restored;
}

/** Restore the saved opening hands, draw their marked replacements, then rerun normal opening effects. */
export function restartGameFromYuan(state: GameState, sourceId: PlayerId, sourceCardInstanceId?: string): boolean {
  if (!isBigSkillMode(state.config.skillMode)) return false;
  const source = state.players.find(({ id }) => id === sourceId);
  const originalPlayers = Object.values(state.initialPlayerSnapshots ?? {});
  if (!source || originalPlayers.length < 2) return false;

  const deal = state.openingBigCardDeal ?? getOpeningBigCardDeal(state.config);
  const currentPlayers = new Map(state.players.map((player) => [player.id, player]));
  const hands = originalPlayers
    .filter((player): player is PlayerState => Boolean(player && player.kind !== "spectator" && !player.summon))
    .sort((a, b) => (a.tableSeat ?? Infinity) - (b.tableSeat ?? Infinity))
    .map((original) => ({
      original,
      slots: (original.bigCards ?? []).map((card): OpeningCardSlot => ({
        originalInstanceId: card.instanceId,
        card,
        redraw: (original.id !== sourceId || card.instanceId !== sourceCardInstanceId) &&
          Math.random() < (original.id === sourceId ? 0.5 : 0.25)
      }))
    }));
  if (hands.length < 2) return false;

  if (deal.allowDuplicateAcrossPlayers) {
    for (const { slots } of hands) dealRedrawnSlots(deal.pool, slots);
  } else {
    dealRedrawnSlots(deal.pool, hands.flatMap(({ slots }) => slots));
  }

  const now = Date.now();
  const restoredBigCardHands = new Map(hands.filter(({ slots }) => slots.some(({ redraw }) => redraw))
    .map(({ original }) => [original.id, getPlayerInitialHp(original)]));
  const opening: GameState = {
    id: state.id, ownerId: state.ownerId, createdAt: state.createdAt, updatedAt: now,
    config: structuredClone(state.config), openingBigCardDeal: structuredClone(deal),
    phase: "lobby", activeTimingPhase: "turn_action", roundNumber: 1, roundTurnNumber: 1, turnNumber: 1,
    actionWindowPlayerIds: [], actionWindowPassPlayerIds: [], turnStartedAt: now,
    players: [
      ...hands.map(({ original, slots }) => openingPlayer(original, currentPlayers.get(original.id), slots)),
      ...state.players.filter(({ kind }) => kind === "spectator").map((spectator) => structuredClone(spectator))
    ],
    pendingActions: {}, skillKnowledge: {}, winnerIds: [],
    eventLog: state.eventLog.filter(({ type }) => type === "game_created" || type === "player_joined" || type === "player_renamed")
  };
  opening.eventLog.push({
    ...createBaseEvent(opening, "system"), type: "system",
    message: `${source.name} 发动太虚之初，重开此局游戏`
  });

  const restarted = startGame(opening, restoredBigCardHands);
  for (const key of Object.keys(state) as Array<keyof GameState>) {
    if (!Object.hasOwn(restarted, key)) delete state[key];
  }
  Object.assign(state, restarted);
  return true;
}
