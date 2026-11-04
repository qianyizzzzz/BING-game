import { GameState, INFINITE_DAMAGE, PlayerId } from "../types";
import { alivePlayers, findPlayer, revealSkillOnTrigger } from "./gameFactory";
import { getActiveFusionCount, getFusionSkillId } from "../skills/fusion";

export interface OrdinaryHealingResolution {
  originalTargetId: PlayerId;
  targetId: PlayerId;
  amount: number;
  infinite: boolean;
  suppressed: boolean;
}

/** Only additive healing enters here. Revival, full restoration and HP conversions bypass it. */
export function resolveOrdinaryHealing(state: GameState, originalTargetId: PlayerId, amount: number,
  bloodSorrowActive: boolean, infinite = false): OrdinaryHealingResolution | undefined {
  const originalTarget = findPlayer(state, originalTargetId);
  if (!originalTarget || originalTarget.status !== "alive" || amount <= 0) return undefined;
  // Resolve the original recipient's modifiers once, before selecting the final recipient.
  const amplified = infinite ? INFINITE_DAMAGE : amount * 2 ** getActiveFusionCount(originalTarget, "不死鸟之眼");
  const claimants = alivePlayers(state).filter((player) => getActiveFusionCount(player, "制裁之刃") > 0);
  // Multiple copies on one player have one claimant; multiple players cancel the added effects.
  const claimant = claimants.length === 1 ? claimants[0] : undefined;
  if (claimant && claimant.id !== originalTargetId) revealSkillOnTrigger(state, claimant.id, getFusionSkillId("制裁之刃"), "制裁之刃夺取回血");
  return { originalTargetId, targetId: claimant?.id ?? originalTargetId, amount: amplified, infinite,
    suppressed: !claimant && bloodSorrowActive };
}
