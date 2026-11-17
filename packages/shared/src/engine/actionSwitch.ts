import {
  AttackAction,
  DefenseAction,
  GainCakeAction,
  GameState,
  PlayerAction,
  PlayerId,
  PlayerState,
  SkillAction,
  ValidationResult
} from "../types";
import { getActiveFusionCount, getFusionSkillId, getFusionEnhancementCount } from "../skills/fusion";
import { getSkillUseLimit } from "../skills/registry";
import { canAffectAcrossSpace, canBypassTargetSelection, preventsTargetSelection } from "./spaces";
import { hasTianyeReboundLock } from "./tianye";
import { ATTACK_ORDER, BASE_ATTACKS, getStackedAttackStats } from "./attacks";
import { MAX_ACTION_STACKS } from "../types";
import { validCakePayment } from "./vacuum";

type SwitchAction = AttackAction | DefenseAction | GainCakeAction;

export const ACTION_SWITCH_SKILL_IDS = [
  "1087",
  "1088",
  "1089",
  getFusionSkillId("虚幻")
] as const;

export type ActionSwitchSkillId = (typeof ACTION_SWITCH_SKILL_IDS)[number];

export interface ActionSwitchChoice {
  action: SwitchAction;
  cost: number;
}

export interface ActionSwitchPlan {
  actionIndex: number;
  before: PlayerAction;
  after: SwitchAction;
  cost: number;
  spendBothCovers?: boolean;
}

export function isActionSwitchSkillId(skillId: string): skillId is ActionSwitchSkillId {
  return ACTION_SWITCH_SKILL_IDS.includes(skillId as ActionSwitchSkillId);
}

export function getActionSwitchChoicesForAction(
  skillId: string,
  current: PlayerAction,
  player?: PlayerState,
  attackTargets: readonly PlayerId[] = [],
  canOfferAttack: (cost: number) => boolean = () => true
): ActionSwitchChoice[] {
  if (skillId === getFusionSkillId("虚幻") && current.type === "defense") {
    const choices = current.defense === "small" || current.defense === "stone" ? ["youtiao"] :
      current.defense === "youtiao" ? ["small", "stone"] : [];
    const result: ActionSwitchChoice[] = choices.map((defense) => ({
      action: { type: "defense", defense: defense as DefenseAction["defense"] }, cost: 1
    }));
    if (player && choices.length && getActiveFusionCount(player, "玄•幻") > 0) {
      for (const attackId of ATTACK_ORDER) {
        const attack = BASE_ATTACKS[attackId];
        for (let stacks = 1; stacks <= MAX_ACTION_STACKS; stacks++) {
          const cost = 2 + getStackedAttackStats(attack, stacks).cost;
          if (!canOfferAttack(cost)) break;
          if (attack.isArea) result.push({ action: { type: "attack", attackId, stacks }, cost });
          else for (const targetId of attackTargets) result.push({ action: { type: "attack", attackId, stacks, targetId }, cost });
        }
      }
    }
    if (player && choices.length && getActiveFusionCount(player, "天•幻") > 0) {
      result.push({ action: { type: "gain_cake" }, cost: 2 });
      if (["1054", "1055"].every((id) => (getSkillUseLimit(player, id) ?? 0) >
        (player.buffs.find((buff) => buff.id === `skill_used:${id}`)?.stacks ?? 0)))
        result.push({ action: { type: "defense", defense: "rebound" }, cost: 0 });
    }
    return result;
  }
  if (skillId === "1087") {
    return getBasicDefenseSwitchChoices(current);
  }

  if (skillId === "1088") {
    return getFlexibleDefenseSwitchChoices(current);
  }

  if (skillId === "1089") {
    return getShaQinSwitchChoices(current).map((choice) => ({ ...choice,
      cost: player && getFusionEnhancementCount(player, skillId, ["杀级换", "火•杀•换"]) > 0 ? 0 : choice.cost }));
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

  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) return undefined;
  const requested = action.switchToAction;
  const targets = requested.type === "attack" && requested.targetId && state.players.some((target) => target.id === requested.targetId &&
    target.id !== playerId && target.status === "alive" && canAffectAcrossSpace(state, playerId, target.id) &&
    !preventsTargetSelection(target)) ? [requested.targetId] : [];
  const choice = getActionSwitchChoicesForAction(action.skillId, before, player, targets).find((item) =>
    sameSwitchAction(item.action, requested)
  );
  if (!choice) {
    return undefined;
  }
  const rebound = requested.type === "defense" && requested.defense === "rebound";
  if (rebound && (hasTianyeReboundLock(player, state.turnNumber) || !requested.targetId ||
    !state.players.some((target) => target.id === requested.targetId && target.status === "alive" &&
      canAffectAcrossSpace(state, playerId, target.id) &&
      (!preventsTargetSelection(target) || canBypassTargetSelection(state, playerId, target))))) return undefined;

  return {
    actionIndex,
    before,
    after: rebound ? requested : choice.action,
    ...(rebound ? { spendBothCovers: true } : {}),
    cost: discountCakeCost(state, player, choice.cost)
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
  if (!player || !validCakePayment(state, player, plan.cost, action.antiCakeSpent ?? 0, action.youkaiCakeSpent)) {
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
  left: SwitchAction,
  right: SwitchAction
): boolean {
  if (left.type !== right.type) {
    return false;
  }

  if (left.type === "defense" && right.type === "defense") {
    return left.defense === right.defense;
  }
  if (left.type === "gain_cake" && right.type === "gain_cake") return true;

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
import { discountCakeCost } from "./actionCosts";
