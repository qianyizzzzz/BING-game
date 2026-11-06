import type { GameState, PlayerId, PlayerState } from "../types";
import { getOwnedSkillIds } from "../skills/fusion";
import { changeCakes } from "./cakeResources";

/** Capture after game-start setup and before anyone can use preparation actions. */
export function captureInitialPlayerStates(state: GameState): void {
  state.initialPlayerSnapshots = Object.fromEntries(state.players.filter((player) => player.kind !== "spectator")
    .map((player) => [player.id, structuredClone(player)]));
}

function initialPlayerSnapshot(state: GameState, playerId: PlayerId): PlayerState | undefined {
  return state.initialPlayerSnapshots?.[playerId] ?? state.initialHunyaoPlayers?.[playerId];
}

/** Edit the baseline used by future resets without changing the player's live state. */
export function updateInitialPlayerSnapshot(state: GameState, playerId: PlayerId, update: (draft: PlayerState) => void): boolean {
  const original = initialPlayerSnapshot(state, playerId);
  if (!original) return false;
  const draft = structuredClone(original);
  update(draft);
  (state.initialPlayerSnapshots ??= {})[playerId] = structuredClone(draft);
  return true;
}

export function hasInitialPlayerSnapshot(state: GameState, playerId: PlayerId): boolean {
  return Boolean(initialPlayerSnapshot(state, playerId));
}

export function restorePlayerInitialState(state: GameState, player: PlayerState): boolean {
  const initial = initialPlayerSnapshot(state, player.id);
  if (!initial) return false;
  const restored = structuredClone(initial);
  const visibleSkills = new Set([...restored.revealedSkillIds, ...player.revealedSkillIds]);
  changeCakes(state, player.id, restored.cakes, "恢复初始饼数");
  // Identity, seating and connection data belong to the current game session.
  Object.assign(player, {
    hp: restored.hp, hpIsInfinite: restored.hpIsInfinite, hpValue: restored.hpValue, actionCakes: restored.actionCakes,
    status: restored.status, defeatLevel: restored.defeatLevel, spaceId: restored.spaceId,
    spareLives: restored.spareLives, storedDamages: restored.storedDamages, hunyaoAwakened: restored.hunyaoAwakened,
    verdictShadowInstanceId: restored.verdictShadowInstanceId,
    buffs: restored.buffs, skills: restored.skills, bigCards: restored.bigCards, bigCardSlotCount: restored.bigCardSlotCount,
    skillInventory: restored.skillInventory, skillFusions: restored.skillFusions, fusionRequestIds: restored.fusionRequestIds,
    witherSelections: restored.witherSelections, attackCostOverrides: restored.attackCostOverrides, skillSlotCount: restored.skillSlotCount
  });
  const owned = new Set(getOwnedSkillIds(player));
  player.revealedSkillIds = [...visibleSkills].filter((id) => owned.has(id));
  for (const knowledge of Object.values(state.skillKnowledge)) {
    if (knowledge?.[player.id]) knowledge[player.id] = knowledge[player.id]!.filter((id) => owned.has(id));
  }
  if (state.damageAttribution) state.damageAttribution[player.id] = [];
  if (state.pendingDragonFireBonuses) state.pendingDragonFireBonuses = state.pendingDragonFireBonuses.filter((bonus) => bonus.playerId !== player.id);
  const restoredCards = new Set(restored.bigCards?.map((card) => card.instanceId));
  for (const loan of state.borrowedBigCards ?? []) {
    if (loan.ownerId === player.id && restoredCards.has(loan.card.instanceId)) loan.skipReturn = true;
  }
  return true;
}
