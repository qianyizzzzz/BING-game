import { ReactNode, useEffect, useMemo, useState } from "react";
import { Compass, Crown, Gauge, RadioTower, UsersRound } from "lucide-react";
import {
  ACTION_PROMPT_SECONDS,
  ACTION_WINDOW_SECONDS,
  PlayerId,
  PublicGameState
} from "@bing/shared";
import { buildSeatFeedbackMap, buildTableEffects } from "../lib/tableFeedback";
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

  useEffect(() => {
    if (!activeDeadline) {
      return;
    }

    const timer = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [activeDeadline]);

  return (
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
          hasImpactEffect ? "poker-table-board-impact" : ""
        ].join(" ")}
      >
        <TableScene3D
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

        <SkillEffectLayer effects={effects} seatPositions={seatPositions} />
        {actionPanel ? <div className="table-action-dock">{actionPanel}</div> : null}

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

          return (
            <PlayerSeat
              key={player.id}
              canKick={canKick}
              feedback={feedbackMap[player.id] ?? {
                animation: "idle",
                animationKey: `idle-${player.id}`
              }}
              highlighted={highlightedPlayerIds.has(player.id)}
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
