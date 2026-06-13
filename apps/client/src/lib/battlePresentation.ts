import {
  GameEvent,
  PlayerId,
  PublicGameState
} from "@bing/shared";
import {
  MAX_BATTLE_STEPS,
  STEP_DURATION_MS,
  buildBattleStepForEvent,
  targetIdsForPlayerAction,
  targetIdsForSkillEvent,
  type BattleBeat,
  type BattleSoundCue,
  type BattleStep,
  type BattleStepKind
} from "./turnTimeline";

export type BattleVfxPreset =
  | "none"
  | "single-hit"
  | "area-burst"
  | "shield-spark"
  | "reflect-arc"
  | "shatter"
  | "heal-pulse"
  | "skill-sigil"
  | "defeat-fade"
  | "system-pulse";

export type BattleCameraCue =
  | "none"
  | "nudge"
  | "shake-light"
  | "shake-medium"
  | "zoom-source"
  | "zoom-target";

export interface BattlePresentationCue {
  id: string;
  eventType: GameEvent["type"];
  kind: BattleStepKind;
  beat: BattleBeat;
  sourceId?: PlayerId | undefined;
  targetIds: PlayerId[];
  startMs: number;
  durationMs: number;
  hitStopMs: number;
  intensity: number;
  vfx: BattleVfxPreset;
  sfx?: BattleSoundCue | undefined;
  camera: BattleCameraCue;
  label: string;
  description: string;
  amount?: number | undefined;
}

interface BeatProfile {
  durationMs: number;
  hitStopMs: number;
  intensity: number;
  camera: BattleCameraCue;
}

const BEAT_PROFILES: Record<BattleBeat, BeatProfile> = {
  reveal: { durationMs: 740, hitStopMs: 0, intensity: 0.35, camera: "zoom-source" },
  impact: { durationMs: 860, hitStopMs: 110, intensity: 0.86, camera: "shake-medium" },
  defense: { durationMs: 760, hitStopMs: 60, intensity: 0.62, camera: "shake-light" },
  reflect: { durationMs: 840, hitStopMs: 80, intensity: 0.78, camera: "nudge" },
  skill: { durationMs: 920, hitStopMs: 80, intensity: 0.82, camera: "zoom-source" },
  defeat: { durationMs: 1060, hitStopMs: 130, intensity: 1, camera: "zoom-target" },
  recovery: { durationMs: 760, hitStopMs: 0, intensity: 0.58, camera: "none" },
  system: { durationMs: 620, hitStopMs: 0, intensity: 0.28, camera: "none" }
};

export function buildBattlePresentation(events: GameEvent[], state: PublicGameState): BattlePresentationCue[] {
  const cues: BattlePresentationCue[] = [];
  let cursorMs = 0;

  for (const event of events) {
    const step = buildBattleStepForEvent(event, state);
    if (!step) {
      continue;
    }

    const cue = buildPresentationCue(event, step, state, cursorMs);
    cues.push(cue);
    cursorMs += cue.durationMs;

    if (cues.length >= MAX_BATTLE_STEPS) {
      break;
    }
  }

  return cues;
}

export function buildPresentationCue(
  event: GameEvent,
  step: BattleStep,
  state: PublicGameState,
  startMs = 0
): BattlePresentationCue {
  const profile = BEAT_PROFILES[step.beat];
  const participants = eventParticipants(event, state);
  return {
    id: step.id,
    eventType: event.type,
    kind: step.kind,
    beat: step.beat,
    sourceId: participants.sourceId,
    targetIds: participants.targetIds,
    startMs,
    durationMs: Math.max(profile.durationMs, STEP_DURATION_MS - 160),
    hitStopMs: profile.hitStopMs,
    intensity: profile.intensity,
    vfx: vfxForStep(step),
    sfx: step.soundCue,
    camera: profile.camera,
    label: step.label,
    description: step.description,
    amount: step.amount
  };
}

function eventParticipants(
  event: GameEvent,
  state: PublicGameState
): { sourceId?: PlayerId | undefined; targetIds: PlayerId[] } {
  switch (event.type) {
    case "damage":
      return { sourceId: event.sourceId, targetIds: [event.targetId] };
    case "attack_blocked":
    case "rebound_broken":
      return { sourceId: event.sourceId, targetIds: [event.targetId] };
    case "attack_reflected":
      return {
        sourceId: event.originalTargetId,
        targetIds: uniqueIds([event.reflectedTargetId, event.sourceId])
      };
    case "heal":
      return { sourceId: event.sourceId ?? event.targetId, targetIds: [event.targetId] };
    case "clash":
      return { sourceId: event.attackerAId, targetIds: [event.attackerBId] };
    case "skill_revealed":
    case "skill_used":
      return {
        sourceId: event.playerId,
        targetIds: targetIdsForSkillEvent(
          state,
          event.playerId,
          event.skillId,
          event.turnNumber,
          event.roundNumber
        )
      };
    case "action_switched":
      return { sourceId: event.playerId, targetIds: targetIdsForPlayerAction(event.after) };
    case "player_died":
      return { sourceId: event.sourceId, targetIds: [event.playerId] };
    case "game_finished":
      return { targetIds: event.winnerIds };
    default:
      return { targetIds: [] };
  }
}

function vfxForStep(step: BattleStep): BattleVfxPreset {
  switch (step.kind) {
    case "damage":
      return "single-hit";
    case "area":
      return "area-burst";
    case "block":
      return "shield-spark";
    case "reflect":
      return "reflect-arc";
    case "break":
    case "clash":
      return "shatter";
    case "heal":
      return "heal-pulse";
    case "skill":
      return "skill-sigil";
    case "defeat":
      return "defeat-fade";
    case "system":
      return "system-pulse";
  }
}

function uniqueIds(ids: Array<PlayerId | undefined>): PlayerId[] {
  return [...new Set(ids.filter((id): id is PlayerId => Boolean(id)))];
}
