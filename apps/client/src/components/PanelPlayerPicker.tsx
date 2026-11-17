import { useState } from "react";
import type { PlayerId, PublicGameState } from "@bing/shared";

export function usePanelPlayer(state: PublicGameState) {
  const [selectedId, selectPlayer] = useState<PlayerId>();
  const players = state.players.filter(({ kind }) => kind !== "spectator");
  const viewerId = state.viewerPlayerId;
  const player = players.find(({ id }) => id === selectedId) ??
    players.find(({ id }) => id === viewerId) ?? players[0];

  return { players, player, viewerId, selectPlayer };
}

export function PanelPlayerPicker({ players, player, viewerId, selectPlayer }: ReturnType<typeof usePanelPlayer>) {
  return (
    <label className="block text-sm font-semibold">
      查看玩家
      <select
        className="soft-input mt-1 w-full"
        disabled={!player}
        onChange={(event) => selectPlayer(event.target.value)}
        value={player?.id ?? ""}
      >
        {!player ? <option value="">暂无玩家</option> : null}
        {players.map(({ id, name }) => (
          <option key={id} value={id}>{name}{id === viewerId ? "（自己）" : ""}</option>
        ))}
      </select>
    </label>
  );
}
