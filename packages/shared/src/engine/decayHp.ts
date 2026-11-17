import type { GameState, PlayerState } from "../types";
import { combatValue, subtractCombatValues } from "./combatValues";
import { ANNIHILATION_MARK, DECAY_CARD_ID, DECAY_FIELD_HP_LIMIT, DECAY_HP_CAP_ID, DECAY_MARK } from "./decayIds";
import { getActiveSkillCount } from "./gameFactory";
import { clampPlayerHpToCap } from "./infiniteValues";
import { emptyCityBodies } from "./illusionRules";
import { canGainStatus } from "./karmaSong";

type DecayMarkKind = typeof DECAY_MARK | typeof ANNIHILATION_MARK;
const decayMarkNames: Record<DecayMarkKind, string> = {
  [DECAY_MARK]: "破败印记",
  [ANNIHILATION_MARK]: "寂灭印记"
};

export function getDecayMarkCount(player: Pick<PlayerState, "buffs"> | undefined, kind: DecayMarkKind): number {
  return player?.buffs.reduce((count, buff) => buff.id === kind ? count + buff.stacks : count, 0) ?? 0;
}

export function grantDecayMarks(player: PlayerState, kind: DecayMarkKind, stacks = 1): void {
  if (stacks <= 0 || !canGainStatus(player)) return;
  const mark = player.buffs.find((buff) => buff.id === kind);
  if (mark) mark.stacks += stacks;
  else player.buffs.push({ id: kind, name: decayMarkNames[kind], stacks });
}

export function syncDecayHpCaps(state: Pick<GameState, "players">): boolean {
  const active = state.players.some((player) => player.kind !== "spectator" && player.status === "alive" &&
    player.bigCards?.some((card) => card.cardId === DECAY_CARD_ID) &&
    getActiveSkillCount(player, DECAY_HP_CAP_ID));
  let changed = false;
  for (const player of [...state.players, ...emptyCityBodies(state)]) {
    if (player.kind === "spectator") continue;
    if (active) {
      if (!player.decayFieldHpCap) changed = true;
      player.decayFieldHpCap = true;
      if (clampPlayerHpToCap(player)) changed = true;
    } else if (player.decayFieldHpCap) {
      delete player.decayFieldHpCap;
      changed = true;
    }
  }
  return changed;
}

export function reduceDecayHpCap(player: PlayerState, amount: number, clamp = true): void {
  if (amount <= 0) return;
  const cap = player.decayReducedHpCap ?? combatValue(DECAY_FIELD_HP_LIMIT);
  player.decayReducedHpCap = subtractCombatValues(cap, combatValue(amount));
  if (clamp) clampPlayerHpToCap(player);
}
