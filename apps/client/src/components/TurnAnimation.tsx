import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlayerActionPlan,
  PublicGameState,
  getActionPlanLabel
} from "@bing/shared";
import { formatDamage, playerName } from "../lib/format";
import {
  MAX_REPLAY_AGE_MS,
  STEP_DURATION_MS,
  buildBattleSteps,
  findLatestBroadcast,
  type BattleStep
} from "../lib/turnTimeline";

interface TurnAnimationProps {
  state: PublicGameState;
}

export function TurnAnimation({ state }: TurnAnimationProps) {
  const playedRevealIds = useRef(new Set<string>());
  const [activeRevealId, setActiveRevealId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const broadcast = useMemo(() => findLatestBroadcast(state.eventLog), [state.eventLog]);
  const battleSteps = useMemo(
    () => (broadcast ? buildBattleSteps(broadcast.events, state) : []),
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
    const stepCount = Math.max(1, battleSteps.length);
    const totalDuration = stepCount * STEP_DURATION_MS + 900;
    const interval = window.setInterval(() => {
      setActiveStepIndex((index) => Math.min(index + 1, stepCount - 1));
    }, STEP_DURATION_MS);
    const timeout = window.setTimeout(() => setActiveRevealId(null), totalDuration);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [battleSteps.length, broadcast, state.turnResolutionStarted]);

  if (state.turnResolutionStarted || !broadcast || activeRevealId !== broadcast.reveal.id) {
    return null;
  }

  const visibleStep = battleSteps[activeStepIndex];
  const totalDuration = Math.max(1, battleSteps.length) * STEP_DURATION_MS + 900;

  return (
    <div className="battle-stage-overlay pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-3 py-5">
      <div
        className="battle-stage-panel battle-stage-floating w-full max-w-4xl rounded-lg border border-teal-200 bg-white/95 p-4 shadow-2xl"
        data-battle-reveal-id={broadcast.reveal.id}
        data-beat="reveal"
        data-sound-cue="turn-reveal"
        style={{ animationDuration: `${totalDuration}ms` }}
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
            <BattleLane key={visibleStep.id} index={0} step={visibleStep} />
          )}
        </div>
      </div>
    </div>
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

function BattleLane({ step, index }: { step: BattleStep; index: number }) {
  const isArea = step.kind === "area";
  const laneClass = `battle-lane battle-lane-${step.kind}`;

  return (
    <div
      className={laneClass}
      data-beat={step.beat}
      data-sound-cue={step.soundCue ?? "system"}
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
