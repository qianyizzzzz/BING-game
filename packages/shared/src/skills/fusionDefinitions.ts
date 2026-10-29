import { INFINITE_DAMAGE } from "../types";
import { SkillDefinition } from "./types";

/** Explicit executable definitions; spreadsheet prose is never treated as code. */
export const FUSION_DEFINITIONS: Record<string, Partial<SkillDefinition>> = {
  "斗战胜佛": { category: "attack", exposureTiming: "使用时", timingPhases: ["turn_action"],
    play: { kind: "attack", attackName: "金箍棒", cost: 3, maxStacks: 20, targetMode: "single",
      power: INFINITE_DAMAGE, level: 3, defenseTag: "any", traits: ["skill"], element: "physical" } },
  "冰火两仪眼": { category: "limited", exposureTiming: "使用时", typeTags: ["限定技"], attribute: "fire",
    timingPhases: ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_change_action", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", usesPerGame: 2, effect: "no_direct_effect" } },
  "虚幻": { category: "control", exposureTiming: "使用时", typeTags: ["控制技"], timingPhases: ["turn_change_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", effect: "no_direct_effect" } },
  "圣灵觉醒": { category: "raw", exposureTiming: "使用时", timingPhases: ["turn_action"],
    play: { kind: "resource", cost: 1, maxStacks: 20, targetMode: "none", resourceGainPerStack: 4 } },
  "山崩地裂": { category: "attack", exposureTiming: "使用时", timingPhases: ["turn_action"],
    play: { kind: "attack", cost: 3, maxStacks: 20, targetMode: "single", power: 5, level: 5, defenseTag: "cake", element: "physical" } },
  "冰火双漩": { category: "attack", exposureTiming: "使用时", timingPhases: ["turn_action"],
    play: { kind: "attack", cost: 3, maxStacks: 20, targetMode: "single", power: 4, level: 3, defenseTag: "stone",
      element: "ice", elements: ["ice", "fire"], freezeTurns: 2 } },
  "辉月": { category: "control", typeTags: ["控制技"], timingPhases: ["turn_change_action"],
    description: "变招阶段使用，2轮限1次；取消本回合出招并退还出招实付耗饼、收回出招收益。当前和下一回合不能出招，免疫攻击伤害；不挡法伤及退游效果，青钢、破天不能穿过辉月。保留神之庇护，替代闪现。",
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", effect: "no_direct_effect" } },
  "枯萎": { category: "passive", timingPhases: ["round_pre_interval_action", "passive_check"],
    description: "保留血之哀和衰竭。开局为每份枯萎选择一个正整数，默认1；全场最终攻击力或等级严格等于所选数的攻击失效，不检查费用或数字包含。开局准备结束后不能改数，中途融合沿用开局选择。" },
  "灵魂修复": { category: "passive", timingPhases: ["passive_check", "round_start_check", "round_end_check"],
    description: "第N轮受伤后，在第N+1轮轮初+1饼，于该轮轮末恢复满血；满血恢复不受血之哀或加血转移影响。" },
  "魔域": { category: "passive", exposureTiming: "使用时", timingPhases: ["turn_end_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", effect: "no_direct_effect" } }
};
