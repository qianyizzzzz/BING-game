import type { GameState, PlayerState, SkillFusionState, SkillId } from "../types";
import { createId } from "./gameFactory";
import { getFusionRecipe, getOwnedSkillIds } from "../skills/fusion";

export function nextSkillAcquisitionOrder(player: Pick<PlayerState, "skills" | "skillInventory" | "skillFusions" | "bigCards">): number {
  return 1 + Math.max(0, player.skills.length, ...(player.skillInventory ?? []).map((entry) => entry.acquisitionOrder ?? 0),
    ...(player.skillFusions ?? []).map((entry) => entry.acquisitionOrder ?? 0),
    ...(player.bigCards ?? []).map((entry) => entry.acquisitionOrder ?? 0));
}

/** The optional parallel ledger is enabled in big-card modes; legacy skill arrays retain their shape. */
export function ensureSkillInventory(player: PlayerState): void {
  if (!player.skillInventory) player.skillInventory = player.skills.map((skillId, index) =>
    ({ instanceId: createId("skill_instance"), skillId, acquisitionOrder: index + 1 }));
}
export function appendSkillInstances(player: PlayerState, ids: SkillId[], sourceBigCardInstanceId?: string): string[] {
  if (sourceBigCardInstanceId && !player.skillInventory) ensureSkillInventory(player);
  if (!player.skillInventory) { player.skills.push(...ids); return []; }
  const start = nextSkillAcquisitionOrder(player);
  const instances = ids.map((skillId, index) => ({ instanceId: createId("skill_instance"), skillId, acquisitionOrder: start + index,
    ...(sourceBigCardInstanceId ? { sourceBigCardInstanceId } : {}) }));
  player.skillInventory.push(...instances);
  player.skills.push(...ids);
  return instances.map((entry) => entry.instanceId);
}
export function removeSkillInstanceAt(player: Pick<PlayerState, "skills" | "skillInventory">, index: number): void {
  if (index < 0 || index >= player.skills.length) return;
  player.skills.splice(index, 1);
  player.skillInventory?.splice(index, 1);
}
export function replaceSkillInstanceAt(player: PlayerState, index: number, id: SkillId): void {
  player.skills[index] = id;
  const instance = player.skillInventory?.[index];
  if (instance && instance.skillId !== id) {
    instance.skillId = id;
    delete instance.convertedMaterial;
    delete instance.judgmentRank;
    instance.acquisitionOrder = nextSkillAcquisitionOrder(player);
  }
}
export function ensureFusionSkillInventory(player: PlayerState): void {
  ensureSkillInventory(player);
  const covered = new Set((player.skillFusions ?? []).flatMap((fusion) => fusion.materialInstanceIds ?? []));
  for (const fusion of player.skillFusions ?? []) {
    if (fusion.materialInstanceIds) continue;
    const chosen: string[] = [];
    const raw = fusion.materialSkillIds.filter((id) => !getFusionRecipe(id));
    for (const id of raw) {
      const instance = player.skillInventory!.find((entry) => entry.skillId === id && !covered.has(entry.instanceId) && !chosen.includes(entry.instanceId));
      if (!instance) break;
      chosen.push(instance.instanceId);
    }
    if (chosen.length !== raw.length) continue;
    fusion.materialInstanceIds = chosen;
    for (const id of chosen) covered.add(id);
  }
}

export function removeFusionTrees(player: PlayerState, roots: readonly SkillFusionState[]): string[] {
  if (!roots.length) return [];
  ensureFusionSkillInventory(player);
  const pending = [...roots];
  const fusionIds = new Set<string>();
  const materialIds = new Set<string>();
  while (pending.length) {
    const fusion = pending.pop()!;
    if (fusionIds.has(fusion.id)) continue;
    fusionIds.add(fusion.id);
    for (const id of fusion.materialInstanceIds ?? []) materialIds.add(id);
    for (const child of player.skillFusions ?? []) if (fusion.materialFusionIds?.includes(child.id)) pending.push(child);
  }
  for (let index = player.skillInventory!.length - 1; index >= 0; index--) {
    if (materialIds.has(player.skillInventory![index]!.instanceId)) removeSkillInstanceAt(player, index);
  }
  player.skillFusions = (player.skillFusions ?? []).filter((fusion) => !fusionIds.has(fusion.id));
  return [...fusionIds];
}

export function pruneRemovedSkillKnowledge(state: Pick<GameState, "skillKnowledge">, player: PlayerState): void {
  const owned = new Set(getOwnedSkillIds(player));
  player.revealedSkillIds = player.revealedSkillIds.filter((id) => owned.has(id));
  for (const known of Object.values(state.skillKnowledge)) {
    if (known?.[player.id]) known[player.id] = known[player.id]!.filter((id) => owned.has(id));
  }
}
