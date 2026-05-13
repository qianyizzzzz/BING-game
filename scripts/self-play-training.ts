import fs from "node:fs";
import path from "node:path";
import {
  ActionSubmission,
  GameConfig,
  GameState,
  PlayerAction,
  PlayerId,
  addPlayerToGame,
  alivePlayers,
  createGame,
  createPlayer,
  startGame,
  submitPlayerAction
} from "@bing/shared";
import { chooseAiAction } from "../apps/server/src/ai";
import {
  AiPolicyModel,
  createEmptyAiPolicy,
  getActionFeatureKeys,
  getAiPolicyPath,
  loadAiPolicy,
  writeAiPolicy
} from "../apps/server/src/aiPolicy";

interface TrainingOptions {
  durationMinutes: number;
  maxGames: number;
  players: number;
  skillHeavy: boolean;
  checkpointGames: number;
  learningRate: number;
}

interface DecisionSample {
  playerId: PlayerId;
  keys: string[];
  skillCount: number;
}

interface TrainingStats {
  games: number;
  skillGames: number;
  finishedGames: number;
  turns: number;
  winners: Record<string, number>;
  startedAt: number;
}

const options = readOptions(process.argv.slice(2));
const initialPolicy = loadAiPolicy() ?? createEmptyAiPolicy();
const weights = { ...initialPolicy.weights };
const stats: TrainingStats = {
  games: 0,
  skillGames: 0,
  finishedGames: 0,
  turns: 0,
  winners: {},
  startedAt: Date.now()
};

const stopAt = Date.now() + options.durationMinutes * 60_000;

console.log(
  `AI self-play started: duration=${options.durationMinutes}min, maxGames=${options.maxGames}, skillHeavy=${options.skillHeavy}`
);
console.log(`Policy path: ${getAiPolicyPath()}`);

while (Date.now() < stopAt && stats.games < options.maxGames) {
  const result = playTrainingGame(options);
  updateWeights(result.state, result.decisions, weights, options);
  recordStats(result.state, stats, result.skillCount);

  if (stats.games % options.checkpointGames === 0) {
    savePolicy(initialPolicy, weights, stats);
    writeReport(initialPolicy, weights, stats, options);
    console.log(
      `checkpoint games=${stats.games} skillGames=${stats.skillGames} avgTurns=${(stats.turns / Math.max(1, stats.games)).toFixed(1)}`
    );
  }
}

savePolicy(initialPolicy, weights, stats);
writeReport(initialPolicy, weights, stats, options);
console.log(`AI self-play finished: games=${stats.games}, skillGames=${stats.skillGames}`);

function playTrainingGame(options: TrainingOptions): {
  state: GameState;
  decisions: DecisionSample[];
  skillCount: number;
} {
  const skillCount = chooseSkillCount(options.skillHeavy);
  const config: Partial<GameConfig> = {
    skillMode: skillCount > 0 ? "small_intro" : "none",
    skillCount,
    firstTurnNoAttack: true,
    turnTimeLimitSeconds: 45,
    speedMode: Math.random() < 0.2 ? "accelerating" : "normal"
  };

  let state = createGame("AI 1", config);
  state.players[0]!.kind = "ai";

  for (let index = 2; index <= options.players; index += 1) {
    state = addPlayerToGame(state, createPlayer(`AI ${index}`, "ai"));
  }

  state = startGame(state);
  const decisions: DecisionSample[] = [];
  const maxTurns = 180;

  while (state.phase === "collecting_actions" && state.turnNumber <= maxTurns) {
    const turnNumber = state.turnNumber;
    const actingPlayers = alivePlayers(state).filter(
      (player) => !state.pendingActions[player.id]
    );

    if (actingPlayers.length === 0) {
      break;
    }

    for (const player of actingPlayers) {
      if (state.phase !== "collecting_actions" || state.turnNumber !== turnNumber) {
        break;
      }

      if (state.pendingActions[player.id]) {
        continue;
      }

      const self = state.players.find((item) => item.id === player.id);
      const enemies = alivePlayers(state).filter((item) => item.id !== player.id);
      if (!self) {
        continue;
      }

      const action = chooseAiAction(state, player.id);
      decisions.push({
        playerId: player.id,
        keys: getActionFeatureKeys(state, self, enemies, action),
        skillCount: self.skills.length
      });

      state = submitSafely(state, player.id, action);
    }
  }

  return { state, decisions, skillCount };
}

function submitSafely(
  state: GameState,
  playerId: PlayerId,
  action: PlayerAction
): GameState {
  try {
    return submitPlayerAction(state, playerId, action).state;
  } catch {
    const fallback: ActionSubmission = { type: "gain_cake" };
    return submitPlayerAction(state, playerId, fallback).state;
  }
}

function updateWeights(
  state: GameState,
  decisions: DecisionSample[],
  weights: Record<string, number>,
  options: TrainingOptions
): void {
  const winners = resolveWinnerIds(state);
  const winnerSet = new Set(winners);
  const finalPlayers = new Map(state.players.map((player) => [player.id, player]));

  for (const decision of decisions) {
    const player = finalPlayers.get(decision.playerId);
    const isWinner = winnerSet.has(decision.playerId);
    const survived = player?.status === "alive";
    const baseReward = isWinner ? 1 : survived ? -0.25 : -0.7;
    const skillMultiplier = decision.skillCount > 0 ? 1.45 : 1;
    const delta = options.learningRate * baseReward * skillMultiplier;

    for (const key of decision.keys) {
      weights[key] = clampWeight((weights[key] ?? 0) + delta);
    }
  }
}

function recordStats(state: GameState, stats: TrainingStats, skillCount: number): void {
  stats.games += 1;
  stats.turns += state.turnNumber;
  if (skillCount > 0) {
    stats.skillGames += 1;
  }
  if (state.phase === "finished") {
    stats.finishedGames += 1;
  }

  for (const winnerId of resolveWinnerIds(state)) {
    const winner = state.players.find((player) => player.id === winnerId);
    const name = winner?.name ?? winnerId;
    stats.winners[name] = (stats.winners[name] ?? 0) + 1;
  }
}

function savePolicy(
  initialPolicy: AiPolicyModel,
  weights: Record<string, number>,
  stats: TrainingStats
): void {
  writeAiPolicy({
    version: 1,
    trainedAt: new Date().toISOString(),
    games: initialPolicy.games + stats.games,
    skillGames: initialPolicy.skillGames + stats.skillGames,
    durationMs: initialPolicy.durationMs + (Date.now() - stats.startedAt),
    weights,
    notes: [
      "Self-play linear action policy. Positive weights mean the action feature correlated with wins.",
      "Skill-heavy runs intentionally over-sample games with 1-3 small skills."
    ]
  });
}

function writeReport(
  initialPolicy: AiPolicyModel,
  weights: Record<string, number>,
  stats: TrainingStats,
  options: TrainingOptions
): void {
  const policyFile = getAiPolicyPath();
  const reportFile = path.join(path.dirname(policyFile), "self-play-report.txt");
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  const topPositive = topWeights(weights, "positive");
  const topNegative = topWeights(weights, "negative");
  const lines = [
    "《饼》AI 自我对战训练报告",
    `本次训练局数：${stats.games}`,
    `其中带技能局：${stats.skillGames}`,
    `完成对局：${stats.finishedGames}`,
    `平均回合数：${(stats.turns / Math.max(1, stats.games)).toFixed(1)}`,
    `本次训练时长：${formatDuration(Date.now() - stats.startedAt)}`,
    `累计训练局数：${initialPolicy.games + stats.games}`,
    `累计带技能局：${initialPolicy.skillGames + stats.skillGames}`,
    `训练模式：${options.skillHeavy ? "偏技能局" : "均衡局"}`,
    "",
    "胜者分布：",
    ...Object.entries(stats.winners)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `- ${name}: ${count}`),
    "",
    "权重最高的策略特征：",
    ...topPositive.map(([key, value]) => `- ${key}: ${value.toFixed(3)}`),
    "",
    "权重最低的策略特征：",
    ...topNegative.map(([key, value]) => `- ${key}: ${value.toFixed(3)}`),
    "",
    `策略文件：${policyFile}`
  ];

  fs.writeFileSync(reportFile, `${lines.join("\n")}\n`, "utf-8");
}

function resolveWinnerIds(state: GameState): PlayerId[] {
  if (state.winnerIds.length > 0) {
    return state.winnerIds;
  }

  const alive = alivePlayers(state);
  const pool = alive.length > 0 ? alive : state.players;
  const bestScore = Math.max(...pool.map((player) => player.hp * 10 + player.cakes));
  return pool
    .filter((player) => player.hp * 10 + player.cakes === bestScore)
    .map((player) => player.id);
}

function chooseSkillCount(skillHeavy: boolean): number {
  const roll = Math.random();
  if (!skillHeavy) {
    return roll < 0.5 ? 0 : Math.ceil(Math.random() * 3);
  }

  if (roll < 0.1) {
    return 0;
  }
  if (roll < 0.4) {
    return 1;
  }
  if (roll < 0.72) {
    return 2;
  }
  return 3;
}

function topWeights(
  weights: Record<string, number>,
  direction: "positive" | "negative"
): Array<[string, number]> {
  return Object.entries(weights)
    .sort((a, b) => (direction === "positive" ? b[1] - a[1] : a[1] - b[1]))
    .slice(0, 12);
}

function clampWeight(value: number): number {
  return Math.max(-3, Math.min(3, Number(value.toFixed(5))));
}

function formatDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1000);
  return `${minutes}分${seconds}秒`;
}

function readOptions(args: string[]): TrainingOptions {
  return {
    durationMinutes: readNumber(args, "--duration-minutes", 5),
    maxGames: readNumber(args, "--max-games", Number.MAX_SAFE_INTEGER),
    players: Math.max(2, Math.min(6, readNumber(args, "--players", 4))),
    skillHeavy: args.includes("--skill-heavy"),
    checkpointGames: Math.max(10, readNumber(args, "--checkpoint-games", 100)),
    learningRate: readNumber(args, "--learning-rate", 0.006)
  };
}

function readNumber(args: string[], flag: string, fallback: number): number {
  const index = args.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  const raw = args[index + 1];
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
}
