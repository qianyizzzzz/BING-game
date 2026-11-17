import type { GameState, PlayerState, SkillId } from "../types";
import { getSkill, getSkillCakeCostKind } from "../skills/registry";
import type { SkillPlayDefinition } from "../skills/types";
import { ACTION_WINDOW_PHASES } from "../skills/phases";
import { negativeStatusesHaveNoEffect } from "./effectCategories";
import { SWORD_ARRAY_NO_CAKE_STATE, SWORD_ARRAY_PI_STATE } from "./swordArrayIds";

type Round = Pick<GameState, "roundNumber">;
type StateHolder = Pick<PlayerState, "buffs" | "bigCards" | "skills" | "skillFusions">;
type StatusHolder = { buffs: ReadonlyArray<Pick<Partial<PlayerState["buffs"][number]>,
  "id" | "stateType" | "expiresAtRound" | "sourceAbilityId" | "unaffectedByNegativeStatuses">>; bigCards?: PlayerState["bigCards"] };

function requiredNumber(value: number | undefined): boolean {
  return value === 3 || value === Math.PI;
}

function playHasRequiredNumber(play: SkillPlayDefinition | undefined): boolean {
  if (!play) return false;
  const finite = (value: SkillPlayDefinition["powerValue"], fallback: number | undefined) =>
    value ? value.every((term) => term.exponent === 0) ? value.reduce((sum, term) => sum + term.coefficient, 0) : undefined : fallback;
  return [play.cost, play.bloodQiCost, play.itemCost?.perStack, play.elementCost?.perStack, play.additionalElementCost?.perStack, play.usesPerGame,
    finite(play.powerValue, play.power), finite(play.levelValue, play.level), play.freezeTurns, play.resourceGainPerStack,
    play.selfHeal, play.selfDamage, play.targetDamage, play.allEnemyDamage, play.selectedTargetCount, play.optionalTargetCount,
    play.hpThreshold, ...(play.damageParts ?? [])].some(requiredNumber);
}

const literal = "(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?";
const ruleNumberPattern = new RegExp(
  `(?<![\\w./-])([+-]?(?:(?:${literal})?π|${literal}))(/(?:[+-]?${literal}|[a-zα-ω]))?(%)?(?![\\w.])`, "giu"
);
const writtenThree = /(?<![负負零一二两三四五六七八九十百千万亿点.])三(?!点[零一二两三四五六七八九])(?=回合|饼|点|级|层|轮|次|秒|个|张|名|人|倍|条|血|份)/u;
const cachedRuleMatches = new Map<string, boolean>();

/** Match complete values in the original rule text, including signed decimals and fractions. */
export function swordArrayRuleContainsPiOrThree(rule: string): boolean {
  const cached = cachedRuleMatches.get(rule);
  if (cached !== undefined) return cached;
  const text = rule.normalize("NFKC").replace(/[−–]/g, "-").replace(/\s*\/\s*/g, "/");
  const match = writtenThree.test(text) || [...text.matchAll(ruleNumberPattern)].some(([, value, divisor, percent]) => {
    if (!value) return false;
    const coefficient = value.endsWith("π") ? value.slice(0, -1) : undefined;
    const number = coefficient === undefined ? Number(value) :
      (coefficient === "-" ? -1 : !coefficient || coefficient === "+" ? 1 : Number(coefficient)) * Math.PI;
    return requiredNumber(number / (divisor ? Number(divisor.slice(1)) : 1) / (percent ? 100 : 1));
  });
  cachedRuleMatches.set(rule, match);
  return match;
}

function hasStatus(player: StatusHolder | undefined, id: string, round?: number): boolean {
  return Boolean(player && !negativeStatusesHaveNoEffect(player) &&
    player.buffs.some((buff) => buff.stateType === id && (round === undefined || (buff.expiresAtRound ?? Infinity) > round)));
}

export function swordArrayPiBlocksSkill(state: Round, player: StatusHolder | undefined, skillId: SkillId): boolean {
  if (!hasStatus(player, SWORD_ARRAY_PI_STATE, state.roundNumber)) return false;
  const skill = getSkill(skillId);
  if (!skill) return false;
  const rule = skill.description.startsWith(`${skill.name}：`)
    ? skill.description.slice(skill.name.length + 1) : skill.description;
  return !playHasRequiredNumber(skill.play) && !swordArrayRuleContainsPiOrThree(rule);
}

export function swordArrayNoCakeSuppressesSkill(state: Round, player: StateHolder | undefined, skillId: SkillId): boolean {
  return hasStatus(player, SWORD_ARRAY_NO_CAKE_STATE, state.roundNumber) && getSkillCakeCostKind(skillId, player) === "none";
}

/** Passive readers run without a game state. The round transition prunes expired negative statuses. */
export function swordArrayNoCakeSuppressesPassive(player: StatusHolder | undefined, skillId: SkillId): boolean {
  if (!hasStatus(player, SWORD_ARRAY_NO_CAKE_STATE)) return false;
  const skill = getSkill(skillId);
  return (!skill?.play || skill.timingPhases.some((phase) => !ACTION_WINDOW_PHASES.has(phase))) &&
    getSkillCakeCostKind(skillId) === "none";
}

export function pruneSwordArrayNoCake(state: Pick<GameState, "roundNumber" | "players">): void {
  for (const player of state.players) if (player.buffs.some((buff) => buff.stateType === SWORD_ARRAY_NO_CAKE_STATE &&
    (buff.expiresAtRound ?? Infinity) <= state.roundNumber)) {
    player.buffs = player.buffs.filter((buff) => buff.stateType !== SWORD_ARRAY_NO_CAKE_STATE ||
      (buff.expiresAtRound ?? Infinity) > state.roundNumber);
  }
}
