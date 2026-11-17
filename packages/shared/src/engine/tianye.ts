import type { AttackStats, BuffState, GameState, PlayerId, PlayerState } from "../types";
import { bigCardHasAbility } from "../bigCards/abilities";
import { combatValue, projectCombatValue, RETIRE_VALUE } from "./combatValues";
import { createBaseEvent, getActiveSkillCount } from "./gameFactory";
import { effectIsSuppressed, isThornSkillDisabled, negativeStatusesHaveNoEffect, registerStateDefinition } from "./effectCategories";
import { isSkillIgnored } from "./skillIgnore";
import { canGainStatus } from "./karmaSong";
import { swordArrayNoCakeSuppressesPassive } from "./swordArrayControl";
import { TIAN_YE_CHOICE_ID, TIAN_YE_CHOICE_STATE, TIAN_YE_FALL_ID, TIAN_YE_GALE_ID, TIAN_YE_PURGE_ID,
  TIAN_YE_REBOUND_LOCK, TIAN_YE_ROLL_ID, TIAN_YE_SOARING_ID, TIAN_YE_WING_DETAILS, TIAN_YE_WINGS,
  type TianyeWing, type TianyeWingChoice } from "./tianyeIds";

export interface TianyeTurn {
  turn: number;
  settled?: true;
  activations: Array<{ playerId: PlayerId; cardId: string; wing: TianyeWing; choice?: TianyeWingChoice }>;
  reboundBanAttempts?: Record<PlayerId, PlayerId[]>;
}

for (const { stateType, name } of Object.values(TIAN_YE_WING_DETAILS))
  registerStateDefinition({ id: stateType, name, categories: ["special"] });
export function isTianyeWingChoice(wing: unknown): wing is TianyeWingChoice {
  return wing === TIAN_YE_SOARING_ID || wing === TIAN_YE_PURGE_ID || wing === TIAN_YE_FALL_ID || wing === TIAN_YE_GALE_ID;
}

export function tianyeChoiceOptions(player: Pick<PlayerState, "buffs"> | undefined, turn: number): string[] {
  return player?.buffs.flatMap((buff) => buff.stateType === TIAN_YE_CHOICE_STATE && buff.stacks === 0 &&
    buff.expiresAtTurn === turn + 1 && buff.sourceBigCardInstanceId ? [buff.sourceBigCardInstanceId] : []) ?? [];
}

export function hasTianyeWing(player: Pick<PlayerState, "buffs" | "bigCards"> | undefined, wing: TianyeWing, turn: number): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === TIAN_YE_WING_DETAILS[wing].stateType &&
    (buff.stacks > 0 || wing === TIAN_YE_CHOICE_ID) && buff.expiresAtTurn === turn + 1 &&
    (wing !== TIAN_YE_SOARING_ID || tianyeSoaringStateIsActive(player, buff)) &&
    !isSkillIgnored(player, wing)));
}

function soaringWingIsInvalid(player: Pick<PlayerState, "buffs" | "bigCards">): boolean {
  return isThornSkillDisabled(player, TIAN_YE_SOARING_ID) || swordArrayNoCakeSuppressesPassive(player, TIAN_YE_SOARING_ID);
}

export function tianyeSoaringStateIsActive(player: Pick<PlayerState, "buffs" | "bigCards">, buff: BuffState): boolean {
  return buff.stacks > 0 && (buff.id.endsWith(":chosen") || !soaringWingIsInvalid(player));
}

export function chooseTianyeWing(state: GameState, player: PlayerState, wing: TianyeWingChoice, cardId?: string): void {
  const options = tianyeChoiceOptions(player, state.turnNumber);
  const selectedCardId = cardId ?? options[0];
  const activation = state.tianyeTurn?.activations.find((entry) => entry.playerId === player.id && entry.cardId === selectedCardId &&
    entry.wing === TIAN_YE_CHOICE_ID && !entry.choice);
  if (!activation) return;
  activation.choice = wing;
  const pending = player.buffs.find((buff) => buff.stateType === TIAN_YE_CHOICE_STATE && buff.sourceBigCardInstanceId === selectedCardId);
  if (pending) pending.stacks = 1;
}

export function giveTianyeWing(player: PlayerState, wing: TianyeWing, turn: number, cardId: string, chosen = false, pending = false): void {
  if (!canGainStatus(player)) return;
  const { stateType, name } = TIAN_YE_WING_DETAILS[wing];
  player.buffs.push({ id: `${stateType}:${cardId}${chosen ? ":chosen" : pending ? ":pending" : ""}`, stateType, name,
    stacks: pending ? 0 : 1, sourceAbilityId: wing, sourceBigCardInstanceId: cardId, expiresAtTurn: turn + 1,
    ...(wing === TIAN_YE_SOARING_ID ? { preventsTargetSelection: true } : {}) });
}

export function rollTianyeWings(state: GameState): void {
  if (state.tianyeTurn?.turn === state.turnNumber) return;
  delete state.tianyeTurn;
  for (const player of state.players) {
    const enabled = getActiveSkillCount(player, TIAN_YE_ROLL_ID);
    if (player.status !== "alive" || !enabled || effectIsSuppressed(player, TIAN_YE_ROLL_ID)) continue;
    const turn = state.tianyeTurn ??= { turn: state.turnNumber, activations: [] };
    const availableCards = (player.bigCards ?? []).filter((card) => !card.junengDisabled && bigCardHasAbility(card, TIAN_YE_ROLL_ID));
    for (const card of availableCards.slice(0, enabled)) {
      const pool = TIAN_YE_WINGS.filter((wing) => wing !== card.tianyeLastWing);
      const wing = pool[Math.floor(Math.random() * pool.length)]!;
      card.tianyeLastWing = wing;
      const succeeds = Math.random() < 1 / 8;
      const invalid = wing === TIAN_YE_SOARING_ID ? soaringWingIsInvalid(player) : effectIsSuppressed(player, wing);
      const available = bigCardHasAbility(card, wing) && !invalid && !isSkillIgnored(player, wing);
      state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id,
        probabilityChecks: { skillId: TIAN_YE_ROLL_ID, playerId: player.id, chance: 1 / 8,
          attempts: combatValue(1), successes: succeeds ? combatValue(1) : [] },
        message: `闪灭之翼抽中${TIAN_YE_WING_DETAILS[wing].name}，判定${succeeds ? "成功" : "失败"}` });
      if (!succeeds || !available || !canGainStatus(player)) continue;
      turn.activations.push({ playerId: player.id, cardId: card.instanceId, wing });
      if (wing === TIAN_YE_CHOICE_ID) giveTianyeWing(player, wing, state.turnNumber, card.instanceId, false, true);
    }
  }
}

export function hasTianyeReboundLock(player: Pick<PlayerState, "buffs" | "bigCards"> | undefined, turn: number): boolean {
  return !negativeStatusesHaveNoEffect(player) && Boolean(player?.buffs.some((buff) =>
    buff.stateType === TIAN_YE_REBOUND_LOCK && (buff.moveBlockedFromTurn ?? turn) <= turn));
}

export function ignoresUpperRealmPressure(player: Pick<PlayerState, "buffs"> | undefined, turn: number): boolean {
  return hasTianyeWing(player, TIAN_YE_CHOICE_ID, turn);
}

export function shapeTianyeFall(stats: AttackStats, isArea = true): AttackStats {
  const { damageParts: _parts, damagePartValues: _values, damageHits: _hits, divineRiftRank: _rank,
    repeatedDamageParts: _repeated, honghuangLastRetires: _lastPart, cannonDefensePending: _challenge, ...base } = stats;
  const traits = base.traits.filter((trait) => trait !== "area" && !trait.startsWith("defeat_"));
  if (isArea) traits.push("area");
  traits.push("defeat_retire");
  return { ...base, power: projectCombatValue(RETIRE_VALUE), powerValue: RETIRE_VALUE, fixedPointPower: true,
    isArea, includeSelf: false, defenseTag: "unblockable", ignoreRebounds: true, tianyeFall: true, traits };
}
