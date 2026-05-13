import { Bot, CheckCircle2, Cookie, HeartPulse, UserRound, XCircle } from "lucide-react";
import { PublicGameState, PlayerState } from "@bing/shared";

interface PlayerCardProps {
  player: PlayerState;
  state: PublicGameState;
  isViewer: boolean;
  highlighted?: boolean;
}

export function PlayerCard({ player, state, isViewer, highlighted = false }: PlayerCardProps) {
  const hasPendingAction = state.pendingActionPlayerIds.includes(player.id);
  const isDead = player.status === "dead";
  const cakeText = player.cakes < 0 ? "?" : String(player.cakes);
  const hpPercent = Math.max(0, Math.min(100, (player.hp / 6) * 100));

  return (
    <section
      className={[
        "player-card-shell",
        isViewer ? "player-card-viewer" : "",
        highlighted ? "animate-player-hit" : "",
        isDead ? "opacity-55" : ""
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "player-avatar",
              player.kind === "ai" ? "player-avatar-ai" : "",
              highlighted ? "avatar-hit-shake" : ""
            ].join(" ")}
          >
            {player.avatarUrl ? (
              <img alt={`${player.name} 头像`} src={player.avatarUrl} />
            ) : player.kind === "ai" ? (
              <Bot className="h-5 w-5" aria-hidden="true" />
            ) : (
              <UserRound className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-900">
              {player.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isViewer ? "你的席位" : player.kind === "ai" ? "AI 玩家" : "玩家"}
            </p>
          </div>
        </div>
        <div className="status-chip">
          {isDead ? (
            <>
              <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
              <span className="text-red-700">死亡</span>
            </>
          ) : hasPendingAction ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span className="text-emerald-700">已出招</span>
            </>
          ) : (
            <span className="text-gray-500">思考中</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="resource-card resource-card-hp">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <HeartPulse className="h-4 w-4" aria-hidden="true" />
            血量
          </div>
          <div className="mt-1 text-2xl font-bold text-red-900">{player.hp}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-red-100">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
        <div className="resource-card resource-card-cake">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <Cookie className="h-4 w-4" aria-hidden="true" />
            饼
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-900">{cakeText}</div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: Math.min(6, Math.max(0, player.cakes)) }).map((_, index) => (
              <span key={index} className="cake-dot" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
