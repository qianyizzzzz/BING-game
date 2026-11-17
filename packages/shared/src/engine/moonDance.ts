import type { AttackStats, BuffState, GameState, PlayerAction, PlayerState } from "../types";
import { attackLevelValue, INFINITY_VALUE, multiplyCombatValues, withAttackLevel } from "./combatValues";
import { createBaseEvent, getPlayerInitialHp, getPuppetMasterId } from "./gameFactory";
import { addSpareLife } from "./kaige";
import { MOON_DANCE_ID } from "./moonIds";
import { isSkillIgnored } from "./skillIgnore";
import { addSiphonStatus } from "./siphon";

export const MOON_DANCE_CHANNEL = "moon_dance_channel";
export const MOON_DANCE_BLESSING = "moon_dance_blessing";

export function moonDanceChannel(player: PlayerState): BuffState | undefined {
  return player.buffs.find((buff) => buff.id === MOON_DANCE_CHANNEL);
}

export function hasMoonDanceBlessing(player: PlayerState | undefined): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === MOON_DANCE_BLESSING) && !isSkillIgnored(player, MOON_DANCE_ID));
}

export function startMoonDance(state: GameState, player: PlayerState, duration = 3): void {
  if (moonDanceChannel(player)) return;
  player.buffs.push({ id: MOON_DANCE_CHANNEL, name: "月华舞礼·吟唱", stateType: MOON_DANCE_CHANNEL, stacks: 1,
    sourceAbilityId: MOON_DANCE_ID, continuationStartedTurn: state.turnNumber, expiresAtTurn: state.turnNumber + duration, uncleansable: true });
}

export function moonDanceMainAction(state: GameState, player: PlayerState): PlayerAction | undefined {
  const channel = moonDanceChannel(player);
  if (channel?.continuationStartedTurn === undefined ||
    state.turnNumber <= channel.continuationStartedTurn ||
    state.turnNumber >= (channel.expiresAtTurn ?? channel.continuationStartedTurn + 3)) return;
  return { type: "skill", skillId: MOON_DANCE_ID, stacks: 1, roarContinuationId: channel.id };
}

export function settleMoonDanceChannel(state: GameState, player: PlayerState, completedStage: boolean): void {
  const channel = moonDanceChannel(player);
  if (channel?.continuationStartedTurn === undefined || channel.continuationStartedTurn >= state.turnNumber) return;
  const finalTurn = (channel.expiresAtTurn ?? channel.continuationStartedTurn + 3) - 1;
  if (completedStage && state.turnNumber < finalTurn) return;
  player.buffs = player.buffs.filter((buff) => buff !== channel);
  if (!completedStage || state.turnNumber !== finalTurn) {
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name} 的月华舞礼吟唱中断` });
    return;
  }
  for (const ally of state.players) {
    const allied = ally.id === player.id || ally.summon?.ownerId === player.id || getPuppetMasterId(ally) === player.id;
    if (ally.status !== "alive" || !allied ||
      ally.buffs.some((buff) => buff.stateType === MOON_DANCE_BLESSING)) continue;
    addSiphonStatus(state, ally, { id: MOON_DANCE_BLESSING, stateType: MOON_DANCE_BLESSING, name: "月华舞礼", stacks: 1,
      sourceAbilityId: MOON_DANCE_ID, sourcePlayerId: player.id });
  }
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name} 完成月华舞礼` });
}

export function shapeMoonDanceAttack(player: PlayerState | undefined, attack: AttackStats): AttackStats {
  return hasMoonDanceBlessing(player) && !attack.nonAttackMove && attack.id !== "1035" && !attack.noClashLevel
    ? withAttackLevel(attack, multiplyCombatValues(attackLevelValue(attack), INFINITY_VALUE))
    : attack;
}

export function grantMoonDanceLife(state: GameState, player: PlayerState): void {
  if (hasMoonDanceBlessing(player)) addSpareLife(player, { hp: getPlayerInitialHp(player) }, state);
}
