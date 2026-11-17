import { sharePositiveState } from "./siphon";
import { ANCIENT_ROAR_ID, bigCardHasAbility, HONGHUANG_ATTACK_ID, MOUNTAIN_SEAL_ID, SACRED_BEAST_ID } from "../bigCards/abilities";
import type { BigCardInstance } from "../bigCards/types";
import { getFusionRecipe, getFusionSkillId, reconcileSkillFusions } from "../skills/fusion";
import type { AttackStats, BuffState, GameState, PlayerAction, PlayerId, PlayerState, SkillAction, SkillId } from "../types";
import { attackPowerValue, combatValue, INFINITY_VALUE, projectCombatValue, RETIRE_VALUE } from "./combatValues";
import { createBaseEvent, createId, findPlayer, getActiveSkillCount } from "./gameFactory";
import { canRestoreTemporalState } from "./jueying";
import { isSkillIgnored } from "./skillIgnore";
import { grantInitializedSkill } from "./skillAcquisition";
import { ensureSkillInventory, removeSkillInstanceAt } from "./skillInventory";
import { preservePermanentTalismans } from "./talismanRules";
import { canGainStatus } from "./karmaSong";
import { clampPlayerHpToCap, clearNightHpCap, getPlayerHpValue, setPlayerHpValue } from "./infiniteValues";
import { getPeriodicUses, invertPeriodicUses, periodicCardUseKey } from "./limitedUseBalance";

export const SACRED_BEASTS = {
  dragon: { name: "青龙", skills: ["断绝", "雷霆之魂"] },
  tiger: { name: "白虎", skills: ["山河破碎", "毁灭之魂"] },
  phoenix: { name: "朱雀", skills: ["炼狱使徒", "火•杀•换"] },
  tortoise: { name: "玄武", skills: ["神隐斗篷", "冰霜之魂"] }
} as const;
export type SacredBeast = keyof typeof SACRED_BEASTS;
export interface SacredBeastState {
  usedRound: number;
  active: boolean;
  stored?: {
    inventory: NonNullable<PlayerState["skillInventory"]>;
    fusions: NonNullable<PlayerState["skillFusions"]>;
    buffs: BuffState[];
    round: number;
    turn: number;
  };
  used?: Record<SkillId, number>;
}
export const ROAR_REFLECTION = "ancient_roar_reflection";
export const ROAR_DURATION = "ancient_roar_duration";
export const MOUNTAIN_SEAL_NUMBERS = "mountain_seal_numbers";

export function beastGrantSource(card: BigCardInstance, key: SacredBeast): string {
  return `${card.instanceId}:beast:${key}`;
}

export function activeBeastGrants(card: BigCardInstance): { id: string; beast: SacredBeastState }[] {
  return (Object.keys(SACRED_BEASTS) as SacredBeast[]).flatMap((key) => {
    const beast = card.sacredBeasts?.[key];
    return beast?.active ? [{ id: beastGrantSource(card, key), beast }] : [];
  });
}

export function activeBeastSkillSource(player: PlayerState, skillId: SkillId): string | undefined {
  return player.bigCards?.flatMap(activeBeastGrants).find(({ id }) => player.skillInventory?.some((entry) =>
    entry.sourceBigCardInstanceId === id && entry.skillId === skillId))?.id;
}

export function adjustBeastUseLedger(player: PlayerState, beast: SacredBeastState, direction: -1 | 1): void {
  for (const [skillId, count] of Object.entries(beast.used ?? {})) {
    const id = `skill_used:${skillId}`;
    const buff = player.buffs.find((entry) => entry.id === id);
    if (buff) {
      buff.stacks += count * direction;
      if (buff.stacks <= 0) player.buffs = player.buffs.filter((entry) => entry !== buff);
    } else if (direction === 1) player.buffs.push({ id, name: "技能使用次数", stacks: count });
  }
}

export function availableSacredBeasts(player: PlayerState, round: number, instanceId?: string): SacredBeast[] {
  if (!getActiveSkillCount(player, SACRED_BEAST_ID) ||
    player.bigCards?.some((card) => Object.values(card.sacredBeasts ?? {}).some((beast) => beast.active || beast.usedRound === round))) return [];
  const block = Math.floor((round - 1) / 6);
  if (!player.bigCards?.some((card) => (!instanceId || card.instanceId === instanceId) &&
    !card.junengDisabled && bigCardHasAbility(card, SACRED_BEAST_ID))) return [];
  return (Object.keys(SACRED_BEASTS) as SacredBeast[]).filter((key) =>
    getPeriodicUses(player, sacredBeastQuotaKey(key), block, 1) > 0 && !usedSacredBeastQuota(player, key, block));
}

const sacredBeastQuotaKey = (key: SacredBeast) => `${SACRED_BEAST_ID}:${key}`;
function usedSacredBeastQuota(player: PlayerState, key: SacredBeast, block: number): boolean {
  return player.bigCards?.some((card) => card.sacredBeasts?.[key] &&
    Math.floor((card.sacredBeasts[key]!.usedRound - 1) / 6) === block) ?? false;
}

export function invertSacredBeastQuotas(player: PlayerState, round: number): void {
  if (!player.bigCards?.some((card) => bigCardHasAbility(card, SACRED_BEAST_ID))) return;
  const block = Math.floor((round - 1) / 6);
  for (const key of Object.keys(SACRED_BEASTS) as SacredBeast[])
    invertPeriodicUses(player, sacredBeastQuotaKey(key), block, Number(!usedSacredBeastQuota(player, key, block)), 1);
}

export function openSacredBeast(state: GameState, player: PlayerState, key: SacredBeast, instanceId?: string): void {
  if (!canGainStatus(player)) return;
  const card = player.bigCards?.find((item) => (!instanceId || item.instanceId === instanceId) &&
    !item.junengDisabled && bigCardHasAbility(item, SACRED_BEAST_ID) &&
    availableSacredBeasts(player, state.roundNumber, item.instanceId).includes(key));
  if (!card) return;
  const beasts = card.sacredBeasts ??= {};
  const beast = beasts[key] ??= { active: false, usedRound: 0 };
  const stored = beast.stored;
  beast.active = true;
  beast.usedRound = state.roundNumber;
  if (stored) {
    ensureSkillInventory(player);
    player.skillInventory!.push(...stored.inventory);
    player.skills.push(...stored.inventory.map(({ skillId }) => skillId));
    (player.skillFusions ??= []).push(...stored.fusions);
    player.buffs.push(...stored.buffs.map((buff) => shiftBuffDeadlines(buff, state.roundNumber - stored.round, state.turnNumber - stored.turn)));
    adjustBeastUseLedger(player, beast, 1);
    delete beast.stored;
  } else {
    for (const name of SACRED_BEASTS[key].skills)
      grantInitializedSkill(state, player.id, getFusionSkillId(name), `神兽封印·${SACRED_BEASTS[key].name}`, false, undefined, beastGrantSource(card, key));
  }
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name} 本轮开启${SACRED_BEASTS[key].name}` });
}

export function closeSacredBeasts(state: GameState, players = state.players, closeAtRound = state.roundNumber + 1): void {
  for (const player of players) for (const card of player.bigCards ?? []) for (const { id, beast } of activeBeastGrants(card)) {
    const inventory = player.skillInventory?.filter((entry) => entry.sourceBigCardInstanceId === id) ?? [];
    const fusions = player.skillFusions?.filter((entry) => entry.sourceBigCardInstanceId === id) ?? [];
    const fusionIds = new Set(fusions.map((fusion) => fusion.id));
    const buffs = player.buffs.filter((buff) => buff.sourceBigCardInstanceId === id ||
      Boolean(buff.sourceFusionId && fusionIds.has(buff.sourceFusionId)));
    beast.stored = { inventory, fusions, buffs: buffs.filter((buff) => (buff.expiresAtRound ?? Infinity) > closeAtRound &&
      (buff.expiresAtTurn ?? Infinity) > state.turnNumber), round: closeAtRound, turn: state.turnNumber };
    beast.active = false;
    adjustBeastUseLedger(player, beast, -1);
    player.buffs = player.buffs.filter((buff) => !buffs.includes(buff));
    player.skillFusions = player.skillFusions?.filter((fusion) => !fusionIds.has(fusion.id));
    for (let index = player.skills.length - 1; index >= 0; index--) {
      if (player.skillInventory?.[index]?.sourceBigCardInstanceId === id) removeSkillInstanceAt(player, index);
    }
    reconcileSkillFusions(player);
  }
}

function shiftBuffDeadlines(buff: BuffState, rounds: number, turns: number): BuffState {
  const shifted = { ...buff };
  if (shifted.expiresAtRound !== undefined) shifted.expiresAtRound += rounds;
  if (shifted.expiresAtTurn !== undefined) shifted.expiresAtTurn += turns;
  if (shifted.moveBlockedFromTurn !== undefined) shifted.moveBlockedFromTurn += turns;
  if (shifted.startsAtRound !== undefined) shifted.startsAtRound += rounds;
  if (shifted.lifeAbsorptionDueRound !== undefined) shifted.lifeAbsorptionDueRound += rounds;
  if (shifted.lastTickTurn !== undefined) shifted.lastTickTurn += turns;
  if (shifted.continuationStartedTurn !== undefined) shifted.continuationStartedTurn += turns;
  if (shifted.siphonNextTick !== undefined) shifted.siphonNextTick += turns;
  if (shifted.talismanNextTick !== undefined) shifted.talismanNextTick += turns;
  if (shifted.dreamEntryTurn !== undefined) shifted.dreamEntryTurn += turns;
  if (shifted.dreamRoundBefore !== undefined) shifted.dreamRoundBefore += rounds;
  if (shifted.saintYield) shifted.saintYield = { ...shifted.saintYield, turnNumber: shifted.saintYield.turnNumber + turns };
  if (shifted.defenseResponse) shifted.defenseResponse = { ...shifted.defenseResponse, turnNumber: shifted.defenseResponse.turnNumber + turns };
  const roundInId = /^(trauma_converge:|sealed_skill_until_round:|skill_disabled_until_round:|collapse_until_round:|qinglian_cake_round:|shenyin_cape_round:|lingta_cloud:)(\d+)(.*)$/.exec(buff.id);
  if (roundInId) shifted.id = `${roundInId[1]}${Number(roundInId[2]) + rounds}${roundInId[3]}`;
  if (buff.waveAttack) shifted.waveAttack = { ...buff.waveAttack, firstTurn: buff.waveAttack.firstTurn + turns };
  if (buff.roarContinuation) shifted.roarContinuation = { ...buff.roarContinuation, firstTurn: buff.roarContinuation.firstTurn + turns };
  return shifted;
}

export interface RoundStartSnapshot {
  round: number;
  turn: number;
  players: PlayerState[];
  smallSpaces?: GameState["smallSpaces"];
}

export function restoreTemporalPlayerSnapshot(state: GameState, current: PlayerState, saved: PlayerState,
  round: number, turn: number, smallSpaces?: GameState["smallSpaces"]): PlayerState {
  const rounds = state.roundNumber - round;
  const turns = state.turnNumber - turn;
  const restored = structuredClone(saved);
  restored.name = current.name;
  if (current.decayFieldHpCap) restored.decayFieldHpCap = true;
  else delete restored.decayFieldHpCap;
  if (current.nightHpCap) {
    restored.nightHpCap = current.nightHpCap;
    setPlayerHpValue(restored, getPlayerHpValue(restored));
  } else clearNightHpCap(restored);
  clampPlayerHpToCap(restored);
  restored.buffs = restored.buffs.map((buff) => shiftBuffDeadlines(buff, rounds, turns));
  preservePermanentTalismans(current, restored);
  for (const card of restored.bigCards ?? []) {
    if (card.mountainSealReadyRound !== undefined) card.mountainSealReadyRound += rounds;
    if (card.borrowedUntilRound !== undefined) card.borrowedUntilRound += rounds;
    if (card.xielingCooldown) card.xielingCooldown.castTurn += turns;
  }
  for (const move of Object.values(restored.eternalMoves ?? {})) move.startedTurn += turns;
  const space = restored.spaceId ? smallSpaces?.[restored.spaceId] : undefined;
  if (space && restored.spaceId) (state.smallSpaces ??= {})[restored.spaceId] = { ...space, expiresAtRound: space.expiresAtRound + rounds };
  return restored;
}

export function captureRoundStart(state: GameState): void {
  if (!state.players.some((player) => player.bigCards?.length)) return;
  const history = state.roundStartSnapshots ??= [];
  if (history.some((snapshot) => snapshot.round === state.roundNumber)) return;
  state.roundStartSnapshots = [...history.filter((snapshot) => snapshot.round >= state.roundNumber - 2), {
    round: state.roundNumber, turn: state.turnNumber, players: structuredClone(state.players),
    ...(state.smallSpaces ? { smallSpaces: structuredClone(state.smallSpaces) } : {})
  }];
}

export function rewindTargetIds(action: SkillAction): PlayerId[] {
  return [...new Set([action.targetId, ...(action.targetIds ?? [])].filter((id): id is PlayerId => Boolean(id)))];
}

export function getRewindSnapshot(state: GameState, targets: readonly PlayerId[]): RoundStartSnapshot | undefined {
  if (targets.length !== 1 && targets.length !== 2) return undefined;
  const snapshot = state.roundStartSnapshots?.find(({ round }) => round === state.roundNumber - (3 - targets.length));
  if (!snapshot || targets.some((id) => {
    const player = findPlayer(state, id);
    return player?.status !== "alive" || player.hp < 0 || player.defeatLevel !== undefined ||
      player.buffs.some((buff) => buff.id === "pending_death" || buff.id === "direct_non_damage_death") ||
      !canRestoreTemporalState(state, player) ||
      !snapshot.players.some((entry) => entry.id === id);
  })) return undefined;
  return snapshot;
}

export function rewindPlayers(state: GameState, action: SkillAction, sourceId: PlayerId): void {
  const ids = rewindTargetIds(action);
  const snapshot = getRewindSnapshot(state, ids);
  if (!snapshot) return;
  for (const id of ids) {
    const index = state.players.findIndex((player) => player.id === id);
    const current = state.players[index]!;
    const restored = restoreTemporalPlayerSnapshot(state, current, snapshot.players.find((player) => player.id === id)!,
      snapshot.round, snapshot.turn, snapshot.smallSpaces);
    for (const card of restored.bigCards ?? []) {
      if (id !== sourceId) continue;
      const uses = current.bigCards?.find((item) => item.instanceId === card.instanceId)?.abilityUses?.[action.skillId];
      if (uses !== undefined) (card.abilityUses ??= {})[action.skillId] = uses;
    }
    state.players[index] = restored;
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${current.name} 经时溯回到第 ${snapshot.round} 轮的轮初状态` });
  }
}

export function readyMountainSeal(player: PlayerState, round: number): BigCardInstance | undefined {
  if (!getActiveSkillCount(player, MOUNTAIN_SEAL_ID)) return undefined;
  return player.bigCards?.find((card) => !card.junengDisabled && bigCardHasAbility(card, MOUNTAIN_SEAL_ID) &&
    (card.mountainSealReadyRound ?? 0) <= round &&
    getPeriodicUses(player, periodicCardUseKey(MOUNTAIN_SEAL_ID, card.instanceId), round, 1) > 0);
}

export function reflectAncientRoarMove(state: GameState, sourceId: PlayerId, targetId: PlayerId, moveKey: string, name: string): PlayerId {
  if (sourceId === targetId) return targetId;
  const target = findPlayer(state, targetId);
  const guard = target?.buffs.find((buff) => buff.stateType === ROAR_REFLECTION && buff.expiresAtTurn === state.turnNumber + 1);
  if (!target || !guard || isSkillIgnored(target, ANCIENT_ROAR_ID)) return targetId;
  const moves = guard.reflectedMoveKeys ??= [];
  if (!moves.includes(moveKey)) {
    moves.push(moveKey);
    let bonus = target.buffs.find((buff) => buff.stateType === ROAR_DURATION && buff.expiresAtRound === state.roundNumber + 2);
    if (!bonus) {
      bonus = { id: `${ROAR_DURATION}:${state.roundNumber + 1}`, name: "太古的怒吼·持续时间强化",
        stateType: ROAR_DURATION, stacks: 0, expiresAtRound: state.roundNumber + 2 };
      target.buffs.push(bonus);
    }
    bonus.stacks++;
    sharePositiveState(state, target, bonus);
    state.eventLog.push({ ...createBaseEvent(state, "attack_reflected"), type: "attack_reflected",
      sourceId, originalTargetId: targetId, reflectedTargetId: sourceId, attackName: name });
  }
  return sourceId;
}

export function roarMultiplier(player: PlayerState | undefined, round: number): number {
  return player?.buffs.find((buff) => buff.stateType === ROAR_DURATION && buff.expiresAtRound === round + 1)?.stacks ?? 0;
}

export function queueRoarContinuation(player: PlayerState, action: PlayerAction, turn: number, duration: number,
  name = "太古的怒吼"): void {
  if (duration <= 1 || action.roarContinuationId || action.type === "discard_skill" ||
    action.type === "skill" && (action.waveContinuationId || action.tianlieContinuationId)) return;
  const repeated = structuredClone(action);
  if ("freeMoveId" in repeated) delete repeated.freeMoveId;
  player.buffs.push({ id: createId("roar_move"), name, stateType: "roar_move", stacks: 1,
    expiresAtTurn: Math.min(Number.MAX_SAFE_INTEGER, turn + duration), roarContinuation: { action: repeated, firstTurn: turn } });
}

export function honghuangParts(stats: AttackStats, enhanced: boolean): AttackStats {
  if (stats.id !== HONGHUANG_ATTACK_ID) return stats;
  const parts = [attackPowerValue(stats), combatValue(10), combatValue(100), enhanced ? INFINITY_VALUE : combatValue(1000),
    enhanced ? RETIRE_VALUE : INFINITY_VALUE];
  return { ...stats, damageParts: parts.map(projectCombatValue), damagePartValues: parts, honghuangLastRetires: enhanced };
}
