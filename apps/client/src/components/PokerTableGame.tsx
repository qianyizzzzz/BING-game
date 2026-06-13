import { ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Compass, Crown, Gauge, RadioTower, UsersRound } from "lucide-react";
import {
  ACTION_PROMPT_SECONDS,
  ACTION_WINDOW_SECONDS,
  GameEvent,
  PlayerId,
  PublicGameState
} from "@bing/shared";
import { battleDirectorSeatRole, useBattleDirector } from "../lib/battleDirector";
import type { BattlePresentationCue } from "../lib/battlePresentation";
import { formatDamage, playerName } from "../lib/format";
import { buildSeatFeedbackMap, buildTableEffects } from "../lib/tableFeedback";
import type { SkillEffectType, TableEffect } from "../lib/tableFeedback";
import { PlayerSeat, SeatPosition } from "./PlayerSeat";
import { SkillEffectLayer } from "./SkillEffectLayer";
import { TableScene3D } from "./TableScene3D";

interface PokerTableGameProps {
  actionPanel?: ReactNode;
  highlightedPlayerIds?: Set<PlayerId>;
  isOwner: boolean;
  onKickPlayer?: (playerId: PlayerId) => void;
  state: PublicGameState;
  viewerPlayerId?: PlayerId;
}

export function PokerTableGame({
  actionPanel,
  highlightedPlayerIds = new Set(),
  isOwner,
  onKickPlayer,
  state,
  viewerPlayerId
}: PokerTableGameProps) {
  const orderedPlayers = useMemo(
    () =>
      orderPlayersForViewer(
        state.players.filter((player) => player.kind !== "spectator"),
        viewerPlayerId
      ),
    [state.players, viewerPlayerId]
  );
  const seatPositions = useMemo(
    () => buildSeatPositions(orderedPlayers.map((player) => player.id)),
    [orderedPlayers]
  );
  const feedbackMap = useMemo(() => buildSeatFeedbackMap(state), [state]);
  const effects = useMemo(() => buildTableEffects(state), [state]);
  const director = useBattleDirector(state);
  const presentationEffects = useMemo(
    () => buildPresentationTableEffects(director.presentationCues),
    [director.presentationCues]
  );
  const skillLayerEffects = effects.length > 0 ? effects : presentationEffects;
  const activeDirectorCue = director.activeCue;
  const readoutStep = director.visibleStep ?? director.battleSteps[0];
  const readoutCue = director.visibleCue ?? director.firstCue;
  const readoutTargetIds = readoutCue?.targetIds ?? [];
  const summaryStepIndex = (() => {
    if (readoutStep && readoutStep.kind !== "system") {
      return director.activeStepIndex;
    }

    const concreteIndex = director.battleSteps.findIndex((step) => step.kind !== "system");
    if (concreteIndex >= 0) {
      return concreteIndex;
    }

    return Math.max(0, director.activeStepIndex);
  })();
  const summaryStep = director.battleSteps[summaryStepIndex] ?? readoutStep;
  const summaryCue = director.presentationCues[summaryStepIndex] ?? readoutCue;
  const summaryTargetIds = summaryCue?.targetIds ?? [];
  const readoutResourceDeltas = useMemo(
    () => buildResourceDeltas(state, director.broadcast?.events),
    [director.broadcast?.events, state]
  );
  const readoutResourceDeltaText = formatResourceDeltaSummary(readoutResourceDeltas);
  const readoutHpDeltaCount = readoutResourceDeltas.filter((delta) => delta.hpDelta !== 0).length;
  const readoutCakeDeltaCount = readoutResourceDeltas.filter((delta) => delta.cakeDelta !== 0).length;
  const readoutProgress =
    director.isPlaying && director.battleSteps.length > 0
      ? `结算 ${director.activeStepIndex + 1}/${director.battleSteps.length}`
      : readoutStep
        ? "上一轮"
        : "等待亮招";
  const readoutAmountLabel =
    typeof readoutStep?.amount === "number"
      ? `${readoutStep.kind === "heal" ? "治疗" : "伤害"} ${formatDamage(readoutStep.amount)}`
      : "";
  const summaryAmountLabel =
    typeof summaryStep?.amount === "number"
      ? `${summaryStep.kind === "heal" ? "治疗" : "伤害"} ${formatDamage(summaryStep.amount)}`
      : "";
  const readoutSummaryAction = summaryStep?.label ?? "等待亮招";
  const readoutSummarySource = summaryStep?.sourceName ?? "桌面";
  const readoutSummaryTarget = summaryStep?.targetName ?? "所有玩家";
  const readoutSummaryResult =
    summaryAmountLabel || summaryStep?.description || "等待所有玩家提交行动。";
  const seatedPlayers = state.players.filter((player) => player.kind !== "spectator");
  const activePlayers = seatedPlayers.filter((player) => player.status === "alive");
  const spectators = state.players.filter((player) => player.kind === "spectator");
  const owner = state.players.find((player) => player.id === state.ownerId);
  const viewer = state.players.find((player) => player.id === viewerPlayerId);
  const hasImpactEffect = effects.some((effect) => effect.type === "damage");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const activeDeadline =
    state.phase === "action_window"
      ? state.actionWindowDeadlineAt
      : state.phase === "collecting_actions"
        ? state.turnDeadlineAt
        : undefined;
  const deadlineSeconds =
    activeDeadline ? Math.max(0, Math.ceil((activeDeadline - clockNow) / 1000)) : null;
  const deadlineTotalSeconds =
    state.phase === "action_window"
      ? state.actionWindowMode === "prompt"
        ? ACTION_PROMPT_SECONDS
        : ACTION_WINDOW_SECONDS
      : Math.max(1, state.config.turnTimeLimitSeconds);
  const deadlineProgress =
    deadlineSeconds === null
      ? 0
      : Math.max(0, Math.min(100, (deadlineSeconds / deadlineTotalSeconds) * 100));
  const viewerNeedsAction =
    Boolean(viewer) &&
    viewer?.kind !== "spectator" &&
    viewer?.status === "alive" &&
    ((state.phase === "collecting_actions" &&
      !state.pendingActionPlayerIds.includes(viewer.id)) ||
      (state.phase === "action_window" &&
        !state.actionWindowPassPlayerIds.includes(viewer.id)));
  const progressLabel =
    state.phase === "lobby"
      ? `${seatedPlayers.length} 人已入座`
      : state.phase === "action_window"
      ? `${state.actionWindowPassPlayerIds.length}/${activePlayers.length} 已结束`
      : `${state.pendingActionPlayerIds.length}/${activePlayers.length} 已出招`;
  const waitingPlayers =
    state.phase === "action_window"
      ? activePlayers.filter((player) => !state.actionWindowPassPlayerIds.includes(player.id))
      : state.phase === "collecting_actions"
        ? activePlayers.filter((player) => !state.pendingActionPlayerIds.includes(player.id))
        : [];
  const waitingLabel =
    waitingPlayers.length > 0
      ? `还差 ${waitingPlayers.map((player) => player.name).join("、")}`
      : state.phase === "collecting_actions" || state.phase === "action_window"
        ? "全部就绪"
        : "";
  const tablePrompt = getTablePrompt(state, Boolean(viewerNeedsAction));
  const depthMeters = 720 + state.roundNumber * 180 + state.roundTurnNumber * 14;
  const layerLabel = `LAYER ${String(Math.min(9, Math.max(1, state.roundNumber))).padStart(2, "0")}`;
  const signalLabel = effects.length > 0
    ? "ACTIVE"
    : state.phase === "collecting_actions"
      ? "LISTEN"
      : state.phase === "action_window"
        ? "RIFT"
        : "CALM";
  const activeDirectorTargetSeatCount = orderedPlayers.filter((player) =>
    director.activeTargetIds.includes(player.id)
  ).length;
  const activeDirectorSourceSeatCount =
    director.activeSourceId && orderedPlayers.some((player) => player.id === director.activeSourceId)
      ? 1
      : 0;
  const seatPlayerIds = orderedPlayers.map((player) => player.id).join(",");

  useEffect(() => {
    if (!activeDeadline) {
      return;
    }

    const timer = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [activeDeadline]);

  const actionDock = actionPanel ? <div className="table-action-dock">{actionPanel}</div> : null;

  return (
    <>
      <section className="poker-table-shell">
        <div className="poker-table-toolbar">
          <div className="poker-table-phase">
            {state.phase === "lobby"
              ? "房间准备"
              : state.phase === "finished"
                ? "对局结束"
                : state.phase === "action_window"
                  ? "阶段行动"
                  : "同时行动"}
          </div>
          <div className="poker-table-stats">
            <span>
              <Crown className="h-4 w-4" aria-hidden="true" />
              {owner?.name ?? "房主"}
            </span>
            <span>
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              {activePlayers.length}/{seatedPlayers.length}
            </span>
          </div>
        </div>

        <div
          className={[
            "poker-table-board",
            hasImpactEffect ? "poker-table-board-impact" : "",
            director.isPlaying ? "poker-table-board-directed" : "",
            activeDirectorCue?.hitStopMs ? "poker-table-board-hit-stop" : ""
          ].join(" ")}
          data-director-active={director.isPlaying ? "true" : "false"}
          data-director-beat={director.activeBeat}
          data-director-camera-cue={director.activeCameraCue}
          data-director-hit-stop-ms={director.activeHitStopMs}
          data-director-intensity={director.activeIntensity}
          data-director-target-ids={director.activeTargetIds.join(",")}
          data-director-vfx={director.activeVfx}
        >
        <div
          aria-hidden="true"
          className="sr-only"
          data-testid="battle-director-state"
          data-active={director.isPlaying ? "true" : "false"}
          data-active-beat={director.activeBeat}
          data-active-camera-cue={director.activeCameraCue}
          data-active-hit-stop-ms={director.activeHitStopMs}
          data-active-source-id={director.activeSourceId ?? ""}
          data-active-source-seat-count={activeDirectorSourceSeatCount}
          data-active-target-ids={director.activeTargetIds.join(",")}
          data-active-target-seat-count={activeDirectorTargetSeatCount}
          data-cue-count={director.cueCount}
          data-seat-player-ids={seatPlayerIds}
        />
        <TableScene3D
          directorCue={activeDirectorCue}
          players={orderedPlayers}
          seatPositions={seatPositions}
          viewerPlayerId={viewerPlayerId}
        />

        <div className="abyss-table-hud" aria-hidden="true">
          <div className="abyss-depth-gauge">
            <span style={{ height: `${Math.min(92, 26 + state.roundTurnNumber * 5)}%` }} />
          </div>
          <div className="abyss-hud-readouts">
            <span>
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              DEPTH {depthMeters}m
            </span>
            <span>
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              {layerLabel}
            </span>
            <span>
              <RadioTower className="h-3.5 w-3.5" aria-hidden="true" />
              RELIC {signalLabel}
            </span>
          </div>
        </div>

        <div className="battle-status-hud" aria-live="polite">
          <div className="battle-status-main">
            <span>{phaseLabel(state)}</span>
            <strong>
              {state.phase === "lobby" ? "等待房主开始" : `第 ${state.roundNumber} 轮 · 第 ${state.roundTurnNumber} 回合`}
            </strong>
          </div>
          <div className="battle-status-grid">
            <div>
              <span>桌面进度</span>
              <strong>{progressLabel}</strong>
              {waitingLabel ? <small className="battle-status-detail">{waitingLabel}</small> : null}
            </div>
            <div>
              <span>倒计时</span>
              <strong>{deadlineSeconds === null ? "--" : `${deadlineSeconds}s`}</strong>
            </div>
          </div>
          <div
            className={[
              "battle-status-prompt",
              viewerNeedsAction ? "battle-status-prompt-active" : ""
            ].join(" ")}
          >
            {tablePrompt}
          </div>
          {deadlineSeconds !== null ? (
            <div className="battle-status-timer">
              <span style={{ width: `${deadlineProgress}%` }} />
            </div>
          ) : null}
        </div>

        <div
          className={[
            "battle-readout",
            director.isPlaying ? "battle-readout-active" : ""
          ].join(" ")}
          data-testid="battle-readout"
          data-active={director.isPlaying ? "true" : "false"}
          data-beat={readoutCue?.beat ?? "idle"}
          data-kind={readoutStep?.kind ?? "idle"}
          data-source-id={readoutCue?.sourceId ?? ""}
          data-step-count={director.battleSteps.length}
          data-target-ids={readoutTargetIds.join(",")}
          aria-live="polite"
        >
          <div className="battle-readout-kicker">
            <span>{readoutProgress}</span>
            {readoutAmountLabel ? <strong>{readoutAmountLabel}</strong> : null}
          </div>
          {readoutStep ? (
            <>
              <h3>{readoutStep.label}</h3>
              <div className="battle-readout-route">
                <b>{readoutStep.sourceName}</b>
                <span aria-hidden="true">→</span>
                <b>{readoutStep.targetName}</b>
              </div>
              <div
                className="battle-turn-summary"
                data-testid="battle-turn-summary"
                data-action-label={readoutSummaryAction}
                data-amount={summaryStep?.amount ?? ""}
                data-kind={summaryStep?.kind ?? "idle"}
                data-resource-delta-count={readoutResourceDeltas.length}
                data-resource-deltas={readoutResourceDeltaText}
                data-cake-delta-count={readoutCakeDeltaCount}
                data-hp-delta-count={readoutHpDeltaCount}
                data-source-id={summaryCue?.sourceId ?? ""}
                data-source-label={readoutSummarySource}
                data-step-count={director.battleSteps.length}
                data-target-ids={summaryTargetIds.join(",")}
                data-target-count={summaryTargetIds.length}
              >
                <div>
                  <span>行动者</span>
                  <strong>{readoutSummarySource}</strong>
                </div>
                <div>
                  <span>动作</span>
                  <strong>{readoutSummaryAction}</strong>
                </div>
                <div>
                  <span>目标</span>
                  <strong>{readoutSummaryTarget}</strong>
                </div>
                <div>
                  <span>结果</span>
                  <strong>{readoutSummaryResult}</strong>
                </div>
              </div>
              <ResourceDeltaStrip deltas={readoutResourceDeltas} summary={readoutResourceDeltaText} />
              <p>{readoutStep.description}</p>
            </>
          ) : (
            <>
              <h3>暂无结算</h3>
              <div className="battle-readout-route">
                <b>桌面</b>
                <span aria-hidden="true">→</span>
                <b>等待</b>
              </div>
              <div
                className="battle-turn-summary battle-turn-summary-idle"
                data-testid="battle-turn-summary"
                data-action-label={readoutSummaryAction}
                data-amount=""
                data-kind="idle"
                data-resource-delta-count="0"
                data-resource-deltas="等待结算变化"
                data-cake-delta-count="0"
                data-hp-delta-count="0"
                data-source-id=""
                data-source-label={readoutSummarySource}
                data-step-count={director.battleSteps.length}
                data-target-ids=""
                data-target-count="0"
              >
                <div>
                  <span>行动者</span>
                  <strong>{readoutSummarySource}</strong>
                </div>
                <div>
                  <span>动作</span>
                  <strong>{readoutSummaryAction}</strong>
                </div>
                <div>
                  <span>目标</span>
                  <strong>{readoutSummaryTarget}</strong>
                </div>
                <div>
                  <span>结果</span>
                  <strong>{readoutSummaryResult}</strong>
                </div>
              </div>
              <ResourceDeltaStrip deltas={[]} summary="等待结算变化" />
              <p>等待所有玩家亮招。</p>
            </>
          )}
        </div>

        <SkillEffectLayer effects={skillLayerEffects} seatPositions={seatPositions} />

        {orderedPlayers.map((player) => {
          const isActiveActor =
            (state.phase === "collecting_actions" &&
            player.status === "alive" &&
            !state.pendingActionPlayerIds.includes(player.id)) ||
            (state.phase === "action_window" &&
              player.status === "alive" &&
              !state.actionWindowPassPlayerIds.includes(player.id));
          const canKick =
            state.phase === "lobby" &&
            isOwner &&
            Boolean(viewerPlayerId) &&
            player.id !== viewerPlayerId;
          const directorRole = director.isPlaying
            ? battleDirectorSeatRole(player.id, director.activeSourceId, director.activeTargetIds)
            : undefined;

          return (
            <PlayerSeat
              key={player.id}
              canKick={canKick}
              directorRole={directorRole}
              feedback={feedbackMap[player.id] ?? {
                animation: "idle",
                animationKey: `idle-${player.id}`
              }}
              highlighted={highlightedPlayerIds.has(player.id) || Boolean(directorRole)}
              isActiveActor={isActiveActor}
              isViewer={player.id === viewerPlayerId}
              onKick={onKickPlayer}
              player={player}
              position={seatPositions[player.id] ?? { x: 50, y: 50, angle: 0 }}
              state={state}
            />
          );
        })}

        {spectators.length > 0 ? (
          <div className="spectator-rail">
            <span>观战</span>
            {spectators.map((spectator) => (
              <strong key={spectator.id}>{spectator.name}</strong>
            ))}
          </div>
        ) : null}
      </div>
    </section>
    {actionDock ? createPortal(actionDock, document.body) : null}
    </>
  );
}

interface ResourceDelta {
  playerId: PlayerId;
  name: string;
  hpDelta: number;
  cakeDelta: number;
  reasons: string[];
}

function ResourceDeltaStrip({
  deltas,
  summary
}: {
  deltas: ResourceDelta[];
  summary: string;
}) {
  const visibleDeltas = deltas.slice(0, 4);
  return (
    <div
      className={[
        "battle-resource-deltas",
        deltas.length === 0 ? "battle-resource-deltas-idle" : ""
      ].join(" ")}
      data-testid="battle-resource-deltas"
      data-resource-delta-count={deltas.length}
      data-resource-deltas={summary}
      title={summary}
    >
      {visibleDeltas.length > 0 ? (
        visibleDeltas.map((delta) => (
          <span
            className={[
              "battle-resource-delta-chip",
              delta.hpDelta < 0 ? "battle-resource-delta-danger" : "",
              delta.hpDelta > 0 || delta.cakeDelta > 0 ? "battle-resource-delta-good" : ""
            ].join(" ")}
            key={delta.playerId}
            title={formatResourceDeltaDetail(delta)}
          >
            {formatResourceDelta(delta)}
          </span>
        ))
      ) : (
        <span className="battle-resource-delta-chip">等待血量/饼变化</span>
      )}
      {deltas.length > visibleDeltas.length ? (
        <span className="battle-resource-delta-chip">+{deltas.length - visibleDeltas.length}</span>
      ) : null}
    </div>
  );
}

function phaseLabel(state: PublicGameState): string {
  if (state.phase === "lobby") {
    return "房间准备";
  }

  if (state.phase === "finished") {
    return "对局结束";
  }

  if (state.phase === "action_window") {
    return state.activeTimingPhase === "revival_action" ? "复活窗口" : "阶段行动";
  }

  return "同时行动";
}

function getTablePrompt(state: PublicGameState, viewerNeedsAction: boolean): string {
  if (state.phase === "lobby") {
    return "等待房主开始，玩家可以调整角色和技能。";
  }

  if (state.phase === "finished") {
    return "对局已结束，可以查看复盘报告。";
  }

  if (viewerNeedsAction) {
    return state.phase === "action_window"
      ? "轮到你处理阶段行动。"
      : "请选择本回合行动并提交。";
  }

  if (state.phase === "action_window") {
    return "你已结束阶段行动，等待其他玩家。";
  }

  return "你已提交，等待所有玩家亮招。";
}

function buildPresentationTableEffects(cues: BattlePresentationCue[]): TableEffect[] {
  return cues
    .filter((cue) => cue.sourceId && cue.targetIds.length > 0 && cue.vfx !== "none")
    .map((cue) => ({
      id: `cue-${cue.id}`,
      type: effectTypeForCue(cue),
      color: effectColorForCue(cue),
      duration: Math.max(900, cue.durationMs),
      targetType: cue.targetIds.length > 1 ? "all" : "single",
      sourceId: cue.sourceId,
      targetIds: cue.targetIds,
      label: cue.label
    }));
}

function effectTypeForCue(cue: BattlePresentationCue): SkillEffectType {
  switch (cue.vfx) {
    case "shield-spark":
      return "shield";
    case "reflect-arc":
      return "beam";
    case "heal-pulse":
      return "heal";
    case "single-hit":
      return "damage";
    case "shatter":
      return "storm";
    case "defeat-fade":
      return "curse";
    case "area-burst":
    case "skill-sigil":
      return "burst";
    case "system-pulse":
    case "none":
      return "burst";
  }
}

function effectColorForCue(cue: BattlePresentationCue): string {
  switch (cue.vfx) {
    case "shield-spark":
      return "#3b82f6";
    case "reflect-arc":
      return "#8b5cf6";
    case "heal-pulse":
      return "#22c55e";
    case "single-hit":
      return "#ef4444";
    case "area-burst":
      return "#f97316";
    case "shatter":
      return "#facc15";
    case "defeat-fade":
      return "#c084fc";
    case "skill-sigil":
      return "#14b8a6";
    case "system-pulse":
    case "none":
      return "#88f7db";
  }
}

function buildResourceDeltas(
  state: PublicGameState,
  events: GameEvent[] | undefined
): ResourceDelta[] {
  if (!events?.length) {
    return [];
  }

  const deltas = new Map<PlayerId, ResourceDelta>();
  const ensureDelta = (playerId: PlayerId): ResourceDelta => {
    const existing = deltas.get(playerId);
    if (existing) {
      return existing;
    }

    const delta: ResourceDelta = {
      playerId,
      name: playerName(state, playerId),
      hpDelta: 0,
      cakeDelta: 0,
      reasons: []
    };
    deltas.set(playerId, delta);
    return delta;
  };

  for (const event of events) {
    if (event.type === "damage") {
      const delta = ensureDelta(event.targetId);
      delta.hpDelta -= event.amount;
      delta.reasons.push(event.attackName ?? "受到伤害");
      continue;
    }

    if (event.type === "heal") {
      const delta = ensureDelta(event.targetId);
      delta.hpDelta += event.amount;
      delta.reasons.push(event.reason);
      continue;
    }

    if (event.type === "cake_changed") {
      const cakeDelta = event.after - event.before;
      if (cakeDelta === 0) {
        continue;
      }

      const delta = ensureDelta(event.playerId);
      delta.cakeDelta += cakeDelta;
      delta.reasons.push(event.reason);
    }
  }

  return Array.from(deltas.values()).filter(
    (delta) => delta.hpDelta !== 0 || delta.cakeDelta !== 0
  );
}

function formatResourceDeltaSummary(deltas: ResourceDelta[]): string {
  if (deltas.length === 0) {
    return "本轮没有血量/饼变化";
  }

  return deltas.map(formatResourceDelta).join("；");
}

function formatResourceDelta(delta: ResourceDelta): string {
  return `${delta.name} ${formatDeltaParts(delta)}`;
}

function formatResourceDeltaDetail(delta: ResourceDelta): string {
  const reasonText = Array.from(new Set(delta.reasons)).join("、");
  return reasonText ? `${formatResourceDelta(delta)}｜${reasonText}` : formatResourceDelta(delta);
}

function formatDeltaParts(delta: ResourceDelta): string {
  const parts: string[] = [];
  if (delta.hpDelta !== 0) {
    parts.push(`血${formatSignedDelta(delta.hpDelta)}`);
  }
  if (delta.cakeDelta !== 0) {
    parts.push(`饼${formatSignedDelta(delta.cakeDelta)}`);
  }
  return parts.join(" / ");
}

function formatSignedDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function orderPlayersForViewer(
  players: PublicGameState["players"],
  viewerPlayerId: PlayerId | undefined
) {
  if (!viewerPlayerId) {
    return players;
  }

  const viewerIndex = players.findIndex((player) => player.id === viewerPlayerId);
  if (viewerIndex <= 0) {
    return players;
  }

  return [...players.slice(viewerIndex), ...players.slice(0, viewerIndex)];
}

function buildSeatPositions(playerIds: PlayerId[]): Record<PlayerId, SeatPosition> {
  const count = Math.max(1, playerIds.length);
  const preset = getSeatPreset(count);

  return Object.fromEntries(
    playerIds.map((playerId, index) => {
      const slot = preset[index];
      if (slot) {
        return [
          playerId,
          {
            x: slot[0],
            y: slot[1],
            angle: slot[2]
          }
        ];
      }

      const angle = 90 + (index * 360) / count;
      const radians = (angle * Math.PI) / 180;
      return [
        playerId,
        {
          x: 50 + Math.cos(radians) * 33,
          y: 50 + Math.sin(radians) * 31,
          angle
        }
      ];
    })
  );
}

function getSeatPreset(count: number): Array<[number, number, number]> {
  const presets: Record<number, Array<[number, number, number]>> = {
    1: [[50, 55, 90]],
    2: [
      [50, 79, 90],
      [50, 21, 270]
    ],
    3: [
      [50, 80, 90],
      [24, 35, 220],
      [76, 35, 320]
    ],
    4: [
      [50, 80, 90],
      [21, 43, 180],
      [50, 20, 270],
      [79, 43, 0]
    ],
    5: [
      [50, 80, 90],
      [20, 59, 160],
      [29, 24, 235],
      [71, 24, 305],
      [80, 59, 20]
    ],
    6: [
      [50, 81, 90],
      [20, 63, 150],
      [20, 33, 210],
      [50, 18, 270],
      [80, 33, 330],
      [80, 63, 30]
    ]
  };

  return presets[Math.min(Math.max(count, 1), 6)] ?? presets[6]!;
}
