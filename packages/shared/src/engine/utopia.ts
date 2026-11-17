import { DREAM_ELEMENT, UTOPIA_DREAM_ID, UTOPIA_FIELD_ID, UTOPIA_MOVE_ID, UTOPIA_VICTORY_ID } from "../bigCards/abilities";
import type { AttackStats, GameState, PlayerId, PlayerState, SkillAction } from "../types";
import { INFINITY_VALUE, scaleCombatValue, projectCombatValue } from "./combatValues";
import { changeElementAmount, getElementAmount } from "./elementResources";
import { alivePlayers, createBaseEvent, createId, getActiveSkillCount } from "./gameFactory";
import { applyNegativeStatus } from "./negativeStatuses";
import { grantInitializedSkill } from "./skillAcquisition";
import { isDreamSpace } from "./spaces";
import { negativeStatusesHaveNoEffect } from "./effectCategories";

export const DREAM_UNLOCKS = "utopia_dream_unlocks";
const dreamSkills = ["1005", "1004", "1006", "1063"] as const;

export function getDreamUnlockCount(player: Pick<PlayerState, "buffs">): number {
  return player.buffs.find((buff) => buff.id === DREAM_UNLOCKS)?.stacks ?? 0;
}

/** A gain event can buy several rewards, or heal once if the track was already complete. */
export function addDreamElement(state: GameState, player: PlayerState, amount: number): boolean {
  if (amount <= 0) return false;
  const gain = Math.min(amount, Number.MAX_SAFE_INTEGER - getElementAmount(player, DREAM_ELEMENT));
  if (!gain) return false;
  changeElementAmount(player, DREAM_ELEMENT, gain);
  if (!getActiveSkillCount(player, UTOPIA_DREAM_ID)) return false;
  let unlocked = getDreamUnlockCount(player);
  if (unlocked >= dreamSkills.length) return true;
  const previous = unlocked;
  while (unlocked < dreamSkills.length && getElementAmount(player, DREAM_ELEMENT) >= 5) {
    changeElementAmount(player, DREAM_ELEMENT, -5);
    grantInitializedSkill(state, player.id, dreamSkills[unlocked++]!, "梦之乌托邦获得技能", false);
  }
  if (unlocked !== previous) {
    player.buffs = player.buffs.filter((buff) => buff.id !== DREAM_UNLOCKS);
    player.buffs.push({ id: DREAM_UNLOCKS, name: "梦之乌托邦·技能获得进度", stacks: unlocked });
  }
  return false;
}

export function isSleeping(player: Pick<PlayerState, "buffs" | "bigCards"> | undefined, turnNumber: number): boolean {
  return !negativeStatusesHaveNoEffect(player) && Boolean(player?.buffs.some((buff) => (buff.stateType === "sleep" || buff.id === "sleep") &&
    buff.stacks > 0 && (buff.expiresAtTurn ?? Infinity) > turnNumber));
}

export function wakeFromSleep(player: PlayerState): void {
  player.buffs = player.buffs.filter((buff) => buff.stateType !== "sleep" && buff.id !== "sleep");
}

export function applySleep(state: GameState, sourceId: PlayerId, targetId: PlayerId, duration: number): boolean {
  return applyNegativeStatus(state, targetId, "sleep", (target, appliedBy) => {
    const expiresAtTurn = state.turnNumber + duration + 1;
    const previous = target.buffs.find((buff) => buff.stateType === "sleep" || buff.id === "sleep");
    if (previous) {
      previous.stacks = Math.max(previous.stacks, duration);
      previous.expiresAtTurn = Math.max(previous.expiresAtTurn ?? Infinity, expiresAtTurn);
    } else target.buffs.push({ id: "sleep", stateType: "sleep", name: "睡眠", stacks: duration, expiresAtTurn,
      moveBlockedFromTurn: state.turnNumber + 1,
      ...(appliedBy ? { sourcePlayerId: appliedBy } : {}) });
  }, sourceId);
}

export function getUtopiaTargetIds(action: Pick<SkillAction, "targetId" | "targetIds">): PlayerId[] {
  return [...new Set([action.targetId, ...(action.targetIds ?? [])].filter((id): id is PlayerId => Boolean(id)))];
}

export function getDreamClashStats(action: SkillAction): AttackStats | undefined {
  if (action.skillId !== UTOPIA_MOVE_ID && action.skillId !== UTOPIA_FIELD_ID) return undefined;
  const isArea = action.skillId === UTOPIA_FIELD_ID;
  const levelValue = scaleCombatValue(INFINITY_VALUE, action.stacks);
  return { id: action.skillId, name: isArea ? "天梦领域" : "梦之乌托邦", cost: isArea ? 0 : 3 * action.stacks,
    level: projectCombatValue(levelValue), levelValue, power: 0, powerValue: [],
    defenseTag: isArea ? "stone" : "rebound", traits: isArea ? ["skill", "area", "pierce_rebound"] : ["skill"],
    element: "physical", elements: ["physical"], isArea, isSkill: true, nonAttackMove: true, stacks: action.stacks };
}

export function queueDreamEntry(state: GameState, target: PlayerState): void {
  if (target.buffs.some((buff) => buff.dreamEntryTurn === state.turnNumber)) return;
  target.buffs.push({ id: "utopia_entry", name: "梦之乌托邦·入梦", stacks: 1, dreamEntryTurn: state.turnNumber });
}

export function applyDreamEntries(state: GameState): void {
  for (const target of state.players) {
    if (!target.buffs.some((buff) => buff.dreamEntryTurn === state.turnNumber)) continue;
    target.buffs = target.buffs.filter((buff) => buff.dreamEntryTurn !== state.turnNumber);
    if (target.status !== "alive") continue;
    const id = createId("dream_utopia");
    (state.smallSpaces ??= {})[id] = { name: "梦之乌托邦", kind: "dream_utopia", cakeMultiplier: 1, expiresAtRound: state.roundNumber + 2 };
    target.spaceId = id;
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${target.name} 进入独立的梦之乌托邦，持续2轮` });
  }
}

export function dreamVictoryIds(state: GameState): PlayerId[] {
  const alive = alivePlayers(state);
  if (!alive.every((player) => isDreamSpace(state, player) || isSleeping(player, state.turnNumber))) return [];
  return alive.filter((player) => getActiveSkillCount(player, UTOPIA_VICTORY_ID) > 0).map(({ id }) => id);
}
