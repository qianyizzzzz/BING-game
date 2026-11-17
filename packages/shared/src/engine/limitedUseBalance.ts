import type { BigCardInstance } from "../bigCards/types";
import type { BuffState, SkillId } from "../types";

type SkillUseOwner = { buffs: ReadonlyArray<Pick<BuffState, "id" | "periodicUseBalance"> & Partial<Pick<BuffState, "stacks">>> };
const adjustmentId = (skillId: SkillId) => `limited_use_balance:${skillId}`;

export function getSkillUseBalanceAdjustment(player: SkillUseOwner, skillId: SkillId): number {
  return player.buffs.find((buff) => buff.id === adjustmentId(skillId))?.stacks ?? 0;
}

export function setSkillUseBalanceAdjustment(player: { buffs: BuffState[] }, skillId: SkillId, adjustment: number, name?: string): void {
  const id = adjustmentId(skillId);
  const existing = player.buffs.find((buff) => buff.id === id);
  if (!adjustment) {
    if (existing) player.buffs = player.buffs.filter((buff) => buff !== existing);
  } else if (existing) {
    existing.stacks = adjustment;
    if (name) existing.name = name;
  } else {
    player.buffs.push({ id, name: name ?? "净灵·奇反的次数变更", stacks: adjustment });
  }
}

export function getBigCardLimitedRemaining(card: BigCardInstance, skillId: SkillId, baseLimit: number): number {
  return baseLimit + (card.abilityUseBonuses?.[skillId] ?? 0) + (card.abilityUseBalanceAdjustments?.[skillId] ?? 0) -
    (card.abilityUses?.[skillId] ?? 0);
}

export function setBigCardUseBalanceAdjustment(card: BigCardInstance, skillId: SkillId, adjustment: number): void {
  if (adjustment) (card.abilityUseBalanceAdjustments ??= {})[skillId] = adjustment;
  else if (card.abilityUseBalanceAdjustments) delete card.abilityUseBalanceAdjustments[skillId];
}

const periodicId = (key: string) => `periodic_use_balance:${key}`;
export const periodicCardUseKey = (skillId: SkillId, cardId: string) => `${skillId}:${cardId}`;
export const periodicFlashUseKey = (fusionId: string, index: number) => fusionId ? `huiyue:${fusionId}` : `flash:${index}`;

function periodicBalance(player: SkillUseOwner, key: string) {
  return player.buffs.find((buff) => buff.id === periodicId(key));
}

function periodicAdjustment(player: SkillUseOwner, key: string, now: number): number {
  const buff = periodicBalance(player, key);
  const balance = buff?.periodicUseBalance;
  if (!buff || !balance) return 0;
  const elapsed = Math.floor(Math.max(0, now - balance.startedAt) / balance.interval);
  const adjustment = buff.stacks ?? 0;
  return adjustment < 0 ? Math.min(0, adjustment + elapsed * balance.quota) : adjustment;
}

export function getPeriodicUses(player: SkillUseOwner, key: string, now: number, nativeUses: number): number {
  return nativeUses + periodicAdjustment(player, key, now);
}

export function periodicUseReadyAt(player: SkillUseOwner, key: string, now: number, nativeReady: number): number {
  const ready = Math.max(now, nativeReady);
  const remaining = getPeriodicUses(player, key, ready, 1);
  const balance = periodicBalance(player, key)?.periodicUseBalance;
  if (remaining > 0 || !balance) return nativeReady;
  const ticks = Math.floor(Math.max(0, ready - balance.startedAt) / balance.interval);
  return Math.max(nativeReady, balance.startedAt + (ticks + Math.ceil((1 - remaining) / balance.quota)) * balance.interval);
}

export function invertPeriodicUses(player: { buffs: BuffState[] }, key: string, now: number, nativeUses: number,
  interval: number, quota = 1): void {
  const remaining = getPeriodicUses(player, key, now, nativeUses);
  if (!remaining) return;
  const adjustment = -remaining - nativeUses;
  const buff = periodicBalance(player, key);
  if (buff) player.buffs = player.buffs.filter((entry) => entry !== buff);
  if (adjustment) player.buffs.push({ id: periodicId(key), name: "净灵·奇反的周期次数变更", stacks: adjustment,
    periodicUseBalance: { startedAt: now, interval, quota } });
}
