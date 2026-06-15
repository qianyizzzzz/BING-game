import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../packages/shared/src/skills/registry";
import type { SkillDefinition, SkillPlayDefinition } from "../packages/shared/src/skills/types";

interface EffectArchetype {
  color: string;
  motion: string;
  name: string;
  seedanceCore: string;
  texture: string;
}

interface SkillVisualPlan {
  archetype: EffectArchetype;
  implementationStatus: string;
  mechanicCue: string;
  playSummary: string;
  triggerSummary: string;
}

interface EffectAssetStatus {
  complete: boolean;
  existing: string[];
  missing: string[];
}

const outputPath = path.resolve("docs/EFFECT_ANIMATION_SPEC.md");
const promptManifestPath = path.resolve("docs/EFFECT_ANIMATION_PROMPTS.json");
const effectRoot = path.resolve("apps/client/public/assets/effects");
const requiredAssetFiles = [
  "keyframe-01.png",
  "keyframe-02.png",
  "keyframe-03.png",
  "keyframe-04.png",
  "poster.png",
  "effect.webm",
  "effect.mp4"
];

const skills = getAllSkills().sort(
  (a, b) => a.sourceRow - b.sourceRow || a.id.localeCompare(b.id)
);

const archetypes: Record<string, EffectArchetype> = {
  attack_fire: {
    name: "火焰油彩攻击",
    color: "镉红、朱砂橙、少量焦黑",
    texture: "厚涂油彩、热蜡裂纹、透明亚克力反光",
    motion: "红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕",
    seedanceCore:
      "fiery cadmium red and orange oil paint splash, painterly impasto, warm transparent acrylic reflections"
  },
  attack_ice: {
    name: "冰霜蛋彩攻击",
    color: "雾蓝、灰白、淡青",
    texture: "冷色蛋彩、薄涂刮痕、冰晶状颜料边缘",
    motion: "淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂",
    seedanceCore:
      "pale blue ice-tempera paint streak, frost flower burst, delicate cold pigment scratches"
  },
  attack_electric: {
    name: "电流金属线绘",
    color: "柠檬黄、钴蓝、石墨黑",
    texture: "细金属线、亮黄油彩点、透明导线反光",
    motion: "细线绷紧并抖动，黄色颜料沿线路跳跃，命中时产生短促星状飞溅",
    seedanceCore:
      "thin metal wire vibration with lemon yellow oil paint sparks and cobalt blue pigment"
  },
  attack_poison: {
    name: "毒性绿墨腐蚀",
    color: "铜绿、深青、暗黄",
    texture: "稀释油墨、腐蚀边缘、潮湿透明颜料",
    motion: "绿黑颜料在桌面上蔓延并腐蚀边缘，命中后产生气泡状扩散，末尾沉积成暗色边线",
    seedanceCore:
      "verdigris green diluted oil ink corrosion, damp pigment bloom, translucent toxic edge"
  },
  attack_physical: {
    name: "红色油彩冲击",
    color: "深红、赭石、少量黑色",
    texture: "厚涂红色油彩、刮刀痕、画布颗粒",
    motion: "红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射",
    seedanceCore:
      "deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation"
  },
  defense: {
    name: "透明防御波纹",
    color: "青绿、乳白、透明灰",
    texture: "透明亚克力、水波、薄油膜",
    motion: "青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹",
    seedanceCore:
      "teal translucent acrylic ripple shield, soft oil film, museum installation lighting"
  },
  heal: {
    name: "暖白治愈晕染",
    color: "暖白、淡黄、浅粉",
    texture: "柔软油彩晕染、薄纱状透明颜料",
    motion: "暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布",
    seedanceCore:
      "warm white and pale yellow oil paint bloom, gentle healing pigment spreading on canvas"
  },
  resource: {
    name: "餐桌资源沉积",
    color: "蜂蜜黄、面包金、浅棕",
    texture: "厚涂面包屑、蜂蜜状颜料、餐桌油彩",
    motion: "金色颜料像食物碎屑落入盘面，聚成一枚柔软资源印记",
    seedanceCore:
      "honey yellow oil paint crumbs settling into a shared dining plate, painterly resource gain"
  },
  control: {
    name: "石墨线控场",
    color: "石墨黑、灰蓝、少量青绿",
    texture: "细金属支架线、铅笔线稿、透明胶片",
    motion: "石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开",
    seedanceCore:
      "graphite linework and thin metal rods constricting, transparent installation control effect"
  },
  void: {
    name: "墨色虚空裂隙",
    color: "蓝黑、紫灰、象牙白",
    texture: "稀释油墨、刮擦裂纹、半透明烟状颜料",
    motion: "蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合",
    seedanceCore:
      "blue black diluted oil ink fissure, violet gray smoke pigment, canvas scratch texture"
  },
  reroll: {
    name: "重获颜料旋涡",
    color: "青绿、红、黄、蓝混合",
    texture: "旋转调色盘、透明圆盘、油彩涡流",
    motion: "多色颜料绕透明圆盘旋转，重组为新的小色块，最后定格",
    seedanceCore:
      "multicolor oil paint whirlpool on transparent acrylic plate, reroll transformation"
  },
  transform: {
    name: "沙化变形",
    color: "沙黄、米白、赭石",
    texture: "砂质油彩、颗粒化笔触、半透明尘雾",
    motion: "米黄色颜料粒子从中心散开，重新聚合成新的纹理印记",
    seedanceCore:
      "sand colored oil paint particles dissolving and reforming, granular brush texture"
  },
  passive: {
    name: "被动触发印记",
    color: "象牙白、石墨灰、低饱和青绿",
    texture: "薄涂标记、透明标签、细线装置",
    motion: "细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出",
    seedanceCore:
      "subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag"
  },
  neutral: {
    name: "中性无效波纹",
    color: "乳白、灰蓝、少量淡金",
    texture: "薄油膜、透明玻璃反光、柔软画布颗粒",
    motion: "浅色油膜轻轻展开后收束，不制造强攻击感，作为无直接效果或空技能反馈",
    seedanceCore:
      "neutral ivory oil film ripple, translucent acrylic reflection, quiet painterly feedback"
  }
};

const playableCount = skills.filter((skill) => skill.play).length;
const noPlayCount = skills.length - playableCount;

const doc = [
  "# BING 全技能特效动画生成规格",
  "",
  `生成时间：${new Date().toISOString()}`,
  "",
  "本文件由 `scripts/generate-effect-animation-spec.ts` 从真实技能注册表生成，覆盖全部技能，而不是只覆盖可主动播放的技能。",
  "",
  "## 目标",
  "",
  "- 为全部技能建立 imagegen 关键帧提示词与 Seedance 补帧动画提示词。",
  "- 主动技能、攻击技能、资源技能、控制技能必须进入正式特效资产生产。",
  "- 未接入 `play` 的锁定/被动技能也必须有触发提示、状态印记或无效反馈动画，避免技能表现缺口。",
  "- 所有资产统一为油画感、透明亚克力装置、共餐实验装置风格，替换现有硬几何图形和浮层素材。",
  "",
  "## 全局风格",
  "",
  "- 统一采用油画、蛋彩、画布肌理、透明亚克力装置、细金属支架、共餐实验装置视觉。",
  "- 禁止圆形 SVG、硬边几何光效、电竞霓虹、深色科幻 HUD、塑料玩具感。",
  "- 每个技能输出 4 张关键帧：`keyframe-01.png`、`keyframe-02.png`、`keyframe-03.png`、`keyframe-04.png`。",
  "- Seedance 输出：`effect.webm`、`effect.mp4`、`poster.png`。",
  "- 动画时长建议 0.8-1.6 秒，30fps，首尾可循环但不强制循环。",
  "- 所有动画不得遮挡 HP、饼数、目标线和提交状态超过 500ms。",
  "",
  "## Seedance MCP 配置",
  "",
  "- Codex 用户配置已新增 `mcp_servers.seedance`，使用 `uvx mcp-seedance` 启动。",
  "- 运行前需要在系统环境变量中提供 `ACEDATACLOUD_API_TOKEN`。",
  "- 配置变更通常需要重启 Codex 或新开会话，工具列表才会刷新出 Seedance MCP。",
  "",
  "## 资产目录规范",
  "",
  "```text",
  "apps/client/public/assets/effects/{skillId}/keyframe-01.png",
  "apps/client/public/assets/effects/{skillId}/keyframe-02.png",
  "apps/client/public/assets/effects/{skillId}/keyframe-03.png",
  "apps/client/public/assets/effects/{skillId}/keyframe-04.png",
  "apps/client/public/assets/effects/{skillId}/poster.png",
  "apps/client/public/assets/effects/{skillId}/effect.webm",
  "apps/client/public/assets/effects/{skillId}/effect.mp4",
  "```",
  "",
  "## 技能总表",
  "",
  `总计 ${skills.length} 个技能；已接入 play 的技能 ${playableCount} 个；未接入 play 但仍需视觉反馈的技能 ${noPlayCount} 个。`,
  "",
  "| 技能 | 名称 | 分类 | 播放状态 | 视觉原型 | 资产状态 | 资产目录 |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...skills.map((skill) => {
    const plan = planSkill(skill);
    const assetStatus = getEffectAssetStatus(skill);
    return `| \`${skill.id}\` | ${safeCell(skill.name)} | ${skill.category} | ${safeCell(plan.implementationStatus)} | ${safeCell(plan.archetype.name)} | ${assetStatus.existing.length}/${requiredAssetFiles.length} | \`apps/client/public/assets/effects/${skill.id}/\` |`;
  }),
  "",
  "## 逐技能规格",
  "",
  ...skills.flatMap(renderSkillSpec)
].join("\n");

const promptManifest = {
  assetContract: {
    files: requiredAssetFiles,
    root: "apps/client/public/assets/effects/{skillId}/"
  },
  generatedAt: new Date().toISOString(),
  source: "scripts/generate-effect-animation-spec.ts",
  style: {
    avoid:
      "hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles",
    medium:
      "hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto",
    readability:
      "do not cover HP, resource counters, target lines, or submit status for more than 500ms"
  },
  skills: skills.map((skill) => {
    const plan = planSkill(skill);
    return {
      archetype: plan.archetype.name,
      assetDir: `apps/client/public/assets/effects/${skill.id}/`,
      category: skill.category,
      description: skill.description,
      implementationStatus: plan.implementationStatus,
      currentAssets: getEffectAssetStatus(skill),
      keyframes: [1, 2, 3, 4].map((index) => ({
        file: `keyframe-0${index}.png`,
        phase: keyframePhase(index),
        prompt: buildImagePrompt(skill, plan, index)
      })),
      mechanicCue: plan.mechanicCue,
      name: skill.name,
      playSummary: plan.playSummary,
      seedancePrompt: buildSeedancePrompt(skill, plan),
      skillId: skill.id,
      timing: skill.timing || "未标注",
      triggerSummary: plan.triggerSummary
    };
  }),
  totals: {
    playableSkills: playableCount,
    totalSkills: skills.length,
    visualOnlySkills: noPlayCount
  }
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${doc}\n`, "utf-8");
fs.writeFileSync(promptManifestPath, `${JSON.stringify(promptManifest, null, 2)}\n`, "utf-8");
console.log(
  `wrote ${outputPath} (${skills.length} skills, ${playableCount} playable, ${noPlayCount} visual-only)`
);
console.log(`wrote ${promptManifestPath}`);

function renderSkillSpec(skill: SkillDefinition): string[] {
  const plan = planSkill(skill);
  const safeName = skill.name.replaceAll("`", "");
  return [
    `### ${skill.id}：${safeName}`,
    "",
    `- 名称：${safeName}`,
    `- 分类：${skill.category}`,
    `- 时机：${skill.timing || "未标注"}`,
    `- 描述：${skill.description}`,
    `- 播放状态：${plan.implementationStatus}`,
    `- 玩法摘要：${plan.playSummary}`,
    `- 触发表现：${plan.triggerSummary}`,
    `- 机制视觉线索：${plan.mechanicCue}`,
    `- 视觉原型：${plan.archetype.name}`,
    `- 色彩：${plan.archetype.color}`,
    `- 材质：${plan.archetype.texture}`,
    `- 运动：${plan.archetype.motion}`,
    `- 当前资产：${formatAssetStatus(getEffectAssetStatus(skill))}`,
    `- 资产目录：\`apps/client/public/assets/effects/${skill.id}/\``,
    "",
    "#### imagegen 关键帧 prompt",
    "",
    ...[1, 2, 3, 4].flatMap((index) => [
      `**keyframe-0${index}.png**`,
      "",
      "```text",
      buildImagePrompt(skill, plan, index),
      "```",
      ""
    ]),
    "#### Seedance 动画 prompt",
    "",
    "```text",
    buildSeedancePrompt(skill, plan),
    "```",
    ""
  ];
}

function planSkill(skill: SkillDefinition): SkillVisualPlan {
  const archetype = classifySkill(skill);
  return {
    archetype,
    implementationStatus: skill.play
      ? "已接入 play，可由技能播放系统直接触发"
      : "未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐",
    mechanicCue: buildMechanicCue(skill),
    playSummary: skill.play ? summarizePlay(skill.play) : summarizePassive(skill),
    triggerSummary: summarizeTrigger(skill)
  };
}

function classifySkill(skill: SkillDefinition): EffectArchetype {
  const play = skill.play;
  const text = `${skill.name} ${skill.description} ${skill.tags.join(" ")} ${skill.typeTags.join(" ")} ${play?.effect ?? ""} ${play?.element ?? ""}`.toLowerCase();

  if (play?.kind === "resource" || play?.resourceGainPerStack) return archetypes.resource;
  if (play?.effect === "reroll_skill") return archetypes.reroll;
  if (play?.effect === "sand_transform") return archetypes.transform;
  if (play?.kind === "attack" || play?.targetDamage || play?.allEnemyDamage) {
    if (play?.element === "fire") return archetypes.attack_fire;
    if (play?.element === "ice") return archetypes.attack_ice;
    if (play?.element === "electric") return archetypes.attack_electric;
    if (play?.element === "poison") return archetypes.attack_poison;
    if (includesAny(text, ["冰", "霜", "雪", "寒", "冬"])) {
      return archetypes.attack_ice;
    }
    if (includesAny(text, ["电", "雷", "麻痹"])) {
      return archetypes.attack_electric;
    }
    if (includesAny(text, ["毒", "腐蚀", "中毒"])) {
      return archetypes.attack_poison;
    }
    if (includesAny(text, ["火", "焰", "炎", "熔", "朱雀"])) return archetypes.attack_fire;
    return archetypes.attack_physical;
  }
  if (play?.selfHeal || text.includes("治疗") || text.includes("恢复") || text.includes("+4血")) {
    return archetypes.heal;
  }
  if (
    play?.effect === "shield_normal" ||
    play?.effect === "shield_skill" ||
    play?.effect === "zhong_shield" ||
    play?.effect === "invulnerable_turn" ||
    play?.effect === "gain_defense_value" ||
    text.includes("防") ||
    text.includes("抵挡") ||
    text.includes("免疫") ||
    text.includes("闪避")
  ) {
    return archetypes.defense;
  }
  if (
    play?.effect === "reverse_actions" ||
    play?.effect === "past_time_space" ||
    play?.effect === "flash_dodge" ||
    play?.effect === "six_star" ||
    skill.category === "control" ||
    text.includes("封") ||
    text.includes("麻痹") ||
    text.includes("控制") ||
    text.includes("交换")
  ) {
    return archetypes.control;
  }
  if (
    play?.effect === "hell_overlord" ||
    play?.effect === "abs_plus" ||
    text.includes("死亡") ||
    text.includes("退游") ||
    text.includes("裂魂") ||
    text.includes("虚空")
  ) {
    return archetypes.void;
  }
  if (skill.category === "locked" || skill.category === "passive" || text.includes("被动")) {
    return archetypes.passive;
  }
  if (text.includes("无效果") || text.includes("空")) return archetypes.neutral;
  return archetypes.control;
}

function summarizePlay(play: SkillPlayDefinition): string {
  return [
    `kind=${play.kind}`,
    `cost=${play.cost}`,
    `target=${play.targetMode}`,
    play.effect ? `effect=${play.effect}` : "",
    play.element ? `element=${play.element}` : "",
    play.power !== undefined ? `power=${play.power}` : "",
    play.level !== undefined ? `level=${play.level}` : "",
    play.selfHeal ? `selfHeal=${play.selfHeal}` : "",
    play.selfDamage ? `selfDamage=${play.selfDamage}` : "",
    play.targetDamage ? `targetDamage=${play.targetDamage}` : "",
    play.allEnemyDamage ? `allEnemyDamage=${play.allEnemyDamage}` : "",
    play.usesPerGame ? `uses=${play.usesPerGame}` : ""
  ]
    .filter(Boolean)
    .join(" / ");
}

function summarizePassive(skill: SkillDefinition): string {
  const phases = skill.timingPhases.length > 0 ? skill.timingPhases.join(", ") : "passive/system";
  return `visual-only / phases=${phases}`;
}

function summarizeTrigger(skill: SkillDefinition): string {
  if (skill.play?.kind === "attack") return "在出招、目标确认、命中结算三段中播放。";
  if (skill.play?.kind === "resource") return "在资源变化确认时播放，动画要短，避免遮挡饼数。";
  if (skill.play?.kind === "effect") return "在技能确认或效果结算时播放，优先跟随技能卡和目标线。";
  if (skill.category === "locked") return "在锁定技条件生效时播放一枚短促被动印记。";
  if (skill.category === "limited") return "在限定条件满足或被系统结算时播放一次性印记。";
  return "在系统判断技能生效、失效或无效果时播放轻量反馈。";
}

function keyframePhase(keyframe: number): string {
  return [
    "起势：颜料、透明装置和细线开始聚集，动作尚未爆发。",
    "爆发：主颜料、线缆或波纹冲出，画面动势最强。",
    "扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。",
    "残留：颜料沉积、细线回落，可作为 poster frame。"
  ][keyframe - 1]!;
}

function buildImagePrompt(skill: SkillDefinition, plan: SkillVisualPlan, keyframe: number): string {
  const phase = keyframePhase(keyframe);
  const frameCue = keyframeCue(skill, plan, keyframe);

  return [
    "Use case: game VFX keyframe",
    `Asset type: BING-game skill effect keyframe ${keyframe}/4`,
    `Skill: ${skill.id} ${skill.name}`,
    `Gameplay meaning: ${plan.playSummary}.`,
    `Mechanic-specific cue: ${plan.mechanicCue}.`,
    `Primary request: ${plan.archetype.name}; ${phase}`,
    `Frame direction: ${frameCue}`,
    "Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.",
    `Color palette: ${plan.archetype.color}.`,
    `Materials/textures: ${plan.archetype.texture}.`,
    "Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.",
    "Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.",
    "Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.",
    "Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles."
  ].join("\n");
}

function buildSeedancePrompt(skill: SkillDefinition, plan: SkillVisualPlan): string {
  return [
    `Create a 0.8-1.6 second game VFX animation for BING-game skill ${skill.id} "${skill.name}".`,
    "Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.",
    `Gameplay meaning: ${plan.playSummary}. Trigger behavior: ${plan.triggerSummary}`,
    `Mechanic-specific cue: ${plan.mechanicCue}.`,
    `Visual language: ${plan.archetype.seedanceCore}; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.`,
    `Motion: ${plan.archetype.motion}.`,
    "Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.",
    "Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.",
    "Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.",
    "Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.",
    "Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels."
  ].join("\n");
}

function buildMechanicCue(skill: SkillDefinition): string {
  const play = skill.play;
  const parts = [
    skill.description,
    play ? `cost ${play.cost}, target ${play.targetMode}` : "",
    play?.power !== undefined ? `power ${play.power}` : "",
    play?.level !== undefined ? `level ${play.level}` : "",
    play?.defenseTag ? `defense ${play.defenseTag}` : "",
    play?.usesPerGame ? `limited ${play.usesPerGame} use(s)` : "",
    play?.resourceGainPerStack ? `resource gain ${play.resourceGainPerStack} per stack` : "",
    play?.selfHeal ? `self heal ${play.selfHeal}` : "",
    play?.targetDamage ? `target damage ${play.targetDamage}` : "",
    play?.allEnemyDamage ? `area damage ${play.allEnemyDamage}` : ""
  ].filter(Boolean);
  return parts.join("; ");
}

function keyframeCue(skill: SkillDefinition, plan: SkillVisualPlan, keyframe: number): string {
  const targetCue = targetMotionCue(skill.play?.targetMode);
  const intensity = intensityCue(skill);
  const namedSymbol = symbolCue(skill.name);
  if (keyframe === 1) {
    return `${namedSymbol} first appears as a small oil-paint emblem; ${targetCue}; keep intensity ${intensity}.`;
  }
  if (keyframe === 2) {
    return `${namedSymbol} reaches the strongest readable silhouette; ${plan.archetype.motion}; emphasize ${intensity}.`;
  }
  if (keyframe === 3) {
    return `The effect reveals gameplay information through ${targetCue}; split or spread only if the skill targets multiple players.`;
  }
  return `Leave a quiet residue shaped like ${namedSymbol}; keep final poster clean, readable, and not screen-filling.`;
}

function targetMotionCue(targetMode: SkillPlayDefinition["targetMode"] | undefined): string {
  switch (targetMode) {
    case "all":
      return "radial table-wide spread with several separated landing stains";
    case "multi":
      return "two or three clear target lanes with separate pigment endpoints";
    case "single":
      return "one precise lane from source to target with a single impact point";
    case "self":
      return "self-centered halo that stays close to the player marker";
    case "none":
      return "centered system mark with no target lane";
    default:
      return "subtle system feedback near the skill card";
  }
}

function intensityCue(skill: SkillDefinition): string {
  const play = skill.play;
  if (play?.level === "infinity" || play?.power === "infinity") {
    return "mythic but still elegant, with a brief infinite-rank accent";
  }
  const numericPower = typeof play?.power === "number" ? play.power : 0;
  const numericLevel = typeof play?.level === "number" ? play.level : 0;
  const score =
    numericPower +
    numericLevel +
    (play?.allEnemyDamage ?? 0) +
    (play?.targetDamage ?? 0) +
    (play?.usesPerGame ? 2 : 0);
  if (score >= 8) return "high-impact";
  if (score >= 4) return "medium-impact";
  return "low-impact";
}

function symbolCue(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    return "the skill symbol";
  }
  return `the "${normalized}" motif`;
}

function safeCell(value: string): string {
  return value.replaceAll("|", "/").replace(/\s+/g, " ");
}

function includesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function getEffectAssetStatus(skill: SkillDefinition): EffectAssetStatus {
  const existing = requiredAssetFiles.filter((fileName) =>
    fs.existsSync(path.join(effectRoot, skill.id, fileName))
  );
  return {
    complete: existing.length === requiredAssetFiles.length,
    existing,
    missing: requiredAssetFiles.filter((fileName) => !existing.includes(fileName))
  };
}

function formatAssetStatus(status: EffectAssetStatus): string {
  if (status.complete) {
    return "齐全";
  }
  if (status.existing.length === 0) {
    return `缺少全部 ${requiredAssetFiles.length} 个文件`;
  }
  return `已有 ${status.existing.join("、")}；缺少 ${status.missing.join("、")}`;
}
