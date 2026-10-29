import { BuffState, GameState, INFINITE_DAMAGE, PlayerState, SkillFusionState, SkillId } from "../types";
import { FUSION_RECIPES } from "./generatedFusionCatalog";
import { FusionRecipe } from "./types";

export { FUSION_RECIPES };
export const COMMON_FUSION_SKILL_ID = "common_fusion";
export const FUSION_CAKE_COST = 2;

// Only complete effects are playable. Other spreadsheet recipes remain discoverable.
const IMPLEMENTED_FUSIONS = new Set([
  "交流电", "幻境双罩", "生死符", "极寒风暴", "毁灭之盾", "神之子", "泣血之刃", "末世",
  "风语之森", "血魔之怒", "神界炼魂", "宗师之力", "魔女斗篷", "烽火赤壁", "神域之种", "虚无",
  "空之轨迹", "霸者重装", "冰霜长矛", "水火双生", "雷霆之心", "逆转星移", "斗战胜佛",
  "冰火两仪眼", "虚幻", "暗影狙击", "暗影战斧", "后羿•七日连珠", "圣灵觉醒", "阳光之夜",
  "破天圣剑", "破军", "无尽战刃", "天火之狱", "山崩地裂", "绝对天盾", "神域守护",
  "黑白板", "冰火双漩", "大抠天下", "回响之杖", "永夜之刃", "核战", "逐日之弓", "魔域",
  "电闪雷鸣", "灵魂修复", "枯萎", "辉月"
]);
type FusionOwner = {
  skills: SkillId[];
  buffs: ReadonlyArray<{ id: string; expiresAtRound?: number; sourceFusionId?: string }>;
  skillFusions?: SkillFusionState[] | undefined;
};

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
  return state.phase === "action_window" && state.activeTimingPhase === "round_pre_interval_action" &&
    state.roundNumber === 1 && state.turnNumber === 1;
}

export function isFusionActive(player: FusionOwner, fusion: SkillFusionState): boolean {
  return isFusionImplemented(fusion.skillId) && !player.buffs.some((buff) =>
    buff.id === `sealed_skill:${fusion.skillId}` || buff.id.startsWith("collapse_until_round:") ||
    buff.id.startsWith("skill_disabled_until_round:"));
}

/** Count only the covered copies whose original effect is still active. */
export function getFusionEnhancementCount(player: FusionOwner, materialId: SkillId, names: readonly string[]): number {
  if (player.buffs.some((buff) => buff.id === `sealed_skill:${materialId}`)) return 0;
  return (player.skillFusions ?? []).filter((fusion) => isFusionActive(player, fusion) &&
    fusion.materialSkillIds.includes(materialId) && names.includes(getFusionRecipe(fusion.skillId)?.skill.name ?? "")).length;
}

/** Keep the original two-round ledger, so fusion/decomposition cannot reset a cooldown. */
export function getDestroyPowerCooldownCount(player: FusionOwner, roundNumber: number): number {
  const enhancedSlots = getFusionEnhancementCount(player, "skill_45_30424", ["末世", "宗师之力"]);
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
function getFlashFamilySlots(player: FusionOwner, roundNumber: number) {
  const count = Math.max(0, player.skills.filter((id) => id === "skill_103_56259").length -
    countSuppressedFusionMaterials(player, "skill_103_56259"));
  const oneRound = getFusionEnhancementCount(player, "skill_103_56259", ["虚无"]);
  const twoRound = getFusionEnhancementCount(player, "skill_103_56259", ["空之轨迹"]);
  const slots = [
    ...Array.from({ length: count }, (_, index) => ({ kind: "flash", duration: index < oneRound ? 1 : index < oneRound + twoRound ? 2 : 3,
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

export function getOwnedSkillIds(player: Pick<PlayerState, "skills" | "skillFusions">): SkillId[] {
  return [...player.skills, ...(player.skillFusions ?? []).map((fusion) => fusion.skillId)];
}

/** Card layout only: runtime material skills keep their identity and usage counters. */
export function getSkillCardIds(player: Pick<PlayerState, "skills" | "skillFusions">): SkillId[] {
  const cards = [...player.skills];
  for (const fusion of player.skillFusions ?? []) {
    for (const material of fusion.materialSkillIds) {
      const index = cards.indexOf(material);
      if (index >= 0) cards.splice(index, 1);
    }
    cards.push(fusion.skillId);
  }
  return cards;
}

export function getUnfusedSkillIds(player: Pick<PlayerState, "skills" | "skillFusions">): SkillId[] {
  return getSkillCardIds(player).filter((skillId) => !getFusionRecipe(skillId));
}

export function hasFusionMaterials(player: Pick<PlayerState, "skills" | "skillFusions">, materials: readonly SkillId[]): boolean {
  const available = getUnfusedSkillIds(player);
  for (const material of materials) {
    const index = available.indexOf(material);
    if (index < 0) return false;
    available.splice(index, 1);
  }
  return materials.length === 2;
}

export function getAvailableFusionRecipes(player: Pick<PlayerState, "skills" | "skillFusions">): FusionRecipe[] {
  return FUSION_RECIPES.filter((recipe) => recipe.materialOptions.some((pair) => hasFusionMaterials(player, pair)));
}

export function getFusionMaterialPair(player: Pick<PlayerState, "skills" | "skillFusions">, skillId: SkillId,
  selected?: [SkillId, SkillId]): [SkillId, SkillId] | undefined {
  return getFusionRecipe(skillId)?.materialOptions.find((pair) =>
    (!selected || [...selected].sort().join("|") === [...pair].sort().join("|")) && hasFusionMaterials(player, pair));
}

export function getFusionUseBonus(player: FusionOwner, skillId: SkillId): number {
  return (player.skillFusions ?? []).reduce((sum, fusion) => {
    if (!isFusionActive(player, fusion) || !fusion.materialSkillIds.includes(skillId)) return sum;
    const name = getFusionRecipe(fusion.skillId)?.skill.name;
    if (name === "幻境双罩") return sum + 2;
    if (name === "交流电" && skillId === "skill_36_14343") return sum + 1;
    if (name === "烽火赤壁" && skillId === "skill_13_68869") return sum + 2;
    if (name === "空之轨迹" && skillId === "skill_104_71181") return sum + 1;
    if (name === "逐日之弓" && skillId === "skill_100_45717") return sum + 1;
    return sum;
  }, 0);
}

export function countSuppressedFusionMaterials(player: FusionOwner, skillId: SkillId): number {
  return (player.skillFusions ?? []).filter((fusion) =>
    player.buffs.some((buff) => buff.id === `sealed_skill:${fusion.skillId}`) ||
    !getFusionRecipe(fusion.skillId)?.retainedMaterialIds.includes(skillId))
    .reduce((sum, fusion) => sum + fusion.materialSkillIds.filter((id) => id === skillId).length, 0);
}

export function clearFusionMarks(player: Pick<PlayerState, "buffs">, fusionId: string): void {
  player.buffs = player.buffs.filter((buff) => buff.sourceFusionId !== fusionId ||
    (buff.fusionMarkKind !== "ice_fire" && buff.fusionMarkKind !== "solar_lava"));
}

/** Remove covers whose material was removed by an existing skill-removal effect. */
export function reconcileSkillFusions(player: Pick<PlayerState, "skills" | "skillFusions" | "buffs">): void {
  const available = [...player.skills];
  player.skillFusions = (player.skillFusions ?? []).filter((fusion) => {
    const next = [...available];
    for (const material of fusion.materialSkillIds) {
      const index = next.indexOf(material);
      if (index < 0) {
        clearFusionMarks(player, fusion.id);
        return false;
      }
      next.splice(index, 1);
    }
    available.splice(0, available.length, ...next);
    return true;
  });
}

export function recordSkillUse(player: { buffs: BuffState[] }, skillId: SkillId): void {
  const costs = [skillId, ...(getFusionRecipe(skillId)?.materialUseCosts ?? [])];
  for (const usedId of costs) {
    const id = `skill_used:${usedId}`;
    const existing = player.buffs.find((buff) => buff.id === id);
    if (existing) existing.stacks += 1;
    else player.buffs.push({ id, name: "技能使用次数", stacks: 1 });
  }
}
