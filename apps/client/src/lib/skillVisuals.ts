import { CSSProperties } from "react";
import { SkillDefinition } from "@bing/shared";

export type SkillAffinity =
  | "ember"
  | "frost"
  | "storm"
  | "venom"
  | "ward"
  | "vital"
  | "void"
  | "relic";

export interface SkillVisualProfile {
  affinity: SkillAffinity;
  border: string;
  glow: string;
  ink: string;
  label: string;
  sigil: string;
  surface: string;
}

const AFFINITY_VISUALS: Record<SkillAffinity, SkillVisualProfile> = {
  ember: {
    affinity: "ember",
    border: "#e76f2f",
    glow: "rgba(255, 118, 54, 0.52)",
    ink: "#ffd5a1",
    label: "焰印遗物",
    sigil: "焰",
    surface: "rgba(77, 30, 18, 0.92)"
  },
  frost: {
    affinity: "frost",
    border: "#7dd3fc",
    glow: "rgba(125, 211, 252, 0.48)",
    ink: "#d8f5ff",
    label: "霜印遗物",
    sigil: "霜",
    surface: "rgba(16, 47, 62, 0.92)"
  },
  storm: {
    affinity: "storm",
    border: "#facc15",
    glow: "rgba(250, 204, 21, 0.45)",
    ink: "#fff2a7",
    label: "雷印遗物",
    sigil: "雷",
    surface: "rgba(63, 49, 17, 0.92)"
  },
  venom: {
    affinity: "venom",
    border: "#84cc16",
    glow: "rgba(132, 204, 22, 0.42)",
    ink: "#d9f99d",
    label: "蚀印遗物",
    sigil: "蚀",
    surface: "rgba(31, 57, 26, 0.92)"
  },
  ward: {
    affinity: "ward",
    border: "#93c5fd",
    glow: "rgba(147, 197, 253, 0.42)",
    ink: "#dbeafe",
    label: "盾印遗物",
    sigil: "盾",
    surface: "rgba(21, 44, 71, 0.92)"
  },
  vital: {
    affinity: "vital",
    border: "#fb7185",
    glow: "rgba(251, 113, 133, 0.44)",
    ink: "#ffe4e6",
    label: "命印遗物",
    sigil: "命",
    surface: "rgba(70, 28, 45, 0.92)"
  },
  void: {
    affinity: "void",
    border: "#c084fc",
    glow: "rgba(192, 132, 252, 0.45)",
    ink: "#f3e8ff",
    label: "虚印遗物",
    sigil: "虚",
    surface: "rgba(42, 32, 64, 0.94)"
  },
  relic: {
    affinity: "relic",
    border: "#c9b27c",
    glow: "rgba(201, 178, 124, 0.42)",
    ink: "#f8edd2",
    label: "渊印遗物",
    sigil: "遗",
    surface: "rgba(52, 45, 32, 0.94)"
  }
};

export function getSkillVisualProfile(
  skill: SkillDefinition | undefined,
  skillId: string
): SkillVisualProfile {
  const text = [
    skill?.id ?? skillId,
    skill?.name,
    skill?.description,
    skill?.timing,
    skill?.tags.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (containsAny(text, ["火", "炎", "lava", "fire", "burn"])) {
    return AFFINITY_VISUALS.ember;
  }
  if (containsAny(text, ["冰", "霜", "雪", "frost", "ice", "winter"])) {
    return AFFINITY_VISUALS.frost;
  }
  if (containsAny(text, ["电", "雷", "storm", "thunder", "electric"])) {
    return AFFINITY_VISUALS.storm;
  }
  if (containsAny(text, ["毒", "venom", "poison"])) {
    return AFFINITY_VISUALS.venom;
  }
  if (containsAny(text, ["防", "盾", "守", "护", "免疫", "shield", "ward"])) {
    return AFFINITY_VISUALS.ward;
  }
  if (containsAny(text, ["血", "治疗", "复活", "heal", "life"])) {
    return AFFINITY_VISUALS.vital;
  }
  if (containsAny(text, ["死", "影", "鬼", "裂魂", "curse", "void", "death"])) {
    return AFFINITY_VISUALS.void;
  }

  const fallbackOrder: SkillAffinity[] = [
    "relic",
    "ward",
    "void",
    "ember",
    "frost",
    "storm",
    "vital",
    "venom"
  ];
  const index = stableIndex(skillId, fallbackOrder.length);
  return AFFINITY_VISUALS[fallbackOrder[index]!];
}

export function skillCardStyle(profile: SkillVisualProfile) {
  return {
    "--skill-border": profile.border,
    "--skill-glow": profile.glow,
    "--skill-ink": profile.ink,
    "--skill-surface": profile.surface
  } as CSSProperties;
}

export function skillCostPipCount(skill: SkillDefinition | undefined): number {
  if (!skill) {
    return 1;
  }

  const playCost = skill.play?.cost ?? 1;
  const fusionBonus = skill.fusion.trim() ? 1 : 0;
  const passiveBonus = skill.play ? 0 : 1;
  return Math.min(7, Math.max(1, playCost + fusionBonus + passiveBonus));
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function stableIndex(value: string, modulo: number): number {
  if (modulo <= 0) {
    return 0;
  }
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % modulo;
}
