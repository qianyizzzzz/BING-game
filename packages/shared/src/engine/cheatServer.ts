import type { AttackStats, GameState, KarmaCardChoice, PlayerState, SkillId } from "../types";
import { getKarmaCardChoices } from "./karmaCycle";
import { offsetAttackStats } from "./combatValues";
import { CHEAT_ABSOLUTE_ID, CHEAT_GATHER_ID, CHEAT_GREED_ID, CHEAT_NOGLUES_ID, CHEAT_SHARP_BONUS, CHEAT_SHARP_DAMAGE_ID, CHEAT_SHARP_ID,
  CHEAT_SHARP_STOCK, CHEAT_TRANSFER_ID, CHEAT_VICTORY_ID, CHEAT_WARP_ID, CHEAT_WARP_STATE } from "./cheatServerIds";

const cheats = new Set<SkillId>([CHEAT_GATHER_ID, CHEAT_SHARP_ID, CHEAT_NOGLUES_ID, CHEAT_WARP_ID,
  CHEAT_ABSOLUTE_ID, CHEAT_GREED_ID, CHEAT_TRANSFER_ID, CHEAT_VICTORY_ID]);

export function isCheatServerCast(id: SkillId): boolean {
  return cheats.has(id);
}

export function isCheatServerAnytimeSkill(id: SkillId): boolean {
  return id === CHEAT_SHARP_DAMAGE_ID || id !== CHEAT_ABSOLUTE_ID && isCheatServerCast(id);
}

export function getCheatCardChoices(state: GameState, source: PlayerState): KarmaCardChoice[] {
  const localIds = new Set(state.players.filter((player) => player.spaceId === source.spaceId).map(({ id }) => id));
  return getKarmaCardChoices(state, source).filter(({ playerId }) => localIds.has(playerId));
}

export function getCheatSharpDamageUses(player: Pick<PlayerState, "buffs"> | undefined): number {
  return player?.buffs.find(({ id }) => id === CHEAT_SHARP_STOCK)?.stacks ?? 0;
}

export function changeCheatSharpDamageUses(player: PlayerState, change: number): void {
  const stock = player.buffs.find(({ id }) => id === CHEAT_SHARP_STOCK);
  const remaining = (stock?.stacks ?? 0) + change;
  if (remaining <= 0) player.buffs = player.buffs.filter((buff) => buff !== stock);
  else if (stock) stock.stacks = remaining;
  else player.buffs.push({ id: CHEAT_SHARP_STOCK, name: "Sharpandshiny·法伤机会", stacks: remaining });
}

export function cheatWarpMultiplier(player: Pick<PlayerState, "buffs">, round: number): number {
  return 4 ** player.buffs.filter((buff) => buff.stateType === CHEAT_WARP_STATE && (buff.expiresAtRound ?? 0) > round).length;
}

export function applyCheatSharpBonus(player: Pick<PlayerState, "buffs"> | undefined, attack: AttackStats): AttackStats {
  const bonus = player?.buffs.find(({ id }) => id === CHEAT_SHARP_BONUS)?.stacks ?? 0;
  if (!bonus) return attack;
  const result = offsetAttackStats(attack, bonus, bonus);
  if (!attack.fixedPointPower && attack.damageParts?.length) {
    result.damageParts = attack.repeatedDamageParts ? attack.damageParts.map(() => result.power) : [result.power, ...attack.damageParts.slice(1)];
    if (attack.damagePartValues && result.powerValue) {
      const value = result.powerValue;
      result.damagePartValues = attack.repeatedDamageParts ? attack.damagePartValues.map(() => value) : [value, ...attack.damagePartValues.slice(1)];
    }
  }
  return result;
}
