import { useState } from "react";
import { POINT_GAME_MOVES, getSkill, type PointGameAction, type PublicGameState } from "@bing/shared";
import { Button } from "./ui/button";

const labels = { rock: "石头", paper: "布", scissors: "剪刀" };

export function BlindSkillPicker({ state, selected, limit, onChange }: {
  state: PublicGameState; selected: string[]; limit: number; onChange: (values: string[]) => void;
}) {
  return <div className="max-h-48 space-y-1 overflow-auto rounded-lg border p-2 text-sm">
    {(state.blindSkillChoices ?? []).map((choice) => {
      const player = state.players.find((item) => item.id === choice.playerId);
      const name = choice.visibleSkillId && getSkill(choice.visibleSkillId)?.name;
      const checked = selected.includes(choice.instanceId);
      return <label key={choice.instanceId} className="flex items-center gap-2">
        <input type="checkbox" checked={checked} disabled={!checked && selected.length >= limit}
          onChange={() => onChange(checked ? selected.filter((id) => id !== choice.instanceId) : [...selected, choice.instanceId])} />
        {player?.name ?? "玩家"} 技能{choice.number}{name ? `：${name}` : ""}
      </label>;
    })}
  </div>;
}

export function PointGamePanel({ state, playerId, busy, submit }: {
  state: PublicGameState; playerId: string; busy: boolean; submit: (action: PointGameAction) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const game = state.pointGame;
  const removal = state.verdictRemovalPlayerId;
  const isParticipant = game && [game.sourceId, game.targetId].includes(playerId);
  const limit = Math.min(16, state.blindSkillChoices?.length ?? 0);
  return <section className="space-y-3 p-3" aria-label="御秽裁决玩点">
    <h3 className="font-bold">{removal ? "御秽裁决 · 四连败" : "御秽裁决 · 石头剪刀布"}</h3>
    {removal === playerId ? <>
      <p>选择 {limit} 个未参与融合的小技能，一次提交。</p>
      <BlindSkillPicker state={state} selected={selected} onChange={setSelected} limit={limit} />
      <Button disabled={busy || selected.length !== limit} onClick={() => submit({ kind: "remove", instanceIds: selected })}>确认消除</Button>
    </> : isParticipant && game ? <>
      <p>{game.round > 1 ? `上一把平局，请重新出拳（第 ${game.round} 把）。` : "主游戏已暂停。双方出拳后揭晓。"}</p>
      <div className="flex flex-wrap gap-2">{POINT_GAME_MOVES.map((move) => <Button key={move}
        disabled={busy || game.submittedPlayerIds.includes(playerId)}
        onClick={() => submit({ kind: "move", move, gameId: game.id, round: game.round })}>{labels[move]}</Button>)}</div>
    </> : <p>等待裁决玩家完成操作。</p>}
  </section>;
}
