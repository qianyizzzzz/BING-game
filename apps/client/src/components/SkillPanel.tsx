import { useEffect, useRef, useState } from "react";
import { Gem, Sparkles } from "lucide-react";
import {
  PublicGameState,
  SKILL_TIMING_PHASE_LABELS,
  getSkill
} from "@bing/shared";
import { getSkillVisualProfile, skillCardStyle, skillCostPipCount } from "../lib/skillVisuals";

interface SkillPanelProps {
  state: PublicGameState;
}

export function SkillPanel({ state }: SkillPanelProps) {
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const [activeSkillIds, setActiveSkillIds] = useState<Set<string>>(() => new Set());
  const lastFlashEventId = useRef<string | null>(null);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const skillEvent = [...state.eventLog]
      .reverse()
      .find(
        (event) =>
          (event.type === "skill_used" && event.playerId === viewer.id) ||
          event.type === "turn_revealed"
      );
    if (!skillEvent || skillEvent.id === lastFlashEventId.current) {
      return;
    }

    const usedSkillIds =
      skillEvent.type === "skill_used"
        ? [skillEvent.skillId]
        : skillEvent.type === "turn_revealed"
          ? skillEvent.actions[viewer.id]?.actions
            .filter((action) => action.type === "skill")
            .map((action) => action.skillId) ?? []
          : [];
    if (usedSkillIds.length === 0) {
      return;
    }

    lastFlashEventId.current = skillEvent.id;
    setActiveSkillIds(new Set(usedSkillIds));
    const timeout = window.setTimeout(() => setActiveSkillIds(new Set()), 2200);
    return () => window.clearTimeout(timeout);
  }, [state.eventLog, viewer]);

  if (!viewer || viewer.skills.length === 0) {
    return null;
  }

  return (
    <section className="surface-card skill-card skill-gallery-panel p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-black text-gray-950">技能画廊</h2>
            <p className="mt-0.5 text-xs font-semibold text-gray-500">
              本局技能像展签一样陈列，刚触发的卡会出现颜料高亮。
            </p>
          </div>
        </div>
        <span className="skill-panel-count">{viewer.skills.length} 张展品</span>
      </div>

      <div className="skill-gallery">
        {viewer.skills.map((skillId) => {
          const skill = getSkill(skillId);
          const visual = getSkillVisualProfile(skill, skillId);
          const phaseLabels =
            skill?.timingPhases
              .slice(0, 3)
              .map((phase) => SKILL_TIMING_PHASE_LABELS[phase]) ?? [];
          const playSummary = skill ? formatPlaySummary(skill) : "";

          return (
            <article
              key={skillId}
              className={[
                "skill-list-item",
                "skill-relic-card",
                `skill-affinity-${visual.affinity}`,
                skill ? skillToneClass(skill) : "",
                activeSkillIds.has(skillId) ? "skill-used-flash" : ""
              ].join(" ")}
              style={skillCardStyle(visual)}
            >
              <div className="skill-relic-topline">
                <span>{visual.label}</span>
                {skill ? <span className="skill-power-badge">{skillPowerLabel(skill)}</span> : null}
              </div>

              <div className="skill-relic-art" aria-hidden="true">
                <span className="skill-relic-etch skill-relic-etch-a" />
                <span className="skill-relic-etch skill-relic-etch-b" />
                <span className="skill-relic-halo" />
                <span className="skill-relic-crest">
                  <Gem className="skill-relic-gem" />
                  <span className="skill-relic-crest-mark" />
                </span>
                <span className="skill-relic-specimen">
                  #{skill?.sourceRow ?? visual.sigil}
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

              <h3 className="skill-relic-name" title={skill?.name ?? skillId}>
                {skill?.name ?? skillId}
              </h3>

              {phaseLabels.length > 0 ? (
                <div className="skill-stage-strip mt-2">
                  {phaseLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              ) : null}

              {skill?.timing ? (
                <div className="skill-relic-timing mt-2">{skill.timing}</div>
              ) : null}

              <p className="skill-relic-description mt-2">
                {skill?.description ?? "技能效果待接入。"}
              </p>

              {playSummary ? (
                <div className="skill-relic-stats" aria-label="技能出牌参数">
                  {playSummary}
                </div>
              ) : null}

              {skill?.tags.length ? (
                <div className="skill-relic-tags">
                  {skill.tags.slice(0, 2).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}

              {skill?.play ? (
                <p className="skill-relic-note">
                  可在出招面板主动施放。
                </p>
              ) : !skill?.implemented ? (
                <p className="skill-relic-note skill-relic-note-muted">
                  展示阶段，复杂效果会逐步接入结算引擎。
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatPlaySummary(skill: NonNullable<ReturnType<typeof getSkill>>): string {
  const play = skill.play;
  if (!play) {
    return "";
  }

  const parts = [`消耗 ${play.cost}`];
  if (play.power !== undefined) {
    parts.push(`威力 ${play.power}`);
  }
  if (play.level !== undefined) {
    parts.push(`等级 ${play.level}`);
  }
  if (play.maxStacks > 1) {
    parts.push(`可叠 ${play.maxStacks}`);
  }
  if (play.targetMode === "all") {
    parts.push("全场");
  }
  return parts.join(" / ");
}

function skillToneClass(skill: NonNullable<ReturnType<typeof getSkill>>): string {
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

function skillPowerLabel(skill: NonNullable<ReturnType<typeof getSkill>>): string {
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

function skillPowerScore(skill: NonNullable<ReturnType<typeof getSkill>>): number {
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
