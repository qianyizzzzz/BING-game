import type { AttackElement, DefenseKind, GameState, PlayerAction, PlayerId, PlayerState, SkillId } from "../types";
import { bigCardHasAbility } from "../bigCards/abilities";
import { getBigCard } from "../bigCards/catalog";
import { getFusionSkillId, getOwnedSkillIds, isFusionActive } from "../skills/fusion";
import { getSkill, getSkillPlay } from "../skills/registry";
import { createId, findPlayer, getActiveSkillCount } from "./gameFactory";
import { isDefenseSkill, isThornSkillDisabled, negativeStatusesHaveNoEffect, registerStateDefinition, THORN_SKILL_DISABLED } from "./effectCategories";
import { applyNegativeStatus, registerNegativeStatus } from "./negativeStatuses";
import { addSiphonStatus, sharePositiveState } from "./siphon";
import { THORN_DANCE_ID, THORN_INHERIT_ID, THORN_PIERCE_ID, THORN_STING_ID } from "./thornDanceIds";

export { THORN_POISON } from "./thornDanceIds";
import { THORN_POISON } from "./thornDanceIds";
export const THORN_BIND = "thorn_bind";
export const THORN_DEFENSE_DISABLED = "thorn_defense_disabled";
export const THORN_DURATION = "thorn_duration";
const BASIC_DEFENSES = { small: "小防", youtiao: "油条", stone: "石头" } as const;
const ELEMENTS: readonly AttackElement[] = ["fire", "ice", "electric", "poison"];
for (const [id, name] of [[THORN_POISON, "中毒"], [THORN_BIND, "缚·攻击失效"],
  [THORN_DEFENSE_DISABLED, "穿·防御招式失效"], [THORN_SKILL_DISABLED, "穿·防御技能失效"]] as const)
  registerNegativeStatus({ id, name });
registerStateDefinition({ id: THORN_DURATION, name: "舞·时长增幅", categories: ["positive"] });

export interface ThornPierceResponse {
  id: string;
  sourceId: PlayerId;
  targetId: PlayerId;
  duration: number;
  bypassSkillImmunity?: true;
}

export function enhancedThornFusionCount(player: PlayerState | undefined, name: "反伤刺甲" | "自然之灵"): number {
  if (!player || !getActiveSkillCount(player, THORN_INHERIT_ID)) return 0;
  const skillId = getFusionSkillId(name);
  return (player.skillFusions ?? []).filter((fusion) => fusion.skillId === skillId && isFusionActive(player, fusion) &&
    player.bigCards?.some((card) => card.instanceId === fusion.sourceBigCardInstanceId && bigCardHasAbility(card, THORN_INHERIT_ID))).length;
}

export function thornIgnoresElement(player: PlayerState | undefined, elements: readonly AttackElement[]): boolean {
  return elements.some((element) => ELEMENTS.includes(element)) && enhancedThornFusionCount(player, "自然之灵") > 0;
}

export function thornDuration(player: PlayerState, stacks = 1): number {
  const times = player.buffs.find((buff) => buff.id === THORN_DURATION)?.stacks ?? 0;
  return Math.min(Math.floor(Number.MAX_SAFE_INTEGER / 4), stacks * 10 ** times);
}

export function empowerThornDance(state: GameState, player: PlayerState, count: number): void {
  const existing = player.buffs.find((buff) => buff.id === THORN_DURATION);
  if (existing) {
    existing.stacks += count;
    sharePositiveState(state, player, existing);
  } else addSiphonStatus(state, player, { id: THORN_DURATION, stateType: THORN_DURATION, name: "舞·时长增幅", stacks: count, sourceAbilityId: THORN_DANCE_ID });
}

export function isBasicDefenseDisabled(player: PlayerState, defense: DefenseKind): boolean {
  return !negativeStatusesHaveNoEffect(player) && player.buffs.some((buff) => buff.id === `${THORN_DEFENSE_DISABLED}:${defense}`);
}

export function thornDisablesMove(player: PlayerState, move: PlayerAction): boolean {
  if (move.type === "defense") return isBasicDefenseDisabled(player, move.defense);
  if (negativeStatusesHaveNoEffect(player) || !player.buffs.some((buff) => buff.stateType === THORN_BIND)) return false;
  if (move.type === "attack") return true;
  if (move.type !== "skill" || move.skillId === "1035") return false;
  const play = getSkillPlay(move.skillId);
  return play?.kind === "attack" && !play.nonAttackMove;
}

function exposedDefenseSkills(target: PlayerState): string[] {
  const exposed = new Set(target.revealedSkillIds);
  for (const card of target.bigCards ?? []) if (card.publiclyRevealed) {
    for (const { id } of getBigCard(card.cardId)?.abilities ?? []) if (bigCardHasAbility(card, id)) exposed.add(id);
  }
  return getOwnedSkillIds(target).filter((id) => exposed.has(id) && isDefenseSkill(id) && !isThornSkillDisabled(target, id));
}

export function thornPierceChoices(state: GameState, actorId: PlayerId): Array<{ id: string; skillId: string; label: string }> {
  return (state.thornPierceResponses ?? []).flatMap((response) => {
    if (response.sourceId !== actorId) return [];
    const target = findPlayer(state, response.targetId);
    if (!target || target.status !== "alive") return [];
    const base = Object.entries(BASIC_DEFENSES).filter(([defense]) => !isBasicDefenseDisabled(target, defense as DefenseKind));
    const options = base.length ? base : [...new Set(exposedDefenseSkills(target))].map((id) => [id, getSkill(id)?.name ?? id]);
    return options.map(([id, name]) => ({ id: `${response.id}/${id}`, skillId: THORN_PIERCE_ID, label: `${target.name} · ${name}` }));
  });
}

export function queueThornPierce(state: GameState, sourceId: PlayerId, targetId: PlayerId, duration: number, bypassSkillImmunity = false): void {
  (state.thornPierceResponses ??= []).push({ id: createId("thorn_pierce"), sourceId, targetId, duration,
    ...(bypassSkillImmunity ? { bypassSkillImmunity: true } : {}) });
}

export function applyThornPierceChoice(state: GameState, actorId: PlayerId, choice: string): void {
  const [id, key] = choice.split("/");
  const response = state.thornPierceResponses?.find((entry) => entry.id === id && entry.sourceId === actorId);
  if (!response || !key) return;
  state.thornPierceResponses = state.thornPierceResponses!.filter((entry) => entry !== response);
  const defense = BASIC_DEFENSES[key as keyof typeof BASIC_DEFENSES];
  const status = defense ? THORN_DEFENSE_DISABLED : THORN_SKILL_DISABLED;
  applyNegativeStatus(state, response.targetId, status, (target, appliedBy) => {
    const buffId = `${status}:${key}`;
    const existing = target.buffs.find((buff) => buff.id === buffId);
    const until = state.roundNumber + 1 + response.duration;
    if (existing) existing.expiresAtRound = Math.max(existing.expiresAtRound ?? 0, until);
    else target.buffs.push({ id: buffId, name: `穿·${defense ?? getSkill(key)?.name ?? key}失效`, stateType: status, stacks: 1,
      expiresAtRound: until, sourcePlayerId: appliedBy ?? actorId });
  }, actorId, false, response.bypassSkillImmunity);
}

export function applyThornPoison(state: GameState, sourceId: PlayerId, targetId: PlayerId, stacks: number, duration: number, bypass = false,
  turnBasedSource?: SkillId): void {
  if (thornIgnoresElement(findPlayer(state, targetId), ["poison"])) return;
  applyNegativeStatus(state, targetId, THORN_POISON, (target, appliedBy) => {
    if (thornIgnoresElement(target, ["poison"])) return;
    target.buffs.push({ id: createId(THORN_POISON), name: "中毒", stateType: THORN_POISON, stacks,
      ...(turnBasedSource ? { expiresAtTurn: state.turnNumber + duration, sourceAbilityId: turnBasedSource } :
        { expiresAtRound: state.roundNumber + 1 + duration, sourceAbilityId: THORN_STING_ID }),
      sourcePlayerId: appliedBy ?? sourceId });
  }, sourceId, false, bypass);
}

export function applyThornBind(state: GameState, sourceId: PlayerId, targetId: PlayerId, duration: number, bypass = false): void {
  applyNegativeStatus(state, targetId, THORN_BIND, (target, appliedBy) => {
    const existing = target.buffs.find((buff) => buff.id === THORN_BIND);
    if (existing) existing.expiresAtRound = Math.min(Number.MAX_SAFE_INTEGER, (existing.expiresAtRound ?? state.roundNumber + 1) + duration);
    else target.buffs.push({ id: THORN_BIND, name: "缚·攻击失效", stateType: THORN_BIND, stacks: 1,
      expiresAtRound: state.roundNumber + 1 + duration, sourcePlayerId: appliedBy ?? sourceId });
  }, sourceId, false, bypass);
}
