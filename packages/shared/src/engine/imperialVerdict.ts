import { FOUR_EMPTINESS_ID, MORE_TRIES_ID, VERDICT_GUARD_ID, VERDICT_REWARD_ID, VERDICT_SAND_ID, bigCardHasAbility } from "../bigCards/abilities";
import type { GameState, PlayerId, PlayerState } from "../types";
import { bigAbilitySource, removeBigCardInstance } from "./bigCards";
import { SKILL_DISABLED_BUFF_PREFIX } from "./effectCategories";
import { createBaseEvent, findPlayer, getActiveSkillCount } from "./gameFactory";
import { applyNegativeStatus } from "./negativeStatuses";
import type { PointGame } from "./pointGame";
import { SAND_SKILL_ID, grantInitializedSkill } from "./skillAcquisition";
import { appendSkillInstances, ensureSkillInventory } from "./skillInventory";
import { playersInSpace } from "./spaces";
import { BASE_ATTACKS, getStackedAttackStats } from "./attacks";
import type { ReboundAttack } from "./scatterRebound";
import { getSkillActivationKind } from "./effectCategories";
import { getSkill } from "../skills/registry";

export const VERDICT_SHADOW_BONUS_ID = "verdict_shadow_uses";
const SHADOW_ID = "skill_25_51277";

export function notifyPointGameTarget(state: GameState, targetId: PlayerId): void {
  const target = findPlayer(state, targetId);
  const count = getActiveSkillCount(target, VERDICT_SAND_ID);
  if (target && count) appendSkillInstances(target, Array.from({ length: count }, () => SAND_SKILL_ID));
}

function awardShadowUse(player: PlayerState): void {
  if (!player.skillInventory?.some((entry) => entry.instanceId === player.verdictShadowInstanceId && entry.skillId === SHADOW_ID)) {
    ensureSkillInventory(player);
    player.verdictShadowInstanceId = appendSkillInstances(player, [SHADOW_ID])[0]!;
    player.buffs = player.buffs.filter((buff) => buff.id !== VERDICT_SHADOW_BONUS_ID);
    return;
  }
  const bonus = player.buffs.find((buff) => buff.id === VERDICT_SHADOW_BONUS_ID);
  if (bonus) bonus.stacks++;
  else player.buffs.push({ id: VERDICT_SHADOW_BONUS_ID, name: "御秽裁决·暗影盾额外次数", stacks: 1 });
}

/** Returns whether a four-loss removal must be completed before the game resumes. */
export function recordVerdictResult(state: GameState, game: PointGame): boolean {
  const source = findPlayer(state, game.sourceId);
  if (!source) return false;
  const win = game.winnerId === source.id;
  if (win) awardShadowUse(source);
  const card = source.bigCards?.find((entry) => entry.instanceId === game.sourceCardId && bigCardHasAbility(entry, VERDICT_REWARD_ID)) ??
    source.bigCards?.find((entry) => entry.instanceId === bigAbilitySource(source, { skillId: VERDICT_REWARD_ID }));
  if (!card || !getActiveSkillCount(source, VERDICT_REWARD_ID)) return false;
  const progress = card.verdictProgress ??= { wins: 0, losses: 0, streak: 0 };
  if (win) progress.wins++;
  else progress.losses++;
  progress.streak = win ? Math.max(0, progress.streak) + 1 : Math.min(0, progress.streak) - 1;
  if ((win ? progress.wins : progress.losses) === 4) {
    grantInitializedSkill(state, source.id, win ? MORE_TRIES_ID : FOUR_EMPTINESS_ID, "御秽裁决胜负奖励", false);
    const free = source.buffs.find((buff) => buff.id === "free_imperial_verdict");
    if (free) free.stacks += win ? 2 : 1;
    else source.buffs.push({ id: "free_imperial_verdict", name: "免费御秽裁决", stacks: win ? 2 : 1 });
  }
  if (progress.streak === 4) source.buffs.push({ id: "instant_win:imperial_verdict", name: "御秽裁决四连胜", stacks: 1 });
  if (progress.streak !== -4) return false;
  if (!source.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) removeBigCardInstance(state, source.id, card.instanceId);
  return true;
}

export function applyVerdictRoundPenalty(state: GameState, games: readonly PointGame[]): void {
  for (const game of games) {
    if (!game.winnerId || game.winnerId === game.sourceId) continue;
    for (const target of playersInSpace(state, game.sourceId)) {
      if (target.status !== "alive" || [game.sourceId, game.targetId].includes(target.id)) continue;
      applyNegativeStatus(state, target.id, "skill_disabled", (player) => {
        const id = `${SKILL_DISABLED_BUFF_PREFIX}${state.roundNumber}`;
        if (!player.buffs.some((buff) => buff.id === id)) player.buffs.push({ id, name: "御秽裁决·技能失效", stacks: 1, sourcePlayerId: game.sourceId });
      }, game.sourceId);
    }
  }
}

export function announcePointResult(state: GameState, game: PointGame): void {
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
    message: `${findPlayer(state, game.winnerId!)?.name ?? "玩家"} 赢得御秽裁决的石头剪刀布` });
}

export function stripVerdictAttack(target: PlayerState | undefined, attack: ReboundAttack): void {
  const original = attack.verdictOriginalStats ?? attack.stats;
  const base = !original.isSkill && BASE_ATTACKS[original.id as keyof typeof BASE_ATTACKS];
  if (!base) return;
  attack.verdictOriginalStats = original;
  attack.verdictStripped = Boolean(target && target.id !== attack.sourceId && getActiveSkillCount(target, VERDICT_GUARD_ID));
  attack.stats = attack.verdictStripped ? getStackedAttackStats(base, original.stacks) : original;
}

export function blockVerdictMove(state: GameState, target: PlayerState | undefined, sourceId: PlayerId | undefined,
  declaration: string, ordinaryAttack: boolean): boolean {
  if (!target || !sourceId || sourceId === target.id || !getActiveSkillCount(target, VERDICT_GUARD_ID)) return false;
  const key = `${target.id}:${sourceId}:${declaration}`;
  if (state.verdictBlockedMoves?.includes(key)) return true;
  const id = `verdict_guard:${sourceId}`;
  const trigger = `guard:${target.id}:${sourceId}`;
  let guard = target.buffs.find((buff) => buff.id === id);
  const usedActiveSkill = ordinaryAttack && !state.verdictBlockedMoves?.includes(trigger) && state.eventLog.some((event) => {
    if (event.type !== "skill_used" || event.playerId !== sourceId || event.roundNumber !== state.roundNumber ||
      event.turnNumber !== state.roundTurnNumber || !["turn_change_action", "turn_damage_modify"].includes(event.timingPhase ?? "")) return false;
    const skill = getSkill(event.skillId);
    return Boolean(skill && getSkillActivationKind(skill) === "active");
  });
  if (usedActiveSkill) {
    (state.verdictBlockedMoves ??= []).push(trigger);
    if (!guard) {
      guard = { id, name: "御秽·免疫出招", stacks: 4, sourcePlayerId: sourceId };
      target.buffs.push(guard);
    }
    guard.stacks = 4;
  }
  if (!guard || guard.stacks <= 0) return false;
  guard.stacks--;
  (state.verdictBlockedMoves ??= []).push(key);
  state.eventLog.push({ ...createBaseEvent(state, "attack_blocked"), type: "attack_blocked", sourceId, targetId: target.id,
    attackName: "出招", blockKind: "immune", protectionName: "御秽" });
  return true;
}
