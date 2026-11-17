import { TIGER_LOCK } from "./netherTigerIds";
import { JUEYING_VICTORY_ID } from "../bigCards/abilities";
import { getSkill, getSkillUseLimit } from "../skills/registry";
import type { ActionWindowMode, GamePhase, GameState, PlayerId, PlayerState, SkillTimingPhase } from "../types";
import { effectHasCategory, isTypedSkillSuppressed } from "./effectCategories";
import { getActiveSkillCount } from "./gameFactory";
import { isSleeping } from "./utopia";

export const VICTORY_COUNTER_THRESHOLD = 5;
export const VICTORY_TRANSFER_COST = 2;
export const VICTORY_REVERSAL_SKILL_ID = "1092";

export type VictoryCounterAction =
  | { kind: "contribute"; claimId: string; count: number }
  | { kind: "transfer"; claimId: string };

export interface VictoryClaim {
  id: string;
  playerId: PlayerId;
  protected: boolean;
  counterImmunities?: Array<"victory_reverse" | "victory_transfer">;
  contributions: Partial<Record<PlayerId, number>>;
}

export function blocksVictoryCounter(claim: VictoryClaim, kind: VictoryCounterAction["kind"]): boolean {
  const id = kind === "transfer" ? JUEYING_VICTORY_ID : "1092:public_victory_counter";
  return claim.protected || Boolean(claim.counterImmunities?.some((category) => effectHasCategory(id, category)));
}

export type VictoryResumeKind = "window" | "advance" | "round_pre" | "turn_after" |
  "turn_end_open" | "turn_end_finish" | "advance_turn" | "revival" | "health_change";

export interface VictoryCounterState {
  allowedPlayerIds?: PlayerId[];
  claims: VictoryClaim[];
  resume: {
    kind: VictoryResumeKind;
    phase: GamePhase;
    timing: SkillTimingPhase;
    mode?: ActionWindowMode;
    passPlayerIds: PlayerId[];
    playerIds: PlayerId[];
  };
}

export interface VictoryCounterView {
  claims: VictoryClaim[];
  remainingReversals: number;
  canTransfer: boolean;
}

export function countVictoryContributions(claim: VictoryClaim): number {
  return Object.values(claim.contributions).reduce<number>((total, count) => total + (count ?? 0), 0);
}

export function remainingReversalUses(player: PlayerState | undefined): number {
  if (!player || getActiveSkillCount(player, VICTORY_REVERSAL_SKILL_ID) === 0 ||
    isTypedSkillSuppressed(player, getSkill(VICTORY_REVERSAL_SKILL_ID))) return 0;
  const used = player.buffs.find((buff) => buff.id === `skill_used:${VICTORY_REVERSAL_SKILL_ID}`)?.stacks ?? 0;
  return Math.max(0, (getSkillUseLimit(player, VICTORY_REVERSAL_SKILL_ID) ?? 0) - used);
}

export function remainingVictoryReversals(player: PlayerState | undefined, counter?: VictoryCounterState): number {
  if (player?.status !== "alive" || player.buffs.some((buff) => buff.id === "pending_death")) return 0;
  const reserved = counter?.claims.reduce((total, claim) => total + (claim.contributions[player.id] ?? 0), 0) ?? 0;
  return Math.max(0, remainingReversalUses(player) - reserved);
}

export function victoryCounterPlayerIds(state: Pick<GameState, "players" | "victoryCounter" | "turnNumber">): PlayerId[] {
  return state.players.filter((player) => (!state.victoryCounter?.allowedPlayerIds || state.victoryCounter.allowedPlayerIds.includes(player.id)) &&
    !getActiveSkillCount(player, TIGER_LOCK) && !isSleeping(player, state.turnNumber) && remainingVictoryReversals(player, state.victoryCounter) > 0 &&
    state.victoryCounter?.claims.some((claim) => claim.playerId !== player.id &&
      (!blocksVictoryCounter(claim, "contribute") || !blocksVictoryCounter(claim, "transfer") && getActiveSkillCount(player, JUEYING_VICTORY_ID) > 0)))
    .map(({ id }) => id);
}

export function getVictoryCounterView(state: GameState, viewer?: PlayerState): VictoryCounterView | undefined {
  if (!state.victoryCounter) return undefined;
  const allowed = !state.victoryCounter.allowedPlayerIds || viewer && state.victoryCounter.allowedPlayerIds.includes(viewer.id);
  const remainingReversals = !allowed || getActiveSkillCount(viewer, TIGER_LOCK) || isSleeping(viewer, state.turnNumber) ? 0 : remainingVictoryReversals(viewer, state.victoryCounter);
  return { claims: state.victoryCounter.claims, remainingReversals,
    canTransfer: remainingReversals >= VICTORY_TRANSFER_COST && getActiveSkillCount(viewer, JUEYING_VICTORY_ID) > 0 };
}
