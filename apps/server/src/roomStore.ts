import {
  GameId,
  GameState,
  ActionSubmission,
  GameConfig,
  PlayerId,
  PlayerState,
  PublicGameState,
  SubmitActionResult,
  addPlayerToGame,
  createGame,
  createPlayer,
  startGame,
  submitPlayerAction,
  toPublicGameState
} from "@bing/shared";
import { chooseAiAction } from "./ai";
import { MatchRecorder } from "./matchRecorder";

export class RoomStore {
  private readonly rooms = new Map<GameId, GameState>();
  private readonly recorder: MatchRecorder;

  constructor(recorder = new MatchRecorder()) {
    this.recorder = recorder;
  }

  createRoom(
    playerName: string,
    profile: Pick<PlayerState, "accountId" | "avatarUrl"> = {}
  ): { state: GameState; player: PlayerState } {
    const state = createGame(playerName, {}, profile);
    const player = state.players[0]!;
    this.rooms.set(state.id, state);
    this.recorder.recordState(state);
    return { state, player };
  }

  joinRoom(
    roomId: GameId,
    playerName: string,
    profile: Pick<PlayerState, "accountId" | "avatarUrl"> = {}
  ): { state: GameState; player: PlayerState } {
    const state = this.requireRoom(roomId);
    const player = createPlayer(playerName, "human", profile);
    const next = addPlayerToGame(state, player);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return { state: next, player };
  }

  resumePlayer(roomId: GameId, playerId: PlayerId): { state: GameState; player: PlayerState } {
    const state = this.requireRoom(roomId);
    const player = state.players.find((item) => item.id === playerId);
    if (!player) {
      throw new Error("这个房间里找不到你的玩家身份，请重新加入");
    }

    const next = structuredClone(state);
    const resumedPlayer = next.players.find((item) => item.id === playerId);
    if (!resumedPlayer) {
      throw new Error("这个房间里找不到你的玩家身份，请重新加入");
    }

    resumedPlayer.connected = true;
    next.updatedAt = Date.now();
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return { state: next, player: resumedPlayer };
  }

  addAi(roomId: GameId): GameState {
    const state = this.requireRoom(roomId);
    const aiNumber = state.players.filter((player) => player.kind === "ai").length + 1;
    const ai = createPlayer(`AI ${aiNumber}`, "ai");
    const next = addPlayerToGame(state, ai);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return next;
  }

  start(roomId: GameId, ownerId: PlayerId): GameState {
    const state = this.requireRoom(roomId);
    if (state.ownerId !== ownerId) {
      throw new Error("只有房主可以开始游戏");
    }

    const next = startGame(state);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return this.runAiTurns(roomId);
  }

  submitAction(
    roomId: GameId,
    playerId: PlayerId,
    action: ActionSubmission
  ): SubmitActionResult {
    const state = this.requireRoom(roomId);
    this.recorder.recordDecision(state, playerId, action);
    const result = submitPlayerAction(state, playerId, action);
    this.rooms.set(roomId, result.state);
    this.recorder.recordState(result.state);
    const afterAi = this.runAiTurns(roomId);
    this.recorder.recordState(afterAi);
    return {
      state: afterAi,
      resolved: result.resolved || afterAi.turnNumber !== result.state.turnNumber
    };
  }

  renamePlayer(roomId: GameId, playerId: PlayerId, name: string): GameState {
    const state = this.requireRoom(roomId);
    if (state.phase !== "lobby") {
      throw new Error("游戏开始后不能改名");
    }

    const next = structuredClone(state);
    const player = next.players.find((item) => item.id === playerId);
    if (!player) {
      throw new Error("玩家不存在");
    }

    player.name = name.trim() || "玩家";
    next.updatedAt = Date.now();
    next.eventLog.push({
      id: `evt_${Math.random().toString(36).slice(2, 10)}`,
      type: "player_renamed",
      at: Date.now(),
      roundNumber: next.roundNumber,
      turnNumber: next.turnNumber,
      playerId,
      name: player.name
    });
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return next;
  }

  leaveRoom(roomId: GameId, playerId: PlayerId): GameState | undefined {
    const state = this.requireRoom(roomId);
    const player = state.players.find((item) => item.id === playerId);
    if (!player) {
      throw new Error("玩家不存在");
    }

    const next = structuredClone(state);
    if (next.phase === "lobby") {
      next.players = next.players.filter((item) => item.id !== playerId);
    } else {
      const leavingPlayer = next.players.find((item) => item.id === playerId);
      if (leavingPlayer) {
        leavingPlayer.connected = false;
        leavingPlayer.status = "dead";
        leavingPlayer.cakes = 0;
      }
    }

    next.eventLog.push({
      id: `evt_${Math.random().toString(36).slice(2, 10)}`,
      type: "player_left",
      at: Date.now(),
      roundNumber: next.roundNumber,
      turnNumber: next.turnNumber,
      playerId,
      name: player.name
    });

    if (next.players.length === 0) {
      this.rooms.delete(roomId);
      return undefined;
    }

    if (next.ownerId === playerId) {
      next.ownerId = next.players[0]!.id;
    }

    next.updatedAt = Date.now();
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return next;
  }

  kickPlayer(roomId: GameId, ownerId: PlayerId, targetPlayerId: PlayerId): GameState {
    const state = this.requireRoom(roomId);
    if (state.ownerId !== ownerId) {
      throw new Error("只有房主可以踢人");
    }

    if (state.phase !== "lobby") {
      throw new Error("游戏开始后不能踢人");
    }

    if (targetPlayerId === ownerId) {
      throw new Error("房主不能踢自己");
    }

    const target = state.players.find((player) => player.id === targetPlayerId);
    if (!target) {
      throw new Error("玩家不存在");
    }

    const next = structuredClone(state);
    next.players = next.players.filter((player) => player.id !== targetPlayerId);
    next.updatedAt = Date.now();
    next.eventLog.push({
      id: `evt_${Math.random().toString(36).slice(2, 10)}`,
      type: "player_kicked",
      at: Date.now(),
      roundNumber: next.roundNumber,
      turnNumber: next.turnNumber,
      playerId: targetPlayerId,
      name: target.name,
      byPlayerId: ownerId
    });
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return next;
  }

  updateSettings(
    roomId: GameId,
    ownerId: PlayerId,
    config: Partial<GameConfig>
  ): GameState {
    const state = this.requireRoom(roomId);
    if (state.ownerId !== ownerId) {
      throw new Error("只有房主可以修改设置");
    }

    if (state.phase !== "lobby") {
      throw new Error("游戏开始后不能修改设置");
    }

    const next = structuredClone(state);
    next.config = {
      ...next.config,
      ...config,
      turnTimeLimitSeconds: clampNumber(
        config.turnTimeLimitSeconds ?? next.config.turnTimeLimitSeconds,
        5,
        180
      ),
      skillCount: clampNumber(config.skillCount ?? next.config.skillCount, 0, 3)
    };
    if (next.config.skillCount === 0) {
      next.config.skillMode = "none";
    } else {
      next.config.skillMode = "small_intro";
    }
    next.updatedAt = Date.now();
    next.eventLog.push({
      id: `evt_${Math.random().toString(36).slice(2, 10)}`,
      type: "settings_updated",
      at: Date.now(),
      roundNumber: next.roundNumber,
      turnNumber: next.turnNumber,
      byPlayerId: ownerId,
      config: next.config
    });
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return next;
  }

  resolveTimedOutActions(roomId: GameId): GameState {
    let current = this.requireRoom(roomId);
    if (current.phase !== "collecting_actions") {
      return current;
    }

    const now = Date.now();
    if (current.turnDeadlineAt && now < current.turnDeadlineAt) {
      return current;
    }

    const timedOutTurnNumber = current.turnNumber;
    const missingPlayerIds = current.players
      .filter(
        (player) =>
          player.status === "alive" &&
          !current.pendingActions[player.id]
      )
      .map((player) => player.id);

    for (const playerId of missingPlayerIds) {
      if (
        current.phase !== "collecting_actions" ||
        current.turnNumber !== timedOutTurnNumber
      ) {
        break;
      }

      const fallback: ActionSubmission = { type: "gain_cake" };
      this.recorder.recordDecision(current, playerId, fallback);
      const result = submitPlayerAction(current, playerId, fallback);
      current = result.state;
      this.rooms.set(roomId, current);
      this.recorder.recordState(current);
    }

    return current;
  }

  get(roomId: GameId): GameState | undefined {
    return this.rooms.get(roomId);
  }

  publicState(roomId: GameId, viewerPlayerId?: PlayerId): PublicGameState {
    return toPublicGameState(this.requireRoom(roomId), viewerPlayerId);
  }

  listRecordedMatches() {
    return this.recorder.listMatches();
  }

  readRecordedMatch(roomId: GameId) {
    return this.recorder.readMatch(roomId);
  }

  readTrainingSamples(roomId: GameId) {
    return this.recorder.readTrainingSamples(roomId);
  }

  private runAiTurns(roomId: GameId): GameState {
    let current = this.requireRoom(roomId);
    let madeMove = true;

    while (current.phase === "collecting_actions" && madeMove) {
      madeMove = false;
      for (const player of current.players) {
        if (
          player.kind !== "ai" ||
          player.status !== "alive" ||
          current.pendingActions[player.id]
        ) {
          continue;
        }

        const action = chooseAiAction(current, player.id);
        this.recorder.recordDecision(current, player.id, action);
        const result = submitPlayerAction(current, player.id, action);
        current = result.state;
        this.rooms.set(roomId, current);
        this.recorder.recordState(current);
        madeMove = true;

        if (current.phase !== "collecting_actions") {
          break;
        }
      }
    }

    return current;
  }

  private requireRoom(roomId: GameId): GameState {
    const state = this.rooms.get(roomId);
    if (!state) {
      throw new Error("房间不存在");
    }
    return state;
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}
