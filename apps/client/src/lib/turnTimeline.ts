import {
  DEFEAT_LEVEL_LABELS,
  GameEvent,
  PublicGameState
} from "@bing/shared";
import { playerName } from "./format";

export interface Broadcast {
  reveal: Extract<GameEvent, { type: "turn_revealed" }>;
  events: GameEvent[];
}

export type BattleStepKind =
  | "damage"
  | "area"
  | "block"
  | "reflect"
  | "break"
  | "heal"
  | "clash"
  | "skill"
  | "defeat"
  | "system";

export type BattleBeat =
  | "reveal"
  | "impact"
  | "defense"
  | "reflect"
  | "skill"
  | "defeat"
  | "recovery"
  | "system";

export type BattleSoundCue =
  | "turn-reveal"
  | "hit"
  | "area-hit"
  | "block"
  | "reflect"
  | "break"
  | "heal"
  | "clash"
  | "skill"
  | "defeat"
  | "victory"
  | "system";

export interface BattleStep {
  id: string;
  kind: BattleStepKind;
  beat: BattleBeat;
  soundCue?: BattleSoundCue | undefined;
  sourceName: string;
  sourceAvatarUrl?: string | undefined;
  targetName: string;
  targetAvatarUrl?: string | undefined;
  label: string;
  description: string;
  amount?: number;
}

interface PlayerRef {
  name: string;
  avatarUrl?: string | undefined;
}

export const STEP_DURATION_MS = 900;
export const MAX_REPLAY_AGE_MS = 3500;
export const MAX_BATTLE_STEPS = 6;

const AREA_ATTACK_NAMES = new Set(["万箭齐发", "南蛮入侵"]);

export function findLatestBroadcast(events: GameEvent[]): Broadcast | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.type !== "turn_revealed") {
      continue;
    }

    return {
      reveal: event,
      events: events.slice(index + 1)
    };
  }

  return undefined;
}

export function buildBattleSteps(events: GameEvent[], state: PublicGameState): BattleStep[] {
  return events
    .map((event) => buildBattleStep(event, state))
    .filter((step): step is BattleStep => Boolean(step))
    .slice(0, MAX_BATTLE_STEPS);
}

function buildBattleStep(event: GameEvent, state: PublicGameState): BattleStep | null {
  if (event.type === "damage") {
    const attackName = event.attackName ?? "攻击";
    const source = playerRef(state, event.sourceId, "系统");
    const target = playerRef(state, event.targetId);
    const isArea = event.traits?.includes("area") || AREA_ATTACK_NAMES.has(attackName);
    const isSkill = event.traits?.includes("skill") ?? false;
    return {
      id: event.id,
      kind: isArea ? "area" : isSkill ? "skill" : "damage",
      beat: isSkill ? "skill" : "impact",
      soundCue: isArea ? "area-hit" : isSkill ? "skill" : "hit",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: target.name,
      targetAvatarUrl: target.avatarUrl,
      label: attackName,
      description: `${source.name} 命中 ${target.name}`,
      amount: event.amount
    };
  }

  if (event.type === "attack_blocked") {
    const source = playerRef(state, event.sourceId);
    const target = playerRef(state, event.targetId);
    return {
      id: event.id,
      kind: "block",
      beat: "defense",
      soundCue: "block",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: target.name,
      targetAvatarUrl: target.avatarUrl,
      label: event.attackName,
      description: `${target.name} 防住了 ${event.attackName}`
    };
  }

  if (event.type === "attack_reflected") {
    const source = playerRef(state, event.originalTargetId);
    const target = playerRef(state, event.reflectedTargetId);
    return {
      id: event.id,
      kind: "reflect",
      beat: "reflect",
      soundCue: "reflect",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: target.name,
      targetAvatarUrl: target.avatarUrl,
      label: event.attackName,
      description: `${source.name} 将 ${event.attackName} 反弹给 ${target.name}`
    };
  }

  if (event.type === "rebound_broken") {
    const source = playerRef(state, event.sourceId);
    const target = playerRef(state, event.targetId);
    return {
      id: event.id,
      kind: "break",
      beat: "impact",
      soundCue: "break",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: target.name,
      targetAvatarUrl: target.avatarUrl,
      label: event.attackName,
      description: `${event.attackName} 破弹，${target.name} 的反弹失效`
    };
  }

  if (event.type === "heal") {
    const source = playerRef(state, event.sourceId ?? event.targetId, "系统");
    const target = playerRef(state, event.targetId);
    return {
      id: event.id,
      kind: "heal",
      beat: "recovery",
      soundCue: "heal",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: target.name,
      targetAvatarUrl: target.avatarUrl,
      label: "回血",
      description: `${target.name} 回复生命`,
      amount: event.amount
    };
  }

  if (event.type === "clash") {
    const source = playerRef(state, event.attackerAId);
    const target = playerRef(state, event.attackerBId);
    return {
      id: event.id,
      kind: "clash",
      beat: "impact",
      soundCue: "clash",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: target.name,
      targetAvatarUrl: target.avatarUrl,
      label: "对撞",
      description: event.result
    };
  }

  if (event.type === "skill_used") {
    const source = playerRef(state, event.playerId);
    return {
      id: event.id,
      kind: "skill",
      beat: "skill",
      soundCue: "skill",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: "战场",
      label: event.skillName,
      description: `${source.name} 触发 ${event.skillName}（${event.reason}）`
    };
  }

  if (event.type === "skill_revealed") {
    const source = playerRef(state, event.playerId);
    return {
      id: event.id,
      kind: "skill",
      beat: "reveal",
      soundCue: "skill",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: "技能",
      label: event.skillName,
      description: `${source.name} 暴露了 ${event.skillName}（${event.reason}）`
    };
  }

  if (event.type === "action_switched") {
    const source = playerRef(state, event.playerId);
    return {
      id: event.id,
      kind: "skill",
      beat: "skill",
      soundCue: "skill",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: "出招",
      label: event.skillName,
      description: `${source.name} 使用 ${event.skillName} 改写出招`
    };
  }

  if (event.type === "player_died") {
    const source = playerRef(state, event.sourceId, "结算");
    const target = playerRef(state, event.playerId);
    const defeatLabel = DEFEAT_LEVEL_LABELS[event.defeatLevel ?? 1];
    return {
      id: event.id,
      kind: "defeat",
      beat: "defeat",
      soundCue: "defeat",
      sourceName: source.name,
      sourceAvatarUrl: source.avatarUrl,
      targetName: target.name,
      targetAvatarUrl: target.avatarUrl,
      label: defeatLabel,
      description: event.reason ? `${target.name} ${defeatLabel}（${event.reason}）` : `${target.name} ${defeatLabel}`
    };
  }

  if (event.type === "game_finished") {
    const winners = event.winnerIds.map((id) => playerName(state, id));
    return {
      id: event.id,
      kind: "system",
      beat: "system",
      soundCue: "victory",
      sourceName: "游戏结束",
      targetName: winners.length > 0 ? winners.join("、") : "无人生还",
      label: winners.length > 0 ? "胜利" : "终局",
      description: winners.length > 0 ? `胜者：${winners.join("、")}` : "游戏结束，无人生还"
    };
  }

  if (event.type === "round_ended") {
    return {
      id: event.id,
      kind: "system",
      beat: "system",
      soundCue: "system",
      sourceName: "回合结算",
      targetName: "下一轮",
      label: "轮次结束",
      description: event.reason
    };
  }

  if (event.type === "system") {
    const isReflectLoop = event.message.includes("反弹形成环");
    return {
      id: event.id,
      kind: isReflectLoop ? "reflect" : "system",
      beat: isReflectLoop ? "reflect" : "system",
      soundCue: isReflectLoop ? "reflect" : "system",
      sourceName: isReflectLoop ? "反弹路径" : "系统",
      targetName: isReflectLoop ? "无人受伤" : "记录",
      label: isReflectLoop ? "反弹环" : "结算",
      description: event.message
    };
  }

  return null;
}

function playerRef(
  state: PublicGameState,
  playerId: string | undefined,
  fallback = "未知玩家"
): PlayerRef {
  if (!playerId) {
    return { name: fallback };
  }

  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    return { name: playerName(state, playerId) };
  }

  return {
    name: player.name,
    avatarUrl: player.avatarUrl
  };
}
