export type GameId = string;
export type PlayerId = string;
export type SkillId = string;
export type BuffId = string;

export const INITIAL_HP = 6;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const INFINITE_DAMAGE = 999;

export type PlayerStatus = "alive" | "dead";
export type PlayerKind = "human" | "ai";

export type GamePhase =
  | "lobby"
  | "collecting_actions"
  | "resolving"
  | "finished";

export type DefenseKind = "small" | "youtiao" | "stone" | "rebound";

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
  | "poison"
  | "pierce_rebound"
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
  isArea: boolean;
  stacks: number;
  isSkill: boolean;
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
  connected: boolean;
  skills: SkillId[];
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
  targetId?: PlayerId;
}

export type PlayerAction =
  | GainCakeAction
  | DefenseAction
  | AttackAction
  | SkillAction;

export interface PlayerActionPlan {
  actions: PlayerAction[];
}

export type ActionSubmission = PlayerAction | PlayerActionPlan;

export type PendingActionMap = Partial<Record<PlayerId, PlayerActionPlan>>;

export type SkillMode = "none" | "small_intro";
export type SpeedMode = "normal" | "accelerating";

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
  turnStartedAt: number;
  turnDeadlineAt?: number;
  players: PlayerState[];
  pendingActions: PendingActionMap;
  eventLog: GameEvent[];
  winnerIds: PlayerId[];
  config: GameConfig;
  createdAt: number;
  updatedAt: number;
}

export interface PublicGameState
  extends Omit<GameState, "pendingActions"> {
  pendingActionPlayerIds: PlayerId[];
  viewerPlayerId?: PlayerId;
}

export type GameEvent =
  | GameCreatedEvent
  | PlayerJoinedEvent
  | PlayerReadyEvent
  | ActionSubmittedEvent
  | PlayerRenamedEvent
  | PlayerLeftEvent
  | PlayerKickedEvent
  | SettingsUpdatedEvent
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
