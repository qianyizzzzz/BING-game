import {
  AttackId,
  AttackStats,
  BaseAttackDefinition,
  DefenseKind,
  DefenseTag,
  INFINITE_DAMAGE,
  PlayerAction,
  PlayerActionPlan
} from "../types";
import { getSkill } from "../skills/registry";

export const BASE_ATTACKS: Record<AttackId, BaseAttackDefinition> = {
  sha: {
    id: "sha",
    name: "杀",
    cost: 1,
    power: 1,
    level: 1,
    defenseTag: "small",
    traits: [],
    element: "physical",
    isArea: false
  },
  qin: {
    id: "qin",
    name: "擒",
    cost: 1,
    power: 3,
    level: 0,
    defenseTag: "small",
    traits: [],
    element: "physical",
    isArea: false
  },
  wan_jian: {
    id: "wan_jian",
    name: "万箭齐发",
    cost: 2,
    power: 2,
    level: 2,
    defenseTag: "any",
    traits: ["area"],
    element: "physical",
    isArea: true
  },
  nan_man: {
    id: "nan_man",
    name: "南蛮入侵",
    cost: 3,
    power: 3,
    level: 3,
    defenseTag: "youtiao",
    traits: ["area"],
    element: "physical",
    isArea: true
  },
  shan_dian: {
    id: "shan_dian",
    name: "闪电",
    cost: 4,
    power: 4,
    level: 4,
    defenseTag: "youtiao",
    traits: ["electric"],
    element: "electric",
    isArea: false
  },
  huo_wu: {
    id: "huo_wu",
    name: "火舞",
    cost: 5,
    power: 5,
    level: 5,
    defenseTag: "stone",
    traits: ["fire"],
    element: "fire",
    isArea: false
  },
  he_bao: {
    id: "he_bao",
    name: "核爆",
    cost: 6,
    power: 6,
    level: 6,
    defenseTag: "stone",
    traits: ["fire", "pierce_rebound"],
    element: "fire",
    isArea: false
  },
  chao_he_bao: {
    id: "chao_he_bao",
    name: "超核爆",
    cost: 7,
    power: 7,
    level: 7,
    defenseTag: "cake",
    traits: ["fire", "pierce_rebound"],
    element: "fire",
    isArea: false
  },
  miao_sha: {
    id: "miao_sha",
    name: "秒杀",
    cost: 14,
    power: "infinity",
    level: 14,
    defenseTag: "unblockable",
    traits: [],
    element: "physical",
    isArea: false
  }
};

export const ATTACK_ORDER: AttackId[] = [
  "sha",
  "qin",
  "wan_jian",
  "nan_man",
  "shan_dian",
  "huo_wu",
  "he_bao",
  "chao_he_bao",
  "miao_sha"
];

export const DEFENSE_LABELS: Record<DefenseKind, string> = {
  small: "小防",
  youtiao: "油条",
  stone: "石头",
  rebound: "反弹"
};

export const DEFENSE_TAG_LABELS: Record<DefenseTag, string> = {
  small: "小防防",
  youtiao: "油条防",
  stone: "石头防",
  any: "任意防",
  cake: "饼防",
  unblockable: "无法防"
};

export function getAttackDefinition(id: AttackId): BaseAttackDefinition {
  return BASE_ATTACKS[id];
}

export function getStackedAttackStats(
  definition: BaseAttackDefinition,
  stacks: number
): AttackStats {
  const power =
    definition.power === "infinity"
      ? INFINITE_DAMAGE
      : definition.power * stacks;

  return {
    id: definition.id,
    name: definition.name,
    cost: definition.cost * stacks,
    power,
    level: definition.level * stacks,
    defenseTag: definition.defenseTag,
    traits: [...definition.traits],
    element: definition.element,
    isArea: definition.isArea,
    stacks,
    isSkill: false
  };
}

export function getActionLabel(action: PlayerAction): string {
  if (action.type === "gain_cake") {
    return "饼";
  }

  if (action.type === "defense") {
    return DEFENSE_LABELS[action.defense];
  }

  if (action.type === "skill") {
    const skill = getSkill(action.skillId);
    return `${action.stacks > 1 ? action.stacks : ""}${skill?.name ?? "技能"}`;
  }

  const attack = BASE_ATTACKS[action.attackId];
  return `${action.stacks > 1 ? action.stacks : ""}${attack.name}`;
}

export function getActionPlanLabel(plan: PlayerActionPlan): string {
  return plan.actions.map((action) => getActionLabel(action)).join(" / ");
}

export function canActionDefend(
  action: PlayerAction | undefined,
  defenseTag: DefenseTag
): boolean {
  if (!action) {
    return false;
  }

  if (defenseTag === "unblockable") {
    return false;
  }

  if (defenseTag === "cake") {
    return action.type === "gain_cake";
  }

  if (action.type !== "defense") {
    return false;
  }

  if (action.defense === "rebound") {
    return false;
  }

  if (defenseTag === "any") {
    return ["small", "youtiao", "stone"].includes(action.defense);
  }

  return action.defense === defenseTag;
}

export function getDefenseForEvent(
  action: PlayerAction | undefined
): DefenseKind | "gain_cake" | undefined {
  if (!action) {
    return undefined;
  }

  if (action.type === "gain_cake") {
    return "gain_cake";
  }

  if (action.type === "defense") {
    return action.defense;
  }

  return undefined;
}
