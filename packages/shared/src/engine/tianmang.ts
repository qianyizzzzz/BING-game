import { TIANMANG_ABSORB_INFINITE_ID } from "../bigCards/abilities";
import { getEnhancedChildFusionIds } from "../skills/fusion";
import type { BuffState, GameState, PlayerId, PlayerState } from "../types";
import { addCombatValues, compareCombatValues, INFINITY_VALUE, type CombatValue } from "./combatValues";
import { isSkillIgnored } from "./skillIgnore";
import { canAffectAcrossSpace } from "./spaces";
import { sharePositiveState } from "./siphon";
import { canGainStatus } from "./karmaSong";

export const TIANMANG_CAKE_STATE = "tianmang_cake_growth";
export const TIANMANG_FUSION_STATE = "tianmang_free_fusion";
export const TIANMANG_ODDS_STATE = "tianmang_array_odds";
export const TIANMANG_LIMITED_DISABLED = "tianmang_limited_disabled";
export const TIANMANG_LOCKED_DISABLED = "tianmang_locked_disabled";
export const TIANMANG_ABSORB_STATE = "tianmang_absorb";
export const SIX_STAR_ARRAY_ID = "fusion_9ef124aee213";

export function replaceTianmangBuff(state: Pick<GameState, "players" | "roundNumber">, player: PlayerState, buff: BuffState): void {
  if (!canGainStatus(player)) return;
  player.buffs = player.buffs.filter((entry) => entry.id !== buff.id);
  player.buffs.push(buff);
  sharePositiveState(state, player, buff);
}

export function getSixStarArrayChances(player: Pick<PlayerState, "buffs" | "skills" | "skillFusions">, tianmangActive: boolean): readonly [number, number, number] {
  const bonus = player.buffs.filter((buff) => buff.stateType === TIANMANG_ODDS_STATE).reduce((sum, buff) => sum + buff.stacks, 0);
  const enhanced = getEnhancedChildFusionIds(player, "六转生死阵", SIX_STAR_ARRAY_ID).size > 0;
  const unit = (tianmangActive ? 2 : 1) * (enhanced ? 2 : 1);
  return [Math.min(12, 2 * unit + bonus) / 12, Math.min(12, unit + bonus) / 12, Math.min(12, unit + bonus) / 12];
}

export function rollSixStarArray(chances: readonly [number, number, number]): readonly [boolean, boolean, boolean] {
  return [Math.random() < chances[0], Math.random() < chances[1], Math.random() < chances[2]];
}

export function tianmangAbsorption(player: Pick<PlayerState, "buffs"> | undefined, turnNumber: number): BuffState | undefined {
  return player?.buffs.find((buff) => buff.stateType === TIANMANG_ABSORB_STATE && buff.expiresAtTurn === turnNumber + 1 &&
    (!buff.sourceAbilityId || !isSkillIgnored(player, buff.sourceAbilityId)));
}

export function tianmangSkillImmunity(player: PlayerState | undefined, sourceId: PlayerId | undefined, turnNumber: number): boolean {
  return Boolean(player && player.id !== sourceId && tianmangAbsorption(player, turnNumber));
}

export function absorbTianmangDamage(state: GameState, targetId: PlayerId, damage: CombatValue,
  allowsGuard?: (owner: PlayerState, guard: BuffState) => boolean): "absorbed" | "canceled" | undefined {
  if (compareCombatValues(damage, []) <= 0) return;
  const vsInfinity = compareCombatValues(damage, INFINITY_VALUE);
  if (vsInfinity > 0) return;
  const absorbers = state.players.flatMap((player) => {
    if (player.status !== "alive" || !canAffectAcrossSpace(state, player.id, targetId)) return [];
    const buff = tianmangAbsorption(player, state.turnNumber);
    return buff && (!allowsGuard || allowsGuard(player, buff)) &&
      (vsInfinity < 0 || buff.sourceAbilityId === TIANMANG_ABSORB_INFINITE_ID) ? [buff] : [];
  });
  if (absorbers.length > 1) return "canceled";
  const absorber = absorbers[0];
  if (!absorber) return;
  absorber.tianmangAbsorbed = addCombatValues(absorber.tianmangAbsorbed ?? [], damage);
  return "absorbed";
}
