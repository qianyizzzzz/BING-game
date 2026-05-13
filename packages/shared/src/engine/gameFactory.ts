import {
  BaseGameEvent,
  GameConfig,
  GameId,
  GameState,
  INITIAL_HP,
  MAX_PLAYERS,
  PlayerId,
  PlayerState,
  PublicGameState
} from "../types";
import { getIntroSmallSkillIds } from "../skills/registry";

export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxPlayers: MAX_PLAYERS,
  allowAI: true,
  firstTurnNoAttack: true,
  hideCakeCounts: false,
  turnTimeLimitSeconds: 45,
  speedMode: "normal",
  skillMode: "none",
  skillCount: 0
};

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createBaseEvent(
  state: Pick<GameState, "roundNumber" | "turnNumber">,
  _type: string
): BaseGameEvent {
  return {
    id: createId("evt"),
    at: Date.now(),
    roundNumber: state.roundNumber,
    turnNumber: state.turnNumber,
    type: _type
  };
}

export function createPlayer(
  name: string,
  kind: PlayerState["kind"] = "human",
  profile: Pick<PlayerState, "accountId" | "avatarUrl"> = {}
): PlayerState {
  const player: PlayerState = {
    id: createId("player"),
    name: name.trim() || "玩家",
    kind,
    hp: INITIAL_HP,
    cakes: 0,
    status: "alive",
    connected: true,
    skills: [],
    buffs: []
  };
  if (profile.accountId) {
    player.accountId = profile.accountId;
  }
  if (profile.avatarUrl) {
    player.avatarUrl = profile.avatarUrl;
  }

  return player;
}

export function createGame(
  firstPlayerName: string,
  config: Partial<GameConfig> = {},
  firstPlayerProfile: Pick<PlayerState, "accountId" | "avatarUrl"> = {}
): GameState {
  const now = Date.now();
  const firstPlayer = createPlayer(firstPlayerName, "human", firstPlayerProfile);
  const state: GameState = {
    id: createId("room"),
    ownerId: firstPlayer.id,
    phase: "lobby",
    roundNumber: 1,
    roundTurnNumber: 1,
    turnNumber: 1,
    turnStartedAt: now,
    players: [firstPlayer],
    pendingActions: {},
    eventLog: [],
    winnerIds: [],
    config: {
      ...DEFAULT_GAME_CONFIG,
      ...config
    },
    createdAt: now,
    updatedAt: now
  };

  state.eventLog.push({
    ...createBaseEvent(state, "game_created"),
    type: "game_created",
    gameId: state.id
  });

  state.eventLog.push({
    ...createBaseEvent(state, "player_joined"),
    type: "player_joined",
    playerId: state.players[0]!.id,
    name: state.players[0]!.name
  });

  return state;
}

export function addPlayerToGame(
  state: GameState,
  player: PlayerState
): GameState {
  if (state.players.length >= state.config.maxPlayers) {
    throw new Error("房间人数已满");
  }

  if (state.phase !== "lobby") {
    throw new Error("游戏已经开始，不能加入");
  }

  const next = cloneGameState(state);
  next.players.push(player);
  next.updatedAt = Date.now();
  next.eventLog.push({
    ...createBaseEvent(next, "player_joined"),
    type: "player_joined",
    playerId: player.id,
    name: player.name
  });
  return next;
}

export function startGame(state: GameState): GameState {
  if (state.phase !== "lobby") {
    throw new Error("游戏已经开始");
  }

  const alivePlayers = state.players.filter((player) => player.status === "alive");
  if (alivePlayers.length < 2) {
    throw new Error("至少需要 2 名玩家才能开始");
  }

  const next = cloneGameState(state);
  next.phase = "collecting_actions";
  next.turnStartedAt = Date.now();
  const deadline = getTurnDeadline(next);
  if (deadline) {
    next.turnDeadlineAt = deadline;
  }
  assignIntroSkills(next);
  applyStartOfGameSkills(next);
  next.updatedAt = Date.now();
  next.eventLog.push({
    ...createBaseEvent(next, "system"),
    type: "system",
    message: next.config.firstTurnNoAttack
      ? "游戏开始，第一回合禁止攻击"
      : "游戏开始"
  });
  if (next.config.skillMode === "small_intro") {
    next.eventLog.push({
      ...createBaseEvent(next, "system"),
      type: "system",
      message: `技能入门模式：每名玩家获得 ${next.config.skillCount} 张随机小技能`
    });
  }
  return next;
}

function applyStartOfGameSkills(state: GameState): void {
  for (const player of state.players) {
    if (player.skills.includes("skill_67_31717")) {
      player.hp = INITIAL_HP * 3;
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `${player.name} 的沐浴圣光生效：初始生命变为 ${player.hp}`
      });
    }
  }
}

export function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function findPlayer(state: GameState, playerId: PlayerId): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId);
}

export function alivePlayers(state: GameState): PlayerState[] {
  return state.players.filter((player) => player.status === "alive");
}

export function toPublicGameState(
  state: GameState,
  viewerPlayerId?: PlayerId
): PublicGameState {
  const pendingActionPlayerIds = Object.keys(state.pendingActions);
  const { pendingActions: _pendingActions, ...publicFields } = state;
  const players = publicFields.players.map((player) => {
    if (
      state.config.hideCakeCounts &&
      viewerPlayerId &&
      player.id !== viewerPlayerId
    ) {
      return {
        ...player,
        cakes: -1
      };
    }

    return player;
  });
  const eventLog = publicFields.eventLog.map((event) => {
    if (
      state.config.hideCakeCounts &&
      viewerPlayerId &&
      event.type === "cake_changed" &&
      event.playerId !== viewerPlayerId
    ) {
      return {
        ...event,
        before: -1,
        after: -1
      };
    }

    return event;
  });

  if (viewerPlayerId) {
    return {
      ...publicFields,
      players,
      eventLog,
      pendingActionPlayerIds,
      viewerPlayerId
    };
  }

  return {
    ...publicFields,
    players,
    eventLog,
    pendingActionPlayerIds
  };
}

export function getCurrentTurnLimitSeconds(state: GameState): number {
  const base = Math.max(5, state.config.turnTimeLimitSeconds);
  if (state.config.speedMode !== "accelerating") {
    return base;
  }

  if (state.turnNumber >= 24) {
    return Math.max(5, Math.floor(base / 3));
  }

  if (state.turnNumber >= 12) {
    return Math.max(8, Math.floor(base / 2));
  }

  return base;
}

export function getCakeGainAmount(state: GameState): number {
  if (state.config.speedMode !== "accelerating") {
    return 1;
  }

  if (state.turnNumber >= 24) {
    return 3;
  }

  if (state.turnNumber >= 12) {
    return 2;
  }

  return 1;
}

export function getTurnDeadline(state: GameState): number | undefined {
  const seconds = getCurrentTurnLimitSeconds(state);
  return seconds > 0 ? state.turnStartedAt + seconds * 1000 : undefined;
}

function assignIntroSkills(state: GameState): void {
  if (state.config.skillMode !== "small_intro" || state.config.skillCount <= 0) {
    return;
  }

  const skillIds = getIntroSmallSkillIds();
  if (skillIds.length === 0) {
    return;
  }

  for (const player of state.players) {
    if (player.skills.length > 0) {
      continue;
    }

    const skillCount = Math.max(0, Math.min(3, Math.floor(state.config.skillCount)));
    player.skills = drawSkillIds(skillIds, skillCount);
  }
}

function drawSkillIds(skillIds: string[], count: number): string[] {
  const deck = [...skillIds];
  const result: string[] = [];

  while (result.length < count && deck.length > 0) {
    const index = Math.floor(Math.random() * deck.length);
    const [skillId] = deck.splice(index, 1);
    if (skillId) {
      result.push(skillId);
    }
  }

  return result;
}
