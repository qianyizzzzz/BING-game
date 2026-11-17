import type { BigCardInstance } from "../bigCards/types";
import type { RoundCardForms } from "./cardForms";

export const HEXAGRAM_CARD = "10614";
export const HEXAGRAM_CHOOSE = "1061401";
export const HEXAGRAM_SOUL = "1061402";
export const HEXAGRAM_DEATH = "1061403";
export const HEXAGRAM_SPIRIT = "1061404";
export const HEXAGRAM_ART = "1061405";
export const HEXAGRAM_ABSOLUTE = "1061406";
export const HEXAGRAM_LIMITED = "1061407";
export const HEXAGRAM_IGNORE = "1061408";
export const HEXAGRAM_ARRAY = "1061409";
export const HEXAGRAM_RESTORE = "1061409_restore";

export const HEXAGRAM_FORMS = {
  soul: { name: "禁魂", ability: HEXAGRAM_SOUL },
  death: { name: "禁死", ability: HEXAGRAM_DEATH },
  spirit: { name: "禁灵", ability: HEXAGRAM_SPIRIT },
  art: { name: "禁术", ability: HEXAGRAM_ART },
  absolute: { name: "禁绝", ability: HEXAGRAM_ABSOLUTE },
  limited: { name: "禁锢", ability: HEXAGRAM_LIMITED }
} as const;

export type HexagramForm = keyof typeof HEXAGRAM_FORMS;
export type HexagramForms = RoundCardForms<HexagramForm>;
export const HEXAGRAM_KEYS = Object.keys(HEXAGRAM_FORMS) as HexagramForm[];

export function hexagramForms(card: BigCardInstance): HexagramForms {
  return card.hexagramForms ??= { active: "soul", available: [...HEXAGRAM_KEYS] };
}

export function hexagramAbilityActive(card: BigCardInstance, skillId: string): boolean {
  if (card.cardId !== HEXAGRAM_CARD || card.onlyAbilityId) return true;
  const form = HEXAGRAM_KEYS.find((key) => HEXAGRAM_FORMS[key].ability === skillId);
  return form === undefined || (!card.hexagramForms?.cleared && (card.hexagramForms?.active ?? "soul") === form);
}

export function clearHexagramForms(cards: readonly BigCardInstance[] | undefined): void {
  for (const card of cards ?? []) {
    if (card.cardId !== HEXAGRAM_CARD || card.onlyAbilityId) continue;
    card.hexagramForms = { available: [], active: "none", cleared: true };
    delete card.hexagramRestores;
  }
}
