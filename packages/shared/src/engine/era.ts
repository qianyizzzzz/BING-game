import type { GameState, PlayerAction, PlayerId, PlayerState } from "../types";
import { getSkill, getSkillPlay } from "../skills/registry";
import { getFusionEnhancementCount } from "../skills/fusion";
import { ERA_AREA, ERA_CONFLICT, ERA_CONTROL, ERA_FIELD_NAMES, ERA_FIRE, ERA_RESTART, type EraFieldId } from "./eraIds";
import { bigAbilitySource } from "./bigCards";
import { getActiveSkillCount, getPuppetMasterId } from "./gameFactory";
import { BASE_ATTACKS, getActionLabel } from "./attacks";
import { canBypassTargetSelection, isReversalResponseRestricted, preventsTargetSelection, shareSpace } from "./spaces";
import { activeTotems } from "./totems";
import { TOTEM_KINDS } from "./totemIds";
import { getMoveBlockReason } from "./moveEligibility";

export interface EraField {
  id: string;
  skillId: EraFieldId;
  sourceId: PlayerId;
  spaceId?: string;
  expiresAtRound: number;
  lastTickTurn?: number;
}

export interface EraTargetEdit {
  controllerId: PlayerId;
  sourceId: PlayerId;
  moveIndex: number;
  targetIds: PlayerId[];
}

export interface EraTargetChoice {
  sourceId: PlayerId;
  moveIndex: number;
  label: string;
  targets: Array<{ id: PlayerId; name: string }>;
  selectedIds: PlayerId[];
}

export const ERA_TARGET_EDIT_LIMIT = 1000;

export function activeEraFields(state: Pick<GameState, "roundNumber" | "eraFields">, skillId?: EraFieldId): EraField[] {
  return state.eraFields?.filter((field) => field.expiresAtRound > state.roundNumber &&
    (!skillId || field.skillId === skillId)) ?? [];
}

export function addEraField(state: GameState, player: PlayerState, skillId: EraFieldId, id: string): EraField {
  const field: EraField = {
    id, skillId, sourceId: player.id, ...(player.spaceId === undefined ? {} : { spaceId: player.spaceId }),
    expiresAtRound: Math.min(Number.MAX_SAFE_INTEGER, state.roundNumber + 5 * (player.eraDurationMultiplier ?? 1))
  };
  (state.eraFields ??= []).push(field);
  return field;
}

export function eraRestartSource(player: PlayerState, instanceId?: string): string | undefined {
  return player.bigCards?.find((card) => !card.eraRestartUsed && (!instanceId || instanceId === card.instanceId) &&
    bigAbilitySource(player, { skillId: ERA_RESTART, bigCardInstanceId: card.instanceId }))?.instanceId;
}

export function eraFireRevivalBypass(state: GameState, player: PlayerState | undefined, skillId: string): boolean {
  return Boolean(player && activeEraFields(state, ERA_FIRE).some((field) => field.spaceId === player.spaceId) &&
    getFusionEnhancementCount(player, skillId, ["天火之狱"]) > 0);
}

export function hasEraControl(state: GameState, player: PlayerState): boolean {
  return player.status === "alive" && eraFieldSourceIds(state, ERA_CONTROL, player.spaceId).has(player.id);
}

export function eraFieldSourceIds(state: GameState, skillId: EraFieldId, spaceId?: string): Set<PlayerId> {
  const sources = new Set(activeEraFields(state, skillId).filter((field) => field.spaceId === spaceId).map(({ sourceId }) => sourceId));
  if (state.phase === "action_window" && state.activeTimingPhase === "turn_change_action" && state.turnResolutionStarted)
    for (const player of state.players) {
      if (player.status !== "alive" || player.spaceId !== spaceId || !getActiveSkillCount(player, skillId)) continue;
      if (state.pendingActions[player.id]?.actions.some((action, index) =>
        action.type === "skill" && action.skillId === skillId && eraActionAvailable(state, player, index))) sources.add(player.id);
    }
  return sources;
}

function eraActionAvailable(state: GameState, source: PlayerState, index: number): boolean {
  const suppression = state.turnMoveSuppression;
  return !getMoveBlockReason(state, source) && !suppression?.invalidated[source.id]?.includes(index) &&
    !suppression?.delayed?.[source.id]?.includes(index) && !suppression?.vacuumReturned?.[source.id]?.includes(index);
}

export function eraMoveTargetMode(action: PlayerAction): "all" | "single" | undefined {
  if (action.type === "attack") return BASE_ATTACKS[action.attackId]?.isArea ? "all" : "single";
  if (action.type !== "skill") return undefined;
  const mode = getSkillPlay(action.skillId)?.targetMode;
  if (mode === "all" || mode === "single") return mode;
}

export function eraEditForMove(state: GameState, source: PlayerState, index: number, activeOnly = true): EraTargetEdit | undefined {
  const edits = state.eraTargetEdits ?? [];
  if (!edits.length) return;
  const eligible = activeOnly ? eraFieldSourceIds(state, ERA_CONTROL, source.spaceId) : undefined;
  for (let indexInHistory = edits.length - 1; indexInHistory >= 0; indexInHistory--) {
    const edit = edits[indexInHistory]!;
    if (edit.sourceId === source.id && edit.moveIndex === index && (!eligible || eligible.has(edit.controllerId))) return edit;
  }
}

function isEraAttackMove(action: PlayerAction): boolean {
  return action.type === "attack" || action.type === "skill" &&
    getSkillPlay(action.skillId)?.kind === "attack" && !getSkillPlay(action.skillId)?.nonAttackMove;
}

export function eraSelectableTargets(state: GameState, source: PlayerState, action: PlayerAction) {
  const attack = isEraAttackMove(action);
  const master = attack ? getPuppetMasterId(source) : undefined;
  const candidates = state.players.filter((target) => target.kind !== "spectator" && target.status === "alive" &&
    target.id !== master && shareSpace(source, target) &&
    (!preventsTargetSelection(target) || canBypassTargetSelection(state, source.id, target)));
  const totems = attack ? activeTotems(state).filter((totem) => totem.spaceId === source.spaceId)
    .map((totem, index) => ({ id: totem.id, name: `${TOTEM_KINDS[totem.kind].name} · ${index + 1}` })) : [];
  return [...candidates.map(({ id, name }) => ({ id, name })), ...totems];
}

export function eraTargetChoices(state: GameState, player: PlayerState | undefined): EraTargetChoice[] {
  if (!player || state.phase !== "action_window" || state.activeTimingPhase !== "turn_change_action" || !hasEraControl(state, player) ||
    isReversalResponseRestricted(state, player.id) ||
    (state.eraTargetEdits?.length ?? 0) >= ERA_TARGET_EDIT_LIMIT) return [];
  return state.players.flatMap((source) => {
    if (source.kind === "spectator" || source.status !== "alive" || !shareSpace(player, source)) return [];
    return (state.pendingActions[source.id]?.actions ?? []).flatMap((action, moveIndex) => {
      const mode = eraMoveTargetMode(action);
      if (!mode || !eraActionAvailable(state, source, moveIndex) ||
        action.type === "skill" && !getSkill(action.skillId)?.implemented) return [];
      const targets = eraSelectableTargets(state, source, action);
      const edit = eraEditForMove(state, source, moveIndex, false);
      const conflict = isEraAttackMove(action) && [...eraFieldSourceIds(state, ERA_CONFLICT, source.spaceId)].some((id) => id !== source.id);
      const area = mode === "all" || isEraAttackMove(action) && eraFieldSourceIds(state, ERA_AREA, source.spaceId).size > 0;
      const original = conflict ? [source.id] : area ? targets.filter(({ id }) => id !== source.id &&
        state.players.some((candidate) => candidate.id === id)).map(({ id }) => id) :
        [...new Set([...(action.type === "skill" ? action.targetIds ?? [] : []), "targetId" in action ? action.targetId : undefined])]
          .flatMap((id) => id && targets.some((target) => target.id === id) ? [id] : []);
      return [{ sourceId: source.id, moveIndex, label: `${source.name} · ${getActionLabel(action)}`, targets,
        selectedIds: edit?.targetIds ?? original }];
    });
  });
}

export function describeEraField(field: EraField, round: number): { label: string; value: string } {
  return { label: ERA_FIELD_NAMES[field.skillId], value: `剩 ${field.expiresAtRound - round} 轮` };
}
