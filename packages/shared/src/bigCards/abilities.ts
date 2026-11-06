import type { PlayerState } from "../types";
import type { SkillDefinition } from "../skills/types";
import { INFINITY_VALUE } from "../engine/combatValues";

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
export const SUNSHINE_SKILL_ID = "skill_43_74082";
export const ETERNAL_NIGHT_SKILL_ID = "skill_44_20092";
export const RI_SKILL_ID = "skill_82_45540";
export const DAWN_FUSION_ID = "4034";
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
export const SELF_DESTRUCTER_DEATH_SKILL_ID = "skill_102_5546";
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
export const FOUR_EMPTINESS_ID = "4007";
export const SLOT_MACHINE_ID = "3013";
export const MORE_TRIES_ID = "4008";
export const HEALING_ART_ID = "skill_64_60978";
export const KUIJI_SKILL_GRANTS = [
  { name: "封印", skillId: "skill_5_34881" }, { name: "治愈术", skillId: HEALING_ART_ID },
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
    play: { kind: "attack" as const, cost: 4, maxStacks: 1, targetMode: "single" as const, power: 4, level: 10,
      damageParts: [4, 3, 2], defenseTag: "youtiao" as const, element: "fire" as const } },
  { id: LAVA_ARMOR_ID, name: "熔岩天甲", description: "2饼，本回合获得无法破除的技能反弹，反弹不超过无限的攻击回发出者；自身+4防御值，可指定至多2名玩家本轮无法减伤或回避伤害。绝弹、散弹不改变技能反弹。",
    play: { kind: "effect" as const, cost: 2, maxStacks: 1, targetMode: "none" as const, optionalTargetCount: 2 } },
  { id: FENSHI_FLAMES_ID, name: "焚世烈焰", description: "5饼，获得独立存在的3轮良好状态。有效期内，你在本次伤害判定批次的火伤参与致死时，赋予目标一份焚烬，成功复活后随机烧去一张大卡，再移除该份焚烬。",
    play: { kind: "effect" as const, cost: 5, maxStacks: 1, targetMode: "none" as const } },
  { id: FENTIAN_INHERIT_ID, name: "焚天君燚·继承", description: "获得天火之狱和炽焰，并无视消除火系类技能。" }
].map((entry) => [entry.id, { ...entry, implemented: true, fusion: "", attribute: "fire", category: "king_card", sourceRow: 3,
  exposureTiming: "使用时", tags: ["火系技能"], typeTags: [], timingPhases: entry.id === FENTIAN_INHERIT_ID ? ["passive_check"] : ["turn_action"], hooks: {} } as SkillDefinition]));

const jihanAbilities: Array<Pick<SkillDefinition, "id" | "name" | "description" | "play">> = [
  { id: JIHAN_INHERIT_ID, name: "极寒之拥·继承",
    description: "获得大雪球、极寒风暴和极寒。出招反弹后的攻击实际造成多少伤害，你的技能判定就视为你造成了多少伤害。" },
  { id: JIHAN_COUNTER_ID, name: "极寒之拥·冰伤反击",
    description: "被攻击命中时，对其他玩家造成1点起的冰系法伤。该法伤无视伤害免疫及只针对伤害的无视。" },
  { id: JIHAN_DAMAGE_GROWTH_ID, name: "极寒之拥·冰伤积累",
    description: "每造成X点伤害，第二条的冰系法伤增加X。该法伤超过100点时变为无限。" },
  { id: JIHAN_FREEZE_ID, name: "极寒之拥·冰封反制", description: "攻击被出招防住时，冰封该攻击的所有目标2回合起。" },
  { id: JIHAN_FREEZE_GROWTH_ID, name: "极寒之拥·冰封积累",
    description: "每用基础防御防住一次攻击，冰封增加2回合。超过20回合时变为无限。" },
  { id: POLAR_GALAXY_ID, name: "极地银河", description: "2饼，群攻4，8级，石头防。每有一名攻击目标没出石头，自身加10血。",
    play: { kind: "attack", cost: 2, maxStacks: 1, targetMode: "all", power: 4, level: 8, defenseTag: "stone" } },
  { id: JIHAN_SEAL_ID, name: "极寒之拥·封锁", description: "主出招阶段，非攻击招式命中或防住非攻击招式时，封锁对方技能1回合起。" },
  { id: JIHAN_SEAL_GROWTH_ID, name: "极寒之拥·封锁积累",
    description: "每次符合封锁条件，后续封锁增加1回合。超过10回合时变为无限。" },
  { id: JIHAN_ULTIMATE_ID, name: "极寒之拥", description: "8饼，对其他玩家造成无限冰系法伤、冰封3轮并封锁技能2轮。",
    play: { kind: "effect", cost: 8, maxStacks: 1, targetMode: "all" } }
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
  { id: HUNYAO_AREA_ID, name: "魂耀九州·群攻", description: "无视群攻攻击；其他玩家原本指向你的攻击变为群攻；你的群攻攻击等级×3。" },
  { id: HUNYAO_LIGHT_ID, name: "魂耀九州·光耀", description: "获得阳光普照与破晓，无视阳光普照与永远之夜。日改为每重4级的群攻，可享受群攻增幅。破晓按本局实际出日逐重计数，第1重攻4，之后每重加1攻。" },
  { id: CHASE_LIGHT_ID, name: "追光者", description: "1饼。常规复活结束后，可尝试复活一名死者。成功率70%，另有50%概率绕过三魂的限制。",
    play: { kind: "effect", cost: 1, maxStacks: 1, targetMode: "single" } },
  { id: CHASE_SHADOW_ID, name: "追影者", description: "2饼。50%概率使一名退游者进入游戏，另有40%概率绕过场上技能的限制。",
    play: { kind: "effect", cost: 2, maxStacks: 1, targetMode: "single" } },
  { id: CHASE_SOUL_ID, name: "追魂者", description: "3饼。30%概率使一名死亡、退游或消失的玩家回来；在回合前或变招阶段，另有30%概率对所有其他目标发出必杀级的杀。",
    play: { kind: "effect", cost: 3, maxStacks: 1, targetMode: "single" } },
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
    play: { kind: "effect", cost: 2, maxStacks: 1, targetMode: "none" }, timingPhases: ["turn_action"], typeTags: [] },
  { id: JUNENG_INHERIT_ID, name: "聚能湮灭炮·继承", description: "获得毁灭之盾、末世和自爆者死。全力一击的等级变为0。", timingPhases: ["passive_check"], typeTags: [] },
  { id: JUNENG_SHIELD_ID, name: "聚能盾", description: "消耗X聚，增加10X防御值。本回合防御攻≤10X、反弹攻≤3X。",
    play: { kind: "effect", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 1 }, maxStacks: Number.MAX_SAFE_INTEGER, targetMode: "none" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: ELECTROMAGNETIC_CANNON_ID, name: "电磁炮", description: "2聚，对其他玩家造成20点法伤，本回合技能反弹攻≤∞。",
    play: { kind: "effect", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 2 }, maxStacks: 1, targetMode: "all" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: STORE_DAMAGE_ID, name: "储存伤害", description: "1聚，免疫并储存一份不超过退游的伤害，释放时伤害×3。退游伤害保持原值。",
    play: { kind: "effect", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 1 }, maxStacks: 1, targetMode: "none" },
    timingPhases: ["turn_damage_modify"], typeTags: ["控制技"] },
  { id: RELEASE_DAMAGE_ID, name: "释放伤害", description: "选择一份储存的伤害，对指定玩家释放，保留原伤害类别与属性，穿透伤害反弹。",
    play: { kind: "effect", cost: 0, cakeCostKind: "none", maxStacks: 1, targetMode: "single" },
    timingPhases: ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_action", "turn_change_action",
      "turn_damage_modify", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"], typeTags: ["控制技"] },
  { id: JUNENG_RESPONSE_ID, name: "聚能湮灭炮·电系响应",
    description: "被电系攻击命中并实际受伤后，下一轮此卡停用，再后两轮使此卡已确认的有利数值乘2、不利数值除以2并向上取整。",
    timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: JUSHEN_ID, name: "聚神", description: "7聚，先制重开。直到本轮后第2轮轮末，所有人只能选择指定玩家为目标。",
    play: { kind: "effect", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 7 }, maxStacks: 1, targetMode: "single" },
    timingPhases: ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_change_action",
      "turn_damage_modify", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"], typeTags: [] },
  { id: ANNIHILATION_CANNON_ID, name: "聚能湮灭炮", description: "14聚，群攻∞、∞级，无视命数与复活。发炮回合起连续出石头、饼、反弹才能防住。可指定一人立即退游，25%变为必杀。",
    play: { kind: "attack", cost: 0, elementCost: { element: JUNENG_ELEMENT, perStack: 14 }, maxStacks: 1, targetMode: "all",
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
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" },
    timingPhases: ["round_pre_interval_action"], typeTags: ["锁定技"] },
  { id: SELF_ISOLATION_ID, name: "自我封闭", description: "3饼，先制重开，进入独立小空间直到主空间下一轮轮末。小空间内出饼×3。",
    play: { kind: "effect", cost: 3, maxStacks: 1, targetMode: "none" },
    timingPhases: ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_change_action",
      "turn_damage_modify", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"], typeTags: [] },
  { id: SPIRIT_GUIDANCE_ID, name: "灵媒指引", description: "3饼，群攻5、5级，小防防。可选一人取消其主出招，保留消耗。每造成5点伤害加3防御，每加3防御回血2，每实收6点回血增加此卡授予的治愈术1次。",
    play: { kind: "attack", cost: 3, maxStacks: 1, targetMode: "all", optionalTargetCount: 1, power: 5, level: 5, defenseTag: "small" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: KUIJI_ULTIMATE_ID, name: "窥觊苍生", description: "14饼，群攻∞、0级，无法防，破弹。伤害参与致死后永久失去此招式，获得永久良好状态：出饼×3。",
    play: { kind: "attack", cost: 14, maxStacks: 1, targetMode: "all", powerValue: INFINITY_VALUE, level: 0,
      defenseTag: "unblockable", traits: ["pierce_rebound"] }, timingPhases: ["turn_action"], typeTags: [] }
];
for (const entry of kuijiAbilities) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 7,
    exposureTiming: "使用时", tags: [], hooks: {} };
}

const starDragonAbilities: Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases" | "typeTags">> = [
  { id: GATHER_STAR_ID, name: "星", description: "2饼，获得1个星元素，本回合无敌。对每名攻击者随机吸取一个判定等级不超过无上的大卡子技能。",
    play: { kind: "effect", cost: 2, maxStacks: 1, targetMode: "none" }, timingPhases: ["turn_action"], typeTags: [] },
  { id: STAR_RESONANCE_ID, name: "异星共振", description: "1星，加10防御值。其他玩家防御值合计至少30时，清空他们的防御值，自己额外加20防御值。",
    play: { kind: "effect", cost: 0, elementCost: { element: STAR_ELEMENT, perStack: 1 }, maxStacks: 1, targetMode: "none" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: STAR_RESIST_ID, name: "异星共振·抵御", description: "变伤阶段消耗全部防御值，抵御一份不超过无限的伤害或一次退游。",
    play: { kind: "effect", cost: 0, maxStacks: 1, targetMode: "none" }, timingPhases: ["turn_damage_modify"], typeTags: [] },
  { id: STAR_STRIKE_ID, name: "毁灭星辰击", description: "2星，群攻10、无限级，石头防。使原本攻击你的玩家的群攻技能攻击失效5轮，并在3轮内无视来自其的不良。",
    play: { kind: "attack", cost: 0, elementCost: { element: STAR_ELEMENT, perStack: 2 }, maxStacks: 1, targetMode: "all", power: 10,
      levelValue: INFINITY_VALUE, defenseTag: "stone" }, timingPhases: ["turn_action"], typeTags: [] },
  { id: STAR_INHERIT_ID, name: "异星共振·继承", description: "获得逆转星移和外星人。此卡发放的逆转星移有两次逆转，斗转星移转出的数值乘无限。",
    timingPhases: ["passive_check"], typeTags: ["锁定技"] },
  { id: DRAGON_DISAPPEAR_ID, name: "龙卷残云", description: "本局限用2次。使其他血量不超过2的在场玩家直接消失，获得其全部大卡的初始化副本。",
    play: { kind: "effect", cost: 0, usesPerGame: 2, maxStacks: 1, targetMode: "none" },
    timingPhases: ["round_pre_interval_action", "round_before_action", "turn_before_action", "turn_change_action", "turn_end_action", "turn_after_interval_action", "round_after_interval_action"], typeTags: ["限定技"] },
  { id: DRAGON_INHERIT_ID, name: "龙卷残云·继承", description: "获得两份烽火赤壁和两份雷电法术。",
    timingPhases: ["passive_check"], typeTags: [] },
  { id: DRAGON_DANCE_ID, name: "狂龙之舞", description: "2饼。命中判定点若场上有人持有0饼，自己加4饼和3防御值，本回合绝对无敌，并无视其他玩家对自己的主动技能效果。",
    play: { kind: "effect", cost: 2, maxStacks: 1, targetMode: "none" }, timingPhases: ["turn_action"], typeTags: [] },
  { id: DRAGON_BLOOD_FIELD_ID, name: "鲜血金龙领域", description: "5饼，按出招时全场总血量选择分支。至多60时群攻60减总血量，油条防。超过60至100时回复总血量减60。超过100时单攻总血量减95，石头防。攻击等级等于攻击值。",
    play: { kind: "attack", cost: 5, maxStacks: 1, targetMode: "none", optionalTargetCount: 1, power: 0, level: 0 },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: DRAGON_HEIR_ID, name: "龙子诞辰诀", description: "7饼，预选一名目标。本回合绝对无敌。若有人出招以你为目标，加一条半血命；否则加一条0血命，并对预选目标攻无限、0级，反弹防。",
    play: { kind: "attack", cost: 7, maxStacks: 1, targetMode: "single", powerValue: INFINITY_VALUE, level: 0, defenseTag: "rebound" },
    timingPhases: ["turn_action"], typeTags: [] },
  { id: DRAGON_DOMINION_ID, name: "霸龙", description: "14饼，吸取其他玩家的全部大卡5轮。加一次龙卷残云机会，3轮后强化烽火赤壁。本轮绝对无敌并无视不良。",
    play: { kind: "effect", cost: 14, maxStacks: 1, targetMode: "all" }, timingPhases: ["turn_action"], typeTags: [] }
];
for (const entry of starDragonAbilities) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: entry.id.startsWith(STAR_CARD_ID) ? 8 : 9,
    exposureTiming: "使用时", tags: [], hooks: {} };
}

export function getOwnedBigAbilityIds(player: { bigCards?: PlayerState["bigCards"] }, activeOnly = false): string[] {
  return (player.bigCards ?? []).flatMap((card) => Object.keys(BIG_CARD_SKILLS)
    .filter((id) => (!activeOnly || !card.junengDisabled) && bigCardHasAbility(card, id)));
}

for (const entry of [
  { id: VERDICT_ACTION_ID, name: "御秽裁决", description: "3饼，与一名玩家进行石头剪刀布，平局重试。胜利获得暗影盾机会并吸取其他玩家生命，失败使旁观玩家技能失效。回合末重开。",
    play: { kind: "effect", cost: 3, maxStacks: 1, targetMode: "single" }, timingPhases: ["turn_action"] },
  { id: VERDICT_GUARD_ID, name: "御秽", description: "无视普通攻击的外加效果。对方在伤害判定前主动用技时，免疫该来源本次及后续三次对你的出招。", timingPhases: ["passive_check"] },
  { id: VERDICT_REWARD_ID, name: "御秽裁决·胜负", description: "累计四胜或四败各有奖励；四连胜直接胜利，四连败失去此卡并选择消除小技能。", timingPhases: ["passive_check"] },
  { id: VERDICT_INHERIT_ID, name: "御秽裁决·继承", description: "获得沙皇和制裁之刃。此卡发放的沙皇不会因重复技能而失败。", timingPhases: ["passive_check"] },
  { id: VERDICT_SAND_ID, name: "御秽裁决·沙子", description: "别人主动与你进行一局点时，获得一个沙子。", timingPhases: ["passive_check"] }
] satisfies Array<Pick<SkillDefinition, "id" | "name" | "description" | "play" | "timingPhases">>) {
  BIG_CARD_SKILLS[entry.id] = { ...entry, implemented: true, fusion: "", category: "king_card", sourceRow: 10,
    exposureTiming: "使用时", tags: [], typeTags: [], hooks: {} };
}

export function bigCardHasAbility(card: NonNullable<PlayerState["bigCards"]>[number], skillId: string): boolean {
  const baseId = skillId.split("_")[0]!;
  return baseId.startsWith(card.cardId) && (!card.onlyAbilityId || card.onlyAbilityId === baseId) &&
    !card.lostAbilityIds?.includes(baseId) && !card.lostAbilityIds?.includes(skillId);
}

export function bigCardHasAbilityUses(card: NonNullable<PlayerState["bigCards"]>[number], skillId: string): boolean {
  const limit = BIG_CARD_SKILLS[skillId]?.play?.usesPerGame;
  return limit === undefined || (card.abilityUses?.[skillId] ?? 0) < limit + (card.abilityUseBonuses?.[skillId] ?? 0);
}
