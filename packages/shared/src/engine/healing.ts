import { GameState, PlayerId } from "../types";
import { findPlayer, getActiveSkillCount, revealSkillOnTrigger } from "./gameFactory";
import { getActiveFusionCount, getFusionSkillId } from "../skills/fusion";
import { combatValue, INFINITY_VALUE, isUnboundedCombatValue, projectCombatValue, scaleCombatValue } from "./combatValues";
import type { CombatValue } from "./combatValues";
import { shareSpace } from "./spaces";
import { getJueyingDeaths, hasJueyingRestriction, JUEYING_HARVEST } from "./jueying";
import { XIELING_INHERIT_ID } from "../bigCards/abilities";
import { tianmangSkillImmunity } from "./tianmang";
import { FIVE_ELEMENTS_EARTH } from "./fiveElementsIds";

export interface OrdinaryHealingResolution {
  originalTargetId: PlayerId;
  targetId: PlayerId;
  amount: number;
  infinite: boolean;
  suppressed: boolean;
  suppressedByJueying?: boolean;
  amountValue?: CombatValue;
}

/** Only additive healing enters here. Revival, full restoration and HP conversions bypass it. */
export function resolveOrdinaryHealing(state: GameState, originalTargetId: PlayerId, amount: number,
  bloodSorrowActive: boolean, infinite = false, exactAmount?: CombatValue): OrdinaryHealingResolution | undefined {
  const originalTarget = findPlayer(state, originalTargetId);
  if (!originalTarget || originalTarget.status !== "alive" || amount <= 0) return undefined;
  // Resolve the original recipient's modifiers once, before selecting the final recipient.
  const nearby = state.players.filter((player) => player.status === "alive" && shareSpace(player, originalTarget) &&
    !tianmangSkillImmunity(originalTarget, player.id, state.turnNumber));
  const harvests = nearby.filter((player) => player.buffs.some((buff) => buff.stateType === JUEYING_HARVEST &&
    buff.expiresAtRound === state.roundNumber + 1));
  const deathCopies = getJueyingDeaths(state, originalTarget)
    .filter(({ owner }) => !tianmangSkillImmunity(originalTarget, owner.id, state.turnNumber)).length;
  const amplified = scaleCombatValue(exactAmount ?? (infinite ? INFINITY_VALUE : combatValue(amount)),
    2 ** (getActiveFusionCount(originalTarget, "不死鸟之眼") + deathCopies + harvests.length));
  const claimants = nearby.filter((player) => harvests.includes(player) || getActiveFusionCount(player, "制裁之刃") > 0 ||
    getActiveSkillCount(player, FIVE_ELEMENTS_EARTH) > 0);
  // Multiple copies on one player have one claimant; multiple players cancel the added effects.
  const claimant = claimants.length === 1 ? claimants[0] : undefined;
  const ignoresBloodSorrow = claimant && getActiveFusionCount(claimant, "制裁之刃") > 0;
  const suppressedByJueying = hasJueyingRestriction(state, claimant ?? originalTarget);
  if (claimant && claimant.id !== originalTargetId && !suppressedByJueying && ignoresBloodSorrow)
    revealSkillOnTrigger(state, claimant.id, getFusionSkillId("制裁之刃"), "制裁之刃夺取回血");
  if (claimant && claimant.id !== originalTargetId && !suppressedByJueying && getActiveSkillCount(claimant, FIVE_ELEMENTS_EARTH))
    revealSkillOnTrigger(state, claimant.id, FIVE_ELEMENTS_EARTH, "五行·土夺取回血");
  return { originalTargetId, targetId: claimant?.id ?? originalTargetId, amount: projectCombatValue(amplified),
    infinite: isUnboundedCombatValue(amplified), ...(isUnboundedCombatValue(amplified) ? { amountValue: amplified } : {}),
    suppressed: suppressedByJueying || !ignoresBloodSorrow && bloodSorrowActive &&
      getActiveSkillCount(claimant ?? originalTarget, XIELING_INHERIT_ID) === 0, suppressedByJueying };
}
