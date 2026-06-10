import { GamePhase, GameState } from "../types";
import { alivePlayers, playerHasActiveSkill, victoryEligiblePlayers } from "../engine/gameFactory";

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
    start: "action_window"
  },
  action_window: {
    submit_action: "action_window",
    resolve_done: "collecting_actions",
    finish: "finished"
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
  const alive = alivePlayers(state);
  const victoryAlive = victoryEligiblePlayers(state);
  return (
    victoryAlive.length <= 1 ||
    alive.some((player) => player.buffs.some((buff) => buff.id.startsWith("instant_win:"))) ||
    (victoryAlive.length === 2 &&
      victoryAlive.some((player) => playerHasActiveSkill(player, "skill_105_48309")))
  );
}

export const STATE_MACHINE_MERMAID = `stateDiagram-v2
  [*] --> lobby
  lobby --> lobby: join
  lobby --> action_window: start
  action_window --> action_window: action / pass
  action_window --> collecting_actions: turn action
  collecting_actions --> collecting_actions: submit_action
  collecting_actions --> resolving: all_actions_ready
  resolving --> collecting_actions: no winner
  resolving --> finished: alive players <= 1
  finished --> [*]`;
