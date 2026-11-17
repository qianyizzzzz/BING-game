import type { PlayerAction, PlayerState } from "../types";
import { getActiveSkillCount } from "./gameFactory";
import {
  SHADOW_BLADE_DANCE_ID, SHADOW_BLADE_ID, SHADOW_COMBO_ID, SHADOW_SHRIEK_ID, SHADOW_STANCE_STATE,
  SHADOW_STOP_SHRIEK_ID, SHADOW_WIND_DANCE_ID
} from "./shadowIds";

type ShadowComboOwner = Pick<PlayerState, "skills" | "buffs" | "skillFusions" | "bigCards" | "shadowCombo">;

const comboMoves: readonly string[] = [
  SHADOW_BLADE_ID, SHADOW_BLADE_DANCE_ID, SHADOW_WIND_DANCE_ID, SHADOW_SHRIEK_ID, SHADOW_STOP_SHRIEK_ID
];

export function hasShadowDance(player: Pick<PlayerState, "buffs">): boolean {
  return player.buffs.some(({ stateType }) => stateType === SHADOW_STANCE_STATE);
}

export function isShadowComboMove(action: PlayerAction): boolean {
  return action.type === "skill" && comboMoves.includes(action.skillId);
}

export function shadowComboForAction(owner: ShadowComboOwner, action: PlayerAction): number {
  if (action.type !== "skill") return 0;
  const index = comboMoves.indexOf(action.skillId);
  if (index < 0 || !getActiveSkillCount(owner, SHADOW_COMBO_ID)) return 0;
  if (index === 0) return 1;
  return owner.shadowCombo === index ? index + 1 : 0;
}

export function recordShadowCombo(owner: ShadowComboOwner, action: PlayerAction): number {
  if (!isShadowComboMove(action)) return 0;
  const combo = shadowComboForAction(owner, action);
  if (combo) owner.shadowCombo = combo;
  else delete owner.shadowCombo;
  return combo;
}
