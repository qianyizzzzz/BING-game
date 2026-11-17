import { BUBBLE_AVENGER, BUBBLE_DESTINY, BUBBLE_DREAM_CARD, BUBBLE_ENHANCE, BUBBLE_FATE, BUBBLE_FINALE, BUBBLE_FORGET,
  BUBBLE_REBUILD, BUBBLE_WITCH } from "../engine/bubbleDreamIds";
import { isRedLotusAnytimeSkill, RED_LOTUS_CARD_ID, RED_LOTUS_FINALE, RED_LOTUS_HEART, RED_LOTUS_KARMA, RED_LOTUS_LIFE, RED_LOTUS_NINE,
  RED_LOTUS_RAIN } from "../engine/redLotusIds";
import { ERA_CARD, ERA_CHOOSE_TARGETS, ERA_DAMAGE, ERA_EXTEND, ERA_FIELD_NAMES, ERA_FIRE, ERA_RESTART, isEraFieldId } from "../engine/eraIds";
import { FATE_ELEMENT, FATE_EYE_CARD_ID, FATE_EYE_GATHER, FATE_EYE_STRIKE, FATE_EYE_SWEEP, FATE_EYE_WARD } from "../engine/fateEyeIds";
import { SANCTUARY_AURA_ID, SANCTUARY_CARD_ID, SANCTUARY_GATE_ID, SANCTUARY_INHERIT_ID, SANCTUARY_SWEEP_ID, SANCTUARY_WARD_ID } from "../engine/sanctuaryIds";
import { YIYUAN_CARD, YIYUAN_CHANGE, YIYUAN_ETERNAL, YIYUAN_GOD, YIYUAN_MIMIC, YIYUAN_REPEAT, YIYUAN_RESTORE, YIYUAN_STEP } from "../engine/yiyuanIds";
import {
  MOON_ELEMENT, STAR_MOON_BURST, STAR_MOON_CARD_ID, STAR_MOON_CHOOSE_CARD, STAR_MOON_DANCE, STAR_MOON_FREE_HUIYUE,
  STAR_MOON_GATHER_MOON, STAR_MOON_GATHER_STAR, STAR_MOON_GLEAM, STAR_MOON_INHERIT, STAR_MOON_PIERCE, STAR_MOON_RIVER
} from "../engine/starMoonIds";
import {
  FALLEN_SPLENDOR_CARD_ID, FALLEN_SPLENDOR_CONVERT, FALLEN_SPLENDOR_DOUBLE, FALLEN_SPLENDOR_ELEMENTAL,
  FALLEN_SPLENDOR_EXECUTION, FALLEN_SPLENDOR_HEALING, FALLEN_SPLENDOR_IGNORE_DAMAGE,
  FALLEN_SPLENDOR_REBIRTH_STAGES, FALLEN_SPLENDOR_RELEASE
} from "../engine/fallenSplendorIds";
import {
  SPACE_BURST, SPACE_SHATTER, SPACE_TIME_CARD, SPACE_TIME_CHAOS, SPACE_TIME_GUARD, TIME_CONFUSION, TIME_RIFT
} from "../engine/spaceTimeIds";
import { INFINITE_DAMAGE, MAX_ACTION_STACKS, MAX_PLAYERS, type PlayerState } from "../types";
import { isExplicitlyNonStackable, readSkillTypeTags, type SkillDefinition, type SkillPlayDefinition } from "../skills/types";
import { RAW_BIG_CARD_CATALOG } from "./generatedCatalog";
import { TIAN_YE_CARD_ID, TIAN_YE_CHOICE_ID } from "../engine/tianyeIds";
import { combatValue, INFINITY_VALUE, RETIRE_VALUE, VANISH_VALUE, scaleCombatValue } from "../engine/combatValues";
import { SEA_GOD_CARD_ID, SEA_GOD_DUSK_ID, SEA_GOD_RETURN_ID, SEA_GOD_TRIDENT_ID, SEA_GOD_WAVES_ID } from "../engine/seaGodIds";
export * from "../engine/seaGodIds";
import { KARMA_CARD_ID, KARMA_CONVERT_ID, KARMA_CYCLE_ID, KARMA_PUNISH_ID, KARMA_REBIRTH_ID, KARMA_SONG_END_ID, KARMA_SONG_ID } from "../engine/karmaCycleIds";
import { CHEAT_ABSOLUTE_ID, CHEAT_CARD_ID, CHEAT_GATHER_ID, CHEAT_GREED_ID, CHEAT_NOGLUES_ID, CHEAT_SHARP_DAMAGE_ID,
  CHEAT_SHARP_ID, CHEAT_TRANSFER_ID, CHEAT_VICTORY_ID, CHEAT_WARP_ID } from "../engine/cheatServerIds";
export * from "../engine/karmaCycleIds";
import { registerUnignorableSkill } from "../engine/skillIgnoreRules";
import { LONE_STAR_CARD_ID, LONE_STAR_STRIKE_ID, LONE_STAR_PIERCE_ID, LONE_STAR_RAGE_ID, LONE_STAR_FINALE_ID } from "../engine/loneStarIds";
import { THORN_BIND_ID, THORN_DANCE_CARD_ID, THORN_DANCE_ID, THORN_INHERIT_ID, THORN_PIERCE_ID, THORN_STING_ID } from "../engine/thornDanceIds";
import { ANTI_CAKE_MOVE_ID, VACUUM_CARD_ID, VACUUM_ENTER_ID, VACUUM_EXTRACT_ID, VACUUM_MAX_ID } from "../engine/vacuumIds";
export * from "../engine/vacuumIds";
import { CURTAIN_CARD_ID, CURTAIN_DARK_ID, CURTAIN_ENCORE_ID, CURTAIN_FINALE_ID, CURTAIN_INTERLUDE_ID, CURTAIN_OPEN_ID,
  CURTAIN_PRELUDE_ID, CURTAIN_REBIRTH_ID, CURTAIN_VEIL_ID } from "../engine/curtainIds";
import { CRYSTAL_CARD_ID, CRYSTAL_GUARD_ID, CRYSTAL_SHIELD_ID } from "../engine/divineCrystalIds";
import { CORRUPTION_CARD_ID, CORRUPTION_CLOUD_ID, CORRUPTION_DOMAIN_ID, CORRUPTION_FIELD_ID,
  CORRUPTION_ROT_ID } from "../engine/corruptionIds";
import { DEAD_REALM_CARD_ID, DEAD_REALM_FALLBACK_ID } from "../engine/deadRealmIds";
import { DEMON_ABYSS_ID, DEMON_CARD_ID, DEMON_GUARD_ID, DEMON_GUARD_ORDER_ID, DEMON_IMP_ID,
  DEMON_IMP_ORDER_ID, DEMON_FEAR_BITE, DEMON_EVIL_BITE, DEMON_WHIRLWIND, DEMON_LEGION_AREA, DEMON_LEGION_SINGLE,
  isTargetedDemonSummon } from "../engine/demonIds";
import { YOUKAI_CARD_ID, YOUKAI_ELEMENT, YOUKAI_FULL_ID, YOUKAI_HALF_ID, YOUKAI_LAYERS_ID,
  YOUKAI_RESOURCE_ID, YOUKAI_RITUAL_ID, YOUKAI_SOUL_ID, YOUKAI_WIND_ID } from "../engine/youkaiIds";
import {
  SHADOW_BLADE_DANCE_ID, SHADOW_BLADE_ID, SHADOW_CARD_ID, SHADOW_COMBO_ID, SHADOW_FOLLOW_ID, SHADOW_LEAVE_ID, SHADOW_SHRIEK_ID,
  SHADOW_STOP_SHRIEK_ID, SHADOW_WIND_DANCE_ID
} from "../engine/shadowIds";
import { ACTION_WINDOW_PHASES } from "../skills/phases";
import { YUAN_CARD_ID, YUAN_ORIGIN_ID, YUAN_RESTART_ID, YUAN_RETURN_ID, YUAN_VOID_ID } from "../engine/yuanIds";
import { SUN_CARD_ID, SUN_CROWN_ID, SUN_GLORY_ID, SUN_RETURN_ID } from "../engine/sunIds";
import { getBigCardLimitedRemaining } from "../engine/limitedUseBalance";
import { MOON_CARD_ID, MOON_CHANT_ID, MOON_DANCE_ID, MOON_GRIEF_ID, MOON_PRAISE_ID, MOON_PUNISH_ID,
  MOON_RITUAL_ID, MOON_SHADOW_ID, MOON_TIDE_ID } from "../engine/moonIds";
import { SWORD_ARRAY_CARD_ID, SWORD_ARRAY_EXECUTE_ID, SWORD_ARRAY_LIMIT_ID, SWORD_ARRAY_OUTCOMES, SWORD_ARRAY_PLACE_ID } from "../engine/swordArrayIds";
import { BLADE_MAINTENANCE_IDS, BROKEN_BLADE_CARD_ID, BROKEN_BLADE_TIERS } from "../engine/brokenBladeIds";
import { DECAY_CARD_ID, DECAY_EXTREME_ID, DECAY_HALF_ID, DECAY_SPREAD_ID, isDecayAbilityUnlocked } from "../engine/decayIds";
import { STAR_WHEEL_CARD, STAR_WHEEL_SHIFT, STAR_WHEEL_POSITION, STAR_WHEEL_BUY, STAR_WHEEL_SHUFFLE, STAR_WHEEL_SEAL,
  STAR_WHEEL_RELEASE, STAR_WHEEL_VICTORY } from "../engine/starWheelIds";
import { TOTEM_CARD_ID, TOTEM_CREATE_ID, TOTEM_CHOOSE_ID, TOTEM_KINDS } from "../engine/totemIds";
import { BIG_REVIVAL_SKILLS, prefixRevivalDescription } from "../skills/revivalSkillIds";
import { SWARM_CARD_ID, SWARM_RETURN_ID } from "../engine/swarmIds";
import { TIGER_CARD, TIGER_SWITCH, TIGER_SLASH, TIGER_GUARD, TIGER_STAB, TIGER_EXTINCTION, TIGER_EXTINCTION_MOVE,
  TIGER_KILL, TIGER_LOSS, TIGER_NETHER, TIGER_WHITE, TIGER_FINAL, TIGER_RESTORE, tigerAbilityActive } from "../engine/netherTigerIds";
import { FIVE_ELEMENTS_CARD, FIVE_ELEMENTS_CHOOSE, FIVE_ELEMENTS_FIRE, FIVE_ELEMENTS_ICE,
  FIVE_ELEMENTS_LEVEL, fiveElementsAbilityActive } from "../engine/fiveElementsIds";
import { HEXAGRAM_ABSOLUTE, HEXAGRAM_CARD, HEXAGRAM_CHOOSE, HEXAGRAM_RESTORE, HEXAGRAM_SPIRIT,
  hexagramAbilityActive } from "../engine/hexagramIds";
import { SEVEN_STAR_CARD, SEVEN_STAR_CHOOSE, SEVEN_STAR_TIANQUAN, SEVEN_STAR_YAOGUANG,
  SEVEN_STAR_YUHENG, sevenStarAbilityActive } from "../engine/sevenStarIds";
import { TIAN_SHA_CARD, TIAN_SHA_FINALE, TIAN_SHA_STAR_BREAK, TIAN_SHA_VERDICT } from "../engine/tianShaIds";
import { NINE_COLD, NINE_TRIBULATIONS_CARD } from "../engine/nineTribulationsIds";
import { DIVINE_REVERSAL_CARD_ID, DIVINE_FLAME_ID } from "../engine/divineReversalIds";
export * from "../engine/curtainIds";
export { THORN_BIND_ID, THORN_DANCE_CARD_ID, THORN_DANCE_ID, THORN_INHERIT_ID, THORN_PIERCE_ID, THORN_STING_ID } from "../engine/thornDanceIds";
export { LONE_STAR_CARD_ID, LONE_STAR_PASSIVE_ID, LONE_STAR_STRIKE_ID, LONE_STAR_PIERCE_ID, LONE_STAR_RAGE_ID, LONE_STAR_FINALE_ID } from "../engine/loneStarIds";

export const ABYSS_CARD_ID = "10528";
export const SAKURA_CARD_ID = "10531";
export const SAKURA_FALL_ID = "1053101";
export const SAKURA_BLOOM_ID = "1053102";
export const SAKURA_SPRING_ID = "1053103";
export const SAKURA_RAIN_ID = "1053104";
export const SAKURA_FINALE_ID = "1053105";
export const SAKURA_ELEMENT = "樱";
export const ETERNAL_CARD_ID = "10532";
export const ETERNAL_PROGRESS_ID = "1053201";
export const ETERNAL_BIND_ID = "1053202";
export const ETERNAL_THOUGHT_ID = "1053203";
export const ETERNAL_REPLACE_ID = "1053203_replace";
export const TRIPLE_SEAL_CARD_ID = "10533";
export const FIRE_TALISMAN_ID = "1053301";
export const WATER_TALISMAN_ID = "1053302";
export const WOOD_TALISMAN_ID = "1053303";
export const TALISMAN_OVERCOME_ID = "1053304";
export const TALISMAN_GENERATE_ID = "1053305";
export const TALISMAN_RULE_ID = "1053306";
export const TALISMAN_CONCERTO_ID = "1053307";
export const EMPTY_CITY_CARD_ID = "10534";
export const EMPTY_CITY_ILLUSION_ID = "1053401";
export const PSYCHIC_PIERCE_ID = "1053402";
export const EMPTY_CITY_CONTROL_ID = "1053403";
export const EMPTY_CITY_GUARD_ID = "1053404";
export const CHARITY_CARD_ID = "10535";
export const CHARITY_GRANT_ID = "1053501";
export const CHARITY_DESTINY_ID = "1053502";
export const CHARITY_QUICK_ID = "1053503";
export const CHARITY_LINK_ID = "1053504";
export const CHARITY_LINK_DESCRIPTION = "献身慈爱：5饼，减少自己一半血及初始血量，3轮内无视不良，指定1至任意多人，他们与你共享任意治愈效果，你的治愈术上限变为消失。";
export const ABYSS_INHERIT_ID = "1052801";
export const LIFE_CHANNEL_ID = "1052802";
export const SOUL_SIPHON_ID = "1052803";
export const GREED_CHAIN_ID = "1052804";
export const SIPHON_ABYSS_ID = "1052805";

export const GAME_SWITCH_CARD_ID = "10529";
export const GAME_SWITCH_ACTION_ID = "1052901";
export const GAME_SWITCH_PENALTY_ID = "1052902";
export const GAME_SWITCH_PENALTY_DESCRIPTION = "切换子局结束后，若你获胜，除胜者和你外的玩家各受到4点反噬伤害；若你失败，改为吸取除胜者和你外每名玩家2点血（标准法术伤害）。";
export const GAME_SWITCH_LIVES_ID = "1052903";
export const GAME_SWITCH_VICTORY_ID = "1052904";
export const PURPLE_EYE_CARD_ID = "10530";
export const PURPLE_GUESS_ID = "1053001";
export const PURPLE_INSIGHT_ID = "1053002";
export const PURPLE_FORESIGHT_ID = "1053003";
export const PURPLE_SCALE_ID = "1053004";
export const PURPLE_LIGHT_ID = "1053005";
export const PURPLE_PIERCE_ID = "1053006";
export const PURPLE_LOCK_ID = "1053007";
export const PURPLE_GUESS_DESCRIPTION = "纵观：锁定技。你有传音入密。每猜出1人1张完整技能，对其造成2点法伤，可对同一人重复触发。";
export const PURPLE_FORESIGHT_DESCRIPTION = "芥子：开局1次，每7轮+1次，获知1人下回合出招，该效果无视目标技能，回合前阶段使用。";
registerUnignorableSkill(GAME_SWITCH_VICTORY_ID);

export const SOUL_PACT_CARD_ID = "10527";
export const SOUL_INHERIT_ID = "1052701";
export const SOUL_IGNORE_ID = "1052702";
export const SOUL_EXTINGUISH_ID = "1052703";
export const SOUL_SINK_ID = "1052704";
export const SOUL_EXILE_ID = "1052705";
export const SOUL_PACT_ID = "1052706";
export const SOUL_ELEMENT = "魂";
export const SOUL_RESTORE_EXTINGUISH_ID = "1052703_restore";
export const SOUL_RESTORE_SINK_ID = "1052704_restore";

export const ASURA_CARD_ID = "10526";
export const ASURA_INHERIT_ID = "1052601";
export const ASURA_BLOOD_ID = "1052602";
export const ASURA_RAIN_ID = "1052603";
export const ASURA_DRAIN_ID = "1052604";
export const ASURA_LIFE_ID = "1052605";
export const ASURA_JUDGE_ID = "1052606";
export const ASURA_FERRY_ID = "1052607";
export const ASURA_RITUAL_UPGRADE_ID = "1052608";
export const ASURA_SWORD_ID = "1052609";
export const ASURA_IMMUNITY_ID = "1052609_immunity";
export const BLOOD_RITUAL_FUSION_ID = "3017";

export const SAND_CARD_ID = "10525";
export const SAND_ELEMENT = "沙";
export const SAND_INHERIT_ID = "1052501";
export const SAND_ARROWS_ID = "1052502";
export const SAND_INCOME_ID = "1052503";
export const SAND_DUST_ID = "1052504";
export const SAND_STORM_ID = "1052505";
export const SAND_GRANTS_ID = "1052506";
export const SAND_NULLIFY_ID = "1052507";
export const SAND_VORTEX_ID = "1052508";
export const SAND_TOWER_ID = "1052509";
export const SAND_WALTZ_ID = "1052510";
export const SAND_DESOLATION_ID = "1052511";

export const ULTIMATE_WIND_CARD_ID = "10524";
export const WIND_ELEMENT = "风";
export const WIND_INCOME_ID = "1052401";
export const WIND_SHIELD_ID = "1052402";
export const HURRICANE_ID = "1052403";
export const HURRICANE_CAKES_ID = "1052403_cakes";
export const WIND_STAR_ID = "1052404";
export const WIND_EYE_ID = "1052405";
export const WIND_HASTE_ID = "1052406";
export const WIND_SCOUT_ID = "1052407";
export const WIND_TRACK_ID = "1052408";
export const WIND_PURSUIT_ID = "1052409";
export const WIND_INHERIT_ID = "1052410";
export const WIND_SHUFFLE_ID = "1052411";

export const TIANMANG_CARD_ID = "10523";
export const TIANMANG_ELEMENT = "芒";
export const TIANMANG_GATHER_ID = "1052301";
export const TIANMANG_CONVERSION_ID = "1052302";
export const TIANMANG_MIRROR_ID = "1052303";
export const TIANMANG_SAND_ID = "1052304";
export const TIANMANG_CAKE_ID = "1052305";
export const TIANMANG_FUSION_ID = "1052306";
export const TIANMANG_CLEANSE_ID = "1052307";
export const TIANMANG_FIELD_CLEANSE_ID = "1052308";
export const TIANMANG_ABSORB_ID = "1052309";
export const TIANMANG_ABSORB_INFINITE_ID = "1052310";

export const GOD_KING_CARD_ID = "10522";
export const GOD_KING_RULES_ID = "1052201";
export const GOD_KING_JUDGMENT_ID = "1052202";
export const GOD_KING_SAINT_ID = "1052201_saint";

export const CHAOS_CARD_ID = "10521";
export const CHAOS_INHERIT_ID = "1052101";
export const CHAOS_GAIN_ID = "1052102";
export const CHAOS_PAID_GAIN_ID = "1052102_paid";
export const CHAOS_DEFENSE_ID = "1052103";
export const CHAOS_RELEASE_ID = "1052104";
export const CHAOS_EXILE_ID = "1052105";
export const CHAOS_WAVE_ID = "1052106";
export const CHAOS_ATTACK_ID = "1052107";
export const CHAOS_ELEMENT = "乱";

export const KAIGE_CARD_ID = "10520";
export const KAIGE_LIVES_ID = "1052001";
export const KAIGE_ELEMENTS_ID = "1052003";
export const KAIGE_HEAL_ID = "1052005";
export const KAIGE_CYCLE_ID = "1052006";
export const KAIGE_ETERNAL_ID = "1052007";
export const KAIGE_HOLY_ID = "1052008";
export const KAIGE_SHIELD_ID = "1052009";
export const KAIGE_KNOWLEDGE_ID = "1052010";
export const KAIGE_STAGE_NAMES = ["虚无", "元素", "力量", "生命", "轮回", "永恒", "圣洁"] as const;

export const FENTIAN_CARD_ID = "10501";
export const FENTIAN_ATTACK_ID = "1050101";
export const LAVA_ARMOR_ID = "1050102";
export const FENTIAN_INHERIT_ID = "1050103";
export const FENSHI_FLAMES_ID = "1050104";
export const HUNYAO_CARD_ID = "10502";
export const HUNYAO_AREA_ID = "1050201";
export const HUNYAO_LIGHT_ID = "1050202";
export const CHASE_LIGHT_ID = "1050203";
export const CHASE_SHADOW_ID = "1050204";
export const CHASE_SOUL_ID = "1050205";
export const HUNYAO_RESET_ID = "1050206";
export const JIHAN_CARD_ID = "10503";
export const JIHAN_INHERIT_ID = "1050301";
export const JIHAN_COUNTER_ID = "1050302";
export const JIHAN_DAMAGE_GROWTH_ID = "1050303";
export const JIHAN_FREEZE_ID = "1050304";
export const JIHAN_FREEZE_GROWTH_ID = "1050305";
export const POLAR_GALAXY_ID = "1050306";
export const JIHAN_SEAL_ID = "1050307";
export const JIHAN_SEAL_GROWTH_ID = "1050308";
export const JIHAN_ULTIMATE_ID = "1050309";
export const SUNSHINE_SKILL_ID = "1042";
export const ETERNAL_NIGHT_SKILL_ID = "1043";
export const RI_SKILL_ID = "1081";
export const DAWN_FUSION_ID = "4034";
registerUnignorableSkill(DAWN_FUSION_ID);
export const JUNENG_CARD_ID = "10504";
export const GATHER_ELEMENT_ID = "1050401";
export const JUNENG_INHERIT_ID = "1050402";
export const JUNENG_SHIELD_ID = "1050403";
export const ELECTROMAGNETIC_CANNON_ID = "1050404";
export const STORE_DAMAGE_ID = "1050405";
export const RELEASE_DAMAGE_ID = "1050405_release";
export const JUNENG_RESPONSE_ID = "1050406";
export const JUSHEN_ID = "1050407";
export const ANNIHILATION_CANNON_ID = "1050408";
export const JUNENG_ELEMENT = "聚";
export const SELF_DESTRUCTER_DEATH_SKILL_ID = "1101";
export const KUIJI_CARD_ID = "10505";
export const KUIJI_INHERIT_ID = "1050501";
export const KUISHI_ID = "1050502";
export const SELF_ISOLATION_ID = "1050503";
export const SPIRIT_GUIDANCE_ID = "1050504";
export const KUIJI_ULTIMATE_ID = "1050505";
export const STAR_CARD_ID = "10506";
export const GATHER_STAR_ID = "1050601";
export const STAR_RESONANCE_ID = "1050602";
export const STAR_RESIST_ID = "1050602_resist";
export const STAR_STRIKE_ID = "1050603";
export const STAR_INHERIT_ID = "1050604";
export const STAR_ELEMENT = "星";
export const DRAGON_CARD_ID = "10507";
export const DRAGON_DISAPPEAR_ID = "1050701";
export const DRAGON_INHERIT_ID = "1050702";
export const DRAGON_DANCE_ID = "1050703";
export const DRAGON_BLOOD_FIELD_ID = "1050704";
export const DRAGON_HEIR_ID = "1050705";
export const DRAGON_DOMINION_ID = "1050706";
export const VERDICT_CARD_ID = "10508";
export const VERDICT_ACTION_ID = "1050801";
export const VERDICT_GUARD_ID = "1050802";
export const VERDICT_REWARD_ID = "1050803";
export const VERDICT_INHERIT_ID = "1050804";
export const VERDICT_SAND_ID = "1050805";
export const QIANQIU_CARD_ID = "10509";
export const QIANQIU_RESPONSE_ID = "1050901";
export const RAGING_WAVES_ID = "1050902";
export const QIANQIU_REDUCTION_ID = "1050903";
export const THOUSAND_WAVES_ID = "1050904";
export const QIANQIU_INHERIT_ID = "1050905";
export const ENDURING_SEA_ID = "1050906";
export const YONGYAO_CARD_ID = "10510";
export const YONGYAO_INHERIT_ID = "1051001";
export const THUNDER_BALL_ID = "1051002";
export const THUNDER_STORM_ID = "1051003";
export const THUNDER_RITE_ID = "1051004";
export const ETERNAL_THUNDER_ID = "1051005";
export const TIANLIE_CARD_ID = "10511";
export const TIANLIE_INHERIT_ID = "1051101";
export const TIANLIE_CONTINUE_ID = "1051102";
export const TIANLIE_FEEDBACK_ID = "1051103";
export const TIANLIE_ATTACK_ID = "1051104";
export const TIANLIE_MIGHT_ID = "1051105";
export const TIANLIE_RAGE_ID = "1051106";
export const WUJIN_CARD_ID = "10512";
export const WUJIN_INHERIT_ID = "1051201";
export const WUJIN_FREE_MOVE_ID = "1051202";
export const WUJIN_REBOUND_ID = "1051203";
export const JUEYING_CARD_ID = "10513";
export const JUEYING_RETIRE_ID = "1051301";
export const JUEYING_RESTRICTION_ID = "1051302";
export const JUEYING_DEATH_ID = "1051303";
export const JUEYING_INHERIT_ID = "1051304";
export const JUEYING_VICTORY_ID = "1051305";
export const CHAOFAN_CARD_ID = "10514";
export const CHAOFAN_TREASURE_ID = "1051401";
export const CHAOFAN_JUDGMENT_ID = "1051402";
export const CHAOFAN_MULTIPLY_ID = "1051403";
export const XIELING_CARD_ID = "10515";
export const XIELING_INHERIT_ID = "1051501";
export const XIELING_TRANSFORM_ID = "1051502";
export const XIELING_INVASION_ID = "1051503";
export const XIELING_AMBUSH_ID = "1051504";
export const XIELING_BODY_ID = "1051505";
export const XIELING_RESET_ID = "1051506";
export const XIELING_ULTIMATE_ID = "1051507";
export const XIELING_ELEMENT = "邪";
export const KURONG_CARD_ID = "10516";
export const KURONG_INHERIT_ID = "1051601";
export const KURONG_LEAF_ID = "1051602";
export const KURONG_CAKES_ID = "1051603";
export const KURONG_ATTACK_ID = "1051604";
export const UTOPIA_CARD_ID = "10517";
export const UTOPIA_MOVE_ID = "1051701";
export const UTOPIA_DREAM_ID = "1051702";
export const UTOPIA_FIELD_ID = "1051703";
export const UTOPIA_VICTORY_ID = "1051704";
export const DREAM_ELEMENT = "梦";
export const HONGHUANG_CARD_ID = "10518";
export const HONGHUANG_INHERIT_ID = "1051801";
export const SACRED_BEAST_ID = "1051802";
export const MOUNTAIN_SEAL_ID = "1051803";
export const TIME_REWIND_ID = "1051804";
export const ANCIENT_ROAR_ID = "1051805";
export const HONGHUANG_ATTACK_ID = "1051806";
export const LINGTA_CARD_ID = "10519";
export const LINGTA_INHERIT_ID = "1051901";
export const CLOUD_SEA_ID = "1051902";
export const CLOUD_BYPASS_ID = "1051902_bypass";
export const SHENGLING_ID = "1051903";
export const SKY_ABSOLUTE_ID = "1051904";
export const SKY_STRIKE_ID = "1051905";
export const LINGTA_VICTORY_ID = "1051906";
export const LING_ELEMENT = "凌";
for (const id of [JUEYING_RESTRICTION_ID, JUEYING_DEATH_ID, JUEYING_VICTORY_ID]) registerUnignorableSkill(id);
export const SKY_THUNDER_FUSION_ID = "4006";
export const FOUR_EMPTINESS_ID = "4007";
export const SLOT_MACHINE_ID = "3013";
export const MORE_TRIES_ID = "4008";
export const HEALING_ART_ID = "1063";
export const KUIJI_SKILL_GRANTS = [
  { name: "封印", skillId: "1004" }, { name: "治愈术", skillId: HEALING_ART_ID },
  { name: "虚无", fusion: true }, { name: "天空之城", fusion: true }
] as const;

export const HUNYAO_SKILL_GRANTS: ReadonlyArray<{ name: string; skillId: string; unignorable?: true }> = [
  { name: "阳光普照", skillId: SUNSHINE_SKILL_ID },
  { name: "破晓", skillId: DAWN_FUSION_ID, unignorable: true }
];

export const FENTIAN_FUSION_GRANTS = ["天火之狱", "炽焰"] as const;
export const JIHAN_SKILL_GRANTS: ReadonlyArray<{ name: string; kind: "fusion" | "pending" }> = [
  { name: "极寒风暴", kind: "fusion" },
  { name: "大雪球", kind: "fusion" },
  { name: "极寒", kind: "fusion" }
];

export const BIG_CARD_SKILLS: Record<string, SkillDefinition> = Object.fromEntries([
  { id: FENTIAN_ATTACK_ID, name: "焚天君燚", description: "4饼，命中判定时清除全场（含自己）良好状态、元素、饼及防御值。对一人攻4+3+2，10级，油条防；攻击加成作用于每段，数值交换只使用第一段主值。命中后分别施加2回合烧伤、3轮限定技失效、2轮控制技失效。",
    play: { kind: "attack" as const, cost: 4, maxStacks: MAX_ACTION_STACKS, targetMode: "single" as const, power: 4, level: 10,
      damageParts: [4, 3, 2], defenseTag: "youtiao" as const, element: "fire" as const } },
  { id: LAVA_ARMOR_ID, name: "熔岩天甲", description: "2饼，本回合获得无法破除的技能反弹，反弹不超过无限的攻击回发出者；自身+4防御值，可指定至多2名玩家本轮无法减伤或回避伤害。绝弹、散弹不改变技能反弹。",
    play: { kind: "effect" as const, cost: 2, maxStacks: MAX_ACTION_STACKS, targetMode: "none" as const, optionalTargetCount: 2 } },
  { id: FENSHI_FLAMES_ID, name: "焚世烈焰", description: "5饼，获得独立存在的3轮良好状态。有效期内，你在本次伤害判定批次的火伤参与致死时，赋予目标一份焚烬，成功复活后随机烧去一张大卡，再移除该份焚烬。",
    play: { kind: "effect" as const, cost: 5, maxStacks: MAX_ACTION_STACKS, targetMode: "none" as const } },
  { id: FENTIAN_INHERIT_ID, name: "焚天君燚·继承", description: "获得天火之狱和炽焰，并无视消除火系类技能。" }
].map((entry) => [entry.id, { ...entry, implemented: true, fusion: "", attribute: "fire", category: "king_card", sourceRow: 3,
  exposureTiming: "使用时", tags: ["火系技能"], typeTags: [], timingPhases: entry.id === FENTIAN_INHERIT_ID ? ["passive_check"] : ["turn_action"], hooks: {} } as SkillDefinition]));

const jihanAbilities: Array<Pick<SkillDefinition, "id" | "name" | "description" | "play">> = [
  { id: JIHAN_INHERIT_ID, name: "极寒之拥·继承",
    description: "获得大雪球、极寒风暴和极寒。出招反弹后的攻击实际造成多少伤害，你的技能判定就视为你造成了多少伤害。" },
  { id: JIHAN_COUNTER_ID, name: "极寒之拥·冰伤反击",
    description: "受到攻击且未防住时，对其他玩家造成1点起的冰系法伤。回避仍算未防住。该法伤无视伤害免疫及只针对伤害的无视。" },
  { id: JIHAN_DAMAGE_GROWTH_ID, name: "极寒之拥·冰伤积累",
    description: "每造成X点伤害，第二条的冰系法伤增加X。该法伤超过100点时变为无限。" },
  { id: JIHAN_FREEZE_ID, name: "极寒之拥·冰封反制", description: "攻击被防住时，冰封该攻击的所有目标2回合起。" },
  { id: JIHAN_FREEZE_GROWTH_ID, name: "极寒之拥·冰封积累",
    description: "每防住一次攻击，冰封增加2回合。无敌或抵挡成功也计入。超过20回合时变为无限。" },
  { id: POLAR_GALAXY_ID, name: "极地银河", description: "2饼，群攻4，8级，石头防。每有一名可判定的实际目标未用石头防住，自身加10血。",
    play: { kind: "attack", cost: 2, maxStacks: MAX_ACTION_STACKS, targetMode: "all", power: 4, level: 8, defenseTag: "stone" } },
  { id: JIHAN_SEAL_ID, name: "极寒之拥·封锁", description: "主出招阶段，非攻击招式命中或防住非攻击招式时，封锁对方技能1回合起。" },
  { id: JIHAN_SEAL_GROWTH_ID, name: "极寒之拥·封锁积累",
    description: "每次符合封锁条件，后续封锁增加1回合。超过10回合时变为无限。" },
  { id: JIHAN_ULTIMATE_ID, name: "极寒之拥", description: "8饼，对其他玩家造成无限冰系法伤、冰封3轮并封锁技能2轮。",
    play: { kind: "effect", cost: 8, maxStacks: MAX_ACTION_STACKS, targetMode: "all" } }
];
for (const entry of jihanAbilities) {
  BIG_CARD_SKILLS[entry.id] = {
    ...entry, implemented: true, fusion: "", attribute: "ice", category: "king_card", sourceRow: 5,
    exposureTiming: entry.play ? "使用时" : "触发时", tags: ["冰系技能"],
    typeTags: entry.play || entry.id === JIHAN_INHERIT_ID ? [] : ["锁定技"],
    timingPhases: entry.play ? ["turn_action"] : ["passive_check"], hooks: {}
  };
}

const hunyaoAbilities: Array<Pick<SkillDefinition, "id" | "name" | "description" | "play">> = [
  { id: HUNYAO_AREA_ID, name: "魂耀九州·群攻", description: "作用于你的那一份群体攻击出招无效；其他玩家原本指向你的攻击变为群攻；你的群攻攻击等级×3。" },
  { id: HUNYAO_LIGHT_ID, name: "魂耀九州·光耀", description: "获得阳光普照与破晓，无视阳光普照与永远之夜。日改为每重4级的群攻，可享受群攻增幅。破晓按本局实际出日逐重计数，第1重攻4，之后每重加1攻。" },
  { id: CHASE_LIGHT_ID, name: "追光者", description: "1饼。常规复活结束后，可尝试复活一名死者。成功率70%，另有50%概率绕过三魂的限制。",
    play: { kind: "effect", cost: 1, maxStacks: MAX_ACTION_STACKS, targetMode: "single" } },
  { id: CHASE_SHADOW_ID, name: "追影者", description: "2饼。50%概率使一名退游者进入游戏，另有40%概率绕过场上技能的限制。",
    play: { kind: "effect", cost: 2, maxStacks: MAX_ACTION_STACKS, targetMode: "single" } },
  { id: CHASE_SOUL_ID, name: "追魂者", description: "3饼。30%概率使一名死亡、退游或消失的玩家回来；在回合前或变招阶段，另有30%概率对所有其他目标发出必杀级的杀。",
    play: { kind: "effect", cost: 3, maxStacks: MAX_ACTION_STACKS, targetMode: "single" } },
  { id: HUNYAO_RESET_ID, name: "魂耀九州·恢复至初始", description: "死亡、退游或消失时，若手中有10个本轮出饼积累的饼，则消耗它们并恢复至开局快照。快照中保有的三追概率提升至100%。" }
];

export function isHunyaoPursuit(skillId: string): boolean {
  return skillId === CHASE_LIGHT_ID || skillId === CHASE_SHADOW_ID || skillId === CHASE_SOUL_ID;
}

for (const entry of hunyaoAbilities) {
  BIG_CARD_SKILLS[entry.id] = {
    ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 4,
    exposureTiming: "使用时", tags: [], typeTags: entry.play ? ["控制技"] : ["锁定技"],
    timingPhases: entry.play ? [
      "round_pre_interval_action", "round_before_action", "turn_before_action",
      "turn_change_action", "turn_damage_modify", "turn_end_action",
      "turn_after_interval_action", "round_after_interval_action"
    ] : ["passive_check"],
    hooks: {}
  };
}

const junengAbilities: Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">> = [
  { id: GATHER_ELEMENT_ID, name: "聚", description: "2饼，获得1聚，本回合无敌。",
    play: { kind: "effect", cost: 2, maxStacks: MAX_ACTION_STACKS, targetMode: "none" }, timingPhases: ["turn_action"], typeTags: [] },
  { id: JUNENG_INHERIT_ID, name: "聚能湮灭炮·继承", description: "获得毁灭之盾、末世和自爆者死。全力一击的等级变为0。", timingPhases: ["passive_check"], typeTags: [] },
  { id: JUNENG_SHIELD_ID, name: "聚能盾", description: "消耗X聚，增加10X防御值。本回合防御攻≤10X、反弹攻≤3X。",
    play: { kind: "effect", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 1 }, maxStacks: MAX_ACTION_STACKS, targetMode: "none" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: ELECTROMAGNETIC_CANNON_ID, name: "电磁炮", description: "2聚，对其他玩家造成20点法伤，本回合技能反弹攻≤∞。",
    play: { kind: "effect", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 2 }, maxStacks: MAX_ACTION_STACKS, targetMode: "all" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: STORE_DAMAGE_ID, name: "储存伤害", description: "1聚，免疫并储存一份不超过退游的伤害，释放时伤害×3。退游伤害保持原值。",
    play: { kind: "effect", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 1 }, maxStacks: MAX_ACTION_STACKS, targetMode: "none" },
    timingPhases: ["turn_damage_modify"], typeTags: ["控制技"] },
  { id: RELEASE_DAMAGE_ID, name: "释放伤害", description: "选择一份储存的伤害，对指定玩家释放，保留原伤害类别与属性，穿透伤害反弹。",
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: MAX_ACTION_STACKS, targetMode: "single" },
    timingPhases: ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_action", "turn_change_action",
      "turn_damage_modify", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"], typeTags: ["控制技"] },
  { id: JUNENG_RESPONSE_ID, name: "聚能湮灭炮·电系响应",
    description: "被电系攻击命中并实际受伤后，下一轮此卡停用，再后两轮使此卡已确认的有利数值乘2、不利数值除以2并向上取整。",
    timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: JUSHEN_ID, name: "聚神", description: "7聚，先制重开。直到本轮后第2轮轮末，所有人只能选择指定玩家为目标。",
    play: { kind: "effect", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 7 }, maxStacks: MAX_ACTION_STACKS, targetMode: "single" },
    timingPhases: ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_change_action",
      "turn_damage_modify", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"], typeTags: [] },
  { id: ANNIHILATION_CANNON_ID, name: "聚能湮灭炮", description: "14聚，群攻∞、∞级，无视命数与复活。发炮回合起连续出石头、饼、反弹才能防住。可指定一人立即退游，25%变为必杀。",
    play: { kind: "attack", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 14 }, maxStacks: MAX_ACTION_STACKS, targetMode: "all",
      optionalTargetCount: 1, powerValue: INFINITY_VALUE, levelValue: INFINITY_VALUE, defenseTag: "unblockable" },
    timingPhases: ["turn_action"], typeTags: [] }
];
for (const entry of junengAbilities) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 6,
    exposureTiming: "使用时", tags: [], hooks: {} };
}

const kuijiAbilities: Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">> = [
  { id: KUIJI_INHERIT_ID, name: "窥觊苍生·继承", description: "获得封印、治愈术、虚无和天空之城。",
    timingPhases: ["passive_check"], typeTags: [] },
  { id: KUISHI_ID, name: "窥视", description: "开局可查阅所有玩家的技能，选择一张大卡完整复制并公开声明。",
    play: { kind: "effect", cost: 0, maxStacks: MAX_ACTION_STACKS, targetMode: "none" },
    timingPhases: ["opening_action"], typeTags: ["锁定技"] },
  { id: SELF_ISOLATION_ID, name: "自我封闭", description: "3饼，先制重开，进入独立小空间直到主空间下一轮轮末。小空间内出饼×3。",
    play: { kind: "effect", cost: 3, maxStacks: MAX_ACTION_STACKS, targetMode: "none" },
    timingPhases: ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_change_action",
      "turn_damage_modify", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"], typeTags: [] },
  { id: SPIRIT_GUIDANCE_ID, name: "灵媒指引", description: "3饼，群攻5、5级，小防防。可选一人取消其主出招，保留消耗。每造成5点伤害加3防御，每加3防御回血2，每实收6点回血增加此卡授予的治愈术1次。",
    play: { kind: "attack", cost: 3, maxStacks: MAX_ACTION_STACKS, targetMode: "all", optionalTargetCount: 1, power: 5, level: 5, defenseTag: "small" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: KUIJI_ULTIMATE_ID, name: "窥觊苍生", description: "14饼，群攻∞、0级，无法防，破弹。伤害参与致死后永久失去此招式，获得永久良好状态：出饼×3。",
    play: { kind: "attack", cost: 14, maxStacks: MAX_ACTION_STACKS, targetMode: "all", powerValue: INFINITY_VALUE, level: 0,
      defenseTag: "unblockable", traits: ["pierce_rebound"] }, timingPhases: ["turn_action"], typeTags: [] }
];
for (const entry of kuijiAbilities) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 7,
    exposureTiming: "使用时", tags: [], hooks: {} };
}

const starDragonAbilities: Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">> = [
  { id: GATHER_STAR_ID, name: "星", description: "2饼，获得1个星元素，本回合无敌。对每名攻击者随机吸取一个判定等级不超过无上的大卡子技能。",
    play: { kind: "effect", cost: 2, maxStacks: MAX_ACTION_STACKS, targetMode: "none" }, timingPhases: ["turn_action"], typeTags: [] },
  { id: STAR_RESONANCE_ID, name: "异星共振", description: "1星，加10防御值。其他玩家防御值合计至少30时，清空他们的防御值，自己额外加20防御值。",
    play: { kind: "effect", cost: 0, elementCost: { element: STAR_ELEMENT, perStack: 1 }, maxStacks: MAX_ACTION_STACKS, targetMode: "none" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: STAR_RESIST_ID, name: "异星共振·抵御", description: "变伤阶段消耗全部防御值，抵御一份不超过无限的伤害或一次退游。",
    play: { kind: "effect", cost: 0, maxStacks: MAX_ACTION_STACKS, targetMode: "none" }, timingPhases: ["turn_damage_modify"], typeTags: [] },
  { id: STAR_STRIKE_ID, name: "毁灭星辰击", description: "2星，群攻10、无限级，石头防。使原本攻击你的玩家的群攻技能攻击失效5轮，并在3轮内无视来自其的不良。",
    play: { kind: "attack", cost: 0, elementCost: { element: STAR_ELEMENT, perStack: 2 }, maxStacks: MAX_ACTION_STACKS, targetMode: "all", power: 10,
      levelValue: INFINITY_VALUE, defenseTag: "stone" }, timingPhases: ["turn_action"], typeTags: [] },
  { id: STAR_INHERIT_ID, name: "异星共振·继承", description: "获得逆转星移和外星人。此卡发放的逆转星移有两次逆转，斗转星移转出的数值乘无限。",
    timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: DRAGON_DISAPPEAR_ID, name: "龙卷残云", description: "本局限用2次。使其他血量不超过2的在场玩家直接消失，获得其全部大卡的初始化副本。",
    play: { kind: "effect", cost: 0, usesPerGame: 2, maxStacks: MAX_ACTION_STACKS, targetMode: "none" },
    timingPhases: ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_change_action", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"], typeTags: ["限定技"] },
  { id: DRAGON_INHERIT_ID, name: "龙卷残云·继承", description: "获得两份烽火赤壁和两份雷电法术。",
    timingPhases: ["passive_check"], typeTags: [] },
  { id: DRAGON_DANCE_ID, name: "狂龙之舞", description: "2饼。命中判定点若场上有人持有0饼，自己加4饼和3防御值，本回合绝对无敌，并无视其他玩家对自己的主动技能效果。",
    play: { kind: "effect", cost: 2, maxStacks: MAX_ACTION_STACKS, targetMode: "none" }, timingPhases: ["turn_action"], typeTags: [] },
  { id: DRAGON_BLOOD_FIELD_ID, name: "鲜血金龙领域", description: "5饼，按出招时全场总血量选择分支。至多60时群攻60减总血量，油条防。超过60至100时回复总血量减60。超过100时单攻总血量减95，石头防。攻击等级等于攻击值。",
    play: { kind: "attack", cost: 5, maxStacks: MAX_ACTION_STACKS, targetMode: "none", optionalTargetCount: 1, power: 0, level: 0 },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: DRAGON_HEIR_ID, name: "龙子诞辰诀", description: "7饼，预选一名目标。本回合绝对无敌。若有人出招以你为目标，加一条半血命；否则加一条0血命，并对预选目标攻无限、0级，反弹防。",
    play: { kind: "attack", cost: 7, maxStacks: MAX_ACTION_STACKS, targetMode: "single", powerValue: INFINITY_VALUE, level: 0, defenseTag: "rebound" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: DRAGON_DOMINION_ID, name: "霸龙", description: "14饼，吸取其他玩家的全部大卡5轮。加一次龙卷残云机会，3轮后强化烽火赤壁。本轮绝对无敌并无视不良。",
    play: { kind: "effect", cost: 14, maxStacks: MAX_ACTION_STACKS, targetMode: "all" }, timingPhases: ["turn_action"], typeTags: [] }
];
for (const entry of starDragonAbilities) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: entry.id.startsWith(STAR_CARD_ID) ? 8 : 9,
    exposureTiming: "使用时", tags: [], hooks: {} };
}

export function getOwnedBigAbilityIds(player: { bigCards?: PlayerState["bigCards"] }, activeOnly = false): string[] {
  return (player.bigCards ?? []).flatMap((card) => Object.keys(BIG_CARD_SKILLS)
    .filter((id) => (!activeOnly || bigCardAbilityCanActivate(card, id)) &&
      bigCardHasAbility(card, id)));
}

for (const entry of [
  { id: PURPLE_GUESS_ID, name: "纵观", description: PURPLE_GUESS_DESCRIPTION, timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: PURPLE_INSIGHT_ID, name: "入微", description: "锁定技。每3轮私下获知1人随机1条子技能，再选择令其丢失5轮或自己获得3轮。",
    timingPhases: ["round_before_action"], typeTags: ["锁定技"], play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "single" } },
  { id: PURPLE_FORESIGHT_ID, name: "芥子", description: PURPLE_FORESIGHT_DESCRIPTION, timingPhases: ["turn_before_action"], typeTags: [],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "single" } },
  { id: PURPLE_SCALE_ID, name: "浩瀚", description: "控制技。变招时，分别选取原攻、等0至5倍范围内的整数。",
    timingPhases: ["turn_change_action"], typeTags: ["控制技"], play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } },
  { id: PURPLE_LIGHT_ID, name: "紫极神光", description: "3饼，单攻5，无限级，油条防。", timingPhases: ["turn_action"], typeTags: [],
    play: { kind: "attack", cost: 3, maxStacks: MAX_ACTION_STACKS, targetMode: "single", power: 5, level: INFINITE_DAMAGE, defenseTag: "youtiao" } },
  { id: PURPLE_PIERCE_ID, name: "瀚海之力", description: "锁定技。你无视控制技、不良、复活、多余命和反弹。", timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: PURPLE_LOCK_ID, name: "紫极魔瞳·无视无视锁定", description: "你无视无视锁定技的效果。", timingPhases: ["passive_check"], typeTags: [] }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 32,
    exposureTiming: "不暴露", tags: [], hooks: {} };
}

for (const entry of [
  { id: VERDICT_ACTION_ID, name: "御秽裁决", description: "3饼，与一名玩家进行石头剪刀布，平局重试。胜利获得暗影盾机会并吸取其他玩家生命，失败使旁观玩家技能失效。回合末重开。",
    play: { kind: "effect", cost: 3, maxStacks: MAX_ACTION_STACKS, targetMode: "single" }, timingPhases: ["turn_action"] },
  { id: VERDICT_GUARD_ID, name: "御秽", description: "无视普通攻击的外加效果。对方在伤害判定前主动用技时，免疫该来源本次及后续三次对你的出招。", timingPhases: ["passive_check"] },
  { id: VERDICT_REWARD_ID, name: "御秽裁决·胜负", description: "累计四胜或四败各有奖励；四连胜直接胜利，四连败失去此卡并选择消除小技能。", timingPhases: ["passive_check"] },
  { id: VERDICT_INHERIT_ID, name: "御秽裁决·继承", description: "获得沙皇和制裁之刃。此卡发放的沙皇不会因重复技能而失败。", timingPhases: ["passive_check"] },
  { id: VERDICT_SAND_ID, name: "御秽裁决·沙子", description: "别人主动与你进行一局点时，获得一个沙子。", timingPhases: ["passive_check"] }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 10,
    exposureTiming: "使用时", tags: [], typeTags: [], hooks: {} };
}

for (const entry of [
  { id: QIANQIU_RESPONSE_ID, name: "千秋一泪", description: "控制技。获得防御值后可承受1点反噬，本回合末对指定目标造成等量法伤，目标本回合出防御时无伤。造成伤害后再获得等量防御值，每回合限一次。", typeTags: ["控制技"],
    timingPhases: ["turn_change_action", "turn_damage_modify", "turn_end_action"],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: MAX_ACTION_STACKS, targetMode: "single" } },
  { id: RAGING_WAVES_ID, name: "怒海狂涛", description: "2饼，指定1人连续攻击3回合，每回合攻3＋3＋3、9级，依次小防、油条、石头防。每回合命中加20防御值，未命中加10血。", typeTags: [], timingPhases: ["turn_action"],
    play: { kind: "attack", cost: 2, maxStacks: MAX_ACTION_STACKS, targetMode: "single", power: 3, level: 9, defenseTag: "small", damageParts: [3, 3, 3] } },
  { id: QIANQIU_REDUCTION_ID, name: "千秋一泪·减伤", description: "锁定技。受到伤害时，减少防御值与护盾值之和的两倍。", typeTags: ["锁定技"], timingPhases: ["passive_check"] },
  { id: THOUSAND_WAVES_ID, name: "浪打千击", description: "3饼，连续4回合群攻4＋4＋4＋4、16级、饼防。每命中一人加1饼，每造成1点伤害加2防御值，每由此加4防御值加1血。", typeTags: [], timingPhases: ["turn_action"],
    play: { kind: "attack", cost: 3, maxStacks: MAX_ACTION_STACKS, targetMode: "all", power: 4, level: 16, defenseTag: "cake", damageParts: [4, 4, 4, 4] } },
  { id: QIANQIU_INHERIT_ID, name: "千秋一泪·继承", description: "拥有冰霜长矛。消除火系技能时无视四融合及以下的消除免疫。", typeTags: ["锁定技"], timingPhases: ["passive_check"] },
  { id: ENDURING_SEA_ID, name: "沧海永存", description: "3饼，获得无限护盾和退游护盾，剩余任意一面时免疫不良，本轮结束失去全部护盾。", typeTags: [], timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 3, maxStacks: MAX_ACTION_STACKS, targetMode: "none" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 11,
    exposureTiming: "使用时", tags: [], hooks: {} };
}

for (const entry of [
  { id: YONGYAO_INHERIT_ID, name: "永耀雷霆·继承", description: "获得天雷和雷裂残阳，强化天雷的电伤和电击法术的麻痹。", timingPhases: ["passive_check"] },
  { id: THUNDER_BALL_ID, name: "雷球", description: "1饼，召唤一个独立持续3轮的雷球。受到伤害时按持有雷球数量反击、眩晕，并概率消除长期状态。", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 1, maxStacks: MAX_ACTION_STACKS, targetMode: "none" } },
  { id: THUNDER_STORM_ID, name: "雷暴", description: "3雷球，攻20、20级、油条防。消耗后仍有至少5球则补3球，伤害判定点有50%几率对除你外所有人各造成10点电系法伤。", timingPhases: ["turn_action"],
    play: { kind: "attack", cost: 0, cakeCostKind: "none", itemCost: { item: "雷球", perStack: 3 }, maxStacks: MAX_ACTION_STACKS, targetMode: "single", power: 20, level: 20, defenseTag: "youtiao", element: "electric" } },
  { id: THUNDER_RITE_ID, name: "雷祭", description: "6雷球，获得3轮雷祭。电系伤害及电系技能附带的不良时长乘4。电系攻击有3x%概率无视目标一层技能，x为攻击时的雷球数。雷球上限20，轮初加1球。", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", itemCost: { item: "雷球", perStack: 6 }, maxStacks: MAX_ACTION_STACKS, targetMode: "none" } },
  { id: ETERNAL_THUNDER_ID, name: "永耀雷霆", description: "20雷球，攻5∞、退游级。依次石头、石头、具备无视破弹的反弹才能防住。50%无视目标技能，整次出招只掷一次。", timingPhases: ["turn_action"],
    play: { kind: "attack", cost: 0, cakeCostKind: "none", itemCost: { item: "雷球", perStack: 20 }, maxStacks: MAX_ACTION_STACKS, targetMode: "single", powerValue: scaleCombatValue(INFINITY_VALUE, 5), level: 0, levelValue: RETIRE_VALUE, defenseTag: "unblockable", element: "electric", traits: ["pierce_rebound"] } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 12,
    exposureTiming: "使用时", tags: ["电系技能"], typeTags: [], attribute: "electric", hooks: {} };
}

for (const entry of [
  { id: TIANLIE_INHERIT_ID, name: "天裂圣威·继承", description: "获得断绝、终结和山河破碎。", timingPhases: ["passive_check"], typeTags: [] },
  { id: TIANLIE_CONTINUE_ID, name: "斗神之魄", description: "控制技。攻击未命中时消耗2饼，使该攻击从本回合起持续3回合。",
    timingPhases: ["turn_damage_modify"], typeTags: ["控制技"], play: { kind: "effect", cost: 2, maxStacks: 1, targetMode: "none" } },
  { id: TIANLIE_FEEDBACK_ID, name: "战神之威", description: "控制技。未被攻击命中时消耗3饼，向发出者反馈两倍法术伤害。",
    timingPhases: ["turn_damage_modify"], typeTags: ["控制技"], play: { kind: "effect", cost: 3, maxStacks: 1, targetMode: "none" } },
  { id: TIANLIE_ATTACK_ID, name: "天裂圣威", description: "4饼，群攻20、20级、油条防。狂化时费用降至2饼，并强化攻击及技能反弹。",
    timingPhases: ["turn_action"], typeTags: [], play: { kind: "attack", cost: 4, maxStacks: 1, targetMode: "all", power: 20, level: 20, defenseTag: "youtiao" } },
  { id: TIANLIE_MIGHT_ID, name: "天裂圣威·破势", description: "无视纯净苍穹、枯萎、天花板。变招阶段可额外消耗饼，同倍放大选中攻击的攻等。",
    timingPhases: ["passive_check", "turn_change_action"], typeTags: ["锁定技"],
    play: { kind: "effect", cost: 1, maxStacks: MAX_ACTION_STACKS, targetMode: "none" } },
  { id: TIANLIE_RAGE_ID, name: "狂化", description: "8饼，获得5轮狂化，攻击不可被回避，并获得与剩余限定技次数等量的临时次数。",
    timingPhases: ["turn_action"], typeTags: [], play: { kind: "effect", cost: 8, maxStacks: 1, targetMode: "none" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 13,
    exposureTiming: "使用时", tags: [], hooks: {} };
}

const nonStackableAbilityIds = new Set(RAW_BIG_CARD_CATALOG.flatMap(({ abilities }) =>
  abilities.filter(({ description }) => isExplicitlyNonStackable(description)).map(({ id }) => id)));
for (const skill of Object.values(BIG_CARD_SKILLS)) {
  if (!skill.play) continue;
  const nonStackable = nonStackableAbilityIds.has(skill.id.split("_")[0]!) || isExplicitlyNonStackable(skill.description);
  skill.play = { ...skill.play, maxStacks: nonStackable ? 1 : MAX_ACTION_STACKS };
}

for (const [id, name, description, typeTags] of [
  [WUJIN_INHERIT_ID, "无尽天垒·继承", "你有山河破碎。", []],
  [WUJIN_FREE_MOVE_ID, "无尽天垒·免费出招", "命中或防住招式后，获得一次相同招式的免费机会。", []],
  [WUJIN_REBOUND_ID, "无尽天垒·反弹", "锁定技。无视阳光普照、永远之夜和破地之力。拥有弹力球，每第4次反弹无消耗。", ["锁定技"]]
] as const) {
  BIG_CARD_SKILLS[id] = { id, name, description, implemented: true, fusion: "", category: "king_card", sourceRow: 14,
    exposureTiming: "不暴露", tags: [], typeTags: [...typeTags], timingPhases: ["passive_check"], hooks: {} };
}

for (const [id, name, description, typeTags] of [
  [JUEYING_RETIRE_ID, "绝影逆魂·无视退游", "无视退游并增加两次逆转，拥有永远之夜，无视永远之夜与阳光普照。", ["锁定技"]],
  [JUEYING_RESTRICTION_ID, "绝影逆魂·限制", "存活时限制其他玩家的回血、回到过去状态和恢复至初始。", []],
  [JUEYING_DEATH_ID, "绝影逆魂·死后复活", "普通死亡期间累计场上回血，达标后满血复活。", ["锁定技"]],
  [JUEYING_INHERIT_ID, "绝影逆魂·继承", "拥有暗影之魂、逆转星移、弹力球与裂魂。", []],
  [JUEYING_VICTORY_ID, "绝影逆魂", "胜利反制阶段消耗2次逆转，将一名玩家的技能胜利转移给你。", []]
] as const) {
  BIG_CARD_SKILLS[id] = { id, name, description, implemented: true, fusion: "", category: "king_card", sourceRow: 15,
    exposureTiming: id === JUEYING_VICTORY_ID ? "使用时" : "不暴露", tags: [], typeTags: [...typeTags],
    timingPhases: [id === JUEYING_VICTORY_ID ? "victory_counter_action" : "passive_check"], hooks: {} };
}

export function bigCardHasAbility(card: NonNullable<PlayerState["bigCards"]>[number], skillId: string, includeTemporarilyLost = false): boolean {
  const baseId = skillId.split("_")[0]!;
  if (baseId === CURTAIN_VEIL_ID) return false;
  const earnedJudgment = card.onlyAbilityId === GOD_KING_RULES_ID && baseId === GOD_KING_JUDGMENT_ID &&
    (card.abilityUseBonuses?.[GOD_KING_JUDGMENT_ID] ?? 0) > 0;
  return baseId.startsWith(card.cardId) && (!card.onlyAbilityId || card.onlyAbilityId === baseId || earnedJudgment) &&
    !card.lostAbilityIds?.includes(baseId) && !card.lostAbilityIds?.includes(skillId) &&
    (includeTemporarilyLost || !card.temporarilyLostAbilityIds?.includes(baseId));
}

const requiresWholeCard = new Set<string>([
  ...SWORD_ARRAY_OUTCOMES, SHADOW_COMBO_ID, DEAD_REALM_FALLBACK_ID, THORN_DANCE_ID, CURTAIN_ENCORE_ID,
  TIAN_YE_CHOICE_ID, TIGER_SWITCH, TIGER_LOSS, TIGER_RESTORE, BUBBLE_FATE, FIVE_ELEMENTS_CHOOSE, HEXAGRAM_CHOOSE,
  SEVEN_STAR_CHOOSE, SEVEN_STAR_YUHENG, SEVEN_STAR_YAOGUANG
]);

/** Detached abilities keep their own requirements, except for unlocks granted by another ability. */
export function bigCardAbilityCanActivate(card: NonNullable<PlayerState["bigCards"]>[number], skillId: string): boolean {
  return (!card.junengDisabled || skillId === BUBBLE_FATE) && (!card.onlyAbilityId || card.cardId !== TOTEM_CARD_ID && !requiresWholeCard.has(card.onlyAbilityId)) &&
    bubbleDreamAbilityActive(card, skillId) &&
    tigerAbilityActive(card, skillId) && fiveElementsAbilityActive(card, skillId) && hexagramAbilityActive(card, skillId) &&
    sevenStarAbilityActive(card, skillId) &&
    isDecayAbilityUnlocked(card, skillId) && fallenSplendorAbilityActive(card, skillId);
}

function bubbleDreamAbilityActive(card: NonNullable<PlayerState["bigCards"]>[number], skillId: string): boolean {
  if (card.cardId !== BUBBLE_DREAM_CARD || card.onlyAbilityId) return true;
  if (skillId === BUBBLE_FORGET) return !card.bubbleDreamRebuild?.active;
  if (skillId === BUBBLE_FINALE) return Boolean(card.bubbleDreamRebuild?.active);
  return true;
}

function fallenSplendorAbilityActive(card: NonNullable<PlayerState["bigCards"]>[number], skillId: string): boolean {
  if (card.cardId !== FALLEN_SPLENDOR_CARD_ID || card.onlyAbilityId) return true;
  const baseId = skillId.split("_")[0];
  const stage = card.fallenSplendorStage ?? 0;
  const unlock = FALLEN_SPLENDOR_REBIRTH_STAGES.findIndex((id) => id === baseId) + 1;
  if (baseId === FALLEN_SPLENDOR_EXECUTION) return stage === 7;
  if (baseId === FALLEN_SPLENDOR_HEALING || unlock) return stage < 7 && unlock <= stage;
  return true;
}

for (const [id, name, description, locked] of [
  [CHAOFAN_TREASURE_ID, "超凡绝圣·圣宝", "获得圣宝，圣水收集器每两回合产饼，圣灵觉醒倍率为6。", true],
  [CHAOFAN_JUDGMENT_ID, "超凡绝圣·裁罚", "获得神域之种，无视破天圣剑。其他玩家使用或触发指定圣系技能时直接死亡。", true],
  [CHAOFAN_MULTIPLY_ID, "超凡绝圣·乘算", "将独立圣系出招的倍率乘入本卡提供的圣灵觉醒。", false]
] as const) {
  BIG_CARD_SKILLS[id] = { id, name, description, implemented: true, fusion: "", category: "king_card", sourceRow: 16,
    exposureTiming: "不暴露", tags: [], typeTags: locked ? ["锁定技"] : [], timingPhases: ["passive_check"], hooks: {} };
}


const xielingWindowPhases = ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_change_action",
  "turn_damage_modify", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"] as const;
for (const entry of [
  { id: XIELING_INHERIT_ID, name: "邪灵无念·暗影战斧", description: "获得暗影战斧。无视血之哀，实际吸血累计邪灵印记，印记提高邪域吸血量。",
    timingPhases: ["passive_check"] },
  { id: XIELING_TRANSFORM_ID, name: "邪灵变", description: "1饼，将指定数量的邪灵印记等量换成邪。本回合无敌并反弹不良，受到攻击时回合末吸其他玩家各1血，不重开。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 1, maxStacks: 1, targetMode: "none" } },
  { id: XIELING_INVASION_ID, name: "邪灵入侵", description: "8邪，群攻4×4、8级，油条防，破弹。按实际伤害吸血50%，每造成4点伤害减少邪灵无念1回合冷却。",
    timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, cakeCostKind: "none", elementCost: { element: XIELING_ELEMENT, perStack: 8 },
      maxStacks: MAX_ACTION_STACKS, targetMode: "all", power: 4, damageParts: [4, 4, 4, 4], repeatedDamageParts: true,
      level: 8, defenseTag: "youtiao", traits: ["pierce_rebound"] } },
  { id: XIELING_AMBUSH_ID, name: "邪灵暗袭", description: "10邪，单攻无限、0级，任意防，破弹。补刀时攻变为退游，邪灵无念冷却减少10回合。",
    timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, cakeCostKind: "none", elementCost: { element: XIELING_ELEMENT, perStack: 10 },
      maxStacks: MAX_ACTION_STACKS, targetMode: "single", powerValue: INFINITY_VALUE, level: 0, defenseTag: "any", traits: ["pierce_rebound"] } },
  { id: XIELING_BODY_ID, name: "邪·不灭魔躯", description: "28邪，先制重开，获得持续4轮的良好状态。回合初对其他玩家各造成1点法伤，冷却每回合减3，强化攻击和邪域。你造成的伤害和你的回血不会重开此轮。",
    timingPhases: [...xielingWindowPhases], play: { kind: "effect", cost: 0, cakeCostKind: "none",
      elementCost: { element: XIELING_ELEMENT, perStack: 28 }, maxStacks: 1, targetMode: "none" } },
  { id: XIELING_RESET_ID, name: "邪念闪", description: "5饼，立即清除本卡邪灵无念的冷却。",
    timingPhases: [...xielingWindowPhases], play: { kind: "effect", cost: 5, maxStacks: 1, targetMode: "none" } },
  { id: XIELING_ULTIMATE_ID, name: "邪灵无念", description: "每50回合可用1次。群攻10、10级，石头防，命中附带10法伤。对出反弹或攻击你的玩家，攻变为无限且吸血100%。不灭魔躯进一步强化此招。",
    timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "all",
      power: 10, level: 10, defenseTag: "stone" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 17,
    exposureTiming: "使用时", tags: [], typeTags: [], hooks: {} };
}

for (const entry of [
  { id: KURONG_INHERIT_ID, name: "万物枯荣·继承", description: "获得枯萎和繁荣，枯萎可选3个正整数，繁荣可选2个。",
    timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: KURONG_LEAF_ID, name: "叶落彼岸", description: "开局私下查看每名其他玩家随机一张大卡，最多从三张不同的卡各获得一个子技能。",
    timingPhases: ["opening_action"], typeTags: [],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } },
  { id: KURONG_CAKES_ID, name: "千春共绽", description: "锁定技。当你饼的数量为全场唯一最少的时候，你积饼速度×3，耗饼数-3（至少为1）；当你饼的数量不为全场最少时，你耗饼-1（最低为1）。",
    timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: KURONG_ATTACK_ID, name: "万物枯荣", description: "4饼，攻6、10级，石头防。若未防住，立即吸走目标全部多余命；若无多余命，则在第3轮后的轮初吸其最新一条命。",
    timingPhases: ["turn_action"], typeTags: [],
    play: { kind: "attack", cost: 4, maxStacks: MAX_ACTION_STACKS, targetMode: "single", power: 6, level: 10, defenseTag: "stone" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 18,
    exposureTiming: entry.id === KURONG_ATTACK_ID ? "使用时" : "不暴露", tags: [], hooks: {} };
}

for (const entry of [
  { id: UTOPIA_MOVE_ID, name: "梦之乌托邦", description: "3饼，选1至2人，可选自己。无限级的非攻击招式，反弹防。命中分别吸1血并送入独立梦境2轮。持有此子技能可跨梦境出招。",
    timingPhases: ["turn_action"], typeTags: [],
    play: { kind: "effect", cost: 3, maxStacks: MAX_ACTION_STACKS, targetMode: "single" } },
  { id: UTOPIA_DREAM_ID, name: "梦之乌托邦·梦", description: "轮前、轮末及每次造成或受到伤害时加梦。每5梦依次获得裂魂、封印、净化、治愈术，获得齐全后每次获得梦回复1血，不重开。",
    timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: UTOPIA_FIELD_ID, name: "天梦领域", description: "5梦，本回合绝对无敌。无限级非攻击群体出招，石头防，破弹，命中使目标睡眠10回合。此回合指定你为目标的玩家失去免疫或解除不良的技能。",
    timingPhases: ["turn_action"], typeTags: [],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", elementCost: { element: DREAM_ELEMENT, perStack: 5 },
      maxStacks: MAX_ACTION_STACKS, targetMode: "all" } },
  { id: UTOPIA_VICTORY_ID, name: "梦之乌托邦·全员入梦", description: "包括自己在内的全部存活参赛者都在梦境或睡眠中时，你获得不可反制的胜利。主空间仅剩一人时优先判常规胜利。",
    timingPhases: ["passive_check"], typeTags: ["锁定技"] }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 19,
    exposureTiming: entry.play ? "使用时" : "不暴露", tags: [], hooks: {} };
}

for (const entry of [
  { id: HONGHUANG_INHERIT_ID, name: "洪荒狂怒·传承", description: "获得冰火狂暴曲、甲骨文、沦陷、空之轨迹。",
    timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: SACRED_BEAST_ID, name: "神兽封印", description: "轮初可开启青龙、白虎、朱雀或玄武之一。本轮结束时封存该神兽的技能状态。",
    timingPhases: ["round_before_action"], typeTags: [],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } },
  { id: MOUNTAIN_SEAL_ID, name: "山海封印", description: "每8轮一次。免疫会导致普通死亡的伤害，并先制重开。有利／不利数值调整待接入。",
    timingPhases: ["passive_check"], typeTags: [] },
  { id: TIME_REWIND_ID, name: "时溯", description: "限2次。使1人回到2轮前的轮初状态，或使2人回到1轮前的轮初状态。可选自己。",
    timingPhases: [...xielingWindowPhases], typeTags: ["限定技"],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, usesPerGame: 2, targetMode: "single" } },
  { id: ANCIENT_ROAR_ID, name: "太古的怒吼", description: "4饼，加20血并反弹技能招式。反弹x个招式时，下轮招式持续时间×x。",
    timingPhases: ["turn_action"], typeTags: [],
    play: { kind: "effect", cost: 4, maxStacks: 1, targetMode: "none" } },
  { id: HONGHUANG_ATTACK_ID, name: "洪荒狂怒", description: "5饼，群攻（1+10+100+1000+无限）×2，等级无限，小防或油条防，遇饼则退游之。在太古的怒吼效果中，持续回合变为2^x，1000变为无限，无限变为退游。",
    timingPhases: ["turn_action"], typeTags: [],
    play: { kind: "attack", cost: 5, maxStacks: 1, targetMode: "all", power: 1, levelValue: INFINITY_VALUE,
      defenseTag: "small_or_youtiao" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 20,
    exposureTiming: entry.play ? "使用时" : "不暴露", tags: [], hooks: {} };
}

for (const entry of [
  { id: LINGTA_INHERIT_ID, name: "凌踏九霄·传承", description: "获得天空之城、天•幻、绝对天盾、后盾。同空间的破地之力、破天圣剑、无尽战刃失效。",
    timingPhases: ["passive_check"], typeTags: [] },
  { id: CLOUD_SEA_ID, name: "云海", description: "1饼、10云，优先消耗最早到期的云，合成1个云海。云海每轮轮初各产1云。云产生3轮后消散并回血。",
    timingPhases: ["turn_action"], typeTags: [], play: { kind: "effect", cost: 1, maxStacks: 1, targetMode: "none" } },
  { id: CLOUD_BYPASS_ID, name: "切换阳光之夜绕过", description: "切换自己的攻击是否绕过云海阳光之夜。",
    timingPhases: [...xielingWindowPhases], typeTags: [], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } },
  { id: SHENGLING_ID, name: "盛凌", description: "3凌，加5防御值，对除你外所有人各造成5点法伤。按实际伤害再加2倍防御值。本回合无敌，法伤不重开，可在变招补出。",
    timingPhases: ["turn_action", "turn_change_action"], typeTags: [],
    play: { kind: "effect", cost: 0, elementCost: { element: LING_ELEMENT, perStack: 3 }, maxStacks: 1, targetMode: "all" } },
  { id: SKY_ABSOLUTE_ID, name: "凌空·天绝", description: "随时可用。消耗全部饼（可为0）、10凌、4云海。本轮获得10个挡到消失的护罩，攻击×无限、等级×退游，回合末血量翻倍。",
    timingPhases: [...xielingWindowPhases], typeTags: [],
    play: { kind: "effect", cost: 0, cakeCostKind: "dynamic", elementCost: { element: LING_ELEMENT, perStack: 10 }, maxStacks: 1, targetMode: "none" } },
  { id: SKY_STRIKE_ID, name: "天击", description: "天绝中可用。1饼1凌，攻退游×3，等同，依次小防、油条、石头防。首击命中给一次免费天击。连续三次被正确防住，凌和云海减半。",
    timingPhases: ["turn_action"], typeTags: [],
    play: { kind: "attack", cost: 1, elementCost: { element: LING_ELEMENT, perStack: 1 }, maxStacks: 1, targetMode: "single",
      powerValue: RETIRE_VALUE, levelValue: RETIRE_VALUE, defenseTag: "small", traits: ["defeat_retire"] } },
  { id: LINGTA_VICTORY_ID, name: "凌踏九霄", description: "随时可用。消耗36凌9云海，直接获胜，无法被逆转或转移。",
    timingPhases: [...xielingWindowPhases], typeTags: [],
    play: { kind: "effect", cost: 0, elementCost: { element: LING_ELEMENT, perStack: 36 }, maxStacks: 1, targetMode: "none" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 21,
    exposureTiming: entry.play ? "使用时" : "不暴露", tags: [], hooks: {} };
}

for (const [index, ability] of (RAW_BIG_CARD_CATALOG.find(({ id }) => id === KAIGE_CARD_ID)?.abilities ?? []).entries()) {
  BIG_CARD_SKILLS[ability.id] = {
    id: ability.id, name: ["圣灵凯歌·命序", ...KAIGE_STAGE_NAMES, "圣灵凯歌·护佑", "圣灵凯歌·知晓"][index]!,
    description: ability.description, implemented: true,
    fusion: "", category: "king_card", sourceRow: 22, timingPhases: ["passive_check"], exposureTiming: "不暴露",
    tags: [], typeTags: ["锁定技"], hooks: {}
  };
}

for (const entry of [
  { id: CHAOS_INHERIT_ID, name: "混沌魔闪光·传承", description: "获得自爆者死、魔域、裂魂。", timingPhases: ["passive_check"] },
  { id: CHAOS_GAIN_ID, name: "乱", description: "无耗饼，获得1乱，不可叠重。", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } },
  { id: CHAOS_PAID_GAIN_ID, name: "乱（耗饼合成）", description: "每重消耗2饼、获得2乱。", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 2, maxStacks: MAX_ACTION_STACKS, targetMode: "none" } },
  { id: CHAOS_DEFENSE_ID, name: "混乱世纪", description: "2乱。自己加D100防御值。场上超过3人时，对其他玩家分别掷D10加防御值，其防御值归零前不可攻击你。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, elementCost: { element: CHAOS_ELEMENT, perStack: 2 }, maxStacks: 1, targetMode: "all" } },
  { id: CHAOS_RELEASE_ID, name: "混沌解放", description: "1乱。掷D40，获得0至10饼。抽中0时，本回合绝对无敌并反弹攻值小于无限的攻击。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, elementCost: { element: CHAOS_ELEMENT, perStack: 1 }, maxStacks: 1, targetMode: "none" } },
  { id: CHAOS_EXILE_ID, name: "流放", description: "3乱。指定1人，无限级、饼防。命中时使其暂时退出游戏1轮并先制重开。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, elementCost: { element: CHAOS_ELEMENT, perStack: 3 }, maxStacks: 1, targetMode: "single" } },
  { id: CHAOS_WAVE_ID, name: "乱之波动", description: "变招阶段消耗1乱，为一项以其他玩家为目标的出招附加三个独立概率效果。",
    timingPhases: ["turn_change_action"], play: { kind: "effect", cost: 0, elementCost: { element: CHAOS_ELEMENT, perStack: 1 }, maxStacks: 1, targetMode: "none" } },
  { id: CHAOS_ATTACK_ID, name: "混沌魔闪光", description: "5乱。群攻10，退游级，石头防，破弹。命中目标下3轮技能失效；未命中目标下轮前5次对你用技无效。",
    timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, elementCost: { element: CHAOS_ELEMENT, perStack: 5 }, maxStacks: MAX_ACTION_STACKS,
      targetMode: "all", power: 10, levelValue: RETIRE_VALUE, defenseTag: "stone", traits: ["pierce_rebound"] } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "timingPhases" | "play">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 23,
    exposureTiming: entry.play ? "使用时" : "不暴露", tags: [], typeTags: [], hooks: {} };
}

BIG_CARD_SKILLS[GOD_KING_RULES_ID] = {
  id: GOD_KING_RULES_ID, name: "神王审判·开局玩点", description: "开局与其他玩家逐一玩点，根据胜负获得不同效果。",
  implemented: true, fusion: "", category: "king_card", sourceRow: 24, exposureTiming: "不暴露", tags: [],
  typeTags: [], timingPhases: ["opening_action", "passive_check"], hooks: {}
};
BIG_CARD_SKILLS[GOD_KING_JUDGMENT_ID] = {
  id: GOD_KING_JUDGMENT_ID, name: "审判", description: "消耗1次审判机会。指定一人，任意防，可反弹。与对向攻击相互抵消。命中则翻转与目标的开局胜负并使其直接死亡。",
  play: { kind: "attack", cost: 0, cakeCostKind: "none", maxStacks: 1, usesPerGame: 0,
    targetMode: "single", power: 0, level: 0, defenseTag: "any" },
  implemented: true, fusion: "", category: "king_card", sourceRow: 24, exposureTiming: "使用时", tags: [],
  typeTags: ["限定技"], timingPhases: ["turn_action"], hooks: {}
};
BIG_CARD_SKILLS[GOD_KING_SAINT_ID] = {
  id: GOD_KING_SAINT_ID, name: "神王审判·圣", description: "仅在第 x+1 轮可用。将饼或一种元素按 (y+1)² 倍在回合末返还。",
  play: { kind: "resource", cost: 1, maxStacks: MAX_ACTION_STACKS, targetMode: "none" },
  implemented: true, fusion: "", category: "king_card", sourceRow: 24, exposureTiming: "使用时", tags: [],
  typeTags: [], timingPhases: ["turn_action"], hooks: {}
};

const tianmangLate = ["turn_action", "turn_change_action", "turn_damage_modify"] as const;
for (const entry of [
  { id: TIANMANG_GATHER_ID, name: "芒", description: "每重3饼，获得1芒。本回合无敌。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 3, maxStacks: MAX_ACTION_STACKS, targetMode: "none" } },
  { id: TIANMANG_CONVERSION_ID, name: "天芒·六芒星", description: "1芒，可后手。将本回合符合六芒星条件的伤害全部转为回血。持有六芒星阵，其基础概率翻倍。",
    timingPhases: [...tianmangLate], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none",
      elementCost: { element: TIANMANG_ELEMENT, perStack: 1 } } },
  { id: TIANMANG_MIRROR_ID, name: "仿生创造", description: "4饼，获得一个可融合的镜像法术副本。本回合无敌，整局限两次。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 4, maxStacks: 1, targetMode: "none", usesPerGame: 2 } },
  { id: TIANMANG_SAND_ID, name: "自主创造", description: "6饼，获得一个可融合的沙子副本。本回合无敌，整局限一次。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 6, maxStacks: 1, targetMode: "none", usesPerGame: 1 } },
  { id: TIANMANG_CAKE_ID, name: "快速创造", description: "2芒，本轮及下轮积饼速度×3。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none",
      elementCost: { element: TIANMANG_ELEMENT, perStack: 2 } } },
  { id: TIANMANG_FUSION_ID, name: "极速创造", description: "3芒，本轮及下轮融合不耗饼。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none",
      elementCost: { element: TIANMANG_ELEMENT, perStack: 3 } } },
  { id: TIANMANG_CLEANSE_ID, name: "真·净化", description: "2芒，可后手。解除自身不良，六芒星阵三项概率各永久增加1/6，本轮全场限定技失效。",
    timingPhases: [...tianmangLate], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none",
      elementCost: { element: TIANMANG_ELEMENT, perStack: 2 } } },
  { id: TIANMANG_FIELD_CLEANSE_ID, name: "神·净化", description: "4芒，可后手。解除场上一切额外状态，六芒星阵三项概率各增加1/3，本轮全场锁定技失效。",
    timingPhases: [...tianmangLate], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none",
      elementCost: { element: TIANMANG_ELEMENT, perStack: 4 } } },
  { id: TIANMANG_ABSORB_ID, name: "真·六芒星", description: "3芒。本回合吸收全场低于无限的伤害，回复吸收总量的平方，并免疫技能效果。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none",
      elementCost: { element: TIANMANG_ELEMENT, perStack: 3 } } },
  { id: TIANMANG_ABSORB_INFINITE_ID, name: "神·六芒星", description: "6芒。本回合吸收全场不超过无限的伤害，回复吸收总量的平方，并免疫技能效果。",
    timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none",
      elementCost: { element: TIANMANG_ELEMENT, perStack: 6 } } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "timingPhases" | "play">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 25,
    exposureTiming: "使用时", tags: [], typeTags: "usesPerGame" in entry.play ? ["限定技"] : [], hooks: {} };
}

const windCost = (perStack: number) => ({ element: WIND_ELEMENT, perStack });
for (const entry of [
  { id: WIND_INCOME_ID, name: "究影风啸天·积风", typeTags: ["锁定技"], timingPhases: ["passive_check"] },
  { id: WIND_SHIELD_ID, name: "风盾", timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: windCost(1) } },
  { id: HURRICANE_ID, name: "飓风", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "single", elementCost: windCost(3),
    power: 4, level: 4, defenseTag: "small" } },
  { id: HURRICANE_CAKES_ID, name: "飓风（5饼）", timingPhases: ["turn_action"], play: { kind: "attack", cost: 5, maxStacks: 1, targetMode: "single",
    attackName: "飓风", power: 4, level: 4, defenseTag: "small" } },
  { id: WIND_STAR_ID, name: "风暴之星", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "single", elementCost: windCost(1),
    power: 15, level: 0, defenseTag: "stone" } },
  { id: WIND_EYE_ID, name: "风王之瞳", timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: windCost(2) } },
  { id: WIND_HASTE_ID, name: "风·疾行", timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: windCost(3) } },
  { id: WIND_SCOUT_ID, name: "风·探查", timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "single", elementCost: windCost(2) } },
  { id: WIND_TRACK_ID, name: "风·跟踪", timingPhases: ["turn_change_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: windCost(1) } },
  { id: WIND_PURSUIT_ID, name: "风·追击", timingPhases: ["turn_damage_modify"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "single", elementCost: windCost(3) } },
  { id: WIND_INHERIT_ID, name: "究影风啸天·风之轻灵", timingPhases: ["passive_check"] },
  { id: WIND_SHUFFLE_ID, name: "究影风啸天", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "single", elementCost: windCost(5),
    power: 10, level: 10, defenseTag: "stone" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "timingPhases"> & Partial<Pick<SkillDefinition, "typeTags" | "play">>>) {
  const id = entry.id === HURRICANE_CAKES_ID ? HURRICANE_ID : entry.id;
  const raw = RAW_BIG_CARD_CATALOG.find((card) => card.id === ULTIMATE_WIND_CARD_ID)?.abilities.find((ability) => ability.id === id);
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 26,
    description: raw?.description ?? entry.name, exposureTiming: entry.play ? "使用时" : "不暴露", tags: [], typeTags: entry.typeTags ?? [], hooks: {} };
}

const sandCost = (perStack: number) => ({ element: SAND_ELEMENT, perStack });
for (const entry of [
  { id: SAND_INHERIT_ID, name: "尘埃寂灭·传承", timingPhases: ["passive_check"] },
  { id: SAND_ARROWS_ID, name: "尘埃寂灭·万箭齐发", typeTags: ["锁定技"], timingPhases: ["passive_check"] },
  { id: SAND_INCOME_ID, name: "尘埃寂灭·积沙", typeTags: ["锁定技"], timingPhases: ["passive_check"] },
  { id: SAND_DUST_ID, name: "尘沙起", timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: sandCost(1) } },
  { id: SAND_STORM_ID, name: "沙尘暴", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "single",
    elementCost: sandCost(2), power: 2, level: 4, defenseTag: "youtiao", damageParts: [2, 2, 2, 2, 2, 2] } },
  { id: SAND_GRANTS_ID, name: "沙化·衍生", timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: sandCost(3) } },
  { id: SAND_NULLIFY_ID, name: "沙暴·天息", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "all",
    elementCost: sandCost(4), power: 16, level: 16, defenseTag: "small" } },
  { id: SAND_VORTEX_ID, name: "流沙旋涡", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "single",
    elementCost: sandCost(5), power: 0, levelValue: INFINITY_VALUE, defenseTag: "stone" } },
  { id: SAND_TOWER_ID, name: "积沙成塔", timingPhases: ["turn_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: sandCost(6) } },
  { id: SAND_WALTZ_ID, name: "沙暴舞天殇", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "all",
    elementCost: sandCost(7), powerValue: INFINITY_VALUE, levelValue: INFINITY_VALUE, defenseTag: "rebound" } },
  { id: SAND_DESOLATION_ID, name: "尘埃寂灭", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "single",
    elementCost: sandCost(15), powerValue: INFINITY_VALUE, levelValue: INFINITY_VALUE, defenseTag: "rebound" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "timingPhases"> & Partial<Pick<SkillDefinition, "typeTags" | "play">>>) {
  const raw = RAW_BIG_CARD_CATALOG.find((card) => card.id === SAND_CARD_ID)?.abilities.find((ability) => ability.id === entry.id);
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 27,
    description: raw?.description ?? entry.name, exposureTiming: entry.play ? "使用时" : "不暴露", tags: [], typeTags: entry.typeTags ?? [], hooks: {} };
}

export const ASURA_ANYTIME_PHASES: SkillDefinition["timingPhases"] = ["opening_action", "round_pre_interval_action", "round_before_action",
  "turn_before_action", "turn_change_action", "turn_damage_modify", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"];
for (const entry of [
  { id: ASURA_INHERIT_ID, name: "修罗血剑·传承", timingPhases: ["passive_check"] },
  { id: ASURA_BLOOD_ID, name: "修罗血剑·血气", typeTags: ["锁定技"], timingPhases: ["passive_check"] },
  { id: ASURA_RAIN_ID, name: "血雨腥风", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "all",
    power: 1, level: 10, defenseTag: "small", bloodQiCost: 3 } },
  { id: ASURA_DRAIN_ID, name: "修罗·嗜", typeTags: ["锁定技"], timingPhases: ["passive_check"] },
  { id: ASURA_LIFE_ID, name: "凝气决", typeTags: ["锁定技"], timingPhases: ["passive_check"] },
  { id: ASURA_JUDGE_ID, name: "修罗·判", timingPhases: ["passive_check"] },
  { id: ASURA_FERRY_ID, name: "修罗·渡", typeTags: ["控制技"], timingPhases: ["turn_change_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } },
  { id: ASURA_RITUAL_UPGRADE_ID, name: "修罗·祭", timingPhases: ASURA_ANYTIME_PHASES,
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", bloodQiCost: 50 } },
  { id: ASURA_SWORD_ID, name: "修罗血剑斩", timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "single",
    powerValue: INFINITY_VALUE, levelValue: INFINITY_VALUE, defenseTag: "stone", traits: ["pierce_rebound"], bloodQiCost: 20 } },
  { id: ASURA_IMMUNITY_ID, name: "修罗血剑斩·免疫不良", timingPhases: ["turn_change_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "timingPhases"> & Partial<Pick<SkillDefinition, "typeTags" | "play">>>) {
  const raw = RAW_BIG_CARD_CATALOG.find((card) => card.id === ASURA_CARD_ID)?.abilities.find((ability) => ability.id === entry.id);
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 28,
    description: raw?.description ?? "出修罗血剑斩后，可在变招阶段消耗全部血气，本回合免疫新增不良。", exposureTiming: entry.play ? "使用时" : "不暴露",
    tags: [], typeTags: entry.typeTags ?? [], hooks: {} };
}

const soulCost = (perStack: number) => ({ element: SOUL_ELEMENT, perStack });
for (const entry of [
  { id: SOUL_INHERIT_ID, name: "魂契渡灵·传承", timingPhases: ["passive_check"] },
  { id: SOUL_IGNORE_ID, name: "冥途无夜", typeTags: ["锁定技"], timingPhases: ["passive_check"] },
  { id: SOUL_EXTINGUISH_ID, name: "灵熄", typeTags: ["限定技"], timingPhases: ["revival_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", usesPerGame: 2 } },
  { id: SOUL_SINK_ID, name: "魂沉", typeTags: ["限定技"], timingPhases: ["retirement_counter_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", usesPerGame: 2 } },
  { id: SOUL_EXILE_ID, name: "悲音尽葬", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: soulCost(20) } },
  { id: SOUL_PACT_ID, name: "魂契渡灵", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: soulCost(50) } },
  { id: SOUL_RESTORE_EXTINGUISH_ID, name: "恢复灵熄次数", timingPhases: [...ASURA_ANYTIME_PHASES, "revival_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: soulCost(10) } },
  { id: SOUL_RESTORE_SINK_ID, name: "恢复魂沉次数", timingPhases: [...ASURA_ANYTIME_PHASES, "revival_action"],
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: soulCost(10) } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "timingPhases"> & Partial<Pick<SkillDefinition, "typeTags" | "play">>>) {
  const raw = RAW_BIG_CARD_CATALOG.find((card) => card.id === SOUL_PACT_CARD_ID)?.abilities.find((ability) => ability.id === entry.id);
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 29,
    description: raw?.description ?? "消耗10魂，为已使用过的对应限定技恢复1次。", exposureTiming: entry.play ? "使用时" : "不暴露",
    tags: [], typeTags: entry.typeTags ?? [], hooks: {} };
}

export function bigCardHasAbilityUses(card: NonNullable<PlayerState["bigCards"]>[number], skillId: string, extraUses = 0): boolean {
  if (skillId === XIELING_ULTIMATE_ID && card.xielingCooldown?.remaining) return false;
  const limit = BIG_CARD_SKILLS[skillId]?.play?.usesPerGame;
  return limit === undefined || getBigCardLimitedRemaining(card, skillId, limit) + extraUses > 0;
}

BIG_CARD_SKILLS[KARMA_CONVERT_ID] = { id: KARMA_CONVERT_ID, name: "轮回转生·转化",
  description: "在斗转星移、逆转、六芒星之间互转一次使用次数，或在治愈术、天佑之魂、沐浴圣光之间互转。沐浴圣光按副本转化，只改变初始血量。",
  implemented: true, fusion: "", category: "king_card", sourceRow: 2, exposureTiming: "使用时",
  tags: [], typeTags: [], timingPhases: ASURA_ANYTIME_PHASES, hooks: {},
  play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } };

for (const entry of [
  { id: ABYSS_INHERIT_ID, name: "虹吸之渊·轮回吞噬", timingPhases: ["passive_check"] },
  { id: LIFE_CHANNEL_ID, name: "生命通道", timingPhases: ["turn_action"], play: { kind: "effect", cost: 1, maxStacks: 1,
    targetMode: "single", nonAttackMove: true, power: 0, levelValue: INFINITY_VALUE, defenseTag: "stone" } },
  { id: SOUL_SIPHON_ID, name: "灵魂虹吸", timingPhases: ["turn_action"], play: { kind: "effect", cost: 3, maxStacks: 1,
    targetMode: "single", nonAttackMove: true, power: 0, levelValue: RETIRE_VALUE, defenseTag: "any" } },
  { id: GREED_CHAIN_ID, name: "贪婪锁链", timingPhases: ["turn_action"], play: { kind: "effect", cost: 4, maxStacks: 1,
    targetMode: "single", nonAttackMove: true, power: 0, levelValue: RETIRE_VALUE, defenseTag: "stone" } },
  { id: SIPHON_ABYSS_ID, name: "虹吸之渊", timingPhases: ["turn_action"], play: { kind: "effect", cost: 7, maxStacks: 1,
    targetMode: "single" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "timingPhases"> & Partial<Pick<SkillDefinition, "play">>>) {
  const raw = RAW_BIG_CARD_CATALOG.find((card) => card.id === ABYSS_CARD_ID)?.abilities.find((ability) => ability.id === entry.id);
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 30,
    description: raw?.description ?? entry.name, exposureTiming: entry.play ? "使用时" : "不暴露", tags: [], typeTags: [], hooks: {} };
}

for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === GAME_SWITCH_CARD_ID)!.abilities) {
  const isMove = ability.id === GAME_SWITCH_ACTION_ID;
  BIG_CARD_SKILLS[ability.id] = {
    id: ability.id, name: isMove ? "游戏切换服务器" : ["", "子局结算", "子局胜场奖励", "同模式三胜"][ability.order - 1]!,
    description: ability.id === GAME_SWITCH_PENALTY_ID ? GAME_SWITCH_PENALTY_DESCRIPTION : ability.description,
    fusion: "", category: "king_card", sourceRow: 31,
    implemented: true, exposureTiming: isMove ? "使用时" : "不暴露", tags: [], typeTags: [], hooks: {},
    timingPhases: isMove ? ["turn_action"] : ["passive_check"],
    ...(isMove ? { play: { kind: "effect", cost: 4, maxStacks: 1, targetMode: "none" } } : {})
  };
}

for (const entry of [
  { id: SAKURA_FALL_ID, name: "樱落", timingPhases: ["passive_check", "revival_action", "turn_end_action"],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } },
  { id: SAKURA_BLOOM_ID, name: "狂乱绽放", timingPhases: ["turn_action"] },
  { id: SAKURA_SPRING_ID, name: "春之歌", timingPhases: ["turn_action"] },
  { id: SAKURA_RAIN_ID, name: "樱之雨", timingPhases: ["turn_action"], typeTags: ["限定技"] },
  { id: SAKURA_FINALE_ID, name: "绽尽芳华", timingPhases: ["turn_action"] }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "timingPhases"> & Partial<Pick<SkillDefinition, "play" | "typeTags">>>) {
  const ability = RAW_BIG_CARD_CATALOG.find(({ id }) => id === SAKURA_CARD_ID)!.abilities.find(({ id }) => id === entry.id)!;
  const amount = entry.id === SAKURA_BLOOM_ID ? 3 : entry.id === SAKURA_SPRING_ID ? 5 : entry.id === SAKURA_FINALE_ID ? 30 : 0;
  BIG_CARD_SKILLS[entry.id] = {
    ...entry, description: ability.description, implemented: true, fusion: "", category: "king_card", sourceRow: 34,
    exposureTiming: "使用时", tags: [], typeTags: entry.typeTags ?? [], hooks: {},
    play: entry.play ?? { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none",
      elementCost: { element: SAKURA_ELEMENT, perStack: amount }, ...(entry.id === SAKURA_RAIN_ID ? { usesPerGame: 0 } : {}) }
  };
}

for (const entry of [
  { id: ETERNAL_PROGRESS_ID, name: "静滞进度", timingPhases: ["passive_check"] },
  { id: ETERNAL_BIND_ID, name: "刹那永恒", timingPhases: ["turn_change_action"],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } },
  { id: ETERNAL_THOUGHT_ID, name: "永恒一念", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 1, maxStacks: 1, targetMode: "none" } },
  { id: ETERNAL_REPLACE_ID, name: "更改永续出招", timingPhases: ["turn_change_action"],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "timingPhases"> & Partial<Pick<SkillDefinition, "play">>>) {
  const raw = RAW_BIG_CARD_CATALOG.find(({ id }) => id === ETERNAL_CARD_ID)!.abilities.find(({ id }) => id === entry.id);
  BIG_CARD_SKILLS[entry.id] = { ...entry, description: raw?.description ?? "花费一次机会，将永久续发的出招改为本回合选中的出招。",
    implemented: true, fusion: "", category: "king_card", sourceRow: 35, exposureTiming: entry.play ? "使用时" : "不暴露",
    tags: [], typeTags: [], hooks: {} };
}

for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === TRIPLE_SEAL_CARD_ID)!.abilities) {
  const move = ability.order <= 3;
  const name = ability.description.split("：", 1)[0]!;
  BIG_CARD_SKILLS[ability.id] = {
    id: ability.id, name: move || ability.order < 7 ? name : "三元协奏曲·王者",
    description: ability.description, implemented: true, fusion: "", category: "king_card", sourceRow: 36,
    exposureTiming: move ? "使用时" : "不暴露", timingPhases: [move ? "turn_action" : "passive_check"], tags: [], typeTags: [], hooks: {},
    ...(move ? { play: { kind: "effect", cost: 3, maxStacks: 1, targetMode: "single", nonAttackMove: true, power: 0,
      levelValue: ability.order === 3 ? [{ coefficient: -1, exponent: 1 }] : [{ coefficient: ability.order === 1 ? 5 : 2, exponent: 0 }],
      defenseTag: ability.order === 1 ? "any" : ability.order === 2 ? "cake" : "unblockable" } } : {})
  };
}

for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === EMPTY_CITY_CARD_ID)!.abilities) {
  const names = ["幻影替身", "精神穿刺", "极幻即真", "空城之下"];
  BIG_CARD_SKILLS[ability.id] = {
    id: ability.id, name: names[ability.order - 1]!, description: ability.description, implemented: true, fusion: "",
    category: "king_card", sourceRow: 37, exposureTiming: "不暴露", timingPhases: ["passive_check"], tags: [], typeTags: [], hooks: {}
  };
}

const charityActionPhases = ["opening_action", "round_pre_interval_action", "round_before_action", "turn_before_action",
  "turn_change_action", "turn_damage_modify", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"] as const;
for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === CHARITY_CARD_ID)!.abilities) {
  const quick = ability.id === CHARITY_QUICK_ID;
  const link = ability.id === CHARITY_LINK_ID;
  BIG_CARD_SKILLS[ability.id] = {
    id: ability.id, name: ["献身慈爱·治愈术", "天命", "速愈", "献身慈爱"][ability.order - 1]!,
    description: link ? CHARITY_LINK_DESCRIPTION : ability.description, implemented: true, fusion: "",
    category: "king_card", sourceRow: 38, exposureTiming: quick || link ? "使用时" : "不暴露",
    timingPhases: quick ? [...charityActionPhases] : link ? ["turn_action"] : ["passive_check"], tags: [], typeTags: [], hooks: {},
    ...(quick ? { play: { kind: "effect", cost: 1, maxStacks: 1, targetMode: "single" } } :
      link ? { play: { kind: "effect", cost: 5, maxStacks: 1, targetMode: "none", optionalTargetCount: MAX_PLAYERS - 1 } } : {})
  };
}

export { BEAST_CARD_ID, BEAST_HUNT_ID, HOUND_SUMMON_ID, EAGLE_EYE_ID, BEAR_ROAR_ID, BEAST_KILL_ID, PIG_ID } from "../engine/beastTraits";
for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === "10537")!.abilities) {
  const summon = ability.order === 2;
  const roar = ability.order === 4;
  const final = ability.order === 5;
  BIG_CARD_SKILLS[ability.id] = {
    id: ability.id, name: ["猎杀传承", "猎犬撕咬", "鹰眼狩猎", "灰熊咆哮", "兽王杀戮"][ability.order - 1]!,
    description: ability.description, implemented: true, fusion: "", category: "king_card", sourceRow: 40,
    exposureTiming: summon || roar || final ? "使用时" : "不暴露", tags: [], typeTags: [], hooks: {},
    timingPhases: roar ? [...charityActionPhases] : summon || final ? ["turn_action"] : ["passive_check"],
    ...(summon ? { play: { kind: "effect", cost: 2, maxStacks: 1, targetMode: "single" } } :
      roar ? { play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } } :
      final ? { play: { kind: "effect", cost: 10, maxStacks: 1, targetMode: "single", nonAttackMove: true,
        power: 0, levelValue: VANISH_VALUE, defenseTag: "any" } } : {})
  };
}
BIG_CARD_SKILLS["1065502"] = {
  id: "1065502", name: "猪", description: "除此条外所有技能被封锁，无法出招。获得时失去所有多余命，血量变为0，清空所有额外效果。视为动物。",
  implemented: true, fusion: "", category: "king_card", sourceRow: 0, exposureTiming: "不暴露", tags: [], typeTags: [],
  timingPhases: ["passive_check"], hooks: {}
};

for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === LONE_STAR_CARD_ID)!.abilities) {
  const id = ability.id;
  const numeric = id === LONE_STAR_STRIKE_ID || id === LONE_STAR_PIERCE_ID || id === LONE_STAR_RAGE_ID;
  const finale = id === LONE_STAR_FINALE_ID;
  const power = id === LONE_STAR_STRIKE_ID ? 66 : 666;
  BIG_CARD_SKILLS[id] = {
    id, name: ["独", "绝击", "星绝击", "怒星莽击", "孤星绝煞"][ability.order - 1]!, description: ability.description,
    fusion: "", category: "king_card", implemented: true, sourceRow: 41, tags: [], typeTags: [], hooks: {},
    exposureTiming: numeric || finale ? "使用时" : "不暴露", timingPhases: numeric || finale ? ["turn_action"] : ["passive_check"],
    ...(numeric ? { play: { kind: "attack", cost: id === LONE_STAR_STRIKE_ID ? 2 : id === LONE_STAR_PIERCE_ID ? 4 : 8,
      maxStacks: 1, targetMode: "single", defenseTag: "any", ...(id === LONE_STAR_RAGE_ID ?
        { powerValue: INFINITY_VALUE, levelValue: INFINITY_VALUE } : { power, level: power }) } } :
      finale ? { play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "single", defenseTag: "stone", nonAttackMove: true,
        power: 0, level: 0, usesPerGame: 1 } } : {})
  };
}

for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === THORN_DANCE_CARD_ID)!.abilities) {
  const id = ability.id;
  const defenseTag = id === THORN_STING_ID ? "small" : id === THORN_PIERCE_ID ? "youtiao" : id === THORN_BIND_ID ? "stone" : "cake";
  const inherited = id === THORN_INHERIT_ID;
  BIG_CARD_SKILLS[id] = {
    id, name: ["荆棘乱舞·传承", "刺", "穿", "缚", "舞"][ability.order - 1]!, description: ability.description,
    fusion: "", category: "king_card", implemented: true, sourceRow: 43, tags: [], typeTags: [], hooks: {},
    exposureTiming: inherited ? "不暴露" : "使用时", timingPhases: inherited ? ["passive_check"] :
      id === THORN_PIERCE_ID ? ["turn_action", "turn_damage_modify"] : ["turn_action"],
    ...(inherited ? {} : { play: { kind: "attack", cost: 1, maxStacks: id === THORN_STING_ID || id === THORN_BIND_ID ? 99 : 1,
      targetMode: "single", defenseTag, power: id === THORN_DANCE_ID ? 0 : 1, levelValue: INFINITY_VALUE } })
  };
}

for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === VACUUM_CARD_ID)!.abilities) {
  const { id } = ability;
  const playable = [VACUUM_EXTRACT_ID, VACUUM_ENTER_ID, VACUUM_MAX_ID].includes(id);
  BIG_CARD_SKILLS[id] = {
    id, name: ["浩渺真空·传承", "真空", "真空涨落", "虚无提取", "遁入虚空", "虚无缥缈", "浩渺真空", "反物质技术"][ability.order - 1]!,
    description: ability.description, fusion: "", category: "king_card", implemented: true, sourceRow: 44, tags: [], typeTags: [], hooks: {},
    exposureTiming: playable ? "使用时" : "不暴露", timingPhases: playable ? ["turn_action"] : ["passive_check"],
    ...(playable ? { play: { kind: "effect", cost: id === VACUUM_ENTER_ID ? 4 : 2, maxStacks: 1, targetMode: "none" } } : {})
  };
}
BIG_CARD_SKILLS[ANTI_CAKE_MOVE_ID] = {
  id: ANTI_CAKE_MOVE_ID, name: "反饼", description: "消耗 1 反饼，攻 0、0 级，任意防。若目标出饼，使其退游。",
  fusion: "", category: "king_card", implemented: true, sourceRow: 44, tags: [], typeTags: [], hooks: {},
  exposureTiming: "不暴露", timingPhases: ["turn_action"],
  play: { kind: "attack", cost: 0, power: 0, level: 0, maxStacks: 1, targetMode: "single", defenseTag: "any" }
};

for (const [id, name] of [[CURTAIN_REBIRTH_ID, "谢幕光绮·传承"], [CURTAIN_OPEN_ID, "起幕的幽光"], [CURTAIN_PRELUDE_ID, "序曲的微芒"],
  [CURTAIN_INTERLUDE_ID, "中场的炽明"], [CURTAIN_DARK_ID, "高潮的永暗"], [CURTAIN_ENCORE_ID, "尾声的明星"],
  [CURTAIN_FINALE_ID, "谢幕光绮"], [CURTAIN_VEIL_ID, "光绮"]] as const) {
  const raw = RAW_BIG_CARD_CATALOG.find((card) => card.id === CURTAIN_CARD_ID)?.abilities.find((ability) => ability.id === id);
  const attack = id === CURTAIN_OPEN_ID || id === CURTAIN_PRELUDE_ID || id === CURTAIN_INTERLUDE_ID;
  const effect = id === CURTAIN_DARK_ID || id === CURTAIN_ENCORE_ID || id === CURTAIN_FINALE_ID;
  BIG_CARD_SKILLS[id] = { id, name, description: raw?.description ?? "复活技。无效果。不可弃置，谢幕光绮除外。", category: "king_card",
    sourceRow: 45, fusion: "", implemented: true, tags: [], typeTags: id === CURTAIN_VEIL_ID ? ["复活技"] : [], hooks: {},
    exposureTiming: attack || effect ? "使用时" : "不暴露", timingPhases: attack || effect ? ["turn_action"] : ["passive_check"],
    ...(attack ? { play: { kind: "attack", cost: id === CURTAIN_PRELUDE_ID ? 3 : 2, maxStacks: 1,
      power: id === CURTAIN_OPEN_ID ? 3 : id === CURTAIN_PRELUDE_ID ? 5 : 6,
      level: id === CURTAIN_OPEN_ID ? 3 : id === CURTAIN_PRELUDE_ID ? 5 : 0,
      targetMode: id === CURTAIN_INTERLUDE_ID ? "all" : "single",
      defenseTag: id === CURTAIN_OPEN_ID ? "small" : id === CURTAIN_PRELUDE_ID ? "youtiao" : "stone" } } :
    effect ? { play: { kind: "effect", cost: id === CURTAIN_DARK_ID ? 5 : id === CURTAIN_ENCORE_ID ? 1 : 0, maxStacks: 1,
      targetMode: id === CURTAIN_FINALE_ID ? "single" : "none",
      ...(id === CURTAIN_FINALE_ID ? { nonAttackMove: true, power: 0, level: 0, defenseTag: "any" } : {}) } } : {}) };
}

const swarmNames = ["万翼归巢·传承", "甲虫", "飞虫", "跳虫", "虫后", "万翼归巢"];
for (const [index, ability] of (RAW_BIG_CARD_CATALOG.find((card) => card.id === SWARM_CARD_ID)?.abilities ?? []).entries()) {
  const active = ability.id === SWARM_RETURN_ID;
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: swarmNames[index]!, description: ability.description, sourceRow: 46,
    fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: "不暴露",
    timingPhases: [active ? "turn_action" : "passive_check"], hooks: {},
    ...(active ? { play: { kind: "attack", cost: 3, maxStacks: 1, power: 1, level: 0, targetMode: "all",
      defenseTag: "small" } } : {}) };
}

const tigerNames = ["形态切换", "幽冥灵猫", "幽冥斩", "幽冥佑", "幽冥刺", "邪眸白虎", "白虎灭", "白虎杀",
  "幽冥白虎·传承", "幽冥白虎", "幽冥", "白虎", "幽冥白虎·群退游", "幽冥白虎·锁定", "创生"];
const tigerMoves: Record<string, NonNullable<SkillDefinition["play"]>> = {
  [TIGER_SWITCH]: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" },
  [TIGER_SLASH]: { kind: "attack", cost: 2, power: 6, levelValue: INFINITY_VALUE, maxStacks: 1, targetMode: "single", defenseTag: "youtiao" },
  [TIGER_GUARD]: { kind: "effect", cost: 2, maxStacks: 1, targetMode: "none" },
  [TIGER_STAB]: { kind: "attack", cost: 4, power: 0, level: 0, maxStacks: 1, targetMode: "single", defenseTag: "rebound" },
  [TIGER_EXTINCTION]: { kind: "attack", cost: 3, power: 10, level: 20, maxStacks: 1, targetMode: "all", defenseTag: "stone" },
  [TIGER_EXTINCTION_MOVE]: { kind: "attack", cost: 0, cakeCostKind: "none", power: 3, level: 6, maxStacks: 1, targetMode: "single",
    defenseTag: "small", traits: ["pierce_rebound"] },
  [TIGER_KILL]: { kind: "attack", cost: 4, power: 20, levelValue: INFINITY_VALUE, maxStacks: 1, targetMode: "all", defenseTag: "rebound" },
  [TIGER_NETHER]: { kind: "attack", cost: 4, powerValue: RETIRE_VALUE, levelValue: INFINITY_VALUE, maxStacks: 1, targetMode: "single",
    defenseTag: "any", traits: ["defeat_retire", "pierce_rebound"] },
  [TIGER_WHITE]: { kind: "attack", cost: 4, powerValue: INFINITY_VALUE, levelValue: RETIRE_VALUE, maxStacks: 1, targetMode: "all", defenseTag: "small" },
  [TIGER_FINAL]: { kind: "effect", cost: 6, power: 0, level: 0, nonAttackMove: true, maxStacks: 1, targetMode: "all", defenseTag: "youtiao" },
  [TIGER_RESTORE]: { kind: "effect", cost: 10, maxStacks: 1, targetMode: "none" }
};
for (const ability of RAW_BIG_CARD_CATALOG.find((card) => card.id === TIGER_CARD)?.abilities ?? []) {
  const play = tigerMoves[ability.id];
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: tigerNames[ability.order - 1]!, description: ability.description, sourceRow: 48,
    fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: "不暴露", hooks: {},
    timingPhases: ability.id === TIGER_SWITCH ? ["round_pre_interval_action", "round_after_interval_action"] :
      [play ? "turn_action" : "passive_check"], ...(play ? { play } : {}) };
}
BIG_CARD_SKILLS[TIGER_EXTINCTION_MOVE] = { ...BIG_CARD_SKILLS[TIGER_EXTINCTION]!, id: TIGER_EXTINCTION_MOVE, name: "灭",
  description: "消耗1次灭机会，攻3、6级、小防防、破弹；每命中1人返还1/3次灭机会。",
  play: tigerMoves[TIGER_EXTINCTION_MOVE]! };

const divineNames = ["烈光", "盲目", "亡命", "怒炎", "裂神", "无归"];
for (const [index, ability] of (RAW_BIG_CARD_CATALOG.find((card) => card.id === DIVINE_REVERSAL_CARD_ID)?.abilities ?? []).entries()) {
  const active = ability.id === DIVINE_FLAME_ID;
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: divineNames[index]!, description: ability.description, sourceRow: 47,
    fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: "不暴露",
    timingPhases: [active ? "round_before_action" : "passive_check"], hooks: {},
    ...(active ? { play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } } : {}) };
}

for (const ability of RAW_BIG_CARD_CATALOG.find((card) => card.id === TOTEM_CARD_ID)?.abilities ?? []) {
  const creation = ability.id === TOTEM_CREATE_ID;
  const kind = Object.values(TOTEM_KINDS).find(({ id }) => id === ability.id);
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: kind?.name ?? "随机图腾", description: ability.description,
    sourceRow: 49, fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: "不暴露",
    timingPhases: [creation ? "turn_action" : "passive_check"], hooks: {},
    ...(creation ? { play: { kind: "effect", cost: 3, maxStacks: 1, targetMode: "single" } } : {}) };
}
const totemCreation = BIG_CARD_SKILLS[TOTEM_CREATE_ID]!;
BIG_CARD_SKILLS[TOTEM_CHOOSE_ID] = { ...totemCreation, id: TOTEM_CHOOSE_ID, name: "指定图腾", play: { ...totemCreation.play!, cost: 5 } };

const starWheelActionWindows = [...ACTION_WINDOW_PHASES].filter((phase) =>
  !["turn_action", "victory_counter_action", "retirement_counter_action", "revival_action"].includes(phase));
for (const ability of RAW_BIG_CARD_CATALOG.find((card) => card.id === STAR_WHEEL_CARD)?.abilities ?? []) {
  const [name, cost, phases] = ([
    ["星移飞轮·传承", 0, ["passive_check"]],
    ["逆转封存", 0, ["passive_check"]],
    ["星移", 0, ["round_after_interval_action"]],
    ["飞轮", 6, ["turn_action"]],
    ["璇空", 0, ["turn_action", "turn_change_action"]],
    ["星移飞轮", 0, ["turn_action"]]
  ] as const)[ability.order - 1]!;
  const passive = phases[0] === "passive_check";
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name, description: ability.description, sourceRow: 50, fusion: "",
    implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: "不暴露", timingPhases: [...phases],
    hooks: {}, ...(!passive ? { play: { kind: "effect", cost, maxStacks: 1,
      targetMode: ability.id === STAR_WHEEL_SHIFT ? "single" : "none" } } : {}) };
}
for (const [id, base, name] of [[STAR_WHEEL_POSITION, STAR_WHEEL_SHIFT, "选择座次判定"],
  [STAR_WHEEL_RELEASE, STAR_WHEEL_SEAL, "释放封存出招"]] as const) {
  BIG_CARD_SKILLS[id] = { ...BIG_CARD_SKILLS[base]!, id, name, timingPhases: starWheelActionWindows,
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } };
}

const crystalNames = ["神域魔晶·传承", "魔晶", "神域之界", "守护归于天界", "神域魔晶"];
for (const ability of RAW_BIG_CARD_CATALOG.find((card) => card.id === CRYSTAL_CARD_ID)?.abilities ?? []) {
  const active = ability.id === CRYSTAL_GUARD_ID || ability.id === CRYSTAL_SHIELD_ID;
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: crystalNames[ability.order - 1]!, description: ability.description,
    sourceRow: 51, fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: "不暴露",
    timingPhases: [ability.id === CRYSTAL_GUARD_ID ? "turn_damage_modify" : ability.id === CRYSTAL_SHIELD_ID ? "turn_action" : "passive_check"],
    hooks: {}, ...(active ? { play: { kind: "effect", cost: ability.id === CRYSTAL_SHIELD_ID ? 2 : 0,
      ...(ability.id === CRYSTAL_GUARD_ID ? { cakeCostKind: "none" } : {}), maxStacks: 1, targetMode: "none" } } : {}) };
}
const deadRealmNames = ["生死的界限", "遍历死域", "死域归来者", "死域归来者·补判"];
for (const ability of RAW_BIG_CARD_CATALOG.find((card) => card.id === DEAD_REALM_CARD_ID)?.abilities ?? []) {
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: deadRealmNames[ability.order - 1]!, description: ability.description,
    sourceRow: 52, fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: "不暴露",
    timingPhases: ["passive_check"], hooks: {} };
}

for (const entry of [
  { id: CORRUPTION_DOMAIN_ID, name: "疾病云雾·邪域", timingPhases: ["passive_check"] },
  { id: CORRUPTION_ROT_ID, name: "腐烂", timingPhases: ["passive_check"] },
  { id: CORRUPTION_FIELD_ID, name: "雾蚀界", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 2, maxStacks: 1, targetMode: "none" } },
  { id: CORRUPTION_CLOUD_ID, name: "疾病云雾", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 1, maxStacks: MAX_ACTION_STACKS, targetMode: "none" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "timingPhases"> & Partial<Pick<SkillDefinition, "play">>>) {
  const raw = RAW_BIG_CARD_CATALOG.find((card) => card.id === CORRUPTION_CARD_ID)?.abilities.find((ability) => ability.id === entry.id);
  BIG_CARD_SKILLS[entry.id] = { ...entry, description: raw?.description ?? entry.name, sourceRow: 53, fusion: "",
    implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: "不暴露", hooks: {} };
}
const demonActionPlay: NonNullable<SkillDefinition["play"]> = {
  kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none"
};
for (const ability of RAW_BIG_CARD_CATALOG.find((card) => card.id === DEMON_CARD_ID)?.abilities ?? []) {
  const active = ability.id !== DEMON_ABYSS_ID;
  BIG_CARD_SKILLS[ability.id] = {
    id: ability.id, name: ability.description.split("：")[0]!, description: ability.description,
    sourceRow: 54, fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [],
    exposureTiming: active ? "使用时" : "不暴露",
    timingPhases: active ? ASURA_ANYTIME_PHASES : ["passive_check"], hooks: {},
    ...(active ? { play: isTargetedDemonSummon(ability.id) ? { ...demonActionPlay, targetMode: "single" } : demonActionPlay } : {})
  };
}
for (const [id, abilityId, name, description] of [
  [DEMON_IMP_ORDER_ID, DEMON_IMP_ID, "指挥小鬼", "回合前行动，为一只已入场的小鬼设定待命或火球及其目标。"],
  [DEMON_GUARD_ORDER_ID, DEMON_GUARD_ID, "指挥恶魔卫士", "回合前行动，为一只已入场的恶魔卫士设定待命、旋风斩或军团打击，亦可立即使用恶魔力量。"]
] as const) {
  BIG_CARD_SKILLS[id] = { ...BIG_CARD_SKILLS[abilityId]!, id, name, description, timingPhases: ["turn_before_action"] };
}
for (const [id, name, level, defenseTag, targetMode, traits] of [
  [DEMON_FEAR_BITE, "恐惧猎犬·撕咬", 20, "small", "single", ["pierce_rebound"]],
  [DEMON_EVIL_BITE, "邪犬·撕咬", 20, "small", "single", ["pierce_rebound"]],
  [DEMON_WHIRLWIND, "旋风斩", 20, "small", "all", ["area"]],
  [DEMON_LEGION_AREA, "军团打击·群攻", 10, "youtiao", "single", ["area"]],
  [DEMON_LEGION_SINGLE, "军团打击·单攻", 10, "youtiao", "single", []]
] as const) {
  BIG_CARD_SKILLS[id] = { ...BIG_CARD_SKILLS[DEMON_GUARD_ID]!, id, name, description: name,
    timingPhases: ["turn_action"], play: { ...demonActionPlay, kind: "attack", power: 10, level, defenseTag, targetMode, traits: [...traits] } };
}

for (const entry of [
  { id: YOUKAI_RESOURCE_ID, name: "积妖元", timingPhases: ["passive_check"] },
  { id: YOUKAI_LAYERS_ID, name: "妖力沉淀", timingPhases: ["turn_action"],
    play: { kind: "effect", cost: 0, cakeCostKind: "none", elementCost: { element: YOUKAI_ELEMENT, perStack: 1 },
      maxStacks: MAX_ACTION_STACKS, targetMode: "none" } },
  { id: YOUKAI_WIND_ID, name: "刺骨妖风", timingPhases: ["turn_action"],
    play: { kind: "attack", cost: 0, cakeCostKind: "none", elementCost: { element: YOUKAI_ELEMENT, perStack: 3 },
      power: 1, level: INFINITE_DAMAGE, levelValue: INFINITY_VALUE, defenseTag: "unblockable",
      maxStacks: MAX_ACTION_STACKS, targetMode: "all" } },
  { id: YOUKAI_SOUL_ID, name: "夺魄吸纳", timingPhases: ["passive_check"] },
  { id: YOUKAI_HALF_ID, name: "半妖化", timingPhases: ["passive_check"] },
  { id: YOUKAI_FULL_ID, name: "妖化", timingPhases: ["passive_check"] },
  { id: YOUKAI_RITUAL_ID, name: "未央鬼祭", timingPhases: ["turn_action"],
    play: { kind: "attack", cost: 0, cakeCostKind: "none", elementCost: { element: YOUKAI_ELEMENT, perStack: 64 },
      powerValue: RETIRE_VALUE, level: 0, traits: ["defeat_retire", "area"], defenseTag: "unblockable",
      maxStacks: 1, targetMode: "all" } }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "timingPhases"> & Partial<Pick<SkillDefinition, "play">>>) {
  const ability = RAW_BIG_CARD_CATALOG.find((card) => card.id === YOUKAI_CARD_ID)?.abilities.find((child) => child.id === entry.id);
  BIG_CARD_SKILLS[entry.id] = { ...entry, description: ability?.description ?? entry.name, sourceRow: 55, fusion: "",
    implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: entry.play ? "使用时" : "不暴露", hooks: {} };
}

const shadowMoves: Record<string, NonNullable<SkillDefinition["play"]>> = {
  [SHADOW_FOLLOW_ID]: { kind: "effect", cost: 3, maxStacks: 1, targetMode: "single" },
  [SHADOW_BLADE_ID]: { kind: "attack", cost: 1, maxStacks: 1, targetMode: "single", power: 1, level: 1, defenseTag: "cake" },
  [SHADOW_BLADE_DANCE_ID]: { kind: "attack", cost: 2, maxStacks: 1, targetMode: "single", power: 30, level: 0, defenseTag: "any" },
  [SHADOW_WIND_DANCE_ID]: { kind: "effect", cost: 1, maxStacks: 1, targetMode: "single" },
  [SHADOW_SHRIEK_ID]: { kind: "effect", nonAttackMove: true, cost: 2, maxStacks: 1, targetMode: "single", defenseTag: "stone" },
  [SHADOW_STOP_SHRIEK_ID]: { kind: "attack", cost: 3, maxStacks: 1, targetMode: "single", power: 0, level: 0, defenseTag: "any" },
  [SHADOW_LEAVE_ID]: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, usesPerGame: 1, targetMode: "none" }
};
for (const ability of RAW_BIG_CARD_CATALOG.find((card) => card.id === SHADOW_CARD_ID)?.abilities ?? []) {
  const play = shadowMoves[ability.id];
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: ability.order === 1 ? "杀之缭舞·传承" : ability.description.split("：")[0]!,
    description: ability.description, sourceRow: 56, fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [],
    exposureTiming: play ? "使用时" : "不暴露", hooks: {},
    timingPhases: ability.id === SHADOW_LEAVE_ID ? ["turn_before_action", "turn_change_action"] :
      [play ? "turn_action" : "passive_check"], ...(play ? { play } : {}) };
}

const yuanMoveCosts: Readonly<Record<string, number>> = {
  [YUAN_RETURN_ID]: 3, [YUAN_VOID_ID]: 5, [YUAN_ORIGIN_ID]: 6, [YUAN_RESTART_ID]: 8
};
for (const ability of RAW_BIG_CARD_CATALOG.find((card) => card.id === YUAN_CARD_ID)?.abilities ?? []) {
  BIG_CARD_SKILLS[ability.id] = {
    id: ability.id, name: ability.description.split("：")[0]!, description: ability.description, sourceRow: 57,
    fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], exposureTiming: "使用时",
    hooks: {}, timingPhases: ["turn_action"],
    play: { kind: "effect", cost: yuanMoveCosts[ability.id]!, maxStacks: 1, targetMode: "none" }
  };
}

for (const ability of RAW_BIG_CARD_CATALOG.find((card) => card.id === SUN_CARD_ID)?.abilities ?? []) {
  const { id, description } = ability;
  const group = id === SUN_GLORY_ID || id === SUN_RETURN_ID;
  const crown = id === SUN_CROWN_ID;
  const play: SkillPlayDefinition | undefined = group
    ? { kind: "effect", cost: id === SUN_GLORY_ID ? 8 : 16, maxStacks: 1, targetMode: "all", defenseTag: "any", nonAttackMove: true }
    : crown ? { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } : undefined;
  BIG_CARD_SKILLS[id] = { id, name: description.split("：")[0]!, description, sourceRow: 58,
    fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [],
    exposureTiming: play ? "使用时" : "触发时", hooks: {},
    timingPhases: crown ? ["round_pre_interval_action"] : group ? ["turn_action"] : ["passive_check"],
    ...(play ? { play } : {}) };
}

const moonMoves: Readonly<Record<string, SkillPlayDefinition>> = {
  [MOON_RITUAL_ID]: { kind: "effect", cost: 6, maxStacks: 1, targetMode: "none" },
  [MOON_GRIEF_ID]: { kind: "attack", cost: 8, maxStacks: 1, targetMode: "all", power: 5, level: 6, defenseTag: "stone" },
  [MOON_SHADOW_ID]: { kind: "effect", cost: 12, maxStacks: 1, targetMode: "all", nonAttackMove: true, defenseTag: "youtiao" },
  [MOON_PUNISH_ID]: { kind: "attack", cost: 18, maxStacks: 1, targetMode: "all", powerValue: RETIRE_VALUE,
    levelValue: RETIRE_VALUE, defenseTag: "rebound", traits: ["defeat_retire"] },
  [MOON_CHANT_ID]: { kind: "effect", cost: 4, maxStacks: 1, targetMode: "none" },
  [MOON_PRAISE_ID]: { kind: "effect", cost: 16, maxStacks: 1, targetMode: "single" },
  [MOON_DANCE_ID]: { kind: "effect", cost: 32, maxStacks: 1, targetMode: "none" },
  [MOON_TIDE_ID]: { kind: "effect", cost: 120, maxStacks: 1, targetMode: "all", nonAttackMove: true, defenseTag: "rebound" }
};
for (const { id, description } of RAW_BIG_CARD_CATALOG.find((card) => card.id === MOON_CARD_ID)?.abilities ?? []) {
  const play = moonMoves[id];
  BIG_CARD_SKILLS[id] = { id, name: play || description.includes("：") ? description.split("：")[0]! : "辉月",
    description, sourceRow: 59, fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [],
    exposureTiming: play ? "使用时" : "触发时", hooks: {},
    timingPhases: [play ? "turn_action" : "passive_check"], ...(play ? { play } : {}) };
}

for (const { id, description } of RAW_BIG_CARD_CATALOG.find((card) => card.id === SWORD_ARRAY_CARD_ID)?.abilities ?? []) {
  const play: SkillPlayDefinition | undefined = id === SWORD_ARRAY_PLACE_ID
    ? { kind: "effect", cost: 1, maxStacks: 1, targetMode: "single" }
    : id === SWORD_ARRAY_EXECUTE_ID
      ? { kind: "attack", cost: 10, maxStacks: 1, targetMode: "single", defenseTag: "any", powerValue: INFINITY_VALUE, levelValue: INFINITY_VALUE }
      : undefined;
  const name = id === SWORD_ARRAY_PLACE_ID ? "诛仙剑阵" :
    id === SWORD_ARRAY_LIMIT_ID ? "诛仙剑阵·唯一" : description.split("：")[0]!;
  BIG_CARD_SKILLS[id] = { id, name, description, sourceRow: 60, fusion: "", implemented: true,
    category: "king_card", typeTags: [], tags: [], exposureTiming: play ? "使用时" : "触发时", hooks: {},
    timingPhases: [play ? "turn_action" : "passive_check"], ...(play ? { play } : {}) };
}

const bladeMaintenancePhases = [...ACTION_WINDOW_PHASES].filter((phase) =>
  phase !== "turn_action" && phase !== "revival_action" && phase !== "victory_counter_action" && phase !== "retirement_counter_action");
const brokenBladeNames = ["天堂向左，战士向右", "青釭剑·传承", "破损战刃·受伤获饼", "破损战刃·失饼蓄力"];
for (const { id, order, description } of RAW_BIG_CARD_CATALOG.find((card) => card.id === BROKEN_BLADE_CARD_ID)?.abilities ?? []) {
  const tier = BLADE_MAINTENANCE_IDS.findIndex((maintenanceId) => maintenanceId === id);
  const currentBlade = BROKEN_BLADE_TIERS[tier];
  const nextBlade = BROKEN_BLADE_TIERS[tier + 1];
  const name = currentBlade ? `修复·${currentBlade.name}` : brokenBladeNames[order - 1]!;
  const definition: SkillDefinition = { id, name, description, sourceRow: 61, fusion: "", implemented: true,
    category: "king_card", typeTags: [], tags: [], exposureTiming: currentBlade ? "使用时" : "触发时", hooks: {},
    timingPhases: currentBlade ? bladeMaintenancePhases : ["passive_check"],
    ...(currentBlade ? { play: { kind: "effect", cost: tier + 1, maxStacks: 1, targetMode: "none" } } : {}) };
  BIG_CARD_SKILLS[id] = definition;
  if (currentBlade && nextBlade) {
    const reforgeId = `${id}_reforge`;
    BIG_CARD_SKILLS[reforgeId] = { ...definition, id: reforgeId, name: `重铸·${nextBlade.name}`,
      play: { kind: "effect", cost: 5, maxStacks: 1, targetMode: "none" } };
  }
}

const decayNames = ["破败之道·血量上限", "破败之道·传承", "破败之道·印记", "破败之道·转换"];
const decayMoves: Readonly<Record<string, SkillPlayDefinition>> = {
  [DECAY_HALF_ID]: { kind: "effect", cost: 3, maxStacks: 1, targetMode: "single", nonAttackMove: true,
    power: 0, levelValue: INFINITY_VALUE, defenseTag: "stone" },
  [DECAY_EXTREME_ID]: { kind: "attack", cost: 3, maxStacks: 1, targetMode: "single", power: 1,
    levelValue: scaleCombatValue(INFINITY_VALUE, -1), defenseTag: "stone" },
  [DECAY_SPREAD_ID]: { kind: "effect", cost: 3, maxStacks: 1, targetMode: "all" }
};
for (const { id, order, description } of RAW_BIG_CARD_CATALOG.find((card) => card.id === DECAY_CARD_ID)?.abilities ?? []) {
  const play = decayMoves[id];
  BIG_CARD_SKILLS[id] = { id, name: decayNames[order - 1] ?? description.split("：")[0]!, description,
    sourceRow: 62, fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], hooks: {},
    exposureTiming: play ? "使用时" : "触发时", timingPhases: [play ? "turn_action" : "passive_check"],
    ...(play ? { play } : {}) };
}

for (const { id, description } of RAW_BIG_CARD_CATALOG.find(({ id }) => id === TIAN_YE_CARD_ID)?.abilities ?? []) {
  const name = description.split("：")[0]!;
  BIG_CARD_SKILLS[id] = { id, name, description, sourceRow: 63, fusion: "", implemented: true, category: "king_card",
    typeTags: [], tags: [], hooks: {}, exposureTiming: "触发时",
    timingPhases: [id === TIAN_YE_CHOICE_ID ? "turn_before_action" : "passive_check"],
    ...(id === TIAN_YE_CHOICE_ID ? { play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } } : {}) };
}

const seaGodMoves: Readonly<Record<string, SkillPlayDefinition>> = {
  [SEA_GOD_WAVES_ID]: { kind: "effect", nonAttackMove: true, cost: 0, cakeCostKind: "none", maxStacks: 1,
    targetMode: "single", defenseTag: "rebound", power: 0, levelValue: combatValue(1, 3), usesPerGame: 8 },
  [SEA_GOD_RETURN_ID]: { kind: "attack", cost: 0, cakeCostKind: "none", maxStacks: 1,
    targetMode: "single", defenseTag: "stone", power: 10, level: 14 },
  [SEA_GOD_TRIDENT_ID]: { kind: "attack", cost: 3, maxStacks: 1, targetMode: "single", defenseTag: "stone",
    powerValue: INFINITY_VALUE, levelValue: INFINITY_VALUE, traits: ["pierce_rebound"] },
  [SEA_GOD_DUSK_ID]: { kind: "effect", cost: 2, maxStacks: 1, targetMode: "none", usesPerGame: 3 }
};
for (const { id, description, sourceCell } of RAW_BIG_CARD_CATALOG.find(({ id }) => id === SEA_GOD_CARD_ID)?.abilities ?? []) {
  const play = seaGodMoves[id];
  BIG_CARD_SKILLS[id] = { id, name: description.split("：")[0]!, description, sourceRow: Number(sourceCell.slice(1)),
    fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], hooks: {},
    exposureTiming: play ? "使用时" : "触发时", timingPhases: [play ? "turn_action" : "passive_check"], ...(play ? { play } : {}) };
}

const karmaPlays: Readonly<Record<string, SkillPlayDefinition>> = {
  [KARMA_REBIRTH_ID]: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none", usesPerGame: 1 },
  [KARMA_PUNISH_ID]: { kind: "attack", cost: 4, maxStacks: 1, targetMode: "single", defenseTag: "unblockable", power: 10, level: 0 },
  [KARMA_SONG_ID]: { kind: "effect", cost: 6, maxStacks: 1, targetMode: "none" },
  [KARMA_CYCLE_ID]: { kind: "effect", cost: 8, maxStacks: 1, targetMode: "none" }
};
for (const { id, description, sourceCell } of RAW_BIG_CARD_CATALOG.find((card) => card.id === KARMA_CARD_ID)?.abilities ?? []) {
  const play = karmaPlays[id];
  const timing = id === KARMA_REBIRTH_ID ? "revival_action" : play ? "turn_action" : "passive_check";
  BIG_CARD_SKILLS[id] = { id, name: id === KARMA_REBIRTH_ID ? "轮回转生" : id === KARMA_CYCLE_ID ? "命宇轮回" :
    description.split(/[：。]/)[0]!, description, sourceRow: Number(sourceCell.slice(1)),
    fusion: "", implemented: true, category: "king_card", typeTags: [], tags: [], hooks: {},
    exposureTiming: play ? "使用时" : "不暴露", timingPhases: [timing], ...(play ? { play } : {}) };
}

BIG_CARD_SKILLS[KARMA_SONG_END_ID] = { ...BIG_CARD_SKILLS[KARMA_SONG_ID]!, id: KARMA_SONG_END_ID,
  name: "结束轮回", description: "主动结束失落之歌赋予的轮回及无法获得状态效果。", exposureTiming: "不暴露",
  timingPhases: [...ACTION_WINDOW_PHASES].filter((phase) => phase !== "victory_counter_action" && phase !== "retirement_counter_action"),
  play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "none" } };

const cheatQuotas: Record<string, number> = {
  [CHEAT_GATHER_ID]: 1, [CHEAT_SHARP_ID]: 4, [CHEAT_NOGLUES_ID]: 2, [CHEAT_WARP_ID]: 3,
  [CHEAT_ABSOLUTE_ID]: 4, [CHEAT_GREED_ID]: 3, [CHEAT_TRANSFER_ID]: 3,
};
for (const { id, description, sourceCell } of RAW_BIG_CARD_CATALOG.find((card) => card.id === CHEAT_CARD_ID)?.abilities ?? []) {
  const usesPerGame = cheatQuotas[id];
  const active = usesPerGame !== undefined || id === CHEAT_VICTORY_ID;
  const cost = id === CHEAT_VICTORY_ID ? 20 : 0;
  BIG_CARD_SKILLS[id] = { id, name: description.replace(/^限定技[。．,，]\s*/, "").split(/[：:]/)[0]!, description,
    sourceRow: Number(sourceCell.match(/\d+/)?.[0] ?? 67), fusion: "", implemented: true, category: "king_card",
    typeTags: [], tags: [], hooks: {}, exposureTiming: active ? "使用时" : "不暴露",
    timingPhases: id === CHEAT_ABSOLUTE_ID ? ["turn_change_action"] : active ? [...ASURA_ANYTIME_PHASES] : ["passive_check"],
    ...(active ? { play: { kind: "effect", cost, cakeCostKind: cost ? "fixed" : "none", maxStacks: 1, targetMode: "none",
      ...(usesPerGame !== undefined ? { usesPerGame } : {}) } } : {}) };
}
BIG_CARD_SKILLS[CHEAT_SHARP_DAMAGE_ID] = {
  ...BIG_CARD_SKILLS[CHEAT_SHARP_ID]!, id: CHEAT_SHARP_DAMAGE_ID, name: "Sharpandshiny·法伤",
  description: "消耗1次机会，对指定1人造成1点法术伤害。", typeTags: [],
  play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "single" }
};

for (const card of RAW_BIG_CARD_CATALOG) for (const ability of card.abilities) {
  const skill = BIG_CARD_SKILLS[ability.id];
  if (skill) skill.typeTags = [...new Set([...skill.typeTags, ...readSkillTypeTags(ability.description),
    ...(BIG_REVIVAL_SKILLS.has(ability.id) ? ["复活技" as const] : []),
    ...(skill.play?.usesPerGame ? ["限定技" as const] : [])])];
  if (skill && BIG_REVIVAL_SKILLS.has(ability.id)) skill.description = prefixRevivalDescription(skill.description);
}

const fallenSplendorNames = ["陨落天华·治愈术", "陨落天华·一度复生", "陨落天华·二度复生",
  "陨落天华·三度复生", "陨落天华·四度复生", "陨落天华·五度复生", "陨落天华·六度复生",
  "陨落天华·终式", "陨落天华·绝对伤害"] as const;
for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === FALLEN_SPLENDOR_CARD_ID)!.abilities) {
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: fallenSplendorNames[ability.order - 1]!, description: ability.description,
    fusion: "", category: "king_card", sourceRow: 4, implemented: true, exposureTiming: "不暴露", tags: [],
    typeTags: ability.id === FALLEN_SPLENDOR_IGNORE_DAMAGE ? ["锁定技"] : [],
    timingPhases: ["passive_check"], hooks: {} };
}
const fallenSplendorEffect = { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } as const;
BIG_CARD_SKILLS[FALLEN_SPLENDOR_CONVERT] = { ...BIG_CARD_SKILLS[FALLEN_SPLENDOR_HEALING]!, id: FALLEN_SPLENDOR_CONVERT,
  name: "陨落天华·转为离殇", description: "把本卡的1次剩余治愈术变为1次离殇。",
  timingPhases: [...ASURA_ANYTIME_PHASES, "revival_action"], play: fallenSplendorEffect };
BIG_CARD_SKILLS[FALLEN_SPLENDOR_DOUBLE] = { ...BIG_CARD_SKILLS[FALLEN_SPLENDOR_ELEMENTAL]!, id: FALLEN_SPLENDOR_DOUBLE,
  name: "陨落天华·可控攻击", description: "变招阶段，选择一份自己的攻击，使其攻击值×2。",
  typeTags: ["控制技"], timingPhases: ["turn_change_action"], play: fallenSplendorEffect };
BIG_CARD_SKILLS[FALLEN_SPLENDOR_EXECUTION] = { ...BIG_CARD_SKILLS[FALLEN_SPLENDOR_EXECUTION]!,
  timingPhases: ["turn_action"], play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "single",
    selectedTargetCount: 2, powerValue: combatValue(1, 3.9), level: 1, defenseTag: "unblockable",
    traits: ["pierce_rebound", "defeat_execute"] } };
BIG_CARD_SKILLS[FALLEN_SPLENDOR_RELEASE] = { ...BIG_CARD_SKILLS[FALLEN_SPLENDOR_EXECUTION]!, id: FALLEN_SPLENDOR_RELEASE,
  name: "陨落天华·立即释放", description: "消耗1次终式机会，使所选目标直接受到非伤害必杀。",
  timingPhases: ASURA_ANYTIME_PHASES, play: { ...fallenSplendorEffect, targetMode: "single", selectedTargetCount: 2 } };

const spaceTimePlays: Partial<Record<string, SkillDefinition["play"]>> = {
  [TIME_RIFT]: { kind: "effect", cost: 5, maxStacks: 1, targetMode: "single", nonAttackMove: true, power: 0,
    levelValue: INFINITY_VALUE, defenseTag: "youtiao", traits: ["pierce_rebound"] },
  [SPACE_BURST]: { kind: "attack", cost: 5, maxStacks: 1, targetMode: "single", powerValue: INFINITY_VALUE,
    levelValue: INFINITY_VALUE, defenseTag: "stone", traits: ["pierce_rebound"] },
  [TIME_CONFUSION]: { kind: "effect", cost: 4, maxStacks: 1, targetMode: "none" },
  [SPACE_SHATTER]: { kind: "effect", cost: 4, maxStacks: 1, targetMode: "none" }
};
const spaceTimeNames = { [SPACE_TIME_GUARD]: "时空守护", [TIME_RIFT]: "时间裂缝", [SPACE_BURST]: "空间爆破",
  [TIME_CONFUSION]: "时间大混乱", [SPACE_SHATTER]: "空间大破碎", [SPACE_TIME_CHAOS]: "混沌·时空守护" };
for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === SPACE_TIME_CARD)!.abilities) {
  const play = spaceTimePlays[ability.id];
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: spaceTimeNames[ability.id as keyof typeof spaceTimeNames]!,
    description: ability.description, fusion: "", category: "king_card", sourceRow: 69, implemented: true,
    tags: [], typeTags: ability.id === SPACE_TIME_GUARD ? ["锁定技"] : [], exposureTiming: play ? "使用时" : "不暴露",
    timingPhases: play ? ["turn_action"] : ["passive_check"], ...(play ? { play } : {}), hooks: {} };
}
const bubbleDreamNames: Record<string, string> = {
  [BUBBLE_FATE]: "泡影之梦·宿命", [BUBBLE_AVENGER]: "复仇者", [BUBBLE_WITCH]: "失却的魔女",
  [BUBBLE_DESTINY]: "宿命之地", [BUBBLE_FORGET]: "忘却补正", [BUBBLE_REBUILD]: "自我改造", [BUBBLE_FINALE]: "泡影之梦"
};
const bubbleEffect = { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } as const;
const bubbleDreamPlays: Partial<Record<string, Pick<SkillDefinition, "timingPhases" | "play">>> = {
  [BUBBLE_FORGET]: { timingPhases: ["turn_damage_modify"], play: bubbleEffect },
  [BUBBLE_REBUILD]: { timingPhases: ASURA_ANYTIME_PHASES, play: bubbleEffect },
  [BUBBLE_FINALE]: { timingPhases: ["turn_action"], play: { ...bubbleEffect, cost: 1, targetMode: "single",
    level: 0, power: 0, nonAttackMove: true, defenseTag: "rebound" } }
};
for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === BUBBLE_DREAM_CARD)!.abilities) {
  const active = bubbleDreamPlays[ability.id];
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: bubbleDreamNames[ability.id]!,
    description: ability.description,
    fusion: "", category: "king_card", sourceRow: 70, implemented: true, tags: [],
    typeTags: ability.id === BUBBLE_FATE || ability.id === BUBBLE_DESTINY ? ["锁定技"] : [],
    exposureTiming: active ? "使用时" : "触发时", hooks: {}, ...(active ?? { timingPhases: ["passive_check"] }),
    ...(ability.id === BUBBLE_FINALE ? { moveResolution: { mustResolve: true } } : {}) };
}
BIG_CARD_SKILLS[BUBBLE_ENHANCE] = { ...BIG_CARD_SKILLS[BUBBLE_REBUILD]!, id: BUBBLE_ENHANCE,
  name: "自我改造·强化出招", description: "消耗一次改造强化，使所选招式的攻击和等级按改造层数乘无限的幂，并赋予破弹。",
  typeTags: ["控制技"], timingPhases: ["turn_change_action"], play: bubbleEffect };

const redLotusPlays: Partial<Record<string, SkillDefinition["play"]>> = {
  [RED_LOTUS_RAIN]: { kind: "attack", cost: 2, maxStacks: 1, targetMode: "all", powerValue: INFINITY_VALUE,
    levelValue: INFINITY_VALUE, defenseTag: "stone", element: "fire", traits: ["pierce_rebound"] },
  [RED_LOTUS_LIFE]: { kind: "effect", cost: 4, maxStacks: 1, targetMode: "none" },
  [RED_LOTUS_NINE]: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" },
  [RED_LOTUS_FINALE]: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", usesPerGame: 1 }
};
const redLotusNames = { [RED_LOTUS_HEART]: "灼心之焰", [RED_LOTUS_RAIN]: "鎏光火雨", [RED_LOTUS_LIFE]: "冠世莲华",
  [RED_LOTUS_NINE]: "九天红焰", [RED_LOTUS_FINALE]: "红莲天火", [RED_LOTUS_KARMA]: "业火红莲" };
for (const ability of RAW_BIG_CARD_CATALOG.find(({ id }) => id === RED_LOTUS_CARD_ID)!.abilities) {
  const play = redLotusPlays[ability.id];
  BIG_CARD_SKILLS[ability.id] = { id: ability.id, name: redLotusNames[ability.id as keyof typeof redLotusNames],
    description: ability.description, category: "king_card", fusion: "", sourceRow: 71, implemented: true,
    typeTags: ability.id === RED_LOTUS_HEART ? ["锁定技"] : ability.id === RED_LOTUS_FINALE ? ["限定技"] : [],
    tags: ["火系技能"], attribute: "fire", exposureTiming: play ? "使用时" : "触发时",
    timingPhases: isRedLotusAnytimeSkill(ability.id) ? ASURA_ANYTIME_PHASES : play ? ["turn_action"] : ["passive_check"],
    ...(play ? { play } : {}), hooks: {} };
}

for (const { id, description } of RAW_BIG_CARD_CATALOG.find(({ id }) => id === ERA_CARD)!.abilities) {
  const field = isEraFieldId(id);
  const restart = id === ERA_RESTART;
  const playable = field || restart || id === ERA_EXTEND;
  BIG_CARD_SKILLS[id] = { id, description, category: "king_card", fusion: "", sourceRow: 72, implemented: true,
    name: field ? ERA_FIELD_NAMES[id] : restart ? "新纪元" : id === ERA_EXTEND ? "永恒纪元" : "永恒纪元·传承",
    typeTags: [], tags: [], exposureTiming: playable ? "使用时" : "触发时",
    timingPhases: restart ? ASURA_ANYTIME_PHASES : playable ? ["turn_action"] : ["passive_check"], hooks: {},
    ...(playable ? { play: { kind: "effect", targetMode: "none", maxStacks: 1,
      cost: restart ? 0 : id === ERA_EXTEND ? 13 : id === ERA_FIRE || id === ERA_DAMAGE ? 3 : 5 } } : {})
  };
}
BIG_CARD_SKILLS[ERA_CHOOSE_TARGETS] = { ...BIG_CARD_SKILLS[ERA_RESTART]!, id: ERA_CHOOSE_TARGETS,
  name: "神控纪元·改选目标", description: "变招阶段修改这份出招的目标。可以选择零个目标。", timingPhases: ["turn_change_action"] };

const fateEye = RAW_BIG_CARD_CATALOG.find(({ id }) => id === FATE_EYE_CARD_ID)!;
const fateEyeBase = { implemented: true, fusion: "", category: "king_card", sourceRow: 73,
  exposureTiming: "使用时", tags: [], typeTags: [], timingPhases: ["turn_action"], hooks: {} } satisfies Partial<SkillDefinition>;
BIG_CARD_SKILLS[FATE_EYE_GATHER] = { ...fateEyeBase, id: FATE_EYE_GATHER, name: "积累命元素",
  description: "无耗饼，获得1个命元素，不可叠加。",
  play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } };
BIG_CARD_SKILLS[FATE_EYE_STRIKE] = { ...fateEyeBase, id: FATE_EYE_STRIKE, name: "命",
  description: "每重消耗1命元素，单攻15，15级，任意防。使用时本回合有后盾，可叠加。",
  play: { kind: "attack", cost: 0, elementCost: { element: FATE_ELEMENT, perStack: 1 }, maxStacks: MAX_ACTION_STACKS,
    targetMode: "single", power: 15, level: 15, defenseTag: "any" } };
BIG_CARD_SKILLS[FATE_EYE_SWEEP] = { ...fateEyeBase, id: FATE_EYE_SWEEP, name: "命运天瞳断",
  description: fateEye.abilities[1]!.description,
  play: { kind: "attack", cost: 0, elementCost: { element: FATE_ELEMENT, perStack: 2 }, maxStacks: 1,
    targetMode: "all", power: 30, level: 30, defenseTag: "any" } };
BIG_CARD_SKILLS[FATE_EYE_WARD] = { ...fateEyeBase, id: FATE_EYE_WARD, name: "命运天瞳断·免疫",
  description: fateEye.abilities[2]!.description, timingPhases: ["passive_check"], exposureTiming: "触发时" };

const sanctuary = RAW_BIG_CARD_CATALOG.find(({ id }) => id === SANCTUARY_CARD_ID)!;
const sanctuaryBase = { ...fateEyeBase, sourceRow: sanctuary.sourceRow };
BIG_CARD_SKILLS[SANCTUARY_INHERIT_ID] = { ...sanctuaryBase, id: SANCTUARY_INHERIT_ID, name: "圣堂之门·传承",
  description: sanctuary.abilities[0]!.description, timingPhases: ["passive_check"], exposureTiming: "触发时" };
BIG_CARD_SKILLS[SANCTUARY_GATE_ID] = { ...sanctuaryBase, id: SANCTUARY_GATE_ID, name: "圣堂之门",
  description: sanctuary.abilities[1]!.description,
  play: { kind: "effect", nonAttackMove: true, cost: 2, maxStacks: 1, targetMode: "single", power: 0, level: 0, defenseTag: "stone" } };
BIG_CARD_SKILLS[SANCTUARY_WARD_ID] = { ...sanctuaryBase, id: SANCTUARY_WARD_ID, name: "璨灵圣光",
  description: sanctuary.abilities[2]!.description, play: { kind: "effect", cost: 4, maxStacks: 1, targetMode: "none" } };
BIG_CARD_SKILLS[SANCTUARY_AURA_ID] = { ...sanctuaryBase, id: SANCTUARY_AURA_ID, name: "圣光气",
  description: "限定技。整局限3次，不可后手使用。此回合绝对无敌，此轮攻击值×无限。",
  typeTags: ["限定技"],
  timingPhases: ["opening_action", "round_pre_interval_action", "round_before_action", "turn_before_action"],
  play: { kind: "effect", cost: 0, usesPerGame: 3, maxStacks: 1, targetMode: "none" } };
BIG_CARD_SKILLS[SANCTUARY_SWEEP_ID] = { ...sanctuaryBase, id: SANCTUARY_SWEEP_ID, name: "圣影流光破",
  description: sanctuary.abilities[4]!.description,
  play: { kind: "attack", cost: 6, maxStacks: 1, targetMode: "all", power: 10, levelValue: INFINITY_VALUE, defenseTag: "any" } };

const starMoon = RAW_BIG_CARD_CATALOG.find(({ id }) => id === STAR_MOON_CARD_ID)!;
const starMoonBase = { ...fateEyeBase, sourceRow: starMoon.sourceRow };
for (const [id, element] of [[STAR_MOON_GATHER_STAR, STAR_ELEMENT], [STAR_MOON_GATHER_MOON, MOON_ELEMENT]]) {
  BIG_CARD_SKILLS[id!] = { ...starMoonBase, id: id!, name: `积累${element}`,
    description: `1饼，获得1个${element}元素。`, play: { kind: "effect", cost: 1, maxStacks: 1, targetMode: "none" } };
}
BIG_CARD_SKILLS[STAR_MOON_INHERIT] = { ...starMoonBase, id: STAR_MOON_INHERIT, name: "星月狂舞·传承",
  description: starMoon.abilities[1]!.description, timingPhases: ["passive_check"], exposureTiming: "触发时" };
BIG_CARD_SKILLS[STAR_MOON_FREE_HUIYUE] = { ...starMoonBase, id: STAR_MOON_FREE_HUIYUE, name: "免费辉月",
  description: "消耗一次免费机会，使用判定等级 IV 的辉月，不进入常规冷却。",
  typeTags: ["控制技"], timingPhases: ["turn_change_action"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } };
BIG_CARD_SKILLS[STAR_MOON_GLEAM] = { ...starMoonBase, id: STAR_MOON_GLEAM, name: "不熄月莹",
  description: starMoon.abilities[2]!.description, timingPhases: ["turn_action", "turn_change_action"],
  play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none", elementCost: { element: MOON_ELEMENT, perStack: 2 } } };
BIG_CARD_SKILLS[STAR_MOON_BURST] = { ...starMoonBase, id: STAR_MOON_BURST, name: "璀璨星芒",
  description: starMoon.abilities[3]!.description,
  play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "all", elementCost: { element: STAR_ELEMENT, perStack: 2 },
    power: 5, level: 5, defenseTag: "stone", traits: ["pierce_rebound"] } };
BIG_CARD_SKILLS[STAR_MOON_RIVER] = { ...starMoonBase, id: STAR_MOON_RIVER, name: "月照星河",
  description: starMoon.abilities[4]!.description,
  play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "single", elementCost: { element: STAR_ELEMENT, perStack: 1 },
    additionalElementCost: { element: MOON_ELEMENT, perStack: 1 } } };
BIG_CARD_SKILLS[STAR_MOON_DANCE] = { ...starMoonBase, id: STAR_MOON_DANCE, name: "星月狂舞",
  description: starMoon.abilities[5]!.description,
  play: { kind: "attack", cost: 0, maxStacks: 1, targetMode: "all", elementCost: { element: STAR_ELEMENT, perStack: 2 },
    additionalElementCost: { element: MOON_ELEMENT, perStack: 2 }, powerValue: INFINITY_VALUE,
    levelValue: INFINITY_VALUE, defenseTag: "any", traits: ["pierce_rebound"] } };
BIG_CARD_SKILLS[STAR_MOON_CHOOSE_CARD] = { ...starMoonBase, id: STAR_MOON_CHOOSE_CARD, name: "星月狂舞·选择大卡",
  description: "从此次命中的目标持有的整张大卡中获得一张，持续至当轮轮末。",
  timingPhases: ["turn_damage_modify"], play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } };
BIG_CARD_SKILLS[STAR_MOON_PIERCE] = { ...starMoonBase, id: STAR_MOON_PIERCE, name: "星月狂舞·穿透",
  description: starMoon.abilities[6]!.description, typeTags: ["锁定技"], timingPhases: ["passive_check"], exposureTiming: "触发时" };

const yiyuan = RAW_BIG_CARD_CATALOG.find(({ id }) => id === YIYUAN_CARD)!;
for (const [ability, name] of ["一元·永恒", "一元·瞬移", "一元·天变", "一元·幻化", "一元·原神"].entries()) {
  const { id, description } = yiyuan.abilities[ability]!;
  BIG_CARD_SKILLS[id] = { ...fateEyeBase, id, name, description, sourceRow: yiyuan.sourceRow,
    timingPhases: id === YIYUAN_CHANGE ? ["turn_action", "turn_change_action"] : ["turn_action"],
    play: { kind: "effect", cost: id === YIYUAN_GOD ? 8 : 5, maxStacks: 1, targetMode: id === YIYUAN_MIMIC ? "single" : "none" } };
}
BIG_CARD_SKILLS[YIYUAN_REPEAT] = { ...fateEyeBase, id: YIYUAN_REPEAT, name: "一元·永恒·答复", sourceRow: yiyuan.sourceRow,
  description: "选择下回合是否复刻本回合出招。", timingPhases: ["turn_change_action"],
  play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } };
BIG_CARD_SKILLS[YIYUAN_RESTORE] = { ...fateEyeBase, id: YIYUAN_RESTORE, name: "解除幻化", sourceRow: yiyuan.sourceRow,
  description: "结束幻化并恢复幻化前的技能和使用次数。", timingPhases: ASURA_ANYTIME_PHASES,
  play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } };

const fiveElements = RAW_BIG_CARD_CATALOG.find(({ id }) => id === FIVE_ELEMENTS_CARD)!;
for (const [index, name] of ["选择五行形态", "五行·火", "五行·冰", "五行·电", "五行·土", "五行·风", "五行·复归"].entries()) {
  const { id, description } = fiveElements.abilities[index]!;
  BIG_CARD_SKILLS[id] = { ...fateEyeBase, id, name, sourceRow: fiveElements.sourceRow,
    description: id === FIVE_ELEMENTS_ICE ? description.replace("非冰系", "非火系") :
      id === FIVE_ELEMENTS_FIRE ? description.replace("炽焱", "炽焰") : description,
    timingPhases: id === FIVE_ELEMENTS_CHOOSE ? ["opening_action", "round_before_action"] : ["passive_check"],
    ...(id === FIVE_ELEMENTS_CHOOSE ? { play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } } : {}) };
}
BIG_CARD_SKILLS[FIVE_ELEMENTS_LEVEL] = { ...fateEyeBase, id: FIVE_ELEMENTS_LEVEL, name: "五行·调整攻击等级",
  sourceRow: fiveElements.sourceRow, description: "变招阶段选一份自己的攻击，将等级加、减、乘或除以无限。每份攻击限调整一次。",
  typeTags: ["控制技"], timingPhases: ["turn_change_action"],
  play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } };

const hexagram = RAW_BIG_CARD_CATALOG.find(({ id }) => id === HEXAGRAM_CARD)!;
const hexagramEffect = { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" } as const;
for (const [index, name] of ["选择六芒形态", "禁魂", "禁死", "禁灵", "禁术", "禁绝", "禁锢", "六芒魔咒·无视", "六芒星阵"].entries()) {
  const { id, description } = hexagram.abilities[index]!;
  const timingPhases: SkillDefinition["timingPhases"] = id === HEXAGRAM_CHOOSE ? ["opening_action", "round_before_action"] :
    id === HEXAGRAM_SPIRIT ? ASURA_ANYTIME_PHASES : id === HEXAGRAM_ABSOLUTE ? ["turn_change_action"] : ["passive_check"];
  BIG_CARD_SKILLS[id] = { ...fateEyeBase, id, name, sourceRow: hexagram.sourceRow, description,
    typeTags: readSkillTypeTags(description), timingPhases,
    ...(timingPhases.includes("passive_check") ? {} : { play: hexagramEffect }) };
}
BIG_CARD_SKILLS[HEXAGRAM_RESTORE] = { ...fateEyeBase, id: HEXAGRAM_RESTORE, name: "六芒魔咒·恢复形态",
  sourceRow: hexagram.sourceRow, description: "消耗一次恢复机会，恢复一种已失去的形态。",
  timingPhases: ["turn_change_action"], play: hexagramEffect };

const sevenStar = RAW_BIG_CARD_CATALOG.find(({ id }) => id === SEVEN_STAR_CARD)!;
for (const [index, name] of ["选择七星形态", "天枢", "天璇", "天玑", "天权", "玉衡", "开阳", "摇光", "七星连珠·无视", "七星连珠·传承"].entries()) {
  const { id, description } = sevenStar.abilities[index]!;
  const play: SkillPlayDefinition | undefined =
    id === SEVEN_STAR_CHOOSE ? hexagramEffect :
    id === SEVEN_STAR_YUHENG ? { ...hexagramEffect, targetMode: "single" } :
    id === SEVEN_STAR_TIANQUAN ? { ...hexagramEffect, cost: 3, targetMode: "single" } :
    id === SEVEN_STAR_YAOGUANG ? { ...hexagramEffect, cost: 10 } : undefined;
  const timingPhases: SkillDefinition["timingPhases"] = id === SEVEN_STAR_CHOOSE ? ["opening_action", "round_before_action"] :
    id === SEVEN_STAR_YUHENG ? ["revival_action"] : play ? ["turn_action"] : ["passive_check"];
  BIG_CARD_SKILLS[id] = { ...fateEyeBase, id, name, sourceRow: sevenStar.sourceRow, description,
    typeTags: readSkillTypeTags(description), timingPhases, ...(play ? { play } : {}) };
}

const tianSha = RAW_BIG_CARD_CATALOG.find(({ id }) => id === TIAN_SHA_CARD)!;
for (const { id, description } of tianSha.abilities) {
  const name = description.split("：", 1)[0]!;
  const play: SkillPlayDefinition | undefined =
    id === TIAN_SHA_STAR_BREAK ? { ...hexagramEffect, usesPerGame: 1 } :
    id === TIAN_SHA_VERDICT ? { kind: "attack", cost: 0, maxStacks: 1, targetMode: "single", defenseTag: "stone",
      powerValue: [{ coefficient: 1, exponent: 2 }], levelValue: [{ coefficient: 1, exponent: 3.8 }], traits: ["pierce_rebound"] } :
    id === TIAN_SHA_FINALE ? { ...hexagramEffect, cost: 1, targetMode: "single", nonAttackMove: true, defenseTag: "cake",
      power: 0, level: 0, traits: ["pierce_rebound"] } : undefined;
  BIG_CARD_SKILLS[id] = { ...fateEyeBase, id, name, sourceRow: tianSha.sourceRow, description,
    typeTags: id === TIAN_SHA_STAR_BREAK ? ["限定技"] : readSkillTypeTags(description),
    timingPhases: id === TIAN_SHA_STAR_BREAK ? ASURA_ANYTIME_PHASES : play ? ["turn_action"] : ["passive_check"],
    ...(play ? { play } : {}) };
}

const nineTribulations = RAW_BIG_CARD_CATALOG.find(({ id }) => id === NINE_TRIBULATIONS_CARD)!;
for (const { id, description } of nineTribulations.abilities) {
  const name = description.replace(/^复活技。/, "").split("：", 1)[0]!;
  const play = id === NINE_COLD ? { ...hexagramEffect } : undefined;
  BIG_CARD_SKILLS[id] = { ...fateEyeBase, id, name, sourceRow: nineTribulations.sourceRow, description,
    typeTags: readSkillTypeTags(description), timingPhases: play ? ["turn_change_action"] : ["passive_check"], ...(play ? { play } : {}) };
}
