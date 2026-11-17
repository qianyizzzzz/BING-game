import { greedChainRecipients } from "./siphon";
import { canGainStatus } from "./karmaSong";
import { bigCardHasAbility, CLOUD_SEA_ID, LING_ELEMENT, LINGTA_INHERIT_ID, SKY_ABSOLUTE_ID } from "../bigCards/abilities";
import type { AttackStats, GameState, PlayerId, PlayerState } from "../types";
import { addCombatValues, attackLevelValue, attackPowerValue, combatValue, compareCombatValues, formatCombatValue, getPointDamageDefeatLevel,
  INFINITY_VALUE, isUnboundedCombatValue, multiplyCombatValues, projectCombatValue, RETIRE_VALUE, roundCombatValue, scaleCombatValue,
  subtractCombatValues, withAttackLevel, withAttackPower, type CombatValue } from "./combatValues";
import { createBaseEvent, findPlayer, getActiveSkillCount } from "./gameFactory";
import { getElementValue, setElementValue } from "./elementResources";
import { INVENTORY_ITEM_STATE_TYPE } from "./effectCategories";
import { playersInSpace } from "./spaces";

export const CLOUD_ITEM = "lingta_cloud";
export const CLOUD_SEA_ITEM = "lingta_cloud_sea";
export const SKY_ABSOLUTE_STATE = "sky_absolute";
export const SKY_ABSOLUTE_COVER = "sky_absolute_cover";
export const CLOUD_BYPASS_STATE = "lingta_cloud_bypass";
export const FREE_SKY_STRIKE = "free_sky_strike";

export function hasLingtaField(state: Pick<GameState, "players">, playerId: PlayerId): boolean {
  return playersInSpace(state, playerId).some((player) => player.status === "alive" && getActiveSkillCount(player, LINGTA_INHERIT_ID) > 0);
}

export function skyAbsoluteActive(player: PlayerState | undefined, round: number): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === SKY_ABSOLUTE_STATE && (buff.expiresAtRound ?? 0) > round));
}

export function canHaveCloudField(player: PlayerState | undefined): boolean {
  return Boolean(player?.status === "alive" && player.bigCards?.some((card) =>
    !card.junengDisabled && bigCardHasAbility(card, CLOUD_SEA_ID)));
}

export function cloudQuantity(player: PlayerState, includeSeas = false): CombatValue {
  return player.buffs.reduce<CombatValue>((total, buff) => buff.itemKind === CLOUD_ITEM ?
    addCombatValues(total, buff.resourceValue ?? combatValue(buff.stacks)) : includeSeas && buff.itemKind === CLOUD_SEA_ITEM ?
      addCombatValues(total, combatValue(10 * buff.stacks)) : total, []);
}

export function cloudSeaCount(player: PlayerState | undefined): number {
  return player?.buffs.find((buff) => buff.itemKind === CLOUD_SEA_ITEM)?.stacks ?? 0;
}

export function changeCloudSeas(player: PlayerState, amount: number): void {
  const existing = player.buffs.find((buff) => buff.itemKind === CLOUD_SEA_ITEM);
  const next = (existing?.stacks ?? 0) + amount;
  if (next <= 0) player.buffs = player.buffs.filter((buff) => buff !== existing);
  else if (existing) existing.stacks = next;
  else player.buffs.push({ id: CLOUD_SEA_ITEM, itemKind: CLOUD_SEA_ITEM, stateType: INVENTORY_ITEM_STATE_TYPE, name: "云海", stacks: next });
}

export function grantClouds(player: PlayerState, amount: CombatValue, round: number): void {
  if (!amount.length) return;
  const expiresAtRound = round + 4;
  const id = `${CLOUD_ITEM}:${expiresAtRound}`;
  const existing = player.buffs.find((buff) => buff.id === id);
  const value = addCombatValues(existing?.resourceValue ?? combatValue(existing?.stacks ?? 0), amount);
  player.buffs = player.buffs.filter((buff) => buff !== existing);
  player.buffs.push({ id, itemKind: CLOUD_ITEM, stateType: INVENTORY_ITEM_STATE_TYPE, name: "云", expiresAtRound,
    stacks: isUnboundedCombatValue(value) ? Number.MAX_SAFE_INTEGER : projectCombatValue(value), resourceValue: value });
}

export function spendClouds(player: PlayerState, amount: number): void {
  const clouds = player.buffs.filter((buff) => buff.itemKind === CLOUD_ITEM)
    .sort((a, b) => (a.expiresAtRound ?? Infinity) - (b.expiresAtRound ?? Infinity));
  for (const buff of clouds) {
    if (!amount) break;
    const value = buff.resourceValue ?? combatValue(buff.stacks);
    const spend = compareCombatValues(value, combatValue(amount)) >= 0 ? amount : projectCombatValue(value);
    const remaining = subtractCombatValues(value, combatValue(spend));
    amount -= spend;
    if (!remaining.length) player.buffs = player.buffs.filter((entry) => entry !== buff);
    else {
      buff.resourceValue = remaining;
      buff.stacks = isUnboundedCombatValue(remaining) ? Number.MAX_SAFE_INTEGER : projectCombatValue(remaining);
    }
  }
}

export function gainFromCloudChecks(state: GameState, player: PlayerState, stats: AttackStats): void {
  if (!canHaveCloudField(player) || stats.nonAttackMove || stats.id === "1035" ||
    compareCombatValues(attackPowerValue(stats), INFINITY_VALUE) > 0 || (getPointDamageDefeatLevel(stats) ?? 1) > 1) return;
  const level = attackLevelValue(stats);
  const unbounded = isUnboundedCombatValue(level);
  const finite = unbounded ? 0 : Math.max(0, Math.floor(projectCombatValue(level)));
  if (!unbounded && !finite || compareCombatValues(level, []) <= 0) return;
  const attempts = unbounded ? INFINITY_VALUE : combatValue(finite);
  const successes = unbounded ? INFINITY_VALUE : combatValue(sampleCloudChecks(finite, .25));
  setElementValue(player, LING_ELEMENT, addCombatValues(getElementValue(player, LING_ELEMENT), attempts));
  grantClouds(player, successes, state.roundNumber);
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id,
    message: `${player.name} 判定 ${formatCombatValue(attempts)} 次，获得 ${formatCombatValue(attempts)} 凌、${formatCombatValue(successes)} 云`,
    probabilityChecks: { playerId: player.id, skillId: CLOUD_SEA_ID, chance: .25, attempts, successes } });
}

function sampleCloudChecks(attempts: number, chance: number): number {
  if (!attempts || chance <= 0) return 0;
  if (chance >= 1) return attempts;
  if (attempts <= 4096) {
    let successes = 0;
    for (let roll = 0; roll < attempts; roll++) if (Math.random() < chance) successes++;
    return successes;
  }
  // Split independent rolls at the middle uniform order statistic.
  const middle = Math.floor(attempts / 2);
  const left = sampleGamma(middle), right = sampleGamma(attempts - middle + 1);
  const pivot = left / (left + right);
  return chance < pivot ? sampleCloudChecks(middle - 1, chance / pivot) :
    middle + sampleCloudChecks(attempts - middle, (chance - pivot) / (1 - pivot));
}

function sampleGamma(shape: number): number {
  const scale = shape - 1 / 3, spread = 1 / Math.sqrt(9 * scale);
  for (;;) {
    const normal = Math.sqrt(-2 * Math.log(Math.max(Number.MIN_VALUE, Math.random()))) * Math.cos(2 * Math.PI * Math.random());
    const base = 1 + spread * normal;
    if (base <= 0) continue;
    const draw = base ** 3;
    const random = Math.random();
    if (random < 1 - .0331 * normal ** 4 ||
      Math.log(random) < .5 * normal ** 2 + scale * (1 - draw + Math.log(draw))) return scale * draw;
  }
}

export function activateSkyAbsolute(state: GameState, source: PlayerState): void {
  for (const player of [source, ...greedChainRecipients(state, source)]) grantSkyAbsolute(state, player);
}

function grantSkyAbsolute(state: GameState, player: PlayerState): void {
  if (!canGainStatus(player)) return;
  const activeCovers = player.buffs.find((buff) => buff.stateType === SKY_ABSOLUTE_COVER &&
    (buff.expiresAtRound ?? 0) > state.roundNumber)?.stacks ?? 0;
  for (const kind of [SKY_ABSOLUTE_STATE, SKY_ABSOLUTE_COVER]) {
    player.buffs = player.buffs.filter((buff) => buff.stateType !== kind);
    player.buffs.push({ id: kind, stateType: kind, name: kind === SKY_ABSOLUTE_STATE ? "凌空·天绝" : "天绝护罩",
      stacks: kind === SKY_ABSOLUTE_STATE ? 1 : 10 + activeCovers, expiresAtRound: state.roundNumber + 1, sourceAbilityId: SKY_ABSOLUTE_ID });
  }
}

export function shapeSkyAbsoluteAttack(stats: AttackStats, player: PlayerState | undefined, round: number): AttackStats {
  if (!skyAbsoluteActive(player, round) || stats.nonAttackMove || stats.id === "1035") return stats;
  const boosted = withAttackLevel(getPointDamageDefeatLevel(stats) ? stats :
    withAttackPower(stats, multiplyCombatValues(attackPowerValue(stats), INFINITY_VALUE)), multiplyCombatValues(attackLevelValue(stats), RETIRE_VALUE));
  if (!stats.damagePartValues?.length) return boosted;
  const parts = stats.damagePartValues.map((value, index) => stats.honghuangLastRetires && index === 4 ? value :
    multiplyCombatValues(value, INFINITY_VALUE));
  return { ...boosted, damagePartValues: parts, damageParts: parts.map(projectCombatValue) };
}

export function halveSkyStrikeResources(player: PlayerState): void {
  setElementValue(player, LING_ELEMENT, roundCombatValue(scaleCombatValue(getElementValue(player, LING_ELEMENT), .5), Math.floor));
  const seas = cloudSeaCount(player);
  changeCloudSeas(player, Math.floor(seas / 2) - seas);
}
