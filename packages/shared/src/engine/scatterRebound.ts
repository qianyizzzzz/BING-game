import { AttackStats, DefenseAction, GameState, PlayerActionPlan, PlayerId } from "../types";
import { activeTotems } from "./totems";
import { TOTEM_KINDS } from "./totemIds";
import { createBaseEvent, createId, findPlayer, getActiveSkillCount, revealSkillOnUse } from "./gameFactory";
import { getReboundInteraction } from "./reboundRules";
import { attackPowerValue, compareCombatValues, getPointDamageDefeatLevel, INFINITY_VALUE, RETIRE_VALUE } from "./combatValues";
import { canAffectAcrossSpace, canBypassTargetSelection, playersInSpace, preventsTargetSelection } from "./spaces";
import { SPACE_BURST } from "./spaceTimeIds";
import { isSkillIgnored, withSkillsIgnored } from "./skillIgnore";
import { isVirtualCombatPlayer } from "./sky";
import { MOON_PUNISH_ID } from "./moonIds";
import { moonIgnoresPlayerStatuses, withMoonPunishment } from "./moonCombat";
import { getChaosWave, hasChaosDefenseLock } from "./chaos";
import { hasWindTrace } from "./ultimateWind";
import { isThornSkillDisabled } from "./effectCategories";
import { CURTAIN_FINALE_ID } from "./curtainIds";
import { blindSuppressesMoveProtection } from "./divineReversal";
import { applyNegativeStatus } from "./negativeStatuses";
import { STAR_MOON_GLEAM, STAR_MOON_SLOW } from "./starMoonIds";
import { YIYUAN_CHANGE_STATE } from "./yiyuanIds";

export interface ReboundAttack {
  appliesLegionLock?: true;
  brokenBladeBeforeTarget?: AttackStats;
  brokenBladeTargetId?: PlayerId;
  brokenBladeEdgeTier?: number;
  brokenBladeIgnoredFields?: string[];
  brokenBladeCloudBypass?: true;
  crystalBoundaryApplied?: true;
  sanctuarySweepSpell?: true;
  starWheelSealed?: true;
  swordExecuteBaseStats?: AttackStats;
  divineBeforeTarget?: AttackStats;
  statsWithAndWithoutControl?: { withControl: AttackStats; withoutControl: AttackStats };
  statsWithoutSeaGodIgnoredEffects?: AttackStats;
  statsWithoutFateIgnoredEffects?: AttackStats;
  statsWithoutHexagramControl?: AttackStats;
  seaGodBeforeTarget?: AttackStats;
  controlStatsStripped?: boolean;
  emptyCityControlStripped?: boolean;
  freeMoveTemplate?: import("./wujin").FreeMove;
  verdictOriginalStats?: AttackStats;
  verdictStripped?: boolean;
  tianmangStripped?: boolean;
  key: string;
  sourceId: PlayerId;
  originalTargetId: PlayerId;
  targetId: PlayerId;
  actionIndex: number;
  stats: AttackStats;
  reflected: boolean;
  /** Players whose declared rebounds redirected this particular attack. */
  actionRebounderIds?: PlayerId[];
  targetSelectionSourceId?: PlayerId;
  originSourceId?: PlayerId;
  infiniteCopies?: boolean;
  /** Damage ticks already split by the reversal pipeline still belong to one attack. */
  damagePartId?: string;
  /** One original declaration, before targets expand or reversal merges source identities. */
  reboundFamilyKey?: string;
  skipClash?: boolean;
  notLastHit?: boolean;
  /** Offensive bonuses captured before reversal; the new source cannot add its own. */
  offenseSnapshot?: { guding: number; sniper: number; bonus: number; critical: number; retirement: boolean;
    iceRain: number; echo: boolean; freeRi: boolean };
}

function clearDivineTargetStats(attack: ReboundAttack): ReboundAttack {
  if (!attack.divineBeforeTarget && !attack.seaGodBeforeTarget) return attack;
  const { divineBeforeTarget, seaGodBeforeTarget, ...base } = attack;
  return { ...base, stats: seaGodBeforeTarget ?? divineBeforeTarget ?? attack.stats };
}

/** Trace the first usable scatter, then collapse a reachable scatter loop into bounded attack families. */
export function resolveReboundAttacks(state: GameState, attacks: ReboundAttack[], actions: Record<PlayerId, PlayerActionPlan>,
  onBlocked?: (attack: ReboundAttack) => void,
  onRebound?: (attack: ReboundAttack, defenses: DefenseAction[]) => void,
  isIgnored?: (attack: ReboundAttack) => boolean,
  prepareTarget: (attack: ReboundAttack) => ReboundAttack = (attack) => attack,
  getPlan: (attack: ReboundAttack, targetId: PlayerId) => PlayerActionPlan | undefined = (_, targetId) => actions[targetId],
  reflectSkillMove?: (attack: ReboundAttack) => PlayerId, skipReboundBlock?: (attack: ReboundAttack) => boolean): ReboundAttack[] {
  const results: ReboundAttack[] = [];
  const emittedInfinite = new Set<string>();
  const rebounds = (attack: ReboundAttack, id: PlayerId) => getPlan(attack, id)?.actions.filter((action): action is DefenseAction =>
    action.type === "defense" && action.defense === "rebound") ?? [];
  const rebound = (attack: ReboundAttack, id: PlayerId) => rebounds(attack, id)[0];
  const scatter = (id: PlayerId, attack: ReboundAttack) => {
    const player = findPlayer(state, id);
    return rebounds(attack, id).some((action) => !action.fixedReboundTarget) &&
      withSkillsIgnored(player, attack.stats.targetSkillIgnore, () => getActiveSkillCount(player, "1057") > 0);
  };
  const reflect = (attack: ReboundAttack, id: PlayerId, target: PlayerId,
    suffix: "skill_reflected" | "reflected" | "infinite_scatter" | "scatter"): ReboundAttack => {
    attack = clearDivineTargetStats(attack);
    state.eventLog.push({ ...createBaseEvent(state, "attack_reflected"), type: "attack_reflected", sourceId: attack.sourceId,
      originalTargetId: id, reflectedTargetId: target, attackName: attack.stats.name });
    const reboundIndex = suffix === "skill_reflected" ? -1 : state.pendingActions[id]?.actions.findIndex((action) =>
      action.type === "defense" && action.defense === "rebound" && (!action.targetId || action.targetId === target)) ?? -1;
    const wave = reboundIndex >= 0 ? getChaosWave(findPlayer(state, id), reboundIndex, state.turnNumber) : undefined;
    const stats: AttackStats = wave ? { ...attack.stats,
      ...(wave.ignoreSkill ? { targetSkillIgnore: { all: true } } : {}),
      ...(wave.ignoreMove ? { chaosIgnoreTargetMove: true } : {}) } : attack.stats;
    const { targetSelectionSourceId: _previousSelector, ...base } = attack;
    return { ...base, stats, key: `${attack.key}:${suffix}:${id}:${target}`,
      originSourceId: attack.originSourceId ?? attack.sourceId, targetId: target, reflected: true,
      ...(suffix === "reflected" ? { targetSelectionSourceId: id } : {}),
      ...(suffix !== "skill_reflected" ? { actionRebounderIds: [...(attack.actionRebounderIds ?? []), id] } : {}) };
  };
  const trace = (initial: ReboundAttack, visited = new Set<PlayerId>()): void => {
    let attack = initial;
    while (true) {
      if (isVirtualCombatPlayer(attack.targetId)) { results.push(attack); return; }
      if (attack.stats.id === MOON_PUNISH_ID) {
        const target = findPlayer(state, attack.targetId);
        if (target && !moonIgnoresPlayerStatuses(target)) {
          withMoonPunishment(target, attack.stats.id, () => trace(attack, visited));
          return;
        }
      }
      if (!attack.stats.isArea && !attack.stats.nonAttackMove && attack.stats.id !== "1035" &&
        activeTotems(state).some(({ id }) => id === attack.targetId) && canAffectAcrossSpace(state, attack.sourceId, attack.targetId)) {
        if (!isIgnored?.(attack)) results.push(attack);
        return;
      }
      if (findPlayer(state, attack.targetId)?.status !== "alive" ||
        attack.stats.id !== SPACE_BURST && !canAffectAcrossSpace(state, attack.sourceId, attack.targetId)) return;
      if (!attack.stats.nonAttackMove && attack.stats.id !== "1035" &&
        hasChaosDefenseLock(findPlayer(state, attack.sourceId), attack.targetId)) return;
      const target = findPlayer(state, attack.targetId);
      if ((!attack.stats.isArea || attack.reflected) && preventsTargetSelection(target) &&
        !canBypassTargetSelection(state, attack.targetSelectionSourceId ?? attack.sourceId, target)) return;
      attack = prepareTarget(attack);
      if (isIgnored?.(attack)) return;
      // Returning to the actual source is internal damage, not another opportunity to rebound.
      if (attack.sourceId === attack.targetId && attack.stats.id !== "1035") { results.push(attack); return; }
      if (attack.stats.ignoreRebounds) { results.push(attack); return; }
      const reflectedTarget = attack.stats.defensePiercing ? undefined : reflectSkillMove?.(attack);
      if (reflectedTarget && reflectedTarget !== attack.targetId) {
        const { targetSelectionSourceId: _previousSelector, ...base } = clearDivineTargetStats(attack);
        attack = { ...base, key: `${attack.key}:ancient_roar`, targetId: reflectedTarget, reflected: true };
        continue;
      }
      // Skill reflection is independent of declared rebound actions, absolute/scatter upgrades and piercing.
      const defeat = getPointDamageDefeatLevel(attack.stats);
      if (!attack.stats.defensePiercing && !attack.stats.chaosIgnoreTargetMove && !attack.stats.nonAttackMove && attack.stats.id !== "1035" && (defeat ?? 1) <= 2) {
        const power = defeat === 2 ? RETIRE_VALUE : attackPowerValue(attack.stats);
        const target = findPlayer(state, attack.targetId);
        const reflection = withSkillsIgnored(target, attack.stats.targetSkillIgnore, () => target?.buffs.find((buff) =>
          (buff.stateType === "skill_rebound" || buff.stateType === YIYUAN_CHANGE_STATE) &&
          (buff.startsAtTurn ?? 0) <= state.turnNumber && (buff.expiresAtTurn ?? 0) > state.turnNumber &&
          !blindSuppressesMoveProtection(target, actions[attack.targetId], buff, state.turnNumber, state.roundNumber) &&
          !(attack.stats.piercesDefenseMoves && buff.sourceAbilityId && actions[attack.targetId]?.actions.some((move) =>
            move.type === "skill" && move.skillId === buff.sourceAbilityId)) &&
          (!buff.sourceAbilityId || !isSkillIgnored(target, buff.sourceAbilityId) && !isThornSkillDisabled(target, buff.sourceAbilityId)) &&
          (buff.id !== "hound_rebound" || getActiveSkillCount(target, "1025") > 0) &&
          compareCombatValues(power, buff.skillReflectLimit ?? INFINITY_VALUE) < (buff.skillReflectExclusive ? 0 : 1)));
        if (reflection) {
          if (reflection.sourceAbilityId === STAR_MOON_GLEAM)
            applyNegativeStatus(state, attack.sourceId, STAR_MOON_SLOW, (recipient, appliedBy) => {
              recipient.buffs.push({ id: createId(STAR_MOON_SLOW), stateType: STAR_MOON_SLOW, name: "不熄月莹·积饼÷2",
                stacks: 1, sourceAbilityId: STAR_MOON_GLEAM, sourcePlayerId: appliedBy ?? attack.targetId });
            }, attack.targetId);
          attack = reflect(attack, attack.targetId, attack.sourceId, "skill_reflected");
          continue;
        }
      }
      if (attack.stats.cannonDefensePending || [CURTAIN_FINALE_ID, TOTEM_KINDS.ritual.id].includes(attack.stats.id)) { results.push(attack); return; }
      const action = rebound(attack, attack.targetId);
      if (!action) { results.push(attack); return; }
      const interaction = getReboundInteraction(findPlayer(state, attack.targetId), attack.stats);
      if (interaction === "pierced") {
        state.eventLog.push({ ...createBaseEvent(state, "rebound_broken"), type: "rebound_broken", sourceId: attack.sourceId,
          targetId: attack.targetId, attackName: attack.stats.name });
        results.push(attack); return;
      }
      if (interaction === "blocked" && skipReboundBlock?.(attack)) { results.push(attack); return; }
      onRebound?.(attack, rebounds(attack, attack.targetId));
      if (interaction === "blocked") {
        state.eventLog.push({ ...createBaseEvent(state, "attack_blocked"), type: "attack_blocked", sourceId: attack.sourceId,
          targetId: attack.targetId, attackName: attack.stats.name, defense: "rebound", blockKind: "block" });
        onBlocked?.(attack); return;
      }
      if (visited.has(attack.targetId)) {
        state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: "普通反弹形成环，该攻击抵消，环上无人受伤" });
        return;
      }
      visited.add(attack.targetId);
      if (scatter(attack.targetId, attack)) { expandScatter(attack); return; }
      // Reversal may give a player multiple rebound destinations.
      const branches = rebounds(attack, attack.targetId);
      if (branches.length > 1) {
        for (const branch of branches) if (branch.targetId) {
          trace(reflect(attack, attack.targetId, branch.targetId, "reflected"), new Set(visited));
        }
        return;
      }
      if (!action.targetId) { results.push(attack); return; }
      attack = reflect(attack, attack.targetId, action.targetId, "reflected");
    }
  };
  const expandScatter = (attack: ReboundAttack): void => {
    const first = attack.targetId;
    const local = playersInSpace(state, first).filter((player) => player.status === "alive");
    const eligible = local.filter((player) => {
      if (!rebound(attack, player.id)) return false;
      const delivery = prepareTarget({ ...attack, targetId: player.id });
      return scatter(player.id, delivery) && getReboundInteraction(player, delivery.stats) === "reflected";
    });
    const hasReturn = local.some((player) => player.id !== first && rebounds(attack, player.id).some((action) => action.targetId === first) &&
      getReboundInteraction(player, prepareTarget({ ...attack, targetId: player.id }).stats) === "reflected");
    const infinite = eligible.length >= 2 || hasReturn;
    const sources = infinite && eligible.length >= 2 ? eligible.map((player) => player.id) : [first];
    for (const id of sources) revealSkillOnUse(state, id, "1057", infinite ? "无限散弹触发" : "散弹触发");
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: infinite
      ? `${sources.map((id) => findPlayer(state, id)!.name).join("、")} 触发无限散弹：将原攻击扩散为无限份 ${attack.stats.name}，攻击来源不变`
      : `${findPlayer(state, first)!.name} 的散弹将原攻击向其他所有玩家各转移一份 ${attack.stats.name}` });
    for (const source of sources) for (const target of local) {
      if (target.id === source) continue;
      const delivery = infinite ? prepareTarget({ ...attack, targetId: target.id, infiniteCopies: true }) : attack;
      if (infinite && isIgnored?.(delivery)) continue;
      if (infinite && rebound(delivery, target.id)) {
        const interaction = getReboundInteraction(target, delivery.stats);
        if (interaction === "reflected") continue;
        if (interaction === "blocked") {
          state.eventLog.push({ ...createBaseEvent(state, "attack_blocked"), type: "attack_blocked", sourceId: source,
            targetId: target.id, attackName: attack.stats.name, defense: "rebound", blockKind: "block" });
          onBlocked?.(delivery); continue;
        }
      }
      const origin = attack.originSourceId ?? attack.sourceId;
      const family = `${attack.reboundFamilyKey ?? `${origin}:${attack.actionIndex}:${attack.damagePartId ?? ""}`}:${source}:${target.id}`;
      if (infinite && emittedInfinite.has(family)) continue;
      if (infinite) emittedInfinite.add(family);
      const copy = reflect(delivery, source, target.id, infinite ? "infinite_scatter" : "scatter");
      if (infinite) results.push({ ...copy, infiniteCopies: true });
      else trace(copy, new Set([first]));
    }
  };
  for (const attack of attacks) trace(attack);
  return results;
}
