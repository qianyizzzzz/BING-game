import { AttackStats, DefenseAction, GameState, PlayerActionPlan, PlayerId } from "../types";
import { createBaseEvent, findPlayer, getActiveSkillCount, revealSkillOnUse } from "./gameFactory";
import { getReboundInteraction } from "./reboundRules";
import { attackPowerValue, compareCombatValues, getPointDamageDefeatLevel, INFINITY_VALUE } from "./combatValues";
import { canAffectAcrossSpace, playersInSpace } from "./spaces";

export interface ReboundAttack {
  verdictOriginalStats?: AttackStats;
  verdictStripped?: boolean;
  key: string;
  sourceId: PlayerId;
  originalTargetId: PlayerId;
  targetId: PlayerId;
  actionIndex: number;
  stats: AttackStats;
  reflected: boolean;
  /** Players whose declared rebounds redirected this particular attack. */
  actionRebounderIds?: PlayerId[];
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

/** Trace the first usable scatter, then collapse a reachable scatter loop into bounded attack families. */
export function resolveReboundAttacks(state: GameState, attacks: ReboundAttack[], actions: Record<PlayerId, PlayerActionPlan>,
  onBlocked?: (attack: ReboundAttack) => void,
  onRebound?: (attack: ReboundAttack, defenses: DefenseAction[]) => void,
  isIgnored?: (attack: ReboundAttack) => boolean): ReboundAttack[] {
  const results: ReboundAttack[] = [];
  const emittedInfinite = new Set<string>();
  const rebounds = (id: PlayerId) => actions[id]?.actions.filter((action): action is DefenseAction => action.type === "defense" && action.defense === "rebound") ?? [];
  const rebound = (id: PlayerId) => rebounds(id)[0];
  const scatter = (id: PlayerId) => getActiveSkillCount(findPlayer(state, id), "skill_58_88471") > 0;
  const reflect = (attack: ReboundAttack, id: PlayerId, target: PlayerId,
    suffix: "skill_reflected" | "reflected" | "infinite_scatter" | "scatter"): ReboundAttack => {
    state.eventLog.push({ ...createBaseEvent(state, "attack_reflected"), type: "attack_reflected", sourceId: attack.sourceId,
      originalTargetId: id, reflectedTargetId: target, attackName: attack.stats.name });
    return { ...attack, key: `${attack.key}:${suffix}:${id}:${target}`,
      originSourceId: attack.originSourceId ?? attack.sourceId, targetId: target, reflected: true,
      ...(suffix !== "skill_reflected" ? { actionRebounderIds: [...(attack.actionRebounderIds ?? []), id] } : {}) };
  };
  const trace = (initial: ReboundAttack, visited = new Set<PlayerId>()): void => {
    let attack = initial;
    while (true) {
      if (!canAffectAcrossSpace(state, attack.sourceId, attack.targetId)) return;
      if (isIgnored?.(attack)) return;
      // Returning to the actual source is internal damage, not another opportunity to rebound.
      if (attack.sourceId === attack.targetId && attack.stats.id !== "skill_36_14343") { results.push(attack); return; }
      // Skill reflection is independent of declared rebound actions, absolute/scatter upgrades and piercing.
      if (attack.stats.id !== "skill_36_14343" && !getPointDamageDefeatLevel(attack.stats)) {
        const power = attackPowerValue(attack.stats);
        const buffs = findPlayer(state, attack.targetId)?.buffs ?? [];
        if (buffs.some((buff) => buff.stateType === "skill_rebound" && (buff.expiresAtTurn ?? 0) > state.turnNumber &&
          compareCombatValues(power, buff.skillReflectLimit ?? INFINITY_VALUE) <= 0)) {
          attack = reflect(attack, attack.targetId, attack.sourceId, "skill_reflected");
          continue;
        }
        if (buffs.some((buff) => buff.skillAttackBlockLimit && (buff.expiresAtTurn ?? 0) > state.turnNumber &&
          compareCombatValues(power, buff.skillAttackBlockLimit) <= 0)) {
          state.eventLog.push({ ...createBaseEvent(state, "attack_blocked"), type: "attack_blocked",
            sourceId: attack.sourceId, targetId: attack.targetId, attackName: attack.stats.name,
            protectionName: "聚能盾", blockKind: "block" });
          onBlocked?.(attack);
          return;
        }
      }
      if (attack.stats.cannonDefensePending) { results.push(attack); return; }
      const action = rebound(attack.targetId);
      if (!action) { results.push(attack); return; }
      const interaction = getReboundInteraction(findPlayer(state, attack.targetId), attack.stats);
      if (interaction === "pierced") {
        state.eventLog.push({ ...createBaseEvent(state, "rebound_broken"), type: "rebound_broken", sourceId: attack.sourceId,
          targetId: attack.targetId, attackName: attack.stats.name });
        results.push(attack); return;
      }
      onRebound?.(attack, rebounds(attack.targetId));
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
      if (scatter(attack.targetId)) { expandScatter(attack); return; }
      // Reversal may give a player multiple rebound destinations.
      const branches = rebounds(attack.targetId);
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
    const eligible = local.filter((player) => rebound(player.id) && scatter(player.id) &&
      getReboundInteraction(player, attack.stats) === "reflected");
    const hasReturn = local.some((player) => player.id !== first && rebounds(player.id).some((action) => action.targetId === first) &&
      getReboundInteraction(player, attack.stats) === "reflected");
    const infinite = eligible.length >= 2 || hasReturn;
    const sources = infinite && eligible.length >= 2 ? eligible.map((player) => player.id) : [first];
    for (const id of sources) revealSkillOnUse(state, id, "skill_58_88471", infinite ? "无限散弹触发" : "散弹触发");
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", message: infinite
      ? `${sources.map((id) => findPlayer(state, id)!.name).join("、")} 触发无限散弹：将原攻击扩散为无限份 ${attack.stats.name}，攻击来源不变`
      : `${findPlayer(state, first)!.name} 的散弹将原攻击向其他所有玩家各转移一份 ${attack.stats.name}` });
    for (const source of sources) for (const target of local) {
      if (target.id === source) continue;
      const delivery = infinite ? { ...attack, targetId: target.id } : attack;
      if (infinite && isIgnored?.(delivery)) continue;
      if (infinite && rebound(target.id)) {
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
