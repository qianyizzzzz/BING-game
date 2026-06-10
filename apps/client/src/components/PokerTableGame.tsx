import { ReactNode, useMemo } from "react";
import { Compass, Crown, Gauge, RadioTower, UsersRound } from "lucide-react";
import { PlayerId, PublicGameState } from "@bing/shared";
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
  const activePlayers = state.players.filter((player) => player.status === "alive");
  const seatedPlayers = state.players.filter((player) => player.kind !== "spectator");
  const spectators = state.players.filter((player) => player.kind === "spectator");
  const owner = state.players.find((player) => player.id === state.ownerId);
  const hasImpactEffect = effects.some((effect) => effect.type === "damage");
  const depthMeters = 720 + state.roundNumber * 180 + state.roundTurnNumber * 14;
  const layerLabel = `LAYER ${String(Math.min(9, Math.max(1, state.roundNumber))).padStart(2, "0")}`;
  const signalLabel = effects.length > 0
    ? "ACTIVE"
    : state.phase === "collecting_actions"
      ? "LISTEN"
      : state.phase === "action_window"
        ? "RIFT"
        : "CALM";

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
