import { SAND_ARROWS_ID, SAND_ELEMENT, SAND_INCOME_ID } from "../bigCards/abilities";
import type { GameState, PlayerId, PlayerState, SkillId } from "../types";
import { addCombatValues, combatValue, compareCombatValues, scaleCombatValue, type CombatValue } from "./combatValues";
import { getElementValue, setElementValue } from "./elementResources";
import { getDefenseTotal } from "./starDragon";
import { BLOOD_QI, getBloodQi, spendBloodQi } from "./asura";

export const SAND_VORTEX = "sand_vortex";
export const SAND_TOWER = "sand_tower";
export const SAND_GRANTED_USE_PREFIX = "sand_use:";
export const SAND_DAMAGE_PROGRESS_PREFIX = "sand_damage_progress:";

export function sandGrantUses(player: { buffs?: readonly { id: string; stacks?: number }[] }, id: SkillId): number {
  return player.buffs?.find((buff) => buff.id === SAND_GRANTED_USE_PREFIX + id)?.stacks ?? 0;
}

export function sandGrantSkillIds(player: { buffs?: readonly { id: string; stacks?: number }[] }): SkillId[] {
  return player.buffs?.flatMap((buff) => buff.id.startsWith(SAND_GRANTED_USE_PREFIX) && (buff.stacks ?? 0) > 0 ?
    [buff.id.slice(SAND_GRANTED_USE_PREFIX.length)] : []) ?? [];
}

export function addSandGrantUses(player: PlayerState, id: SkillId, uses: number, name: string): void {
  const key = SAND_GRANTED_USE_PREFIX + id;
  const entry = player.buffs.find((buff) => buff.id === key);
  if (entry) entry.stacks += uses;
  else player.buffs.push({ id: key, name: `沙化·${name}额外次数`, stacks: uses });
}

export function spendSandGrantUse(player: PlayerState, id: SkillId): boolean {
  const entry = player.buffs.find((buff) => buff.id === SAND_GRANTED_USE_PREFIX + id);
  if (!entry || entry.stacks <= 0) return false;
  if (--entry.stacks === 0) player.buffs = player.buffs.filter((buff) => buff !== entry);
  return true;
}

export function recordSandDamage(source: PlayerState, damage: CombatValue, arrowCopies: number, genericCopies: number): void {
  for (const [id, copies] of [[SAND_ARROWS_ID, arrowCopies], [SAND_INCOME_ID, genericCopies]] as const) {
    if (!copies) continue;
    const key = SAND_DAMAGE_PROGRESS_PREFIX + id;
    const progress = source.buffs.find((buff) => buff.id === key);
    const finite = (damage.find((term) => term.exponent === 0)?.coefficient ?? 0) + (progress?.stacks ?? 0);
    const remainder = ((finite % 3) + 3) % 3;
    const gained = addCombatValues(scaleCombatValue(damage.filter((term) => term.exponent > 0), copies / 3),
      combatValue(Math.floor(finite / 3) * copies));
    source.buffs = source.buffs.filter((buff) => buff !== progress);
    if (remainder) source.buffs.push({ id: key, name: "积沙·伤害进度", stacks: remainder });
    if (compareCombatValues(gained, []) > 0)
      setElementValue(source, SAND_ELEMENT, addCombatValues(getElementValue(source, SAND_ELEMENT), gained));
  }
}

export function sandVortexActive(player: PlayerState, round: number): boolean {
  return player.buffs.some((buff) => buff.stateType === SAND_VORTEX && (buff.expiresAtRound ?? 0) > round);
}

export function recordSandTowerBreak(state: GameState, player: PlayerState, removed: CombatValue, causeId?: PlayerId): void {
  const tower = player.buffs.find((buff) => buff.stateType === SAND_TOWER);
  if (!tower || compareCombatValues(removed, []) <= 0) return;
  player.buffs = player.buffs.filter((buff) => buff !== tower);
  if (causeId) (state.pendingSandTowerDamage ??= []).push({ sourceId: player.id, targetId: causeId,
    value: scaleCombatValue(removed, 5) });
}

export function clearDefenseValue(state: GameState, player: PlayerState, causeId?: PlayerId, spent = false): void {
  const removed = getDefenseTotal(player);
  if (spent) spendBloodQi(player, getBloodQi(player));
  player.buffs = player.buffs.filter((buff) => buff.id !== "defense_value" && buff.id !== BLOOD_QI);
  recordSandTowerBreak(state, player, removed, causeId);
}
