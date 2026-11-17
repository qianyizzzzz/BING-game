import { ASURA_FERRY_ID, ASURA_INHERIT_ID, ASURA_RITUAL_UPGRADE_ID, ASURA_SWORD_ID, BIG_CARD_SKILLS, BLOOD_RITUAL_FUSION_ID,
  bigCardHasAbility } from "../bigCards/abilities";
import type { BuffState, PlayerState } from "../types";
import { addCombatValues, combatValue, compareCombatValues, fromLegacyCombatStat, isUnboundedCombatValue, projectCombatValue,
  roundCombatValue, scaleCombatValue, subtractCombatValues, type CombatValue } from "./combatValues";

export const BLOOD_QI = "asura_blood_qi";
export const ASURA_BARRIER_USES = "asura_barrier_uses";
export const ASURA_BLOOD_PROGRESS = "asura_blood_progress";
export const ASURA_BLOOD_HEAL = "asura_blood_heal";
export const ASURA_FERRY = "asura_ferry";
export const ASURA_SWORD_GUARD = "asura_sword_guard";
export const ASURA_SACRIFICE = "asura_sacrifice";
export const ASURA_RITUAL_UPGRADE = "asura_ritual_upgrade";
export const ASURA_BARRIER_SKILL_ID = "1047";

type BloodOwner = { buffs?: readonly { id: string; stacks?: number; resourceValue?: CombatValue }[] };

export function getBloodQi(player: BloodOwner | undefined): CombatValue {
  const buff = player?.buffs?.find((item) => item.id === BLOOD_QI);
  return buff?.resourceValue ?? fromLegacyCombatStat(buff?.stacks ?? 0);
}

export function hasBloodQi(player: BloodOwner | undefined, amount: number): boolean {
  return compareCombatValues(getBloodQi(player), combatValue(amount)) >= 0;
}

export function bloodQiNumber(player: BloodOwner | undefined): number {
  const qi = getBloodQi(player);
  return isUnboundedCombatValue(qi) ? Number.MAX_SAFE_INTEGER : projectCombatValue(qi);
}

function putValue(player: PlayerState, id: string, name: string, value: CombatValue): void {
  player.buffs = player.buffs.filter((buff) => buff.id !== id);
  if (compareCombatValues(value, []) > 0) player.buffs.push({ id, name, stacks: Math.max(1, projectCombatValue(value)), resourceValue: value });
}

export function changeBloodQi(player: PlayerState, amount: number | CombatValue): void {
  const delta = typeof amount === "number" ? combatValue(amount) : amount;
  if (compareCombatValues(delta, []) > 0 && hasTalisman(player, "wood")) return;
  putValue(player, BLOOD_QI, "血气", addCombatValues(getBloodQi(player), delta));
}

export function spendBloodQi(player: PlayerState, amount: CombatValue): void {
  if (compareCombatValues(amount, []) <= 0) return;
  putValue(player, BLOOD_QI, "血气", subtractCombatValues(getBloodQi(player), amount));
  const previous = player.buffs.find((buff) => buff.id === ASURA_BLOOD_PROGRESS);
  const total = addCombatValues(previous?.resourceValue ?? [], amount);
  const gained = roundCombatValue(scaleCombatValue(total, 1 / 5), Math.floor);
  putValue(player, ASURA_BLOOD_PROGRESS, "血气消耗进度", subtractCombatValues(total, scaleCombatValue(gained, 5)));
  const recovery = player.buffs.find((buff) => buff.id === ASURA_BLOOD_HEAL);
  putValue(player, ASURA_BLOOD_HEAL, "血气·回血", addCombatValues(recovery?.resourceValue ?? [], gained));
}

export function asuraBarrierUses(player: BloodOwner | undefined): number {
  return player?.buffs?.find((buff) => buff.id === ASURA_BARRIER_USES)?.stacks ?? 0;
}

export function changeAsuraBarrierUses(player: PlayerState, delta: number): void {
  const next = asuraBarrierUses(player) + delta;
  player.buffs = player.buffs.filter((buff) => buff.id !== ASURA_BARRIER_USES);
  if (next > 0) player.buffs.push({ id: ASURA_BARRIER_USES, name: "血雨腥风·额外血水屏障", stacks: next });
}

export function bloodQiCost(skillId: string, selectedAmount?: number): number {
  if (skillId === ASURA_FERRY_ID) return selectedAmount ?? 0;
  return BIG_CARD_SKILLS[skillId]?.play?.bloodQiCost ?? 0;
}

export function getSkillBloodQiCosts(skillId: string, stacks: number, selectedAmount?: number) {
  const cost = bloodQiCost(skillId, selectedAmount) * stacks;
  return { cost, minimum: Math.max(cost, skillId === ASURA_SWORD_ID ? 50 : 0) };
}

export function isAsuraAnytimeSkill(skillId: string): boolean {
  return skillId === ASURA_RITUAL_UPGRADE_ID || skillId === BLOOD_RITUAL_FUSION_ID;
}

export function asuraInheritanceCopies(player: { bigCards?: PlayerState["bigCards"] }, storedQuota = false): number {
  return player.bigCards?.filter((card) => (storedQuota || !card.junengDisabled) && bigCardHasAbility(card, ASURA_INHERIT_ID, storedQuota)).length ?? 0;
}

export function addAsuraBuff(player: PlayerState, buff: BuffState): void {
  player.buffs = player.buffs.filter((entry) => entry.id !== buff.id);
  player.buffs.push(buff);
}

import { hasTalisman } from "./talismanRules";
