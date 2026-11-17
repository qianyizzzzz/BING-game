import type { BigCardInstance } from "../bigCards/types";
import { getStartingHp, isBigSkillMode } from "../modes";
import type { GameState, PlayerId, PlayerState } from "../types";
import { createBaseEvent, createId, createPlayer, drawSkillIds, getOpeningBigCardDeal, startGame } from "./gameFactory";

export function restartGameFromEra(state: GameState, sourceId: PlayerId, cardInstanceId: string): boolean {
  if (!isBigSkillMode(state.config.skillMode)) return false;
  const source = state.players.find(({ id }) => id === sourceId);
  const card = source?.bigCards?.find(({ instanceId }) => instanceId === cardInstanceId);
  const originals = Object.values(state.initialPlayerSnapshots ?? {})
    .filter((player): player is PlayerState => Boolean(player && player.kind !== "spectator" && !player.summon));
  if (!source || !card || card.eraRestartUsed || originals.length < 2 || !originals.some(({ id }) => id === sourceId)) return false;

  const deal = state.openingBigCardDeal ?? getOpeningBigCardDeal(state.config);
  const retained: BigCardInstance = { cardId: card.cardId, instanceId: card.instanceId, eraRestartUsed: true,
    ...(card.onlyAbilityId ? { onlyAbilityId: card.onlyAbilityId } : {}) };
  const replacementCount = (count: number, id: PlayerId) => id === sourceId ? Math.max(0, count - 1) : count;
  const entries = originals.sort((a, b) => (a.tableSeat ?? Infinity) - (b.tableSeat ?? Infinity))
    .map((original) => ({ original, count: replacementCount(original.bigCards?.length ?? 0, original.id) }));
  const sharedPool = deal.pool.filter((id) => id !== retained.cardId);
  if (deal.allowDuplicateAcrossPlayers) {
    if (entries.some(({ original, count }) => count > (original.id === sourceId ? sharedPool.length : deal.pool.length))) return false;
  } else if (entries.reduce((sum, { count }) => sum + count, 0) > sharedPool.length) return false;
  const shared = deal.allowDuplicateAcrossPlayers ? undefined :
    drawSkillIds(sharedPool, entries.reduce((sum, { count }) => sum + count, 0));
  const initialHp = getStartingHp(state.config);
  const players = entries.map(({ original, count }) => {
    const current = state.players.find(({ id }) => id === original.id) ?? original;
    const player = createPlayer(current.name, original.kind, current);
    const replacements = shared ? shared.splice(0, count) :
      drawSkillIds(original.id === sourceId ? sharedPool : deal.pool, count);
    player.id = original.id;
    player.connected = current.connected;
    if (original.tableSeat !== undefined) player.tableSeat = original.tableSeat;
    player.baseInitialHp = player.hp = initialHp;
    player.bigCards = replacements.map((cardId) => ({ cardId, instanceId: createId("big_card") }));
    if (original.id === sourceId) player.bigCards.unshift(retained);
    return player;
  });
  const now = Date.now();
  const opening: GameState = {
    id: state.id, ownerId: state.ownerId, createdAt: state.createdAt, updatedAt: now,
    config: structuredClone(state.config), openingBigCardDeal: structuredClone(deal),
    phase: "lobby", activeTimingPhase: "turn_action", roundNumber: 1, roundTurnNumber: 1, turnNumber: 1,
    actionWindowPlayerIds: [], actionWindowPassPlayerIds: [], turnStartedAt: now,
    players: [...players, ...state.players.filter(({ kind }) => kind === "spectator").map((player) => structuredClone(player))],
    pendingActions: {}, skillKnowledge: {}, winnerIds: [],
    eventLog: state.eventLog.filter(({ type }) => type === "game_created" || type === "player_joined" || type === "player_renamed")
  };
  opening.eventLog.push({ ...createBaseEvent(opening, "system"), type: "system",
    message: `${source.name} 发动新纪元，重新抽卡并保留永恒纪元` });
  const restarted = startGame(opening, new Map(players.map(({ id }) => [id, initialHp])));
  for (const key of Object.keys(state) as Array<keyof GameState>) if (!Object.hasOwn(restarted, key)) delete state[key];
  Object.assign(state, restarted);
  return true;
}
