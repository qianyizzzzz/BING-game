import {
  ActionSubmission,
  AttackAction,
  AttackStatModifierChoice,
  DamageEvent,
  GameState,
  AttackStats,
  INFINITE_DAMAGE,
  PlayerAction,
  PlayerActionPlan,
  PlayerId,
  SkillId,
  SkillAction,
  SkillTimingPhase,
  ValidationResult
} from "../types";
import { BASE_ATTACKS, canActionDefend, getStackedAttackStats } from "./attacks";
import { validateActionSwitch } from "./actionSwitch";
import { resolveLightningSpellTargetIds } from "./skillTargets";
import {
  alivePlayers,
  canPlayerSeeSkill,
  cloneGameState,
  findPlayer,
  getActiveSkillCount,
  getPuppetMasterId,
  isPlayerInCollapse,
  isPlayerSkillSealed,
  isSkillBlockedByJingu,
  playerHasActiveSkill
} from "./gameFactory";
import {
  applyAttackModifiers,
  getSkill,
  getSkillActionCost,
  getSkillAttackStats,
  getSkillPlay,
  getSmallSkillIds,
  skillHasTypeTag
} from "../skills/registry";

const PENDING_DEATH_BUFF_ID = "pending_death";
const NO_REVIVE_BUFF_ID = "no_revive";
const DOUBLE_EDGE_SWORD_SKILL_ID = "skill_31_80497";
const DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX = "double_edge_ignore_defense:";
const HELL_OVERLORD_SKILL_ID = "skill_112_59292";
const LIEGONG_SKILL_ID = "skill_60_57192";
const LIEGONG_CROSS_BUFF_PREFIX = "liegong_cross:";
const ABSOLUTE_GUARD_SKILL_ID = "skill_74_34920";
const ABSOLUTE_GUARD_BUFF_PREFIX = "absolute_guard:";
const LUANWU_SKILL_ID = "skill_54_99719";
const PUTIAN_TONGQING_SKILL_ID = "skill_98_7182";
const ICE_RAIN_SKILL_ID = "skill_20_63089";
const CROSS_GUARD_SKILL_ID = "skill_73_76567";
const XIEYU_SKILL_ID = "skill_72_53933";
const SHUNSHOU_STEAL_SKILL_ID = "skill_100_45717";
const SCATTER_REBOUND_SKILL_ID = "skill_58_88471";
const LIAN_BAO_SKILL_ID = "skill_87_44771";
const DESTROY_POWER_COOLDOWN_BUFF_ID = "destroy_power_cooldown";
const FLASH_DODGE_SKILL_ID = "skill_103_56259";
const FLASH_DODGE_COOLDOWN_BUFF_ID = "flash_dodge_cooldown";
const SIX_STAR_SKILL_ID = "skill_108_76133";
const DESTROY_POWER_MODIFIER_CHOICES = new Set<AttackStatModifierChoice>([
  "power_plus_1_level_minus_1",
  "power_minus_1_level_plus_1",
  "power_plus_2_level_minus_2",
  "power_minus_2_level_plus_2",
  "power_times_3_level_to_zero",
  "power_to_zero_level_times_4"
]);
const ACTIVE_REVIVAL_SKILL_IDS = new Set([
  "skill_64_60978",
  "skill_66_82448",
  "skill_68_57581",
  HELL_OVERLORD_SKILL_ID
]);
const MULTI_TARGET_ATTACK_SKILL_IDS = new Set<SkillId>([
  "skill_36_14343",
  "skill_79_36319",
  "skill_118_53580",
  "skill_119_78843"
]);
const VORTEX_SKILL_IDS = new Set<SkillId>(["skill_118_53580", "skill_119_78843"]);

export function validateAction(
  state: GameState,
  playerId: PlayerId,
  submission: ActionSubmission
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (player.status !== "alive") {
    return invalid("死亡玩家不能出招");
  }

  if (state.phase !== "collecting_actions") {
    return invalid("当前不能提交出招");
  }

  if (state.pendingActions[playerId]) {
    return invalid("你本回合已经提交出招");
  }

  const plan = normalizeActionPlan(submission);
  return validateActionPlan(state, playerId, plan);
}

export function normalizeActionPlan(submission: ActionSubmission): PlayerActionPlan {
  if ("actions" in submission) {
    return {
      actions: submission.actions
    };
  }

  return {
    actions: [submission]
  };
}

function validateActionPlan(
  state: GameState,
  playerId: PlayerId,
  plan: PlayerActionPlan
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (plan.actions.length === 0) {
    return invalid("至少需要选择一个出招");
  }

  if (plan.actions.length > Math.max(1, alivePlayers(state).length)) {
    return invalid("出招数量超过可选目标数量");
  }

  if (plan.actions.length > 1) {
    if (
      plan.actions.filter(
        (action) => action.type === "skill" && action.skillId === "skill_79_36319"
      ).length > 1
    ) {
      return invalid("火箭一回合只能作为一次技能出招提交");
    }

    if (
      plan.actions.some(
        (action) => action.type !== "attack" && action.type !== "skill"
      )
    ) {
      return invalid("多招式模式下只能同时选择多个攻击或单体目标技能");
    }

    const targetIds = new Set<string>();
    for (const action of plan.actions) {
      if (action.type !== "attack" && action.type !== "skill") {
        continue;
      }

      const skillPlay = action.type === "skill" ? getSkillPlay(action.skillId) : undefined;
      if (action.type === "skill" && skillPlay?.targetMode !== "single") {
        return invalid("多目标出招里只能混合单体目标技能，全体、资源或自身技能需要单独使用");
      }

      const isArea = isActionEffectivelyArea(state, playerId, action);
      if (isArea) {
        return invalid("群攻招式必须单独使用");
      }

      const actionTargetIds = getActionTargetIds(action);
      if (actionTargetIds.length === 0) {
        return invalid("多招式攻击必须指定目标");
      }

      for (const targetId of actionTargetIds) {
        if (targetIds.has(targetId)) {
          return invalid("一回合里不能对同一个人做多个招式");
        }

        targetIds.add(targetId);
      }
    }
  }

  let totalCost = 0;
  let totalLianBaoFreeStacks = 0;
  for (const action of plan.actions) {
    const validation = validateSingleAction(state, playerId, action);
    if (!validation.ok) {
      return validation;
    }

    if (action.type === "skill" && action.skillId === LIAN_BAO_SKILL_ID) {
      totalLianBaoFreeStacks += action.freeStacks ?? 0;
    }

    if (action.type === "attack") {
      totalCost += getEffectiveAttackActionCost(player, action);
      continue;
    }

    if (action.type === "skill") {
      totalCost += getEffectiveSkillActionCost(player, action);
    }
  }

  const availableLianBaoFreeStacks =
    player.buffs.find((buff) => buff.id === "free_lian_bao")?.stacks ?? 0;
  if (totalLianBaoFreeStacks > availableLianBaoFreeStacks) {
    return invalid(`免费连爆次数不足，需要 ${totalLianBaoFreeStacks} 次`);
  }

  if (totalCost > player.cakes) {
    return invalid(`饼不足，需要 ${totalCost} 个饼`);
  }

  return valid();
}

function validateSingleAction(
  state: GameState,
  playerId: PlayerId,
  action: PlayerAction
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (
    action.type === "defense" &&
    action.defense === "rebound" &&
    !action.targetId &&
    player.cakes > 0 &&
    playerHasActiveSkill(player, SCATTER_REBOUND_SKILL_ID)
  ) {
    return valid();
  }

  if (action.type === "gain_cake") {
    return valid();
  }

  if (action.type === "discard_skill") {
    return invalid("丢弃技能需要单独执行");
  }

  if (action.type === "defense") {
    if (action.defense !== "rebound") {
      return valid();
    }

    if (player.cakes <= 0) {
      return invalid("反弹必须拥有至少 1 个饼");
    }

    if (!action.targetId) {
      return invalid("反弹必须指定目标");
    }

    if (!isAliveTarget(state, action.targetId)) {
      return invalid("反弹目标不存在或已死亡");
    }

    return valid();
  }

  if (action.type === "attack") {
    return validateAttackAction(state, playerId, action);
  }

  return validateSkillAction(state, playerId, action, "turn_action");
}

export function validateActionWindowSkill(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (player.status !== "alive") {
    return invalid("死亡玩家不能行动");
  }

  if (state.phase !== "action_window" || state.actionWindowMode !== "active") {
    return invalid("当前不在可行动阶段");
  }

  if (getSkillPlay(action.skillId)?.kind === "attack") {
    return invalid("技能攻击只能在出招阶段使用");
  }

  return validateSkillAction(state, playerId, action, state.activeTimingPhase);
}

function validateAttackAction(
  state: GameState,
  playerId: PlayerId,
  action: AttackAction
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (state.config.firstTurnNoAttack && state.roundTurnNumber === 1) {
    return invalid("第一回合禁止攻击");
  }

  const definition = BASE_ATTACKS[action.attackId];
  if (!definition) {
    return invalid("未知攻击");
  }

  if (!Number.isInteger(action.stacks) || action.stacks <= 0 || action.stacks > 20) {
    return invalid("攻击重数必须是 1 到 20 的整数");
  }

  const cost = getEffectiveAttackActionCost(player, action);
  if (player.cakes < cost) {
    return invalid(`饼不足，需要 ${cost} 个饼`);
  }

  const stats = getStackedAttackStats(definition, action.stacks);
  const forcedArea = isActionForcedArea(state, playerId, action, stats);
  if (!definition.isArea && !forcedArea) {
    if (!action.targetId) {
      return invalid("单体攻击必须指定目标");
    }

    if (!isAliveTarget(state, action.targetId)) {
      return invalid("攻击目标不存在或已死亡");
    }
    if (action.targetId && isPuppetTargetingMaster(state, playerId, action.targetId)) {
      return invalid("傀儡不能攻击主人");
    }
  }

  return valid();
}

function validateSkillAction(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    return invalid("玩家不存在");
  }

  if (!player.skills.includes(action.skillId)) {
    return invalid("你没有这个技能");
  }

  const skill = getSkill(action.skillId);
  const play = getSkillPlay(action.skillId);
  if (!skill || !play) {
    return invalid("这个技能当前是锁定技或被动技，不能主动施放");
  }

  if (isPlayerInCollapse(player)) {
    return invalid("沦陷状态下不能使用技能");
  }

  const pendingDeathWindow = isPendingDeathWindow(state);
  const pendingDeathPlayer = isPendingDeathPlayer(player);
  const revivalSkill = ACTIVE_REVIVAL_SKILL_IDS.has(action.skillId);
  if (pendingDeathWindow && !pendingDeathPlayer) {
    return invalid("当前是复活窗口，只有已死亡玩家可以行动");
  }

  if (pendingDeathWindow && !revivalSkill) {
    return invalid("已死亡时只能使用复活系技能");
  }

  if (revivalSkill && pendingDeathPlayer && hasNoRevive(player)) {
    return invalid("因为致死者持有裂魂，所以你无法复活");
  }

  if (
    (action.skillId === "skill_64_60978" || action.skillId === "skill_68_57581") &&
    (!pendingDeathWindow || !pendingDeathPlayer)
  ) {
    return invalid(`${skill.name} 只能在复活阶段使用`);
  }

  if (action.skillId === "skill_24_71363" && player.hp !== 0) {
    return invalid("神隐青莲只能在你的血量为 0 时使用");
  }

  if (isPlayerSkillSealed(player, action.skillId)) {
    return invalid("这个技能已被封锁，不能使用");
  }

  if (isSkillBlockedByJingu(state, action.skillId)) {
    return invalid(`${skill.name} 已被禁锢封锁，不能使用`);
  }

  if (!skill.timingPhases.includes(timingPhase)) {
    return invalid(`${skill.name} 不能在当前阶段使用`);
  }

  if (
    timingPhase === "turn_damage_modify" &&
    action.skillId !== "skill_94_627" &&
    action.skillId !== SIX_STAR_SKILL_ID &&
    action.skillId !== ICE_RAIN_SKILL_ID &&
    action.skillId !== CROSS_GUARD_SKILL_ID
  ) {
    return invalid("变伤阶段只能使用斗转星移或印记技能");
  }

  if (!Number.isInteger(action.stacks) || action.stacks <= 0 || action.stacks > 20) {
    return invalid("技能重数必须是 1 到 20 的整数");
  }

  if (action.stacks > play.maxStacks) {
    return invalid(`技能重数不能超过 ${play.maxStacks}`);
  }

  const lianBaoFreeValidation = validateLianBaoFreeStacks(player, action);
  if (!lianBaoFreeValidation.ok) {
    return lianBaoFreeValidation;
  }

  const resourceValidation = validateSkillResourceCost(player, action);
  if (!resourceValidation.ok) {
    return resourceValidation;
  }

  const actionSwitchValidation = validateActionSwitch(state, playerId, action);
  if (!actionSwitchValidation.ok) {
    return actionSwitchValidation;
  }

  const attackStatModifierValidation = validateAttackStatModifier(
    state,
    playerId,
    player,
    action,
    timingPhase
  );
  if (!attackStatModifierValidation.ok) {
    return attackStatModifierValidation;
  }

  const doubleEdgeValidation = validateDoubleEdgeSwordV2(
    state,
    playerId,
    player,
    action,
    timingPhase
  );
  if (!doubleEdgeValidation.ok) {
    return doubleEdgeValidation;
  }

  const liegongValidation = validateLiegongCross(
    state,
    playerId,
    player,
    action,
    timingPhase
  );
  if (!liegongValidation.ok) {
    return liegongValidation;
  }

  const absoluteGuardValidation = validateAbsoluteGuard(
    state,
    playerId,
    player,
    action,
    timingPhase
  );
  if (!absoluteGuardValidation.ok) {
    return absoluteGuardValidation;
  }

  const sandTargetValidation = validateSandTransformTarget(action, skill);
  if (!sandTargetValidation.ok) {
    return sandTargetValidation;
  }

  const coagulationIntervalValidation = validateCoagulationIntervalUse(
    player,
    action,
    state.roundNumber,
    timingPhase
  );
  if (!coagulationIntervalValidation.ok) {
    return coagulationIntervalValidation;
  }

  const flashDodgeValidation = validateFlashDodgeUse(
    player,
    action,
    timingPhase,
    state.roundNumber
  );
  if (!flashDodgeValidation.ok) {
    return flashDodgeValidation;
  }

  const sixStarValidation = validateSixStarUse(state, playerId, action, timingPhase);
  if (!sixStarValidation.ok) {
    return sixStarValidation;
  }

  const damageRedirectValidation = validateDamageRedirectTarget(
    state,
    playerId,
    action,
    timingPhase
  );
  if (!damageRedirectValidation.ok) {
    return damageRedirectValidation;
  }

  const damageMarkValidation = validateDamageMarkUse(state, playerId, player, action, timingPhase);
  if (!damageMarkValidation.ok) {
    return damageMarkValidation;
  }

  const stealSkillValidation = validateShunshouStealChoice(state, playerId, action, timingPhase);
  if (!stealSkillValidation.ok) {
    return stealSkillValidation;
  }

  const xieyuValidation = validateXieyuTarget(state, playerId, action, timingPhase);
  if (!xieyuValidation.ok) {
    return xieyuValidation;
  }

  const activeSkillCount = getActiveSkillCount(player, action.skillId);
  if (
    play.usesPerGame &&
    getSkillUseCount(player, action.skillId) >= play.usesPerGame * activeSkillCount
  ) {
    return invalid(`${skill.name} 已经达到本局使用次数上限`);
  }

  if (
    play.kind === "attack" &&
    state.config.firstTurnNoAttack &&
    state.roundTurnNumber === 1
  ) {
    return invalid("第一回合只能出饼或防御");
  }

  const cost = getEffectiveSkillActionCost(player, action);
  if (player.cakes < cost) {
    return invalid(`饼不足，需要 ${cost} 个饼`);
  }

  const forcedAreaSkillAttack = isActionEffectivelyArea(state, playerId, action);
  if (action.skillId === HELL_OVERLORD_SKILL_ID) {
    const hellTargetValidation = validateHellOverlordTarget(
      state,
      playerId,
      action,
      pendingDeathWindow,
      pendingDeathPlayer
    );
    if (!hellTargetValidation.ok) {
      return hellTargetValidation;
    }
  } else if (action.skillId === "skill_68_57581") {
    const lishangTargetValidation = validateLishangTargets(state, playerId, action);
    if (!lishangTargetValidation.ok) {
      return lishangTargetValidation;
    }
  } else if (action.skillId === "skill_111_51056") {
    const balanceTargetValidation = validateBalanceTargets(state, playerId, action);
    if (!balanceTargetValidation.ok) {
      return balanceTargetValidation;
    }
  } else if (action.skillId === "skill_35_16792") {
    const lightningTargetValidation = validateLightningSpellTargets(state, playerId, action);
    if (!lightningTargetValidation.ok) {
      return lightningTargetValidation;
    }
  } else if (action.skillId === "skill_79_36319" && !forcedAreaSkillAttack) {
    const rocketTargetValidation = validateRocketTargets(state, playerId, action);
    if (!rocketTargetValidation.ok) {
      return rocketTargetValidation;
    }
  } else if (action.skillId === "skill_36_14343") {
    const electricShockTargetValidation = validateElectricShockTargets(state, action);
    if (!electricShockTargetValidation.ok) {
      return electricShockTargetValidation;
    }
  } else if (VORTEX_SKILL_IDS.has(action.skillId) && !forcedAreaSkillAttack) {
    const vortexTargetValidation = validateVortexTargets(state, action);
    if (!vortexTargetValidation.ok) {
      return vortexTargetValidation;
    }
  } else if (play.targetMode === "single" && !forcedAreaSkillAttack) {
    if (!action.targetId) {
      return invalid("技能必须指定目标");
    }

    if (!isAliveTarget(state, action.targetId)) {
      return invalid("技能目标不存在或已死亡");
    }
  }

  const exposedTargetValidation = validateExposedSkillTarget(
    state,
    playerId,
    action,
    skill
  );
  if (!exposedTargetValidation.ok) {
    return exposedTargetValidation;
  }

  return valid();
}

function validateExposedSkillTarget(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  skill: NonNullable<ReturnType<typeof getSkill>>
): ValidationResult {
  if (skill.id === "skill_4_65637" || skill.id === "skill_68_57581") {
    return valid();
  }

  const needsExposedSkillTarget =
    skill.id === "skill_5_34881" ||
    (skill.description.includes("暴露") && skill.description.includes("技能"));

  if (!needsExposedSkillTarget) {
    return valid();
  }

  if (!action.targetId || !action.targetSkillId) {
    return invalid(`${skill.name} 必须选择一个已暴露技能作为目标`);
  }

  const target = findPlayer(state, action.targetId);
  if (!target || target.status !== "alive") {
    return invalid("技能目标不存在或已死亡");
  }

  if (!target.skills.includes(action.targetSkillId)) {
    return invalid("目标玩家没有这个技能");
  }

  if (!canPlayerSeeSkill(state, playerId, action.targetId, action.targetSkillId)) {
    return invalid("你当前视野里看不到这个技能");
  }

  if (skill.id === "skill_5_34881") {
    const targetSkill = getSkill(action.targetSkillId);
    if (!skillHasTypeTag(targetSkill, "锁定技")) {
      return invalid("封印只能选择已暴露的锁定技");
    }
  }

  return valid();
}

function validateSandTransformTarget(
  action: SkillAction,
  skill: NonNullable<ReturnType<typeof getSkill>>
): ValidationResult {
  if (skill.id !== "skill_4_65637") {
    return valid();
  }

  if (!action.targetSkillId) {
    return invalid("沙子必须选择一个小技能作为变化目标");
  }

  if (!getSmallSkillIds().includes(action.targetSkillId)) {
    return invalid("沙子只能变化为小技能池中的技能");
  }

  if (!getSkill(action.targetSkillId)) {
    return invalid("沙子的变化目标不存在");
  }

  return valid();
}

function validateCoagulationIntervalUse(
  player: { skills: SkillId[]; buffs: Array<{ id: string; stacks?: number }> },
  action: SkillAction,
  roundNumber: number,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== "skill_47_94841") {
    return valid();
  }

  const used =
    player.buffs.find((buff) => buff.id === coagulationIntervalBuffId(roundNumber, timingPhase))
      ?.stacks ?? 0;
  if (used > 0) {
    return invalid("凝血之力不能在同一个轮间重复使用");
  }

  return valid();
}

function validateFlashDodgeUse(
  player: { skills: SkillId[]; buffs: Array<{ id: string; expiresAtRound?: number }> },
  action: SkillAction,
  timingPhase: SkillTimingPhase,
  roundNumber: number
): ValidationResult {
  if (action.skillId !== FLASH_DODGE_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("闂幇鍙兘鍦ㄥ彉鎷涢樁娈典娇鐢?");
  }

  if (countActiveCooldowns(player, FLASH_DODGE_COOLDOWN_BUFF_ID, roundNumber) >= getActiveSkillCount(player, FLASH_DODGE_SKILL_ID)) {
    return invalid("闂幇3杞檺1娆?");
  }

  return valid();
}

function validateSixStarUse(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== SIX_STAR_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_damage_modify") {
    return invalid("鍏姃鏄熷彧鑳藉湪鍙樹激闃舵浣跨敤");
  }

  if (!getHighestPendingDamageItem(state, playerId)) {
    return invalid("鍏姃鏄熼渶瑕佷綘褰撳墠鏈夊嵆灏嗘壙鍙楃殑浼ゅ");
  }

  return valid();
}

function validateDamageRedirectTarget(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== "skill_94_627") {
    return valid();
  }

  if (timingPhase !== "turn_damage_modify") {
    return invalid("斗转星移只能在变伤阶段使用");
  }

  if (!action.targetId) {
    return invalid("斗转星移必须选择转移目标");
  }

  if (!isAliveTarget(state, action.targetId)) {
    return invalid("斗转星移目标不存在或已死亡");
  }

  if (!action.targetDamageId) {
    return invalid("斗转星移必须选择一条即将承受的伤害");
  }

  const damage = state.pendingDamageItems?.find(
    (item) =>
      item.id === action.targetDamageId &&
      item.targetId === playerId &&
      item.amount <= 3 &&
      !(item.redirectedByPlayerIds ?? []).includes(playerId)
  );
  if (!damage) {
    return invalid("这条伤害不能被斗转星移转移");
  }

  return valid();
}

function validateDamageMarkUse(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== ICE_RAIN_SKILL_ID && action.skillId !== CROSS_GUARD_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_damage_modify") {
    return invalid("印记只能在变伤阶段使用");
  }

  if (!action.targetDamageId) {
    return invalid("必须选择一条即将承受的伤害");
  }

  const damage = state.pendingDamageItems?.find((item) => item.id === action.targetDamageId);
  if (!damage || damage.amount <= 0) {
    return invalid("这条伤害不存在或不能被印记影响");
  }

  if (action.skillId === ICE_RAIN_SKILL_ID) {
    if (
      damage.targetId !== playerId ||
      !damage.sourceId ||
      hasDamageModifier(damage, "ice_rain") ||
      !findPlayer(state, damage.sourceId)?.buffs.some(
        (buff) => buff.id === `ice_rain:${playerId}` && buff.stacks > 0
      )
    ) {
      return invalid("这条伤害不能使用冰雨印记");
    }
    return valid();
  }

  if (damage.targetId === playerId) {
    if (
      hasDamageModifier(damage, "huyou") ||
      !player.buffs.some((buff) => buff.id === "huyou_mark" && buff.stacks > 0)
    ) {
      return invalid("这条伤害不能使用护佑印记");
    }
    return valid();
  }

  if (
    hasDamageModifier(damage, "cross") ||
    !player.buffs.some((buff) => buff.id === "cross_mark" && buff.stacks > 0) ||
    !areAdjacentAlivePlayers(state, playerId, damage.targetId)
  ) {
    return invalid("这条伤害不能使用十字印记");
  }

  return valid();
}

function validateShunshouStealChoice(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== SHUNSHOU_STEAL_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "round_pre_interval_action" || state.roundNumber !== 1) {
    return invalid("顺手牵羊只能在开局阶段选择技能");
  }

  if (!action.targetSkillId) {
    return invalid("顺手牵羊必须选择要获得的技能");
  }

  const choices = (state.pendingSkillChoices ?? []).filter(
    (choice) => choice.kind === "steal_skill" && choice.playerId === playerId
  );
  if (!choices.some((choice) => choice.skillId === action.targetSkillId)) {
    return invalid("顺手牵羊只能选择开局获知的技能");
  }

  return valid();
}

function validateXieyuTarget(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== XIEYU_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_end_action" || state.roundNumber % 3 !== 0) {
    return invalid("邪域只能在第 3x 轮轮末选择目标");
  }

  if (!action.targetId) {
    return invalid("邪域必须选择吸取目标");
  }

  if (action.targetId === playerId) {
    return invalid("邪域不能吸取自己");
  }

  if (!isAliveTarget(state, action.targetId)) {
    return invalid("邪域目标不存在或已死亡");
  }

  const player = state.players.find((item) => item.id === playerId);
  const selectedCount = player?.buffs.filter((buff) => buff.id === "xieyu_target").length ?? 0;
  if (!player || selectedCount >= getActiveSkillCount(player, XIEYU_SKILL_ID)) {
    return invalid("本轮邪域目标已经选择完毕");
  }

  return valid();
}

function hasDamageModifier(
  damage: NonNullable<GameState["pendingDamageItems"]>[number],
  modifierId: string
): boolean {
  return Boolean(damage.damageModifierIds?.includes(modifierId));
}

function areAdjacentAlivePlayers(state: GameState, playerId: PlayerId, otherPlayerId: PlayerId): boolean {
  const alive = alivePlayers(state);
  const index = alive.findIndex((player) => player.id === playerId);
  const otherIndex = alive.findIndex((player) => player.id === otherPlayerId);
  if (index === -1 || otherIndex === -1 || alive.length <= 1) {
    return false;
  }

  return (
    otherIndex === (index + 1) % alive.length ||
    otherIndex === (index - 1 + alive.length) % alive.length
  );
}

function getHighestPendingDamageItem(
  state: GameState,
  playerId: PlayerId
): NonNullable<GameState["pendingDamageItems"]>[number] | undefined {
  return (state.pendingDamageItems ?? [])
    .filter((item) => item.targetId === playerId && item.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0];
}

function validateAttackStatModifier(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== "skill_45_30424" && action.skillId !== "skill_91_89631") {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("这个技能只能在变招阶段使用");
  }

  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const pendingAction = state.pendingActions[playerId]?.actions[actionIndex];
  if (!pendingAction || !isAttackLikeAction(pendingAction)) {
    return invalid("请选择一个当前已经亮出的攻击");
  }

  if (action.skillId === "skill_91_89631") {
    if (action.attackStatModifier && action.attackStatModifier !== "swap_power_level") {
      return invalid("级换只能交换攻击和等级");
    }
    return valid();
  }

  if (
    countActiveCooldowns(player, DESTROY_POWER_COOLDOWN_BUFF_ID, state.roundNumber) >=
    getActiveSkillCount(player, "skill_45_30424")
  ) {
    return invalid("毁灭之力每2轮限用1次");
  }

  if (
    !action.attackStatModifier ||
    !DESTROY_POWER_MODIFIER_CHOICES.has(action.attackStatModifier)
  ) {
    return invalid("毁灭之力必须选择一种攻击/等级变化");
  }

  return valid();
}

function validateDoubleEdgeSword(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== DOUBLE_EDGE_SWORD_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("双刃剑只能在变招阶段使用");
  }

  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const pendingAction = state.pendingActions[playerId]?.actions[actionIndex];
  if (!pendingAction || !isAttackLikeAction(pendingAction)) {
    return invalid("双刃剑必须选择你当前已亮出的攻击");
  }

  const targetId = getPrimaryActionTargetId(pendingAction);
  if (!targetId) {
    return invalid("双刃剑只能用于指向单个目标的攻击");
  }

  const targetAction = getDefensiveAction(state.pendingActions[targetId]);
  if (targetAction?.type !== "defense" || targetAction.defense === "rebound") {
    return invalid("双刃剑只能无视非反弹的防御出招");
  }

  const stats = getDoubleEdgeAttackStats(state, playerId, pendingAction);
  if (!stats || !canActionDefend(targetAction, stats.defenseTag)) {
    return invalid("目标的防御出招没有防住这次攻击，不能使用双刃剑");
  }

  if (isAttackGloballyBlockedForDoubleEdge(state, stats)) {
    return invalid("这次攻击已被全局效果无效化，不能使用双刃剑");
  }

  if (
    player.buffs.some((buff) => {
      const parsed = parseDoubleEdgeIgnoreDefenseBuff(buff.id);
      return parsed?.actionIndex === actionIndex && parsed.targetId === targetId;
    })
  ) {
    return invalid("这次攻击已经使用过双刃剑");
  }

  return valid();
}

function validateDoubleEdgeSwordV2(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== DOUBLE_EDGE_SWORD_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("双刃剑只能在变招阶段使用");
  }

  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const pendingAction = state.pendingActions[playerId]?.actions[actionIndex];
  if (!pendingAction || !isAttackLikeAction(pendingAction)) {
    return invalid("双刃剑必须选择你当前已亮出的攻击");
  }

  const stats = getDoubleEdgeAttackStats(state, playerId, pendingAction);
  const targetIds = stats
    ? getDoubleEdgeAttackTargetIds(state, playerId, pendingAction, stats)
    : [];
  const targetId =
    action.targetId ??
    findFirstDoubleEdgeDefendedTarget(state, player, actionIndex, targetIds, stats) ??
    (targetIds.length === 1 ? targetIds[0] : getPrimaryActionTargetId(pendingAction));
  if (!targetId || !targetIds.includes(targetId)) {
    return invalid("双刃剑必须选择这次攻击目标中防住你的玩家");
  }

  const targetAction = getDefensiveActionForDoubleEdge(state, player, targetId);
  if (
    !targetAction ||
    targetAction.type === "attack" ||
    targetAction.type === "skill" ||
    (targetAction.type === "defense" && targetAction.defense === "rebound")
  ) {
    return invalid("双刃剑只能无视非反弹的防御出招或饼防");
  }

  if (!stats || !canActionDefend(targetAction, stats.defenseTag)) {
    return invalid("目标的出招没有防住这次攻击，不能使用双刃剑");
  }

  if (isAttackGloballyBlockedForDoubleEdge(state, stats)) {
    return invalid("这次攻击已被全局效果无效化，不能使用双刃剑");
  }

  if (
    player.buffs.some((buff) => {
      const parsed = parseDoubleEdgeIgnoreDefenseBuff(buff.id);
      return parsed?.actionIndex === actionIndex && parsed.targetId === targetId;
    })
  ) {
    return invalid("这次攻击对该目标已经使用过双刃剑");
  }

  return valid();
}

function validateLiegongCross(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== LIEGONG_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("烈弓只能在变招阶段使用");
  }

  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const pendingAction = state.pendingActions[playerId]?.actions[actionIndex];
  if (!pendingAction || !isAttackLikeAction(pendingAction)) {
    return invalid("烈弓必须选择你当前已亮出的攻击");
  }

  const stats = getDoubleEdgeAttackStats(state, playerId, pendingAction);
  const targetIds = stats
    ? getDoubleEdgeAttackTargetIds(state, playerId, pendingAction, stats)
    : [];
  const targetId =
    action.targetId ??
    findFirstLiegongCounterTarget(state, player, actionIndex, targetIds);
  if (!targetId || !targetIds.includes(targetId)) {
    return invalid("烈弓必须选择这次攻击中与你相向攻击的玩家");
  }

  if (hasQueuedLiegongCross(player, actionIndex, targetId)) {
    return invalid("这次攻击对该目标已经使用过烈弓");
  }

  if (!hasIncomingAttackFromTarget(state, targetId, playerId)) {
    return invalid("目标玩家没有对你使用可交错的攻击");
  }

  return valid();
}

function validateAbsoluteGuard(
  state: GameState,
  playerId: PlayerId,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  action: SkillAction,
  timingPhase: SkillTimingPhase
): ValidationResult {
  if (action.skillId !== ABSOLUTE_GUARD_SKILL_ID) {
    return valid();
  }

  if (timingPhase !== "turn_change_action") {
    return invalid("绝对守护只能在变招阶段使用");
  }

  const candidate = getAbsoluteGuardCandidate(state, playerId, action);
  if (!candidate) {
    return invalid("绝对守护必须选择本回合将要攻击你的攻击");
  }

  const source = findPlayer(state, candidate.sourceId);
  if (!source || hasAbsoluteGuardQueued(source, candidate.actionIndex)) {
    return invalid("这次攻击已经被绝对守护改变过");
  }

  if (candidate.cost > player.cakes) {
    return invalid(`饼不足，绝对守护需要 ${candidate.cost} 个饼`);
  }

  return valid();
}

function getAbsoluteGuardCandidate(
  state: GameState,
  guardPlayerId: PlayerId,
  action: SkillAction
): {
  sourceId: PlayerId;
  actionIndex: number;
  mode: "area_to_self" | "single_to_area";
  cost: number;
} | undefined {
  const sourceId = action.targetId;
  if (!sourceId) {
    return undefined;
  }

  const source = findPlayer(state, sourceId);
  const actionIndex = normalizeAttackStatActionIndex(action.switchActionIndex);
  const sourceAction = state.pendingActions[sourceId]?.actions[actionIndex];
  if (!source || !sourceAction || !isAttackLikeAction(sourceAction)) {
    return undefined;
  }

  const stats = getDoubleEdgeAttackStats(state, sourceId, sourceAction);
  if (!stats) {
    return undefined;
  }

  const targetIds = getDoubleEdgeAttackTargetIds(state, sourceId, sourceAction, stats);
  if (!targetIds.includes(guardPlayerId)) {
    return undefined;
  }

  const mode = stats.isArea || isActionForcedArea(state, sourceId, sourceAction, stats)
    ? "area_to_self"
    : "single_to_area";
  const rawCost =
    sourceAction.type === "attack"
      ? getEffectiveAttackActionCost(source, sourceAction)
      : getEffectiveSkillActionCost(source, sourceAction);
  return {
    sourceId,
    actionIndex,
    mode,
    cost: Math.ceil(rawCost / 2)
  };
}

function isActionEffectivelyArea(
  state: GameState,
  sourceId: PlayerId,
  action: PlayerAction
): boolean {
  const stats = getBaseAttackStatsForAction(action);
  return Boolean(stats && (stats.isArea || isActionForcedArea(state, sourceId, action, stats)));
}

function getBaseAttackStatsForAction(action: PlayerAction): AttackStats | undefined {
  if (action.type === "attack") {
    const definition = BASE_ATTACKS[action.attackId];
    return definition ? getStackedAttackStats(definition, action.stacks) : undefined;
  }

  if (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack") {
    return getSkillAttackStats(action.skillId, action.stacks);
  }

  return undefined;
}

function isActionForcedArea(
  state: GameState,
  sourceId: PlayerId,
  action: PlayerAction,
  stats: AttackStats
): boolean {
  const source = findPlayer(state, sourceId);
  const isElectricShockAction =
    action.type === "skill" && action.skillId === "skill_36_14343";
  return Boolean(
    !isElectricShockAction &&
      !stats.isArea &&
      (playerHasActiveSkill(source, LUANWU_SKILL_ID) ||
        playerHasActiveSkill(source, PUTIAN_TONGQING_SKILL_ID))
  );
}

function hasAbsoluteGuardQueued(
  source: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number
): boolean {
  const prefix = `${ABSOLUTE_GUARD_BUFF_PREFIX}${actionIndex}:`;
  return source.buffs.some((buff) => buff.id.startsWith(prefix));
}

function findFirstLiegongCounterTarget(
  state: GameState,
  player: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number,
  targetIds: PlayerId[]
): PlayerId | undefined {
  return targetIds.find(
    (targetId) =>
      !hasQueuedLiegongCross(player, actionIndex, targetId) &&
      hasIncomingAttackFromTarget(state, targetId, player.id)
  );
}

function hasIncomingAttackFromTarget(
  state: GameState,
  sourceId: PlayerId,
  targetId: PlayerId
): boolean {
  const plan = state.pendingActions[sourceId];
  if (!plan) {
    return false;
  }

  return plan.actions.some((action) => {
    if (!isAttackLikeAction(action)) {
      return false;
    }

    const stats = getDoubleEdgeAttackStats(state, sourceId, action);
    return stats
      ? getDoubleEdgeAttackTargetIds(state, sourceId, action, stats).includes(targetId)
      : false;
  });
}

function hasQueuedLiegongCross(
  source: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number,
  targetId: PlayerId
): boolean {
  const prefix = `${LIEGONG_CROSS_BUFF_PREFIX}${actionIndex}:${targetId}:`;
  return source.buffs.some((buff) => buff.id.startsWith(prefix));
}

function getDoubleEdgeAttackStats(
  state: GameState,
  playerId: PlayerId,
  action: PlayerAction
): AttackStats | undefined {
  const base =
    action.type === "attack"
      ? getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks)
      : action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack"
        ? getSkillAttackStats(action.skillId, action.stacks)
        : undefined;
  if (!base) {
    return undefined;
  }

  return applyAttackModifiers(cloneGameState(state), playerId, base);
}

function getDoubleEdgeAttackTargetIds(
  state: GameState,
  sourceId: PlayerId,
  action: PlayerAction,
  stats: AttackStats
): PlayerId[] {
  const source = findPlayer(state, sourceId);
  const forcedArea = Boolean(
    playerHasActiveSkill(source, LUANWU_SKILL_ID) ||
      playerHasActiveSkill(source, PUTIAN_TONGQING_SKILL_ID)
  );
  if (stats.isArea || forcedArea) {
    const targetIds = alivePlayers(state)
      .filter((player) => player.id !== sourceId)
      .map((player) => player.id);
    return filterPutianTongqingBlindSpotTargetIds(state, sourceId, targetIds);
  }

  if (action.type === "skill" && MULTI_TARGET_ATTACK_SKILL_IDS.has(action.skillId)) {
    return Array.from(
      new Set([...(action.targetIds ?? []), action.targetId].filter(Boolean) as PlayerId[])
    );
  }

  const targetId = getPrimaryActionTargetId(action);
  return targetId ? [targetId] : [];
}

function filterPutianTongqingBlindSpotTargetIds(
  state: GameState,
  sourceId: PlayerId,
  targetIds: PlayerId[]
): PlayerId[] {
  const source = findPlayer(state, sourceId);
  if (!playerHasActiveSkill(source, PUTIAN_TONGQING_SKILL_ID)) {
    return targetIds;
  }

  const farthest = getFarthestAlivePlayerIds(state, sourceId);
  if (farthest.size === 0) {
    return targetIds;
  }

  return targetIds.filter((targetId) => !farthest.has(targetId));
}

function getFarthestAlivePlayerIds(state: GameState, sourceId: PlayerId): Set<PlayerId> {
  const alive = alivePlayers(state);
  const sourceIndex = alive.findIndex((player) => player.id === sourceId);
  if (sourceIndex < 0 || alive.length <= 3) {
    return new Set();
  }

  const maxDistance = Math.floor(alive.length / 2);
  return new Set(
    alive
      .filter((player, index) => {
        if (player.id === sourceId) {
          return false;
        }
        const distance = Math.abs(index - sourceIndex);
        return Math.min(distance, alive.length - distance) === maxDistance;
      })
      .map((player) => player.id)
  );
}

function findFirstDoubleEdgeDefendedTarget(
  state: GameState,
  source: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number,
  targetIds: PlayerId[],
  stats: AttackStats | undefined
): PlayerId | undefined {
  if (!stats) {
    return undefined;
  }

  return targetIds.find((targetId) => {
    if (hasQueuedDoubleEdgeTarget(source, actionIndex, targetId)) {
      return false;
    }

    const targetAction = getDefensiveActionForDoubleEdge(state, source, targetId);
    return (
      targetAction &&
      targetAction.type !== "attack" &&
      targetAction.type !== "skill" &&
      !(targetAction.type === "defense" && targetAction.defense === "rebound") &&
      canActionDefend(targetAction, stats.defenseTag)
    );
  });
}

function hasQueuedDoubleEdgeTarget(
  source: NonNullable<ReturnType<typeof findPlayer>>,
  actionIndex: number,
  targetId: PlayerId
): boolean {
  const prefix = `${DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX}${actionIndex}:${targetId}:`;
  return source.buffs.some((buff) => buff.id.startsWith(prefix));
}

function getPrimaryActionTargetId(action: PlayerAction): PlayerId | undefined {
  return "targetId" in action ? action.targetId : undefined;
}

function getDefensiveAction(plan: PlayerActionPlan | undefined): PlayerAction | undefined {
  return plan?.actions.find(
    (action) => action.type === "defense" || action.type === "gain_cake"
  );
}

function getDefensiveActionForDoubleEdge(
  state: GameState,
  source: NonNullable<ReturnType<typeof findPlayer>>,
  targetId: PlayerId
): PlayerAction | undefined {
  const actionWithIndex = getDefensiveActionWithIndex(state.pendingActions[targetId]);
  if (!actionWithIndex) {
    return undefined;
  }

  if (!playerHasActiveSkill(source, "skill_30_38815")) {
    return actionWithIndex.action;
  }

  return (
    getOriginalDefenseBeforeQinggangIgnoredSwitch(
      state,
      targetId,
      actionWithIndex.actionIndex
    ) ?? actionWithIndex.action
  );
}

function getDefensiveActionWithIndex(
  plan: PlayerActionPlan | undefined
): { action: PlayerAction; actionIndex: number } | undefined {
  const actionIndex = plan?.actions.findIndex(
    (action) => action.type === "defense" || action.type === "gain_cake"
  );
  if (actionIndex === undefined || actionIndex < 0 || !plan) {
    return undefined;
  }

  const action = plan.actions[actionIndex];
  return action ? { action, actionIndex } : undefined;
}

function getOriginalDefenseBeforeQinggangIgnoredSwitch(
  state: GameState,
  playerId: PlayerId,
  actionIndex: number
): PlayerAction | undefined {
  const switchEvent = state.eventLog.find(
    (event) =>
      event.type === "action_switched" &&
      event.playerId === playerId &&
      event.roundNumber === state.roundNumber &&
      event.turnNumber === state.turnNumber &&
      (event.skillId === "skill_88_62906" || event.skillId === "skill_89_99375") &&
      event.actionIndex === actionIndex &&
      event.before.type === "defense"
  );

  return switchEvent?.type === "action_switched" ? switchEvent.before : undefined;
}

function isAttackGloballyBlockedForDoubleEdge(
  state: GameState,
  stats: AttackStats
): boolean {
  return (
    ((stats.level === 0 || stats.power === 0 || stats.power >= INFINITE_DAMAGE) &&
      hasActiveSkill(state, "skill_11_89360")) ||
    (stats.power > 2 &&
      stats.power < 6 &&
      hasActiveSkill(state, "skill_42_94266")) ||
    (stats.power > 4 && hasActiveSkill(state, "skill_43_74082")) ||
    (stats.power < 4 && hasActiveSkill(state, "skill_44_20092"))
  );
}

function hasActiveSkill(state: GameState, skillId: SkillId): boolean {
  return state.players.some(
    (player) => player.status === "alive" && playerHasActiveSkill(player, skillId)
  );
}

function parseDoubleEdgeIgnoreDefenseBuff(
  id: string
): { actionIndex: number; targetId: PlayerId } | undefined {
  if (!id.startsWith(DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX)) {
    return undefined;
  }

  const [actionIndexText, targetId] = id
    .slice(DOUBLE_EDGE_IGNORE_DEFENSE_BUFF_PREFIX.length)
    .split(":");
  const actionIndex = Number(actionIndexText);
  if (!Number.isInteger(actionIndex) || actionIndex < 0 || !targetId) {
    return undefined;
  }

  return { actionIndex, targetId };
}

function coagulationIntervalBuffId(
  roundNumber: number,
  timingPhase: SkillTimingPhase
): string {
  return `coagulation_used_interval:${roundNumber}:${timingPhase}`;
}

function normalizeAttackStatActionIndex(value: number | undefined): number {
  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : 0;
}

function isAttackLikeAction(
  action: PlayerAction
): action is Extract<PlayerAction, { type: "attack" }> | Extract<PlayerAction, { type: "skill" }> {
  return (
    action.type === "attack" ||
    (action.type === "skill" && getSkillPlay(action.skillId)?.kind === "attack")
  );
}

function validateSkillResourceCost(
  player: { buffs: Array<{ id: string; stacks: number }> },
  action: SkillAction
): ValidationResult {
  const resource = skillResourceRequirement(action.skillId);
  if (!resource) {
    return valid();
  }

  const available = player.buffs.find((buff) => buff.id === resource.buffId)?.stacks ?? 0;
  if (available < action.stacks) {
    return invalid(`${resource.name}不足，需要 ${action.stacks} 次`);
  }

  return valid();
}

function validateLianBaoFreeStacks(
  player: { buffs: Array<{ id: string; stacks: number }> },
  action: SkillAction
): ValidationResult {
  if (action.skillId !== LIAN_BAO_SKILL_ID) {
    return valid();
  }

  const freeStacks = action.freeStacks ?? 0;
  if (!Number.isInteger(freeStacks) || freeStacks < 0) {
    return invalid("免费连爆重数必须是非负整数");
  }

  if (freeStacks > action.stacks) {
    return invalid("免费连爆重数不能超过总重数");
  }

  const available = player.buffs.find((buff) => buff.id === "free_lian_bao")?.stacks ?? 0;
  if (freeStacks > available) {
    return invalid(`免费连爆次数不足，需要 ${freeStacks} 次`);
  }

  return valid();
}

function skillResourceRequirement(skillId: string): { buffId: string; name: string } | undefined {
  if (skillId === "skill_37_68416") {
    return { buffId: "guidao_charge", name: "鬼道次数" };
  }

  if (skillId === "skill_21_36332") {
    return { buffId: "lava_mark", name: "熔岩印记" };
  }

  if (skillId === "skill_22_54978") {
    return { buffId: "winter_mark", name: "凛冬印记" };
  }

  return undefined;
}

function getSkillUseCount(player: { buffs: Array<{ id: string; stacks: number }> }, skillId: string): number {
  return player.buffs.find((buff) => buff.id === `skill_used:${skillId}`)?.stacks ?? 0;
}

function countActiveCooldowns(
  player: { buffs: Array<{ id: string; expiresAtRound?: number }> },
  cooldownIdPrefix: string,
  roundNumber: number
): number {
  return player.buffs.filter(
    (buff) =>
      buff.id.startsWith(cooldownIdPrefix) &&
      (buff.expiresAtRound === undefined || buff.expiresAtRound > roundNumber)
  ).length;
}

function getEffectiveSkillActionCost(player: { buffs: Array<{ id: string; stacks: number }> }, action: SkillAction): number {
  if (action.skillId === LIAN_BAO_SKILL_ID) {
    const freeStacks = Math.min(action.stacks, Math.max(0, action.freeStacks ?? 0));
    return getSkillActionCost(action.skillId, action.stacks - freeStacks);
  }

  return getSkillActionCost(action.skillId, action.stacks);
}

function getEffectiveAttackActionCost(
  player: { skills: string[]; buffs: Array<{ id: string }> },
  action: AttackAction
): number {
  const stats = getStackedAttackStats(BASE_ATTACKS[action.attackId], action.stacks);
  const reactorCount = getActiveSkillCount(player, "skill_80_20445");
  if (reactorCount > 0 && (action.attackId === "he_bao" || action.attackId === "chao_he_bao")) {
    return Math.max(0, stats.cost - 3 * reactorCount * action.stacks);
  }

  if (playerHasActiveSkill(player, PUTIAN_TONGQING_SKILL_ID) && action.attackId === "qin") {
    return stats.cost / 2;
  }

  return stats.cost;
}

function getActionTargetIds(action: AttackAction | SkillAction): PlayerId[] {
  if (
    action.type === "skill" &&
    MULTI_TARGET_ATTACK_SKILL_IDS.has(action.skillId)
  ) {
    return normalizeTargetIds(action);
  }

  return action.targetId ? [action.targetId] : [];
}

function normalizeTargetIds(action: SkillAction): PlayerId[] {
  return Array.from(
    new Set([...(action.targetIds ?? []), action.targetId].filter(Boolean) as PlayerId[])
  );
}

function validateRocketTargets(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  if (targetIds.length < 1 || targetIds.length > 2) {
    return invalid("火箭需要选择连续的 1 到 2 名目标");
  }

  for (const targetId of targetIds) {
    if (!isAliveTarget(state, targetId)) {
      return invalid("火箭目标不存在或已死亡");
    }
  }

  if (
    targetIds.length === 2 &&
    !areConsecutiveAliveTargets(state, targetIds[0]!, targetIds[1]!)
  ) {
    return invalid("火箭的两个目标必须是座次连续的玩家");
  }

  return valid();
}

function validateVortexTargets(
  state: GameState,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  if (targetIds.length < 1 || targetIds.length > 3) {
    return invalid("Vortex skills must choose 1 to 3 targets");
  }

  for (const targetId of targetIds) {
    if (!isAliveTarget(state, targetId)) {
      return invalid("Vortex target is not alive");
    }
  }

  if (!areContiguousAliveTargets(state, targetIds)) {
    return invalid("Vortex targets must be consecutive players");
  }

  return valid();
}

function validateElectricShockTargets(
  state: GameState,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  if (targetIds.length < 1 || targetIds.length > 2) {
    return invalid("电击法术需要选择 1 到 2 名目标");
  }

  for (const targetId of targetIds) {
    if (!isAliveTarget(state, targetId)) {
      return invalid("电击法术目标不存在或已死亡");
    }
  }

  return valid();
}

function validateBalanceTargets(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  if (targetIds.length !== 2) {
    return invalid("制衡必须选择除你外 2 名玩家");
  }

  for (const targetId of targetIds) {
    if (targetId === playerId) {
      return invalid("制衡不能选择自己");
    }

    if (!isAliveTarget(state, targetId)) {
      return invalid("制衡目标不存在或已死亡");
    }
  }

  return valid();
}

function validateLightningSpellTargets(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  const targetIds = normalizeTargetIds(action);
  const resolvedTargetIds = resolveLightningSpellTargetIds(
    state.players,
    playerId,
    targetIds
  );
  if (!resolvedTargetIds) {
    return invalid("雷电法术必须选择血量最高规则允许的 2 名目标");
  }

  if (resolvedTargetIds.length === 0) {
    return invalid("雷电法术没有可选择的目标");
  }

  return valid();
}

function validateLishangTargets(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction
): ValidationResult {
  if (!action.targetId) {
    return invalid("离殇必须选择一名致死者");
  }

  if (!getFatalSourceIds(state, playerId).includes(action.targetId)) {
    return invalid("离殇只能选择本回合对你造成致死伤害的玩家");
  }

  const target = findPlayer(state, action.targetId);
  if (!target) {
    return invalid("离殇目标不存在或已死亡");
  }

  if (!action.targetSkillId) {
    return valid();
  }

  if (!target.skills.includes(action.targetSkillId)) {
    return invalid("目标玩家没有这个技能");
  }

  if (!getSmallSkillIds().includes(action.targetSkillId)) {
    return invalid("离殇只能丢弃已暴露小技能");
  }

  if (!canPlayerSeeSkill(state, playerId, action.targetId, action.targetSkillId)) {
    return invalid("离殇只能丢弃你当前视野里已暴露的技能");
  }

  return valid();
}

function validateHellOverlordTarget(
  state: GameState,
  playerId: PlayerId,
  action: SkillAction,
  pendingDeathWindow: boolean,
  pendingDeathPlayer: boolean
): ValidationResult {
  if (pendingDeathWindow) {
    if (!pendingDeathPlayer) {
      return invalid("复活阶段只有已死亡玩家可以使用地狱主宰自救");
    }

    if (action.targetId && action.targetId !== playerId) {
      return invalid("复活阶段的地狱主宰只能对自己使用");
    }

    return valid();
  }

  if (!action.targetId) {
    return invalid("地狱主宰必须选择一名死亡玩家");
  }

  if (action.targetId === playerId) {
    return invalid("地狱主宰只能在自己的复活阶段对自己使用");
  }

  const target = findPlayer(state, action.targetId);
  if (!target || target.status !== "dead" || target.defeatLevel !== 1) {
    return invalid("地狱主宰只能选择死亡玩家");
  }

  if (hasNoRevive(target)) {
    return invalid("被裂魂杀死的玩家不能被地狱主宰复活");
  }

  return valid();
}

function isPendingDeathWindow(state: GameState): boolean {
  return (
    state.phase === "action_window" &&
    state.activeTimingPhase === "revival_action" &&
    state.players.some((player) => isPendingDeathPlayer(player))
  );
}

function isPendingDeathPlayer(player: { hp: number; buffs: Array<{ id: string }> }): boolean {
  return player.buffs.some((buff) => buff.id === PENDING_DEATH_BUFF_ID);
}

function hasNoRevive(player: { buffs: Array<{ id: string }> }): boolean {
  return player.buffs.some((buff) => buff.id === NO_REVIVE_BUFF_ID);
}

function isPuppetTargetingMaster(
  state: GameState,
  playerId: PlayerId,
  targetId: PlayerId
): boolean {
  const player = findPlayer(state, playerId);
  return Boolean(player && getPuppetMasterId(player) === targetId);
}

function getFatalSourceIds(state: GameState, playerId: PlayerId): PlayerId[] {
  return Array.from(
    new Set(
      state.eventLog
        .filter(
          (event): event is DamageEvent =>
            event.type === "damage" &&
            event.targetId === playerId &&
            event.amount > 0 &&
            event.roundNumber === state.roundNumber &&
            event.turnNumber === state.roundTurnNumber &&
            Boolean(event.sourceId)
        )
        .map((event) => event.sourceId as PlayerId)
    )
  );
}

function areConsecutiveAliveTargets(state: GameState, a: PlayerId, b: PlayerId): boolean {
  const alive = alivePlayers(state);
  const indexA = alive.findIndex((player) => player.id === a);
  const indexB = alive.findIndex((player) => player.id === b);
  if (indexA === -1 || indexB === -1 || alive.length < 2) {
    return false;
  }

  return (
    indexB === (indexA + 1) % alive.length ||
    indexB === (indexA - 1 + alive.length) % alive.length
  );
}

function areContiguousAliveTargets(state: GameState, targetIds: PlayerId[]): boolean {
  const uniqueTargetIds = Array.from(new Set(targetIds));
  if (uniqueTargetIds.length <= 1) {
    return true;
  }

  const aliveIds = alivePlayers(state).map((player) => player.id);
  if (
    aliveIds.length < uniqueTargetIds.length ||
    uniqueTargetIds.some((targetId) => !aliveIds.includes(targetId))
  ) {
    return false;
  }

  const targetSet = new Set(uniqueTargetIds);
  for (let start = 0; start < aliveIds.length; start += 1) {
    const forward = Array.from(
      { length: uniqueTargetIds.length },
      (_, offset) => aliveIds[(start + offset) % aliveIds.length]!
    );
    const backward = Array.from(
      { length: uniqueTargetIds.length },
      (_, offset) => aliveIds[(start - offset + aliveIds.length) % aliveIds.length]!
    );
    if (
      forward.every((targetId) => targetSet.has(targetId)) ||
      backward.every((targetId) => targetSet.has(targetId))
    ) {
      return true;
    }
  }

  return false;
}

function isAliveTarget(state: GameState, playerId: PlayerId): boolean {
  return alivePlayers(state).some((player) => player.id === playerId);
}

function valid(): ValidationResult {
  return { ok: true };
}

function invalid(error: string): ValidationResult {
  return { ok: false, error };
}
