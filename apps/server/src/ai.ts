import {
  AttackStats,
  AttackStatModifierChoice,
  ATTACK_ORDER,
  BASE_ATTACKS,
  GameState,
  INFINITE_DAMAGE,
  PlayerAction,
  PlayerId,
  PlayerState,
  SkillAction,
  SkillPlayDefinition,
  alivePlayers,
  canPlayerSeeSkill,
  getActionSwitchChoicesForAction,
  getActiveSkillCount,
  getLightningSpellTargetPlan,
  getSkill,
  getSkillAttackStats,
  getSkillPlay,
  getSmallSkillIds,
  getStackedAttackStats,
  isActionSwitchSkillId,
  playerHasActiveSkill,
  skillHasTypeTag,
  validateAction,
  validateActionWindowSkill
} from "@bing/shared";
import { getPolicyBonus } from "./aiPolicy";

const WINDOW_SKILL_SCORE_FLOOR = 22;
const HELL_OVERLORD_SKILL_ID = "skill_112_59292";
const DESTROY_POWER_MODIFIER_CHOICES: AttackStatModifierChoice[] = [
  "power_plus_1_level_minus_1",
  "power_minus_1_level_plus_1",
  "power_plus_2_level_minus_2",
  "power_minus_2_level_plus_2",
  "power_times_3_level_to_zero",
  "power_to_zero_level_times_4"
];
const LUANWU_SKILL_ID = "skill_54_99719";
const SHENZU_CRYSTAL_SKILL_ID = "skill_98_7182";

export function chooseAiAction(state: GameState, playerId: PlayerId): PlayerAction {
  const self = state.players.find((player) => player.id === playerId);
  const enemies = alivePlayers(state).filter((player) => player.id !== playerId);
  const target = enemies[0];

  if (!self || !target) {
    return { type: "gain_cake" };
  }

  if (state.config.firstTurnNoAttack && state.roundTurnNumber === 1) {
    return { type: "gain_cake" };
  }

  const candidates = enumerateLegalAiActions(state, self, enemies);
  const scored = candidates
    .map((action) => ({
      action,
      score: scoreAiAction(state, self, enemies, action)
    }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { type: "gain_cake" };
  }

  const vulnerableEnemy = enemies.some((enemy) => enemy.hp <= 1);
  const duelEndgame = enemies.length === 1 && self.cakes > 0;
  const shouldForceTempo =
    self.cakes > 0 &&
    (self.cakes >= 5 ||
      vulnerableEnemy ||
      (duelEndgame && state.turnNumber >= 12) ||
      state.turnNumber >= 24);
  const tempoPool = shouldForceTempo
    ? scored.filter((item) => isOffensiveAction(item.action))
    : [];
  const top = (tempoPool.length > 0 ? tempoPool : scored).slice(
    0,
    Math.min(3, tempoPool.length > 0 ? tempoPool.length : scored.length)
  );

  const totalWeight = top.reduce((sum, item) => sum + Math.max(1, item.score), 0);
  let roll = Math.random() * totalWeight;
  for (const item of top) {
    roll -= Math.max(1, item.score);
    if (roll <= 0) {
      return item.action;
    }
  }

  return scored[0]!.action;
}

export function enumerateLegalAiActions(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[]
): PlayerAction[] {
  const actions: PlayerAction[] = [{ type: "gain_cake" }];

  actions.push(
    { type: "defense", defense: "small" },
    { type: "defense", defense: "youtiao" },
    { type: "defense", defense: "stone" }
  );

  if (self.cakes > 0 && enemies[0]) {
    actions.push({
      type: "defense",
      defense: "rebound",
      targetId: chooseWeakestEnemy(enemies).id
    });
  }

  if (!(state.config.firstTurnNoAttack && state.roundTurnNumber === 1)) {
    for (const skillId of self.skills) {
      const play = getSkillPlay(skillId);
      if (!play) {
        continue;
      }

      actions.push(...buildAiSkillActions(state, self, enemies, skillId, play));
    }

    for (const attackId of ATTACK_ORDER) {
      const definition = BASE_ATTACKS[attackId];
      const maxStacks = Math.min(3, Math.floor(self.cakes / definition.cost));
      for (let stacks = 1; stacks <= maxStacks; stacks += 1) {
        const forcedArea = hasForcedAreaAttacks(state, self);
        if (definition.isArea || forcedArea) {
          actions.push({ type: "attack", attackId, stacks });
        }

        if (!definition.isArea && !forcedArea) {
          for (const enemy of enemies) {
            actions.push({
              type: "attack",
              attackId,
              stacks,
              targetId: enemy.id
            });
          }
        }
      }
    }
  }

  return uniqueActions(actions).filter((action) =>
    validateAction(state, self.id, action).ok
  );
}

export function chooseAiActionWindowSkill(
  state: GameState,
  playerId: PlayerId
): SkillAction | undefined {
  const self = state.players.find((player) => player.id === playerId);
  const enemies = alivePlayers(state).filter((player) => player.id !== playerId);
  if (!self || self.status !== "alive" || state.phase !== "action_window") {
    return undefined;
  }

  const candidates = enumerateLegalAiActionWindowSkills(state, self, enemies);
  const scored = candidates
    .map((action) => ({
      action,
      score: scoreAiAction(state, self, enemies, action)
    }))
    .filter((item) => item.score >= WINDOW_SKILL_SCORE_FLOOR)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return undefined;
  }

  const top = scored.slice(0, Math.min(2, scored.length));
  const totalWeight = top.reduce((sum, item) => sum + Math.max(1, item.score), 0);
  let roll = Math.random() * totalWeight;
  for (const item of top) {
    roll -= Math.max(1, item.score);
    if (roll <= 0) {
      return item.action;
    }
  }

  return scored[0]!.action;
}

export function enumerateLegalAiActionWindowSkills(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[]
): SkillAction[] {
  if (state.phase !== "action_window") {
    return [];
  }

  const validationState =
    state.actionWindowMode === "prompt"
      ? {
          ...state,
          actionWindowMode: "active" as const
        }
      : state;
  const actions = self.skills.flatMap((skillId) => {
    const play = getSkillPlay(skillId);
    if (!play || play.kind === "attack") {
      return [];
    }

    return buildAiSkillActions(state, self, enemies, skillId, play);
  });

  return uniqueActions(actions).filter((action) =>
    validateActionWindowSkill(validationState, self.id, action).ok
  );
}

function buildAiSkillActions(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  skillId: string,
  play: SkillPlayDefinition
): SkillAction[] {
  if (
    play.usesPerGame &&
    getSkillUseCount(self, skillId) >= play.usesPerGame * getActiveSkillCount(self, skillId)
  ) {
    return [];
  }

  if (isActionSwitchSkillId(skillId)) {
    return buildAiActionSwitchSkills(state, self, skillId);
  }

  if (skillId === "skill_45_30424" || skillId === "skill_91_89631") {
    return buildAiAttackStatModifierSkills(state, self, skillId);
  }

  if (skillId === "skill_4_65637") {
    return buildAiSandTransformSkills(state, self);
  }

  if (skillId === "skill_68_57581") {
    return buildAiLishangSkills(state, self);
  }

  if (skillId === HELL_OVERLORD_SKILL_ID) {
    return buildAiHellOverlordSkills(state, self);
  }

  if (skillId === "skill_94_627") {
    return buildAiDamageRedirectSkills(state, self, enemies);
  }

  if (skillId === "skill_35_16792") {
    return buildAiLightningSpellSkills(state, self);
  }

  if (skillId === "skill_36_14343") {
    return buildAiElectricShockSkills(enemies);
  }

  if (needsExposedSkillTarget(skillId)) {
    return enumerateExposedSkillTargetActions(state, self, enemies, skillId);
  }

  const maxStacks = getMaxAiSkillStacks(self, skillId, play);
  if (maxStacks <= 0) {
    return [];
  }

  const actions: SkillAction[] = [];
  for (let stacks = 1; stacks <= maxStacks; stacks += 1) {
    if (
      play.targetMode === "none" ||
      play.targetMode === "all" ||
      (play.kind === "attack" && hasForcedAreaAttacks(state, self))
    ) {
      actions.push({ type: "skill", skillId, stacks });
      continue;
    }

    for (const enemy of enemies) {
      actions.push({
        type: "skill",
        skillId,
        stacks,
        targetId: enemy.id
      });
    }
  }

  return actions;
}

function buildAiActionSwitchSkills(
  state: GameState,
  self: PlayerState,
  skillId: string
): SkillAction[] {
  const plan = state.pendingActions[self.id];
  if (!plan) {
    return [];
  }

  return plan.actions.flatMap((current, actionIndex) =>
    getActionSwitchChoicesForAction(skillId, current)
      .filter((choice) => self.cakes >= choice.cost)
      .map((choice) => ({
        type: "skill" as const,
        skillId,
        stacks: 1,
        switchActionIndex: actionIndex,
        switchToAction: choice.action
      }))
  );
}

function buildAiAttackStatModifierSkills(
  state: GameState,
  self: PlayerState,
  skillId: string
): SkillAction[] {
  const plan = state.pendingActions[self.id];
  if (!plan) {
    return [];
  }

  return plan.actions.flatMap((current, actionIndex) => {
    if (!isAttackLikeAction(current)) {
      return [];
    }

    if (skillId === "skill_91_89631") {
      return [
        {
          type: "skill" as const,
          skillId,
          stacks: 1,
          switchActionIndex: actionIndex,
          attackStatModifier: "swap_power_level" as const
        }
      ];
    }

    return DESTROY_POWER_MODIFIER_CHOICES.map((attackStatModifier) => ({
      type: "skill" as const,
      skillId,
      stacks: 1,
      switchActionIndex: actionIndex,
      attackStatModifier
    }));
  });
}

function buildAiSandTransformSkills(state: GameState, self: PlayerState): SkillAction[] {
  const occupied = new Set(
    alivePlayers(state)
      .filter((player) => player.id !== self.id)
      .flatMap((player) => player.skills)
  );
  const targetSkillId = getSmallSkillIds().find((skillId) => !occupied.has(skillId));
  if (!targetSkillId) {
    return [];
  }

  return [
    {
      type: "skill",
      skillId: "skill_4_65637",
      stacks: 1,
      targetSkillId
    }
  ];
}

function buildAiLishangSkills(state: GameState, self: PlayerState): SkillAction[] {
  const fatalSourceIds = new Set(
    state.eventLog
      .filter(
        (event) =>
          event.type === "damage" &&
          event.targetId === self.id &&
          event.amount > 0 &&
          event.roundNumber === state.roundNumber &&
          event.turnNumber === state.roundTurnNumber &&
          Boolean(event.sourceId)
      )
      .map((event) => event.type === "damage" ? event.sourceId : undefined)
      .filter((sourceId): sourceId is PlayerId => Boolean(sourceId))
  );

  return state.players
    .filter((player) => fatalSourceIds.has(player.id) && player.status === "alive")
    .map((player) => ({
      type: "skill" as const,
      skillId: "skill_68_57581",
      stacks: 1,
      targetId: player.id
    }));
}

function buildAiHellOverlordSkills(state: GameState, self: PlayerState): SkillAction[] {
  const pendingDeathWindow =
    state.activeTimingPhase === "revival_action" &&
    self.buffs.some((buff) => buff.id === "pending_death");
  if (pendingDeathWindow) {
    return [
      {
        type: "skill",
        skillId: HELL_OVERLORD_SKILL_ID,
        stacks: 1,
        targetId: self.id
      }
    ];
  }

  const target = state.players.find(
    (player) =>
      player.id !== self.id &&
      player.status === "dead" &&
      player.defeatLevel === 1 &&
      !player.buffs.some((buff) => buff.id === "no_revive")
  );
  return target
    ? [
        {
          type: "skill",
          skillId: HELL_OVERLORD_SKILL_ID,
          stacks: 1,
          targetId: target.id
        }
      ]
    : [];
}

function buildAiDamageRedirectSkills(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[]
): SkillAction[] {
  const damage = (state.pendingDamageItems ?? []).find(
    (item) =>
      item.targetId === self.id &&
      item.amount <= 3 &&
      !(item.redirectedByPlayerIds ?? []).includes(self.id)
  );
  const target = enemies.length > 0 ? chooseWeakestEnemy(enemies) : undefined;
  if (!damage || !target) {
    return [];
  }

  return [
    {
      type: "skill",
      skillId: "skill_94_627",
      stacks: 1,
      targetId: target.id,
      targetDamageId: damage.id
    }
  ];
}

function buildAiLightningSpellSkills(state: GameState, self: PlayerState): SkillAction[] {
  const plan = getLightningSpellTargetPlan(state.players, self.id);
  const selectableTargets = plan.selectableTargets
    .filter((player) => !plan.lockedTargets.some((locked) => locked.id === player.id))
    .sort((a, b) => a.hp - b.hp);
  const targetIds = [
    ...plan.lockedTargets.map((player) => player.id),
    ...selectableTargets
      .slice(0, plan.requiredSelectableCount)
      .map((player) => player.id)
  ].slice(0, plan.targetCount);

  if (targetIds.length === 0) {
    return [];
  }
  const primaryTargetId = targetIds[0];
  if (!primaryTargetId) {
    return [];
  }

  return [
    {
      type: "skill",
      skillId: "skill_35_16792",
      stacks: 1,
      targetId: primaryTargetId,
      targetIds
    }
  ];
}

function buildAiElectricShockSkills(enemies: PlayerState[]): SkillAction[] {
  const targets = [...enemies]
    .sort((a, b) => a.hp - b.hp || b.cakes - a.cakes)
    .slice(0, 2);
  const primary = targets[0];
  if (!primary) {
    return [];
  }

  return [
    {
      type: "skill",
      skillId: "skill_36_14343",
      stacks: 1,
      targetId: primary.id,
      targetIds: targets.map((target) => target.id)
    }
  ];
}

function enumerateExposedSkillTargetActions(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  skillId: string
): SkillAction[] {
  return enemies.flatMap((enemy) =>
    enemy.skills
      .filter((targetSkillId) => {
        const skill = getSkill(targetSkillId);
        return (
          Boolean(skill) &&
          (skillId !== "skill_5_34881" || skillHasTypeTag(skill, "锁定技")) &&
          canPlayerSeeSkill(state, self.id, enemy.id, targetSkillId)
        );
      })
      .map((targetSkillId) => ({
        type: "skill" as const,
        skillId,
        stacks: 1,
        targetId: enemy.id,
        targetSkillId
      }))
  );
}

function needsExposedSkillTarget(skillId: string): boolean {
  const skill = getSkill(skillId);
  return Boolean(
    skillId === "skill_5_34881" ||
      (skill?.description.includes("\u66b4\u9732") &&
        skill.description.includes("\u6280\u80fd"))
  );
}

function getMaxAiSkillStacks(
  self: PlayerState,
  skillId: string,
  play: SkillPlayDefinition
): number {
  const resourceStacks = getAvailableSkillResourceStacks(self, skillId);
  const affordableStacks =
    play.cost > 0 ? Math.floor(self.cakes / play.cost) : 1;
  return Math.min(3, play.maxStacks, resourceStacks ?? affordableStacks);
}

function uniqueActions<T extends PlayerAction>(actions: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const action of actions) {
    const key = JSON.stringify(action);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(action);
  }

  return result;
}

function getSkillUseCount(player: PlayerState, skillId: string): number {
  return player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
}

function getAvailableSkillResourceStacks(player: PlayerState, skillId: string): number | undefined {
  if (skillId === "skill_37_68416") {
    return player.buffs.find((buff) => buff.id === "guidao_charge")?.stacks ?? 0;
  }

  if (skillId === "skill_21_36332") {
    return player.buffs.find((buff) => buff.id === "lava_mark")?.stacks ?? 0;
  }

  if (skillId === "skill_22_54978") {
    return player.buffs.find((buff) => buff.id === "winter_mark")?.stacks ?? 0;
  }

  return undefined;
}

function isOffensiveAction(action: PlayerAction): boolean {
  if (action.type === "attack") {
    return true;
  }

  if (action.type !== "skill") {
    return false;
  }

  return getSkillPlay(action.skillId)?.kind === "attack";
}

export function scoreAiAction(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  action: PlayerAction
): number {
  const trainedBonus = getPolicyBonus(state, self, enemies, action);

  if (action.type === "gain_cake") {
    const attackPressure = enemies.some((enemy) => enemy.cakes > 0);
    const wantBigMove = self.cakes < 3 || enemies.every((enemy) => enemy.cakes === 0);
    const hoardingPenalty = self.cakes >= 5 ? 30 : self.cakes >= 3 ? 12 : 0;
    const lateTempoPenalty = state.turnNumber >= 18 ? 10 : 0;
    return (
      32 +
      (wantBigMove ? 22 : 0) -
      (attackPressure ? 10 : 0) -
      hoardingPenalty -
      lateTempoPenalty +
      trainedBonus
    );
  }

  if (action.type === "defense") {
    const likelyIncoming = enemies.filter((enemy) => enemy.cakes > 0).length;
    const lowHpBonus = self.hp <= 2 ? 24 : 0;
    const canCounterattack = self.cakes >= 4 && self.hp > 2;
    const tempoPenalty = canCounterattack ? 32 : state.turnNumber >= 18 && self.hp > 2 ? 14 : 0;
    if (action.defense === "rebound") {
      return (
        38 +
        likelyIncoming * 11 +
        lowHpBonus +
        Math.min(14, self.cakes * 2) -
        tempoPenalty +
        trainedBonus
      );
    }

    if (action.defense === "self_destruct") {
      return trainedBonus - 200;
    }

    return (
      16 +
      likelyIncoming * 7 +
      lowHpBonus +
      defenseMatchBonus(enemies, action.defense) -
      tempoPenalty +
      trainedBonus
    );
  }

  if (action.type === "skill") {
    const play = getSkillPlay(action.skillId);
    if (!play) {
      return trainedBonus;
    }

    if (play.kind === "resource") {
      const gain = (play.resourceGainPerStack ?? 0) * action.stacks;
      const pressurePenalty = enemies.some((enemy) => enemy.cakes >= 2) ? 12 : 0;
      return 26 + gain * 7 + (self.cakes <= 2 ? 12 : 0) - pressurePenalty + trainedBonus;
    }

    if (play.kind === "effect") {
      return scoreAiEffectSkill(state, self, enemies, action, play) + trainedBonus;
    }

    const stats = getSkillAttackStats(action.skillId, action.stacks);
    if (!stats) {
      return trainedBonus;
    }

    const target = action.targetId
      ? state.players.find((player) => player.id === action.targetId)
      : chooseWeakestEnemy(enemies);
    const killBonus = target && stats.power > target.hp ? 86 : 0;
    const pressureBonus = target ? Math.max(0, 8 - target.hp) * 4 : 0;
    const areaBonus = stats.isArea ? Math.max(0, enemies.length - 1) * 18 : 0;
    const efficiency = stats.power / Math.max(1, stats.cost);
    const tempoBonus = self.cakes >= 4 ? 20 : state.turnNumber >= 18 ? 12 : 0;

    return (
      28 +
      stats.power * 6 +
      stats.level * 2 +
      efficiency * 10 +
      killBonus +
      pressureBonus +
      areaBonus +
      tempoBonus +
      trainedBonus
    );
  }

  if (action.type !== "attack") {
    return trainedBonus;
  }

  const definition = BASE_ATTACKS[action.attackId];
  const stats = getStackedAttackStats(definition, action.stacks);
  const target = action.targetId
    ? state.players.find((player) => player.id === action.targetId)
    : chooseWeakestEnemy(enemies);
  const killBonus = target && stats.power > target.hp ? 90 : 0;
  const pressureBonus = target ? Math.max(0, 8 - target.hp) * 4 : 0;
  const areaBonus = definition.isArea ? Math.max(0, enemies.length - 1) * 18 : 0;
  const efficiency = stats.power / Math.max(1, stats.cost);
  const overSpendPenalty = self.cakes - stats.cost <= 0 && self.hp <= 2 ? 22 : 0;
  const qinRiskPenalty =
    action.attackId === "qin" && enemies.some((enemy) => enemy.cakes > 0)
      ? state.turnNumber >= 6
        ? 28
        : 12
      : 0;
  const shaCounterTempo =
    action.attackId === "sha" && enemies.some((enemy) => enemy.cakes === 1)
      ? state.turnNumber >= 6
        ? 26
        : 10
      : 0;
  const desperationClashBreak =
    action.attackId === "qin" &&
    enemies.length === 1 &&
    self.hp <= 1 &&
    self.cakes <= 2 &&
    state.turnNumber >= 6
      ? 62
      : 0;
  const unblockableBonus = definition.defenseTag === "unblockable" ? 80 : 0;
  const firstStrikeTempo = state.roundTurnNumber <= 3 ? 8 : 0;
  const storedCakeTempo = self.cakes >= 4 ? 22 : state.turnNumber >= 18 ? 12 : 0;

  return (
    24 +
    stats.power * 5 +
    stats.level * 2 +
    efficiency * 11 +
    killBonus +
    pressureBonus +
    areaBonus +
    unblockableBonus +
    firstStrikeTempo +
    storedCakeTempo +
    shaCounterTempo +
    desperationClashBreak -
    overSpendPenalty -
    qinRiskPenalty +
    trainedBonus
  );
}

function scoreAiEffectSkill(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  action: SkillAction,
  play: SkillPlayDefinition
): number {
  const skill = getSkill(action.skillId);
  const target = action.targetId
    ? state.players.find((player) => player.id === action.targetId)
    : chooseWeakestEnemy(enemies);
  const incomingPressure = enemies.filter((enemy) => enemy.cakes > 0).length;
  const lowHpBonus = self.hp <= 2 ? 28 : self.hp <= 4 ? 10 : 0;
  let score = 8;

  if (skillHasTypeTag(skill, "限定技")) {
    score += 6;
  }

  if (play.selfHeal) {
    const missingHp = Math.max(0, 6 - self.hp);
    score += Math.min(play.selfHeal, Math.max(1, missingHp)) * 9 + lowHpBonus;
  }

  if (play.selfDamage) {
    score -= self.hp <= play.selfDamage + 1 ? 80 : play.selfDamage * 14;
  }

  if (play.targetDamage && play.targetDamage > 0) {
    const targets = estimateEffectTargets(state, self.id, enemies, action, play);
    const lethalCount = targets.filter((enemy) => play.targetDamage! >= enemy.hp).length;
    score += targets.length * play.targetDamage * 12 + lethalCount * 42;
  }

  if (play.allEnemyDamage !== undefined) {
    const targets = estimateEffectTargets(state, self.id, enemies, action, play);
    if (play.allEnemyDamage > 0) {
      const lethalCount = targets.filter((enemy) => play.allEnemyDamage! >= enemy.hp).length;
      score += targets.length * play.allEnemyDamage * 11 + lethalCount * 40;
    } else if (play.allEnemyDamage < 0) {
      score -= targets.length * Math.abs(play.allEnemyDamage) * 8;
    }
  }

  if (play.effect === "invulnerable_turn") {
    score += 18 + incomingPressure * 12 + lowHpBonus;
  }

  if (play.effect === "shield_normal" || play.effect === "shield_skill") {
    score += 14 + incomingPressure * 9 + lowHpBonus;
  }

  if (play.effect === "gain_defense_value") {
    score += 18 + incomingPressure * 8 + lowHpBonus;
  }

  if (play.effect === "lava_mark" || play.effect === "winter_mark") {
    score += hasPendingOffense(state, self.id) ? 34 + action.stacks * 8 : -18;
  }

  if (play.effect === "abs_plus") {
    score += self.hp < 0 ? 90 : self.hp <= 2 ? 54 : 18;
  }

  if (action.skillId === "skill_5_34881" && target) {
    score += 48 + Math.max(0, target.skills.length - target.revealedSkillIds.length) * 4;
  }

  if (action.targetSkillId && action.skillId !== "skill_5_34881") {
    score += 18;
  }

  if (action.skillId === "skill_14_46860") {
    score += enemies.filter(playerHasFireSkill).length * 28;
  }

  if (action.skillId === "skill_72_53933" && target) {
    score += 22 + Math.max(0, 7 - target.hp) * 4;
  }

  if (play.effect === "no_direct_effect") {
    score += scoreNoDirectEffectWindow(state, self, enemies, action);
  }

  if (play.targetMode === "single" && target) {
    score += Math.max(0, 7 - target.hp) * 3;
  }

  return Math.max(0, score);
}

function estimateEffectTargets(
  state: GameState,
  selfId: PlayerId,
  enemies: PlayerState[],
  action: SkillAction,
  play: SkillPlayDefinition
): PlayerState[] {
  if (play.targetMode === "single" && action.targetId) {
    return enemies.filter((enemy) => enemy.id === action.targetId);
  }

  if (play.effect === "highest_hp_damage") {
    return [...enemies]
      .sort((a, b) => b.hp - a.hp)
      .slice(0, play.selectedTargetCount ?? 1);
  }

  if (play.effect === "low_hp_execute") {
    return enemies.filter((enemy) => enemy.hp <= (play.hpThreshold ?? 3));
  }

  if (play.effect === "odd_hp_damage") {
    return enemies.filter((enemy) => Math.abs(enemy.hp) % 2 === 1);
  }

  if (play.effect === "even_hp_damage") {
    return enemies.filter((enemy) => Math.abs(enemy.hp) % 2 === 0);
  }

  if (play.targetMode === "all") {
    const skill = getSkill(action.skillId);
    return enemies.filter(
      (enemy) => !(skillHasTypeTag(skill, "限定技") && enemy.skills.includes("skill_7_35434"))
    );
  }

  return alivePlayers(state).filter(
    (player) => player.id !== selfId && enemies.some((enemy) => enemy.id === player.id)
  );
}

function hasPendingOffense(state: GameState, playerId: PlayerId): boolean {
  return Boolean(
    state.pendingActions[playerId]?.actions.some(
      (action) =>
        action.type === "attack" ||
        (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack")
    )
  );
}

function scoreNoDirectEffectWindow(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  action: SkillAction
): number {
  if (action.skillId === "skill_5_34881" || action.skillId === "skill_72_53933") {
    return 0;
  }

  const useCount = getSkillUseCount(self, action.skillId);
  if (
    useCount > 0 &&
    action.skillId !== "skill_15_64971" &&
    action.skillId !== "skill_47_94841"
  ) {
    return -30;
  }

  if (action.skillId === "skill_24_71363") {
    return self.hp === 0 && self.cakes >= 3 ? 90 : -80;
  }

  if (action.skillId === "skill_47_94841") {
    const damageTaken = getRoundDamageTaken(self, state.roundNumber - 1);
    return damageTaken > 0 ? Math.min(4, damageTaken) * 24 : -40;
  }

  if (action.skillId === "skill_15_64971") {
    const targetParity = useCount % 2 === 0 ? 1 : 0;
    const targets = enemies.filter((enemy) => Math.abs(enemy.hp) % 2 === targetParity);
    const lethalCount = targets.filter((enemy) => enemy.hp <= 1).length;
    return targets.length * 14 + lethalCount * 42;
  }

  if (action.skillId === "skill_35_16792") {
    const targetIds = action.targetIds ?? (action.targetId ? [action.targetId] : []);
    const targets = enemies.filter((enemy) => targetIds.includes(enemy.id));
    const lethalCount = targets.filter((enemy) => enemy.hp <= 2).length;
    return targets.length * 26 + lethalCount * 42;
  }

  if (action.skillId === "skill_107_53513") {
    const targets = enemies.filter((enemy) => enemy.hp <= 3);
    return targets.length > 0 ? targets.length * 70 : -50;
  }

  if (action.skillId === HELL_OVERLORD_SKILL_ID) {
    return state.activeTimingPhase === "revival_action" ? 95 : 34;
  }

  if (action.skillId === "skill_94_627") {
    const damage = (state.pendingDamageItems ?? []).find((item) => item.id === action.targetDamageId);
    return damage ? damage.amount * 34 : -80;
  }

  if (action.skillId === "skill_45_30424" || action.skillId === "skill_91_89631") {
    return scoreAttackStatModifierWindow(state, self, action);
  }

  const phase = state.activeTimingPhase;
  if (phase === "turn_change_action" && hasPendingOffense(state, self.id)) {
    return 16 + enemies.filter((enemy) => enemy.hp <= 2).length * 6;
  }

  if (phase === "turn_damage_modify" && self.hp <= 3) {
    return 14;
  }

  if ((phase === "turn_end_action" || phase === "revival_action") && self.hp <= 2) {
    return 12;
  }

  return -6;
}

function scoreAttackStatModifierWindow(
  state: GameState,
  self: PlayerState,
  action: SkillAction
): number {
  const plan = state.pendingActions[self.id];
  const current = plan?.actions[normalizeActionIndex(action.switchActionIndex)];
  const before = current ? estimatePendingAttackStats(current) : undefined;
  const modifier =
    action.skillId === "skill_91_89631"
      ? "swap_power_level"
      : action.attackStatModifier;
  if (!before || !modifier) {
    return -80;
  }

  const after = applyAttackStatModifierChoice(before, modifier);
  const beforeValue = attackStatValue(before);
  const afterValue = attackStatValue(after);
  const improvement = afterValue - beforeValue;
  return improvement > 0 ? 24 + improvement * 4 : -60 + improvement * 4;
}

function estimatePendingAttackStats(action: PlayerAction): AttackStats | undefined {
  if (action.type === "attack") {
    return getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks);
  }

  if (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack") {
    return getSkillAttackStats(action.skillId, action.stacks);
  }

  return undefined;
}

function applyAttackStatModifierChoice(
  attack: AttackStats,
  modifier: AttackStatModifierChoice
): AttackStats {
  switch (modifier) {
    case "swap_power_level":
      return {
        ...attack,
        power: attack.level,
        level: attack.power
      };
    case "power_plus_1_level_minus_1":
      return {
        ...attack,
        power: addFiniteStat(attack.power, 1),
        level: Math.max(0, addFiniteStat(attack.level, -1))
      };
    case "power_minus_1_level_plus_1":
      return {
        ...attack,
        power: Math.max(0, addFiniteStat(attack.power, -1)),
        level: addFiniteStat(attack.level, 1)
      };
    case "power_plus_2_level_minus_2":
      return {
        ...attack,
        power: addFiniteStat(attack.power, 2),
        level: Math.max(0, addFiniteStat(attack.level, -2))
      };
    case "power_minus_2_level_plus_2":
      return {
        ...attack,
        power: Math.max(0, addFiniteStat(attack.power, -2)),
        level: addFiniteStat(attack.level, 2)
      };
    case "power_times_3_level_to_zero":
      return {
        ...attack,
        power: multiplyFiniteStat(attack.power, 3),
        level: 0
      };
    case "power_to_zero_level_times_4":
      return {
        ...attack,
        power: 0,
        level: multiplyFiniteStat(attack.level, 4)
      };
    default:
      return attack;
  }
}

function attackStatValue(stats: Pick<AttackStats, "power" | "level">): number {
  return boundedStatValue(stats.power) * 8 + boundedStatValue(stats.level) * 3;
}

function boundedStatValue(value: number): number {
  return value >= INFINITE_DAMAGE ? 16 : value;
}

function addFiniteStat(value: number, delta: number): number {
  return value >= INFINITE_DAMAGE ? value : value + delta;
}

function multiplyFiniteStat(value: number, factor: number): number {
  return value >= INFINITE_DAMAGE ? value : value * factor;
}

function normalizeActionIndex(value: number | undefined): number {
  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : 0;
}

function hasForcedAreaAttacks(state: GameState, player: PlayerState): boolean {
  return Boolean(
    playerHasActiveSkill(player, LUANWU_SKILL_ID) ||
      (playerHasActiveSkill(player, SHENZU_CRYSTAL_SKILL_ID) &&
        alivePlayers(state).length > 3)
  );
}

function isAttackLikeAction(action: PlayerAction): boolean {
  return (
    action.type === "attack" ||
    (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack")
  );
}

function playerHasFireSkill(player: { skills: string[] }): boolean {
  return player.skills.some((skillId) => {
    const skill = getSkill(skillId);
    return skill?.attribute === "fire";
  });
}

function chooseWeakestEnemy(enemies: PlayerState[]): PlayerState {
  return [...enemies].sort((a, b) => a.hp - b.hp || b.cakes - a.cakes)[0]!;
}

function getRoundDamageTaken(player: PlayerState, roundNumber: number): number {
  return player.buffs.find((buff) => buff.id === `damage_taken_round:${roundNumber}`)?.stacks ?? 0;
}

function defenseMatchBonus(
  enemies: PlayerState[],
  defense: "small" | "youtiao" | "stone"
): number {
  const enemyMaxCake = Math.max(0, ...enemies.map((enemy) => enemy.cakes));
  if (enemyMaxCake <= 1 && defense === "small") {
    return 14;
  }

  if (enemyMaxCake >= 2 && enemyMaxCake <= 4 && defense === "youtiao") {
    return 12;
  }

  if (enemyMaxCake >= 5 && defense === "stone") {
    return 12;
  }

  return 0;
}
