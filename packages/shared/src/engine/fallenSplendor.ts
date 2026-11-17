import type { BigCardInstance } from "../bigCards/types";
import { bigCardAbilityCanActivate, bigCardHasAbility } from "../bigCards/abilities";
import { getFusionSkillId, reconcileSkillFusions } from "../skills/fusion";
import type { GameState, PlayerState, SkillId } from "../types";
import {
  FALLEN_SPLENDOR_CARD_ID, FALLEN_SPLENDOR_EXECUTION, FALLEN_SPLENDOR_EXECUTION_STATE, FALLEN_SPLENDOR_HEALING,
  FALLEN_SPLENDOR_REBIRTH_STAGES
} from "./fallenSplendorIds";
import { grantInitializedSkill } from "./skillAcquisition";
import { removeSkillInstanceAt } from "./skillInventory";

const HEAL = "1063";
const LAMENT = "1067";
const grants: Partial<Record<SkillId, readonly string[]>> = {
  "1060402": ["天空之城", "将进酒"],
  "1060403": ["1066", "虚幻", "空之轨迹"],
  "1060405": ["绝对天盾", "六转生死阵"],
  "1060406": ["冰火两仪眼", "起源弹", "1101", "终结"],
  "1060407": ["神圣禁域", "不死", "长生", "弑神", "三元协奏曲", "天•幻", "玄•幻"]
};

export function grantFallenSplendorSkill(state: GameState, player: PlayerState, card: BigCardInstance,
  abilityId: SkillId, name: string): void {
  const id = /^\d+$/.test(name) ? name : getFusionSkillId(name);
  const before = player.skillInventory?.length ?? 0;
  const fusionId = grantInitializedSkill(state, player.id, id, "陨落天华", false, undefined, card.instanceId);
  const newItems = (player.skillInventory ?? []).slice(before).map(({ instanceId }) => instanceId);
  const inherited = card.inheritedSkillInstances ??= {};
  (inherited[abilityId] ??= []).push(...newItems);
  if (abilityId === "1060407" && fusionId) {
    const fusion = player.skillFusions?.find(({ id }) => id === fusionId);
    if (fusion) fusion.judgmentRank = "VI";
  }
}

export function prepareFallenSplendor(state: GameState, player: PlayerState, card: BigCardInstance): SkillId[] {
  if (card.cardId !== FALLEN_SPLENDOR_CARD_ID) return [];
  const applied = card.fallenSplendorAppliedStages ??= [];
  const unlocked = [FALLEN_SPLENDOR_HEALING, ...FALLEN_SPLENDOR_REBIRTH_STAGES].filter((id) =>
    !applied.includes(id) && bigCardHasAbility(card, id) && bigCardAbilityCanActivate(card, id));
  for (const id of unlocked) {
    applied.push(id);
    if (id === FALLEN_SPLENDOR_HEALING) {
      for (let i = 0; i < 7; i++) grantFallenSplendorSkill(state, player, card, id, HEAL);
    }
    for (const grant of grants[id] ?? []) grantFallenSplendorSkill(state, player, card, id, grant);
    if (id === FALLEN_SPLENDOR_EXECUTION) {
      player.buffs.push({ id: `${FALLEN_SPLENDOR_EXECUTION_STATE}:${card.instanceId}`, stateType: FALLEN_SPLENDOR_EXECUTION_STATE,
        name: "陨落天华·必杀机会", stacks: 1, sourceBigCardInstanceId: card.instanceId, sourceAbilityId: id });
    }
  }
  return unlocked;
}

export function fallenSplendorHealingRemaining(player: Pick<PlayerState, "skillInventory">, card: BigCardInstance): number {
  return Math.max(0, (player.skillInventory?.filter(({ sourceBigCardInstanceId, skillId }) =>
    sourceBigCardInstanceId === card.instanceId && skillId === HEAL).length ?? 0) - (card.grantedSkillUses?.[HEAL] ?? 0));
}

export function convertFallenSplendorHealing(state: GameState, player: PlayerState, card: BigCardInstance): void {
  if (!fallenSplendorHealingRemaining(player, card)) return;
  const index = player.skillInventory!.map(({ sourceBigCardInstanceId, skillId }) =>
    sourceBigCardInstanceId === card.instanceId && skillId === HEAL).lastIndexOf(true);
  removeSkillInstanceAt(player, index);
  grantFallenSplendorSkill(state, player, card, FALLEN_SPLENDOR_HEALING, LAMENT);
  reconcileSkillFusions(player);
}

export function fallenSplendorExecutionStock(player: Pick<PlayerState, "buffs">, instanceId?: string) {
  return player.buffs.find((buff) => buff.stateType === FALLEN_SPLENDOR_EXECUTION_STATE && buff.stacks > 0 &&
    (!instanceId || buff.sourceBigCardInstanceId === instanceId));
}

export function fallenSplendorTargets(state: Pick<GameState, "players">, player: Pick<PlayerState, "id" | "spaceId">): string[] {
  return state.players.filter((target) => target.id !== player.id && target.status === "alive" &&
    target.spaceId === player.spaceId && !target.summon && !target.emptyCityOwnerId).map(({ id }) => id);
}
