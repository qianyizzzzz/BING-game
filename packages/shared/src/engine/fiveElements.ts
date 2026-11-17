import { RAW_BIG_CARD_CATALOG } from "../bigCards/generatedCatalog";
import { bigCardHasAbility } from "../bigCards/abilities";
import { getAttackElements } from "./attacks";
import { getActiveSkillCount } from "./gameFactory";
import { getCombatSeats } from "./seating";
import type { AttackStats, GameState, PlayerId, PlayerState } from "../types";
import {
  FIVE_ELEMENTS_CARD, FIVE_ELEMENTS_CHOOSE, FIVE_ELEMENTS_FORMS, FIVE_ELEMENTS_ICE, FIVE_ELEMENTS_KEYS,
  FIVE_ELEMENTS_RESTORE, FIVE_ELEMENTS_WIND, nextFiveElementsForm, type FiveElement
} from "./fiveElementsIds";

const attributes = new Map(RAW_BIG_CARD_CATALOG.map((card) => [card.id, card.attribute]));
const attributeNames: Record<FiveElement, string> = { fire: "火", ice: "冰", electric: "电", earth: "土", wind: "风" };

export type FiveElementsMove = Pick<AttackStats, "id" | "name" | "isSkill" | "element" | "elements" | "traits">;

export function fiveElementsMoveAttributes(move: FiveElementsMove): FiveElement[] {
  const cardAttribute = move.isSkill ? attributes.get(move.id.slice(0, 5)) : undefined;
  if (cardAttribute) return FIVE_ELEMENTS_KEYS.filter((key) =>
    cardAttribute.includes(attributeNames[key]) || key === "electric" && cardAttribute.includes("雷"));
  const elements = getAttackElements(move);
  return FIVE_ELEMENTS_KEYS.filter((key) => key === "wind" ? ["1095", "1096"].includes(String(move.id)) :
    key !== "earth" && elements.includes(key));
}

export function restoreFiveElementsFromMove(target: PlayerState, move: FiveElementsMove): FiveElement[] {
  if (!getActiveSkillCount(target, FIVE_ELEMENTS_RESTORE)) return [];
  const restored = new Set<FiveElement>();
  const elements = fiveElementsMoveAttributes(move);
  for (const card of target.bigCards ?? []) {
    const forms = card.fiveElementsForms;
    if (!forms || forms.cleared || !bigCardHasAbility(card, FIVE_ELEMENTS_RESTORE)) continue;
    for (const element of elements) if (!forms.available.includes(element)) {
      forms.available.push(element);
      restored.add(element);
    }
  }
  return [...restored];
}

export function advanceFiveElementsForms(state: GameState): void {
  if (state.roundNumber === 1) return;
  for (const player of state.players) {
    if (player.status !== "alive" || !getActiveSkillCount(player, FIVE_ELEMENTS_CHOOSE)) continue;
    for (const card of player.bigCards ?? []) {
      const forms = card.fiveElementsForms;
      if (!forms || forms.cleared || forms.chosenRound === state.roundNumber || !bigCardHasAbility(card, FIVE_ELEMENTS_CHOOSE)) continue;
      forms.active = nextFiveElementsForm(forms);
      forms.chosenRound = state.roundNumber;
    }
  }
}

export function fiveElementsStatusLabel(player: PlayerState): string[] {
  return (player.bigCards ?? []).flatMap((card) => {
    if (card.cardId !== FIVE_ELEMENTS_CARD || !card.fiveElementsForms) return [];
    const forms = card.fiveElementsForms;
    if (forms.cleared) return ["已清除"];
    return [FIVE_ELEMENTS_KEYS.map((key) => `${FIVE_ELEMENTS_FORMS[key].name} · ${key === forms.active ? "当前" :
      forms.available.includes(key) ? "可切换" : "已失去"}`).join(" / ")];
  });
}

export function compareFiveElementsSeats(state: GameState, spaceId: string | undefined): (a: PlayerId, b: PlayerId) => number {
  const seats = new Map(getCombatSeats(state, spaceId).map(({ id }, index) => [id, index]));
  const rank = (id: PlayerId) => seats.get(id) ?? seats.size + Math.max(0, state.players.findIndex((player) => player.id === id));
  return (a, b) => rank(a) - rank(b);
}

export function fiveElementsWindFirst<T>(state: GameState, entries: readonly T[], source: (entry: T) => PlayerId | undefined): T[] {
  const wind = new Set(state.players.filter((player) => getActiveSkillCount(player, FIVE_ELEMENTS_WIND) > 0).map(({ id }) => id));
  if (!wind.size) return [...entries];
  return [...entries].sort((a, b) => Number(wind.has(source(b) ?? "")) - Number(wind.has(source(a) ?? "")));
}

interface MoveAttempt {
  sourceId: PlayerId;
  key: string;
}

const eagerAttempts = new WeakMap<GameState, MoveAttempt>();

export function fiveElementsMoveAttempt(sourceId: PlayerId, index: number): MoveAttempt {
  return { sourceId, key: `${sourceId}:move:${index}` };
}

/** A move and all of its payload share the same attempt. The chosen attempt survives a change of phase. */
export function withFiveElementsAttempt<T>(state: GameState, attempt: MoveAttempt | undefined, effect: () => T): T {
  const previous = eagerAttempts.get(state);
  if (attempt) eagerAttempts.set(state, attempt);
  try {
    return effect();
  } finally {
    if (previous) eagerAttempts.set(state, previous);
    else eagerAttempts.delete(state);
  }
}

export function setFiveElementsAttempt(state: GameState, sourceId: PlayerId, key: string): void {
  eagerAttempts.set(state, { sourceId, key });
}

export function fiveElementsIceBlocks(state: GameState, target: PlayerState | undefined, sourceId: PlayerId | undefined,
  effectId: string, moveSlot?: number): boolean {
  if (!target || !sourceId || target.id === sourceId || !getActiveSkillCount(target, FIVE_ELEMENTS_ICE)) return false;
  const attempt = eagerAttempts.get(state);
  const key = attempt?.sourceId === sourceId ? attempt.key : moveSlot !== undefined ? fiveElementsMoveAttempt(sourceId, moveSlot).key :
    `${sourceId}:${state.activeTimingPhase}:${effectId}`;
  const ledger = state.fiveElementsIceAttempts ??= {};
  const chosen = ledger[target.id];
  if (chosen?.turn === state.turnNumber) return chosen.key !== key;
  ledger[target.id] = { turn: state.turnNumber, key };
  return false;
}
