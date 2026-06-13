import {
  GameEvent,
  PlayerId,
  PlayerAction,
  PlayerActionPlan,
  PublicGameState,
  BASE_ATTACKS,
  DEFEAT_LEVEL_LABELS,
  getActionPlanLabel,
  getSkill
} from "@bing/shared";

export type CharacterAnimationState =
  | "idle"
  | "clap"
  | "attack"
  | "skill"
  | "defend"
  | "hurt"
  | "win"
  | "lose";

export type SkillEffectType =
  | "burst"
  | "beam"
  | "shield"
  | "heal"
  | "damage"
  | "flame"
  | "frost"
  | "storm"
  | "curse";
export type SkillEffectTargetType = "self" | "single" | "all";

export interface SkillEffectConfig {
  type: SkillEffectType;
  color: string;
  duration: number;
  targetType: SkillEffectTargetType;
}

export interface SeatFeedback {
  animation: CharacterAnimationState;
  animationKey: string;
  label?: string;
  tone?: "good" | "danger" | "skill" | "defense" | "neutral";
}

export interface TableEffect extends SkillEffectConfig {
  id: string;
  sourceId?: PlayerId | undefined;
  targetIds: PlayerId[];
  label?: string | undefined;
}

export const DEFAULT_SKILL_EFFECT: SkillEffectConfig = {
  type: "burst",
  color: "#14b8a6",
  duration: 1400,
  targetType: "single"
};

export const SKILL_EFFECT_PRESETS: Record<SkillEffectType, SkillEffectConfig> = {
  burst: {
    type: "burst",
    color: "#14b8a6",
    duration: 1400,
    targetType: "single"
  },
  beam: {
    type: "beam",
    color: "#0ea5e9",
    duration: 1450,
    targetType: "single"
  },
  shield: {
    type: "shield",
    color: "#3b82f6",
    duration: 1300,
    targetType: "self"
  },
  heal: {
    type: "heal",
    color: "#22c55e",
    duration: 1500,
    targetType: "self"
  },
  damage: {
    type: "damage",
    color: "#ef4444",
    duration: 1500,
    targetType: "single"
  },
  flame: {
    type: "flame",
    color: "#f97316",
    duration: 1750,
    targetType: "single"
  },
  frost: {
    type: "frost",
    color: "#7dd3fc",
    duration: 1750,
    targetType: "single"
  },
  storm: {
    type: "storm",
    color: "#facc15",
    duration: 1650,
    targetType: "single"
  },
  curse: {
    type: "curse",
    color: "#c084fc",
    duration: 1850,
    targetType: "single"
  }
};

const EFFECT_MAX_AGE_MS = 12_000;

export function buildSeatFeedbackMap(state: PublicGameState): Record<PlayerId, SeatFeedback> {
  const feedback: Record<PlayerId, SeatFeedback> = {};
  const latestFinished = findLatestEvent(state.eventLog, "game_finished");

  for (const player of state.players) {
    feedback[player.id] = {
      animation: "idle",
      animationKey: `idle-${player.id}`,
      tone: "neutral"
    };

    if (state.phase === "finished") {
      const isWinner = latestFinished?.winnerIds.includes(player.id) ?? state.winnerIds.includes(player.id);
      const defeatLabel = player.status === "dead" ? DEFEAT_LEVEL_LABELS[player.defeatLevel ?? 1] : "未胜";
      feedback[player.id] = {
        animation: isWinner ? "win" : "lose",
        animationKey: `${latestFinished?.id ?? "finished"}-${player.id}`,
        label: isWinner ? "胜利" : defeatLabel,
        tone: isWinner ? "good" : "danger"
      };
    }
  }

  const recentEvents = state.eventLog.slice(-14).reverse();
  for (const event of recentEvents) {
    if (event.type === "damage") {
      setFeedback(feedback, event.targetId, {
        animation: "hurt",
        animationKey: event.id,
        label: event.attackName ?? "受到影响",
        tone: "danger"
      });
      if (event.sourceId) {
        setFeedback(feedback, event.sourceId, {
          animation: event.attackName && isLikelySkillName(event.attackName) ? "skill" : "attack",
          animationKey: `${event.id}-source`,
          label: event.attackName ?? "命中",
          tone: "danger"
        });
      }
      continue;
    }

    if (event.type === "heal") {
      setFeedback(feedback, event.targetId, {
        animation: "clap",
        animationKey: event.id,
        label: event.reason,
        tone: "good"
      });
      continue;
    }

    if (event.type === "attack_blocked") {
      const label =
        event.blockKind === "dodge"
          ? "回避"
          : event.blockKind === "reduce"
            ? "减免"
            : event.blockKind === "invulnerable"
              ? "无敌"
              : event.blockKind === "shield"
                ? "抵挡"
                : event.blockKind === "immune"
                  ? "免疫"
                  : "防住";
      setFeedback(feedback, event.targetId, {
        animation: "defend",
        animationKey: event.id,
        label,
        tone: "defense"
      });
      setFeedback(feedback, event.sourceId, {
        animation: "attack",
        animationKey: `${event.id}-source`,
        label: event.attackName,
        tone: "neutral"
      });
      continue;
    }

    if (event.type === "attack_reflected") {
      setFeedback(feedback, event.originalTargetId, {
        animation: "defend",
        animationKey: event.id,
        label: "反弹",
        tone: "defense"
      });
      setFeedback(feedback, event.reflectedTargetId, {
        animation: "hurt",
        animationKey: `${event.id}-target`,
        label: event.attackName,
        tone: "danger"
      });
      continue;
    }

    if (event.type === "rebound_broken") {
      setFeedback(feedback, event.sourceId, {
        animation: "attack",
        animationKey: `${event.id}-source`,
        label: event.attackName,
        tone: "danger"
      });
      setFeedback(feedback, event.targetId, {
        animation: "hurt",
        animationKey: event.id,
        label: "破弹",
        tone: "danger"
      });
      continue;
    }

    if (event.type === "player_died") {
      setFeedback(feedback, event.playerId, {
        animation: "lose",
        animationKey: event.id,
        label: DEFEAT_LEVEL_LABELS[event.defeatLevel ?? 1],
        tone: "danger"
      });
      continue;
    }

    if (event.type === "turn_revealed") {
      for (const [playerId, plan] of Object.entries(event.actions)) {
        setFeedback(feedback, playerId, actionPlanFeedback(event.id, plan));
      }
    }
  }

  return feedback;
}

export function buildTableEffects(state: PublicGameState): TableEffect[] {
  const now = Date.now();
  const effects: TableEffect[] = [];
  const aliveEnemyIds = (sourceId: PlayerId) =>
    state.players
      .filter((player) => player.id !== sourceId && player.status === "alive")
      .map((player) => player.id);

  const latestRevealIndex = findLatestEventIndex(state.eventLog, "turn_revealed");
  const recentEvents = state.eventLog.slice(
    latestRevealIndex >= 0 ? latestRevealIndex : Math.max(0, state.eventLog.length - 40)
  );

  for (const event of recentEvents) {
    if (now - event.at > EFFECT_MAX_AGE_MS) {
      continue;
    }

    if (event.type === "damage") {
      effects.push({
        id: event.id,
        type: "damage",
        color: "#ef4444",
        duration: 1500,
        targetType: "single",
        sourceId: event.sourceId,
        targetIds: [event.targetId],
        label: event.attackName ?? "伤害"
      });
      continue;
    }

    if (event.type === "heal") {
      effects.push({
        id: event.id,
        type: "heal",
        color: "#22c55e",
        duration: 1500,
        targetType: event.sourceId === event.targetId ? "self" : "single",
        sourceId: event.sourceId,
        targetIds: [event.targetId],
        label: event.reason
      });
      continue;
    }

    if (event.type === "attack_blocked") {
      effects.push({
        id: event.id,
        type: "shield",
        color: "#3b82f6",
        duration: 1300,
        targetType: "self",
        sourceId: event.sourceId,
        targetIds: [event.targetId],
        label: "防御"
      });
      continue;
    }

    if (event.type === "attack_reflected") {
      effects.push({
        id: event.id,
        type: "beam",
        color: "#8b5cf6",
        duration: 1700,
        targetType: "single",
        sourceId: event.originalTargetId,
        targetIds: [event.reflectedTargetId],
        label: "反弹"
      });
      continue;
    }

    if (event.type === "rebound_broken") {
      effects.push({
        id: event.id,
        type: "burst",
        color: "#f97316",
        duration: 1600,
        targetType: "single",
        sourceId: event.sourceId,
        targetIds: [event.targetId],
        label: "破弹"
      });
      continue;
    }

    if (event.type === "turn_revealed") {
      for (const [sourceId, plan] of Object.entries(event.actions)) {
        for (const action of plan.actions) {
          if (action.type === "attack") {
            const attack = BASE_ATTACKS[action.attackId];
            const targetIds =
              "targetId" in action && action.targetId
                ? [action.targetId]
                : aliveEnemyIds(sourceId);
            effects.push({
              id: `${event.id}-${sourceId}-${action.attackId}-${action.stacks}`,
              type: "damage",
              color: attack.traits.includes("fire")
                ? "#f97316"
                : attack.traits.includes("electric")
                  ? "#0ea5e9"
                  : "#ef4444",
              duration: attack.isArea ? 1900 : 1450,
              targetType: attack.isArea ? "all" : "single",
              sourceId,
              targetIds,
              label: attack.name
            });
            continue;
          }

          if (action.type === "defense") {
            const targetIds = action.defense === "rebound" && action.targetId
              ? [action.targetId]
              : [sourceId];
            effects.push({
              id: `${event.id}-${sourceId}-${action.defense}`,
              type: action.defense === "rebound" ? "beam" : "shield",
              color: action.defense === "rebound" ? "#8b5cf6" : "#3b82f6",
              duration: action.defense === "rebound" ? 1650 : 1250,
              targetType: action.defense === "rebound" ? "single" : "self",
              sourceId,
              targetIds,
              label: action.defense === "rebound" ? "反弹" : "防御"
            });
            continue;
          }

          if (action.type !== "skill") {
            continue;
          }

          const skill = getSkill(action.skillId);
          const explicitTargetIds = actionTargetIds(action);
          const targetIds = explicitTargetIds.length > 0
            ? explicitTargetIds
            : aliveEnemyIds(sourceId);
          const config = skillEffectForAction(action.skillId, targetIds.length);
          effects.push({
            ...config,
            id: `${event.id}-${sourceId}-${action.skillId}`,
            sourceId,
            targetIds: targetIds.length > 0 ? targetIds : [sourceId],
            label: skill?.name ?? "技能"
          });
        }
      }
    }
  }

  return effects.slice(-8);
}

function setFeedback(
  map: Record<PlayerId, SeatFeedback>,
  playerId: PlayerId,
  next: SeatFeedback
): void {
  if (!map[playerId] || map[playerId].animation === "idle") {
    map[playerId] = next;
  }
}

function actionPlanFeedback(eventId: string, plan: PlayerActionPlan): SeatFeedback {
  const label = getActionPlanLabel(plan);
  if (plan.actions.some((action) => action.type === "skill")) {
    return {
      animation: "skill",
      animationKey: eventId,
      label,
      tone: "skill"
    };
  }

  if (plan.actions.some((action) => action.type === "attack")) {
    return {
      animation: "attack",
      animationKey: eventId,
      label,
      tone: "danger"
    };
  }

  if (plan.actions.some((action) => action.type === "defense")) {
    return {
      animation: "defend",
      animationKey: eventId,
      label,
      tone: "defense"
    };
  }

  return {
    animation: "clap",
    animationKey: eventId,
    label,
    tone: "good"
  };
}

function actionTargetIds(action: PlayerAction): PlayerId[] {
  const targetId = "targetId" in action ? action.targetId : undefined;
  const targetIds = "targetIds" in action ? action.targetIds ?? [] : [];
  return Array.from(
    new Set(
      [targetId, ...targetIds].filter(
        (id): id is PlayerId => Boolean(id)
      )
    )
  );
}

function skillEffectForAction(skillId: string, targetCount: number): SkillEffectConfig {
  const skill = getSkill(skillId);
  const affinity = skillAffinityForEffect(skillId, skill);
  const preset =
    targetCount > 1
      ? SKILL_EFFECT_PRESETS.burst
      : SKILL_EFFECT_PRESETS[affinity.type];
  return {
    ...preset,
    type: targetCount > 1 ? preset.type : affinity.type,
    color: targetCount > 1 ? affinity.color : preset.color,
    duration: targetCount > 1 ? Math.max(1750, preset.duration) : preset.duration,
    targetType: targetCount > 1 ? "all" : "single"
  };
}

function skillAffinityForEffect(
  skillId: string,
  skill: ReturnType<typeof getSkill>
): { color: string; type: Exclude<SkillEffectType, "burst"> } {
  const text = [
    skill?.id ?? skillId,
    skill?.name,
    skill?.description,
    skill?.timing,
    skill?.tags.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (containsAny(text, ["火", "炎", "lava", "fire", "burn"])) {
    return { color: "#f97316", type: "flame" };
  }
  if (containsAny(text, ["冰", "霜", "雪", "frost", "ice", "winter"])) {
    return { color: "#7dd3fc", type: "frost" };
  }
  if (containsAny(text, ["电", "雷", "storm", "thunder", "electric"])) {
    return { color: "#facc15", type: "storm" };
  }
  if (containsAny(text, ["死", "影", "鬼", "裂魂", "curse", "void", "death"])) {
    return { color: "#c084fc", type: "curse" };
  }
  if (containsAny(text, ["血", "治疗", "复活", "heal", "life"])) {
    return { color: "#22c55e", type: "heal" };
  }
  if (containsAny(text, ["防", "盾", "守", "护", "免疫", "shield", "ward"])) {
    return { color: "#3b82f6", type: "shield" };
  }

  const palette: Array<{ color: string; type: Exclude<SkillEffectType, "burst"> }> = [
    { color: "#14b8a6", type: "beam" },
    { color: "#f97316", type: "flame" },
    { color: "#8b5cf6", type: "curse" },
    { color: "#ef4444", type: "damage" },
    { color: "#22c55e", type: "heal" },
    { color: "#0ea5e9", type: "frost" },
    { color: "#facc15", type: "storm" }
  ];
  const code = [...skillId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[code % palette.length]!;
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function findLatestEvent<T extends GameEvent["type"]>(
  events: GameEvent[],
  type: T
): Extract<GameEvent, { type: T }> | undefined {
  return [...events].reverse().find(
    (event): event is Extract<GameEvent, { type: T }> => event.type === type
  );
}

function findLatestEventIndex<T extends GameEvent["type"]>(
  events: GameEvent[],
  type: T
): number {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.type === type) {
      return index;
    }
  }

  return -1;
}

function isLikelySkillName(name: string): boolean {
  return name.length > 3;
}
