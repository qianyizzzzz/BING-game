import { bigCardHasAbility, bigCardHasAbilityUses, SOUL_ELEMENT, SOUL_EXTINGUISH_ID, SOUL_IGNORE_ID, SOUL_INHERIT_ID,
  SOUL_RESTORE_EXTINGUISH_ID, SOUL_RESTORE_SINK_ID, SOUL_SINK_ID } from "../bigCards/abilities";
import { getBigCard } from "../bigCards/catalog";
import type { BuffState, DamageEvent, GameState, PlayerState, SkillAction, SkillId } from "../types";
import { changeElementAmount, getElementAmount } from "./elementResources";
import { createBaseEvent, createId, getActiveSkillCount } from "./gameFactory";
import { playersInSpace } from "./spaces";
import { isSkillIgnorable, withSkillsIgnored } from "./skillIgnore";

export const SOUL_DEATH_HISTORY = "soul_ordinary_death_history";
export const SOUL_DEATH_RECORDED = "soul_ordinary_death_recorded";
const SOUL_DEATH_IGNORE = "soul_death_ignore";
const SOUL_DEATH_EVENT = "soul_ordinary_death_event";
const SOUL_DEATH_PAID_PREFIX = "soul_death_paid:";
export const SOUL_EXTINGUISH_STATE = "soul_extinguish_turn";
const SOUL_RECENT_EXIT = "soul_recent_exit";

export function hasOrdinaryDeathHistory(player: PlayerState): boolean {
  return player.buffs.some((buff) => buff.id === SOUL_DEATH_HISTORY);
}

export function recordSoulExit(state: GameState, player: PlayerState): void {
  player.buffs = player.buffs.filter((buff) => buff.id !== SOUL_RECENT_EXIT);
  player.buffs.push({ id: SOUL_RECENT_EXIT, name: "本回合离场", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
}

export function isSoulSinkTarget(state: Pick<GameState, "turnNumber">, player: PlayerState): boolean {
  return player.status === "dead" && !player.emptyCityBodyDefeatId && !player.emptyCityPhantomDefeat &&
    player.defeatLevel !== undefined && player.defeatLevel >= 2 && player.defeatLevel <= 4 &&
    player.buffs.some((buff) => buff.id === SOUL_RECENT_EXIT && buff.expiresAtTurn === state.turnNumber + 1);
}

export function isSoulTrackingBuff(buff: BuffState): boolean {
  return [SOUL_DEATH_IGNORE, SOUL_DEATH_RECORDED, SOUL_DEATH_EVENT, SOUL_RECENT_EXIT].includes(buff.id) ||
    buff.id.startsWith(SOUL_DEATH_PAID_PREFIX);
}

export function hasUnansweredSoulExit(state: Pick<GameState, "turnNumber">, player: PlayerState): boolean {
  return isSoulSinkTarget(state, player) && player.buffs.some((buff) => buff.id === SOUL_RECENT_EXIT && buff.stacks === 1);
}

export function markSoulExitOffered(player: PlayerState): void {
  const exit = player.buffs.find((buff) => buff.id === SOUL_RECENT_EXIT);
  if (exit) exit.stacks = 2;
}

export function soulRestoredSkillId(skillId: SkillId): SkillId | undefined {
  if (skillId === SOUL_RESTORE_EXTINGUISH_ID) return SOUL_EXTINGUISH_ID;
  if (skillId === SOUL_RESTORE_SINK_ID) return SOUL_SINK_ID;
}

export function soulRestorationCard(player: PlayerState, action: Pick<SkillAction, "skillId" | "bigCardInstanceId">) {
  const id = soulRestoredSkillId(action.skillId);
  if (!id) return;
  return player.bigCards?.find((card) => (!action.bigCardInstanceId || action.bigCardInstanceId === card.instanceId) &&
    bigCardHasAbility(card, id) && !card.junengDisabled && (card.abilityUses?.[id] ?? 0) > 0);
}

export function canRespondWithSoulSkill(player: PlayerState, skillId: SkillId): boolean {
  return getActiveSkillCount(player, skillId) > 0 && Boolean(player.bigCards?.some((card) =>
    !card.junengDisabled && bigCardHasAbility(card, skillId) && bigCardHasAbilityUses(card, skillId)));
}

export function canRestoreSoulSink(player: PlayerState): boolean {
  return getActiveSkillCount(player, SOUL_RESTORE_SINK_ID) > 0 && getElementAmount(player, SOUL_ELEMENT) >= 10 &&
    Boolean(soulRestorationCard(player, { skillId: SOUL_RESTORE_SINK_ID }));
}

function acquiredSkills(owner: PlayerState) {
  const small = owner.skillInventory ?? owner.skills.map((skillId, index) => ({ skillId, acquisitionOrder: index + 1 }));
  const fusions = owner.skillFusions?.map(({ skillId, acquisitionOrder }) => ({ skillId, acquisitionOrder })) ?? [];
  const big = owner.bigCards?.flatMap((card) => card.junengDisabled ? [] :
    getBigCard(card.cardId)?.abilities.filter(({ id }) => bigCardHasAbility(card, id))
      .map(({ id }) => ({ skillId: id, acquisitionOrder: card.acquisitionOrder })) ?? []) ?? [];
  return [...small, ...fusions, ...big].sort((a, b) => (a.acquisitionOrder ?? Infinity) - (b.acquisitionOrder ?? Infinity));
}

type DeathIgnore = NonNullable<BuffState["soulDeathIgnores"]>[number];
type DeathCandidate = Omit<DeathIgnore, "payerId"> & { order: number };

export function prepareSoulDeathIgnores(state: GameState, target: PlayerState, candidates: ReadonlyMap<PlayerState, ReadonlySet<SkillId>>): void {
  if (target.buffs.some((buff) => buff.id === SOUL_DEATH_IGNORE)) return;
  const options: DeathCandidate[] = [];
  for (const [owner, skills] of candidates) {
    const counts: Record<SkillId, number> = {};
    for (const { skillId, acquisitionOrder } of acquiredSkills(owner)) {
      if (!skills.has(skillId) || !isSkillIgnorable(skillId) || (counts[skillId] ?? 0) >= getActiveSkillCount(owner, skillId)) continue;
      counts[skillId] = (counts[skillId] ?? 0) + 1;
      options.push({ ownerId: owner.id, skillId, order: acquisitionOrder ?? Infinity });
    }
  }
  const holders = playersInSpace(state, target.id).flatMap((player) => {
    if (player.status !== "alive" || !getActiveSkillCount(player, SOUL_IGNORE_ID)) return [];
    const reserved = state.players.filter((entry) => entry.buffs.some((buff) =>
      buff.id === SOUL_DEATH_IGNORE && buff.soulDeathIgnores?.some(({ payerId }) => payerId === player.id))).length;
    const capacity = getElementAmount(player, SOUL_ELEMENT) - reserved;
    if (capacity < 1) return [];
    const order = acquiredSkills(player).find(({ skillId }) => skillId === SOUL_IGNORE_ID)?.acquisitionOrder ?? Infinity;
    return [{ player, capacity, order }];
  });
  const choose = (ownerId: string, capacity: number, pool: DeathCandidate[]) => pool.filter((option) => option.ownerId !== ownerId)
    .sort((a, b) => a.order - b.order).slice(0, capacity);
  const stopped = new Set<string>();
  const assigned = new Set<DeathCandidate>();
  const choices: DeathIgnore[] = [];
  for (const { player, capacity } of holders.sort((a, b) => a.order - b.order)) {
    if (stopped.has(player.id)) continue;
    const opposingIgnores = holders.filter((other) => other.player.id !== player.id && !stopped.has(other.player.id) &&
      choose(other.player.id, other.capacity, options).some(({ ownerId }) => ownerId === player.id))
      .map(({ player: other, order }) => ({ ownerId: other.id, skillId: SOUL_IGNORE_ID, order }));
    for (const option of choose(player.id, capacity, [...options.filter((entry) => !assigned.has(entry)), ...opposingIgnores])) {
      const { ownerId, skillId } = option;
      assigned.add(option);
      if (skillId === SOUL_IGNORE_ID) stopped.add(ownerId);
      choices.push({ payerId: player.id, ownerId, skillId });
    }
  }
  const active = choices.filter(({ payerId }) => !stopped.has(payerId));
  target.buffs.push({ id: SOUL_DEATH_IGNORE, name: "冥途无夜·本次死亡结算", stacks: 1, uncleansable: true, soulDeathIgnores: active });
}

export function soulDeathIgnoresSkill(target: PlayerState, ownerId: string, skillId: SkillId): boolean {
  return target.buffs.some((buff) => buff.soulDeathIgnores?.some((entry) => entry.ownerId === ownerId && entry.skillId === skillId));
}

export function withSoulDeathIgnores<T>(state: Pick<GameState, "players">, target: PlayerState, effect: () => T): T {
  const owners = new Map<string, Record<SkillId, number>>();
  for (const { ownerId, skillId } of target.buffs.find((buff) => buff.id === SOUL_DEATH_IGNORE)?.soulDeathIgnores ?? []) {
    const counts = owners.get(ownerId) ?? {};
    counts[skillId] = (counts[skillId] ?? 0) + 1;
    owners.set(ownerId, counts);
  }
  const run = [...owners.entries()].reduceRight<() => T>((next, [ownerId, skillCounts]) =>
    () => withSkillsIgnored(state.players.find((player) => player.id === ownerId), { skillCounts }, next), effect);
  return run();
}

export function paySoulDeathIgnore(state: Pick<GameState, "turnNumber">, target: PlayerState, payer: PlayerState): boolean {
  const id = SOUL_DEATH_PAID_PREFIX + payer.id;
  if (target.buffs.some((buff) => buff.id === id) || getElementAmount(payer, SOUL_ELEMENT) < 1) return false;
  changeElementAmount(payer, SOUL_ELEMENT, -1);
  target.buffs.push({ id, name: "冥途无夜·本次已支付", stacks: 1, expiresAtTurn: state.turnNumber + 1, uncleansable: true });
  return true;
}

export function hasCurrentSoulDeath(state: Pick<GameState, "turnNumber">, target: PlayerState): boolean {
  return target.buffs.some((buff) => buff.id === SOUL_DEATH_EVENT && buff.expiresAtTurn === state.turnNumber + 1);
}

export function finishSoulDeathIgnores(state: Pick<GameState, "players" | "turnNumber">, target: PlayerState): void {
  const marker = target.buffs.find((buff) => buff.id === SOUL_DEATH_IGNORE);
  if (!marker) return;
  target.buffs = target.buffs.filter((buff) => buff !== marker);
  for (const id of new Set(marker.soulDeathIgnores?.map(({ payerId }) => payerId))) {
    const payer = state.players.find((player) => player.id === id);
    if (payer) paySoulDeathIgnore(state, target, payer);
  }
}

export function recordSoulOrdinaryDeath(state: GameState, target: PlayerState, fatalDamage: readonly DamageEvent[]): void {
  if (target.buffs.some((buff) => buff.id === SOUL_DEATH_RECORDED)) return;
  target.buffs = target.buffs.filter((buff) => buff.id !== SOUL_DEATH_EVENT && !buff.id.startsWith(SOUL_DEATH_PAID_PREFIX));
  target.buffs.push({ id: SOUL_DEATH_EVENT, name: "本回合发生普通死亡", stacks: 1, expiresAtTurn: state.turnNumber + 1, uncleansable: true });
  target.buffs.push({ id: SOUL_DEATH_RECORDED, name: "本次死亡已登记", stacks: 1, uncleansable: true });
  if (!hasOrdinaryDeathHistory(target))
    target.buffs.push({ id: SOUL_DEATH_HISTORY, name: "曾死亡", stacks: 1, uncleansable: true });
  const attackers = new Set(fatalDamage.flatMap((event) =>
    event.sourceId && event.sourceId !== target.id ? [event.sourceId] : []));
  const observers = playersInSpace(state, target.id).flatMap((player) => {
    const copies = player.status === "alive" || attackers.has(player.id) ? getActiveSkillCount(player, SOUL_INHERIT_ID) : 0;
    return copies ? [{ player, copies }] : [];
  });
  const removed = observers.some(({ player }) => attackers.has(player.id)) ? target.spareLives?.length ?? 0 : 0;
  if (removed) target.spareLives = [];
  for (const { player, copies } of observers) changeElementAmount(player, SOUL_ELEMENT,
    copies * (1 + (attackers.has(player.id) ? 5 * removed : 0)));
}

export function exileToSoulSpace(state: GameState, target: PlayerState): void {
  const id = createId("soul_exile");
  (state.smallSpaces ??= {})[id] = { kind: "soul_exile", name: "流放地", cakeMultiplier: 1, expiresAtRound: Number.MAX_SAFE_INTEGER };
  target.spaceId = id;
  state.pendingActions[target.id] = { actions: [], moveEligibilityAutoPass: true };
  state.actionWindowPlayerIds = state.actionWindowPlayerIds.filter((playerId) => playerId !== target.id);
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${target.name} 被放逐进流放地` });
}
