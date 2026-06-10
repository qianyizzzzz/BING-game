export type GameId = string;
export type PlayerId = string;
export type SkillId = string;
export type BuffId = string;

export const INITIAL_HP = 6;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const INFINITE_DAMAGE = 999;
export const RETIRE_EFFECT_POWER = 100000;

export type PlayerStatus = "alive" | "dead";
export type PlayerKind = "human" | "ai" | "spectator";
export type DefeatLevel = 1 | 2 | 3 | 4 | 5;

export const DEFEAT_LEVEL_LABELS: Record<DefeatLevel, string> = {
  1: "死亡",
  2: "退游",
  3: "消失",
  4: "被必杀",
  5: "爆炸了"
};

export type GamePhase =
  | "lobby"
  | "action_window"
  | "collecting_actions"
  | "resolving"
  | "finished";

export type SkillTimingPhase =
  | "game_start_check"
  | "round_pre_interval_action"
  | "round_before_action"
  | "round_start_check"
  | "turn_before_action"
  | "turn_start_check"
  | "turn_action"
  | "turn_reveal_check"
  | "turn_change_action"
  | "turn_hit_check"
  | "turn_damage_modify"
  | "turn_damage_check"
  | "revival_action"
  | "turn_end_action"
  | "turn_end_check"
  | "turn_after_interval_action"
  | "round_end_check"
  | "round_after_interval_action"
  | "passive_check";

export type ActionWindowMode = "prompt" | "active";

export type DefenseKind = "small" | "youtiao" | "stone" | "rebound" | "self_destruct";

export type DefenseTag =
  | "small"
  | "youtiao"
  | "stone"
  | "any"
  | "cake"
  | "unblockable";

export type AttackElement =
  | "physical"
  | "fire"
  | "electric"
  | "ice"
  | "poison";

export type AttackTrait =
  | "area"
  | "fire"
  | "electric"
  | "ice"
  | "poison"
  | "defeat_retire"
  | "defeat_vanish"
  | "defeat_execute"
  | "defeat_explode"
  | "frost_blade"
  | "pierce_rebound"
  | "ignore_protection"
  | "skill";

export type AttackId =
  | "sha"
  | "qin"
  | "wan_jian"
  | "nan_man"
  | "shan_dian"
  | "huo_wu"
  | "he_bao"
  | "chao_he_bao"
  | "miao_sha";

export interface BaseAttackDefinition {
  id: AttackId;
  name: string;
  cost: number;
  power: number | "infinity";
  level: number;
  defenseTag: DefenseTag;
  traits: AttackTrait[];
  element: AttackElement;
  isArea: boolean;
}

export interface AttackStats {
  id: AttackId | SkillId;
  name: string;
  cost: number;
  power: number;
  level: number;
  defenseTag: DefenseTag;
  traits: AttackTrait[];
  element: AttackElement;
  elements: AttackElement[];
  isArea: boolean;
  stacks: number;
  isSkill: boolean;
  freezeTurns?: number;
}

export interface PlayerState {
  id: PlayerId;
  accountId?: string;
  name: string;
  avatarUrl?: string;
  kind: PlayerKind;
  hp: number;
  cakes: number;
  status: PlayerStatus;
  defeatLevel?: DefeatLevel;
  connected: boolean;
  skills: SkillId[];
  skillSlotCount?: number;
  revealedSkillIds: SkillId[];
  buffs: BuffState[];
}

export interface BuffState {
  id: BuffId;
  name: string;
  stacks: number;
  expiresAtRound?: number;
  expiresAtTurn?: number;
  sourcePlayerId?: PlayerId;
}

export interface GainCakeAction {
  type: "gain_cake";
}

export interface DefenseAction {
  type: "defense";
  defense: DefenseKind;
  targetId?: PlayerId;
}

export interface AttackAction {
  type: "attack";
  attackId: AttackId;
  stacks: number;
  targetId?: PlayerId;
}

export interface SkillAction {
  type: "skill";
  skillId: SkillId;
  stacks: number;
  freeStacks?: number;
  targetId?: PlayerId;
  targetIds?: PlayerId[];
  targetSkillId?: SkillId;
  targetDamageId?: string;
  attackStatModifier?: AttackStatModifierChoice;
  switchActionIndex?: number;
  switchToAction?: AttackAction | DefenseAction;
}

export interface DiscardSkillAction {
  type: "discard_skill";
  targetSkillId: SkillId;
}

export type AttackStatModifierChoice =
  | "swap_power_level"
  | "power_plus_1_level_minus_1"
  | "power_minus_1_level_plus_1"
  | "power_plus_2_level_minus_2"
  | "power_minus_2_level_plus_2"
  | "power_times_3_level_to_zero"
  | "power_to_zero_level_times_4";

export type PlayerAction =
  | GainCakeAction
  | DefenseAction
  | AttackAction
  | SkillAction
  | DiscardSkillAction;

export interface PlayerActionPlan {
  actions: PlayerAction[];
}

export type ActionSubmission = PlayerAction | PlayerActionPlan;

export type PendingActionMap = Partial<Record<PlayerId, PlayerActionPlan>>;
export type SkillKnowledgeMap = Partial<
  Record<PlayerId, Partial<Record<PlayerId, SkillId[]>>>
>;

export type SkillMode = "none" | "small_intro" | "test_select";
export type SpeedMode = "normal";

export interface GameConfig {
  maxPlayers: number;
  allowAI: boolean;
  firstTurnNoAttack: boolean;
  hideCakeCounts: boolean;
  turnTimeLimitSeconds: number;
  speedMode: SpeedMode;
  skillMode: SkillMode;
  skillCount: number;
}

export interface GameState {
  id: GameId;
  ownerId: PlayerId;
  phase: GamePhase;
  roundNumber: number;
  roundTurnNumber: number;
  turnNumber: number;
  activeTimingPhase: SkillTimingPhase;
  turnResolutionStarted?: boolean;
  turnHealthChanged?: boolean;
  damageModifyReturnPhase?: SkillTimingPhase;
  damageModifyAfterTurnResolution?: boolean;
  preemptiveRestartSnapshot?: PreemptiveRestartSnapshot;
  actionWindowMode?: ActionWindowMode;
  actionWindowDeadlineAt?: number;
  actionWindowPlayerIds: PlayerId[];
  actionWindowPassPlayerIds: PlayerId[];
  turnStartedAt: number;
  turnDeadlineAt?: number;
  players: PlayerState[];
  pendingActions: PendingActionMap;
  pendingDamageItems?: PendingDamageItem[];
  pendingSkillChoices?: PendingSkillChoice[];
  skillKnowledge: SkillKnowledgeMap;
  eventLog: GameEvent[];
  winnerIds: PlayerId[];
  config: GameConfig;
  createdAt: number;
  updatedAt: number;
}

export interface PreemptiveRestartSnapshot {
  roundNumber: number;
  roundTurnNumber: number;
  turnNumber: number;
  activeTimingPhase: SkillTimingPhase;
  turnStartedAt: number;
  players: PlayerState[];
  pendingActions: PendingActionMap;
  pendingSkillChoices?: PendingSkillChoice[];
}

export interface PublicGameState
  extends Omit<
    GameState,
    | "pendingActions"
    | "skillKnowledge"
    | "pendingSkillChoices"
    | "preemptiveRestartSnapshot"
    | "damageModifyAfterTurnResolution"
  > {
  pendingActionPlayerIds: PlayerId[];
  pendingSkillChoices?: PendingSkillChoice[];
  revealedActions?: PendingActionMap;
  viewerPlayerId?: PlayerId;
}

export type GameEvent =
  | GameCreatedEvent
  | PlayerJoinedEvent
  | PlayerReadyEvent
  | ActionSwitchedEvent
  | ActionSubmittedEvent
  | PlayerRenamedEvent
  | PlayerLeftEvent
  | PlayerKickedEvent
  | SettingsUpdatedEvent
  | SkillRevealedEvent
  | SkillUsedEvent
  | TurnRevealedEvent
  | CakeChangedEvent
  | AttackBlockedEvent
  | AttackReflectedEvent
  | ReboundBrokenEvent
  | ClashEvent
  | DamageEvent
  | HealEvent
  | RoundEndedEvent
  | PlayerDiedEvent
  | GameFinishedEvent
  | SystemEvent;

export interface BaseGameEvent {
  id: string;
  type: string;
  at: number;
  roundNumber: number;
  turnNumber: number;
}

export interface GameCreatedEvent extends BaseGameEvent {
  type: "game_created";
  gameId: GameId;
}

export interface PlayerJoinedEvent extends BaseGameEvent {
  type: "player_joined";
  playerId: PlayerId;
  name: string;
}

export interface PlayerReadyEvent extends BaseGameEvent {
  type: "player_ready";
  playerId: PlayerId;
}

export interface ActionSubmittedEvent extends BaseGameEvent {
  type: "action_submitted";
  playerId: PlayerId;
}

export interface ActionSwitchedEvent extends BaseGameEvent {
  type: "action_switched";
  playerId: PlayerId;
  skillId: SkillId;
  skillName: string;
  actionIndex: number;
  before: PlayerAction;
  after: PlayerAction;
  cost: number;
}

export interface PlayerRenamedEvent extends BaseGameEvent {
  type: "player_renamed";
  playerId: PlayerId;
  name: string;
}

export interface PlayerLeftEvent extends BaseGameEvent {
  type: "player_left";
  playerId: PlayerId;
  name: string;
}

export interface PlayerKickedEvent extends BaseGameEvent {
  type: "player_kicked";
  playerId: PlayerId;
  name: string;
  byPlayerId: PlayerId;
}

export interface SettingsUpdatedEvent extends BaseGameEvent {
  type: "settings_updated";
  byPlayerId: PlayerId;
  config: GameConfig;
}

export interface SkillRevealedEvent extends BaseGameEvent {
  type: "skill_revealed";
  playerId: PlayerId;
  skillId: SkillId;
  skillName: string;
  viewerPlayerId?: PlayerId;
  reason: string;
}

export interface SkillUsedEvent extends BaseGameEvent {
  type: "skill_used";
  playerId: PlayerId;
  skillId: SkillId;
  skillName: string;
  reason: string;
}

export interface TurnRevealedEvent extends BaseGameEvent {
  type: "turn_revealed";
  actions: Record<PlayerId, PlayerActionPlan>;
}

export interface CakeChangedEvent extends BaseGameEvent {
  type: "cake_changed";
  playerId: PlayerId;
  before: number;
  after: number;
  reason: string;
}

export interface AttackBlockedEvent extends BaseGameEvent {
  type: "attack_blocked";
  sourceId: PlayerId;
  targetId: PlayerId;
  attackName: string;
  defense?: DefenseKind | "gain_cake";
  blockKind?: "block" | "dodge" | "reduce" | "invulnerable" | "shield" | "immune";
  protectionName?: string;
}

export interface AttackReflectedEvent extends BaseGameEvent {
  type: "attack_reflected";
  sourceId: PlayerId;
  originalTargetId: PlayerId;
  reflectedTargetId: PlayerId;
  attackName: string;
}

export interface ReboundBrokenEvent extends BaseGameEvent {
  type: "rebound_broken";
  sourceId: PlayerId;
  targetId: PlayerId;
  attackName: string;
}

export interface ClashEvent extends BaseGameEvent {
  type: "clash";
  attackerAId: PlayerId;
  attackerBId: PlayerId;
  result: string;
}

export interface DamageEvent extends BaseGameEvent {
  type: "damage";
  sourceId?: PlayerId;
  targetId: PlayerId;
  amount: number;
  attackName?: string;
  element?: AttackElement;
  elements?: AttackElement[];
  traits?: AttackTrait[];
}

export interface PendingDamageItem {
  id: string;
  sourceId?: PlayerId;
  targetId: PlayerId;
  amount: number;
  attackName?: string;
  element?: AttackElement;
  elements?: AttackElement[];
  traits?: AttackTrait[];
  fromAttack?: boolean;
  isLastHit?: boolean;
  redirectedByPlayerIds?: PlayerId[];
  damageModifierIds?: string[];
}

export interface PendingSkillChoice {
  id: string;
  playerId: PlayerId;
  sourcePlayerId: PlayerId;
  skillId: SkillId;
  kind: "steal_skill";
}

export interface HealEvent extends BaseGameEvent {
  type: "heal";
  sourceId?: PlayerId;
  targetId: PlayerId;
  amount: number;
  reason: string;
}

export interface RoundEndedEvent extends BaseGameEvent {
  type: "round_ended";
  reason: string;
}

export interface PlayerDiedEvent extends BaseGameEvent {
  type: "player_died";
  playerId: PlayerId;
  defeatLevel?: DefeatLevel;
  sourceId?: PlayerId;
  reason?: string;
}

export interface GameFinishedEvent extends BaseGameEvent {
  type: "game_finished";
  winnerIds: PlayerId[];
}

export interface SystemEvent extends BaseGameEvent {
  type: "system";
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export interface SubmitActionResult {
  state: GameState;
  resolved: boolean;
}

export interface MatchSummary {
  id: GameId;
  phase: GamePhase;
  playerNames: string[];
  winnerNames: string[];
  turnNumber: number;
  roundNumber: number;
  updatedAt: number;
}

export interface MatchTrainingSample {
  gameId: GameId;
  at: number;
  playerId: PlayerId;
  playerKind: PlayerKind;
  action: PlayerActionPlan;
  state: PublicGameState;
}
