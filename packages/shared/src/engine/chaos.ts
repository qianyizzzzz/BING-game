import { CHAOS_ATTACK_ID, CHAOS_EXILE_ID, CHAOS_WAVE_ID } from "../bigCards/abilities";
import type { AttackStats, BuffState, GameState, PlayerId, PlayerState, SkillAction } from "../types";
import { INFINITY_VALUE, projectCombatValue } from "./combatValues";
import { isSkillIgnored } from "./skillIgnore";
import { getBloodQi } from "./asura";
import { canGainStatus } from "./karmaSong";

export const CHAOS_DEFENSE_LOCK = "chaos_defense_lock";
export const CHAOS_UNTARGETABLE = "chaos_untargetable";
export const CHAOS_GUARD = "chaos_guard";
export const CHAOS_EXILED = "chaos_exile";
export const CHAOS_SKILL_DISABLE = "skill_disabled";

export function hasChaosDefenseLock(source: PlayerState | undefined, targetId: PlayerId): boolean {
  return Boolean(source?.buffs.some((buff) => buff.stateType === CHAOS_DEFENSE_LOCK && buff.sourcePlayerId === targetId) &&
    (source.buffs.some((buff) => buff.id === "defense_value" && buff.stacks > 0) || getBloodQi(source).length));
}

export function getChaosWave(player: PlayerState | undefined, index: number, turn: number) {
  return player?.buffs.find((buff) => buff.sourceAbilityId === CHAOS_WAVE_ID &&
    buff.attackActionIndex === index && buff.expiresAtTurn === turn + 1)?.chaosWave;
}

export function chaosWindowMoveKey(state: GameState, sourceId: PlayerId, skillId: string): string | undefined {
  for (let index = state.eventLog.length - 1; index >= 0; index--) {
    const event = state.eventLog[index];
    if (event?.type === "skill_used" && event.playerId === sourceId && event.skillId === skillId &&
      event.roundNumber === state.roundNumber && event.turnNumber === state.roundTurnNumber &&
      event.timingPhase === state.activeTimingPhase) return `window:${event.id}`;
  }
}

export function replaceChaosBuff(player: PlayerState, buff: BuffState): void {
  if (!canGainStatus(player)) return;
  player.buffs = player.buffs.filter((entry) => entry.id !== buff.id);
  player.buffs.push(buff);
}

export function chaosReleaseCake(roll: number): number {
  return [12, 18, 24, 28, 32, 34, 36, 37, 38, 39, 40].findIndex((limit) => roll <= limit);
}

export function getChaosExileStats(action: SkillAction): AttackStats | undefined {
  if (action.skillId !== CHAOS_EXILE_ID) return undefined;
  return { id: CHAOS_EXILE_ID, name: "流放", cost: 0, power: 0, powerValue: [],
    level: projectCombatValue(INFINITY_VALUE), levelValue: INFINITY_VALUE,
    defenseTag: "cake", traits: ["skill"], element: "physical", elements: ["physical"],
    isArea: false, isSkill: true, nonAttackMove: true, stacks: action.stacks };
}

export function consumeChaosGuard(state: Pick<GameState, "turnNumber" | "roundNumber">, target: PlayerState | undefined,
  sourceId: PlayerId | undefined, moveKey: string): false | "cached" | "blocked" {
  if (!target || !sourceId || target.id === sourceId || isSkillIgnored(target, CHAOS_ATTACK_ID)) return false;
  const guard = target.buffs.find((buff) => buff.stateType === CHAOS_GUARD && buff.sourcePlayerId === sourceId &&
    buff.chaosStartRound === state.roundNumber);
  if (!guard) return false;
  const key = `${state.turnNumber}:${moveKey}`;
  if (guard.chaosBlockedKeys?.includes(key)) return "cached";
  if (guard.stacks <= 0) return false;
  guard.stacks--;
  (guard.chaosBlockedKeys ??= []).push(key);
  return "blocked";
}
