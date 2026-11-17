import { isPlayerSkillSealed } from "../engine/gameFactory";
import { TIGER_GRANTS, tigerAbilityActive, tigerTemporarySkills } from "../engine/netherTigerIds";
import { FIVE_ELEMENTS_FORMS, FIVE_ELEMENTS_KEYS, fiveElementsAbilityActive } from "../engine/fiveElementsIds";
import { HEXAGRAM_SOUL, hexagramAbilityActive } from "../engine/hexagramIds";
import { SEVEN_STAR_TIANJI, sevenStarAbilityActive } from "../engine/sevenStarIds";
import { TIAN_SHA_CARD, TIAN_SHA_POWER, TIAN_SHA_SWORD } from "../engine/tianShaIds";
import { BuffState, GameState, INFINITE_DAMAGE, PlayerState, SkillFusionState, SkillId } from "../types";
import { FUSION_RECIPES as TWO_FUSION_RECIPES } from "./generatedFusionCatalog";
import { HIGHER_FUSION_RECIPES } from "./generatedHigherFusionCatalog";
import { FusionRecipe } from "./types";
import { ERA_INHERIT } from "../engine/eraIds";
import { bigCardHasAbility, getOwnedBigAbilityIds, KAIGE_LIVES_ID, MORE_TRIES_ID, STAR_CARD_ID, STAR_INHERIT_ID, VERDICT_ACTION_ID,
  XIELING_INHERIT_ID } from "../bigCards/abilities";
import { BUBBLE_SKILLS_DISABLED } from "../engine/bubbleDreamIds";
import { isAllSkillsSealedBuff, isLockedSkillSuppressed, isSkillSuppressedByBuff, isAttributeSkillSuppressed, isThornSkillDisabled,
  negativeStatusesHaveNoEffect } from "../engine/effectCategories";
import { sandGrantSkillIds } from "../engine/sand";
import { siphonRevivalSkillIds } from "../engine/siphon";
import { ASURA_BARRIER_SKILL_ID, asuraBarrierUses, asuraInheritanceCopies } from "../engine/asura";
import { removeSkillInstanceAt } from "../engine/skillInventory";
import { ignoredSkillCopies, ignoresFusionFamily } from "../engine/skillIgnore";
import { emptyCitySkillSourceAllowed } from "../engine/illusionRules";
import { spendTianlieTemporaryUse } from "../engine/tianlie";
import { getPeriodicUses, periodicFlashUseKey, periodicUseReadyAt } from "../engine/limitedUseBalance";
import { readJudgmentRank, type JudgmentRank } from "../engine/judgmentRank";
import { ANTI_CAKE_MOVE_ID, VACUUM_CARD_ID, VACUUM_INHERIT_ID, VACUUM_ITEM } from "../engine/vacuumIds";
import { KARMA_SONG_END_ID } from "../engine/karmaCycleIds";
import { CHEAT_SHARP_DAMAGE_ID, CHEAT_SHARP_STOCK } from "../engine/cheatServerIds";
import { VETERAN_DECENCY_ID, VETERAN_FUSION_ID, VETERAN_SHATTER_ID } from "../engine/swarmIds";
import { swordArrayNoCakeSuppressesPassive } from "../engine/swordArrayControl";
import { BLADE_INHERIT_ID, brokenBladeGrants, BROKEN_BLADE_CARD_ID, getBrokenBlade } from "../engine/brokenBladeIds";
import { SEA_GOD_INHERIT_ID } from "../engine/seaGodIds";

const ALIEN_FUSION_ID = "3030";
const REVERSAL_SKILL_ID = "1092";
const DAMAGE_REDIRECT_SKILL_ID = "1093";
export const REVERSAL_SHIFT_FUSION_ID = "fusion_31e358876de9";
export const SIX_REVERSAL_ARRAY_ID = "4023";
export const PROSPERITY_FUSION_ID = "3005";
const WITHER_FUSION_ID = "fusion_aac6475c4356";

export const FUSION_RECIPES: FusionRecipe[] = [...TWO_FUSION_RECIPES, ...HIGHER_FUSION_RECIPES.map((recipe) =>
  recipe.skill.id === ALIEN_FUSION_ID ? { ...recipe, retainedMaterialIds: [], retainedInheritedMaterialIds: [REVERSAL_SKILL_ID] } :
    recipe.skill.id === MORE_TRIES_ID ? { ...recipe, retainedMaterialIds: ["3013"] } : recipe)];
export const COMMON_FUSION_SKILL_ID = "common_fusion";
export const FUSION_CAKE_COST = 2;

// Released effects and explicitly approved placeholders; other recipes remain discoverable.
const IMPLEMENTED_FUSIONS = new Set([
  "永恒",
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
  "玄•幻", "寂灭", "遗迹", "弑神", "炽焰", "极寒", "破晓", "天空之城", "四大皆空", "多来几次", "老虎机", "天雷", "终结", "繁荣",
  "雷霆之魂", "神隐斗篷", "冰霜之魂", "天•幻", "血祭之道", "天煞孤星", "猥琐老司机", "六转生死阵", "长生", "不死",
  "起源弹", "神圣禁域", "圣灵潜能", "日月同辉", "日月星辰", "拆迁队"
]);
type FusionOwner = {
  id?: string;
  skills: SkillId[];
  bigCards?: PlayerState["bigCards"];
  buffs: ReadonlyArray<{ id: string; expiresAtRound?: number; sourceFusionId?: string; sourcePlayerId?: string; stacks?: number }>;
  skillFusions?: SkillFusionState[] | undefined;
  skillInventory?: PlayerState["skillInventory"];
  emptyCitySkillsSuspended?: true;
};

type FusionInventoryOwner = Pick<PlayerState, "skills" | "skillFusions" | "skillInventory" | "bigCards">;

export function getFusionTier(skillId: SkillId): number {
  const recipe = getFusionRecipe(skillId);
  return recipe ? recipe.tier ?? 2 : 1;
}

export function getFusionJudgmentRank(fusion: Pick<SkillFusionState, "skillId" | "judgmentRank">): JudgmentRank {
  return readJudgmentRank(fusion.judgmentRank ?? getFusionTier(fusion.skillId));
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

export function getNextWitherSelectionIndex(player: Pick<PlayerState, "skillFusions">, width = 1): number {
  const occupied = new Set((player.skillFusions ?? []).filter((fusion) =>
    fusion.skillId === WITHER_FUSION_ID || fusion.skillId === PROSPERITY_FUSION_ID)
    .flatMap((fusion) => getReservedWitherIndices(fusion)));
  let index = 0;
  while (Array.from({ length: width }, (_, offset) => index + offset).some((slot) => occupied.has(slot))) index++;
  return index;
}

export function getReservedWitherIndices(fusion: SkillFusionState): number[] {
  if (fusion.witherSelectionIndex === undefined && fusion.skillId !== WITHER_FUSION_ID) return [];
  return Array.from({ length: fusion.witherSelectionWidth ?? 1 }, (_, offset) => (fusion.witherSelectionIndex ?? 0) + offset);
}

export function reserveWitherSelections(player: Pick<PlayerState, "skillFusions">, skillId: SkillId, width = 1):
  Pick<SkillFusionState, "witherSelectionIndex" | "witherSelectionWidth"> {
  if (skillId !== WITHER_FUSION_ID && skillId !== PROSPERITY_FUSION_ID) return {};
  return { witherSelectionIndex: getNextWitherSelectionIndex(player, width), ...(width > 1 ? { witherSelectionWidth: width } : {}) };
}

export function getWitherSelectionGroups(player: FusionOwner, activeOnly = false):
  Array<{ fusionId: string; name: "枯萎" | "繁荣"; indices: number[] }> {
  const fusions = player.skillFusions ?? [];
  const prosperities = fusions.filter((fusion) => fusion.skillId === PROSPERITY_FUSION_ID);
  return fusions.flatMap((fusion): Array<{ fusionId: string; name: "枯萎" | "繁荣"; indices: number[] }> => {
    if (activeOnly && !isFusionActive(player, fusion)) return [];
    if (fusion.skillId === WITHER_FUSION_ID && !prosperities.some((parent) => parent.materialFusionIds?.includes(fusion.id)))
      return [{ fusionId: fusion.id, name: "枯萎", indices: getReservedWitherIndices(fusion) }];
    if (fusion.skillId !== PROSPERITY_FUSION_ID) return [];
    const child = fusions.find((entry) => entry.skillId === WITHER_FUSION_ID && fusion.materialFusionIds?.includes(entry.id));
    if (!child || activeOnly && !isFusionActive(player, child)) return [];
    return [{ fusionId: fusion.id, name: "繁荣", indices: [...getReservedWitherIndices(child).slice(0, 1), ...getReservedWitherIndices(fusion)] }];
  });
}
export function getActiveFusionCount(player: FusionOwner | undefined, name: string): number {
  return player ? (player.skillFusions ?? []).filter((fusion) => isFusionActive(player, fusion) &&
    getFusionRecipe(fusion.skillId)?.skill.name === name).length : 0;
}

export function hasEnhancedPutianRange(player: FusionOwner | undefined): boolean {
  return Boolean(player && ["大抠天下", "核战", "逐日之弓"].some((name) => getFusionEnhancementCount(player, "1097", [name]) > 0));
}

export function getFreeSkillChargeId(player: FusionOwner, skillId: SkillId): string | undefined {
  if (skillId === "1051905") return "free_sky_strike";
  if (skillId === "1086") return "free_lian_bao";
  if (skillId === VERDICT_ACTION_ID) return "free_imperial_verdict";
  if (skillId === "1081" && getFusionEnhancementCount(player, skillId, ["后羿•七日连珠", "猥琐老司机"]) > 0) return "free_ri";
  return undefined;
}

export function getAbsoluteGuardCost(player: FusionOwner, attackCost: number): number {
  if (getFusionEnhancementCount(player, "1073", ["神域守护"]) > 0) return Math.floor(attackCost / 4);
  if (getFusionEnhancementCount(player, "1073", ["绝对天盾"]) > 0) return Math.floor(attackCost / 3);
  return Math.ceil(attackCost / 2);
}

export function isFusionImplemented(skillId: SkillId): boolean {
  const recipe = getFusionRecipe(skillId);
  return Boolean(recipe && IMPLEMENTED_FUSIONS.has(recipe.skill.name));
}

/** Physical ownership of a retained fusion, independent of temporary suppression. */
export function hasFusionQuota(player: FusionOwner, fusion: SkillFusionState): boolean {
  return isFusionImplemented(fusion.skillId) && isRetainedByFusionParents(player, fusion, undefined, true);
}

export function isFusionPreparation(state: Pick<GameState, "phase" | "activeTimingPhase" | "roundNumber" | "turnNumber">): boolean {
  return state.phase === "action_window" && state.activeTimingPhase === "opening_action" &&
    state.roundNumber === 1 && state.turnNumber === 1;
}

export function isFusionActive(player: FusionOwner, fusion: SkillFusionState): boolean {
  if (!isEraEternalFusion(player, fusion) && isThornSkillDisabled(player, fusion.skillId)) return false;
  if (!emptyCitySkillSourceAllowed(player, fusion.skillId, fusion.sourceBigCardInstanceId) || !isFusionUsable(player, fusion)) return false;
  const ignored = ignoredSkillCopies(player, fusion.skillId);
  if (ignored === Infinity) return false;
  return !ignored || ![...(player.skillFusions ?? [])]
    .sort((a, b) => (a.acquisitionOrder ?? Infinity) - (b.acquisitionOrder ?? Infinity))
    .filter((entry) => entry.skillId === fusion.skillId && isFusionUsable(player, entry) &&
      emptyCitySkillSourceAllowed(player, entry.skillId, entry.sourceBigCardInstanceId))
    .slice(0, ignored).some((entry) => entry.id === fusion.id);
}

export const FINALE_COLLAPSE_SKILLS = ["1012", "1014", "1106"] as const;

export function getFinaleCollapseSource(player: FusionOwner | undefined, skillId: SkillId): SkillFusionState | undefined {
  if (!player || !FINALE_COLLAPSE_SKILLS.some((id) => id === skillId)) return undefined;
  const collapse = player.buffs.filter((buff) => buff.id.startsWith("collapse_until_round:"));
  if (!collapse.length || collapse.some((buff) => buff.sourcePlayerId !== player.id || !buff.sourceFusionId)) return undefined;
  const view = { ...player, buffs: player.buffs.filter((buff) => !collapse.includes(buff)) };
  return player.skillFusions?.find((fusion) => getFusionRecipe(fusion.skillId)?.skill.name === "终结" &&
    collapse.every((buff) => buff.sourceFusionId === fusion.id) && isFusionActive(view, fusion));
}

function isFusionUsable(player: FusionOwner, fusion: SkillFusionState): boolean {
  if (isEraEternalFusion(player, fusion))
    return isRetainedByFusionParents(player, fusion) && !isPlayerSkillSealed(player, fusion.skillId);
  const skill = getFusionRecipe(fusion.skillId)?.skill;
  return isFusionImplemented(fusion.skillId) && !hasPausedFusionMaterial(player, fusion) &&
    !isLockedSkillSuppressed(player, skill) && !isAttributeSkillSuppressed(player, skill) && !swordArrayNoCakeSuppressesPassive(player, fusion.skillId) &&
    isRetainedByFusionParents(player, fusion) && !isPlayerSkillSealed(player, fusion.skillId) && !player.buffs.some((buff) =>
    buff.id.startsWith("collapse_until_round:") ||
    (buff.id === BUBBLE_SKILLS_DISABLED || (negativeStatusesHaveNoEffect(player) ? isAllSkillsSealedBuff(buff.id) : isSkillSuppressedByBuff(buff.id))));
}

function isEraEternalFusion(player: FusionOwner, fusion: SkillFusionState): boolean {
  return getFusionRecipe(fusion.skillId)?.skill.name === "永恒" && Boolean(fusion.sourceBigCardInstanceId &&
    player.bigCards?.some((card) => card.instanceId === fusion.sourceBigCardInstanceId && bigCardHasAbility(card, ERA_INHERIT, true)));
}

function pausedCardIds(player: Pick<FusionOwner, "bigCards">): Set<string> {
  return new Set(player.bigCards?.flatMap((card) => card.junengDisabled ?
    [card.instanceId, ...Object.keys(card.sacredBeasts ?? {}).map((key) => `${card.instanceId}:beast:${key}`)] :
    (card.temporarilyLostAbilityIds ?? []).flatMap((id) => id === KAIGE_LIVES_ID ?
      [2, 3, 4, 5, 6, 7, 8, 9].map((stage) => `${card.instanceId}:kaige:105200${stage}`) : [`${card.instanceId}:kaige:${id}`])));
}

function pausedInheritedInstances(player: Pick<FusionOwner, "bigCards"> & Partial<Pick<FusionOwner, "buffs">>): Set<string> {
  const bladesPaused = Boolean(player.buffs && isPlayerSkillSealed({ buffs: player.buffs }, BLADE_INHERIT_ID)) ||
    ignoredSkillCopies(player, BLADE_INHERIT_ID) > 0;
  const seaGodPaused = Boolean(player.buffs && (isPlayerSkillSealed({ buffs: player.buffs }, SEA_GOD_INHERIT_ID) ||
    isLockedSkillSuppressed({ buffs: player.buffs, bigCards: player.bigCards }, { id: SEA_GOD_INHERIT_ID, typeTags: ["锁定技"] }) ||
    swordArrayNoCakeSuppressesPassive({ buffs: player.buffs }, SEA_GOD_INHERIT_ID))) || ignoredSkillCopies(player, SEA_GOD_INHERIT_ID) > 0;
  return new Set(player.bigCards?.flatMap((card) => [...(card.temporarilyLostAbilityIds ?? []),
    ...Object.keys(TIGER_GRANTS).filter((id) => !tigerAbilityActive(card, id)),
    ...FIVE_ELEMENTS_KEYS.map((key) => FIVE_ELEMENTS_FORMS[key].ability).filter((id) => !fiveElementsAbilityActive(card, id)),
    ...(!hexagramAbilityActive(card, HEXAGRAM_SOUL) ? [HEXAGRAM_SOUL] : []),
    ...(!sevenStarAbilityActive(card, SEVEN_STAR_TIANJI) ? [SEVEN_STAR_TIANJI] : []),
    ...(card.cardId === TIAN_SHA_CARD ? [card.tianShaCrowded ? TIAN_SHA_SWORD : TIAN_SHA_POWER] : [])].flatMap((id) =>
    card.inheritedSkillInstances?.[id] ?? card.wujinGrantInventory?.[id] ?? card.jueyingGrantInventory?.[id] ??
    card.chaofanGrantInventory?.[id] ?? (id === XIELING_INHERIT_ID ? card.xielingGrantInventory ?? [] : []))
    .concat(card.cardId === BROKEN_BLADE_CARD_ID && (bladesPaused || getBrokenBlade(card).remaining === 0)
      ? [...brokenBladeGrants(card)] : [])
    .concat(seaGodPaused ? card.inheritedSkillInstances?.[SEA_GOD_INHERIT_ID] ?? [] : [])));
}

function hasPausedFusionMaterial(player: Pick<FusionOwner, "bigCards" | "skillInventory" | "skillFusions"> & Partial<Pick<FusionOwner, "buffs">>, fusion: SkillFusionState,
  paused = pausedCardIds(player), inherited = pausedInheritedInstances(player)): boolean {
  if (paused.size === 0 && inherited.size === 0) return false;
  if (fusion.sourceBigCardInstanceId && paused.has(fusion.sourceBigCardInstanceId)) return true;
  if (player.skillInventory?.some((item) => (inherited.has(item.instanceId) || paused.has(item.sourceBigCardInstanceId ?? "")) &&
    fusion.materialInstanceIds?.includes(item.instanceId))) return true;
  return Boolean(player.skillFusions?.some((child) => fusion.materialFusionIds?.includes(child.id) && hasPausedFusionMaterial(player, child, paused, inherited)));
}

function isRetainedByFusionParents(player: FusionOwner, fusion: SkillFusionState, materialId?: SkillId, storedQuota = false): boolean {
  let child = fusion;
  for (;;) {
    const parent = player.skillFusions?.find((item) => item.materialFusionIds?.includes(child.id));
    if (!parent) return true;
    if (parent.skillId === PROSPERITY_FUSION_ID && materialId === "1011") return false;
    const recipe = getFusionRecipe(parent.skillId);
    const retainsEffect = recipe?.retainedMaterialIds.includes(child.skillId) ||
      (materialId && recipe?.retainedInheritedMaterialIds?.includes(materialId));
    if (getFusionTier(parent.skillId) <= getFusionTier(child.skillId) || !retainsEffect || !storedQuota &&
      (ignoresFusionFamily(player, parent.skillId) || isPlayerSkillSealed(player, parent.skillId))) return false;
    child = parent;
  }
}

/** Count only the covered copies whose original effect is still active. */
export function getFusionEnhancementCount(player: FusionOwner, materialId: SkillId, names: readonly string[]): number {
  if (isPlayerSkillSealed(player, materialId)) return 0;
  return (player.skillFusions ?? []).filter((fusion) => isFusionActive(player, fusion) &&
    fusion.materialSkillIds.includes(materialId) && names.includes(getFusionRecipe(fusion.skillId)?.skill.name ?? "")).length;
}

export function getVortexCostOverride(player: FusionOwner, skillId: SkillId): number | undefined {
  const fusion = skillId === "1118" ? "炽焰" : skillId === "1117" ? "极寒" : undefined;
  return fusion && getFusionEnhancementCount(player, skillId, [fusion]) > 0 ? 1 : undefined;
}

export function isHigherFusionAreaAttack(player: FusionOwner | undefined, id: SkillId): boolean {
  if (!player) return false;
  if (id === "1084" || id === "1085") return getFusionEnhancementCount(player, id, ["魔音贯耳"]) > 0;
  return id === "1077" && getFusionEnhancementCount(player, id, ["流星雨"]) > 0;
}

export function getDestroyPowerUsePools(player: FusionOwner, roundNumber: number) {
  const copies = Math.max(0, player.skills.filter((id) => id === "1044").length - countSuppressedFusionMaterials(player, "1044"));
  const enhancedSlots = Math.min(copies, getFusionEnhancementCount(player, "1044", ["末世", "宗师之力", "毁灭之魂"]));
  const active = player.buffs.filter((buff) => buff.id.startsWith("destroy_power_cooldown") &&
    (buff.expiresAtRound === undefined || buff.expiresAtRound > roundNumber));
  const previousRound = active.filter((buff) => buff.expiresAtRound === roundNumber + 1).length;
  const currentRound = active.length - previousRound;
  const enhancedReady = Math.max(0, enhancedSlots - currentRound);
  const ordinarySlots = copies - enhancedSlots;
  const ordinaryReady = Math.max(0, ordinarySlots - Math.max(0, previousRound - enhancedSlots) -
    Math.max(0, currentRound - enhancedSlots));
  return [
    { key: "1044", interval: 2, quota: ordinarySlots, nativeUses: ordinaryReady },
    { key: "1044:enhanced", interval: 1, quota: enhancedSlots, nativeUses: enhancedReady }
  ] as const;
}

export function getDestroyPowerRemainingUses(player: FusionOwner, roundNumber: number): number {
  return getDestroyPowerUsePools(player, roundNumber).reduce((total, pool) =>
    total + getPeriodicUses(player, pool.key, roundNumber, pool.nativeUses), 0);
}

/** Keep the original cooldown ledger, so fusion and decomposition do not reset uses. */
export function getDestroyPowerCooldownCount(player: FusionOwner, roundNumber: number): number {
  if (asuraInheritanceCopies(player)) return 0;
  const pools = getDestroyPowerUsePools(player, roundNumber);
  return Math.max(0, pools.reduce((total, pool) => total + pool.quota, 0) -
    Math.max(0, getDestroyPowerRemainingUses(player, roundNumber)));
}

export const HUIYUE_BUFF_ID = "huiyue_stasis";

export function isHuiyueActive(player: Pick<PlayerState, "buffs"> | undefined, turnNumber: number): boolean {
  return Boolean(player?.buffs.some((buff) => buff.id === HUIYUE_BUFF_ID && buff.stacks > 0 &&
    (buff.expiresAtTurn ?? -1) >= turnNumber));
}

/** Both spells retain a three-round baseline ledger, including through decomposition. */
export function getFlashFamilySlots(player: FusionOwner, roundNumber: number, ignoreBalance = false) {
  const dedicated = (player.skillFusions ?? []).filter((fusion) => getFusionRecipe(fusion.skillId)?.skill.name === "虚无" &&
    isFusionActive(player, fusion) && player.bigCards?.some((card) => card.cardId === VACUUM_CARD_ID &&
      card.instanceId === fusion.sourceBigCardInstanceId && bigCardHasAbility(card, VACUUM_INHERIT_ID))).length;
  const count = Math.max(0, player.skills.filter((id) => id === "1102").length - dedicated -
    countSuppressedFusionMaterials(player, "1102"));
  const oneRound = Math.max(0, getFusionEnhancementCount(player, "1102", ["虚无"]) - dedicated);
  const wineSlots = 3 * getFusionEnhancementCount(player, "1102", ["将进酒"]);
  const twoRound = getFusionEnhancementCount(player, "1102", ["空之轨迹"]);
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
  if (!ignoreBalance) slots.forEach((slot, index) => {
    slot.ready = periodicUseReadyAt(player, periodicFlashUseKey(slot.fusionId, index), roundNumber, slot.ready);
  });
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
  return getFusionEnhancementCount(player, "1093", ["逆转星移"]) > 0 ? INFINITE_DAMAGE : 3;
}

export function getOwnedSkillIds(player: Pick<PlayerState, "skills" | "skillFusions" | "bigCards"> & Partial<Pick<PlayerState, "buffs" | "karmaReincarnation" | "skillInventory">>): SkillId[] {
  return [...player.skills.filter((_, index) => !player.skillInventory?.[index]?.convertedMaterial),
    ...(player.skillFusions ?? []).map((fusion) => fusion.skillId), ...getOwnedBigAbilityIds(player),
    ...(player.buffs ? tigerTemporarySkills({ buffs: player.buffs }) : []),
    ...(player.skillFusions?.some((fusion) => fusion.skillId === VETERAN_FUSION_ID) ? [VETERAN_DECENCY_ID, VETERAN_SHATTER_ID] : []),
    ...sandGrantSkillIds(player), ...siphonRevivalSkillIds(player), ...(asuraBarrierUses(player) ? [ASURA_BARRIER_SKILL_ID] : []),
    ...(player.buffs?.some((buff) => buff.itemKind === VACUUM_ITEM && buff.stacks > 0) ? [ANTI_CAKE_MOVE_ID] : []),
    ...(player.karmaReincarnation ? [KARMA_SONG_END_ID] : []),
    ...(player.buffs?.some(({ id }) => id === CHEAT_SHARP_STOCK) ? [CHEAT_SHARP_DAMAGE_ID] : [])];
}

/** Card layout only: runtime material skills keep their identity and usage counters. */
export function getSkillCardIds(player: FusionInventoryOwner): SkillId[] {
  return listFusionMaterials(player, true, true).map((entry) => entry.skillId);
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

function isStarShiftUse(skillId: SkillId): skillId is "1092" | "1093" {
  return skillId === REVERSAL_SKILL_ID || skillId === DAMAGE_REDIRECT_SKILL_ID;
}

function enhancedStarShiftStock(player: FusionOwner): Set<string> {
  return getEnhancedChildFusionIds(player, "六转生死阵", REVERSAL_SHIFT_FUSION_ID);
}

function starShiftCapacity(player: FusionOwner, fusion: SkillFusionState, skillId: "1092" | "1093", enhanced: boolean): number {
  if (skillId === DAMAGE_REDIRECT_SKILL_ID || enhanced) return 2;
  return player.bigCards?.some((card) => card.instanceId === fusion.sourceBigCardInstanceId && card.cardId === STAR_CARD_ID &&
    bigCardHasAbility(card, STAR_INHERIT_ID)) ? 2 : 1;
}

export function getDepletedSixReversalArrays(player: FusionOwner): SkillFusionState[] {
  const active = enhancedStarShiftStock(player);
  if (!active.size) return [];
  const children = new Set((player.skillFusions ?? []).filter((fusion) => active.has(fusion.id) &&
    (fusion.starShiftUses?.[REVERSAL_SKILL_ID] ?? 0) >= 2 && (fusion.starShiftUses?.[DAMAGE_REDIRECT_SKILL_ID] ?? 0) >= 2)
    .map(({ id }) => id));
  return (player.skillFusions ?? []).filter((fusion) => fusion.skillId === SIX_REVERSAL_ARRAY_ID && isFusionActive(player, fusion) &&
    fusion.materialFusionIds?.some((id) => children.has(id)));
}

function recordStarShiftUse(player: FusionOwner, skillId: "1092" | "1093"): SkillFusionState | undefined {
  const enhanced = enhancedStarShiftStock(player);
  const available = (player.skillFusions ?? []).filter((fusion) => fusion.skillId === REVERSAL_SHIFT_FUSION_ID && isFusionActive(player, fusion) &&
    (fusion.starShiftUses?.[skillId] ?? 0) < starShiftCapacity(player, fusion, skillId, enhanced.has(fusion.id)));
  const fusion = available.find((copy) => enhanced.has(copy.id)) ?? available[0];
  if (fusion) (fusion.starShiftUses ??= {})[skillId] = (fusion.starShiftUses?.[skillId] ?? 0) + 1;
  return fusion;
}

export function restoreStarShiftUses(player: FusionOwner, skillId: SkillId, count: number): void {
  if (!isStarShiftUse(skillId) || count <= 0) return;
  const enhanced = enhancedStarShiftStock(player);
  const used = (player.skillFusions ?? []).filter((fusion) => fusion.starShiftUses?.[skillId]);
  for (const fusion of [...used.filter((copy) => enhanced.has(copy.id)), ...used.filter((copy) => !enhanced.has(copy.id))]) {
    const restored = Math.min(count, fusion.starShiftUses![skillId]!);
    fusion.starShiftUses![skillId]! -= restored;
    const source = player.bigCards?.find(({ instanceId }) => instanceId === fusion.sourceBigCardInstanceId);
    if (source?.grantedSkillUses?.[skillId]) {
      const remaining = Math.max(0, source.grantedSkillUses[skillId]! - restored);
      if (remaining) source.grantedSkillUses[skillId] = remaining;
      else delete source.grantedSkillUses[skillId];
    }
    count -= restored;
    if (!count) break;
  }
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
  return listFusionMaterials(player, includeBonus, includeBonus);
}

function listFusionMaterials(player: FusionInventoryOwner, includeBonus: boolean, includeBoundBlades: boolean): FusionMaterial[] {
  const fusions = player.skillFusions ?? [];
  const paused = pausedCardIds(player);
  const covered = new Set(fusions.flatMap((fusion) => (fusion.materialInstanceIds ?? [])
    .filter((id) => !fusion.rerollCompletedSlotIds?.includes(id))));
  const boundBlades = includeBoundBlades ? [] : (player.bigCards ?? []).filter((card) => bigCardHasAbility(card, BLADE_INHERIT_ID));
  const boundFusionIds = new Set(boundBlades.map((card) => getBrokenBlade(card).fusionInstanceId));
  for (const card of boundBlades) for (const id of brokenBladeGrants(card)) covered.add(id);
  if (!includeBonus) for (const fusion of fusions) {
    if (fusion.acquisition?.bonusSkillInstanceId) covered.add(fusion.acquisition.bonusSkillInstanceId);
  }
  const raw = player.skills.map<FusionMaterial>((skillId, index) => ({
    skillId, kind: "skill", instanceId: player.skillInventory?.[index]?.instanceId ?? `legacy:${index}`
  })).filter((entry, index) => !covered.has(entry.instanceId) && !player.skillInventory?.[index]?.convertedMaterial &&
    !paused.has(player.skillInventory?.[index]?.sourceBigCardInstanceId ?? ""));
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
  return [...raw, ...getRootFusions(player).filter((fusion) => !boundFusionIds.has(fusion.id) &&
    !hasPausedFusionMaterial(player, fusion, paused)).map((fusion): FusionMaterial => ({
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

export function getFusionUseBonus(player: FusionOwner, skillId: SkillId, storedQuota = false): number {
  const counts = storedQuota ? hasFusionQuota : isFusionActive;
  return (player.skillFusions ?? []).reduce((sum, fusion) => {
    if (!counts(player, fusion)) return sum;
    const name = getFusionRecipe(fusion.skillId)?.skill.name;
    const extra = player.buffs.find((buff) => buff.id === `fusion_use_bonus:${skillId}` && buff.sourceFusionId === fusion.id)?.stacks ?? 0;
    if (name === "金胸罩") return sum + (player.buffs.find((buff) =>
      buff.id === `fusion_use_bonus:${skillId}` && buff.sourceFusionId === fusion.id)?.stacks ?? 0);
    if (name === "风之轻灵" && skillId === "1103" &&
      fusion.materialFusionIds?.some((id) => player.skillFusions?.some((child) =>
        child.id === id && child.materialSkillIds.includes(skillId) && counts(player, child)))) return sum + 1;
    if (fusion.skillId === ALIEN_FUSION_ID && skillId === REVERSAL_SKILL_ID &&
      fusion.materialFusionIds?.some((id) => player.skillFusions?.some((child) =>
        child.id === id && child.materialSkillIds.includes(skillId) &&
        (storedQuota || !isPlayerSkillSealed(player, child.skillId))))) return sum + 1;
    if (fusion.skillId === SIX_REVERSAL_ARRAY_ID && skillId === REVERSAL_SKILL_ID &&
      fusion.materialFusionIds?.some((id) => player.skillFusions?.some((child) =>
        child.id === id && child.skillId === REVERSAL_SHIFT_FUSION_ID && counts(player, child)))) return sum + 1;
    if (!fusion.materialSkillIds.includes(skillId)) return sum;
    if (name === "逆转星移" && skillId === REVERSAL_SKILL_ID && fusion.sourceBigCardInstanceId &&
      player.bigCards?.some((card) => card.instanceId === fusion.sourceBigCardInstanceId && card.cardId === STAR_CARD_ID &&
        !card.lostAbilityIds?.includes(STAR_INHERIT_ID)) && (storedQuota || !isPlayerSkillSealed(player, STAR_INHERIT_ID))) return sum + 1;
    if (name === "暗影之魂" && skillId === "1024") return sum + 1 + (player.buffs.find((buff) =>
      buff.id === `fusion_use_bonus:${skillId}` && buff.sourceFusionId === fusion.id)?.stacks ?? 0);
    if (name === "风之轻灵" && skillId === "1014") return sum + 1;
    if ((name === "炽焰" && skillId === "1012") || (name === "极寒" && skillId === "1013")) return sum + 1;
    if (name === "魔方" && skillId === "1100") return sum + 3;
    if (name === "幻境双罩") return sum + 2;
    if (name === "交流电" && skillId === "1035") return sum + 1;
    if (name === "烽火赤壁" && skillId === "1012") return sum + 2 + extra;
    if (name === "烽火赤壁" && skillId === "1014") return sum + extra;
    if (name === "空之轨迹" && skillId === "1103") return sum + 1;
    if (name === "遗迹" && skillId === "1103") return sum + 4;
    if (name === "逐日之弓" && skillId === "1099") return sum + 1;
    if (name === "野蛮人" && skillId === "1092") return sum + 1;
    return sum;
  }, 0);
}

export function countSuppressedFusionMaterials(player: FusionOwner, skillId: SkillId, storedQuota = false): number {
  const paused = storedQuota ? new Set<string>() : pausedCardIds(player);
  const inherited = storedQuota ? new Set<string>() : pausedInheritedInstances(player);
  const pausedCopies = player.skillInventory?.filter((item) => item.skillId === skillId &&
    (item.convertedMaterial || inherited.has(item.instanceId) || paused.has(item.sourceBigCardInstanceId ?? ""))) ?? [];
  const pausedInstances = new Set(pausedCopies.map((item) => item.instanceId));
  return (player.skillFusions ?? []).reduce((sum, fusion) => {
    if (fusion.rerollCompletedSlotIds && skillId === "1002") {
      return (storedQuota ? hasFusionQuota : isFusionActive)(player, fusion) ? sum : sum + (fusion.materialInstanceIds ?? [])
        .filter((id) => !fusion.rerollCompletedSlotIds!.includes(id) && !pausedInstances.has(id)).length;
    }
    const count = fusion.materialSkillIds.filter((id) => id === skillId).length -
      (fusion.materialInstanceIds?.filter((id) => pausedInstances.has(id)).length ?? 0);
    if (!isRetainedByFusionParents(player, fusion, skillId, storedQuota) || !storedQuota &&
      (ignoresFusionFamily(player, fusion.skillId) || hasPausedFusionMaterial(player, fusion, paused, inherited) || isPlayerSkillSealed(player, fusion.skillId)))
      return sum + count + Number(fusion.acquisition?.bonusSkillId === skillId && !pausedInstances.has(fusion.acquisition.bonusSkillInstanceId ?? ""));
    if (getFusionRecipe(fusion.skillId)?.skill.name === "沙皇" && skillId === "1003") {
      return sum + 1 + Number(Boolean(fusion.acquisition?.smallUsed));
    }
    return sum + (getFusionRecipe(fusion.skillId)?.retainedMaterialIds.includes(skillId) ? 0 : count);
  }, pausedCopies.length);
}

export function canUseRawSkillInstance(player: FusionOwner, index: number): boolean {
  const entry = player.skillInventory?.[index];
  if (!entry) return true;
  if (entry.convertedMaterial) return false;
  const paused = pausedCardIds(player);
  const pausedMaterials = pausedInheritedInstances(player);
  if (paused.has(entry.sourceBigCardInstanceId ?? "") || pausedMaterials.has(entry.instanceId)) return false;
  const fusion = player.skillFusions?.find(({ materialInstanceIds }) => materialInstanceIds?.includes(entry.instanceId));
  return !fusion || isRetainedByFusionParents(player, fusion, entry.skillId) &&
    !ignoresFusionFamily(player, fusion.skillId) && !hasPausedFusionMaterial(player, fusion, paused, pausedMaterials) &&
    !isPlayerSkillSealed(player, fusion.skillId) && getFusionRecipe(fusion.skillId)?.retainedMaterialIds.includes(entry.skillId) === true;
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

export function recordSkillUse(player: PlayerState, skillId: SkillId): SkillFusionState | undefined {
  if (skillId === "1100") {
    const mirror = player.skillFusions?.find((fusion) => getFusionRecipe(fusion.skillId)?.skill.name === "天魔舞" &&
      fusion.acquisition?.smallUsed && !fusion.acquisition.smallUseRecorded);
    if (mirror?.acquisition) {
      mirror.acquisition.smallUseRecorded = true;
      if (mirror.acquisition.mirrorMaterialUsed) return;
      mirror.acquisition.mirrorMaterialUsed = true;
    }
  }
  const costs = [skillId, ...(getFusionRecipe(skillId)?.materialUseCosts ?? [])];
  let usedFusion: SkillFusionState | undefined;
  for (const usedId of costs) {
    if (spendTianlieTemporaryUse(player, usedId)) continue;
    if (isStarShiftUse(usedId)) usedFusion = recordStarShiftUse(player, usedId);
    const id = `skill_used:${usedId}`;
    const existing = player.buffs.find((buff) => buff.id === id);
    if (existing) existing.stacks += 1;
    else player.buffs.push({ id, name: "技能使用次数", stacks: 1 });
  }
  return usedFusion;
}
