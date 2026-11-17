import { FIRE_TALISMAN_ID, WATER_TALISMAN_ID, WOOD_TALISMAN_ID, TALISMAN_GENERATE_ID,
  TALISMAN_OVERCOME_ID, TALISMAN_RULE_ID } from "../bigCards/abilities";
import type { GameState, PlayerState } from "../types";
import { removeStateCategory } from "./effectCategories";
import { createBaseEvent, findPlayer, getActiveSkillCount } from "./gameFactory";
import { applyNegativeStatus } from "./negativeStatuses";
import { changeCakes } from "./cakeResources";
import { clearDefenseValue } from "./sand";
import { shareSpace } from "./spaces";

import { excludedByTripleSeal, hasTalisman, TALISMAN_ELEMENTS as elements, talismanState,
  talismanStatusId as statusId, WATER_TALISMAN_INVALIDATION as WATER_INVALIDATION, type Talisman } from "./talismanRules";

const ids = { fire: FIRE_TALISMAN_ID, water: WATER_TALISMAN_ID, wood: WOOD_TALISMAN_ID };
const names = { fire: "火之灵符", water: "水之灵符", wood: "木之灵符" };
const nextElement = { fire: "water", water: "wood", wood: "fire" } as const;
const BASE_DURATION = 3;
const TICK_INTERVAL = 3;

export function talismanKind(skillId: string): Talisman | undefined {
  return elements.find((kind) => ids[kind] === skillId);
}

export function attachTalisman(state: GameState, caster: PlayerState, target: PlayerState, kind: Talisman): boolean {
  return applyNegativeStatus(state, target.id, statusId(kind), (recipient, appliedBy) => {
    const source = appliedBy ? findPlayer(state, appliedBy) : caster;
    if (excludedByTripleSeal(recipient)) return;
    let duration = BASE_DURATION;
    for (const oldKind of elements) {
      if (oldKind === kind) continue;
      const old = talismanState(recipient, oldKind, state.roundNumber);
      if (!old) continue;
      if (nextElement[oldKind] === kind && getActiveSkillCount(source, TALISMAN_OVERCOME_ID)) {
        duration = 6;
        old.expiresAtRound = state.roundNumber + 1;
      } else if (nextElement[kind] === oldKind && getActiveSkillCount(source, TALISMAN_GENERATE_ID)) {
        duration = duration === 6 ? 6 : 2;
        old.expiresAtRound = state.roundNumber + (old.talismanDuration ?? BASE_DURATION);
      }
    }
    const existing = talismanState(recipient, kind, state.roundNumber);
    if (existing) {
      existing.expiresAtRound = Math.max(existing.expiresAtRound ?? 0, state.roundNumber + duration);
      existing.talismanDuration = Math.max(existing.talismanDuration ?? BASE_DURATION, duration);
      if (appliedBy) existing.sourcePlayerId = appliedBy;
    } else {
      recipient.buffs.push({ id: statusId(kind), stateType: statusId(kind), name: names[kind], stacks: 1,
        sourceAbilityId: ids[kind], ...(appliedBy ? { sourcePlayerId: appliedBy } : {}),
        expiresAtRound: state.roundNumber + duration, talismanDuration: duration,
        ...(kind !== "wood" ? { talismanNextTick: state.turnNumber + TICK_INTERVAL } : {}) });
    }
    if (!state.players.some((player) => player.status === "alive" && shareSpace(player, recipient) &&
      getActiveSkillCount(player, TALISMAN_RULE_ID))) return;
    const set = elements.map((element) => talismanState(recipient, element, state.roundNumber));
    if (set.some((entry) => !entry)) return;
    for (const status of set) {
      status!.uncleansable = true;
      delete status!.expiresAtRound;
    }
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${recipient.name} 受到三圣镇魂，三种灵符变为永久规则，且不计为场上人数` });
  }, caster.id);
}

export function tickTalismans(state: GameState, cleanseOngoing: (target: PlayerState) => void): void {
  for (const player of state.players) {
    if (player.status !== "alive" || player.kind === "spectator") continue;
    for (const kind of ["fire", "water"] as const) {
      const status = talismanState(player, kind, state.roundNumber);
      if (!status || (status.talismanNextTick ?? Infinity) > state.turnNumber) continue;
      status.talismanNextTick = state.turnNumber + TICK_INTERVAL;
      if (!hasTalisman(player, kind, state.roundNumber)) continue;
      if (kind === "fire") {
        removeStateCategory(player, "positive");
        clearDefenseValue(state, player, status.sourcePlayerId);
        changeCakes(state, player.id, Math.max(0, player.cakes - 1), "火之灵符");
      } else {
        cleanseOngoing(player);
        player.buffs = player.buffs.filter((buff) => buff.id !== WATER_INVALIDATION);
        player.buffs.push({ id: WATER_INVALIDATION, stateType: WATER_INVALIDATION, name: "水之灵符·本回合出招无效", stacks: 1,
          expiresAtTurn: state.turnNumber + 1 });
      }
    }
  }
}
