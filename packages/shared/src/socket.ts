import {
  GameId,
  GameConfig,
  MatchSummary,
  MatchTrainingSample,
  ActionSubmission,
  PlayerAction,
  PlayerId,
  PublicGameState
} from "./types";

export interface SocketAck<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface RoomIdentity {
  roomId: GameId;
  playerId: PlayerId;
}

export interface CreateRoomPayload {
  playerName: string;
  accountId?: string;
  avatarUrl?: string;
}

export interface JoinRoomPayload {
  roomId: GameId;
  playerName: string;
  accountId?: string;
  avatarUrl?: string;
}

export interface ResumeRoomPayload {
  roomId: GameId;
  playerId: PlayerId;
}

export interface AddAiPayload {
  roomId: GameId;
}

export interface StartGamePayload {
  roomId: GameId;
}

export interface SubmitActionPayload {
  roomId: GameId;
  action: ActionSubmission;
}

export interface RenamePlayerPayload {
  roomId: GameId;
  name: string;
}

export interface LeaveRoomPayload {
  roomId: GameId;
}

export interface KickPlayerPayload {
  roomId: GameId;
  targetPlayerId: PlayerId;
}

export interface UpdateSettingsPayload {
  roomId: GameId;
  config: Partial<GameConfig>;
}

export interface ClientToServerEvents {
  "room:create": (
    payload: CreateRoomPayload,
    ack: (response: SocketAck<RoomIdentity & { state: PublicGameState }>) => void
  ) => void;
  "room:join": (
    payload: JoinRoomPayload,
    ack: (response: SocketAck<RoomIdentity & { state: PublicGameState }>) => void
  ) => void;
  "room:resume": (
    payload: ResumeRoomPayload,
    ack: (response: SocketAck<RoomIdentity & { state: PublicGameState }>) => void
  ) => void;
  "room:add_ai": (
    payload: AddAiPayload,
    ack: (response: SocketAck<{ state: PublicGameState }>) => void
  ) => void;
  "room:rename": (
    payload: RenamePlayerPayload,
    ack: (response: SocketAck<RoomIdentity & { state: PublicGameState }>) => void
  ) => void;
  "room:leave": (
    payload: LeaveRoomPayload,
    ack: (response: SocketAck<{ state?: PublicGameState }>) => void
  ) => void;
  "room:kick": (
    payload: KickPlayerPayload,
    ack: (response: SocketAck<{ state: PublicGameState }>) => void
  ) => void;
  "room:update_settings": (
    payload: UpdateSettingsPayload,
    ack: (response: SocketAck<{ state: PublicGameState }>) => void
  ) => void;
  "game:start": (
    payload: StartGamePayload,
    ack: (response: SocketAck<{ state: PublicGameState }>) => void
  ) => void;
  "game:submit_action": (
    payload: SubmitActionPayload,
    ack: (response: SocketAck<{ state: PublicGameState; resolved: boolean }>) => void
  ) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: PublicGameState) => void;
  "room:error": (message: string) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  roomId?: GameId;
  playerId?: PlayerId;
}

export interface MatchListResponse {
  matches: MatchSummary[];
}

export interface MatchDetailResponse {
  state: PublicGameState;
}

export interface MatchTrainingSamplesResponse {
  samples: MatchTrainingSample[];
}
