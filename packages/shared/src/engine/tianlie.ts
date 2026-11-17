import { greedChainRecipients } from "./siphon";
import { canGainStatus } from "./karmaSong";
import type { AttackAction, AttackStats, BuffState, GameState, PlayerAction, PlayerId, PlayerState, SkillId, SkillAction } from "../types";
import { getFusionSkillId, getOwnedSkillIds } from "../skills/fusion";
import { getSkill, getSkillPlay, getSkillUseLimit } from "../skills/registry";
import { createId, getActiveSkillCount } from "./gameFactory";
import { INFINITY_VALUE, VANISH_VALUE, scaleCombatValue, withAttackLevel, withAttackPower } from "./combatValues";
import { TIANLIE_ATTACK_ID, TIANLIE_CONTINUE_ID, TIANLIE_FEEDBACK_ID, TIANLIE_MIGHT_ID } from "../bigCards/abilities";
import { withSkillsIgnored } from "./skillIgnore";

export const RAGE_STATE = "tianlie_rage";
export const RAGE_USE_PREFIX = "tianlie_rage_uses:";
export const TIANLIE_POWER_MARK = "tianlie_vanish_attack";
export const TIANLIE_STAT_MULTIPLIER = "tianlie_stat_multiplier:";

const ignoredFusionNames = ["纯净苍穹", "枯萎", "天花板"];

export function hasTianlieMight(player: PlayerState | undefined): boolean {
  return getActiveSkillCount(player, TIANLIE_MIGHT_ID) > 0;
}

export function withTianlieFusionsIgnored<T>(owner: PlayerState | undefined, effect: () => T): T {
  return withSkillsIgnored(owner, { fusionSkillIds: ignoredFusionNames.map(getFusionSkillId) }, effect);
}

export function isTianlieIgnoredMaterial(player: PlayerState, skillId: SkillId): boolean {
  return getActiveSkillCount(player, skillId) > 0 &&
    withTianlieFusionsIgnored(player, () => getActiveSkillCount(player, skillId) === 0);
}

export interface TianlieAttackResponse {
  id: string;
  playerId: PlayerId;
  sourceId: PlayerId;
  skillId: typeof TIANLIE_CONTINUE_ID | typeof TIANLIE_FEEDBACK_ID;
  stats: AttackStats;
  action?: AttackAction | SkillAction;
}

export function tianlieResponseChoices(state: Pick<GameState, "tianlieAttackResponses">, player: PlayerState | undefined) {
  return (state.tianlieAttackResponses ?? []).filter((choice) => choice.playerId === player?.id &&
    getActiveSkillCount(player, choice.skillId) > 0 && (player?.cakes ?? 0) >= (getSkillPlay(choice.skillId)?.cost ?? Infinity));
}

export function getTianlieWave(player: Pick<PlayerState, "buffs"> | undefined, action: PlayerAction) {
  return action.spaceTimeReplay?.tianlie ?? ("tianlieContinuationId" in action && action.tianlieContinuationId ?
    player?.buffs.find((buff) => buff.id === action.tianlieContinuationId)?.tianlieWave : undefined);
}

export function hasTianlieRage(player?: { buffs: ReadonlyArray<{ id: string; stateType?: string }> }): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === RAGE_STATE));
}

/** Hook for beneficial-number annotations once their data set is available. */
export function tianlieFavorableMultiplier(player: Pick<PlayerState, "buffs"> | undefined): number {
  return hasTianlieRage(player) ? 2 : 1;
}

export function tianlieTemporaryUses(player: { buffs: ReadonlyArray<{ id: string; stacks?: number }> }, skillId: SkillId): number {
  return player.buffs.filter((buff) => buff.id.startsWith(`${RAGE_USE_PREFIX}${skillId}:`) &&
    player.buffs.some((rage) => rage.id === buff.id.split(":").at(-1)))
    .reduce((total, buff) => total + (buff.stacks ?? 0), 0);
}

export function spendTianlieTemporaryUse(player: { buffs: BuffState[] }, skillId: SkillId): boolean {
  const available = player.buffs.filter((buff) => buff.id.startsWith(`${RAGE_USE_PREFIX}${skillId}:`) && buff.stacks > 0 &&
    player.buffs.some((rage) => rage.id === buff.sourceFusionId))
    .sort((a, b) => (a.expiresAtRound ?? Infinity) - (b.expiresAtRound ?? Infinity))[0];
  if (!available) return false;
  available.stacks -= 1;
  if (!available.stacks) player.buffs = player.buffs.filter((buff) => buff !== available);
  return true;
}

export function activateTianlieRage(state: Pick<GameState, "players" | "roundNumber">, source: PlayerState): void {
  for (const player of [source, ...greedChainRecipients(state, source)]) grantTianlieRage(player, state.roundNumber + 5);
}

function grantTianlieRage(player: PlayerState, expiresAtRound: number): void {
  if (!canGainStatus(player)) return;
  const id = createId("tianlie_rage");
  for (const skillId of new Set(getOwnedSkillIds(player))) {
    const skill = getSkill(skillId);
    const play = getSkillPlay(skillId);
    if (!play?.usesPerGame || !skill?.typeTags.includes("限定技")) continue;
    const capacity = getSkillUseLimit(player, skillId) ?? 0;
    const used = skill.category === "king_card" ? 0 : player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
    const stacks = Math.max(0, capacity - used);
    if (!stacks || stacks >= Number.MAX_SAFE_INTEGER) continue;
    player.buffs.push({ id: `${RAGE_USE_PREFIX}${skillId}:${id}`, name: "狂化临时次数", stateType: "tianlie_rage_uses",
      expiresAtRound, stacks, sourceFusionId: id });
  }
  player.buffs.push({ id, name: "狂化", stateType: RAGE_STATE, expiresAtRound, stacks: 1 });
}

export function clearTianlieRageUses(player: { buffs: BuffState[] }, rageId?: string): void {
  player.buffs = player.buffs.filter((buff) => !buff.id.startsWith(RAGE_USE_PREFIX) || Boolean(rageId && buff.sourceFusionId !== rageId));
}

export function shapeTianlieAttack(player: Pick<PlayerState, "buffs"> | undefined, stats: AttackStats): AttackStats {
  if (stats.id !== TIANLIE_ATTACK_ID || !hasTianlieRage(player)) return stats;
  const vanish = player?.buffs.some((buff) => buff.id === TIANLIE_POWER_MARK);
  const power = vanish ? VANISH_VALUE : scaleCombatValue(INFINITY_VALUE, stats.stacks);
  return { ...withAttackLevel(withAttackPower(stats, power), power), cost: 2 * stats.stacks, tianlieRaging: true,
    ...(vanish ? { traits: [...stats.traits, "defeat_vanish"], fixedPointPower: true } : {}) };
}
