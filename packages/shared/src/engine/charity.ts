import { bigCardHasAbility, CHARITY_DESTINY_ID, CHARITY_GRANT_ID, CHARITY_LINK_ID, CHARITY_QUICK_ID, HEALING_ART_ID } from "../bigCards/abilities";
import type { GameState, PlayerId, PlayerState, SkillAction } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import { isSkillIgnored } from "./skillIgnore";
import { hasContinuationBlock } from "./hunyao";
import { canRecoverEmptyCity } from "./illusionRules";
import { getSkillUseLimit } from "../skills/registry";
import { canAffectAcrossSpace } from "./spaces";
import { RETIRE_VALUE } from "./combatValues";
import { CHARITY_GROUP, registerStateDefinition } from "./effectCategories";

export const CHARITY_QUICK_LIMIT = 5;
registerStateDefinition({ id: CHARITY_GROUP, name: "献身慈爱", categories: ["positive"] });

export function remainingCharityHealingUses(card: NonNullable<PlayerState["bigCards"]>[number]): number {
  return Math.max(0, 1 + (card.charityHealingRefunds ?? 0) - (card.grantedSkillUses?.[HEALING_ART_ID] ?? 0));
}

export function hasCharityDestiny(player: PlayerState | undefined): boolean {
  return getActiveSkillCount(player, CHARITY_DESTINY_ID) > 0;
}

export function hasCharityHealingUses(player: PlayerState): boolean {
  return getActiveSkillCount(player, HEALING_ART_ID) > 0 &&
    (player.buffs.find(({ id }) => id === `skill_used:${HEALING_ART_ID}`)?.stacks ?? 0) < (getSkillUseLimit(player, HEALING_ART_ID) ?? 0);
}

export function charityHealingRank(player: PlayerState, round: number): 1 | 2 | 3 {
  if (getActiveSkillCount(player, CHARITY_LINK_ID) && player.buffs.some((buff) =>
    buff.stateType === CHARITY_GROUP && (buff.expiresAtRound ?? 0) > round)) return 3;
  return readyCharityHealingCard(player) ? 2 : 1;
}

export function canUseCharityExitHealing(state: GameState, player: PlayerState | undefined): boolean {
  return Boolean(player?.status === "dead" && (player.defeatLevel === 2 || player.defeatLevel === 3) &&
    hasCharityHealingUses(player) && charityHealingRank(player, state.roundNumber) >= player.defeatLevel &&
    !player.defeatBlocksRevival && canRecoverEmptyCity(player, player, HEALING_ART_ID) &&
    !hasContinuationBlock(state, player, "revival", "none"));
}

export function quickHealingCard(player: PlayerState, action: Pick<SkillAction, "bigCardInstanceId">, round: number) {
  return player.bigCards?.find((card) => !card.junengDisabled && bigCardHasAbility(card, CHARITY_QUICK_ID) &&
    (!action.bigCardInstanceId || card.instanceId === action.bigCardInstanceId) &&
    (card.charityQuickUses?.round !== round || card.charityQuickUses.count < CHARITY_QUICK_LIMIT));
}

export function getQuickHealingTargets(state: Pick<GameState, "players" | "smallSpaces">, sourceId: PlayerId): PlayerState[] {
  return state.players.filter((target) => target.id !== sourceId && target.status === "alive" &&
    target.lastSettledDamage && !target.buffs.some(({ id }) => id === "pending_death" || id === "direct_non_damage_death") &&
    canAffectAcrossSpace(state, sourceId, target.id));
}

export function quickHealingAmount(target: PlayerState) {
  const injury = target.lastSettledDamage!;
  return (injury.pointDefeatLevel ?? 1) >= 2 ? RETIRE_VALUE : injury.amount;
}

export function charityHealingPartners(state: GameState, targetId: PlayerId): PlayerState[] {
  const group = new Set(state.players.flatMap((owner) => owner.status === "alive" && getActiveSkillCount(owner, CHARITY_LINK_ID) ?
    owner.buffs.filter((buff) => buff.stateType === CHARITY_GROUP && (buff.expiresAtRound ?? 0) > state.roundNumber &&
      buff.charityGroup?.includes(targetId)).flatMap((buff) => buff.charityGroup ?? []) : []));
  return state.players.filter((player) => player.id !== targetId && player.status === "alive" && group.has(player.id) &&
    !player.buffs.some(({ id }) => id === "pending_death") && canAffectAcrossSpace(state, targetId, player.id));
}

export function readyCharityHealingCard(player: PlayerState) {
  if (!getActiveSkillCount(player, CHARITY_GRANT_ID) || !getActiveSkillCount(player, HEALING_ART_ID)) return undefined;
  return player.bigCards?.find((card) => !card.junengDisabled && bigCardHasAbility(card, CHARITY_GRANT_ID) &&
    !isSkillIgnored(player, CHARITY_GRANT_ID) && remainingCharityHealingUses(card) > 0 &&
    player.skillInventory?.some((entry) => entry.sourceBigCardInstanceId === card.instanceId && entry.skillId === HEALING_ART_ID));
}
