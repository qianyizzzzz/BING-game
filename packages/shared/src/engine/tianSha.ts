import type { GameState, PlayerId, PlayerState, SkillId } from "../types";
import { RAW_BIG_CARD_CATALOG } from "../bigCards/generatedCatalog";
import { bigCardHasAbility } from "../bigCards/abilities";
import { getSkill } from "../skills/registry";
import { getActiveSkillCount } from "./gameFactory";
import { canDiscardBigCard } from "./bigCards";
import { getCombatSeatDistance, getCombatSeatGroups } from "./seating";
import { isSkillIgnorable, isSkillIgnored } from "./skillIgnore";
import { CURTAIN_VEIL_ID } from "./curtainIds";
import { TIAN_SHA_CARD, TIAN_SHA_IGNORED_MOVE, TIAN_SHA_POWER, TIAN_SHA_REFLECTION, TIAN_SHA_SHADOW,
  TIAN_SHA_STAR_BREAK, TIAN_SHA_SWORD } from "./tianShaIds";

const lightAndDivineSkills = new Set(["沐浴圣光", "阳光普照", "神之庇护", "神族水晶", "圣", "齐天大圣", "神罩", "圣域", "圣灵之境", "百炼成神"]);

export function tianShaSpaceCount(state: Pick<GameState, "players">, player: PlayerState): number {
  return state.players.filter((other) => other.status === "alive" && other.kind !== "spectator" && !other.summon &&
    other.spaceId === player.spaceId).length;
}

export function tianShaNeighbor(state: Pick<GameState, "players">, owner: PlayerState, targetId: PlayerId): boolean {
  return owner.id !== targetId && getCombatSeatDistance(getCombatSeatGroups(state, owner.spaceId), owner.id, targetId) === 1;
}

export function tianShaIgnoresNeighbor(state: Pick<GameState, "players">, owner: PlayerState | undefined, targetId: PlayerId | undefined): boolean {
  return Boolean(owner && targetId && owner.id !== targetId && owner.bigCards?.some(({ cardId }) => cardId === TIAN_SHA_CARD) &&
    getActiveSkillCount(owner, TIAN_SHA_POWER) && tianShaSpaceCount(state, owner) > 3 && tianShaNeighbor(state, owner, targetId));
}

export function syncTianShaGrants(state: Pick<GameState, "players">): void {
  for (const player of state.players) {
    const cards = player.bigCards?.filter((card) => card.cardId === TIAN_SHA_CARD);
    if (!cards?.length) continue;
    const crowded = tianShaSpaceCount(state, player) > 3;
    for (const card of cards) card.tianShaCrowded = crowded;
  }
}

export function tianShaSkillName(skillId: SkillId): string | undefined {
  const registered = getSkill(skillId);
  const card = RAW_BIG_CARD_CATALOG.find(({ id }) => skillId.startsWith(id));
  if (!card) return registered?.name;
  const child = card.abilities.find(({ id }) => id === skillId);
  return child?.description.replace(/^(?:(?:锁定技|限定技|控制技|复活技)[。；，、\s]+)+/u, "")
    .match(/^\s*([^：。；，\n]{1,24})[：:]/u)?.[1]?.trim();
}

export function tianShaVerdictPayment(player: PlayerState, sourceId?: string) {
  const cards = [...(player.bigCards ?? [])];
  if (sourceId) cards.sort((left, right) => Number(right.instanceId === sourceId) - Number(left.instanceId === sourceId));
  const payment = [TIAN_SHA_SWORD, TIAN_SHA_STAR_BREAK].map((id) => {
    const card = cards.find((entry) => bigCardHasAbility(entry, id) && canDiscardBigCard(player, entry));
    return card ? { id, card } : undefined;
  });
  return payment.every((entry) => entry !== undefined) ? payment : [];
}

export function canDiscardTianShaFinale(player: PlayerState): boolean {
  return !(player.bigCards ?? []).some((card) => !canDiscardBigCard(player, card) || bigCardHasAbility(card, CURTAIN_VEIL_ID)) &&
    !player.skills.includes(CURTAIN_VEIL_ID) && !player.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_discard"));
}

export function tianShaSkillAttributes(owner: PlayerState | undefined, cardId: string): string {
  const attributes = RAW_BIG_CARD_CATALOG.find(({ id }) => id === cardId)?.attribute ?? "";
  return getActiveSkillCount(owner, TIAN_SHA_SHADOW) ? attributes.replace(/黑暗|暗/g, "") : attributes;
}

export function tianShaIgnoresSkill(state: Pick<GameState, "players">, target: PlayerState | undefined,
  sourceId: PlayerId | undefined, skillId: SkillId): boolean {
  if (!target || !isSkillIgnorable(skillId)) return false;
  if (tianShaIgnoresNeighbor(state, target, sourceId)) return true;
  if (!target.bigCards?.some(({ cardId }) => cardId === TIAN_SHA_CARD) || !getActiveSkillCount(target, TIAN_SHA_SHADOW)) return false;
  const parent = skillId.match(/^\d{5}(?=\d{2})/)?.[0];
  const source = sourceId ? state.players.find((player) => player.id === sourceId) : undefined;
  return parent ? /[光神]/.test(tianShaSkillAttributes(source, parent)) : lightAndDivineSkills.has(getSkill(skillId)?.name ?? "");
}

export function tianShaIgnoresMove(target: PlayerState | undefined, sourceId: PlayerId | undefined): boolean {
  return Boolean(target && target.buffs.some((buff) => buff.stateType === TIAN_SHA_IGNORED_MOVE && buff.sourcePlayerId === sourceId &&
    (!buff.sourceAbilityId || !isSkillIgnored(target, buff.sourceAbilityId))));
}

export function tianShaReflection(target: PlayerState | undefined, turn: number, sourceId?: PlayerId): boolean {
  return Boolean(target && sourceId && target.id !== sourceId && target.buffs.some((buff) =>
    buff.stateType === TIAN_SHA_REFLECTION && (buff.expiresAtTurn ?? 0) > turn && (!buff.sourceAbilityId || !isSkillIgnored(target, buff.sourceAbilityId))));
}
