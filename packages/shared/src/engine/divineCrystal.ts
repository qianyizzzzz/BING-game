import type { AttackStats, GameState, PlayerState } from "../types";
import { EXECUTE_EFFECT_POWER, EXPLODE_EFFECT_POWER } from "../types";
import { attackPowerValue, combatValue, fromLegacyCombatStat, getPointDamageDefeatLevel, getPointDamageTrait,
  INFINITY_VALUE, multiplyCombatValues, projectCombatValue, RETIRE_VALUE, VANISH_VALUE, type CombatValue } from "./combatValues";
import { getActiveSkillCount } from "./gameFactory";

import { CRYSTAL_GUARD_ID, CRYSTAL_MARK_ID, CRYSTAL_SHIELD_BUFF, CRYSTAL_SHIELD_LOCK } from "./divineCrystalIds";
export * from "./divineCrystalIds";

const pointValues = [INFINITY_VALUE, RETIRE_VALUE, VANISH_VALUE, fromLegacyCombatStat(EXECUTE_EFFECT_POWER),
  fromLegacyCombatStat(EXPLODE_EFFECT_POWER)];

function lowerPower(value: CombatValue, pointLevel?: number): CombatValue {
  const exponent = value[0]?.exponent;
  const index = pointValues.findIndex((point) => exponent !== undefined && exponent > 1 &&
    point[0]!.exponent === exponent && value[0]!.coefficient > 0);
  const lowerTier = pointLevel && pointLevel >= 2 ? pointLevel - 2 : index - 1;
  return lowerTier >= 0 && pointValues[lowerTier] ? pointValues[lowerTier]! :
    multiplyCombatValues(value, combatValue(1, -1)).filter((term) => term.exponent >= 0);
}

export function lowerCrystalAttack(stats: AttackStats): AttackStats {
  const { divineRiftRank: _rank, fixedPointPower, honghuangLastRetires: _honghuang, ...base } = stats;
  const pointLevel = getPointDamageDefeatLevel(stats);
  const power = lowerPower(attackPowerValue(stats), pointLevel);
  const point = getPointDamageTrait(power);
  const traits = base.traits.filter((trait) => !trait.startsWith("defeat_"));
  if (point) traits.push(point);
  const parts = (stats.damagePartValues ?? stats.damageParts?.map((part) => fromLegacyCombatStat(part)))?.map((part, index, all) =>
    lowerPower(part, stats.honghuangLastRetires && index === all.length - 1 ? 2 : pointLevel));
  return { ...base, traits, power: projectCombatValue(power), powerValue: power,
    ...(point && fixedPointPower ? { fixedPointPower: true } : {}),
    ...(parts ? { damagePartValues: parts, damageParts: parts.map(projectCombatValue) } : {}) };
}

export function crystalGuardHolders(state: Pick<GameState, "players">, player: PlayerState): PlayerState[] {
  return state.players.filter((owner) => owner.status === "alive" && owner.defeatLevel === undefined &&
    !owner.buffs.some(({ id }) => id === "pending_death") && owner.spaceId === player.spaceId &&
    getActiveSkillCount(owner, CRYSTAL_GUARD_ID) > 0);
}

export function crystalGuardMarkCount(player: PlayerState | undefined): number {
  return player?.buffs.find(({ id }) => id === CRYSTAL_MARK_ID)?.stacks ?? 0;
}

export function crystalShieldAvailable(state: Pick<GameState, "roundNumber">, player: PlayerState): boolean {
  return !player.buffs.some((buff) => buff.id === CRYSTAL_SHIELD_BUFF ||
    buff.id === CRYSTAL_SHIELD_LOCK && (buff.expiresAtRound ?? 0) > state.roundNumber);
}
