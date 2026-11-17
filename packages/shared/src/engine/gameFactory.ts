import { FALLEN_SPLENDOR_PIERCE } from "./fallenSplendorIds";
import { isCorrupted } from "./corruptionIds";
import { DEAD_REALM_CARD_ID, DEAD_REALM_DODGE_ID } from "./deadRealmIds";
import { starWheelMoveView } from "./starWheel";
import { TIAN_YE_CHOICE_STATE } from "./tianyeIds";
import { totemsCovering } from "./totems";
import { getStatusOverview } from "./statusOverview";
import { emptyCityBodies, emptyCitySkillSourceAllowed, enterEmptyCityProjection, hasEmptyCityProjection, isEmptyCitySkillSuspended } from "./illusionRules";
import { canBypassTargetSelection, reachableEmptyCityBodies } from "./spaces";
import { eraTargetChoices } from "./era";
import { FATE_EYE_REAR_GUARD } from "./fateEyeIds";
import {
  BaseGameEvent,
  GameConfig,
  GameId,
  GameState,
  INITIAL_HP,
  MAX_PLAYERS,
  PendingActionMap,
  PlayerAction,
  PlayerId,
  PlayerState,
  PublicGameState,
  SkillId,
  SkillTimingPhase
} from "../types";
import { getIntroSmallSkillIds, getSkill, skillHasTypeTag } from "../skills/registry";
import { COMMON_FUSION_SKILL_ID, countSuppressedFusionMaterials, getOwnedSkillIds, getFusionRecipe, getFusionSkillId, isFusionActive } from "../skills/fusion";
import { getAttackActionCost, getAttackCostBeforeKurong, getKurongCakeDiscount, getTurnSkillActionCost } from "./actionCosts";
import { KURONG_CAKES_ID } from "../bigCards/abilities";
import { previewPlayerAttackStats } from "./attackStatModifiers";
import { ATTACK_ORDER } from "./attacks";
import { getActionAttackTargetIds } from "./validation";
import { SkillExposureTiming } from "../skills/types";
import { BIG_SKILL_PHASE_SECONDS, getStartingHp, isBigSkillMode, MAX_BIG_CARDS_PER_PLAYER } from "../modes";
import { purpleForesightView } from "./purpleEye";
import { reconcileTemporaryBigAbilities } from "./bigCards";
import { getVictoryCounterView } from "./victoryCounter";
import { getRetirementCounterView } from "./retirementCounter";
import { isSoulTrackingBuff } from "./soulPact";
import { siphonRevivalUses } from "./siphon";
import { getBigCards, getRandomBigCardIds, sanitizeBigCardIds, validateRandomBigCardSettings } from "../bigCards/catalog";
import { tigerTemporarySkills } from "./netherTigerIds";
import { initializeTableSeats } from "./seating";
import { initializeBigCardRules, initializeOpeningPeek } from "./bigCards";
import { getKurongLeafChoices, initializeKurongOpening } from "./kurong";
import { getSpaceCakeMultiplier, isReversalResponseRestricted, shareSpace, withPlayerSpace } from "./spaces";
import { getMoveBlockReason, getParalysisFixedMove } from "./moveEligibility";
import { EMPTY_CITY_CONTROL_ID, bigCardHasAbility, getOwnedBigAbilityIds } from "../bigCards/abilities";
import { negativeStatusesHaveNoEffect, isAllSkillsSealedBuff, isLockedSkillSuppressed, isSkillSuppressedByBuff, isThornSkillDisabled, pruneRegisteredStates } from "./effectCategories";
import { swordArrayNoCakeSuppressesPassive } from "./swordArrayControl";
import { HEXAGRAM_SPIRIT } from "./hexagramIds";
import { getHexagramCopyChoices } from "./hexagram";
import { sevenStarLegacyChoices } from "./sevenStar";
import { syncTianShaGrants } from "./tianSha";
import { STORED_DAMAGE_STATUS } from "./storedDamage";
import { thornPierceChoices } from "./thornDance";
import { bubbleDreamHitChoices, pruneBubbleDream } from "./bubbleDream";
import { BUBBLE_FATE, BUBBLE_SKILLS_DISABLED, cannotSealBubbleAbility } from "./bubbleDreamIds";
import { ANTI_CAKE_MOVE_ID, VACUUM_ITEM } from "./vacuumIds";
import { getSpringGrassNumber, isAttributeSkillSuppressed } from "./effectCategories";
import { VETERAN_DECENCY_ID, VETERAN_FUSION_ID, VETERAN_SHATTER_ID } from "./swarmIds";
import { canDiscardAllSakuraCards, getDiscardableSakuraChoices, getSakuraCardChoices, getSakuraFinaleDiscardCount } from "./sakura";
import { getKarmaCardChoices, getKarmaReplacementIds } from "./karmaCycle";
import { KARMA_CYCLE_ID, KARMA_SONG_END_ID } from "./karmaCycleIds";
import { cheatWarpMultiplier, getCheatCardChoices } from "./cheatServer";
import { getStarMoonCakeDivisor, getStarMoonCardChoices } from "./starMoon";
import { STAR_MOON_BURST } from "./starMoonIds";
import { yiyuanCakeMultiplier } from "./yiyuan";
import { getActionLabel } from "./attacks";
import { CHEAT_NOGLUES_ID, CHEAT_TRANSFER_ID } from "./cheatServerIds";
import { getCheatServerUseOptions } from "./cheatServerUses";
import { eternalMoveChoices, readyEternalCard } from "./eternalThought";
import { excludedByTripleSeal, hasTalisman } from "./talismanRules";
import { ETERNAL_BIND_ID, ETERNAL_REPLACE_ID, ETERNAL_THOUGHT_ID } from "../bigCards/abilities";
import { SAKURA_ELEMENT, SAKURA_FINALE_ID } from "../bigCards/abilities";
import { getElementAmount } from "./elementResources";
import { TIANMANG_CAKE_STATE, TIANMANG_LOCKED_DISABLED } from "./tianmang";
import { WIND_HASTE } from "./ultimateWind";
import { sandGrantUses, sandVortexActive } from "./sand";
import { ASURA_BARRIER_SKILL_ID, asuraBarrierUses } from "./asura";
export { SKILL_DISABLED_BUFF_PREFIX } from "./effectCategories";
import { captureInitialPlayerStates } from "./initialPlayerState";
import { syncDecayHpCaps } from "./decayHp";
import { ETERNAL_THUNDER_ID, FOUR_EMPTINESS_ID } from "../bigCards/abilities";
import { getBlindSkillChoices } from "./blindSkillRemoval";
import { ignoredSkillCopies } from "./skillIgnore";
import { getFinaleCollapseSource } from "../skills/fusion";
import { tianlieResponseChoices } from "./tianlie";
import { hasKaigeAbility, KAIGE_ZERO_LIFE_BUFF_ID } from "./kaige";
import { KAIGE_LIVES_ID } from "../bigCards/abilities";
import { resolveOpeningKaigeDiscoveries } from "./resolver";

export const ACTION_PROMPT_SECONDS = 5;
export const ACTION_WINDOW_SECONDS = 20;
export const SKILL_PREPARATION_SECONDS = 45;
export const COLLAPSE_BUFF_PREFIX = "collapse_until_round:";
export const PUPPET_BUFF_PREFIX = "puppet_of:";
export const SKILL_ACTIVATED_BUFF_PREFIX = "skill_activated:";
export const CAUSAL_COGNITION_SKILL_ID = "1120";

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
  firstPlayer.hp = getStartingHp(state.config);

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
  next.players.push({ ...player, hp: getStartingHp(next.config) });
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
  delete spectator.hpIsInfinite;
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

export function getOpeningBigCardDeal(config: Pick<GameConfig, "bigCardPackIds" | "allowDuplicateBigCards">): NonNullable<GameState["openingBigCardDeal"]> {
  return { pool: getRandomBigCardIds(config.bigCardPackIds), allowDuplicateAcrossPlayers: config.allowDuplicateBigCards !== false };
}

export function startGame(state: GameState, restoredBigCardHands?: ReadonlyMap<PlayerId, number>): GameState {
  if (state.phase !== "lobby") {
    throw new Error("游戏已经开始");
  }

  const alivePlayers = state.players.filter((player) =>
    restoredBigCardHands ? player.kind !== "spectator" : player.status === "alive");
  if (alivePlayers.length < 2) {
    throw new Error("至少需要 2 名玩家才能开始");
  }

  const next = cloneGameState(state);
  delete next.nineTribulationEnd;
  delete next.previousTurnEndCakes;
  if (!restoredBigCardHands) {
    for (const player of next.players) {
      if (player.kind === "spectator") continue;
      player.baseInitialHp = getStartingHp(next.config);
      player.hp = player.baseInitialHp;
      delete player.hpValue;
      delete player.hpIsInfinite;
    }
  }
  initializeTableSeats(next);
  if (isBigSkillMode(next.config.skillMode)) next.openingBigCardDeal ??= getOpeningBigCardDeal(next.config);
  if (!restoredBigCardHands) assignBigCards(next);
  initializeBigCardRules(next, true);
  const discoveries = new Set<PlayerId>();
  initializeOpeningPeek(next, discoveries);
  initializeKurongOpening(next, discoveries);
  assignIntroSkills(next);
  applyStartOfGameSkills(next, restoredBigCardHands);
  if (restoredBigCardHands) for (const player of next.players) {
    if (!restoredBigCardHands.has(player.id) || !hasEmptyCityProjection(player)) continue;
    delete player.emptyCityBody;
    enterEmptyCityProjection(player);
  }
  resolveOpeningKaigeDiscoveries(next, discoveries);
  syncDecayHpCaps(next);
  captureInitialPlayerStates(next);
  if (next.phase !== "finished" && usesSkillActionWindows(next)) {
    beginActionPrompt(next, "opening_action", {
      promptSeconds: SKILL_PREPARATION_SECONDS
    });
  } else if (next.phase !== "finished") {
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
  if (isBigSkillMode(next.config.skillMode)) {
    const royalCards = getBigCards().filter((card) => card.rankCode === "05");
    const complete = royalCards.filter((card) => card.implementationStatus === "implemented").length;
    const partial = royalCards.filter((card) => card.implementationStatus === "partial").length;
    next.eventLog.push({
      ...createBaseEvent(next, "system"), type: "system",
      message: `${next.config.skillMode === "big_random" ? "随机大技能模式，每人获得" : "测试指定大技能模式，每人最多携带"}${next.config.skillCount}张大卡。各行动阶段限时${BIG_SKILL_PHASE_SECONDS}秒。王者正篇与番外已实现${complete}张，部分实现${partial}张，待实现${royalCards.length - complete - partial}张。`
    });
  }
  return next;
}

function applyStartOfGameSkills(state: GameState, restoredBigCardHands?: ReadonlyMap<PlayerId, number>): void {
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
    if (player.kind === "spectator") continue;
    for (const skillId of player.skills) {
      revealSkillForExposureTiming(state, player.id, skillId, "开局", "开局声明");
    }

    const initialHp = getPlayerInitialHp(player);
    const formerInitialHp = restoredBigCardHands?.get(player.id);
    if (!restoredBigCardHands || formerInitialHp !== undefined && formerInitialHp !== initialHp) {
      if (player.kaigeLife && hasKaigeAbility(player, KAIGE_LIVES_ID)) {
        player.hp = 0;
        delete player.hpIsInfinite;
        delete player.hpValue;
      } else if (initialHp !== player.hp) {
        player.hp = initialHp;
        delete player.hpIsInfinite;
        if (restoredBigCardHands) delete player.hpValue;
        state.eventLog.push({
          ...createBaseEvent(state, "system"),
          type: "system",
          message: restoredBigCardHands ? `${player.name} 重抽后初始生命变为 ${player.hp}`
            : `${player.name} 的沐浴圣光生效：初始生命变为 ${player.hp}`
        });
      }
    }

    const shunshouCount = getActiveSkillCount(player, "1099");
    if (queueZhuRiOpeningChoices(state, player)) continue;
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

export function queueZhuRiOpeningChoices(state: GameState, player: PlayerState): boolean {
  const bow = getFusionSkillId("逐日之弓");
  if (getActiveSkillCount(player, bow) === 0) return false;
  revealSkillForExposureTiming(state, player.id, bow, "开局", "逐日之弓开局宣告");
  for (const other of alivePlayers(state)) {
    if (other.id === player.id || state.pendingSkillChoices?.some((choice) =>
      choice.playerId === player.id && choice.sourcePlayerId === other.id)) continue;
    const known = state.skillKnowledge[player.id]?.[other.id] ?? [];
    const selected = known.find((id) => other.skills.includes(id)) ?? pickRandomSkill(other.skills);
    if (!selected || player.buffs.some((buff) => buff.id === `shunshou_taken:${other.id}:${selected}`)) continue;
    revealSkillToViewer(state, player.id, other.id, selected);
    (state.pendingSkillChoices ??= []).push({ id: createId("skill_choice"), kind: "steal_skill", playerId: player.id,
      sourcePlayerId: other.id, skillId: selected });
  }
  return true;
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
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  for (const player of next.players) if (!player.emptyCityBody && hasEmptyCityProjection(player)) enterEmptyCityProjection(player);
  return next;
}

export function findPlayer(state: Pick<GameState, "players">, playerId: PlayerId): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId) ??
    (playerId?.startsWith("empty_city_body:") ? emptyCityBodies(state).find((body) => body.id === playerId) : undefined);
}

export function beginActionPrompt(
  state: GameState,
  timingPhase: SkillTimingPhase,
  options: { preservePendingActions?: boolean; promptSeconds?: number } = {}
): void {
  syncTianShaGrants(state);
  const now = Date.now();
  state.phase = "action_window";
  pruneRegisteredStates(state);
  pruneBubbleDream(state);
  for (const player of state.players) reconcileTemporaryBigAbilities(player, state);
  syncDecayHpCaps(state);
  state.activeTimingPhase = timingPhase;
  state.actionWindowMode = "prompt";
  state.actionWindowDeadlineAt =
    now + getActionPromptSeconds(state, options.promptSeconds) * 1000;
  state.actionWindowPlayerIds = [];
  state.actionWindowPassPlayerIds = [];
  if (!options.preservePendingActions) {
    state.pendingActions = {};
  }
  delete state.turnDeadlineAt;
  revealJinguForBlockedControlSkills(state);
}

export function beginBasicTurnAction(state: GameState): void {
  pruneRegisteredStates(state);
  pruneBubbleDream(state);
  for (const player of state.players) reconcileTemporaryBigAbilities(player, state);
  syncDecayHpCaps(state);
  state.phase = "collecting_actions";
  state.activeTimingPhase = "turn_action";
  state.actionWindowPlayerIds = [];
  state.actionWindowPassPlayerIds = [];
  delete state.actionWindowMode;
  delete state.actionWindowDeadlineAt;
  state.pendingActions = {};
  clearSkipUntilTurnActionBuffs(state);
  state.turnStartedAt = Date.now();
  applyIneligibleMoveAutoPasses(state);
  const deadline = getTurnDeadline(state);
  if (deadline) {
    state.turnDeadlineAt = deadline;
  } else {
    delete state.turnDeadlineAt;
  }
  revealJinguForBlockedControlSkills(state);
}

export function applyIneligibleMoveAutoPasses(state: GameState): boolean {
  let changed = false;
  for (const player of alivePlayers(state)) {
    const plan = state.pendingActions[player.id];
    const reason = getMoveBlockReason(state, player);
    if (reason) {
      if (plan && !plan.actions.length) continue;
      state.pendingActions[player.id] = { actions: [], moveEligibilityAutoPass: true };
      state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name}：${reason}，自动空过` });
      changed = true;
    } else if (state.phase === "collecting_actions" && plan?.moveEligibilityAutoPass) {
      const fixedMove = getParalysisFixedMove(state, player);
      if (fixedMove) state.pendingActions[player.id] = { actions: [fixedMove] };
      else delete state.pendingActions[player.id];
      changed = true;
    }
  }
  return changed;
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
  if (!player || player.emptyCityRecovery) {
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
  player: { buffs: ReadonlyArray<{ id: string }>; bigCards?: PlayerState["bigCards"]; skills?: readonly SkillId[] } | undefined,
  skillId: SkillId
): boolean {
  if (cannotSealBubbleAbility(skillId)) return false;
  if (player?.buffs.some(({ id }) => id === `all_skills_sealed:round:${STAR_MOON_BURST}`)) return true;
  if (!player?.buffs.some((buff) => buff.id === `sealed_skill:${skillId}`)) return false;
  if (player.bigCards?.some((card) => bigCardHasAbility(card, FALLEN_SPLENDOR_PIERCE) &&
    bigCardAbilityCanActivate(card, FALLEN_SPLENDOR_PIERCE)) &&
    !player.buffs.some((buff) => isSkillSuppressedByBuff(buff.id)) && !ignoredSkillCopies(player, FALLEN_SPLENDOR_PIERCE)) return false;
  if (skillId === DEAD_REALM_DODGE_ID || !player.skills ||
    !player.bigCards?.some((card) => !card.junengDisabled && bigCardHasAbility(card, DEAD_REALM_DODGE_ID))) return true;
  return !getActiveSkillCount(player as NonNullable<Parameters<typeof getActiveSkillCount>[0]>, DEAD_REALM_DODGE_ID);
}

export function isPlayerInCollapse(
  player: { buffs: Array<{ id: string }> } | undefined
): boolean {
  return Boolean(
    player?.buffs.some((buff) => buff.id.startsWith(COLLAPSE_BUFF_PREFIX))
  );
}

export function isPlayerSkillDisabled(
  player: { buffs: Array<{ id: string; stateType?: string }> } | undefined,
  skillId?: SkillId
): boolean {
  if (!player || skillId === BUBBLE_FATE) return false;
  const ignoresBadStatuses = negativeStatusesHaveNoEffect(player);
  return player.buffs.some(({ id }) => {
    if (id === BUBBLE_SKILLS_DISABLED) return true;
    if (isAllSkillsSealedBuff(id)) return !skillId || !cannotSealBubbleAbility(skillId);
    return !ignoresBadStatuses && isSkillSuppressedByBuff(id);
  });
}

export function playerHasActiveSkill(
  player: { skills: SkillId[]; buffs: Array<{ id: string }> } | undefined,
  skillId: SkillId
): boolean {
  return getActiveSkillCount(player, skillId) > 0;
}

export function getActiveSkillCount(
  player: { id?: string; skills: SkillId[]; buffs: Array<{ id: string }>; skillFusions?: PlayerState["skillFusions"]; bigCards?: PlayerState["bigCards"];
    skillInventory?: PlayerState["skillInventory"]; effects?: PlayerState["effects"]; emptyCitySkillsSuspended?: true; karmaReincarnation?: true } | undefined,
  skillId: SkillId
): number {
  if (skillId === KARMA_SONG_END_ID) return Number(Boolean(player?.karmaReincarnation));
  if (skillId === BUBBLE_FATE) return player ? getOwnedBigAbilityIds(player, true).filter((id) => id === skillId).length : 0;
  if (
    !player || isCorrupted(player) ||
    isEmptyCitySkillSuspended(player, skillId) ||
    isPlayerSkillSealed(player, skillId) ||
    isThornSkillDisabled(player, skillId) ||
    swordArrayNoCakeSuppressesPassive(player, skillId) ||
    isPlayerSkillDisabled(player, skillId) ||
    isAttributeSkillSuppressed(player, getSkill(skillId)) ||
    player.buffs.some((buff) => buff.id === TIANMANG_LOCKED_DISABLED) && isLockedSkillSuppressed(player, getSkill(skillId))
  ) {
    return 0;
  }

  const granted = Number(tigerTemporarySkills(player).includes(skillId) || sandGrantUses(player, skillId) > 0 || siphonRevivalUses(player, skillId) > 0 ||
    skillId === "1025" && player.buffs.some((buff) => buff.id === FATE_EYE_REAR_GUARD) ||
    skillId === ASURA_BARRIER_SKILL_ID && asuraBarrierUses(player) > 0 ||
    skillId === "1064" && Boolean(player.effects?.some(({ kind }) => kind === "red_lotus")));
  if (skillId === ANTI_CAKE_MOVE_ID) return Number(player.buffs.some((buff) => "itemKind" in buff && buff.itemKind === VACUUM_ITEM));
  if (skillId === VETERAN_DECENCY_ID || skillId === VETERAN_SHATTER_ID)
    return getActiveSkillCount(player, VETERAN_FUSION_ID);
  if (getFusionRecipe(skillId)) return (player.skillFusions ?? []).filter((fusion) =>
    fusion.skillId === skillId && isFusionActive(player, fusion)).length + granted;
  const activeCards = skillId.startsWith(DEAD_REALM_CARD_ID) && getSkill(skillId)?.typeTags.includes("锁定技") &&
    player.buffs.some((buff) => buff.id === TIANMANG_LOCKED_DISABLED)
    ? { ...player, bigCards: player.bigCards?.filter((card) => card.deadRealmUnlocked) ?? [] } : player;
  const bigCount = getOwnedBigAbilityIds(activeCards, true).filter((id) => id === skillId).length;
  const ignored = ignoredSkillCopies(player, skillId);
  if (isPlayerInCollapse(player)) return Math.max(0, Number(Boolean(getFinaleCollapseSource(player, skillId))) - ignored);
  if (bigCount) return Math.max(0, bigCount - ignored);
  const copies = player.emptyCitySkillsSuspended && player.skillInventory
    ? player.skillInventory.filter((entry) => entry.skillId === skillId &&
      emptyCitySkillSourceAllowed(player, skillId, entry.sourceBigCardInstanceId)).length
    : player.skills.filter((id) => id === skillId).length;
  const owned = Math.max(0, copies - countSuppressedFusionMaterials(player, skillId));
  return skillId === "1064" ? Math.max(0, owned + granted - ignored) : Math.max(0, owned - ignored) + granted;
}

export function getPlayerInitialHp(
  player: ({ skills: SkillId[]; buffs: Array<{ id: string }> } &
    Pick<Partial<PlayerState>, "kaigeLife" | "bigCards" | "baseInitialHp" | "charityInitialHpHalvings">) | undefined
): number {
  if (player?.kaigeLife && (player.kaigeLife.transferredAbilities ||
    player.bigCards?.some((card) => card.instanceId === player.kaigeLife?.cardInstanceId &&
      !card.lostAbilityIds?.includes(KAIGE_LIVES_ID)))) return 0;
  const holyBathCount = getActiveSkillCount(player, "1066");
  const initial = (player?.baseInitialHp ?? INITIAL_HP) * 3 ** holyBathCount;
  return player?.charityInitialHpHalvings ? Math.floor(initial / 2 ** player.charityInitialHpHalvings) : initial;
}

export function isSkillBlockedByJingu(
  state: {
    players: Array<{
      spaceId?: string;
      status: PlayerState["status"];
      skills: SkillId[];
      buffs: Array<{ id: string }>;
    }>;
  },
  skillId: SkillId,
  spaceId?: string,
  player?: Parameters<typeof getActiveSkillCount>[0]
): boolean {
  const skill = getSkill(skillId);
  if (!skillHasTypeTag(skill, "控制技") || playerHasActiveSkill(player, DEAD_REALM_DODGE_ID) ||
    playerHasActiveSkill(player, FALLEN_SPLENDOR_PIERCE)) {
    return false;
  }

  const alive = state.players.filter((player) => player.status === "alive" && player.spaceId === spaceId);
  return activeJinguOwners(alive).length > 0;
}

export function playerClaimsJingu(player: Parameters<typeof getActiveSkillCount>[0]): boolean {
  return playerHasActiveSkill(player, "1007") || playerHasActiveSkill(player, EMPTY_CITY_CONTROL_ID);
}

function activeJinguOwners<T extends NonNullable<Parameters<typeof getActiveSkillCount>[0]>>(players: T[]): T[] {
  const brokenByPoe = players.some((player) => playerHasActiveSkill(player, "1008"));
  return players.filter((player) => playerHasActiveSkill(player, "1007") &&
    (!brokenByPoe || playerHasActiveSkill(player, EMPTY_CITY_CONTROL_ID)));
}

export function revealJinguForBlockedControlSkills(state: GameState): void {
  const anchors = new Map(state.players.map((player) => [player.spaceId, player.id]));
  if (anchors.size > 1) {
    for (const id of anchors.values()) withPlayerSpace(state, id, () => revealJinguForBlockedControlSkills(state));
    return;
  }
  const alive = state.players.filter((player) => player.status === "alive");
  const jinguOwners = activeJinguOwners(alive);
  if (jinguOwners.length === 0) {
    return;
  }

  const hasBlockedControlSkill = alive.some((player) =>
    !playerHasActiveSkill(player, DEAD_REALM_DODGE_ID) && player.skills.some(
      (skillId) => playerHasActiveSkill(player, skillId) && skillHasTypeTag(getSkill(skillId), "控制技")
    )
  );
  if (!hasBlockedControlSkill) {
    return;
  }

  for (const owner of jinguOwners) {
    revealSkillOnTrigger(state, owner.id, "1007", "触发禁锢");
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
    timingPhase: state.activeTimingPhase,
    ...(findPlayer(state, playerId)?.emptyCityRecovery ||
      getFusionRecipe(skillId) && !findPlayer(state, playerId)?.revealedSkillIds.includes(skillId) ? { privatePlayerId: playerId } : {}),
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
    const standalone = getActiveSkillCount(watcher, "1108");
    if (
      watcher.id === revealedPlayerId ||
      !shareSpace(watcher, revealedPlayer) ||
      standalone <= 0 ||
      watcher.buffs.some((buff) => buff.id === `chuanyin_triggered:${revealedPlayerId}`)
    ) {
      continue;
    }

    revealSkillOnTrigger(state, watcher.id, "1108", "触发传音入密");
    watcher.buffs.push({
      id: `chuanyin_triggered:${revealedPlayerId}`,
      name: "传音入密已触发",
      stacks: 1
    });
    for (let index = 0; index < standalone; index += 1) {
      (state.pendingDamageItems ??= []).push({
        id: createId("spell_damage"), spellDamage: true, unprocessedSpell: true,
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

export function alivePlayers(state: Pick<GameState, "players">): PlayerState[] {
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

export function victoryEligiblePlayers(state: Pick<GameState, "players" | "smallSpaces">): PlayerState[] {
  return alivePlayers(state).filter((player) => (!player.spaceId || state.smallSpaces?.[player.spaceId]?.countsForVictory) &&
    !player.summon && !isPuppetPlayer(player) && !excludedByTripleSeal(player));
}

export function ordinaryVictoryPlayers(state: Pick<GameState, "players" | "smallSpaces">): PlayerState[] {
  return victoryEligiblePlayers(state).filter((player) => !hasEmptyCityProjection(player));
}

export function toPublicGameState(
  state: GameState,
  viewerPlayerId?: PlayerId
): PublicGameState {
  const pendingActionPlayerIds = Object.keys(state.pendingActions);
  const revealedActions: PendingActionMap | undefined = state.turnResolutionStarted
    ? publicActionPlans(state.pendingActions, viewerPlayerId)
    : undefined;
  const {
    openingBigCardDeal: _openingBigCardDeal,
    fiveElementsIceAttempts: _fiveElementsIceAttempts,
    tianyeTurn: _tianyeTurn,
    openingRoundEffects: _openingRoundEffects,
    spaceBurstBridges: _spaceBurstBridges,
    eraTargetEdits: _eraTargetEdits,
    pendingActions: _pendingActions,
    turnMoveSuppression: _turnMoveSuppression,
    peekBigCardsByViewer: _peekBigCardsByViewer,
    hexagramNegativeAtReveal: _hexagramNegativeAtReveal,
    sevenStarLegacyPending: _sevenStarLegacyPending,
    sevenStarLegacyResume: _sevenStarLegacyResume,
    sevenStarHitRolls: _sevenStarHitRolls,
    sakuraDue: _sakuraDue,
    eternalCheckpoints: _eternalCheckpoints,
    eternalProgressCheckedTurn: _eternalProgressCheckedTurn,
    leafCardsByViewer: _leafCardsByViewer,
    cannonDefenses: _cannonDefenses,
    tianlieAttackResponses: _tianlieAttackResponses,
    starMoonCardHits: _starMoonCardHits,
    yiyuanRequests: _yiyuanRequests,
    yiyuanNextMoves: _yiyuanNextMoves,
    thornPierceResponses: _thornPierceResponses,
    bubbleDreamHits: _bubbleDreamHits,
    bubbleDeferredSelfDestructs: _bubbleDeferredSelfDestructs,
    pendingSkillChoices: _pendingSkillChoices,
    skillKnowledge: _skillKnowledge,
    preemptiveRestartSnapshot: _preemptiveRestartSnapshot,
    damageModifyAfterTurnResolution: _damageModifyAfterTurnResolution,
    turnActionCosts: _turnActionCosts,
    turnActionReceipts: _turnActionReceipts,
    yuanVoidEntries: _yuanVoidEntries,
    turnAttackStats: _turnAttackStats,
    retaliationRevivalPending: _retaliationRevivalPending,
    reversalState: _reversalState,
    spaceReversalStates: _spaceReversalStates,
    retaliationResponses: _retaliationResponses,
    roundEndDamagePending: _roundEndDamagePending,
    damageAttribution: _damageAttribution,
    turnEndStatusPending: _turnEndStatusPending,
    nineTribulationEnd: _nineTribulationEnd,
    previousTurnEndCakes: _previousTurnEndCakes,
    initialHunyaoPlayers: _initialHunyaoPlayers,
    initialPlayerSnapshots: _initialPlayerSnapshots,
    roundStartSnapshots: _roundStartSnapshots,
    verdictTurn: _verdictTurn,
    victoryCounter: _victoryCounter,
    retirementCounter: _retirementCounter,
    soulRetirementRevival: _soulRetirementRevival,
    bloodRitual: _bloodRitual,
    gameSwitch: _gameSwitch,
    queuedGameSwitches: _queuedGameSwitches,
    gameSwitchAftermath: _gameSwitchAftermath,
    purpleInsights: _purpleInsights,
    purpleForesights: _purpleForesights,
    pendingRetirementCounterPlayerIds: _pendingRetirementCounterPlayerIds,
    jueyingRevivalRestart: _jueyingRevivalRestart,
    spentBoardVictoryPlayerIds: _spentBoardVictoryPlayerIds,
    verdictBlockedMoves: _verdictBlockedMoves,
    verdictOrdinaryMoves: _verdictOrdinaryMoves,
    curtainTurnPlans: _curtainTurnPlans,
    starWheelMoves, starWheelReleasedMoves: _starWheelReleasedMoves, starWheelPendingStatuses,
    starWheelRevealedPlans: _starWheelRevealedPlans, starWheelShuffleIds: _starWheelShuffleIds, starWheelPointResume: _starWheelPointResume,
    totemMoveRolls: _totemMoveRolls,
    totemYoutiaoDefense: _totemYoutiaoDefense,
    borrowedBigCards: _borrowedBigCards,
    pendingDragonFireBonuses: _pendingDragonFireBonuses,
    skillVictoryUnaffectedPlayerIds,
    ...publicFields
  } = state;
  const point = state.verdictTurn?.games.find((game) => !game.winnerId);
  const removal = state.verdictTurn?.removalPlayerId;
  const gameSwitch = state.gameSwitch;
  const pointView = gameSwitch?.mode === "rock_paper_scissors" ? { gameSwitchDeadlineAt: gameSwitch.deadlineAt, pointGame: {
    id: gameSwitch.id, kind: "game_switch" as const, sourceId: gameSwitch.sourceId,
    targetId: gameSwitch.remainingIds.find((id) => id !== gameSwitch.sourceId) ?? gameSwitch.sourceId,
    participantIds: gameSwitch.remainingIds, round: gameSwitch.round, submittedPlayerIds: Object.keys(gameSwitch.moves)
  } } : gameSwitch?.mode === "basic_bing" ? { gameSwitchDeadlineAt: gameSwitch.deadlineAt,
    basicGameSwitch: toPublicGameState(gameSwitch.game, viewerPlayerId) } : removal ? { verdictRemovalPlayerId: removal } : point ? { pointGame: {
    id: point.id, sourceId: point.sourceId, targetId: point.targetId, round: point.round, submittedPlayerIds: Object.keys(point.moves),
    ...(point.kind ? { kind: point.kind } : {})
  } } : {};
  const choices = viewerPlayerId && (removal === viewerPlayerId || getActiveSkillCount(findPlayer(state, viewerPlayerId), FOUR_EMPTINESS_ID))
    ? getBlindSkillChoices(state, viewerPlayerId, removal !== viewerPlayerId) : undefined;
  const sakuraViewer = viewerPlayerId ? findPlayer(state, viewerPlayerId) : undefined;
  const finaleChoices = sakuraViewer && state.phase === "collecting_actions" && canDiscardAllSakuraCards(sakuraViewer) && getActiveSkillCount(sakuraViewer, SAKURA_FINALE_ID) &&
    getElementAmount(sakuraViewer, SAKURA_ELEMENT) >= 30 ? getSakuraCardChoices(state, sakuraViewer, "finale") : undefined;
  const karmaViewer = sakuraViewer?.karmaReincarnation && sakuraViewer.status === "alive" &&
    state.phase === "collecting_actions" ? sakuraViewer : undefined;
  const karmaChoices = karmaViewer && (getActiveSkillCount(karmaViewer, KARMA_CYCLE_ID) || karmaViewer.buffs.some((buff) =>
    buff.stacks > 0 && buff.freeMove?.type === "skill" && buff.freeMove.skillId === KARMA_CYCLE_ID))
    ? getKarmaCardChoices(state, karmaViewer) : undefined;
  const players = publicFields.players.map((player) => {
    const { yiyuanMimic, emptyCityRecovery, emptyCityBodySpaceId: _bodySpace, emptyCityBody: _body, emptyCityBodyDefeatId: _bodyDefeat,
      emptyCityPhantomDefeat: _phantomDefeat,
      emptyCitySkillsSuspended: _skillSuspension, ...view } = player;
    if (emptyCityRecovery && viewerPlayerId !== player.id) Object.assign(view, emptyCityRecovery.original);
    const { bigCards: _bigCards, bigCardSlotCount: _bigCardSlotCount, skillInventory: _inventory, actionCakes,
      mirroredSkillIds: _mirroredSkillIds, storedDamages, sakuraDiscards: _sakuraDiscards,
      bars, eternalMoves,
      kaigeLife, soulLife, spareLives, ...legacyPlayer } = view;
    const visiblePlayer = isBigSkillMode(state.config.skillMode) ? {
      ...legacyPlayer,
      bigCards: !viewerPlayerId || viewerPlayerId === player.id ||
        (state.phase === "lobby" && state.config.skillMode === "big_test_select") ? view.bigCards ?? [] :
        (view.bigCards ?? []).filter((card) => card.publiclyRevealed || state.peekBigCardsByViewer?.[viewerPlayerId]?.includes(card.instanceId))
          .map(({ instanceId, cardId, publiclyRevealed }) => ({ instanceId, cardId, ...(publiclyRevealed ? { publiclyRevealed } : {}) })),
      ...(!viewerPlayerId || viewerPlayerId === player.id ? { skillInventory: player.skillInventory, actionCakes, storedDamages,
        ...(bars ? { bars } : {}), ...(eternalMoves ? { eternalMoves } : {}),
        ...(kaigeLife ? { kaigeLife } : {}), ...(soulLife ? { soulLife } : {}), ...(spareLives ? { spareLives } : {}) } : {}),
      bigCardSlotCount: view.bigCards?.length ?? 0
    } : { ...legacyPlayer, ...(spareLives ? { spareLives } : {}), ...((!viewerPlayerId || viewerPlayerId === player.id) && player.skillInventory ?
      { skillInventory: player.skillInventory } : {}) };
    const skills =
      viewerPlayerId === undefined
        ? view.skills
        : visibleSkillIdsForViewer(state, viewerPlayerId, player.id);
    const skillSlotCount = view.skills.length;
    const attackCostOverrides = !viewerPlayerId || viewerPlayerId === player.id ? Object.fromEntries(ATTACK_ORDER.map((attackId) =>
      [attackId, getAttackCostBeforeKurong(state, player, { type: "attack", attackId, stacks: 1 })])) : undefined;
    const kurongCakeDiscount = viewerPlayerId === player.id && getActiveSkillCount(player, KURONG_CAKES_ID) ?
      getKurongCakeDiscount(state, player) : undefined;

    if (
      state.config.hideCakeCounts &&
      viewerPlayerId &&
      player.id !== viewerPlayerId
    ) {
      return {
        ...visiblePlayer,
        skillFusions: viewerPlayerId === undefined || viewerPlayerId === player.id ? player.skillFusions : undefined,
        fusionRequestIds: viewerPlayerId === undefined || viewerPlayerId === player.id ? player.fusionRequestIds : undefined,
        witherSelections: viewerPlayerId === undefined || viewerPlayerId === player.id ? player.witherSelections : undefined,
        buffs: publicPlayerBuffs(player, viewerPlayerId, skills),
        skills,
        skillSlotCount,
        attackCostOverrides,
        cakes: -1
      };
    }

    return {
      ...visiblePlayer,
      skillFusions: viewerPlayerId === undefined || viewerPlayerId === player.id ? player.skillFusions : undefined,
      fusionRequestIds: viewerPlayerId === undefined || viewerPlayerId === player.id ? player.fusionRequestIds : undefined,
      witherSelections: viewerPlayerId === undefined || viewerPlayerId === player.id ? player.witherSelections : undefined,
      ...(kurongCakeDiscount !== undefined ? { kurongCakeDiscount } : {}),
      buffs: publicPlayerBuffs(player, viewerPlayerId, skills),
      skills,
      skillSlotCount,
      attackCostOverrides
    };
  });
  const eventLog = publicFields.eventLog.filter((event) => !viewerPlayerId ||
    !event.privatePlayerId || event.privatePlayerId === viewerPlayerId).map((event) => {
    if (event.type === "turn_revealed") return { ...event, actions: publicActionPlans(event.actions, viewerPlayerId) as typeof event.actions };
    if (event.type === "action_switched" && viewerPlayerId !== event.playerId) {
      const before = hideCheatActionSelections(event.before);
      const after = hideCheatActionSelections(event.after);
      if (event.coveredByTianlieIgnoredFusion) {
        const { coveredByTianlieIgnoredFusion: _covered, ...visibleSwitch } = event;
        return { ...visibleSwitch, before, after };
      }
      if (before !== event.before || after !== event.after) return { ...event, before, after };
    }
    if (viewerPlayerId && event.type === "damage" && event.reboundSkillSourceIds) {
      const { reboundSkillSourceIds: _reboundSkillSourceIds, ...visibleDamage } = event;
      return visibleDamage;
    }
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

  const starWheelView = {
    ...(starWheelMoves?.length ? { starWheelMoves: starWheelMoves.map(starWheelMoveView) } : {}),
    ...(starWheelPendingStatuses?.length ? { starWheelPendingStatuses: starWheelPendingStatuses
      .filter(({ targetId }) => !viewerPlayerId || targetId === viewerPlayerId).map(({ id, targetId, label }) => ({ id, targetId, label })) } : {})
  };
  if (viewerPlayerId) {
    const viewer = findPlayer(state, viewerPlayerId);
    const victoryCounter = getVictoryCounterView(state, viewer);
    const retirementCounter = getRetirementCounterView(state, viewer);
    const leafCardChoices = getKurongLeafChoices(state, viewerPlayerId);
    const canViewCheatChoices = viewer?.status === "alive" && (state.phase === "action_window" || state.phase === "collecting_actions");
    const cheatCardChoices = canViewCheatChoices && getActiveSkillCount(viewer, CHEAT_NOGLUES_ID)
      ? getCheatCardChoices(state, viewer) : undefined;
    const cheatTransferChoices = canViewCheatChoices && getActiveSkillCount(viewer, CHEAT_TRANSFER_ID)
      ? getCheatServerUseOptions(viewer) : undefined;
    const starMoonCardChoices = state.activeTimingPhase === "turn_damage_modify" ? getStarMoonCardChoices(state, viewerPlayerId) : [];
    const hexagramCopyChoices = viewer && canViewCheatChoices && getActiveSkillCount(viewer, HEXAGRAM_SPIRIT) ?
      getHexagramCopyChoices(state, viewer) : undefined;
    const yiyuan = state.activeTimingPhase === "turn_change_action" ? state.yiyuanRequests?.filter((request) =>
      request.playerId === viewerPlayerId && request.turn === state.turnNumber && request.accepted === undefined) : undefined;
    const purpleForesight = purpleForesightView(state, viewerPlayerId);
    const insight = state.purpleInsights?.[viewerPlayerId];
    const emptyCityAttackTargets = reachableEmptyCityBodies(state, viewerPlayerId)
      .filter((body) => canBypassTargetSelection(state, viewerPlayerId, body)).map(({ id, name }) => ({ id, name }));
    const eraChoices = eraTargetChoices(state, viewer);
    return {
      ...publicFields,
      ...starWheelView,
      ...(eraChoices.length ? { eraTargetChoices: eraChoices } : {}),
      ...(victoryCounter ? { victoryCounter } : {}),
      ...(retirementCounter ? { retirementCounter } : {}),
      ...(state.bloodRitual?.resistance ? { bloodRitualResistance: true as const } : {}),
      ...(leafCardChoices.length ? { leafCardChoices } : {}),
      ...(cheatCardChoices ? { cheatCardChoices } : {}),
      ...(cheatTransferChoices ? { cheatTransferChoices } : {}),
      ...(starMoonCardChoices.length ? { starMoonCardChoices } : {}),
      ...(hexagramCopyChoices?.length ? { hexagramCopyChoices } : {}),
      ...(state.sevenStarLegacyResume ? { sevenStarLegacy: { choices: sevenStarLegacyChoices(state, viewerPlayerId) } } : {}),
      ...(yiyuan?.length ? { yiyuanRepeatChoice: { casterNames: yiyuan.map((request) => findPlayer(state, request.casterId)?.name ?? "玩家"),
        moves: (state.pendingActions[viewerPlayerId]?.actions ?? []).map(getActionLabel) } } : {}),
      ...(purpleForesight ? { purpleForesight } : {}),
      ...(insight?.round === state.roundNumber && state.activeTimingPhase === "round_before_action" ?
        { purpleInsight: { targetId: insight.targetId, abilityId: insight.abilityId, sourceCardId: insight.sourceCardId } } : {}),
      ...(state.reversalResponseOnly ? { reversalResponseOnly: isReversalResponseRestricted(state, viewerPlayerId) } : {}),
      ...(state.cannonDefenses?.length ? { cannonDefenseSteps: state.cannonDefenses.map(({ attack, dueTurn, next }) =>
        ({ targetId: attack.targetId, sourceId: attack.sourceId, dueTurn, next, attackName: attack.stats.name,
          ...(attack.stats.id === ETERNAL_THUNDER_ID && next === "rebound" ? { requiresAntiPiercing: true as const } : {}) })) } : {}),
      ...(state.pendingDamageItems ? { pendingDamageItems: state.pendingDamageItems.map(({ targetSkillIgnore, ...item }) =>
        targetSkillIgnore && item.targetId === viewerPlayerId ? { ...item, targetSkillIgnore } : item) } : {}),
      players,
      ...(emptyCityAttackTargets.length ? { emptyCityAttackTargets } : {}),
      eventLog,
      pendingActionPlayerIds,
      pendingSkillChoices: (state.pendingSkillChoices ?? []).filter(
        (choice) => choice.playerId === viewerPlayerId
      ),
      ...pointView,
      ...(viewer && viewer.kind !== "spectator" && state.phase !== "lobby" ? { statusOverview: getStatusOverview(state, viewer) } : {}),
      ...(state.activeTimingPhase === "turn_damage_modify" && viewer ? {
        thornPierceChoices: thornPierceChoices(state, viewer.id),
        bubbleDreamHitChoices: bubbleDreamHitChoices(state, viewer.id),
        tianlieResponseChoices: tianlieResponseChoices(state, viewer).map(({ id, skillId, stats, sourceId }) =>
          ({ id, skillId, label: skillId === "1051103" ? `${findPlayer(state, sourceId)?.name ?? "玩家"}的 ${stats.name}` : stats.name }))
      } : {}),
      ...(choices ? { blindSkillChoices: choices } : {}),
      ...(viewer && getOwnedSkillIds(viewer).some((id) => [ETERNAL_BIND_ID, ETERNAL_REPLACE_ID, ETERNAL_THOUGHT_ID].includes(id)) ?
        { eternalReadySkills: [ETERNAL_BIND_ID, ETERNAL_REPLACE_ID, ETERNAL_THOUGHT_ID]
          .filter((skillId) => readyEternalCard(state, viewer, { skillId })),
          ...(state.activeTimingPhase === "turn_change_action" ? { eternalMoveChoices: eternalMoveChoices(state, viewer.id)
            .map(({ index, label }) => ({ index, label })) } : {}) } : {}),
      ...(viewer && state.phase === "action_window" && state.activeTimingPhase === "revival_action" ?
        { sakuraCardChoices: getSakuraCardChoices(state, viewer, "death") } :
        viewer && state.sakuraTurnEndResponse ? { sakuraCardChoices: getSakuraCardChoices(state, viewer, "free") } :
        finaleChoices ? { sakuraCardChoices: finaleChoices,
          sakuraFinaleDiscardCount: getSakuraFinaleDiscardCount(getDiscardableSakuraChoices(state, finaleChoices)) } : {}),
      ...(karmaChoices ? { karmaCardChoices: karmaChoices, karmaReplacementIds: getKarmaReplacementIds(state) } : {}),
      ...(revealedActions ? { revealedActions } : {}),
      ...(revealedActions ? { revealedActionTargets: Object.fromEntries(Object.entries(state.pendingActions).map(([id, plan]) =>
        [id, plan?.actions.map((action) => getActionAttackTargetIds(state, id, action)) ?? []])) } : {}),
      ...(revealedActions ? { revealedAttackStats: Object.fromEntries(Object.keys(state.pendingActions).map((id) => [id,
        Object.fromEntries(Object.entries(state.turnAttackStats?.[id] ?? previewPlayerAttackStats(state, id).stats)
          .map(([index, stats]) => [index, { cost: stats.cost, power: stats.power, level: stats.level,
            ...(stats.damageParts ? { damageParts: stats.damageParts } : {}),
            ...(stats.powerValue ? { powerValue: stats.powerValue } : {}),
            ...(stats.levelValue ? { levelValue: stats.levelValue } : {}),
            ...(stats.costValue ? { costValue: stats.costValue } : {}),
            ...(stats.damagePartValues ? { damagePartValues: stats.damagePartValues } : {}) }]))])) } : {}),
      ...(revealedActions ? { revealedActionCosts: Object.fromEntries(Object.entries(state.pendingActions).map(([id, plan]) => {
        const owner = findPlayer(state, id)!;
        return [id, state.turnActionCosts?.[id] ?? plan?.actions.map((action) => action.type === "attack" ? getAttackActionCost(state, owner, action) :
          action.type === "skill" ? getTurnSkillActionCost(owner, action, state) : 0) ?? []];
      })) } : {}),
      viewerPlayerId
    };
  }

  const victoryCounter = getVictoryCounterView(state);
  const retirementCounter = getRetirementCounterView(state);
  return {
    ...publicFields,
    ...starWheelView,
    ...(skillVictoryUnaffectedPlayerIds && (!viewerPlayerId || skillVictoryUnaffectedPlayerIds.includes(viewerPlayerId))
      ? { skillVictoryUnaffectedPlayerIds: viewerPlayerId ? [viewerPlayerId] : skillVictoryUnaffectedPlayerIds } : {}),
    ...(victoryCounter ? { victoryCounter } : {}),
    ...(retirementCounter ? { retirementCounter } : {}),
    ...pointView,
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
  const inventory = player.emptyCityRecovery?.original ?? player;

  if (state.phase === "lobby" && state.config.skillMode === "test_select") {
    return player.skills;
  }

  return Array.from(
    new Set([
      ...(inventory.revealedSkillIds ?? []),
      ...(state.skillKnowledge?.[viewerId]?.[playerId] ?? [])
    ])
  ).filter((skillId) => getOwnedSkillIds(inventory).includes(skillId));
}

function publicActionPlans(plans: PendingActionMap, viewerId?: PlayerId): PendingActionMap {
  return Object.fromEntries(Object.entries(plans).map(([playerId, plan]) => [playerId, plan ? {
    actions: plan.actions.map((action) => {
      if (viewerId !== playerId) action = hideCheatActionSelections(action);
      if (action.type === "skill" && action.karmaCardChanges && viewerId !== playerId) {
        const { karmaCardChanges: _changes, freeMoveId: _free, ...publicAction } = action;
        return publicAction;
      }
      if (action.type === "skill" && action.swarmPaidInventory) {
        const { swarmPaidInventory: _paid, freeMoveId: _free, ...publicAction } = action;
        return publicAction;
      }
      if (!viewerId || viewerId === playerId) return { ...action };
      if (action.type === "skill" && action.skillId === COMMON_FUSION_SKILL_ID)
        return { type: "skill" as const, skillId: COMMON_FUSION_SKILL_ID, stacks: 1 };
      if (action.type === "skill" && action.skillId === SAKURA_FINALE_ID) {
        const { removeSkillInstanceIds: _discarded, freeMoveId: _free, ...publicAction } = action;
        return publicAction;
      }
      if ("freeMoveId" in action) {
        const { freeMoveId: _freeMoveId, ...publicAction } = action;
        return publicAction;
      }
      return { ...action };
    })
  } : undefined]));
}

function hideCheatActionSelections(action: PlayerAction): PlayerAction {
  if (action.type !== "skill" || !(action.cheatCardInstanceId || action.cheatTransferFrom || action.cheatTransferTo)) return action;
  const { cheatCardInstanceId: _card, cheatTransferFrom: _from, cheatTransferTo: _to, freeMoveId: _free, ...visibleAction } = action;
  return visibleAction;
}

function publicPlayerBuffs(player: PlayerState, viewerId: PlayerId | undefined, visibleSkills: SkillId[]): PlayerState["buffs"] {
  const recovery = viewerId !== player.id ? player.emptyCityRecovery : undefined;
  const visibleBuffs = player.buffs.filter((buff) => !isSoulTrackingBuff(buff) &&
    (viewerId === player.id || buff.stateType !== TIAN_YE_CHOICE_STATE || !buff.id.endsWith(":pending")) &&
    (!recovery || !buff.id.startsWith("skill_used:") && !buff.id.startsWith(SKILL_ACTIVATED_BUFF_PREFIX) &&
      !buff.sourceBigCardInstanceId?.startsWith("empty_city_recovery:")));
  if (recovery) visibleBuffs.push(...recovery.useLedger);
  if (!viewerId || viewerId === player.id) return visibleBuffs;
  return visibleBuffs.filter((buff) => !buff.freeMove && buff.id !== "wujin_rebound_count" && buff.id !== KAIGE_ZERO_LIFE_BUFF_ID &&
    !buff.id.startsWith("curtain_act:") && !buff.id.startsWith("curtain_rebirth_batch:") && !buff.id.startsWith("curtain_reflect_used:") &&
    buff.id !== "curtain_veils" && buff.id !== "curtain_reflect_pierce" && buff.id !== STORED_DAMAGE_STATUS &&
    !buff.id.startsWith("free_move:") && !buff.id.startsWith("shunshou_taken:") &&
    (!buff.id.startsWith("skill_transformed:") || visibleSkills.includes(buff.id.slice("skill_transformed:".length))) &&
    (!buff.id.startsWith("limited_use_balance:") || visibleSkills.includes(buff.id.slice("limited_use_balance:".length))) &&
    (!buff.id.includes("fusion_") || visibleSkills.some((id) => buff.id.includes(id))))
    .map(({ sourceFusionId: _source, fusionMarkKind: _kind, temporaryLostAbility: _loss, temporaryGrantedCardId: _grant, ...buff }) => buff);
}

export function getActionWindowSeconds(state: Pick<GameState, "config">): number {
  return isBigSkillMode(state.config.skillMode) ? BIG_SKILL_PHASE_SECONDS : ACTION_WINDOW_SECONDS;
}

export function getActionPromptSeconds(state: Pick<GameState, "config">, fallback = ACTION_PROMPT_SECONDS): number {
  return isBigSkillMode(state.config.skillMode) ? BIG_SKILL_PHASE_SECONDS : fallback;
}

export function getCurrentTurnLimitSeconds(state: Pick<GameState, "config">): number {
  if (isBigSkillMode(state.config.skillMode)) return BIG_SKILL_PHASE_SECONDS;
  return Math.max(5, state.config.turnTimeLimitSeconds);
}

export function getCakeGainAmount(state: Pick<GameState, "smallSpaces" | "players" | "roundNumber" | "turnNumber" | "totems">, player?: PlayerState): number {
  if (!player) return 1;
  if (hasTalisman(player, "wood", state.roundNumber)) return 0;
  const rapidCreation = player.buffs.some((buff) => buff.stateType === TIANMANG_CAKE_STATE) ? 3 : 1;
  const windHaste = player.buffs.some((buff) => buff.stateType === WIND_HASTE &&
    (buff.startsAtRound ?? Infinity) <= state.roundNumber && (buff.expiresAtRound ?? 0) > state.roundNumber) ? 2 : 1;
  const kurongGain = getKurongCakeDiscount(state, player) === 3 ? getSpringGrassNumber(player, KURONG_CAKES_ID, 3) : 1;
  const gain = getSpaceCakeMultiplier(state, player) * rapidCreation * windHaste * kurongGain * cheatWarpMultiplier(player, state.roundNumber) *
    yiyuanCakeMultiplier(player, state) /
    (2 ** totemsCovering(state, player, "frost").length * getStarMoonCakeDivisor(player));
  return !negativeStatusesHaveNoEffect(player) && sandVortexActive(player, state.roundNumber) ? Math.floor(gain / 3) : gain;
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

function assignBigCards(state: GameState): void {
  if (!isBigSkillMode(state.config.skillMode)) {
    for (const player of state.players) {
      delete player.bigCards;
      delete player.bigCardSlotCount;
      delete player.skillInventory;
    }
    return;
  }
  const count = Math.max(1, Math.min(MAX_BIG_CARDS_PER_PLAYER, Math.floor(state.config.skillCount)));
  state.config.skillCount = count;
  let pool: string[] = [];
  let sharedDeal: string[] | undefined;
  if (state.config.skillMode === "big_random") {
    validateRandomBigCardSettings(state.config);
    pool = state.openingBigCardDeal!.pool;
    if (pool.length === 0) throw new Error("请至少勾选一个参与随机的大卡包");
    const uniqueDeal = state.config.allowDuplicateBigCards === false;
    const required = uniqueDeal ? count * state.players.filter((player) => player.kind !== "spectator").length : count;
    if (pool.length < required) {
      throw new Error(`大卡池只有 ${pool.length} 张，开局需要 ${required} 张。请勾选更多卡包或减少每人发卡数量。`);
    }
    if (uniqueDeal) sharedDeal = drawSkillIds(pool, required);
  }
  for (const player of state.players) {
    player.skills = [];
    player.actionCakes = 0;
    delete player.skillFusions;
    player.revealedSkillIds = [];
    if (player.kind === "spectator") {
      player.bigCards = [];
    } else if (state.config.skillMode === "big_random") {
      player.bigCards = (sharedDeal ? sharedDeal.splice(0, count) : drawSkillIds(pool, count)).map((cardId) => ({
        instanceId: createId("big_card"), cardId
      }));
    } else {
      const selected = player.bigCards ?? [];
      const valid = sanitizeBigCardIds(selected.map((card) => card.cardId), count);
      player.bigCards = selected.filter((card) => valid.includes(card.cardId)).slice(0, count);
    }
  }
}

export function drawSkillIds(skillIds: readonly string[], count: number): string[] {
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
import { bigCardAbilityCanActivate } from "../bigCards/abilities";
