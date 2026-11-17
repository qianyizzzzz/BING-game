import { bigCardHasAbility } from "../bigCards/abilities";
import type { BigCardInstance } from "../bigCards/types";
import { getFusionSkillId, isFusionActive, reconcileSkillFusions } from "../skills/fusion";
import type { AttackStats, GameState, PlayerState, SkillAction } from "../types";
import {
  BLADE_DOUBLE_EDGE_ID, BLADE_INHERIT_ID, BLADE_MAINTENANCE_IDS, BLADE_QINGGANG_ID,
  BROKEN_BLADE_CARD_ID, BROKEN_BLADE_TIERS, brokenBladeGrants, getBrokenBlade, type BrokenBladeTier
} from "./brokenBladeIds";
import { attackPowerValue, compareCombatValues, getPointDamageDefeatLevel, INFINITY_VALUE,
  multiplyCombatValues, projectCombatValue, RETIRE_VALUE, withAttackPower } from "./combatValues";
import { createBaseEvent, getActiveSkillCount, isPlayerSkillSealed } from "./gameFactory";
import { grantInitializedSkill } from "./skillAcquisition";
import { removeSkillInstanceAt } from "./skillInventory";

const QINGGANG_PROTECTIONS = new Set(["1049", "1050", "1098", "1031"]);
const HEAVEN_SWORD_PROTECTIONS = new Set(["1113", "1025", "1054", "1055", "1102", "1084"]);

export function activeBrokenBlades(player: PlayerState | undefined): BigCardInstance[] {
  if (!player?.bigCards?.some((card) => card.cardId === BROKEN_BLADE_CARD_ID) || !getActiveSkillCount(player, BLADE_INHERIT_ID)) return [];
  return player.bigCards.filter((card) => card.cardId === BROKEN_BLADE_CARD_ID && !card.junengDisabled &&
    bigCardHasAbility(card, BLADE_INHERIT_ID));
}

function hasBrokenBladeGrant(player: PlayerState, card: BigCardInstance): boolean {
  const blade = getBrokenBlade(card);
  if (blade.tier === 0) return player.skillInventory?.some((entry) =>
    entry.skillId === BLADE_QINGGANG_ID && brokenBladeGrants(card).includes(entry.instanceId)) ?? false;
  return player.skillFusions?.some((fusion) => fusion.id === blade.fusionInstanceId && isFusionActive(player, fusion)) ?? false;
}

export function readyBrokenBlades(player: PlayerState | undefined, skillId = BLADE_QINGGANG_ID): BigCardInstance[] {
  if (!player) return [];
  const blades = activeBrokenBlades(player);
  if (!blades.length || !getActiveSkillCount(player, skillId)) return [];
  return blades.filter((card) => {
    const { tier, remaining } = getBrokenBlade(card);
    return remaining !== 0 && (skillId !== BLADE_DOUBLE_EDGE_ID || tier > 0) && hasBrokenBladeGrant(player, card);
  }).sort((a, b) => getBrokenBlade(b).tier - getBrokenBlade(a).tier);
}

export function getBrokenBladeDoubleEdge(player: PlayerState | undefined, preferredCardId?: string): BigCardInstance | undefined {
  const blades = readyBrokenBlades(player, BLADE_DOUBLE_EDGE_ID);
  return preferredCardId ? blades.find((card) => card.instanceId === preferredCardId) : blades[0];
}

export function selectBrokenBladeDoubleEdge(player: PlayerState, mode: SkillAction["doubleEdgeMode"], preferredCardId?: string): BigCardInstance | undefined {
  if (mode === "ignore_all_defense") return undefined;
  if (preferredCardId) return getBrokenBladeDoubleEdge(player, preferredCardId);
  const independent = mode === "pierce_rebound" ? player.skillFusions?.some((fusion) =>
    fusion.skillId === getFusionSkillId("破天圣剑") && isFusionActive(player, fusion) &&
    !player.bigCards?.some((card) => card.brokenBlade?.fusionInstanceId === fusion.id)) :
    getIndependentBrokenBladeSkillCount(player, BLADE_DOUBLE_EDGE_ID) > 0;
  return independent ? undefined : getBrokenBladeDoubleEdge(player);
}

export function getIndependentBrokenBladeSkillCount(player: PlayerState | undefined, skillId: string): number {
  return Math.max(0, getActiveSkillCount(player, skillId) - readyBrokenBlades(player, skillId).length);
}

export function getIndependentHeavenSwordCount(player: PlayerState): number {
  if (!player.skillFusions?.length || isPlayerSkillSealed(player, BLADE_QINGGANG_ID)) return 0;
  const tracked = new Set(player.bigCards?.flatMap((card) => card.brokenBlade?.fusionInstanceId ?? []));
  const skillId = getFusionSkillId("破天圣剑");
  return player.skillFusions.filter((fusion) => fusion.skillId === skillId && !tracked.has(fusion.id) &&
    fusion.materialSkillIds.includes(BLADE_QINGGANG_ID) &&
    isFusionActive(player, fusion)).length;
}

export function chooseBrokenBladeQinggang(player: PlayerState | undefined, protectionSkillIds: readonly string[],
  ignoresSwitch: boolean, ignoresInvulnerability: boolean, ordinaryProtectionIgnored: boolean,
  swordProtectionIgnored: boolean, heavenSwordSuppressed = false): BigCardInstance | undefined {
  const ordinaryProtection = !ordinaryProtectionIgnored && (ignoresSwitch ||
    protectionSkillIds.some((id) => QINGGANG_PROTECTIONS.has(id)));
  const enhancedProtection = !swordProtectionIgnored && !heavenSwordSuppressed &&
    protectionSkillIds.some((id) => HEAVEN_SWORD_PROTECTIONS.has(id));
  return readyBrokenBlades(player).find((card) => {
    const { tier } = getBrokenBlade(card);
    return ordinaryProtection && (!heavenSwordSuppressed || tier === 0) ||
      tier >= 1 && enhancedProtection || tier >= 2 && !heavenSwordSuppressed && ignoresInvulnerability;
  });
}

function maintenanceTier(skillId: string): BrokenBladeTier | undefined {
  const index = BLADE_MAINTENANCE_IDS.findIndex((id) => id === skillId || `${id}_reforge` === skillId);
  return index === -1 ? undefined : index as BrokenBladeTier;
}

export function canMaintainBrokenBlade(player: PlayerState | undefined, skillId: string, cardInstanceId?: string): boolean {
  return Boolean(maintenanceBlade(player, skillId, cardInstanceId));
}

function maintenanceBlade(player: PlayerState | undefined, skillId: string, cardInstanceId?: string): BigCardInstance | undefined {
  const tier = maintenanceTier(skillId);
  if (tier === undefined || !getActiveSkillCount(player, skillId.split("_")[0]!)) return undefined;
  if (!player) return undefined;
  return activeBrokenBlades(player).find((card) => (!cardInstanceId || card.instanceId === cardInstanceId) &&
    bigCardHasAbility(card, skillId) && getBrokenBlade(card).tier === tier && getBrokenBlade(card).remaining === 0 &&
    brokenBladeGrants(card).length > 0 && brokenBladeGrants(card).every((id) => player.skillInventory?.some((entry) => entry.instanceId === id)));
}

export function maintainBrokenBlade(state: GameState, player: PlayerState, skillId: string, cardInstanceId?: string): boolean {
  const card = maintenanceBlade(player, skillId, cardInstanceId);
  if (!card) return false;
  const blade = getBrokenBlade(card);
  const reforge = skillId.endsWith("_reforge");
  const tier = (blade.tier + Number(reforge)) as BrokenBladeTier;
  const definition = BROKEN_BLADE_TIERS[tier]!;
  if (reforge) {
    const existingFusion = player.skillFusions?.find((fusion) => fusion.id === blade.fusionInstanceId);
    if (existingFusion) {
      existingFusion.judgmentRank = definition.rank;
      card.brokenBlade = { ...blade, tier, remaining: definition.maxUses };
    } else {
      const inherited = new Set(brokenBladeGrants(card));
      for (let index = (player.skillInventory?.length ?? 0) - 1; index >= 0; index--) {
        if (inherited.has(player.skillInventory![index]!.instanceId)) removeSkillInstanceAt(player, index);
      }
      reconcileSkillFusions(player);
      const before = player.skillInventory?.length ?? 0;
      const fusionInstanceId = grantInitializedSkill(state, player.id, getFusionSkillId("破天圣剑"), definition.name, false, undefined, card.instanceId);
      (card.inheritedSkillInstances ??= {})[BLADE_INHERIT_ID] = (player.skillInventory ?? []).slice(before).map(({ instanceId }) => instanceId);
      const fusion = player.skillFusions?.find(({ id }) => id === fusionInstanceId);
      if (fusion) fusion.judgmentRank = definition.rank;
      card.brokenBlade = { tier, remaining: definition.maxUses, ...(fusionInstanceId ? { fusionInstanceId } : {}) };
    }
  } else {
    card.brokenBlade = { ...blade, remaining: definition.maxUses };
  }
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id,
    message: `${player.name} ${reforge ? "重铸为" : "修复了"}${definition.name}` });
  return true;
}

export function spendBrokenBladeUse(card: BigCardInstance): boolean {
  const blade = card.brokenBlade ??= getBrokenBlade(card);
  if (blade.remaining === null) return true;
  if (blade.remaining <= 0) return false;
  blade.remaining--;
  return true;
}

export function applyBrokenBladeQinggang(stats: AttackStats, tier: BrokenBladeTier): AttackStats {
  return { ...stats, traits: Array.from(new Set([...stats.traits, "ignore_protection"])),
    ...(tier >= 1 ? { ignoreSwordProtections: true } : {}),
    ...(tier >= 2 ? { pierceInvulnerability: true } : {}) };
}

export function amplifyBrokenBladeAttack(stats: AttackStats): AttackStats {
  if (stats.fixedPointPower || getPointDamageDefeatLevel(stats)) return stats;
  const power = attackPowerValue(stats);
  const retire = compareCombatValues(power, INFINITY_VALUE) === 0;
  const damageParts = stats.damageParts?.map((part, index) => {
    const value = stats.damagePartValues?.[index] ?? attackPowerValue({ power: part });
    return retire ? RETIRE_VALUE : multiplyCombatValues(value, INFINITY_VALUE);
  });
  const amplified = withAttackPower(stats, retire ? RETIRE_VALUE : multiplyCombatValues(power, INFINITY_VALUE));
  return { ...amplified, ...(retire ? { fixedPointPower: true, traits: [...amplified.traits, "defeat_retire"] } : {}),
    ...(damageParts ? { damageParts: damageParts.map(projectCombatValue), damagePartValues: damageParts } : {}) };
}
