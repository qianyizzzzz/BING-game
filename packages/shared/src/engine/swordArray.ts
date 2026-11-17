import type { BuffState, GameState, PlayerState } from "../types";
import { clearDragonLongTermStatuses, reconcileTemporaryBigAbilities } from "./bigCards";
import { createId, getActiveSkillCount } from "./gameFactory";
import { INVENTORY_ITEM_STATE_TYPE, isCountedCombatStatus, isRemovableLongTermStatus, stateHasCategory } from "./effectCategories";
import { closeSacredBeasts } from "./honghuang";
import { TIGER_CARD, TIGER_MIE_COUNT, TIGER_TEMP_SKILL, tigerForms } from "./netherTigerIds";
import { clearFiveElementsForms } from "./fiveElementsIds";
import { clearHexagramForms } from "./hexagramIds";
import { clearSevenStarForms } from "./sevenStarIds";
import { SWORD_ARRAY_ITEM, SWORD_ARRAY_LIMIT_ID } from "./swordArrayIds";
import { migrateStoredDamages } from "./storedDamage";

export function swordArrays(target: PlayerState | undefined): BuffState[] {
  return target?.buffs.filter((buff) => buff.itemKind === SWORD_ARRAY_ITEM && buff.stacks > 0) ?? [];
}

export function canPlaceSwordArray(state: Pick<GameState, "players">): boolean {
  return !state.players.some((owner) => owner.status === "alive" && getActiveSkillCount(owner, SWORD_ARRAY_LIMIT_ID) > 0) ||
    !state.players.some((target) => target.status === "alive" && swordArrays(target).length > 0);
}

export function placeSwordArray(state: GameState, target: PlayerState): boolean {
  if (target.status !== "alive" || !canPlaceSwordArray(state)) return false;
  target.buffs.push({ id: createId(SWORD_ARRAY_ITEM), stateType: INVENTORY_ITEM_STATE_TYPE, itemKind: SWORD_ARRAY_ITEM,
    name: "诛仙剑阵", stacks: 1 });
  return true;
}

export function clearSwordArrayExtraStatuses(state: GameState, target: PlayerState): void {
  clearDragonLongTermStatuses(state, target.id);
  clearFiveElementsForms(target.bigCards);
  clearHexagramForms(target.bigCards);
  clearSevenStarForms(target.bigCards);
  for (const card of target.bigCards ?? []) {
    if (card.cardId !== TIGER_CARD || card.onlyAbilityId) continue;
    const forms = tigerForms(card);
    forms.available = [];
    forms.cleared = true;
  }
  if (target.summon?.kind === "tyrant") delete target.summon.tyrantDrain;
  migrateStoredDamages(target);
  target.buffs = target.buffs.filter((buff) => buff.uncleansable || !(
    isRemovableLongTermStatus(buff) || isCountedCombatStatus(buff) || stateHasCategory(buff, "special") ||
    buff.id === TIGER_MIE_COUNT || buff.id.startsWith(TIGER_TEMP_SKILL)));
  closeSacredBeasts(state, [target], state.roundNumber);
  reconcileTemporaryBigAbilities(target, state);
}
