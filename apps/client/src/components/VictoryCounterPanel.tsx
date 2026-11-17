import {
  countVictoryContributions, VICTORY_COUNTER_THRESHOLD, VICTORY_TRANSFER_COST,
  type PublicGameState, type VictoryCounterAction
} from "@bing/shared";
import { useState } from "react";
import { PhaseSkillSelect } from "./PhaseSkillSelect";

interface Props {
  state: PublicGameState;
  playerId: string;
  busy: boolean;
  submit: (action: VictoryCounterAction) => void;
  pass: () => void;
}

export function VictoryCounterPanel({ state, playerId, busy, submit, pass }: Props) {
  const [kind, setKind] = useState("");
  const [claimId, setClaimId] = useState("");
  const counter = state.victoryCounter!;
  const player = state.players.find((entry) => entry.id === playerId);
  const passed = state.actionWindowPassPlayerIds.includes(playerId);
  const frozen = state.eternalFrozenPlayerIds?.includes(playerId);
  const canRespond = player?.status === "alive" && player.kind !== "spectator" && !passed && !frozen;
  const name = (id: string) => state.players.find((entry) => entry.id === id)?.name ?? "玩家";
  const targets = canRespond && counter.remainingReversals > 0
    ? counter.claims.filter((claim) => !claim.protected && claim.playerId !== playerId &&
      countVictoryContributions(claim) < VICTORY_COUNTER_THRESHOLD)
    : [];
  const options = targets.length ? [
    { value: "contribute", label: "投入逆转" },
    ...(counter.canTransfer ? [{ value: "transfer", label: `绝影逆魂（${VICTORY_TRANSFER_COST} 次）` }] : [])
  ] : [];
  const selected = options.find(({ value }) => value === kind);
  const claim = targets.find(({ id }) => id === claimId) ?? targets[0];

  return (
    <section className="action-panel-shell space-y-3 p-4" data-testid="victory-counter-panel">
      <h2 className="text-lg font-semibold">胜利反制阶段</h2>
      {frozen && <p className="text-sm">永恒一念冻结了你的行动，等待其他玩家反制。</p>}
      <p className="text-sm">任一技能胜利累计收到 {VICTORY_COUNTER_THRESHOLD} 次逆转后，该玩家判负。</p>
      {canRespond && <p className="text-sm">你还可使用 {counter.remainingReversals} 次逆转</p>}
      <ul className="space-y-3">
        {counter.claims.map((claim) => {
          const total = countVictoryContributions(claim);
          return (
            <li key={claim.id} className="space-y-2 rounded-lg border border-black/15 p-3">
              <h3 className="font-medium">{name(claim.playerId)} 的技能胜利</h3>
              {claim.protected ? <p className="text-sm">这项胜利无法反制</p> : (
                <>
                  <p className="text-sm" data-testid="victory-contribution-total">已投入 {total} / {VICTORY_COUNTER_THRESHOLD} 次</p>
                  {total > 0 && <p className="text-sm">
                    {Object.entries(claim.contributions).map(([id, count]) => `${name(id)} ${count} 次`).join("、")}
                  </p>}
                </>
              )}
            </li>
          );
        })}
      </ul>
      {options.length ? <PhaseSkillSelect testId="victory-skill-select" disabled={busy}
        selected={selected?.value ?? ""} onChange={setKind} moves={options} /> : null}
      {selected && claim ? <form className="space-y-2" onSubmit={(event) => {
        event.preventDefault();
        if (selected.value === "transfer") submit({ kind: "transfer", claimId: claim.id });
        else submit({ kind: "contribute", claimId: claim.id, count: Number(new FormData(event.currentTarget).get("count")) });
      }}>
        <label className="block text-sm">选择要反制的胜利
          <select className="soft-input mt-1 w-full" disabled={busy} value={claim.id} onChange={(event) => setClaimId(event.currentTarget.value)}>
            {targets.map(({ id, playerId }) => <option key={id} value={id}>{name(playerId)} 的技能胜利</option>)}
          </select>
        </label>
        {selected.value === "contribute" ? <label className="block text-sm">投入次数
          <input key={claim.id} className="soft-input ml-2 w-16" name="count" type="number" min={1}
            max={Math.min(counter.remainingReversals, VICTORY_COUNTER_THRESHOLD - countVictoryContributions(claim))}
            defaultValue={1} required disabled={busy} data-testid="victory-contribution-count" />
        </label> : null}
        <button className="btn-primary" disabled={busy} type="submit" data-testid={`victory-${selected.value}`}>
          {selected.value === "contribute" ? "投入逆转" : "使用技能"}
        </button>
      </form> : null}
      {canRespond && <button className="btn-secondary" disabled={busy} onClick={pass} data-testid="victory-counter-pass">放弃反制</button>}
      {passed && <p className="text-sm">已放弃，等待其他玩家。</p>}
    </section>
  );
}
