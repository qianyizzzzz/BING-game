import type { GameState, PlayerId, PlayerState } from "../types";
import { getOwnedSkillIds } from "../skills/fusion";
import { changeCakes } from "./cakeResources";
import { canRestoreTemporalState } from "./jueying";
import { preservePermanentTalismans } from "./talismanRules";
import { canRecoverWithHpCap, getPlayerHpValue, setPlayerHpValue } from "./infiniteValues";

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

export function canRestoreWithInitialHpCap(state: GameState, player: PlayerState): boolean {
  const initial = initialPlayerSnapshot(state, player.id);
  if (!initial || player.decayReducedHpCap === initial.decayReducedHpCap) return canRecoverWithHpCap(player);
  const { decayReducedHpCap: _liveDecayCap, ...liveWithoutDecayCap } = player;
  const restoredCap = { ...liveWithoutDecayCap, ...(initial.decayReducedHpCap ? { decayReducedHpCap: initial.decayReducedHpCap } : {}) };
  return canRecoverWithHpCap(restoredCap);
}

export function restorePlayerInitialState(state: GameState, player: PlayerState): boolean {
  if (!canRestoreTemporalState(state, player)) return false;
  if (!canRestoreWithInitialHpCap(state, player) && (player.status !== "alive" || player.buffs.some(({ id }) =>
    id === "pending_death" || id === "direct_non_damage_death"))) return false;
  const initial = initialPlayerSnapshot(state, player.id);
  if (!initial) return false;
  const restored = structuredClone(initial);
  if (restored.defeatBlocksRevival) player.defeatBlocksRevival = true;
  else delete player.defeatBlocksRevival;
  if (restored.lastSettledDamage) player.lastSettledDamage = restored.lastSettledDamage;
  else delete player.lastSettledDamage;
  if (restored.charityInitialHpHalvings) player.charityInitialHpHalvings = restored.charityInitialHpHalvings;
  else delete player.charityInitialHpHalvings;
  if (restored.emptyCityBody) player.emptyCityBody = restored.emptyCityBody;
  else delete player.emptyCityBody;
  if (restored.emptyCityBodySpaceId) player.emptyCityBodySpaceId = restored.emptyCityBodySpaceId;
  else delete player.emptyCityBodySpaceId;
  if (restored.decayReducedHpCap) player.decayReducedHpCap = restored.decayReducedHpCap;
  else delete player.decayReducedHpCap;
  preservePermanentTalismans(player, restored);
  const visibleSkills = new Set([...restored.revealedSkillIds, ...player.revealedSkillIds]);
  changeCakes(state, player.id, restored.cakes, "恢复初始饼数", "restore");
  // Identity, seating and connection data belong to the current game session.
  Object.assign(player, {
    hp: restored.hp, hpIsInfinite: restored.hpIsInfinite, hpValue: restored.hpValue, actionCakes: restored.actionCakes,
    status: restored.status, defeatLevel: restored.defeatLevel, spaceId: restored.spaceId,
    karmaReincarnation: restored.karmaReincarnation,
    redLotusFinaleUsed: restored.redLotusFinaleUsed,
    eraDurationMultiplier: restored.eraDurationMultiplier,
    kaigeLife: restored.kaigeLife, soulLife: restored.soulLife, effects: restored.effects, spareLives: restored.spareLives,
    storedDamages: restored.storedDamages, hunyaoAwakened: restored.hunyaoAwakened,
    verdictShadowInstanceId: restored.verdictShadowInstanceId,
    youkaiLayers: restored.youkaiLayers, youkaiHalfRounds: restored.youkaiHalfRounds, shadowCombo: restored.shadowCombo,
    buffs: restored.buffs, bars: restored.bars, eternalMoves: restored.eternalMoves,
    skills: restored.skills, bigCards: restored.bigCards, bigCardSlotCount: restored.bigCardSlotCount,
    skillInventory: restored.skillInventory, skillFusions: restored.skillFusions, fusionRequestIds: restored.fusionRequestIds,
    witherSelections: restored.witherSelections, attackCostOverrides: restored.attackCostOverrides, skillSlotCount: restored.skillSlotCount
  });
  if (player.nightHpCap || player.decayFieldHpCap || player.decayReducedHpCap) setPlayerHpValue(player, getPlayerHpValue(restored));
  else if (player.hp !== 0) delete player.hpCappedRecoveryAtZero;
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
