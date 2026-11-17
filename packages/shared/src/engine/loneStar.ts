import { getCombatFarthestPlayers, getCombatSeatGroups } from "./seating";
import type { AttackStats, GameState, PlayerId, PlayerState } from "../types";
import { getSkillPlay } from "../skills/registry";
import { getActiveFusionCount } from "../skills/fusion";
import { getActiveSkillCount, findPlayer } from "./gameFactory";
import { INFINITY_VALUE, RETIRE_VALUE, VANISH_VALUE, attackLevelValue, compareCombatValues, fromLegacyCombatStat, withAttackLevel, withAttackPower } from "./combatValues";
import { EXECUTE_EFFECT_POWER } from "../types";
import { isSkillIgnored } from "./skillIgnore";

import { LONE_STAR_DUEL, LONE_STAR_PASSIVE_ID, LONE_STAR_UPGRADE, LONE_STAR_RAGE_ID, LONE_STAR_PIERCE_ID, LONE_STAR_FUSION_ID } from "./loneStarIds";
import { tianShaIgnoresMove, tianShaIgnoresNeighbor } from "./tianSha";

export function loneStarFarthest(state: Pick<GameState, "players">, source: PlayerState): PlayerId[] {
  return getCombatFarthestPlayers(getCombatSeatGroups(state, source.spaceId), source.id).map(({ id }) => id);
}

export function ignoresLoneStarSource(state: Pick<GameState, "players" | "turnNumber">, target: PlayerState | undefined,
  sourceId: PlayerId | undefined): boolean {
  if (!target || !sourceId || target.id === sourceId || !findPlayer(state, sourceId)) return false;
  if (tianShaIgnoresNeighbor(state, target, sourceId)) return true;
  return !isSkillIgnored(target, LONE_STAR_FUSION_ID) && target.buffs.some((buff) => buff.stateType === LONE_STAR_DUEL && buff.sourcePlayerId === sourceId &&
    (buff.expiresAtTurn ?? 0) > state.turnNumber) ||
    getActiveFusionCount(target, "天煞孤星") > 0 && !loneStarFarthest(state, target).includes(sourceId);
}

export function ignoresLoneStarAttack(state: GameState, target: PlayerState | undefined, sourceId: PlayerId): boolean {
  if (tianShaIgnoresMove(target, sourceId) || ignoresLoneStarSource(state, target, sourceId)) return true;
  return Boolean(target && target.id !== sourceId && getActiveSkillCount(target, LONE_STAR_PASSIVE_ID) &&
    state.pendingActions[target.id]?.actions.some((move, index) => {
      if (state.turnMoveSuppression?.invalidated[target.id]?.includes(index)) return false;
      if (move.type === "attack") return true;
      if (move.type !== "skill" || move.skillId === "1035") return false;
      const play = getSkillPlay(move.skillId);
      return play?.kind === "attack" && !play.nonAttackMove;
    }));
}

export function loneStarUpgrade(player: PlayerState, targetId: PlayerId, skillId: string): number {
  return player.buffs.find((buff) => buff.id === `${LONE_STAR_UPGRADE}:${skillId}:${targetId}`)?.stacks ?? 0;
}

export function grantLoneStarUpgrade(player: PlayerState, targetId: PlayerId, skillId: string, amount: number): void {
  const id = `${LONE_STAR_UPGRADE}:${skillId}:${targetId}`;
  const prior = player.buffs.find((buff) => buff.id === id);
  if (prior) prior.stacks += amount;
  else player.buffs.push({ id, name: skillId === LONE_STAR_RAGE_ID ? "怒星莽击强化" : "星绝击·击碎资格",
    stateType: LONE_STAR_UPGRADE, sourcePlayerId: targetId, stacks: amount });
}

export function consumeLoneStarUpgrade(player: PlayerState, targetId: PlayerId, skillId: string): number {
  const amount = loneStarUpgrade(player, targetId, skillId);
  if (amount > 1 && skillId === LONE_STAR_PIERCE_ID) {
    player.buffs.find((buff) => buff.id === `${LONE_STAR_UPGRADE}:${skillId}:${targetId}`)!.stacks--;
    return 1;
  }
  if (amount) player.buffs = player.buffs.filter((buff) => buff.id !== `${LONE_STAR_UPGRADE}:${skillId}:${targetId}`);
  return amount;
}

export function shapeLoneStarAttack(stats: AttackStats, charge: number): AttackStats {
  if (stats.id === LONE_STAR_PIERCE_ID) return { ...stats, defensePiercing: true, ...(charge > 0 ? { defenseShattering: true } : {}) };
  if (stats.id !== LONE_STAR_RAGE_ID || charge <= 0) return stats;
  const [power, trait] = charge >= 7 ? [fromLegacyCombatStat(EXECUTE_EFFECT_POWER), "defeat_execute"] as const :
    charge >= 3 ? [VANISH_VALUE, "defeat_vanish"] as const : [RETIRE_VALUE, "defeat_retire"] as const;
  const upgraded = withAttackPower(stats, power);
  const sameLevel = compareCombatValues(attackLevelValue(stats), INFINITY_VALUE) === 0;
  return { ...(sameLevel ? withAttackLevel(upgraded, power) : upgraded), fixedPointPower: true,
    traits: [...stats.traits.filter((item) => !item.startsWith("defeat_")), trait] };
}

export function loneStarDuelOpponent(state: Pick<GameState, "players">, source: PlayerState): PlayerId | undefined {
  const opponents = state.players.filter((player) => player.id !== source.id && player.kind !== "spectator" &&
    !player.summon && player.status === "alive" && player.spaceId === source.spaceId);
  return opponents.length === 1 ? opponents[0]!.id : undefined;
}
