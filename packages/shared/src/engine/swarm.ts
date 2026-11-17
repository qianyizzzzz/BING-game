import type { PlayerState, SkillId } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import { INVENTORY_ITEM_STATE_TYPE } from "./effectCategories";
import { SWARM_BEETLE_ID, SWARM_FLY_ID, SWARM_HOPPER_ID, SWARM_QUEEN_ID, SWARM_INSECTS, SWARM_INSECT_LABELS,
  type SwarmAllocation, type SwarmInsect, VETERAN_SHATTER_ID } from "./swarmIds";

const insectAbilities: Record<SwarmInsect, SkillId> = {
  beetle: SWARM_BEETLE_ID, fly: SWARM_FLY_ID, hopper: SWARM_HOPPER_ID, queen: SWARM_QUEEN_ID
};
const insectByMove: Readonly<Partial<Record<SkillId, SwarmInsect>>> = {
  "1080": "beetle", "1084": "beetle", "1081": "fly", [VETERAN_SHATTER_ID]: "fly",
  "1083": "hopper", "1085": "hopper", "1082": "queen"
};

export function swarmInsectCount(player: { buffs: readonly { id: string; stacks?: number }[] } | undefined, insect: SwarmInsect): number {
  const id = `swarm_item:${insect}`;
  return player?.buffs.reduce((sum, buff) => buff.id === id || buff.id.startsWith(`${id}:`) ? sum + (buff.stacks ?? 0) : sum, 0) ?? 0;
}

export function activeSwarmInsects(player: Parameters<typeof getActiveSkillCount>[0], insect: SwarmInsect): number {
  const count = swarmInsectCount(player, insect);
  return count && getActiveSkillCount(player, insectAbilities[insect]) ? count : 0;
}

export function changeSwarmInsects(player: PlayerState, insect: SwarmInsect, change: number, round = 1): void {
  if (!change) return;
  const kind = `swarm_item:${insect}`;
  if (change < 0) {
    let remaining = -change;
    for (const buff of player.buffs) if (buff.itemKind === kind && remaining > 0) {
      const spent = Math.min(buff.stacks, remaining);
      buff.stacks -= spent;
      remaining -= spent;
    }
    player.buffs = player.buffs.filter((buff) => buff.itemKind !== kind || buff.stacks > 0);
    if (insect === "beetle") for (const buff of player.buffs) if (buff.id === "jin_zhong_zhao")
      buff.stacks = Math.min(buff.stacks, 1 + activeSwarmInsects(player, "beetle"));
    return;
  }
  const id = insect === "queen" ? `${kind}:${round}` : kind;
  const buff = player.buffs.find((entry) => entry.id === id);
  if (buff) buff.stacks += change;
  else player.buffs.push({ id, stateType: INVENTORY_ITEM_STATE_TYPE, itemKind: kind,
    name: SWARM_INSECT_LABELS[insect], stacks: change, ...(insect === "queen" ? { startsAtRound: round } : {}) });
}

export function recordSwarmMove(player: PlayerState, skillId: SkillId, stacks: number, round: number): void {
  const insect = insectByMove[skillId];
  if (insect && getActiveSkillCount(player, insectAbilities[insect])) changeSwarmInsects(player, insect, stacks, round);
}

export function produceQueenInsects(player: PlayerState, round: number): void {
  if (!getActiveSkillCount(player, SWARM_QUEEN_ID)) return;
  const produced = player.buffs.reduce((sum, buff) => {
    const age = round - (buff.startsAtRound ?? round);
    return buff.itemKind === "swarm_item:queen" && age > 0 && age % 3 === 0 ? sum + buff.stacks : sum;
  }, 0);
  for (const insect of ["beetle", "fly", "hopper"] as const) changeSwarmInsects(player, insect, produced);
}

export function isSwarmAllocationValid(player: Pick<PlayerState, "buffs">, allocation: unknown): allocation is SwarmAllocation {
  if (!allocation || typeof allocation !== "object" || Array.isArray(allocation)) return false;
  let total = 0;
  for (const [insect, count] of Object.entries(allocation)) {
    if (!(SWARM_INSECTS as readonly string[]).includes(insect) || !Number.isSafeInteger(count) ||
      count < 0 || count > swarmInsectCount(player, insect as SwarmInsect)) return false;
    total += count;
  }
  return total === 10;
}

export function swarmInventory(player: Pick<PlayerState, "buffs">): Record<SwarmInsect, number> {
  return {
    beetle: swarmInsectCount(player, "beetle"), fly: swarmInsectCount(player, "fly"),
    hopper: swarmInsectCount(player, "hopper"), queen: swarmInsectCount(player, "queen")
  };
}
