import type { GameConfig } from "./types";

export const BIG_SKILL_PHASE_SECONDS = 300;
export const MAX_BIG_CARDS_PER_PLAYER = 6;

export function isBigSkillMode(mode: GameConfig["skillMode"]): boolean {
  return mode === "big_random" || mode === "big_test_select";
}
