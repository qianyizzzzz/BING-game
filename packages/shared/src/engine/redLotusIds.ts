export const RED_LOTUS_CARD_ID = "10607";
export const RED_LOTUS_HEART = "1060701";
export const RED_LOTUS_RAIN = "1060702";
export const RED_LOTUS_LIFE = "1060703";
export const RED_LOTUS_NINE = "1060704";
export const RED_LOTUS_FINALE = "1060705";
export const RED_LOTUS_KARMA = "1060706";
export const RED_LOTUS_FLAME = "red_lotus_flame_mark";
export const RED_LOTUS_DEATH_DUE = "red_lotus_death_due";
export const RED_LOTUS_LIFE_DEATH = "red_lotus_life_death";
export const THUNDER_TRIBULATION_CARD_ID = "10714";

export function isRedLotusAnytimeSkill(id: string): boolean {
  return id === RED_LOTUS_NINE || id === RED_LOTUS_FINALE;
}
