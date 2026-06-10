import {
  BaseGameEvent,
  GameConfig,
  GameId,
  GameState,
  INITIAL_HP,
  MAX_PLAYERS,
  PendingActionMap,
  PlayerId,
  PlayerState,
  PublicGameState,
  SkillId,
  SkillTimingPhase
} from "../types";
import { getIntroSmallSkillIds, getSkill, skillHasTypeTag } from "../skills/registry";
import { SkillExposureTiming } from "../skills/types";

export const ACTION_PROMPT_SECONDS = 5;
export const ACTION_WINDOW_SECONDS = 20;
export const SKILL_PREPARATION_SECONDS = 45;
export const COLLAPSE_BUFF_PREFIX = "collapse_until_round:";
export const SKILL_DISABLED_BUFF_PREFIX = "skill_disabled_until_round:";
export const PUPPET_BUFF_PREFIX = "puppet_of:";
export const SKILL_ACTIVATED_BUFF_PREFIX = "skill_activated:";
export const CAUSAL_COGNITION_SKILL_ID = "skill_121_59557";

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
  state: Pick<GameState, "roundNumber" | "turnNumber"> & Partial<Pick<GameState, "roundTurnNumber">>,
  _type: string
): BaseGameEvent {
  return {
    id: createId("evt"),
    at: Date.now(),
    roundNumber: state.roundNumber,
    turnNumber: state.roundTurnNumber ?? state.turnNumber,
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
    hp: kind === "spectator" ? 0 : INITIAL_HP,
    cakes: 0,
    status: kind === "spectator" ? "dead" : "alive",
    connected: true,
    skills: [],
    revealedSkillIds: [],
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
    activeTimingPhase: "turn_action",
    actionWindowPlayerIds: [],
    actionWindowPassPlayerIds: [],
    turnStartedAt: now,
    players: [firstPlayer],
    pendingActions: {},
    skillKnowledge: {},
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
  const seatedPlayers = state.players.filter((item) => item.kind !== "spectator");
  if (seatedPlayers.length >= state.config.maxPlayers) {
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

export function addSpectatorToGame(
  state: GameState,
  spectator: PlayerState
): GameState {
  const next = cloneGameState(state);
  spectator.kind = "spectator";
  spectator.status = "dead";
  spectator.hp = 0;
  spectator.cakes = 0;
  spectator.skills = [];
  spectator.revealedSkillIds = [];
  spectator.buffs = [];
  next.players.push(spectator);
  next.updatedAt = Date.now();
  next.eventLog.push({
    ...createBaseEvent(next, "player_joined"),
    type: "player_joined",
    playerId: spectator.id,
    name: `${spectator.name}（观战）`
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
  assignIntroSkills(next);
  applyStartOfGameSkills(next);
  if (usesSkillActionWindows(next)) {
    beginActionPrompt(next, "round_pre_interval_action", {
      promptSeconds: SKILL_PREPARATION_SECONDS
    });
  } else {
    beginBasicTurnAction(next);
  }
  next.updatedAt = Date.now();
  next.eventLog.push({
    ...createBaseEvent(next, "system"),
    type: "system",
    message: next.config.firstTurnNoAttack
      ? "游戏开始，每轮第一回合禁止攻击"
      : "游戏开始"
  });
  if (next.config.skillMode === "small_intro") {
    next.eventLog.push({
      ...createBaseEvent(next, "system"),
      type: "system",
      message: `技能入门模式：每名玩家获得 ${next.config.skillCount} 张随机小技能`
    });
  }
  if (next.config.skillMode === "test_select") {
    next.eventLog.push({
      ...createBaseEvent(next, "system"),
      type: "system",
      message: `测试自选技能模式：每名玩家最多携带 ${next.config.skillCount} 张技能`
    });
  }
  return next;
}

function applyStartOfGameSkills(state: GameState): void {
  for (const player of state.players) {
    if (player.skills.includes(CAUSAL_COGNITION_SKILL_ID)) {
      revealSkillForExposureTiming(
        state,
        player.id,
        CAUSAL_COGNITION_SKILL_ID,
        "开局",
        "开局声明"
      );
    }
  }

  for (const player of state.players) {
    for (const skillId of player.skills) {
      revealSkillForExposureTiming(state, player.id, skillId, "开局", "开局声明");
    }

    const initialHp = getPlayerInitialHp(player);
    if (initialHp !== INITIAL_HP) {
      player.hp = initialHp;
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `${player.name} 的沐浴圣光生效：初始生命变为 ${player.hp}`
      });
    }

    const shunshouCount = getActiveSkillCount(player, "skill_100_45717");
    if (shunshouCount > 0) {
      const choices = Array.from({ length: shunshouCount }).flatMap(() =>
        adjacentPlayers(state, player.id)
          .map((neighbor) => {
            const visibleSkill = pickRandomSkill(neighbor.skills);
            if (!visibleSkill) {
              return undefined;
            }

            revealSkillToViewer(state, player.id, neighbor.id, visibleSkill);
            return {
              id: createId("skill_choice"),
              playerId: player.id,
              sourcePlayerId: neighbor.id,
              skillId: visibleSkill,
              kind: "steal_skill" as const
            };
          })
          .filter((choice): choice is NonNullable<typeof choice> => Boolean(choice))
      );

      if (choices.length > 0) {
        state.pendingSkillChoices = [
          ...(state.pendingSkillChoices ?? []).filter(
            (choice) => choice.playerId !== player.id || choice.kind !== "steal_skill"
          ),
          ...choices
        ];
        state.eventLog.push({
          ...createBaseEvent(state, "system"),
          type: "system",
          message: `${player.name} 的顺手牵羊生效：获知相邻玩家各 1 个技能，可选择其中 1 个获得`
        });
      }
    }
  }
}

function pickRandomSkill(skillIds: SkillId[]): SkillId | undefined {
  if (skillIds.length === 0) {
    return undefined;
  }

  return skillIds[Math.floor(Math.random() * skillIds.length)];
}

function adjacentPlayers(state: GameState, playerId: PlayerId): PlayerState[] {
  const index = state.players.findIndex((player) => player.id === playerId);
  if (index === -1 || state.players.length <= 1) {
    return [];
  }

  const left = state.players[(index - 1 + state.players.length) % state.players.length];
  const right = state.players[(index + 1) % state.players.length];
  return [left, right].filter((player): player is PlayerState => Boolean(player));
}

export function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function findPlayer(state: GameState, playerId: PlayerId): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId);
}

export function beginActionPrompt(
  state: GameState,
  timingPhase: SkillTimingPhase,
  options: { preservePendingActions?: boolean; promptSeconds?: number } = {}
): void {
  const now = Date.now();
  state.phase = "action_window";
  state.activeTimingPhase = timingPhase;
  state.actionWindowMode = "prompt";
  state.actionWindowDeadlineAt =
    now + (options.promptSeconds ?? ACTION_PROMPT_SECONDS) * 1000;
  state.actionWindowPlayerIds = [];
  state.actionWindowPassPlayerIds = [];
  if (!options.preservePendingActions) {
    state.pendingActions = {};
  }
  delete state.turnDeadlineAt;
  revealJinguForBlockedControlSkills(state);
}

export function beginBasicTurnAction(state: GameState): void {
  state.phase = "collecting_actions";
  state.activeTimingPhase = "turn_action";
  state.actionWindowPlayerIds = [];
  state.actionWindowPassPlayerIds = [];
  delete state.actionWindowMode;
  delete state.actionWindowDeadlineAt;
  state.pendingActions = {};
  clearSkipUntilTurnActionBuffs(state);
  state.turnStartedAt = Date.now();
  applyFrozenAutoActions(state);
  const deadline = getTurnDeadline(state);
  if (deadline) {
    state.turnDeadlineAt = deadline;
  } else {
    delete state.turnDeadlineAt;
  }
  revealJinguForBlockedControlSkills(state);
}

export function applyFrozenAutoActions(state: GameState): void {
  for (const player of state.players) {
    if (player.status !== "alive") {
      continue;
    }

    const frozen = player.buffs.find(
      (buff) =>
        buff.id === "frozen" &&
        (buff.expiresAtTurn === undefined || buff.expiresAtTurn >= state.turnNumber)
    );
    if (!frozen) {
      continue;
    }

    state.pendingActions[player.id] = {
      actions: []
    };
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 处于冰冻，本回合无法出招`
    });
  }
}

export function usesSkillActionWindows(state: Pick<GameState, "config">): boolean {
  return state.config.skillMode !== "none" && state.config.skillCount > 0;
}

function clearSkipUntilTurnActionBuffs(state: Pick<GameState, "players">): void {
  for (const player of state.players) {
    player.buffs = player.buffs.filter(
      (buff) => buff.id !== "skip_action_windows_until_turn_action"
    );
  }
}

export function revealSkillToAll(
  state: GameState,
  playerId: PlayerId,
  skillId: SkillId,
  reason: string
): boolean {
  const player = findPlayer(state, playerId);
  if (!player) {
    return false;
  }

  player.revealedSkillIds ??= [];
  if (player.revealedSkillIds.includes(skillId)) {
    return false;
  }

  player.revealedSkillIds.push(skillId);
  const skill = getSkill(skillId);
  state.eventLog.push({
    ...createBaseEvent(state, "skill_revealed"),
    type: "skill_revealed",
    playerId,
    skillId,
    skillName: skill?.name ?? skillId,
    reason
  });
  triggerSkillRevealWatchers(state, playerId);
  return true;
}

export function revealSkillOnUse(
  state: GameState,
  playerId: PlayerId,
  skillId: SkillId,
  reason: string
): boolean {
  markSkillActivated(state, playerId, skillId);
  if (isCausalCognitionDeclared(state) && skillId !== CAUSAL_COGNITION_SKILL_ID) {
    return revealSkillToAll(state, playerId, skillId, reason);
  }

  const exposureTiming = getSkill(skillId)?.exposureTiming;
  if (exposureTiming !== "使用时" && exposureTiming !== "出“鬼道”时") {
    return false;
  }

  return revealSkillToAll(state, playerId, skillId, reason);
}

export function revealSkillOnTrigger(
  state: GameState,
  playerId: PlayerId,
  skillId: SkillId,
  reason: string
): boolean {
  markSkillActivated(state, playerId, skillId);
  if (isCausalCognitionDeclared(state) && skillId !== CAUSAL_COGNITION_SKILL_ID) {
    return revealSkillToAll(state, playerId, skillId, reason);
  }

  return revealSkillForExposureTiming(state, playerId, skillId, "触发时", reason);
}

export function revealSkillOnWin(
  state: GameState,
  playerId: PlayerId,
  skillId: SkillId,
  reason: string
): boolean {
  markSkillActivated(state, playerId, skillId);
  return revealSkillForExposureTiming(state, playerId, skillId, "胜利时", reason);
}

export function revealSkillForExposureTiming(
  state: GameState,
  playerId: PlayerId,
  skillId: SkillId,
  exposureTiming: SkillExposureTiming,
  reason: string
): boolean {
  if (exposureTiming === "开局") {
    markSkillActivated(state, playerId, skillId);
  }

  if (
    exposureTiming === "开局" &&
    skillId !== CAUSAL_COGNITION_SKILL_ID &&
    isCausalCognitionDeclared(state)
  ) {
    return false;
  }

  if (getSkill(skillId)?.exposureTiming !== exposureTiming) {
    return false;
  }

  return revealSkillToAll(state, playerId, skillId, reason);
}

export function markSkillActivated(
  state: GameState,
  playerId: PlayerId,
  skillId: SkillId
): void {
  const player = findPlayer(state, playerId);
  if (!player) {
    return;
  }

  const id = `${SKILL_ACTIVATED_BUFF_PREFIX}${skillId}`;
  if (player.buffs.some((buff) => buff.id === id)) {
    return;
  }

  player.buffs.push({
    id,
    name: "技能已触发/使用",
    stacks: 1
  });
}

export function isCausalCognitionDeclared(state: Pick<GameState, "players">): boolean {
  return state.players.some((player) =>
    player.revealedSkillIds?.includes(CAUSAL_COGNITION_SKILL_ID)
  );
}

export function isPlayerSkillSealed(
  player: { buffs: Array<{ id: string }> } | undefined,
  skillId: SkillId
): boolean {
  return Boolean(player?.buffs.some((buff) => buff.id === `sealed_skill:${skillId}`));
}

export function isPlayerInCollapse(
  player: { buffs: Array<{ id: string }> } | undefined
): boolean {
  return Boolean(
    player?.buffs.some((buff) => buff.id.startsWith(COLLAPSE_BUFF_PREFIX))
  );
}

export function isPlayerSkillDisabled(
  player: { buffs: Array<{ id: string }> } | undefined
): boolean {
  return Boolean(
    player?.buffs.some((buff) => buff.id.startsWith(SKILL_DISABLED_BUFF_PREFIX))
  );
}

export function playerHasActiveSkill(
  player: { skills: SkillId[]; buffs: Array<{ id: string }> } | undefined,
  skillId: SkillId
): boolean {
  return getActiveSkillCount(player, skillId) > 0;
}

export function getActiveSkillCount(
  player: { skills: SkillId[]; buffs: Array<{ id: string }> } | undefined,
  skillId: SkillId
): number {
  if (
    !player ||
    isPlayerSkillSealed(player, skillId) ||
    isPlayerInCollapse(player) ||
    isPlayerSkillDisabled(player)
  ) {
    return 0;
  }

  return player.skills.filter((id) => id === skillId).length;
}

export function getPlayerInitialHp(
  player: { skills: SkillId[]; buffs: Array<{ id: string }> } | undefined
): number {
  const holyBathCount = getActiveSkillCount(player, "skill_67_31717");
  return INITIAL_HP * 3 ** holyBathCount;
}

export function isSkillBlockedByJingu(
  state: {
    players: Array<{
      status: PlayerState["status"];
      skills: SkillId[];
      buffs: Array<{ id: string }>;
    }>;
  },
  skillId: SkillId
): boolean {
  const skill = getSkill(skillId);
  if (!skillHasTypeTag(skill, "控制技")) {
    return false;
  }

  const alive = state.players.filter((player) => player.status === "alive");
  const brokenByPoe = alive.some((player) => playerHasActiveSkill(player, "skill_9_93219"));
  if (brokenByPoe) {
    return false;
  }

  return alive.some((player) => playerHasActiveSkill(player, "skill_8_89763"));
}

export function revealJinguForBlockedControlSkills(state: GameState): void {
  const alive = state.players.filter((player) => player.status === "alive");
  const brokenByPoe = alive.some((player) => playerHasActiveSkill(player, "skill_9_93219"));
  if (brokenByPoe) {
    return;
  }

  const jinguOwners = alive.filter((player) => playerHasActiveSkill(player, "skill_8_89763"));
  if (jinguOwners.length === 0) {
    return;
  }

  const hasBlockedControlSkill = alive.some((player) =>
    player.skills.some(
      (skillId) => playerHasActiveSkill(player, skillId) && skillHasTypeTag(getSkill(skillId), "控制技")
    )
  );
  if (!hasBlockedControlSkill) {
    return;
  }

  for (const owner of jinguOwners) {
    revealSkillOnTrigger(state, owner.id, "skill_8_89763", "触发禁锢");
  }
}

export function recordSkillUsed(
  state: GameState,
  playerId: PlayerId,
  skillId: SkillId,
  reason: string
): void {
  markSkillActivated(state, playerId, skillId);
  const skill = getSkill(skillId);
  state.eventLog.push({
    ...createBaseEvent(state, "skill_used"),
    type: "skill_used",
    playerId,
    skillId,
    skillName: skill?.name ?? skillId,
    reason
  });
}

function triggerSkillRevealWatchers(state: GameState, revealedPlayerId: PlayerId): void {
  const revealedPlayer = findPlayer(state, revealedPlayerId);
  if (!revealedPlayer || revealedPlayer.status !== "alive") {
    return;
  }

  for (const watcher of alivePlayers(state)) {
    if (
      watcher.id === revealedPlayerId ||
      getActiveSkillCount(watcher, "skill_109_65084") <= 0 ||
      watcher.buffs.some((buff) => buff.id === `chuanyin_triggered:${revealedPlayerId}`)
    ) {
      continue;
    }

    revealSkillOnTrigger(state, watcher.id, "skill_109_65084", "触发传音入密");
    watcher.buffs.push({
      id: `chuanyin_triggered:${revealedPlayerId}`,
      name: "传音入密已触发",
      stacks: 1
    });
    for (let index = 0; index < getActiveSkillCount(watcher, "skill_109_65084"); index += 1) {
      revealedPlayer.hp -= 2;
      state.eventLog.push({
        ...createBaseEvent(state, "damage"),
        type: "damage",
        sourceId: watcher.id,
        targetId: revealedPlayerId,
        amount: 2,
        attackName: "传音入密"
      });
    }
  }
}

export function revealSkillToViewer(
  state: GameState,
  viewerId: PlayerId,
  playerId: PlayerId,
  skillId: SkillId
): void {
  state.skillKnowledge ??= {};
  const viewerKnowledge = (state.skillKnowledge[viewerId] ??= {});
  const knownSkills = (viewerKnowledge[playerId] ??= []);
  if (!knownSkills.includes(skillId)) {
    knownSkills.push(skillId);
  }
}

export function canPlayerSeeSkill(
  state: GameState,
  viewerId: PlayerId,
  playerId: PlayerId,
  skillId: SkillId
): boolean {
  if (viewerId === playerId) {
    return true;
  }

  const player = findPlayer(state, playerId);
  if (player?.revealedSkillIds?.includes(skillId)) {
    return true;
  }

  return Boolean(state.skillKnowledge?.[viewerId]?.[playerId]?.includes(skillId));
}

export function alivePlayers(state: GameState): PlayerState[] {
  return state.players.filter((player) => player.status === "alive");
}

export function getPuppetMasterId(
  player: { buffs: Array<{ id: string }> } | undefined
): PlayerId | undefined {
  const buff = player?.buffs.find((item) => item.id.startsWith(PUPPET_BUFF_PREFIX));
  return buff?.id.slice(PUPPET_BUFF_PREFIX.length) || undefined;
}

export function isPuppetPlayer(
  player: { buffs: Array<{ id: string }> } | undefined
): boolean {
  return Boolean(getPuppetMasterId(player));
}

export function victoryEligiblePlayers(state: GameState): PlayerState[] {
  return alivePlayers(state).filter((player) => !isPuppetPlayer(player));
}

export function toPublicGameState(
  state: GameState,
  viewerPlayerId?: PlayerId
): PublicGameState {
  const pendingActionPlayerIds = Object.keys(state.pendingActions);
  const revealedActions: PendingActionMap | undefined = state.turnResolutionStarted
    ? JSON.parse(JSON.stringify(state.pendingActions)) as PendingActionMap
    : undefined;
  const {
    pendingActions: _pendingActions,
    pendingSkillChoices: _pendingSkillChoices,
    skillKnowledge: _skillKnowledge,
    preemptiveRestartSnapshot: _preemptiveRestartSnapshot,
    damageModifyAfterTurnResolution: _damageModifyAfterTurnResolution,
    ...publicFields
  } = state;
  const players = publicFields.players.map((player) => {
    const skills =
      viewerPlayerId === undefined
        ? player.skills
        : visibleSkillIdsForViewer(state, viewerPlayerId, player.id);
    const skillSlotCount = player.skills.length;

    if (
      state.config.hideCakeCounts &&
      viewerPlayerId &&
      player.id !== viewerPlayerId
    ) {
      return {
        ...player,
        skills,
        skillSlotCount,
        cakes: -1
      };
    }

    return {
      ...player,
      skills,
      skillSlotCount
    };
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
      pendingSkillChoices: (state.pendingSkillChoices ?? []).filter(
        (choice) => choice.playerId === viewerPlayerId
      ),
      ...(revealedActions ? { revealedActions } : {}),
      viewerPlayerId
    };
  }

  return {
    ...publicFields,
    players,
    eventLog,
    pendingActionPlayerIds,
    ...(state.pendingSkillChoices ? { pendingSkillChoices: state.pendingSkillChoices } : {}),
    ...(revealedActions ? { revealedActions } : {})
  };
}

function visibleSkillIdsForViewer(
  state: GameState,
  viewerId: PlayerId,
  playerId: PlayerId
): SkillId[] {
  const player = findPlayer(state, playerId);
  if (!player) {
    return [];
  }

  if (viewerId === playerId) {
    return player.skills;
  }

  if (state.phase === "lobby" && state.config.skillMode === "test_select") {
    return player.skills;
  }

  return Array.from(
    new Set([
      ...(player.revealedSkillIds ?? []),
      ...(state.skillKnowledge?.[viewerId]?.[playerId] ?? [])
    ])
  ).filter((skillId) => player.skills.includes(skillId));
}

export function getCurrentTurnLimitSeconds(state: GameState): number {
  return Math.max(5, state.config.turnTimeLimitSeconds);
}

export function getCakeGainAmount(state: GameState): number {
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
