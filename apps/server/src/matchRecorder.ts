import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GameId,
  GameState,
  MatchSummary,
  MatchTrainingSample,
  ActionSubmission,
  PublicGameState,
  PlayerId,
  toPublicGameState
} from "@bing/shared";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDir = path.resolve(moduleDir, "../../../data");

export class MatchRecorder {
  private readonly matchDir: string;
  private readonly snapshotDir: string;
  private readonly trainingDir: string;

  constructor(rootDir = process.env.MATCH_DATA_DIR ?? defaultDataDir) {
    this.matchDir = path.resolve(rootDir, "matches");
    this.snapshotDir = path.resolve(rootDir, "snapshots");
    this.trainingDir = path.resolve(rootDir, "training");
    fs.mkdirSync(this.matchDir, { recursive: true });
    fs.mkdirSync(this.snapshotDir, { recursive: true });
    fs.mkdirSync(this.trainingDir, { recursive: true });
  }

  recordState(state: GameState): void {
    const publicState = toPublicGameState(state);
    writeJsonFile(this.matchPath(state.id), publicState);
    fs.appendFileSync(
      this.snapshotPath(state.id),
      `${JSON.stringify({
        at: Date.now(),
        state: publicState
      })}\n`,
      "utf-8"
    );
  }

  recordDecision(
    stateBeforeAction: GameState,
    playerId: PlayerId,
    submission: ActionSubmission
  ): void {
    const player = stateBeforeAction.players.find((item) => item.id === playerId);
    if (!player) {
      return;
    }

    const sample: MatchTrainingSample = {
      gameId: stateBeforeAction.id,
      at: Date.now(),
      playerId,
      playerKind: player.kind,
      action: "actions" in submission ? submission : { actions: [submission] },
      state: toPublicGameState(stateBeforeAction, playerId)
    };

    fs.appendFileSync(
      this.trainingPath(stateBeforeAction.id),
      `${JSON.stringify(sample)}\n`,
      "utf-8"
    );
  }

  listMatches(): MatchSummary[] {
    return fs
      .readdirSync(this.matchDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => this.readMatch(file.replace(/\.json$/, "")))
      .filter((state): state is PublicGameState => Boolean(state))
      .map((state) => summarizeMatch(state))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  readMatch(gameId: GameId): PublicGameState | undefined {
    const filePath = this.matchPath(gameId);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as PublicGameState;
  }

  readTrainingSamples(gameId: GameId): MatchTrainingSample[] {
    const filePath = this.trainingPath(gameId);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    return fs
      .readFileSync(filePath, "utf-8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as MatchTrainingSample);
  }

  private matchPath(gameId: GameId): string {
    return path.join(this.matchDir, `${safeFileName(gameId)}.json`);
  }

  private snapshotPath(gameId: GameId): string {
    return path.join(this.snapshotDir, `${safeFileName(gameId)}.jsonl`);
  }

  private trainingPath(gameId: GameId): string {
    return path.join(this.trainingDir, `${safeFileName(gameId)}.jsonl`);
  }
}

function summarizeMatch(state: PublicGameState): MatchSummary {
  const winnerNames = state.winnerIds
    .map((winnerId) => state.players.find((player) => player.id === winnerId)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    id: state.id,
    phase: state.phase,
    playerNames: state.players.map((player) => player.name),
    winnerNames,
    turnNumber: state.turnNumber,
    roundNumber: state.roundNumber,
    updatedAt: state.updatedAt
  };
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
