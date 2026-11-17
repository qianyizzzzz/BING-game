import type { GameState, PlayerState } from "../types";
import { alivePlayers, getActiveSkillCount } from "./gameFactory";
import { STAR_WHEEL_SHIFT } from "./starWheelIds";
import { SUN_NIGHT_CAP_ID, SUN_PUPPET_STATE } from "./sunIds";
import { hasTianyeWing } from "./tianye";
import { TIAN_YE_PURGE_ID } from "./tianyeIds";

const timeOfDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit"
});
const sunrise = 6;
const sunset = 18;
const hourMs = 60 * 60 * 1000;

export interface SunClockSample {
  at: number;
  hour: number;
  minute: number;
  isDaylight: boolean;
  locked: boolean;
}

function readTime(at: number) {
  const parts = timeOfDay.formatToParts(at);
  return {
    hour: Number(parts.find(({ type }) => type === "hour")!.value),
    minute: Number(parts.find(({ type }) => type === "minute")!.value),
    second: Number(parts.find(({ type }) => type === "second")!.value)
  };
}

/** Read the effective time once for a settlement batch, using the room server's clock. */
export function sampleSunClock(state: Pick<GameState, "sunClockOverride">, at = Date.now()): SunClockSample {
  const { hour, minute } = state.sunClockOverride ?? readTime(at);
  return { at, hour, minute, isDaylight: hour >= sunrise && hour < sunset, locked: state.sunClockOverride !== undefined };
}

export function isSunDaylightForPlayer(state: Pick<GameState, "turnNumber">, clock: SunClockSample, player: PlayerState): boolean {
  if (!clock.locked || !hasTianyeWing(player, TIAN_YE_PURGE_ID, state.turnNumber)) return clock.isDaylight;
  const { hour } = readTime(clock.at);
  return hour >= sunrise && hour < sunset;
}

export function lockSunClockAtNoon(state: GameState): void {
  state.sunClockOverride = { hour: 12, minute: 0, effectName: "太阳神的归返" };
}

export function isSunTimeJudgmentSuppressed(state: Pick<GameState, "players">): boolean {
  return alivePlayers(state).some((owner) => getActiveSkillCount(owner, STAR_WHEEL_SHIFT) > 0);
}

export function hasSunClockEffects(state: Pick<GameState, "phase" | "players">): boolean {
  return state.phase !== "lobby" && state.phase !== "finished" && state.players.some((player) =>
    player.nightHpCap !== undefined || player.status === "alive" &&
    (player.buffs.some(({ id }) => id === SUN_PUPPET_STATE) || getActiveSkillCount(player, SUN_NIGHT_CAP_ID) > 0));
}

export function nextSunClockBoundaryAt(state: GameState, at = Date.now()): number | undefined {
  if (!hasSunClockEffects(state) || state.sunClockOverride &&
    !alivePlayers(state).some((player) => hasTianyeWing(player, TIAN_YE_PURGE_ID, state.turnNumber))) return;

  const { hour, minute, second } = readTime(at);
  const boundaryHour = hour < sunrise ? sunrise : hour < sunset ? sunset : 24 + sunrise;
  return Math.floor(at / 1000) * 1000 + (boundaryHour - hour) * hourMs - minute * 60_000 - second * 1000;
}
