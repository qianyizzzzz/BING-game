export const DECAY_CARD_ID = "10559";
export const DECAY_HP_CAP_ID = "1055901";
export const DECAY_INHERIT_ID = "1055902";
export const DECAY_MARKS_ID = "1055903";
export const DECAY_CONVERSION_ID = "1055904";
export const DECAY_HALF_ID = "1055905";
export const DECAY_EXTREME_ID = "1055906";
export const DECAY_SPREAD_ID = "1055907";

export const DECAY_MARK = "decay_mark";
export const ANNIHILATION_MARK = "annihilation_mark";
export const ANNIHILATION_FUSION_ID = "4012";
export const DECAY_UNLOCK_DAMAGE = 6;
export const DECAY_FIELD_HP_LIMIT = 24;

const unlockableDecayAbilities: ReadonlySet<string> = new Set([
  DECAY_MARKS_ID, DECAY_CONVERSION_ID, DECAY_HALF_ID, DECAY_EXTREME_ID, DECAY_SPREAD_ID
]);

export function isDecayAbilityUnlocked(card: { decayUnlocked?: true; onlyAbilityId?: string }, skillId: string): boolean {
  return !unlockableDecayAbilities.has(skillId) || card.onlyAbilityId === skillId || card.decayUnlocked === true;
}
