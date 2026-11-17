import type { AttackStats, PlayerState } from "../types";
import { RED_LOTUS_FLAME } from "./redLotusIds";

export function redLotusFlameCount(player: Pick<PlayerState, "buffs"> | undefined): number {
  return player?.buffs.find(({ id }) => id === RED_LOTUS_FLAME)?.stacks ?? 0;
}

export function redLotusFireAttack(stats: AttackStats): AttackStats {
  if (stats.nonAttackMove) return stats;
  return { ...stats, element: "fire", elements: ["fire"],
    traits: [...stats.traits.filter((trait) => trait !== "fire" && trait !== "ice" && trait !== "electric" && trait !== "poison"), "fire"] };
}
