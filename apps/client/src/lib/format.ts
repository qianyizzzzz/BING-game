import {
  DEFEAT_LEVEL_LABELS,
  DEFENSE_LABELS,
  GameEvent,
  INFINITE_DAMAGE,
  PlayerActionPlan,
  PublicGameState,
  getActionLabel,
  getActionPlanLabel
} from "@bing/shared";

export function formatDamage(amount: number): string {
  return amount >= INFINITE_DAMAGE ? "∞" : String(amount);
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
      return `${playerName(state, event.playerId)} 暴露了 ${event.skillName}（${event.reason}）`;
    case "skill_used":
      return `${playerName(state, event.playerId)} 触发 ${event.skillName}（${event.reason}）`;
    case "system":
      return event.message;
    case "action_submitted":
      return `${playerName(state, event.playerId)} 已提交出招`;
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
      return `${playerName(state, event.targetId)} 受到 ${formatDamage(event.amount)} 点伤害${event.attackName ? `（${event.attackName}）` : ""}`;
    case "heal":
      return `${playerName(state, event.targetId)} 回复 ${event.amount} 血（${event.reason}）`;
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
