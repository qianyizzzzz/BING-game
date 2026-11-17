import { EXECUTE_EFFECT_POWER, EXPLODE_EFFECT_POWER, type AttackStats, type PlayerState, type SkillId } from "../types";
import type { BigCardInstance } from "../bigCards/types";
import { bigCardHasAbility } from "../bigCards/abilities";
import { RAW_BIG_CARD_CATALOG } from "../bigCards/generatedCatalog";
import { getSkill } from "../skills/registry";
import { getFusionJudgmentRank, getFusionTier, getOwnedSkillIds } from "../skills/fusion";
import { getActiveSkillCount } from "./gameFactory";
import { bigAbilitySource } from "./bigCards";
import { judgmentRankAtLeast, readJudgmentRank } from "./judgmentRank";
import { attackLevelValue, attackPowerValue, compareCombatValues, combatValue, fromLegacyCombatStat, getPointDamageDefeatLevel,
  getPointDamageTrait, INFINITY_VALUE, multiplyCombatValues, projectCombatValue, RETIRE_VALUE, VANISH_VALUE,
  withAttackLevel, withAttackPower, type CombatValue } from "./combatValues";
import { appendSkillIgnoreCounts, isSkillIgnorable, type SkillIgnore } from "./skillIgnore";
import { NINE_COLD, NINE_GROWTH, NINE_SWORD_LORD, NINE_TRIBULATIONS_CARD } from "./nineTribulationsIds";

export type ColdLightField = "power" | "level";

export function coldLightLimit(card: BigCardInstance): number {
  return Math.min(Number.MAX_SAFE_INTEGER, 3 ** Math.floor((card.nineTribulationWounds ?? 0) / 9));
}

export function coldLightUses(card: BigCardInstance, turn: number): number {
  return Math.max(0, coldLightLimit(card) - (card.nineColdLight?.turn === turn ? card.nineColdLight.used : 0));
}

export function coldLightSource(player: PlayerState, turn: number, instanceId?: string): BigCardInstance | undefined {
  return player.bigCards?.find((card) => (!instanceId || card.instanceId === instanceId) && coldLightUses(card, turn) > 0 &&
    bigAbilitySource(player, { skillId: NINE_COLD, bigCardInstanceId: card.instanceId }));
}

export function recoverColdLightUses(player: PlayerState): void {
  for (const card of player.bigCards ?? []) if (bigCardHasAbility(card, NINE_COLD, true)) delete card.nineColdLight;
}

export function recordNineTribulationWound(player: PlayerState): void {
  if (!getActiveSkillCount(player, NINE_GROWTH)) return;
  for (const card of player.bigCards ?? []) if (!card.junengDisabled && bigCardHasAbility(card, NINE_GROWTH))
    card.nineTribulationWounds = (card.nineTribulationWounds ?? 0) + 1;
}

const execution = fromLegacyCombatStat(EXECUTE_EFFECT_POWER);
const explosion = fromLegacyCombatStat(EXPLODE_EFFECT_POWER);

function coldRank(value: CombatValue): number {
  if (compareCombatValues(value, execution) === 0 || compareCombatValues(value, explosion) === 0) return 4;
  if (compareCombatValues(value, VANISH_VALUE) === 0) return 3;
  if (compareCombatValues(value, RETIRE_VALUE) === 0) return 2;
  return 0;
}

export function applyColdLight(stats: AttackStats, field: ColdLightField): AttackStats {
  if (field === "power" && stats.nonAttackMove || field === "level" && stats.noClashLevel) return stats;
  const value = field === "power" ? attackPowerValue(stats) : attackLevelValue(stats);
  const stage = field === "power" ? getPointDamageDefeatLevel(stats) ?? coldRank(value) : coldRank(value);
  if (stage >= 4) return stats;
  const previous = stats.nineColdProgress?.[field];
  const progress = previous?.stage === stage ? previous.uses + 1 : 1;
  if (stage === 2 && progress < 2 || stage === 3 && progress < 4)
    return { ...stats, nineColdProgress: { ...stats.nineColdProgress, [field]: { stage, uses: progress } } };

  const transform = (part: CombatValue) => stage === 3 ? execution : stage === 2 ? VANISH_VALUE :
    compareCombatValues(part, INFINITY_VALUE) === 0 ? RETIRE_VALUE : multiplyCombatValues(part, INFINITY_VALUE);
  const next = transform(value);
  const nextProgress = { ...stats.nineColdProgress, [field]: { stage: coldRank(next), uses: 0 } };
  if (field === "level") return { ...withAttackLevel(stats, next), nineColdProgress: nextProgress };
  const updated = { ...withAttackPower({ ...stats, fixedPointPower: false }, next), nineColdProgress: nextProgress };
  const trait = getPointDamageTrait(next);
  updated.traits = stats.traits.filter((item) => !item.startsWith("defeat_"));
  if (trait) updated.traits.push(trait);
  if (trait) updated.fixedPointPower = true;
  if (stats.damagePartValues || stats.damageParts) {
    updated.damagePartValues = (stats.damagePartValues ?? stats.damageParts!.map((part) => combatValue(part))).map(transform);
    updated.damageParts = updated.damagePartValues.map(projectCombatValue);
  }
  return updated;
}

function swordLordActive(player: PlayerState | undefined): boolean {
  return Boolean(player?.bigCards?.some(({ cardId }) => cardId === NINE_TRIBULATIONS_CARD) && getActiveSkillCount(player, NINE_SWORD_LORD));
}

export function swordLordIgnores(holder: PlayerState | undefined, owner: PlayerState | undefined, skillId: SkillId | undefined,
  rank?: Parameters<typeof readJudgmentRank>[0]): boolean {
  if (!holder || !owner || holder.id === owner.id || !skillId || !swordLordActive(holder) || !isSkillIgnorable(skillId) || !getSkill(skillId)) return false;
  if (rank !== undefined) return !judgmentRankAtLeast(readJudgmentRank(rank), "V");
  const bigCard = RAW_BIG_CARD_CATALOG.find(({ id }) => skillId.startsWith(id));
  if (bigCard) return Number(bigCard.rankCode) <= 4;
  const fusions = owner.skillFusions?.filter((fusion) => fusion.skillId === skillId) ?? [];
  if (fusions.length) return fusions.every((fusion) => !judgmentRankAtLeast(getFusionJudgmentRank(fusion), "V"));
  const copies = owner.skillInventory?.filter((copy) => copy.skillId === skillId) ?? [];
  return copies.length ? copies.every((copy) => !judgmentRankAtLeast(readJudgmentRank(copy.judgmentRank ?? "I"), "V")) : getFusionTier(skillId) <= 4;
}

export function swordLordMask(holder: PlayerState | undefined, owner: PlayerState | undefined, mask?: SkillIgnore): SkillIgnore | undefined {
  if (!holder || !owner || holder.id === owner.id || !swordLordActive(holder) || mask && "all" in mask) return mask;
  const ids = new Set([...getOwnedSkillIds(owner), ...owner.buffs.flatMap((buff) => buff.sourceAbilityId ?? [])]);
  return appendSkillIgnoreCounts(mask, Object.fromEntries([...ids].filter((id) => swordLordIgnores(holder, owner, id) &&
    owner.buffs.every((buff) => buff.sourceAbilityId !== id || buff.sourceJudgmentRank === undefined ||
      swordLordIgnores(holder, owner, id, buff.sourceJudgmentRank)))
    .map((id) => [id, Number.MAX_SAFE_INTEGER])));
}
