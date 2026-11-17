import type { BigCardInstance } from "../bigCards/types";
import type { BuffState } from "../types";
import type { CardForms } from "./cardForms";

export const TIGER_CARD = "10545";
export const TIGER_SWITCH = "1054501";
export const TIGER_SLASH = "1054503";
export const TIGER_GUARD = "1054504";
export const TIGER_STAB = "1054505";
export const TIGER_EXTINCTION = "1054507";
export const TIGER_EXTINCTION_MOVE = "1054507_mie";
export const TIGER_KILL = "1054508";
export const TIGER_LOSS = "1054509";
export const TIGER_NETHER = "1054511";
export const TIGER_WHITE = "1054512";
export const TIGER_FINAL = "1054513";
export const TIGER_LOCK = "1054514";
export const TIGER_RESTORE = "1054515";
export const TIGER_MIE_COUNT = "nether_tiger_mie";
export const TIGER_TEMP_SKILL = "nether_tiger_temp:";
export function tigerMieThirds(player: { buffs: Array<{ id: string; stacks: number }> }): number {
  return player.buffs.find((buff) => buff.id === TIGER_MIE_COUNT)?.stacks ?? 0;
}
export function tigerTemporarySkills(player: { buffs: Array<Pick<BuffState, "id">> }): string[] {
  return player.buffs.filter((buff) => buff.id.startsWith(TIGER_TEMP_SKILL)).map((buff) => buff.id.slice(TIGER_TEMP_SKILL.length));
}
export const TIGER_FORMS = ["cat", "white"] as const;
export type TigerForm = typeof TIGER_FORMS[number] | "nether";
export const TIGER_FORM_NAMES: Record<TigerForm, string> = {
  cat: "幽冥灵猫", white: "邪眸白虎", nether: "幽冥白虎"
};
export const TIGER_GRANTS = {
  "1054502": ["4002"],
  "1054506": ["4012"],
  "1054510": ["4034", "4021", "4018"]
} as const;

export function tigerForms(card: BigCardInstance): CardForms<TigerForm> {
  return card.tigerForms ??= { active: "cat", available: [...TIGER_FORMS] };
}

export function tigerAbilityActive(card: BigCardInstance, abilityId: string): boolean {
  if (card.cardId !== TIGER_CARD || card.onlyAbilityId) return true;
  const order = Number(abilityId.slice(5, 7));
  const required = order >= 2 && order <= 5 ? "cat" : order >= 6 && order <= 8 ? "white" :
    order >= 10 && order <= 15 ? "nether" : undefined;
  if (card.tigerForms?.cleared) return required === undefined && abilityId !== TIGER_LOSS;
  return !required || (card.tigerForms?.active ?? "cat") === required;
}
