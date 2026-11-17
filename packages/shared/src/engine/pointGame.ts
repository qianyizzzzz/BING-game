import type { PlayerId } from "../types";

export const POINT_GAME_MOVES = ["rock", "paper", "scissors"] as const;
export type PointGameMove = (typeof POINT_GAME_MOVES)[number];
export type PointGameAction = { kind: "move"; gameId: string; round: number; move: PointGameMove } | { kind: "remove"; instanceIds: string[] };
const beats: Record<PointGameMove, PointGameMove> = { rock: "scissors", paper: "rock", scissors: "paper" };

export function advancePointGameElimination(remainingIds: PlayerId[], moves: Partial<Record<PlayerId, PointGameMove>>): PlayerId[] | undefined {
  if (remainingIds.some((id) => !moves[id])) return;
  const hands = [...new Set(remainingIds.map((id) => moves[id]!))];
  if (hands.length !== 2) return remainingIds;
  const winner = beats[hands[0]!] === hands[1] ? hands[0] : hands[1];
  return remainingIds.filter((id) => moves[id] === winner);
}

export interface PointGame {
  id: string;
  sourceId: PlayerId;
  targetId: PlayerId;
  sourceCardId?: string;
  kind?: "god_king";
  moveStacks?: number;
  round: number;
  moves: Partial<Record<PlayerId, PointGameMove>>;
  winnerId?: PlayerId;
}

export interface VerdictTurn {
  turnNumber: number;
  opening?: true;
  games: PointGame[];
  removalPlayerId?: PlayerId;
}

/** Point games can replace this resolver without changing the turn pause or card rewards. */
export function resolvePointGameRound(game: PointGame): "waiting" | "tie" | "decided" {
  const source = game.moves[game.sourceId];
  const target = game.moves[game.targetId];
  if (!source || !target) return "waiting";
  if (source === target) {
    game.moves = {};
    game.round++;
    return "tie";
  }
  game.winnerId = beats[source] === target ? game.sourceId : game.targetId;
  return "decided";
}
