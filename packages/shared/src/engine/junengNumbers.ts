import { JUNENG_CARD_ID, JUNENG_RESPONSE_ID, bigCardHasAbility } from "../bigCards/abilities";
import type { AttackStats, BuffState, GameState, PendingDamageItem, PlayerState, SkillAction } from "../types";
import { attackLevelValue, attackPowerValue, scaleCombatValue, withAttackLevel, withAttackPower, type CombatValue } from "./combatValues";
import { isAttackDamageItem } from "./damageKinds";

// 技能数值标注.xlsx / 确定稿子. Only 10504 entries marked 可纳入 and 有利 or 不利.
const direction = {
  "1050401.cakeCost": "unfavorable",
  "1050401.elementGain": "beneficial",
  "1050403.defenseGainPerElement": "beneficial",
  "1050403.attackBlockPerElement": "beneficial",
  "1050403.attackReflectPerElement": "beneficial",
  "1050404.elementCost": "unfavorable",
  "1050404.spellDamagePerTarget": "beneficial",
  "1050404.reflectPowerLimit": "beneficial",
  "1050405.elementCost": "unfavorable",
  "1050405.storedDamageMultiplier": "beneficial",
  "1050406.boostRounds": "beneficial",
  "1050406.beneficialMultiplier": "beneficial",
  "1050406.unfavorableDivisor": "beneficial",
  "1050407.elementCost": "unfavorable",
  "1050407.targetLockRounds": "beneficial",
  "1050408.elementCost": "unfavorable",
  "1050408.attackPower": "beneficial",
  "1050408.attackLevel": "beneficial",
  "1050408.executeUpgradeChance": "beneficial"
} as const;
type NumberId = keyof typeof direction;
type JunengOwner = Pick<PlayerState, "bigCards" | "buffs">;

function findBoost(player: JunengOwner, numberId: NumberId, instanceId?: string): BuffState | undefined {
  const abilityId = numberId.slice(0, 7);
  const source = player.bigCards?.find((card) => !card.junengDisabled && bigCardHasAbility(card, abilityId) &&
    (!instanceId || instanceId === card.instanceId));
  return source && player.buffs.find((buff) => buff.stateType === "juneng_boost" && buff.sourceBigCardInstanceId === source.instanceId);
}

export function getJunengNumber(player: JunengOwner, id: NumberId, value: number, instanceId?: string): number {
  const boost = findBoost(player, id, instanceId);
  if (!boost) return value;
  if (direction[id] === "unfavorable") return Math.ceil(value / (boost.junengDivisor ?? boost.stacks));
  return value * boost.stacks;
}

export function getJunengCombatNumber(player: JunengOwner, id: NumberId, value: CombatValue, instanceId?: string): CombatValue {
  return scaleCombatValue(value, getJunengNumber(player, id, 1, instanceId));
}

export function getJunengElementUnitCost(player: JunengOwner, action: Pick<SkillAction, "skillId" | "bigCardInstanceId">,
  cost: number): number {
  const id = `${action.skillId}.elementCost`;
  return id in direction ? getJunengNumber(player, id as NumberId, cost, action.bigCardInstanceId) : cost;
}

export function scaleJunengAttack(player: JunengOwner, attack: AttackStats, instanceId?: string): AttackStats {
  if (attack.id !== "1050408") return attack;
  return withAttackLevel(withAttackPower(attack,
    getJunengCombatNumber(player, "1050408.attackPower", attackPowerValue(attack), instanceId)),
    getJunengCombatNumber(player, "1050408.attackLevel", attackLevelValue(attack), instanceId));
}

export function scheduleJunengResponse(state: GameState, player: PlayerState, damage: PendingDamageItem): void {
  if (!damage.attackKey || !isAttackDamageItem(damage) || damage.pointDefeatLevel ||
    (damage.element !== "electric" && !damage.elements?.includes("electric"))) return;
  for (const card of player.bigCards ?? []) {
    if (card.cardId !== JUNENG_CARD_ID || card.junengDisabled || !bigCardHasAbility(card, JUNENG_RESPONSE_ID) ||
      player.buffs.some((buff) => buff.id === `sealed_skill:${JUNENG_RESPONSE_ID}`)) continue;
    const instanceId = card.instanceId;
    card.junengResponse = {
      disabledRound: state.roundNumber + 1,
      duration: getJunengNumber(player, "1050406.boostRounds", 2, instanceId),
      multiplier: getJunengNumber(player, "1050406.beneficialMultiplier", 2, instanceId),
      divisor: getJunengNumber(player, "1050406.unfavorableDivisor", 2, instanceId)
    };
  }
}

export function settleJunengRoundChanges(state: GameState): void {
  for (const player of state.players) for (const card of player.bigCards ?? []) {
    const cycle = card.junengResponse;
    if (!cycle) continue;
    const boostEnd = cycle.disabledRound + 1 + cycle.duration;
    if (state.roundNumber >= cycle.disabledRound && (!cycle.started || state.roundNumber >= boostEnd)) {
      player.buffs = player.buffs.filter((buff) => buff.stateType !== "juneng_boost" || buff.sourceBigCardInstanceId !== card.instanceId);
    }
    if (state.roundNumber === cycle.disabledRound) card.junengDisabled = true;
    else delete card.junengDisabled;
    if (state.roundNumber >= boostEnd) delete card.junengResponse;
    else if (state.roundNumber > cycle.disabledRound && !cycle.started) {
      cycle.started = true;
      player.buffs.push({ id: `juneng_boost:${card.instanceId}`, name: `聚能湮灭炮·有利×${cycle.multiplier}／不利÷${cycle.divisor}`,
        stateType: "juneng_boost", stacks: cycle.multiplier, junengDivisor: cycle.divisor, expiresAtRound: boostEnd,
        sourceBigCardInstanceId: card.instanceId, sourceAbilityId: JUNENG_RESPONSE_ID });
    }
  }
}
