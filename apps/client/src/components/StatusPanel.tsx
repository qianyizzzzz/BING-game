import type { PublicGameState } from "@bing/shared";

const groups = [
  ["elements", "元素"],
  ["defense", "防御值和护盾"],
  ["longTerm", "长期状态"],
  ["limited", "限定技和限定次数技"],
  ["marks", "印记"],
  ["items", "其他物品"]
] as const;

export function StatusPanel({ state }: { state: PublicGameState }) {
  const overview = state.statusOverview;
  return (
    <section id="status-panel" className="surface-card space-y-2 p-3" aria-label="我的状态" data-testid="status-panel">
      {groups.map(([key, title]) => (
        <details key={key} className="rounded-lg border border-gray-200 p-2 text-sm">
          <summary className="cursor-pointer font-semibold">{title}</summary>
          {overview?.[key].length ? (
            <dl className="mt-2 space-y-2">
              {overview[key].map(({ label, value }, index) => (
                <div key={`${label}:${index}`} className="flex flex-wrap justify-between gap-x-3 border-t border-gray-200 pt-1.5">
                  <dt>{label}</dt><dd className="text-teal-800">{value}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="mt-2 text-gray-500">{overview ? "暂无" : "开局后显示自己的状态"}</p>}
        </details>
      ))}
    </section>
  );
}
