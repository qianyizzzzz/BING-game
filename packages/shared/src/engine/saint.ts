import { bigCardHasAbility, CHAOFAN_JUDGMENT_ID, CHAOFAN_MULTIPLY_ID, CHAOFAN_TREASURE_ID, GOD_KING_SAINT_ID } from "../bigCards/abilities";
import { getEnhancedChildFusionIds, getFusionEnhancementCount, getFusionSkillId, isFusionActive } from "../skills/fusion";
import type { AttackStats, GameState, PlayerState, SkillId } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import { canAffectAcrossSpace } from "./spaces";
import { withSkillsIgnored } from "./skillIgnore";
import { activeGodKingCards, getGodKingTotals } from "./godKing";

export const SAINT_AWAKENING_ID = "fusion_c72da101820b";
const SAINT = "1060";
const GREAT_SAINT = "1061";
const HOLY_WATER = "1062";

export function isSaintMove(id: SkillId): boolean {
  return id === SAINT || id === GREAT_SAINT || id === SAINT_AWAKENING_ID || id === GOD_KING_SAINT_ID;
}

function chaofanTreasureSources(player: PlayerState): Set<string> {
  if (!getActiveSkillCount(player, CHAOFAN_TREASURE_ID)) return new Set();
  return new Set((player.bigCards ?? []).filter((card) => !card.junengDisabled && bigCardHasAbility(card, CHAOFAN_TREASURE_ID))
    .map(({ instanceId }) => instanceId));
}

export function getSaintMoveMultiplier(player: PlayerState | undefined, id: SkillId, instanceId?: string, roundNumber?: number): number {
  const royal = activeGodKingCards(player).flatMap((card) => {
    const { wins, losses } = getGodKingTotals(card);
    return (roundNumber ?? card.godKingProgress?.round) === wins + 1 ? [{ id: card.instanceId, value: (losses + 1) ** 2 }] : [];
  });
  const base = id === SAINT ? 2 : id === GREAT_SAINT ? 3 : id === SAINT_AWAKENING_ID ? 4 :
    id === GOD_KING_SAINT_ID ? royal.find((entry) => !instanceId || entry.id === instanceId)?.value ?? 0 : 0;
  if (!player || !base) return base;
  const chaofan = chaofanTreasureSources(player);
  const treasureChildren = getEnhancedChildFusionIds(player, "圣宝", SAINT_AWAKENING_ID);
  const awakenings = (player.skillFusions ?? []).filter((fusion) => fusion.skillId === SAINT_AWAKENING_ID && isFusionActive(player, fusion))
    .map((fusion) => chaofan.has(fusion.sourceBigCardInstanceId ?? "") ? 6 : treasureChildren.has(fusion.id) ? 5 : 4);
  if (awakenings.includes(6) && getActiveSkillCount(player, CHAOFAN_MULTIPLY_ID) > 0) {
    if (id !== SAINT_AWAKENING_ID) return 0;
    const multiplier = [...awakenings, ...royal.map(({ value }) => value)].reduce((product, value) => product * value,
      2 ** getActiveSkillCount(player, SAINT) * 3 ** getActiveSkillCount(player, GREAT_SAINT));
    return Math.min(Number.MAX_SAFE_INTEGER, multiplier);
  }
  return id === SAINT_AWAKENING_ID ? Math.max(base, ...awakenings) : base;
}

export function getSaintElements(player: Pick<PlayerState, "buffs"> | undefined): string[] {
  return player?.buffs.filter(({ id, stacks }) => id.startsWith("element:") && stacks > 0)
    .map(({ id }) => id.slice("element:".length)) ?? [];
}

export function getHolyWaterGain(player: PlayerState, roundTurnNumber: number): number {
  const total = getActiveSkillCount(player, HOLY_WATER);
  const enhanced = Math.min(total, getFusionEnhancementCount(player, HOLY_WATER, ["圣宝"]));
  const chaofan = chaofanTreasureSources(player);
  const upgraded = Math.min(enhanced, (player.skillFusions ?? []).filter((fusion) => fusion.skillId === getFusionSkillId("圣宝") &&
    isFusionActive(player, fusion) && chaofan.has(fusion.sourceBigCardInstanceId ?? "")).length);
  return (roundTurnNumber % 4 === 0 ? total - enhanced : 0) +
    (roundTurnNumber % 3 === 0 ? enhanced - upgraded : 0) +
    (roundTurnNumber % 2 === 0 ? upgraded : 0);
}

export function findSaintJudgmentOwner(state: GameState, target: PlayerState): PlayerState | undefined {
  return state.players.find((owner) => owner.id !== target.id && owner.status === "alive" &&
    canAffectAcrossSpace(state, owner.id, target.id) && getActiveSkillCount(owner, CHAOFAN_JUDGMENT_ID) > 0);
}

export function ignoresHeavenSword(target: PlayerState | undefined, stats: AttackStats): boolean {
  return withSkillsIgnored(target, stats.targetSkillIgnore, () => getActiveSkillCount(target, CHAOFAN_JUDGMENT_ID) > 0);
}

export function applyHeavenSwordTarget(target: PlayerState | undefined, stats: AttackStats): AttackStats {
  if (!stats.heavenSword) return stats;
  const ignored = ignoresHeavenSword(target, stats);
  const traits = new Set(stats.traits);
  for (const [source, trait] of [[stats.heavenSword.ignoreProtection, "ignore_protection"],
    [stats.heavenSword.pierceRebound, "pierce_rebound"]] as const) {
    if (!source) continue;
    if (ignored) traits.delete(trait); else traits.add(trait);
  }
  return { ...stats, traits: [...traits], ...(stats.heavenSword.ignoreSwordProtections ? { ignoreSwordProtections: !ignored } : {}) };
}
