import { GameState, PlayerId, SkillAction, SkillId, ValidationResult } from "../types";
import { ACTION_WINDOW_SECONDS, cloneGameState, createBaseEvent, createId, findPlayer, revealSkillToViewer } from "./gameFactory";
import { clearFusionMarks, COMMON_FUSION_SKILL_ID, FUSION_CAKE_COST, getFusionMaterialPair,
  getFusionRecipe, isFusionImplemented, isFusionPreparation } from "../skills/fusion";
import { getNextWitherSelectionIndex, isValidWitherNumber } from "../skills/fusion";

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
  next.actionWindowDeadlineAt = Math.max(next.actionWindowDeadlineAt ?? 0, Date.now() + ACTION_WINDOW_SECONDS * 1000);
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
  if (!getFusionMaterialPair(player, action.targetSkillId, action.materialSkillIds)) return fail("融合素材不足、已被覆盖或与配方不符");
  return { ok: true };
}

/** Mutates an already-cloned settlement state, after the ordinary action cost is paid. */
export function applySkillFusion(state: GameState, playerId: PlayerId, skillId: SkillId,
  selected?: [SkillId, SkillId], requestId?: string): void {
  const player = findPlayer(state, playerId);
  const recipe = getFusionRecipe(skillId);
  const materials = player && getFusionMaterialPair(player, skillId, selected);
  if (!player || !recipe || !materials || !isFusionImplemented(skillId)) throw new Error("当前无法完成该融合");
  player.skillFusions ??= [];
  const selection = recipe.skill.name === "枯萎" ? { witherSelectionIndex: getNextWitherSelectionIndex(player) } : {};
  player.skillFusions.push({ id: createId("fusion_instance"), skillId, materialSkillIds: [...materials], ...selection });
  if (recipe.skill.name === "逐日之弓" && isFusionPreparation(state)) {
    state.pendingSkillChoices ??= [];
    for (const other of state.players.filter((item) => item.id !== player.id && item.status === "alive")) {
      if (state.pendingSkillChoices.some((choice) => choice.playerId === player.id && choice.sourcePlayerId === other.id)) continue;
      const known = state.skillKnowledge[player.id]?.[other.id] ?? [];
      const selected = known.find((id) => other.skills.includes(id)) ?? other.skills[Math.floor(Math.random() * other.skills.length)];
      if (!selected || player.buffs.some((buff) => buff.id === `shunshou_taken:${other.id}:${selected}`)) continue;
      revealSkillToViewer(state, player.id, other.id, selected);
      state.pendingSkillChoices.push({ id: createId("skill_choice"), kind: "steal_skill", playerId: player.id, sourcePlayerId: other.id, skillId: selected });
    }
  }
  if (requestId) {
    player.fusionRequestIds ??= [];
    player.fusionRequestIds.push(requestId);
  }
  // Materials, cumulative uses, cooldowns and seals stay in place under the cover.
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: playerId,
    message: `${player.name} 融合获得 ${recipe.skill.name}（占2槽）` });
}

export function fuseSkillsInPreparation(state: GameState, playerId: PlayerId, action: SkillAction): GameState {
  if (!isFusionPreparation(state)) throw new Error("免费融合仅限开局准备阶段");
  const validation = validateFusionAction(state, playerId, action);
  if (!validation.ok) throw new Error(validation.error);
  const next = cloneGameState(state);
  applySkillFusion(next, playerId, action.targetSkillId!, action.materialSkillIds, action.fusionRequestId);
  next.actionWindowMode = "active";
  if (!next.actionWindowPlayerIds.includes(playerId)) next.actionWindowPlayerIds.push(playerId);
  next.actionWindowDeadlineAt = Math.max(next.actionWindowDeadlineAt ?? 0, Date.now() + ACTION_WINDOW_SECONDS * 1000);
  next.updatedAt = Date.now();
  return next;
}

export function decomposeSkill(state: GameState, playerId: PlayerId, fusionId: string): GameState {
  if (state.phase !== "action_window" || state.activeTimingPhase !== "turn_end_action") {
    throw new Error("分解只能在回合末行动阶段使用");
  }
  const player = findPlayer(state, playerId);
  if (!player || player.status !== "alive") throw new Error("只有存活玩家可以分解技能");
  if (state.actionWindowPassPlayerIds.includes(playerId)) throw new Error("你已经结束本次回合末行动");
  if (!player.skillFusions?.some((fusion) => fusion.id === fusionId)) throw new Error("只能分解自己持有的融合技能");
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
  owner.buffs = owner.buffs.filter((buff) => buff.id !== "demon_domain_target" || buff.sourceFusionId !== fusionId);
  clearFusionMarks(owner, fusionId);
  next.eventLog.push({ ...createBaseEvent(next, "system"), type: "system", privatePlayerId: playerId,
    message: `${owner.name} 分解了 ${getFusionRecipe(fusion.skillId)?.skill.name ?? "融合技能"}，恢复两份素材` });
  next.actionWindowMode = "active";
  if (!next.actionWindowPlayerIds.includes(playerId)) next.actionWindowPlayerIds.push(playerId);
  next.actionWindowDeadlineAt = Date.now() + ACTION_WINDOW_SECONDS * 1000;
  next.updatedAt = Date.now();
  return next;
}
