import type { PlayerState } from "../types";
import { bigCardHasAbility, SAKURA_ELEMENT, SAKURA_FALL_ID } from "../bigCards/abilities";
import { addCombatValues, combatValue, compareCombatValues, isUnboundedCombatValue, projectCombatValue, type CombatValue } from "./combatValues";
import { YOUKAI_ELEMENT } from "./youkaiIds";
import { refreshYoukaiHalf } from "./youkai";

export function getElementAmount(player: Pick<PlayerState, "buffs"> | undefined, element: string): number {
  return player?.buffs.find((buff) => buff.id === `element:${element}`)?.stacks ?? 0;
}

type ElementHolder = Pick<PlayerState, "buffs" | "bigCards">;

export function getSakuraCapacity(player: ElementHolder): number {
  const capacityAbilities = [SAKURA_FALL_ID, "1062601", "1074101"];
  return 20 * (player.bigCards ?? []).reduce((total, card) =>
    total + Number(capacityAbilities.some((id) => bigCardHasAbility(card, id))), 0);
}

export function clampSakuraCapacity(player: PlayerState): void {
  const current = getElementAmount(player, SAKURA_ELEMENT);
  if (current <= 0) return;
  const capacity = getSakuraCapacity(player);
  if (current > capacity) setElementValue(player, SAKURA_ELEMENT, combatValue(capacity));
}

export function changeElementAmount(player: PlayerState, element: string, delta: number): void {
  const existing = player.buffs.find((buff) => buff.id === `element:${element}`)?.resourceValue;
  if (existing) {
    setElementValue(player, element, addCombatValues(existing, combatValue(delta)));
    return;
  }
  const id = `element:${element}`;
  const requested = getElementAmount(player, element) + delta;
  const amount = element === SAKURA_ELEMENT ? Math.min(getSakuraCapacity(player), requested) : requested;
  const validAmount = element === YOUKAI_ELEMENT ? Number.isFinite(amount) && amount <= Number.MAX_SAFE_INTEGER : Number.isSafeInteger(amount);
  if (!validAmount || amount < 0) throw new Error(`${element}元素数量无效`);
  player.buffs = player.buffs.filter((buff) => buff.id !== id);
  if (amount > 0) player.buffs.push({ id, name: element, stateType: "element_resource", stacks: amount,
    ...(element === YOUKAI_ELEMENT ? { uncleansable: true } : {}) });
  if (element === YOUKAI_ELEMENT) refreshYoukaiHalf(player);
}

export function getElementValue(player: Pick<PlayerState, "buffs">, element: string): CombatValue {
  return player.buffs.find((buff) => buff.id === `element:${element}`)?.resourceValue ?? combatValue(getElementAmount(player, element));
}

export function setElementValue(player: PlayerState, element: string, value: CombatValue): void {
  if (compareCombatValues(value, []) < 0) throw new Error(`${element}元素数量无效`);
  if (element === SAKURA_ELEMENT) {
    const cap = combatValue(getSakuraCapacity(player));
    if (compareCombatValues(value, cap) > 0) value = cap;
  }
  const id = `element:${element}`;
  player.buffs = player.buffs.filter((buff) => buff.id !== id);
  if (value.length) player.buffs.push({ id, name: element, stateType: "element_resource",
    ...(element === YOUKAI_ELEMENT ? { uncleansable: true } : {}),
    stacks: isUnboundedCombatValue(value) ? Number.MAX_SAFE_INTEGER : Math.min(Number.MAX_SAFE_INTEGER, projectCombatValue(value)),
    resourceValue: value });
  if (element === YOUKAI_ELEMENT) refreshYoukaiHalf(player);
}
