import { MAX_PLAYERS, MIN_PLAYERS, type GameConfig, type PlayerState, type PublicGameState } from "./types";
import { isBigSkillMode, MAX_BIG_CARDS_PER_PLAYER } from "./modes";

export interface RoomPreset {
  version: 1;
  config: GameConfig;
  ownerSkills: string[];
  /** One entry for each AI, including empty assignments. */
  aiSkills: string[][];
}

function presetConfig(config: GameConfig): GameConfig {
  const { maxPlayers, allowAI, firstTurnNoAttack, hideCakeCounts, turnTimeLimitSeconds, skillMode, skillCount } = config;
  return { maxPlayers, allowAI, firstTurnNoAttack, hideCakeCounts, turnTimeLimitSeconds, skillMode, skillCount, speedMode: "normal" };
}

export function createRoomPreset(state: PublicGameState): RoomPreset {
  const selection = (player: PlayerState | undefined): string[] => {
    if (state.config.skillMode === "big_test_select") return player?.bigCards?.map((card) => card.cardId) ?? [];
    return state.config.skillMode === "test_select" ? [...(player?.skills ?? [])] : [];
  };
  return {
    version: 1,
    config: presetConfig(state.config),
    ownerSkills: selection(state.players.find((player) => player.id === state.ownerId)),
    aiSkills: state.players.filter((player) => player.kind === "ai").map(selection)
  };
}

export function parseRoomPreset(input: unknown): RoomPreset {
  const preset = input as Partial<RoomPreset> | null | undefined;
  const config = preset?.config;
  const isIntegerIn = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
  if (preset?.version !== 1 || !config ||
    !["none", "small_intro", "test_select", "big_random", "big_test_select"].includes(config.skillMode) ||
    !isIntegerIn(config.maxPlayers, MIN_PLAYERS, MAX_PLAYERS) || !isIntegerIn(config.turnTimeLimitSeconds, 5, 180) ||
    !isIntegerIn(config.skillCount, config.skillMode === "none" ? 0 : 1,
      isBigSkillMode(config.skillMode) ? MAX_BIG_CARDS_PER_PLAYER : config.skillMode === "none" ? 0 : 3) ||
    [config.allowAI, config.hideCakeCounts, config.firstTurnNoAttack].some((flag) => typeof flag !== "boolean")) {
    throw new Error("房间预设格式或设置数值无效");
  }
  const isSelection = (selection: unknown): selection is string[] => Array.isArray(selection) &&
    selection.length <= config.skillCount && selection.every((id) => typeof id === "string" && id.length <= 64);
  if (!isSelection(preset.ownerSkills) || !Array.isArray(preset.aiSkills) ||
    preset.aiSkills.length >= config.maxPlayers || !preset.aiSkills.every(isSelection)) {
    throw new Error("房间预设的 AI 或技能分配无效");
  }
  return {
    version: 1,
    config: presetConfig(config),
    ownerSkills: preset.ownerSkills,
    aiSkills: preset.aiSkills
  };
}
