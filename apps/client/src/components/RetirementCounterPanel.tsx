import { RETIREMENT_COUNTER_COST, type PublicGameState, type RetirementCounterAction } from "@bing/shared";
import { useState } from "react";
import { PhaseSkillSelect } from "./PhaseSkillSelect";

interface Props {
  counter: NonNullable<PublicGameState["retirementCounter"]>;
  players: PublicGameState["players"];
  playerId: string;
  busy: boolean;
  submit: (action: RetirementCounterAction) => void;
}

export function RetirementCounterPanel({ counter, players, playerId, busy, submit }: Props) {
  const [selection, setSelection] = useState<{ windowId: string; kind: RetirementCounterAction["kind"] }>();
  const [reset, setReset] = useState(false);
  const canRespond = counter.playerIds.includes(playerId);
  const canUseSoulResponse = counter.soulResponderIds?.includes(playerId);
  const canReverse = canRespond && counter.remainingReversals >= RETIREMENT_COUNTER_COST;
  const names = players.filter(({ id }) => counter.playerIds.includes(id)).map(({ name }) => name).join("、");
  const options: { value: Exclude<RetirementCounterAction["kind"], "pass">; label: string }[] = [];
  if (canReverse) options.push({ value: "reenter", label: `逆转进游（${RETIREMENT_COUNTER_COST} 次）` });
  if (canRespond && counter.canUseKarmaRebirth) options.push({ value: "karma_rebirth", label: "轮回转生 · 仅保留本技能" });
  if (canRespond && counter.canUseHealingArt) options.push({ value: "healing_art", label: "治愈术" });
  if (canUseSoulResponse && counter.canUseSoulSink) options.push({ value: "soul_sink", label: "魂沉" });
  if (canUseSoulResponse && counter.canRestoreSoulSink) options.push({ value: "restore_soul_sink", label: "恢复魂沉（10 魂）" });
  const selected = selection?.windowId === counter.id ? options.find(({ value }) => value === selection.kind) : undefined;
  return (
    <section className="action-panel-shell space-y-3 p-4" data-testid="retirement-counter-panel">
      <h2 className="text-lg font-semibold">{canUseSoulResponse || counter.canUseHealingArt || counter.canUseKarmaRebirth || !counter.playerIds.length ? "退场响应" : "反制退游"}</h2>
      {canReverse ? <p className="text-sm">你还有 {counter.remainingReversals} 次逆转，可消耗 {RETIREMENT_COUNTER_COST} 次进游。</p> : null}
      {options.length ? <PhaseSkillSelect testId="retirement-skill-select" disabled={busy}
        selected={selected?.value ?? ""} moves={options} onChange={(id) => {
          const option = options.find(({ value }) => value === id);
          if (option) setSelection({ windowId: counter.id, kind: option.value });
          setReset(false);
        }} /> : null}
      {selected?.value === "soul_sink" ? <p className="text-sm">魂沉会将本回合退游、消失或被必杀的玩家转为普通死亡。</p> : null}
      {selected?.value === "healing_art" && counter.canResetWithHealingArt ? <label className="block text-sm">
        治愈方式
        <select className="soft-input mt-1 w-full" disabled={busy} value={reset ? "restore" : "heal"}
          onChange={(event) => setReset(event.currentTarget.value === "restore")}>
          <option value="heal">普通治愈</option>
          <option value="restore">天命 · 恢复至初始</option>
        </select>
      </label> : null}
      {selected ? <button className="btn-primary" type="button" disabled={busy}
        data-testid={selected.value === "reenter" ? "retirement-reenter" : "retirement-use-skill"} onClick={() =>
          submit({ windowId: counter.id, kind: selected.value,
            ...(selected.value === "healing_art" && counter.canResetWithHealingArt && reset ? { charityRestoreInitial: true } : {}) })
        }>使用技能</button> : null}
      {canRespond || canUseSoulResponse ? (
        <button className="btn-secondary" type="button" disabled={busy} data-testid="retirement-counter-pass"
          onClick={() => submit({ windowId: counter.id, kind: "pass" })}>跳过响应</button>
      ) : null}
      {!canRespond && !canUseSoulResponse ? <p className="text-sm">{names ? `等待 ${names} 响应退场。` : "等待退场响应结算。"}</p> : null}
    </section>
  );
}
