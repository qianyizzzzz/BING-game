import { useMemo, useState } from "react";
import {
  BigCardAbilityDefinition, BigCardDefinition, PublicGameState, SkillId, HUNYAO_LIGHT_ID, JIHAN_FREEZE_ID,
  getBigCard, getBigCards, getSkill, isBigSkillMode
} from "@bing/shared";

interface BigCardPanelProps {
  state: PublicGameState;
  busy?: boolean;
  isOwner?: boolean;
  onChange?: (playerId: string, ids: SkillId[]) => void;
}

export function BigCardPanel({ state, busy = false, isOwner = false, onChange }: BigCardPanelProps) {
  if (!isBigSkillMode(state.config.skillMode)) return null;
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const canSelect = state.phase === "lobby" && state.config.skillMode === "big_test_select" && Boolean(onChange);
  const controlled = state.players.filter((player) => player.kind !== "spectator" &&
    (player.id === viewer?.id || (isOwner && player.kind === "ai")));

  return (
    <section id="big-card-reference" className="surface-card min-w-0 space-y-3 p-4" data-testid="big-card-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-black text-gray-950">{canSelect ? "测试指定大技能" : "本局大卡"}</h2>
        <span className="status-pill">每人 {state.config.skillCount} 张 · 行动限时 300 秒</span>
      </div>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="big-card-pending-notice">
        卡面会标注实现状态。大卡授予的小技能与融合会在开局后获得。
      </p>
      {canSelect ? (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          {controlled.map((player) => <BigCardPicker key={player.id} player={player} busy={busy}
            maxCount={state.config.skillCount} onChange={(ids) => onChange!(player.id, ids)} />)}
        </div>
      ) : state.phase === "lobby" && state.config.skillMode === "big_random" ? (
        <p className="text-sm text-gray-600">开局时，每名玩家随机获得 {state.config.skillCount} 张原生大卡；融合大卡可在测试指定模式中选择。</p>
      ) : viewer?.bigCards?.length ? (
        <div className="space-y-2">{viewer.bigCards.map((instance) => {
          const card = getBigCard(instance.cardId);
          return card ? <BigCardDetails key={instance.instanceId} card={card} lostAbilityIds={instance.lostAbilityIds}
            counters={state.statusOverview?.cardCounters[instance.instanceId]}
            onlyAbilityId={instance.onlyAbilityId} borrowedUntilRound={instance.borrowedUntilRound} disabled={instance.junengDisabled} /> : null;
        })}</div>
      ) : <p className="text-sm text-gray-500">{viewer?.kind === "spectator" ? "观战中，其他玩家的未暴露大卡保持隐藏。" : "尚未指定大卡，可继续基础出招测试。"}</p>}
      {state.phase !== "lobby" ? state.players.filter((player) => player.id !== viewer?.id && player.bigCards?.length).map((player) =>
        <details key={player.id} className="rounded-lg border border-gray-200 p-2 text-sm">
          <summary>{player.name} · 已知技能</summary>
          <ul className="my-2 space-y-1">{[...new Set(player.skills)].filter((id) => !/^\d{7}$/.test(id)).map((id) =>
            <li key={id}>{getSkill(id)?.name ?? id}</li>)}</ul>
          {player.bigCards?.map((instance) => {
            const card = getBigCard(instance.cardId);
            return card ? <BigCardDetails key={instance.instanceId} card={card} /> : null;
          })}
        </details>) : null}
    </section>
  );
}

function displayedAbilityDescription(ability: BigCardAbilityDefinition): string {
  if (ability.id === HUNYAO_LIGHT_ID || ability.id === JIHAN_FREEZE_ID) {
    return getSkill(ability.id)?.description ?? ability.description;
  }
  return ability.description;
}

function BigCardPicker({ player, busy, maxCount, onChange }: {
  player: PublicGameState["players"][number]; busy: boolean; maxCount: number; onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = (player.bigCards ?? []).map((instance) => instance.cardId);
  const available = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return getBigCards().filter((card) => !text || `${card.id} ${card.name} ${card.sourceGroup} ${card.abilities.map(displayedAbilityDescription).join(" ")}`
      .toLocaleLowerCase().includes(text));
  }, [query]);
  const full = selected.length >= maxCount;
  return (
    <article className="settings-field min-w-0 space-y-3" data-testid={`big-card-picker-${player.id}`} data-selected-count={selected.length}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
        <span>{player.name}（{player.kind === "ai" ? "AI" : "自己"}）</span><span>{selected.length}/{maxCount}</span>
      </div>
      <label className="block text-sm">搜索大卡
        <input className="soft-input mt-1 w-full" data-testid={`big-card-search-${player.id}`}
          disabled={busy || full} placeholder="名称、五位 ID 或效果说明" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <label className="block text-sm">添加大卡
        <select className="soft-input mt-1 w-full" data-testid={`big-card-add-${player.id}`} value="" disabled={busy || full}
          onChange={(event) => { if (event.target.value) { onChange([...selected, event.target.value]); setQuery(""); } }}>
          <option value="">{full ? "大卡数量已满" : available.length ? "请选择大卡" : "没有匹配的大卡"}</option>
          {available.map((card) => <option key={card.id} value={card.id}>{card.id} · {card.name} · {card.sourceGroup} · {card.implementationStatus === "partial" ? "部分实现" : card.implemented ? "已实现" : "待实现"}</option>)}
        </select>
      </label>
      {selected.length === 0 ? <p className="text-sm text-gray-500">尚未选择大卡。</p> : selected.map((id, index) => {
        const card = getBigCard(id);
        return card ? <div key={`${id}:${index}`} className="min-w-0 space-y-1">
          <BigCardDetails card={card} />
          <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={busy}
            data-testid={`big-card-remove-${player.id}-${index}`}
            onClick={() => onChange(selected.filter((_, position) => position !== index))}>移除 {card.name}</button>
        </div> : null;
      })}
    </article>
  );
}

function BigCardDetails({ card, lostAbilityIds, onlyAbilityId, borrowedUntilRound, disabled, counters }: {
  card: BigCardDefinition; lostAbilityIds?: string[] | undefined; onlyAbilityId?: string | undefined; borrowedUntilRound?: number | undefined;
  disabled?: boolean | undefined;
  counters?: Record<string, string[]> | undefined;
}) {
  const abilities = onlyAbilityId ? card.abilities.filter(({ id }) => id === onlyAbilityId) : card.abilities;
  return (
    <details className="min-w-0 rounded-lg border border-gray-200 bg-white p-3" data-testid={`big-card-detail-${card.id}`}>
      <summary className="cursor-pointer break-words text-sm font-bold text-gray-950">
        {card.id} · {card.name} {onlyAbilityId ? "· 吸取的子技能" : ""} <span className="font-normal text-amber-700">{disabled ? "本轮停用" : card.implementationStatus === "partial" ? "已接入，部分效果待实现" : card.implemented ? "已实现" : "待实现"}</span>
      </summary>
      <p className="mt-2 text-xs text-gray-500">{card.sourceGroup} · {abilities.length} 条子技能{borrowedUntilRound ? ` · 第${borrowedUntilRound}轮归还` : ""} · 点击卡名可收起</p>
      {card.id === "10501" ? <p className="mt-2 text-xs text-teal-800">实际使用规则：控制技失效不含“除你”，焚世烈焰在全部三轮有效期内生效。开局发放天火之狱和炽焰。</p> : null}
      {card.id === "10503" ? <p className="mt-2 text-xs text-teal-800">冰伤反击只打其他玩家。开局发放极寒风暴、大雪球和极寒。</p> : null}
      <ol className="mt-3 space-y-3">{abilities.map((ability) => <li key={ability.id} className="min-w-0 border-t border-gray-100 pt-2">
        <span className="text-xs font-semibold text-teal-800">{ability.id}</span>
        {lostAbilityIds?.includes(ability.id) ? <span className="ml-2 text-xs text-amber-800">已永久失去</span> : null}
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">{displayedAbilityDescription(ability)}</p>
        {counters?.[ability.id]?.map((counter, index) => (
          <p key={index} className="mt-1 break-words text-xs font-semibold text-teal-800">{counter}</p>
        ))}
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-medium text-teal-800">展示已实现效果</summary>
          <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{ability.implementedRules ?? "技能 ID 对照表暂无此项的已实现规则。"}</p>
        </details>
      </li>)}</ol>
    </details>
  );
}
