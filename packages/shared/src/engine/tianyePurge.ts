import type { BuffState, GameState, PlayerId, PlayerState, SkillId } from "../types";
import { BLOOD_QI } from "./asura";
import { clearDragonLongTermStatuses, reconcileTemporaryBigAbilities } from "./bigCards";
import { CHAOS_EXILED } from "./chaos";
import { CURTAIN_RECOVERY_BLOCK } from "./curtainIds";
import { DIVINE_EXIT_LOCK, DIVINE_FLAME_ENABLED } from "./divineReversalIds";
import { isRemovableExtraStatus, stateHasCategory } from "./effectCategories";
import { closeSacredBeasts } from "./honghuang";
import { endEmptyCityRecovery, refreshEmptyCitySuspension } from "./illusionRules";
import { clearNightHpCap } from "./infiniteValues";
import { TIGER_CARD, TIGER_MIE_COUNT, TIGER_TEMP_SKILL, tigerForms } from "./netherTigerIds";
import { clearFiveElementsForms } from "./fiveElementsIds";
import { clearHexagramForms } from "./hexagramIds";
import { clearSevenStarForms } from "./sevenStarIds";
import { PURPLE_REVIVAL_BLOCK } from "./purpleEye";
import { isSkillIgnorable } from "./skillIgnore";
import { isSoulTrackingBuff, SOUL_DEATH_HISTORY } from "./soulPact";
import { SUN_PUPPET_STATE } from "./sunIds";
import { TIAN_YE_CHOICE_STATE } from "./tianyeIds";
import { migrateStoredDamages } from "./storedDamage";

const legacySpaceBuff = "small_space:past_time";
const extraStatusIds = new Set([
  BLOOD_QI, CURTAIN_RECOVERY_BLOCK, DIVINE_EXIT_LOCK, DIVINE_FLAME_ENABLED,
  TIGER_MIE_COUNT, "temp_invulnerable", "temp_absolute_invulnerable"
]);
const ledgerPrefix = /^(used_|took_|damage_taken_|skill_used:|skill_activated:|limited_use_balance:|periodic_use_balance:|fusion_use_bonus:|sand_use:|skill_guess_failed|skip_action_windows|vacuum_normal_used:)/;

function shouldPurgeBuff(buff: BuffState, fusionSkills: ReadonlyMap<string, SkillId>): boolean {
  if (buff.id === SOUL_DEATH_HISTORY || isSoulTrackingBuff(buff) || ledgerPrefix.test(buff.id) ||
    buff.id.includes("cooldown") || buff.id.startsWith("element:") || stateHasCategory(buff, "element") ||
    buff.stateType === TIAN_YE_CHOICE_STATE && buff.stacks === 0) return false;
  const skill = buff.sourceAbilityId ?? (buff.sourceFusionId ? fusionSkills.get(buff.sourceFusionId) : undefined);
  if (buff.uncleansable && skill && !isSkillIgnorable(skill)) return false;
  const { uncleansable: _protection, ...effect } = buff;
  return isRemovableExtraStatus(effect) || stateHasCategory(effect, "special") || extraStatusIds.has(buff.id) ||
    buff.id === PURPLE_REVIVAL_BLOCK ||
    buff.id.startsWith("small_space:") || buff.id.startsWith(TIGER_TEMP_SKILL) ||
    Boolean(buff.psychicPuppet || buff.waveAttack || buff.roarContinuation || buff.tianlieWave ||
      buff.sandDelayedMove || buff.preventsTargetSelection || buff.defenseResponse ||
      buff.continuationStartedTurn !== undefined || buff.lifeAbsorptionDueRound !== undefined || buff.startsAtRound !== undefined);
}

function returnEmptyCityBody(state: GameState, player: PlayerState): void {
  endEmptyCityRecovery(state, player, false);
  const body = player.emptyCityBody;
  if (body) {
    // Moving back to the original seat carries the body's settled HP without applying the phantom's cap.
    player.hp = body.hp;
    if (body.hpValue !== undefined) player.hpValue = body.hpValue;
    else delete player.hpValue;
    if (body.hpIsInfinite) player.hpIsInfinite = true;
    else delete player.hpIsInfinite;
    player.cakes = body.cakes;
    if (body.actionCakes !== undefined) player.actionCakes = body.actionCakes;
    else delete player.actionCakes;
    if (body.lastSettledDamage) player.lastSettledDamage = body.lastSettledDamage;
    else delete player.lastSettledDamage;
    if (state.damageAttribution) {
      state.damageAttribution[player.id] = state.damageAttribution[body.id] ?? [];
      delete state.damageAttribution[body.id];
    }
  }
  delete player.emptyCityBody;
  delete player.emptyCityBodySpaceId;
}

/** Clear active battlefield effects and return the sun's former puppets for disappearance settlement. */
export function purgeTianyeBattlefield(state: GameState): PlayerId[] {
  const summonedIds = new Set(state.players.filter((player) => player.summon).map(({ id }) => id));
  const sunPuppets: PlayerId[] = [];
  const originalPlayers = state.players.filter((player) => !summonedIds.has(player.id));
  for (const player of originalPlayers) returnEmptyCityBody(state, player);
  for (const player of state.players) clearDragonLongTermStatuses(state, player.id);
  const fusionSkills = new Map(state.players.flatMap((player) => (player.skillFusions ?? []).map((fusion) => [fusion.id, fusion.skillId])));

  for (const player of originalPlayers) {
    migrateStoredDamages(player);
    const oldBuffs = player.buffs;
    player.buffs = oldBuffs.filter((buff) => !shouldPurgeBuff(buff, fusionSkills));
    const cleared = (id: string) => oldBuffs.some((buff) => buff.id === id) && !player.buffs.some((buff) => buff.id === id);
    if (player.status === "alive" && cleared(SUN_PUPPET_STATE)) sunPuppets.push(player.id);
    if (player.defeatLevel === 2 && (cleared(legacySpaceBuff) || cleared(CHAOS_EXILED))) {
      player.status = "alive";
      delete player.defeatLevel;
      player.buffs = player.buffs.filter((buff) => !isSoulTrackingBuff(buff));
    }
    clearFiveElementsForms(player.bigCards);
    clearHexagramForms(player.bigCards);
    clearSevenStarForms(player.bigCards);
    for (const card of player.bigCards ?? []) {
      if (card.cardId !== TIGER_CARD || card.onlyAbilityId) continue;
      const forms = tigerForms(card);
      forms.available = [];
      forms.cleared = true;
    }
    delete player.spareLives;
    delete player.eternalMoves;
    delete player.spaceId;
    const combatSeat = player.shadowCombatSeat;
    if (combatSeat && (combatSeat.spaceId || summonedIds.has(combatSeat.groupId))) delete player.shadowCombatSeat;
    if (state.sunClockOverride) clearNightHpCap(player);
    reconcileTemporaryBigAbilities(player, state);
  }
  closeSacredBeasts(state, originalPlayers, state.roundNumber);
  state.players = originalPlayers;
  refreshEmptyCitySuspension(state);
  for (const id of summonedIds) {
    delete state.pendingActions[id];
    if (state.damageAttribution) delete state.damageAttribution[id];
  }
  state.actionWindowPlayerIds = state.actionWindowPlayerIds.filter((id) => !summonedIds.has(id));
  state.actionWindowPassPlayerIds = state.actionWindowPassPlayerIds.filter((id) => !summonedIds.has(id));
  if (state.shadowInsertedSeats) state.shadowInsertedSeats = state.shadowInsertedSeats.filter((seat) =>
    !seat.spaceId && !summonedIds.has(seat.id) && !summonedIds.has(seat.afterId));

  delete state.sunClockOverride;
  delete state.junengTargetLock;
  delete state.smallSpaces;
  delete state.spaceReversalStates;
  delete state.yuanVoidEntries;
  delete state.totems;
  delete state.totemYoutiaoDefense;
  delete state.totemMoveRolls;
  delete state.cannonDefenses;
  delete state.eternalCheckpoints;
  delete state.starWheelMoves;
  delete state.starWheelReleasedMoves;
  delete state.starWheelPendingStatuses;
  delete state.pendingSandTowerDamage;
  delete state.pendingDragonFireBonuses;
  delete state.sakuraDue;
  return sunPuppets;
}
