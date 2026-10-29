import {
  AttackElement,
  AttackStats,
  AttackTrait,
  DefenseTag,
  GameState,
  INFINITE_DAMAGE,
  PlayerId,
  RETIRE_EFFECT_POWER,
  SkillId
} from "../types";
import { RAW_SKILL_CATALOG } from "./generatedSkillCatalog";
import { FUSION_DEFINITIONS } from "./fusionDefinitions";
import { COMMON_FUSION_SKILL_ID, FUSION_CAKE_COST, FUSION_RECIPES, getFusionUseBonus,
  isFusionActive, isFusionImplemented, countSuppressedFusionMaterials, getFusionEnhancementCount, getFusionSkillId } from "./fusion";
import type { PlayerState } from "../types";
import { inferSkillTimingPhases } from "./phases";
import {
  RawSkillDefinition,
  SkillDefinition,
  SkillPlayDefinition,
  SkillTypeTag
} from "./types";

const implementedSkills: Record<string, Partial<SkillDefinition>> = {
  huo_yan_dao: {
    category: "locked",
    implemented: true,
    hooks: {
      modifyAttack: (_context, attack) => {
        if (attack.id !== "sha") {
          return attack;
        }

        return addElementToAttack(
          {
            ...attack,
            power: attack.power >= 999 ? attack.power : attack.power + attack.stacks,
            level: attack.level + attack.stacks
          },
          "fire"
        );
      }
    }
  },
  zhu_que_yu_shan: {
    category: "locked",
    implemented: true,
    hooks: {
      modifyAttack: (_context, attack) => {
        if (attack.id !== "qin") {
          return attack;
        }

        return addElementToAttack(
          {
            ...attack,
            power: attack.power >= 999 ? attack.power : attack.power + attack.stacks,
            level: attack.level + attack.stacks
          },
          "fire"
        );
      }
    }
  },
  skill_3_56718: {
    category: "raw",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
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
  skill_4_65637: {
    category: "raw",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
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
  skill_8_89763: {
    category: "locked",
    implemented: true
  },
  skill_9_93219: {
    category: "locked",
    implemented: true
  },
  skill_11_89360: {
    category: "locked",
    implemented: true
  },
  skill_12_79004: {
    category: "locked",
    implemented: true
  },
  skill_19_45609: {
    category: "locked",
    implemented: true
  },
  skill_14_46860: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "all",
      usesPerGame: 1,
      selfHeal: 4,
      allEnemyDamage: -1
    }
  },
  skill_15_64971: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 2,
      effect: "no_direct_effect"
    }
  },
  skill_18_34323: {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  skill_31_80497: {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  skill_33_55159: {
    category: "locked",
    implemented: true
  },
  skill_34_1533: {
    category: "locked",
    implemented: true
  },
  skill_35_16792: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      usesPerGame: 2,
      effect: "no_direct_effect"
    }
  },
  skill_36_14343: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      usesPerGame: 1,
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_action"]
  },
  skill_45_30424: {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  skill_46_3651: {
    category: "locked",
    implemented: true
  },
  skill_50_50034: {
    category: "locked",
    implemented: true
  },
  skill_51_92674: {
    category: "locked",
    implemented: true
  },
  skill_53_62958: {
    category: "locked",
    implemented: true
  },
  skill_56_42637: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 3,
      effect: "shield_skill"
    }
  },
  skill_59_79990: {
    category: "locked",
    implemented: true
  },
  skill_67_31717: {
    category: "locked",
    implemented: true
  },
  skill_69_22138: {
    category: "locked",
    implemented: true
  },
  skill_71_40087: {
    category: "locked",
    implemented: true
  },
  skill_72_53933: {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_end_action"]
  },
  skill_73_76567: {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_damage_modify"]
  },
  skill_20_63089: {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["passive_check", "turn_damage_modify"]
  },
  skill_21_36332: {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 3,
      targetMode: "none",
      effect: "lava_mark"
    },
    timingPhases: ["passive_check", "turn_change_action"]
  },
  skill_22_54978: {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 3,
      targetMode: "none",
      effect: "winter_mark"
    },
    timingPhases: ["passive_check", "turn_change_action"]
  },
  skill_24_71363: {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 3,
      maxStacks: 1,
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
  skill_25_51277: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 1,
      effect: "invulnerable_turn"
    }
  },
  skill_27_23816: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      power: 999,
      level: -1,
      defenseTag: "any",
      traits: ["skill"],
      element: "physical"
    }
  },
  skill_37_68416: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 0,
      maxStacks: 20,
      targetMode: "single",
      power: 1,
      level: 2,
      defenseTag: "youtiao",
      traits: ["skill", "electric"],
      element: "electric"
    }
  },
  skill_48_26455: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 2,
      selfDamage: 1,
      effect: "gain_defense_value"
    }
  },
  skill_47_94841: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 2,
      effect: "no_direct_effect"
    },
    timingPhases: ["round_pre_interval_action", "round_after_interval_action"]
  },
  skill_83_32356: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 1,
      maxStacks: 20,
      targetMode: "single",
      power: 1,
      level: 1,
      defenseTag: "cake",
      traits: ["skill"],
      element: "physical"
    }
  },
  skill_61_59049: {
    category: "raw",
    implemented: true,
    play: {
      kind: "resource",
      cost: 1,
      maxStacks: 20,
      targetMode: "none",
      resourceGainPerStack: 2
    }
  },
  skill_62_8008: {
    category: "raw",
    implemented: true,
    play: {
      kind: "resource",
      cost: 1,
      maxStacks: 20,
      targetMode: "none",
      resourceGainPerStack: 3
    }
  },
  skill_64_60978: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 1,
      effect: "no_direct_effect"
    },
    timingPhases: ["revival_action"]
  },
  skill_66_82448: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
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
  skill_68_57581: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      usesPerGame: 1,
      effect: "no_direct_effect"
    },
    timingPhases: ["revival_action"]
  },
  skill_77_30612: {
    category: "raw",
    implemented: true,
    play: {
      kind: "effect",
      cost: 3,
      maxStacks: 1,
      targetMode: "none",
      selfHeal: 3,
      effect: "invulnerable_turn"
    }
  },
  skill_103_56259: {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      effect: "flash_dodge"
    },
    timingPhases: ["turn_change_action"]
  },
  skill_108_76133: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 1,
      effect: "six_star"
    },
    timingPhases: ["turn_damage_modify"]
  },
  skill_93_50224: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 1,
      effect: "reverse_actions"
    },
    timingPhases: ["turn_change_action"]
  },
  skill_104_71181: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
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
  skill_100_45717: {
    category: "locked",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 1,
      effect: "no_direct_effect"
    },
    timingPhases: ["round_pre_interval_action"]
  },
  skill_112_59292: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
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
  skill_79_36319: {
    category: "limited",
    implemented: true,
    play: {
      kind: "attack",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      power: 6,
      level: 6,
      defenseTag: "stone",
      traits: ["skill", "fire", "pierce_rebound"],
      element: "fire",
      usesPerGame: 1
    }
  },
  skill_84_6114: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 2,
      maxStacks: 20,
      targetMode: "single",
      power: 1,
      level: 3,
      defenseTag: "stone",
      traits: ["skill"],
      element: "physical"
    }
  },
  skill_85_26345: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 1,
      maxStacks: 20,
      targetMode: "single",
      power: 1,
      level: 2,
      defenseTag: "small",
      traits: ["skill"],
      element: "physical",
      effect: "zhong_shield"
    }
  },
  skill_86_14131: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 2,
      maxStacks: 20,
      targetMode: "single",
      power: 1,
      level: 2,
      defenseTag: "stone",
      traits: ["skill", "pierce_rebound"],
      element: "physical"
    }
  },
  skill_87_44771: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 2,
      maxStacks: 20,
      targetMode: "single",
      power: 1,
      level: 2,
      defenseTag: "youtiao",
      traits: ["skill"],
      element: "physical",
      effect: "lian_bao_free"
    }
  },
  skill_91_89631: {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  skill_60_57192: {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  skill_74_34920: {
    category: "control",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_change_action"]
  },
  skill_94_627: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      usesPerGame: 2,
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_damage_modify"]
  },
  skill_81_59663: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 1,
      maxStacks: 20,
      targetMode: "single",
      power: 1,
      level: 1,
      defenseTag: "small",
      traits: ["skill"],
      element: "physical"
    }
  },
  skill_95_91337: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      power: RETIRE_EFFECT_POWER,
      level: RETIRE_EFFECT_POWER,
      defenseTag: "any",
      traits: ["skill", "pierce_rebound", "defeat_retire"],
      element: "physical",
      usesPerGame: 1
    }
  },
  skill_96_33279: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 2,
      maxStacks: 20,
      targetMode: "single",
      power: 2,
      level: 2,
      defenseTag: "youtiao",
      traits: ["skill", "ice"],
      element: "ice",
      effect: "blizzard_double_hit"
    }
  },
  skill_107_53513: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "all",
      usesPerGame: 1,
      effect: "no_direct_effect"
    }
  },
  skill_114_87583: {
    category: "locked",
    implemented: true
  },
  skill_115_74459: {
    category: "limited",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      usesPerGame: 2,
      effect: "no_direct_effect"
    },
    timingPhases: ["turn_end_action"]
  },
  skill_120_85509: {
    category: "locked", implemented: true,
    description: "锁定技，第N轮受伤后，在第N+3轮轮初+1饼，于该轮轮末回复3血。",
    timingPhases: ["passive_check", "round_start_check", "round_end_check"]
  }
};

const engineHandledPassiveSkillIds = new Set<string>([
  "skill_2_8724",
  "skill_6_503",
  "skill_7_35434",
  "skill_8_89763",
  "skill_9_93219",
  "skill_11_89360",
  "skill_12_79004",
  "huo_yan_dao",
  "zhu_que_yu_shan",
  "skill_19_45609",
  "skill_20_63089",
  "skill_21_36332",
  "skill_22_54978",
  "skill_23_90895",
  "skill_26_70243",
  "skill_28_42646",
  "skill_29_96125",
  "skill_30_38815",
  "skill_32_19017",
  "skill_33_55159",
  "skill_34_1533",
  "skill_38_81245",
  "skill_39_77400",
  "skill_42_94266",
  "skill_43_74082",
  "skill_44_20092",
  "skill_46_3651",
  "skill_49_75347",
  "skill_50_50034",
  "skill_51_92674",
  "skill_52_22171",
  "skill_53_62958",
  "skill_54_99719",
  "skill_57_59843",
  "skill_58_88471",
  "skill_59_79990",
  "skill_63_72549",
  "skill_65_71994",
  "skill_67_31717",
  "skill_69_22138",
  "skill_70_79685",
  "skill_71_40087",
  "skill_72_53933",
  "skill_73_76567",
  "skill_75_68329",
  "skill_76_76044",
  "skill_80_20445",
  "skill_98_7182",
  "skill_92_26484",
  "skill_99_65551",
  "skill_100_45717",
  "skill_102_5546",
  "skill_105_48309",
  "skill_106_59962",
  "skill_109_65084",
  "skill_113_88141",
  "skill_114_87583",
  "skill_116_97172",
  "skill_117_55768",
  "skill_120_85509",
  "skill_121_59557"
]);

export const SKILL_REGISTRY: Record<SkillId, SkillDefinition> =
  Object.fromEntries(
    [...RAW_SKILL_CATALOG.map((raw) => [
      raw.id,
      createSkillDefinition(raw, implementedSkills[raw.id])
    ]), ...FUSION_RECIPES.map(({ skill }) => [skill.id, {
      ...skill, category: "passive", implemented: isFusionImplemented(skill.id),
      timingPhases: inferSkillTimingPhases(skill), hooks: {},
      ...FUSION_DEFINITIONS[skill.name]
    }]), [COMMON_FUSION_SKILL_ID, {
      id: COMMON_FUSION_SKILL_ID, name: "融合", fusion: "公共行动", description: "消耗2饼，将两个技能融合；开局准备阶段免费。",
      sourceRow: 0, tags: [], typeTags: [], category: "raw", implemented: true,
      timingPhases: ["turn_action"], hooks: {},
      play: { kind: "effect", cost: FUSION_CAKE_COST, maxStacks: 1, targetMode: "none", effect: "no_direct_effect" }
    }]]
  );

export function getSkill(skillId: SkillId): SkillDefinition | undefined {
  return SKILL_REGISTRY[skillId];
}

export function getSkillPlay(skillId: SkillId): SkillPlayDefinition | undefined {
  return getSkill(skillId)?.play;
}

export function getSkillUseLimit(player: Pick<PlayerState, "skills" | "buffs" | "skillFusions">, skillId: SkillId): number | undefined {
  const limit = getSkillPlay(skillId)?.usesPerGame;
  if (!limit) return undefined;
  const count = FUSION_RECIPES.some((recipe) => recipe.skill.id === skillId)
    ? (player.skillFusions ?? []).filter((fusion) => fusion.skillId === skillId && isFusionActive(player, fusion)).length
    : Math.max(0, player.skills.filter((id) => id === skillId).length - countSuppressedFusionMaterials(player, skillId));
  if (getSkill(skillId)?.name === "冰火两仪眼") {
    const used = (id: SkillId) => player.buffs.find((buff) => buff.id === `skill_used:${id}`)?.stacks ?? 0;
    const materialRemaining = Math.min(...["skill_13_68869", "skill_14_46860"].map((id) =>
      limit * count + (getSkillUseLimit(player, id) ?? 0) - used(id)));
    return used(skillId) + Math.max(0, Math.min(limit * count - used(skillId), materialRemaining));
  }
  return limit * count + getFusionUseBonus(player, skillId);
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

export function getSkillAttackStats(
  skillId: SkillId,
  stacks: number
): AttackStats | undefined {
  const skill = getSkill(skillId);
  const play = skill?.play;
  if (!skill || !play || play.kind !== "attack") {
    return undefined;
  }

  return {
    id: skill.id,
    name: play.attackName ?? skill.name,
    cost: play.cost * stacks,
    power: play.power === INFINITE_DAMAGE ? INFINITE_DAMAGE : (play.power ?? 0) * stacks,
    level: (play.level ?? 0) * stacks,
    defenseTag: play.defenseTag ?? "any",
    traits: Array.from(new Set([...(play.traits ?? []), "skill"])),
    element: play.element ?? "physical",
    elements: normalizeElements(play.elements ?? [play.element ?? "physical"]),
    isArea: play.targetMode === "all",
    stacks,
    isSkill: true,
    ...(play.freezeTurns ? { freezeTurns: play.freezeTurns } : {})
  };
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

export function applyAttackModifiers(
  state: GameState,
  ownerId: PlayerId,
  attack: AttackStats
): AttackStats {
  const owner = state.players.find((player) => player.id === ownerId);
  if (!owner) {
    return attack;
  }

  const appliedHooks = new Map<SkillId, number>();
  const hooked = owner.skills.reduce((currentAttack, skillId) => {
    const allowed = owner.skills.filter((id) => id === skillId).length - countSuppressedFusionMaterials(owner, skillId);
    const applied = appliedHooks.get(skillId) ?? 0;
    if (applied >= allowed) return currentAttack;
    appliedHooks.set(skillId, applied + 1);
    if (isSkillSealed(owner, skillId)) {
      return currentAttack;
    }

    const skill = getSkill(skillId);
    const modifier = skill?.hooks.modifyAttack;
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

  if (modified.id === "skill_27_23816" && getFusionEnhancementCount(owner, "skill_27_23816", ["毁灭之盾"]) > 0) {
    modified = { ...modified, level: 0 };
  }
  if (modified.id === "skill_97_60773" && getFusionEnhancementCount(owner, "skill_97_60773", ["极寒风暴"]) > 0) {
    modified = { ...modified, damageHits: 2 };
  }

  modified = modifiedByBasicLockedSkills(
    (skillId) => ownerActiveSkillCount(owner, skillId),
    modified
  );

  const crystalBonus = getFusionEnhancementCount(owner, "skill_33_55159", ["神界炼魂", "神域之种"]);
  if (crystalBonus > 0) modified = { ...modified, level: modified.level + crystalBonus };

  const fireBladeBonus = getFusionEnhancementCount(owner, "huo_yan_dao", ["水火双生"]);
  if (modified.id === "sha" && fireBladeBonus > 0) {
    modified = addElementToAttack({ ...modified,
      power: modified.power >= 999 ? modified.power : modified.power + fireBladeBonus * modified.stacks,
      level: modified.level + fireBladeBonus * modified.stacks }, "ice");
  }
  if (modified.id === "skill_110_2190" && getFusionEnhancementCount(owner, "skill_110_2190", ["雷霆之心"]) > 0) {
    modified = { ...modified, includeSelf: true };
  }
  if (getFusionEnhancementCount(owner, "skill_30_38815", ["破天圣剑"]) > 0) modified = { ...modified, ignoreSwordProtections: true };
  if (modified.id === "skill_84_6114" && getFusionEnhancementCount(owner, "skill_84_6114", ["大抠天下"]) > 0) {
    modified = { ...modified, traits: Array.from(new Set([...modified.traits, "pierce_rebound"])) };
  }
  if (modified.id === getFusionSkillId("冰火双漩")) modified = addElementToAttack(modified, "fire");

  if (modified.id === "wan_jian" && ownerHasActiveSkill(owner, "skill_19_45609")) {
    modified = addElementToAttack(
      {
        ...modified,
        defenseTag: "stone",
        traits: Array.from(new Set([...modified.traits, "pierce_rebound"]))
      },
      "poison"
    );
  }

  if (modified.id === "wan_jian" && ownerHasActiveSkill(owner, "skill_20_63089")) {
    modified = addElementToAttack(
      {
        ...modified,
        traits: Array.from(new Set([...modified.traits, "pierce_rebound"]))
      },
      "ice"
    );
  }

  const pendingLavaMark = owner.buffs.find(
    (buff) => buff.id === "pending_lava_mark" && buff.stacks > 0
  );
  if (ownerHasActiveSkill(owner, "skill_21_36332") && pendingLavaMark) {
    const stacks = pendingLavaMark.stacks;
    pendingLavaMark.stacks = 0;
    modified = addElementToAttack(
      {
        ...modified,
        power: modified.power >= 999 ? modified.power : modified.power + stacks,
        level: modified.level + stacks
      },
      "fire"
    );
  }

  const pendingWinterMark = owner.buffs.find(
    (buff) => buff.id === "pending_winter_mark" && buff.stacks > 0
  );
  if (ownerHasActiveSkill(owner, "skill_22_54978") && pendingWinterMark) {
    const stacks = pendingWinterMark.stacks;
    pendingWinterMark.stacks = 0;
    modified = addElementToAttack(
      {
        ...modified,
        power: modified.power >= 999 ? modified.power : Math.max(0, modified.power - stacks),
        level: modified.level + stacks,
        freezeTurns: Math.min(3, Math.max(1, stacks))
      },
      "ice"
    );
  }

  owner.buffs = owner.buffs.filter((buff) => buff.stacks > 0);

  if (ownerHasActiveSkill(owner, "skill_30_38815")) {
    modified = {
      ...modified,
      traits: Array.from(new Set([...modified.traits, "ignore_protection"]))
    };
  }

  if (ownerHasActiveSkill(owner, "skill_59_79990")) {
    modified = {
      ...modified,
      traits: Array.from(new Set([...modified.traits, "pierce_rebound"]))
    };
  }

  if (modified.id === "wan_jian" && (owner.skillFusions ?? []).some((fusion) =>
    isFusionActive(owner, fusion) && FUSION_RECIPES.some((recipe) =>
      recipe.skill.id === fusion.skillId && recipe.skill.name === "生死符"))) {
    modified = { ...modified, traits: Array.from(new Set([...modified.traits, "pierce_rebound"])) };
  }

  return modified;
}

function applyPermanentAttackGrowth(
  owner: { buffs: Array<{ id: string; stacks: number }> },
  attack: AttackStats
): AttackStats {
  if (attack.id !== "skill_81_59663") {
    return attack;
  }

  const growth = Math.min(
    3,
    Math.max(0, owner.buffs.find((buff) => buff.id === "lu_growth")?.stacks ?? 0)
  );
  if (growth <= 0) {
    return attack;
  }

  return {
    ...attack,
    power: attack.power >= 999 ? attack.power : attack.power + growth * attack.stacks,
    level: attack.level + growth * attack.stacks
  };
}

function modifiedByBasicLockedSkills(
  ownerCount: (skillId: string) => number,
  attack: AttackStats
): AttackStats {
  let modified = attack;
  const crystalCount = ownerCount("skill_33_55159");
  const wineCount = ownerCount("skill_34_1533");

  if (crystalCount > 0) {
    modified = {
      ...modified,
      level: modified.level + crystalCount
    };
  }

  if (wineCount > 0 && modified.power < 999) {
    modified = {
      ...modified,
      power: modified.power + wineCount
    };
  }

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
        buff.id.startsWith("skill_disabled_until_round:")
    )
  ) {
    return 0;
  }

  return Math.max(0, owner.skills.filter((id) => id === skillId).length - countSuppressedFusionMaterials(owner, skillId));
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
  return owner.buffs.some((buff) => buff.id === `sealed_skill:${skillId}`);
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
  const definition: SkillDefinition = {
    ...raw,
    description: override?.description ?? raw.description,
    category: override?.category ?? inferCategory(raw),
    implemented:
      override?.implemented ??
      (Boolean(inferredPlay) || engineHandledPassiveSkillIds.has(raw.id)),
    timingPhases: override?.timingPhases ?? inferSkillTimingPhases(raw),
    hooks: override?.hooks ?? {}
  };
  const play = override?.play ?? inferredPlay;
  if (play) {
    definition.play = play;
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
      maxStacks: 20,
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
      maxStacks: 20,
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
      maxStacks: 1,
      targetMode: "none",
      usesPerGame,
      selfHeal: parseSelfHeal(raw.description),
      effect: "invulnerable_turn"
    };
  }

  if (raw.description.includes("\u62b5\u6321\u672c\u56de\u5408\u53d7\u5230\u7684\u666e\u901a\u653b\u51fb")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: 1, targetMode: "none", usesPerGame, effect: "shield_normal" };
  }

  if (raw.description.includes("\u62b5\u6321\u672c\u56de\u5408\u53d7\u5230\u7684\u6280\u80fd\u62db\u5f0f")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: 1, targetMode: "none", usesPerGame, effect: "shield_skill" };
  }

  if (raw.description.includes("\u514d\u75ab\u6b64\u56de\u5408") || raw.description.includes("\u95ea\u907f\u6b64\u56de\u5408")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: 1, targetMode: "none", usesPerGame, selfHeal: parseSelfHeal(raw.description), effect: "invulnerable_turn" };
  }

  if (raw.description.includes("\u5bf9\u5f53\u524d\u751f\u547d\u53d6\u7edd\u5bf9\u503c")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: 1, targetMode: "none", usesPerGame, selfHeal: parseSelfHeal(raw.description), effect: "abs_plus" };
  }

  if (raw.description.includes("\u5947\u6570\u8840\u91cf\u7684\u73a9\u5bb6-1\u8840")) {
    return { kind: "effect", cost: 0, maxStacks: 1, targetMode: "all", usesPerGame, targetDamage: 1, effect: "odd_hp_damage" };
  }

  if (raw.description.includes("\u5076\u6570\u8840\u91cf\u7684\u73a9\u5bb6-1\u8840")) {
    return { kind: "effect", cost: 0, maxStacks: 1, targetMode: "all", usesPerGame, targetDamage: 1, effect: "even_hp_damage" };
  }

  if (raw.description.includes("\u8840\u91cf\u6700\u9ad8") && raw.description.includes("\u9020\u62102\u70b9")) {
    return { kind: "effect", cost: 0, maxStacks: 1, targetMode: "all", usesPerGame, selectedTargetCount: 2, targetDamage: 2, effect: "highest_hp_damage" };
  }

  if (raw.description.includes("\u4e0d\u8d85\u8fc73\u8840\u7684\u73a9\u5bb6\u9000\u6e38")) {
    return { kind: "effect", cost: 0, maxStacks: 1, targetMode: "all", usesPerGame, hpThreshold: 3, targetDamage: 999, effect: "low_hp_execute" };
  }

  if (raw.description.includes("\u4f7f\u4f60+4\u8840") || raw.description.includes("+4\u8840")) {
    const play: SkillPlayDefinition = { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: 1, targetMode: raw.description.includes("\u5176\u4f59\u73a9\u5bb6") ? "all" : "none", usesPerGame, selfHeal: 4 };
    if (raw.description.includes("\u5176\u4f59\u73a9\u5bb6+1\u8840") || raw.description.includes("\u9664\u4f60\u5916\u6240\u6709\u4eba+1\u8840")) {
      play.allEnemyDamage = -1;
    }
    return play;
  }

  if (raw.description.includes("\u5168\u573a\u53d7\u52301\u70b9") || raw.description.includes("\u9664\u4f60\u5168\u573a\u53d7\u52301\u70b9")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: 1, targetMode: "all", usesPerGame, allEnemyDamage: 1 };
  }

  if (raw.description.includes("\u4f60-1\u8840") && raw.description.includes("+4\u9632\u5fa1\u503c")) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: 1, targetMode: "none", usesPerGame, selfDamage: 1, effect: "invulnerable_turn" };
  }

  if (!raw.timing?.includes("\u88ab\u52a8") && (raw.description.includes("\u9650\u5b9a\u6280") || raw.description.includes("\u63a7\u5236\u6280"))) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: 1, targetMode: inferEffectTargetMode(raw.description), usesPerGame, effect: "no_direct_effect" };
  }

  if (!raw.timing?.includes("\u88ab\u52a8") && (raw.timing?.includes("\u968f\u65f6\u53ef\u7528") || raw.timing?.includes("\u56de\u5408\u4e2d") || raw.timing?.includes("\u51fa\u62db"))) {
    return { kind: "effect", cost: parseCost(raw.description) ?? 0, maxStacks: 1, targetMode: inferEffectTargetMode(raw.description), usesPerGame, effect: "no_direct_effect" };
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
