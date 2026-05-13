import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import {
  ATTACK_ORDER,
  BASE_ATTACKS,
  DEFENSE_LABELS,
  DEFENSE_TAG_LABELS,
  getAllSkills
} from "@bing/shared";

type Tab = "attacks" | "skills" | "attributes";

export function ReferencePanel() {
  const [tab, setTab] = useState<Tab>("attacks");
  const [query, setQuery] = useState("");
  const skills = useMemo(() => getAllSkills(), []);
  const filteredSkills = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) {
      return skills.slice(0, 12);
    }

    return skills
      .filter((skill) =>
        `${skill.name} ${skill.description} ${skill.tags.join(" ")}`.includes(normalized)
      )
      .slice(0, 20);
  }, [query, skills]);

  return (
    <section className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-gray-900">资料</h2>
        </div>
        <div className="segmented-control">
          <button
            className={tabClass(tab === "attacks")}
            onClick={() => setTab("attacks")}
            type="button"
          >
            招式
          </button>
          <button
            className={tabClass(tab === "skills")}
            onClick={() => setTab("skills")}
            type="button"
          >
            技能
          </button>
          <button
            className={tabClass(tab === "attributes")}
            onClick={() => setTab("attributes")}
            type="button"
          >
            属性
          </button>
        </div>
      </div>

      {tab === "attacks" ? (
        <div className="overflow-auto">
          <table className="reference-table w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="py-2 pr-3 font-medium">名称</th>
                <th className="py-2 pr-3 font-medium">饼</th>
                <th className="py-2 pr-3 font-medium">攻</th>
                <th className="py-2 pr-3 font-medium">级</th>
                <th className="py-2 pr-3 font-medium">防御</th>
              </tr>
            </thead>
            <tbody>
              {ATTACK_ORDER.map((id) => {
                const attack = BASE_ATTACKS[id];
                return (
                  <tr key={id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-semibold text-gray-800">
                      {attack.name}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{attack.cost}</td>
                    <td className="py-2 pr-3 text-gray-600">
                      {attack.power === "infinity" ? "∞" : attack.power}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{attack.level}</td>
                    <td className="py-2 pr-3 text-gray-600">
                      {DEFENSE_TAG_LABELS[attack.defenseTag]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : tab === "skills" ? (
        <div>
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              className="soft-input search-input w-full text-sm"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`搜索 ${skills.length} 个技能`}
              value={query}
            />
          </label>
          <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className={["skill-list-item", skillToneClass(skill)].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">{skill.name}</span>
                  <span className="skill-power-badge">{skillPowerLabel(skill)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="reference-chip">{categoryLabel(skill.category)}</span>
                  <span className="reference-chip">{playLabel(skill)}</span>
                  <span className="reference-chip">#{skill.sourceRow}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {skill.description || "无"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="reference-info-grid">
            <InfoBlock title="防御标签" text="小防防、油条防、石头防要求对应防御；任意防三种基础防都能挡；饼防只能出饼挡；无法防只能靠反弹或特殊技能处理。" />
            <InfoBlock title="攻击等级" text="攻击对撞时先比等级。等级高者按差值公式造成伤害，等级相同互相抵消。" />
            <InfoBlock title="元素" text="火、电、冰、毒等属性会被部分技能引用。当前基础版先记录属性，后续扩展会继续接入元素联动。" />
            <InfoBlock title="技能类型" text="主动技能会出现在出招面板；锁定技自动生效；控制技和限定技会逐步接入更完整的时机系统。" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(DEFENSE_LABELS).map(([id, label]) => (
              <div key={id} className="attribute-row">
                <strong>{label}</strong>
                <span>{id === "rebound" ? "消耗所有饼，转移非破弹基础攻击" : "基础防御，不消耗饼"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function tabClass(active: boolean): string {
  return [
    "rounded-md px-3 py-1 transition",
    active ? "bg-teal-700 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
  ].join(" ");
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="reference-info-block">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function skillToneClass(skill: ReturnType<typeof getAllSkills>[number]): string {
  const score = skillPowerScore(skill);
  if (score >= 7) {
    return "skill-tone-legendary";
  }
  if (score >= 5) {
    return "skill-tone-epic";
  }
  if (score >= 3) {
    return "skill-tone-rare";
  }
  return "skill-tone-common";
}

function skillPowerLabel(skill: ReturnType<typeof getAllSkills>[number]): string {
  const score = skillPowerScore(skill);
  if (score >= 7) {
    return "传说";
  }
  if (score >= 5) {
    return "强";
  }
  if (score >= 3) {
    return "中";
  }
  return "基础";
}

function skillPowerScore(skill: ReturnType<typeof getAllSkills>[number]): number {
  let score = 0;
  if (skill.play?.kind === "attack") {
    score += (skill.play.power ?? 0) + Math.ceil((skill.play.level ?? 0) / 2);
  }
  if (skill.play?.kind === "resource") {
    score += 4;
  }
  if (skill.description.includes("破弹") || skill.description.includes("无法防")) {
    score += 2;
  }
  if (skill.description.includes("锁定技")) {
    score += 1;
  }
  if (skill.description.includes("死亡") || skill.description.includes("复活")) {
    score += 2;
  }
  if (skill.fusion.trim()) {
    score += 3;
  }
  return score;
}

function categoryLabel(category: ReturnType<typeof getAllSkills>[number]["category"]): string {
  const labels = {
    attack: "攻击",
    control: "控制",
    king_card: "王者",
    limited: "限定",
    locked: "锁定",
    passive: "被动",
    raw: "普通"
  } satisfies Record<ReturnType<typeof getAllSkills>[number]["category"], string>;
  return labels[category];
}

function playLabel(skill: ReturnType<typeof getAllSkills>[number]): string {
  if (skill.play?.kind === "attack") {
    return `可施放 · ${skill.play.cost}饼`;
  }
  if (skill.play?.kind === "resource") {
    return `资源 · ${skill.play.cost}饼`;
  }
  return skill.implemented ? "自动生效" : "待接入";
}
