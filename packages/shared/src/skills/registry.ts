import { BEAST_HUNT_ID } from "../engine/beastTraits";
import { RED_LOTUS_HEART } from "../engine/redLotusIds";
import { redLotusFireAttack } from "../engine/redLotus";
import { canonicalSmallSkillId } from "./legacySmallSkillIds";
import { ignoredSkillCopies } from "../engine/skillIgnore";
import {
  AttackElement,
  AttackStats,
  AttackTrait,
  DefenseTag,
  GameState,
  INFINITE_DAMAGE,
  MAX_ACTION_STACKS,
  PlayerId,
  RETIRE_EFFECT_POWER,
  SkillId
} from "../types";
import { RAW_SKILL_CATALOG } from "./generatedSkillCatalog";
import { BIG_CARD_SKILLS, HEALING_ART_ID, RI_SKILL_ID, bigCardHasAbility } from "../bigCards/abilities";
import { WIND_INHERIT_ID } from "../bigCards/abilities";
import { KURONG_ATTACK_ID, SAND_ARROWS_ID } from "../bigCards/abilities";
import { PSYCHIC_PIERCE_ID } from "../bigCards/abilities";
import { sandGrantUses } from "../engine/sand";
import { siphonRevivalUses } from "../engine/siphon";
import { ASURA_BARRIER_SKILL_ID, asuraBarrierUses, asuraInheritanceCopies } from "../engine/asura";
import { getActiveSkillCount, isPlayerSkillSealed } from "../engine/gameFactory";
import { scaleJunengAttack } from "../engine/junengNumbers";
import { shapeTianlieAttack, tianlieTemporaryUses } from "../engine/tianlie";
import { getFinaleCollapseSource } from "./fusion";
import { V4_SPELL_DESCRIPTIONS } from "./v4SpellDescriptions";
import { FUSION_DEFINITIONS, FUSION_EXPOSURE_TIMINGS } from "./fusionDefinitions";
import { applyReboundSkillModifiers } from "../engine/reboundRules";
import { addCombatValues, attackLevelValue, attackPowerValue, combatValue, compareCombatValues, fromLegacyCombatStat, INFINITY_VALUE,
  offsetAttackStats, projectCombatValue, scaleCombatValue, withAttackLevel, withAttackPower } from "../engine/combatValues";
import { applyHunyaoRiStats, countRiStacks } from "../engine/hunyao";
import { activeSwarmInsects } from "../engine/swarm";
import { shapeDivineSourceAttack } from "../engine/divineReversal";
import { shapeYoukaiAttack } from "../engine/youkai";
import { SHADOW_SHRIEK_ID } from "../engine/shadowIds";
import { SUN_GLORY_ID, SUN_RETURN_ID } from "../engine/sunIds";
import { getBigCardLimitedRemaining, getSkillUseBalanceAdjustment } from "../engine/limitedUseBalance";
import { MOON_PUNISH_ID, MOON_SHADOW_ID, MOON_TIDE_ID } from "../engine/moonIds";
import { shapeMoonDanceAttack } from "../engine/moonDance";
import { getIndependentBrokenBladeSkillCount, getIndependentHeavenSwordCount } from "../engine/brokenBlade";
import { BROKEN_BLADE_CARD_ID } from "../engine/brokenBladeIds";
import { YOUKAI_RITUAL_ID } from "../engine/youkaiIds";
import { VETERAN_DECENCY_ID, VETERAN_FUSION_ID, VETERAN_SHATTER_ID } from "../engine/swarmIds";
import { getSpringGrassNumber, isSkillSuppressedByBuff, isAttributeSkillSuppressed } from "../engine/effectCategories";
import { getSaintMoveMultiplier, isSaintMove } from "../engine/saint";
import { COMMON_FUSION_SKILL_ID, FUSION_CAKE_COST, FUSION_RECIPES, getFusionUseBonus,
  isFusionActive, isFusionImplemented, hasFusionQuota, countSuppressedFusionMaterials, getActiveFusionCount, getFusionEnhancementCount,
  getEnhancedChildFusionIds, getFusionSkillId, getFusionRecipe, getVortexCostOverride, isHigherFusionAreaAttack } from "./fusion";
import type { PlayerState } from "../types";
import { inferSkillTimingPhases } from "./phases";
import {
  RawSkillDefinition,
  isExplicitlyNonStackable,
  SkillDefinition,
  SkillPlayDefinition,
  SkillTypeTag
} from "./types";

const implementedSkills: Record<string, Partial<SkillDefinition>> = {
  "1015": {
    category: "locked",
    implemented: true,
    hooks: {
      modifyAttack: (_context, attack) => {
        if (attack.id !== "sha") {
          return attack;
        }

        return addElementToAttack(
          {
            ...offsetAttackStats(attack, attack.stacks, attack.stacks)
          },
          "fire"
        );
      }
    }
  },
  "1016": {
    category: "locked",
    implemented: true,
    hooks: {
      modifyAttack: (_context, attack) => {
        if (attack.id !== "qin") {
          return attack;
        }

        return addElementToAttack(
          {
            ...offsetAttackStats(attack, attack.stacks, attack.stacks)
          },
          "fire"
        );
      }
    }
  },
  "1002": {
    category: "raw",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "reroll_skill"
    },
    timingPhases: [
      "round_pre_interval_action",
      "round_before_action",
      "turn_before_action",
      "turn_change_action",
      "turn_damage_modify",
      "turn_end_action",
      "turn_after_interval_action",
      "round_after_interval_action"
    ]
  },
  "1003": {
    category: "raw",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "sand_transform"
    },
    timingPhases: [
      "round_pre_interval_action",
      "round_before_action",
      "turn_before_action",
      "turn_change_action",
      "turn_damage_modify",
      "turn_end_action",
      "turn_after_interval_action",
      "round_after_interval_action"
    ]
  },
  "1007": {
    category: "locked",
    implemented: true
  },
  "1008": {
    category: "locked",
    implemented: true
  },
  "1010": {
    category: "locked",
    implemented: true
  },
  "1011": {
    category: "locked",
    implemented: true
  },
  "1018": {
    category: "locked",
    implemented: true
  },
  "1013": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "all",
      usesPerGame: 1,
      selfHeal: 4,
      allEnemyDamage: -1
    }
  },
  "1014": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 2,
      effect: "no_direct_effect"
    }
  },
  "1017": {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  "1030": {
    description: "控制技，当你的攻击被非反弹防住时，你可以承受1点反噬伤害，使该攻击无视其防御出招。",
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  "1032": {
    category: "locked",
    implemented: true
  },
  "1033": {
    category: "locked",
    implemented: true
  },
  "1034": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      usesPerGame: 2,
      effect: "no_direct_effect"
    }
  },
  "1035": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      usesPerGame: 1,
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_action"]
  },
  "1044": {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  "1045": {
    category: "locked",
    implemented: true
  },
  "1049": {
    category: "locked",
    implemented: true
  },
  "1050": {
    category: "locked",
    implemented: true
  },
  "1052": {
    category: "locked",
    implemented: true
  },
  "1055": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 3,
      effect: "shield_skill"
    }
  },
  "1058": {
    category: "locked",
    implemented: true,
    // Confirmed v4 wording; keep the generated v3 baseline untouched until the full migration.
    description: "锁定技，你的所有非反弹防的出招破弹，你无视绝弹"
  },
  "1066": {
    category: "locked",
    implemented: true
  },
  "1068": {
    category: "locked",
    implemented: true
  },
  "1070": {
    category: "locked",
    implemented: true
  },
  "1071": {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_end_action"]
  },
  "1072": {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_damage_modify"]
  },
  "1019": {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["passive_check", "turn_damage_modify"]
  },
  "1020": {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "lava_mark"
    },
    timingPhases: ["passive_check", "turn_change_action"]
  },
  "1021": {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "winter_mark"
    },
    timingPhases: ["passive_check", "turn_change_action"]
  },
  "1023": {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 3,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      selfHeal: 3,
      effect: "no_direct_effect"
    },
    timingPhases: [
      "round_pre_interval_action",
      "round_before_action",
      "turn_before_action",
      "turn_change_action",
      "turn_damage_modify",
      "turn_end_action",
      "turn_after_interval_action",
      "round_after_interval_action"
    ]
  },
  "1024": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 1,
      effect: "invulnerable_turn"
    }
  },
  "1026": {
    description: "技能攻击，0饼，攻无限，-1级，任意防；被防住则你受到3点反噬伤害。",
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 999,
      level: -1,
      defenseTag: "any",
      traits: ["skill"],
      element: "physical"
    }
  },
  "1036": {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 1,
      level: 2,
      defenseTag: "youtiao",
      traits: ["skill", "electric"],
      element: "electric"
    }
  },
  "1047": {
    description: "限定技，一局限2次，你受到1点反噬伤害，+4防御值。",
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 2,
      selfDamage: 1,
      effect: "gain_defense_value"
    }
  },
  "1046": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 2,
      effect: "no_direct_effect"
    },
    timingPhases: ["round_pre_interval_action", "round_after_interval_action"]
  },
  "1082": {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 1,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 1,
      level: 1,
      defenseTag: "cake",
      traits: ["skill"],
      element: "physical"
    }
  },
  "1060": {
    category: "raw",
    implemented: true,
    play: {
      kind: "resource",
      cost: 1,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      resourceGainPerStack: 2
    }
  },
  "1061": {
    category: "raw",
    implemented: true,
    play: {
      kind: "resource",
      cost: 1,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      resourceGainPerStack: 3
    }
  },
  "1063": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 1,
      effect: "no_direct_effect"
    },
    timingPhases: ["revival_action"]
  },
  "1065": {
    category: "limited",
    implemented: true,
    description: "限定技，一局限1次，对当前血量取绝对值后再+6。平地使用时，绝对值属于血量转换，+6属于普通回血；用于复活时，包括+6均属于复活，不受回血倍率、抢夺或禁疗影响。",
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 1,
      selfHeal: 6,
      effect: "abs_plus"
    },
    timingPhases: [
      "round_pre_interval_action",
      "round_before_action",
      "turn_before_action",
      "turn_change_action",
      "turn_damage_modify",
      "revival_action",
      "turn_end_action",
      "turn_after_interval_action",
      "round_after_interval_action"
    ]
  },
  "1067": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      usesPerGame: 1,
      effect: "no_direct_effect"
    },
    timingPhases: ["revival_action"]
  },
  "1076": {
    category: "raw",
    implemented: true,
    play: {
      kind: "effect",
      cost: 3,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      selfHeal: 3,
      effect: "invulnerable_turn"
    }
  },
  "1102": {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "flash_dodge"
    },
    timingPhases: ["turn_change_action"]
  },
  "1107": {
    description: "限定技，一局限1次，免疫此回合不超过无限的伤害，包括反噬伤害；若此回合最高受到x点单次伤害，你+x+6血。",
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 1,
      effect: "six_star"
    },
    timingPhases: ["turn_damage_modify"]
  },
  "1092": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 1,
      effect: "reverse_actions"
    },
    timingPhases: ["turn_change_action"]
  },
  "1103": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 1,
      effect: "past_time_space"
    },
    timingPhases: [
      "round_pre_interval_action",
      "round_before_action",
      "turn_before_action",
      "turn_change_action",
      "turn_damage_modify",
      "turn_end_action",
      "turn_after_interval_action",
      "round_after_interval_action"
    ]
  },
  "1099": {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame: 1,
      effect: "no_direct_effect"
    },
    timingPhases: ["opening_action"]
  },
  "1111": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      usesPerGame: 2,
      effect: "hell_overlord"
    },
    timingPhases: [
      "round_pre_interval_action",
      "round_before_action",
      "turn_before_action",
      "turn_change_action",
      "turn_damage_modify",
      "revival_action",
      "turn_end_action",
      "turn_after_interval_action",
      "round_after_interval_action"
    ]
  },
  "1078": {
    category: "limited",
    implemented: true,
    play: {
      kind: "attack",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 6,
      level: 6,
      defenseTag: "stone",
      traits: ["skill", "fire", "pierce_rebound"],
      element: "fire",
      usesPerGame: 1
    }
  },
  "1083": {
    description: "技能攻击，2饼，攻1，3级，石头防；若目标的反弹未被破除且指向你，你额外受到3点反噬伤害；若与丁对撞，则使目标退游。",
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 2,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 1,
      level: 3,
      defenseTag: "stone",
      traits: ["skill"],
      element: "physical"
    }
  },
  "1084": {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 1,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 1,
      level: 2,
      defenseTag: "small",
      traits: ["skill"],
      element: "physical",
      effect: "zhong_shield"
    }
  },
  "1085": {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 2,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 1,
      level: 2,
      defenseTag: "stone",
      traits: ["skill", "pierce_rebound"],
      element: "physical"
    }
  },
  "1086": {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 2,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 1,
      level: 2,
      defenseTag: "youtiao",
      traits: ["skill"],
      element: "physical",
      effect: "lian_bao_free"
    }
  },
  "1090": {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  "1059": {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  "1073": {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      cakeCostKind: "dynamic",
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  "1088": {
    category: "control", implemented: true, timingPhases: ["turn_change_action"],
    play: { kind: "effect", cost: 2, cakeCostKind: "dynamic", maxStacks: MAX_ACTION_STACKS,
      targetMode: "none", effect: "no_direct_effect" }
  },
  "1093": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      usesPerGame: 2,
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_damage_modify"]
  },
  "1080": {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 1,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 1,
      level: 1,
      defenseTag: "small",
      traits: ["skill"],
      element: "physical"
    }
  },
  "1094": {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: RETIRE_EFFECT_POWER,
      level: RETIRE_EFFECT_POWER,
      defenseTag: "any",
      traits: ["skill", "pierce_rebound", "defeat_retire"],
      element: "physical",
      usesPerGame: 1
    }
  },
  "1095": {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 2,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      power: 2,
      level: 2,
      defenseTag: "youtiao",
      traits: ["skill", "ice"],
      element: "ice",
      effect: "blizzard_double_hit"
    }
  },
  "1106": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "all",
      usesPerGame: 1,
      effect: "no_direct_effect"
    }
  },
  "1113": {
    category: "locked",
    implemented: true
  },
  "1114": {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "single",
      usesPerGame: 2,
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_end_action"]
  },
  "1119": {
    category: "locked", implemented: true,
    description: "锁定技，第N轮受伤后，在第N+3轮轮初+1饼，于该轮轮末回复3血。",
    timingPhases: ["passive_check", "round_start_check", "round_end_check"]
  }
};

const engineHandledPassiveSkillIds = new Set<string>([
  "1001",
  "1005",
  "1006",
  "1007",
  "1008",
  "1010",
  "1011",
  "1015",
  "1016",
  "1018",
  "1019",
  "1020",
  "1021",
  "1022",
  "1025",
  "1027",
  "1028",
  "1029",
  "1031",
  "1032",
  "1033",
  "1037",
  "1038",
  "1041",
  "1042",
  "1043",
  "1045",
  "1048",
  "1049",
  "1050",
  "1051",
  "1052",
  "1053",
  "1056",
  "1057",
  "1058",
  "1062",
  "1064",
  "1066",
  "1068",
  "1069",
  "1070",
  "1071",
  "1072",
  "1074",
  "1075",
  "1079",
  "1097",
  "1091",
  "1098",
  "1099",
  "1101",
  "1104",
  "1105",
  "1108",
  "1112",
  "1113",
  "1115",
  "1116",
  "1119",
  "1120"
]);

export const SKILL_REGISTRY: Record<SkillId, SkillDefinition> =
  Object.fromEntries(
    [...RAW_SKILL_CATALOG.map((raw) => [
      raw.id,
      { ...createSkillDefinition(raw, implementedSkills[raw.id]), ...(V4_SPELL_DESCRIPTIONS[raw.name] ? { description: V4_SPELL_DESCRIPTIONS[raw.name]! } : {}) }
    ]), ...FUSION_RECIPES.map(({ skill }) => [skill.id, {
      ...skill, category: "passive", implemented: isFusionImplemented(skill.id),
      timingPhases: inferSkillTimingPhases(skill), hooks: {},
      ...FUSION_DEFINITIONS[skill.name], exposureTiming: FUSION_EXPOSURE_TIMINGS[skill.name] ?? (skill.id.startsWith("fusion_") ? "不暴露" : skill.exposureTiming)
    }]), [COMMON_FUSION_SKILL_ID, {
      id: COMMON_FUSION_SKILL_ID, name: "融合", fusion: "公共行动", description: "消耗2饼，将配方所需的技能合成；开局准备阶段免费。",
      sourceRow: 0, tags: [], typeTags: [], category: "raw", implemented: true,
      timingPhases: ["turn_action"], hooks: {},
      play: { kind: "effect", cost: FUSION_CAKE_COST, maxStacks: 1, targetMode: "none", effect: "no_direct_effect" }
    }]]
  );

const fusionMoveSkills: Record<SkillId, SkillDefinition> = {};
for (const [id, name, description, play] of [
  [VETERAN_DECENCY_ID, "节操", "2饼，2级，小防防，命中获得1次碎。",
    { kind: "effect", cost: 2, maxStacks: 1, targetMode: "single", level: 2, defenseTag: "small", nonAttackMove: true }],
  [VETERAN_SHATTER_ID, "碎", "消耗1次碎机会。攻无限，无限级，油条防，破弹。",
    { kind: "attack", cost: 0, maxStacks: MAX_ACTION_STACKS, targetMode: "single", power: INFINITE_DAMAGE, level: INFINITE_DAMAGE,
      powerValue: INFINITY_VALUE, levelValue: INFINITY_VALUE, defenseTag: "youtiao", traits: ["pierce_rebound"] }]
] satisfies [SkillId, string, string, SkillPlayDefinition][]) {
  fusionMoveSkills[id] = { ...SKILL_REGISTRY[VETERAN_FUSION_ID]!, id, name, description, play,
    category: play.kind === "attack" ? "attack" : "raw", timingPhases: ["turn_action"] };
}

for (const skill of Object.values(SKILL_REGISTRY)) {
  if (skill.play && isExplicitlyNonStackable(skill.description)) skill.play = { ...skill.play, maxStacks: 1 };
}

import { SMALL_REVIVAL_SKILLS, REVIVAL_FUSION_NAMES, prefixRevivalDescription } from "./revivalSkillIds";

for (const skill of Object.values(SKILL_REGISTRY)) if (SMALL_REVIVAL_SKILLS.has(skill.id) || REVIVAL_FUSION_NAMES.has(skill.name)) {
  if (!skill.typeTags.includes("复活技")) skill.typeTags = [...skill.typeTags, "复活技"];
  skill.description = prefixRevivalDescription(skill.description);
}

export function getSkill(skillId: SkillId): SkillDefinition | undefined {
  const id = canonicalSmallSkillId(skillId);
  return SKILL_REGISTRY[id] ?? fusionMoveSkills[id] ?? BIG_CARD_SKILLS[id];
}

export function getSkillPlay(skillId: SkillId): SkillPlayDefinition | undefined {
  return getSkill(skillId)?.play;
}

/** A zero-priced cake skill still has a cake cost; an unpriced skill does not. */
export function getSkillCakeCostKind(skillId: SkillId, player?: Pick<PlayerState, "skills" | "buffs" | "skillFusions">): "none" | "fixed" | "dynamic" {
  if (player && skillId === "1089" && getFusionEnhancementCount(player, skillId, ["杀级换", "火•杀•换"]) > 0) return "none";
  const play = getSkillPlay(skillId);
  return play?.cakeCostKind ?? (play && play.cost > 0 ? "fixed" : "none");
}

export function skillHasCakeCost(skillId: SkillId, player?: Pick<PlayerState, "skills" | "buffs" | "skillFusions">): boolean {
  return getSkillCakeCostKind(skillId, player) !== "none";
}

export function getSkillUseLimit(player: Pick<PlayerState, "skills" | "buffs" | "skillFusions" | "bigCards" | "skillInventory" | "verdictShadowInstanceId">, skillId: SkillId): number | undefined {
  const permanent = getPermanentSkillUseLimit(player, skillId);
  const siphoned = siphonRevivalUses(player, skillId);
  const extras = sandGrantUses(player, skillId) + (skillId === ASURA_BARRIER_SKILL_ID ? asuraBarrierUses(player) : 0) + siphoned;
  const used = siphoned ? player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0 : 0;
  const temporary = tianlieTemporaryUses(player, skillId);
  if (BIG_CARD_SKILLS[skillId] && permanent === 0 && temporary) {
    const base = getSkillPlay(skillId)?.usesPerGame;
    const copies = player.bigCards?.filter((card) => bigCardHasAbility(card, skillId)) ?? [];
    if (base !== undefined && copies.some((card) => card.abilityUseBalanceAdjustments?.[skillId]))
      return extras + Math.max(0, temporary + Math.max(...copies.map((card) => getBigCardLimitedRemaining(card, skillId, base))));
  }
  return permanent === undefined && !extras ? undefined : Math.min(Number.MAX_SAFE_INTEGER, Math.max(permanent ?? 0, used) +
    temporary + extras + getSkillUseBalanceAdjustment(player, skillId));
}

export function getPermanentSkillUseLimit(player: Pick<PlayerState, "skills" | "buffs" | "skillFusions" | "bigCards" | "skillInventory" | "verdictShadowInstanceId"> & Partial<Pick<PlayerState, "id">>, skillId: SkillId,
  storedQuota = false): number | undefined {
  const limit = getSkillPlay(skillId)?.usesPerGame;
  if (limit === undefined) return undefined;
  if (!storedQuota && getFinaleCollapseSource(player, skillId)) return skillId === "1012" ? 3 : limit;
  if (BIG_CARD_SKILLS[skillId]) return (player.bigCards ?? []).reduce((total, card) => total + (bigCardHasAbility(card, skillId) ?
    Math.max(0, getBigCardLimitedRemaining(card, skillId, limit)) : 0), 0);
  const used = player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
  const acquisitionName = getSkill(skillId)?.name;
  const countsFusion = storedQuota ? hasFusionQuota : isFusionActive;
  if (["沙皇", "天魔舞", "猥琐小叔叔"].includes(acquisitionName ?? "")) {
    return used + (player.skillFusions ?? []).filter((fusion) => fusion.skillId === skillId && countsFusion(player, fusion) &&
      (acquisitionName === "猥琐小叔叔" ? !fusion.acquisition?.bonusSkillId : !fusion.acquisition?.fusionUsed)).length;
  }
  const count = FUSION_RECIPES.some((recipe) => recipe.skill.id === skillId)
    ? (player.skillFusions ?? []).filter((fusion) => fusion.skillId === skillId && countsFusion(player, fusion)).length
    : Math.max(0, player.skills.filter((id) => id === skillId).length - countSuppressedFusionMaterials(player, skillId, storedQuota));
  if (getSkill(skillId)?.name === "冰火两仪眼") {
    if (storedQuota) return limit * count;
    const used = (id: SkillId) => player.buffs.find((buff) => buff.id === `skill_used:${id}`)?.stacks ?? 0;
    const materialRemaining = Math.min(...["1012", "1013"].map((id) =>
      limit * count + (getSkillUseLimit(player, id) ?? 0) - used(id)));
    return used(skillId) + Math.max(0, Math.min(limit * count - used(skillId), materialRemaining));
  }
  const mirrorCredit = skillId === "1100" ? (player.skillFusions ?? []).filter((fusion) =>
    getFusionRecipe(fusion.skillId)?.skill.name === "天魔舞" && countsFusion(player, fusion) &&
    fusion.acquisition?.mirrorMaterialUsed && !fusion.acquisition.smallUsed).length : 0;
  const guidanceCards = skillId === HEALING_ART_ID ? player.bigCards?.filter((card) =>
    player.skillInventory?.some((entry) => entry.skillId === skillId && entry.sourceBigCardInstanceId === card.instanceId)) ?? [] : [];
  if (guidanceCards.some((card) => card.guidanceHealingUnlimited)) return Number.MAX_SAFE_INTEGER;
  const verdictBonus = skillId === "1024" && player.skillInventory?.some((entry) =>
    entry.instanceId === player.verdictShadowInstanceId && entry.skillId === skillId) ?
    player.buffs.find((buff) => buff.id === "verdict_shadow_uses")?.stacks ?? 0 : 0;
  const reversalBonus = skillId === "1092" ? player.buffs.find((buff) => buff.id === "jueying_reversal_uses")?.stacks ?? 0 : 0;
  const asuraBonus = ["1046", ASURA_BARRIER_SKILL_ID].includes(skillId) ? Math.min(count, asuraInheritanceCopies(player, storedQuota)) * (10 - limit) : 0;
  return limit * count + getFusionUseBonus(player, skillId, storedQuota) + mirrorCredit + verdictBonus + reversalBonus + asuraBonus +
    guidanceCards.reduce((sum, card) => sum + (card.guidanceHealingUses ?? 0) + (card.charityHealingRefunds ?? 0), 0);
}

export function skillHasTypeTag(
  skill: Pick<RawSkillDefinition, "typeTags"> | undefined,
  typeTag: SkillTypeTag
): boolean {
  return Boolean(skill?.typeTags?.includes(typeTag));
}

export function hasSkillTypeTag(skillId: SkillId, typeTag: SkillTypeTag): boolean {
  return skillHasTypeTag(getSkill(skillId), typeTag);
}

export function getSkillActionCost(skillId: SkillId, stacks: number): number {
  const play = getSkillPlay(skillId);
  if (!play) {
    return 0;
  }

  return play.cost * stacks;
}

export function getSkillResourceGainPerStack(player: PlayerState | undefined, skillId: SkillId, instanceId?: string, roundNumber?: number): number {
  if (isSaintMove(skillId)) return getSaintMoveMultiplier(player, skillId, instanceId, roundNumber);
  return getSkillPlay(skillId)?.resourceGainPerStack ?? 0;
}

export function getSkillAttackStats(
  skillId: SkillId,
  stacks: number,
  owner?: PlayerState
): AttackStats | undefined {
  const skill = getSkill(skillId);
  const play = skill?.play;
  if (!skill || !play || play.kind !== "attack" && !play.nonAttackMove) {
    return undefined;
  }

  const powerValue = scaleCombatValue(play.powerValue ?? fromLegacyCombatStat(play.power ?? 0), stacks);
  const levelValue = scaleCombatValue(play.levelValue ?? fromLegacyCombatStat(play.level ?? 0), stacks);
  return applyHigherFusionAttackShape(owner, {
    id: skill.id,
    name: play.attackName ?? skill.name,
    cost: play.cost * stacks,
    power: projectCombatValue(powerValue),
    level: projectCombatValue(levelValue),
    powerValue,
    levelValue,
    defenseTag: play.defenseTag ?? "any",
    traits: Array.from(new Set([...(play.traits ?? []), "skill"])),
    element: play.element ?? "physical",
    elements: normalizeElements(play.elements ?? [play.element ?? "physical"]),
    isArea: play.targetMode === "all",
    stacks,
    isSkill: true,
    ...(play.nonAttackMove ? { nonAttackMove: true } : {}),
    ...([SHADOW_SHRIEK_ID, SUN_GLORY_ID, SUN_RETURN_ID, MOON_SHADOW_ID, MOON_TIDE_ID].includes(skill.id) ? { noClashLevel: true } : {}),
    ...(skill.id === MOON_PUNISH_ID ? { fixedPointPower: true } : {}),
    ...(play.damageParts ? { damageParts: play.damageParts.map((part) => part * stacks) } : {}),
    ...(play.repeatedDamageParts ? { repeatedDamageParts: true } : {}),
    ...(play.freezeTurns ? { freezeTurns: play.freezeTurns } : {})
  });
}

function applyHigherFusionAttackShape(owner: PlayerState | undefined, stats: AttackStats): AttackStats {
  if (!owner) return stats;
  stats = shapeTianlieAttack(owner, stats);
  if (stats.id === KURONG_ATTACK_ID) {
    const multiplier = getSpringGrassNumber(owner, KURONG_ATTACK_ID, 1);
    const play = getSkillPlay(KURONG_ATTACK_ID)!;
    if (multiplier > 1) return withAttackLevel(withAttackPower(stats, combatValue(play.power! * stats.stacks * multiplier)),
      combatValue(play.level! * stats.stacks * multiplier));
  }
  if (["1095", "1096"].includes(stats.id) && getActiveSkillCount(owner, WIND_INHERIT_ID) &&
    getActiveFusionCount(owner, "风之轻灵")) {
    const part = 2 * stats.stacks;
    return { ...withAttackPower(stats, combatValue(part)), damageParts: Array<number>(6).fill(part) };
  }
  const vortexCost = getVortexCostOverride(owner, stats.id);
  if (vortexCost !== undefined) return { ...stats, cost: vortexCost * stats.stacks };
  if (stats.id === "1026" && getFusionEnhancementCount(owner, stats.id, ["毁灭之盾"]) > 0) {
    const enhanced = getEnhancedChildFusionIds(owner, "毁灭之魂", getFusionSkillId("毁灭之盾")).size > 0;
    return withAttackLevel(stats, enhanced ? scaleCombatValue(INFINITY_VALUE, stats.stacks) : []);
  }
  if (stats.id === "1083") {
    const price = getActiveFusionCount(owner, "猥琐大叔叔") > 0 ? { ...stats, cost: stats.stacks } : stats;
    return getFusionEnhancementCount(owner, stats.id, ["抠皇"]) > 0
      ? withAttackLevel({ ...price, traits: Array.from(new Set([...stats.traits, "pierce_rebound"])) }, scaleCombatValue(INFINITY_VALUE, stats.stacks))
      : price;
  }
  if (stats.id === getFusionSkillId("山崩地裂") && getEnhancedChildFusionIds(owner, "山河破碎", stats.id).size) {
    const value = scaleCombatValue(INFINITY_VALUE, stats.stacks);
    return withAttackLevel(withAttackPower(stats, value), value);
  }
  if (stats.id === "1094" && getFusionEnhancementCount(owner, stats.id, ["甲骨文"]) > 0)
    return { ...stats, defenseTag: "stone" };
  if (!isHigherFusionAreaAttack(owner, stats.id)) return stats;
  const area: AttackStats = { ...stats, isArea: true, traits: Array.from(new Set([...stats.traits, "area"])) };
  if (stats.id === "1077") {
    const value = combatValue(6 * stats.stacks);
    return withAttackLevel(withAttackPower({ ...area, defenseTag: "youtiao" }, value), value);
  }
  return { ...area, cost: stats.id === "1085" ? stats.stacks : stats.cost,
    traits: Array.from(new Set([...area.traits, "pierce_rebound"])) };
}

export function getAllSkills(options: { includeFusions?: boolean } = {}): SkillDefinition[] {
  return Object.values(SKILL_REGISTRY).filter((skill) => skill.id !== COMMON_FUSION_SKILL_ID &&
    (options.includeFusions || !skill.fusion));
}

export function getSmallSkillIds(limit = 120): SkillId[] {
  return RAW_SKILL_CATALOG.filter((skill) => !skill.fusion.trim())
    .slice(0, limit)
    .map((skill) => skill.id);
}

export function getSmallSkills(limit = 120): SkillDefinition[] {
  return getSmallSkillIds(limit)
    .map((skillId) => getSkill(skillId))
    .filter((skill): skill is SkillDefinition => Boolean(skill));
}

export function getIntroSmallSkillIds(limit = 120): SkillId[] {
  return RAW_SKILL_CATALOG.filter(
    (skill) =>
      skill.name !== "空" &&
      skill.name !== "再来一次" &&
      !skill.fusion.trim()
  )
    .slice(0, limit)
    .map((skill) => skill.id);
}

export function applyAttackModifiers(state: GameState, ownerId: PlayerId, attack: AttackStats, actionIndex?: number): AttackStats {
  const owner = state.players.find((player) => player.id === ownerId);
  const redLotus = getActiveSkillCount(owner, RED_LOTUS_HEART) > 0;
  const finalize = (stats: AttackStats) => redLotus ? redLotusFireAttack(stats) : stats;
  if (attack.id === YOUKAI_RITUAL_ID) return finalize(shapeMoonDanceAttack(owner, shapeYoukaiAttack(owner, attack)));
  const action = actionIndex === undefined ? undefined : state.pendingActions[ownerId]?.actions[actionIndex];
  if (attack.id === "1109" && getActiveSkillCount(owner, BEAST_HUNT_ID) > 0)
    attack = { ...attack, name: "猎杀", element: "physical", elements: [], traits: attack.traits.filter((trait) => trait !== "electric") };
  if (owner) attack = scaleJunengAttack(owner, attack, action?.type === "skill" ? action.bigCardInstanceId : undefined);
  const priorRi = attack.id === RI_SKILL_ID && actionIndex !== undefined
    ? countRiStacks(state.pendingActions[ownerId]?.actions.slice(0, actionIndex) ?? []) : 0;
  attack = applyHigherFusionAttackShape(owner, applyHunyaoRiStats(owner, attack, priorRi));
  if (!attack.damageParts) return finalize(shapeMoonDanceAttack(owner, shapeDivineSourceAttack(owner,
    shapeYoukaiAttack(owner, applySingleAttackModifiers(state, ownerId, attack, actionIndex)))));
  const snapshot = JSON.stringify(state);
  const { damageParts, damagePartValues, ...single } = attack;
  const results = damageParts.map((power, index) => applySingleAttackModifiers(index === 0 ? state : JSON.parse(snapshot) as GameState,
    ownerId, withAttackPower(single, damagePartValues?.[index] ?? combatValue(power)), actionIndex));
  return finalize(shapeMoonDanceAttack(owner, shapeDivineSourceAttack(owner, shapeYoukaiAttack(owner,
    { ...results[0]!, damageParts: results.map((part) => part.power), damagePartValues: results.map(attackPowerValue) }))));
}

function applySingleAttackModifiers(
  state: GameState,
  ownerId: PlayerId,
  attack: AttackStats,
  actionIndex?: number
): AttackStats {
  const owner = state.players.find((player) => player.id === ownerId);
  if (!owner) {
    return attack;
  }

  if (attack.id === "wan_jian" && getFusionEnhancementCount(owner, "1019", ["冰霜之魂"]) > 0) {
    const power = 2 * attack.stacks;
    attack = { ...withAttackLevel(withAttackPower(attack, combatValue(power)), combatValue(4 * attack.stacks)),
      damageParts: [power, power], damagePartValues: [combatValue(power), combatValue(power)], defenseTag: "youtiao" };
  }
  if (attack.id === "wan_jian" && getActiveSkillCount(owner, SAND_ARROWS_ID)) {
    const value = combatValue(3 * attack.stacks);
    attack = { ...withAttackLevel(withAttackPower(attack, value), value), defenseTag: "youtiao" };
  }
  const appliedHooks = new Map<SkillId, number>();
  const hooked = owner.skills.reduce((currentAttack, skillId) => {
    const allowed = owner.skills.filter((id) => id === skillId).length - countSuppressedFusionMaterials(owner, skillId) -
      ignoredSkillCopies(owner, skillId);
    const applied = appliedHooks.get(skillId) ?? 0;
    if (applied >= allowed) return currentAttack;
    appliedHooks.set(skillId, applied + 1);
    if (isSkillSealed(owner, skillId)) {
      return currentAttack;
    }

    const skill = getSkill(skillId);
    const modifier = isAttributeSkillSuppressed(owner, skill) ? undefined : skill?.hooks.modifyAttack;
    if (!modifier) {
      return currentAttack;
    }

    return modifier(
      {
        state,
        ownerId
      },
      currentAttack
    );
  }, attack);

  let modified = applyPermanentAttackGrowth(owner, hooked);
  if (modified.id === "1081") modified = offsetAttackStats(modified, 0, activeSwarmInsects(owner, "fly") * modified.stacks);
  if (modified.id === "1083" || modified.id === "1085") {
    const increase = activeSwarmInsects(owner, "hopper") * modified.stacks;
    modified = offsetAttackStats(modified, increase, increase);
  }
  if (!modified.nonAttackMove && getActiveSkillCount(owner, PSYCHIC_PIERCE_ID)) modified = { ...modified, psychicPierce: true };
  const fireSwap = !modified.isSkill && getActiveFusionCount(owner, "火•杀•换");
  if (fireSwap) modified = addElementToAttack(offsetAttackStats(modified, fireSwap, fireSwap), "fire");
  const severance = getActiveFusionCount(owner, "断绝") + getActiveFusionCount(owner, "寂灭");
  if (severance > 0) modified = { ...modified, pierceInvulnerability: true, attackDamageMultiplier: 2 ** severance };

  if (modified.id === "1096" && getFusionEnhancementCount(owner, "1096", ["极寒风暴"]) > 0) {
    modified = { ...modified, damageHits: 2 };
  }

  modified = modifiedByBasicLockedSkills(
    (skillId) => ownerActiveSkillCount(owner, skillId),
    modified
  );

  const crystalBonus = getFusionEnhancementCount(owner, "1032", ["神界炼魂", "神域之种"]);
  if (crystalBonus > 0) modified = { ...offsetAttackStats(modified, 0, crystalBonus), saintCrystalTriggered: true };

  const fireBladeBonus = getFusionEnhancementCount(owner, "1015", ["水火双生"]);
  if (modified.id === "sha" && fireBladeBonus > 0) {
    const bonus = fireBladeBonus * modified.stacks;
    modified = addElementToAttack(offsetAttackStats(modified, bonus, bonus), "ice");
  }
  const blazingBladeBonus = getFusionEnhancementCount(owner, "1015", ["炽焰"]) * modified.stacks;
  if (modified.id === "sha" && blazingBladeBonus > 0) modified = offsetAttackStats(modified, blazingBladeBonus, blazingBladeBonus);
  if (modified.id === "1109" && getFusionEnhancementCount(owner, "1109", ["雷霆之心"]) > 0) {
    modified = { ...modified, includeSelf: true };
  }
  const qinggangCopies = owner.bigCards?.some((card) => card.cardId === BROKEN_BLADE_CARD_ID)
    ? getIndependentBrokenBladeSkillCount(owner, "1029") : ownerActiveSkillCount(owner, "1029");
  const swordFusionCount = hasLingtaField(state, ownerId) ? 0 : getIndependentHeavenSwordCount(owner);
  if (swordFusionCount > 0) modified = { ...modified, ignoreSwordProtections: true,
    heavenSword: { ignoreSwordProtections: true,
      ignoreProtection: !attack.traits.includes("ignore_protection") && qinggangCopies <= swordFusionCount } };
  if (modified.id === "1083" && getFusionEnhancementCount(owner, "1083", ["大抠天下"]) > 0) {
    modified = { ...modified, traits: Array.from(new Set([...modified.traits, "pierce_rebound"])) };
  }
  if (modified.id === getFusionSkillId("冰火双漩")) modified = addElementToAttack(modified, "fire");

  if (modified.id === "wan_jian" && ownerHasActiveSkill(owner, "1018")) {
    modified = addElementToAttack(
      {
        ...modified,
        defenseTag: "stone",
        traits: Array.from(new Set([...modified.traits, "pierce_rebound"]))
      },
      "poison"
    );
  }

  if (modified.id === "wan_jian" && ownerHasActiveSkill(owner, "1019")) {
    modified = addElementToAttack(
      {
        ...modified,
        requiresAbsoluteRebound: true
      },
      "ice"
    );
  }

  const consumeMarks = (kind: string, active: (buff: PlayerState["buffs"][number]) => boolean,
    multiplier = (_buff: PlayerState["buffs"][number]) => 1) => {
    let stacks = 0;
    for (const buff of owner.buffs) {
      if ((buff.id === `pending_${kind}_mark` || buff.id.startsWith(`pending_${kind}_mark:`)) && buff.stacks > 0 &&
        (buff.attackActionIndex === undefined || buff.attackActionIndex === actionIndex) && active(buff)) {
        stacks += buff.stacks * multiplier(buff);
        buff.stacks = 0;
      }
    }
    return stacks;
  };
  const blazingLava = getFusionEnhancementCount(owner, "1020", ["炽焰"]) > 0;
  const lavaStacks = consumeMarks("lava", (buff) => ownerHasActiveSkill(owner, "1020") &&
    (!buff.sourceFusionId || Boolean(owner.skillFusions?.some((fusion) => fusion.id === buff.sourceFusionId && isFusionActive(owner, fusion)))),
    (buff) => buff.fusionMarkKind === "solar_lava" ? 2 : blazingLava ? 3 : 1);
  if (lavaStacks > 0) {
    modified = addElementToAttack(
      {
        ...offsetAttackStats(modified, lavaStacks, lavaStacks)
      },
      "fire"
    );
  }

  const winterStacks = consumeMarks("winter", () => ownerHasActiveSkill(owner, "1021"));
  if (winterStacks > 0) {
    const enhancedWinter = getFusionEnhancementCount(owner, "1021", ["极寒"]) > 0;
    modified = addElementToAttack(
      {
        ...offsetAttackStats(modified, enhancedWinter ? winterStacks : -winterStacks, winterStacks),
        freezeTurns: Math.min(3, Math.max(1, winterStacks))
      },
      "ice"
    );
    if (compareCombatValues(attackPowerValue(modified), []) < 0) modified = withAttackPower(modified, []);
  }

  let addsIceFire = false;
  const iceFireStacks = consumeMarks("ice_fire", (buff) => {
    const active = owner.skillFusions?.some((fusion) => fusion.id === buff.sourceFusionId &&
      fusion.skillId === getFusionSkillId("冰火狂暴曲") && isFusionActive(owner, fusion));
    if (active && !buff.markKeepsAttackElement) addsIceFire = true;
    return Boolean(active);
  });
  if (iceFireStacks > 0) {
    modified = { ...offsetAttackStats(modified, iceFireStacks, iceFireStacks),
      freezeTurns: Math.max(modified.freezeTurns ?? 0, iceFireStacks)
    };
    if (addsIceFire) modified = addElementToAttack(addElementToAttack(modified, "fire"), "ice");
  }

  owner.buffs = owner.buffs.filter((buff) => buff.stacks > 0);

  if (qinggangCopies > 0) {
    modified = {
      ...modified,
      traits: Array.from(new Set([...modified.traits, "ignore_protection"]))
    };
  }

  modified = applyReboundSkillModifiers(owner, modified);

  if (modified.id === "wan_jian" && (owner.skillFusions ?? []).some((fusion) =>
    isFusionActive(owner, fusion) && FUSION_RECIPES.some((recipe) =>
      recipe.skill.id === fusion.skillId && recipe.skill.name === "生死符"))) {
    modified = { ...modified, traits: Array.from(new Set([...modified.traits, "pierce_rebound"])) };
  }

  return modified;
}

function applyPermanentAttackGrowth(
  owner: Pick<PlayerState, "skills" | "buffs" | "skillFusions">,
  attack: AttackStats
): AttackStats {
  if (attack.id !== "1080") {
    return attack;
  }

  const mark = owner.buffs.find((buff) => buff.id === "lu_growth");
  const uncapped = getActiveFusionCount(owner, "猥琐大叔叔") + getActiveFusionCount(owner, "猥琐老司机") > 0;
  const extra = owner.buffs.find((buff) => buff.id === "swarm_lu_power")?.stacks ?? 0;
  if (uncapped && mark?.infinite) {
    const growth = scaleCombatValue(INFINITY_VALUE, attack.stacks);
    return withAttackLevel(withAttackPower(attack, addCombatValues(attackPowerValue(attack), growth)),
      addCombatValues(attackLevelValue(attack), growth));
  }
  const growth = Math.min(uncapped ? Infinity : 3, Math.max(0, mark?.stacks ?? 0));
  if (growth <= 0 && extra <= 0) {
    return attack;
  }

  return {
    ...offsetAttackStats(attack, (growth + extra) * attack.stacks, growth * attack.stacks)
  };
}

function modifiedByBasicLockedSkills(
  ownerCount: (skillId: string) => number,
  attack: AttackStats
): AttackStats {
  let modified = attack;
  const crystalCount = ownerCount("1032");
  const wineCount = ownerCount("1033");

  if (crystalCount > 0) {
    modified = { ...offsetAttackStats(modified, 0, crystalCount), saintCrystalTriggered: true };
  }

  if (wineCount > 0) modified = offsetAttackStats(modified, wineCount, 0);

  return modified;
}

function ownerActiveSkillCount(
  owner: { skills: string[]; buffs: Array<{ id: string }>; skillFusions?: PlayerState["skillFusions"] },
  skillId: string
): number {
  if (
    isSkillSealed(owner, skillId) ||
    owner.buffs.some(
      (buff) =>
        buff.id.startsWith("collapse_until_round:") ||
        isSkillSuppressedByBuff(buff.id)
    )
  ) {
    return 0;
  }

  return Math.max(0, owner.skills.filter((id) => id === skillId).length - countSuppressedFusionMaterials(owner, skillId) -
    ignoredSkillCopies(owner, skillId));
}

function ownerHasActiveSkill(
  owner: { skills: string[]; buffs: Array<{ id: string }>; skillFusions?: PlayerState["skillFusions"] },
  skillId: string
): boolean {
  return ownerActiveSkillCount(owner, skillId) > 0;
}

function isSkillSealed(
  owner: { buffs: Array<{ id: string }> },
  skillId: string
): boolean {
  return isPlayerSkillSealed(owner, skillId);
}

function addElementToAttack(attack: AttackStats, element: AttackElement): AttackStats {
  const elements = normalizeElements([...(attack.elements ?? []), attack.element, element]);
  const traits =
    element === "physical"
      ? [...attack.traits]
      : Array.from(new Set([...attack.traits, element]));
  return {
    ...attack,
    element: elements[0] ?? element,
    elements,
    traits
  };
}

function normalizeElements(elements: AttackElement[]): AttackElement[] {
  const unique = Array.from(new Set(elements));
  const nonPhysical = unique.filter((element) => element !== "physical");
  return nonPhysical.length > 0 ? nonPhysical : ["physical"];
}

function createSkillDefinition(
  raw: RawSkillDefinition,
  override: Partial<SkillDefinition> | undefined
): SkillDefinition {
  const inferredPlay = inferPlay(raw);
  const timingPhases = override?.timingPhases ?? inferSkillTimingPhases(raw);
  const usableAtOpening = raw.timing?.includes("随时可用") &&
    timingPhases.includes("round_pre_interval_action") && !timingPhases.includes("opening_action");
  const definition: SkillDefinition = {
    ...raw,
    description: override?.description ?? raw.description,
    category: override?.category ?? inferCategory(raw),
    implemented:
      override?.implemented ??
      (Boolean(inferredPlay) || engineHandledPassiveSkillIds.has(raw.id)),
    timingPhases: usableAtOpening ? ["opening_action", ...timingPhases] : timingPhases,
    hooks: override?.hooks ?? {}
  };
  const play = override?.play ?? inferredPlay;
  if (play) {
    definition.play = isExplicitlyNonStackable(raw.description) ? { ...play, maxStacks: 1 } : play;
  }

  return definition;
}

function inferCategory(raw: RawSkillDefinition): SkillDefinition["category"] {
  const timing = raw.timing ?? "";

  if (skillHasTypeTag(raw, "\u9501\u5b9a\u6280")) {
    return "locked";
  }

  if (skillHasTypeTag(raw, "\u9650\u5b9a\u6280")) {
    return "limited";
  }

  if (skillHasTypeTag(raw, "\u63a7\u5236\u6280")) {
    return "control";
  }

  if (timing.includes("\u88ab\u52a8") || raw.description.includes("\u9501\u5b9a\u6280")) {
    return "locked";
  }

  if (raw.description.includes("\u63a7\u5236\u6280")) {
    return "control";
  }

  if (raw.description.includes("\u9650\u5b9a\u6280")) {
    return "limited";
  }

  if ((timing.includes("\u51fa\u62db") || raw.description.includes("\u6280\u80fd\u51fa\u62db")) && raw.description.includes("\u653b")) {
    return "attack";
  }

  return "raw";
}

function inferPlay(raw: RawSkillDefinition): SkillPlayDefinition | undefined {
  const attackMatch = raw.description.match(
    /(?:\u6280\u80fd(?:\u51fa\u62db|\u653b\u51fb)[:\uFF1A,\uFF0C]?\s*)?(?:(\d+)\u997c[,\uFF0C])?\s*(?:\u7fa4\u653b|\u653b)([\u221e\u65e0\u9650\u9000\u6e38\d+]+)[,\uFF0C]\s*(-?\d+)\u7ea7[,\uFF0C]\s*(\u5c0f\u9632|\u6cb9\u6761|\u77f3\u5934|\u4efb\u610f|\u997c|\u65e0\u6cd5)\u9632?/
  );
  if (attackMatch) {
    const cost = attackMatch[1] ? Number(attackMatch[1]) : parseCost(raw.description) ?? 0;
    const power = parsePower(attackMatch[2]);
    const level = Number(attackMatch[3]);
    const defenseTag = parseDefenseTag(attackMatch[4]);
    const traits: AttackTrait[] = ["skill"];
    if (raw.description.includes("\u7834\u5f39")) {
      traits.push("pierce_rebound");
    }
    if (raw.attribute) {
      traits.push(raw.attribute);
    }

    return {
      kind: "attack",
      cost,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: isAreaSkill(raw) ? "all" : "single",
      power,
      level,
      defenseTag,
      traits: Array.from(new Set(traits)),
      element: inferElement(raw),
      usesPerGame: parseUsesPerGame(raw.description)
    };
  }

  const resourceMatch = raw.description.match(/^x\u997c[,\uFF0C]\+(\d+)x\u997c/);
  if (resourceMatch) {
    return {
      kind: "resource",
      cost: 1,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      resourceGainPerStack: Number(resourceMatch[1]),
      usesPerGame: parseUsesPerGame(raw.description)
    };
  }

  const effect = inferEffect(raw);
  if (effect) {
    return effect;
  }

  return undefined;
}

function inferEffect(raw: RawSkillDefinition): SkillPlayDefinition | undefined {
  const usesPerGame = parseUsesPerGame(raw.description);

  if (raw.description.includes("\u6b64\u56de\u5408\u65e0\u654c")) {
    return {
      kind: "effect",
      cost: parseCost(raw.description) ?? 0,
      maxStacks: MAX_ACTION_STACKS,
      targetMode: "none",
      usesPerGame,
      selfHeal: parseSelfHeal(raw.description),
      effect: "invulnerable_turn"
    };
  }

  if (raw.description.includes("\u62b5\u6321\u672c\u56de\u5408\u53d7\u5230\u7684\u666e\u901a\u653b\u51fb")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: MAX_ACTION_STACKS, targetMode: "none", usesPerGame, effect: "shield_normal" };
  }

  if (raw.description.includes("\u62b5\u6321\u672c\u56de\u5408\u53d7\u5230\u7684\u6280\u80fd\u62db\u5f0f")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: MAX_ACTION_STACKS, targetMode: "none", usesPerGame, effect: "shield_skill" };
  }

  if (raw.description.includes("\u514d\u75ab\u6b64\u56de\u5408") || raw.description.includes("\u95ea\u907f\u6b64\u56de\u5408")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: MAX_ACTION_STACKS, targetMode: "none", usesPerGame, selfHeal: parseSelfHeal(raw.description), effect: "invulnerable_turn" };
  }

  if (raw.description.includes("\u5bf9\u5f53\u524d\u751f\u547d\u53d6\u7edd\u5bf9\u503c")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: MAX_ACTION_STACKS, targetMode: "none", usesPerGame, selfHeal: parseSelfHeal(raw.description), effect: "abs_plus" };
  }

  if (raw.description.includes("\u5947\u6570\u8840\u91cf\u7684\u73a9\u5bb6-1\u8840")) {
    return { kind: "effect", cost: 0, maxStacks: MAX_ACTION_STACKS, targetMode: "all", usesPerGame, targetDamage: 1, effect: "odd_hp_damage" };
  }

  if (raw.description.includes("\u5076\u6570\u8840\u91cf\u7684\u73a9\u5bb6-1\u8840")) {
    return { kind: "effect", cost: 0, maxStacks: MAX_ACTION_STACKS, targetMode: "all", usesPerGame, targetDamage: 1, effect: "even_hp_damage" };
  }

  if (raw.description.includes("\u8840\u91cf\u6700\u9ad8") && raw.description.includes("\u9020\u62102\u70b9")) {
    return { kind: "effect", cost: 0, maxStacks: MAX_ACTION_STACKS, targetMode: "all", usesPerGame, selectedTargetCount: 2, targetDamage: 2, effect: "highest_hp_damage" };
  }

  if (raw.description.includes("\u4e0d\u8d85\u8fc73\u8840\u7684\u73a9\u5bb6\u9000\u6e38")) {
    return { kind: "effect", cost: 0, maxStacks: MAX_ACTION_STACKS, targetMode: "all", usesPerGame, hpThreshold: 3, targetDamage: 999, effect: "low_hp_execute" };
  }

  if (raw.description.includes("\u4f7f\u4f60+4\u8840") || raw.description.includes("+4\u8840")) {
    const play: SkillPlayDefinition = { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: MAX_ACTION_STACKS, targetMode: raw.description.includes("\u5176\u4f59\u73a9\u5bb6") ? "all" : "none", usesPerGame, selfHeal: 4 };
    if (raw.description.includes("\u5176\u4f59\u73a9\u5bb6+1\u8840") || raw.description.includes("\u9664\u4f60\u5916\u6240\u6709\u4eba+1\u8840")) {
      play.allEnemyDamage = -1;
    }
    return play;
  }

  if (raw.description.includes("\u5168\u573a\u53d7\u52301\u70b9") || raw.description.includes("\u9664\u4f60\u5168\u573a\u53d7\u52301\u70b9")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: MAX_ACTION_STACKS, targetMode: "all", usesPerGame, allEnemyDamage: 1 };
  }

  if (raw.description.includes("\u4f60-1\u8840") && raw.description.includes("+4\u9632\u5fa1\u503c")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: MAX_ACTION_STACKS, targetMode: "none", usesPerGame, selfDamage: 1, effect: "invulnerable_turn" };
  }

  if (!raw.timing?.includes("\u88ab\u52a8") && (raw.description.includes("\u9650\u5b9a\u6280") || raw.description.includes("\u63a7\u5236\u6280"))) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: MAX_ACTION_STACKS, targetMode: inferEffectTargetMode(raw.description), usesPerGame, effect: "no_direct_effect" };
  }

  if (!raw.timing?.includes("\u88ab\u52a8") && (raw.timing?.includes("\u968f\u65f6\u53ef\u7528") || raw.timing?.includes("\u56de\u5408\u4e2d") || raw.timing?.includes("\u51fa\u62db"))) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: MAX_ACTION_STACKS, targetMode: inferEffectTargetMode(raw.description), usesPerGame, effect: "no_direct_effect" };
  }

  return undefined;
}

function inferEffectTargetMode(description: string): "single" | "all" | "none" {
  if (description.includes("\u5168\u573a") || description.includes("\u6240\u6709\u73a9\u5bb6") || description.includes("\u9664\u4f60\u5916\u6240\u6709\u4eba")) {
    return "all";
  }

  if (description.includes("\u76ee\u6807") || description.includes("\u9009\u62e9") || description.includes("\u9009\u5b9a") || description.includes("\u4e00\u540d\u73a9\u5bb6") || description.includes("1\u4eba") || description.includes("\u5bf9")) {
    return "single";
  }

  return "none";
}

function parseDefenseTag(value: string | undefined): DefenseTag {
  switch (value) {
    case "\u5c0f\u9632": return "small";
    case "\u6cb9\u6761": return "youtiao";
    case "\u77f3\u5934": return "stone";
    case "\u4efb\u610f": return "any";
    case "\u997c": return "cake";
    case "\u65e0\u6cd5": return "unblockable";
    default: return "any";
  }
}

function parsePower(value: string | undefined): number {
  if (value?.includes("\u9000\u6e38")) return RETIRE_EFFECT_POWER;
  if (!value || value.includes("\u221e") || value.includes("\u65e0\u9650")) return 999;
  return value.split("+").map((part) => Number(part.trim())).filter((part) => Number.isFinite(part)).reduce((sum, part) => sum + part, 0);
}

function parseUsesPerGame(description: string): number | undefined {
  const match = description.match(/\u9650(\d+)\u6b21/);
  if (match) return Number(match[1]);
  return description.includes("\u9650\u5b9a\u6280") ? 1 : undefined;
}

function parseCost(description: string): number | undefined {
  const match = description.match(/(?:\u6d88\u8017)?(\d+)\u997c/);
  return match ? Number(match[1]) : undefined;
}

function parseSelfHeal(description: string): number | undefined {
  const match = description.match(/\+(\d+)\u8840/);
  return match ? Number(match[1]) : undefined;
}

function isAreaSkill(raw: RawSkillDefinition): boolean {
  return raw.description.includes("\u5168\u573a") || raw.description.includes("\u7fa4\u653b");
}

function inferElement(raw: RawSkillDefinition): AttackElement {
  return raw.attribute ?? "physical";
}
import { hasLingtaField } from "../engine/lingta";
