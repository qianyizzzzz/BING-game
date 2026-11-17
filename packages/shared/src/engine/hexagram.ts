import type { BigCardInstance } from "../bigCards/types";
import { bigCardHasAbility } from "../bigCards/abilities";
import { RAW_BIG_CARD_CATALOG } from "../bigCards/generatedCatalog";
import type { GameState, PlayerState, SkillAction, SkillId } from "../types";
import { getSkillUseLimit } from "../skills/registry";
import { bigAbilitySource } from "./bigCards";
import { nextRoundCardForm } from "./cardForms";
import { getActiveSkillCount } from "./gameFactory";
import { HEXAGRAM_ARRAY, HEXAGRAM_CHOOSE, HEXAGRAM_DEATH, HEXAGRAM_FORMS, HEXAGRAM_KEYS, HEXAGRAM_SOUL, HEXAGRAM_SPIRIT,
  type HexagramForm } from "./hexagramIds";

export const HEXAGRAM_SIX_STAR = "1107";

export function hexagramRemainingUses(player: PlayerState, skillId: SkillId): number {
  const used = player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
  return getActiveSkillCount(player, skillId) ? Math.max(0, (getSkillUseLimit(player, skillId) ?? 0) - used) : 0;
}

export function advanceHexagramForms(state: GameState): void {
  if (state.roundNumber === 1) return;
  for (const player of state.players) {
    if (player.status !== "alive" || !getActiveSkillCount(player, HEXAGRAM_CHOOSE)) continue;
    for (const card of player.bigCards ?? []) {
      const forms = card.hexagramForms;
      if (!forms || forms.cleared || forms.chosenRound === state.roundNumber || !bigCardHasAbility(card, HEXAGRAM_CHOOSE)) continue;
      forms.active = nextRoundCardForm(forms, HEXAGRAM_KEYS);
      forms.chosenRound = state.roundNumber;
    }
  }
}

export function lostHexagramForms(card: BigCardInstance): HexagramForm[] {
  const forms = card.hexagramForms;
  return forms && !forms.cleared ? HEXAGRAM_KEYS.filter((key) => !forms.available.includes(key)) : [];
}

export function restoreHexagramForm(card: BigCardInstance, choice: string | undefined): boolean {
  const form = lostHexagramForms(card).find((key) => key === choice);
  if (!form || !card.hexagramRestores) return false;
  card.hexagramForms!.available.push(form);
  card.hexagramRestores--;
  return true;
}

export function countHexagramStars(state: GameState, payer: PlayerState, count: number): void {
  for (const player of state.players) {
    if (player.spaceId !== payer.spaceId || player.status !== "alive" || !getActiveSkillCount(player, HEXAGRAM_ARRAY)) continue;
    for (const card of player.bigCards ?? []) {
      if (!bigAbilitySource(player, { skillId: HEXAGRAM_ARRAY, bigCardInstanceId: card.instanceId })) continue;
      const total = (card.hexagramSpentStars ?? 0) + count;
      card.hexagramSpentStars = total % 6;
      const recoveries = Math.floor(total / 6);
      if (recoveries && lostHexagramForms(card).length > (card.hexagramRestores ?? 0))
        card.hexagramRestores = Math.min(lostHexagramForms(card).length, (card.hexagramRestores ?? 0) + recoveries);
    }
  }
}

export function hexagramPreventsDeath(state: GameState, target: PlayerState): boolean {
  return state.players.some((owner) => owner.status === "alive" && owner.spaceId === target.spaceId && getActiveSkillCount(owner, HEXAGRAM_DEATH));
}

export function countHexagramWound(player: PlayerState): number {
  if (!getActiveSkillCount(player, HEXAGRAM_SPIRIT)) return 0;
  let granted = 0;
  for (const card of player.bigCards ?? []) {
    if (!bigAbilitySource(player, { skillId: HEXAGRAM_SPIRIT, bigCardInstanceId: card.instanceId })) continue;
    if (card.hexagramSpiritWounds) {
      delete card.hexagramSpiritWounds;
      granted++;
    } else card.hexagramSpiritWounds = 1;
  }
  return granted;
}

export function rememberHexagramMirror(player: PlayerState, skillId: SkillId): void {
  const mirrored = player.mirroredSkillIds ??= [];
  if (!mirrored.includes(skillId)) mirrored.push(skillId);
}

export function hexagramInvalidates(target: PlayerState | undefined, skillId: SkillId): boolean {
  return Boolean(target?.mirroredSkillIds?.includes(skillId) && getActiveSkillCount(target, HEXAGRAM_SOUL));
}

export function hexagramCopyTarget(state: GameState, source: PlayerState, action: SkillAction): BigCardInstance | undefined {
  const target = state.players.find((player) => player.id === action.targetId);
  if (!target || target.id === source.id || target.status !== "alive" || target.spaceId !== source.spaceId ||
    !action.targetSkillId) return undefined;
  return target.bigCards?.find((card) => card.instanceId === action.targetBigCardInstanceId &&
    isHexagramCopyChoice(target, card, action.targetSkillId!));
}

export function isHexagramCopyChoice(target: PlayerState, card: BigCardInstance, skillId: SkillId): boolean {
  const definition = RAW_BIG_CARD_CATALOG.find(({ id }) => id === card.cardId);
  return Boolean(definition && Number(definition.rankCode) <= 6 &&
    (card.publiclyRevealed === true || target.revealedSkillIds.includes(skillId)) &&
    bigCardHasAbility(card, skillId) && definition.abilities.some(({ id }) => id === skillId));
}

export function getHexagramCopyChoices(state: GameState, source: PlayerState) {
  return state.players.flatMap((target) =>
    target.id === source.id || target.status !== "alive" || target.spaceId !== source.spaceId ? [] :
      (target.bigCards ?? []).flatMap((card) => (RAW_BIG_CARD_CATALOG.find(({ id }) => id === card.cardId)?.abilities ?? []).flatMap(({ id }) =>
        isHexagramCopyChoice(target, card, id) ?
          [{ targetId: target.id, targetBigCardInstanceId: card.instanceId, targetSkillId: id }] : [])));
}

export function hexagramStatusLabel(card: BigCardInstance): string | undefined {
  const forms = card.hexagramForms;
  if (!forms || forms.cleared || forms.active === "none") return undefined;
  const lost = lostHexagramForms(card);
  return `当前 ${HEXAGRAM_FORMS[forms.active].name}${lost.length ? " · 已失去 " + lost.map((form) => HEXAGRAM_FORMS[form].name).join("、") : ""}`;
}
