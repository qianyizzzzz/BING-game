import type { BuffState, GameState, PlayerAction, PlayerId, PlayerState, SkillId } from "../types";
import { createBaseEvent, createId, findPlayer, getActiveSkillCount } from "./gameFactory";
import { canReceiveBigCard, grantFreshBigCard, pruneLostSkillKnowledge, removeBigCardInstance } from "./bigCards";
import { getRootFusions } from "../skills/fusion";
import { ensureFusionSkillInventory, pruneRemovedSkillKnowledge, removeFusionTrees, removeSkillInstanceAt } from "./skillInventory";
import { grantInitializedSkill } from "./skillAcquisition";
import { effectCategoryIsSuppressed } from "./effectCategories";
import { isSkillIgnored } from "./skillIgnore";
import { STAR_MOON_PIERCE } from "./starMoonIds";
import { RETIRE_VALUE } from "./combatValues";
import { YIYUAN_CHANGE, YIYUAN_CHANGE_STATE, YIYUAN_GROWTH, YIYUAN_MIMIC_STATE, YIYUAN_STEP, YIYUAN_STEP_STATE } from "./yiyuanIds";

export interface YiyuanRequest {
  casterId: PlayerId;
  playerId: PlayerId;
  round: number;
  turn: number;
  accepted?: boolean;
}

export interface YiyuanSchedule {
  playerId: PlayerId;
  round: number;
  turn: number;
  rejected?: true;
  moves: PlayerAction[];
}

export type YiyuanSkillSnapshot = Pick<PlayerState, "skills" | "bigCards" | "skillInventory" | "skillFusions" |
  "revealedSkillIds" | "witherSelections"> & { uses: BuffState[]; startedAtTurn: number; startedAtRound: number };

export function yiyuanEffectActive(player: PlayerState | undefined, state: Pick<GameState, "turnNumber">, stateType: string): boolean {
  return Boolean(player?.buffs.some((buff) => buff.stateType === stateType &&
    (buff.expiresAtTurn ?? Infinity) > state.turnNumber && (!buff.sourceAbilityId || !isSkillIgnored(player, buff.sourceAbilityId))));
}

export function yiyuanCakeMultiplier(player: PlayerState, state: Pick<GameState, "turnNumber">): number {
  return (yiyuanEffectActive(player, state, YIYUAN_STEP_STATE) ? 3 : 1) *
    player.buffs.filter(({ stateType }) => stateType === YIYUAN_GROWTH).reduce((factor, buff) => factor * 5 ** buff.stacks, 1);
}

export function yiyuanDodgesEffect(state: GameState, target: PlayerState | undefined, sourceId: PlayerId | undefined,
  name: string, canDodge: boolean): boolean {
  if (!target || target.id === sourceId || !canDodge || isSkillIgnored(target, YIYUAN_STEP) ||
    effectCategoryIsSuppressed(target, "damage_evasion") || getActiveSkillCount(findPlayer(state, sourceId ?? ""), STAR_MOON_PIERCE) ||
    !target.buffs.some((buff) => buff.stateType === YIYUAN_STEP_STATE && buff.startsAtTurn === state.turnNumber &&
      (buff.expiresAtTurn ?? 0) > state.turnNumber)) return false;
  state.eventLog.push({ ...createBaseEvent(state, "attack_blocked"), type: "attack_blocked", sourceId: sourceId ?? target.id,
    targetId: target.id, attackName: name, blockKind: "dodge", protectionName: "一元·瞬移" });
  return true;
}

function isSkillUseState(buff: BuffState): boolean {
  return /^(skill_used:|sealed_skill:|skill_activated:|fusion_use_bonus:)/.test(buff.id) ||
    buff.id.includes("cooldown") || Boolean(buff.sourceFusionId);
}

function independentSkills(player: PlayerState) {
  ensureFusionSkillInventory(player);
  const covered = new Set((player.skillFusions ?? []).flatMap((fusion) => fusion.materialInstanceIds ?? []));
  return player.skillInventory!.filter((skill) => !skill.sourceBigCardInstanceId && !skill.convertedMaterial && !covered.has(skill.instanceId));
}

function grantFusion(state: GameState, recipient: PlayerState, fusion: NonNullable<PlayerState["skillFusions"]>[number], reason: string): void {
  const instanceId = grantInitializedSkill(state, recipient.id, fusion.skillId, reason, false, fusion.materialSkillIds);
  const gained = recipient.skillFusions?.find(({ id }) => id === instanceId);
  if (gained && fusion.judgmentRank) gained.judgmentRank = fusion.judgmentRank;
}

export function mimicYiyuanSkills(state: GameState, player: PlayerState, target: PlayerState): boolean {
  if (player === target || player.yiyuanMimic || !canReceiveBigCard(player, "skill_copy")) return false;
  const original: YiyuanSkillSnapshot = structuredClone({
    skills: player.skills, bigCards: player.bigCards ?? [], skillInventory: player.skillInventory ?? [], skillFusions: player.skillFusions ?? [],
    revealedSkillIds: player.revealedSkillIds, ...(player.witherSelections ? { witherSelections: player.witherSelections } : {}),
    uses: player.buffs.filter(isSkillUseState),
    startedAtTurn: state.turnNumber, startedAtRound: state.roundNumber
  });
  player.yiyuanMimic = original;
  player.skills = [];
  player.skillInventory = [];
  player.skillFusions = [];
  player.bigCards = [];
  player.revealedSkillIds = [];
  delete player.witherSelections;
  player.buffs = player.buffs.filter((buff) => !isSkillUseState(buff));
  for (const skill of independentSkills(target))
    grantInitializedSkill(state, player.id, skill.skillId, "一元·幻化", false);
  for (const fusion of getRootFusions(target).filter((fusion) => !fusion.sourceBigCardInstanceId)) grantFusion(state, player, fusion, "一元·幻化");
  for (const card of target.bigCards ?? []) grantFreshBigCard(state, player, card);
  player.buffs.push({ id: YIYUAN_MIMIC_STATE, stateType: YIYUAN_MIMIC_STATE, name: "一元·幻化", stacks: 1, sourcePlayerId: target.id });
  return true;
}

export function restoreYiyuanSkills(state: Pick<GameState, "turnNumber" | "roundNumber" | "skillKnowledge">, player: PlayerState): void {
  const original = player.yiyuanMimic;
  if (!original) return;
  delete player.yiyuanMimic;
  player.skills = original.skills;
  player.bigCards = original.bigCards ?? [];
  player.skillInventory = original.skillInventory ?? [];
  player.skillFusions = original.skillFusions ?? [];
  player.revealedSkillIds = original.revealedSkillIds;
  if (original.witherSelections) player.witherSelections = original.witherSelections;
  else delete player.witherSelections;
  player.buffs = player.buffs.filter((buff) => buff.stateType !== YIYUAN_MIMIC_STATE && !isSkillUseState(buff));
  for (const buff of original.uses) {
    if (buff.expiresAtTurn !== undefined) buff.expiresAtTurn += state.turnNumber - original.startedAtTurn;
    if (buff.expiresAtRound !== undefined) buff.expiresAtRound += state.roundNumber - original.startedAtRound;
    player.buffs.push(buff);
  }
  pruneRemovedSkillKnowledge(state, player);
}

export function absorbYiyuanSkills(state: GameState, player: PlayerState, target: PlayerState): void {
  if (player === target || !canReceiveBigCard(player, "skill_absorption") || !canReceiveBigCard(target, "skill_absorption") ||
    target.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) return;
  for (const card of [...(target.bigCards ?? [])]) {
    if (!removeBigCardInstance(state, target.id, card.instanceId, "absorb")) continue;
    grantFreshBigCard(state, player, card);
  }
  for (const fusion of getRootFusions(target)) {
    if (!removeFusionTrees(target, [fusion]).length) continue;
    grantFusion(state, player, fusion, "一元·原神");
  }
  for (const skill of [...target.skillInventory ?? []]) {
    const index = target.skillInventory!.findIndex(({ instanceId }) => instanceId === skill.instanceId);
    if (index < 0 || skill.convertedMaterial) continue;
    removeSkillInstanceAt(target, index);
    grantInitializedSkill(state, player.id, skill.skillId, "一元·原神", false);
  }
  if (!target.skillInventory) {
    const skills = target.skills.splice(0);
    for (const id of skills) grantInitializedSkill(state, player.id, id, "一元·原神", false);
  }
  pruneLostSkillKnowledge(state, target);
}

export function addYiyuanLongState(state: GameState, player: PlayerState, kind: "step" | "change"): void {
  const stateType = kind === "step" ? YIYUAN_STEP_STATE : YIYUAN_CHANGE_STATE;
  player.buffs.push({ id: createId(stateType), stateType, name: kind === "step" ? "一元·瞬移" : "一元·天变",
    stacks: 1, startsAtTurn: state.turnNumber, expiresAtTurn: state.turnNumber + 6,
    sourcePlayerId: player.id, sourceAbilityId: kind === "step" ? YIYUAN_STEP : YIYUAN_CHANGE,
    ...(kind === "step" ? { sourceJudgmentRank: "I" as const } : { skillReflectLimit: RETIRE_VALUE }) });
}

export function extendYiyuanLongStates(state: GameState): void {
  for (const player of state.players) for (const buff of player.buffs) {
    if ((buff.stateType === YIYUAN_STEP_STATE || buff.stateType === YIYUAN_CHANGE_STATE) &&
      buff.expiresAtTurn !== undefined && buff.expiresAtTurn > state.turnNumber && buff.lastTickTurn !== state.roundNumber) {
      buff.expiresAtTurn++;
      buff.lastTickTurn = state.roundNumber;
    }
  }
}
