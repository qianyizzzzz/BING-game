import type { GameState, PlayerAction, PlayerId, PlayerState, SkillAction, SkillId } from "../types";
import {
  SPACE_BURST, SPACE_BURST_SPACE, SPACE_SHATTER, SPACE_TIME_CHAOS, SPACE_TIME_GUARD, SPACE_TIME_VICTORY_CLAIM, TIME_CONFUSION, TIME_RIFT
} from "./spaceTimeIds";

export type SpaceTimeSource = NonNullable<SkillAction["spaceTimeSource"]>;
type Confusion = { sourceId: PlayerId; expiresAtRound: number };
type Shatter = Confusion & { attribution: SpaceTimeSource };
type Chaos = { confusion: Confusion; shatter: Shatter; expiresAtRound: number; count: number };
export interface SpaceTimeFields {
  confusions: Confusion[];
  shatters: Shatter[];
  chaos: Chaos[];
  fusionCount: number;
}

export function spaceTimeMaxRounds(skillId: SkillId): number | undefined {
  if (skillId === TIME_RIFT) return 5;
  if (skillId === SPACE_BURST) return 2;
}

export function validSpaceTimeDuration(action: SkillAction): boolean {
  const cap = spaceTimeMaxRounds(action.skillId);
  const duration = action.spaceTimeDuration;
  return Boolean(cap && duration && Number.isSafeInteger(duration.turns) && duration.turns >= 1 &&
    Number.isSafeInteger(duration.rounds) && duration.rounds >= 1 && duration.rounds <= cap);
}

export function spaceTimeDeadline(state: Pick<GameState, "turnNumber" | "roundNumber">, action: SkillAction) {
  const { turns, rounds } = action.spaceTimeDuration!;
  return { turn: Math.min(Number.MAX_SAFE_INTEGER, state.turnNumber + turns), round: state.roundNumber + rounds };
}

export function enterSpaceBurst(state: GameState, player: PlayerState, spaceId: string, action: SkillAction): void {
  const deadline = spaceTimeDeadline(state, action);
  (state.smallSpaces ??= {})[spaceId] = { name: "空间爆破", kind: SPACE_BURST_SPACE,
    expiresAtRound: deadline.round, expiresAtTurn: deadline.turn, cakeMultiplier: 1 };
  player.spaceId = spaceId;
}

export function activeSpaceTimeFields(state: Pick<GameState, "spaceTimeFields" | "roundNumber">) {
  const fields = state.spaceTimeFields;
  return {
    confusions: fields?.confusions.filter((entry) => entry.expiresAtRound > state.roundNumber) ?? [],
    shatters: fields?.shatters.filter((entry) => entry.expiresAtRound > state.roundNumber) ?? [],
    chaos: fields?.chaos.filter((entry) => entry.expiresAtRound > state.roundNumber) ?? []
  };
}

export function spaceTimeConfusions(state: Pick<GameState, "spaceTimeFields" | "roundNumber">): Confusion[] {
  const active = activeSpaceTimeFields(state);
  return [...new Set([...active.confusions, ...active.chaos.map(({ confusion }) => confusion)])];
}

export function spaceTimeShatter(state: Pick<GameState, "spaceTimeFields" | "roundNumber">): Shatter | undefined {
  const active = activeSpaceTimeFields(state);
  return active.shatters.at(-1) ?? active.chaos.at(-1)?.shatter;
}

export function addSpaceTimeField(state: GameState, sourceId: PlayerId, action: SkillAction): number | undefined {
  const fields = state.spaceTimeFields ??= { confusions: [], shatters: [], chaos: [], fusionCount: 0 };
  const expiresAtRound = state.roundNumber + 5;
  const confusion = action.skillId === TIME_CONFUSION ? { sourceId, expiresAtRound } : spaceTimeConfusions(state).at(-1);
  const shatter = action.skillId === SPACE_SHATTER ? { sourceId, expiresAtRound, attribution: action.spaceTimeSource! } : spaceTimeShatter(state);
  if (action.skillId === TIME_CONFUSION && confusion) fields.confusions.push(confusion);
  if (action.skillId === SPACE_SHATTER && shatter) fields.shatters.push(shatter);
  if (!confusion || !shatter) return;
  const count = ++fields.fusionCount;
  fields.chaos.push({ confusion, shatter, count, expiresAtRound: state.roundNumber + 10 });
  return count;
}

export function clearSpaceTimeFields(state: GameState): void {
  if (state.spaceTimeFields) state.spaceTimeFields = {
    confusions: [], shatters: [], chaos: [], fusionCount: state.spaceTimeFields.fusionCount
  };
}

export function hasSpaceTimeVictoryClaim(player: Pick<PlayerState, "buffs" | "status">): boolean {
  return player.status === "alive" && player.buffs.some((buff) => buff.id === SPACE_TIME_VICTORY_CLAIM);
}

const fixedDurations: Readonly<Record<string, number>> = {
  "1050902": 3, // 怒海狂涛
  "1050904": 4, // 浪打千击
  "1051005": 3, // 永耀雷霆
  "1051806": 2, // 洪荒狂怒
  "1051905": 3, // 天击
  "1054306": 5, // 万翼归巢
  "1055207": 8, // 未央鬼祭
  "1055609": 3 // 月华舞礼
};

export function spaceTimeMoveDuration(state: Pick<GameState, "turnNumber">, source: PlayerState | undefined, action: PlayerAction): number {
  if (action.spaceTimeReplay) return action.spaceTimeReplay.duration === "permanent" ? Infinity : action.spaceTimeReplay.duration;
  if (action.roarContinuationId?.startsWith("eternal_move:")) return Infinity;
  const roar = source?.buffs.find((buff) => buff.id === action.roarContinuationId && buff.roarContinuation);
  if (roar?.roarContinuation) return (roar.expiresAtTurn ?? state.turnNumber + 1) - roar.roarContinuation.firstTurn;
  if (action.type !== "skill") return 1;
  if (action.tianlieContinuationId) return 3;
  if (action.skillId === "1052805" || action.skillId === "1052803" && action.waveContinuationId) return Infinity;
  const wave = source?.buffs.find((buff) => buff.id === action.waveContinuationId && buff.waveAttack);
  if (wave?.waveAttack) return (wave.expiresAtTurn ?? Infinity) - wave.waveAttack.firstTurn;
  return fixedDurations[action.skillId] ?? 1;
}

export function spaceTimeProtection(state: Pick<GameState, "spaceTimeFields" | "roundNumber">, duration: number,
  hasAbility: (id: SkillId) => boolean): SkillId | undefined {
  if (hasAbility(SPACE_TIME_GUARD) && duration > 4) return SPACE_TIME_GUARD;
  if (hasAbility(SPACE_TIME_CHAOS) && activeSpaceTimeFields(state).chaos.some((layer) => layer.count !== duration)) return SPACE_TIME_CHAOS;
}
