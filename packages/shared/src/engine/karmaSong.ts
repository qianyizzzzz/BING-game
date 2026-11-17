import type { PlayerState } from "../types";
import { KARMA_SONG_ID, KARMA_SONG_STATUS_LOCK } from "./karmaCycleIds";

type PlayerCondition = Pick<PlayerState, "status" | "karmaReincarnation">;

/** Reincarnation remains a participant for turn progression, targeting and victory counts. */
export function isLivingPlayer(player: PlayerCondition | undefined): boolean {
  return player?.status === "alive" && !player.karmaReincarnation;
}

export function canGainStatus(player: { buffs: ReadonlyArray<{ id: string }> }): boolean {
  return !player.buffs.some(({ id }) => id === KARMA_SONG_STATUS_LOCK);
}

export function enterKarmaSong(player: PlayerState): boolean {
  if (!canGainStatus(player)) return false;
  player.karmaReincarnation = true;
  player.buffs.push({ id: KARMA_SONG_STATUS_LOCK, stateType: KARMA_SONG_STATUS_LOCK,
    name: "失落之歌·无法获得状态", stacks: 1, sourceAbilityId: KARMA_SONG_ID });
  return true;
}

export function leaveKarmaSong(player: PlayerState): void {
  delete player.karmaReincarnation;
  player.buffs = player.buffs.filter(({ id }) => id !== KARMA_SONG_STATUS_LOCK);
}
