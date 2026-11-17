import type { GameState, PlayerState, SkillAction, SkillId } from "../types";
import { getSkillUseLimit } from "../skills/registry";
import { canUseRawSkillInstance } from "../skills/fusion";
import { getActiveSkillCount } from "./gameFactory";
import { bigAbilitySource } from "./bigCards";
import { canRecoverEmptyCity } from "./illusionRules";
import { hasContinuationBlock } from "./hunyao";
import { getSkillUseBalanceAdjustment, setSkillUseBalanceAdjustment } from "./limitedUseBalance";
import { canRecoverWithHpCap } from "./infiniteValues";
import { KARMA_REBIRTH_ID } from "./karmaCycleIds";
import { swordArrayPiBlocksSkill } from "./swordArrayControl";

export const HOLY_BATH_SKILL_ID = "1066";
export const UNDYING_ICE_WOUND = "undying_ice_wound";
export const UNDYING_PROTECTED_WOUND = "undying_protected_wound";
const KARMA_CONVERSION_GROUPS: readonly SkillId[][] = [["1093", "1092", "1107"], ["1063", "1065", HOLY_BATH_SKILL_ID]];

export function getKarmaConversionTargets(source: SkillId): SkillId[] {
  return KARMA_CONVERSION_GROUPS.find((group) => group.includes(source))?.filter((id) => id !== source) ?? [];
}

export function getKarmaHolyBathIndex(player: PlayerState): number {
  const eligible = (id: SkillId, index: number) => id === HOLY_BATH_SKILL_ID && canUseRawSkillInstance(player, index);
  const covered = new Set((player.skillFusions ?? []).flatMap((fusion) => fusion.materialInstanceIds ?? []));
  const independent = player.skills.findIndex((id, index) => eligible(id, index) &&
    !covered.has(player.skillInventory?.[index]?.instanceId ?? ""));
  return independent >= 0 ? independent : player.skills.findIndex(eligible);
}

export function getKarmaConversionSources(player: PlayerState | undefined): SkillId[] {
  if (!player) return [];
  return KARMA_CONVERSION_GROUPS.flat().filter((skillId) => getActiveSkillCount(player, skillId) > 0 &&
    (skillId === HOLY_BATH_SKILL_ID ? getKarmaHolyBathIndex(player) >= 0 : (getSkillUseLimit(player, skillId) ?? 0) >
      (player.buffs.find(({ id }) => id === `skill_used:${skillId}`)?.stacks ?? 0)));
}

export function validKarmaConversion(player: PlayerState, action: SkillAction): boolean {
  return action.stacks === 1 && Boolean(action.karmaConvertFromSkillId && action.karmaConvertToSkillId &&
    getKarmaConversionSources(player).includes(action.karmaConvertFromSkillId) &&
    getKarmaConversionTargets(action.karmaConvertFromSkillId).includes(action.karmaConvertToSkillId));
}

/** Add one use even when the initial grant of this skill would have a larger quota. */
export function adjustKarmaConversionGrant(player: PlayerState, skillId: SkillId, quotaBefore: number): void {
  const added = (getSkillUseLimit(player, skillId) ?? 0) - quotaBefore;
  if (added !== 1) setSkillUseBalanceAdjustment(player, skillId, getSkillUseBalanceAdjustment(player, skillId) + 1 - added,
    "轮回转生的次数变更");
}

export function canUseKarmaRebirth(state: GameState, player: PlayerState | undefined): boolean {
  return Boolean(player && getActiveSkillCount(player, KARMA_REBIRTH_ID) &&
    bigAbilitySource(player, { skillId: KARMA_REBIRTH_ID }, true) && !player.defeatBlocksRevival &&
    canRecoverWithHpCap(player) && canRecoverEmptyCity(player, player, KARMA_REBIRTH_ID) &&
    !hasContinuationBlock(state, player, "revival", "none") && !swordArrayPiBlocksSkill(state, player, KARMA_REBIRTH_ID));
}

export function canUseKarmaExitRebirth(state: GameState, player: PlayerState | undefined): boolean {
  return Boolean(player?.status === "dead" && player.defeatLevel && player.defeatLevel >= 2 && player.defeatLevel <= 4 &&
    canUseKarmaRebirth(state, player));
}
