import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE_ATTACKS,
  GameState,
  PlayerAction,
  PlayerState,
  getStackedAttackStats
} from "@bing/shared";

export interface AiPolicyModel {
  version: 1;
  trainedAt: string;
  games: number;
  skillGames: number;
  durationMs: number;
  weights: Record<string, number>;
  notes: string[];
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPolicyPath = path.resolve(moduleDir, "../../../data/ai/ai-policy.json");
const policyPath = path.resolve(process.env.AI_POLICY_PATH ?? defaultPolicyPath);
let cachedPolicy: AiPolicyModel | undefined;
let cachedMtime = 0;

export function getAiPolicyPath(): string {
  return policyPath;
}

export function createEmptyAiPolicy(): AiPolicyModel {
  return {
    version: 1,
    trainedAt: new Date(0).toISOString(),
    games: 0,
    skillGames: 0,
    durationMs: 0,
    weights: {},
    notes: []
  };
}

export function loadAiPolicy(): AiPolicyModel | undefined {
  if (!fs.existsSync(policyPath)) {
    cachedPolicy = undefined;
    cachedMtime = 0;
    return undefined;
  }

  const stat = fs.statSync(policyPath);
  if (cachedPolicy && stat.mtimeMs === cachedMtime) {
    return cachedPolicy;
  }

  try {
    cachedPolicy = JSON.parse(fs.readFileSync(policyPath, "utf-8")) as AiPolicyModel;
    cachedMtime = stat.mtimeMs;
    return cachedPolicy;
  } catch {
    cachedPolicy = undefined;
    cachedMtime = 0;
    return undefined;
  }
}

export function writeAiPolicy(model: AiPolicyModel): void {
  fs.mkdirSync(path.dirname(policyPath), { recursive: true });
  fs.writeFileSync(policyPath, `${JSON.stringify(model, null, 2)}\n`, "utf-8");
  cachedPolicy = model;
  cachedMtime = fs.statSync(policyPath).mtimeMs;
}

export function getPolicyBonus(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  action: PlayerAction
): number {
  const model = loadAiPolicy();
  if (!model) {
    return 0;
  }

  const keys = getActionFeatureKeys(state, self, enemies, action);
  return keys.reduce((sum, key) => sum + (model.weights[key] ?? 0), 0);
}

export function getActionFeatureKeys(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  action: PlayerAction
): string[] {
  const keys = [
    `phase:roundTurn:${Math.min(5, state.roundTurnNumber)}`,
    `hp:self:${bucket(self.hp)}`,
    `cakes:self:${bucket(self.cakes)}`,
    `skillCount:self:${Math.min(3, self.skills.length)}`,
    `config:skillCount:${Math.min(3, state.config.skillCount)}`,
    `action:${action.type}`
  ];

  for (const skillId of self.skills) {
    keys.push(`skill:${skillId}`);
  }

  if (enemies.some((enemy) => enemy.cakes > 0)) {
    keys.push("enemy:has_cakes");
  }

  if (enemies.some((enemy) => enemy.hp <= 2)) {
    keys.push("enemy:low_hp");
  }

  if (action.type === "gain_cake") {
    keys.push(self.cakes === 0 ? "gain:first_cake" : "gain:stockpile");
    if (enemies.every((enemy) => enemy.cakes === 0)) {
      keys.push("gain:safe_table");
    }
    return keys;
  }

  if (action.type === "defense") {
    keys.push(`defense:${action.defense}`);
    if (action.defense === "rebound") {
      keys.push(self.hp <= 2 ? "rebound:low_hp" : "rebound:normal_hp");
      keys.push(`rebound:cakes:${bucket(self.cakes)}`);
    }
    return keys;
  }

  if (action.type === "attack") {
    const attack = BASE_ATTACKS[action.attackId];
    const stats = getStackedAttackStats(attack, action.stacks);
    const target = action.targetId
      ? enemies.find((enemy) => enemy.id === action.targetId)
      : weakestEnemy(enemies);

    keys.push(`attack:${action.attackId}`);
    keys.push(`attack:defenseTag:${attack.defenseTag}`);
    keys.push(`attack:cost:${bucket(stats.cost)}`);
    keys.push(`attack:level:${bucket(stats.level)}`);
    keys.push(`attack:stacks:${Math.min(5, action.stacks)}`);

    if (attack.isArea) {
      keys.push("attack:area");
    }

    if (target) {
      keys.push(`target:hp:${bucket(target.hp)}`);
      if (target.id === weakestEnemy(enemies)?.id) {
        keys.push("target:weakest");
      }
      if (stats.power > target.hp) {
        keys.push("attack:lethal");
      }
    }

    for (const skillId of self.skills) {
      keys.push(`skillAttack:${skillId}:${action.attackId}`);
    }
  }

  if (action.type === "skill") {
    keys.push(`skillAction:${action.skillId}`);
    keys.push(`skillAction:stacks:${Math.min(5, action.stacks)}`);
  }

  return keys;
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

function weakestEnemy(enemies: PlayerState[]): PlayerState | undefined {
  return [...enemies].sort((a, b) => a.hp - b.hp || b.cakes - a.cakes)[0];
}
