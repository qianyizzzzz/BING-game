import { GameState, PlayerId, SkillAction, SkillId, ValidationResult } from "../types";
import { getActionWindowSeconds, cloneGameState, createBaseEvent, createId, findPlayer, queueZhuRiOpeningChoices } from "./gameFactory";
import { clearFusionMarks, COMMON_FUSION_SKILL_ID, FUSION_CAKE_COST, getFusionMaterialSelection,
  getFusionRecipe, getFusionTier, getRootFusions, isFusionImplemented, isFusionPreparation, reconcileSkillFusions } from "../skills/fusion";
import { getNextWitherSelectionIndex, isValidWitherNumber } from "../skills/fusion";
import { initializeFusionAcquisition } from "./skillAcquisition";
import { ensureFusionSkillInventory, removeSkillInstanceAt } from "./skillInventory";
import { revealSkillForExposureTiming } from "./gameFactory";
import { getSkill } from "../skills/registry";

export function chooseWitherNumber(state: GameState, playerId: PlayerId, selectionIndex: number, value: number): GameState {
  if (!isFusionPreparation(state)) throw new Error("枯萎只能在开局准备阶段选数");
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") throw new Error("只有存活玩家可以选数");
  if (state.actionWindowPassPlayerIds.includes(playerId)) throw new Error("你已经结束开局准备");
  const capacity = Math.max(1, Math.floor(player.skills.length / 2), ...(player.skillFusions ?? []).map((fusion) =>
    (fusion.witherSelectionIndex ?? 0) + 1));
  if (!Number.isSafeInteger(selectionIndex) || selectionIndex < 0 || selectionIndex >= capacity) throw new Error("枯萎选择位置无效");
  if (!isValidWitherNumber(value)) throw new Error("请选择有效的正整数");
  const next = cloneGameState(state);
  const owner = findPlayer(next, playerId)!;
  owner.witherSelections ??= [];
  while (owner.witherSelections.length <= selectionIndex) owner.witherSelections.push(1);
  owner.witherSelections[selectionIndex] = value;
  next.eventLog.push({ ...createBaseEvent(next, "system"), type: "system", privatePlayerId: playerId,
    message: `第${selectionIndex + 1}份枯萎开局选数：${value}（开局准备结束后锁定）` });
  next.actionWindowMode = "active";
  if (!next.actionWindowPlayerIds.includes(playerId)) next.actionWindowPlayerIds.push(playerId);
  next.actionWindowDeadlineAt = Math.max(next.actionWindowDeadlineAt ?? 0, Date.now() + getActionWindowSeconds(next) * 1000);
  next.updatedAt = Date.now();
  return next;
}

export function validateFusionAction(state: GameState, playerId: PlayerId, action: SkillAction): ValidationResult {
  const fail = (error: string): ValidationResult => ({ ok: false, error });
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") return fail("只有存活玩家可以融合技能");
  if (typeof action.fusionRequestId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(action.fusionRequestId)) return fail("融合请求标识无效");
  if (player.fusionRequestIds?.includes(action.fusionRequestId)) return fail("这次融合请求已经处理，请勿重复提交");
  if (action.skillId !== COMMON_FUSION_SKILL_ID || action.stacks !== 1) return fail("融合必须作为一次独立出招使用");
  if (isFusionPreparation(state)) {
    if (state.actionWindowPassPlayerIds.includes(playerId)) return fail("你已经结束开局准备");
  } else {
    if (state.phase !== "collecting_actions") return fail("当前不能融合：请在开局准备或出招阶段使用");
    if (player.cakes < FUSION_CAKE_COST) return fail("融合需要2饼");
  }
  if (!action.targetSkillId || !getFusionRecipe(action.targetSkillId)) return fail("请选择有效的融合配方");
  if (!isFusionImplemented(action.targetSkillId)) return fail("这个融合技能的效果尚未开放");
  if (getFusionRecipe(action.targetSkillId)?.skill.name === "猥琐小叔叔" && !isFusionPreparation(state)) return fail("猥琐小叔叔只能在开局准备阶段融合并选择技能");
  if (!getFusionMaterialSelection(player, action.targetSkillId, action.materialSkillIds, action.fusionMaterialInstanceIds))
    return fail("融合素材不足、已被覆盖或与配方不符");
  return { ok: true };
}

/** Mutates an already-cloned settlement state, after the ordinary action cost is paid. */
export function applySkillFusion(state: GameState, playerId: PlayerId, skillId: SkillId,
  selected?: SkillId[], requestId?: string, instanceIds?: string[]): void {
  const player = findPlayer(state, playerId);
  const recipe = getFusionRecipe(skillId);
  const materials = player && getFusionMaterialSelection(player, skillId, selected, instanceIds);
  if (!player || !recipe || !materials || !isFusionImplemented(skillId)) throw new Error("当前无法完成该融合");
  player.skillFusions ??= [];
  if (recipe.skill.name === "冰火狂暴曲") {
    player.buffs = player.buffs.filter((buff) => !["lava_mark", "winter_mark", "stone_defense_count", "youtiao_defense_count"].includes(buff.id) &&
      !/^pending_(lava|winter)_mark(?::|$)/.test(buff.id));
  }
  if (recipe.skill.name === "阳炎之怒") {
    player.buffs = player.buffs.filter((buff) => buff.fusionMarkKind === "solar_lava" ||
      (!["lava_mark", "stone_defense_count"].includes(buff.id) && !/^pending_lava_mark(?::|$)/.test(buff.id)));
  }
  const selection = recipe.skill.name === "枯萎" ? { witherSelectionIndex: getNextWitherSelectionIndex(player) } : {};
  if (getFusionTier(skillId) > 2 || instanceIds) ensureFusionSkillInventory(player);
  const materialFusionIds = materials.filter((entry) => entry.kind === "fusion").map((entry) => entry.instanceId);
  const materialInstanceIds = player.skillInventory ? materials.filter((entry) => entry.kind === "skill").map(({ instanceId }) =>
    instanceId.startsWith("legacy:") ? player.skillInventory![Number(instanceId.slice("legacy:".length))]!.instanceId : instanceId) : undefined;
  player.skillFusions.push({ id: createId("fusion_instance"), skillId, materialSkillIds: materials.map((entry) => entry.skillId), ...selection,
    ...(materialInstanceIds ? { materialInstanceIds } : {}), ...(materialFusionIds.length ? { materialFusionIds } : {}) });
  initializeFusionAcquisition(player, player.skillFusions.at(-1)!);
  if (getSkill(skillId)?.exposureTiming === "开局") revealSkillForExposureTiming(state, playerId, skillId, "开局", "融合开局宣告");
  if (recipe.skill.name === "逐日之弓" && isFusionPreparation(state)) queueZhuRiOpeningChoices(state, player);
  if (requestId) {
    player.fusionRequestIds ??= [];
    player.fusionRequestIds.push(requestId);
  }
  // Materials, cumulative uses, cooldowns and seals stay in place under the cover.
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: playerId,
    message: `${player.name} 融合获得 ${recipe.skill.name}（占${getFusionTier(skillId)}槽）` });
}

export function fuseSkillsInPreparation(state: GameState, playerId: PlayerId, action: SkillAction): GameState {
  if (!isFusionPreparation(state)) throw new Error("免费融合仅限开局准备阶段");
  const validation = validateFusionAction(state, playerId, action);
  if (!validation.ok) throw new Error(validation.error);
  const next = cloneGameState(state);
  applySkillFusion(next, playerId, action.targetSkillId!, action.materialSkillIds, action.fusionRequestId, action.fusionMaterialInstanceIds);
  next.actionWindowMode = "active";
  if (!next.actionWindowPlayerIds.includes(playerId)) next.actionWindowPlayerIds.push(playerId);
  next.actionWindowDeadlineAt = Math.max(next.actionWindowDeadlineAt ?? 0, Date.now() + getActionWindowSeconds(next) * 1000);
  next.updatedAt = Date.now();
  return next;
}

export function decomposeSkill(state: GameState, playerId: PlayerId, fusionId: string): GameState {
  if (state.phase !== "action_window" || (!isFusionPreparation(state) && state.activeTimingPhase !== "turn_end_action")) {
    throw new Error("分解只能在开局阶段或回合末行动阶段使用");
  }
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") throw new Error("只有存活玩家可以分解技能");
  if (state.actionWindowPassPlayerIds.includes(playerId)) throw new Error("你已经结束本次回合末行动");
  if (!player.skillFusions?.some((fusion) => fusion.id === fusionId)) throw new Error("只能分解自己持有的融合技能");
  if (!getRootFusions(player).some((fusion) => fusion.id === fusionId)) throw new Error("请先分解覆盖此技能的上级融合");
  const next = cloneGameState(state);
  const owner = findPlayer(next, playerId)!;
  const fusion = owner.skillFusions!.find((item) => item.id === fusionId)!;
  if (owner.buffs.some((buff) => buff.id === `sealed_skill:${fusion.skillId}`)) {
    for (const material of fusion.materialSkillIds) {
      if (!owner.buffs.some((buff) => buff.id === `sealed_skill:${material}`)) {
        owner.buffs.push({ id: `sealed_skill:${material}`, name: "封印", stacks: 1 });
      }
    }
  }
  owner.skillFusions = owner.skillFusions!.filter((item) => item.id !== fusionId);
  if (fusion.slotMachineExtraInstanceIds) {
    owner.skillFusions = owner.skillFusions.filter((item) => !fusion.materialFusionIds?.includes(item.id));
    for (const id of fusion.slotMachineExtraInstanceIds) removeSkillInstanceAt(owner, owner.skillInventory?.findIndex((item) => item.instanceId === id) ?? -1);
    reconcileSkillFusions(owner);
  }
  if (getFusionRecipe(fusion.skillId)?.skill.name === "三元协奏曲") {
    for (const buff of owner.buffs) {
      if (buff.id === "ice_fire_mark" && buff.sourceFusionId && fusion.materialFusionIds?.includes(buff.sourceFusionId))
        buff.stacks = Math.min(buff.stacks, 3);
    }
  }
  if (getFusionRecipe(fusion.skillId)?.skill.name === "沙皇") {
    for (let used = 0; used < Number(Boolean(fusion.acquisition?.smallUsed)) + Number(Boolean(fusion.acquisition?.fusionUsed)); used++) {
      const index = owner.skills.indexOf("skill_4_65637"); if (index >= 0) removeSkillInstanceAt(owner, index);
    }
  }
  if (fusion.acquisition?.bonusSkillId) {
    const bonusInstanceId = fusion.acquisition.bonusSkillInstanceId;
    const index = bonusInstanceId ? owner.skillInventory?.findIndex((entry) => entry.instanceId === bonusInstanceId) ?? -1 :
      owner.skills.indexOf(fusion.acquisition.bonusSkillId);
    if (index >= 0) removeSkillInstanceAt(owner, index);
    if (!owner.skills.includes(fusion.acquisition.bonusSkillId)) {
      owner.revealedSkillIds = owner.revealedSkillIds.filter((id) => id !== fusion.acquisition!.bonusSkillId);
      for (const knowledge of Object.values(next.skillKnowledge)) if (knowledge?.[playerId]) {
        knowledge[playerId] = knowledge[playerId]!.filter((id) => id !== fusion.acquisition!.bonusSkillId);
      }
    }
  }
  owner.buffs = owner.buffs.filter((buff) => buff.sourceFusionId !== fusionId ||
    (buff.id !== "demon_domain_target" && !buff.id.startsWith("fusion_use_bonus:")));
  clearFusionMarks(owner, fusionId);
  next.eventLog.push({ ...createBaseEvent(next, "system"), type: "system", privatePlayerId: playerId,
    message: `${owner.name} 分解了 ${getFusionRecipe(fusion.skillId)?.skill.name ?? "融合技能"}，恢复${fusion.materialSkillIds.length}份素材` });
  next.actionWindowMode = "active";
  if (!next.actionWindowPlayerIds.includes(playerId)) next.actionWindowPlayerIds.push(playerId);
  next.actionWindowDeadlineAt = Date.now() + getActionWindowSeconds(next) * 1000;
  next.updatedAt = Date.now();
  return next;
}
