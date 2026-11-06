import type { GameState, PlayerId, PlayerState, SkillId } from "../types";
import { getFusionMaterials, getOwnedSkillIds, reconcileSkillFusions } from "../skills/fusion";
import { getSmallSkillIds } from "../skills/registry";
import { createBaseEvent, findPlayer } from "./gameFactory";
import { ensureFusionSkillInventory, removeSkillInstanceAt } from "./skillInventory";
import { playersInSpace } from "./spaces";

export interface BlindSkillChoice {
  playerId: PlayerId;
  instanceId: string;
  /** Number within this player's currently held small skills, in inventory order. */
  number: number;
  visibleSkillId?: SkillId;
}

const slotToken = (player: PlayerState, index: number) => player.skillInventory?.[index]?.instanceId ?? `legacy:${player.id}:${index}`;

export function getBlindSkillChoices(state: GameState, actorId: PlayerId, includeMaterials: boolean): BlindSkillChoice[] {
  const smallSkills = new Set(getSmallSkillIds(Number.MAX_SAFE_INTEGER));
  return playersInSpace(state, actorId).filter((player) => player.kind !== "spectator").flatMap((player) => {
    const free = new Set(getFusionMaterials(player, true).filter((item) => item.kind === "skill").map((item) => item.instanceId));
    const visible = new Set([...player.revealedSkillIds, ...(state.skillKnowledge[actorId]?.[player.id] ?? [])]);
    return player.skills.flatMap((skillId, index) => smallSkills.has(skillId) &&
      (includeMaterials || free.has(player.skillInventory?.[index]?.instanceId ?? `legacy:${index}`)) ?
      [{ playerId: player.id, instanceId: slotToken(player, index), ...(actorId === player.id || visible.has(skillId) ? { visibleSkillId: skillId } : {}) }] : [])
      .map((choice, index) => ({ ...choice, number: index + 1 }));
  });
}

export function resolveBlindSkillRemoval(state: GameState, actorId: PlayerId, selected: readonly string[], includeMaterials: boolean): void {
  const choices = getBlindSkillChoices(state, actorId, includeMaterials);
  const unique = new Set(selected);
  if (selected.length > 16 || unique.size !== selected.length || selected.some((id) => !choices.some((choice) => choice.instanceId === id))) {
    throw new Error("请选择至多16个不同且仍可消除的小技能");
  }
  const affected = new Map<PlayerId, number[]>();
  for (const choice of choices) {
    if (!unique.has(choice.instanceId)) continue;
    const target = findPlayer(state, choice.playerId)!;
    if (target.buffs.some((buff) => buff.immuneEffectCategories?.includes("remove_skills"))) continue;
    const index = target.skills.findIndex((_, index) => slotToken(target, index) === choice.instanceId);
    const indices = affected.get(target.id) ?? [];
    indices.push(index);
    affected.set(target.id, indices);
  }
  for (const [playerId, indices] of affected) {
    const player = findPlayer(state, playerId)!;
    ensureFusionSkillInventory(player);
    for (const index of indices.sort((a,b) => b-a)) removeSkillInstanceAt(player, index);
    reconcileSkillFusions(player);
    const owned = new Set(getOwnedSkillIds(player));
    player.revealedSkillIds = player.revealedSkillIds.filter((id) => owned.has(id));
    for (const knowledge of Object.values(state.skillKnowledge)) {
      if (knowledge?.[playerId]) knowledge[playerId] = knowledge[playerId]!.filter((id) => owned.has(id));
    }
  }
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: actorId,
    message: `已提交 ${selected.length} 个小技能的消除选择` });
}
