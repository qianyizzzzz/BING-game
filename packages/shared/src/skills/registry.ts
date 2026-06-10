import {
  AttackElement,
  AttackStats,
  AttackTrait,
  DefenseTag,
  GameState,
  PlayerId,
  RETIRE_EFFECT_POWER,
  SkillId
} from "../types";
import { RAW_SKILL_CATALOG } from "./generatedSkillCatalog";
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
    description:
      "限定技，一局限1次，技能出招，选取1到2名玩家作为目标，等级无限，反弹防，电系；命中后使其麻痹1回合",
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
    description:
      "控制技，2轮限1次，变招阶段，当你攻击时，可以选择1项：攻击+1等级-1、攻击-1等级+1、攻击+2等级-2、攻击-2等级+2、攻击×3等级变为0、攻击变为0等级×4",
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
    description: "控制技，变招阶段，你可以将你的出招的攻击和等级交换",
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
    description: "限定技，一局限2次，变伤阶段，选取你即将承受的1个不超过3的伤害，将其转移给选定玩家；可转移攻击伤害与法术伤害",
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
    description: "技能攻击，1饼，攻1，1级，小防防",
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
    RAW_SKILL_CATALOG.map((raw) => [
      raw.id,
      createSkillDefinition(raw, implementedSkills[raw.id])
    ])
  );

export function getSkill(skillId: SkillId): SkillDefinition | undefined {
  return SKILL_REGISTRY[skillId];
}

export function getSkillPlay(skillId: SkillId): SkillPlayDefinition | undefined {
  return getSkill(skillId)?.play;
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
    name: skill.name,
    cost: play.cost * stacks,
    power: (play.power ?? 0) * stacks,
    level: (play.level ?? 0) * stacks,
    defenseTag: play.defenseTag ?? "any",
    traits: Array.from(new Set([...(play.traits ?? []), "skill"])),
    element: play.element ?? "physical",
    elements: normalizeElements([play.element ?? "physical"]),
    isArea: play.targetMode === "all",
    stacks,
    isSkill: true
  };
}

export function getAllSkills(): SkillDefinition[] {
  return Object.values(SKILL_REGISTRY);
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

  const hooked = owner.skills.reduce((currentAttack, skillId) => {
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

  modified = modifiedByBasicLockedSkills(
    (skillId) => ownerActiveSkillCount(owner, skillId),
    modified
  );

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
  owner: { skills: string[]; buffs: Array<{ id: string }> },
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

  return owner.skills.filter((id) => id === skillId).length;
}

function ownerHasActiveSkill(
  owner: { skills: string[]; buffs: Array<{ id: string }> },
  skillId: string
): boolean {
  return (
    owner.skills.includes(skillId) &&
    !isSkillSealed(owner, skillId) &&
    !owner.buffs.some(
      (buff) =>
        buff.id.startsWith("collapse_until_round:") ||
        buff.id.startsWith("skill_disabled_until_round:")
    )
  );
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

  if (skillHasTypeTag(raw, "锁定技")) {
    return "locked";
  }

  if (skillHasTypeTag(raw, "限定技")) {
    return "limited";
  }

  if (skillHasTypeTag(raw, "控制技")) {
    return "control";
  }

  if (timing.includes("被动") || raw.description.includes("锁定技")) {
    return "locked";
  }

  if (raw.description.includes("控制技")) {
    return "control";
  }

  if (raw.description.includes("限定技")) {
    return "limited";
  }

  if (timing.includes("出招") && raw.description.includes("技能攻击")) {
    return "attack";
  }

  return "raw";
}

function inferPlay(raw: RawSkillDefinition): SkillPlayDefinition | undefined {
  const attackMatch = raw.description.match(
    /(?:技能攻击[，,:：])?(?:(\d+)饼[，,])?攻([∞无限退游\d+]+)[，,](-?\d+)级[，,](小防|油条|石头|任意|饼|无法)防/
  );
  if (attackMatch) {
    const cost = attackMatch[1] ? Number(attackMatch[1]) : parseCost(raw.description) ?? 0;
    const power = parsePower(attackMatch[2]);
    const level = Number(attackMatch[3]);
    const defenseTag = parseDefenseTag(attackMatch[4]);
    const traits: AttackTrait[] = ["skill"];
    if (raw.description.includes("破弹")) {
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

  const resourceMatch = raw.description.match(/^x饼，\+(\d+)x饼/);
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

  const areaAttackMatch = raw.description.match(
    /(?:(\d+)饼[，,])?群攻([∞无限退游\d+]+)[，,](-?\d+)级[，,](小防|油条|石头|任意|饼|无法)防/
  );
  if (areaAttackMatch) {
    const cost = areaAttackMatch[1] ? Number(areaAttackMatch[1]) : parseCost(raw.description) ?? 2;
    const power = parsePower(areaAttackMatch[2]);
    const level = Number(areaAttackMatch[3]);
    const defenseTag = parseDefenseTag(areaAttackMatch[4]);
    const traits: AttackTrait[] = ["skill", "area"];
    if (raw.description.includes("破弹")) {
      traits.push("pierce_rebound");
    }
    if (raw.attribute) {
      traits.push(raw.attribute);
    }

    return {
      kind: "attack",
      cost,
      maxStacks: 20,
      targetMode: "all",
      power,
      level,
      defenseTag,
      traits: Array.from(new Set(traits)),
      element: inferElement(raw),
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

  if (raw.description.includes("此回合无敌")) {
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

  if (raw.description.includes("抵挡本回合受到的普通攻击")) {
    return {
      kind: "effect",
      cost: parseCost(raw.description) ?? 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame,
      effect: "shield_normal"
    };
  }

  if (raw.description.includes("抵挡本回合受到的技能招式")) {
    return {
      kind: "effect",
      cost: parseCost(raw.description) ?? 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame,
      effect: "shield_skill"
    };
  }

  if (raw.description.includes("免疫此回合") || raw.description.includes("闪避此回合")) {
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

  if (raw.description.includes("对当前生命取绝对值")) {
    return {
      kind: "effect",
      cost: parseCost(raw.description) ?? 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame,
      selfHeal: parseSelfHeal(raw.description),
      effect: "abs_plus"
    };
  }

  if (raw.description.includes("奇数血量的玩家-1血")) {
    return {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "all",
      usesPerGame,
      targetDamage: 1,
      effect: "odd_hp_damage"
    };
  }

  if (raw.description.includes("偶数血量的玩家-1血")) {
    return {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "all",
      usesPerGame,
      targetDamage: 1,
      effect: "even_hp_damage"
    };
  }

  if (raw.description.includes("血量最多") && raw.description.includes("造成2点")) {
    return {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "all",
      usesPerGame,
      selectedTargetCount: 2,
      targetDamage: 2,
      effect: "highest_hp_damage"
    };
  }

  if (raw.description.includes("不超过3血的玩家退游")) {
    return {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "all",
      usesPerGame,
      hpThreshold: 3,
      targetDamage: 999,
      effect: "low_hp_execute"
    };
  }

  if (raw.description.includes("你+4血") || raw.description.includes("+4血")) {
    const play: SkillPlayDefinition = {
      kind: "effect",
      cost: parseCost(raw.description) ?? 0,
      maxStacks: 1,
      targetMode: raw.description.includes("其余玩家") ? "all" : "none",
      usesPerGame,
      selfHeal: 4
    };
    if (
      raw.description.includes("其余玩家+1血") ||
      raw.description.includes("除你外所有人+1血")
    ) {
      play.allEnemyDamage = -1;
    }
    return play;
  }

  if (raw.description.includes("全场受到1点") || raw.description.includes("除你全场受到1点")) {
    return {
      kind: "effect",
      cost: parseCost(raw.description) ?? 0,
      maxStacks: 1,
      targetMode: "all",
      usesPerGame,
      allEnemyDamage: 1
    };
  }

  if (raw.description.includes("你-1血") && raw.description.includes("+4防御值")) {
    return {
      kind: "effect",
      cost: parseCost(raw.description) ?? 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame,
      selfDamage: 1,
      effect: "invulnerable_turn"
    };
  }

  if (
    !raw.timing?.includes("被动") &&
    (raw.description.includes("限定技") || raw.description.includes("控制技"))
  ) {
    return {
      kind: "effect",
      cost: parseCost(raw.description) ?? 0,
      maxStacks: 1,
      targetMode: inferEffectTargetMode(raw.description),
      usesPerGame,
      effect: "no_direct_effect"
    };
  }

  if (
    !raw.timing?.includes("被动") &&
    (raw.timing?.includes("随时可用") ||
      raw.timing?.includes("回合中") ||
      raw.timing?.includes("出招"))
  ) {
    return {
      kind: "effect",
      cost: parseCost(raw.description) ?? 0,
      maxStacks: 1,
      targetMode: inferEffectTargetMode(raw.description),
      usesPerGame,
      effect: "no_direct_effect"
    };
  }

  return undefined;
}

function inferEffectTargetMode(description: string): "single" | "all" | "none" {
  if (description.includes("全场") || description.includes("所有玩家") || description.includes("除你外所有人")) {
    return "all";
  }

  if (
    description.includes("目标") ||
    description.includes("选择") ||
    description.includes("选定") ||
    description.includes("一名玩家") ||
    description.includes("1人") ||
    description.includes("对1")
  ) {
    return "single";
  }

  return "none";
}

function parseDefenseTag(value: string | undefined): DefenseTag {
  switch (value) {
    case "小防":
      return "small";
    case "油条":
      return "youtiao";
    case "石头":
      return "stone";
    case "任意":
      return "any";
    case "饼":
      return "cake";
    case "无法":
      return "unblockable";
    default:
      return "any";
  }
}

function parsePower(value: string | undefined): number {
  if (value?.includes("退游")) {
    return RETIRE_EFFECT_POWER;
  }

  if (!value || value.includes("∞") || value.includes("无限")) {
    return 999;
  }

  return value
    .split("+")
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part))
    .reduce((sum, part) => sum + part, 0);
}

function parseUsesPerGame(description: string): number | undefined {
  const match = description.match(/限(\d+)次/);
  if (match) {
    return Number(match[1]);
  }

  return description.includes("限定技") ? 1 : undefined;
}

function parseCost(description: string): number | undefined {
  const match = description.match(/(?:消耗)?(\d+)饼/);
  return match ? Number(match[1]) : undefined;
}

function parseSelfHeal(description: string): number | undefined {
  const match = description.match(/\+(\d+)血/);
  return match ? Number(match[1]) : undefined;
}

function isAreaSkill(raw: RawSkillDefinition): boolean {
  return raw.description.includes("全场") || raw.description.includes("群攻");
}

function inferElement(raw: RawSkillDefinition): AttackElement {
  return raw.attribute ?? "physical";
}
