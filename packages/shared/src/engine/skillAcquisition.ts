import { GameState, PlayerState, SkillAction, SkillFusionState, SkillId } from "../types";
import { FUSION_RECIPES, getEnhancedChildFusionIds, getFusionRecipe, getFusionSkillId, getFusionTier, getNextWitherSelectionIndex, isFusionActive, reconcileSkillFusions } from "../skills/fusion";
import { getSmallSkillIds, getSkill } from "../skills/registry";
import { alivePlayers, createBaseEvent, createId, findPlayer, revealSkillToAll, revealSkillOnUse, recordSkillUsed } from "./gameFactory";
import { appendSkillInstances, ensureFusionSkillInventory, replaceSkillInstanceAt } from "./skillInventory";
import { MORE_TRIES_ID, SLOT_MACHINE_ID, VERDICT_INHERIT_ID, bigCardHasAbility } from "../bigCards/abilities";

export const SAND_SKILL_ID = "skill_4_65637";
export const MIRROR_SKILL_ID = "skill_101_4254";
export const AGAIN_SKILL_ID = "skill_3_56718";
export const UNCLE_SKILL_IDS = ["skill_81_59663", "skill_82_45540", "skill_83_32356", "skill_84_6114"];

export function initializeFusionAcquisition(player: PlayerState, fusion: SkillFusionState): void {
  if (fusion.skillId === SLOT_MACHINE_ID) {
    fusion.rerollCompletedSlotIds = [];
    return;
  }
  if (fusion.skillId === MORE_TRIES_ID) {
    const extras = appendSkillInstances(player, [AGAIN_SKILL_ID, AGAIN_SKILL_ID], fusion.sourceBigCardInstanceId);
    const slots = [...fusion.materialInstanceIds!, ...extras];
    const children: SkillFusionState[] = [slots.slice(0, 3), slots.slice(3)].map((materialInstanceIds) => ({
      id: createId("fusion_instance"), skillId: SLOT_MACHINE_ID, materialSkillIds: materialInstanceIds.map(() => AGAIN_SKILL_ID),
      materialInstanceIds, rerollCompletedSlotIds: [], ...(fusion.sourceBigCardInstanceId ? { sourceBigCardInstanceId: fusion.sourceBigCardInstanceId } : {})
    }));
    const ledger = player.skillFusions ??= [];
    const index = ledger.indexOf(fusion);
    ledger.splice(index < 0 ? ledger.length : index, 0, ...children);
    fusion.materialSkillIds = children.map((child) => child.skillId);
    fusion.materialFusionIds = children.map((child) => child.id);
    fusion.materialInstanceIds = [];
    fusion.slotMachineExtraInstanceIds = extras;
    return;
  }
  const name = getFusionRecipe(fusion.skillId)?.skill.name;
  if (name === "猥琐大叔叔") {
    const bonusSkillId = UNCLE_SKILL_IDS.find((id) => !fusion.materialSkillIds.includes(id))!;
    const [bonusSkillInstanceId] = appendSkillInstances(player, [bonusSkillId], fusion.sourceBigCardInstanceId);
    fusion.acquisition = { smallUsed: false, fusionUsed: false, bonusSkillId, bonusSkillInstanceId: bonusSkillInstanceId! };
    return;
  }
  if (!["沙皇", "天魔舞", "猥琐小叔叔"].includes(name ?? "")) return;
  const used = player.buffs.find((buff) => buff.id === `skill_used:${MIRROR_SKILL_ID}`)?.stacks ?? 0;
  const reserved = (player.skillFusions ?? []).filter((other) => other.id !== fusion.id &&
    getFusionRecipe(other.skillId)?.skill.name === "天魔舞" && !other.acquisition?.mirrorMaterialUsed).length;
  const spent = name === "天魔舞" && player.skills.filter((id) => id === MIRROR_SKILL_ID).length <= used + reserved;
  fusion.acquisition = { smallUsed: spent, fusionUsed: spent, mirrorMaterialUsed: spent, smallUseRecorded: spent };
}

export function getReadySlotMachines(player: PlayerState): SkillFusionState[] {
  return (player.skillFusions ?? []).filter((fusion) => fusion.skillId === SLOT_MACHINE_ID && isFusionActive(player, fusion) &&
    fusion.rerollCompletedSlotIds?.length === 3 && new Set(fusion.materialInstanceIds?.map((id) =>
      player.skillInventory?.find((entry) => entry.instanceId === id)?.skillId)).size > 1);
}

export function getSlotMachineSpin(player: PlayerState): { fusion: SkillFusionState; index: number; id: string } | undefined {
  for (const fusion of player.skillFusions ?? []) {
    if (fusion.skillId !== SLOT_MACHINE_ID || !isFusionActive(player, fusion) || !fusion.rerollCompletedSlotIds) continue;
    const id = fusion.materialInstanceIds?.find((candidate) => !fusion.rerollCompletedSlotIds!.includes(candidate));
    const index = id ? player.skillInventory?.findIndex((entry) => entry.instanceId === id) ?? -1 : -1;
    if (id && index >= 0) return { fusion, index, id };
  }
}

export function resetSlotMachine(state: GameState, player: PlayerState, fusionId?: string): void {
  const ready = getReadySlotMachines(player);
  const fusion = fusionId ? ready.find((item) => item.id === fusionId) : ready.length === 1 ? ready[0] : undefined;
  if (!fusion) return;
  for (const id of fusion.materialInstanceIds ?? []) {
    const index = player.skillInventory!.findIndex((item) => item.instanceId === id);
    if (index >= 0) replaceSkillInstanceAt(player, index, AGAIN_SKILL_ID);
  }
  fusion.rerollCompletedSlotIds = [];
  reconcileSkillFusions(player);
  player.revealedSkillIds = player.revealedSkillIds.filter((id) => player.skills.includes(id) || player.skillFusions?.some((item) => item.skillId === id));
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id, message: "老虎机已还原这组三份再来一次" });
}

export function getReadyAcquisitionFusion(player: PlayerState, skillId: SkillId): SkillFusionState | undefined {
  const name = skillId === SAND_SKILL_ID ? "沙皇" : skillId === MIRROR_SKILL_ID ? "天魔舞" : getFusionRecipe(skillId)?.skill.name;
  return player.skillFusions?.find((fusion) => getFusionRecipe(fusion.skillId)?.skill.name === name && isFusionActive(player, fusion) &&
    (skillId === SAND_SKILL_ID || skillId === MIRROR_SKILL_ID ? !fusion.acquisition?.smallUsed :
      name === "猥琐小叔叔" ? !fusion.acquisition?.bonusSkillId : !fusion.acquisition?.fusionUsed));
}

export function getAcquisitionSkillChoices(player: PlayerState, skillId: SkillId): SkillId[] {
  if (skillId === getFusionSkillId("沙皇")) return FUSION_RECIPES.filter((recipe) =>
    getFusionTier(recipe.skill.id) === 2 && recipe.skill.id !== skillId).map((recipe) => recipe.skill.id);
  if (skillId === getFusionSkillId("猥琐小叔叔")) {
    const fusion = getReadyAcquisitionFusion(player, skillId);
    return fusion ? UNCLE_SKILL_IDS.filter((id) => !fusion.materialSkillIds.includes(id)) : [];
  }
  return getSmallSkillIds();
}

/** Copy effects and fresh capacity, never the other player's cooldowns, marks, seals or usage ledger. */
export function grantInitializedSkill(state: GameState, playerId: string, skillId: SkillId, reason: string, expose = true,
  copiedMaterials?: SkillId[], sourceBigCardInstanceId?: string): string | undefined {
  const player = findPlayer(state, playerId)!;
  const recipe = getFusionRecipe(skillId);
  if (recipe) {
    const materials = [...(copiedMaterials ?? recipe.materialOptions[0]!)];
    if (getFusionTier(skillId) > 2) ensureFusionSkillInventory(player);
    const materialFusionIds = materials.filter((id) => getFusionRecipe(id)).map((id) =>
      grantInitializedSkill(state, playerId, id, reason, false, undefined, sourceBigCardInstanceId)!);
    const instanceIds = appendSkillInstances(player, materials.filter((id) => !getFusionRecipe(id)), sourceBigCardInstanceId);
    const fusion: SkillFusionState = { id: createId("fusion_instance"), skillId, materialSkillIds: materials,
      ...(recipe.skill.name === "枯萎" ? { witherSelectionIndex: getNextWitherSelectionIndex(player) } : {}),
      ...(player.skillInventory ? { materialInstanceIds: instanceIds } : {}),
      ...(materialFusionIds.length ? { materialFusionIds } : {}),
      ...(sourceBigCardInstanceId ? { sourceBigCardInstanceId } : {}) };
    initializeFusionAcquisition(player, fusion);
    (player.skillFusions ??= []).push(fusion);
    if (expose) revealSkillToAll(state, playerId, skillId, reason);
    return fusion.id;
  } else appendSkillInstances(player, [skillId], sourceBigCardInstanceId);
  if (expose) revealSkillToAll(state, playerId, skillId, reason);
}

/** True for a handled acquisition, "duplicate" for a consumed sand that must retire its owner. */
export function resolveFusionAcquisition(state: GameState, playerId: string, action: SkillAction): boolean | "duplicate" {
  const player = findPlayer(state, playerId)!;
  const fusion = getReadyAcquisitionFusion(player, action.skillId);
  if (!fusion || !action.targetSkillId) return false;
  const name = getFusionRecipe(fusion.skillId)!.skill.name;
  if (!["沙皇", "天魔舞", "猥琐小叔叔"].includes(name)) return false;
  const acquisition = fusion.acquisition ??= { smallUsed: false, fusionUsed: false };
  const small = action.skillId === SAND_SKILL_ID || action.skillId === MIRROR_SKILL_ID;
  if (small) acquisition.smallUsed = true;
  else acquisition.fusionUsed = true;
  if (!small && (name === "沙皇" || name === "天魔舞")) {
    const material = name === "沙皇" ? SAND_SKILL_ID : MIRROR_SKILL_ID;
    revealSkillOnUse(state, playerId, material, "使用强化子技能");
    recordSkillUsed(state, playerId, material, "使用强化子技能");
  }
  if (name === "沙皇") {
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${player.name} 声明沙子变化为 ${getSkill(action.targetSkillId)?.name ?? action.targetSkillId}` });
    const holders = alivePlayers(state).filter((other) => other.skills.includes(action.targetSkillId!) ||
      other.skillFusions?.some((owned) => owned.skillId === action.targetSkillId));
    const enhancedSand = getEnhancedChildFusionIds(player, "抠皇", getFusionSkillId("沙皇"));
    const verdictSand = player.bigCards?.some((card) => card.instanceId === fusion.sourceBigCardInstanceId && bigCardHasAbility(card, VERDICT_INHERIT_ID));
    if (holders.length && !enhancedSand.has(fusion.id) && !verdictSand) {
      for (const holder of holders) revealSkillToAll(state, holder.id, action.targetSkillId, "沙子检测");
      return "duplicate";
    }
  }
  if (name === "天魔舞" && !small && !acquisition.mirrorMaterialUsed) {
    acquisition.mirrorMaterialUsed = true;
    const ledger = player.buffs.find((buff) => buff.id === `skill_used:${MIRROR_SKILL_ID}`);
    if (ledger) ledger.stacks++;
    else player.buffs.push({ id: `skill_used:${MIRROR_SKILL_ID}`, name: "技能使用次数", stacks: 1 });
  }
  if (name === "猥琐小叔叔") acquisition.bonusSkillId = action.targetSkillId;
  const copiedMaterials = name === "天魔舞" && action.targetId ? findPlayer(state, action.targetId)?.skillFusions
    ?.find((other) => other.skillId === action.targetSkillId)?.materialSkillIds : undefined;
  grantInitializedSkill(state, playerId, action.targetSkillId, name === "天魔舞" ? "镜像法术复制" : "沙子变化", name !== "猥琐小叔叔", copiedMaterials);
  return true;
}
