import { ERA_AREA, ERA_EXTEND } from "./eraIds";
import { YIYUAN_CAKES, YIYUAN_CHANGE, YIYUAN_CHANGE_STATE, YIYUAN_ETERNAL, YIYUAN_GOD, YIYUAN_GROWTH,
  YIYUAN_MIMIC, YIYUAN_MIMIC_STATE, YIYUAN_STEP, YIYUAN_STEP_STATE } from "./yiyuanIds";
import { FATE_EYE_WARD } from "./fateEyeIds";
import { SANCTUARY_AURA_ID, SANCTUARY_AURA_STATE, SANCTUARY_GATE_ID, SANCTUARY_WARD_ID, SANCTUARY_WARD_STATE } from "./sanctuaryIds";
import { STAR_MOON_BURST, STAR_MOON_DANCE, STAR_MOON_GLEAM, STAR_MOON_HUIYUE_STOCK,
  STAR_MOON_RIVER, STAR_MOON_RIVER_DODGE, STAR_MOON_TEMPORARY_CARD } from "./starMoonIds";
import { FALLEN_SPLENDOR_ELEMENTAL, FALLEN_SPLENDOR_EXECUTION_STATE, FALLEN_SPLENDOR_IGNORE_DAMAGE } from "./fallenSplendorIds";
import { DEMON_TYRANT_ID, DEMON_VOIDWALKER_ID } from "./demonIds";
import type { BuffState, GameState, PlayerState, SkillId } from "../types";
import type { RawSkillDefinition, SkillDefinition } from "../skills/types";
import { FUSION_RECIPES } from "../skills/generatedFusionCatalog";
import { HIGHER_FUSION_RECIPES } from "../skills/generatedHigherFusionCatalog";
import { ACTION_WINDOW_PHASES } from "../skills/phases";
import { isSkillIgnorable, isSkillIgnored } from "./skillIgnore";
import { ASURA_BLOOD_ID, bigCardHasAbility, CHARITY_LINK_ID, CHAOS_ATTACK_ID, CLOUD_SEA_ID,
  DRAGON_DOMINION_ID, DRAGON_HEIR_ID, FENSHI_FLAMES_ID, FENTIAN_ATTACK_ID, GATHER_STAR_ID, GOD_KING_RULES_ID,
  HUNYAO_AREA_ID, JUEYING_DEATH_ID, JUEYING_RETIRE_ID, KAIGE_ELEMENTS_ID, KAIGE_ETERNAL_ID, KAIGE_HOLY_ID,
  KUIJI_ULTIMATE_ID, KURONG_LEAF_ID, LINGTA_INHERIT_ID, MOUNTAIN_SEAL_ID, PURPLE_PIERCE_ID, SAND_INHERIT_ID,
  SAND_NULLIFY_ID, SHENGLING_ID, SOUL_PACT_ID, SPIRIT_GUIDANCE_ID, STAR_STRIKE_ID, STORE_DAMAGE_ID,
  TIANMANG_ABSORB_ID, TIANMANG_ABSORB_INFINITE_ID, TIANMANG_CLEANSE_ID, TIANMANG_FIELD_CLEANSE_ID,
  TIANMANG_GATHER_ID, TIANMANG_MIRROR_ID, TIANMANG_SAND_ID, UTOPIA_FIELD_ID, VERDICT_ACTION_ID, VERDICT_GUARD_ID,
  VERDICT_REWARD_ID, WIND_SCOUT_ID, XIELING_TRANSFORM_ID } from "../bigCards/abilities";
import { RAW_BIG_CARD_CATALOG } from "../bigCards/generatedCatalog";
import { FIVE_ELEMENTS_EARTH, FIVE_ELEMENTS_FIRE, FIVE_ELEMENTS_ICE, FIVE_ELEMENTS_LIGHTNING, FIVE_ELEMENTS_RESTORE } from "./fiveElementsIds";
import { HEXAGRAM_ABSOLUTE, HEXAGRAM_IGNORE, HEXAGRAM_SOUL, HEXAGRAM_SPIRIT } from "./hexagramIds";
import { SEVEN_STAR_IGNORE, SEVEN_STAR_MOVE_LOCK, SEVEN_STAR_PIERCE, SEVEN_STAR_PROTECTION,
  SEVEN_STAR_TIANQUAN, SEVEN_STAR_TIANSHU, SEVEN_STAR_TIANXUAN, SEVEN_STAR_YUHENG } from "./sevenStarIds";
import { CURTAIN_DARK_STATE } from "./curtainIds";
import { BLADE_REVIVAL_ID } from "./brokenBladeIds";
import { DECAY_INHERIT_ID } from "./decayIds";
import { DEAD_REALM_CARD_ID } from "./deadRealmIds";
import { YUAN_ORIGIN_ID, YUAN_RETURN_ID, YUAN_VOID_DODGE, YUAN_VOID_ID } from "./yuanIds";
import { SUN_CROWN_STATE, SUN_PUPPET_STATE, SUN_WHEEL_ID } from "./sunIds";
import { swordArrayNoCakeSuppressesPassive } from "./swordArrayControl";
import { MOON_CHANT_ID, MOON_CHANT_STATE, MOON_DANCE_ID, MOON_GRIEF_ID, MOON_HUIYUE_ID, MOON_PRAISE_ID,
  MOON_PRAISE_STATE, MOON_RITUAL_ID } from "./moonIds";
import { TIAN_YE_FALL_ID, TIAN_YE_SOARING_ID } from "./tianyeIds";
import { SEA_GOD_ABSOLUTE_STATE, SEA_GOD_DUSK_ID, SEA_GOD_IGNORE_ID, SEA_GOD_TRIDENT_ID, SEA_GOD_WAVES_ID } from "./seaGodIds";
import { KARMA_PUNISH_ID, KARMA_SONG_STATUS_LOCK } from "./karmaCycleIds";
import { CHEAT_ABSOLUTE_ID, CHEAT_GATHER_ID, CHEAT_GATHER_STATE, CHEAT_NOGLUES_ID, CHEAT_SHARP_STOCK, CHEAT_WARP_STATE } from "./cheatServerIds";
import { STORED_DAMAGE_STATUS } from "./storedDamage";
import { BUBBLE_ENHANCE_STOCK, BUBBLE_FINALE, BUBBLE_FORGET, BUBBLE_REBUILD_STOCK, BUBBLE_SKILLS_DISABLED,
  BUBBLE_VENGEANCE_STOCK } from "./bubbleDreamIds";

export type StateCategory = "positive" | "negative" | "element" | "special";
export type EffectCategory =
  | "time_judgment" | "limited_skill"
  | "damage_redirection" | "damage_reduction" | "damage_evasion" | "damage_immunity" | "damage_ignore"
  | "retirement_immunity" | "retirement_ignore" | "cake_clear_immunity"
  | "revival_invalidation"
  | "move_invalidation" | "move_immunity" | "skill_invalidation" | "skill_effect_immunity"
  | "negative_status_immunity" | "negative_status_cleanse" | "negative_status_ignore"
  | "negative_status_reflection" | "unaffected_negative_status"
  | "remove_fire_skills" | "remove_electric_skills" | "remove_skills"
  | "skill_loss" | "skill_burn" | "skill_disappearance" | "skill_discard"
  | "skill_absorption" | "skill_devour" | "skill_copy" | "skill_gain"
  | "return_to_past" | "restore_initial" | "life_absorption" | "life_loss"
  | "victory_reverse" | "victory_transfer" | "game_freeze"
  | "attack_distance_restriction" | "defense_piercing" | "defense_move_piercing" | "defense_shattering" | "defense_skill";
export const SPRING_ICE_FIRE_DISABLED = "spring_ice_fire_disabled";
export const SPRING_GRASS_BOOST = "spring_grass_boost";
export const CHARITY_GROUP = "charity_group";
export const ALL_SKILLS_SEALED_BUFF_ID = "all_skills_sealed";
export const SKILL_DISABLED_BUFF_PREFIX = "skill_disabled_until_round:";
/** A shield buff's stacks are the number of shields currently held. */
export const SHIELD_STATE_TYPE = "shield";
export const INVENTORY_ITEM_STATE_TYPE = "inventory_item";
export interface StateDefinition { id: string; name: string; categories: StateCategory[]; }
const states = new Map<string, StateDefinition>();
const effects = new Map<string, Set<EffectCategory>>();
const countedStatusIds = new Set(["jin_zhong_zhao", "free_imperial_verdict", "verdict_shadow_uses", "free_ri", "free_lian_bao",
  "free_sky_strike", "veteran_shatter_uses", "wujin_rebound_count", "curtain_veils", "curtain_reflect_pierce", CHEAT_SHARP_STOCK,
  STORED_DAMAGE_STATUS, "origin_shot_stock", BUBBLE_VENGEANCE_STOCK, BUBBLE_REBUILD_STOCK, SEVEN_STAR_PIERCE]);
const countedStatusTypes = new Set(["chaos_defense_lock", "chaos_guard", "lone_star_upgrade", FALLEN_SPLENDOR_EXECUTION_STATE,
  BUBBLE_ENHANCE_STOCK, SANCTUARY_WARD_STATE, STAR_MOON_HUIYUE_STOCK]);

export function isCountedCombatStatus(buff: BuffState): boolean {
  return Boolean(buff.freeMove || countedStatusIds.has(buff.id) || countedStatusTypes.has(buff.stateType ?? "") ||
    buff.id.startsWith("verdict_guard:"));
}

export function registerStateDefinition(definition: StateDefinition): void {
  if (states.has(definition.id)) throw new Error(`状态类别重复：${definition.id}`);
  states.set(definition.id, definition);
}
export function stateHasCategory(buff: BuffState, category: StateCategory): boolean {
  return Boolean(states.get(buff.stateType ?? buff.id)?.categories.includes(category));
}
export function removeStateCategory(player: PlayerState, category: StateCategory): number {
  const before = player.buffs.length;
  player.buffs = player.buffs.filter((buff) => buff.uncleansable || !stateHasCategory(buff, category));
  return before - player.buffs.length;
}

export function isRemovableLongTermStatus(buff: BuffState): boolean {
  const type = buff.stateType;
  if (buff.uncleansable || buff.itemKind || isCountedCombatStatus(buff) ||
    type === INVENTORY_ITEM_STATE_TYPE || type === SHIELD_STATE_TYPE || type === "sky_absolute_cover" ||
    ["defense_value", "temp_shield_normal", "temp_shield_skill"].includes(buff.id) ||
    stateHasCategory(buff, "element") || stateHasCategory(buff, "special") ||
    type === "thunder_storm_burst" || buff.fusionMarkKind || /印记/.test(buff.name) ||
    /^(used_|took_|damage_taken_|skill_used:|skill_guess_failed|skip_action_windows|star_rage_spent|qianqiu_(?:gain|used|defense)|raging_wave_judgment)/.test(buff.id) ||
    buff.id.includes("cooldown")) return false;
  return stateHasCategory(buff, "positive") || stateHasCategory(buff, "negative") || Boolean(type) ||
    isSkillSuppressedByBuff(buff.id) || /^(paralysis_next_action:|puppet_|sealed_skill:)/.test(buff.id) ||
    buff.expiresAtRound !== undefined || buff.expiresAtTurn !== undefined;
}

export function isRemovableExtraStatus(buff: BuffState): boolean {
  if (buff.uncleansable || stateHasCategory(buff, "element") || buff.id.startsWith("element:") ||
    buff.id.startsWith("small_space:") || buff.id.startsWith("skill_used:") || buff.id.includes("cooldown")) return false;
  return isRemovableLongTermStatus(buff) || isCountedCombatStatus(buff) || buff.id === "defense_value" ||
    buff.stateType === SHIELD_STATE_TYPE || buff.stateType === INVENTORY_ITEM_STATE_TYPE || buff.stateType === "sky_absolute_cover" ||
    Boolean(buff.itemKind || buff.freeMove || buff.fusionMarkKind) || /印记/.test(buff.name) ||
    /^(free_|temp_shield_(?:normal|skill)$|verdict_guard:|verdict_shadow_uses$|jin_zhong_zhao$|wujin_rebound_count$|ice_rain:|no_revive$)/.test(buff.id);
}
export function registerEffectCategories(id: string, categories: EffectCategory[]): void {
  effects.set(id, new Set([...(effects.get(id) ?? []), ...categories]));
}
registerEffectCategories("1097", ["attack_distance_restriction"]);
registerEffectCategories(YIYUAN_ETERNAL, ["move_invalidation", "cake_clear_immunity", "defense_skill"]);
registerEffectCategories(YIYUAN_STEP, ["damage_evasion", "defense_skill"]);
registerEffectCategories(YIYUAN_CHANGE, ["negative_status_cleanse", "negative_status_reflection", "defense_skill"]);
registerEffectCategories(YIYUAN_MIMIC, ["skill_copy"]);
registerEffectCategories(YIYUAN_GOD, ["skill_absorption", "skill_loss", "defense_skill"]);
registerEffectCategories(FIVE_ELEMENTS_FIRE, ["damage_immunity", "defense_skill"]);
registerEffectCategories(FIVE_ELEMENTS_ICE, ["damage_immunity", "skill_effect_immunity", "defense_skill"]);
registerEffectCategories(FIVE_ELEMENTS_LIGHTNING, ["negative_status_immunity", "defense_skill"]);
registerEffectCategories(FIVE_ELEMENTS_EARTH, ["defense_skill"]);
registerEffectCategories(FIVE_ELEMENTS_RESTORE, ["move_immunity", "defense_skill"]);
registerEffectCategories(HEXAGRAM_SOUL, ["skill_invalidation", "move_invalidation"]);
registerEffectCategories(HEXAGRAM_SPIRIT, ["skill_copy"]);
registerEffectCategories(HEXAGRAM_ABSOLUTE, ["defense_skill", "damage_immunity"]);
registerEffectCategories(HEXAGRAM_IGNORE, ["damage_ignore"]);
registerEffectCategories(SEVEN_STAR_TIANSHU, ["defense_piercing"]);
registerEffectCategories(SEVEN_STAR_TIANXUAN, ["move_invalidation"]);
registerEffectCategories(SEVEN_STAR_TIANQUAN, ["damage_immunity", "defense_skill"]);
registerEffectCategories(SEVEN_STAR_IGNORE, ["damage_ignore"]);
registerEffectCategories(SEVEN_STAR_YUHENG, ["skill_gain"]);
registerStateDefinition({ id: SEVEN_STAR_MOVE_LOCK, name: "天权·无法出招", categories: ["negative"] });
registerStateDefinition({ id: SEVEN_STAR_PROTECTION, name: "天权·绝对无敌", categories: ["positive"] });
registerEffectCategories("4029", ["remove_skills"]);
registerStateDefinition({ id: YIYUAN_CAKES, name: "一元·永恒", categories: ["positive"] });
registerStateDefinition({ id: YIYUAN_STEP_STATE, name: "一元·瞬移", categories: ["positive"] });
registerStateDefinition({ id: YIYUAN_CHANGE_STATE, name: "一元·天变", categories: ["positive"] });
registerStateDefinition({ id: YIYUAN_MIMIC_STATE, name: "一元·幻化", categories: [] });
registerStateDefinition({ id: YIYUAN_GROWTH, name: "一元·原神·积饼×5", categories: ["positive"] });
registerEffectCategories("1093", ["damage_redirection", "limited_skill"]);
registerEffectCategories(FALLEN_SPLENDOR_ELEMENTAL, ["damage_immunity", "defense_skill"]);
registerEffectCategories(BUBBLE_FORGET, ["damage_ignore"]);
registerEffectCategories(BUBBLE_FINALE, ["skill_invalidation"]);
registerEffectCategories(FALLEN_SPLENDOR_IGNORE_DAMAGE, ["damage_ignore"]);
for (const id of [HUNYAO_AREA_ID, SPIRIT_GUIDANCE_ID, STAR_STRIKE_ID, JUEYING_DEATH_ID, CLOUD_SEA_ID, SAND_NULLIFY_ID])
  registerEffectCategories(id, ["move_invalidation"]);
registerEffectCategories(VERDICT_GUARD_ID, ["move_immunity"]);
registerEffectCategories(BLADE_REVIVAL_ID, ["revival_invalidation"]);
registerEffectCategories(DECAY_INHERIT_ID, ["defense_move_piercing"]);
for (const id of [FENTIAN_ATTACK_ID, VERDICT_ACTION_ID, LINGTA_INHERIT_ID, CHAOS_ATTACK_ID, TIANMANG_CLEANSE_ID,
  TIANMANG_FIELD_CLEANSE_ID, SAND_INHERIT_ID]) registerEffectCategories(id, ["skill_invalidation"]);
for (const id of [STORE_DAMAGE_ID, MOUNTAIN_SEAL_ID, KAIGE_ELEMENTS_ID, KAIGE_HOLY_ID, ASURA_BLOOD_ID])
  registerEffectCategories(id, ["damage_immunity"]);
for (const id of [TIANMANG_ABSORB_ID, TIANMANG_ABSORB_INFINITE_ID]) registerEffectCategories(id, ["skill_effect_immunity"]);
registerEffectCategories(GOD_KING_RULES_ID, ["retirement_immunity"]);
registerEffectCategories(JUEYING_RETIRE_ID, ["retirement_ignore"]);
registerEffectCategories(KAIGE_ETERNAL_ID, ["cake_clear_immunity"]);
registerEffectCategories(STAR_STRIKE_ID, ["negative_status_ignore"]);
registerEffectCategories(XIELING_TRANSFORM_ID, ["negative_status_reflection"]);
registerEffectCategories(FENSHI_FLAMES_ID, ["skill_burn"]);
registerEffectCategories(KARMA_PUNISH_ID, ["skill_invalidation"]);
registerEffectCategories(CHEAT_NOGLUES_ID, ["skill_invalidation", "skill_gain"]);
for (const id of [CHEAT_GATHER_ID, CHEAT_ABSOLUTE_ID]) registerEffectCategories(id, ["defense_skill"]);
registerStateDefinition({ id: CHEAT_GATHER_STATE, name: "The gathering·无敌", categories: [] });
registerStateDefinition({ id: CHEAT_WARP_STATE, name: "Warpten·积饼×4", categories: ["positive"] });
registerStateDefinition({ id: KARMA_SONG_STATUS_LOCK, name: "失落之歌·无法获得状态", categories: [] });
registerEffectCategories("1053803", ["defense_piercing", "defense_shattering"]);
registerEffectCategories(YUAN_RETURN_ID, ["defense_skill"]);
registerEffectCategories(YUAN_VOID_ID, ["damage_evasion"]);
registerEffectCategories(YUAN_ORIGIN_ID, ["skill_disappearance", "restore_initial"]);
registerStateDefinition({ id: YUAN_VOID_DODGE, name: "虚元·回避指向出招", categories: ["positive"] });
registerEffectCategories(SUN_WHEEL_ID, ["time_judgment"]);
registerEffectCategories(TIAN_YE_SOARING_ID, ["defense_skill", "damage_evasion"]);
registerEffectCategories(TIAN_YE_FALL_ID, ["defense_move_piercing"]);
registerEffectCategories(MOON_GRIEF_ID, ["negative_status_cleanse"]);
registerStateDefinition({ id: SUN_CROWN_STATE, name: "永恒冕冠", categories: ["positive"] });
registerStateDefinition({ id: SUN_PUPPET_STATE, name: "日的傀儡", categories: ["special"] });
registerStateDefinition({ id: MOON_CHANT_STATE, name: "月咏", categories: ["positive"] });
registerStateDefinition({ id: MOON_PRAISE_STATE, name: "月赞", categories: ["positive"] });
for (const id of [MOON_HUIYUE_ID, MOON_RITUAL_ID, MOON_CHANT_ID, MOON_PRAISE_ID]) registerEffectCategories(id, ["defense_skill"]);
registerStateDefinition({ id: "moon_dance_blessing", name: "月华舞礼", categories: ["positive"] });
registerEffectCategories(MOON_DANCE_ID, ["defense_skill"]);
registerStateDefinition({ id: SEA_GOD_ABSOLUTE_STATE, name: "海神·绝对无敌", categories: ["positive"] });
for (const id of [SEA_GOD_TRIDENT_ID, SEA_GOD_DUSK_ID]) registerEffectCategories(id, ["defense_skill"]);
registerEffectCategories(SEA_GOD_WAVES_ID, ["move_invalidation"]);
registerEffectCategories(SEA_GOD_IGNORE_ID, ["revival_invalidation"]);

export function effectHasCategory(id: string, category: EffectCategory): boolean {
  return effects.get(id)?.has(category) ?? false;
}

export function isDefenseSkill(id: string): boolean {
  return (["defense_skill", "damage_reduction", "damage_evasion", "damage_immunity"] as const)
    .some((category) => effectHasCategory(id, category));
}

export const THORN_SKILL_DISABLED = "thorn_skill_disabled";
export function isThornSkillDisabled(player: { buffs: readonly { id: string; stateType?: string }[]; bigCards?: PlayerState["bigCards"] } | undefined,
  skillId: string): boolean {
  return Boolean(player?.buffs.some((buff) => buff.id === `${THORN_SKILL_DISABLED}:${skillId}`) && !negativeStatusesHaveNoEffect(player));
}

export function ignoresEffectCategory(player: Pick<PlayerState, "buffs">, category: EffectCategory): boolean {
  return player.buffs.some((buff) => buff.ignoredEffectCategories?.includes(category) &&
    (!buff.sourceAbilityId || !isSkillIgnored(player, buff.sourceAbilityId)));
}

type NegativeStatusView = { buffs: ReadonlyArray<{ id?: string; stateType?: string; sourceAbilityId?: SkillId; unaffectedByNegativeStatuses?: true }>;
  bigCards?: PlayerState["bigCards"] };

export function isUnaffectedByNegativeStatuses(player: NegativeStatusView | undefined): boolean {
  return Boolean(player?.buffs.some((buff) => buff.unaffectedByNegativeStatuses &&
    (!buff.sourceAbilityId || !isSkillIgnored(player, buff.sourceAbilityId))));
}

export function negativeStatusesHaveNoEffect(player: NegativeStatusView | undefined): boolean {
  return isUnaffectedByNegativeStatuses(player) || ignoresNegativeStatuses(player);
}
export function ignoresNegativeStatuses(player: { buffs: ReadonlyArray<{ id?: string; stateType?: string }>; bigCards?: PlayerState["bigCards"] } | undefined): boolean {
  return Boolean(player && (player.buffs.some((buff) => buff.stateType === "dragon_dominion_protection") ||
    !isSkillIgnored(player, CHARITY_LINK_ID) && player.buffs.some((buff) => buff.stateType === CHARITY_GROUP) ||
    !isSkillIgnored(player, PURPLE_PIERCE_ID) && !player.buffs.some((buff) => buff.id === "tianmang_locked_disabled" ||
      buff.id === `sealed_skill:${PURPLE_PIERCE_ID}` || Boolean(buff.id && isAllSkillsSealedBuff(buff.id))) &&
    player.bigCards?.some((card) => !card.junengDisabled && bigCardHasAbility(card, PURPLE_PIERCE_ID))));
}
export function effectCategoryIsSuppressed(player: PlayerState, category: EffectCategory): boolean {
  return player.buffs.some((buff) => buff.suppressedEffectCategories?.includes(category) &&
    (!negativeStatusesHaveNoEffect(player) || !stateHasCategory(buff, "negative")));
}
export function effectIsSuppressed(player: PlayerState, effectId: string): boolean {
  return isThornSkillDisabled(player, effectId) || swordArrayNoCakeSuppressesPassive(player, effectId) ||
    [...(effects.get(effectId) ?? [])].some((category) => effectCategoryIsSuppressed(player, category));
}

export function getSkillActivationKind(skill: Pick<SkillDefinition, "timingPhases">): "active" | "passive" {
  return skill.timingPhases.some((phase) => ACTION_WINDOW_PHASES.has(phase)) ? "active" : "passive";
}

export function isSkillSuppressedByBuff(id: string): boolean {
  return isAllSkillsSealedBuff(id) || id.startsWith(SKILL_DISABLED_BUFF_PREFIX) || id === BUBBLE_SKILLS_DISABLED;
}

export function isAllSkillsSealedBuff(id: string): boolean {
  return id.startsWith(`${ALL_SKILLS_SEALED_BUFF_ID}:`);
}

export function isBigCardAbilityIgnored(target: Pick<PlayerState, "buffs">, skill: Pick<RawSkillDefinition, "id" | "typeTags">,
  ignoreLockIgnore = false): boolean {
  if (!isSkillIgnorable(skill.id)) return false;
  return target.buffs.some((buff) => buff.ignoredSkillIds?.includes(skill.id) ||
    buff.ignoredBigCardIds?.includes(skill.id.slice(0, 5)) ||
    skill.typeTags.some((tag) => (tag !== "锁定技" || !ignoreLockIgnore) && buff.ignoredSkillTypeTags?.includes(tag)));
}
export function pruneExpiredDamageShields(state: Pick<GameState, "players" | "roundNumber">): void {
  for (const player of state.players) {
    const expired = player.buffs.filter((buff) => buff.clearsDamageShieldsOnExpiry && (buff.expiresAtRound ?? Infinity) <= state.roundNumber);
    if (expired.length) player.buffs = player.buffs.filter((buff) => buff.stateType !== SHIELD_STATE_TYPE && !expired.includes(buff));
  }
}

/** Only the new explicitly typed states use these exclusive expiry boundaries. */
export function pruneRegisteredStates(state: Pick<GameState, "players" | "roundNumber" | "turnNumber">): void {
  pruneExpiredDamageShields(state);
  for (const player of state.players) {
    player.buffs = player.buffs.filter((buff) => !buff.stateType ||
      (buff.expiresAtRound === undefined || buff.expiresAtRound > state.roundNumber) &&
      (buff.expiresAtTurn === undefined || buff.expiresAtTurn > state.turnNumber));
  }
}
export function isTypedSkillSuppressed(player: Pick<PlayerState, "buffs" | "bigCards"> | undefined, skill: Pick<RawSkillDefinition, "typeTags" | "id"> | undefined): boolean {
  if (!player || !skill) return false;
  if (isLockedSkillSuppressed(player, skill)) return true;
  const limited = skill.typeTags.includes("限定技");
  if (limited && player.buffs.some((buff) => buff.id === "tianmang_limited_disabled" || buff.stateType === "tianmang_limited_disabled")) return true;
  return !negativeStatusesHaveNoEffect(player) && player.buffs.some((buff) =>
    buff.stateType === "limited_disabled" && limited ||
    buff.stateType === "control_disabled" && skill.typeTags.includes("控制技"));
}

const bigCardAttributes = new Map(RAW_BIG_CARD_CATALOG.map(({ id, attribute }) => [id, attribute]));

export function isLightBigCardSkill(skillId: string): boolean {
  const cardId = skillId.slice(0, 5);
  if (cardId === "10654") return ["1065401", "1065409", "1065411"].includes(skillId.split("_")[0]!);
  return bigCardAttributes.get(cardId)?.includes("光") ?? false;
}

export function isAttributeSkillSuppressed(player: { buffs: ReadonlyArray<{ id: string; stateType?: string }>; bigCards?: PlayerState["bigCards"] } | undefined,
  skill: Pick<RawSkillDefinition, "id" | "attribute"> | undefined): boolean {
  if (!player || !skill) return false;
  if (player.buffs.some((buff) => buff.stateType === CURTAIN_DARK_STATE) && isLightBigCardSkill(skill.id)) return true;
  if (!player.buffs.some((buff) => buff.id === SPRING_ICE_FIRE_DISABLED) || negativeStatusesHaveNoEffect(player)) return false;
  const attribute = skill.attribute ?? RAW_BIG_CARD_CATALOG.find((card) => skill.id.startsWith(card.id))?.attribute;
  return attribute === "ice" || attribute === "fire" || attribute === "冰" || attribute === "火";
}

/** Apply only at beneficial number fields of grass-card abilities. */
export function getSpringGrassNumber(player: { buffs: ReadonlyArray<{ id: string }> }, abilityId: string, value: number): number {
  return player.buffs.some((buff) => buff.id === SPRING_GRASS_BOOST) &&
    RAW_BIG_CARD_CATALOG.find((card) => abilityId.startsWith(card.id))?.attribute === "草" ? value * 2 : value;
}

export function isLockedSkillSuppressed(player: { buffs: readonly { id: string }[]; bigCards?: PlayerState["bigCards"] },
  skill: Pick<RawSkillDefinition, "typeTags"> & Partial<Pick<RawSkillDefinition, "id">> | undefined): boolean {
  if (!skill?.typeTags.includes("锁定技") || !player.buffs.some((buff) => buff.id === "tianmang_locked_disabled")) return false;
  const id = skill.id;
  return !(id?.startsWith(DEAD_REALM_CARD_ID) && player.bigCards?.some((card) =>
    card.deadRealmUnlocked && !card.junengDisabled && bigCardHasAbility(card, id)));
}

for (const [id, name] of [["fenshi_flames", "焚世烈焰"], ["skill_rebound", "技能反弹"],
  ["skill_attack_block", "技能防御"], ["gather_invulnerability", "聚·无敌"]])
  registerStateDefinition({ id: id!, name: name!, categories: ["positive"] });
registerStateDefinition({ id: "element_resource", name: "元素资源", categories: ["element"] });
registerStateDefinition({ id: "youkai_half", name: "半妖化", categories: [] });
registerStateDefinition({ id: "youkai_full", name: "妖化", categories: [] });
registerStateDefinition({ id: "youkai_ritual", name: "未央鬼祭", categories: [] });
registerStateDefinition({ id: "shadow_dance", name: "影舞", categories: [] });
registerStateDefinition({ id: "shadow_next_damage", name: "下一次伤害增幅", categories: ["positive"] });
registerStateDefinition({ id: "divine_reversal_flame", name: "怒炎", categories: [] });
registerStateDefinition({ id: "kuiji_cake_growth", name: "窥觊苍生·出饼×3", categories: ["positive"] });
registerStateDefinition({ id: "star_negative_guard", name: "异星共振·无视指定来源不良", categories: ["positive"] });
registerStateDefinition({ id: "juneng_boost", name: "聚能湮灭炮·数值增强", categories: ["positive"] });
registerStateDefinition({ id: "thunder_rite", name: "雷祭", categories: ["positive"] });
registerStateDefinition({ id: "tianlie_rage", name: "狂化", categories: ["positive"] });
registerStateDefinition({ id: "jueying_harvest", name: "绝影逆魂·夺取回血", categories: ["positive"] });
registerStateDefinition({ id: "xieling_body", name: "邪·不灭魔躯", categories: ["positive"] });
registerStateDefinition({ id: "xieling_negative_reflect", name: "邪灵变·反弹不良", categories: ["positive"] });
registerStateDefinition({ id: "tianmang_cake_growth", name: "快速创造", categories: ["positive"] });
registerStateDefinition({ id: "tianmang_free_fusion", name: "极速创造", categories: ["positive"] });
registerStateDefinition({ id: "wind_haste", name: "风·疾行", categories: ["positive"] });
registerStateDefinition({ id: "siphon_life_channel", name: "生命通道", categories: ["positive"] });
registerStateDefinition({ id: "siphon_abyss", name: "虹吸之渊", categories: ["positive"] });
registerStateDefinition({ id: "siphon_greed_chain", name: "贪婪锁链", categories: [] });
registerStateDefinition({ id: "purple_eye_temporary_skill_gain", name: "入微·暂时获得子技能", categories: ["positive"] });
registerEffectCategories("1053002", ["skill_loss", "skill_gain"]);
registerEffectCategories("1052803", ["life_absorption", "skill_absorption"]);
registerEffectCategories("1052805", ["life_absorption", "skill_absorption"]);
registerEffectCategories("1050601", ["skill_absorption"]);
registerEffectCategories("1050706", ["skill_absorption"]);
registerEffectCategories("1050502", ["skill_copy"]);
registerEffectCategories("1050701", ["skill_gain"]);
for (const id of [KURONG_LEAF_ID, SOUL_PACT_ID]) registerEffectCategories(id, ["skill_gain"]);
registerEffectCategories(KUIJI_ULTIMATE_ID, ["skill_loss"]);
registerEffectCategories(VERDICT_REWARD_ID, ["skill_loss", "remove_skills"]);
registerEffectCategories("1050206", ["restore_initial"]);
registerEffectCategories("1051604", ["life_absorption"]);
registerEffectCategories("1051804", ["return_to_past"]);
registerEffectCategories("1092:public_victory_counter", ["victory_reverse"]);
registerEffectCategories("1051305", ["victory_reverse", "victory_transfer"]);
registerEffectCategories("1055207", ["victory_transfer"]);
registerStateDefinition({ id: "sky_absolute", name: "凌空·天绝", categories: ["positive"] });
registerStateDefinition({ id: "ancient_roar_duration", name: "太古的怒吼", categories: ["positive"] });
registerStateDefinition({ id: "mountain_seal_numbers", name: "山海封印·数值调整", categories: ["positive"] });
registerEffectCategories("1051703", ["skill_loss"]);
for (const id of ["1050906", "1052007", "1052609", "1061103", "1061304", "1062310", "1062605", "1063102",
  "1063802", "1064701", "1070501", "1071406", "1072002", "1073303", "1074002", "1074305", "1080805",
  "1080907", "1081303", "1082001", "1082503", "2080805"]) registerEffectCategories(id, ["negative_status_immunity"]);
for (const id of ["1052307", "1052411", "1055604", "1061103", "1061203", "1063606", "1071501", "1072002",
  "1072902", "1073303", "1074502", "1080106", "1080804", "1081407", "1083004", "2091705"])
  registerEffectCategories(id, ["negative_status_cleanse"]);
for (const recipe of [...FUSION_RECIPES, ...HIGHER_FUSION_RECIPES]) {
  if (recipe.skill.name === "纯净苍穹" || recipe.skill.name === "天人合一")
    registerEffectCategories(recipe.skill.id, ["negative_status_immunity"]);
}
registerEffectCategories("1049", ["damage_reduction"]);
for (const id of ["1072", "fusion_9ef124aee213", "fusion_efd42942c4a3", DEMON_TYRANT_ID, DEMON_VOIDWALKER_ID])
  registerEffectCategories(id, ["damage_reduction"]);
registerEffectCategories("1054302", ["damage_reduction", "defense_skill"]);
registerEffectCategories("1054608", ["defense_skill"]);
registerEffectCategories("1054612", ["damage_evasion", "defense_skill"]);
registerEffectCategories("1054614", ["restore_initial"]);
registerEffectCategories("1054805", ["defense_skill"]);
registerEffectCategories("1054901", ["damage_evasion", "defense_skill"]);
registerEffectCategories("1050903", ["damage_reduction"]);
registerEffectCategories("1102", ["damage_evasion"]);
registerEffectCategories("1013", ["remove_fire_skills"]);
registerEffectCategories("1074", ["damage_immunity"]);
registerEffectCategories("1054001", ["damage_immunity"]);
registerEffectCategories("1054101", ["damage_evasion", "defense_skill"]);
registerEffectCategories(ERA_AREA, ["damage_ignore"]);
registerEffectCategories(ERA_EXTEND, ["defense_skill"]);
registerEffectCategories(FATE_EYE_WARD, ["damage_immunity", "defense_skill"]);
registerEffectCategories(SANCTUARY_GATE_ID, ["move_invalidation"]);
registerEffectCategories(SANCTUARY_WARD_ID, ["damage_immunity", "defense_skill"]);
registerEffectCategories(SANCTUARY_AURA_ID, ["defense_skill"]);
registerEffectCategories(STAR_MOON_BURST, ["skill_invalidation"]);
registerEffectCategories(STAR_MOON_DANCE, ["skill_gain"]);
registerEffectCategories(STAR_MOON_GLEAM, ["defense_skill", "negative_status_cleanse", "negative_status_immunity"]);
registerEffectCategories(STAR_MOON_RIVER, ["defense_skill", "damage_evasion"]);
registerEffectCategories("1061601", ["damage_ignore"]);
registerEffectCategories("1061603", ["remove_skills"]);
registerEffectCategories("1061604", ["damage_ignore"]);
registerEffectCategories("1061605", ["skill_discard", "skill_effect_immunity", "damage_immunity", "defense_skill", "negative_status_reflection"]);
registerEffectCategories("1061606", ["skill_discard"]);
registerEffectCategories("1061701", ["damage_ignore"]);
registerEffectCategories("1061702", ["restore_initial"]);
registerStateDefinition({ id: STAR_MOON_RIVER_DODGE, name: "月照星河·回避招式", categories: ["positive"] });
registerStateDefinition({ id: STAR_MOON_TEMPORARY_CARD, name: "星月狂舞·暂时获得大卡", categories: ["positive"] });
registerStateDefinition({ id: SANCTUARY_AURA_STATE, name: "圣光气·攻击增幅", categories: ["positive"] });
for (const id of ["1024", "1025", "1031", "1037", "1038", "1050", "1054", "1055", "1056", "1084", "1098", "1113",
  "1050102", "1050401", "1050403", "1050404", "1050602", "1050703", "1050906", "1051104",
  "1051803", "1051805", "1051904", "1052003", "1052008", "1052009", "1052104", "1052302", "1052309", "1052310", "1052405", "1053203",
  GATHER_STAR_ID, DRAGON_HEIR_ID, DRAGON_DOMINION_ID, XIELING_TRANSFORM_ID, UTOPIA_FIELD_ID, SHENGLING_ID,
  TIANMANG_GATHER_ID, TIANMANG_MIRROR_ID, TIANMANG_SAND_ID, WIND_SCOUT_ID])
  registerEffectCategories(id, ["defense_skill"]);
for (const recipe of [...FUSION_RECIPES, ...HIGHER_FUSION_RECIPES]) {
  if (["辉月", "空城计", "六芒星阵", "名刀司命", "天空之城", "弹力球", "三元协奏曲", "神鬼罩", "幻境双罩", "绝对天盾", "神之庇护", "电闪雷鸣", "雷霆之魂"].includes(recipe.skill.name))
    registerEffectCategories(recipe.skill.id, ["defense_skill"]);
}
registerEffectCategories("temp_six_star_immunity", ["damage_immunity"]);
for (const recipe of FUSION_RECIPES.filter(({ skill }) => ["自然之灵", "帝灵之境"].includes(skill.name))) {
  registerEffectCategories(recipe.skill.id, ["damage_immunity"]);
}
const iceFireEye = FUSION_RECIPES.find((recipe) => recipe.skill.name === "冰火两仪眼");
if (iceFireEye) registerEffectCategories(iceFireEye.skill.id, ["remove_fire_skills"]);
