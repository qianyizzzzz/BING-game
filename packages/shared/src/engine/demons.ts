import type { AttackStats, GameState, PlayerAction, PlayerState, SkillAction } from "../types";
import { bigCardHasAbility } from "../bigCards/abilities";
import type { BigCardInstance } from "../bigCards/types";
import { applyNegativeStatus } from "./negativeStatuses";
import { flankTableZone, houndActions, nextCreationOrder, spawnHounds } from "./beast";
import type { SummonedEntity } from "./beastTraits";
import { addCombatValues, combatValue, compareCombatValues, divideCombatDamage, multiplyCombatValues, roundCombatValue,
  attackLevelValue, attackPowerValue, withAttackLevel, withAttackPower, type CombatValue } from "./combatValues";
import { createBaseEvent, createPlayer, findPlayer, getActiveSkillCount } from "./gameFactory";
import { getJunengTargetLock } from "./juneng";
import { canAffectAcrossSpace, preventsTargetSelection } from "./spaces";
import { getBigCardLimitedRemaining } from "./limitedUseBalance";
import { isSkillIgnored } from "./skillIgnore";
import { DEMON_ABYSS_ID, DEMON_EVIL_BITE, DEMON_EVIL_HOUND_ID, DEMON_FEAR_BITE, DEMON_FEAR_HOUND_ID, DEMON_GUARD_ID, DEMON_GUARD_ORDER_ID,
  DEMON_IMP_ID, DEMON_IMP_ORDER_ID, DEMON_LEGION_AREA, DEMON_LEGION_LOCK, DEMON_LEGION_SINGLE, DEMON_TYRANT_ID, DEMON_VOIDWALKER_ID, DEMON_WHIRLWIND,
  isTargetedDemonSummon, type DemonCooldown, type DemonKind, type DemonOrder } from "./demonIds";

const summonRules: Record<string, { kind: DemonKind; name: string; hp: number; period: number; grant: number }> = {
  [DEMON_IMP_ID]: { kind: "imp", name: "小鬼", hp: 15, period: 3, grant: 3 },
  [DEMON_VOIDWALKER_ID]: { kind: "voidwalker", name: "虚空行者", hp: 100, period: 10, grant: 1 },
  [DEMON_FEAR_HOUND_ID]: { kind: "fear_hound", name: "恐惧猎犬", hp: 30, period: 15, grant: 1 },
  [DEMON_EVIL_HOUND_ID]: { kind: "evil_hound", name: "邪犬", hp: 45, period: 15, grant: 1 },
  [DEMON_GUARD_ID]: { kind: "guard", name: "恶魔卫士", hp: 150, period: 40, grant: 1 },
  [DEMON_TYRANT_ID]: { kind: "tyrant", name: "暴君", hp: 300, period: 100, grant: 1 },
};

const cooldowns: Record<DemonCooldown, number> = { whirlwind: 1, power: 30, legion: 10 };
const guardOrders = new Set<DemonOrder>(["standby", "whirlwind", "power", "legion_area", "legion_single"]);
const impOrders = new Set<DemonOrder>(["standby", "fireball"]);
export const TYRANT_ATTACK_DIVISOR = 3;
export const TYRANT_FIREBALL_DIVISOR = 5;
type DemonPlayer = { id: string; status: string; kind?: string; spaceId?: string; summon?: SummonedEntity; buffs?: PlayerState["buffs"] };

export function isDemonSummonSkill(id: string): boolean {
  return Object.hasOwn(summonRules, id);
}

export function isDemonOrderSkill(id: string): boolean {
  return id === DEMON_IMP_ORDER_ID || id === DEMON_GUARD_ORDER_ID;
}

export function demonSummonBalance(turn: number, card: BigCardInstance, skillId: string): number {
  const rule = summonRules[skillId];
  if (!rule || !bigCardHasAbility(card, skillId) || card.junengDisabled) return 0;
  const elapsed = Math.max(0, turn - (card.demonGrantStartTurn ?? 1));
  return getBigCardLimitedRemaining(card, skillId, (1 + Math.floor(elapsed / rule.period)) * rule.grant);
}

const availableSummons = (turn: number, card: BigCardInstance, id: string) => Math.max(0, demonSummonBalance(turn, card, id));

export function demonSummonUses(state: { turnNumber: number }, player: Pick<PlayerState, "bigCards"> | undefined,
  skillId: string, instanceId?: string): number {
  return (player?.bigCards ?? []).reduce((sum, card) => sum +
    (!instanceId || card.instanceId === instanceId ? availableSummons(state.turnNumber, card, skillId) : 0), 0);
}

function canFollowDemonOrders(pet: SummonedEntity, turn: number): boolean {
  return (pet.demonOrdersFromTurn ?? pet.firstTurn + 1) <= turn;
}

export function controlledDemons<T extends DemonPlayer>(state: { turnNumber: number; players: readonly T[] },
  ownerId: string, skillId: string): T[] {
  const kind = skillId === DEMON_IMP_ORDER_ID ? "imp" : skillId === DEMON_GUARD_ORDER_ID ? "guard" : summonRules[skillId]?.kind;
  const owner = state.players.find(({ id }) => id === ownerId);
  return state.players.filter((player) => player.status === "alive" && player.summon?.ownerId === ownerId &&
    player.summon.kind === kind && canFollowDemonOrders(player.summon, state.turnNumber) && player.spaceId === owner?.spaceId);
}

export function demonOrderTargets<T extends DemonPlayer>(state: { players: readonly T[] }, demon: DemonPlayer): T[] {
  return state.players.filter((player) => player.status === "alive" && player.kind !== "spectator" && player.spaceId === demon.spaceId &&
    player.id !== demon.id && player.id !== demon.summon?.ownerId &&
    !preventsTargetSelection(player));
}

export function demonSummonTargets(state: Pick<GameState, "players" | "smallSpaces" | "junengTargetLock" | "roundNumber">,
  owner: Pick<PlayerState, "id" | "spaceId">): PlayerState[] {
  const lock = getJunengTargetLock(state, owner.spaceId);
  return state.players.filter((target) => target.id !== owner.id && target.status === "alive" &&
    target.kind !== "spectator" && target.spaceId === owner.spaceId && !target.emptyCityOwnerId &&
    (!lock || lock.targetId === target.id) && canAffectAcrossSpace(state, owner.id, target.id) &&
    !preventsTargetSelection(target));
}

function orderCooldown(order: DemonOrder): DemonCooldown | undefined {
  if (order === "legion_area" || order === "legion_single") return "legion";
  if (order === "whirlwind" || order === "power") return order;
}

export function demonOrderAvailable(state: { turnNumber: number }, demon: { summon?: SummonedEntity }, order: DemonOrder): boolean {
  const pet = demon.summon;
  if (!pet || !(pet.kind === "imp" ? impOrders : pet.kind === "guard" ? guardOrders : undefined)?.has(order)) return false;
  const key = orderCooldown(order);
  return !key || (pet.demonReadyTurns?.[key] ?? 0) <= state.turnNumber;
}

export function validateDemonAction(state: GameState, owner: PlayerState, action: SkillAction): string | undefined {
  if (action.stacks !== 1) return "召唤和恶魔指令均只能逐次使用";
  if (isDemonOrderSkill(action.skillId)) {
    if (state.activeTimingPhase !== "turn_before_action") return "只能在回合初给恶魔下令";
    const pet = controlledDemons(state, owner.id, action.skillId).find(({ id }) => id === action.demonId);
    const order = action.demonOrder;
    if (!pet || !order || !demonOrderAvailable(state, pet, order)) return "请选择待命或可用的恶魔指令";
    if (["fireball", "legion_area", "legion_single"].includes(order) &&
      !demonOrderTargets(state, pet).some(({ id }) => id === action.targetId)) return "请选择恶魔能够指向的目标";
    return;
  }
  if (!demonSummonUses(state, owner, action.skillId, action.bigCardInstanceId)) return "该恶魔的召唤次数不足";
  if (!getActiveSkillCount(owner, DEMON_ABYSS_ID) && state.players.some((player) =>
    player.status === "alive" && player.summon?.ownerId === owner.id && player.entityClasses?.includes("demon")))
    return "场上已有你的恶魔，需恶魔深渊生效才能继续召唤";
  if (isTargetedDemonSummon(action.skillId) &&
    !demonSummonTargets(state, owner).some(({ id }) => id === action.targetId)) return "请选择同空间的其他存活目标";
  if (action.skillId === DEMON_GUARD_ID && action.demonPlacement !== "front" &&
    action.demonPlacement !== "left" && action.demonPlacement !== "right") return "请选择恶魔卫士的部署位置";
}

export function setDemonOrder(state: GameState, action: SkillAction): void {
  const demon = findPlayer(state, action.demonId ?? "");
  const pet = demon?.summon;
  const order = action.demonOrder;
  if (!pet || !order) return;
  if (order === "power") {
    pet.demonPowered = true;
    (pet.demonReadyTurns ??= {}).power = state.turnNumber + cooldowns.power;
  } else {
    pet.demonOrder = order;
    if (action.targetId) pet.demonTargetId = action.targetId;
    else delete pet.demonTargetId;
  }
}

export function summonDemon(state: GameState, owner: PlayerState, action: SkillAction, suppressed: boolean): PlayerState | undefined {
  const rule = summonRules[action.skillId];
  const card = owner.bigCards?.find((entry) => (!action.bigCardInstanceId || entry.instanceId === action.bigCardInstanceId) &&
    availableSummons(state.turnNumber, entry, action.skillId));
  if (!rule || !card) return;
  const uses = card.abilityUses ??= {};
  uses[action.skillId] = (uses[action.skillId] ?? 0) + 1;
  if (suppressed) return;
  const target = findPlayer(state, action.targetId ?? "");
  if (rule.kind === "fear_hound" && target) {
    spawnHounds(state, owner, target, true);
    return;
  }
  const anchor = rule.kind === "evil_hound" && target ? target : owner;
  const side = action.skillId === DEMON_GUARD_ID && action.demonPlacement !== "front" ? action.demonPlacement : undefined;
  const order = nextCreationOrder(state);
  const demon = createPlayer(`${owner.name}的${rule.name} ${order}`, "ai");
  demon.connected = false;
  demon.hp = rule.hp;
  demon.baseInitialHp = rule.hp;
  demon.entityClasses = rule.kind === "evil_hound" ? ["demon", "hound"] : ["demon"];
  if (owner.spaceId) demon.spaceId = owner.spaceId;
  demon.buffs.push({ id: `puppet_of:${owner.id}`, name: "恶魔傀儡", stacks: 1, sourcePlayerId: owner.id });
  const zone = side && flankTableZone(state, anchor, side);
  demon.summon = { kind: rule.kind, ownerId: owner.id, targetId: anchor.id,
    ...(side ? { side, ...(zone ? { tableZoneAfterPlayerId: zone } : {}) } :
      { tableFrontPlayerId: anchor.summon?.tableFrontPlayerId ?? anchor.summon?.tableZoneAfterPlayerId ?? anchor.id }),
    ...((rule.kind === "imp" || rule.kind === "guard") && state.activeTimingPhase === "turn_before_action" ?
      { demonOrdersFromTurn: state.turnNumber } : {}),
    tableCreationOrder: order, firstTurn: state.turnNumber, expiresAtTurn: Number.MAX_SAFE_INTEGER };
  if (side) state.players.splice(state.players.indexOf(anchor) + (side === "right" ? 1 : 0), 0, demon);
  else state.players.push(demon);
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${owner.name}召唤${rule.hp}血的${rule.name}` });
  return demon;
}

export function evilHoundTarget<T extends DemonPlayer>(state: { players: readonly T[] }, player: Pick<DemonPlayer, "id" | "spaceId"> | undefined): T | undefined {
  if (!player) return;
  return state.players.filter((target) => target.status === "alive" && target.spaceId === player.spaceId &&
    target.summon?.kind === "evil_hound" && target.summon.targetId === player.id)
    .sort((a, b) => (a.summon?.tableCreationOrder ?? 0) - (b.summon?.tableCreationOrder ?? 0))[0];
}

export function demonMoveTarget(state: GameState, sourceId: string, targetId: string, area: boolean): string {
  if (area || sourceId === targetId) return targetId;
  const target = findPlayer(state, targetId);
  if (!target || target.status !== "alive") return targetId;
  return state.players.filter((player) => player.status === "alive" && player.spaceId === target.spaceId &&
    player.id !== sourceId && player.summon?.kind === "voidwalker" && player.summon.ownerId === targetId)
    .sort((a, b) => (a.summon?.tableCreationOrder ?? 0) - (b.summon?.tableCreationOrder ?? 0))[0]?.id ?? targetId;
}

export function applyLegionLock(state: GameState, targetId: string, sourceId: string): void {
  applyNegativeStatus(state, targetId, DEMON_LEGION_LOCK, (target, appliedBy) => {
    const id = `${DEMON_LEGION_LOCK}:${appliedBy ?? sourceId}`;
    const existing = target.buffs.find((buff) => buff.id === id);
    if (existing) existing.expiresAtTurn = state.turnNumber + 5;
    else target.buffs.push({ id, stateType: DEMON_LEGION_LOCK, name: "军团打击·无法出招", stacks: 1,
      sourceAbilityId: DEMON_GUARD_ID, sourcePlayerId: appliedBy ?? sourceId, expiresAtTurn: state.turnNumber + 5,
      moveBlockedFromTurn: state.turnNumber + 1 });
  }, sourceId);
}

function demonActions(state: GameState, demon: PlayerState, pet: SummonedEntity): PlayerAction[] {
  if (pet.kind === "fear_hound" || pet.kind === "evil_hound") {
    const bite = houndActions(state, demon)[0];
    return bite?.type === "attack" && bite.targetId
      ? [{ type: "skill", skillId: pet.kind === "fear_hound" ? DEMON_FEAR_BITE : DEMON_EVIL_BITE, stacks: 1, targetId: bite.targetId }] : [];
  }
  if (pet.kind === "voidwalker") return [{ type: "attack", attackId: "nan_man", stacks: 1 }];
  const order = pet.demonOrder;
  if (!canFollowDemonOrders(pet, state.turnNumber) || !order || order === "standby" || !demonOrderAvailable(state, demon, order)) return [];
  if (["fireball", "legion_area", "legion_single"].includes(order) &&
    !demonOrderTargets(state, demon).some(({ id }) => id === pet.demonTargetId)) return [];
  if (pet.kind === "imp" && order === "fireball" && pet.demonTargetId)
    return [{ type: "skill", skillId: "1077", stacks: 1, targetId: pet.demonTargetId }];
  if (pet.kind !== "guard") return [];
  const key = orderCooldown(order);
  if (key) (pet.demonReadyTurns ??= {})[key] = state.turnNumber + cooldowns[key];
  const skillId = order === "whirlwind" ? DEMON_WHIRLWIND : order === "legion_area" ? DEMON_LEGION_AREA : DEMON_LEGION_SINGLE;
  const action: SkillAction = { type: "skill", skillId, stacks: 1,
    ...(pet.demonTargetId ? { targetId: pet.demonTargetId } : {}) };
  if (order === "whirlwind" && pet.demonPowered) {
    // The flag is captured on this declaration so repeated target resolution uses the same charge.
    action.demonPoweredWhirlwind = true;
    delete pet.demonPowered;
  }
  return [action];
}

export function prepareDemonTurn(state: GameState): void {
  for (const player of state.players) {
    const pet = player.summon;
    if (player.status === "alive" && pet && pet.kind !== "hound")
      state.pendingActions[player.id] ??= { actions: demonActions(state, player, pet) };
  }
}

export function demonTyrantAuraDrain(player: Pick<PlayerState, "status" | "summon">): CombatValue | undefined {
  if (player.status !== "alive" || player.summon?.kind !== "tyrant") return;
  const drain = player.summon.tyrantDrain;
  return drain && compareCombatValues(drain, []) > 0 ? drain : undefined;
}

function demonAuras(state: GameState, demon: PlayerState): CombatValue[] {
  if (!demon.entityClasses?.includes("demon")) return [];
  return state.players.flatMap((player) => {
    const drain = player.spaceId === demon.spaceId ? demonTyrantAuraDrain(player) : undefined;
    return drain ? [drain] : [];
  });
}

export function recordTyrantDrain(tyrant: PlayerState | undefined, amount: CombatValue): void {
  if (tyrant?.summon?.kind === "tyrant")
    tyrant.summon.tyrantDrain = addCombatValues(tyrant.summon.tyrantDrain ?? [], amount);
}

function divideByFinite(value: CombatValue, divisor: number): CombatValue {
  return value.map(({ exponent, coefficient }) => ({ exponent, coefficient: coefficient / divisor }));
}

export function tyrantEntryDamage(hp: CombatValue): CombatValue {
  return roundCombatValue(divideByFinite(hp, 5), Math.floor);
}

export function demonDamageAfterReduction(state: GameState, target: PlayerState, amount: CombatValue): CombatValue {
  const auras = isSkillIgnored(target, DEMON_TYRANT_ID) ? [] : demonAuras(state, target);
  if (target.summon?.kind === "voidwalker" && !isSkillIgnored(target, DEMON_VOIDWALKER_ID)) amount = divideByFinite(amount, 100);
  for (const x of auras) {
    const lead = x[0]!;
    amount = lead.exponent === 0 ? divideByFinite(amount, lead.coefficient) : divideCombatDamage(amount, x);
  }
  return auras.length ? roundCombatValue(amount, Math.floor) : amount;
}

export function demonAttackStats(source: PlayerState | undefined, action: PlayerAction, fallback: AttackStats | undefined): AttackStats | undefined {
  if (!fallback || action.type !== "skill") return fallback;
  if (action.skillId === DEMON_LEGION_AREA) return { ...fallback, isArea: true };
  if (action.skillId === DEMON_WHIRLWIND && source?.summon?.kind === "guard" && action.demonPoweredWhirlwind)
    return withAttackLevel(withAttackPower(fallback, combatValue(100)), combatValue(200));
  return fallback;
}

export function empowerDemonAttack(state: GameState, source: PlayerState | undefined, stats: AttackStats): AttackStats {
  if (!source) return stats;
  const auras = demonAuras(state, source);
  if (!auras.length) return stats;
  const fireball = source.summon?.kind === "imp" && stats.id === "1077";
  let power = attackPowerValue(stats);
  let level = attackLevelValue(stats);
  for (const x of auras) {
    power = multiplyCombatValues(power, x);
    if (!fireball) continue;
    power = multiplyCombatValues(power, x);
    level = multiplyCombatValues(level, x);
  }
  // Divide after multiplying so equal factors do not become fractions just below an integer.
  const powerDivisor = fireball ? TYRANT_ATTACK_DIVISOR * TYRANT_FIREBALL_DIVISOR : TYRANT_ATTACK_DIVISOR;
  const result = withAttackPower(stats, roundCombatValue(divideByFinite(power, powerDivisor ** auras.length), Math.floor));
  return fireball ? withAttackLevel(result, roundCombatValue(divideByFinite(level, TYRANT_FIREBALL_DIVISOR ** auras.length), Math.floor)) : result;
}
