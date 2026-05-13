import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { PublicGameState, getSkill } from "@bing/shared";

interface SkillPanelProps {
  state: PublicGameState;
}

export function SkillPanel({ state }: SkillPanelProps) {
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const [activeSkillIds, setActiveSkillIds] = useState<Set<string>>(() => new Set());
  const lastRevealId = useRef<string | null>(null);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const reveal = [...state.eventLog]
      .reverse()
      .find((event) => event.type === "turn_revealed");
    if (!reveal || reveal.id === lastRevealId.current) {
      return;
    }

    lastRevealId.current = reveal.id;
    const usedSkillIds =
      reveal.actions[viewer.id]?.actions
        .filter((action) => action.type === "skill")
        .map((action) => action.skillId) ?? [];
    if (usedSkillIds.length === 0) {
      return;
    }

    setActiveSkillIds(new Set(usedSkillIds));
    const timeout = window.setTimeout(() => setActiveSkillIds(new Set()), 2200);
    return () => window.clearTimeout(timeout);
  }, [state.eventLog, viewer]);

  if (!viewer || viewer.skills.length === 0) {
    return null;
  }

  return (
    <section className="surface-card skill-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-teal-700" aria-hidden="true" />
        <h2 className="text-base font-semibold text-gray-900">你的技能</h2>
      </div>
      <div className="space-y-2">
        {viewer.skills.map((skillId) => {
          const skill = getSkill(skillId);
          const timing = (skill as { timing?: string } | undefined)?.timing;
          return (
            <div
              key={skillId}
              className={[
                "skill-list-item",
                skill ? skillToneClass(skill) : "",
                activeSkillIds.has(skillId) ? "skill-used-flash" : ""
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-gray-900">{skill?.name ?? skillId}</div>
                {skill ? <span className="skill-power-badge">{skillPowerLabel(skill)}</span> : null}
              </div>
              {timing ? (
                <div className="mt-1 text-xs font-black text-teal-700">{timing}</div>
              ) : null}
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {skill?.description ?? "技能效果待接入。"}
              </p>
              {skill?.play ? (
                <p className="mt-2 text-xs font-black text-teal-700">
                  可在出招面板主动施放。
                </p>
              ) : !skill?.implemented ? (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  当前为展示/抽卡阶段，复杂效果会逐张接入结算引擎。
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
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
