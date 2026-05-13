import { GamePhase, GameState } from "../types";
import { alivePlayers } from "../engine/gameFactory";

export type GameTransition =
  | "join"
  | "start"
  | "submit_action"
  | "all_actions_ready"
  | "resolve_done"
  | "finish";

export const GAME_STATE_GRAPH: Record<GamePhase, Partial<Record<GameTransition, GamePhase>>> = {
  lobby: {
    join: "lobby",
    start: "collecting_actions"
  },
  collecting_actions: {
    submit_action: "collecting_actions",
    all_actions_ready: "resolving",
    finish: "finished"
  },
  resolving: {
    resolve_done: "collecting_actions",
    finish: "finished"
  },
  finished: {}
};

export function canTransition(
  phase: GamePhase,
  transition: GameTransition
): boolean {
  return Boolean(GAME_STATE_GRAPH[phase][transition]);
}

export function shouldFinishGame(state: GameState): boolean {
  return alivePlayers(state).length <= 1;
}

export const STATE_MACHINE_MERMAID = `stateDiagram-v2
  [*] --> lobby
  lobby --> lobby: join
  lobby --> collecting_actions: start
  collecting_actions --> collecting_actions: submit_action
  collecting_actions --> resolving: all_actions_ready
  resolving --> collecting_actions: no winner
  resolving --> finished: alive players <= 1
  finished --> [*]`;
