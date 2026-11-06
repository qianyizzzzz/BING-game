import { BuffState, GameState, INFINITE_DAMAGE, PlayerState, SkillFusionState, SkillId } from "../types";
import { FUSION_RECIPES as TWO_FUSION_RECIPES } from "./generatedFusionCatalog";
import { HIGHER_FUSION_RECIPES } from "./generatedHigherFusionCatalog";
import { FusionRecipe } from "./types";
import { getOwnedBigAbilityIds, MORE_TRIES_ID, STAR_CARD_ID, STAR_INHERIT_ID, VERDICT_ACTION_ID } from "../bigCards/abilities";
import { isSkillSuppressedByBuff } from "../engine/effectCategories";
import { removeSkillInstanceAt } from "../engine/skillInventory";

const ALIEN_FUSION_ID = "3030";
const REVERSAL_SKILL_ID = "skill_93_50224";

export const FUSION_RECIPES: FusionRecipe[] = [...TWO_FUSION_RECIPES, ...HIGHER_FUSION_RECIPES.map((recipe) =>
  recipe.skill.id === ALIEN_FUSION_ID ? { ...recipe, retainedMaterialIds: [], retainedInheritedMaterialIds: [REVERSAL_SKILL_ID] } :
    recipe.skill.id === MORE_TRIES_ID ? { ...recipe, retainedMaterialIds: ["3013"] } : recipe)];
export const COMMON_FUSION_SKILL_ID = "common_fusion";
export const FUSION_CAKE_COST = 2;

// Released effects and explicitly approved placeholders; other recipes remain discoverable.
const IMPLEMENTED_FUSIONS = new Set([
  "交流电", "幻境双罩", "生死符", "极寒风暴", "毁灭之盾", "神之子", "泣血之刃", "末世",
  "风语之森", "血魔之怒", "神界炼魂", "宗师之力", "魔女斗篷", "烽火赤壁", "神域之种", "虚无",
  "空之轨迹", "霸者重装", "冰霜长矛", "水火双生", "雷霆之心", "逆转星移", "斗战胜佛",
  "冰火两仪眼", "虚幻", "暗影狙击", "暗影战斧", "后羿•七日连珠", "圣灵觉醒", "阳光之夜",
  "破天圣剑", "破军", "无尽战刃", "天火之狱", "山崩地裂", "绝对天盾", "神域守护",
  "黑白板", "冰火双漩", "大抠天下", "回响之杖", "永夜之刃", "核战", "逐日之弓", "魔域",
  "电闪雷鸣", "灵魂修复", "枯萎", "辉月", "自然之灵", "纯净苍穹",
  "野蛮人", "贤者之书", "贤者的庇护", "杀级换", "冰火狂暴曲", "空城计", "弹力球", "根源之目",
  "六芒星阵", "博学者之怒", "帝灵之境", "反伤刺甲", "神隐双莲", "名刀司命", "红莲斗篷", "阳炎之怒",
  "制裁之刃", "不死鸟之眼", "沙皇", "天魔舞", "猥琐小叔叔",
  "火•杀•换", "炼狱使徒", "断绝", "山河破碎", "圣宝", "轮回吞噬", "天人合一",
  "将进酒", "魔方", "大雪球", "甲骨文", "金胸罩", "鲜血收割", "魔音贯耳", "流星雨", "外星人",
  "暗影之魂", "风之轻灵", "无限之力", "毁灭之魂", "猥琐大叔叔", "抠皇", "三元协奏曲", "星怒",
  "炽焰", "极寒", "破晓", "天空之城", "四大皆空", "多来几次", "老虎机"
]);
type FusionOwner = {
  skills: SkillId[];
  bigCards?: PlayerState["bigCards"];
  buffs: ReadonlyArray<{ id: string; expiresAtRound?: number; sourceFusionId?: string; stacks?: number }>;
  skillFusions?: SkillFusionState[] | undefined;
  skillInventory?: PlayerState["skillInventory"];
};

type FusionInventoryOwner = Pick<PlayerState, "skills" | "skillFusions" | "skillInventory" | "bigCards">;

export function getFusionTier(skillId: SkillId): number {
  const recipe = getFusionRecipe(skillId);
  return recipe ? recipe.tier ?? 2 : 1;
}

export function getFusionRecipe(skillId: SkillId): FusionRecipe | undefined {
  return FUSION_RECIPES.find((recipe) => recipe.skill.id === skillId);
}

export function getFusionSkillId(name: string): SkillId {
  const recipe = FUSION_RECIPES.find((item) => item.skill.name === name);
  if (!recipe) throw new Error(`未知融合配方：${name}`);
  return recipe.skill.id;
}

export function isValidWitherNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function getWitherNumber(player: Pick<PlayerState, "witherSelections">, index = 0): number {
  const value = player.witherSelections?.[index];
  return isValidWitherNumber(value) ? value : 1;
}

export function getNextWitherSelectionIndex(player: Pick<PlayerState, "skillFusions">): number {
  const occupied = new Set((player.skillFusions ?? []).filter((fusion) =>
    getFusionRecipe(fusion.skillId)?.skill.name === "枯萎").map((fusion) => fusion.witherSelectionIndex ?? 0));
  let index = 0;
  while (occupied.has(index)) index++;
  return index;
}

export function getActiveFusionCount(player: FusionOwner | undefined, name: string): number {
  return player ? (player.skillFusions ?? []).filter((fusion) => isFusionActive(player, fusion) &&
    getFusionRecipe(fusion.skillId)?.skill.name === name).length : 0;
}

export function hasEnhancedPutianRange(player: FusionOwner | undefined): boolean {
  return Boolean(player && ["大抠天下", "核战", "逐日之弓"].some((name) => getFusionEnhancementCount(player, "skill_98_7182", [name]) > 0));
}

export function getFreeSkillChargeId(player: FusionOwner, skillId: SkillId): string | undefined {
  if (skillId === "skill_87_44771") return "free_lian_bao";
  if (skillId === VERDICT_ACTION_ID) return "free_imperial_verdict";
  if (skillId === "skill_82_45540" && getFusionEnhancementCount(player, skillId, ["后羿•七日连珠"]) > 0) return "free_ri";
  return undefined;
}

export function getAbsoluteGuardCost(player: FusionOwner, attackCost: number): number {
  if (getFusionEnhancementCount(player, "skill_74_34920", ["神域守护"]) > 0) return Math.floor(attackCost / 4);
  if (getFusionEnhancementCount(player, "skill_74_34920", ["绝对天盾"]) > 0) return Math.floor(attackCost / 3);
  return Math.ceil(attackCost / 2);
}

export function isFusionImplemented(skillId: SkillId): boolean {
  const recipe = getFusionRecipe(skillId);
  return Boolean(recipe && IMPLEMENTED_FUSIONS.has(recipe.skill.name));
}

export function isFusionPreparation(state: Pick<GameState, "phase" | "activeTimingPhase" | "roundNumber" | "turnNumber">): boolean {
  return state.phase === "action_window" && state.activeTimingPhase === "opening_action" &&
    state.roundNumber === 1 && state.turnNumber === 1;
}

export function isFusionActive(player: FusionOwner, fusion: SkillFusionState): boolean {
  return isFusionImplemented(fusion.skillId) && !hasPausedFusionMaterial(player, fusion) &&
    isRetainedByFusionParents(player, fusion) && !player.buffs.some((buff) =>
    buff.id === `sealed_skill:${fusion.skillId}` || buff.id.startsWith("collapse_until_round:") ||
    isSkillSuppressedByBuff(buff.id));
}

function pausedCardIds(player: Pick<FusionOwner, "bigCards">): Set<string> {
  return new Set(player.bigCards?.filter((card) => card.junengDisabled).map((card) => card.instanceId));
}

function hasPausedFusionMaterial(player: Pick<FusionOwner, "bigCards" | "skillInventory" | "skillFusions">, fusion: SkillFusionState,
  paused = pausedCardIds(player)): boolean {
  if (paused.size === 0) return false;
  if (fusion.sourceBigCardInstanceId && paused.has(fusion.sourceBigCardInstanceId)) return true;
  if (player.skillInventory?.some((item) => item.sourceBigCardInstanceId && paused.has(item.sourceBigCardInstanceId) &&
    fusion.materialInstanceIds?.includes(item.instanceId))) return true;
  return Boolean(player.skillFusions?.some((child) => fusion.materialFusionIds?.includes(child.id) && hasPausedFusionMaterial(player, child, paused)));
}

function isRetainedByFusionParents(player: FusionOwner, fusion: SkillFusionState, materialId?: SkillId): boolean {
  let child = fusion;
  for (;;) {
    const parent = player.skillFusions?.find((item) => item.materialFusionIds?.includes(child.id));
    if (!parent) return true;
    const recipe = getFusionRecipe(parent.skillId);
    const retainsEffect = recipe?.retainedMaterialIds.includes(child.skillId) ||
      (materialId && recipe?.retainedInheritedMaterialIds?.includes(materialId));
    if (getFusionTier(parent.skillId) <= getFusionTier(child.skillId) || !retainsEffect ||
      player.buffs.some((buff) => buff.id === `sealed_skill:${parent.skillId}`)) return false;
    child = parent;
  }
}

/** Count only the covered copies whose original effect is still active. */
export function getFusionEnhancementCount(player: FusionOwner, materialId: SkillId, names: readonly string[]): number {
  if (player.buffs.some((buff) => buff.id === `sealed_skill:${materialId}`)) return 0;
  return (player.skillFusions ?? []).filter((fusion) => isFusionActive(player, fusion) &&
    fusion.materialSkillIds.includes(materialId) && names.includes(getFusionRecipe(fusion.skillId)?.skill.name ?? "")).length;
}

export function getVortexCostOverride(player: FusionOwner, skillId: SkillId): number | undefined {
  const fusion = skillId === "skill_119_78843" ? "炽焰" : skillId === "skill_118_53580" ? "极寒" : undefined;
  return fusion && getFusionEnhancementCount(player, skillId, [fusion]) > 0 ? 1 : undefined;
}

export function isHigherFusionAreaAttack(player: FusionOwner | undefined, id: SkillId): boolean {
  if (!player) return false;
  if (id === "skill_85_26345" || id === "skill_86_14131") return getFusionEnhancementCount(player, id, ["魔音贯耳"]) > 0;
  return id === "skill_78_18866" && getFusionEnhancementCount(player, id, ["流星雨"]) > 0;
}

/** Keep the original two-round ledger, so fusion/decomposition cannot reset a cooldown. */
export function getDestroyPowerCooldownCount(player: FusionOwner, roundNumber: number): number {
  const enhancedSlots = getFusionEnhancementCount(player, "skill_45_30424", ["末世", "宗师之力", "毁灭之魂"]);
  const active = player.buffs.filter((buff) => buff.id.startsWith("destroy_power_cooldown") &&
    (buff.expiresAtRound === undefined || buff.expiresAtRound > roundNumber));
  const previousRound = active.filter((buff) => buff.expiresAtRound === roundNumber + 1).length;
  return active.length - Math.min(previousRound, enhancedSlots);
}

export const HUIYUE_BUFF_ID = "huiyue_stasis";

export function isHuiyueActive(player: Pick<PlayerState, "buffs"> | undefined, turnNumber: number): boolean {
  return Boolean(player?.buffs.some((buff) => buff.id === HUIYUE_BUFF_ID && buff.stacks > 0 &&
    (buff.expiresAtTurn ?? -1) >= turnNumber));
}

/** Both spells retain a three-round baseline ledger, including through decomposition. */
export function getFlashFamilySlots(player: FusionOwner, roundNumber: number) {
  const count = Math.max(0, player.skills.filter((id) => id === "skill_103_56259").length -
    countSuppressedFusionMaterials(player, "skill_103_56259"));
  const oneRound = getFusionEnhancementCount(player, "skill_103_56259", ["虚无"]);
  const wineSlots = 3 * getFusionEnhancementCount(player, "skill_103_56259", ["将进酒"]);
  const twoRound = getFusionEnhancementCount(player, "skill_103_56259", ["空之轨迹"]);
  const slots = [
    ...Array.from({ length: count }, (_, index) => ({ kind: "flash", duration: index < oneRound + wineSlots ? 1 : index < oneRound + wineSlots + twoRound ? 2 : 3,
      fusionId: "", ready: 0 })),
    ...(player.skillFusions ?? []).filter((fusion) => isFusionActive(player, fusion) &&
      getFusionRecipe(fusion.skillId)?.skill.name === "辉月").map((fusion) => ({ kind: "huiyue", duration: 2, fusionId: fusion.id, ready: 0 }))
  ].sort((a, b) => a.duration - b.duration);
  const uses = player.buffs.filter((buff) => buff.id.startsWith("flash_dodge_cooldown") &&
    (buff.expiresAtRound === undefined || buff.expiresAtRound > roundNumber))
    .sort((a, b) => (a.expiresAtRound ?? Infinity) - (b.expiresAtRound ?? Infinity));
  for (const use of uses) {
    const usedRound = (use.expiresAtRound ?? Infinity) - 3;
    let slot = slots.find((item) => Boolean(use.sourceFusionId) && item.fusionId === use.sourceFusionId);
    slot ??= slots.find((item) => item.ready <= usedRound);
    slot ??= [...slots].sort((a, b) => a.ready - b.ready)[0];
    if (slot) slot.ready = usedRound + slot.duration;
  }
  return slots;
}

export function getFlashDodgeCooldownCount(player: FusionOwner, roundNumber: number): number {
  return getFlashFamilySlots(player, roundNumber).filter((slot) => slot.kind === "flash" && slot.ready > roundNumber).length;
}

export function getHuiyueCooldownCount(player: FusionOwner, roundNumber: number): number {
  return getFlashFamilySlots(player, roundNumber).filter((slot) => slot.kind === "huiyue" && slot.ready > roundNumber).length;
}

export function getReadyHuiyueFusionId(player: FusionOwner, roundNumber: number): string | undefined {
  return getFlashFamilySlots(player, roundNumber).find((slot) => slot.kind === "huiyue" && slot.ready <= roundNumber)?.fusionId;
}

export function getDamageRedirectLimit(player: FusionOwner): number {
  return getFusionEnhancementCount(player, "skill_94_627", ["逆转星移"]) > 0 ? INFINITE_DAMAGE : 3;
}

export function getOwnedSkillIds(player: Pick<PlayerState, "skills" | "skillFusions" | "bigCards">): SkillId[] {
  return [...player.skills, ...(player.skillFusions ?? []).map((fusion) => fusion.skillId), ...getOwnedBigAbilityIds(player)];
}

/** Card layout only: runtime material skills keep their identity and usage counters. */
export function getSkillCardIds(player: FusionInventoryOwner): SkillId[] {
  return getFusionMaterials(player, true).map((entry) => entry.skillId);
}

export function getUnfusedSkillIds(player: FusionInventoryOwner): SkillId[] {
  return getFusionMaterials(player).filter((entry) => entry.kind === "skill").map((entry) => entry.skillId);
}

export function getRootFusions(player: Pick<PlayerState, "skillFusions">): SkillFusionState[] {
  const covered = new Set((player.skillFusions ?? []).flatMap((fusion) => fusion.materialFusionIds ?? []));
  return (player.skillFusions ?? []).filter((fusion) => !covered.has(fusion.id));
}

export function getEnhancedChildFusionIds(player: FusionOwner, parentName: string, childId: SkillId): Set<string> {
  const parentId = getFusionSkillId(parentName);
  return new Set((player.skillFusions ?? []).filter((fusion) => fusion.skillId === parentId && isFusionActive(player, fusion))
    .flatMap((fusion) => fusion.materialFusionIds ?? [])
    .filter((id) => player.skillFusions?.some((fusion) => fusion.id === id && fusion.skillId === childId && isFusionActive(player, fusion))));
}

export function getManualDemonDomainCount(player: FusionOwner): number {
  return getActiveFusionCount(player, "魔域") - getEnhancedChildFusionIds(player, "轮回吞噬", getFusionSkillId("魔域")).size;
}

export interface FusionMaterial {
  instanceId: string;
  skillId: SkillId;
  kind: "skill" | "fusion";
}

export function getFusionMaterials(player: FusionInventoryOwner, includeBonus = false): FusionMaterial[] {
  const fusions = player.skillFusions ?? [];
  const paused = pausedCardIds(player);
  const covered = new Set(fusions.flatMap((fusion) => (fusion.materialInstanceIds ?? [])
    .filter((id) => !fusion.rerollCompletedSlotIds?.includes(id))));
  if (!includeBonus) for (const fusion of fusions) {
    if (fusion.acquisition?.bonusSkillInstanceId) covered.add(fusion.acquisition.bonusSkillInstanceId);
  }
  const raw = player.skills.map<FusionMaterial>((skillId, index) => ({
    skillId, kind: "skill", instanceId: player.skillInventory?.[index]?.instanceId ?? `legacy:${index}`
  })).filter((entry, index) => !covered.has(entry.instanceId) && !paused.has(player.skillInventory?.[index]?.sourceBigCardInstanceId ?? ""));
  for (const fusion of fusions) {
    const reserve = [
      ...(!fusion.materialInstanceIds ? fusion.materialSkillIds.filter((id) => !getFusionRecipe(id)) : []),
      ...(!includeBonus && fusion.acquisition?.bonusSkillId && !fusion.acquisition.bonusSkillInstanceId ? [fusion.acquisition.bonusSkillId] : [])
    ];
    for (const id of reserve) {
      const index = raw.findIndex((entry) => entry.skillId === id);
      if (index >= 0) raw.splice(index, 1);
    }
  }
  return [...raw, ...getRootFusions(player).filter((fusion) => !hasPausedFusionMaterial(player, fusion, paused)).map((fusion): FusionMaterial => ({
    instanceId: fusion.id, skillId: fusion.skillId, kind: "fusion"
  }))];
}

function matchMaterialIds(available: FusionMaterial[], required: readonly SkillId[]): FusionMaterial[] | undefined {
  const remaining = [...available];
  const matched: FusionMaterial[] = [];
  for (const id of required) {
    const index = remaining.findIndex((entry) => entry.skillId === id);
    if (index < 0) return undefined;
    matched.push(remaining.splice(index, 1)[0]!);
  }
  return matched;
}

export function hasFusionMaterials(player: FusionInventoryOwner, materials: readonly SkillId[]): boolean {
  return materials.length >= 2 && Boolean(matchMaterialIds(getFusionMaterials(player), materials));
}

export function getAvailableFusionRecipes(player: FusionInventoryOwner): FusionRecipe[] {
  const available = getFusionMaterials(player);
  return FUSION_RECIPES.filter((recipe) => recipe.materialOptions.some((option) => matchMaterialIds(available, option)));
}

export function getFusionMaterialSelection(player: FusionInventoryOwner, skillId: SkillId,
  selected?: SkillId[], instanceIds?: string[]): FusionMaterial[] | undefined {
  let available = getFusionMaterials(player);
  if (instanceIds) {
    const unique = new Set(instanceIds);
    if (unique.size !== instanceIds.length) return undefined;
    available = available.filter((entry) => unique.has(entry.instanceId));
    if (available.length !== instanceIds.length) return undefined;
  }
  for (const option of getFusionRecipe(skillId)?.materialOptions ?? []) {
    if (instanceIds && option.length !== instanceIds.length) continue;
    if (selected && (selected.length !== option.length || [...selected].sort().join("|") !== [...option].sort().join("|"))) continue;
    const matched = matchMaterialIds(available, option);
    if (matched) return matched;
  }
  return undefined;
}

export function getFusionMaterialPair(player: FusionInventoryOwner, skillId: SkillId, selected?: SkillId[]): SkillId[] | undefined {
  return getFusionMaterialSelection(player, skillId, selected)?.map((entry) => entry.skillId);
}

export function getFusionUseBonus(player: FusionOwner, skillId: SkillId): number {
  return (player.skillFusions ?? []).reduce((sum, fusion) => {
    if (!isFusionActive(player, fusion)) return sum;
    const name = getFusionRecipe(fusion.skillId)?.skill.name;
    const extra = player.buffs.find((buff) => buff.id === `fusion_use_bonus:${skillId}` && buff.sourceFusionId === fusion.id)?.stacks ?? 0;
    if (name === "金胸罩") return sum + (player.buffs.find((buff) =>
      buff.id === `fusion_use_bonus:${skillId}` && buff.sourceFusionId === fusion.id)?.stacks ?? 0);
    if (name === "风之轻灵" && skillId === "skill_104_71181" &&
      fusion.materialFusionIds?.some((id) => player.skillFusions?.some((child) =>
        child.id === id && child.materialSkillIds.includes(skillId) && isFusionActive(player, child)))) return sum + 1;
    if (fusion.skillId === ALIEN_FUSION_ID && skillId === REVERSAL_SKILL_ID &&
      fusion.materialFusionIds?.some((id) => player.skillFusions?.some((child) =>
        child.id === id && child.materialSkillIds.includes(skillId) &&
        !player.buffs.some((buff) => buff.id === `sealed_skill:${child.skillId}`)))) return sum + 1;
    if (!fusion.materialSkillIds.includes(skillId)) return sum;
    if (name === "逆转星移" && skillId === REVERSAL_SKILL_ID && fusion.sourceBigCardInstanceId &&
      player.bigCards?.some((card) => card.instanceId === fusion.sourceBigCardInstanceId && card.cardId === STAR_CARD_ID &&
        !card.lostAbilityIds?.includes(STAR_INHERIT_ID)) && !player.buffs.some((buff) => buff.id === `sealed_skill:${STAR_INHERIT_ID}`)) return sum + 1;
    if (name === "暗影之魂" && skillId === "skill_25_51277") return sum + 1 + (player.buffs.find((buff) =>
      buff.id === `fusion_use_bonus:${skillId}` && buff.sourceFusionId === fusion.id)?.stacks ?? 0);
    if (name === "风之轻灵" && skillId === "skill_15_64971") return sum + 1;
    if ((name === "炽焰" && skillId === "skill_13_68869") || (name === "极寒" && skillId === "skill_14_46860")) return sum + 1;
    if (name === "魔方" && skillId === "skill_101_4254") return sum + 3;
    if (name === "幻境双罩") return sum + 2;
    if (name === "交流电" && skillId === "skill_36_14343") return sum + 1;
    if (name === "烽火赤壁" && skillId === "skill_13_68869") return sum + 2 + extra;
    if (name === "烽火赤壁" && skillId === "skill_15_64971") return sum + extra;
    if (name === "空之轨迹" && skillId === "skill_104_71181") return sum + 1;
    if (name === "逐日之弓" && skillId === "skill_100_45717") return sum + 1;
    if (name === "野蛮人" && skillId === "skill_93_50224") return sum + 1;
    return sum;
  }, 0);
}

export function countSuppressedFusionMaterials(player: FusionOwner, skillId: SkillId): number {
  const paused = pausedCardIds(player);
  const pausedCopies = player.skillInventory?.filter((item) => item.skillId === skillId && paused.has(item.sourceBigCardInstanceId ?? "")) ?? [];
  const pausedInstances = new Set(pausedCopies.map((item) => item.instanceId));
  return (player.skillFusions ?? []).reduce((sum, fusion) => {
    if (fusion.rerollCompletedSlotIds && skillId === "skill_3_56718") {
      return isFusionActive(player, fusion) ? sum : sum + (fusion.materialInstanceIds ?? [])
        .filter((id) => !fusion.rerollCompletedSlotIds!.includes(id) && !pausedInstances.has(id)).length;
    }
    const count = fusion.materialSkillIds.filter((id) => id === skillId).length -
      (fusion.materialInstanceIds?.filter((id) => pausedInstances.has(id)).length ?? 0);
    if (!isRetainedByFusionParents(player, fusion, skillId) || hasPausedFusionMaterial(player, fusion, paused) ||
      player.buffs.some((buff) => buff.id === `sealed_skill:${fusion.skillId}`))
      return sum + count + Number(fusion.acquisition?.bonusSkillId === skillId && !pausedInstances.has(fusion.acquisition.bonusSkillInstanceId ?? ""));
    if (getFusionRecipe(fusion.skillId)?.skill.name === "沙皇" && skillId === "skill_4_65637") {
      return sum + 1 + Number(Boolean(fusion.acquisition?.smallUsed));
    }
    return sum + (getFusionRecipe(fusion.skillId)?.retainedMaterialIds.includes(skillId) ? 0 : count);
  }, pausedCopies.length);
}

export function clearFusionMarks(player: Pick<PlayerState, "buffs">, fusionId: string): void {
  player.buffs = player.buffs.filter((buff) => buff.sourceFusionId !== fusionId ||
    (buff.fusionMarkKind !== "ice_fire" && buff.fusionMarkKind !== "solar_lava" && !buff.id.startsWith("star_rage_")));
}

/** Remove covers whose material was removed by an existing skill-removal effect. */
export function reconcileSkillFusions(player: Pick<PlayerState, "skills" | "skillFusions" | "buffs" | "skillInventory">): void {
  const available = [...player.skills];
  const kept = new Set<string>();
  player.skillFusions = (player.skillFusions ?? []).filter((fusion) => {
    const rawMaterials = fusion.materialSkillIds.filter((id) => !getFusionRecipe(id));
    if (fusion.materialFusionIds?.some((id) => !kept.has(id)) ||
      (fusion.materialInstanceIds && !fusion.materialInstanceIds.every((id, index) =>
        player.skillInventory?.some((entry) => entry.instanceId === id &&
          (fusion.rerollCompletedSlotIds?.includes(id) || entry.skillId === rawMaterials[index]))))) {
      clearFusionMarks(player, fusion.id);
      const bonusId = fusion.acquisition?.bonusSkillInstanceId;
      const index = bonusId ? player.skillInventory?.findIndex((entry) => entry.instanceId === bonusId) ?? -1 : -1;
      if (index >= 0) {
        const skillId = player.skills[index]!;
        const availableIndex = available.indexOf(skillId);
        if (availableIndex >= 0) available.splice(availableIndex, 1);
        removeSkillInstanceAt(player, index);
      }
      return false;
    }
    const next = [...available];
    const required = rawMaterials.filter((_, index) => !fusion.rerollCompletedSlotIds?.includes(fusion.materialInstanceIds?.[index] ?? ""));
    for (const material of required) {
      const index = next.indexOf(material);
      if (index < 0) {
        clearFusionMarks(player, fusion.id);
        return false;
      }
      next.splice(index, 1);
    }
    available.splice(0, available.length, ...next);
    kept.add(fusion.id);
    return true;
  });
}

export function recordSkillUse(player: { buffs: BuffState[]; skillFusions?: SkillFusionState[] | undefined }, skillId: SkillId): void {
  if (skillId === "skill_101_4254") {
    const mirror = player.skillFusions?.find((fusion) => getFusionRecipe(fusion.skillId)?.skill.name === "天魔舞" &&
      fusion.acquisition?.smallUsed && !fusion.acquisition.smallUseRecorded);
    if (mirror?.acquisition) {
      mirror.acquisition.smallUseRecorded = true;
      if (mirror.acquisition.mirrorMaterialUsed) return;
      mirror.acquisition.mirrorMaterialUsed = true;
    }
  }
  const costs = [skillId, ...(getFusionRecipe(skillId)?.materialUseCosts ?? [])];
  for (const usedId of costs) {
    const id = `skill_used:${usedId}`;
    const existing = player.buffs.find((buff) => buff.id === id);
    if (existing) existing.stacks += 1;
    else player.buffs.push({ id, name: "技能使用次数", stacks: 1 });
  }
}
