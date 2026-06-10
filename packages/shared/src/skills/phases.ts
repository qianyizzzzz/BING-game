import { SkillTimingPhase } from "../types";
import { RawSkillDefinition, SkillDefinition } from "./types";

export const SKILL_TIMING_PHASE_LABELS: Record<SkillTimingPhase, string> = {
  game_start_check: "开局判定",
  round_pre_interval_action: "轮前轮间行动",
  round_before_action: "轮前行动",
  round_start_check: "轮初判定",
  turn_before_action: "回合前行动",
  turn_start_check: "回合初判定",
  turn_action: "出招阶段",
  turn_reveal_check: "亮招判定",
  turn_change_action: "变招阶段",
  turn_hit_check: "命中判定",
  turn_damage_modify: "变伤阶段",
  turn_damage_check: "伤害判定",
  revival_action: "复活阶段",
  turn_end_action: "回合末行动",
  turn_end_check: "回合末判定",
  turn_after_interval_action: "回合后间隙",
  round_end_check: "轮末判定",
  round_after_interval_action: "轮后轮间行动",
  passive_check: "锁定/被动"
};

export const ACTION_WINDOW_PHASES = new Set<SkillTimingPhase>([
  "round_pre_interval_action",
  "round_before_action",
  "turn_before_action",
  "turn_action",
  "turn_change_action",
  "turn_damage_modify",
  "revival_action",
  "turn_end_action",
  "turn_after_interval_action",
  "round_after_interval_action"
]);

const ROUND_INTERVAL_SKILLS = new Set([
  "火烧大地",
  "霜落大地",
  "凝血之力"
]);

const ROUND_START_CHECK_SKILLS = new Set(["独裁", "遗计"]);
const TURN_START_CHECK_SKILLS = new Set(["圣水收集器"]);
const TURN_REVEAL_CHECK_SKILLS = new Set(["火焰刀", "酒", "神族水晶", "森林的低吟"]);
const TURN_CHANGE_ACTION_SKILLS = new Set([
  "换防",
  "幻防",
  "杀换",
  "级换",
  "绝对守护",
  "毁灭之力",
  "闪现",
  "逆转",
  "寒冰剑",
  "熔岩之怒",
  "凛冬之怒",
  "双刃剑",
  "烈弓"
]);
const TURN_HIT_CHECK_SKILLS = new Set([
  "闪电护体",
  "神之庇护",
  "无形之盾",
  "阳光普照",
  "永远之夜",
  "破地之力",
  "百炼成神"
]);
const TURN_DAMAGE_MODIFY_SKILLS = new Set([
  "十字守护",
  "冰箭雨",
  "斗转星移",
  "六芒星"
]);
const TURN_DAMAGE_CHECK_SKILLS = new Set([
  "藤甲",
  "八卦阵",
  "不死金身",
  "古淀刀",
  "狙击枪",
  "全力一击",
  "双刃剑"
]);
const TURN_END_ACTION_SKILLS = new Set([
  "治愈术",
  "离殇",
  "地狱主宰",
  "天佑之魂"
]);
const ROUND_END_CHECK_SKILLS = new Set(["克己", "圣域", "邪域"]);
const GAME_START_CHECK_SKILLS = new Set([
  "沐浴圣光",
  "破厄",
  "顺手牵羊",
  "因果律认知"
]);

export function inferSkillTimingPhases(raw: RawSkillDefinition): SkillTimingPhase[] {
  const phases = new Set<SkillTimingPhase>();
  const timing = raw.timing ?? "";
  const description = raw.description ?? "";

  addNameBasedPhases(raw.name, phases);

  if (timing.includes("被动") || description.includes("锁定技")) {
    phases.add("passive_check");
  }

  if (timing.includes("出招") || description.includes("技能攻击")) {
    phases.add("turn_action");
  }

  if (timing.includes("回合中") || timing.includes("印记使用")) {
    phases.add("turn_change_action");
  }

  if (timing.includes("死亡时") || description.includes("死亡时") || description.includes("复活")) {
    phases.add("revival_action");
  }

  if (timing.includes("随时可用")) {
    phases.add("round_pre_interval_action");
    phases.add("round_before_action");
    phases.add("turn_before_action");
    phases.add("turn_change_action");
    phases.add("turn_damage_modify");
    phases.add("turn_end_action");
    phases.add("turn_after_interval_action");
    phases.add("round_after_interval_action");
  }

  if (description.includes("限定技") || ROUND_INTERVAL_SKILLS.has(raw.name)) {
    phases.add("round_pre_interval_action");
    phases.add("round_before_action");
    phases.add("turn_before_action");
    phases.add("turn_change_action");
    phases.add("turn_damage_modify");
    phases.add("turn_end_action");
    phases.add("turn_after_interval_action");
    phases.add("round_after_interval_action");
  }

  if (description.includes("轮初")) {
    phases.add("round_start_check");
  }

  if (description.includes("轮末")) {
    phases.add("round_end_check");
  }

  if (description.includes("回合初") || description.includes("第4x回合")) {
    phases.add("turn_start_check");
  }

  if (description.includes("出招后")) {
    phases.add("turn_reveal_check");
  }

  if (description.includes("命中")) {
    phases.add("turn_hit_check");
  }

  if (description.includes("受到攻击伤害") || description.includes("造成伤害")) {
    phases.add("turn_damage_check");
  }

  if (description.includes("冰冻")) {
    phases.add("turn_end_check");
  }

  if (phases.size === 0) {
    phases.add("passive_check");
  }

  return [...phases];
}

export function isSkillPlayableInPhase(
  skill: SkillDefinition,
  phase: SkillTimingPhase
): boolean {
  return Boolean(skill.play) && skill.timingPhases.includes(phase);
}

function addNameBasedPhases(
  name: string,
  phases: Set<SkillTimingPhase>
): void {
  if (GAME_START_CHECK_SKILLS.has(name)) {
    phases.add("game_start_check");
  }
  if (ROUND_INTERVAL_SKILLS.has(name)) {
    phases.add("round_pre_interval_action");
    phases.add("round_after_interval_action");
  }
  if (ROUND_START_CHECK_SKILLS.has(name)) {
    phases.add("round_start_check");
  }
  if (TURN_START_CHECK_SKILLS.has(name)) {
    phases.add("turn_start_check");
  }
  if (TURN_REVEAL_CHECK_SKILLS.has(name)) {
    phases.add("turn_reveal_check");
  }
  if (TURN_CHANGE_ACTION_SKILLS.has(name)) {
    phases.add("turn_change_action");
  }
  if (TURN_HIT_CHECK_SKILLS.has(name)) {
    phases.add("turn_hit_check");
  }
  if (TURN_DAMAGE_MODIFY_SKILLS.has(name)) {
    phases.add("turn_damage_modify");
  }
  if (TURN_DAMAGE_CHECK_SKILLS.has(name)) {
    phases.add("turn_damage_check");
  }
  if (TURN_END_ACTION_SKILLS.has(name)) {
    phases.add("turn_end_action");
  }
  if (ROUND_END_CHECK_SKILLS.has(name)) {
    phases.add("round_end_check");
  }
}
