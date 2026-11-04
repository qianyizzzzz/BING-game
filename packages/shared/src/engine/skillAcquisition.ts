import { GameState, PlayerState, SkillAction, SkillFusionState, SkillId } from "../types";
import { FUSION_RECIPES, getFusionRecipe, getFusionSkillId, getNextWitherSelectionIndex, isFusionActive } from "../skills/fusion";
import { getSmallSkillIds, getSkill } from "../skills/registry";
import { alivePlayers, createBaseEvent, createId, findPlayer, revealSkillToAll, revealSkillOnUse, recordSkillUsed } from "./gameFactory";

export const SAND_SKILL_ID = "skill_4_65637";
export const MIRROR_SKILL_ID = "skill_101_4254";
export const UNCLE_SKILL_IDS = ["skill_81_59663", "skill_82_45540", "skill_83_32356", "skill_84_6114"];

export function initializeFusionAcquisition(player: PlayerState, fusion: SkillFusionState): void {
  const name = getFusionRecipe(fusion.skillId)?.skill.name;
  if (!["沙皇", "天魔舞", "猥琐小叔叔"].includes(name ?? "")) return;
  const used = player.buffs.find((buff) => buff.id === `skill_used:${MIRROR_SKILL_ID}`)?.stacks ?? 0;
  const reserved = (player.skillFusions ?? []).filter((other) => other.id !== fusion.id &&
    getFusionRecipe(other.skillId)?.skill.name === "天魔舞" && !other.acquisition?.mirrorMaterialUsed).length;
  const spent = name === "天魔舞" && player.skills.filter((id) => id === MIRROR_SKILL_ID).length <= used + reserved;
  fusion.acquisition = { smallUsed: spent, fusionUsed: spent, mirrorMaterialUsed: spent, smallUseRecorded: spent };
}

export function getReadyAcquisitionFusion(player: PlayerState, skillId: SkillId): SkillFusionState | undefined {
  const name = skillId === SAND_SKILL_ID ? "沙皇" : skillId === MIRROR_SKILL_ID ? "天魔舞" : getFusionRecipe(skillId)?.skill.name;
  return player.skillFusions?.find((fusion) => getFusionRecipe(fusion.skillId)?.skill.name === name && isFusionActive(player, fusion) &&
    (skillId === SAND_SKILL_ID || skillId === MIRROR_SKILL_ID ? !fusion.acquisition?.smallUsed :
      name === "猥琐小叔叔" ? !fusion.acquisition?.bonusSkillId : !fusion.acquisition?.fusionUsed));
}

export function getAcquisitionSkillChoices(player: PlayerState, skillId: SkillId): SkillId[] {
  if (skillId === getFusionSkillId("沙皇")) return FUSION_RECIPES.filter((recipe) => recipe.skill.id !== skillId).map((recipe) => recipe.skill.id);
  if (skillId === getFusionSkillId("猥琐小叔叔")) {
    const fusion = getReadyAcquisitionFusion(player, skillId);
    return fusion ? UNCLE_SKILL_IDS.filter((id) => !fusion.materialSkillIds.includes(id)) : [];
  }
  return getSmallSkillIds();
}

/** Copy effects and fresh capacity, never the other player's cooldowns, marks, seals or usage ledger. */
export function grantInitializedSkill(state: GameState, playerId: string, skillId: SkillId, reason: string, expose = true,
  copiedMaterials?: [SkillId, SkillId]): void {
  const player = findPlayer(state, playerId)!;
  const recipe = getFusionRecipe(skillId);
  if (recipe) {
    const materials = [...(copiedMaterials ?? recipe.materialOptions[0]!)] as [SkillId, SkillId];
    player.skills.push(...materials);
    const fusion: SkillFusionState = { id: createId("fusion_instance"), skillId, materialSkillIds: materials,
      ...(recipe.skill.name === "枯萎" ? { witherSelectionIndex: getNextWitherSelectionIndex(player) } : {}) };
    initializeFusionAcquisition(player, fusion);
    (player.skillFusions ??= []).push(fusion);
  } else player.skills.push(skillId);
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
    if (holders.length) {
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
