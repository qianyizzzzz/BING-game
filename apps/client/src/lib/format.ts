import {
  DEFEAT_LEVEL_LABELS,
  DEFENSE_LABELS,
  GameEvent,
  INFINITE_DAMAGE,
  PlayerActionPlan,
  PublicGameState,
  formatCombatValue,
  getActionLabel,
  getActionPlanLabel
} from "@bing/shared";
import type { AttackStats, CombatValue } from "@bing/shared";
import { getSkillCakeCostKind, getSkillPlay, getVortexCostOverride, PlayerState, RETIRE_EFFECT_POWER,
  VANISH_EFFECT_POWER, EXECUTE_EFFECT_POWER, EXPLODE_EFFECT_POWER } from "@bing/shared";

export function formatAttackStatNumber(value: number, exact?: CombatValue): string {
  if (exact) return formatCombatValue(exact);
  const sign = value < 0 ? "-" : "";
  const amount = Math.abs(value);
  if (amount >= EXPLODE_EFFECT_POWER) return `${sign}爆炸`;
  if (amount >= EXECUTE_EFFECT_POWER) return `${sign}必杀`;
  if (amount >= VANISH_EFFECT_POWER) return `${sign}消失`;
  if (amount >= RETIRE_EFFECT_POWER) return `${sign}退游`;
  return amount >= INFINITE_DAMAGE ? `${sign}∞` : String(value);
}

export function formatSkillCakeCost(skillId: string | undefined, actualCost?: number, player?: PlayerState, stacks = 1): string {
  if (!skillId) return "—";
  const pricing = getSkillPlay(skillId)?.elementCost;
  if (pricing) return `${pricing.perStack * stacks}${pricing.element}`;
  const kind = getSkillCakeCostKind(skillId, player);
  if (kind === "none") return "无耗饼";
  if (actualCost === undefined && kind === "dynamic") return "按效果计算耗饼";
  const vortexCost = player ? getVortexCostOverride(player, skillId) : undefined;
  return `${actualCost ?? (vortexCost === undefined ? getSkillPlay(skillId)?.cost ?? 0 : vortexCost * stacks)}饼`;
}

export function formatDamage(amount: number, exact?: CombatValue): string {
  if (exact) return formatCombatValue(exact);
  return amount >= INFINITE_DAMAGE ? "∞" : String(amount);
}

export function formatAttackDamageParts(stats: AttackStats): string {
  return stats.damageParts?.map((power, index) => formatAttackStatNumber(power, stats.damagePartValues?.[index])).join("+") ??
    formatAttackStatNumber(stats.power, stats.powerValue);
}

export function formatStatusDuration(buff: PlayerState["buffs"][number]): string {
  return buff.infinite ? "无限" : `${buff.stacks} ${buff.expiresAtRound === undefined ? "回合" : "轮"}`;
}

export function playerName(state: PublicGameState, playerId: string | undefined): string {
  if (!playerId) {
    return "系统";
  }

  return state.players.find((player) => player.id === playerId)?.name ?? "未知玩家";
}

export function formatActionPlan(plan: PlayerActionPlan): string {
  return getActionPlanLabel(plan);
}

export function formatEvent(event: GameEvent, state: PublicGameState): string {
  switch (event.type) {
    case "game_created":
      return "房间已创建";
    case "player_joined":
      return `${event.name} 加入房间`;
    case "player_renamed":
      return `${playerName(state, event.playerId)} 改名为 ${event.name}`;
    case "player_left":
      return `${event.name} 退出房间`;
    case "player_kicked":
      return `${event.name} 被房主移出房间`;
    case "settings_updated":
      return "房主更新了房间设置";
    case "skill_revealed":
      return `${playerName(state, event.playerId)} 亮出了 ${event.skillName}（${event.reason}）`;
    case "skill_used":
      return `${playerName(state, event.playerId)} 的 ${event.skillName} 生效（${event.reason}）`;
    case "system":
      return event.message;
    case "action_submitted":
      return `${playerName(state, event.playerId)} 已锁定出牌`;
    case "action_cancelled":
      return `${playerName(state, event.playerId)}：${event.reason}`;
    case "action_switched":
      return `${playerName(state, event.playerId)} 使用 ${event.skillName} 将 ${getActionLabel(event.before)} 切换为 ${getActionLabel(event.after)}，消耗 ${event.cost} 饼`;
    case "turn_revealed": {
      const parts = Object.entries(event.actions).map(
        ([id, plan]) => `${playerName(state, id)}：${formatActionPlan(plan)}`
      );
      return `亮招：${parts.join("，")}`;
    }
    case "cake_changed":
      return `${playerName(state, event.playerId)} 饼 ${formatCake(event.before)} -> ${formatCake(event.after)}（${event.reason}）`;
    case "attack_blocked":
      if (event.blockKind === "dodge") {
        return `${playerName(state, event.targetId)} 的闪现回避了${playerName(state, event.sourceId)}的攻击`;
      }
      if (event.blockKind === "reduce") {
        return `${playerName(state, event.targetId)}的防御值减免了${playerName(state, event.sourceId)}的伤害`;
      }
      if (event.blockKind === "invulnerable") {
        return `${playerName(state, event.targetId)}的无敌抵挡了${playerName(state, event.sourceId)}的攻击`;
      }
      if (event.blockKind === "shield") {
        return `${playerName(state, event.targetId)}的${event.protectionName ?? "抵挡"}抵挡了${playerName(state, event.sourceId)}的攻击`;
      }
      if (event.blockKind === "immune") {
        return `${playerName(state, event.targetId)}免疫了${playerName(state, event.sourceId)}的伤害`;
      }
      return `${playerName(state, event.targetId)} 防住了 ${playerName(state, event.sourceId)} 的 ${event.attackName}${event.defense ? `（${event.defense === "gain_cake" ? "饼" : DEFENSE_LABELS[event.defense]}）` : ""}`;
    case "attack_reflected":
      return `${playerName(state, event.originalTargetId)} 将 ${event.attackName} 反弹给 ${playerName(state, event.reflectedTargetId)}`;
    case "rebound_broken":
      return `${event.attackName} 破弹，${playerName(state, event.targetId)} 的反弹失效`;
    case "clash":
      return event.result;
    case "damage":
      if (event.infiniteCopies) return `${playerName(state, event.targetId)} 受到来自 ${playerName(state, event.sourceId)} 的无限份${event.attackName ?? "攻击"}，每份 ${formatDamage(event.perCopyAmount ?? 0, event.perCopyAmountValue)} 点${event.internalDamage ? "反噬伤害" : "伤害"}`;
      return `${playerName(state, event.targetId)} 受到 ${event.pointDefeatLevel ? DEFEAT_LEVEL_LABELS[event.pointDefeatLevel] : formatDamage(event.amount, event.amountValue)} 点${event.internalDamage ? "反噬伤害" : "伤害"}${event.attackName ? `（${event.attackName}）` : ""}${event.sourceId && !event.internalDamage ? `，来源：${playerName(state, event.sourceId)}` : ""}`;
    case "heal":
      if (event.recoveryKind === "conversion") return `${playerName(state, event.targetId)} 血量转换增加 ${event.amount}（${event.reason}）`;
      if (event.recoveryKind === "full_restore") return `${playerName(state, event.targetId)} 恢复满血（${event.reason}）`;
      if (event.recoveryKind === "revival") return `${playerName(state, event.targetId)} 通过${event.reason}复活`;
      if (event.recoveryKind === "reentry") return `${playerName(state, event.targetId)} 通过${event.reason}进入游戏`;
      if (event.recoveryKind === "reappearance") return `${playerName(state, event.targetId)} 通过${event.reason}重新出现`;
      if (event.originalTargetId) return `${playerName(state, event.targetId)} 回复 ${event.amountValue ? formatCombatValue(event.amountValue) : event.infinite ? "∞" : event.amount} 血（${event.reason}，原定给予 ${playerName(state, event.originalTargetId)}）`;
      return `${playerName(state, event.targetId)} 回复 ${event.amountValue ? formatCombatValue(event.amountValue) : event.infinite ? "∞" : event.amount} 血（${event.reason}）`;
    case "round_ended":
      return `本轮结束：${event.reason}`;
    case "player_died":
      return `${playerName(state, event.playerId)} ${DEFEAT_LEVEL_LABELS[event.defeatLevel ?? 1]}`;
    case "game_finished":
      return event.winnerIds.length
        ? `游戏结束，胜者：${event.winnerIds.map((id) => playerName(state, id)).join("、")}`
        : "游戏结束，无人生还";
    default:
      return "事件";
  }
}

function formatCake(value: number): string {
  return value < 0 ? "?" : String(value);
}
