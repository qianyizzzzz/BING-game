import type { AttackStats, DamageEvent, GameState, PlayerState } from "../types";
import { BLADE_REWARD_ID, BLADE_ROUND_ID } from "./brokenBladeIds";
import { changeCakes } from "./cakeResources";
import { attackPowerValue, fromLegacyCombatStat, getPointDamageDefeatLevel, projectCombatValue, scaleCombatValue, withAttackPower } from "./combatValues";
import { getActiveSkillCount } from "./gameFactory";

const bladeCakeDueId = (round: number) => `broken_blade_cakes:${round}`;
const BLADE_NEXT_ATTACK = "broken_blade_next_attack";

export function recordBrokenBladeWounds(state: GameState, player: PlayerState, wounds: readonly DamageEvent[]): void {
  const copies = getActiveSkillCount(player, BLADE_REWARD_ID);
  if (!copies || !wounds.length) return;
  const immediate = wounds.reduce((gain, wound) => {
    if (!wound.attackDamage) return gain;
    const exponent = wound.pointDefeatLevel && wound.pointDefeatLevel > 1 ? wound.pointDefeatLevel - 0.1 :
      (wound.amountValue ?? fromLegacyCombatStat(wound.amount))[0]?.exponent ?? 0;
    return gain + Math.ceil(1 + Math.max(0, exponent));
  }, 0);
  if (immediate) changeCakes(state, player.id, player.cakes + immediate * copies, "破损战刃·受攻击获饼");
  const dueRound = state.roundNumber + 1;
  const id = bladeCakeDueId(dueRound);
  const due = player.buffs.find((buff) => buff.id === id);
  const cakes = wounds.length * copies;
  if (due) due.stacks += cakes;
  else player.buffs.push({ id, name: "破损战刃·下轮轮初加饼", stacks: cakes, expiresAtRound: dueRound + 1 });
}

export function payBrokenBladeWoundCakes(state: GameState, player: PlayerState): void {
  const due = player.buffs.find((buff) => buff.id === bladeCakeDueId(state.roundNumber));
  if (!due) return;
  player.buffs = player.buffs.filter((buff) => buff !== due);
  changeCakes(state, player.id, player.cakes + due.stacks, "破损战刃·轮初加饼");
}

export function queueBrokenBladeRoundBonus(player: PlayerState, cleared: number): void {
  for (let copy = getActiveSkillCount(player, BLADE_ROUND_ID); cleared > 0 && copy > 0; copy--) {
    player.buffs.push({ id: BLADE_NEXT_ATTACK, name: `破损战刃·下次攻击×${cleared}并加1饼`, stacks: cleared,
      stateType: BLADE_NEXT_ATTACK, sourceAbilityId: BLADE_ROUND_ID });
  }
}

export function takeBrokenBladeRoundBonus(state: GameState, player: PlayerState): number | undefined {
  if (!getActiveSkillCount(player, BLADE_ROUND_ID)) return undefined;
  const bonuses = player.buffs.filter(({ id }) => id === BLADE_NEXT_ATTACK);
  if (!bonuses.length) return undefined;
  player.buffs = player.buffs.filter(({ id }) => id !== BLADE_NEXT_ATTACK);
  changeCakes(state, player.id, player.cakes + bonuses.length, "破损战刃·出招获饼");
  return bonuses.reduce((multiplier, bonus) => Math.min(Number.MAX_SAFE_INTEGER, multiplier * bonus.stacks), 1);
}

export function scaleBrokenBladeRoundAttack(stats: AttackStats, multiplier: number): AttackStats {
  if (stats.fixedPointPower || getPointDamageDefeatLevel(stats)) return stats;
  const damageParts = (stats.damagePartValues ?? stats.damageParts?.map(fromLegacyCombatStat))?.map((value) => scaleCombatValue(value, multiplier));
  return { ...withAttackPower(stats, scaleCombatValue(attackPowerValue(stats), multiplier)),
    ...(damageParts ? { damageParts: damageParts.map(projectCombatValue), damagePartValues: damageParts } : {}) };
}
