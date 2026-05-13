import {
  ActionSubmission,
  AttackAction,
  GameState,
  PlayerAction,
  PlayerActionPlan,
  PlayerId,
  SkillAction,
  ValidationResult
} from "../types";
import { BASE_ATTACKS, getStackedAttackStats } from "./attacks";
import { alivePlayers, findPlayer } from "./gameFactory";
import { getSkill, getSkillActionCost, getSkillPlay } from "../skills/registry";

export function validateAction(
  state: GameState,
  playerId: PlayerId,
  submission: ActionSubmission
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (player.status !== "alive") {
    return invalid("死亡玩家不能出招");
  }

  if (state.phase !== "collecting_actions") {
    return invalid("当前不能提交出招");
  }

  const plan = normalizeActionPlan(submission);
  return validateActionPlan(state, playerId, plan);
}

export function normalizeActionPlan(submission: ActionSubmission): PlayerActionPlan {
  if ("actions" in submission) {
    return {
      actions: submission.actions
    };
  }

  return {
    actions: [submission]
  };
}

function validateActionPlan(
  state: GameState,
  playerId: PlayerId,
  plan: PlayerActionPlan
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (plan.actions.length === 0) {
    return invalid("至少需要选择一个出招");
  }

  if (plan.actions.length > Math.max(1, alivePlayers(state).length - 1)) {
    return invalid("出招数量超过可选目标数量");
  }

  if (plan.actions.length > 1) {
    if (
      plan.actions.some(
        (action) => action.type !== "attack" && action.type !== "skill"
      )
    ) {
      return invalid("多招式模式下只能同时选择多个攻击或单体目标技能");
    }

    const targetIds = new Set<string>();
    for (const action of plan.actions) {
      if (action.type !== "attack" && action.type !== "skill") {
        continue;
      }

      const skillPlay = action.type === "skill" ? getSkillPlay(action.skillId) : undefined;
      if (action.type === "skill" && skillPlay?.targetMode !== "single") {
        return invalid("多目标出招里只能混合单体目标技能，全体、资源或自身技能需要单独使用");
      }

      const isArea =
        action.type === "attack"
          ? BASE_ATTACKS[action.attackId]?.isArea
          : skillPlay?.targetMode === "all";
      if (isArea) {
        return invalid("群攻招式必须单独使用");
      }

      if (!action.targetId) {
        return invalid("多招式攻击必须指定目标");
      }

      if (targetIds.has(action.targetId)) {
        return invalid("一回合里不能对同一个人做多个招式");
      }

      targetIds.add(action.targetId);
    }
  }

  let totalCost = 0;
  for (const action of plan.actions) {
    const validation = validateSingleAction(state, playerId, action);
    if (!validation.ok) {
      return validation;
    }

    if (action.type === "attack") {
      totalCost += getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks).cost;
      continue;
    }

    if (action.type === "skill") {
      totalCost += getEffectiveSkillActionCost(player, action);
    }
  }

  if (totalCost > player.cakes) {
    return invalid(`饼不足，需要 ${totalCost} 个饼`);
  }

  return valid();
}

function validateSingleAction(
  state: GameState,
  playerId: PlayerId,
  action: PlayerAction
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (action.type === "gain_cake") {
    return valid();
  }

  if (action.type === "defense") {
    if (action.defense !== "rebound") {
      return valid();
    }

    if (player.cakes <= 0) {
      return invalid("反弹必须拥有至少 1 个饼");
    }

    if (!action.targetId) {
      return invalid("反弹必须指定目标");
    }

    if (action.targetId === playerId) {
      return invalid("反弹目标不能是自己");
    }

    if (!isAliveTarget(state, action.targetId)) {
      return invalid("反弹目标不存在或已死亡");
    }

    return valid();
  }

  if (action.type === "attack") {
    return validateAttackAction(state, playerId, action);
  }

  return validateSkillAction(state, playerId, action);
}

function validateAttackAction(
  state: GameState,
  playerId: PlayerId,
  action: AttackAction
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (state.config.firstTurnNoAttack && state.turnNumber === 1) {
    return invalid("第一回合禁止攻击");
  }

  const definition = BASE_ATTACKS[action.attackId];
  if (!definition) {
    return invalid("未知攻击");
  }

  if (!Number.isInteger(action.stacks) || action.stacks <= 0 || action.stacks > 20) {
    return invalid("攻击重数必须是 1 到 20 的整数");
  }

  const stats = getStackedAttackStats(definition, action.stacks);
  if (player.cakes < stats.cost) {
    return invalid(`饼不足，需要 ${stats.cost} 个饼`);
  }

  if (!definition.isArea) {
    if (!action.targetId) {
      return invalid("单体攻击必须指定目标");
    }

    if (action.targetId === playerId) {
      return invalid("不能攻击自己");
    }

    if (!isAliveTarget(state, action.targetId)) {
      return invalid("攻击目标不存在或已死亡");
    }
  }

  return valid();
}

function validateSkillAction(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (!player.skills.includes(action.skillId)) {
    return invalid("你没有这个技能");
  }

  const skill = getSkill(action.skillId);
  const play = getSkillPlay(action.skillId);
  if (!skill || !play) {
    return invalid("这个技能当前是锁定技或被动技，不能主动施放");
  }

  if (skill.category === "control" && isGlobalSkillActive(state, "skill_8_89763")) {
    return invalid("禁锢生效中，控制技无效");
  }

  if (!Number.isInteger(action.stacks) || action.stacks <= 0 || action.stacks > 20) {
    return invalid("技能重数必须是 1 到 20 的整数");
  }

  if (action.stacks > play.maxStacks) {
    return invalid(`技能重数不能超过 ${play.maxStacks}`);
  }

  if (play.usesPerGame && getSkillUseCount(player, action.skillId) >= play.usesPerGame) {
    return invalid(`${skill.name} 已经达到本局使用次数上限`);
  }

  if (state.config.firstTurnNoAttack && state.turnNumber === 1) {
    return invalid("第一回合只能出饼或防御");
  }

  const cost = getEffectiveSkillActionCost(player, action);
  if (player.cakes < cost) {
    return invalid(`饼不足，需要 ${cost} 个饼`);
  }

  if (play.targetMode === "single") {
    if (!action.targetId) {
      return invalid("技能必须指定目标");
    }

    if (action.targetId === playerId) {
      return invalid("不能对自己施放这个技能");
    }

    if (!isAliveTarget(state, action.targetId)) {
      return invalid("技能目标不存在或已死亡");
    }
  }

  return valid();
}

function getSkillUseCount(player: { buffs: Array<{ id: string; stacks: number }> }, skillId: string): number {
  return player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
}

function getEffectiveSkillActionCost(player: { buffs: Array<{ id: string; stacks: number }> }, action: SkillAction): number {
  if (
    action.skillId === "skill_87_44771" &&
    action.stacks === 1 &&
    player.buffs.some((buff) => buff.id === "free_lian_bao" && buff.stacks > 0)
  ) {
    return 0;
  }

  return getSkillActionCost(action.skillId, action.stacks);
}

function isAliveTarget(state: GameState, playerId: PlayerId): boolean {
  return alivePlayers(state).some((player) => player.id === playerId);
}

function isGlobalSkillActive(state: GameState, skillId: string): boolean {
  const brokenByPoE = alivePlayers(state).some((player) => player.skills.includes("skill_9_93219"));
  if (brokenByPoE) {
    return false;
  }

  return alivePlayers(state).some((player) => player.skills.includes(skillId));
}

function valid(): ValidationResult {
  return { ok: true };
}

function invalid(error: string): ValidationResult {
  return { ok: false, error };
}
