import { GameEvent, GameState } from "../types";

export interface ReplayFrame {
  index: number;
  event: GameEvent;
}

export function exportReplay(state: GameState): ReplayFrame[] {
  return state.eventLog.map((event, index) => ({
    index,
    event
  }));
}
