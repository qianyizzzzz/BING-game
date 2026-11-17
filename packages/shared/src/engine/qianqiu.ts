import { HONGHUANG_ATTACK_ID, QIANQIU_RESPONSE_ID, RAGING_WAVES_ID, SKY_STRIKE_ID, THOUSAND_WAVES_ID } from "../bigCards/abilities";
import type { AttackStats, GameState, PlayerAction, PlayerState } from "../types";
import { attackPowerValue, projectCombatValue, withAttackLevel, withAttackPower } from "./combatValues";
import { getActiveSkillCount } from "./gameFactory";
import { honghuangParts, roarMultiplier } from "./honghuang";

export function isWaveSkill(id: string): boolean {
  return id === RAGING_WAVES_ID || id === THOUSAND_WAVES_ID || id === HONGHUANG_ATTACK_ID || id === SKY_STRIKE_ID;
}

export function shapeWaveAttack(state: Pick<GameState, "turnNumber" | "roundNumber">, player: PlayerState | undefined, action: PlayerAction,
  stats: AttackStats): AttackStats {
  if (action.type !== "skill" || !isWaveSkill(action.skillId)) return stats;
  const wave = action.spaceTimeReplay?.wave ??
    (action.waveContinuationId ? player?.buffs.find((buff) => buff.id === action.waveContinuationId)?.waveAttack : undefined);
  const step = wave ? (action.spaceTimeReplay?.turn ?? state.turnNumber) - wave.firstTurn : 0;
  const defense = (["small", "youtiao", "stone"] as const)[step] ?? "stone";
  const base = wave ? withAttackLevel(withAttackPower(stats, wave.power), wave.level) : stats;
  if (action.skillId === SKY_STRIKE_ID) return { ...base, defenseTag: defense };
  if (action.skillId === HONGHUANG_ATTACK_ID)
    return honghuangParts(base, wave?.honghuangEnhanced ?? roarMultiplier(player, state.roundNumber) > 0);
  const parts = Array.from({ length: action.skillId === RAGING_WAVES_ID ? 3 : 4 }, () => attackPowerValue(base));
  return { ...base, repeatedDamageParts: true, damagePartValues: parts, damageParts: parts.map(projectCombatValue),
    defenseTag: action.skillId === RAGING_WAVES_ID ? defense : "cake",
    ...(wave?.defeatTrait ? { traits: [...base.traits, wave.defeatTrait] } : {}) };
}

export function getQianqiuDefenseGains(state: Pick<GameState, "turnNumber" | "activeTimingPhase">, player: PlayerState | undefined) {
  if (!player || !getActiveSkillCount(player, QIANQIU_RESPONSE_ID) ||
    player.buffs.some((buff) => buff.id === `qianqiu_used:${state.turnNumber}`)) return [];
  return player.buffs.filter((buff) => buff.stateType === "qianqiu_gain" && buff.defenseResponse?.turnNumber === state.turnNumber &&
    buff.defenseResponse.phase === state.activeTimingPhase);
}
