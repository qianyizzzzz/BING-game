import type { BigCardInstance } from "../bigCards/types";
import type { RoundCardForms } from "./cardForms";

export const SEVEN_STAR_CARD = "10615";
export const SEVEN_STAR_CHOOSE = "1061501";
export const SEVEN_STAR_TIANSHU = "1061502";
export const SEVEN_STAR_TIANXUAN = "1061503";
export const SEVEN_STAR_TIANJI = "1061504";
export const SEVEN_STAR_TIANQUAN = "1061505";
export const SEVEN_STAR_YUHENG = "1061506";
export const SEVEN_STAR_KAIYANG = "1061507";
export const SEVEN_STAR_YAOGUANG = "1061508";
export const SEVEN_STAR_IGNORE = "1061509";
export const SEVEN_STAR_INHERIT = "1061510";
export const SEVEN_STAR_MOVE_LOCK = "seven_star_tianquan_lock";
export const SEVEN_STAR_PROTECTION = "seven_star_tianquan_protection";
export const SEVEN_STAR_PIERCE = "seven_star_kaiyang_stock";

export const SEVEN_STAR_FORMS = {
  tianshu: { name: "天枢", ability: SEVEN_STAR_TIANSHU },
  tianxuan: { name: "天璇", ability: SEVEN_STAR_TIANXUAN },
  tianji: { name: "天玑", ability: SEVEN_STAR_TIANJI },
  tianquan: { name: "天权", ability: SEVEN_STAR_TIANQUAN },
  yuheng: { name: "玉衡", ability: SEVEN_STAR_YUHENG },
  kaiyang: { name: "开阳", ability: SEVEN_STAR_KAIYANG },
  yaoguang: { name: "摇光", ability: SEVEN_STAR_YAOGUANG }
} as const;

export type SevenStarForm = keyof typeof SEVEN_STAR_FORMS;
export type SevenStarForms = RoundCardForms<SevenStarForm>;
export const SEVEN_STAR_KEYS = Object.keys(SEVEN_STAR_FORMS) as SevenStarForm[];

export function sevenStarForms(card: BigCardInstance): SevenStarForms {
  return card.sevenStarForms ??= { active: "tianshu", available: [...SEVEN_STAR_KEYS] };
}

export function sevenStarAbilityActive(card: BigCardInstance, id: string): boolean {
  if (card.cardId !== SEVEN_STAR_CARD || card.onlyAbilityId) return true;
  const form = SEVEN_STAR_KEYS.find((key) => SEVEN_STAR_FORMS[key].ability === id);
  return !form || !card.sevenStarForms?.cleared && (card.sevenStarForms?.active ?? "tianshu") === form;
}

export function lostSevenStarForms(card: BigCardInstance | undefined): SevenStarForm[] {
  const forms = card?.sevenStarForms;
  return forms && !forms.cleared ? SEVEN_STAR_KEYS.filter((key) => !forms.available.includes(key)) : [];
}

export function clearSevenStarForms(cards: readonly BigCardInstance[] | undefined): void {
  for (const card of cards ?? []) if (card.cardId === SEVEN_STAR_CARD && !card.onlyAbilityId)
    card.sevenStarForms = { available: [], active: "none", cleared: true };
}
