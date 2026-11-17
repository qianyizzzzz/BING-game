import { bigCardHasAbility, KURONG_ATTACK_ID, KURONG_LEAF_ID } from "../bigCards/abilities";
import { getBigCard } from "../bigCards/catalog";
import type { GameState, LeafAbilityChoice, LeafCardChoice, PlayerId, PlayerState } from "../types";
import { canReceiveBigCard, grantFreshBigCard, recordBigCardKnowledge } from "./bigCards";
import { addSpareLife } from "./kaige";
import { createBaseEvent, createId, findPlayer, getActiveSkillCount } from "./gameFactory";
import { isFusionPreparation } from "../skills/fusion";
import { effectIsSuppressed, getSpringGrassNumber } from "./effectCategories";
import { getPlayerHpValue } from "./infiniteValues";
import { shareSpace } from "./spaces";
import { canGainStatus } from "./karmaSong";

export const KURONG_LIFE_MARK = "kurong_life_absorption";

export function initializeKurongOpening(state: GameState, discoveries: Set<PlayerId>): void {
  const players = state.players.filter((player) => player.status === "alive" && player.kind !== "spectator");
  for (const viewer of players) {
    if (!getActiveSkillCount(viewer, KURONG_LEAF_ID)) continue;
    const choices = players.flatMap((owner): LeafCardChoice[] => {
      if (owner.id === viewer.id) return [];
      const cards = (owner.bigCards ?? []).flatMap((card): LeafCardChoice[] => {
        const abilityIds = getBigCard(card.cardId)?.abilities.filter(({ id }) => bigCardHasAbility(card, id)).map(({ id }) => id);
        return abilityIds?.length ? [{ ownerId: owner.id, cardInstanceId: card.instanceId, cardId: card.cardId, abilityIds }] : [];
      });
      const sampled = cards[Math.floor(Math.random() * cards.length)];
      return sampled ? [sampled] : [];
    });
    if (choices.length) {
      (state.leafCardsByViewer ??= {})[viewer.id] = choices;
      for (const { cardInstanceId, ownerId } of choices) {
        const owner = findPlayer(state, ownerId)!;
        const card = owner.bigCards!.find((entry) => entry.instanceId === cardInstanceId)!;
        recordBigCardKnowledge(state, viewer, owner, card, discoveries);
      }
    }
  }
}

export function getKurongLeafChoices(state: GameState, playerId: PlayerId): LeafCardChoice[] {
  return isFusionPreparation(state) ? state.leafCardsByViewer?.[playerId] ?? [] : [];
}

export function validateKurongLeaves(state: GameState, player: PlayerState, choices: unknown): choices is LeafAbilityChoice[] {
  const available = getKurongLeafChoices(state, player.id);
  if (!Array.isArray(choices) || choices.length < 1 || choices.length > 3 || !canReceiveBigCard(player, "skill_gain")) return false;
  const seen = new Set<string>();
  for (const choice of choices) {
    if (!choice || typeof choice.cardInstanceId !== "string" || typeof choice.abilityId !== "string" ||
      seen.has(choice.cardInstanceId)) return false;
    const offered = available.find((entry) => entry.cardInstanceId === choice.cardInstanceId && entry.abilityIds.includes(choice.abilityId));
    const card = offered && findPlayer(state, offered.ownerId)?.bigCards?.find((entry) => entry.instanceId === offered.cardInstanceId);
    if (!card || !bigCardHasAbility(card, choice.abilityId)) return false;
    seen.add(choice.cardInstanceId);
  }
  return true;
}

export function takeKurongLeaves(state: GameState, player: PlayerState, choices: LeafAbilityChoice[] | undefined): void {
  if (!validateKurongLeaves(state, player, choices)) return;
  const offered = getKurongLeafChoices(state, player.id);
  delete state.leafCardsByViewer![player.id];
  for (const choice of choices) {
    const entry = offered.find((item) => item.cardInstanceId === choice.cardInstanceId)!;
    const card = findPlayer(state, entry.ownerId)!.bigCards!.find((item) => item.instanceId === choice.cardInstanceId)!;
    grantFreshBigCard(state, player, card, { onlyAbilityId: choice.abilityId });
  }
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id,
    message: `${player.name} 通过叶落彼岸获得 ${choices.length} 个大卡子技能` });
}

type SpareLife = NonNullable<PlayerState["spareLives"]>[number];

function canAbsorbLife(source: PlayerState | undefined, target: PlayerState | undefined): source is PlayerState {
  return Boolean(source?.status === "alive" && target?.status === "alive" && source.id !== target.id &&
    shareSpace(source, target) && !effectIsSuppressed(source, KURONG_ATTACK_ID) &&
    !target.buffs.some((buff) => buff.immuneEffectCategories?.some((category) =>
      category === "life_absorption" || category === "life_loss")));
}

function receiveAbsorbedLife(state: GameState, player: PlayerState, life: SpareLife): void {
  addSpareLife(player, { hp: life.hp, ...(life.hpValue ? { hpValue: life.hpValue } : {}) }, state);
}

export function applyKurongLifeAbsorption(state: GameState, sourceId: PlayerId, targetId: PlayerId): void {
  const source = findPlayer(state, sourceId);
  const target = findPlayer(state, targetId);
  if (!target || !canAbsorbLife(source, target)) return;
  const spares = target.spareLives?.splice(0) ?? [];
  if (spares.length) {
    for (const life of spares) receiveAbsorbedLife(state, source, life);
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `万物枯荣使 ${target.name} 失去 ${spares.length} 条多余命，保留当前这条命` });
  } else if (canGainStatus(target)) {
    target.buffs.push({ id: createId(KURONG_LIFE_MARK), stateType: KURONG_LIFE_MARK, name: "万物枯荣·轮初吸命",
      stacks: 1, sourcePlayerId: source.id, sourceAbilityId: KURONG_ATTACK_ID, lifeAbsorptionDueRound: state.roundNumber + 3 });
  }
}

export function settleKurongLifeAbsorption(state: GameState,
  loseLastLife: (target: PlayerState, sourceId: PlayerId) => boolean): boolean {
  let lostLastLife = false;
  for (const target of state.players) {
    const due = target.buffs.filter((buff) => buff.stateType === KURONG_LIFE_MARK &&
      (buff.lifeAbsorptionDueRound ?? Infinity) <= state.roundNumber);
    if (!due.length) continue;
    target.buffs = target.buffs.filter((buff) => !due.includes(buff));
    for (const mark of due) {
      const source = findPlayer(state, mark.sourcePlayerId ?? "");
      if (!canAbsorbLife(source, target)) continue;
      const limit = getSpringGrassNumber(source, KURONG_ATTACK_ID, 1);
      for (let index = 0; index < limit; index++) {
        const spare = target.spareLives?.pop();
        if (!spare && !loseLastLife(target, source.id)) break;
        receiveAbsorbedLife(state, source, spare ?? { hp: target.hp, hpValue: getPlayerHpValue(target) });
        state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
          message: `${target.name} 因万物枯荣失去${spare ? "最新一条多余命" : "最后一条命"}` });
        if (!spare) {
          lostLastLife = true;
          break;
        }
      }
    }
  }
  return lostLastLife;
}
