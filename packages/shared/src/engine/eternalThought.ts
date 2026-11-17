import { bigCardHasAbility, BIG_CARD_SKILLS, ETERNAL_BIND_ID, ETERNAL_PROGRESS_ID, ETERNAL_REPLACE_ID, ETERNAL_THOUGHT_ID } from "../bigCards/abilities";
import type { BigCardInstance } from "../bigCards/types";
import { getSkillPlay } from "../skills/registry";
import { canGainStatus } from "./karmaSong";
import type { BuffState, GameState, PlayerAction, PlayerId, PlayerState, SkillAction } from "../types";
import { getActionLabel } from "./attacks";
import { setPlayerBar } from "./bars";
import { ignoresEffectCategory, isBigCardAbilityIgnored, registerEffectCategories, registerStateDefinition } from "./effectCategories";
import { createBaseEvent, createId, findPlayer, getActiveSkillCount, victoryEligiblePlayers } from "./gameFactory";
import { restoreTemporalPlayerSnapshot } from "./honghuang";
import { canRestoreTemporalState } from "./jueying";
import { canAffectAcrossSpace, preventsTargetSelection } from "./spaces";

export const ETERNAL_GUARD = "eternal_thought_guard";
export const ETERNAL_UNAFFECTED = "eternal_thought_unaffected";
export const ETERNAL_WIN = "instant_win:eternal_thought";
const BAR_PREFIX = "eternal_stasis:";
const CONTINUATION_PREFIX = "eternal_move:";
const OPPORTUNITY_PREFIX = "eternal_replacement:";

registerStateDefinition({ id: ETERNAL_GUARD, name: "永恒一念·抵挡", categories: [] });
registerStateDefinition({ id: ETERNAL_UNAFFECTED, name: "永恒一念·不受不良影响", categories: [] });
registerEffectCategories(ETERNAL_PROGRESS_ID, ["game_freeze"]);
registerEffectCategories(ETERNAL_THOUGHT_ID, ["unaffected_negative_status"]);
registerEffectCategories(ETERNAL_REPLACE_ID, ["return_to_past"]);

export interface EternalMove {
  action: PlayerAction;
  startedTurn: number;
  checkpointId: string;
}

export interface EternalCheckpoint {
  player: PlayerState;
  round: number;
  turn: number;
  smallSpaces?: GameState["smallSpaces"];
}

export function eternalFieldCount(state: Pick<GameState, "players">): number {
  return victoryEligiblePlayers(state).filter((player) => player.hp >= 0 &&
    !player.buffs.some((buff) => buff.id === "pending_death" || buff.id === "direct_non_damage_death")).length;
}

export function eternalProgress(player: Pick<PlayerState, "bars">, instanceId: string): number {
  return player.bars?.find(({ id }) => id === BAR_PREFIX + instanceId)?.value ?? 0;
}

export function checkEternalProgress(state: GameState, tookDamage: (id: PlayerId) => boolean): PlayerId[] {
  if (state.eternalProgressCheckedTurn === state.turnNumber) return [];
  const owners = state.players.filter((player) => player.status === "alive" && getActiveSkillCount(player, ETERNAL_PROGRESS_ID));
  if (!owners.length) return [];
  state.eternalProgressCheckedTurn = state.turnNumber;
  const field = eternalFieldCount(state);
  const limit = 10 ** (field + 1);
  const winners: PlayerId[] = [];
  for (const player of owners) {
    const gain = tookDamage(player.id) ? 0 : field * 2 ** Object.keys(player.eternalMoves ?? {}).length;
    for (const card of player.bigCards ?? []) {
      if (card.junengDisabled || !bigCardHasAbility(card, ETERNAL_PROGRESS_ID)) continue;
      const value = Math.min(limit, eternalProgress(player, card.instanceId) + gain);
      setPlayerBar(player, { id: BAR_PREFIX + card.instanceId, kind: "progress", label: "静滞进度",
        sourceAbilityId: ETERNAL_PROGRESS_ID, value, limit });
      if (value === limit && !winners.includes(player.id)) winners.push(player.id);
    }
  }
  return winners;
}

export function eternalBarId(instanceId: string): string {
  return BAR_PREFIX + instanceId;
}

export function ignoresEternalFreeze(player: PlayerState): boolean {
  return ignoresEffectCategory(player, "game_freeze") ||
    isBigCardAbilityIgnored(player, BIG_CARD_SKILLS[ETERNAL_PROGRESS_ID]!);
}

function isEternalOpportunity(buff: BuffState, instanceId: string): boolean {
  return buff.id.startsWith(OPPORTUNITY_PREFIX) && buff.sourceBigCardInstanceId === instanceId;
}

export function eternalReplacementUses(player: Pick<PlayerState, "buffs">, instanceId: string): number {
  return player.buffs.filter((buff) => isEternalOpportunity(buff, instanceId)).length;
}

export function readyEternalCard(state: GameState, player: PlayerState, action: Pick<SkillAction, "skillId" | "bigCardInstanceId" | "freeMoveId">): BigCardInstance | undefined {
  return player.bigCards?.find((card) => {
    if (card.junengDisabled || !bigCardHasAbility(card, action.skillId) ||
      action.bigCardInstanceId && action.bigCardInstanceId !== card.instanceId) return false;
    const move = player.eternalMoves?.[card.instanceId];
    const uses = eternalReplacementUses(player, card.instanceId);
    if (action.skillId === ETERNAL_BIND_ID) return !move;
    if (action.skillId === ETERNAL_REPLACE_ID)
      return Boolean(move && uses > 0 && state.eternalCheckpoints?.[move.checkpointId]) &&
        canRestoreTemporalState(state, player);
    if (action.skillId === ETERNAL_THOUGHT_ID) {
      const progress = eternalProgress(player, card.instanceId);
      return progress >= 10 && (!uses || progress >= 5 * 10 ** eternalFieldCount(state));
    }
    return false;
  });
}

export function eternalMoveChoices(state: Pick<GameState, "pendingActions" | "turnMoveSuppression">, playerId: PlayerId) {
  const suppression = state.turnMoveSuppression;
  const invalidated = new Set([...(suppression?.invalidated[playerId] ?? []), ...(suppression?.sandInvalidated?.[playerId] ?? [])]);
  return (state.pendingActions[playerId]?.actions ?? []).flatMap((action, index) => {
    if (invalidated.has(index) || action.roarContinuationId || action.sandDelayedActionId ||
      action.type === "discard_skill" || action.type === "skill" &&
      (action.waveContinuationId || action.tianlieContinuationId || !getSkillPlay(action.skillId)?.maxStacks)) return [];
    return [{ index, action, label: getActionLabel(action) }];
  });
}

function rememberMove(state: GameState, player: PlayerState, card: BigCardInstance, action: PlayerAction): void {
  const checkpointId = createId("eternal");
  const remembered = structuredClone(action);
  if ("freeMoveId" in remembered) delete remembered.freeMoveId;
  (player.eternalMoves ??= {})[card.instanceId] = { action: remembered, startedTurn: state.turnNumber, checkpointId };
  const snapshot = structuredClone(player);
  snapshot.eternalMoves![card.instanceId]!.checkpointId = "";
  const space = player.spaceId ? state.smallSpaces?.[player.spaceId] : undefined;
  (state.eternalCheckpoints ??= {})[checkpointId] = { player: snapshot, round: state.roundNumber, turn: state.turnNumber,
    ...(space && player.spaceId ? { smallSpaces: { [player.spaceId]: structuredClone(space) } } : {}) };
}

export function changeEternalMove(state: GameState, player: PlayerState, action: SkillAction): boolean {
  const card = readyEternalCard(state, player, action);
  const choice = eternalMoveChoices(state, player.id).find(({ index }) => index === action.switchActionIndex);
  if (!card || !choice) return false;
  if (action.skillId === ETERNAL_REPLACE_ID) {
    const checkpoint = state.eternalCheckpoints![player.eternalMoves![card.instanceId]!.checkpointId]!;
    const opportunities = player.buffs.filter((buff) => isEternalOpportunity(buff, card.instanceId));
    const used = opportunities.pop()!;
    const receipt = state.turnActionReceipts?.[player.id];
    if (receipt) {
      receipt.buffsBefore = receipt.buffsBefore.filter(({ id }) => id !== used.id);
      receipt.buffsAfter = receipt.buffsAfter.filter(({ id }) => id !== used.id);
    }
    const progress = player.bars?.find((bar) => bar.id === BAR_PREFIX + card.instanceId);
    const restored = restoreTemporalPlayerSnapshot(state, player, checkpoint.player, checkpoint.round, checkpoint.turn, checkpoint.smallSpaces);
    const restoredCard = restored.bigCards!.find(({ instanceId }) => instanceId === card.instanceId)!;
    restored.bars = (restored.bars ?? []).filter((bar) => bar.id !== BAR_PREFIX + card.instanceId);
    if (progress) setPlayerBar(restored, progress);
    restored.buffs = [...restored.buffs.filter((buff) => !isEternalOpportunity(buff, card.instanceId)), ...opportunities];
    for (const key of Object.keys(player) as (keyof PlayerState)[]) if (!(key in restored)) delete player[key];
    Object.assign(player, restored);
    rememberMove(state, player, restoredCard, choice.action);
  } else rememberMove(state, player, card, choice.action);
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${player.name} 将「${choice.label}」设为永久续发的出招` });
  return true;
}

export function grantEternalThought(state: GameState, player: PlayerState, action: SkillAction): void {
  const card = readyEternalCard(state, player, action);
  if (!card) return;
  player.buffs.push({ id: createId(OPPORTUNITY_PREFIX), name: "永续改招机会", stacks: 1,
    sourceAbilityId: ETERNAL_THOUGHT_ID, sourceBigCardInstanceId: card.instanceId });
  if (!canGainStatus(player)) return;
  const threshold = 10 ** eternalFieldCount(state);
  const progress = eternalProgress(player, card.instanceId);
  if (progress >= threshold) player.buffs.push({ id: ETERNAL_GUARD, stateType: ETERNAL_GUARD, name: "永恒一念·抵挡到必杀",
    sourceAbilityId: ETERNAL_THOUGHT_ID, stacks: 1, expiresAtTurn: state.turnNumber + 1 });
  if (progress >= 2 * threshold) player.buffs.push({ id: ETERNAL_UNAFFECTED, stateType: ETERNAL_UNAFFECTED, name: "永恒一念·不受不良影响",
    sourceAbilityId: ETERNAL_THOUGHT_ID, stacks: 1, expiresAtTurn: state.turnNumber + 1, unaffectedByNegativeStatuses: true });
}

export function eternalContinuationActions(state: GameState, player: PlayerState): PlayerAction[] {
  const canTarget = (id: PlayerId) => {
    const target = findPlayer(state, id);
    return target?.status === "alive" && !preventsTargetSelection(target) &&
      canAffectAcrossSpace(state, player.id, id);
  };
  return Object.entries(player.eternalMoves ?? {}).flatMap(([instanceId, move]) => {
    if (move.startedTurn >= state.turnNumber) return [];
    const id = CONTINUATION_PREFIX + instanceId;
    const action = move.action.type === "gain_cake" || move.action.type === "discard_skill" ?
      { ...move.action, roarContinuationId: id } : { ...move.action, roarContinuationId: id, freeMoveId: id };
    if (action.type === "skill" && action.targetIds?.length) {
      const targetIds = action.targetIds.filter(canTarget);
      return targetIds.length ? [{ ...action, targetIds, targetId: targetIds[0]! }] : [];
    }
    return "targetId" in action && action.targetId && !canTarget(action.targetId) ? [] : [action];
  });
}
