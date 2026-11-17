import { getVisibleStatusOverview, type PublicGameState } from "@bing/shared";
import { PanelPlayerPicker, usePanelPlayer } from "./PanelPlayerPicker";

const groups = [
  ["elements", "元素"],
  ["lives", "命"],
  ["defense", "防御值和护盾"],
  ["field", "场地效果"],
  ["special", "特殊状态"],
  ["longTerm", "长期状态"],
  ["counted", "次数状态"],
  ["limited", "限定技和限定次数技"],
  ["marks", "印记"],
  ["items", "其他物品"],
  ["space", "所处空间"],
  ["progressBars", "进度条与计数条"],
  ["continuations", "持续性出招"]
] as const;

export function StatusPanel({ state }: { state: PublicGameState }) {
  const picker = usePanelPlayer(state);
  const overview = picker.player ? getVisibleStatusOverview(state, picker.player.id) : undefined;
  const isOwn = picker.player?.id === picker.viewerId;

  return (
    <section id="status-panel" className="surface-card space-y-2 p-3" aria-label="玩家状态" data-testid="status-panel">
      <PanelPlayerPicker {...picker} />
      {groups.map(([key, title]) => (
        <details key={key} className="rounded-lg border border-gray-200 p-2 text-sm">
          <summary className="cursor-pointer font-semibold">{title}</summary>
          {overview?.[key].length ? (
            <dl className="mt-2 space-y-2">
              {overview[key].map(({ label, value, meter }, index) => (
                <div key={`${label}:${index}`} className="flex flex-wrap justify-between gap-x-3 border-t border-gray-200 pt-1.5">
                  <dt>{label}</dt><dd className="text-teal-800">{value}</dd>
                  {meter ? <dd className="w-full"><progress aria-label={label} className="h-2 w-full"
                    max={meter.limit} value={meter.value} /></dd> : null}
                </div>
              ))}
            </dl>
          ) : <p className="mt-2 text-gray-500">{!overview ? "开局后显示玩家状态" :
            key === "limited" && !isOwn ? "暂无公开的使用记录" : "暂无"}</p>}
        </details>
      ))}
    </section>
  );
}
