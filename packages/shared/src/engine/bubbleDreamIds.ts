export const BUBBLE_DREAM_CARD = "10606";
export const BUBBLE_FATE = "1060601";
export const BUBBLE_AVENGER = "1060602";
export const BUBBLE_WITCH = "1060603";
export const BUBBLE_DESTINY = "1060604";
export const BUBBLE_FORGET = "1060605";
export const BUBBLE_REBUILD = "1060606";
export const BUBBLE_FINALE = "1060607";
export const BUBBLE_ENHANCE = `${BUBBLE_REBUILD}_enhance`;

export const BUBBLE_VENGEANCE_STOCK = "bubble_vengeance_stock";
export const BUBBLE_REBUILD_STOCK = "bubble_rebuild_stock";
export const BUBBLE_ENHANCE_STOCK = "bubble_enhance_stock";
export const BUBBLE_ENHANCED_MOVE = "bubble_enhanced_move";
export const BUBBLE_FORCED_TARGET = "bubble_forced_target";
export const BUBBLE_NO_RESTART = "bubble_no_restart";
export const BUBBLE_SKILLS_DISABLED = "bubble_skills_disabled";

export function cannotSealBubbleAbility(id: string): boolean {
  return id === BUBBLE_FATE || id === BUBBLE_DESTINY;
}
