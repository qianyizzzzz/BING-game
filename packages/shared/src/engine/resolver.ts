import {
  AttackStats,
  AttackBlockedEvent,
  DamageEvent,
  GameState,
  HealEvent,
  INFINITE_DAMAGE,
  ActionSubmission,
  PlayerAction,
  PlayerActionPlan,
  PlayerId,
  SubmitActionResult
} from "../types";
import {
  BASE_ATTACKS,
  canActionDefend,
  getActionLabel,
  getDefenseForEvent,
  getStackedAttackStats
} from "./attacks";
import {
  alivePlayers,
  cloneGameState,
  createBaseEvent,
  findPlayer,
  getCakeGainAmount,
  getTurnDeadline
} from "./gameFactory";
import { normalizeActionPlan, validateAction } from "./validation";
import { shouldFinishGame } from "../state/machine";
import {
  applyAttackModifiers,
  getSkill,
  getSkillActionCost,
  getSkillAttackStats,
  getSkillPlay
} from "../skills/registry";

interface AttackInstance {
  key: string;
  sourceId: PlayerId;
  originalTargetId: PlayerId;
  targetId: PlayerId;
  stats: AttackStats;
  reflected: boolean;
}

interface HealthDelta {
  damage: number;
  healing: number;
}

export function submitPlayerAction(
  state: GameState,
  playerId: PlayerId,
  submission: ActionSubmission
): SubmitActionResult {
  const validation = validateAction(state, playerId, submission);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const actionPlan = normalizeActionPlan(submission);
  const next = cloneGameState(state);
  next.pendingActions[playerId] = actionPlan;
  next.updatedAt = Date.now();
  next.eventLog.push({
    ...createBaseEvent(next, "action_submitted"),
    type: "action_submitted",
    playerId
  });

  const readyPlayerIds = new Set(Object.keys(next.pendingActions));
  const allReady = alivePlayers(next).every((player) => readyPlayerIds.has(player.id));

  if (!allReady) {
    return { state: next, resolved: false };
  }

  return {
    state: resolveTurn(next),
    resolved: true
  };
}

export function resolveTurn(state: GameState): GameState {
  const next = cloneGameState(state);
  next.phase = "resolving";

  const revealedActions = getRevealedActions(next);
  next.eventLog.push({
    ...createBaseEvent(next, "turn_revealed"),
    type: "turn_revealed",
    actions: revealedActions
  });

  applyActionCostsAndGains(next, revealedActions);

  const attacks = applyRebounds(
    next,
    createAttackInstances(next, revealedActions),
    revealedActions
  );

  const handledAttackKeys = new Set<string>();
  const healthDeltas = new Map<PlayerId, HealthDelta>();

  resolveClashes(next, attacks, handledAttackKeys, healthDeltas);
  resolveUnopposedAttacks(
    next,
    attacks,
    handledAttackKeys,
    healthDeltas,
    revealedActions
  );
  resolveActiveSkillEffects(next, revealedActions, healthDeltas);

  const healthChangeOccurred = applyHealthDeltas(next, healthDeltas);
  updateDeaths(next);
  clearTurnTemporaryBuffs(next);

  if (healthChangeOccurred) {
    endRound(next);
  } else {
    next.roundTurnNumber += 1;
  }

  next.turnNumber += 1;
  next.pendingActions = {};
  next.turnStartedAt = Date.now();

  if (shouldFinishGame(next)) {
    const winners = alivePlayers(next).map((player) => player.id);
    next.phase = "finished";
    delete next.turnDeadlineAt;
    next.winnerIds = winners;
    next.eventLog.push({
      ...createBaseEvent(next, "game_finished"),
      type: "game_finished",
      winnerIds: winners
    });
  } else {
    next.phase = "collecting_actions";
    const deadline = getTurnDeadline(next);
    if (deadline) {
      next.turnDeadlineAt = deadline;
    } else {
      delete next.turnDeadlineAt;
    }
  }

  next.updatedAt = Date.now();
  return next;
}

function getRevealedActions(state: GameState): Record<PlayerId, PlayerActionPlan> {
  const actions: Record<PlayerId, PlayerActionPlan> = {};
  for (const player of alivePlayers(state)) {
    const action = state.pendingActions[player.id];
    if (action) {
      actions[player.id] = action;
    }
  }
  return actions;
}

function applyActionCostsAndGains(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>
): void {
  for (const [playerId, plan] of Object.entries(actions)) {
    const player = findPlayer(state, playerId);
    if (!player) {
      continue;
    }

    if (plan.actions.length === 1 && plan.actions[0]?.type === "gain_cake") {
      changeCakes(state, playerId, player.cakes + getCakeGainAmount(state), "出饼");
      continue;
    }

    const reboundAction = plan.actions.find(
      (action) => action.type === "defense" && action.defense === "rebound"
    );
    if (reboundAction) {
      changeCakes(state, playerId, 0, "反弹消耗全部饼");
      continue;
    }

    const totalActionCost = plan.actions.reduce((sum, action) => {
      if (action.type === "attack") {
        const stats = getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks);
        return sum + stats.cost;
      }

      if (action.type === "skill") {
        return sum + getEffectiveSkillActionCost(player, action);
      }

      return sum;
    }, 0);

    if (totalActionCost > 0) {
      changeCakes(state, playerId, player.cakes - totalActionCost, "招式消耗");
    }

    consumeFreeSkillBuffs(player, plan);

    for (const action of plan.actions) {
      if (action.type !== "skill") {
        continue;
      }

      const play = getSkillPlay(action.skillId);
      if (play?.kind !== "resource") {
        if (play?.kind === "effect") {
          applySkillPreparationEffect(state, playerId, action);
          markSkillUse(player, action.skillId);
        } else if (play?.usesPerGame) {
          markSkillUse(player, action.skillId);
        }
        continue;
      }

      const gain = (play.resourceGainPerStack ?? 0) * action.stacks;
      if (gain > 0) {
        const current = findPlayer(state, playerId);
          changeCakes(state, playerId, (current?.cakes ?? 0) + gain, `${getSkill(action.skillId)?.name ?? "技能"}生效`);
      }
      markSkillUse(player, action.skillId);
    }
  }
}

function applySkillPreparationEffect(
  state: GameState,
  playerId: PlayerId,
  action: Extract<PlayerAction, { type: "skill" }>
): void {
  const player = findPlayer(state, playerId);
  const skill = getSkill(action.skillId);
  const play = skill?.play;
  if (!player || !skill || !play || play.kind !== "effect") {
    return;
  }

  const buff = createTemporaryProtectionBuff(play.effect, skill.name, state.turnNumber);
  if (buff) {
    player.buffs.push(buff);
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 使用 ${skill.name}，本回合获得保护效果`
    });
  }

  if (play.effect === "no_direct_effect") {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${player.name} 声明 ${skill.name}。该技能的复杂时机已记录，当前按可施放技能处理。`
    });
  }
}

function createTemporaryProtectionBuff(
  effect: string | undefined,
  skillName: string,
  turnNumber: number
): { id: string; name: string; stacks: number; expiresAtTurn: number } | undefined {
  if (effect === "invulnerable_turn") {
    return {
      id: "temp_invulnerable",
      name: skillName,
      stacks: 1,
      expiresAtTurn: turnNumber
    };
  }

  if (effect === "shield_normal") {
    return {
      id: "temp_shield_normal",
      name: skillName,
      stacks: 1,
      expiresAtTurn: turnNumber
    };
  }

  if (effect === "shield_skill") {
    return {
      id: "temp_shield_skill",
      name: skillName,
      stacks: 1,
      expiresAtTurn: turnNumber
    };
  }

  return undefined;
}

function markSkillUse(player: { buffs: Array<{ id: string; name: string; stacks: number }> }, skillId: string): void {
  const id = `skill_used:${skillId}`;
  const existing = player.buffs.find((buff) => buff.id === id);
  if (existing) {
    existing.stacks += 1;
    return;
  }

  player.buffs.push({
    id,
    name: "技能使用次数",
    stacks: 1
  });
}

function getEffectiveSkillActionCost(
  player: { buffs: Array<{ id: string; stacks: number }> },
  action: Extract<PlayerAction, { type: "skill" }>
): number {
  if (
    action.skillId === "skill_87_44771" &&
    action.stacks === 1 &&
    player.buffs.some((buff) => buff.id === "free_lian_bao" && buff.stacks > 0)
  ) {
    return 0;
  }

  return getSkillActionCost(action.skillId, action.stacks);
}

function consumeFreeSkillBuffs(player: { buffs: Array<{ id: string; stacks: number }> }, plan: PlayerActionPlan): void {
  for (const action of plan.actions) {
    if (action.type !== "skill" || action.skillId !== "skill_87_44771" || action.stacks !== 1) {
      continue;
    }

    const buff = player.buffs.find((item) => item.id === "free_lian_bao" && item.stacks > 0);
    if (!buff) {
      continue;
    }

    buff.stacks -= 1;
    if (buff.stacks <= 0) {
      player.buffs = player.buffs.filter((item) => item !== buff);
    }
  }
}

function createAttackInstances(
  state: GameState,
  plans: Record<PlayerId, PlayerActionPlan>
): AttackInstance[] {
  const attacks: AttackInstance[] = [];

  for (const [sourceId, plan] of Object.entries(plans)) {
    for (const action of plan.actions) {
      const baseStats =
        action.type === "attack"
          ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks)
          : action.type === "skill"
            ? getSkillAttackStats(action.skillId, action.stacks)
            : undefined;
      if (!baseStats) {
        continue;
      }
      const stats = applyAttackModifiers(state, sourceId, baseStats);
      if (isDecayBlockingAttack(state, sourceId, stats)) {
        continue;
      }
      const targets = stats.isArea
        ? alivePlayers(state)
            .filter((player) => player.id !== sourceId)
            .map((player) => player.id)
        : "targetId" in action && action.targetId
          ? [action.targetId]
          : [];

      for (const targetId of targets) {
        attacks.push({
          key: `${sourceId}:${targetId}:${attacks.length}`,
          sourceId,
          originalTargetId: targetId,
          targetId,
          stats,
          reflected: false
        });
      }
    }
  }

  return attacks;
}

function isDecayBlockingAttack(
  state: GameState,
  sourceId: PlayerId,
  stats: AttackStats
): boolean {
  if (!isGlobalSkillActive(state, "skill_11_89360")) {
    return false;
  }

  const blocked =
    stats.level === 0 || stats.power === 0 || stats.power >= INFINITE_DAMAGE;
  if (!blocked) {
    return false;
  }

  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${getPlayerName(state, sourceId)} \u7684 ${stats.name} \u88ab\u8870\u7aed\u62b9\u9664`
  });
  return true;
}

function applyRebounds(
  state: GameState,
  attacks: AttackInstance[],
  actions: Record<PlayerId, PlayerActionPlan>
): AttackInstance[] {
  const resolved: AttackInstance[] = [];

  for (const attack of attacks) {
    const finalAttack = resolveReboundChain(state, attack, actions);
    if (finalAttack) {
      resolved.push(finalAttack);
    }
  }

  return resolved;
}

function resolveReboundChain(
  state: GameState,
  attack: AttackInstance,
  actions: Record<PlayerId, PlayerActionPlan>
): AttackInstance | undefined {
  let current = attack;
  const visitedReflectors = new Set<PlayerId>();
  const path: PlayerId[] = [];

  while (true) {
    const targetAction = getDefenseAction(actions[current.targetId]);
    if (targetAction?.defense !== "rebound") {
      return current;
    }

    if (visitedReflectors.has(current.targetId)) {
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `反弹形成环：${[...path, current.targetId]
          .map((playerId) => getPlayerName(state, playerId))
          .join(" → ")}，环上无人受伤`
      });
      return undefined;
    }

    if (current.stats.traits.includes("pierce_rebound")) {
      state.eventLog.push({
        ...createBaseEvent(state, "rebound_broken"),
        type: "rebound_broken",
        sourceId: current.sourceId,
        targetId: current.targetId,
        attackName: current.stats.name
      });
      return current;
    }

    if (current.stats.isSkill) {
      state.eventLog.push({
        ...createBaseEvent(state, "attack_blocked"),
        type: "attack_blocked",
        sourceId: current.sourceId,
        targetId: current.targetId,
        attackName: current.stats.name,
        defense: "rebound"
      });
      return undefined;
    }

    if (!targetAction.targetId) {
      return current;
    }

    visitedReflectors.add(current.targetId);
    path.push(current.targetId);
    state.eventLog.push({
      ...createBaseEvent(state, "attack_reflected"),
      type: "attack_reflected",
      sourceId: current.sourceId,
      originalTargetId: current.targetId,
      reflectedTargetId: targetAction.targetId,
      attackName: current.stats.name
    });

    current = {
      ...current,
      key: `${current.key}:reflected:${targetAction.targetId}`,
      targetId: targetAction.targetId,
      reflected: true
    };
  }
}

function resolveClashes(
  state: GameState,
  attacks: AttackInstance[],
  handledAttackKeys: Set<string>,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  for (const attack of attacks) {
    if (handledAttackKeys.has(attack.key) || attack.reflected) {
      continue;
    }

    const counter = attacks.find(
      (candidate) =>
        !candidate.reflected &&
        !handledAttackKeys.has(candidate.key) &&
        candidate.sourceId === attack.targetId &&
        candidate.targetId === attack.sourceId
    );

    if (!counter) {
      continue;
    }

    handledAttackKeys.add(attack.key);
    handledAttackKeys.add(counter.key);
    resolveSingleClash(state, attack, counter, healthDeltas);
  }
}

function resolveSingleClash(
  state: GameState,
  a: AttackInstance,
  b: AttackInstance,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  const special = resolveSpecialClash(state, a, b, healthDeltas);
  if (special) {
    return;
  }

  if (a.stats.level === b.stats.level) {
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: `${a.stats.name} 与 ${b.stats.name} 等级相同，互相抵消`
    });
    return;
  }

  const high = a.stats.level > b.stats.level ? a : b;
  const low = high === a ? b : a;
  const damage = calculateClashDamage(high.stats, low.stats);
  addDamage(state, healthDeltas, low.sourceId, damage, high.sourceId, high.stats.name, high.stats);

  state.eventLog.push({
    ...createBaseEvent(state, "clash"),
    type: "clash",
    attackerAId: a.sourceId,
    attackerBId: b.sourceId,
    result: `${high.stats.name} 等级更高，对 ${getPlayerName(state, low.sourceId)} 造成 ${formatDamage(damage)} 点伤害`
  });
}

function resolveSpecialClash(
  state: GameState,
  a: AttackInstance,
  b: AttackInstance,
  healthDeltas: Map<PlayerId, HealthDelta>
): boolean {
  const isShaVsQin =
    (a.stats.id === "sha" && b.stats.id === "qin") ||
    (a.stats.id === "qin" && b.stats.id === "sha");

  if (isShaVsQin) {
    const sha = a.stats.id === "sha" ? a : b;
    const qin = sha === a ? b : a;
    addDamage(state, healthDeltas, qin.sourceId, sha.stats.stacks, sha.sourceId, "杀", sha.stats);
    addHeal(state, healthDeltas, sha.sourceId, qin.stats.stacks, sha.sourceId, "杀擒对撞回血");
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: `杀 vs 擒：${getPlayerName(state, sha.sourceId)} 造成 ${sha.stats.stacks} 点伤害并回复 ${qin.stats.stacks} 血`
    });
    return true;
  }

  const isShaVsNanMan =
    (a.stats.id === "sha" && b.stats.id === "nan_man") ||
    (a.stats.id === "nan_man" && b.stats.id === "sha");

  if (isShaVsNanMan) {
    state.eventLog.push({
      ...createBaseEvent(state, "clash"),
      type: "clash",
      attackerAId: a.sourceId,
      attackerBId: b.sourceId,
      result: "杀 vs 南蛮入侵：相互抵消"
    });
    return true;
  }

  return false;
}

function resolveUnopposedAttacks(
  state: GameState,
  attacks: AttackInstance[],
  handledAttackKeys: Set<string>,
  healthDeltas: Map<PlayerId, HealthDelta>,
  actions: Record<PlayerId, PlayerActionPlan>
): void {
  for (const attack of attacks) {
    if (handledAttackKeys.has(attack.key)) {
      continue;
    }

    const target = findPlayer(state, attack.targetId);
    if (!target || target.status !== "alive") {
      continue;
    }

    const targetAction = getDefensiveAction(actions[attack.targetId]);
    if (canActionDefend(targetAction, attack.stats.defenseTag)) {
      const event: AttackBlockedEvent = {
        ...createBaseEvent(state, "attack_blocked"),
        type: "attack_blocked",
        sourceId: attack.sourceId,
        targetId: attack.targetId,
        attackName: attack.stats.name
      };
      const defense = getDefenseForEvent(targetAction);
      if (defense) {
        event.defense = defense;
      }
      state.eventLog.push(event);
      continue;
    }

    addDamage(
      state,
      healthDeltas,
      attack.targetId,
      attack.stats.power,
      attack.sourceId,
      attack.stats.name,
      attack.stats
    );
    applySkillHitEffects(state, attack);
  }
}

function getDefenseAction(plan: PlayerActionPlan | undefined): Extract<PlayerAction, { type: "defense" }> | undefined {
  return plan?.actions.find(
    (action): action is Extract<PlayerAction, { type: "defense" }> =>
      action.type === "defense"
  );
}

function getDefensiveAction(plan: PlayerActionPlan | undefined): PlayerAction | undefined {
  return plan?.actions.find(
    (action) => action.type === "defense" || action.type === "gain_cake"
  );
}

function resolveActiveSkillEffects(
  state: GameState,
  actions: Record<PlayerId, PlayerActionPlan>,
  healthDeltas: Map<PlayerId, HealthDelta>
): void {
  for (const [sourceId, plan] of Object.entries(actions)) {
    for (const action of plan.actions) {
      if (action.type !== "skill") {
        continue;
      }

      const skill = getSkill(action.skillId);
      const play = skill?.play;
      if (!skill || !play || play.kind !== "effect") {
        continue;
      }

      if (play.effect === "abs_plus") {
        const player = findPlayer(state, sourceId);
        if (player) {
          const before = player.hp;
          player.hp = Math.abs(player.hp) + (play.selfHeal ?? 0);
          state.eventLog.push({
            ...createBaseEvent(state, "heal"),
            type: "heal",
            sourceId,
            targetId: sourceId,
            amount: Math.max(0, player.hp - before),
            reason: skill.name
          });
        }
        continue;
      }

      if (play.selfDamage) {
        addDamage(state, healthDeltas, sourceId, play.selfDamage, sourceId, skill.name);
      }

      if (play.selfHeal) {
        addHeal(state, healthDeltas, sourceId, play.selfHeal, sourceId, skill.name);
      }

      const targets = selectSkillEffectTargets(state, sourceId, action.targetId, play);
      for (const targetId of targets) {
        if (play.allEnemyDamage === undefined && play.targetDamage === undefined) {
          continue;
        }

        const amount = play.targetDamage ?? play.allEnemyDamage ?? 0;
        if (amount > 0) {
          addDamage(state, healthDeltas, targetId, amount, sourceId, skill.name);
        } else if (amount < 0) {
          addHeal(state, healthDeltas, targetId, Math.abs(amount), sourceId, skill.name);
        }
      }
    }
  }
}

function selectSkillEffectTargets(
  state: GameState,
  sourceId: PlayerId,
  requestedTargetId: PlayerId | undefined,
  play: NonNullable<ReturnType<typeof getSkillPlay>>
): PlayerId[] {
  const enemies = alivePlayers(state).filter((player) => player.id !== sourceId);
  if (play.effect === "highest_hp_damage") {
    return [...enemies]
      .sort((a, b) => b.hp - a.hp)
      .slice(0, play.selectedTargetCount ?? 1)
      .map((player) => player.id);
  }

  if (play.effect === "low_hp_execute") {
    return enemies
      .filter((player) => player.hp <= (play.hpThreshold ?? 3))
      .map((player) => player.id);
  }

  if (play.effect === "odd_hp_damage") {
    return enemies.filter((player) => Math.abs(player.hp) % 2 === 1).map((player) => player.id);
  }

  if (play.effect === "even_hp_damage") {
    return enemies.filter((player) => Math.abs(player.hp) % 2 === 0).map((player) => player.id);
  }

  if (play.targetMode === "single" && requestedTargetId) {
    return [requestedTargetId];
  }

  if (play.targetMode === "all") {
    return enemies.map((player) => player.id);
  }

  return [];
}

function applySkillHitEffects(state: GameState, attack: AttackInstance): void {
  const skill = getSkill(String(attack.stats.id));
  const effect = skill?.play?.effect;
  if (!effect) {
    return;
  }

  const source = findPlayer(state, attack.sourceId);
  if (!source) {
    return;
  }

  if (effect === "zhong_shield") {
    const existing = source.buffs.find(
      (buff) => buff.id === "jin_zhong_zhao" && buff.sourcePlayerId === attack.targetId
    );
    if (existing) {
      existing.stacks = 1;
    } else {
      source.buffs.push({
        id: "jin_zhong_zhao",
        name: `金钟罩：${getPlayerName(state, attack.targetId)}`,
        stacks: 1,
        sourcePlayerId: attack.targetId
      });
    }

    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${getPlayerName(state, attack.sourceId)} 获得 1 层对 ${getPlayerName(state, attack.targetId)} 的金钟罩`
    });
    return;
  }

  if (effect === "lian_bao_free") {
    source.buffs.push({
      id: "free_lian_bao",
      name: "免费连爆机会",
      stacks: 1
    });
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${getPlayerName(state, attack.sourceId)} 获得 1 次免费连爆机会`
    });
  }
}

function applyHealthDeltas(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>
): boolean {
  let changed = false;

  for (const [playerId, delta] of healthDeltas.entries()) {
    const player = findPlayer(state, playerId);
    if (!player || player.status !== "alive") {
      continue;
    }

    const before = player.hp;
    player.hp = player.hp - delta.damage + delta.healing;

    if (delta.damage > 0) {
      changed = true;
    }

    if (delta.healing > 0) {
      changed = true;
    }

    if (player.hp !== before) {
      changed = true;
    }
  }

  return changed;
}

function updateDeaths(state: GameState): void {
  for (const player of state.players) {
    if (
      player.status === "alive" &&
      player.hp === 0 &&
      player.skills.includes("skill_69_22138")
    ) {
      player.status = "dead";
      player.cakes = 0;
      state.eventLog.push({
        ...createBaseEvent(state, "player_died"),
        type: "player_died",
        playerId: player.id
      });
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `${player.name} 的绝对值规则触发：生命为 0，直接死亡`
      });
      continue;
    }

    if (
      player.status === "alive" &&
      player.hp < 0 &&
      player.skills.includes("skill_69_22138")
    ) {
      const before = player.hp;
      player.hp = Math.abs(player.hp);
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `${player.name} 的绝对值触发：${before} 血变为 ${player.hp} 血`
      });
      continue;
    }

    if (player.status === "alive" && player.hp < 0) {
      player.status = "dead";
      player.cakes = 0;
      state.eventLog.push({
        ...createBaseEvent(state, "player_died"),
        type: "player_died",
        playerId: player.id
      });
    }
  }
}

function clearTurnTemporaryBuffs(state: GameState): void {
  const temporaryBuffIds = new Set([
    "temp_invulnerable",
    "temp_shield_normal",
    "temp_shield_skill"
  ]);

  for (const player of state.players) {
    player.buffs = player.buffs.filter(
      (buff) =>
        !temporaryBuffIds.has(buff.id) &&
        (buff.expiresAtTurn === undefined || buff.expiresAtTurn > state.turnNumber)
    );
  }
}

function endRound(state: GameState): void {
  state.eventLog.push({
    ...createBaseEvent(state, "round_ended"),
    type: "round_ended",
    reason: "有人血量发生变化，所有饼清零"
  });

  for (const player of state.players) {
    if (player.cakes > 0) {
      changeCakes(state, player.id, 0, "轮结束清零");
    }
  }

  state.roundNumber += 1;
  state.roundTurnNumber = 1;
  applyRoundStartSkills(state);
}

function applyRoundStartSkills(state: GameState): void {
  for (const player of state.players) {
    if (player.status !== "alive") {
      continue;
    }

    if (player.skills.includes("skill_53_62958")) {
      changeCakes(state, player.id, player.cakes + 1, "独裁轮初+1饼");
    }

    if (player.skills.includes("skill_71_40087") && state.roundNumber % 3 === 0) {
      if (isGlobalSkillActive(state, "skill_12_79004")) {
        state.eventLog.push({
          ...createBaseEvent(state, "system"),
          type: "system",
          message: `${player.name} \u7684\u5723\u57df\u56de\u8840\u88ab\u8840\u4e4b\u54c0\u538b\u5236`
        });
        continue;
      }

      player.hp += 3;
      state.eventLog.push({
        ...createBaseEvent(state, "heal"),
        type: "heal",
        sourceId: player.id,
        targetId: player.id,
        amount: 3,
        reason: "圣域"
      });
    }
  }
}

function changeCakes(
  state: GameState,
  playerId: PlayerId,
  nextCakes: number,
  reason: string
): void {
  const player = findPlayer(state, playerId);
  if (!player) {
    return;
  }

  const before = player.cakes;
  player.cakes = Math.max(0, nextCakes);
  if (before === player.cakes) {
    return;
  }

  state.eventLog.push({
    ...createBaseEvent(state, "cake_changed"),
    type: "cake_changed",
    playerId,
    before,
    after: player.cakes,
    reason
  });
}

function calculateClashDamage(high: AttackStats, low: AttackStats): number {
  if (high.power >= INFINITE_DAMAGE) {
    return INFINITE_DAMAGE;
  }

  if (high.level <= 0) {
    return high.power;
  }

  return Math.ceil(((high.level - low.level) / high.level) * high.power);
}

function addDamage(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  targetId: PlayerId,
  amount: number,
  sourceId?: PlayerId,
  attackName?: string,
  stats?: AttackStats
): void {
  const target = findPlayer(state, targetId);
  if (!target || amount <= 0) {
    return;
  }

  const lockedAdjusted = applyLockedDamageRules(state, targetId, amount, sourceId, attackName, stats);
  if (lockedAdjusted <= 0) {
    return;
  }

  const normalizedAmount = Math.min(lockedAdjusted, INFINITE_DAMAGE);
  if (sourceId && absorbWithTemporaryProtection(state, targetId, sourceId, normalizedAmount, attackName, stats)) {
    return;
  }

  if (sourceId && absorbWithShield(state, targetId, sourceId, normalizedAmount, attackName)) {
    return;
  }

  const delta = ensureDelta(healthDeltas, targetId);
  delta.damage += normalizedAmount;
  const event: DamageEvent = {
    ...createBaseEvent(state, "damage"),
    type: "damage",
    targetId,
    amount: normalizedAmount
  };
  if (sourceId) {
    event.sourceId = sourceId;
  }
  if (attackName) {
    event.attackName = attackName;
  }
  state.eventLog.push(event);

  const source = sourceId ? findPlayer(state, sourceId) : undefined;
  if (source?.skills.includes("skill_46_3651") && normalizedAmount < INFINITE_DAMAGE) {
    const healing = Math.floor(normalizedAmount / 4);
    if (healing > 0) {
      addHeal(state, healthDeltas, source.id, healing, source.id, "嗜血");
    }
  }
}

function applyLockedDamageRules(
  state: GameState,
  targetId: PlayerId,
  amount: number,
  sourceId: PlayerId | undefined,
  attackName: string | undefined,
  stats: AttackStats | undefined
): number {
  const target = findPlayer(state, targetId);
  if (!target) {
    return 0;
  }

  if (
    target.skills.includes("skill_51_92674") &&
    stats &&
    ["sha", "wan_jian", "nan_man"].includes(String(stats.id))
  ) {
    const isFire = stats.element === "fire" || stats.traits.includes("fire");
    if (!isFire) {
      state.eventLog.push({
        ...createBaseEvent(state, "attack_blocked"),
        type: "attack_blocked",
        sourceId: sourceId ?? targetId,
        targetId,
        attackName: attackName ?? stats.name
      });
      state.eventLog.push({
        ...createBaseEvent(state, "system"),
        type: "system",
        message: `${target.name} 的藤甲免疫了 ${attackName ?? stats.name}`
      });
      return 0;
    }

    amount += 1;
  }

  if (target.skills.includes("skill_50_50034") && amount < INFINITE_DAMAGE) {
    amount = Math.max(0, amount - 1);
  }

  if (
    target.skills.includes("skill_114_87583") &&
    target.hp - amount < 0 &&
    amount !== 1 &&
    amount < INFINITE_DAMAGE
  ) {
    return Math.max(0, target.hp);
  }

  return amount;
}

function absorbWithTemporaryProtection(
  state: GameState,
  targetId: PlayerId,
  sourceId: PlayerId,
  amount: number,
  attackName: string | undefined,
  stats: AttackStats | undefined
): boolean {
  const target = findPlayer(state, targetId);
  if (!target || amount <= 0) {
    return false;
  }

  const hasProtection = (id: string) =>
    target.buffs.some((buff) => buff.id === id && buff.stacks > 0);
  const protectedByAll = hasProtection("temp_invulnerable");
  const protectedByNormal = hasProtection("temp_shield_normal") && !stats?.isSkill;
  const protectedBySkill = hasProtection("temp_shield_skill") && Boolean(stats?.isSkill);
  if (!protectedByAll && !protectedByNormal && !protectedBySkill) {
    return false;
  }

  state.eventLog.push({
    ...createBaseEvent(state, "attack_blocked"),
    type: "attack_blocked",
    sourceId,
    targetId,
    attackName: attackName ?? stats?.name ?? "攻击"
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${getPlayerName(state, targetId)} 的技能保护抵挡了 ${getPlayerName(state, sourceId)} 的 ${attackName ?? stats?.name ?? "攻击"}`
  });
  return true;
}

function absorbWithShield(
  state: GameState,
  targetId: PlayerId,
  sourceId: PlayerId,
  amount: number,
  attackName: string | undefined
): boolean {
  const target = findPlayer(state, targetId);
  if (!target || amount <= 0 || amount > INFINITE_DAMAGE) {
    return false;
  }

  const buffIndex = target.buffs.findIndex(
    (buff) => buff.id === "jin_zhong_zhao" && buff.sourcePlayerId === sourceId && buff.stacks > 0
  );
  if (buffIndex === -1) {
    return false;
  }

  const buff = target.buffs[buffIndex]!;
  buff.stacks -= 1;
  if (buff.stacks <= 0) {
    target.buffs.splice(buffIndex, 1);
  }

  state.eventLog.push({
    ...createBaseEvent(state, "attack_blocked"),
    type: "attack_blocked",
    sourceId,
    targetId,
    attackName: attackName ?? "攻击"
  });
  state.eventLog.push({
    ...createBaseEvent(state, "system"),
    type: "system",
    message: `${getPlayerName(state, targetId)} 的金钟罩抵挡了 ${getPlayerName(state, sourceId)} 的 ${attackName ?? "攻击"}`
  });
  return true;
}

function addHeal(
  state: GameState,
  healthDeltas: Map<PlayerId, HealthDelta>,
  targetId: PlayerId,
  amount: number,
  sourceId: PlayerId | undefined,
  reason: string
): void {
  if (amount <= 0) {
    return;
  }

  if (isGlobalSkillActive(state, "skill_12_79004")) {
    state.eventLog.push({
      ...createBaseEvent(state, "system"),
      type: "system",
      message: `${getPlayerName(state, targetId)} \u7684\u56de\u8840\u88ab\u8840\u4e4b\u54c0\u538b\u5236`
    });
    return;
  }

  const delta = ensureDelta(healthDeltas, targetId);
  delta.healing += amount;
  const event: HealEvent = {
    ...createBaseEvent(state, "heal"),
    type: "heal",
    targetId,
    amount,
    reason
  };
  if (sourceId) {
    event.sourceId = sourceId;
  }
  state.eventLog.push(event);
}

function ensureDelta(
  healthDeltas: Map<PlayerId, HealthDelta>,
  playerId: PlayerId
): HealthDelta {
  const existing = healthDeltas.get(playerId);
  if (existing) {
    return existing;
  }

  const next: HealthDelta = {
    damage: 0,
    healing: 0
  };
  healthDeltas.set(playerId, next);
  return next;
}

function isGlobalSkillActive(state: GameState, skillId: string): boolean {
  const brokenByPoE = alivePlayers(state).some((player) =>
    player.skills.includes("skill_9_93219")
  );
  if (brokenByPoE) {
    return false;
  }

  return alivePlayers(state).some((player) => player.skills.includes(skillId));
}

function getPlayerName(state: GameState, playerId: PlayerId): string {
  return findPlayer(state, playerId)?.name ?? "未知玩家";
}

function formatDamage(amount: number): string {
  return amount >= INFINITE_DAMAGE ? "∞" : String(amount);
}
