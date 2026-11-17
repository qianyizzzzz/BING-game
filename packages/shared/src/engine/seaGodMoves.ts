import { bigCardHasAbility } from "../bigCards/abilities";
import type { PlayerState } from "../types";
import { getPeriodicUses, periodicCardUseKey, periodicUseReadyAt } from "./limitedUseBalance";
import { negativeStatusesHaveNoEffect } from "./effectCategories";
import { SEA_GOD_RETURN_COOLDOWN, SEA_GOD_RETURN_ID, SEA_GOD_WAVES_STATE } from "./seaGodIds";

const RETURN_INTERVAL = 3;
type SeaGodReturnOwner = Pick<PlayerState, "buffs" | "bigCards">;

export function getSeaGodReturnNativeReadyAt(player: Pick<PlayerState, "buffs">, round: number, instanceId: string): number {
  return Math.max(round, ...player.buffs.filter((buff) =>
    buff.id.startsWith(SEA_GOD_RETURN_COOLDOWN + ":") && buff.sourceBigCardInstanceId === instanceId)
    .map((buff) => buff.expiresAtRound ?? round));
}

export function getSeaGodReturnReadyAt(player: Pick<PlayerState, "buffs">, round: number, instanceId: string): number {
  const nativeReady = getSeaGodReturnNativeReadyAt(player, round, instanceId);
  return periodicUseReadyAt(player, periodicCardUseKey(SEA_GOD_RETURN_ID, instanceId), round, nativeReady);
}

export function getReadySeaGodReturnInstance(player: SeaGodReturnOwner, round: number, instanceId?: string,
  used?: ReadonlySet<string>): string | undefined {
  return player.bigCards?.find((card) => (!instanceId || card.instanceId === instanceId) && !used?.has(card.instanceId) && !card.junengDisabled &&
    bigCardHasAbility(card, SEA_GOD_RETURN_ID) && getSeaGodReturnNativeReadyAt(player, round, card.instanceId) === round &&
    getPeriodicUses(player, periodicCardUseKey(SEA_GOD_RETURN_ID, card.instanceId), round, 1) > 0)?.instanceId;
}

export function isSeaGodReturnReady(player: SeaGodReturnOwner, round: number, instanceId?: string): boolean {
  return getReadySeaGodReturnInstance(player, round, instanceId) !== undefined;
}

export function spendSeaGodReturnUse(player: PlayerState, round: number, instanceId?: string): string | undefined {
  const ready = getReadySeaGodReturnInstance(player, round, instanceId);
  if (!ready) return undefined;
  const id = `${SEA_GOD_RETURN_COOLDOWN}:${ready}`;
  player.buffs = player.buffs.filter((buff) => buff.id !== id);
  player.buffs.push({ id, name: "一去不返冷却", stacks: 1, sourceBigCardInstanceId: ready, expiresAtRound: round + RETURN_INTERVAL });
  return ready;
}

export function seaGodWavesInvalidatesMoves(player: PlayerState, turn: number, round: number): boolean {
  return !negativeStatusesHaveNoEffect(player) && player.buffs.some((buff) => buff.stateType === SEA_GOD_WAVES_STATE &&
    (buff.expiresAtRound ?? 0) > round && (buff.moveBlockedFromTurn ?? 0) <= turn);
}
