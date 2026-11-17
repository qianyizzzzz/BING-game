import type { ActionWindowMode, GamePhase, GameState, PlayerId, PlayerState, SkillTimingPhase } from "../types";
import { hasContinuationBlock } from "./hunyao";
import { remainingReversalUses, type VictoryResumeKind } from "./victoryCounter";
import { isSleeping } from "./utopia";
import { canRespondWithSoulSkill, canRestoreSoulSink } from "./soulPact";
import { SOUL_SINK_ID } from "../bigCards/abilities";
import { canRecoverEmptyCity } from "./illusionRules";
import { canUseCharityExitHealing, hasCharityDestiny } from "./charity";
import { hasInitialPlayerSnapshot } from "./initialPlayerState";
import { canRestoreTemporalState } from "./jueying";
import { canUseKarmaExitRebirth } from "./karmaInheritance";

export const RETIREMENT_COUNTER_COST = 3;

export type RetirementCounterAction = { windowId: string; kind: "reenter" | "pass" | "soul_sink" | "restore_soul_sink" | "karma_rebirth" } |
  { windowId: string; kind: "healing_art"; charityRestoreInitial?: true };
export type RetirementResume =
  | { kind: "window" | "damage_point" | "health_change" | "self_destruct_round_end" | "past_time_round_end" | "turn_end" | "blood_ritual" }
  | { kind: "victory"; victoryResume: VictoryResumeKind }
  | { kind: "prompt"; preservePendingActions?: boolean; promptSeconds?: number };

export interface RetirementCounterState {
  id: string;
  playerIds: PlayerId[];
  soulResponderIds?: PlayerId[];
  ritualTargetId?: PlayerId;
  soulSinkSettling?: boolean;
  resume: RetirementResume & {
    phase: GamePhase;
    timing: SkillTimingPhase;
    mode?: ActionWindowMode;
    actionWindowPlayerIds: PlayerId[];
    passPlayerIds: PlayerId[];
    windowTimeLeft?: number;
    turnTimeLeft?: number;
  };
}

export interface RetirementCounterView {
  id: string;
  playerIds: PlayerId[];
  remainingReversals: number;
  soulResponderIds?: PlayerId[];
  canRestoreSoulSink?: boolean;
  canUseSoulSink?: boolean;
  canUseHealingArt?: boolean;
  canResetWithHealingArt?: boolean;
  canUseKarmaRebirth?: boolean;
}

export function canCounterRetirement(state: GameState, player: PlayerState | undefined): boolean {
  return player?.status === "dead" && player.defeatLevel === 2 && !isSleeping(player, state.turnNumber) &&
    canRecoverEmptyCity(player, player, "1092") &&
    remainingReversalUses(player) >= RETIREMENT_COUNTER_COST &&
    !hasContinuationBlock(state, player, "reentry", "none");
}

export function getRetirementCounterView(state: GameState, viewer?: PlayerState): RetirementCounterView | undefined {
  const counter = state.retirementCounter;
  if (!counter) return undefined;
  return { id: counter.id, playerIds: counter.playerIds,
    ...(viewer && counter.playerIds.includes(viewer.id) && canUseKarmaExitRebirth(state, viewer) ? { canUseKarmaRebirth: true } : {}),
    ...(viewer && counter.playerIds.includes(viewer.id) && canUseCharityExitHealing(state, viewer) ? {
      canUseHealingArt: true,
      canResetWithHealingArt: hasCharityDestiny(viewer) && hasInitialPlayerSnapshot(state, viewer.id) && canRestoreTemporalState(state, viewer)
    } : {}),
    ...(viewer && counter.soulResponderIds?.includes(viewer.id) ? {
      soulResponderIds: [viewer.id],
      canRestoreSoulSink: canRestoreSoulSink(viewer),
      canUseSoulSink: canRespondWithSoulSkill(viewer, SOUL_SINK_ID)
    } : {}),
    remainingReversals: viewer && counter.playerIds.includes(viewer.id) && canCounterRetirement(state, viewer) ? remainingReversalUses(viewer) : 0 };
}
