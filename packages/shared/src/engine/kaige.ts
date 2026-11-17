import type { BigCardInstance } from "../bigCards/types";
import { ASURA_LIFE_ID } from "../bigCards/abilities";
import { changeBloodQi, hasBloodQi } from "./asura";
import { getActiveSkillCount } from "./gameFactory";
import { bigCardHasAbility, BIG_CARD_SKILLS, KAIGE_CARD_ID, KAIGE_KNOWLEDGE_ID, KAIGE_LIVES_ID, KAIGE_SHIELD_ID,
  KAIGE_STAGE_NAMES } from "../bigCards/abilities";
import { getFusionSkillId, reconcileSkillFusions } from "../skills/fusion";
import type { GameState, KaigeLifeStage, PlayerState, SpareLife } from "../types";
import { effectIsSuppressed, isTypedSkillSuppressed } from "./effectCategories";
import { hasTalisman } from "./talismanRules";
import { createBaseEvent, isPlayerSkillDisabled } from "./gameFactory";
import { isSkillIgnored } from "./skillIgnore";
import { removeSkillInstanceAt } from "./skillInventory";
import { grantInitializedSkill } from "./skillAcquisition";
import { greedChainRecipients } from "./siphon";
import { getLifeEffects, portableLife } from "./lifeEffects";

export const KAIGE_HP_LIMIT = 24;
export const KAIGE_ZERO_LIFE_BUFF_ID = "kaige_zero_life_this_turn";
const stageGrants: Readonly<Record<number, readonly string[]>> = {
  1: ["虚无", "空之轨迹"], 3: ["无尽战刃", "破军", "末世"], 4: ["灵魂修复"],
  5: ["1104"], 7: ["神域之种", "阳光之夜"]
};

export function kaigeGrantSource(cardId: string, abilityId: string): string {
  return `${cardId}:kaige:${abilityId}`;
}

export function kaigeGrantSources(cardId: string): string[] {
  return [2, 3, 4, 5, 6, 7, 8, 9].map((part) => kaigeGrantSource(cardId, `${KAIGE_CARD_ID}0${part}`));
}

export function hasKaigeAbility(player: PlayerState, abilityId: string): boolean {
  if (isPlayerSkillDisabled(player) || isTypedSkillSuppressed(player, BIG_CARD_SKILLS[abilityId]) ||
    effectIsSuppressed(player, abilityId) || isSkillIgnored(player, abilityId) ||
    player.buffs.some((buff) => buff.id === `sealed_skill:${abilityId}` || buff.id.startsWith("collapse_until_round:"))) return false;
  return Boolean(player.kaigeLife?.transferredAbilities?.includes(abilityId)) ||
    (player.bigCards ?? []).some((card) => bigCardHasAbility(card, abilityId) && !card.junengDisabled &&
    (card.onlyAbilityId === abilityId || abilityId === KAIGE_KNOWLEDGE_ID || abilityId === KAIGE_LIVES_ID ||
      (player.kaigeLife?.cardInstanceId === card.instanceId &&
        (abilityId === KAIGE_SHIELD_ID ||
          abilityId === `${KAIGE_CARD_ID}0${player.kaigeLife.stage + 1}`))));
}

export function hasKaigeHpLimit(player: PlayerState): boolean {
  return Boolean(player.kaigeLife && (player.kaigeLife.transferredAbilities || hasKaigeAbility(player, KAIGE_LIVES_ID)));
}

export function removeKaigeGrants(player: PlayerState, sources: readonly string[]): void {
  const fusionIds = new Set((player.skillFusions ?? []).filter((fusion) =>
    sources.includes(fusion.sourceBigCardInstanceId ?? "")).map((fusion) => fusion.id));
  player.buffs = player.buffs.filter((buff) => !buff.sourceFusionId || !fusionIds.has(buff.sourceFusionId));
  const inventory = player.skillInventory ?? [];
  for (let index = inventory.length - 1; index >= 0; index--) {
    if (sources.includes(inventory[index]!.sourceBigCardInstanceId ?? "")) removeSkillInstanceAt(player, index);
  }
  reconcileSkillFusions(player);
}

function grantStageAbilities(state: GameState, player: PlayerState, card: Pick<BigCardInstance, "instanceId" | "cardId">, stage: number,
  hasAbility = (abilityId: string) => bigCardHasAbility(card, abilityId)): void {
  const id = `${KAIGE_CARD_ID}0${stage + 1}`;
  const grant = (abilityId: string, skills: readonly string[]) => {
    if (!hasAbility(abilityId)) return;
    for (const skill of skills) grantInitializedSkill(state, player.id, /^\d/.test(skill) ? skill : getFusionSkillId(skill),
      `圣灵凯歌·${KAIGE_STAGE_NAMES[stage - 1]}`, false, undefined, kaigeGrantSource(card.instanceId, abilityId));
  };
  grant(id, stageGrants[stage] ?? []);
  grant(KAIGE_SHIELD_ID, stage === 2 ? ["1098"] : ["1098", "帝灵之境"]);
}

export function advanceKaigeStage(state: GameState, player: PlayerState, next?: KaigeLifeStage): void {
  const previous = player.kaigeLife;
  if (previous?.cardInstanceId === next?.cardInstanceId && previous?.stage === next?.stage) return;
  if (previous) removeKaigeGrants(player, kaigeGrantSources(previous.cardInstanceId));
  if (!next) { delete player.kaigeLife; return; }
  const card = player.bigCards?.find((entry) => entry.instanceId === next.cardInstanceId);
  if (!next.transferredAbilities && (!card || !bigCardHasAbility(card, KAIGE_LIVES_ID))) { delete player.kaigeLife; return; }
  player.kaigeLife = { ...next };
  if (next.transferredAbilities) grantStageAbilities(state, player, { instanceId: next.cardInstanceId, cardId: KAIGE_CARD_ID },
    next.stage, (id) => next.transferredAbilities!.includes(id));
  else grantStageAbilities(state, player, card!, next.stage);
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id,
    message: `圣灵凯歌进入「${KAIGE_STAGE_NAMES[next.stage - 1]}」` });
}

export function addSpareLife(player: PlayerState, life: SpareLife, state?: GameState, shared = false): boolean {
  if (hasTalisman(player, "wood", state?.roundNumber)) return false;
  const lives = player.spareLives ??= [];
  const limit = Math.min(...player.buffs.map((buff) => buff.lifeCountLimit ?? Infinity));
  if (lives.length + 1 >= limit || player.buffs.some((buff) => buff.cannotGainSpareLives)) return false;
  life = { ...life, acquiredOrder: lives.reduce((latest, entry, index) => Math.max(latest, entry.acquiredOrder ?? index + 1), 0) + 1 };
  const effects = getLifeEffects(life);
  if (player.kaigeLife && (!life.effects || effects.length > 0) &&
    effects.every((effect) => effect.kind === "starting_defense" || effect.kind === "red_lotus")) {
    const stage = player.kaigeLife;
    const nextStage = lives.findIndex((entry) => !getLifeEffects(entry).some((effect) =>
      effect.kind === "kaige" && effect.cardInstanceId === stage.cardInstanceId && effect.stage === stage.stage));
    life = { ...life, effects: [...effects, { ...stage, kind: "kaige" }] };
    lives.splice(nextStage === -1 ? lives.length : nextStage, 0, life);
  } else lives.push(life);
  if (state) for (const observer of state.players) {
    if (observer.status !== "alive" || observer.kind === "spectator" || observer.spaceId !== player.spaceId || !hasBloodQi(observer, 20)) continue;
    const count = getActiveSkillCount(observer, ASURA_LIFE_ID);
    if (count) changeBloodQi(observer, count);
  }
  if (state && !shared) for (const owner of greedChainRecipients(state, player))
    addSpareLife(owner, portableLife(player, life), state, true);
  return true;
}

export function takeNewestSpareLife(player: PlayerState): SpareLife | undefined {
  const lives = player.spareLives;
  if (!lives?.length) return undefined;
  const latest = lives.reduce((best, life, index) =>
    (life.acquiredOrder ?? index + 1) > (lives[best]!.acquiredOrder ?? best + 1) ? index : best, 0);
  return lives.splice(latest, 1)[0];
}

export function grantKaigeLives(state: GameState, player: PlayerState, card: BigCardInstance, opening: boolean): void {
  if (!bigCardHasAbility(card, KAIGE_LIVES_ID)) {
    if (card.onlyAbilityId === KAIGE_SHIELD_ID) grantStageAbilities(state, player, card, 1);
    else if (card.onlyAbilityId?.startsWith(KAIGE_CARD_ID)) {
      const stage = Number(card.onlyAbilityId.slice(-2)) - 1;
      if (stage >= 1 && stage <= 7) grantStageAbilities(state, player, card, stage);
    }
    return;
  }
  const first = opening && !player.kaigeLife;
  if (first) advanceKaigeStage(state, player, { cardInstanceId: card.instanceId, stage: 1 });
  for (let stage = first ? 2 : 1; stage <= 7; stage++) {
    addSpareLife(player, { hp: 0, sourceBigCardInstanceId: card.instanceId, effects: [{ kind: "kaige", cardInstanceId: card.instanceId, stage }] }, state);
  }
}
