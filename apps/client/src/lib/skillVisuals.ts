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
    border: "#d56d3c",
    glow: "rgba(213, 109, 60, 0.22)",
    ink: "#62321f",
    label: "暖色颜料",
    sigil: "火",
    surface: "#fff3df"
  },
  frost: {
    affinity: "frost",
    border: "#78a9b8",
    glow: "rgba(120, 169, 184, 0.2)",
    ink: "#244d58",
    label: "冷色颜料",
    sigil: "冰",
    surface: "#edf7f7"
  },
  storm: {
    affinity: "storm",
    border: "#c4a342",
    glow: "rgba(196, 163, 66, 0.22)",
    ink: "#655019",
    label: "闪光颜料",
    sigil: "电",
    surface: "#fff6d8"
  },
  venom: {
    affinity: "venom",
    border: "#83a45a",
    glow: "rgba(131, 164, 90, 0.2)",
    ink: "#41562b",
    label: "绿色颜料",
    sigil: "毒",
    surface: "#f1f7df"
  },
  ward: {
    affinity: "ward",
    border: "#7c9bb3",
    glow: "rgba(124, 155, 179, 0.2)",
    ink: "#334f62",
    label: "防护展签",
    sigil: "盾",
    surface: "#eff5f8"
  },
  vital: {
    affinity: "vital",
    border: "#c98286",
    glow: "rgba(201, 130, 134, 0.2)",
    ink: "#6c3f43",
    label: "生命颜料",
    sigil: "生",
    surface: "#fff0ed"
  },
  void: {
    affinity: "void",
    border: "#9b8ab8",
    glow: "rgba(155, 138, 184, 0.2)",
    ink: "#514565",
    label: "暗色颜料",
    sigil: "影",
    surface: "#f3f0f6"
  },
  relic: {
    affinity: "relic",
    border: "#c9b27c",
    glow: "rgba(201, 178, 124, 0.2)",
    ink: "#5d4c2c",
    label: "普通展品",
    sigil: "技",
    surface: "#fbf4e4"
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

  if (containsAny(text, ["火", "炎", "燃", "lava", "fire", "burn"])) {
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
  if (containsAny(text, ["死", "影", "魂", "裂魂", "curse", "void", "death"])) {
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
