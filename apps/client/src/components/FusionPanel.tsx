import { useEffect, useMemo, useState } from "react";
import { ActionSubmission, COMMON_FUSION_SKILL_ID, FUSION_CAKE_COST, FUSION_RECIPES,
  createId, getAvailableFusionRecipes, getFusionRecipe, getSkill, getSkillUseLimit,
  isFusionImplemented, isFusionPreparation, countSuppressedFusionMaterials, PublicGameState,
  getNextWitherSelectionIndex, getWitherNumber, isValidWitherNumber } from "@bing/shared";

interface FusionPanelProps {
  state: PublicGameState;
  submitting: boolean;
  onSubmit: (action: ActionSubmission) => void;
  onDecompose: (fusionId: string) => void;
  onChooseWitherNumber: (selectionIndex: number, value: number) => void;
}

export function FusionPanel({ state, submitting, onSubmit, onDecompose, onChooseWitherNumber }: FusionPanelProps) {
  const viewer = state.players.find((player) => player.id === state.viewerPlayerId);
  const recipes = useMemo(() => viewer ? getAvailableFusionRecipes(viewer) : [], [viewer]);
  const [selectedId, setSelectedId] = useState("");
  const [witherDrafts, setWitherDrafts] = useState<Record<number, string>>({});
  useEffect(() => setWitherDrafts({}), [viewer?.id]);
  const selected = recipes.find((recipe) => recipe.skill.id === selectedId) ??
    recipes.find((recipe) => isFusionImplemented(recipe.skill.id)) ?? recipes[0];
  useEffect(() => setSelectedId(selected?.skill.id ?? ""), [selected?.skill.id]);
  if (!viewer || viewer.status !== "alive" || state.phase === "lobby" || state.phase === "finished" ||
    (viewer.skills.length < 2 && !viewer.skillFusions?.length)) return null;
  const preparation = isFusionPreparation(state);
  const passed = state.actionWindowPassPlayerIds.includes(viewer.id);
  const witherIndex = getNextWitherSelectionIndex(viewer);
  const selectedWither = selected?.skill.name === "枯萎";
  const witherDraft = Number(witherDrafts[witherIndex] ?? getWitherNumber(viewer, witherIndex));
  const unsavedWither = preparation && selectedWither &&
    (!isValidWitherNumber(witherDraft) || witherDraft !== getWitherNumber(viewer, witherIndex));
  const witherIndices = [...new Set([
    ...(viewer.skillFusions ?? []).filter((fusion) => getFusionRecipe(fusion.skillId)?.skill.name === "枯萎")
      .map((fusion) => fusion.witherSelectionIndex ?? 0),
    ...(recipes.some((recipe) => recipe.skill.name === "枯萎") ? [witherIndex] : [])
  ])].sort((a, b) => a - b);
  const canFuse = !submitting && Boolean(selected && isFusionImplemented(selected.skill.id)) &&
    !unsavedWither &&
    (preparation ? !passed : state.phase === "collecting_actions" &&
      !state.pendingActionPlayerIds.includes(viewer.id) && viewer.cakes >= FUSION_CAKE_COST);
  const canDecompose = !submitting && state.phase === "action_window" &&
    state.activeTimingPhase === "turn_end_action" && !passed;

  return (
    <section className="surface-card space-y-3 p-4" aria-label="融合与分解">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">融合与分解</h2>
        <span className="text-xs text-gray-500">{viewer.skillSlotCount ?? viewer.skills.length} 槽</span>
      </div>
      <p className="text-sm text-gray-600">
        {preparation ? "开局准备：免费融合，不占出招。" : "融合消耗2饼，占用本回合出招。"}
        分解免费，仅回合末可用。次数、冷却和封印不会重置。
      </p>
      {preparation && witherIndices.length > 0 ? <div className="space-y-2 rounded-xl border border-gray-200 p-3">
        <p className="text-sm font-semibold">枯萎开局选数</p>
        <p className="text-xs text-gray-600">每份默认1。准备结束后锁定，中途融合也沿用此处的选择；可先保存数字，稍后再融合。</p>
        {witherIndices.map((index) => {
          const saved = getWitherNumber(viewer, index);
          const draft = witherDrafts[index] ?? String(saved);
          const value = Number(draft);
          return <div className="space-y-1" key={index}>
            <label className="block text-sm">第{index + 1}份枯萎数字
              <input className="soft-input mt-1 w-full" type="number" min={1} max={Number.MAX_SAFE_INTEGER} step={1}
                data-testid={`wither-number-${index}`} value={draft} disabled={submitting || passed}
                onChange={(event) => setWitherDrafts((previous) => ({ ...previous, [index]: event.target.value }))} />
            </label>
            <p className="text-xs text-gray-600">已保存：{saved}</p>
            <button type="button" className="btn-secondary disabled:opacity-50"
              disabled={submitting || passed || !isValidWitherNumber(value) || value === saved}
              onClick={() => onChooseWitherNumber(index, value)}>保存第{index + 1}份枯萎选数</button>
          </div>;
        })}
      </div> : null}
      {selected ? (
        <>
          <label className="block text-sm font-medium">
            可配出的融合技能
            <select className="soft-input mt-1 w-full" value={selected.skill.id}
              onChange={(event) => setSelectedId(event.target.value)}>
              {recipes.map(({ skill }) => <option key={skill.id} value={skill.id}>
                {skill.name}{isFusionImplemented(skill.id) ? "" : "（效果尚未开放）"}
              </option>)}
            </select>
          </label>
          <p className="text-xs text-gray-500">素材：{selected.skill.fusion} · 融合后占2槽</p>
          <p className="text-sm">{getSkill(selected.skill.id)?.description ?? selected.skill.description}</p>
          {selectedWither ? <p className="text-xs text-gray-600">本次融合沿用第{witherIndex + 1}份开局选择：{getWitherNumber(viewer, witherIndex)}。</p> : null}
          {unsavedWither ? <p className="text-xs text-amber-700">请先保存有效的开局选数，再融合。</p> : null}
          <button className="btn-primary w-full justify-center disabled:opacity-50" type="button" disabled={!canFuse}
            onClick={() => onSubmit({ type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1, targetSkillId: selected.skill.id,
              fusionRequestId: createId("fusion_request") })}>
            {preparation ? "免费融合" : "融合并提交出招（2饼）"}
          </button>
          {!isFusionImplemented(selected.skill.id) ? <p className="text-xs text-gray-500">这条配方已收录，开放效果后才可融合。</p> : null}
        </>
      ) : <p className="text-sm text-gray-500">当前没有可用的未融合素材组合。</p>}
      {(viewer.skillFusions ?? []).map((fusion) => (
        <div key={fusion.id} className="rounded-xl border border-gray-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{getFusionRecipe(fusion.skillId)?.skill.name ?? "融合技能"} · 占2槽</strong>
            <button className="btn-secondary disabled:opacity-50" type="button" disabled={!canDecompose}
              onClick={() => onDecompose(fusion.id)}>分解{getSkill(fusion.skillId)?.name}</button>
          </div>
          {getFusionRecipe(fusion.skillId)?.skill.name === "枯萎" ? <p className="mt-1 text-xs text-gray-600">
            第{(fusion.witherSelectionIndex ?? 0) + 1}份选数：{getWitherNumber(viewer, fusion.witherSelectionIndex ?? 0)}
            {preparation ? "（准备结束后锁定）" : "（已锁定）"}
          </p> : null}
          {getSkillUseLimit(viewer, fusion.skillId) !== undefined ? <p className="mt-1 text-xs text-gray-600">
            融合技能总剩余 {Math.max(0, (getSkillUseLimit(viewer, fusion.skillId) ?? 0) -
              (viewer.buffs.find((buff) => buff.id === `skill_used:${fusion.skillId}`)?.stacks ?? 0))} 次
          </p> : null}
          {fusion.materialSkillIds.map((materialId, index) => {
            const limit = getSkillUseLimit(viewer, materialId);
            const used = viewer.buffs.find((buff) => buff.id === `skill_used:${materialId}`)?.stacks ?? 0;
            const replaced = countSuppressedFusionMaterials(viewer, materialId) >= viewer.skills.filter((id) => id === materialId).length;
            return <p className="mt-1 text-xs text-gray-600" key={`${fusion.id}-${index}`}>
              {getSkill(materialId)?.name}{replaced ? "：效果由融合技能替代" : limit === undefined ? "" : `：总剩余${Math.max(0, limit - used)}次`}
            </p>;
          })}
          {!canDecompose ? <p className="mt-1 text-xs text-gray-500">回合末行动窗口可分解。</p> : null}
        </div>
      ))}
      <p className="text-xs text-gray-500">已收录 {FUSION_RECIPES.length} 条配方，已开放 {FUSION_RECIPES.filter(({ skill }) => isFusionImplemented(skill.id)).length} 条。</p>
    </section>
  );
}
