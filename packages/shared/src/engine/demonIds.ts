export const DEMON_CARD_ID = "10551";
export const DEMON_ABYSS_ID = "1055101";
export const DEMON_IMP_ID = "1055102";
export const DEMON_VOIDWALKER_ID = "1055103";
export const DEMON_FEAR_HOUND_ID = "1055104";
export const DEMON_EVIL_HOUND_ID = "1055105";
export const DEMON_GUARD_ID = "1055106";
export const DEMON_TYRANT_ID = "1055107";
export const DEMON_IMP_ORDER_ID = "1055102_order";
export const DEMON_GUARD_ORDER_ID = "1055106_order";
export const DEMON_LEGION_LOCK = "demon_legion_lock";
export const DEMON_FEAR_BITE = "demon_fear_bite";
export const DEMON_EVIL_BITE = "demon_evil_bite";
export const DEMON_WHIRLWIND = "demon_whirlwind";
export const DEMON_LEGION_AREA = "demon_legion_area";
export const DEMON_LEGION_SINGLE = "demon_legion_single";

export function isTargetedDemonSummon(skillId: string | undefined): boolean {
  return skillId === DEMON_FEAR_HOUND_ID || skillId === DEMON_EVIL_HOUND_ID;
}

export type DemonPlacement = "left" | "front" | "right";
export type DemonOrder = "standby" | "fireball" | "whirlwind" | "power" | "legion_area" | "legion_single";
export type DemonCooldown = "whirlwind" | "power" | "legion";
export type DemonKind = "imp" | "voidwalker" | "fear_hound" | "evil_hound" | "guard" | "tyrant";
