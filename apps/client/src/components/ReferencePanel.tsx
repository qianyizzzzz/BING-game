import { useMemo, useState } from "react";
import { BookOpen, Gem, Search, Sparkles } from "lucide-react";
import {
  ATTACK_ORDER,
  BASE_ATTACKS,
  DEFENSE_LABELS,
  DEFENSE_TAG_LABELS,
  getAllSkills
} from "@bing/shared";
import { getSkillVisualProfile, skillCardStyle, skillCostPipCount } from "../lib/skillVisuals";

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
        <div className="reference-gallery reference-attack-gallery">
          {ATTACK_ORDER.map((id) => {
            const attack = BASE_ATTACKS[id];
            return (
              <article className="reference-exhibit-card reference-attack-card" key={id}>
                <div className="reference-card-topline">
                  <span>{DEFENSE_TAG_LABELS[attack.defenseTag]}</span>
                  <span>{attack.cost} 饼</span>
                </div>
                <div className="reference-attack-mark" aria-hidden="true">
                  {attack.power === "infinity" ? "∞" : attack.power}
                </div>
                <h3>{attack.name}</h3>
                <div className="reference-card-meta">
                  <span>攻击 {attack.power === "infinity" ? "无限" : attack.power}</span>
                  <span>等级 {attack.level}</span>
                </div>
                <p>
                  需要用 {DEFENSE_TAG_LABELS[attack.defenseTag]} 处理。出招时先看饼耗，再看攻与级的对撞关系。
                </p>
              </article>
            );
          })}
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
          <div className="reference-skill-gallery mt-3 max-h-[34rem] overflow-auto pr-1">
            {filteredSkills.map((skill) => (
              <ReferenceSkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="reference-gallery reference-info-grid">
            <InfoBlock title="防御标签" text="小防防、油条防、石头防要求对应防御；任意防三种基础防都能挡；饼防只能出饼挡；无法防只能靠反弹或特殊技能处理。" />
            <InfoBlock title="攻击等级" text="攻击对撞时先比等级。等级高者按差值公式造成伤害，等级相同互相抵消。" />
            <InfoBlock title="元素" text="火、电、冰、毒等属性会被部分技能引用。当前基础版先记录属性，后续扩展会继续接入元素联动。" />
            <InfoBlock title="技能类型" text="主动技能会出现在出招面板；锁定技自动生效；控制技和限定技会逐步接入更完整的时机系统。" />
          </div>
          <div className="reference-gallery reference-defense-gallery">
            {Object.entries(DEFENSE_LABELS).map(([id, label]) => (
              <div key={id} className="attribute-row">
                <strong>{label}</strong>
                <span>
                  {id === "rebound"
                    ? "消耗所有饼，转移非破弹基础攻击"
                    : id === "self_destruct"
                      ? "无目标，立即重开本轮并承受自爆惩罚"
                      : "基础防御，不消耗饼"}
                </span>
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
    "reference-tab-button",
    active ? "reference-tab-button-active" : ""
  ].join(" ");
}

function ReferenceSkillCard({ skill }: { skill: ReturnType<typeof getAllSkills>[number] }) {
  const visual = getSkillVisualProfile(skill, skill.id);

  return (
    <article
      className={[
        "skill-list-item",
        "skill-relic-card",
        "reference-skill-card",
        `skill-affinity-${visual.affinity}`,
        skillToneClass(skill)
      ].join(" ")}
      style={skillCardStyle(visual)}
    >
      <div className="skill-relic-topline">
        <span>{visual.label}</span>
        <span className="skill-power-badge">{skillPowerLabel(skill)}</span>
      </div>
      <div className="skill-relic-art reference-skill-art" aria-hidden="true">
        <span className="skill-relic-etch skill-relic-etch-a" />
        <span className="skill-relic-etch skill-relic-etch-b" />
        <span className="skill-relic-halo" />
        <span className="skill-relic-crest">
          <Gem className="skill-relic-gem" />
          <span className="skill-relic-crest-mark" />
        </span>
        <span className="skill-relic-specimen">
          SPEC-{skill.sourceRow}
        </span>
        <span className="skill-relic-cost-track">
          {Array.from({ length: skillCostPipCount(skill) }).map((_, index) => (
            <span key={index} className="skill-relic-cost-pip" />
          ))}
        </span>
        <span className="skill-relic-energy-bar">
          <span />
        </span>
        <strong>{visual.sigil}</strong>
      </div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="skill-relic-name">{skill.name}</h3>
        {skill.fusion.trim() ? (
          <Sparkles className="mt-1 h-4 w-4 flex-none" aria-hidden="true" />
        ) : null}
      </div>
      <div className="skill-relic-tags">
        <span>{categoryLabel(skill.category)}</span>
        <span>{playLabel(skill)}</span>
        <span>#{skill.sourceRow}</span>
      </div>
      <p className="skill-relic-description">{skill.description || "无"}</p>
    </article>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="reference-exhibit-card reference-info-block">
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
