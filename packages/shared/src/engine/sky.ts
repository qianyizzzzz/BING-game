import type { PlayerState } from "../types";
import { INFINITE_DAMAGE } from "../types";
import { INFINITY_VALUE } from "./combatValues";
import { SUN_PLAYER_ID } from "./sunIds";
import { STAR_COPY_PLAYER_ID } from "./swordArrayIds";

export const SKY_PLAYER_ID = "virtual_sky";

/** A combat endpoint only. It never enters the room roster or the set of selectable players. */
export function getSkyPlayer(): PlayerState {
  return { id: SKY_PLAYER_ID, name: "天", kind: "spectator", hp: INFINITE_DAMAGE, hpIsInfinite: true, hpValue: INFINITY_VALUE,
    cakes: 0, status: "alive", connected: false, skills: [], revealedSkillIds: [], buffs: [] };
}

export function getSunPlayer(): PlayerState {
  return { ...getSkyPlayer(), id: SUN_PLAYER_ID, name: "日" };
}

export function getVirtualCombatPlayer(id: string | undefined): PlayerState | undefined {
  if (id === SKY_PLAYER_ID) return getSkyPlayer();
  if (id === SUN_PLAYER_ID) return getSunPlayer();
  if (id === STAR_COPY_PLAYER_ID) return { ...getSkyPlayer(), id, name: "星辰" };
}

export function isVirtualCombatPlayer(id: string | undefined): boolean {
  return id === SKY_PLAYER_ID || id === SUN_PLAYER_ID || id === STAR_COPY_PLAYER_ID;
}
