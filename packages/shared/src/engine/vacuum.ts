import type { AttackStats, DefeatLevel, GameState, PendingDamageItem, PlayerAction, PlayerState, SkillAction } from "../types";
import { bigCardHasAbility } from "../bigCards/abilities";
import { getFusionJudgmentRank, getFusionRecipe, isFusionActive } from "../skills/fusion";
import { changeCakes } from "./cakeResources";
import { INVENTORY_ITEM_STATE_TYPE, registerStateDefinition } from "./effectCategories";
import { createBaseEvent, createId, getActiveSkillCount } from "./gameFactory";
import { changeElementAmount, getElementAmount } from "./elementResources";
import { YOUKAI_ELEMENT, YOUKAI_RESOURCE_ID } from "./youkaiIds";
import { canGainStatus } from "./karmaSong";
import { getPeriodicUses, invertPeriodicUses, periodicCardUseKey } from "./limitedUseBalance";
import { judgmentRankAtLeast, nextJudgmentRank, readJudgmentRank, type JudgmentRank } from "./judgmentRank";
import { VACUUM_CARD_ID, VACUUM_DODGE, VACUUM_ENTER_ID, VACUUM_EXTRACT_ID, VACUUM_FLUCTUATION_ID, VACUUM_INHERIT_ID, VACUUM_ITEM,
  VACUUM_MAX_ID, VACUUM_MAX_RANK, VACUUM_PAYMENT_ID, VACUUM_PROGRESS, VACUUM_SPACE, VACUUM_STATE, VACUUM_STATE_ID, VACUUM_UNLIMITED_ID } from "./vacuumIds";

const VACUUM_BROKEN = "vacuum_broken";
const VACUUM_ENTRY = "vacuum_entry";
const VACUUM_TURN_CAKE = "vacuum_turn_cake";
const VOID_STOCK = "vacuum_extra";
const VOID_USED = "vacuum_normal_used";
const VOID_FLASH = "1102";
registerStateDefinition({ id: VACUUM_STATE, name: "真空／绝对真空", categories: [] });

type VacuumState = Pick<GameState, "roundNumber" | "smallSpaces">;
type VacuumOwner = Pick<PlayerState, "skills" | "buffs" | "skillFusions" | "bigCards"> & Partial<Pick<PlayerState, "id" | "spaceId" | "cakes">>;

export function inVacuumSpace(state: Pick<GameState, "smallSpaces">, player: { spaceId?: string }): boolean {
  return Boolean(player.spaceId && state.smallSpaces?.[player.spaceId]?.kind === VACUUM_SPACE);
}

export function vacuumMode(state: VacuumState, player: VacuumOwner): "vacuum" | "absolute" | undefined {
  if (inVacuumSpace(state, player)) return "absolute";
  if (!getActiveSkillCount(player, VACUUM_STATE_ID)) return undefined;
  const buff = player.buffs.find((entry) => entry.id === VACUUM_STATE);
  if (!buff) return undefined;
  return state.roundNumber >= (buff.startsAtRound ?? state.roundNumber) + 3 ? "absolute" : "vacuum";
}

export function breakVacuum(state: Pick<GameState, "roundNumber">, player: PlayerState): void {
  if (!getActiveSkillCount(player, VACUUM_STATE_ID)) return;
  player.buffs = player.buffs.filter((buff) => buff.id !== VACUUM_STATE && buff.id !== VACUUM_BROKEN);
  player.buffs.push({ id: VACUUM_BROKEN, name: "本轮已退出真空", stacks: 1, expiresAtRound: state.roundNumber + 1 });
}

export function refreshVacuum(state: VacuumState, player: PlayerState): void {
  if (!getActiveSkillCount(player, VACUUM_STATE_ID) || player.buffs.some((buff) =>
    buff.id === VACUUM_BROKEN && (buff.expiresAtRound ?? 0) > state.roundNumber)) return;
  let buff = player.buffs.find((entry) => entry.id === VACUUM_STATE);
  if (!buff) {
    buff = { id: VACUUM_STATE, stateType: VACUUM_STATE, name: "真空", stacks: 1, startsAtRound: state.roundNumber };
    player.buffs.push(buff);
  }
  buff.name = vacuumMode(state, player) === "absolute" ? "绝对真空" : "真空";
}

export function scheduleVacuumEntry(state: GameState, player: PlayerState, round = state.roundNumber + 1): void {
  player.buffs.push({ id: VACUUM_ENTRY, name: "遁入虚空·下轮进入", stacks: 1, startsAtRound: round });
}

export function settleVacuumRoundStart(state: GameState): void {
  for (const player of state.players) {
    const entry = player.buffs.find((buff) => buff.id === VACUUM_ENTRY && (buff.startsAtRound ?? Infinity) <= state.roundNumber);
    if (entry) {
      player.buffs = player.buffs.filter((buff) => buff !== entry);
      if (player.status === "alive") {
        const id = createId(VACUUM_SPACE);
        (state.smallSpaces ??= {})[id] = { name: "遁入虚空", kind: VACUUM_SPACE, cakeMultiplier: 1,
          expiresAtRound: state.roundNumber + 1, countsForVictory: true };
        player.spaceId = id;
        state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name} 遁入虚空，仍计入场上人数` });
      }
    }
    if (player.status === "alive") refreshVacuum(state, player);
  }
}

export function antiCakeCount(player: Pick<PlayerState, "buffs"> | undefined): number {
  return player?.buffs.find((buff) => buff.itemKind === VACUUM_ITEM)?.stacks ?? 0;
}

export function changeAntiCakes(player: PlayerState, delta: number): void {
  const buff = player.buffs.find((entry) => entry.itemKind === VACUUM_ITEM);
  const next = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, (buff?.stacks ?? 0) + delta));
  if (buff) {
    if (next) buff.stacks = next;
    else player.buffs = player.buffs.filter((entry) => entry !== buff);
  } else if (next) player.buffs.push({ id: VACUUM_ITEM, stateType: INVENTORY_ITEM_STATE_TYPE, itemKind: VACUUM_ITEM,
    name: "反饼", stacks: next, uncleansable: true });
}

export function settleVacuumCake(state: GameState, timing: "before" | "after"): void {
  for (const player of state.players) {
    if (player.status !== "alive") continue;
    const mode = vacuumMode(state, player);
    const temporary = player.buffs.some((buff) => buff.stateType === VACUUM_MAX_RANK && (buff.expiresAtTurn ?? 0) > state.turnNumber);
    const id = `${VACUUM_TURN_CAKE}:${timing}:${state.turnNumber}`;
    if (player.buffs.some((buff) => buff.id === id) || !(timing === "after" && temporary) &&
      (mode !== "vacuum" || !getActiveSkillCount(player, VACUUM_FLUCTUATION_ID))) continue;
    player.buffs.push({ id, stateType: VACUUM_TURN_CAKE, name: "真空涨落已结算", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
    if (timing === "before") changeCakes(state, player.id, player.cakes + 1, "真空涨落·回合前");
    else if (player.cakes >= 1) changeCakes(state, player.id, player.cakes - 1, temporary ? "浩渺真空·回合末" : "真空涨落·回合末");
    else changeAntiCakes(player, 1);
  }
}

export function canUseAntiCakes(state: VacuumState, player: VacuumOwner): boolean {
  return vacuumMode(state, player) === "absolute" && getActiveSkillCount(player, VACUUM_PAYMENT_ID) > 0;
}

export function availableCakeBalance(state: VacuumState, player: PlayerState): number {
  return player.cakes + youkaiCakeCount(player) + (canUseAntiCakes(state, player) ? antiCakeCount(player) : 0);
}

export function youkaiCakeCount(player: VacuumOwner | undefined): number {
  return getActiveSkillCount(player, YOUKAI_RESOURCE_ID) > 0 ? getElementAmount(player, YOUKAI_ELEMENT) : 0;
}

export function youkaiCakesForAction(action: PlayerAction, player?: PlayerState, cost = 0): number {
  if ("youkaiCakeSpent" in action && action.youkaiCakeSpent !== undefined) return action.youkaiCakeSpent;
  if (action.type === "defense" && action.defense === "rebound" && player) {
    return Math.min(youkaiCakeCount(player), Math.max(0, cost - antiCakesForAction(action) - player.cakes));
  }
  return 0;
}

export function antiCakesForAction(action: PlayerAction): number {
  return "antiCakeSpent" in action ? action.antiCakeSpent ?? 0 : 0;
}

export function validCakePayment(state: VacuumState, player: PlayerState, cost: number, anti: number, youkai = 0): boolean {
  return Number.isSafeInteger(anti) && anti >= 0 && Number.isFinite(youkai) && youkai >= 0 &&
    anti + youkai <= cost && youkai <= youkaiCakeCount(player) && cost - anti - youkai <= player.cakes &&
    (!anti || canUseAntiCakes(state, player) && anti <= antiCakeCount(player));
}

/** A mixed payment consumes the entire balance and its action is returned. */
export function payVacuumCakes(state: GameState, player: PlayerState, cost: number, anti: number, reason: string, youkai = 0): boolean {
  const mixed = anti > 0 && anti < cost;
  if (youkai > 0) changeElementAmount(player, YOUKAI_ELEMENT, -youkai);
  if (mixed) {
    changeCakes(state, player.id, 0, "反物质技术·混付清空");
    changeAntiCakes(player, -antiCakeCount(player));
  } else {
    if (anti) changeAntiCakes(player, -anti);
    if (cost > anti + youkai) changeCakes(state, player.id, player.cakes - (cost - anti - youkai), reason);
  }
  return mixed;
}

export function vacuumExtractCost(state: VacuumState, player: VacuumOwner): number {
  return 2 - Number(vacuumMode(state, player) === "absolute") - Number(inVacuumSpace(state, player));
}

export function vacuumFusionCopies(player: VacuumOwner) {
  return (player.skillFusions ?? []).filter((fusion) => getFusionRecipe(fusion.skillId)?.skill.name === "虚无" &&
    isFusionActive(player, fusion) && player.bigCards?.some((card) => card.cardId === VACUUM_CARD_ID &&
      card.instanceId === fusion.sourceBigCardInstanceId && !card.junengDisabled && bigCardHasAbility(card, VACUUM_INHERIT_ID)));
}

export function vacuumCardRank(state: Pick<GameState, "turnNumber">, player: VacuumOwner, cardId: string): JudgmentRank {
  if (player.buffs.some((buff) => buff.stateType === VACUUM_MAX_RANK && buff.sourceBigCardInstanceId === cardId &&
    (buff.expiresAtTurn ?? 0) > state.turnNumber)) return "X";
  const fusion = vacuumFusionCopies(player).find((copy) => copy.sourceBigCardInstanceId === cardId);
  return fusion ? getFusionJudgmentRank(fusion) : "II";
}

export function extraVacuumUses(player: VacuumOwner, cardId: string): number {
  return player.buffs.find((buff) => buff.id === `${VOID_STOCK}:${cardId}`)?.stacks ?? 0;
}

function usedNormalVacuum(player: VacuumOwner, round: number, cardId: string): boolean {
  return player.buffs.some((buff) => buff.id === `${VOID_USED}:${cardId}` && (buff.expiresAtRound ?? 0) > round);
}

export function resetVacuumCooldown(player: PlayerState): void {
  player.buffs = player.buffs.filter(({ id }) => !id.startsWith(`${VOID_USED}:`));
}

export function invertVacuumUseBalances(state: VacuumState, player: PlayerState): void {
  const unlimited = vacuumMode(state, player) === "absolute" && getActiveSkillCount(player, VACUUM_UNLIMITED_ID) > 0;
  for (const fusion of vacuumFusionCopies(player)) {
    const cardId = fusion.sourceBigCardInstanceId!;
    if (!unlimited) invertPeriodicUses(player, periodicCardUseKey(VACUUM_INHERIT_ID, cardId), state.roundNumber,
      Number(!usedNormalVacuum(player, state.roundNumber, cardId)), 1);
    const extra = player.buffs.find((buff) => buff.id === `${VOID_STOCK}:${cardId}`);
    if (extra) extra.stacks *= -1;
  }
}

export function prepareVacuumMove(state: GameState, player: PlayerState, action: SkillAction, cardId: string): void {
  if (action.skillId === VACUUM_EXTRACT_ID) {
    const existing = player.buffs.find((buff) => buff.id === `${VOID_STOCK}:${cardId}`);
    if (existing) existing.stacks++;
    else player.buffs.push({ id: `${VOID_STOCK}:${cardId}`, stateType: VOID_STOCK, name: "额外虚无", stacks: 1, sourceBigCardInstanceId: cardId });
  }
  if (action.skillId === VACUUM_MAX_ID) player.buffs.push({ id: `${VACUUM_MAX_RANK}:${cardId}`, stateType: VACUUM_MAX_RANK,
    name: "浩渺真空·判定 X", stacks: 1, sourceBigCardInstanceId: cardId, expiresAtTurn: state.turnNumber + 1 });
}

export function vacuumCanAvoid(rank: JudgmentRank, level: DefeatLevel | undefined): boolean {
  return !level || level <= 1 || level === 2 && judgmentRankAtLeast(rank, "V") ||
    level === 3 && judgmentRankAtLeast(rank, "IX") || level === 4 && rank === "X";
}

function vacuumCanAvoidDamage(item: PendingDamageItem, rank: JudgmentRank): boolean {
  return Boolean(item.spellDamage && !item.defensePiercing && !item.internalDamage && vacuumCanAvoid(rank, item.pointDefeatLevel));
}

export function vacuumOptions(state: VacuumState & Pick<GameState, "turnNumber" | "activeTimingPhase" | "pendingDamageItems">, player: PlayerState) {
  const phase = state.activeTimingPhase;
  if (phase !== "turn_change_action" && phase !== "turn_damage_modify" || !getActiveSkillCount(player, VACUUM_INHERIT_ID)) return [];
  const unlimited = vacuumMode(state, player) === "absolute" && getActiveSkillCount(player, VACUUM_UNLIMITED_ID) > 0;
  return vacuumFusionCopies(player).flatMap((fusion) => {
    const cardId = fusion.sourceBigCardInstanceId!;
    const rank = vacuumCardRank(state, player, cardId);
    if (phase === "turn_damage_modify" && (!judgmentRankAtLeast(rank, "IV") ||
      !state.pendingDamageItems?.some((item) => item.targetId === player.id && vacuumCanAvoidDamage(item, rank)))) return [];
    const ready = getPeriodicUses(player, periodicCardUseKey(VACUUM_INHERIT_ID, cardId), state.roundNumber,
      Number(!usedNormalVacuum(player, state.roundNumber, cardId))) > 0;
    return [{ cardId, rank, normal: unlimited || ready, extra: Math.max(0, extraVacuumUses(player, cardId)) }];
  }).filter(({ normal, extra }) => normal || extra > 0);
}

export function activateVacuumDodge(state: GameState, player: PlayerState, cardId: string, mode: "normal" | "extra"): void {
  const rank = vacuumCardRank(state, player, cardId);
  const absolute = vacuumMode(state, player) === "absolute";
  if (mode === "extra") {
    const stock = player.buffs.find((buff) => buff.id === `${VOID_STOCK}:${cardId}`)!;
    if (--stock.stacks === 0) player.buffs = player.buffs.filter((buff) => buff !== stock);
    const fusion = vacuumFusionCopies(player).find((copy) => copy.sourceBigCardInstanceId === cardId)!;
    const oldRank = getFusionJudgmentRank(fusion);
    if (oldRank !== "IX") {
      const id = `${VACUUM_PROGRESS}:${cardId}`;
      let progress = player.buffs.find((buff) => buff.id === id);
      if (!progress) {
        progress = { id, name: "虚无升阶进度", stacks: 0, sourceBigCardInstanceId: cardId };
        player.buffs.push(progress);
      }
      progress.stacks += absolute ? 2 : 1;
      if (progress.stacks >= 4) {
        progress.stacks -= 4;
        fusion.judgmentRank = nextJudgmentRank(oldRank);
        if (fusion.judgmentRank === "IX") progress.stacks = 0;
      }
    }
  } else {
    if (!absolute || !getActiveSkillCount(player, VACUUM_UNLIMITED_ID)) {
      player.buffs.push({ id: `${VOID_USED}:${cardId}`, name: "虚无冷却", stacks: 1, expiresAtRound: state.roundNumber + 1 });
      breakVacuum(state, player);
    }
  }
  if (state.activeTimingPhase === "turn_damage_modify") {
    state.pendingDamageItems = state.pendingDamageItems?.filter((item) => item.targetId !== player.id || !vacuumCanAvoidDamage(item, rank)) ?? [];
  } else if (canGainStatus(player) && !player.buffs.some((buff) => buff.stateType === VACUUM_DODGE && buff.sourceBigCardInstanceId === cardId &&
    buff.sourceJudgmentRank === rank && buff.expiresAtTurn === state.turnNumber + 1)) {
    player.buffs.push({ id: createId(VACUUM_DODGE), name: `虚无 · ${rank}`, stateType: VACUUM_DODGE, stacks: 1,
      sourceJudgmentRank: rank, sourceAbilityId: VACUUM_INHERIT_ID, sourceBigCardInstanceId: cardId, expiresAtTurn: state.turnNumber + 1 });
  }
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: `${player.name} 使用${mode === "extra" ? "额外" : "普通"}虚无 · ${rank}` });
}

export function hasVacuumMoveDodge(state: Pick<GameState, "turnNumber">, player: PlayerState | undefined,
  level: DefeatLevel | undefined, attack?: AttackStats): boolean {
  return Boolean(player && !attack?.cannotDodge && !attack?.defensePiercing && !attack?.ignoreSwordProtections &&
    getActiveSkillCount(player, VACUUM_INHERIT_ID) && player.buffs.some((buff) => buff.stateType === VACUUM_DODGE &&
      (buff.expiresAtTurn ?? 0) > state.turnNumber && vacuumCanAvoid(readJudgmentRank(buff.sourceJudgmentRank ?? "II"), level)));
}

export const VACUUM_FLASH_SKILL_ID = VOID_FLASH;
