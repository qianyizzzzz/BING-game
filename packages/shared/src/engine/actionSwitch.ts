import {
  AttackAction,
  DefenseAction,
  GameState,
  PlayerAction,
  PlayerId,
  SkillAction,
  ValidationResult
} from "../types";

export const ACTION_SWITCH_SKILL_IDS = [
  "skill_88_62906",
  "skill_89_99375",
  "skill_90_32911"
] as const;

export type ActionSwitchSkillId = (typeof ACTION_SWITCH_SKILL_IDS)[number];

export interface ActionSwitchChoice {
  action: AttackAction | DefenseAction;
  cost: number;
}

export interface ActionSwitchPlan {
  actionIndex: number;
  before: PlayerAction;
  after: AttackAction | DefenseAction;
  cost: number;
}

export function isActionSwitchSkillId(skillId: string): skillId is ActionSwitchSkillId {
  return ACTION_SWITCH_SKILL_IDS.includes(skillId as ActionSwitchSkillId);
}

export function getActionSwitchChoicesForAction(
  skillId: string,
  current: PlayerAction
): ActionSwitchChoice[] {
  if (skillId === "skill_88_62906") {
    return getBasicDefenseSwitchChoices(current);
  }

  if (skillId === "skill_89_99375") {
    return getFlexibleDefenseSwitchChoices(current);
  }

  if (skillId === "skill_90_32911") {
    return getShaQinSwitchChoices(current);
  }

  return [];
}

export function getActionSwitchPlan(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ActionSwitchPlan | undefined {
  if (!isActionSwitchSkillId(action.skillId) || !action.switchToAction) {
    return undefined;
  }

  const currentPlan = state.pendingActions[playerId];
  const actionIndex = normalizeActionIndex(action.switchActionIndex);
  const before = currentPlan?.actions[actionIndex];
  if (!before) {
    return undefined;
  }

  const choice = getActionSwitchChoicesForAction(action.skillId, before).find((item) =>
    sameSwitchAction(item.action, action.switchToAction!)
  );
  if (!choice) {
    return undefined;
  }

  return {
    actionIndex,
    before,
    after: choice.action,
    cost: choice.cost
  };
}

export function validateActionSwitch(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  if (!isActionSwitchSkillId(action.skillId)) {
    return valid();
  }

  if (!action.switchToAction) {
    return invalid("这个技能需要选择要切换成的出招");
  }

  const plan = getActionSwitchPlan(state, playerId, action);
  if (!plan) {
    return invalid("当前出招不能用这个技能切换");
  }

  const player = state.players.find((item) => item.id === playerId);
  if (!player || player.cakes < plan.cost) {
    return invalid(`饼不足，切换出招需要 ${plan.cost} 个饼`);
  }

  return valid();
}

export function applyActionSwitch(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ActionSwitchPlan | undefined {
  const plan = getActionSwitchPlan(state, playerId, action);
  const pendingPlan = state.pendingActions[playerId];
  if (!plan || !pendingPlan) {
    return undefined;
  }

  pendingPlan.actions[plan.actionIndex] = plan.after;
  return plan;
}

function getBasicDefenseSwitchChoices(current: PlayerAction): ActionSwitchChoice[] {
  if (current.type !== "defense") {
    return [];
  }

  if (current.defense === "small") {
    return [{ action: { type: "defense", defense: "youtiao" }, cost: 1 }];
  }

  if (current.defense === "youtiao") {
    return [{ action: { type: "defense", defense: "small" }, cost: 1 }];
  }

  return [];
}

function getFlexibleDefenseSwitchChoices(current: PlayerAction): ActionSwitchChoice[] {
  if (current.type !== "defense") {
    return [];
  }

  if (current.defense === "small") {
    return [
      { action: { type: "defense", defense: "youtiao" }, cost: 2 },
      { action: { type: "defense", defense: "stone" }, cost: 3 }
    ];
  }

  if (current.defense === "youtiao") {
    return [
      { action: { type: "defense", defense: "small" }, cost: 2 },
      { action: { type: "defense", defense: "stone" }, cost: 2 }
    ];
  }

  if (current.defense === "stone") {
    return [
      { action: { type: "defense", defense: "youtiao" }, cost: 2 },
      { action: { type: "defense", defense: "small" }, cost: 3 }
    ];
  }

  return [];
}

function getShaQinSwitchChoices(current: PlayerAction): ActionSwitchChoice[] {
  if (current.type !== "attack" || !current.targetId) {
    return [];
  }

  if (current.attackId === "sha") {
    return [
      {
        action: {
          type: "attack",
          attackId: "qin",
          stacks: current.stacks,
          targetId: current.targetId
        },
        cost: 1
      }
    ];
  }

  if (current.attackId === "qin") {
    return [
      {
        action: {
          type: "attack",
          attackId: "sha",
          stacks: current.stacks,
          targetId: current.targetId
        },
        cost: 1
      }
    ];
  }

  return [];
}

function sameSwitchAction(
  left: AttackAction | DefenseAction,
  right: AttackAction | DefenseAction
): boolean {
  if (left.type !== right.type) {
    return false;
  }

  if (left.type === "defense" && right.type === "defense") {
    return left.defense === right.defense;
  }

  if (left.type === "attack" && right.type === "attack") {
    return (
      left.attackId === right.attackId &&
      left.stacks === right.stacks &&
      left.targetId === right.targetId
    );
  }

  return false;
}

function normalizeActionIndex(value: number | undefined): number {
  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : 0;
}

function valid(): ValidationResult {
  return { ok: true };
}

function invalid(error: string): ValidationResult {
  return { ok: false, error };
}
