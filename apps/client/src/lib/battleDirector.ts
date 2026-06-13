import { useEffect, useMemo, useRef, useState } from "react";
import { GameEvent, PlayerId, PublicGameState } from "@bing/shared";
import {
  buildBattlePresentation,
  type BattleCameraCue,
  type BattlePresentationCue,
  type BattleVfxPreset
} from "./battlePresentation";
import {
  MAX_REPLAY_AGE_MS,
  STEP_DURATION_MS,
  buildBattleSteps,
  findLatestBroadcast,
  type BattleBeat,
  type BattleStep,
  type Broadcast
} from "./turnTimeline";

export interface BattleDirectorSnapshot {
  activeBeat: BattleBeat | "idle";
  activeCameraCue: BattleCameraCue;
  activeCue: BattlePresentationCue | undefined;
  activeHitStopMs: number;
  activeIntensity: number;
  activeSourceId: PlayerId | undefined;
  activeTargetIds: PlayerId[];
  activeVfx: BattleVfxPreset;
  cueCount: number;
  cues: BattlePresentationCue[];
  totalDurationMs: number;
}

export interface BattleDirectorState extends BattleDirectorSnapshot {
  activeRevealId: string | null;
  activeStepIndex: number;
  battleSteps: BattleStep[];
  broadcast: Broadcast | undefined;
  firstCue: BattlePresentationCue | undefined;
  isPlaying: boolean;
  presentationCues: BattlePresentationCue[];
  visibleCue: BattlePresentationCue | undefined;
  visibleStep: BattleStep | undefined;
}

export function useBattleDirector(state: PublicGameState): BattleDirectorState {
  const playedRevealIds = useRef(new Set<string>());
  const [activeRevealId, setActiveRevealId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const broadcast = useMemo(() => findLatestBroadcast(state.eventLog), [state.eventLog]);
  const battleSteps = useMemo(
    () => (broadcast ? buildBattleSteps(broadcast.events, state) : []),
    [broadcast, state]
  );
  const presentationCues = useMemo(
    () => (broadcast ? buildBattlePresentation(broadcast.events, state) : []),
    [broadcast, state]
  );

  useEffect(() => {
    if (state.turnResolutionStarted || !broadcast || playedRevealIds.current.has(broadcast.reveal.id)) {
      return;
    }

    playedRevealIds.current.add(broadcast.reveal.id);
    if (Date.now() - broadcast.reveal.at > MAX_REPLAY_AGE_MS) {
      return;
    }

    setActiveRevealId(broadcast.reveal.id);
    setActiveStepIndex(0);
    const stepCount = Math.max(1, presentationCues.length);
    const interval = window.setInterval(() => {
      setActiveStepIndex((index) => Math.min(index + 1, stepCount - 1));
    }, STEP_DURATION_MS);
    const timeout = window.setTimeout(
      () => setActiveRevealId(null),
      battleDirectorTotalDurationMs(presentationCues.length)
    );
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [broadcast, presentationCues.length, state.turnResolutionStarted]);

  const snapshot = buildBattleDirectorSnapshotFromCues(presentationCues, activeStepIndex);
  const visibleCue = presentationCues[activeStepIndex];
  const visibleStep = battleSteps[activeStepIndex];

  return {
    ...snapshot,
    activeRevealId,
    activeStepIndex,
    battleSteps,
    broadcast,
    firstCue: presentationCues[0],
    isPlaying: Boolean(broadcast && activeRevealId === broadcast.reveal.id && !state.turnResolutionStarted),
    presentationCues,
    visibleCue,
    visibleStep
  };
}

export function buildBattleDirectorSnapshot(
  events: GameEvent[],
  state: PublicGameState,
  activeCueIndex = 0
): BattleDirectorSnapshot {
  return buildBattleDirectorSnapshotFromCues(
    buildBattlePresentation(events, state),
    activeCueIndex
  );
}

export function buildBattleDirectorSnapshotFromCues(
  cues: BattlePresentationCue[],
  activeCueIndex = 0
): BattleDirectorSnapshot {
  const safeIndex = cues.length > 0
    ? Math.max(0, Math.min(activeCueIndex, cues.length - 1))
    : 0;
  const activeCue = cues[safeIndex];

  return {
    activeBeat: activeCue?.beat ?? "idle",
    activeCameraCue: activeCue?.camera ?? "none",
    activeCue,
    activeHitStopMs: activeCue?.hitStopMs ?? 0,
    activeIntensity: activeCue?.intensity ?? 0,
    activeSourceId: activeCue?.sourceId,
    activeTargetIds: activeCue?.targetIds ?? [],
    activeVfx: activeCue?.vfx ?? "none",
    cueCount: cues.length,
    cues,
    totalDurationMs: battleDirectorTotalDurationMs(cues.length)
  };
}

export function battleDirectorTotalDurationMs(cueCount: number): number {
  return Math.max(1, cueCount) * STEP_DURATION_MS + 900;
}
