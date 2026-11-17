import type { BuffState, PlayerState, SkillId } from "../types";
import { isCountedCombatStatus, isRemovableLongTermStatus, stateHasCategory } from "./effectCategories";
import { MOON_PUNISH_ID } from "./moonIds";

export const MOON_SHADOW_LOCK = "moon_shadow_action_lock";

const moonStatusMasks = new WeakSet<PlayerState>();

export function moonIgnoresPlayerStatuses(player: PlayerState | undefined): boolean {
  return player !== undefined && moonStatusMasks.has(player);
}

function moonIgnoresBuff(buff: BuffState): boolean {
  if (stateHasCategory(buff, "special") || isCountedCombatStatus(buff)) return true;
  const { uncleansable: _ignoreRemovalOnly, ...status } = buff;
  return isRemovableLongTermStatus(status);
}

/** Scope status bypass to one target resolution, keeping any changes made by the resolution itself. */
export function withMoonPunishment<T>(target: PlayerState | undefined, skillId: SkillId | undefined, resolve: () => T): T {
  if (!target || skillId !== MOON_PUNISH_ID || moonStatusMasks.has(target)) return resolve();
  const original = target.buffs;
  const hidden = new Set(original.filter(moonIgnoresBuff));
  const originalEntries = new Set(original);
  moonStatusMasks.add(target);
  target.buffs = original.filter((buff) => !hidden.has(buff));
  try {
    return resolve();
  } finally {
    const remaining = new Set(target.buffs);
    target.buffs = [...original.filter((buff) => hidden.has(buff) || remaining.has(buff)),
      ...target.buffs.filter((buff) => !originalEntries.has(buff))];
    moonStatusMasks.delete(target);
  }
}
