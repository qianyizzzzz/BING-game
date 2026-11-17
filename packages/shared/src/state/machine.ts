import { GamePhase, GameState, PlayerState } from "../types";
import { alivePlayers, ordinaryVictoryPlayers, playerHasActiveSkill, victoryEligiblePlayers } from "../engine/gameFactory";
import { getActiveFusionCount } from "../skills/fusion";
import { dreamVictoryIds } from "../engine/utopia";
import { hasEmptyCityRecovery } from "../engine/illusionRules";
import { CHEAT_BACKLASH_ID, CHEAT_VICTORY_CLAIM } from "../engine/cheatServerIds";

export type GameTransition =
  | "join"
  | "start"
  | "submit_action"
  | "all_actions_ready"
  | "resolve_done"
  | "finish";

export const GAME_STATE_GRAPH: Record<GamePhase, Partial<Record<GameTransition, GamePhase>>> = {
  lobby: {
    join: "lobby",
    start: "action_window"
  },
  action_window: {
    submit_action: "action_window",
    resolve_done: "collecting_actions",
    finish: "finished"
  },
  collecting_actions: {
    submit_action: "collecting_actions",
    all_actions_ready: "resolving",
    finish: "finished"
  },
  resolving: {
    resolve_done: "collecting_actions",
    finish: "finished"
  },
  finished: {}
};

export function canTransition(
  phase: GamePhase,
  transition: GameTransition
): boolean {
  return Boolean(GAME_STATE_GRAPH[phase][transition]);
}

export function hasSettledCheatVictoryClaim(state: GameState, player: PlayerState): boolean {
  return player.defeatLevel !== 6 && !state.pendingDamageItems?.some((item) =>
    item.targetId === player.id && item.sourceAbilityId === CHEAT_BACKLASH_ID) &&
    !player.buffs.some((buff) => buff.id === "pending_death") &&
    player.buffs.some((buff) => buff.id === CHEAT_VICTORY_CLAIM);
}

export function shouldFinishGame(state: GameState): boolean {
  if (state.victoryCounter || state.retirementCounter || state.sevenStarLegacyResume || state.gameSwitch || hasEmptyCityRecovery(state)) return false;
  const alive = alivePlayers(state);
  const victoryAlive = victoryEligiblePlayers(state);
  const eligibleForBoard = victoryAlive.filter((player) => !state.spentBoardVictoryPlayerIds?.includes(player.id));
  return (
    (victoryAlive.length <= 3 && eligibleForBoard.some((player) => getActiveFusionCount(player, "黑白板") > 0)) ||
    ordinaryVictoryPlayers(state).length <= 1 ||
    dreamVictoryIds(state).length > 0 ||
    alive.some((player) => player.buffs.some((buff) => buff.id.startsWith("instant_win:") && buff.id !== CHEAT_VICTORY_CLAIM)) ||
    state.players.some((player) => hasSettledCheatVictoryClaim(state, player)) ||
    (victoryAlive.length === 2 &&
      eligibleForBoard.some((player) => playerHasActiveSkill(player, "1104")))
  );
}

export const STATE_MACHINE_MERMAID = `stateDiagram-v2
  [*] --> lobby
  lobby --> lobby: join
  lobby --> action_window: start
  action_window --> action_window: action / pass
  action_window --> collecting_actions: turn action
  collecting_actions --> collecting_actions: submit_action
  collecting_actions --> resolving: all_actions_ready
  resolving --> collecting_actions: no winner
  resolving --> finished: alive players <= 1
  finished --> [*]`;
