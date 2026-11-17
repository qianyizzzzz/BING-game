import { GameState, INFINITE_DAMAGE, PlayerId, PlayerState } from "../types";
import { createBaseEvent, findPlayer, getActiveSkillCount } from "./gameFactory";
import { isUnaffectedByNegativeStatuses, registerStateDefinition, SHIELD_STATE_TYPE, SKILL_DISABLED_BUFF_PREFIX } from "./effectCategories";
import { getActiveFusionCount } from "../skills/fusion";
import { isSkillIgnored } from "./skillIgnore";
import { hasTianlieMight, withTianlieFusionsIgnored } from "./tianlie";
import { XIELING_REFLECT_STATE } from "./xieling";
import { canAffectAcrossSpace } from "./spaces";
import { hasKaigeAbility } from "./kaige";
import { KAIGE_ETERNAL_ID } from "../bigCards/abilities";
import { tianmangSkillImmunity } from "./tianmang";
import { hurricaneRecipients } from "./ultimateWind";
import { DEMON_LEGION_LOCK } from "./demonIds";
import { SWORD_ARRAY_NO_CAKE_STATE, SWORD_ARRAY_PI_STATE } from "./swordArrayIds";
import { MOON_SHADOW_LOCK } from "./moonCombat";
import { SEA_GOD_WAVES_STATE } from "./seaGodIds";
import { TIAN_YE_REBOUND_LOCK } from "./tianyeIds";
import { CHEAT_NOGLUES_STATE } from "./cheatServerIds";
import { SANCTUARY_GATE_STATE } from "./sanctuaryIds";
import { STAR_MOON_SLOW } from "./starMoonIds";
import { tianShaIgnoresNeighbor, tianShaReflection } from "./tianSha";
import { yiyuanDodgesEffect } from "./yiyuan";
import { YIYUAN_CHANGE_STATE } from "./yiyuanIds";
import { FIVE_ELEMENTS_LIGHTNING } from "./fiveElementsIds";
import { fiveElementsIceBlocks } from "./fiveElements";

/** Applied restrictions belong here, including persistent marks consumed on a later trigger. */
export interface NegativeStatusDefinition {
  id: string;
  name: string;
}

const definitions = new Map<string, NegativeStatusDefinition>();
export const NEGATIVE_STATUS_IMMUNITY_BUFF_ID = "temp_negative_status_immunity";

/** Register future negative-status categories before routing their application through this module. */
export function registerNegativeStatus(definition: NegativeStatusDefinition): void {
  if (!definition.id || definitions.has(definition.id)) {
    throw new Error(`不良状态类别无效或重复：${definition.id}`);
  }
  definitions.set(definition.id, { ...definition });
  registerStateDefinition({ ...definition, categories: ["negative"] });
}

export function getNegativeStatusDefinitions(): NegativeStatusDefinition[] {
  return [...definitions.values()].map((definition) => ({ ...definition }));
}

for (const definition of [
  { id: "frozen", name: "冰冻" },
  { id: "beast_fear", name: "恐惧" },
  { id: DEMON_LEGION_LOCK, name: "军团打击·无法出招" },
  { id: MOON_SHADOW_LOCK, name: "月影·无法出招" },
  { id: SEA_GOD_WAVES_STATE, name: "无定风波·出招无效" },
  { id: SANCTUARY_GATE_STATE, name: "圣堂之门·对指定玩家出招无效" },
  { id: STAR_MOON_SLOW, name: "不熄月莹·积饼减速" },
  { id: TIAN_YE_REBOUND_LOCK, name: "绝坠之翼·无法反弹" },
  { id: "shadow_shriek_action_lock", name: "风唳·无法出招" },
  { id: SWORD_ARRAY_PI_STATE, name: "玄空·圆周" },
  { id: SWORD_ARRAY_NO_CAKE_STATE, name: "幻梦·归虚" },
  { id: "skill_disabled", name: "技能失效" },
  { id: CHEAT_NOGLUES_STATE, name: "Noglues·技能失效" },
  { id: "paralysis", name: "麻痹" },
  { id: "triple_talisman:fire", name: "火之灵符" },
  { id: "triple_talisman:water", name: "水之灵符" },
  { id: "triple_talisman:wood", name: "木之灵符" },
  { id: "stunned", name: "眩晕" },
  { id: "sleep", name: "睡眠" },
  { id: "burning", name: "烧伤" },
  { id: "limited_disabled", name: "限定技失效" },
  { id: "control_disabled", name: "控制技失效" },
  { id: "mitigation_disabled", name: "减伤与回避失效" },
  { id: "fenjin", name: "焚烬" },
  { id: "star_group_attack_disabled", name: "群攻技能攻击失效" },
  { id: "sand_vortex", name: "流沙旋涡" },
  { id: "temporary_skill_absorption", name: "暂时吸取技能" },
  { id: "purple_eye_temporary_skill_loss", name: "入微·暂时失去子技能" }
]) registerNegativeStatus(definition);

export function hasNegativeStatusImmunity(player: PlayerState, turnNumber: number, roundNumber?: number): boolean {
  return getActiveSkillCount(player, FIVE_ELEMENTS_LIGHTNING) > 0 ||
    player.buffs.some((buff) => buff.stateType === "dragon_dominion_protection") || hasKaigeAbility(player, KAIGE_ETERNAL_ID) ||
    getActiveFusionCount(player, "天人合一") > 0 || player.buffs.some((buff) =>
    buff.id === NEGATIVE_STATUS_IMMUNITY_BUFF_ID && (buff.expiresAtTurn ?? -1) >= turnNumber &&
      (!buff.sourceAbilityId || !isSkillIgnored(player, buff.sourceAbilityId)) ||
    buff.stateType === SHIELD_STATE_TYPE && buff.stacks > 0 && buff.grantsNegativeImmunityWhileHeld &&
      (roundNumber === undefined || buff.expiresAtRound === undefined || buff.expiresAtRound > roundNumber));
}

/** Guard the entire mutation, including refresh/replacement, so immunity never cleanses an old status. */
import { deferStarWheelStatus } from "./starWheel";
import { canGainStatus } from "./karmaSong";

export function applyNegativeStatus(
  state: GameState,
  targetId: PlayerId,
  statusId: string,
  apply: (target: PlayerState, appliedBy?: PlayerId) => void,
  sourceId?: PlayerId,
  hurricaneShared = false,
  bypassSkillImmunity = false,
  skipStarWheel = false,
  handlesDuration = false
): boolean {
  const definition = definitions.get(statusId);
  if (!definition) throw new Error(`尚未注册的不良状态：${statusId}`);
  const target = findPlayer(state, targetId);
  if (fiveElementsIceBlocks(state, target, sourceId, statusId)) return false;
  if (!target || tianShaIgnoresNeighbor(state, target, sourceId) || tianmangSkillImmunity(target, sourceId, state.turnNumber)) return false;
  if (!hurricaneShared && ["frozen", "burning", "paralysis", "stunned"].includes(statusId)) {
    for (const linked of hurricaneRecipients(state, targetId))
      applyNegativeStatus(state, linked.id, statusId, apply, sourceId, true, bypassSkillImmunity);
  }
  if (yiyuanDodgesEffect(state, target, sourceId, definition.name, true)) return false;
  const reflects = (player: PlayerState, otherId: PlayerId | undefined) => tianShaReflection(player, state.turnNumber, otherId) ||
    player.buffs.some((buff) => (buff.stateType === XIELING_REFLECT_STATE || buff.stateType === YIYUAN_CHANGE_STATE) &&
    (buff.expiresAtTurn ?? 0) > state.turnNumber && (!buff.sourceAbilityId || !isSkillIgnored(player, buff.sourceAbilityId)));
  const source = sourceId && sourceId !== targetId ? findPlayer(state, sourceId) : undefined;
  const reflected = Boolean(source && canAffectAcrossSpace(state, source.id, target.id) && reflects(target, source.id));
  const recipient = reflected ? source! : target;
  const appliedBy = reflected ? target.id : sourceId;
  if (reflected && yiyuanDodgesEffect(state, recipient, appliedBy, definition.name, true)) return false;
  if (reflected && fiveElementsIceBlocks(state, recipient, appliedBy, statusId)) return false;
  if (tianmangSkillImmunity(recipient, appliedBy, state.turnNumber)) return false;
  if (reflected) {
    const canceled = reflects(recipient, target.id);
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: canceled ? `${target.name} 与 ${recipient.name} 互相反弹${definition.name}，双方均未获得此状态` :
        `${target.name} 将${definition.name}反弹给 ${recipient.name}` });
    if (canceled) return false;
  }
  if (!canGainStatus(recipient)) {
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${recipient.name} 因失落之歌无法获得${definition.name}` });
    return false;
  }
  const isImmune = () => hasNegativeStatusImmunity(recipient, state.turnNumber, state.roundNumber);
  const immune = !bypassSkillImmunity && (hasTianlieMight(findPlayer(state, appliedBy ?? "")) ? withTianlieFusionsIgnored(recipient, isImmune) : isImmune());
  const unaffected = isUnaffectedByNegativeStatuses(recipient);
  const ignored = appliedBy && recipient.buffs.some((buff) => buff.stateType === "star_negative_guard" &&
    buff.sourcePlayerId === appliedBy && (buff.expiresAtRound ?? 0) > state.roundNumber);
  if (immune || unaffected || ignored) {
    const result = unaffected ? `不受新增的${definition.name}影响` :
      immune ? `免疫了新增的${definition.name}` : `无视了新增的${definition.name}`;
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `${recipient.name} ${result}，已有不良状态保持不变` });
    return false;
  }
  const applyStatus = (player: PlayerState, by?: PlayerId) => {
    if (handlesDuration || !getActiveSkillCount(by ? findPlayer(state, by) : undefined, FIVE_ELEMENTS_LIGHTNING)) {
      apply(player, by);
      return;
    }
    const before = new Map(player.buffs.map((buff) => [buff, { turn: buff.expiresAtTurn, round: buff.expiresAtRound }]));
    apply(player, by);
    for (const buff of player.buffs) {
      const old = before.get(buff);
      if (buff.expiresAtTurn !== undefined && buff.expiresAtTurn !== old?.turn && Number.isFinite(buff.expiresAtTurn))
        buff.expiresAtTurn += Math.max(0, buff.expiresAtTurn - Math.max(state.turnNumber, buff.startsAtTurn ?? 0));
      if (buff.expiresAtRound !== undefined && buff.expiresAtRound !== old?.round && Number.isFinite(buff.expiresAtRound))
        buff.expiresAtRound += Math.max(0, buff.expiresAtRound - Math.max(state.roundNumber, buff.startsAtRound ?? 0));
      if (!old && buff.expiresAtRound === undefined && buff.id.startsWith(SKILL_DISABLED_BUFF_PREFIX)) {
        const endRound = Number(buff.id.slice(SKILL_DISABLED_BUFF_PREFIX.length));
        if (endRound > state.roundNumber) buff.id = `${SKILL_DISABLED_BUFF_PREFIX}${2 * endRound - state.roundNumber}`;
      }
    }
  };
  if (!skipStarWheel && deferStarWheelStatus(state, recipient, statusId, definition.name, appliedBy,
    statusId === "temporary_skill_absorption" ? undefined : applyStatus, bypassSkillImmunity)) return !reflected;
  applyStatus(recipient, appliedBy);
  return !reflected;
}

export function applyFrozenStatus(state: GameState, targetId: PlayerId, baseDuration: number, unit: "turn" | "round", sourceId?: PlayerId): boolean {
  return applyNegativeStatus(state, targetId, "frozen", (target, appliedBy) => {
    const duration = baseDuration * (getActiveSkillCount(appliedBy ? findPlayer(state, appliedBy) : undefined, FIVE_ELEMENTS_LIGHTNING) ? 2 : 1);
    if (target.buffs.some((buff) => buff.id === "frozen" && buff.infinite)) return;
    if (duration >= INFINITE_DAMAGE) {
      const previous = target.buffs.find((buff) => buff.id === "frozen" && (buff.expiresAtTurn ?? Infinity) >= state.turnNumber &&
        (buff.expiresAtRound ?? Infinity) > state.roundNumber);
      target.buffs = target.buffs.filter((buff) => buff.id !== "frozen");
      target.buffs.push({ id: "frozen", name: "冰冻", stacks: INFINITE_DAMAGE, infinite: true,
        moveBlockedFromTurn: previous ? previous.moveBlockedFromTurn ?? state.turnNumber : state.turnNumber + 1 });
      return;
    }
    const boundary = unit === "turn" ? "expiresAtTurn" : "expiresAtRound";
    const expiry = (unit === "turn" ? state.turnNumber : state.roundNumber) + duration;
    const existing = target.buffs.find((buff) => buff.id === "frozen" && buff[boundary] !== undefined);
    if (existing) {
      existing.stacks = Math.max(existing.stacks, duration);
      existing[boundary] = Math.max(existing[boundary] ?? 0, expiry);
    } else {
      target.buffs.push({ id: "frozen", name: "冰冻", stacks: duration, [boundary]: expiry,
        moveBlockedFromTurn: state.turnNumber + 1 });
    }
  }, sourceId, false, false, false, true);
}
