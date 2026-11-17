import type { PlayerState, SkillId } from "../types";
import { getSkill, skillHasTypeTag } from "../skills/registry";
import { getActiveSkillCount } from "./gameFactory";
import { SEA_GOD_IGNORE_ID } from "./seaGodIds";
import { isSkillIgnorable } from "./skillIgnore";
import { FATE_EYE_WARD } from "./fateEyeIds";
import { HEXAGRAM_IGNORE, HEXAGRAM_LIMITED } from "./hexagramIds";
import { SEVEN_STAR_IGNORE } from "./sevenStarIds";

export const SEA_GOD_REVIVAL_BLOCK = "sea_god_revival_block";
const HEXAGRAM_CONTROL_AND_LIMITED = "hexagram_control_and_limited";
export type OpponentSkillIgnore = typeof SEA_GOD_IGNORE_ID | typeof FATE_EYE_WARD |
  typeof HEXAGRAM_IGNORE | typeof HEXAGRAM_LIMITED | typeof HEXAGRAM_CONTROL_AND_LIMITED | typeof SEVEN_STAR_IGNORE;

export function seaGodIgnoresOpponent(holder: PlayerState | undefined, opponentId: string | undefined): boolean {
  return Boolean(opponentId && holder && holder.id !== opponentId && getActiveSkillCount(holder, SEA_GOD_IGNORE_ID));
}

export function opponentSkillIgnore(holder: PlayerState | undefined, opponentId: string | undefined,
  usingSkillMove = false): OpponentSkillIgnore | undefined {
  if (seaGodIgnoresOpponent(holder, opponentId)) return SEA_GOD_IGNORE_ID;
  if (opponentId && holder?.id !== opponentId && getActiveSkillCount(holder, FATE_EYE_WARD)) return FATE_EYE_WARD;
  if (!holder || !opponentId || holder.id === opponentId) return undefined;
  const ignoresControl = getActiveSkillCount(holder, HEXAGRAM_IGNORE) > 0;
  if (getActiveSkillCount(holder, SEVEN_STAR_IGNORE)) return ignoresControl ? HEXAGRAM_CONTROL_AND_LIMITED : SEVEN_STAR_IGNORE;
  if (usingSkillMove && getActiveSkillCount(holder, HEXAGRAM_LIMITED)) return ignoresControl ? HEXAGRAM_CONTROL_AND_LIMITED : HEXAGRAM_LIMITED;
  return ignoresControl ? HEXAGRAM_IGNORE : undefined;
}

export function isOpponentSkillIgnored(profile: OpponentSkillIgnore, skillId: SkillId | undefined): boolean {
  if (profile === SEA_GOD_IGNORE_ID) return isSeaGodIgnoredSkill(skillId);
  if (!skillId || !isSkillIgnorable(skillId)) return false;
  const skill = getSkill(skillId);
  if (profile === HEXAGRAM_IGNORE) return skillHasTypeTag(skill, "控制技");
  if (profile === HEXAGRAM_LIMITED || profile === SEVEN_STAR_IGNORE) return skillHasTypeTag(skill, "限定技");
  if (profile === HEXAGRAM_CONTROL_AND_LIMITED) return skillHasTypeTag(skill, "控制技") || skillHasTypeTag(skill, "限定技");
  return skillHasTypeTag(skill, "锁定技") || skillHasTypeTag(skill, "限定技") || skillHasTypeTag(skill, "控制技");
}

export function ignoresOpponentSkill(holder: PlayerState | undefined, opponentId: string | undefined, skillId: SkillId | undefined) {
  const profile = opponentSkillIgnore(holder, opponentId);
  if (profile === HEXAGRAM_CONTROL_AND_LIMITED) {
    if (isOpponentSkillIgnored(HEXAGRAM_IGNORE, skillId)) return HEXAGRAM_IGNORE;
    return isOpponentSkillIgnored(SEVEN_STAR_IGNORE, skillId) ? SEVEN_STAR_IGNORE : undefined;
  }
  return profile && isOpponentSkillIgnored(profile, skillId) ? profile : undefined;
}

export function isSeaGodIgnoredSkill(skillId: SkillId | undefined): boolean {
  if (!skillId || !isSkillIgnorable(skillId)) return false;
  const skill = getSkill(skillId);
  return skillHasTypeTag(skill, "锁定技") || skillHasTypeTag(skill, "限定技") ||
    skillHasTypeTag(skill, "控制技") || skillHasTypeTag(skill, "复活技") ||
    Boolean(skill?.play?.kind === "attack" && !skill.play.nonAttackMove);
}
