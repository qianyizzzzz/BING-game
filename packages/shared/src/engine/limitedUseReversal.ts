import { bigCardHasAbility, BIG_CARD_SKILLS, MOUNTAIN_SEAL_ID, PURPLE_FORESIGHT_ID, PURPLE_INSIGHT_ID, XIELING_ULTIMATE_ID } from "../bigCards/abilities";
import { getDestroyPowerUsePools, getFlashFamilySlots, getOwnedSkillIds } from "../skills/fusion";
import { getPermanentSkillUseLimit, getSkillPlay, getSkillUseLimit, hasSkillTypeTag } from "../skills/registry";
import type { BuffState, GameState, PlayerState, SkillId } from "../types";
import { ASURA_BARRIER_USES, asuraInheritanceCopies } from "./asura";
import { BEAR_ROAR_ID } from "./beastTraits";
import { demonSummonBalance, isDemonSummonSkill } from "./demons";
import { DIVINE_FLAME_ENABLED, DIVINE_FLAME_ID } from "./divineReversalIds";
import { activeBeastGrants, adjustBeastUseLedger, invertSacredBeastQuotas } from "./honghuang";
import { getBigCardLimitedRemaining, getSkillUseBalanceAdjustment, invertPeriodicUses, periodicCardUseKey,
  periodicFlashUseKey, setBigCardUseBalanceAdjustment,
  setSkillUseBalanceAdjustment } from "./limitedUseBalance";
import { canSummonMoon, MOON_RITUAL_COOLDOWN } from "./moon";
import { MOON_RITUAL_ID } from "./moonIds";
import { invertPurpleInsightUses, purpleForesightUses } from "./purpleEye";
import { SAND_GRANTED_USE_PREFIX } from "./sand";
import { SIPHON_REVIVAL_USE_PREFIX } from "./siphon";
import { SUN_CROWN_COOLDOWN, SUN_CROWN_ID } from "./sunIds";
import { SEA_GOD_RETURN_COOLDOWN, SEA_GOD_RETURN_ID } from "./seaGodIds";
import { getSeaGodReturnNativeReadyAt } from "./seaGodMoves";
import { clearTianlieRageUses, tianlieTemporaryUses } from "./tianlie";
import { invertVacuumUseBalances, resetVacuumCooldown } from "./vacuum";
import { invertDueXieyuUses, XIELING_COOLDOWN } from "./xieling";
import { recoverColdLightUses } from "./nineTribulations";

type QuotaTime = Pick<GameState, "roundNumber" | "turnNumber" | "smallSpaces">;
type SmallQuotaOwner = Parameters<typeof getPermanentSkillUseLimit>[0];

function limitedUseBase(id: SkillId): number | undefined {
  return hasSkillTypeTag(id, "限定技") ? getSkillPlay(id)?.usesPerGame : undefined;
}

function clearTemporaryLimitedUses(owner: { buffs: BuffState[] }): void {
  clearTianlieRageUses(owner);
  owner.buffs = owner.buffs.filter((buff) => buff.id !== ASURA_BARRIER_USES &&
    !buff.id.startsWith(SIPHON_REVIVAL_USE_PREFIX) &&
    !(buff.id.startsWith(SAND_GRANTED_USE_PREFIX) && limitedUseBase(buff.id.slice(SAND_GRANTED_USE_PREFIX.length)) !== undefined));
}

function resetUseBuffers(owner: { buffs: BuffState[] }): void {
  clearTemporaryLimitedUses(owner);
  owner.buffs = owner.buffs.filter(({ id, periodicUseBalance }) => {
    if (periodicUseBalance || id === SUN_CROWN_COOLDOWN || id === MOON_RITUAL_COOLDOWN ||
      id.startsWith(`${SEA_GOD_RETURN_COOLDOWN}:`) || id.startsWith("flash_dodge_cooldown") ||
      id.startsWith("destroy_power_cooldown") || id === "verdict_shadow_uses" || id === "jueying_reversal_uses") return false;
    const skill = /^(?:skill_used|limited_use_balance|fusion_use_bonus):(.+)$/.exec(id)?.[1];
    return skill === undefined || limitedUseBase(skill) === undefined;
  });
  for (const buff of owner.buffs) if (buff.id === DIVINE_FLAME_ENABLED) delete buff.startsAtRound;
}

/** Restore native charges and cooldowns while keeping each skill and its other state. */
export function restoreLimitedSkillUsesToInitial(state: Pick<GameState, "turnNumber" | "roundNumber">, player: PlayerState): void {
  recoverColdLightUses(player);
  resetUseBuffers(player);
  resetVacuumCooldown(player);
  for (const fusion of player.skillFusions ?? []) delete fusion.starShiftUses;
  for (const card of player.bigCards ?? []) {
    const minimumQuotas = Object.keys(BIG_CARD_SKILLS).filter((id) =>
      limitedUseBase(id) === 0 && bigCardHasAbility(card, id, true));
    for (const ledger of [card.abilityUses, card.abilityUseBonuses, card.abilityUseBalanceAdjustments, card.grantedSkillUses]) {
      for (const id of Object.keys(ledger ?? {})) {
        if (limitedUseBase(id) !== undefined || isDemonSummonSkill(id) || id === PURPLE_FORESIGHT_ID) delete ledger![id];
      }
    }
    for (const id of minimumQuotas) (card.abilityUseBonuses ??= {})[id] = 1;
    if (card.demonGrantStartTurn !== undefined) card.demonGrantStartTurn = state.turnNumber;
    if (card.purpleForesightFirstRound !== undefined) card.purpleForesightFirstRound = state.roundNumber;
    delete card.purpleInsightUsedRound;
    delete card.guidanceHealingUses;
    delete card.charityHealingRefunds;
    delete card.charityQuickUses;
    delete card.bearReadyRound;
    delete card.mountainSealReadyRound;
    delete card.deadRealmGuardReadyRound;
    delete card.xielingCooldown;
    for (const beast of Object.values(card.sacredBeasts ?? {})) {
      if (!beast.active) beast.usedRound = 0;
      if (beast.stored) {
        resetUseBuffers(beast.stored);
        for (const fusion of beast.stored.fusions) delete fusion.starShiftUses;
      }
      for (const id of Object.keys(beast.used ?? {})) {
        if (limitedUseBase(id) !== undefined) delete beast.used![id];
      }
    }
  }
}

function storedBeastStock(stored: { inventory: NonNullable<PlayerState["skillInventory"]>;
  fusions: NonNullable<PlayerState["skillFusions"]>; buffs: BuffState[] }): Record<SkillId, number> {
  clearTemporaryLimitedUses(stored);
  const skills = stored.inventory.map(({ skillId }) => skillId);
  const owner: SmallQuotaOwner = { skills, buffs: stored.buffs, skillInventory: stored.inventory, skillFusions: stored.fusions };
  const uses: Record<SkillId, number> = {};
  for (const id of new Set(getOwnedSkillIds(owner))) {
    if (limitedUseBase(id) === undefined) continue;
    const limit = getPermanentSkillUseLimit(owner, id, true);
    if (limit !== undefined && Number.isFinite(limit) && limit < Number.MAX_SAFE_INTEGER) uses[id] = limit;
  }
  return uses;
}

/** Deplete the current finite per-game stock, including borrowed and temporary charges. */
export function zeroLimitedSkillUses(_state: QuotaTime, player: PlayerState): void {
  clearTemporaryLimitedUses(player);
  for (const card of player.bigCards ?? []) for (const beast of Object.values(card.sacredBeasts ?? {})) {
    if (beast.stored) Object.assign(beast.used ??= {}, storedBeastStock(beast.stored));
  }

  // Resolve active beast stock into its own ledger, so it is removed from the player's ledger when the beast closes.
  for (const card of player.bigCards ?? []) for (const { id, beast } of activeBeastGrants(card)) {
    const inventory = player.skillInventory?.filter((entry) => entry.sourceBigCardInstanceId === id) ?? [];
    const fusions = player.skillFusions?.filter((entry) => entry.sourceBigCardInstanceId === id) ?? [];
    const buffs = player.buffs.filter((entry) => entry.sourceBigCardInstanceId === id ||
      entry.sourceFusionId && fusions.some((fusion) => fusion.id === entry.sourceFusionId));
    const stock = storedBeastStock({ inventory, fusions, buffs });
    const adjustments: Record<SkillId, number> = {};
    for (const [skill, limit] of Object.entries(stock)) {
      const used = beast.used?.[skill] ?? 0;
      if (used >= limit) continue;
      adjustments[skill] = limit - used;
      (beast.used ??= {})[skill] = limit;
    }
    adjustBeastUseLedger(player, { ...beast, used: adjustments }, 1);
  }

  const owned = new Set([...getOwnedSkillIds(player), ...(player.bigCards ?? []).flatMap((card) => card.temporarilyLostAbilityIds ?? [])]);
  for (const id of owned) {
    const base = limitedUseBase(id);
    if (base === undefined) continue;
    if (BIG_CARD_SKILLS[id]) {
      for (const card of player.bigCards ?? []) {
        if (!bigCardHasAbility(card, id, true)) continue;
        const remaining = getBigCardLimitedRemaining(card, id, base);
        if (remaining > 0) (card.abilityUses ??= {})[id] = (card.abilityUses?.[id] ?? 0) + remaining;
        if (remaining < 0) setBigCardUseBalanceAdjustment(card, id, (card.abilityUseBalanceAdjustments?.[id] ?? 0) - remaining);
      }
      continue;
    }
    const limit = getPermanentSkillUseLimit(player, id, true);
    if (limit === undefined || limit >= Number.MAX_SAFE_INTEGER) continue;
    const used = player.buffs.find((buff) => buff.id === `skill_used:${id}`)?.stacks ?? 0;
    setSkillUseBalanceAdjustment(player, id, used - limit, "风袭之翼的次数变更");
  }
}

/** Flip each signed per-game use balance without recording artificial uses. */
export function invertLimitedSkillUses(state: QuotaTime, player: PlayerState): void {
  const owned = new Set(getOwnedSkillIds(player));
  for (const id of owned) {
    const base = getSkillPlay(id)?.usesPerGame;
    if (BIG_CARD_SKILLS[id]) {
      for (const card of player.bigCards ?? []) {
        if (!bigCardHasAbility(card, id)) continue;
        const remaining = isDemonSummonSkill(id) ? demonSummonBalance(state.turnNumber, card, id) :
          id === PURPLE_FORESIGHT_ID ? purpleForesightUses(state.roundNumber, card) :
          base === undefined ? undefined : getBigCardLimitedRemaining(card, id, base) + tianlieTemporaryUses(player, id);
        if (remaining === undefined) continue;
        if (Math.abs(remaining) >= Number.MAX_SAFE_INTEGER) continue;
        setBigCardUseBalanceAdjustment(card, id, (card.abilityUseBalanceAdjustments?.[id] ?? 0) - 2 * remaining);
      }
      continue;
    }
    if (base === undefined) continue;
    const limit = getSkillUseLimit(player, id);
    if (limit === undefined || Math.abs(limit) >= Number.MAX_SAFE_INTEGER) continue;
    const used = player.buffs.find((buff) => buff.id === `skill_used:${id}`)?.stacks ?? 0;
    const remaining = limit - used;
    if (remaining) setSkillUseBalanceAdjustment(player, id, getSkillUseBalanceAdjustment(player, id) - 2 * remaining);
  }
  const { roundNumber: round, turnNumber: turn } = state;
  if (!asuraInheritanceCopies(player)) for (const pool of getDestroyPowerUsePools(player, round)) {
    if (pool.quota) invertPeriodicUses(player, pool.key, round, pool.nativeUses, pool.interval, pool.quota);
  }
  getFlashFamilySlots(player, round, true).forEach((slot, index) => {
    invertPeriodicUses(player, periodicFlashUseKey(slot.fusionId, index), round, Number(slot.ready <= round), slot.duration);
  });
  if (owned.has(MOON_RITUAL_ID)) invertPeriodicUses(player, MOON_RITUAL_ID, round, Number(canSummonMoon(state, player, true)), 1);
  if (owned.has(DIVINE_FLAME_ID)) invertPeriodicUses(player, DIVINE_FLAME_ID, round,
    Number(!player.buffs.some((buff) => buff.id === DIVINE_FLAME_ENABLED && buff.startsAtRound === round)), 1);
  for (const card of player.bigCards ?? []) {
    const { instanceId } = card;
    if (bigCardHasAbility(card, BEAR_ROAR_ID))
      invertPeriodicUses(player, periodicCardUseKey(BEAR_ROAR_ID, instanceId), round, Number((card.bearReadyRound ?? 0) <= round), 5);
    if (bigCardHasAbility(card, MOUNTAIN_SEAL_ID))
      invertPeriodicUses(player, periodicCardUseKey(MOUNTAIN_SEAL_ID, instanceId), round, Number((card.mountainSealReadyRound ?? 0) <= round), 8);
    if (bigCardHasAbility(card, SUN_CROWN_ID)) {
      const ready = !player.buffs.some((buff) => buff.id === SUN_CROWN_COOLDOWN &&
        buff.sourceBigCardInstanceId === instanceId && (buff.expiresAtRound ?? 0) > round);
      invertPeriodicUses(player, periodicCardUseKey(SUN_CROWN_ID, instanceId), round, Number(ready), 4);
    }
    if (bigCardHasAbility(card, SEA_GOD_RETURN_ID)) {
      const ready = getSeaGodReturnNativeReadyAt(player, round, instanceId) <= round;
      invertPeriodicUses(player, periodicCardUseKey(SEA_GOD_RETURN_ID, instanceId), round, Number(ready), 3);
    }
    if (bigCardHasAbility(card, XIELING_ULTIMATE_ID))
      invertPeriodicUses(player, periodicCardUseKey(XIELING_ULTIMATE_ID, instanceId), turn, Number(!card.xielingCooldown?.remaining), XIELING_COOLDOWN);
    if (bigCardHasAbility(card, PURPLE_INSIGHT_ID)) invertPurpleInsightUses(round, player, card);
  }
  invertVacuumUseBalances(state, player);
  invertSacredBeastQuotas(player, round);
  invertDueXieyuUses(player, round);
}
