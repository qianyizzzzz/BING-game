import {
  AttackStats,
  ATTACK_ORDER,
  BASE_ATTACKS,
  MAX_ACTION_STACKS,
  getAffordableSkillStacks,
  canAffectAcrossSpace,
  GAME_SWITCH_ACTION_ID,
  isTotemCreation,
  TOTEM_CHOOSE_ID,
  UTOPIA_MOVE_ID,
  XIELING_TRANSFORM_ID,
  KURONG_LEAF_ID,
  SWARM_RETURN_ID,
  SHADOW_WIND_DANCE_ID,
  shadowSeatChoices,
  SWARM_INSECTS,
  swarmInsectCount,
  type SwarmAllocation,
  getXielingConversionLimit,
  GameState,
  INFINITE_DAMAGE,
  RETIRE_EFFECT_POWER,
  PlayerAction,
  PlayerId,
  PlayerState,
  SkillAction,
  SkillPlayDefinition,
  alivePlayers,
  canPlayerSeeSkill,
  getActionSwitchChoicesForAction,
  getAttackMarkKind,
  getAttackMarkChoices,
  getAttackMarkCapacity,
  getActionSwitchPlan,
  getLevelSwapModifiers,
  getDestructionModifiers,
  hasEnhancedLevelSwap,
  previewPlayerAttackStats,
  applyAttackStatModifierChoice,
  getActiveSkillCount,
  getLightningSpellTargetPlan,
  getSkill,
  getSkillAttackStats,
  getHunyaoPursuitTargets,
  isHunyaoPursuit,
  getSkillPlay,
  isHurricane,
  getSkillUseLimit,
  getOwnedSkillIds,
  getAcquisitionSkillChoices,
  getFusionRecipe,
  getDamageRedirectLimit,
  getFusionSkillId,
  getActionAttackTargetIds,
  getFusionEnhancementCount,
  getFreeSkillChargeId,
  getAttackActionCost,
  getTurnSkillActionCost,
  youkaiCakeCount,
  getSmallSkillIds,
  getStackedAttackStats,
  isActionSwitchSkillId,
  playerHasActiveSkill,
  skillHasTypeTag,
  thornPierceChoices,
  validateAction,
  validateActionWindowSkill
} from "@bing/shared";
import { getPolicyBonus } from "./aiPolicy";

const WINDOW_SKILL_SCORE_FLOOR = 22;
const HELL_OVERLORD_SKILL_ID = "1111";
const LUANWU_SKILL_ID = "1053";
const SHENZU_CRYSTAL_SKILL_ID = "1097";

export function chooseAiAction(state: GameState, playerId: PlayerId): PlayerAction {
  const self = state.players.find((player) => player.id === playerId);
  const enemies = alivePlayers(state).filter((player) => player.id !== playerId && canAffectAcrossSpace(state, playerId, player.id));
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

  const normalCakeBalance = self.cakes + youkaiCakeCount(self);
  if (normalCakeBalance > 0 && enemies[0]) {
    actions.push({
      type: "defense",
      defense: "rebound",
      targetId: chooseWeakestEnemy(enemies).id
    });
  }

  if (!(state.config.firstTurnNoAttack && state.roundTurnNumber === 1)) {
    for (const skillId of getOwnedSkillIds(self)) {
      const play = getSkillPlay(skillId);
      if (!play) {
        continue;
      }

      actions.push(...buildAiSkillActions(state, self, enemies, skillId, play));
    }

    for (const attackId of ATTACK_ORDER) {
      const definition = BASE_ATTACKS[attackId];
      const cost = getAttackActionCost(state, self, { type: "attack", attackId, stacks: 1 });
      const maxStacks = cost > 0 ? Math.min(MAX_ACTION_STACKS, Math.floor(normalCakeBalance / cost)) : MAX_ACTION_STACKS;
      for (const stacks of sampleAiStacks(maxStacks)) {
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

  return uniqueActions(actions.map((action) => payAiCakeWithYoukai(state, self, action))).filter((action) =>
    validateAction(state, self.id, action).ok
  );
}

export function chooseAiActionWindowSkill(
  state: GameState,
  playerId: PlayerId
): SkillAction | undefined {
  const self = state.players.find((player) => player.id === playerId);
  const enemies = alivePlayers(state).filter((player) => player.id !== playerId && canAffectAcrossSpace(state, playerId, player.id));
  if (!self || self.status !== "alive" || state.phase !== "action_window") {
    return undefined;
  }

  if (state.activeTimingPhase === "turn_damage_modify") {
    const option = thornPierceChoices(state, playerId)[0];
    if (option) {
      const response = { type: "skill", skillId: option.skillId, stacks: 1, attackResponseId: option.id } as const;
      if (validateActionWindowSkill({ ...state, actionWindowMode: "active" }, playerId, response).ok) return response;
    }
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
  const actions = getOwnedSkillIds(self).flatMap((skillId) => {
    const play = getSkillPlay(skillId);
    if (!play || play.kind === "attack") {
      return [];
    }

    return buildAiSkillActions(state, self, enemies, skillId, play);
  });

  return uniqueActions(actions.map((action) => payAiCakeWithYoukai(state, self, action))).filter((action) =>
    validateActionWindowSkill(validationState, self.id, action).ok
  );
}

function payAiCakeWithYoukai<T extends PlayerAction>(state: GameState, self: PlayerState, action: T): T {
  const available = youkaiCakeCount(self);
  if (!available || action.type !== "attack" && action.type !== "skill") return action;
  const cost = action.type === "attack" ? getAttackActionCost(state, self, action) :
    getActionSwitchPlan(state, self.id, action)?.cost ?? getTurnSkillActionCost(self, action, state);
  const youkaiCakeSpent = Math.min(available, Math.max(0, cost - self.cakes));
  return youkaiCakeSpent ? { ...action, youkaiCakeSpent } : action;
}

function buildAiSkillActions(
  state: GameState,
  self: PlayerState,
  enemies: PlayerState[],
  skillId: string,
  play: SkillPlayDefinition
): SkillAction[] {
  if (skillId === SHADOW_WIND_DANCE_ID) {
    return (["insert", "behind"] as const).flatMap((shadowMoveMode) =>
      shadowSeatChoices(state, self, shadowMoveMode).map(({ player }) =>
        ({ type: "skill", skillId, stacks: 1, targetId: player.id, shadowMoveMode })));
  }
  if (isTotemCreation(skillId)) {
    const target = enemies.length ? chooseWeakestEnemy(enemies) : self;
    return [{ type: "skill", skillId, stacks: 1, targetId: target.id, totemRange: "center",
      ...(skillId === TOTEM_CHOOSE_ID ? { totemKind: "flame" } : {}) }];
  }
  if (skillId === GAME_SWITCH_ACTION_ID) {
    return [
      { type: "skill", skillId, stacks: 1, gameSwitchMode: "rock_paper_scissors" },
      { type: "skill", skillId, stacks: 1, gameSwitchMode: "basic_bing" }
    ];
  }
  if (skillId === KURONG_LEAF_ID) {
    const picks = (state.leafCardsByViewer?.[self.id] ?? []).slice(0, 3).map(({ cardInstanceId, abilityIds }) =>
      ({ cardInstanceId, abilityId: abilityIds.find((id) => Boolean(getSkill(id))) ?? abilityIds[0]! }));
    return picks.length ? [{ type: "skill", skillId, stacks: 1, leafAbilityChoices: picks }] : [];
  }
  if (skillId === XIELING_TRANSFORM_ID) {
    const amount = Math.min(28, getXielingConversionLimit(self));
    return amount ? [{ type: "skill", skillId, stacks: 1, xielingMarkCost: amount }] : [];
  }
  if (isHurricane(skillId)) return enemies.map((target) => ({ type: "skill", skillId, stacks: 1, targetIds: [target.id] }));
  if (
    play.usesPerGame &&
    getSkillUseCount(self, skillId) >= (getSkillUseLimit(self, skillId) ?? play.usesPerGame * getActiveSkillCount(self, skillId))
  ) {
    return [];
  }

  if (isActionSwitchSkillId(skillId)) {
    return buildAiActionSwitchSkills(state, self, skillId);
  }

  if (skillId === "1044" || skillId === "1090") {
    return buildAiAttackStatModifierSkills(state, self, skillId);
  }

  if (play.effect === "sand_transform") {
    return buildAiSandTransformSkills(state, self, skillId);
  }

  if (skillId === "1067") {
    return buildAiLishangSkills(state, self);
  }

  if (skillId === HELL_OVERLORD_SKILL_ID) {
    return buildAiHellOverlordSkills(state, self);
  }
  if (isHunyaoPursuit(skillId)) {
    return getHunyaoPursuitTargets(state, skillId).map((target) => ({ type: "skill", skillId, stacks: 1, targetId: target.id }));
  }

  if (skillId === "1093") {
    return buildAiDamageRedirectSkills(state, self, enemies);
  }

  if (skillId === "1034") {
    return buildAiLightningSpellSkills(state, self);
  }

  if (skillId === "1035" || skillId === UTOPIA_MOVE_ID) {
    return buildAiElectricShockSkills(enemies, skillId);
  }
  if (skillId === getFusionSkillId("魔域")) return enemies[0] ? [{ type: "skill", skillId, stacks: 1,
    targetIds: [enemies[0].id, enemies[0].id, enemies[0].id] }] : [];
  if (skillId === "1073") return state.players.flatMap((player) =>
    (state.pendingActions[player.id]?.actions ?? []).flatMap((action, index): SkillAction[] => isAttackLikeAction(action) ? [
      { type: "skill", skillId, stacks: 1, targetId: player.id, switchActionIndex: index },
      { type: "skill", skillId, stacks: 1, targetId: player.id, switchActionIndex: index, absoluteGuardToSky: true }
    ] : []));
  if (skillId === "1030") return (state.pendingActions[self.id]?.actions ?? []).flatMap((action, index): SkillAction[] =>
    isAttackLikeAction(action) ? ["ignore_defense", "ignore_all_defense", "pierce_rebound"].map((mode) => ({ type: "skill", skillId, stacks: 1,
      switchActionIndex: index, doubleEdgeMode: mode as NonNullable<SkillAction["doubleEdgeMode"]> })) : []);

  if (needsExposedSkillTarget(skillId)) {
    return enumerateExposedSkillTargetActions(state, self, enemies, skillId);
  }

  const charge = getFreeSkillChargeId(self, skillId);
  const availableFree = self.buffs.find((buff) => buff.id === charge)?.stacks ?? 0;
  const maxStacks = getAffordableSkillStacks(state, self, skillId, availableFree);
  if (maxStacks <= 0) {
    return [];
  }
  if (skillId === SWARM_RETURN_ID) {
    let remaining = 10;
    const allocation: SwarmAllocation = {};
    const stock = SWARM_INSECTS.map((insect) => ({ insect, count: swarmInsectCount(self, insect) }))
      .sort((a, b) => b.count - a.count);
    for (const { insect, count } of stock) {
      const take = Math.min(remaining, count);
      if (take) allocation[insect] = take;
      remaining -= take;
    }
    return remaining ? [] : [{ type: "skill", skillId, stacks: 1, swarmAllocation: allocation }];
  }

  if (getAttackMarkKind(skillId)) return getAttackMarkChoices(state, self.id).flatMap(({ actionIndex }) =>
    sampleAiStacks(Math.min(maxStacks, getAttackMarkCapacity(self, skillId, actionIndex))).map((stacks): SkillAction =>
      ({ type: "skill", skillId, stacks, switchActionIndex: actionIndex })));

  const actions: SkillAction[] = [];
  for (const stacks of sampleAiStacks(maxStacks)) {
    if (
      play.targetMode === "none" ||
      play.targetMode === "all" ||
      (play.kind === "attack" && hasForcedAreaAttacks(state, self))
    ) {
      actions.push({ type: "skill", skillId, stacks, ...(charge ? { freeStacks: Math.min(stacks, availableFree) } : {}) });
      continue;
    }

    for (const enemy of enemies) {
      actions.push({
        type: "skill",
        skillId,
        stacks,
        ...(charge ? { freeStacks: Math.min(stacks, availableFree) } : {}),
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
    getActionSwitchChoicesForAction(skillId, current, self)
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

    if (skillId === "1090") {
      return getLevelSwapModifiers(self, current).map((attackStatModifier) => ({
          type: "skill" as const,
          skillId,
          stacks: 1,
          switchActionIndex: actionIndex,
          attackStatModifier
        }));
    }

    return getDestructionModifiers(self).map((attackStatModifier) => ({
      type: "skill" as const,
      skillId,
      stacks: 1,
      switchActionIndex: actionIndex,
      attackStatModifier
    }));
  });
}

function buildAiSandTransformSkills(state: GameState, self: PlayerState, skillId = "1003"): SkillAction[] {
  const occupied = new Set(
    alivePlayers(state)
      .flatMap((player) => getOwnedSkillIds(player))
  );
  const targetSkillId = getAcquisitionSkillChoices(self, skillId).find((id) => skillId === getFusionSkillId("猥琐小叔叔") || !occupied.has(id));
  if (!targetSkillId) {
    return [];
  }

  return [
    {
      type: "skill",
      skillId,
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
      skillId: "1067",
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
      item.amount > 0 && item.amount <= getDamageRedirectLimit(self) &&
      !(item.redirectedByPlayerIds ?? []).includes(self.id)
  );
  const target = enemies.length > 0 ? chooseWeakestEnemy(enemies) : undefined;
  if (!damage || !target) {
    return [];
  }

  return [
    {
      type: "skill",
      skillId: "1093",
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
      skillId: "1034",
      stacks: 1,
      targetId: primaryTargetId,
      targetIds
    }
  ];
}

function buildAiElectricShockSkills(enemies: PlayerState[], skillId: string): SkillAction[] {
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
      skillId,
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
    getOwnedSkillIds(enemy)
      .filter((targetSkillId) => {
        const skill = getSkill(targetSkillId);
        return (
          Boolean(skill) &&
          (skillId !== "1100" || !getFusionRecipe(targetSkillId)) &&
          (skillId !== getFusionSkillId("天魔舞") || Boolean(getFusionRecipe(targetSkillId)) && targetSkillId !== skillId) &&
          (skillId !== "1004" || skillHasTypeTag(skill, "锁定技")) &&
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
    skillId === "1004" ||
      (skill?.description.includes("\u66b4\u9732") &&
        skill.description.includes("\u6280\u80fd"))
  );
}

function sampleAiStacks(max: number): number[] {
  if (max <= 8) return Array.from({ length: max }, (_, index) => index + 1);
  return [...new Set([1, 2, 3, Math.ceil(max / 4), Math.ceil(max / 2), Math.ceil(max * 3 / 4), max])];
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
  if (isTotemCreation(action.skillId)) return action.skillId === TOTEM_CHOOSE_ID ? 85 : 32;
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

  if (getAttackMarkKind(action.skillId)) {
    score += hasPendingOffense(state, self.id) ? 34 + action.stacks * 8 : -18;
  }

  if (play.effect === "abs_plus") {
    score += self.hp < 0 ? 90 : self.hp <= 2 ? 54 : 18;
  }

  if (action.skillId === "1004" && target) {
    score += 48 + Math.max(0, target.skills.length - target.revealedSkillIds.length) * 4;
  }

  if (action.targetSkillId && action.skillId !== "1004") {
    score += 18;
  }

  if (action.skillId === "1013") {
    score += enemies.filter(playerHasFireSkill).length * 28;
  }

  if (action.skillId === "1071" && target) {
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
      (enemy) => !(skillHasTypeTag(skill, "限定技") && enemy.skills.includes("1006"))
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
  if (action.skillId === KURONG_LEAF_ID) return 80;
  if (action.skillId === "1089" && getFusionEnhancementCount(self, action.skillId, ["杀级换"]) > 0) {
    const plan = getActionSwitchPlan(state, self.id, action);
    if (!plan) return -80;
    const before = previewPlayerAttackStats(state, self.id);
    const changed = structuredClone(state);
    changed.pendingActions[self.id]!.actions[plan.actionIndex] = plan.after;
    const after = previewPlayerAttackStats(changed, self.id);
    const original = before.stats[plan.actionIndex];
    const switched = after.stats[plan.actionIndex];
    if (!original || !switched) return -80;
    const price = after.costs.reduce((sum, cost) => sum + cost, 0) - before.costs.reduce((sum, cost) => sum + cost, 0);
    const gain = (attackStatValue(switched) - attackStatValue(original)) * 4 - price * 8;
    return gain > 0 ? 24 + gain : -60;
  }
  if (action.skillId === getFusionSkillId("贤者的庇护")) return 95;
  if (action.skillId === getFusionSkillId("辉月")) {
    const incoming = Object.entries(state.pendingActions).flatMap(([id, plan]) => id === self.id ? [] :
      (plan?.actions ?? []).filter((candidate) => getActionAttackTargetIds(state, id, candidate).includes(self.id)));
    const damage = incoming.reduce((sum, candidate) => {
      const stats = estimatePendingAttackStats(candidate);
      return sum + (stats && stats.power < RETIRE_EFFECT_POWER ? stats.power : 0);
    }, 0);
    return damage > 0 ? 28 + Math.min(40, damage * 4) : -40;
  }
  if (action.skillId === "1004" || action.skillId === "1071") {
    return 0;
  }

  const useCount = getSkillUseCount(self, action.skillId);
  if (
    useCount > 0 &&
    action.skillId !== "1014" &&
    action.skillId !== "1046"
  ) {
    return -30;
  }

  if (action.skillId === "1023") {
    return self.hp === 0 && self.cakes >= 3 ? 90 : -80;
  }

  if (action.skillId === "1046") {
    const damageTaken = getRoundDamageTaken(self, state.roundNumber - 1);
    return damageTaken > 0 ? Math.min(4, damageTaken) * 24 : -40;
  }

  if (action.skillId === "1014") {
    const targetParity = useCount % 2 === 0 ? 1 : 0;
    const targets = enemies.filter((enemy) => Math.abs(enemy.hp) % 2 === targetParity);
    const lethalCount = targets.filter((enemy) => enemy.hp <= 1).length;
    return targets.length * 14 + lethalCount * 42;
  }

  if (action.skillId === "1034") {
    const targetIds = action.targetIds ?? (action.targetId ? [action.targetId] : []);
    const targets = enemies.filter((enemy) => targetIds.includes(enemy.id));
    const lethalCount = targets.filter((enemy) => enemy.hp <= 2).length;
    return targets.length * 26 + lethalCount * 42;
  }

  if (action.skillId === "1106") {
    const targets = enemies.filter((enemy) => enemy.hp <= 3);
    return targets.length > 0 ? targets.length * 70 : -50;
  }

  if (action.skillId === HELL_OVERLORD_SKILL_ID) {
    return state.activeTimingPhase === "revival_action" ? 95 : 34;
  }

  if (action.skillId === "1093") {
    const damage = (state.pendingDamageItems ?? []).find((item) => item.id === action.targetDamageId);
    return damage ? damage.amount * 34 : -80;
  }

  if (action.skillId === "1044" || action.skillId === "1090") {
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
  if (action.skillId === "1090" && hasEnhancedLevelSwap(self)) {
    const index = normalizeActionIndex(action.switchActionIndex);
    const current = previewPlayerAttackStats(state, self.id);
    const candidate = previewPlayerAttackStats(state, self.id, { id: "candidate", actionIndex: index,
      modifier: action.attackStatModifier ?? "swap_power_level", enhanced: true });
    const before = current.stats[index];
    const after = candidate.stats[index];
    if (!before || !after || candidate.failures.some((item) => item.id === "candidate")) return -80;
    const price = candidate.costs.reduce((sum, cost) => sum + cost, 0) - current.costs.reduce((sum, cost) => sum + cost, 0);
    const gain = (attackStatValue(after) - attackStatValue(before)) * 4 - price * 8;
    return gain > 0 ? 24 + gain : -60;
  }
  const plan = state.pendingActions[self.id];
  const current = plan?.actions[normalizeActionIndex(action.switchActionIndex)];
  const before = current ? estimatePendingAttackStats(current) : undefined;
  const modifier =
    action.skillId === "1090"
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

function attackStatValue(stats: Pick<AttackStats, "power" | "level">): number {
  return boundedStatValue(stats.power) * 8 + boundedStatValue(stats.level) * 3;
}

function boundedStatValue(value: number): number {
  return value >= INFINITE_DAMAGE ? 16 : value;
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
