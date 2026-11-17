import type { BuffState, GameState, PlayerId, PlayerState, PublicGameState } from "../types";
import { coldLightLimit, coldLightUses } from "./nineTribulations";
import { NINE_COLD, NINE_FATE, NINE_GROWTH, NINE_LAND } from "./nineTribulationsIds";
import { TIAN_YE_CHOICE_STATE, TIAN_YE_SOARING_STATE, TIAN_YE_WING_DETAILS } from "./tianyeIds";
import { DEAD_REALM_FALLBACK_ID, DEAD_REALM_GUARD_ID } from "./deadRealmIds";
import { CHEAT_LAST_CAST, CHEAT_SHARP_BONUS, CHEAT_SHARP_ID, CHEAT_SHARP_STOCK } from "./cheatServerIds";
import { YOUKAI_HALF_ID, YOUKAI_LAYERS_ID } from "./youkaiIds";
import { CHAOS_DEFENSE_LOCK, CHAOS_GUARD, hasChaosDefenseLock } from "./chaos";
import {
  BIG_CARD_SKILLS, CHASE_LIGHT_ID, CHASE_SHADOW_ID, CHASE_SOUL_ID, DRAGON_DOMINION_ID,
  FENSHI_FLAMES_ID, GOD_KING_JUDGMENT_ID, GOD_KING_RULES_ID, HUNYAO_LIGHT_ID, HUNYAO_RESET_ID, JIHAN_DAMAGE_GROWTH_ID,
  JIHAN_FREEZE_GROWTH_ID, JIHAN_SEAL_GROWTH_ID, JUNENG_RESPONSE_ID, KUISHI_ID, JUEYING_DEATH_ID,
  RI_SKILL_ID, SPIRIT_GUIDANCE_ID, STORE_DAMAGE_ID, VERDICT_GUARD_ID, VERDICT_REWARD_ID, VERDICT_ACTION_ID, WUJIN_REBOUND_ID, bigCardHasAbility
} from "../bigCards/abilities";
import { getSkill, getSkillUseLimit } from "../skills/registry";
import { CHARITY_GRANT_ID, CHARITY_LINK_ID, CHARITY_QUICK_ID } from "../bigCards/abilities";
import { CHARITY_QUICK_LIMIT, charityHealingRank, remainingCharityHealingUses } from "./charity";
import { getGodKingTotals } from "./godKing";
import { TIANMANG_CONVERSION_ID, TIANMANG_MIRROR_ID, TIANMANG_SAND_ID } from "../bigCards/abilities";
import { getSixStarArrayChances, SIX_STAR_ARRAY_ID } from "./tianmang";
import { WIND_INCOME_ID } from "../bigCards/abilities";
import { WIND_DEFENSE_PROGRESS } from "./ultimateWind";
import { THORN_DURATION } from "./thornDance";
import { THORN_DANCE_ID } from "./thornDanceIds";
import { VACUUM_INHERIT_ID, VACUUM_EXTRACT_ID, VACUUM_MAX_ID, VACUUM_PROGRESS, VACUUM_SPACE, VACUUM_STATE, VACUUM_ITEM } from "./vacuumIds";
import { extraVacuumUses, vacuumCardRank, vacuumMode } from "./vacuum";
import { LONE_STAR_PIERCE_ID, LONE_STAR_RAGE_ID, LONE_STAR_SUICIDE, LONE_STAR_UPGRADE } from "./loneStarIds";
import { loneStarUpgrade } from "./loneStar";
import { SAND_ARROWS_ID, SAND_INCOME_ID } from "../bigCards/abilities";
import { SAND_DAMAGE_PROGRESS_PREFIX, SAND_VORTEX } from "./sand";
import {
  getDestroyPowerCooldownCount, getDestroyPowerRemainingUses, getFlashFamilySlots, getFusionRecipe, getFusionSkillId, getOwnedSkillIds, isFusionActive
} from "../skills/fusion";
import { formatCombatValue, type CombatValue } from "./combatValues";
import { ANNIHILATION_MARK, DECAY_INHERIT_ID, DECAY_MARK, DECAY_UNLOCK_DAMAGE } from "./decayIds";
import { demonTyrantAuraDrain, TYRANT_ATTACK_DIVISOR, TYRANT_FIREBALL_DIVISOR } from "./demons";
import { INVENTORY_ITEM_STATE_TYPE, isCountedCombatStatus, isSkillSuppressedByBuff, SHIELD_STATE_TYPE, SKILL_DISABLED_BUFF_PREFIX, stateHasCategory } from "./effectCategories";
import { getActiveSkillCount } from "./gameFactory";
import { EMPTY_CITY_ILLUSION_ID } from "../bigCards/abilities";
import { getOrdinaryDefenseTotal } from "./starDragon";
import { ASURA_BLOOD_ID, ASURA_INHERIT_ID, ASURA_RITUAL_UPGRADE_ID } from "../bigCards/abilities";
import { ASURA_BLOOD_PROGRESS, ASURA_RITUAL_UPGRADE, getBloodQi } from "./asura";
import { isSoulTrackingBuff, SOUL_DEATH_HISTORY } from "./soulPact";
import { SOUL_EXTINGUISH_ID, SOUL_SINK_ID } from "../bigCards/abilities";
import { GREED_CHAIN_STATE, LIFE_CHANNEL_STATE, SIPHON_ABYSS_STATE } from "./siphon";
import { getActionLabel } from "./attacks";
import { WUJIN_REBOUND_COUNT } from "./wujin";
import { JUEYING_HARVEST } from "./jueying";
import { XIELING_BODY_ID, XIELING_INHERIT_ID, XIELING_ULTIMATE_ID } from "../bigCards/abilities";
import { getXielingMarkValue, XIELING_BODY_STATE, XIELING_END_DRAIN, XIELING_MARK } from "./xieling";
import { UTOPIA_DREAM_ID } from "../bigCards/abilities";
import { getDreamUnlockCount } from "./utopia";
import { SAKURA_BLOOM_ID, SAKURA_ELEMENT, SAKURA_FALL_ID, SAKURA_RAIN_ID } from "../bigCards/abilities";
import { getElementAmount, getSakuraCapacity } from "./elementResources";
import { SAKURA_GROWTH } from "./sakura";
import { MOUNTAIN_SEAL_ID, SACRED_BEAST_ID, TIME_REWIND_ID } from "../bigCards/abilities";
import { availableSacredBeasts, SACRED_BEASTS, type SacredBeast } from "./honghuang";
import { CLOUD_ITEM, CLOUD_SEA_ITEM, SKY_ABSOLUTE_COVER } from "./lingta";
import { KAIGE_LIVES_ID, KAIGE_STAGE_NAMES } from "../bigCards/abilities";
import { getLifeEffects, lifeEffectLabel } from "./lifeEffects";
import { formatPlayerHp, getPlayerHpCapValue } from "./infiniteValues";
import { GAME_SWITCH_LIVES_ID, GAME_SWITCH_VICTORY_ID } from "../bigCards/abilities";
import { PURPLE_FORESIGHT_ID } from "../bigCards/abilities";
import { purpleForesightUses } from "./purpleEye";
import { GAME_SWITCH_MODES, type GameSwitchMode } from "./gameSwitch";
import { ETERNAL_BIND_ID, ETERNAL_PROGRESS_ID, ETERNAL_THOUGHT_ID } from "../bigCards/abilities";
import { eternalBarId, eternalFieldCount, eternalProgress, eternalReplacementUses } from "./eternalThought";
import { excludedByTripleSeal, isTalismanState } from "./talismanRules";
import { curtainVeilCount, curtainRebirthElements } from "./curtain";
import { activeDivineFlame } from "./divineReversal";
import { TIGER_FORMS, TIGER_FORM_NAMES, tigerMieThirds } from "./netherTigerIds";
import { fiveElementsStatusLabel } from "./fiveElements";
import { DIVINE_FLAME_ENABLED, DIVINE_FLAME_ID } from "./divineReversalIds";
import { swarmInsectCount } from "./swarm";
import { SWARM_BEETLE_ID, SWARM_FLY_ID, SWARM_HOPPER_ID, SWARM_QUEEN_ID, SWARM_INSECTS, SWARM_INSECT_LABELS } from "./swarmIds";
import { CURTAIN_ACTS, CURTAIN_ENCORE_ID, CURTAIN_FINALE_ID, CURTAIN_REBIRTH_ID, CURTAIN_REFLECT_PIERCE, CURTAIN_VEILS } from "./curtainIds";
import { SUN_CROWN_COOLDOWN, SUN_CROWN_ID, SUN_PUPPET_STATE } from "./sunIds";
import { SEA_GOD_RETURN_COOLDOWN, SEA_GOD_RETURN_ID } from "./seaGodIds";
import { getSeaGodReturnReadyAt } from "./seaGodMoves";
import { MOON_ITEM, MOON_RITUAL_COOLDOWN } from "./moon";
import { getBigCardLimitedRemaining, getPeriodicUses, getSkillUseBalanceAdjustment, periodicCardUseKey,
  periodicUseReadyAt } from "./limitedUseBalance";
import { SWORD_ARRAY_ITEM } from "./swordArrayIds";
import { BLADE_INHERIT_ID, BLADE_MAINTENANCE_IDS, BROKEN_BLADE_TIERS, getBrokenBlade } from "./brokenBladeIds";
import { JUDGMENT_RANK_LABELS } from "./judgmentRank";
import { MOON_CHANT_STATE, MOON_RITUAL_ID } from "./moonIds";
import { getJunengTargetLock, getSelectableJunengTarget } from "./juneng";
import { getStoredDamages, STORED_DAMAGE_STATUS } from "./storedDamage";

export interface StatusLine {
  label: string;
  value: string;
  meter?: { value: number; limit: number };
}

export interface StatusOverview {
  elements: StatusLine[];
  lives: StatusLine[];
  defense: StatusLine[];
  field: StatusLine[];
  special: StatusLine[];
  longTerm: StatusLine[];
  counted: StatusLine[];
  limited: StatusLine[];
  marks: StatusLine[];
  items: StatusLine[];
  space: StatusLine[];
  progressBars: StatusLine[];
  continuations: StatusLine[];
  cardCounters: Record<string, Record<string, string[]>>;
}

type StatusRows = Omit<StatusOverview, "cardCounters">;
import { activeTotems } from "./totems";
import { TOTEM_KINDS, TOTEM_RANGES } from "./totemIds";
import { SPACE_BURST_SPACE } from "./spaceTimeIds";
import { activeSpaceTimeFields } from "./spaceTime";
import { BUBBLE_ENHANCE_STOCK, BUBBLE_FORCED_TARGET, BUBBLE_REBUILD_STOCK, BUBBLE_VENGEANCE_STOCK } from "./bubbleDreamIds";
import { RED_LOTUS_DEATH_DUE, RED_LOTUS_FLAME } from "./redLotusIds";
import { ERA_RESTART } from "./eraIds";
import { hexagramStatusLabel } from "./hexagram";
import { sevenStarFormLabels } from "./sevenStar";
import { activeEraFields, describeEraField } from "./era";

type StatusContext = Pick<GameState, "players" | "roundNumber" | "turnNumber" | "smallSpaces" | "activeTimingPhase" | "pendingDragonFireBonuses" | "cannonDefenses" | "totems" | "sunClockOverride" | "junengTargetLock"> &
  Pick<PublicGameState, "cannonDefenseSteps" | "spaceTimeFields" | "eraFields">;

export function getTraumaDueRound(player: PlayerState, buff: BuffState): number | undefined {
  const match = /^trauma_converge:(\d+)(?::fusion:.+)?$/.exec(buff.id);
  if (!match) return undefined;
  const fusion = player.skillFusions?.find((item) => item.id === buff.sourceFusionId && isFusionActive(player, item));
  const soulRepair = fusion && getFusionRecipe(fusion.skillId)?.skill.name === "灵魂修复";
  // Decomposing restores the original deadline rather than restarting the wait.
  return Number(match[1]) - (soulRepair ? 2 : 0);
}

function durationLabel(state: StatusContext, buff: BuffState): string {
  if (buff.infinite) return "无限";
  const round = buff.expiresAtRound ?? (buff.id.startsWith(SKILL_DISABLED_BUFF_PREFIX) ?
    Number(buff.id.split(":")[1]) : undefined);
  if (round !== undefined) return round <= state.roundNumber ? "本轮到期" : `剩 ${round - state.roundNumber} 轮 · 第 ${round} 轮到期`;
  if (buff.expiresAtTurn !== undefined) {
    const turns = buff.expiresAtTurn - state.turnNumber;
    return turns <= 0 ? "本回合到期" : `${turns} 回合后到期`;
  }
  return "持续生效";
}

function tyrantAuraFactor(drain: CombatValue, divisor: number): string {
  const [term] = drain;
  if (drain.length === 1 && term?.exponent === 0 &&
    (divisor === TYRANT_FIREBALL_DIVISOR || Number.isInteger(term.coefficient / divisor))) {
    return String(term.coefficient / divisor);
  }
  return `(${formatCombatValue(drain)}/${divisor})`;
}

function getStatusRows(state: StatusContext, player: PlayerState, publicOnly = false): StatusRows {
  const overview: StatusRows = {
    elements: [], lives: [], defense: [{ label: "防御值", value: formatCombatValue(getOrdinaryDefenseTotal(player)) }],
    field: [], special: [], longTerm: [], counted: [], limited: [], marks: [], items: [], space: [], progressBars: [], continuations: []
  };
  for (const field of activeEraFields(state)) if (field.spaceId === player.spaceId)
    overview.longTerm.push(describeEraField(field, state.roundNumber));
  if (!publicOnly) {
    for (const value of fiveElementsStatusLabel(player)) overview.special.push({ label: "五行之圣·形态", value });
    for (const value of sevenStarFormLabels(player)) overview.special.push({ label: "七星连珠·形态", value });
    for (const card of player.bigCards ?? []) {
      const value = hexagramStatusLabel(card);
      if (!value) continue;
      overview.special.push({ label: "六芒魔咒·形态", value });
      if (card.hexagramSpentStars || card.hexagramRestores) overview.special.push({ label: "六芒魔咒·恢复形态",
        value: `${card.hexagramSpentStars ?? 0}/6 次六芒星${card.hexagramRestores ? ` · 待恢复 ${card.hexagramRestores} 种` : ""}` });
    }
    const restartCards = (player.bigCards ?? []).filter((card) => bigCardHasAbility(card, ERA_RESTART));
    if (restartCards.length) overview.limited.push({ label: "新纪元", value: `剩 ${restartCards.filter((card) => !card.eraRestartUsed).length} 次` });
  }
  if (state.sunClockOverride) {
    const { hour, minute, effectName } = state.sunClockOverride;
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    overview.field.push({ label: effectName, value: `本局时间锁定为北京时间 ${time}` });
  }
  const targetLock = getJunengTargetLock(state, player.spaceId);
  if (targetLock) {
    const targetName = state.players.find(({ id }) => id === targetLock.targetId)?.name ?? "指定玩家";
    const restriction = getSelectableJunengTarget(state, player.spaceId) ? `仅可选择 ${targetName}` :
      `${targetName} 当前不可选，无法选择目标`;
    overview.longTerm.push({ label: "聚神", value: `${restriction} · 持续至第 ${targetLock.expiresAtRound - 1} 轮轮末` });
  }
  if (!publicOnly) {
    const damageStock = getStoredDamages(player);
    if (damageStock.length) {
      overview.counted.push({ label: "储存伤害", value: `剩 ${damageStock.length} 份` });
      const elementNames = { physical: "", fire: "火系", ice: "冰系", electric: "电系", poison: "毒系" };
      for (const [index, item] of damageStock.entries()) {
        const amount = item.pointDefeatLevel === 2 ? "退游" : formatCombatValue(item.amountValue);
        const elements = (item.elements ?? (item.element ? [item.element] : [])).map((element) => elementNames[element]).filter(Boolean);
        const category = item.internalDamage ? "反噬伤害" : item.fromAttack ? "攻击伤害" : item.spellDamage ? "法伤" : "伤害";
        overview.counted.push({ label: `第 ${index + 1} 份 · ${item.attackName ?? "伤害"}`,
          value: `${amount} · ${elements.join("、")}${category}` });
      }
    }
  }
  for (const insect of SWARM_INSECTS) {
    const count = swarmInsectCount(player, insect);
    if (count > 0) overview.items.push({ label: SWARM_INSECT_LABELS[insect], value: `${count} 只` });
  }
  for (const totem of activeTotems(state)) {
    if (totem.ownerId !== player.id || totem.tableZoneAfterPlayerId) continue;
    const main = state.players.find(({ id }) => id === totem.primaryTargetId);
    overview.items.push({ label: TOTEM_KINDS[totem.kind].name,
      value: `主目标 ${main?.name ?? "未知"} · ${TOTEM_RANGES[totem.range]} · 余 ${totem.expiresAtTurn - state.turnNumber} 回合` });
  }
  if (player.summon) {
    const { kind, ownerId, expiresAtTurn } = player.summon;
    const owner = `主人 ${state.players.find((entry) => entry.id === ownerId)?.name ?? "已离场"}`;
    if (kind === "tyrant") {
      overview.items.push({ label: "暴君 · 恶魔类傀儡", value: owner });
      if (player.status === "alive") {
        const drain = demonTyrantAuraDrain(player);
        const absorbed = formatCombatValue(drain ?? []);
        overview.special.push({ label: "暴君光环", value: drain ?
          `实际吸取 ${absorbed} 血 · 恶魔攻击 ×${tyrantAuraFactor(drain, TYRANT_ATTACK_DIVISOR)} · 小鬼火球额外攻等 ×${tyrantAuraFactor(drain, TYRANT_FIREBALL_DIVISOR)} · 恶魔受伤 ÷${absorbed}` :
          "实际吸取 0 血 · 未生效" });
      }
    } else {
      overview.items.push({ label: "猎犬 · 动物类傀儡", value: `${owner} · 余${Math.max(0, expiresAtTurn - state.turnNumber)}回合` });
    }
  }
  for (const card of player.bigCards ?? []) if (card.cardId === "10537" && !card.onlyAbilityId)
    overview.limited.push({ label: "灰熊咆哮", value: (card.bearReadyRound ?? 0) <= state.roundNumber ? "可用" : `第${card.bearReadyRound}轮可用` });
  const lifeDetails = (life: Parameters<typeof getLifeEffects>[0]) => {
    const effects = publicOnly ? [] : getLifeEffects(life).map(lifeEffectLabel);
    return effects.length ? ` · ${effects.join("、")}` : "";
  };
  const hpCap = getPlayerHpCapValue(player);
  if (hpCap) overview.lives.push({ label: "血量上限", value: `${formatCombatValue(hpCap)} 血` });
  overview.lives.push({ label: "当前命", value: `${formatPlayerHp(player)} 血${lifeDetails(player)}` });
  if (!publicOnly) for (const [index, life] of (player.spareLives ?? []).entries()) {
    const hp = life.hpValue ? formatCombatValue(life.hpValue) : life.hp;
    overview.lives.push({ label: `备用命 ${index + 1}`, value: `${hp} 血${lifeDetails(life)}` });
  }
  const quantity = (buff: BuffState) => buff.resourceValue ? formatCombatValue(buff.resourceValue) : buff.infinite ? "无限" : String(buff.stacks);
  const shield = (buff: BuffState) => buff.stateType === SHIELD_STATE_TYPE ||
    ["temp_shield_normal", "temp_shield_skill"].includes(buff.id);
  const buffs = player.buffs.filter((buff) => buff.stacks > 0 && !isSoulTrackingBuff(buff));
  if (!publicOnly && player.buffs.some((buff) => buff.stateType === TIAN_YE_CHOICE_STATE && buff.stacks === 0))
    overview.special.push({ label: "天野之翼", value: "待选择 · 本回合生效" });
  const shields = buffs.filter(shield);
  if (getBloodQi(player).length || getActiveSkillCount(player, ASURA_BLOOD_ID))
    overview.defense.push({ label: "血气", value: formatCombatValue(getBloodQi(player)) });
  overview.defense.push({ label: "护盾", value: shields.some((buff) => buff.infinite) ?
    "无限" : String(shields.reduce((total, buff) => total + buff.stacks, 0)) });
  for (const buff of buffs) {
    if (buff.id === CURTAIN_VEILS || buff.id === CURTAIN_REFLECT_PIERCE || buff.id === STORED_DAMAGE_STATUS) continue;
    if (buff.id === CHEAT_LAST_CAST || buff.id === CHEAT_SHARP_BONUS) continue;
    if (Object.values(TIAN_YE_WING_DETAILS).some(({ stateType }) => stateType === buff.stateType)) {
      if (buff.expiresAtTurn === state.turnNumber + 1)
        overview.special.push({ label: buff.name, value: buff.stateType === TIAN_YE_SOARING_STATE ?
          "本回合生效 · 座次 ∞ · 确立无敌" : "本回合生效" });
      continue;
    }
    if (buff.stateType === SUN_PUPPET_STATE) {
      if (player.status === "alive") overview.special.push({ label: "日的傀儡", value: "日消失时承受消失效果" });
      continue;
    }
    if (buff.id === SUN_CROWN_COOLDOWN || buff.id.startsWith(SEA_GOD_RETURN_COOLDOWN + ":")) continue;
    if (buff.id === MOON_RITUAL_COOLDOWN) continue;
    if (buff.itemKind === MOON_ITEM) {
      if ((buff.expiresAtRound ?? 0) > state.roundNumber)
        overview.items.push({ label: "月亮", value: `1 个 · 第 ${buff.expiresAtRound! - 1} 轮轮末消散` });
      continue;
    }
    if (buff.itemKind === SWORD_ARRAY_ITEM) {
      overview.items.push({ label: "诛仙剑阵", value: "已布阵" });
      continue;
    }
    if (buff.stateType === MOON_CHANT_STATE && (buff.startsAtRound ?? 0) > state.roundNumber) {
      overview.longTerm.push({ label: buff.name, value: `第 ${buff.startsAtRound} 轮开始 · 持续 3 轮` });
      continue;
    }
    if (buff.itemKind === VACUUM_ITEM) {
      overview.items.push({ label: "反饼", value: `${buff.stacks} 份` });
      continue;
    }
    if (buff.stateType === VACUUM_STATE) {
      const mode = vacuumMode(state, player);
      if (mode) overview.longTerm.push({ label: mode === "absolute" ? "绝对真空" : "真空", value: mode === "absolute" ? "持续至退出" :
        `再保持 ${Math.max(0, (buff.startsAtRound ?? state.roundNumber) + 3 - state.roundNumber)} 轮进入绝对真空` });
      continue;
    }
    if (buff.stateType === THORN_DURATION) {
      overview.longTerm.push({ label: buff.name, value: `永久 · 时长 ×10^${buff.stacks}` });
      continue;
    }
    if (buff.stateType === LONE_STAR_SUICIDE) {
      overview.longTerm.push({ label: "孤星绝煞", value: "下一回合回合初自必杀" });
      continue;
    }
    if (buff.stateType === LONE_STAR_UPGRADE) {
      if (!publicOnly) {
        const opponent = state.players.find(({ id }) => id === buff.sourcePlayerId);
        overview.counted.push({ label: buff.name, value: `${opponent?.name ?? "该目标"} · ${buff.stacks} 次` });
      }
      continue;
    }
    if (isTalismanState(buff)) {
      const duration = buff.uncleansable ? "永久规则" : durationLabel(state, buff);
      overview.longTerm.push({ label: buff.name, value: buff.talismanNextTick === undefined ? duration :
        `${duration} · 距下次结算 ${Math.max(0, buff.talismanNextTick - state.turnNumber)} 回合` });
      continue;
    }
    if (buff.stateType === LIFE_CHANNEL_STATE || buff.stateType === SIPHON_ABYSS_STATE || buff.stateType === GREED_CHAIN_STATE) {
      const other = state.players.find(({ id }) => id === (buff.siphonTargetId ?? buff.waveAttack?.targetId ?? buff.sourcePlayerId));
      const label = other ? `${buff.name} · ${other.name}` : buff.name;
      const duration = buff.stateType === LIFE_CHANNEL_STATE ?
        `剩 ${Math.max(0, (buff.expiresAtTurn ?? 0) - (buff.siphonNextTick ?? state.turnNumber))} 次` : durationLabel(state, buff);
      overview.longTerm.push({ label, value: duration });
      continue;
    }
    if (buff.id === SOUL_DEATH_HISTORY) {
      overview.longTerm.push({ label: "曾死亡", value: "已发生普通死亡" });
      continue;
    }
    if (buff.stateType === SAND_VORTEX) {
      const due = buff.sandVortexNextTick ?? state.turnNumber;
      overview.longTerm.push({ label: buff.name, value: `${durationLabel(state, buff)} · 下次法伤剩 ${Math.max(0, due - state.turnNumber)} 回合` });
      continue;
    }
    if (buff.stateType === CHAOS_DEFENSE_LOCK) {
      if (buff.sourcePlayerId && hasChaosDefenseLock(player, buff.sourcePlayerId)) {
        const source = state.players.find((entry) => entry.id === buff.sourcePlayerId);
        overview.counted.push({ label: buff.name, value: `防御值归零前不能攻击 ${source?.name ?? "施加者"}` });
      }
      continue;
    }
    if (buff.stateType === CHAOS_GUARD) {
      const source = state.players.find((entry) => entry.id === buff.sourcePlayerId);
      overview.counted.push({ label: `${buff.name}（对 ${source?.name ?? "该玩家"}）`,
        value: `${buff.chaosStartRound === state.roundNumber ? "" : "下轮生效 · "}剩 ${buff.stacks} 次` });
      continue;
    }
    if (buff.lifeAbsorptionDueRound !== undefined) {
      overview.longTerm.push({ label: buff.name, value: `第 ${buff.lifeAbsorptionDueRound} 轮轮初结算` });
      continue;
    }
    if (buff.stateType === XIELING_END_DRAIN) continue;
    if (["qianqiu_defense", "qianqiu_gain", "qianqiu_used", "raging_wave_judgment", "thunder_storm_burst",
      "tianlie_rage_uses", "chaos_wave_modifier"].includes(buff.stateType ?? "")) continue;
    if (buff.freeMove && publicOnly) continue;
    if (buff.id === WUJIN_REBOUND_COUNT && (publicOnly || getActiveSkillCount(player, WUJIN_REBOUND_ID) === 0)) continue;
    const counted = getCountedStatusLine(state, buff);
    if (buff.id.startsWith("element:")) {
      overview.elements.push({ label: buff.name, value: quantity(buff) });
    } else if (buff.itemKind === CLOUD_ITEM) {
      overview.items.push({ label: "云", value: `${quantity(buff)} 朵 · 第 ${(buff.expiresAtRound ?? state.roundNumber + 1) - 1} 轮轮末消散` });
    } else if (buff.itemKind === CLOUD_SEA_ITEM) {
      overview.items.push({ label: "云海", value: `${quantity(buff)} 个` });
    } else if (buff.stateType === SKY_ABSOLUTE_COVER) {
      overview.defense.push({ label: "天绝护罩", value: `${quantity(buff)} 个 · 抵挡到消失` });
    } else if (buff.stateType === INVENTORY_ITEM_STATE_TYPE) {
      overview.items.push({ label: buff.name, value: durationLabel(state, buff) });
    } else if (counted) {
      overview.counted.push(counted);
    } else if (buff.stateType === BUBBLE_FORCED_TARGET) {
      const target = state.players.find(({ id }) => id === buff.sourcePlayerId);
      overview.longTerm.push({ label: "失却的魔女", value: `下一次攻击只对 ${target?.name ?? "指定玩家"}` });
    } else if (buff.id === RED_LOTUS_DEATH_DUE) {
      overview.longTerm.push({ label: "红莲天火·反噬", value: "下回合初普通死亡，视为受火系伤害" });
    } else if (buff.id === RED_LOTUS_FLAME) {
      overview.marks.push({ label: "焰印记", value: `${quantity(buff)} 层` });
    } else if (shield(buff)) {
      overview.defense.push({ label: buff.name, value: buff.damageShieldLimit ?
        `${quantity(buff)} 面 · 抵御上限 ${formatCombatValue(buff.damageShieldLimit)}` : quantity(buff) });
    } else if (buff.id === XIELING_MARK) {
      overview.marks.push({ label: buff.name, value: formatCombatValue(getXielingMarkValue(player)) });
    } else if (buff.id === DECAY_MARK || buff.id === ANNIHILATION_MARK) {
      overview.marks.push({ label: buff.name, value: `${quantity(buff)} 层 · 永久` });
    } else if (buff.fusionMarkKind || buff.id.startsWith("ice_rain:") ||
      (buff.name.includes("印记") && !buff.id.includes("spent"))) {
      overview.marks.push({ label: buff.name, value: quantity(buff) });
    } else {
      const dueRound = getTraumaDueRound(player, buff);
      if (dueRound !== undefined) {
        if (publicOnly && buff.id.includes(":fusion:")) {
          overview.longTerm.push({ label: buff.name, value: `${quantity(buff)} 层` });
        } else {
          overview.longTerm.push({ label: dueRound < Number(buff.id.split(":")[1]) ? "灵魂修复" : buff.name,
            value: `第 ${dueRound} 轮轮末恢复 · 剩 ${Math.max(0, dueRound - state.roundNumber)} 轮 · ${quantity(buff)} 层` });
        }
      } else if (stateHasCategory(buff, "positive") || stateHasCategory(buff, "negative") ||
        buff.stateType || isSkillSuppressedByBuff(buff.id) || buff.id.startsWith("sealed_skill:") ||
        (!buff.id.includes("cooldown") && (buff.expiresAtRound !== undefined || buff.expiresAtTurn !== undefined) &&
          !/^(skill_used:|skill_guess_failed|skip_action_windows|star_rage_spent)/.test(buff.id))) {
        overview.longTerm.push({ label: buff.name, value: durationLabel(state, buff) });
      }
    }
  }
  const space = player.spaceId ? state.smallSpaces?.[player.spaceId] : undefined;
  const rift = player.buffs.find((buff) => buff.timeRiftDeadline)?.timeRiftDeadline;
  const temporal = activeSpaceTimeFields(state);
  for (const entry of temporal.confusions)
    overview.longTerm.push({ label: "时间大混乱", value: `第 ${entry.expiresAtRound - 1} 轮轮末到期` });
  for (const entry of temporal.shatters)
    overview.longTerm.push({ label: "空间大破碎", value: `第 ${entry.expiresAtRound - 1} 轮轮末到期` });
  for (const layer of temporal.chaos)
    overview.longTerm.push({ label: `混沌·时空守护 · 第 ${layer.count} 次`, value: `第 ${layer.expiresAtRound - 1} 轮轮末到期` });
  const beastCards = player.bigCards?.filter((card) => bigCardHasAbility(card, SACRED_BEAST_ID)) ?? [];
  if (beastCards.length) {
    const ready = availableSacredBeasts(player, state.roundNumber);
    for (const key of Object.keys(SACRED_BEASTS) as SacredBeast[]) {
      const active = beastCards.some((card) => card.sacredBeasts?.[key]?.active);
      overview.special.push({ label: SACRED_BEASTS[key].name, value: active ? "开启 · 本轮生效" :
        ready.includes(key) ? "关闭 · 本段可选" : "关闭" });
    }
  }
  if (!publicOnly) {
    for (const card of player.bigCards ?? []) if (card.tigerForms) {
      const forms = card.tigerForms;
      overview.special.push({ label: "幽冥白虎·形态", value: forms.cleared ? "已清除" : TIGER_FORMS.map((form) => TIGER_FORM_NAMES[form] + " · " +
        (forms.active === form ? "当前" : forms.available.includes(form) ? "可切换" : "已失去")).concat(
        forms.active === "nether" ? [TIGER_FORM_NAMES.nether + " · 当前"] : []).join(" / ") });
    }
    const thirds = tigerMieThirds(player);
    if (thirds) overview.counted.push({ label: "灭机会", value: (thirds % 3 ? thirds + "/3" : String(thirds / 3)) + " 次" });
  }
  if (!publicOnly && player.emptyCityRecovery) {
    overview.space.push({ label: "空城之下", value: "本体接替幻影，正在进行恢复判定" });
  } else if (!publicOnly && player.emptyCityBodySpaceId && getActiveSkillCount(player, EMPTY_CITY_ILLUSION_ID)) {
    overview.space.push({ label: "独立小空间", value: "本体无法被选中 · 幻影在原座位出招 · 常规胜利不计幻影" });
    if (player.emptyCityBody) overview.space.push({ label: "本体生命", value: `${formatPlayerHp(player.emptyCityBody)} 血` });
  } else if (rift) {
    overview.space.push({ label: "时间裂缝", value: `第 ${rift.round - 1} 轮轮末或全局第 ${rift.turn} 回合初返回，取较早者` });
  } else if (space?.kind === SPACE_BURST_SPACE) {
    overview.space.push({ label: "空间爆破", value: `第 ${space.expiresAtRound - 1} 轮轮末或全局第 ${space.expiresAtTurn} 回合初返回，取较早者` },
      { label: "规则", value: "独立空间 · 不能出招 · 可以使用阶段技能 · 不计为场上人数" });
  } else if (space?.kind === "soul_exile") {
    overview.space.push({ label: "流放地", value: "持续至本局结束" },
      { label: "规则", value: "独立空间 · 不能出招或行动 · 不计为场上人数" });
  } else if (space?.kind === VACUUM_SPACE) {
    overview.space.push({ label: "遁入虚空", value: `第 ${space.expiresAtRound - 1} 轮轮末返回` },
      { label: "空间规则", value: "独立空间 · 仍计入场上人数 · 视为绝对真空 · 虚无提取再减 1 饼" });
  } else if (space) {
    overview.space.push({ label: space.name, value: `剩 ${Math.max(0, space.expiresAtRound - state.roundNumber)} 轮 · 第 ${space.expiresAtRound} 轮轮初返回` },
      { label: "规则", value: ["不计为场上人数", space.kind === "yuan_void" ? "不能出招 · 可以使用阶段技能" : "可以出招和使用技能",
        ...(space.cakeMultiplier > 1 ? [`积饼×${space.cakeMultiplier}`] : []),
        ...(space.kind === "dream_utopia" ? ["视为在梦中"] : [])].join(" · ") });
  } else {
    overview.space.push({ label: "主空间", value: excludedByTripleSeal(player) ?
      "三圣镇魂 · 不计为场上人数" : "计为场上人数 · 无持续时间限制" });
  }
  const bars = [...(player.bars ?? [])];
  for (const card of player.bigCards ?? []) {
    if (!publicOnly && bigCardHasAbility(card, ETERNAL_PROGRESS_ID) && !bars.some(({ id }) => id === eternalBarId(card.instanceId))) {
      bars.push({ id: eternalBarId(card.instanceId), sourceAbilityId: ETERNAL_PROGRESS_ID, kind: "progress", label: "静滞进度", value: 0 });
    }
  }
  for (const bar of bars) {
    const limit = bar.sourceAbilityId === ETERNAL_PROGRESS_ID ? 10 ** (eternalFieldCount(state) + 1) : bar.limit;
    overview.progressBars.push({ label: bar.label, value: limit === undefined ? String(bar.value) : `${bar.value}/${limit}`,
      ...(limit && limit > 0 ? { meter: { value: Math.min(bar.value, limit), limit } } : {}) });
  }
  for (const move of Object.values(player.eternalMoves ?? {})) {
    overview.continuations.push({ label: `刹那永恒 · ${getActionLabel(move.action)}`, value: move.startedTurn >= state.turnNumber ?
      "下回合开始 · 永久" : `第 ${state.turnNumber - move.startedTurn} 回合 · 永久` });
  }
  for (const buff of player.buffs) {
    if (buff.id === DIVINE_FLAME_ENABLED) {
      if (activeDivineFlame(player)) overview.longTerm.push({ label: "怒炎", value: "已开启 · 每回合初承受 1 点火系法伤" });
      continue;
    }
    if (buff.itemKind?.startsWith("swarm_item:")) continue;
    if (buff.id.startsWith("curtain_act:") || buff.id.startsWith("curtain_rebirth_batch:") ||
      buff.id.startsWith("curtain_reflect_used:") || publicOnly && (buff.id === CURTAIN_VEILS || buff.id === CURTAIN_REFLECT_PIERCE)) continue;
    if (buff.id === CURTAIN_VEILS || buff.id === CURTAIN_REFLECT_PIERCE) {
      overview.counted.push({ label: buff.name, value: `${buff.stacks} 份` });
      continue;
    }
    const start = buff.waveAttack?.firstTurn ?? buff.roarContinuation?.firstTurn ?? buff.continuationStartedTurn ??
      (buff.stateType === LIFE_CHANNEL_STATE && buff.expiresAtTurn ? buff.expiresAtTurn - 20 : undefined);
    if (start === undefined || buff.expiresAtTurn !== undefined && buff.expiresAtTurn <= state.turnNumber) continue;
    const total = buff.expiresAtTurn === undefined ? "永久" : `共 ${buff.expiresAtTurn - start} 回合`;
    const label = buff.roarContinuation ? `${buff.name.replace("·出招续发", "")} · ${getActionLabel(buff.roarContinuation.action)}` : buff.name;
    overview.continuations.push({ label, value: `${start > state.turnNumber ? "下回合开始" : `第 ${state.turnNumber - start + 1} 回合`} · ${total}` });
  }
  const cannonSteps = state.cannonDefenseSteps ?? state.cannonDefenses?.map(({ attack, next, dueTurn }) =>
    ({ sourceId: attack.sourceId, targetId: attack.targetId, attackName: attack.stats.name, next, dueTurn })) ?? [];
  for (const step of cannonSteps) {
    if (step.sourceId !== player.id) continue;
    const turn = step.next === "rebound" ? 3 : 2;
    overview.continuations.push({ label: step.attackName ?? "延续攻击", value: `${step.dueTurn > state.turnNumber ? "下回合为" : ""}第 ${turn}/3 回合` });
  }
  return overview;
}

function getCountedStatusLine(state: StatusContext, buff: BuffState): StatusLine | undefined {
  if (buff.freeMove) return { label: `免费${getActionLabel(buff.freeMove)}`, value: `剩 ${buff.stacks} 次` };
  if (buff.id === WUJIN_REBOUND_COUNT) return { label: "已出反弹", value: `${buff.stacks} 次` };
  const isGoldenShield = buff.id === "jin_zhong_zhao";
  const isVerdictGuard = buff.id.startsWith("verdict_guard:");
  if (!isCountedCombatStatus(buff)) return;
  if (buff.id === BUBBLE_VENGEANCE_STOCK || buff.id === BUBBLE_REBUILD_STOCK)
    return { label: buff.name, value: `${buff.stacks} 层${buff.id === BUBBLE_REBUILD_STOCK ? ' / 9' : ''}` };
  if (buff.stateType === BUBBLE_ENHANCE_STOCK)
    return { label: buff.name, value: `剩 ${buff.stacks} 次 · 攻等 ×${formatCombatValue(buff.resourceValue ?? [])}` };

  const opponentId = buff.sourcePlayerId ?? (isVerdictGuard ? buff.id.slice("verdict_guard:".length) : undefined);
  const opponent = state.players.find(({ id }) => id === opponentId);
  let label = isVerdictGuard ? "御秽裁决·免疫出招" : buff.name;
  if (opponent && (isGoldenShield || isVerdictGuard)) {
    if (isGoldenShield) label = "金钟罩";
    label += `（对 ${opponent.name}）`;
  }
  return { label, value: buff.infinite ? "无限次" : `剩 ${buff.stacks} 次` };
}

export function getVisibleStatusOverview(state: PublicGameState, playerId: PlayerId): StatusRows | undefined {
  const player = state.players.find(({ id, kind }) => id === playerId && kind !== "spectator");
  if (!player || state.phase === "lobby") return;

  if (playerId === state.viewerPlayerId) {
    const own = state.statusOverview;
    if (!own) return getStatusOverview(state, player);
    if (own.lives && own.field && own.special && own.counted && own.space && own.progressBars && own.continuations) return own;
    const { lives, defense, field, special, counted, items, space, progressBars, continuations } = getStatusRows(state, player);
    return { ...own, lives, defense, field, special, counted, items, space, progressBars, continuations };
  }

  const overview = getStatusRows(state, player, true);
  // Public skill lists do not include every copy or private use bonuses.
  for (const id of new Set(player.skills)) {
    const skill = getSkill(id);
    const used = player.buffs.find((buff) => buff.id === `skill_used:${id}`)?.stacks;
    if (skill?.play?.usesPerGame && used !== undefined) {
      overview.limited.push({ label: skill.name, value: `已用 ${used} 次` });
    }
  }
  return overview;
}

export function getStatusOverview(state: StatusContext, player: PlayerState): StatusOverview {
  const overview: StatusOverview = { ...getStatusRows(state, player), cardCounters: {} };
  if ((player.bigCards ?? []).some((card) => bigCardHasAbility(card, MOON_RITUAL_ID))) {
    const moon = player.buffs.find((buff) => buff.itemKind === MOON_ITEM && (buff.expiresAtRound ?? 0) > state.roundNumber);
    const cooldown = player.buffs.find((buff) => buff.id === MOON_RITUAL_COOLDOWN && (buff.expiresAtRound ?? 0) > state.roundNumber);
    const remaining = getPeriodicUses(player, MOON_RITUAL_ID, state.roundNumber, Number(!moon && !cooldown));
    overview.limited.push({ label: "月祭", value: remaining < 0 ? `剩 ${remaining} 次` :
      moon ? "月亮已存在" : cooldown ? "本轮已用" : remaining ? "本轮可用 1 次" : "本轮次数未恢复" });
  }
  const count = (id: string) => player.buffs.find((buff) => buff.id === id)?.stacks ?? 0;
  const buffs = player.buffs.filter((buff) => buff.stacks > 0);

  for (const delayed of state.pendingDragonFireBonuses ?? []) {
    if (delayed.playerId === player.id) overview.longTerm.push({
      label: "延迟增加烽火赤壁次数", value: `剩 ${Math.max(0, delayed.dueRound - state.roundNumber)} 轮 · 第 ${delayed.dueRound} 轮生效`
    });
  }

  for (const id of new Set(getOwnedSkillIds(player))) {
    const limit = getSkillUseLimit(player, id);
    if (limit === undefined) continue;
    const skill = getSkill(id)!;
    if (BIG_CARD_SKILLS[id]) {
      const cards = (player.bigCards ?? []).filter((card) => bigCardHasAbility(card, id));
      const used = cards.reduce((sum, card) => sum + (card.abilityUses?.[id] ?? 0), 0);
      const remaining = cards.some((card) => card.abilityUseBalanceAdjustments?.[id])
        ? cards.map((card) => getBigCardLimitedRemaining(card, id, skill.play?.usesPerGame ?? 0)).join("、") : limit;
      overview.limited.push({ label: skill.name, value: `剩 ${remaining} 次 · 已用 ${used} 次` });
    } else {
      const used = count(`skill_used:${id}`);
      const remaining = limit === Number.MAX_SAFE_INTEGER ? "无限" :
        getSkillUseBalanceAdjustment(player, id) ? limit - used : Math.max(0, limit - used);
      overview.limited.push({ label: skill.name, value: `剩 ${remaining} 次 · 已用 ${used} 次` });
    }
  }
  const destroyCopies = getActiveSkillCount(player, "1044");
  if (destroyCopies > 0) {
    const blocked = getDestroyPowerCooldownCount(player, state.roundNumber);
    const stillBlocked = getDestroyPowerCooldownCount(player, state.roundNumber + 1);
    const signed = getDestroyPowerRemainingUses(player, state.roundNumber);
    const waits = [...Array(Math.max(0, blocked - stillBlocked)).fill(1), ...Array(stillBlocked).fill(2)];
    overview.limited.push({ label: "毁灭之力", value: getActiveSkillCount(player, ASURA_INHERIT_ID) ? "不限次数 · 无冷却" :
      signed < 0 ? `剩 ${signed} 次` : `可用 ${Math.max(0, destroyCopies - blocked)}/${destroyCopies} 次` +
        (waits.length ? ` · 冷却 ${waits.join("、")} 轮` : "") });
  }
  const crownWaits = (player.bigCards ?? []).filter((card) => bigCardHasAbility(card, SUN_CROWN_ID)).map((card) => {
    const cooldown = buffs.find((buff) => buff.id === SUN_CROWN_COOLDOWN && buff.sourceBigCardInstanceId === card.instanceId);
    const ready = periodicUseReadyAt(player, periodicCardUseKey(SUN_CROWN_ID, card.instanceId), state.roundNumber,
      cooldown?.expiresAtRound ?? state.roundNumber);
    return Math.max(0, ready - state.roundNumber);
  });
  if (crownWaits.length) overview.limited.push({ label: "永恒冕冠",
    value: `可用 ${crownWaits.filter((rounds) => rounds === 0).length}/${crownWaits.length} 次 · ` +
      crownWaits.map((rounds) => rounds > 0 ? `冷却 ${rounds} 轮` : "4 轮限 1 次").join("、") });
  const flashSlots = getFlashFamilySlots(player, state.roundNumber);
  for (const [kind, label] of [["flash", "闪现"], ["huiyue", "辉月"]] as const) {
    const slots = flashSlots.filter((slot) => slot.kind === kind);
    if (slots.length) overview.limited.push({ label, value: `可用 ${slots.filter((slot) => slot.ready <= state.roundNumber).length}/${slots.length} 次 · ` +
      slots.map((slot) => slot.ready > state.roundNumber ? `冷却 ${slot.ready - state.roundNumber} 轮` : `${slot.duration} 轮限 1 次`).join("、") });
  }

  for (const card of player.bigCards ?? []) {
    const counters: Record<string, string[]> = {};
    if (bigCardHasAbility(card, MOUNTAIN_SEAL_ID)) {
      const ready = periodicUseReadyAt(player, periodicCardUseKey(MOUNTAIN_SEAL_ID, card.instanceId), state.roundNumber,
        card.mountainSealReadyRound ?? state.roundNumber);
      counters[MOUNTAIN_SEAL_ID] = [ready <= state.roundNumber ? "可触发" : `冷却剩 ${ready - state.roundNumber} 轮`];
    }
    if (bigCardHasAbility(card, TIME_REWIND_ID)) {
      const uses = card.abilityUses?.[TIME_REWIND_ID] ?? 0;
      counters[TIME_REWIND_ID] = [`已用 ${uses}/${2 + (card.abilityUseBonuses?.[TIME_REWIND_ID] ?? 0)} 次`];
    }
    if (bigCardHasAbility(card, UTOPIA_DREAM_ID)) counters[UTOPIA_DREAM_ID] = [`已获得 ${getDreamUnlockCount(player)}/4 项技能`];
    const show = (id: string, value: string) => {
      if (bigCardHasAbility(card, id)) (counters[id] ??= []).push(value);
    };
    const sharpBonus = count(CHEAT_SHARP_BONUS);
    show(CHEAT_SHARP_ID, `当前攻击 +${sharpBonus} · 等级 +${sharpBonus} · 剩 ${count(CHEAT_SHARP_STOCK)} 次法伤`);
    if (bigCardHasAbility(card, SEA_GOD_RETURN_ID)) {
      const wait = getSeaGodReturnReadyAt(player, state.roundNumber, card.instanceId) - state.roundNumber;
      const value = wait > 0 ? `冷却 ${wait} 轮` : "可用 · 3 轮限 1 次";
      show(SEA_GOD_RETURN_ID, value);
      overview.limited.push({ label: "一去不返", value });
    }
    show(DECAY_INHERIT_ID, card.decayUnlocked ? "已解锁后续效果" :
      `累计伤害 ${formatCombatValue(card.decayDamage ?? [])}/${DECAY_UNLOCK_DAMAGE}`);
    if (bigCardHasAbility(card, BLADE_INHERIT_ID)) {
      const { tier, remaining } = getBrokenBlade(card);
      const blade = BROKEN_BLADE_TIERS[tier]!;
      const value = blade.maxUses === null ? "无限次" : `剩 ${remaining}/${blade.maxUses} 次`;
      overview.limited.push({ label: blade.name, value: `${value} · 判定 ${blade.rank}（${JUDGMENT_RANK_LABELS[blade.rank]}）` });
      show(tier === 0 ? BLADE_INHERIT_ID : BLADE_MAINTENANCE_IDS[tier - 1]!, value);
    }
    const guardReady = card.deadRealmGuardReadyRound ?? state.roundNumber;
    show(DEAD_REALM_GUARD_ID, guardReady <= state.roundNumber ? "可触发" : `第 ${guardReady} 轮初恢复`);
    if (card.deadRealmUnlocked) show(DEAD_REALM_FALLBACK_ID, "整张卡已失去锁定技标签");
    show(YOUKAI_LAYERS_ID, `妖力沉淀 ${player.youkaiLayers ?? 0} 层`);
    show(YOUKAI_HALF_ID, `连续半妖化 ${player.youkaiHalfRounds ?? 0}/6 轮`);
    show(DIVINE_FLAME_ID, activeDivineFlame(player) ? "怒炎已开启" : "怒炎已关闭");
    for (const [id, insect] of [[SWARM_BEETLE_ID, "beetle"], [SWARM_FLY_ID, "fly"], [SWARM_HOPPER_ID, "hopper"], [SWARM_QUEEN_ID, "queen"]] as const)
      show(id, `持有 ${swarmInsectCount(player, insect)} 只${SWARM_INSECT_LABELS[insect]}`);
    if (card.cardId === "10542") {
      const elements = curtainRebirthElements(player);
      for (const [key, label] of [["fire", "火"], ["ice", "冰"], ["electric", "电"], ["poison", "毒"]] as const) {
        const copies = elements.filter((element) => element === key).length;
        if (copies) show(CURTAIN_REBIRTH_ID, `${label}系浴火重生 ${copies} 份`);
      }
      show(CURTAIN_ENCORE_ID, `已使用前四幕 ${CURTAIN_ACTS.filter((id) =>
        player.buffs.some((buff) => buff.id === `curtain_act:${card.instanceId}:${id}`)).length}/4`);
      show(CURTAIN_FINALE_ID, `持有光绮 ${curtainVeilCount(player)} 份`);
    }
    if (bigCardHasAbility(card, VACUUM_INHERIT_ID)) {
      const rank = vacuumCardRank(state, player, card.instanceId);
      show(VACUUM_INHERIT_ID, `虚无判定 ${rank}`);
      show(VACUUM_EXTRACT_ID, `额外虚无 ${extraVacuumUses(player, card.instanceId)} 次`);
      const progress = player.buffs.find((buff) => buff.id === `${VACUUM_PROGRESS}:${card.instanceId}`)?.stacks ?? 0;
      show(VACUUM_EXTRACT_ID, rank === "IX" ? "永久判定已达神装" : `升阶进度 ${progress}/4`);
      if (rank === "X") show(VACUUM_MAX_ID, "本回合判定 X");
    }
    const dance = player.buffs.find((buff) => buff.id === THORN_DURATION)?.stacks ?? 0;
    show(THORN_DANCE_ID, `时长倍率 ${dance ? `×10^${dance}` : "×1"}`);
    for (const opponent of state.players) {
      const shatter = loneStarUpgrade(player, opponent.id, LONE_STAR_PIERCE_ID);
      const rage = loneStarUpgrade(player, opponent.id, LONE_STAR_RAGE_ID);
      if (shatter > 0) show(LONE_STAR_PIERCE_ID, `对 ${opponent.name} 的击碎资格 ${shatter} 次`);
      if (rage > 0) show(LONE_STAR_RAGE_ID, `对 ${opponent.name} 的强化 ${rage} 次`);
    }
    show(ETERNAL_PROGRESS_ID, `静滞进度 ${eternalProgress(player, card.instanceId)}/${10 ** (eternalFieldCount(state) + 1)}`);
    show(ETERNAL_BIND_ID, player.eternalMoves?.[card.instanceId] ? "本局已绑定" : "尚未绑定");
    show(ETERNAL_THOUGHT_ID, `永续改招机会 ${eternalReplacementUses(player, card.instanceId)} 次`);
    show(SAKURA_FALL_ID, `当前樱 ${getElementAmount(player, SAKURA_ELEMENT)}/${getSakuraCapacity(player)}`);
    for (const bloom of buffs.filter((buff) => buff.stateType === SAKURA_GROWTH && buff.sourceBigCardInstanceId === card.instanceId))
      show(SAKURA_BLOOM_ID, `本次剩余增长额度 ${bloom.stacks}/18 樱`);
    if (bigCardHasAbility(card, SAKURA_RAIN_ID)) {
      const remaining = Math.max(0, (card.abilityUseBonuses?.[SAKURA_RAIN_ID] ?? 0) - (card.abilityUses?.[SAKURA_RAIN_ID] ?? 0));
      overview.limited.push({ label: "樱之雨", value: `剩 ${remaining} 次` });
    }
    show(WIND_INCOME_ID, `累计防御值进度 ${count(WIND_DEFENSE_PROGRESS)}/5`);
    show(SAND_ARROWS_ID, `万箭齐发伤害进度 ${count(SAND_DAMAGE_PROGRESS_PREFIX + SAND_ARROWS_ID)}/3`);
    show(SAND_INCOME_ID, `累计伤害进度 ${count(SAND_DAMAGE_PROGRESS_PREFIX + SAND_INCOME_ID)}/3`);
    for (const id of [SOUL_EXTINGUISH_ID, SOUL_SINK_ID]) {
      const limit = 2 + (card.abilityUseBonuses?.[id] ?? 0);
      show(id, `剩 ${Math.max(0, limit - (card.abilityUses?.[id] ?? 0))}/${limit} 次`);
    }
    show(ASURA_BLOOD_ID, `累计消耗血气 ${formatCombatValue(player.buffs.find((buff) => buff.id === ASURA_BLOOD_PROGRESS)?.resourceValue ?? [])}/5`);
    show(ASURA_RITUAL_UPGRADE_ID, player.buffs.some((buff) => buff.id === ASURA_RITUAL_UPGRADE) ? "祭天 · 消失" : "祭天 · 退游");
    if (bigCardHasAbility(card, TIANMANG_CONVERSION_ID) && getActiveSkillCount(player, SIX_STAR_ARRAY_ID)) {
      const [invulnerability, healing, reflection] = getSixStarArrayChances(player, getActiveSkillCount(player, TIANMANG_CONVERSION_ID) > 0);
      const odds = (chance: number) => `${Math.round(chance * 12)}/12`;
      show(TIANMANG_CONVERSION_ID, `无敌 ${odds(invulnerability)} · 转回血 ${odds(healing)} · 反弹 ${odds(reflection)}`);
    }
    for (const id of [TIANMANG_MIRROR_ID, TIANMANG_SAND_ID]) {
      if (!bigCardHasAbility(card, id)) continue;
      const limit = (getSkill(id)?.play?.usesPerGame ?? 0) + (card.abilityUseBonuses?.[id] ?? 0);
      show(id, `剩 ${Math.max(0, limit - (card.abilityUses?.[id] ?? 0))}/${limit} 次`);
    }
    show(HUNYAO_LIGHT_ID, `本局累计出日 ${count(`skill_used:${RI_SKILL_ID}`)} 重`);
    show(HUNYAO_RESET_ID, `本轮出饼积累 ${player.actionCakes ?? 0}/10`);
    show(XIELING_INHERIT_ID, `邪灵印记 ${formatCombatValue(getXielingMarkValue(player))}`);
    if (bigCardHasAbility(card, XIELING_ULTIMATE_ID)) {
      const ready = periodicUseReadyAt(player, periodicCardUseKey(XIELING_ULTIMATE_ID, card.instanceId), state.turnNumber,
        state.turnNumber + (card.xielingCooldown?.remaining ?? 0));
      const remaining = ready - state.turnNumber;
      const value = remaining ? `冷却 ${remaining} 回合` : "可用 · 50 回合限 1 次";
      show(XIELING_ULTIMATE_ID, value);
      overview.limited.push({ label: "邪灵无念", value });
    }
    for (const body of buffs.filter((buff) => buff.stateType === XIELING_BODY_STATE &&
      buff.sourceBigCardInstanceId === card.instanceId)) show(XIELING_BODY_ID, durationLabel(state, body));
    if (player.status === "dead" && player.defeatLevel === 1)
      show(JUEYING_DEATH_ID, `死亡期间全场实际回血 ${card.jueyingDeathHealing ?? 0}/10`);
    if (player.status === "dead" && card.nineFateReturnRound !== undefined)
      show(NINE_FATE, `第 ${card.nineFateReturnRound} 轮起可自动恢复`);
    if (bigCardHasAbility(card, NINE_COLD)) {
      const value = `本回合剩 ${coldLightUses(card, state.turnNumber)}/${coldLightLimit(card)} 次`;
      show(NINE_COLD, value);
      overview.limited.push({ label: "一点寒光万丈芒", value });
    }
    show(NINE_GROWTH, `累计承受劫难法伤 ${card.nineTribulationWounds ?? 0} 次`);
    for (const [id, layers] of Object.entries(card.nineTribulationMisses ?? {}))
      show(NINE_LAND, `${state.players.find((target) => target.id === id)?.name ?? id} · 累计 ${layers} 层`);
    for (const harvest of buffs.filter((buff) => buff.stateType === JUEYING_HARVEST)) {
      if (harvest.expiresAtRound === state.roundNumber + 1)
        show(JUEYING_DEATH_ID, `复活首轮已收回血 ${harvest.jueyingHarvestHealing ?? 0} · 轮末获得 ${Math.floor((harvest.jueyingHarvestHealing ?? 0) / 4)} 次逆转`);
      else show(JUEYING_DEATH_ID, "下一轮开始夺取回血");
    }
    if (player.hunyaoAwakened) for (const id of [CHASE_LIGHT_ID, CHASE_SHADOW_ID, CHASE_SOUL_ID]) show(id, "概率已提升至 100%");
    show(JIHAN_DAMAGE_GROWTH_ID, `冰系反击法伤 ${(card.jihanDamage ?? 0) >= 100 ? "无限" : 1 + (card.jihanDamage ?? 0)}`);
    show(JIHAN_FREEZE_GROWTH_ID, `冰封 ${(card.jihanBlocks ?? 0) >= 10 ? "无限" : 2 + 2 * (card.jihanBlocks ?? 0)} 回合`);
    show(JIHAN_SEAL_GROWTH_ID, `封锁 ${(card.jihanSeals ?? 0) >= 10 ? "无限" : 1 + (card.jihanSeals ?? 0)} 回合`);
    show(KUISHI_ID, card.openingCopyAvailable && state.activeTimingPhase === "opening_action" ? "开局复制可用" : "开局复制不可用");
    show(SPIRIT_GUIDANCE_ID, `伤害进度 ${card.guidanceDamageRemainder ?? 0}/5 · 回血进度 ${card.guidanceHealingRemainder ?? 0}/6 · 治愈术额外次数 ${card.guidanceHealingUnlimited ? "无限" : card.guidanceHealingUses ?? 0}`);
    show(CHARITY_GRANT_ID, `本卡治愈术剩余 ${remainingCharityHealingUses(card)} 次`);
    show(CHARITY_QUICK_ID, `本轮已用 ${card.charityQuickUses?.round === state.roundNumber ? card.charityQuickUses.count : 0}/${CHARITY_QUICK_LIMIT} 次`);
    if (bigCardHasAbility(card, CHARITY_LINK_ID)) show(CHARITY_LINK_ID,
      `治愈术可恢复至 ${["", "普通死亡", "退游", "消失"][charityHealingRank(player, state.roundNumber)]}`);
    show(STORE_DAMAGE_ID, `已储存 ${getStoredDamages(player).length} 份伤害`);
    show(VERDICT_ACTION_ID, `免费裁决 ${count("free_imperial_verdict")} 次`);
    const { wins = 0, losses = 0, streak = 0 } = card.verdictProgress ?? {};
    show(VERDICT_REWARD_ID, `${wins} 胜 / ${losses} 负 · ${streak === 0 ? "无连胜连败" : `${Math.abs(streak)} 连${streak > 0 ? "胜" : "败"}`}`);
    if (bigCardHasAbility(card, GOD_KING_RULES_ID)) {
      const { wins: x, losses: y } = getGodKingTotals(card);
      const progress = card.godKingProgress;
      show(GOD_KING_RULES_ID, `${x} 胜 / ${y} 负`);
      if (y) {
        show(GOD_KING_RULES_ID, `每 ${y} 轮回 6 血 · 攻击 ${progress?.attacks ?? 0} 次，每 ${y ** 2} 次强化 · 未命中 ${progress?.misses ?? 0} 次，每 ${y} 次获审判`);
      }
      if (x) {
        show(GOD_KING_RULES_ID, `死亡 ${progress?.deaths ?? 0} 次，每 ${x} 次复活为 15 血 · 受伤 ${progress?.wounds ?? 0} 次，每 ${x ** 2} 次获审判 · 退游 ${progress?.retirements ?? 0} 次，每 ${x ** 2} 次免疫`);
      }
      if (progress) show(GOD_KING_RULES_ID, `每轮第 ${y + 1} 回合初 +${x + 1} 饼${progress.lastCakeRewardRound === state.roundNumber ? "（本轮已结算）" : ""} · 第 ${x + 1} 轮圣 ×${(y + 1) ** 2}`);
    }
    if (bigCardHasAbility(card, GOD_KING_JUDGMENT_ID)) {
      const remaining = Math.max(0, (card.abilityUseBonuses?.[GOD_KING_JUDGMENT_ID] ?? 0) -
        (card.abilityUses?.[GOD_KING_JUDGMENT_ID] ?? 0));
      overview.limited.push({ label: "审判", value: `剩 ${remaining} 次` });
      if (card.onlyAbilityId === GOD_KING_RULES_ID) show(GOD_KING_RULES_ID, `审判剩 ${remaining} 次`);
    }
    for (const buff of buffs) {
      if (buff.id.startsWith("verdict_guard:")) {
        show(VERDICT_GUARD_ID, `${state.players.find(({ id }) => id === buff.sourcePlayerId)?.name ?? "该玩家"} · 剩 ${buff.stacks} 次免疫`);
      }
      if (buff.sourceBigCardInstanceId === card.instanceId && buff.sourceAbilityId === FENSHI_FLAMES_ID) {
        show(FENSHI_FLAMES_ID, durationLabel(state, buff));
      }
    }
    const response = card.junengResponse;
    if (response) show(JUNENG_RESPONSE_ID, card.junengDisabled ? "本轮停用" :
      response.started ? `有利数值 ×${response.multiplier} · 不利数值 ÷${response.divisor}` :
        `第 ${response.disabledRound} 轮停用`);
    for (const delayed of state.pendingDragonFireBonuses ?? []) {
      if (delayed.playerId === player.id && delayed.cardInstanceId === card.instanceId) {
        show(DRAGON_DOMINION_ID, `第 ${delayed.dueRound} 轮增加烽火赤壁次数`);
      }
    }
    for (const id of Object.keys(BIG_CARD_SKILLS)) {
      const limit = BIG_CARD_SKILLS[id]?.play?.usesPerGame;
      if (limit !== undefined) {
        const remaining = getBigCardLimitedRemaining(card, id, limit);
        show(id, `剩 ${card.abilityUseBalanceAdjustments?.[id] ? remaining : Math.max(0, remaining)} 次`);
      }
    }
    show(GAME_SWITCH_LIVES_ID, `累计赢得 ${card.gameSwitchWins ?? 0} 场`);
    show(PURPLE_FORESIGHT_ID, `剩余 ${purpleForesightUses(state.roundNumber, card)} 次`);
    for (const mode of Object.keys(GAME_SWITCH_MODES) as GameSwitchMode[]) {
      show(GAME_SWITCH_VICTORY_ID, `${GAME_SWITCH_MODES[mode]} · ${card.gameSwitchWinsByMode?.[mode] ?? 0}/3 胜`);
    }
    if (bigCardHasAbility(card, KAIGE_LIVES_ID)) {
      const stage = player.kaigeLife?.cardInstanceId === card.instanceId ? player.kaigeLife.stage : undefined;
      const remaining = (player.spareLives ?? []).filter((life) => getLifeEffects(life).some((effect) =>
        effect.kind === "kaige" && effect.cardInstanceId === card.instanceId)).length;
      counters[KAIGE_LIVES_ID] = [stage ? `当前命：${KAIGE_STAGE_NAMES[stage - 1]} · ${stage}/7` : "当前未处于此卡的命序",
        `剩余 ${remaining} 条多余命`];
    }
    if (Object.keys(counters).length) overview.cardCounters[card.instanceId] = counters;
  }
  return overview;
}
