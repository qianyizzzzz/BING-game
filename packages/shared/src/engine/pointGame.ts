import type { PlayerId } from "../types";

export const POINT_GAME_MOVES = ["rock", "paper", "scissors"] as const;
export type PointGameMove = (typeof POINT_GAME_MOVES)[number];
export type PointGameAction = { kind: "move"; gameId: string; round: number; move: PointGameMove } | { kind: "remove"; instanceIds: string[] };

export interface PointGame {
  id: string;
  sourceId: PlayerId;
  targetId: PlayerId;
  sourceCardId?: string;
  round: number;
  moves: Partial<Record<PlayerId, PointGameMove>>;
  winnerId?: PlayerId;
}

export interface VerdictTurn {
  turnNumber: number;
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
  const beats: Record<PointGameMove, PointGameMove> = { rock: "scissors", paper: "rock", scissors: "paper" };
  game.winnerId = beats[source] === target ? game.sourceId : game.targetId;
  return "decided";
}
