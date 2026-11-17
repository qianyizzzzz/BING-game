import type { GameState, PlayerState, PlayerAction, SkillAction } from "../types";
import { createBaseEvent, createId, createPlayer, findPlayer, getActiveSkillCount } from "./gameFactory";
import { bigCardHasAbility } from "../bigCards/abilities";
import { INFINITY_VALUE } from "./combatValues";
import { negativeStatusesHaveNoEffect, registerStateDefinition } from "./effectCategories";
import { applyNegativeStatus } from "./negativeStatuses";
import { canGainStatus } from "./karmaSong";
import { isSkillIgnored } from "./skillIgnore";
import { canAffectAcrossSpace } from "./spaces";
import { getTablePlayers, initializeTableSeats } from "./seating";
import { BEAR_ROAR_ID, BEAR_STATE, BEAST_KILL_ID, FEAR_STATE, HOUND_SUMMON_ID, type SummonedEntity } from "./beastTraits";
import { DEMON_FEAR_HOUND_ID } from "./demonIds";
import { getPeriodicUses, periodicCardUseKey } from "./limitedUseBalance";

registerStateDefinition({ id: BEAR_STATE, name: "雄风", categories: ["positive"] });

export function houndBiteIsArea(player: Pick<PlayerState, "skills" | "buffs" | "skillFusions" | "bigCards"> | undefined): boolean {
  return getActiveSkillCount(player, "1053") > 0;
}

export function nextCreationOrder(state: GameState): number {
  return state.players.reduce((last, player) => Math.max(last, player.summon?.tableCreationOrder ?? 0), 0) + 1;
}

export function flankTableZone(state: GameState, target: PlayerState, side: "left" | "right"): string | undefined {
  initializeTableSeats(state);
  const anchor = target.summon?.tableFrontPlayerId ? findPlayer(state, target.summon.tableFrontPlayerId) ?? target : target;
  const table = getTablePlayers(state);
  const targetSeat = table.findIndex(({ id }) => id === anchor.id);
  return anchor.summon?.tableZoneAfterPlayerId ??
    (targetSeat < 0 ? undefined : side === "right" ? anchor.id : table[(targetSeat - 1 + table.length) % table.length]?.id);
}

export function spawnHounds(state: GameState, source: PlayerState, target: PlayerState, demonic = false): PlayerState[] {
  const creationOrder = nextCreationOrder(state);
  const hp = demonic ? 30 : 36;
  const hounds = (["left", "right"] as const).map((side, index) => {
    const hound = createPlayer(`${source.name}的${demonic ? "恐惧猎犬" : "猎犬"} ${creationOrder + index}`, "ai");
    hound.connected = false;
    hound.hp = hp;
    hound.skills = demonic ? [] : ["1025"];
    hound.entityClasses = demonic ? ["demon", "hound"] : ["animal", "hound"];
    hound.baseInitialHp = hp;
    if (target.spaceId) hound.spaceId = target.spaceId;
    const zone = flankTableZone(state, target, side);
    hound.summon = { kind: demonic ? "fear_hound" : "hound", ownerId: source.id, targetId: target.id, side,
      ...(zone ? { tableZoneAfterPlayerId: zone } : {}),
      tableCreationOrder: creationOrder + index,
      firstTurn: state.turnNumber, expiresAtTurn: demonic ? Number.MAX_SAFE_INTEGER : state.turnNumber + 10 } satisfies SummonedEntity;
    hound.buffs.push({ id: `puppet_of:${source.id}`, name: "猎犬傀儡", stacks: 1, sourcePlayerId: source.id });
    if (!demonic) hound.buffs.push({ id: "hound_rebound", stateType: "skill_rebound", name: "猎犬后盾", stacks: 1,
      sourceAbilityId: "1025", skillReflectLimit: INFINITY_VALUE, expiresAtTurn: state.turnNumber + 1 });
    return hound;
  });
  const seatId = target.summon?.tableFrontPlayerId ?? target.id;
  const index = state.players.findIndex((player) => player.id === seatId);
  state.players.splice(index, 0, hounds[0]!);
  state.players.splice(state.players.findIndex((player) => player.id === seatId) + 1, 0, hounds[1]!);
  if (!demonic) for (const hound of hounds) state.pendingActions[hound.id] = { actions: houndActions(state, hound) };
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${source.name}在${target.name}两侧召唤两只${hp}血${demonic ? "恐惧猎犬" : "猎犬，各持续10回合"}` });
  return hounds;
}

export function houndActions(state: GameState, hound: PlayerState): PlayerAction[] {
  const pet = hound.summon;
  const target = pet && findPlayer(state, pet.targetId);
  if (!pet || hound.status !== "alive" || pet.expiresAtTurn <= state.turnNumber ||
    target?.status !== "alive" || target.id === pet.ownerId || !canAffectAcrossSpace(state, hound.id, target.id)) return [];
  return [{ type: "attack", attackId: "sha", stacks: 1, targetId: target.id }];
}

export function applyFear(state: GameState, target: PlayerState, sourceId: string, protectsOwner = false, demonic = false): void {
  applyNegativeStatus(state, target.id, FEAR_STATE, (recipient, appliedBy) => {
    const owner = appliedBy ?? sourceId;
    const id = `${FEAR_STATE}:${owner}${demonic ? ":demon" : ""}`;
    const expiresAtTurn = state.turnNumber + (demonic ? 5 : 10);
    const existing = recipient.buffs.find((buff) => buff.id === id);
    if (existing) {
      existing.expiresAtTurn = expiresAtTurn;
      if (protectsOwner) existing.beastProtectedPlayerId = owner;
    } else recipient.buffs.push({ id, stateType: FEAR_STATE, name: "恐惧", stacks: 1, sourcePlayerId: owner,
      sourceAbilityId: demonic ? DEMON_FEAR_HOUND_ID : protectsOwner ? HOUND_SUMMON_ID : BEAR_ROAR_ID, expiresAtTurn,
      ...(demonic ? { uncleansable: true as const } : {}),
      ...(protectsOwner ? { beastProtectedPlayerId: owner } : {}) });
  }, sourceId);
}

export function prepareBeastTurn(state: GameState): void {
  for (const player of state.players) {
    if (player.status !== "alive") continue;
    if (player.summon) {
      const shield = player.buffs.find((buff) => buff.id === "hound_rebound");
      if (shield) shield.expiresAtTurn = state.turnNumber + 1;
    }
    if (!negativeStatusesHaveNoEffect(player) && player.buffs.some((buff) => buff.stateType === FEAR_STATE &&
      (buff.expiresAtTurn ?? 0) > state.turnNumber) && !state.pendingActions[player.id]) {
      const roll = Math.floor(Math.random() * 4);
      const action: PlayerAction = roll === 0 ? { type: "gain_cake" } :
        { type: "defense", defense: (["small", "youtiao", "stone"] as const)[roll - 1]! };
      state.pendingActions[player.id] = { actions: [action] };
      state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name}因恐惧自动提交本回合出招` });
    }
    if (player.summon?.kind === "hound") state.pendingActions[player.id] ??= { actions: houndActions(state, player) };
    for (const buff of player.buffs.filter((entry) => entry.stateType === BEAR_STATE && entry.beastRolledTurn !== state.turnNumber)) {
      buff.beastRolledTurn = state.turnNumber;
      buff.beastRoarActive = !isSkillIgnored(player, BEAR_ROAR_ID) && Math.random() < 0.2;
    }
  }
}

export function expireHounds(state: GameState): PlayerState[] {
  const expired: PlayerState[] = [];
  for (const hound of state.players) if (hound.summon && hound.status === "alive" && hound.summon.expiresAtTurn <= state.turnNumber) {
    hound.status = "dead";
    hound.defeatLevel = 3;
    delete state.pendingActions[hound.id];
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${hound.name}持续时间结束，自行消失` });
    expired.push(hound);
  }
  return expired;
}

export function bearIsActive(player: PlayerState | undefined, turn: number): boolean {
  return Boolean(player && !isSkillIgnored(player, BEAR_ROAR_ID) && player.buffs.some((buff) =>
    buff.stateType === BEAR_STATE && buff.beastRolledTurn === turn && buff.beastRoarActive));
}

export function addBearRoar(state: GameState, player: PlayerState, action: SkillAction): void {
  const card = player.bigCards?.find((entry) => (!action.bigCardInstanceId || entry.instanceId === action.bigCardInstanceId) &&
    bigCardHasAbility(entry, BEAR_ROAR_ID) && (entry.bearReadyRound ?? 0) <= state.roundNumber &&
    getPeriodicUses(player, periodicCardUseKey(BEAR_ROAR_ID, entry.instanceId), state.roundNumber, 1) > 0);
  if (!card) return;
  card.bearReadyRound = state.roundNumber + 5;
  if (!canGainStatus(player)) return;
  player.buffs.push({ id: createId(BEAR_STATE), name: "雄风", stateType: BEAR_STATE, stacks: 1,
    sourceAbilityId: BEAR_ROAR_ID, sourceBigCardInstanceId: card.instanceId,
    ...(["opening_action", "round_pre_interval_action", "round_before_action", "turn_before_action"].includes(state.activeTimingPhase) ? {} : { beastRolledTurn: state.turnNumber }) });
}

const intervalPhases = new Set(["turn_end_action", "turn_after_interval_action", "turn_before_action",
  "round_end_check", "turn_end_check", "turn_start_check", "round_start_check",
  "round_after_interval_action", "round_pre_interval_action", "round_before_action"]);
export function isHoundPressureBlocked(state: GameState, targetId: string, sourceId: string | undefined): boolean {
  const source = sourceId && findPlayer(state, sourceId);
  return Boolean(source && intervalPhases.has(state.activeTimingPhase) && !negativeStatusesHaveNoEffect(source) &&
    source.buffs.some((buff) => buff.stateType === FEAR_STATE && buff.beastProtectedPlayerId === targetId &&
      (buff.expiresAtTurn ?? 0) > state.turnNumber));
}

export function beastIgnoresDistance(player: PlayerState | undefined, turn: number): boolean {
  return Boolean(player?.buffs.some((buff) => buff.id === `${BEAST_KILL_ID}:distance` && buff.expiresAtTurn === turn + 1));
}
