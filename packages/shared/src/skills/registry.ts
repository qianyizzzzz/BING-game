import {
  AttackElement,
  AttackStats,
  AttackTrait,
  DefenseTag,
  GameState,
  PlayerId,
  SkillId
} from "../types";
import { RAW_SKILL_CATALOG } from "./generatedSkillCatalog";
import { RawSkillDefinition, SkillDefinition, SkillPlayDefinition } from "./types";

const implementedSkills: Record<string, Partial<SkillDefinition>> = {
  huo_yan_dao: {
    category: "locked",
    implemented: true,
    hooks: {
      modifyAttack: (_context, attack) => {
        if (attack.id !== "sha") {
          return attack;
        }

        return {
          ...attack,
          power: 2 * attack.stacks,
          level: 2 * attack.stacks,
          element: "fire",
          traits: Array.from(new Set([...attack.traits, "fire"]))
        };
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

        return {
          ...attack,
          power: 4 * attack.stacks,
          level: 1 * attack.stacks,
          element: "fire",
          traits: Array.from(new Set([...attack.traits, "fire"]))
        };
      }
    }
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
  skill_33_55159: {
    category: "locked",
    implemented: true
  },
  skill_34_1533: {
    category: "locked",
    implemented: true
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
  skill_66_82448: {
    category: "raw",
    implemented: true,
    play: {
      kind: "effect",
      cost: 0,
      maxStacks: 1,
      targetMode: "none",
      usesPerGame: 1,
      selfHeal: 6,
      effect: "abs_plus"
    }
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
  skill_95_91337: {
    category: "attack",
    implemented: true,
    play: {
      kind: "attack",
      cost: 0,
      maxStacks: 1,
      targetMode: "single",
      power: 999,
      level: 999,
      defenseTag: "any",
      traits: ["skill", "pierce_rebound"],
      element: "physical",
      usesPerGame: 1
    }
  },
  skill_114_87583: {
    category: "locked",
    implemented: true
  }
};

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
    isArea: play.targetMode === "all",
    stacks,
    isSkill: true
  };
}

export function getAllSkills(): SkillDefinition[] {
  return Object.values(SKILL_REGISTRY);
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

  let modified = modifiedByBasicLockedSkills(
    (skillId) => owner.skills.includes(skillId),
    hooked
  );

  if (modified.id === "wan_jian" && owner.skills.includes("skill_19_45609")) {
    modified = {
      ...modified,
      defenseTag: "stone",
      element: "poison",
      traits: Array.from(new Set([...modified.traits, "poison", "pierce_rebound"]))
    };
  }

  if (owner.skills.includes("skill_59_79990")) {
    modified = {
      ...modified,
      traits: Array.from(new Set([...modified.traits, "pierce_rebound"]))
    };
  }

  return modified;
}

function modifiedByBasicLockedSkills(
  ownerHas: (skillId: string) => boolean,
  attack: AttackStats
): AttackStats {
  let modified = attack;

  if (ownerHas("skill_33_55159")) {
    modified = {
      ...modified,
      level: modified.level + modified.stacks
    };
  }

  if (ownerHas("skill_34_1533") && modified.power < 999) {
    modified = {
      ...modified,
      power: modified.power + modified.stacks
    };
  }

  return modified;
}

function createSkillDefinition(
  raw: RawSkillDefinition,
  override: Partial<SkillDefinition> | undefined
): SkillDefinition {
  const inferredPlay = inferPlay(raw);
  const definition: SkillDefinition = {
    ...raw,
    category: override?.category ?? inferCategory(raw),
    implemented: override?.implemented ?? Boolean(inferredPlay),
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
    for (const tag of raw.tags) {
      if (tag.includes("火")) {
        traits.push("fire");
      }
      if (tag.includes("电")) {
        traits.push("electric");
      }
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
      element: inferElement(raw)
    };
  }

  const resourceMatch = raw.description.match(/^x饼，\+(\d+)x饼/);
  if (resourceMatch) {
    return {
      kind: "resource",
      cost: 1,
      maxStacks: 20,
      targetMode: "none",
      resourceGainPerStack: Number(resourceMatch[1])
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
    if (raw.description.includes("其余玩家+1血")) {
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
  if (!value || value.includes("∞") || value.includes("无限") || value.includes("退游")) {
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
  return match ? Number(match[1]) : undefined;
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
  if (raw.description.includes("火") || raw.tags.some((tag) => tag.includes("火"))) {
    return "fire";
  }

  if (raw.description.includes("电") || raw.tags.some((tag) => tag.includes("电"))) {
    return "electric";
  }

  if (raw.description.includes("冰") || raw.tags.some((tag) => tag.includes("冰"))) {
    return "ice";
  }

  if (raw.description.includes("毒") || raw.tags.some((tag) => tag.includes("毒"))) {
    return "poison";
  }

  return "physical";
}
