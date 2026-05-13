import {
  ATTACK_ORDER,
  BASE_ATTACKS,
  GameState,
  PlayerAction,
  PlayerId,
  PlayerState,
  alivePlayers,
  getSkillAttackStats,
  getSkillPlay,
  getStackedAttackStats
} from "@bing/shared";
import { getPolicyBonus } from "./aiPolicy";

export function chooseAiAction(state: GameState, playerId: PlayerId): PlayerAction {
  const self = state.players.find((player) => player.id === playerId);
  const enemies = alivePlayers(state).filter((player) => player.id !== playerId);
  const target = enemies[0];

  if (!self || !target) {
    return { type: "gain_cake" };
  }

  if (state.config.firstTurnNoAttack && state.turnNumber === 1) {
    return { type: "gain_cake" };
  }

  const candidates = enumerateLegalAiActions(state, self, enemies);
  const scored = candidates
    .map((action) => ({
      action,
      score: scoreAction(state, self, enemies, action)
    }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { type: "gain_cake" };
  }

  const top = scored.slice(0, Math.min(3, scored.length));
  const totalWeight = top.reduce((sum, item) => sum + Math.max(1, item.score), 0);
  let roll = Math.random() * totalWeight;
  for (const item of top) {
    roll -= Math.max(1, item.score);
    if (roll <= 0) {
      return item.action;
    }
  }

  return scored[0]!.action;
}

function enumerateLegalAiActions(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[]
): PlayerAction[] {
  const actions: PlayerAction[] = [{ type: "gain_cake" }];

  actions.push(
    { type: "defense", defense: "small" },
    { type: "defense", defense: "youtiao" },
    { type: "defense", defense: "stone" }
  );

  if (self.cakes > 0 && enemies[0]) {
    actions.push({
      type: "defense",
      defense: "rebound",
      targetId: chooseWeakestEnemy(enemies).id
    });
  }

  if (!(state.config.firstTurnNoAttack && state.turnNumber === 1)) {
    for (const skillId of self.skills) {
      const play = getSkillPlay(skillId);
      if (!play) {
        continue;
      }

      const maxStacks = Math.min(
        3,
        play.maxStacks,
        play.cost > 0 ? Math.floor(self.cakes / play.cost) : 1
      );
      for (let stacks = 1; stacks <= maxStacks; stacks += 1) {
        if (play.kind === "resource" && self.cakes >= stacks) {
          actions.push({ type: "skill", skillId, stacks });
          continue;
        }

        if (play.kind !== "attack") {
          continue;
        }

        if (play.targetMode === "all") {
          actions.push({ type: "skill", skillId, stacks });
          continue;
        }

        for (const enemy of enemies) {
          actions.push({
            type: "skill",
            skillId,
            stacks,
            targetId: enemy.id
          });
        }
      }
    }

    for (const attackId of ATTACK_ORDER) {
      const definition = BASE_ATTACKS[attackId];
      const maxStacks = Math.min(3, Math.floor(self.cakes / definition.cost));
      for (let stacks = 1; stacks <= maxStacks; stacks += 1) {
        if (definition.isArea) {
          actions.push({ type: "attack", attackId, stacks });
          continue;
        }

        for (const enemy of enemies) {
          actions.push({
            type: "attack",
            attackId,
            stacks,
            targetId: enemy.id
          });
        }
      }
    }
  }

  return actions;
}

function scoreAction(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  action: PlayerAction
): number {
  const trainedBonus = getPolicyBonus(state, self, enemies, action);

  if (action.type === "gain_cake") {
    const attackPressure = enemies.some((enemy) => enemy.cakes > 0);
    const wantBigMove = self.cakes < 3 || enemies.every((enemy) => enemy.cakes === 0);
    return 32 + (wantBigMove ? 22 : 0) - (attackPressure ? 10 : 0) + trainedBonus;
  }

  if (action.type === "defense") {
    const likelyIncoming = enemies.filter((enemy) => enemy.cakes > 0).length;
    const lowHpBonus = self.hp <= 2 ? 24 : 0;
    if (action.defense === "rebound") {
      return 42 + likelyIncoming * 15 + lowHpBonus + Math.min(18, self.cakes * 3) + trainedBonus;
    }

    return 18 + likelyIncoming * 9 + lowHpBonus + defenseMatchBonus(enemies, action.defense) + trainedBonus;
  }

  if (action.type === "skill") {
    const play = getSkillPlay(action.skillId);
    if (!play) {
      return trainedBonus;
    }

    if (play.kind === "resource") {
      const gain = (play.resourceGainPerStack ?? 0) * action.stacks;
      const pressurePenalty = enemies.some((enemy) => enemy.cakes >= 2) ? 12 : 0;
      return 26 + gain * 7 + (self.cakes <= 2 ? 12 : 0) - pressurePenalty + trainedBonus;
    }

    const stats = getSkillAttackStats(action.skillId, action.stacks);
    if (!stats) {
      return trainedBonus;
    }

    const target = action.targetId
      ? state.players.find((player) => player.id === action.targetId)
      : chooseWeakestEnemy(enemies);
    const killBonus = target && stats.power > target.hp ? 86 : 0;
    const pressureBonus = target ? Math.max(0, 8 - target.hp) * 4 : 0;
    const areaBonus = stats.isArea ? Math.max(0, enemies.length - 1) * 14 : 0;
    const efficiency = stats.power / Math.max(1, stats.cost);

    return (
      28 +
      stats.power * 6 +
      stats.level * 2 +
      efficiency * 10 +
      killBonus +
      pressureBonus +
      areaBonus +
      trainedBonus
    );
  }

  if (action.type !== "attack") {
    return trainedBonus;
  }

  const definition = BASE_ATTACKS[action.attackId];
  const stats = getStackedAttackStats(definition, action.stacks);
  const target = action.targetId
    ? state.players.find((player) => player.id === action.targetId)
    : chooseWeakestEnemy(enemies);
  const killBonus = target && stats.power > target.hp ? 90 : 0;
  const pressureBonus = target ? Math.max(0, 8 - target.hp) * 4 : 0;
  const areaBonus = definition.isArea ? Math.max(0, enemies.length - 1) * 14 : 0;
  const efficiency = stats.power / Math.max(1, stats.cost);
  const overSpendPenalty = self.cakes - stats.cost <= 0 && self.hp <= 2 ? 22 : 0;
  const qinRiskPenalty = action.attackId === "qin" && enemies.some((enemy) => enemy.cakes > 0) ? 12 : 0;
  const unblockableBonus = definition.defenseTag === "unblockable" ? 80 : 0;
  const firstStrikeTempo = state.roundTurnNumber <= 3 ? 8 : 0;

  return (
    24 +
    stats.power * 5 +
    stats.level * 2 +
    efficiency * 11 +
    killBonus +
    pressureBonus +
    areaBonus +
    unblockableBonus +
    firstStrikeTempo -
    overSpendPenalty -
    qinRiskPenalty +
    trainedBonus
  );
}

function chooseWeakestEnemy(enemies: PlayerState[]): PlayerState {
  return [...enemies].sort((a, b) => a.hp - b.hp || b.cakes - a.cakes)[0]!;
}

function defenseMatchBonus(
  enemies: PlayerState[],
  defense: "small" | "youtiao" | "stone"
): number {
  const enemyMaxCake = Math.max(0, ...enemies.map((enemy) => enemy.cakes));
  if (enemyMaxCake <= 1 && defense === "small") {
    return 14;
  }

  if (enemyMaxCake >= 2 && enemyMaxCake <= 4 && defense === "youtiao") {
    return 12;
  }

  if (enemyMaxCake >= 5 && defense === "stone") {
    return 12;
  }

  return 0;
}
