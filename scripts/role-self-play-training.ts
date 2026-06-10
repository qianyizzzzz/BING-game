import fs from "node:fs";
import path from "node:path";
import {
  ActionSubmission,
  AttackId,
  BASE_ATTACKS,
  GameConfig,
  GameEvent,
  GameState,
  PlayerAction,
  PlayerId,
  PlayerState,
  addPlayerToGame,
  advanceActionWindow,
  alivePlayers,
  createGame,
  createPlayer,
  getActionPlanLabel,
  getSkillAttackStats,
  getStackedAttackStats,
  startGame,
  submitPlayerAction
} from "@bing/shared";
import {
  enumerateLegalAiActions,
  scoreAiAction
} from "../apps/server/src/ai";
import {
  AiPolicyModel,
  createEmptyAiPolicy,
  getActionFeatureKeys,
  getAiPolicyPath,
  loadAiPolicy,
  writeAiPolicy
} from "../apps/server/src/aiPolicy";

type RoleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface SecretRole {
  id: RoleId;
  name: string;
  primaryGoal: string;
}

interface TrainingOptions {
  durationMinutes: number;
  maxGames: number;
  players: number;
  skillHeavy: boolean;
  checkpointGames: number;
  learningRate: number;
  targetError: number;
  minGames: number;
  thoughtLogLimit: number;
}

interface DecisionSample {
  playerId: PlayerId;
  roleId: RoleId;
  keys: string[];
  action: PlayerAction;
  hpBefore: number;
  cakesBefore: number;
  turnNumber: number;
  skillCount: number;
}

interface RoleStats {
  games: number;
  wins: number;
  totalReward: number;
}

interface TrainingStats {
  games: number;
  skillGames: number;
  finishedGames: number;
  turns: number;
  winners: Record<string, number>;
  startedAt: number;
  convergenceError: number;
  checkpointErrors: number[];
  windowAbsError: number;
  windowSamples: number;
  thoughtsGenerated: number;
  thoughtsWritten: number;
  stopReason: string;
  roleStats: Record<RoleId, RoleStats>;
}

interface GameTrainingResult {
  state: GameState;
  decisions: DecisionSample[];
  roles: Map<PlayerId, SecretRole>;
  skillCount: number;
}

interface RolePrediction {
  player: string;
  possible_role: string;
  confidence: number;
  reason: string;
}

interface DecisionThought {
  secret_role: {
    role_id: string;
    role_name: string;
    primary_goal: string;
    role_progress: string;
  };
  situation_analysis: {
    self_status: string;
    main_threats: string;
    best_target: string;
    resource_state: string;
  };
  role_prediction: RolePrediction[];
  long_term_plan: {
    current_stage: string;
    next_goal: string;
    resource_plan: string;
    kill_window: string;
  };
  role_objective_check: {
    does_action_help_role_goal: boolean;
    does_action_violate_role_limit: boolean;
    expected_role_reward: string;
    reason: string;
  };
  risk_assessment: {
    worst_case: string;
    expected_value: string;
    danger_level: string;
  };
  final_action: {
    action: string;
    target: string;
    reason: string;
  };
}

const ROLES: SecretRole[] = [
  { id: 1, name: "胜率最大化 AI", primaryGoal: "获得最终胜利，长期提高胜率" },
  { id: 2, name: "南蛮专精 AI", primaryGoal: "尽可能多地使用南蛮，禁止其他基础攻击" },
  { id: 3, name: "核爆专精 AI", primaryGoal: "攒资源并尽可能多地使用核爆，禁止其他基础攻击" },
  { id: 4, name: "超核爆专精 AI", primaryGoal: "长期攒资源并发动超核爆，禁止其他基础攻击" },
  { id: 5, name: "防御生存 AI", primaryGoal: "通过防御保持不掉血并活到后期" },
  { id: 6, name: "反弹伤害 AI", primaryGoal: "诱导攻击并通过反弹造成伤害" },
  { id: 7, name: "秒杀资源 AI", primaryGoal: "攒到 14 个饼并使用秒杀" },
  { id: 8, name: "速胜 AI", primaryGoal: "尽快压低敌方血量并获胜" }
];

const ROLE_BY_ID = new Map<RoleId, SecretRole>(ROLES.map((role) => [role.id, role]));
const FORCED_ATTACK_BY_ROLE: Partial<Record<RoleId, AttackId>> = {
  2: "nan_man",
  3: "he_bao",
  4: "chao_he_bao"
};

const options = readOptions(process.argv.slice(2));
const initialPolicy = loadAiPolicy() ?? createEmptyAiPolicy();
const weights = { ...initialPolicy.weights };
const stats = createStats();
const stopAt = Date.now() + options.durationMinutes * 60_000;
const thoughtFile = path.resolve(path.dirname(getAiPolicyPath()), "role-decision-trace.jsonl");

fs.mkdirSync(path.dirname(thoughtFile), { recursive: true });
fs.writeFileSync(thoughtFile, "", "utf-8");

console.log(
  `Role self-play started: duration=${options.durationMinutes}min, targetError=${options.targetError}, minGames=${options.minGames}, skillHeavy=${options.skillHeavy}`
);
console.log(`Policy path: ${getAiPolicyPath()}`);
console.log(`Decision trace: ${thoughtFile}`);

while (Date.now() < stopAt && stats.games < options.maxGames) {
  const result = playTrainingGame(options, weights, stats, thoughtFile);
  const rewards = evaluateRoleRewards(result.state, result.decisions, result.roles);
  updateWeights(result.decisions, rewards, weights, options, stats);
  recordStats(result.state, result.roles, rewards, stats, result.skillCount);

  if (stats.games % options.checkpointGames === 0) {
    checkpoint(initialPolicy, weights, stats, options);
    console.log(
      `checkpoint games=${stats.games} error=${stats.convergenceError.toExponential(3)} skillGames=${stats.skillGames} avgTurns=${(stats.turns / Math.max(1, stats.games)).toFixed(1)}`
    );

    if (stats.games >= options.minGames && stats.convergenceError <= options.targetError) {
      stats.stopReason = `converged: error ${stats.convergenceError.toExponential(3)} <= ${options.targetError}`;
      break;
    }
  }
}

if (!stats.stopReason) {
  stats.stopReason =
    stats.games >= options.maxGames
      ? `max games reached: ${options.maxGames}`
      : `time limit reached: ${options.durationMinutes}min`;
}

checkpoint(initialPolicy, weights, stats, options);
console.log(
  `Role self-play finished: games=${stats.games}, skillGames=${stats.skillGames}, error=${stats.convergenceError.toExponential(3)}, stop=${stats.stopReason}`
);

function playTrainingGame(
  options: TrainingOptions,
  weights: Record<string, number>,
  stats: TrainingStats,
  thoughtFile: string
): GameTrainingResult {
  const skillCount = chooseSkillCount(options.skillHeavy);
  const config: Partial<GameConfig> = {
    skillMode: skillCount > 0 ? "small_intro" : "none",
    skillCount,
    firstTurnNoAttack: true,
    turnTimeLimitSeconds: 45,
    speedMode: "normal"
  };

  let state = createGame("AI 1", config);
  state.players[0]!.kind = "ai";

  for (let index = 2; index <= options.players; index += 1) {
    state = addPlayerToGame(state, createPlayer(`AI ${index}`, "ai"));
  }

  state = startGame(state);
  const roles = assignRoles(state.players);
  const decisions: DecisionSample[] = [];
  const maxTurns = 220;
  let safetySteps = 0;

  while (state.phase !== "finished" && state.turnNumber <= maxTurns && safetySteps < 2_500) {
    safetySteps += 1;

    if (state.phase === "action_window") {
      state = advanceActionWindow(state);
      continue;
    }

    if (state.phase !== "collecting_actions") {
      break;
    }

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
      if (!self || enemies.length === 0) {
        continue;
      }

      const role = roles.get(player.id) ?? ROLE_BY_ID.get(1)!;
      const action = chooseRoleAwareAction(state, self, enemies, role, weights);
      const keys = getTrainingFeatureKeys(state, self, enemies, action, role);
      decisions.push({
        playerId: player.id,
        roleId: role.id,
        keys,
        action,
        hpBefore: self.hp,
        cakesBefore: self.cakes,
        turnNumber: state.turnNumber,
        skillCount: self.skills.length
      });

      appendThought(
        buildDecisionThought(state, self, enemies, role, action),
        stats,
        options,
        thoughtFile
      );

      state = submitSafely(state, player.id, action);
    }
  }

  return { state, decisions, roles, skillCount };
}

function chooseRoleAwareAction(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  role: SecretRole,
  weights: Record<string, number>
): PlayerAction {
  const candidates = enumerateLegalAiActions(state, self, enemies).filter(
    (action) => !violatesRoleLimit(role, action)
  );
  const fallback: PlayerAction = { type: "gain_cake" };
  const legal = candidates.length > 0 ? candidates : [fallback];
  const scored = legal
    .map((action) => {
      const keys = getTrainingFeatureKeys(state, self, enemies, action, role);
      return {
        action,
        score:
          scoreAiAction(state, self, enemies, action) +
          roleObjectiveBonus(state, self, enemies, role, action) +
          learnedBonus(weights, keys)
      };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.action ?? fallback;
}

function roleObjectiveBonus(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  role: SecretRole,
  action: PlayerAction
): number {
  const damage = damagePotential(action, enemies.length);
  const target = targetForAction(state, enemies, action) ?? chooseBestTarget(enemies);
  const lethal = target ? damage >= target.hp : false;
  const pressure = enemies.filter((enemy) => enemy.cakes > 0).length;
  const lowHp = self.hp <= 2;
  const forcedAttack = FORCED_ATTACK_BY_ROLE[role.id];

  if (forcedAttack) {
    if (action.type === "attack" && action.attackId === forcedAttack) {
      return 360 + damage * 24 + (lethal ? 120 : 0);
    }

    const cost = BASE_ATTACKS[forcedAttack].cost;
    const canUse = self.cakes >= cost && !(state.config.firstTurnNoAttack && state.roundTurnNumber === 1);
    if (action.type === "gain_cake") {
      return self.cakes < cost ? 170 - self.cakes * 8 : -80;
    }
    if (action.type === "defense") {
      return lowHp || pressure >= 2 ? 95 : canUse ? -70 : 35;
    }
    return canUse ? -180 : 15;
  }

  switch (role.id) {
    case 1:
      if (action.type === "gain_cake") {
        return self.cakes < 3 ? 80 : self.cakes >= 7 ? -45 : 20;
      }
      if (action.type === "defense") {
        return lowHp ? 110 : pressure * 18;
      }
      return damage * 18 + (target ? (8 - target.hp) * 8 : 0) + (lethal ? 150 : 0);
    case 5:
      if (action.type === "defense") {
        return 210 + pressure * 35 + (lowHp ? 90 : 0);
      }
      if (action.type === "gain_cake") {
        return pressure === 0 ? 85 : lowHp ? -60 : 15;
      }
      return -95 + (lethal ? 45 : 0);
    case 6:
      if (action.type === "defense" && action.defense === "rebound") {
        return 290 + pressure * 45 + (self.hp <= 3 ? 55 : 0);
      }
      if (action.type === "gain_cake") {
        return self.cakes <= 0 ? 130 : 25;
      }
      if (action.type === "defense") {
        return pressure > 0 ? 65 : 10;
      }
      return -25 + (lethal ? 50 : 0);
    case 7:
      if (action.type === "attack" && action.attackId === "miao_sha") {
        return 620 + (lethal ? 220 : 0);
      }
      if (action.type === "gain_cake") {
        return 260 + Math.max(0, 14 - self.cakes) * 12;
      }
      if (action.type === "defense") {
        return lowHp || pressure >= 2 ? 140 : 35;
      }
      return -160 - actionCost(action, self) * 12;
    case 8:
      if (action.type === "gain_cake") {
        return self.cakes === 0 ? 25 : -80 - state.turnNumber * 2;
      }
      if (action.type === "defense") {
        return lowHp ? 45 : -70;
      }
      return 120 + damage * 25 + (lethal ? 180 : 0) - state.turnNumber * 2;
    default:
      return 0;
  }
}

function evaluateRoleRewards(
  state: GameState,
  decisions: DecisionSample[],
  roles: Map<PlayerId, SecretRole>
): Map<PlayerId, number> {
  const rewards = new Map<PlayerId, number>();
  const winners = new Set(resolveWinnerIds(state));
  const killCredits = estimateKillCredits(state.eventLog);

  for (const player of state.players) {
    const role = roles.get(player.id) ?? ROLE_BY_ID.get(1)!;
    const ownDecisions = decisions.filter((decision) => decision.playerId === player.id);
    const actionCounts = countActions(ownDecisions);
    const damageDone = sumDamage(state.eventLog, player.id, "done");
    const damageTaken = sumDamage(state.eventLog, player.id, "taken");
    const blocked = state.eventLog.filter(
      (event) => event.type === "attack_blocked" && event.targetId === player.id
    ).length;
    const reflected = state.eventLog.filter(
      (event) => event.type === "attack_reflected" && event.originalTargetId === player.id
    ).length;
    const kills = killCredits.get(player.id) ?? 0;
    const won = winners.has(player.id);
    const survived = player.status === "alive";
    const maxCake = maxCakeReached(state.eventLog, player);
    let reward = 0;

    switch (role.id) {
      case 1:
        reward += won ? 200 : 0;
        reward += survived ? 80 : -200;
        reward += kills * 40;
        reward += damageDone * 15;
        reward += resourceAdvantage(state, player) * 10;
        reward -= damageTaken >= player.hp + 6 ? 80 : 0;
        break;
      case 2:
        reward += actionCounts.nan_man * 60;
        reward += namedDamage(state.eventLog, player.id, "南蛮") * 20;
        reward += multiTargetTurns(state.eventLog, player.id, "南蛮") * 30;
        reward += namedKills(state.eventLog, player.id, "南蛮") * 80;
        reward += won ? 50 : 0;
        reward -= actionCounts.forbiddenBaseAttacks * 200;
        reward -= missedAttackOpportunities(ownDecisions, "nan_man") * 40;
        reward -= player.status === "dead" ? 80 : 0;
        break;
      case 3:
        reward += actionCounts.he_bao * 80;
        reward += namedDamage(state.eventLog, player.id, "核爆") * 25;
        reward += namedKills(state.eventLog, player.id, "核爆") * 100;
        reward += actionCounts.he_bao >= 2 ? 100 : 0;
        reward += won ? 50 : 0;
        reward -= actionCounts.forbiddenBaseAttacks * 200;
        reward -= missedAttackOpportunities(ownDecisions, "he_bao") * 50;
        reward -= player.status === "dead" && actionCounts.he_bao === 0 ? 100 : 0;
        break;
      case 4:
        reward += actionCounts.chao_he_bao * 150;
        reward += namedDamage(state.eventLog, player.id, "超核爆") * 30;
        reward += namedKills(state.eventLog, player.id, "超核爆") * 120;
        reward += multiTargetTurns(state.eventLog, player.id, "超核爆") * 80;
        reward += won ? 60 : 0;
        reward -= actionCounts.forbiddenBaseAttacks * 200;
        reward -= maxCake < 7 ? 40 : 0;
        reward -= player.status === "dead" && actionCounts.chao_he_bao === 0 ? 120 : 0;
        break;
      case 5:
        reward += Math.max(0, state.turnNumber - damageTaken) * 20;
        reward += blocked * 40;
        reward += damageTaken === 0 && state.turnNumber >= 5 ? 60 : 0;
        reward += survived ? 80 : -100;
        reward += won ? 40 : 0;
        reward -= damageTaken * 50;
        break;
      case 6:
        reward += reflected * 30;
        reward += reflected * 35;
        reward += reflected >= 2 ? 80 : 0;
        reward += won ? 50 : 0;
        reward -= reflected === 0 && state.turnNumber >= 8 ? 30 : 0;
        reward -= player.status === "dead" ? 100 : 0;
        break;
      case 7:
        reward += maxCake >= 14 ? 120 : 0;
        reward += actionCounts.miao_sha * 200;
        reward += namedKills(state.eventLog, player.id, "秒杀") * 150;
        reward += won ? 80 : 0;
        reward -= player.status === "dead" && maxCake < 14 ? 150 : 0;
        reward -= maxCake >= 14 && actionCounts.miao_sha === 0 ? 80 : 0;
        reward -= nonEmergencySpending(ownDecisions) * 10;
        break;
      case 8:
        reward += won ? 150 : 0;
        reward += won ? Math.max(0, 50 - state.turnNumber) * 10 : -state.turnNumber * 5;
        reward += kills * 60;
        reward += earlyDamage(state.eventLog, player.id) * 30;
        reward += damageDone * 8;
        reward -= player.status === "dead" ? 120 : 0;
        break;
    }

    rewards.set(player.id, reward);
  }

  return rewards;
}

function updateWeights(
  decisions: DecisionSample[],
  rewards: Map<PlayerId, number>,
  weights: Record<string, number>,
  options: TrainingOptions,
  stats: TrainingStats
): void {
  for (const decision of decisions) {
    const reward = rewards.get(decision.playerId) ?? 0;
    const target = Math.tanh(reward / 260);
    const prediction = predictValue(weights, decision.keys);
    const error = target - prediction;
    const skillMultiplier = decision.skillCount > 0 ? 1.35 : 1;
    const scale = options.learningRate * error * skillMultiplier / Math.sqrt(decision.keys.length);

    stats.windowAbsError += Math.abs(error);
    stats.windowSamples += 1;

    for (const key of decision.keys) {
      weights[key] = clampWeight((weights[key] ?? 0) + scale);
    }
  }
}

function checkpoint(
  initialPolicy: AiPolicyModel,
  weights: Record<string, number>,
  stats: TrainingStats,
  options: TrainingOptions
): void {
  if (stats.windowSamples > 0) {
    stats.convergenceError = stats.windowAbsError / stats.windowSamples;
    stats.checkpointErrors.push(stats.convergenceError);
    stats.windowAbsError = 0;
    stats.windowSamples = 0;
  }

  savePolicy(initialPolicy, weights, stats);
  writeReport(initialPolicy, weights, stats, options);
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
      "Self-play linear action policy. Positive weights mean the action feature correlated with long-run reward.",
      "This run used hidden-role self-play with Role 1 always present and Role 2-8 sampled per game.",
      `Last convergence error: ${stats.convergenceError.toExponential(6)}`,
      `Stop reason: ${stats.stopReason || "running"}`
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
  const reportFile = path.join(path.dirname(policyFile), "role-self-play-report.txt");
  const topPositive = topWeights(weights, "positive");
  const topNegative = topWeights(weights, "negative");
  const lines = [
    "《饼》隐藏 Role AI 自我对战训练报告",
    `本次训练局数：${stats.games}`,
    `其中带技能局：${stats.skillGames}`,
    `完成对局：${stats.finishedGames}`,
    `平均回合数：${(stats.turns / Math.max(1, stats.games)).toFixed(1)}`,
    `本次训练时长：${formatDuration(Date.now() - stats.startedAt)}`,
    `累计训练局数：${initialPolicy.games + stats.games}`,
    `累计带技能局：${initialPolicy.skillGames + stats.skillGames}`,
    `目标误差：${options.targetError}`,
    `当前收敛误差：${Number.isFinite(stats.convergenceError) ? stats.convergenceError.toExponential(6) : "Infinity"}`,
    `停止原因：${stats.stopReason || "训练中"}`,
    `思考 JSON 生成数：${stats.thoughtsGenerated}`,
    `思考 JSON 写入数：${stats.thoughtsWritten}`,
    "",
    "Role 表现：",
    ...ROLES.map((role) => {
      const item = stats.roleStats[role.id];
      const avgReward = item.games > 0 ? item.totalReward / item.games : 0;
      const winRate = item.games > 0 ? item.wins / item.games : 0;
      return `- Role ${role.id} ${role.name}: games=${item.games}, wins=${item.wins}, winRate=${winRate.toFixed(3)}, avgReward=${avgReward.toFixed(1)}`;
    }),
    "",
    "胜者分布：",
    ...Object.entries(stats.winners)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `- ${name}: ${count}`),
    "",
    "最近收敛误差：",
    ...stats.checkpointErrors.slice(-12).map((error, index) => `- ${index + 1}: ${error.toExponential(6)}`),
    "",
    "权重最高的策略特征：",
    ...topPositive.map(([key, value]) => `- ${key}: ${value.toFixed(3)}`),
    "",
    "权重最低的策略特征：",
    ...topNegative.map(([key, value]) => `- ${key}: ${value.toFixed(3)}`),
    "",
    `策略文件：${policyFile}`,
    `思考轨迹：${path.join(path.dirname(policyFile), "role-decision-trace.jsonl")}`
  ];

  fs.writeFileSync(reportFile, `${lines.join("\n")}\n`, "utf-8");
}

function assignRoles(players: PlayerState[]): Map<PlayerId, SecretRole> {
  const roles = new Map<PlayerId, SecretRole>();
  const roleOneIndex = Math.floor(Math.random() * players.length);

  players.forEach((player, index) => {
    const role = index === roleOneIndex ? ROLE_BY_ID.get(1)! : ROLES[Math.floor(Math.random() * ROLES.length)]!;
    roles.set(player.id, role);
  });

  return roles;
}

function getTrainingFeatureKeys(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  action: PlayerAction,
  role: SecretRole
): string[] {
  const keys = getActionFeatureKeys(state, self, enemies, action);
  const stage = state.turnNumber <= 5 ? "early" : state.turnNumber <= 16 ? "mid" : "late";
  const threat = chooseMainThreat(enemies);
  keys.push(`role:${role.id}`);
  keys.push(`role:${role.id}:stage:${stage}`);
  keys.push(`role:${role.id}:action:${actionKey(action)}`);
  keys.push(`role:${role.id}:hp:${bucket(self.hp)}`);
  keys.push(`role:${role.id}:cakes:${bucket(self.cakes)}`);
  if (threat) {
    keys.push(`role:${role.id}:threatCake:${bucket(threat.cakes)}`);
    keys.push(`role:${role.id}:threatHp:${bucket(threat.hp)}`);
  }
  if (violatesRoleLimit(role, action)) {
    keys.push(`role:${role.id}:violation`);
  }
  return keys;
}

function learnedBonus(weights: Record<string, number>, keys: string[]): number {
  return keys.reduce((sum, key) => sum + (weights[key] ?? 0), 0) * 0.85;
}

function predictValue(weights: Record<string, number>, keys: string[]): number {
  const raw = keys.reduce((sum, key) => sum + (weights[key] ?? 0), 0) / Math.sqrt(keys.length);
  return Math.tanh(raw);
}

function violatesRoleLimit(role: SecretRole, action: PlayerAction): boolean {
  const forcedAttack = FORCED_ATTACK_BY_ROLE[role.id];
  return Boolean(forcedAttack && action.type === "attack" && action.attackId !== forcedAttack);
}

function damagePotential(action: PlayerAction, enemyCount: number): number {
  if (action.type === "attack") {
    const stats = getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks);
    return stats.power * (stats.isArea ? Math.max(1, enemyCount) : 1);
  }

  if (action.type === "skill") {
    const stats = getSkillAttackStats(action.skillId, action.stacks);
    return stats ? stats.power * (stats.isArea ? Math.max(1, enemyCount) : 1) : 0;
  }

  return 0;
}

function actionCost(action: PlayerAction, self: PlayerState): number {
  if (action.type === "attack") {
    return getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks).cost;
  }
  if (action.type === "skill") {
    return getSkillAttackStats(action.skillId, action.stacks)?.cost ?? 0;
  }
  if (action.type === "defense" && action.defense === "rebound") {
    return self.cakes;
  }
  return 0;
}

function targetForAction(
  state: GameState,
  enemies: PlayerState[],
  action: PlayerAction
): PlayerState | undefined {
  const targetId = action.type === "attack" || action.type === "skill" ? action.targetId : undefined;
  if (!targetId) {
    return undefined;
  }
  return state.players.find((player) => player.id === targetId) ?? enemies.find((player) => player.id === targetId);
}

function chooseBestTarget(enemies: PlayerState[]): PlayerState | undefined {
  return [...enemies].sort((a, b) => a.hp - b.hp || b.cakes - a.cakes)[0];
}

function chooseMainThreat(enemies: PlayerState[]): PlayerState | undefined {
  return [...enemies].sort(
    (a, b) => b.cakes * 3 + (6 - b.hp) - (a.cakes * 3 + (6 - a.hp))
  )[0];
}

function buildDecisionThought(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  role: SecretRole,
  action: PlayerAction
): DecisionThought {
  const target = targetForAction(state, enemies, action) ?? chooseBestTarget(enemies);
  const threat = chooseMainThreat(enemies);
  const predictions = enemies.map((enemy) => predictRole(state, enemy));
  const helpsRole = roleObjectiveBonus(state, self, enemies, role, action) > 0;
  const danger =
    self.hp <= 2 || enemies.some((enemy) => enemy.cakes >= Math.max(3, self.hp))
      ? "high"
      : enemies.some((enemy) => enemy.cakes > 0)
        ? "medium"
        : "low";

  return {
    secret_role: {
      role_id: String(role.id),
      role_name: role.name,
      primary_goal: role.primaryGoal,
      role_progress: describeRoleProgress(role, self, state)
    },
    situation_analysis: {
      self_status: `hp=${self.hp}, cakes=${self.cakes}, skills=${self.skills.length}`,
      main_threats: threat ? `${threat.name}: hp=${threat.hp}, cakes=${threat.cakes}` : "none",
      best_target: target ? `${target.name}: hp=${target.hp}, cakes=${target.cakes}` : "none",
      resource_state: resourceSummary(self, enemies)
    },
    role_prediction: predictions,
    long_term_plan: {
      current_stage: state.turnNumber <= 5 ? "early" : state.turnNumber <= 16 ? "mid" : "late",
      next_goal: nextGoal(role, self),
      resource_plan: resourcePlan(role, self),
      kill_window: killWindow(self, enemies)
    },
    role_objective_check: {
      does_action_help_role_goal: helpsRole,
      does_action_violate_role_limit: violatesRoleLimit(role, action),
      expected_role_reward: expectedRewardText(role, action),
      reason: actionReason(role, action, target)
    },
    risk_assessment: {
      worst_case: worstCaseText(self, enemies, action),
      expected_value: helpsRole ? "positive for role reward and tempo" : "low value fallback",
      danger_level: danger
    },
    final_action: {
      action: actionLabel(action),
      target: target?.name ?? "all/self/none",
      reason: actionReason(role, action, target)
    }
  };
}

function appendThought(
  thought: DecisionThought,
  stats: TrainingStats,
  options: TrainingOptions,
  thoughtFile: string
): void {
  stats.thoughtsGenerated += 1;
  if (options.thoughtLogLimit >= 0 && stats.thoughtsWritten >= options.thoughtLogLimit) {
    return;
  }
  fs.appendFileSync(thoughtFile, `${JSON.stringify(thought)}\n`, "utf-8");
  stats.thoughtsWritten += 1;
}

function predictRole(state: GameState, player: PlayerState): RolePrediction {
  const actions = revealedActionsFor(state, player.id);
  const attacks = actions.filter((action) => action.type === "attack") as Array<
    Extract<PlayerAction, { type: "attack" }>
  >;
  const defenses = actions.filter((action) => action.type === "defense");
  const gains = actions.filter((action) => action.type === "gain_cake").length;

  if (attacks.some((action) => action.attackId === "nan_man")) {
    return prediction(player, 2, 0.78, "frequent or recent 南蛮 pressure");
  }
  if (attacks.some((action) => action.attackId === "he_bao")) {
    return prediction(player, 3, 0.74, "核爆 has been revealed");
  }
  if (attacks.some((action) => action.attackId === "chao_he_bao")) {
    return prediction(player, 4, 0.78, "超核爆 has been revealed");
  }
  if (attacks.some((action) => action.attackId === "miao_sha") || player.cakes >= 10) {
    return prediction(player, 7, 0.68, "large cake stockpile suggests 秒杀 setup");
  }
  if (defenses.some((action) => action.type === "defense" && action.defense === "rebound")) {
    return prediction(player, 6, 0.66, "rebound action exposed");
  }
  if (defenses.length >= Math.max(2, attacks.length + 1)) {
    return prediction(player, 5, 0.6, "defensive action pattern");
  }
  if (attacks.length >= 2 && state.turnNumber <= 8) {
    return prediction(player, 8, 0.62, "early offensive tempo");
  }
  if (gains >= 3 && attacks.length === 0) {
    return prediction(player, 7, 0.52, "resource accumulation without pressure");
  }
  return prediction(player, 1, 0.42, "balanced or insufficient evidence");
}

function prediction(player: PlayerState, roleId: RoleId, confidence: number, reason: string): RolePrediction {
  const role = ROLE_BY_ID.get(roleId)!;
  return {
    player: player.name,
    possible_role: `Role ${role.id} ${role.name}`,
    confidence,
    reason
  };
}

function revealedActionsFor(state: GameState, playerId: PlayerId): PlayerAction[] {
  const actions: PlayerAction[] = [];
  for (const event of state.eventLog) {
    if (event.type !== "turn_revealed") {
      continue;
    }
    const plan = event.actions[playerId];
    if (plan) {
      actions.push(...plan.actions);
    }
  }
  return actions;
}

function countActions(decisions: DecisionSample[]): Record<string, number> {
  const counts: Record<string, number> = {
    nan_man: 0,
    he_bao: 0,
    chao_he_bao: 0,
    miao_sha: 0,
    forbiddenBaseAttacks: 0
  };
  const roleId = decisions[0]?.roleId;
  const forced = roleId ? FORCED_ATTACK_BY_ROLE[roleId] : undefined;

  for (const decision of decisions) {
    const action = decision.action;
    if (action.type !== "attack") {
      continue;
    }
    counts[action.attackId] = (counts[action.attackId] ?? 0) + 1;
    if (forced && action.attackId !== forced) {
      counts.forbiddenBaseAttacks += 1;
    }
  }

  return counts;
}

function missedAttackOpportunities(decisions: DecisionSample[], attackId: AttackId): number {
  const cost = BASE_ATTACKS[attackId].cost;
  return decisions.filter(
    (decision) =>
      decision.cakesBefore >= cost &&
      !(decision.action.type === "attack" && decision.action.attackId === attackId)
  ).length;
}

function nonEmergencySpending(decisions: DecisionSample[]): number {
  return decisions.filter((decision) => {
    if (decision.hpBefore <= 2) {
      return false;
    }
    return actionCost(decision.action, {
      id: decision.playerId,
      name: "",
      kind: "ai",
      hp: decision.hpBefore,
      cakes: decision.cakesBefore,
      status: "alive",
      connected: true,
      skills: [],
      revealedSkillIds: [],
      buffs: []
    }) > 0;
  }).length;
}

function sumDamage(events: GameEvent[], playerId: PlayerId, direction: "done" | "taken"): number {
  return events
    .filter((event) => event.type === "damage")
    .filter((event) => (direction === "done" ? event.sourceId === playerId : event.targetId === playerId))
    .reduce((sum, event) => sum + event.amount, 0);
}

function namedDamage(events: GameEvent[], playerId: PlayerId, name: string): number {
  return events
    .filter(
      (event) =>
        event.type === "damage" &&
        event.sourceId === playerId &&
        (event.attackName ?? "").includes(name)
    )
    .reduce((sum, event) => sum + event.amount, 0);
}

function namedKills(events: GameEvent[], playerId: PlayerId, name: string): number {
  const credits = estimateKillCredits(events, name);
  return credits.get(playerId) ?? 0;
}

function multiTargetTurns(events: GameEvent[], playerId: PlayerId, name: string): number {
  const turns = new Map<number, Set<PlayerId>>();
  for (const event of events) {
    if (
      event.type === "damage" &&
      event.sourceId === playerId &&
      (event.attackName ?? "").includes(name)
    ) {
      const set = turns.get(event.turnNumber) ?? new Set<PlayerId>();
      set.add(event.targetId);
      turns.set(event.turnNumber, set);
    }
  }
  return [...turns.values()].filter((targets) => targets.size >= 2).length;
}

function earlyDamage(events: GameEvent[], playerId: PlayerId): number {
  return events
    .filter((event) => event.type === "damage" && event.sourceId === playerId && event.turnNumber <= 6)
    .reduce((sum, event) => sum + event.amount, 0);
}

function estimateKillCredits(events: GameEvent[], attackName?: string): Map<PlayerId, number> {
  const lastDamage = new Map<PlayerId, { sourceId: PlayerId; attackName?: string }>();
  const credits = new Map<PlayerId, number>();

  for (const event of events) {
    if (event.type === "damage" && event.sourceId) {
      lastDamage.set(event.targetId, {
        sourceId: event.sourceId,
        attackName: event.attackName
      });
    }
    if (event.type === "player_died") {
      const credit = lastDamage.get(event.playerId);
      if (credit && (!attackName || (credit.attackName ?? "").includes(attackName))) {
        credits.set(credit.sourceId, (credits.get(credit.sourceId) ?? 0) + 1);
      }
    }
  }

  return credits;
}

function maxCakeReached(events: GameEvent[], player: PlayerState): number {
  let maxCake = player.cakes;
  for (const event of events) {
    if (event.type === "cake_changed" && event.playerId === player.id) {
      maxCake = Math.max(maxCake, event.before, event.after);
    }
  }
  return maxCake;
}

function resourceAdvantage(state: GameState, player: PlayerState): number {
  const others = state.players.filter((item) => item.id !== player.id);
  const avg = others.reduce((sum, item) => sum + item.cakes, 0) / Math.max(1, others.length);
  return player.cakes - avg;
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

function recordStats(
  state: GameState,
  roles: Map<PlayerId, SecretRole>,
  rewards: Map<PlayerId, number>,
  stats: TrainingStats,
  skillCount: number
): void {
  stats.games += 1;
  stats.turns += state.turnNumber;
  if (skillCount > 0) {
    stats.skillGames += 1;
  }
  if (state.phase === "finished") {
    stats.finishedGames += 1;
  }

  const winners = new Set(resolveWinnerIds(state));
  for (const winnerId of winners) {
    const winner = state.players.find((player) => player.id === winnerId);
    const name = winner?.name ?? winnerId;
    stats.winners[name] = (stats.winners[name] ?? 0) + 1;
  }

  for (const player of state.players) {
    const role = roles.get(player.id) ?? ROLE_BY_ID.get(1)!;
    const item = stats.roleStats[role.id];
    item.games += 1;
    item.wins += winners.has(player.id) ? 1 : 0;
    item.totalReward += rewards.get(player.id) ?? 0;
  }
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

function chooseSkillCount(skillHeavy: boolean): number {
  const roll = Math.random();
  if (!skillHeavy) {
    return roll < 0.5 ? 0 : Math.ceil(Math.random() * 3);
  }

  if (roll < 0.08) {
    return 0;
  }
  if (roll < 0.34) {
    return 1;
  }
  if (roll < 0.68) {
    return 2;
  }
  return 3;
}

function createStats(): TrainingStats {
  return {
    games: 0,
    skillGames: 0,
    finishedGames: 0,
    turns: 0,
    winners: {},
    startedAt: Date.now(),
    convergenceError: Number.POSITIVE_INFINITY,
    checkpointErrors: [],
    windowAbsError: 0,
    windowSamples: 0,
    thoughtsGenerated: 0,
    thoughtsWritten: 0,
    stopReason: "",
    roleStats: Object.fromEntries(
      ROLES.map((role) => [role.id, { games: 0, wins: 0, totalReward: 0 }])
    ) as Record<RoleId, RoleStats>
  };
}

function describeRoleProgress(role: SecretRole, self: PlayerState, state: GameState): string {
  if (role.id === 7) {
    return `${self.cakes}/14 cakes toward 秒杀`;
  }
  if (role.id === 2) {
    return self.cakes >= 3 ? "南蛮 window available" : `${self.cakes}/3 cakes for 南蛮`;
  }
  if (role.id === 3) {
    return self.cakes >= 6 ? "核爆 window available" : `${self.cakes}/6 cakes for 核爆`;
  }
  if (role.id === 4) {
    return self.cakes >= 7 ? "超核爆 window available" : `${self.cakes}/7 cakes for 超核爆`;
  }
  if (role.id === 5) {
    return `damage avoidance at hp=${self.hp} through turn ${state.turnNumber}`;
  }
  if (role.id === 6) {
    return self.cakes > 0 ? "rebound is affordable" : "needs cake to threaten rebound";
  }
  if (role.id === 8) {
    return `tempo target: finish before turn ${Math.max(8, state.turnNumber + 4)}`;
  }
  return "maximize win probability with adaptive threat control";
}

function resourceSummary(self: PlayerState, enemies: PlayerState[]): string {
  const enemyMax = Math.max(0, ...enemies.map((enemy) => enemy.cakes));
  return `self cakes=${self.cakes}, enemy max cakes=${enemyMax}`;
}

function nextGoal(role: SecretRole, self: PlayerState): string {
  if (role.id === 7) {
    return self.cakes >= 14 ? "cast 秒杀 on key target" : "stockpile cakes while hiding intent";
  }
  if (role.id === 2) {
    return self.cakes >= 3 ? "use 南蛮" : "reach 3 cakes";
  }
  if (role.id === 3) {
    return self.cakes >= 6 ? "use 核爆" : "reach 6 cakes";
  }
  if (role.id === 4) {
    return self.cakes >= 7 ? "use 超核爆" : "survive to 7 cakes";
  }
  if (role.id === 5) {
    return "avoid damage this turn";
  }
  if (role.id === 6) {
    return "invite attack while holding rebound threat";
  }
  if (role.id === 8) {
    return "force damage or lethal pressure";
  }
  return "remove the highest expected-value threat";
}

function resourcePlan(role: SecretRole, self: PlayerState): string {
  if ([2, 3, 4, 7].includes(role.id)) {
    const target = role.id === 2 ? 3 : role.id === 3 ? 6 : role.id === 4 ? 7 : 14;
    return self.cakes < target ? `save to ${target}, spend only for survival` : "convert stored cakes into role payoff";
  }
  if (role.id === 6) {
    return "keep at least 1 cake for rebound";
  }
  return "balance defense reserve and attack tempo";
}

function killWindow(self: PlayerState, enemies: PlayerState[]): string {
  const target = chooseBestTarget(enemies);
  if (!target) {
    return "no target";
  }
  return self.cakes >= target.hp ? `possible pressure on ${target.name}` : "not yet lethal without stronger action";
}

function expectedRewardText(role: SecretRole, action: PlayerAction): string {
  if (role.id === 2 && action.type === "attack" && action.attackId === "nan_man") {
    return "+60 base plus damage rewards";
  }
  if (role.id === 3 && action.type === "attack" && action.attackId === "he_bao") {
    return "+80 base plus damage rewards";
  }
  if (role.id === 4 && action.type === "attack" && action.attackId === "chao_he_bao") {
    return "+150 base plus damage rewards";
  }
  if (role.id === 5 && action.type === "defense") {
    return "damage prevention and block rewards";
  }
  if (role.id === 6 && action.type === "defense" && action.defense === "rebound") {
    return "rebound setup reward";
  }
  if (role.id === 7 && action.type === "attack" && action.attackId === "miao_sha") {
    return "+200 秒杀 reward";
  }
  if (role.id === 8 && (action.type === "attack" || action.type === "skill")) {
    return "tempo and early damage rewards";
  }
  return "indirect reward through survival, resource, or setup";
}

function actionReason(role: SecretRole, action: PlayerAction, target: PlayerState | undefined): string {
  const targetText = target ? ` against ${target.name}` : "";
  if (violatesRoleLimit(role, action)) {
    return "rejected by role limit";
  }
  if (action.type === "gain_cake") {
    return "builds resource for future role payoff";
  }
  if (action.type === "defense") {
    return action.defense === "rebound"
      ? "creates a counter-damage threat"
      : "reduces immediate damage risk";
  }
  return `applies pressure${targetText} while matching current role incentives`;
}

function worstCaseText(self: PlayerState, enemies: PlayerState[], action: PlayerAction): string {
  const enemyMaxCake = Math.max(0, ...enemies.map((enemy) => enemy.cakes));
  if (action.type === "gain_cake" && enemyMaxCake >= self.hp) {
    return "resource gain could be punished by a stored burst";
  }
  if (action.type === "attack" || action.type === "skill") {
    return "target defends or rebounds while another enemy accumulates tempo";
  }
  return "defense mismatches incoming attack type";
}

function actionLabel(action: PlayerAction): string {
  return getActionPlanLabel({ actions: [action] });
}

function actionKey(action: PlayerAction): string {
  if (action.type === "attack") {
    return `attack:${action.attackId}:${action.stacks}`;
  }
  if (action.type === "skill") {
    return `skill:${action.skillId}:${action.stacks}`;
  }
  if (action.type === "defense") {
    return `defense:${action.defense}`;
  }
  return action.type;
}

function bucket(value: number): string {
  if (value <= 0) {
    return "0";
  }
  if (value <= 2) {
    return "1-2";
  }
  if (value <= 4) {
    return "3-4";
  }
  if (value <= 7) {
    return "5-7";
  }
  return "8+";
}

function topWeights(
  weights: Record<string, number>,
  direction: "positive" | "negative"
): Array<[string, number]> {
  return Object.entries(weights)
    .sort((a, b) => (direction === "positive" ? b[1] - a[1] : a[1] - b[1]))
    .slice(0, 14);
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
  const checkpointGames = Math.max(10, readNumber(args, "--checkpoint-games", 250));
  return {
    durationMinutes: readNumber(args, "--duration-minutes", 180),
    maxGames: readNumber(args, "--max-games", Number.MAX_SAFE_INTEGER),
    players: Math.max(2, Math.min(6, readNumber(args, "--players", 4))),
    skillHeavy: args.includes("--skill-heavy"),
    checkpointGames,
    learningRate: readNumber(args, "--learning-rate", 0.008),
    targetError: readNumber(args, "--target-error", 1e-2),
    minGames: Math.max(checkpointGames, readNumber(args, "--min-games", checkpointGames * 4)),
    thoughtLogLimit: readNumber(args, "--thought-log-limit", 2000)
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
