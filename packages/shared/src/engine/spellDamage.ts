import { PlayerState } from "../types";
import { getActiveFusionCount } from "../skills/fusion";

/** Spell damage is a rule label, independent of fire/ice/electric attack elements. */
export const SPELL_DAMAGE_NAMES = new Set([
  "火烧大地", "净化之风", "雷电法术", "火球溅射", "传音入密", "帝炎之境",
  "斗转星移", "同生共死", "邪域", "魔域", "帝灵之境", "反伤刺甲", "冰火两仪眼"
]);
export function spellDamageMultiplier(player: PlayerState | undefined): number {
  return 2 ** getActiveFusionCount(player, "博学者之怒");
}
