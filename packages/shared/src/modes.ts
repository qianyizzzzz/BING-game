import { INITIAL_HP, type GameConfig } from "./types";

export const BIG_SKILL_PHASE_SECONDS = 300;
export const MAX_BIG_CARDS_PER_PLAYER = 6;
export const BIG_MODE_INITIAL_HP = 18;

export function isBigSkillMode(mode: GameConfig["skillMode"]): boolean {
  return mode === "big_random" || mode === "big_test_select";
}

export function isValidInitialHp(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function getStartingHp(config: Pick<GameConfig, "skillMode" | "initialHp">): number {
  if (config.skillMode === "none") return INITIAL_HP;
  if (config.initialHp !== undefined && isValidInitialHp(config.initialHp)) return config.initialHp;
  return isBigSkillMode(config.skillMode) ? BIG_MODE_INITIAL_HP : INITIAL_HP;
}
