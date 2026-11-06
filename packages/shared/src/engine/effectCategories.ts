import type { BuffState, GameState, PlayerState, SkillId } from "../types";
import type { RawSkillDefinition, SkillDefinition } from "../skills/types";
import { FUSION_RECIPES } from "../skills/generatedFusionCatalog";
import { ACTION_WINDOW_PHASES } from "../skills/phases";

export type StateCategory = "positive" | "negative" | "element";
export type EffectCategory = "damage_reduction" | "damage_evasion" | "damage_immunity" | "remove_fire_skills" | "remove_skills" | "skill_loss" | "skill_absorption" | "skill_copy" | "skill_gain";
export const ALL_SKILLS_SEALED_BUFF_ID = "all_skills_sealed";
export const SKILL_DISABLED_BUFF_PREFIX = "skill_disabled_until_round:";
export interface StateDefinition { id: string; name: string; categories: StateCategory[]; }
const states = new Map<string, StateDefinition>();
const effects = new Map<string, Set<EffectCategory>>();

export function registerStateDefinition(definition: StateDefinition): void {
  if (states.has(definition.id)) throw new Error(`状态类别重复：${definition.id}`);
  states.set(definition.id, definition);
}
export function stateHasCategory(buff: BuffState, category: StateCategory): boolean {
  return Boolean(states.get(buff.stateType ?? buff.id)?.categories.includes(category));
}
export function removeStateCategory(player: PlayerState, category: StateCategory): number {
  const before = player.buffs.length;
  player.buffs = player.buffs.filter((buff) => !stateHasCategory(buff, category));
  return before - player.buffs.length;
}
export function registerEffectCategories(id: string, categories: EffectCategory[]): void {
  effects.set(id, new Set([...(effects.get(id) ?? []), ...categories]));
}
export function effectHasCategory(id: string, category: EffectCategory): boolean {
  return effects.get(id)?.has(category) ?? false;
}
export function ignoresNegativeStatuses(player: { buffs: Array<{ stateType?: string }> } | undefined): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === "dragon_dominion_protection"));
}
export function effectCategoryIsSuppressed(player: PlayerState, category: EffectCategory): boolean {
  return player.buffs.some((buff) => buff.suppressedEffectCategories?.includes(category) &&
    (!ignoresNegativeStatuses(player) || !stateHasCategory(buff, "negative")));
}
export function effectIsSuppressed(player: PlayerState, effectId: string): boolean {
  return [...(effects.get(effectId) ?? [])].some((category) => effectCategoryIsSuppressed(player, category));
}

export function getSkillActivationKind(skill: Pick<SkillDefinition, "timingPhases">): "active" | "passive" {
  return skill.timingPhases.some((phase) => ACTION_WINDOW_PHASES.has(phase)) ? "active" : "passive";
}

export function isSkillSuppressedByBuff(id: string): boolean {
  return isAllSkillsSealedBuff(id) || id.startsWith(SKILL_DISABLED_BUFF_PREFIX);
}

export function isAllSkillsSealedBuff(id: string): boolean {
  return id.startsWith(`${ALL_SKILLS_SEALED_BUFF_ID}:`);
}

export function isBigCardAbilityIgnored(target: Pick<PlayerState, "buffs">, skill: Pick<RawSkillDefinition, "id" | "typeTags">): boolean {
  return target.buffs.some((buff) => buff.ignoredSkillIds?.includes(skill.id) ||
    buff.ignoredBigCardIds?.includes(skill.id.slice(0, 5)) ||
    skill.typeTags.some((tag) => buff.ignoredSkillTypeTags?.includes(tag)));
}
/** Only the new explicitly typed states use these exclusive expiry boundaries. */
export function pruneRegisteredStates(state: Pick<GameState, "players" | "roundNumber" | "turnNumber">): void {
  for (const player of state.players) player.buffs = player.buffs.filter((buff) => !buff.stateType ||
    (buff.expiresAtRound === undefined || buff.expiresAtRound > state.roundNumber) &&
    (buff.expiresAtTurn === undefined || buff.expiresAtTurn > state.turnNumber));
}
export function isTypedSkillSuppressed(player: Pick<PlayerState, "buffs"> | undefined, skill: Pick<RawSkillDefinition, "typeTags"> | undefined): boolean {
  return Boolean(player && skill && !ignoresNegativeStatuses(player) && player.buffs.some((buff) =>
    buff.stateType === "limited_disabled" && skill.typeTags.includes("限定技") ||
    buff.stateType === "control_disabled" && skill.typeTags.includes("控制技")));
}

for (const [id, name] of [["fenshi_flames", "焚世烈焰"], ["skill_rebound", "技能反弹"],
  ["skill_attack_block", "技能防御"], ["gather_invulnerability", "聚·无敌"]])
  registerStateDefinition({ id: id!, name: name!, categories: ["positive"] });
registerStateDefinition({ id: "element_resource", name: "元素资源", categories: ["element"] });
registerStateDefinition({ id: "kuiji_cake_growth", name: "窥觊苍生·出饼×3", categories: ["positive"] });
registerStateDefinition({ id: "star_negative_guard", name: "异星共振·无视指定来源不良", categories: ["positive"] });
registerStateDefinition({ id: "juneng_boost", name: "聚能湮灭炮·数值增强", categories: ["positive"] });
registerEffectCategories("1050601", ["skill_absorption"]);
registerEffectCategories("1050706", ["skill_absorption"]);
registerEffectCategories("1050502", ["skill_copy"]);
registerEffectCategories("1050701", ["skill_gain"]);
registerEffectCategories("skill_50_50034", ["damage_reduction"]);
registerEffectCategories("skill_103_56259", ["damage_evasion"]);
registerEffectCategories("skill_14_46860", ["remove_fire_skills"]);
registerEffectCategories("skill_75_68329", ["damage_immunity"]);
registerEffectCategories("temp_six_star_immunity", ["damage_immunity"]);
for (const recipe of FUSION_RECIPES.filter(({ skill }) => ["自然之灵", "帝灵之境"].includes(skill.name))) {
  registerEffectCategories(recipe.skill.id, ["damage_immunity"]);
}
const iceFireEye = FUSION_RECIPES.find((recipe) => recipe.skill.name === "冰火两仪眼");
if (iceFireEye) registerEffectCategories(iceFireEye.skill.id, ["remove_fire_skills"]);
