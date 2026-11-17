import { ERA_INHERIT } from "./eraIds";
import type { BuffState, DamageEvent, GameState, PlayerId, PlayerState, SkillAction, SkillId, SystemEvent } from "../types";
import { isBigSkillMode } from "../modes";
import { FENTIAN_INHERIT_ID, FENTIAN_FUSION_GRANTS, FENSHI_FLAMES_ID, HUNYAO_CARD_ID, HUNYAO_SKILL_GRANTS,
  JIHAN_INHERIT_ID, JIHAN_SKILL_GRANTS, JUNENG_INHERIT_ID, SELF_DESTRUCTER_DEATH_SKILL_ID, HUNYAO_LIGHT_ID,
  KUIJI_CARD_ID, KUIJI_INHERIT_ID, KUIJI_SKILL_GRANTS, KUISHI_ID, KUIJI_ULTIMATE_ID, STAR_INHERIT_ID, DRAGON_INHERIT_ID,
  DRAGON_DISAPPEAR_ID, VERDICT_INHERIT_ID, QIANQIU_INHERIT_ID, YONGYAO_INHERIT_ID, SKY_THUNDER_FUSION_ID, TIANLIE_INHERIT_ID,
  WUJIN_INHERIT_ID, WUJIN_REBOUND_ID,
  JUEYING_RETIRE_ID, JUEYING_INHERIT_ID, ETERNAL_NIGHT_SKILL_ID,
  CHAOFAN_TREASURE_ID, CHAOFAN_JUDGMENT_ID, XIELING_INHERIT_ID, KURONG_INHERIT_ID,
  bigCardAbilityCanActivate, bigCardHasAbility, bigCardHasAbilityUses } from "../bigCards/abilities";
import type { BigCardInstance } from "../bigCards/types";
import { BUBBLE_ENHANCE, BUBBLE_REBUILD } from "./bubbleDreamIds";
import { bubbleDreamEnhancement } from "./bubbleDream";
import { getBigCard } from "../bigCards/catalog";
import { createBaseEvent, createId, findPlayer, isPlayerSkillDisabled, queueZhuRiOpeningChoices } from "./gameFactory";
import { CORRUPTION_DOMAIN_ID } from "./corruptionIds";
import { DEMON_CARD_ID } from "./demonIds";
import { SHADOW_GRANTS_ID } from "./shadowIds";
import { refreshYoukaiHalf } from "./youkai";
import { CRYSTAL_INHERIT_ID } from "./divineCrystalIds";
import { STAR_WHEEL_INHERIT } from "./starWheelIds";
import { grantInitializedSkill } from "./skillAcquisition";
import { HONGHUANG_INHERIT_ID, SACRED_BEAST_ID, LINGTA_INHERIT_ID } from "../bigCards/abilities";
import { activeBeastGrants, adjustBeastUseLedger } from "./honghuang";
import { getFusionSkillId, getOwnedSkillIds, isFusionPreparation, reconcileSkillFusions } from "../skills/fusion";
import { ensureSkillInventory, nextSkillAcquisitionOrder, removeSkillInstanceAt } from "./skillInventory";
import { applyNegativeStatus } from "./negativeStatuses";
import { negativeStatusesHaveNoEffect, removeStateCategory } from "./effectCategories";
import { swordArrayNoCakeSuppressesPassive } from "./swordArrayControl";
import { changeCakes } from "./cakeResources";
import { getSkillDamageSourceIds } from "./damageAttribution";
import { THORN_INHERIT_ID } from "./thornDanceIds";
import { VACUUM_INHERIT_ID, VACUUM_STATE, VACUUM_STATE_ID } from "./vacuumIds";
import { refreshVacuum } from "./vacuum";
import { tianlieTemporaryUses } from "./tianlie";
import { FREE_ABILITY_SOURCE_PREFIX, freeAbilitySourceId } from "./wujin";
import { addSpareLife, grantKaigeLives, hasKaigeAbility, kaigeGrantSource, kaigeGrantSources, removeKaigeGrants } from "./kaige";
import { KAIGE_CARD_ID, KAIGE_ETERNAL_ID, KAIGE_KNOWLEDGE_ID, KAIGE_LIVES_ID } from "../bigCards/abilities";
import { CHAOS_INHERIT_ID, TIANMANG_CONVERSION_ID, WIND_INHERIT_ID } from "../bigCards/abilities";
import { SAND_INHERIT_ID } from "../bigCards/abilities";
import { ASURA_INHERIT_ID, BLOOD_RITUAL_FUSION_ID } from "../bigCards/abilities";
import { SOUL_INHERIT_ID } from "../bigCards/abilities";
import { ABYSS_INHERIT_ID } from "../bigCards/abilities";
import { addSiphonStatus } from "./siphon";
import { clearDefenseValue } from "./sand";
import { PURPLE_FORESIGHT_ID, PURPLE_GUESS_ID } from "../bigCards/abilities";
import { PURPLE_GAINED, PURPLE_LOST } from "./purpleEye";
import { clampSakuraCapacity } from "./elementResources";
import { CHARITY_GRANT_ID, EMPTY_CITY_GUARD_ID, EMPTY_CITY_ILLUSION_ID, HEALING_ART_ID, TALISMAN_CONCERTO_ID } from "../bigCards/abilities";
import { changeCurtainVeils, curtainEncoreReady, curtainVeilCount } from "./curtain";
import { CURTAIN_ENCORE_ID, CURTAIN_REBIRTH_ID, CURTAIN_VEIL_ID } from "./curtainIds";
import { SWARM_INHERIT_ID, VETERAN_FUSION_ID } from "./swarmIds";
import { enterEmptyCityProjection } from "./illusionRules";
import { BEAST_HUNT_ID, PIG_ID } from "./beastTraits";
import { LONE_STAR_FUSION_ID, LONE_STAR_PASSIVE_ID } from "./loneStarIds";
import { getPlayerHpValue, setPlayerHpValue } from "./infiniteValues";
import { compareCombatValues, scaleCombatValue } from "./combatValues";
import { getActiveSkillCount } from "./gameFactory";
import { changeBloodQi } from "./asura";
import { TIGER_CARD, TIGER_GRANTS, tigerForms } from "./netherTigerIds";
import { FIVE_ELEMENTS_CARD, FIVE_ELEMENTS_FORMS, FIVE_ELEMENTS_KEYS, fiveElementsForms } from "./fiveElementsIds";
import { HEXAGRAM_ARRAY, HEXAGRAM_CARD, HEXAGRAM_SOUL, hexagramForms } from "./hexagramIds";
import { SEVEN_STAR_CARD, SEVEN_STAR_INHERIT, SEVEN_STAR_TIANJI, sevenStarForms } from "./sevenStarIds";
import { TIAN_SHA_POWER, TIAN_SHA_SWORD } from "./tianShaIds";
import { syncTianShaGrants } from "./tianSha";
import { MOON_HUIYUE_ID } from "./moonIds";
import { BLADE_INHERIT_ID, BLADE_QINGGANG_ID } from "./brokenBladeIds";
import { ANNIHILATION_FUSION_ID, DECAY_INHERIT_ID } from "./decayIds";
import { SEA_GOD_INHERIT_ID } from "./seaGodIds";
import { KARMA_INHERIT_ID } from "./karmaCycleIds";
import { canGainStatus } from "./karmaSong";
import { FALLEN_SPLENDOR_CARD_ID, FALLEN_SPLENDOR_EXECUTION, FALLEN_SPLENDOR_EXECUTION_STATE, FALLEN_SPLENDOR_RELEASE } from "./fallenSplendorIds";
import { fallenSplendorExecutionStock } from "./fallenSplendor";
import { applyFallenSplendorUnlocks } from "./resolver";
import { HOLY_POTENTIAL_FUSION_ID, SANCTUARY_INHERIT_ID } from "./sanctuaryIds";
import { STAR_MOON_INHERIT, STAR_MOON_TEMPORARY_CARD, SUN_MOON_STARS_FUSION } from "./starMoonIds";
import { restoreYiyuanSkills } from "./yiyuan";
import { YIYUAN_MIMIC_STATE } from "./yiyuanIds";

export function initializeBigCardRules(state: GameState, opening = false): void {
  syncTianShaGrants(state);
  if (!isBigSkillMode(state.config.skillMode)) return;
  for (const player of state.players) {
    ensureSkillInventory(player);
    for (const card of player.bigCards ?? []) {
      if (card.initialized) continue;
      card.acquisitionOrder ??= nextSkillAcquisitionOrder(player);
      if (card.cardId === DEMON_CARD_ID) card.demonGrantStartTurn ??= state.turnNumber;
      card.initialized = true;
      if (card.cardId === FALLEN_SPLENDOR_CARD_ID) applyFallenSplendorUnlocks(state, player, card);
      if (bigCardHasAbility(card, PIG_ID)) {
        const lostHp = getPlayerHpValue(player);
        player.spareLives = [];
        player.entityClasses = ["animal"];
        delete player.kaigeLife;
        delete player.soulLife;
        delete player.effects;
        delete player.emptyCityBody;
        delete player.emptyCityBodySpaceId;
        player.buffs = [];
        player.bars = [];
        delete player.storedDamages;
        delete player.eternalMoves;
        setPlayerHpValue(player, []);
        if (compareCombatValues(lostHp, []) > 0) {
          if (!player.spaceId) state.turnHealthChanged = true;
          for (const observer of state.players) if (observer.status === "alive" && observer.spaceId === player.spaceId) {
            const copies = getActiveSkillCount(observer, "1052602");
            if (copies) changeBloodQi(observer, scaleCombatValue(lostHp, copies));
          }
        }
      }
      if (!player.emptyCityRecovery && bigCardHasAbility(card, EMPTY_CITY_ILLUSION_ID)) enterEmptyCityProjection(player);
      if (bigCardHasAbility(card, PURPLE_FORESIGHT_ID)) card.purpleForesightFirstRound = state.roundNumber;
      const grant = (abilityId: SkillId, skillId: SkillId, reason: string, witherWidth = 1) => {
        const before = player.skillInventory!.length;
        const instanceId = grantInitializedSkill(state, player.id, skillId, reason, false, undefined, card.instanceId, witherWidth);
        const inventory = card.inheritedSkillInstances ??= {};
        (inventory[abilityId] ??= []).push(...player.skillInventory!.slice(before).map(({ instanceId }) => instanceId));
        return instanceId;
      };
      if (bigCardHasAbility(card, BLADE_INHERIT_ID)) grant(BLADE_INHERIT_ID, BLADE_QINGGANG_ID, "破损战刃获得青釭剑");
      if (bigCardHasAbility(card, ERA_INHERIT)) {
        grant(ERA_INHERIT, getFusionSkillId("永恒"), "永恒纪元获得永恒");
        grant(ERA_INHERIT, getFusionSkillId("逆转星移"), "永恒纪元获得逆转星移");
      }
      if (bigCardHasAbility(card, DECAY_INHERIT_ID)) grant(DECAY_INHERIT_ID, ANNIHILATION_FUSION_ID, "破败之道获得寂灭");
      if (card.cardId === TIGER_CARD) {
        if (!card.onlyAbilityId) tigerForms(card);
        for (const [abilityId, skillIds] of Object.entries(TIGER_GRANTS)) if (bigCardHasAbility(card, abilityId))
          for (const id of skillIds) grant(abilityId, id, "幽冥白虎·形态传承");
      }
      if (card.cardId === FIVE_ELEMENTS_CARD) {
        if (!card.onlyAbilityId) fiveElementsForms(card);
        for (const key of FIVE_ELEMENTS_KEYS) {
          const form = FIVE_ELEMENTS_FORMS[key];
          if (!bigCardHasAbility(card, form.ability)) continue;
          for (const name of form.fusions) {
            const fusionId = grant(form.ability, getFusionSkillId(name), `五行·${form.name}`);
            if (name === "炼狱使徒") {
              const fusion = player.skillFusions?.find(({ id }) => id === fusionId);
              if (fusion) fusion.judgmentRank = "VI";
            }
          }
        }
      }
      if (bigCardHasAbility(card, CHARITY_GRANT_ID)) grant(CHARITY_GRANT_ID, HEALING_ART_ID, "献身慈爱获得治愈术");
      if (bigCardHasAbility(card, TIAN_SHA_POWER)) grant(TIAN_SHA_POWER, getFusionSkillId("天煞孤星"), "天煞之力获得天煞孤星");
      if (bigCardHasAbility(card, TIAN_SHA_SWORD)) grant(TIAN_SHA_SWORD, "1052", "天煞神剑获得独裁");
      if (card.cardId === HEXAGRAM_CARD) {
        if (!card.onlyAbilityId) hexagramForms(card);
        if (bigCardHasAbility(card, HEXAGRAM_SOUL)) grant(HEXAGRAM_SOUL, getFusionSkillId("魔方"), "禁魂获得魔方");
        if (bigCardHasAbility(card, HEXAGRAM_ARRAY)) {
          const id = grant(HEXAGRAM_ARRAY, getFusionSkillId("六芒星阵"), "六芒魔咒获得六芒星阵");
          const fusion = player.skillFusions?.find((entry) => entry.id === id);
          if (fusion) fusion.judgmentRank = "VI";
        }
      }
      if (card.cardId === SEVEN_STAR_CARD) {
        if (!card.onlyAbilityId) sevenStarForms(card);
        if (bigCardHasAbility(card, SEVEN_STAR_TIANJI)) grant(SEVEN_STAR_TIANJI, getFusionSkillId("断绝"), "天玑获得断绝");
        if (bigCardHasAbility(card, SEVEN_STAR_INHERIT)) for (const name of ["日月星辰", "星怒"])
          grant(SEVEN_STAR_INHERIT, getFusionSkillId(name), "七星连珠·传承");
      }
      if (bigCardHasAbility(card, STAR_MOON_INHERIT))
        grant(STAR_MOON_INHERIT, SUN_MOON_STARS_FUSION, "星月狂舞获得日月星辰");
      if (bigCardHasAbility(card, SANCTUARY_INHERIT_ID))
        for (const id of [getFusionSkillId("圣灵觉醒"), HOLY_POTENTIAL_FUSION_ID])
          grant(SANCTUARY_INHERIT_ID, id, "圣堂之门·传承");
      if (bigCardHasAbility(card, MOON_HUIYUE_ID))
        for (let copy = 0; copy < 2; copy++) grant(MOON_HUIYUE_ID, getFusionSkillId("辉月"), "皓光之潮获得辉月");
      if (bigCardHasAbility(card, SHADOW_GRANTS_ID))
        for (const name of ["空之轨迹", "末世"]) grant(SHADOW_GRANTS_ID, getFusionSkillId(name), "隐·传承");
      if (bigCardHasAbility(card, SWARM_INHERIT_ID))
        for (const id of [VETERAN_FUSION_ID, "1085", "1084"]) grant(SWARM_INHERIT_ID, id, "万翼归巢·传承");
      if (bigCardHasAbility(card, CURTAIN_REBIRTH_ID))
        for (let copy = 0; copy < 4; copy++) grant(CURTAIN_REBIRTH_ID, HEALING_ART_ID, "谢幕光绮获得治愈术");
      if (bigCardHasAbility(card, BEAST_HUNT_ID)) grant(BEAST_HUNT_ID, "1109", "兽王杀戮获得无属性猎杀");
      if (bigCardHasAbility(card, LONE_STAR_PASSIVE_ID)) grant(LONE_STAR_PASSIVE_ID, LONE_STAR_FUSION_ID, "独获得天煞孤星");
      if (bigCardHasAbility(card, VACUUM_INHERIT_ID)) {
        for (const name of ["四大皆空", "虚无"]) grant(VACUUM_INHERIT_ID, getFusionSkillId(name), "浩渺真空·传承");
      }
      if (bigCardHasAbility(card, VACUUM_STATE_ID)) refreshVacuum(state, player);
      if (bigCardHasAbility(card, THORN_INHERIT_ID)) {
        for (const id of [getFusionSkillId("反伤刺甲"), getFusionSkillId("自然之灵"), "1053"])
          grant(THORN_INHERIT_ID, id, "荆棘乱舞·传承");
      }
      if (bigCardHasAbility(card, TALISMAN_CONCERTO_ID)) {
        const id = grant(TALISMAN_CONCERTO_ID, getFusionSkillId("三元协奏曲"), "三圣镇魂获得王者级三元协奏曲");
        const fusion = player.skillFusions?.find((item) => item.id === id);
        if (fusion) {
          fusion.judgmentRank = "V";
          fusion.uncappedIceFireMarks = true;
        }
      }
      if (bigCardHasAbility(card, PURPLE_GUESS_ID)) grant(PURPLE_GUESS_ID, "1108", "紫极魔瞳·纵观");
      if (bigCardHasAbility(card, ABYSS_INHERIT_ID))
        grant(ABYSS_INHERIT_ID, getFusionSkillId("轮回吞噬"), "虹吸之渊·传承");
      if (bigCardHasAbility(card, SOUL_INHERIT_ID)) {
        for (const id of ["1005", "1067", "1063"])
          grant(SOUL_INHERIT_ID, id, "魂契渡灵·传承");
      }
      if (bigCardHasAbility(card, ASURA_INHERIT_ID)) {
        for (const id of [BLOOD_RITUAL_FUSION_ID, getFusionSkillId("泣血之刃"), getFusionSkillId("末世")])
          grant(ASURA_INHERIT_ID, id, "修罗血剑·传承");
      }
      if (bigCardHasAbility(card, SAND_INHERIT_ID)) {
        for (const id of ["1053", "1003"])
          grant(SAND_INHERIT_ID, id, "尘埃寂灭·传承");
      }
      if (bigCardHasAbility(card, WIND_INHERIT_ID))
        grant(WIND_INHERIT_ID, getFusionSkillId("风之轻灵"), "究影风啸天·传承");
      if (bigCardHasAbility(card, TIANMANG_CONVERSION_ID)) {
        grant(TIANMANG_CONVERSION_ID, getFusionSkillId("六芒星阵"), "创世天芒阵·继承");
      }
      if (bigCardHasAbility(card, CHAOS_INHERIT_ID)) {
        for (const id of [SELF_DESTRUCTER_DEATH_SKILL_ID, getFusionSkillId("魔域"), "1005"]) {
          grant(CHAOS_INHERIT_ID, id, "混沌魔闪光·传承");
        }
      }
      if (card.cardId === KAIGE_CARD_ID) grantKaigeLives(state, player, card, opening);
      if (bigCardHasAbility(card, FENTIAN_INHERIT_ID)) {
        for (const name of FENTIAN_FUSION_GRANTS) grant(FENTIAN_INHERIT_ID, getFusionSkillId(name), `焚天君燚获得${name}`);
      }
      if (bigCardHasAbility(card, JIHAN_INHERIT_ID)) {
        for (const reward of JIHAN_SKILL_GRANTS) {
          if (reward.kind === "fusion") grant(JIHAN_INHERIT_ID, getFusionSkillId(reward.name), `极寒之拥获得${reward.name}`);
        }
      }
      if (bigCardHasAbility(card, HUNYAO_LIGHT_ID)) {
        for (const reward of HUNYAO_SKILL_GRANTS) {
          grant(HUNYAO_LIGHT_ID, reward.skillId, `魂耀九州获得${reward.name}`);
        }
      }
      if (bigCardHasAbility(card, JUNENG_INHERIT_ID)) {
        for (const [name, id] of [
          ["毁灭之盾", getFusionSkillId("毁灭之盾")], ["末世", getFusionSkillId("末世")],
          ["自爆者死", SELF_DESTRUCTER_DEATH_SKILL_ID]
        ] as const) grant(JUNENG_INHERIT_ID, id, `聚能湮灭炮获得${name}`);
      }
      if (bigCardHasAbility(card, KUIJI_INHERIT_ID)) {
        for (const reward of KUIJI_SKILL_GRANTS) {
          const id = "skillId" in reward ? reward.skillId : "fusion" in reward ? getFusionSkillId(reward.name) : undefined;
          if (id) grant(KUIJI_INHERIT_ID, id, `窥觊苍生获得${reward.name}`);
        }
      }
      if (bigCardHasAbility(card, CRYSTAL_INHERIT_ID)) grant(CRYSTAL_INHERIT_ID, "1032", "神域魔晶获得神族水晶");
      if (bigCardHasAbility(card, CORRUPTION_DOMAIN_ID)) grant(CORRUPTION_DOMAIN_ID, "1071", "疾病云雾获得邪域");
      if (bigCardHasAbility(card, STAR_WHEEL_INHERIT))
        for (let copy = 0; copy < 2; copy++) grant(STAR_WHEEL_INHERIT, getFusionSkillId("逆转星移"), "星移飞轮·传承");
      if (bigCardHasAbility(card, STAR_INHERIT_ID)) {
        for (const name of ["逆转星移", "外星人"]) grant(STAR_INHERIT_ID, getFusionSkillId(name), `异星共振获得${name}`);
      }
      if (bigCardHasAbility(card, DRAGON_INHERIT_ID)) {
        for (let copy = 0; copy < 2; copy++) {
          grant(DRAGON_INHERIT_ID, getFusionSkillId("烽火赤壁"), "龙卷残云获得烽火赤壁");
          grant(DRAGON_INHERIT_ID, "1034", "龙卷残云获得雷电法术");
        }
      }
      if (bigCardHasAbility(card, VERDICT_INHERIT_ID)) for (const name of ["沙皇", "制裁之刃"])
        grant(VERDICT_INHERIT_ID, getFusionSkillId(name), `御秽裁决获得${name}`);
      if (bigCardHasAbility(card, QIANQIU_INHERIT_ID)) grant(QIANQIU_INHERIT_ID, getFusionSkillId("冰霜长矛"), "千秋一泪获得冰霜长矛");
      if (bigCardHasAbility(card, YONGYAO_INHERIT_ID)) {
        grant(YONGYAO_INHERIT_ID, SKY_THUNDER_FUSION_ID, "永耀雷霆获得天雷");
        grant(YONGYAO_INHERIT_ID, "1106", "永耀雷霆获得雷裂残阳");
      }
      if (bigCardHasAbility(card, TIANLIE_INHERIT_ID)) for (const name of ["断绝", "终结", "山河破碎"])
        grant(TIANLIE_INHERIT_ID, getFusionSkillId(name), `天裂圣威获得${name}`);
      for (const [id, fusion] of [[WUJIN_INHERIT_ID, "山河破碎"], [WUJIN_REBOUND_ID, "弹力球"]] as const) {
        if (!bigCardHasAbility(card, id)) continue;
        const before = player.skillInventory?.length ?? 0;
        grantInitializedSkill(state, player.id, getFusionSkillId(fusion), `无尽天垒获得${fusion}`, false, undefined, card.instanceId);
        (card.wujinGrantInventory ??= {})[id] = (player.skillInventory ?? []).slice(before).map(({ instanceId }) => instanceId);
      }
      for (const [id, skillIds] of [
        [JUEYING_RETIRE_ID, [ETERNAL_NIGHT_SKILL_ID]],
        [JUEYING_INHERIT_ID, [...["暗影之魂", "逆转星移", "弹力球"].map(getFusionSkillId), "1005"]]
      ] as const) {
        if (!bigCardHasAbility(card, id)) continue;
        const before = player.skillInventory?.length ?? 0;
        for (const skillId of skillIds) grantInitializedSkill(state, player.id, skillId, "绝影逆魂继承", false, undefined, card.instanceId);
        (card.jueyingGrantInventory ??= {})[id] = (player.skillInventory ?? []).slice(before).map(({ instanceId }) => instanceId);
      }
      for (const [id, fusion] of [[CHAOFAN_TREASURE_ID, "圣宝"], [CHAOFAN_JUDGMENT_ID, "神域之种"]] as const) {
        if (!bigCardHasAbility(card, id)) continue;
        const before = player.skillInventory?.length ?? 0;
        grantInitializedSkill(state, player.id, getFusionSkillId(fusion), `超凡绝圣获得${fusion}`, false, undefined, card.instanceId);
        (card.chaofanGrantInventory ??= {})[id] = (player.skillInventory ?? []).slice(before).map(({ instanceId }) => instanceId);
      }
      if (bigCardHasAbility(card, XIELING_INHERIT_ID)) {
        const before = player.skillInventory?.length ?? 0;
        grantInitializedSkill(state, player.id, getFusionSkillId("暗影战斧"), "邪灵无念获得暗影战斧", false, undefined, card.instanceId);
        card.xielingGrantInventory = (player.skillInventory ?? []).slice(before).map(({ instanceId }) => instanceId);
      }
      if (bigCardHasAbility(card, KURONG_INHERIT_ID)) {
        grant(KURONG_INHERIT_ID, getFusionSkillId("枯萎"), "万物枯荣获得枯萎", 3);
        grant(KURONG_INHERIT_ID, getFusionSkillId("繁荣"), "万物枯荣获得繁荣");
      }
      if (bigCardHasAbility(card, HONGHUANG_INHERIT_ID)) {
        for (const id of [getFusionSkillId("冰火狂暴曲"), getFusionSkillId("甲骨文"), "1009", getFusionSkillId("空之轨迹")])
          grant(HONGHUANG_INHERIT_ID, id, "洪荒狂怒·传承");
      }
      if (bigCardHasAbility(card, LINGTA_INHERIT_ID)) {
        for (const id of [getFusionSkillId("天空之城"), "4001", getFusionSkillId("绝对天盾"), "1025"])
          grant(LINGTA_INHERIT_ID, id, "凌踏九霄·传承");
      }
      if (bigCardHasAbility(card, SEA_GOD_INHERIT_ID)) {
        for (const id of ["1092", "1093", "1067", getFusionSkillId("绝对天盾"), "1114", ...[
          "虚无", "逆转星移", "六芒星阵", "六转生死阵"
        ].map(getFusionSkillId)]) grant(SEA_GOD_INHERIT_ID, id, "瀚海乾坤");
      }
      if (bigCardHasAbility(card, KARMA_INHERIT_ID)) {
        for (const id of ["1008", ...["长生", "不死", "逆转星移", "逆转星移"].map(getFusionSkillId)])
          grant(KARMA_INHERIT_ID, id, "命宇轮回·传承");
      }
    }
    refreshYoukaiHalf(player);
  }
}

export function hasFentianInheritance(state: Pick<GameState, "config">, player: PlayerState | undefined): boolean {
  return Boolean(isBigSkillMode(state.config.skillMode) && player?.bigCards?.some((card) => bigCardHasAbility(card, FENTIAN_INHERIT_ID)) &&
    !isPlayerSkillDisabled(player) && !swordArrayNoCakeSuppressesPassive(player, FENTIAN_INHERIT_ID) &&
    !player.buffs.some((buff) => buff.id.startsWith("collapse_until_round:") ||
      buff.id === `sealed_skill:${FENTIAN_INHERIT_ID}`));
}

export function bigAbilitySource(player: Pick<PlayerState, "bigCards"> & Partial<Pick<PlayerState, "buffs">>,
  action: Pick<SkillAction, "skillId" | "bigCardInstanceId" | "freeMoveId" | "waveContinuationId">, requireUses = false): string | undefined {
  if (action.waveContinuationId && action.bigCardInstanceId?.startsWith(FREE_ABILITY_SOURCE_PREFIX)) return action.bigCardInstanceId;
  return player.bigCards?.find((card) => bigCardHasAbility(card, action.skillId) && bigCardAbilityCanActivate(card, action.skillId) &&
    (!requireUses || action.freeMoveId || bigCardHasAbilityUses(card, action.skillId,
      tianlieTemporaryUses({ buffs: player.buffs ?? [] }, action.skillId))) &&
    (action.skillId !== KUISHI_ID || card.openingCopyAvailable) &&
    (action.skillId !== BUBBLE_REBUILD || !card.bubbleDreamRebuild) &&
    (action.skillId !== BUBBLE_ENHANCE || player.buffs && bubbleDreamEnhancement({ buffs: player.buffs }, card.instanceId)) &&
    (action.skillId !== CURTAIN_ENCORE_ID || action.bigCardInstanceId ||
      Boolean(player.buffs && curtainEncoreReady({ buffs: player.buffs }, card.instanceId))) &&
    (action.skillId !== FALLEN_SPLENDOR_EXECUTION && action.skillId !== FALLEN_SPLENDOR_RELEASE ||
      Boolean(player.buffs && fallenSplendorExecutionStock({ buffs: player.buffs }, card.instanceId))) &&
    (!action.bigCardInstanceId || action.bigCardInstanceId === card.instanceId))?.instanceId ?? freeAbilitySourceId(action);
}

export function canReceiveBigCard(player: PlayerState, effect: "skill_copy" | "skill_gain" | "skill_absorption" | "skill_devour"): boolean {
  return !player.buffs.some((buff) => buff.immuneEffectCategories?.includes(effect));
}

export function grantFreshBigCard(state: GameState, player: PlayerState, source: BigCardInstance,
  options: { publiclyRevealed?: true; onlyAbilityId?: string; borrowedUntilRound?: number } = {}): BigCardInstance {
  const onlyAbilityId = options.onlyAbilityId ?? source.onlyAbilityId;
  const copy: BigCardInstance = { instanceId: createId("big_card"), cardId: source.cardId, ...options,
    ...(onlyAbilityId ? { onlyAbilityId } : {}) };
  (player.bigCards ??= []).push(copy);
  initializeBigCardRules(state);
  return copy;
}

export function recordBigCardKnowledge(state: GameState, viewer: PlayerState, owner: PlayerState, card: BigCardInstance,
  discoveries: Set<PlayerId>): void {
  const knowledge = ((state.peekBigCardsByViewer ??= {})[viewer.id] ??= []);
  if (!knowledge.includes(card.instanceId)) knowledge.push(card.instanceId);
  if (!card.publiclyRevealed && bigCardHasAbility(card, KAIGE_KNOWLEDGE_ID) && !card.junengDisabled &&
    hasKaigeAbility(owner, KAIGE_KNOWLEDGE_ID)) discoveries.add(viewer.id);
}

export function initializeOpeningPeek(state: GameState, discoveries: Set<PlayerId>): void {
  for (const viewer of state.players) {
    const originals = viewer.bigCards?.filter((card) => card.cardId === KUIJI_CARD_ID);
    if (!originals?.length) continue;
    for (const card of originals) card.openingCopyAvailable = true;
    for (const owner of state.players) {
      if (owner.id === viewer.id) continue;
      for (const card of owner.bigCards ?? []) recordBigCardKnowledge(state, viewer, owner, card, discoveries);
      for (const id of getOwnedSkillIds(owner)) {
        const known = ((state.skillKnowledge[viewer.id] ??= {})[owner.id] ??= []);
        if (!known.includes(id)) known.push(id);
      }
    }
  }
}

export function findPeekCopyTarget(state: GameState, playerId: PlayerId, instanceId: string | undefined) {
  if (!instanceId || !state.peekBigCardsByViewer?.[playerId]?.includes(instanceId)) return undefined;
  return state.players.flatMap((player) => player.bigCards ?? []).find((card) => card.instanceId === instanceId);
}

export function copyPeekCard(state: GameState, player: PlayerState, action: SkillAction): void {
  const source = player.bigCards?.find((card) => card.instanceId === bigAbilitySource(player, action));
  const target = findPeekCopyTarget(state, player.id, action.targetBigCardInstanceId);
  if (!source || !target || !canReceiveBigCard(player, "skill_copy")) return;
  source.openingCopyAvailable = false;
  grantFreshBigCard(state, player, target, { publiclyRevealed: true });
  if (target.cardId === HUNYAO_CARD_ID && isFusionPreparation(state)) queueZhuRiOpeningChoices(state, player);
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${player.name} 声明复制了 ${getBigCard(target.cardId)?.name ?? target.cardId}` });
}

export function loseKuijiUltimate(state: GameState, event: DamageEvent): void {
  if (event.sourceAbilityId !== KUIJI_ULTIMATE_ID || !event.sourceId) return;
  const player = findPlayer(state, event.sourceId);
  const card = player?.bigCards?.find((entry) => entry.instanceId === event.sourceBigCardInstanceId);
  if (!player || !card || card.lostAbilityIds?.includes(KUIJI_ULTIMATE_ID) ||
    player.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) return;
  (card.lostAbilityIds ??= []).push(KUIJI_ULTIMATE_ID);
  addBigCardStatus(state, player.id, "kuiji_cake_growth", player.id, KUIJI_ULTIMATE_ID, card.instanceId,
    { name: "窥觊苍生·出饼×3" }, false);
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${player.name} 永久失去「窥觊苍生」出招，获得出饼×3` });
}

export function addBigCardStatus(state: GameState, targetId: PlayerId, type: string, sourceId: PlayerId,
  abilityId: string, sourceInstanceId: string | undefined, extra: Partial<BuffState>, negative: boolean): boolean {
  const target = findPlayer(state, targetId);
  if (!target) return false;
  const apply = (player: PlayerState, appliedBy = sourceId) => addSiphonStatus(state, player, { id: createId(type), stateType: type,
    name: ({ burning: "烧伤", limited_disabled: "限定技失效", control_disabled: "控制技失效",
      mitigation_disabled: "减伤与回避失效", skill_rebound: "熔岩天甲·技能反弹", fenshi_flames: "焚世烈焰", fenjin: "焚烬" } as Record<string, string>)[type] ?? type,
    stacks: 1, sourcePlayerId: appliedBy, sourceAbilityId: abilityId,
    ...(sourceInstanceId ? { sourceBigCardInstanceId: sourceInstanceId } : {}), ...extra });
  if (negative) return applyNegativeStatus(state, targetId, type, apply, sourceId);
  return apply(target);
}

export function clearFentianBattlefield(state: GameState, canAffect: (player: PlayerState) => boolean,
  bypassesCakeImmunity: (player: PlayerState) => boolean, defenseCause?: (player: PlayerState) => PlayerId | undefined): void {
  for (const player of state.players.filter((p) => p.kind !== "spectator" && canAffect(p))) {
    if (!hasKaigeAbility(player, KAIGE_ETERNAL_ID) || bypassesCakeImmunity(player)) {
      changeCakes(state, player.id, 0, "焚天君燚清场");
    }
    removeStateCategory(player, "positive");
    reconcileTemporaryBigAbilities(player);
    removeStateCategory(player, "element");
    clearDefenseValue(state, player, defenseCause?.(player));
  }
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: "焚天君燚在命中判定清除了全场（含自身）的良好状态、元素、饼与防御值" });
}

export function applyFentianHitStates(state: GameState, sourceId: PlayerId, targetId: PlayerId, instanceId?: string): void {
  addBigCardStatus(state, targetId, "burning", sourceId, "1050101", instanceId, { expiresAtTurn: state.turnNumber + 2 }, true);
  addBigCardStatus(state, targetId, "limited_disabled", sourceId, "1050101", instanceId, { expiresAtRound: state.roundNumber + 3 }, true);
  addBigCardStatus(state, targetId, "control_disabled", sourceId, "1050101", instanceId, { expiresAtRound: state.roundNumber + 2 }, true);
}

/** A death candidate may be visited repeatedly while revival windows or reactions are processed. */
export function markFenjinForDeath(state: GameState, target: PlayerState, events: DamageEvent[]): void {
  if (!isBigSkillMode(state.config.skillMode)) return;
  const batch = events[0]?.id ?? "empty";
  for (const source of state.players) {
    if (!events.some((event) => getSkillDamageSourceIds(event).includes(source.id) &&
      (event.element === "fire" || event.elements?.includes("fire") || event.traits?.includes("fire")))) continue;
    for (const buff of source.buffs.filter((entry) => entry.stateType === "fenshi_flames" && (entry.expiresAtRound ?? 0) > state.roundNumber)) {
      const seen = `fenjin_death:${target.id}:${buff.id}:${batch}`;
      if (target.buffs.some((entry) => entry.id === seen)) continue;
      target.buffs.push({ id: seen, name: "本次焚烬施加已处理", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
      addBigCardStatus(state, target.id, "fenjin", source.id, FENSHI_FLAMES_ID, buff.sourceBigCardInstanceId, {}, true);
    }
  }
}

export function removeBigCardInstance(state: GameState, playerId: PlayerId, instanceId: string,
  reason: NonNullable<SystemEvent["removalKind"]> = "remove"): boolean {
  const player = findPlayer(state, playerId);
  const card = player?.bigCards?.find((entry) => entry.instanceId === instanceId);
  if (!player || !card || reason === "discard" && !canDiscardBigCard(player, card)) return false;
  if (reason === "disappear" && player.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_disappearance"))) return false;
  detachBigCard(player, instanceId);
  pruneLostSkillKnowledge(state, player);
  const cardName = (reason === "discard" || reason === "disappear" || reason === "absorb") && !card.publiclyRevealed ?
    "一张大卡" : `大卡 ${getBigCard(card.cardId)?.name ?? card.cardId}`;
  const removalText = { burn: "被烧去", discard: "被弃置", remove: "被消除", disappear: "消失", absorb: "被吸取" }[reason];
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", removalKind: reason,
    message: `${player.name} 的${cardName}${removalText}` });
  return true;
}

export function pruneLostSkillKnowledge(state: GameState, player: PlayerState): void {
  const remaining = new Set(getOwnedSkillIds(player));
  player.revealedSkillIds = player.revealedSkillIds.filter((id) => remaining.has(id));
  for (const knowledge of Object.values(state.skillKnowledge)) {
    if (knowledge?.[player.id]) knowledge[player.id] = knowledge[player.id]!.filter((id) => remaining.has(id));
  }
}

export function transferDevouredBigCard(state: GameState, recipient: PlayerState, owner: PlayerState, card: BigCardInstance): boolean {
  if (recipient.id === owner.id || card.onlyAbilityId || !owner.bigCards?.includes(card) ||
    !canReceiveBigCard(owner, "skill_devour") || !canReceiveBigCard(recipient, "skill_devour") ||
    owner.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) return false;
  const loan = state.borrowedBigCards?.find((entry) => entry.borrowerId === owner.id && entry.copyId === card.instanceId);
  const expiry = card.borrowedUntilRound;
  detachBigCard(owner, card.instanceId, Boolean(loan));
  pruneLostSkillKnowledge(state, owner);
  const received = grantFreshBigCard(state, recipient, card, expiry === undefined ? {} : { borrowedUntilRound: expiry });
  if (loan) {
    loan.borrowerId = recipient.id;
    loan.copyId = received.instanceId;
  }
  return true;
}

export function canDiscardBigCard(player: PlayerState, card: BigCardInstance): boolean {
  return !bigCardHasAbility(card, EMPTY_CITY_GUARD_ID) &&
    !player.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_discard"));
}

function detachBigCard(player: PlayerState, instanceId: string, detachBoundState = false): void {
  const card = player.bigCards?.find((entry) => entry.instanceId === instanceId);
  const sources = new Set([instanceId, ...(card ? activeBeastGrants(card).map(({ id }) => id) : [])]);
  if (card?.cardId === KAIGE_CARD_ID) for (const id of kaigeGrantSources(instanceId)) sources.add(id);
  player.bigCards = player.bigCards!.filter((entry) => entry.instanceId !== instanceId);
  if (card?.cardId === FALLEN_SPLENDOR_CARD_ID) player.buffs = player.buffs.filter((buff) =>
    buff.stateType !== FALLEN_SPLENDOR_EXECUTION_STATE || buff.sourceBigCardInstanceId !== instanceId);
  clampSakuraCapacity(player);
  if (card) adjustGrantedSkillUseLedger(player, card, -1);
  if (card) for (const { beast } of activeBeastGrants(card)) adjustBeastUseLedger(player, beast, -1);
  if (player.spareLives) player.spareLives = player.spareLives.filter((life) => life.sourceBigCardInstanceId !== instanceId);
  if (card?.cardId === KAIGE_CARD_ID && !detachBoundState) {
    if (player.kaigeLife?.cardInstanceId === instanceId) delete player.kaigeLife;
    removeKaigeGrants(player, kaigeGrantSources(instanceId));
  }
  if (detachBoundState) {
    const fusionIds = new Set(player.skillFusions?.filter((fusion) => sources.has(fusion.sourceBigCardInstanceId ?? "")).map((fusion) => fusion.id));
    player.buffs = player.buffs.filter((buff) => !(buff.sourceFusionId && fusionIds.has(buff.sourceFusionId)));
  }
  for (let i = (player.skillInventory?.length ?? 0) - 1; i >= 0; i--)
    if (sources.has(player.skillInventory![i]!.sourceBigCardInstanceId ?? "")) removeSkillInstanceAt(player, i);
  reconcileSkillFusions(player);
}

/** A redraw removes the selected card's opening grants without issuing a skill-loss event. */
export function detachRedrawnBigCard(player: PlayerState, instanceId: string): void {
  const card = player.bigCards?.find((entry) => entry.instanceId === instanceId);
  if (!card) return;
  const coveredFusions = new Set(player.skillFusions?.filter((fusion) =>
    fusion.sourceBigCardInstanceId === instanceId).map(({ id }) => id));
  const coveredAbilities = new Set(getBigCard(card.cardId)?.abilities
    .filter(({ id }) => bigCardHasAbility(card, id)).map(({ id }) => id));
  detachBigCard(player, instanceId);
  const stillOwns = (id: SkillId) => player.bigCards?.some((entry) => bigCardHasAbility(entry, id));
  player.buffs = player.buffs.filter((buff) => buff.sourceBigCardInstanceId !== instanceId &&
    (!buff.sourceFusionId || !coveredFusions.has(buff.sourceFusionId)) &&
    (!buff.sourceAbilityId || !coveredAbilities.has(buff.sourceAbilityId) || stillOwns(buff.sourceAbilityId)) &&
    (buff.id !== VACUUM_STATE || !coveredAbilities.has(VACUUM_STATE_ID) || stillOwns(VACUUM_STATE_ID)));
  if (coveredAbilities.has(EMPTY_CITY_ILLUSION_ID) && !stillOwns(EMPTY_CITY_ILLUSION_ID)) {
    delete player.emptyCityBody;
    delete player.emptyCityBodySpaceId;
    delete player.emptyCityBodyDefeatId;
    delete player.emptyCityPhantomDefeat;
    delete player.emptyCityRecovery;
  }
  const owned = new Set(getOwnedSkillIds(player));
  player.revealedSkillIds = player.revealedSkillIds.filter((id) => owned.has(id));
}

function adjustGrantedSkillUseLedger(player: PlayerState, card: BigCardInstance, direction: -1 | 1): void {
  for (const [skillId, count] of Object.entries(card.grantedSkillUses ?? {})) {
    const id = `skill_used:${skillId}`;
    const buff = player.buffs.find((entry) => entry.id === id);
    if (buff) {
      buff.stacks += count * direction;
      if (buff.stacks <= 0) player.buffs = player.buffs.filter((entry) => entry !== buff);
    } else if (direction === 1) player.buffs.push({ id, name: "技能使用次数", stacks: count });
  }
}

export function removeFallenSplendorGrants(player: PlayerState, card: BigCardInstance): void {
  adjustGrantedSkillUseLedger(player, card, -1);
  delete card.grantedSkillUses;
  delete card.inheritedSkillInstances;
  const fusions = new Set(player.skillFusions?.filter((fusion) => fusion.sourceBigCardInstanceId === card.instanceId)
    .map(({ id }) => id));
  for (let i = (player.skillInventory?.length ?? 0) - 1; i >= 0; i--)
    if (player.skillInventory![i]!.sourceBigCardInstanceId === card.instanceId) removeSkillInstanceAt(player, i);
  reconcileSkillFusions(player);
  player.buffs = player.buffs.filter((buff) => !buff.sourceFusionId || !fusions.has(buff.sourceFusionId));
}

export function absorbBigCardAbility(state: GameState, recipient: PlayerState, owner: PlayerState): boolean {
  if (!canReceiveBigCard(recipient, "skill_absorption") || !canReceiveBigCard(owner, "skill_absorption")) return false;
  const eligible = (owner.bigCards ?? []).flatMap((card) => {
    const definition = getBigCard(card.cardId);
    if (!definition || Number(definition.rankCode) > 8) return [];
    return definition.abilities.filter(({ id }) => bigCardHasAbility(card, id)).map(({ id }) => ({ card, id }));
  });
  const veils = curtainVeilCount(owner);
  const index = Math.floor(Math.random() * (eligible.length + veils));
  if (veils && index >= eligible.length) {
    if (owner.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) return false;
    changeCurtainVeils(owner, -1);
    changeCurtainVeils(recipient, 1);
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: recipient.id,
      message: `${recipient.name} 从 ${owner.name} 吸取了光绮（${CURTAIN_VEIL_ID}）` });
    return true;
  }
  const chosen = eligible[index];
  if (!chosen || !loseBigCardAbility(owner, chosen.card, chosen.id)) return false;
  const { card, id } = chosen;
  if (id === KAIGE_LIVES_ID) {
    for (let life = 0; life < 7; life++) addSpareLife(recipient, { hp: 0, effects: [] }, state);
  } else if (id !== KAIGE_KNOWLEDGE_ID) {
    grantFreshBigCard(state, recipient, card, { onlyAbilityId: id });
  }
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: recipient.id,
    message: `${recipient.name} 从 ${owner.name} 吸取了大卡子技能 ${id}` });
  return true;
}

export function loseBigCardAbility(owner: PlayerState, card: NonNullable<PlayerState["bigCards"]>[number], id: SkillId): boolean {
  if (owner.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) return false;
  return detachBigCardAbility(owner, card, id);
}

export function detachBigCardAbility(owner: PlayerState, card: NonNullable<PlayerState["bigCards"]>[number], id: SkillId): boolean {
  if (!bigCardHasAbility(card, id)) return false;
  (card.lostAbilityIds ??= []).push(id);
  clampSakuraCapacity(owner);
  const inheritedInventory = card.wujinGrantInventory?.[id] ?? card.jueyingGrantInventory?.[id] ?? card.chaofanGrantInventory?.[id] ??
    (id === XIELING_INHERIT_ID ? card.xielingGrantInventory :
      id === TALISMAN_CONCERTO_ID || id === CURTAIN_REBIRTH_ID || id === SWARM_INHERIT_ID || id === CORRUPTION_DOMAIN_ID ||
      id === BLADE_INHERIT_ID || id === DECAY_INHERIT_ID || id === SEA_GOD_INHERIT_ID ||
      id === TIAN_SHA_POWER || id === TIAN_SHA_SWORD || card.cardId === FALLEN_SPLENDOR_CARD_ID
        ? card.inheritedSkillInstances?.[id] : undefined);
  if (inheritedInventory) {
    if (id === SEA_GOD_INHERIT_ID) {
      adjustGrantedSkillUseLedger(owner, card, -1);
      delete card.grantedSkillUses;
    }
    for (let i = (owner.skillInventory?.length ?? 0) - 1; i >= 0; i--)
      if (inheritedInventory.includes(owner.skillInventory![i]!.instanceId)) removeSkillInstanceAt(owner, i);
    reconcileSkillFusions(owner);
  }
  if ([FENTIAN_INHERIT_ID, HUNYAO_LIGHT_ID, JIHAN_INHERIT_ID, JUNENG_INHERIT_ID, KUIJI_INHERIT_ID, CRYSTAL_INHERIT_ID, STAR_WHEEL_INHERIT, STAR_INHERIT_ID, DRAGON_INHERIT_ID, VERDICT_INHERIT_ID, QIANQIU_INHERIT_ID, YONGYAO_INHERIT_ID, TIANLIE_INHERIT_ID, KURONG_INHERIT_ID, HONGHUANG_INHERIT_ID, LINGTA_INHERIT_ID, CHAOS_INHERIT_ID, TIANMANG_CONVERSION_ID, SAND_INHERIT_ID, ASURA_INHERIT_ID, SOUL_INHERIT_ID, ABYSS_INHERIT_ID].includes(id)) {
    adjustGrantedSkillUseLedger(owner, card, -1);
    delete card.grantedSkillUses;
    for (let i = (owner.skillInventory?.length ?? 0) - 1; i >= 0; i--)
      if (owner.skillInventory![i]!.sourceBigCardInstanceId === card.instanceId) removeSkillInstanceAt(owner, i);
    reconcileSkillFusions(owner);
  }
  if (id === SACRED_BEAST_ID) {
    const sources = new Set(activeBeastGrants(card).map(({ id, beast }) => { adjustBeastUseLedger(owner, beast, -1); return id; }));
    for (let i = (owner.skillInventory?.length ?? 0) - 1; i >= 0; i--)
      if (sources.has(owner.skillInventory![i]!.sourceBigCardInstanceId ?? "")) removeSkillInstanceAt(owner, i);
    delete card.sacredBeasts;
    reconcileSkillFusions(owner);
  }
  if (card.cardId === KAIGE_CARD_ID) {
    if (id === KAIGE_LIVES_ID) {
      if (owner.spareLives) owner.spareLives = owner.spareLives.filter((life) => life.sourceBigCardInstanceId !== card.instanceId);
      if (owner.kaigeLife?.cardInstanceId === card.instanceId) {
        delete owner.kaigeLife;
        removeKaigeGrants(owner, kaigeGrantSources(card.instanceId));
      }
    } else removeKaigeGrants(owner, [kaigeGrantSource(card.instanceId, id)]);
  }
  return true;
}

export function borrowBigCards(state: GameState, recipient: PlayerState, owner: PlayerState, skipStarWheel = false): boolean {
  if (!owner.bigCards?.length || !canReceiveBigCard(recipient, "skill_absorption") || !canReceiveBigCard(owner, "skill_absorption")) return false;
  return applyNegativeStatus(state, owner.id, "temporary_skill_absorption", (target, sourceId) => {
    const owner = target;
    const recipient = findPlayer(state, sourceId ?? "");
    if (!recipient || !owner.bigCards?.length) return;
    const expiresAtRound = state.roundNumber + 5;
    let lastReturn = state.roundNumber;
    for (const card of [...owner.bigCards!]) {
      const sources = new Set([card.instanceId, ...activeBeastGrants(card).map(({ id }) => id)]);
      if (card.cardId === KAIGE_CARD_ID) for (const id of kaigeGrantSources(card.instanceId)) sources.add(id);
      const inventory = owner.skillInventory?.filter((item) => sources.has(item.sourceBigCardInstanceId ?? "")) ?? [];
      const fusions = owner.skillFusions?.filter((item) => sources.has(item.sourceBigCardInstanceId ?? "")) ?? [];
      const fusionIds = new Set(fusions.map((item) => item.id));
      const buffs = owner.buffs.filter((item) => item.sourceFusionId && fusionIds.has(item.sourceFusionId));
      const spareLives = owner.spareLives?.filter((item) => item.sourceBigCardInstanceId === card.instanceId) ?? [];
      const kaigeStage = owner.kaigeLife?.cardInstanceId === card.instanceId ? owner.kaigeLife.stage : undefined;
      const kaigeLifePosition = card.cardId === KAIGE_CARD_ID ?
        owner.spareLives?.findIndex((item) => item.sourceBigCardInstanceId === card.instanceId) : undefined;
      detachBigCard(owner, card.instanceId, true);
      const boundary = Math.min(expiresAtRound, card.borrowedUntilRound ?? expiresAtRound);
      lastReturn = Math.max(lastReturn, boundary);
      const copy = grantFreshBigCard(state, recipient, card, { borrowedUntilRound: boundary });
      (state.borrowedBigCards ??= []).push({ ownerId: owner.id, borrowerId: recipient.id, copyId: copy.instanceId,
        expiresAtRound: boundary, card, inventory, fusions, buffs, spareLives,
        ...(kaigeStage !== undefined ? { kaigeStage } : {}),
        ...(kaigeLifePosition !== undefined && kaigeLifePosition >= 0 ? { kaigeLifePosition } : {}) });
    }
    owner.buffs.push({ id: createId("temporary_skill_absorption"), stateType: "temporary_skill_absorption",
      name: "霸龙·大卡暂被吸取", stacks: 1, sourcePlayerId: recipient.id, expiresAtRound: lastReturn });
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${recipient.name} 以霸龙暂时吸取了 ${owner.name} 的大卡` });
  }, recipient.id, false, false, skipStarWheel);
}

export function reconcileTemporaryBigAbilities(player: PlayerState, state?: Pick<GameState, "turnNumber" | "roundNumber" | "skillKnowledge">): void {
  if (state && player.yiyuanMimic && !player.buffs.some(({ stateType }) => stateType === YIYUAN_MIMIC_STATE)) restoreYiyuanSkills(state, player);
  for (const card of [...(player.bigCards ?? [])])
    if (card.starMoonTemporary && !player.buffs.some((buff) => buff.stateType === STAR_MOON_TEMPORARY_CARD &&
      buff.sourceBigCardInstanceId === card.instanceId)) detachRedrawnBigCard(player, card.instanceId);
  const lossBuffs = negativeStatusesHaveNoEffect(player) ? [] : player.buffs.filter((buff) => buff.stateType === PURPLE_LOST);
  const gainIds = new Set(player.buffs.flatMap((buff) => buff.temporaryGrantedCardId ? [buff.temporaryGrantedCardId] : []));
  for (const card of [...(player.bigCards ?? [])]) {
    if (card.purpleTemporaryGrant && !gainIds.has(card.instanceId)) {
      detachBigCard(player, card.instanceId, true);
      continue;
    }
    const lost = lossBuffs.flatMap((buff) => buff.temporaryLostAbility?.cardId === card.instanceId ? [buff.temporaryLostAbility.abilityId] : []);
    if (lost.length) card.temporarilyLostAbilityIds = lost;
    else delete card.temporarilyLostAbilityIds;
  }
}

export function temporarilyLoseBigAbility(state: GameState, target: PlayerState, card: BigCardInstance, abilityId: SkillId, sourceId: PlayerId): void {
  applyNegativeStatus(state, target.id, PURPLE_LOST, (recipient, appliedBy) => {
    const affectedCard = recipient.id === target.id ? card : recipient.bigCards?.find((entry) => bigCardHasAbility(entry, abilityId));
    if (!affectedCard || recipient.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) return;
    recipient.buffs.push({ id: createId(PURPLE_LOST), name: "入微·暂时失去子技能", stateType: PURPLE_LOST, stacks: 1,
      ...(appliedBy ? { sourcePlayerId: appliedBy } : {}), expiresAtRound: state.roundNumber + 5,
      temporaryLostAbility: { cardId: affectedCard.instanceId, abilityId } });
    reconcileTemporaryBigAbilities(recipient);
  }, sourceId);
}

export function temporarilyGrantBigAbility(state: GameState, player: PlayerState, card: BigCardInstance, abilityId: SkillId): void {
  if (!canGainStatus(player) || !canReceiveBigCard(player, "skill_gain")) return;
  const granted = grantFreshBigCard(state, player, card, { onlyAbilityId: abilityId });
  granted.purpleTemporaryGrant = true;
  player.buffs.push({ id: createId(PURPLE_GAINED), name: "入微·暂时获得子技能", stateType: PURPLE_GAINED,
    stacks: 1, expiresAtRound: state.roundNumber + 3, temporaryGrantedCardId: granted.instanceId });
}

export function settleDragonRoundChanges(state: GameState): void {
  for (const player of state.players) player.buffs = player.buffs.filter((buff) =>
    (buff.stateType !== "dragon_dominion_protection" && buff.stateType !== "temporary_skill_absorption") ||
    (buff.expiresAtRound ?? 0) > state.roundNumber);
  returnBorrowedBigCards(state, (loan) => loan.expiresAtRound <= state.roundNumber);
  for (const player of state.players) {
    const expired = (player.bigCards ?? []).filter((card) => (card.borrowedUntilRound ?? Infinity) <= state.roundNumber);
    for (const card of expired) detachRedrawnBigCard(player, card.instanceId);
    if (expired.length) pruneLostSkillKnowledge(state, player);
  }
  settleDragonFireBonuses(state);
}

export function clearDragonLongTermStatuses(state: GameState, ownerId: PlayerId): void {
  clearTemporarySkillAbsorption(state, ownerId);
  if (state.pendingDragonFireBonuses) state.pendingDragonFireBonuses = state.pendingDragonFireBonuses.filter((bonus) =>
    bonus.playerId !== ownerId);
}

export function clearTemporarySkillAbsorption(state: GameState, ownerId: PlayerId): void {
  returnBorrowedBigCards(state, (loan) => loan.ownerId === ownerId);
}

function returnBorrowedBigCards(state: GameState, shouldReturn: (loan: NonNullable<GameState["borrowedBigCards"]>[number]) => boolean): void {
  const loans = state.borrowedBigCards ?? [];
  const expired = loans.filter(shouldReturn);
  for (const loan of expired) {
    const borrower = findPlayer(state, loan.borrowerId);
    if (borrower?.bigCards?.some((card) => card.instanceId === loan.copyId)) detachBigCard(borrower, loan.copyId, true);
    const owner = findPlayer(state, loan.ownerId);
    if (!owner || loan.skipReturn || (loan.card.borrowedUntilRound ?? Infinity) <= state.roundNumber) continue;
    (owner.bigCards ??= []).push(loan.card);
    ensureSkillInventory(owner);
    const resumeStage = loan.kaigeStage === undefined ||
      owner.kaigeLife?.cardInstanceId === loan.card.instanceId && owner.kaigeLife.stage === loan.kaigeStage;
    if (resumeStage) {
      owner.skillInventory!.push(...loan.inventory);
      owner.skills.push(...loan.inventory.map((entry) => entry.skillId));
      (owner.skillFusions ??= []).push(...loan.fusions);
      owner.buffs.push(...loan.buffs.filter((buff) => (buff.expiresAtRound ?? Infinity) > state.roundNumber &&
        (buff.expiresAtTurn ?? Infinity) > state.turnNumber));
    }
    const lives = owner.spareLives ??= [];
    lives.splice(loan.kaigeLifePosition ?? lives.length, 0, ...loan.spareLives);
    adjustGrantedSkillUseLedger(owner, loan.card, 1);
    for (const { beast } of activeBeastGrants(loan.card)) adjustBeastUseLedger(owner, beast, 1);
    reconcileSkillFusions(owner);
  }
  if (expired.length) state.borrowedBigCards = loans.filter((entry) => !expired.includes(entry));
}

function settleDragonFireBonuses(state: GameState): void {
  for (const bonus of state.pendingDragonFireBonuses ?? []) {
    if (bonus.dueRound > state.roundNumber) continue;
    const escrow = state.borrowedBigCards?.find((loan) => loan.ownerId === bonus.playerId && loan.card.instanceId === bonus.cardInstanceId);
    if (escrow) continue;
    const player = findPlayer(state, bonus.playerId);
    if (!player || (!bonus.cardInstanceId.startsWith(FREE_ABILITY_SOURCE_PREFIX) &&
      !player.bigCards?.some((card) => card.instanceId === bonus.cardInstanceId))) continue;
    const fire = getFusionSkillId("烽火赤壁");
    const fusionId = player.skillFusions?.find((fusion) => fusion.skillId === fire &&
      fusion.sourceBigCardInstanceId === bonus.cardInstanceId)?.id ??
      grantInitializedSkill(state, player.id, fire, "霸龙补发烽火赤壁", false, undefined, bonus.cardInstanceId);
    if (!fusionId) continue;
    for (const [skillId, stacks] of [["1012", 9], ["1014", 6]] as const) {
      const id = `fusion_use_bonus:${skillId}`;
      const buff = player.buffs.find((entry) => entry.id === id && entry.sourceFusionId === fusionId);
      if (buff) buff.stacks += stacks;
      else player.buffs.push({ id, name: "霸龙·烽火赤壁加次", stacks, sourceFusionId: fusionId });
    }
  }
  if (state.pendingDragonFireBonuses) state.pendingDragonFireBonuses = state.pendingDragonFireBonuses.filter((bonus) =>
    bonus.dueRound > state.roundNumber || state.borrowedBigCards?.some((loan) => loan.ownerId === bonus.playerId && loan.card.instanceId === bonus.cardInstanceId));
}

export function extendDragonDisappear(card: BigCardInstance): void {
  const bonuses = card.abilityUseBonuses ??= {};
  bonuses[DRAGON_DISAPPEAR_ID] = (bonuses[DRAGON_DISAPPEAR_ID] ?? 0) + 1;
}

export function consumeFenjinAfterRevival(state: GameState, player: PlayerState): void {
  if (state.damageAttribution) state.damageAttribution[player.id] = [];
  if (negativeStatusesHaveNoEffect(player)) return;
  const marks = player.buffs.filter((buff) => buff.stateType === "fenjin");
  if (!marks.length) return;
  player.buffs = player.buffs.filter((buff) => buff.stateType !== "fenjin");
  for (const mark of marks) {
    const cards = player.bigCards ?? [];
    if (!cards.length) break;
    const chosen = cards[Math.floor(Math.random() * cards.length)]!;
    removeBigCardInstance(state, player.id, chosen.instanceId, "burn");
  }
}
