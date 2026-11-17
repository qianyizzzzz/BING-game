import type { AttackStats, BuffState, GameState, PlayerState, SkillId } from "../types";
import { bigAbilitySource, detachBigCardAbility } from "./bigCards";
import {
  addCombatValues, attackLevelValue, attackPowerValue, combatValue, compareCombatValues,
  fromLegacyCombatStat, getPointDamageDefeatLevel, getPointDamageTrait, INFINITY_VALUE, projectCombatValue, scaleCombatValue, withAttackLevel,
  withAttackPower, type CombatValue
} from "./combatValues";
import { getElementAmount } from "./elementResources";
import { createBaseEvent, createId, getActiveSkillCount } from "./gameFactory";
import { isSkillIgnored } from "./skillIgnore";
import { canGainStatus } from "./karmaSong";
import { YOUKAI_ELEMENT, YOUKAI_FULL_ID, YOUKAI_FULL_STATE, YOUKAI_HALF_ID, YOUKAI_HALF_STATE,
  YOUKAI_RITUAL_ID, YOUKAI_RITUAL_STATE } from "./youkaiIds";

export function addYoukaiLayers(player: PlayerState, count: number): void {
  player.youkaiLayers = (player.youkaiLayers ?? 0) + count;
  refreshYoukaiHalf(player);
}

export function hasYoukaiForm(player: PlayerState | undefined, full = false): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === (full ? YOUKAI_FULL_STATE : YOUKAI_HALF_STATE)) &&
    getActiveSkillCount(player, full ? YOUKAI_FULL_ID : YOUKAI_HALF_ID));
}

export function refreshYoukaiHalf(player: PlayerState): void {
  if (player.status !== "alive") return;
  const full = player.buffs.some((buff) => buff.stateType === YOUKAI_FULL_STATE);
  const qualified = !full && getActiveSkillCount(player, YOUKAI_HALF_ID) > 0 &&
    (getElementAmount(player, YOUKAI_ELEMENT) >= 5 || (player.youkaiLayers ?? 0) >= 20);
  const half = player.buffs.find((buff) => buff.stateType === YOUKAI_HALF_STATE);
  if (!qualified) {
    if (half) player.buffs = player.buffs.filter((buff) => buff !== half);
    if (!full && player.youkaiHalfRounds) delete player.youkaiHalfRounds;
    return;
  }
  if (!half && canGainStatus(player)) player.buffs.push({ id: YOUKAI_HALF_STATE, stateType: YOUKAI_HALF_STATE, name: "半妖化",
    stacks: 1, sourceAbilityId: YOUKAI_HALF_ID });
}

export function advanceYoukaiRound(state: GameState, player: PlayerState): void {
  if (player.status !== "alive" || !hasYoukaiForm(player)) return;
  player.youkaiHalfRounds = Math.min(6, (player.youkaiHalfRounds ?? 0) + 1);
  if (player.youkaiHalfRounds < 6 || !getActiveSkillCount(player, YOUKAI_FULL_ID) || !canGainStatus(player)) return;
  const sourceId = bigAbilitySource(player, { skillId: YOUKAI_HALF_ID });
  const card = player.bigCards?.find((entry) => entry.instanceId === sourceId);
  if (!card) return;
  detachBigCardAbility(player, card, YOUKAI_HALF_ID);
  player.buffs = player.buffs.filter((buff) => buff.stateType !== YOUKAI_HALF_STATE);
  player.buffs.push({ id: YOUKAI_FULL_STATE, stateType: YOUKAI_FULL_STATE, name: "妖化",
    stacks: 1, sourceAbilityId: YOUKAI_FULL_ID });
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name} 连续六轮半妖化，进入妖化` });
}

export function shapeYoukaiAttack(player: PlayerState | undefined, input: AttackStats): AttackStats {
  if (input.nonAttackMove || input.id === "1035") return input;
  if (input.id === YOUKAI_RITUAL_ID) return { ...input, fixedPointPower: true, noClashLevel: true };
  const layers = player?.youkaiLayers ?? 0;
  const multiplier = hasYoukaiForm(player, true) ? 16 : hasYoukaiForm(player) ? (input.isSkill ? 4 : 8) : 1;
  if (layers === 0 && multiplier === 1) return input;

  let stats = withAttackLevel(input, scaleCombatValue(
    addCombatValues(attackLevelValue(input), combatValue(2 * layers)), multiplier));
  if (!input.fixedPointPower && !getPointDamageDefeatLevel(input)) {
    const bonus = combatValue(layers);
    const boostPower = (power: CombatValue) => getPointDamageTrait(power) ? power :
      scaleCombatValue(addCombatValues(power, bonus), multiplier);
    stats = withAttackPower(stats, boostPower(attackPowerValue(input)));
    const parts = input.damagePartValues ?? input.damageParts?.map(fromLegacyCombatStat);
    if (parts) {
      stats.damagePartValues = parts.map(boostPower);
      stats.damageParts = stats.damagePartValues.map(projectCombatValue);
    }
  }
  return stats;
}

export function youkaiDamageIgnore(player: PlayerState, amount: CombatValue): SkillId | undefined {
  if (compareCombatValues(amount, INFINITY_VALUE) >= 0) return;
  if (hasYoukaiForm(player, true)) return YOUKAI_FULL_ID;
  if (hasYoukaiForm(player)) return YOUKAI_HALF_ID;
}

export function canStartYoukaiRitual(player: PlayerState): boolean {
  return hasYoukaiForm(player, true) && (player.youkaiLayers ?? 0) >= 100;
}

export function startYoukaiRitual(state: GameState, player: PlayerState, sourceInstance: string, duration = 8): void {
  if (!canGainStatus(player)) return;
  player.buffs.push({ id: createId(YOUKAI_RITUAL_STATE), stateType: YOUKAI_RITUAL_STATE, name: "未央鬼祭",
    sourceAbilityId: YOUKAI_RITUAL_ID, sourceBigCardInstanceId: sourceInstance, stacks: 1,
    expiresAtTurn: Math.min(Number.MAX_SAFE_INTEGER, state.turnNumber + duration),
    roarContinuation: { action: { type: "skill", skillId: YOUKAI_RITUAL_ID, stacks: 1,
      bigCardInstanceId: sourceInstance }, firstTurn: state.turnNumber } });
}

export function activeYoukaiRituals(state: GameState): Array<{ caster: PlayerState; buff: BuffState }> {
  return state.players.flatMap((caster) => caster.status !== "alive" ? [] : caster.buffs.filter((buff) => buff.stateType === YOUKAI_RITUAL_STATE &&
    (buff.expiresAtTurn ?? 0) > state.turnNumber).map((buff) => ({ caster, buff })));
}

export function endYoukaiRituals(player: PlayerState): void {
  player.buffs = player.buffs.filter((buff) => buff.stateType !== YOUKAI_RITUAL_STATE);
}

export function youkaiPreventsDeath(state: GameState, player: PlayerState): boolean {
  return !isSkillIgnored(player, YOUKAI_RITUAL_ID) && activeYoukaiRituals(state).some(({ caster }) => caster.spaceId === player.spaceId);
}

export function youkaiVictoryRecipient(state: GameState): PlayerState | undefined {
  const rituals = activeYoukaiRituals(state).filter(({ caster }) => caster.status === "alive" && caster.defeatLevel === undefined);
  if (rituals.length === 1) return rituals[0]!.caster;
}

export function youkaiRitualDefense(state: GameState, playerId: string, actionIndex: number): "small" | "youtiao" | "stone" {
  if (state.youkaiRitualDefenses?.turn !== state.turnNumber) state.youkaiRitualDefenses = { turn: state.turnNumber, byMove: {} };
  const key = `${playerId}:${actionIndex}`;
  const known = state.youkaiRitualDefenses.byMove[key];
  if (known) return known;
  const defenses = ["small", "youtiao", "stone"] as const;
  const roll = Math.floor(Math.random() * defenses.length);
  const defense = defenses[roll]!;
  state.youkaiRitualDefenses.byMove[key] = defense;
  const name = state.players.find(({ id }) => id === playerId)?.name ?? "玩家";
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${name} 的未央鬼祭本回合为${["小防", "油条", "石头"][roll]}防` });
  return defense;
}
