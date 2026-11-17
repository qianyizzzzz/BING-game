import { getBigCard, getRandomBigCardIds } from "../bigCards/catalog";
import type { GameState, KarmaCardChoice, PlayerId, PlayerState, SkillAction } from "../types";
import { detachRedrawnBigCard, initializeBigCardRules, pruneLostSkillKnowledge } from "./bigCards";
import { createBaseEvent, createId } from "./gameFactory";

const KARMA_EXCLUDED_BACKLASH_IDS = new Set(["1080202", "1060705"]);

export function isKarmaExcludedBacklash(state: GameState, player: PlayerState): boolean {
  if (player.status !== "dead") return player.buffs.some(({ id, sourcePlayerId, sourceAbilityId, name }) =>
    id === "direct_non_damage_death" && sourcePlayerId === player.id &&
    (KARMA_EXCLUDED_BACKLASH_IDS.has(sourceAbilityId ?? "") || /忘川极地|红莲天火/.test(name)));
  for (let index = state.eventLog.length - 1; index >= 0; index--) {
    const event = state.eventLog[index];
    if (event?.type !== "player_died" || event.playerId !== player.id) continue;
    return (event.defeatLevel ?? 1) === (player.defeatLevel ?? 1) && event.sourceId === player.id && (
      KARMA_EXCLUDED_BACKLASH_IDS.has(event.sourceAbilityId ?? "") || /忘川极地|红莲天火/.test(event.reason ?? "")
    );
  }
  return false;
}

export function getKarmaReplacementIds(state: Pick<GameState, "openingBigCardDeal" | "config">): string[] {
  return state.openingBigCardDeal?.pool ?? getRandomBigCardIds(state.config.bigCardPackIds);
}

export function getKarmaCardChoices(state: GameState, source: PlayerState): KarmaCardChoice[] {
  return state.players.flatMap((target) => target.id === source.id || target.kind === "spectator" || target.emptyCityOwnerId ? [] :
    (target.bigCards ?? []).flatMap((card, index) => card.onlyAbilityId ? [] : [{
      playerId: target.id, instanceId: card.instanceId, number: index + 1,
      ...(card.publiclyRevealed || state.peekBigCardsByViewer?.[source.id]?.includes(card.instanceId) ?
        { visibleCardId: card.cardId } : {})
    }]));
}

export function validKarmaCardChanges(state: GameState, source: PlayerState, changes: SkillAction["karmaCardChanges"]): boolean {
  if (changes === undefined) return true;
  if (!Array.isArray(changes) || changes.length > state.players.length - 1) return false;
  if (!changes.length) return true;
  if (!source.karmaReincarnation) return false;
  const cardOwners = new Map(getKarmaCardChoices(state, source).map(({ instanceId, playerId }) => [instanceId, playerId]));
  const pool = new Set(getKarmaReplacementIds(state));
  const selected = new Set<PlayerId>();
  for (const change of changes) {
    if (!change || typeof change !== "object") return false;
    const owner = cardOwners.get(change.cardInstanceId);
    if (!owner || selected.has(owner) || !pool.has(change.replacementCardId)) return false;
    selected.add(owner);
  }
  return true;
}

export function applyKarmaCardChanges(state: GameState, source: PlayerState, changes: SkillAction["karmaCardChanges"]): void {
  if (!source.karmaReincarnation || !changes?.length) return;
  const pool = new Set(getKarmaReplacementIds(state));
  const selected = new Set<PlayerId>();
  for (const { cardInstanceId, replacementCardId } of changes) {
    if (!pool.has(replacementCardId)) continue;
    const target = state.players.find((player) => player.id !== source.id && player.kind !== "spectator" && !player.emptyCityOwnerId &&
      player.bigCards?.some((card) => card.instanceId === cardInstanceId && !card.onlyAbilityId));
    if (!target || selected.has(target.id)) continue;
    const slot = target.bigCards!.findIndex(({ instanceId }) => instanceId === cardInstanceId);
    const original = target.bigCards![slot]!;
    detachRedrawnBigCard(target, cardInstanceId);
    pruneLostSkillKnowledge(state, target);
    const card = {
      cardId: replacementCardId, instanceId: createId("big_card"),
      ...(original.acquisitionOrder === undefined ? {} : { acquisitionOrder: original.acquisitionOrder })
    };
    target.bigCards!.splice(slot, 0, card);
    selected.add(target.id);
    ((state.peekBigCardsByViewer ??= {})[source.id] ??= []).push(card.instanceId);
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${source.name} 以命宇轮回改变了 ${target.name} 的一张大卡` });
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: target.id,
      message: `命宇轮回将你的第 ${slot + 1} 张大卡改为${getBigCard(replacementCardId)?.name ?? replacementCardId}` });
  }
  if (selected.size) initializeBigCardRules(state);
}
