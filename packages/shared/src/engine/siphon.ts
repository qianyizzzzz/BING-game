import type { BuffState, GameState, PlayerState, SkillId } from "../types";
import { SIPHON_ABYSS_ID } from "../bigCards/abilities";
import { stateHasCategory } from "./effectCategories";
import { isSkillIgnored } from "./skillIgnore";
import { PURPLE_REVIVAL_BLOCK } from "./purpleEye";
import { SEA_GOD_REVIVAL_BLOCK } from "./seaGodIgnore";
import { isCorrupted } from "./corruptionIds";
import { CURTAIN_RECOVERY_BLOCK } from "./curtainIds";
import { DIVINE_DOOM_ID } from "./divineReversalIds";
import { getActiveSkillCount } from "./gameFactory";
import { getActiveFusionCount } from "../skills/fusion";
import { canGainStatus } from "./karmaSong";
import { FALLEN_SPLENDOR_REBIRTH_STAGES } from "./fallenSplendorIds";

export const LIFE_CHANNEL_STATE = "siphon_life_channel";
export const SIPHON_ABYSS_STATE = "siphon_abyss";
export const GREED_CHAIN_STATE = "siphon_greed_chain";
export const SIPHON_REVIVAL_USE_PREFIX = "siphon_revival_use:";

export function ignoresRevivalRestrictions(player: { buffs: readonly { id: string; stateType?: string }[] } | undefined): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === SIPHON_ABYSS_STATE)) && !isSkillIgnored(player, SIPHON_ABYSS_ID);
}

export function hasRevivalRestrictionFlag(player: { buffs: readonly { id: string; name?: string; stateType?: string }[] } &
  Partial<Pick<PlayerState, "skills" | "bigCards" | "skillFusions">>): boolean {
  return isCorrupted(player) || player.buffs.some((buff) =>
    buff.id === PURPLE_REVIVAL_BLOCK || buff.id === SEA_GOD_REVIVAL_BLOCK || buff.id === CURTAIN_RECOVERY_BLOCK) ||
    !ignoresRevivalRestrictions(player) && !getActiveSkillCount(player.skills ? player as PlayerState : undefined, FALLEN_SPLENDOR_REBIRTH_STAGES[0]) &&
    (player.buffs.some((buff) => buff.id === "no_revive" &&
      (buff.name !== "裂魂" || !player.skills || !getActiveFusionCount(player as PlayerState, "长生"))) ||
      Boolean(player.skills && getActiveSkillCount(player as PlayerState, DIVINE_DOOM_ID)));
}

export function greedChainRecipients(state: Pick<GameState, "players" | "roundNumber">, target: PlayerState): PlayerState[] {
  const owners = new Set(target.buffs.flatMap((buff) => buff.stateType === GREED_CHAIN_STATE &&
    (buff.expiresAtRound ?? 0) > state.roundNumber && buff.sourcePlayerId ? [buff.sourcePlayerId] : []));
  return state.players.filter((player) => player.id !== target.id && player.status === "alive" &&
    player.spaceId === target.spaceId && owners.has(player.id));
}

/** Copied gains do not publish another gain. The recipient keeps the original duration. */
export function sharePositiveState(state: Pick<GameState, "players" | "roundNumber">, target: PlayerState, buff: BuffState): void {
  if (!stateHasCategory(buff, "positive")) return;
  for (const owner of greedChainRecipients(state, target)) {
    if (!canGainStatus(owner)) continue;
    const shared = structuredClone(buff);
    shared.sharedByGreedChain = true;
    owner.buffs = owner.buffs.filter((existing) => existing.id !== shared.id);
    owner.buffs.push(shared);
  }
}

export function addSiphonStatus(state: Pick<GameState, "players" | "roundNumber">, target: PlayerState, buff: BuffState): boolean {
  if (!canGainStatus(target)) return false;
  target.buffs.push(buff);
  sharePositiveState(state, target, buff);
  return true;
}

type UseHolder = { buffs?: readonly { id: string; stacks?: number }[] };

export function siphonRevivalUses(player: UseHolder, id: SkillId): number {
  return player.buffs?.find((buff) => buff.id === SIPHON_REVIVAL_USE_PREFIX + id)?.stacks ?? 0;
}

export function siphonRevivalSkillIds(player: UseHolder): SkillId[] {
  return player.buffs?.flatMap((buff) => buff.id.startsWith(SIPHON_REVIVAL_USE_PREFIX) && (buff.stacks ?? 0) > 0 ?
    [buff.id.slice(SIPHON_REVIVAL_USE_PREFIX.length)] : []) ?? [];
}

export function changeSiphonRevivalUses(player: PlayerState, id: SkillId, amount: number, name: string): void {
  const key = SIPHON_REVIVAL_USE_PREFIX + id;
  const count = siphonRevivalUses(player, id) + amount;
  player.buffs = player.buffs.filter((buff) => buff.id !== key);
  if (count > 0) player.buffs.push({ id: key, name: `灵魂虹吸·${name}次数`, stacks: count });
}
