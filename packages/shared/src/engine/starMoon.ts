import type { BuffState, GameState, PlayerId, PlayerState } from "../types";
import { getBigCard } from "../bigCards/catalog";
import { canReceiveBigCard, grantFreshBigCard, reconcileTemporaryBigAbilities } from "./bigCards";
import { createId, findPlayer, getActiveSkillCount } from "./gameFactory";
import { effectHasCategory, negativeStatusesHaveNoEffect, stateHasCategory } from "./effectCategories";
import { canGainStatus } from "./karmaSong";
import { getOwnedSkillIds } from "../skills/fusion";
import { appendSkillIgnoreCounts, type SkillIgnore } from "./skillIgnore";
import { STAR_MOON_PIERCE, STAR_MOON_RIVER, STAR_MOON_SLOW, STAR_MOON_TEMPORARY_CARD } from "./starMoonIds";
import { TIAN_YE_SOARING_ID } from "./tianyeIds";
import { YIYUAN_STEP } from "./yiyuanIds";
import { DEMON_TYRANT_ID, DEMON_VOIDWALKER_ID } from "./demonIds";

export function getStarMoonCakeDivisor(player: PlayerState): number {
  if (negativeStatusesHaveNoEffect(player)) return 1;
  return 2 ** player.buffs.filter(({ stateType }) => stateType === STAR_MOON_SLOW).length;
}

export function starMoonDefenseMask(source: PlayerState | undefined, target: PlayerState | undefined,
  mask?: SkillIgnore): SkillIgnore | undefined {
  if (!source || !target || source === target || !getActiveSkillCount(source, STAR_MOON_PIERCE)) return mask;
  const ids = new Set([...getOwnedSkillIds(target), ...target.buffs.flatMap((buff) => [buff.id, buff.sourceAbilityId ?? buff.stateType ?? ""])]);
  if (target.summon?.kind === "voidwalker") ids.add(DEMON_VOIDWALKER_ID);
  if (target.summon) ids.add(DEMON_TYRANT_ID);
  const relevant = [...ids].filter((id) => id !== STAR_MOON_RIVER && id !== TIAN_YE_SOARING_ID && id !== YIYUAN_STEP &&
    (effectHasCategory(id, "damage_immunity") || effectHasCategory(id, "damage_reduction") || effectHasCategory(id, "damage_evasion")));
  return appendSkillIgnoreCounts(mask, Object.fromEntries(relevant.map((id) => [id, Number.MAX_SAFE_INTEGER])));
}

export function getStarMoonCardChoices(state: GameState, playerId: PlayerId) {
  return (state.starMoonCardHits ?? []).filter((hit) => hit.playerId === playerId && hit.turn === state.turnNumber).flatMap(({ targetId }) => {
    const target = findPlayer(state, targetId);
    return (target?.bigCards ?? []).filter((card) => !card.onlyAbilityId).map((card, index) => ({
      targetId, instanceId: card.instanceId,
      label: card.publiclyRevealed ? getBigCard(card.cardId)?.name ?? card.cardId : `未暴露的大卡 ${index + 1}`
    }));
  });
}

export function grantStarMoonCard(state: GameState, receiver: PlayerState, targetId: PlayerId, cardId: string): void {
  const target = findPlayer(state, targetId);
  const card = target?.bigCards?.find(({ instanceId, onlyAbilityId }) => instanceId === cardId && !onlyAbilityId);
  if (!card || !canGainStatus(receiver) || !canReceiveBigCard(receiver, "skill_gain")) return;
  const expiresAtRound = state.roundNumber + 1;
  const copy = grantFreshBigCard(state, receiver, card, { borrowedUntilRound: expiresAtRound });
  copy.starMoonTemporary = true;
  receiver.buffs.push({ id: createId(STAR_MOON_TEMPORARY_CARD), stateType: STAR_MOON_TEMPORARY_CARD,
    name: "星月狂舞·暂时获得大卡", stacks: 1, sourceBigCardInstanceId: copy.instanceId, expiresAtRound });
}

export function absorbStarMoonPositiveStates(state: GameState, source: PlayerState, target: PlayerState): void {
  if (source === target || !canGainStatus(source)) return;
  const moved = target.buffs.filter((buff) => stateHasCategory(buff, "positive") && !buff.uncleansable);
  target.buffs = target.buffs.filter((buff) => !moved.includes(buff));
  for (const buff of moved) {
    if (buff.stateType === STAR_MOON_TEMPORARY_CARD) {
      const card = target.bigCards?.find(({ instanceId }) => instanceId === buff.sourceBigCardInstanceId);
      if (card) grantStarMoonCard(state, source, target.id, card.instanceId);
    } else addTransferredBuff(source, buff);
  }
  reconcileTemporaryBigAbilities(target, state);
}

function addTransferredBuff(owner: PlayerState, buff: BuffState): void {
  const current = owner.buffs.find(({ id }) => id === buff.id);
  if (!current) owner.buffs.push(buff);
  else {
    current.stacks = Math.max(current.stacks, buff.stacks);
    if (buff.expiresAtRound === undefined) delete current.expiresAtRound;
    else if (current.expiresAtRound !== undefined) current.expiresAtRound = Math.max(current.expiresAtRound, buff.expiresAtRound);
    if (buff.expiresAtTurn === undefined) delete current.expiresAtTurn;
    else if (current.expiresAtTurn !== undefined) current.expiresAtTurn = Math.max(current.expiresAtTurn, buff.expiresAtTurn);
  }
}
