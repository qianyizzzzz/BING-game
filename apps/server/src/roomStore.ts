import {
  GameId,
  GameState,
  ActionSubmission,
  GameConfig,
  PlayerId,
  PlayerState,
  PublicGameState,
  SkillAction,
  SkillId,
  SubmitActionResult,
  addPlayerToGame,
  addSpectatorToGame,
  advanceActionWindow,
  createBaseEvent,
  createGame,
  createPlayer,
  chooseWitherNumber,
  decomposeSkill,
  enterActionWindow,
  getSkill,
  guessPlayerSkill,
  passActionWindow,
  skipActionWindowsUntilTurnAction,
  startGame,
  submitActionWindowSkill,
  submitPlayerAction,
  submitPointGameAction, hasPendingPointGame, POINT_GAME_MOVES, getBlindSkillChoices, type PointGameAction,
  toPublicGameState
} from "@bing/shared";
import { createId, getBigCard, isBigSkillMode, MAX_BIG_CARDS_PER_PLAYER, parseRoomPreset, sanitizeBigCardIds } from "@bing/shared";
import { chooseAiAction, chooseAiActionWindowSkill } from "./ai";
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

  spectateRoom(
    roomId: GameId,
    playerName: string,
    profile: Pick<PlayerState, "accountId" | "avatarUrl"> = {}
  ): { state: GameState; player: PlayerState } {
    const state = this.requireRoom(roomId);
    const player = createPlayer(playerName, "spectator", profile);
    const next = addSpectatorToGame(state, player);
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
      resolved:
        result.resolved ||
        afterAi.turnNumber !== result.state.turnNumber ||
        afterAi.phase !== result.state.phase
    };
  }

  enterActionWindow(roomId: GameId, playerId: PlayerId): GameState {
    const state = this.requireRoom(roomId);
    const next = enterActionWindow(state, playerId);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return this.runAiTurns(roomId);
  }

  passActionWindow(roomId: GameId, playerId: PlayerId): GameState {
    const state = this.requireRoom(roomId);
    const next = passActionWindow(state, playerId);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return this.runAiTurns(roomId);
  }

  skipActionWindowsUntilTurnAction(roomId: GameId, playerId: PlayerId): GameState {
    const state = this.requireRoom(roomId);
    const next = skipActionWindowsUntilTurnAction(state, playerId);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return this.runAiTurns(roomId);
  }

  submitWindowSkill(roomId: GameId, playerId: PlayerId, action: SkillAction): GameState {
    const state = this.requireRoom(roomId);
    this.recorder.recordDecision(state, playerId, action);
    const next = submitActionWindowSkill(state, playerId, action);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return this.runAiTurns(roomId);
  }

  submitPointGame(roomId: GameId, playerId: PlayerId, action: PointGameAction): GameState {
    const next = submitPointGameAction(this.requireRoom(roomId), playerId, action);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return this.runAiTurns(roomId);
  }

  guessSkill(
    roomId: GameId,
    playerId: PlayerId,
    targetPlayerId: PlayerId,
    targetSkillId: SkillId
  ): GameState {
    const state = this.requireRoom(roomId);
    const next = guessPlayerSkill(state, playerId, targetPlayerId, targetSkillId);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return this.runAiTurns(roomId);
  }

  chooseWitherNumber(roomId: GameId, playerId: PlayerId, selectionIndex: number, value: number): GameState {
    const next = chooseWitherNumber(this.requireRoom(roomId), playerId, selectionIndex, value);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return this.runAiTurns(roomId);
  }

  decomposeSkill(roomId: GameId, playerId: PlayerId, fusionId: string): GameState {
    const state = this.requireRoom(roomId);
    const next = decomposeSkill(state, playerId, fusionId);
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return this.runAiTurns(roomId);
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
    if (player.kind === "spectator" || next.phase === "lobby") {
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
    const requestedSkillMode = config.skillMode ?? next.config.skillMode;
    let skillCount = clampNumber(config.skillCount ?? next.config.skillCount, 0,
      isBigSkillMode(requestedSkillMode) ? MAX_BIG_CARDS_PER_PLAYER : 3);
    if (
      config.skillMode &&
      config.skillMode !== "none" &&
      config.skillCount === undefined &&
      skillCount === 0
    ) {
      skillCount = 1;
    }
    next.config = {
      ...next.config,
      ...config,
      speedMode: "normal",
      turnTimeLimitSeconds: clampNumber(
        config.turnTimeLimitSeconds ?? next.config.turnTimeLimitSeconds,
        5,
        180
      ),
      skillCount
    };
    next.config.skillMode = normalizeSkillMode(requestedSkillMode, next.config.skillCount);
    syncLobbySkillsWithMode(next);
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

  loadPreset(roomId: GameId, ownerId: PlayerId, input: unknown): GameState {
    const state = this.requireRoom(roomId);
    if (state.ownerId !== ownerId || state.phase !== "lobby") {
      throw new Error("只有房主可以在开局前读取房间预设");
    }
    const preset = parseRoomPreset(input);
    const humanCount = state.players.filter((player) => player.kind === "human").length;
    if (humanCount + preset.aiSkills.length > preset.config.maxPlayers) {
      throw new Error("预设中的 AI 数量超出当前真人玩家可用的座位");
    }
    for (const player of state.players) {
      if (player.kind !== "human" || player.id === ownerId) continue;
      const choices = state.config.skillMode === "big_test_select" ? player.bigCards?.length ?? 0 :
        state.config.skillMode === "test_select" ? player.skills.length : 0;
      if (choices > 0 && (state.config.skillMode !== preset.config.skillMode || choices > preset.config.skillCount)) {
        throw new Error("预设的模式或技能槽数与其他真人的现有选择冲突，请先让玩家清空自己的技能");
      }
    }
    let next = structuredClone(state);
    next.config = preset.config;
    const keepAi = new Set(next.players.filter((player) => player.kind === "ai")
      .slice(0, preset.aiSkills.length).map((player) => player.id));
    next.players = next.players.filter((player) => player.kind !== "ai" || keepAi.has(player.id));
    for (let i = keepAi.size; i < preset.aiSkills.length; i++) {
      next = addPlayerToGame(next, createPlayer(`AI ${i + 1}`, "ai"));
    }
    syncLobbySkillsWithMode(next);
    if (["test_select", "big_test_select"].includes(next.config.skillMode)) {
      const ai = next.players.filter((player) => player.kind === "ai");
      const host = next.players.find((player) => player.id === ownerId)!;
      const bigMode = next.config.skillMode === "big_test_select";
      assignLobbySkills(host, preset.ownerSkills, bigMode, next.config.skillCount);
      ai.forEach((player, i) => assignLobbySkills(player, preset.aiSkills[i]!, bigMode, next.config.skillCount));
    }
    next.updatedAt = Date.now();
    next.eventLog.push({ ...createBaseEvent(next, "settings_updated"), type: "settings_updated",
      byPlayerId: ownerId, config: next.config });
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return next;
  }

  updatePlayerSkills(
    roomId: GameId,
    actorPlayerId: PlayerId,
    targetPlayerId: PlayerId,
    skillIds: SkillId[]
  ): GameState {
    const state = this.requireRoom(roomId);
    if (state.phase !== "lobby") {
      throw new Error("游戏开始后不能调整测试技能");
    }

    if (!["test_select", "big_test_select"].includes(state.config.skillMode) || state.config.skillCount <= 0) {
      throw new Error("只有测试自选技能模式可以指定技能");
    }

    const actor = state.players.find((player) => player.id === actorPlayerId);
    const target = state.players.find((player) => player.id === targetPlayerId);
    if (!actor) {
      throw new Error("玩家不存在");
    }
    if (!target) {
      throw new Error("目标玩家不存在");
    }
    if (target.kind === "spectator") {
      throw new Error("观战者不能携带技能");
    }
    if (target.kind === "ai") {
      if (state.ownerId !== actorPlayerId) {
        throw new Error("只有房主可以给 AI 指定技能");
      }
    } else if (targetPlayerId !== actorPlayerId) {
      throw new Error("只能选择自己的技能");
    }

    const next = structuredClone(state);
    const nextTarget = next.players.find((player) => player.id === targetPlayerId);
    if (!nextTarget) {
      throw new Error("目标玩家不存在");
    }

    const bigMode = next.config.skillMode === "big_test_select";
    const nextSkillIds = assignLobbySkills(nextTarget, skillIds, bigMode, next.config.skillCount);
    next.skillKnowledge = {};
    next.updatedAt = Date.now();
    next.eventLog.push({
      ...createBaseEvent(next, "system"),
      type: "system",
      message: `${actor.name} 更新了 ${target.name} 的${bigMode ? "测试大技能" : "测试技能"}：${bigMode
        ? nextSkillIds.map((id) => getBigCard(id)!.name).join("、") || "未选择"
        : formatSkillNames(nextSkillIds)}`
    });
    this.rooms.set(roomId, next);
    this.recorder.recordState(next);
    return next;
  }

  resolveTimedOutActions(roomId: GameId): GameState {
    let current = this.requireRoom(roomId);
    if (current.phase === "action_window") {
      const now = Date.now();
      if (current.actionWindowDeadlineAt && now >= current.actionWindowDeadlineAt) {
        current = advanceActionWindow(current);
        this.rooms.set(roomId, current);
        this.recorder.recordState(current);
        return this.runAiTurns(roomId);
      }
      return current;
    }

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

    while (
      (current.phase === "collecting_actions" || current.phase === "action_window") &&
      madeMove
    ) {
      madeMove = false;

      if (hasPendingPointGame(current)) {
        const removal = current.verdictTurn?.removalPlayerId;
        const game = current.verdictTurn?.games.find((entry) => !entry.winnerId);
        const actor = current.players.find((player) => player.kind === "ai" && (removal ? player.id === removal : game &&
          [game.sourceId, game.targetId].includes(player.id) && !game.moves[player.id]));
        if (actor) {
          const action: PointGameAction = removal ? { kind: "remove", instanceIds: getBlindSkillChoices(current, actor.id, false)
            .slice(0, 16).map((choice) => choice.instanceId) } : { kind: "move", gameId: game!.id, round: game!.round,
            move: POINT_GAME_MOVES[Math.floor(Math.random() * POINT_GAME_MOVES.length)]! };
          current = submitPointGameAction(current, actor.id, action);
          this.rooms.set(roomId, current);
          this.recorder.recordState(current);
          madeMove = true;
        }
        continue;
      }

      if (current.phase === "action_window") {
        for (const player of current.players) {
          if (
            player.kind !== "ai" ||
            player.status !== "alive" ||
            current.actionWindowPassPlayerIds.includes(player.id)
          ) {
            continue;
          }

          const action = chooseAiActionWindowSkill(current, player.id);
          if (action) {
            this.recorder.recordDecision(current, player.id, action);
            current = submitActionWindowSkill(current, player.id, action);
            this.rooms.set(roomId, current);
            this.recorder.recordState(current);

            const currentPlayer = current.players.find((item) => item.id === player.id);
            if (
              current.phase === "action_window" &&
              !hasPendingPointGame(current) &&
              currentPlayer?.status === "alive" &&
              !current.actionWindowPassPlayerIds.includes(player.id)
            ) {
              current = passActionWindow(current, player.id);
            }
          } else {
            current = passActionWindow(current, player.id);
          }
          this.rooms.set(roomId, current);
          this.recorder.recordState(current);
          madeMove = true;

          if (current.phase !== "action_window" || hasPendingPointGame(current)) {
            break;
          }
        }
        continue;
      }

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
  const normalized = Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, Math.floor(normalized)));
}

function normalizeSkillMode(
  mode: GameConfig["skillMode"],
  skillCount: number
): GameConfig["skillMode"] {
  if (skillCount <= 0) {
    return "none";
  }
  if (mode === "small_intro" || mode === "test_select" || isBigSkillMode(mode)) {
    return mode;
  }
  return "none";
}

function syncLobbySkillsWithMode(state: GameState): void {
  if (isBigSkillMode(state.config.skillMode)) {
    for (const player of state.players) {
      player.skills = [];
      player.revealedSkillIds = [];
      delete player.skillFusions;
      delete player.bigCardSlotCount;
      if (state.config.skillMode === "big_test_select" && player.kind !== "spectator") {
        const valid = sanitizeBigCardIds((player.bigCards ?? []).map((card) => card.cardId), state.config.skillCount);
        player.bigCards = (player.bigCards ?? []).filter((card) => valid.includes(card.cardId)).slice(0, state.config.skillCount);
      } else {
        player.bigCards = [];
      }
    }
    state.skillKnowledge = {};
    return;
  }
  for (const player of state.players) {
    delete player.bigCards;
    delete player.bigCardSlotCount;
  }
  if (state.config.skillMode === "test_select") {
    for (const player of state.players) {
      if (player.kind !== "spectator") {
        player.skills = sanitizeSkillIds(player.skills, state.config.skillCount);
      } else {
        player.skills = [];
      }
      player.revealedSkillIds = [];
    }
  } else {
    for (const player of state.players) {
      player.skills = [];
      player.revealedSkillIds = [];
    }
  }
  state.skillKnowledge = {};
}

function assignLobbySkills(player: PlayerState, ids: SkillId[], bigMode: boolean, skillCount: number): SkillId[] {
  const selected = bigMode ? sanitizeBigCardIds(ids, skillCount) : sanitizeSkillIds(ids, skillCount);
  player.skills = bigMode ? [] : selected;
  player.revealedSkillIds = [];
  if (bigMode) player.bigCards = selected.map((cardId) => ({ instanceId: createId("big_card"), cardId }));
  else delete player.bigCards;
  return selected;
}

function sanitizeSkillIds(skillIds: SkillId[], maxCount: number): SkillId[] {
  if (maxCount <= 0) {
    return [];
  }

  const result: SkillId[] = [];
  for (const skillId of skillIds) {
    if (typeof skillId !== "string") {
      continue;
    }

    const skill = getSkill(skillId);
    if (!skill?.implemented || skill.fusion) {
      continue;
    }

    result.push(skillId);
    if (result.length >= maxCount) {
      break;
    }
  }
  return result;
}

function formatSkillNames(skillIds: SkillId[]): string {
  if (skillIds.length === 0) {
    return "未选择";
  }
  return skillIds.map((skillId) => getSkill(skillId)?.name ?? skillId).join("、");
}
