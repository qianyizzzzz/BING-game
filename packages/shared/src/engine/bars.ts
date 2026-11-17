import type { PlayerState, SkillId } from "../types";

/** Bars are independently clearable state. Skill-use and trigger counters have their own ledgers. */
export interface PlayerBar {
  id: string;
  kind: "progress" | "count";
  label: string;
  value: number;
  limit?: number;
  sourceAbilityId?: SkillId;
  firstTurn?: number;
}

export function setPlayerBar(player: Pick<PlayerState, "bars">, bar: PlayerBar): void {
  player.bars = [...(player.bars ?? []).filter(({ id }) => id !== bar.id), bar];
}

export function clearPlayerBars(player: Pick<PlayerState, "bars">, kind?: PlayerBar["kind"]): void {
  if (!kind) delete player.bars;
  else if (player.bars) player.bars = player.bars.filter((bar) => bar.kind !== kind);
}
