import type { PlayerState, SkillId } from "../types";
import { createId } from "./gameFactory";
import { getFusionRecipe } from "../skills/fusion";

/** The optional parallel ledger is enabled in big-card modes; legacy skill arrays retain their shape. */
export function ensureSkillInventory(player: PlayerState): void {
  if (!player.skillInventory) player.skillInventory = player.skills.map((skillId) => ({ instanceId: createId("skill_instance"), skillId }));
}
export function appendSkillInstances(player: PlayerState, ids: SkillId[], sourceBigCardInstanceId?: string): string[] {
  if (sourceBigCardInstanceId && !player.skillInventory) ensureSkillInventory(player);
  if (!player.skillInventory) { player.skills.push(...ids); return []; }
  const instances = ids.map((skillId) => ({ instanceId: createId("skill_instance"), skillId,
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
  if (player.skillInventory?.[index]) player.skillInventory[index]!.skillId = id;
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
