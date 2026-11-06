import type { BuffState, GameState, PlayerState } from "../types";
import {
  BIG_CARD_SKILLS, CHASE_LIGHT_ID, CHASE_SHADOW_ID, CHASE_SOUL_ID, DRAGON_DOMINION_ID,
  FENSHI_FLAMES_ID, HUNYAO_LIGHT_ID, HUNYAO_RESET_ID, JIHAN_DAMAGE_GROWTH_ID,
  JIHAN_FREEZE_GROWTH_ID, JIHAN_SEAL_GROWTH_ID, JUNENG_RESPONSE_ID, KUISHI_ID,
  RI_SKILL_ID, SPIRIT_GUIDANCE_ID, STORE_DAMAGE_ID, VERDICT_GUARD_ID, VERDICT_REWARD_ID, VERDICT_ACTION_ID, bigCardHasAbility
} from "../bigCards/abilities";
import { getSkill, getSkillUseLimit } from "../skills/registry";
import {
  getDestroyPowerCooldownCount, getFlashFamilySlots, getFusionRecipe, getFusionSkillId, getOwnedSkillIds, isFusionActive
} from "../skills/fusion";
import { formatCombatValue } from "./combatValues";
import { isSkillSuppressedByBuff, SHIELD_STATE_TYPE, SKILL_DISABLED_BUFF_PREFIX, stateHasCategory } from "./effectCategories";
import { getActiveSkillCount } from "./gameFactory";
import { getDefenseTotal } from "./starDragon";

export interface StatusLine {
  label: string;
  value: string;
}

export interface StatusOverview {
  elements: StatusLine[];
  defense: StatusLine[];
  longTerm: StatusLine[];
  limited: StatusLine[];
  marks: StatusLine[];
  items: StatusLine[];
  cardCounters: Record<string, Record<string, string[]>>;
}

export function getTraumaDueRound(player: PlayerState, buff: BuffState): number | undefined {
  const match = /^trauma_converge:(\d+)(?::fusion:.+)?$/.exec(buff.id);
  if (!match) return undefined;
  const fusion = player.skillFusions?.find((item) => item.id === buff.sourceFusionId && isFusionActive(player, item));
  const soulRepair = fusion && getFusionRecipe(fusion.skillId)?.skill.name === "灵魂修复";
  // Decomposing restores the original deadline rather than restarting the wait.
  return Number(match[1]) - (soulRepair ? 2 : 0);
}

function durationLabel(state: GameState, buff: BuffState): string {
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

export function getStatusOverview(state: GameState, player: PlayerState): StatusOverview {
  const overview: StatusOverview = {
    elements: [], defense: [{ label: "防御值", value: formatCombatValue(getDefenseTotal(player)) }],
    longTerm: [], limited: [], marks: [], items: [], cardCounters: {}
  };
  const count = (id: string) => player.buffs.find((buff) => buff.id === id)?.stacks ?? 0;
  const quantity = (buff: BuffState) => buff.infinite ? "无限" : String(buff.stacks);
  const shield = (buff: BuffState) => buff.stateType === SHIELD_STATE_TYPE ||
    ["temp_shield_normal", "temp_shield_skill", "jin_zhong_zhao"].includes(buff.id);
  const buffs = player.buffs.filter((buff) => buff.stacks > 0);
  const shields = buffs.filter(shield);
  overview.defense.push({ label: "护盾", value: shields.some((buff) => buff.infinite) ?
    "无限" : String(shields.reduce((total, buff) => total + buff.stacks, 0)) });
  for (const buff of buffs) {
    if (buff.id.startsWith("element:")) {
      overview.elements.push({ label: buff.name, value: quantity(buff) });
    } else if (shield(buff)) {
      overview.defense.push({ label: buff.name, value: quantity(buff) });
    } else if (buff.fusionMarkKind || buff.id.startsWith("ice_rain:") ||
      (buff.name.includes("印记") && !buff.id.includes("spent"))) {
      overview.marks.push({ label: buff.name, value: quantity(buff) });
    } else {
      const dueRound = getTraumaDueRound(player, buff);
      if (dueRound !== undefined) {
        overview.longTerm.push({ label: dueRound < Number(buff.id.split(":")[1]) ? "灵魂修复" : buff.name,
          value: `第 ${dueRound} 轮轮末恢复 · 剩 ${Math.max(0, dueRound - state.roundNumber)} 轮 · ${quantity(buff)} 层` });
      } else if (stateHasCategory(buff, "positive") || stateHasCategory(buff, "negative") ||
        buff.stateType || isSkillSuppressedByBuff(buff.id) || buff.id.startsWith("sealed_skill:") ||
        (!buff.id.includes("cooldown") && (buff.expiresAtRound !== undefined || buff.expiresAtTurn !== undefined) &&
          !/^(skill_used:|skill_guess_failed|skip_action_windows|star_rage_spent)/.test(buff.id))) {
        overview.longTerm.push({ label: buff.name, value: durationLabel(state, buff) });
      }
    }
  }
  for (const delayed of state.pendingDragonFireBonuses ?? []) {
    if (delayed.playerId === player.id) overview.longTerm.push({
      label: "延迟增加烽火赤壁次数", value: `剩 ${Math.max(0, delayed.dueRound - state.roundNumber)} 轮 · 第 ${delayed.dueRound} 轮生效`
    });
  }
  const space = player.spaceId ? state.smallSpaces?.[player.spaceId] : undefined;
  if (space) overview.longTerm.push({
    label: space.name, value: `第 ${space.expiresAtRound} 轮返回 · 剩 ${Math.max(0, space.expiresAtRound - state.roundNumber)} 轮`
  });

  for (const id of new Set(getOwnedSkillIds(player))) {
    const limit = getSkillUseLimit(player, id);
    if (limit === undefined) continue;
    const skill = getSkill(id)!;
    if (BIG_CARD_SKILLS[id]) {
      const used = (player.bigCards ?? []).reduce((sum, card) =>
        sum + (bigCardHasAbility(card, id) ? card.abilityUses?.[id] ?? 0 : 0), 0);
      overview.limited.push({ label: skill.name, value: `剩 ${limit} 次 · 已用 ${used} 次` });
    } else {
      const used = count(`skill_used:${id}`);
      const remaining = limit === Number.MAX_SAFE_INTEGER ? "无限" : Math.max(0, limit - used);
      overview.limited.push({ label: skill.name, value: `剩 ${remaining} 次 · 已用 ${used} 次` });
    }
  }
  const destroyCopies = getActiveSkillCount(player, "skill_45_30424");
  if (destroyCopies > 0) {
    const blocked = getDestroyPowerCooldownCount(player, state.roundNumber);
    const stillBlocked = getDestroyPowerCooldownCount(player, state.roundNumber + 1);
    const waits = [...Array(Math.max(0, blocked - stillBlocked)).fill(1), ...Array(stillBlocked).fill(2)];
    overview.limited.push({ label: "毁灭之力", value: `可用 ${Math.max(0, destroyCopies - blocked)}/${destroyCopies} 次` +
      (waits.length ? ` · 冷却 ${waits.join("、")} 轮` : "") });
  }
  const flashSlots = getFlashFamilySlots(player, state.roundNumber);
  for (const [kind, label] of [["flash", "闪现"], ["huiyue", "辉月"]] as const) {
    const slots = flashSlots.filter((slot) => slot.kind === kind);
    if (slots.length) overview.limited.push({ label, value: `可用 ${slots.filter((slot) => slot.ready <= state.roundNumber).length}/${slots.length} 次 · ` +
      slots.map((slot) => slot.ready > state.roundNumber ? `冷却 ${slot.ready - state.roundNumber} 轮` : `${slot.duration} 轮限 1 次`).join("、") });
  }

  for (const card of player.bigCards ?? []) {
    const counters: Record<string, string[]> = {};
    const show = (id: string, value: string) => {
      if (bigCardHasAbility(card, id)) (counters[id] ??= []).push(value);
    };
    show(HUNYAO_LIGHT_ID, `本局累计出日 ${count(`skill_used:${RI_SKILL_ID}`)} 重`);
    show(HUNYAO_RESET_ID, `本轮出饼积累 ${player.actionCakes ?? 0}/10`);
    if (player.hunyaoAwakened) for (const id of [CHASE_LIGHT_ID, CHASE_SHADOW_ID, CHASE_SOUL_ID]) show(id, "概率已提升至 100%");
    show(JIHAN_DAMAGE_GROWTH_ID, `冰系反击法伤 ${(card.jihanDamage ?? 0) >= 100 ? "无限" : 1 + (card.jihanDamage ?? 0)}`);
    show(JIHAN_FREEZE_GROWTH_ID, `冰封 ${(card.jihanBlocks ?? 0) >= 10 ? "无限" : 2 + 2 * (card.jihanBlocks ?? 0)} 回合`);
    show(JIHAN_SEAL_GROWTH_ID, `封锁 ${(card.jihanSeals ?? 0) >= 10 ? "无限" : 1 + (card.jihanSeals ?? 0)} 回合`);
    show(KUISHI_ID, card.openingCopyAvailable && state.activeTimingPhase === "opening_action" ? "开局复制可用" : "开局复制不可用");
    show(SPIRIT_GUIDANCE_ID, `伤害进度 ${card.guidanceDamageRemainder ?? 0}/5 · 回血进度 ${card.guidanceHealingRemainder ?? 0}/6 · 治愈术额外次数 ${card.guidanceHealingUnlimited ? "无限" : card.guidanceHealingUses ?? 0}`);
    show(STORE_DAMAGE_ID, `已储存 ${player.storedDamages?.length ?? 0} 份伤害`);
    show(VERDICT_ACTION_ID, `免费裁决 ${count("free_imperial_verdict")} 次`);
    const { wins = 0, losses = 0, streak = 0 } = card.verdictProgress ?? {};
    show(VERDICT_REWARD_ID, `${wins} 胜 / ${losses} 负 · ${streak === 0 ? "无连胜连败" : `${Math.abs(streak)} 连${streak > 0 ? "胜" : "败"}`}`);
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
      if (limit !== undefined) show(id, `剩 ${Math.max(0, limit + (card.abilityUseBonuses?.[id] ?? 0) - (card.abilityUses?.[id] ?? 0))} 次`);
    }
    if (Object.keys(counters).length) overview.cardCounters[card.instanceId] = counters;
  }
  return overview;
}
