import type { BigCardInstance } from "../bigCards/types";
import { canChooseRoundCardForm, nextRoundCardForm, type RoundCardForms } from "./cardForms";

export const FIVE_ELEMENTS_CARD = "10613";
export const FIVE_ELEMENTS_CHOOSE = "1061301";
export const FIVE_ELEMENTS_FIRE = "1061302";
export const FIVE_ELEMENTS_ICE = "1061303";
export const FIVE_ELEMENTS_LIGHTNING = "1061304";
export const FIVE_ELEMENTS_EARTH = "1061305";
export const FIVE_ELEMENTS_WIND = "1061306";
export const FIVE_ELEMENTS_RESTORE = "1061307";
export const FIVE_ELEMENTS_LEVEL = "1061302_level";
export const FIVE_ELEMENTS_LEVEL_PREFIX = "five_elements_level:";

export const FIVE_ELEMENTS_FORMS = {
  fire: { name: "火", ability: FIVE_ELEMENTS_FIRE, fusions: ["炽焰", "炼狱使徒"] },
  ice: { name: "冰", ability: FIVE_ELEMENTS_ICE, fusions: ["极寒"] },
  electric: { name: "电", ability: FIVE_ELEMENTS_LIGHTNING, fusions: ["天雷"] },
  earth: { name: "土", ability: FIVE_ELEMENTS_EARTH, fusions: ["拆迁队"] },
  wind: { name: "风", ability: FIVE_ELEMENTS_WIND, fusions: ["寂灭", "风之轻灵"] }
} as const;

export type FiveElement = keyof typeof FIVE_ELEMENTS_FORMS;
export type FiveElementsForm = FiveElement | "none";
export type FiveElementsForms = RoundCardForms<FiveElement>;
export const FIVE_ELEMENTS_KEYS = Object.keys(FIVE_ELEMENTS_FORMS) as FiveElement[];
export const FIVE_ELEMENTS_OPERATIONS = ["add", "subtract", "multiply", "divide"] as const;
export type FiveElementsOperation = typeof FIVE_ELEMENTS_OPERATIONS[number];

export function fiveElementsForms(card: BigCardInstance): FiveElementsForms {
  return card.fiveElementsForms ??= { active: "fire", available: [...FIVE_ELEMENTS_KEYS] };
}

export function fiveElementsAbilityActive(card: BigCardInstance, abilityId: string): boolean {
  if (card.cardId !== FIVE_ELEMENTS_CARD || card.onlyAbilityId) return true;
  const ability = abilityId === FIVE_ELEMENTS_LEVEL ? FIVE_ELEMENTS_FIRE : abilityId;
  const form = FIVE_ELEMENTS_KEYS.find((key) => FIVE_ELEMENTS_FORMS[key].ability === ability);
  return form === undefined || !card.fiveElementsForms?.cleared && card.fiveElementsForms?.active === form;
}

export function canChooseFiveElementsForm(forms: FiveElementsForms | undefined, round: number): boolean {
  return canChooseRoundCardForm(forms, round);
}

export function nextFiveElementsForm(forms: FiveElementsForms): FiveElementsForm {
  return nextRoundCardForm(forms, FIVE_ELEMENTS_KEYS);
}

export function clearFiveElementsForms(cards: readonly BigCardInstance[] | undefined): void {
  for (const card of cards ?? []) {
    if (card.cardId !== FIVE_ELEMENTS_CARD || card.onlyAbilityId) continue;
    const forms = fiveElementsForms(card);
    forms.available = [];
    forms.active = "none";
    forms.cleared = true;
  }
}
