import { useEffect, useRef } from "react";
import {
  PlayerActionPlan,
  PublicGameState,
  getActionPlanLabel
} from "@bing/shared";
import { formatDamage, playerName } from "../lib/format";
import { playBattleCue } from "../lib/battleAudio";
import { type BattlePresentationCue } from "../lib/battlePresentation";
import { useBattleDirector } from "../lib/battleDirector";
import {
  type BattleStep
} from "../lib/turnTimeline";

interface TurnAnimationProps {
  state: PublicGameState;
}

export function TurnAnimation({ state }: TurnAnimationProps) {
  const playedRevealAudioIds = useRef(new Set<string>());
  const director = useBattleDirector(state);
  const {
    activeRevealId,
    activeStepIndex,
    battleSteps,
    broadcast,
    firstCue,
    isPlaying,
    presentationCues,
    totalDurationMs,
    visibleCue,
    visibleStep
  } = director;

  useEffect(() => {
    if (!isPlaying || !broadcast || playedRevealAudioIds.current.has(broadcast.reveal.id)) {
      return;
    }

    playedRevealAudioIds.current.add(broadcast.reveal.id);
    playBattleCue("turn-reveal");
  }, [broadcast, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !broadcast || !visibleStep || activeRevealId !== broadcast.reveal.id) {
      return;
    }

    playBattleCue(visibleCue?.sfx ?? visibleStep.soundCue);
  }, [activeRevealId, activeStepIndex, broadcast?.reveal.id, isPlaying, visibleCue, visibleStep]);

  if (!broadcast) {
    return null;
  }

  const cueMetadata = (
    <div
      aria-hidden="true"
      className="sr-only"
      data-testid="battle-presentation-cues"
      data-cue-count={presentationCues.length}
      data-first-beat={firstCue?.beat ?? ""}
      data-first-camera-cue={firstCue?.camera ?? "none"}
      data-first-hit-stop-ms={firstCue?.hitStopMs ?? 0}
      data-first-target-ids={firstCue?.targetIds.join(",") ?? ""}
      data-first-vfx={firstCue?.vfx ?? "none"}
    />
  );

  if (!isPlaying || activeRevealId !== broadcast.reveal.id) {
    return cueMetadata;
  }

  return (
    <>
      {cueMetadata}
      <div className="battle-stage-overlay pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-3 py-5">
        <div
          className="battle-stage-panel battle-stage-floating w-full max-w-4xl rounded-lg border border-teal-200 bg-white/95 p-4 shadow-2xl"
          data-battle-reveal-id={broadcast.reveal.id}
          data-beat="reveal"
          data-active-beat={visibleCue?.beat ?? "reveal"}
          data-active-vfx={visibleCue?.vfx ?? "none"}
          data-active-camera-cue={visibleCue?.camera ?? "none"}
          data-sound-cue="turn-reveal"
          style={{ animationDuration: `${totalDurationMs}ms` }}
        >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-gray-500">
              第 {broadcast.reveal.roundNumber} 轮 · 第 {broadcast.reveal.turnNumber} 回合
            </div>
            <h2 className="text-xl font-black text-gray-950">招式结算动画</h2>
          </div>
          <div className="rounded-lg bg-teal-700 px-3 py-1 text-sm font-bold text-white">
            {battleSteps.length > 0 ? `${activeStepIndex + 1}/${battleSteps.length}` : "结算中"}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(broadcast.reveal.actions).map(([playerId, plan]) => (
            <ActionAvatar
              key={playerId}
              avatarUrl={state.players.find((player) => player.id === playerId)?.avatarUrl}
              name={playerName(state, playerId)}
              plan={plan}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-2">
          {!visibleStep ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-600">
              本回合无人受伤，博弈继续。
            </div>
          ) : (
            <BattleLane key={visibleStep.id} cue={visibleCue} index={0} step={visibleStep} />
          )}
        </div>
        </div>
      </div>
    </>
  );
}

function ActionAvatar({
  avatarUrl,
  name,
  plan
}: {
  avatarUrl?: string | undefined;
  name: string;
  plan: PlayerActionPlan;
}) {
  const label = getActionPlanLabel(plan);
  const isArea = plan.actions.some(
    (action) =>
      action.type === "attack" &&
      (action.attackId === "wan_jian" || action.attackId === "nan_man")
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2">
        <div
          className={[
            "grid h-10 w-10 place-items-center rounded-full text-base font-black text-white",
            isArea ? "bg-amber-600" : "bg-teal-700"
          ].join(" ")}
        >
          {avatarUrl ? <img alt={`${name} 头像`} className="h-full w-full rounded-full object-cover" src={avatarUrl} /> : initialOf(name)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
          <div className="truncate text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function BattleLane({
  cue,
  step,
  index
}: {
  cue: BattlePresentationCue | undefined;
  step: BattleStep;
  index: number;
}) {
  const isArea = step.kind === "area";
  const laneClass = `battle-lane battle-lane-${step.kind}`;

  return (
    <div
      className={laneClass}
      data-beat={step.beat}
      data-camera-cue={cue?.camera ?? "none"}
      data-hit-stop-ms={cue?.hitStopMs ?? 0}
      data-intensity={cue?.intensity ?? 0}
      data-sound-cue={cue?.sfx ?? step.soundCue ?? "system"}
      data-source-id={cue?.sourceId ?? ""}
      data-target-ids={cue?.targetIds.join(",") ?? ""}
      data-vfx={cue?.vfx ?? "none"}
      style={{ animationDelay: `${Math.min(index * 110, 440)}ms` }}
    >
      <div className="battle-combatant">
        <span className="battle-avatar">{renderAvatar(step.sourceName, step.sourceAvatarUrl)}</span>
        <span className="truncate">{step.sourceName}</span>
      </div>

      <div className="battle-track" aria-hidden="true">
        <span className="battle-track-line" />
        <span className="battle-attack-label">{step.label}</span>
        {isArea ? <AreaRain /> : <span className="battle-flying-avatar">{renderAvatar(step.sourceName, step.sourceAvatarUrl)}</span>}
        {step.kind === "block" ? <span className="battle-shield">盾</span> : null}
        {step.kind === "reflect" ? <span className="battle-rebound">弹</span> : null}
        {step.kind === "break" ? <span className="battle-break">破</span> : null}
        {step.kind === "heal" ? <span className="battle-heal">回</span> : null}
        {step.kind === "clash" ? <span className="battle-clash">撞</span> : null}
        {step.kind === "skill" ? <span className="battle-skill">技</span> : null}
        {step.kind === "defeat" ? <span className="battle-defeat">败</span> : null}
        {step.kind === "system" ? <span className="battle-system">记</span> : null}
      </div>

      <div className="battle-combatant battle-combatant-target">
        <span className="battle-avatar battle-avatar-target">{renderAvatar(step.targetName, step.targetAvatarUrl)}</span>
        <span className="truncate">{step.targetName}</span>
      </div>

      <div className="battle-lane-caption">
        <strong>{step.description}</strong>
        {typeof step.amount === "number" ? <span>{formatDamage(step.amount)} 点</span> : null}
      </div>
    </div>
  );
}

function AreaRain() {
  return (
    <span className="battle-area-rain">
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function initialOf(name: string): string {
  return name.trim().slice(0, 1) || "?";
}

function renderAvatar(name: string, avatarUrl: string | undefined) {
  if (avatarUrl) {
    return <img alt={`${name} 头像`} className="h-full w-full rounded-full object-cover" src={avatarUrl} />;
  }

  return initialOf(name);
}
