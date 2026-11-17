import type { GameState, PlayerId, SkillAction } from "../types";
import type { PointGameMove } from "./pointGame";

export const GAME_SWITCH_SECONDS = 60;
export const GAME_SWITCH_MODES = {
  rock_paper_scissors: "剪刀石头布",
  basic_bing: "无技能的饼"
} as const;
export type GameSwitchMode = keyof typeof GAME_SWITCH_MODES;
export interface GameSwitchDeclaration { sourceId: PlayerId; mode: GameSwitchMode; cost: number; action: SkillAction; }

interface GameSwitchBase {
  sourceId: PlayerId;
  participantIds: PlayerId[];
  deadlineAt: number;
}

export type GameSwitchPointSession = GameSwitchBase & {
  mode: "rock_paper_scissors"; id: string; round: number; remainingIds: PlayerId[]; moves: Partial<Record<PlayerId, PointGameMove>>;
};

export type GameSwitchSession = GameSwitchPointSession | (GameSwitchBase & { mode: "basic_bing"; game: GameState });

export function isGameSwitchMode(value: unknown): value is GameSwitchMode {
  return value === "rock_paper_scissors" || value === "basic_bing";
}
