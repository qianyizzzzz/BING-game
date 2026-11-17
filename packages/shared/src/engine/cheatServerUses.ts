import { BIG_CARD_SKILLS, getOwnedBigAbilityIds } from "../bigCards/abilities";
import { getPermanentSkillUseLimit, getSkill } from "../skills/registry";
import type { PlayerState, SkillId } from "../types";
import { CHEAT_TRANSFER_ID } from "./cheatServerIds";
import {
  getBigCardLimitedRemaining, getSkillUseBalanceAdjustment, setBigCardUseBalanceAdjustment, setSkillUseBalanceAdjustment
} from "./limitedUseBalance";

export interface CheatServerUseOption {
  id: string;
  label: string;
  skillId: SkillId;
  bigCardInstanceId?: string;
  remaining: number;
}

function finiteLimitedTechnique(id: SkillId): { label: string; base: number } | undefined {
  if (id === CHEAT_TRANSFER_ID) return undefined;
  const skill = getSkill(id);
  const base = skill?.play?.usesPerGame;
  return skill?.implemented && skill.typeTags.includes("限定技") && base !== undefined && base < Number.MAX_SAFE_INTEGER &&
    Number.isSafeInteger(base) ? { label: skill.name, base } : undefined;
}

/** Only count permanent uses of owned techniques. Temporary allowances keep their own ledgers. */
export function getCheatServerUseOptions(player: PlayerState): CheatServerUseOption[] {
  const smallSkillIds = new Set([
    ...player.skills.filter((_, index) => !player.skillInventory?.[index]?.convertedMaterial),
    ...(player.skillFusions ?? []).map(({ skillId }) => skillId)
  ]);
  const smallOptions = [...smallSkillIds].flatMap((skillId): CheatServerUseOption[] => {
    const skill = finiteLimitedTechnique(skillId);
    if (!skill || BIG_CARD_SKILLS[skillId]) return [];
    const limit = getPermanentSkillUseLimit(player, skillId);
    if (limit === undefined || !Number.isSafeInteger(limit) || limit >= Number.MAX_SAFE_INTEGER) return [];
    const used = player.buffs.find(({ id }) => id === `skill_used:${skillId}`)?.stacks ?? 0;
    const remaining = limit - used + getSkillUseBalanceAdjustment(player, skillId);
    return [{ id: skillId, label: skill.label, skillId, remaining }];
  });

  return [...smallOptions, ...(player.bigCards ?? []).flatMap((card, index) =>
    getOwnedBigAbilityIds({ bigCards: [card] }).flatMap((skillId): CheatServerUseOption[] => {
      const skill = finiteLimitedTechnique(skillId);
      if (!skill) return [];
      const remaining = getBigCardLimitedRemaining(card, skillId, skill.base);
      if (!Number.isSafeInteger(remaining) || remaining >= Number.MAX_SAFE_INTEGER) return [];
      return [{ id: `${skillId}:${card.instanceId}`, label: `${skill.label}（大卡 ${index + 1}）`,
        skillId, bigCardInstanceId: card.instanceId, remaining }];
    }))];
}

function findUseTransfer(player: PlayerState, fromId: unknown, toId: unknown) {
  if (typeof fromId !== "string" || typeof toId !== "string" || fromId === toId) return undefined;
  const options = getCheatServerUseOptions(player);
  const donor = options.find(({ id, remaining }) => id === fromId && remaining > 0);
  const recipient = options.find(({ id }) => id === toId);
  return donor && recipient ? { donor, recipient } : undefined;
}

export function validateCheatServerUseTransfer(player: PlayerState, fromId: unknown, toId: unknown): boolean {
  return Boolean(findUseTransfer(player, fromId, toId));
}

function adjustUse(player: PlayerState, option: CheatServerUseOption, amount: -1 | 1): void {
  const { skillId, bigCardInstanceId } = option;
  if (bigCardInstanceId) {
    const card = player.bigCards?.find(({ instanceId }) => instanceId === bigCardInstanceId)!;
    setBigCardUseBalanceAdjustment(card, skillId, (card.abilityUseBalanceAdjustments?.[skillId] ?? 0) + amount);
  } else {
    setSkillUseBalanceAdjustment(player, skillId, getSkillUseBalanceAdjustment(player, skillId) + amount, "Something for nothing 的次数变更");
  }
}

export function transferCheatServerUse(player: PlayerState, fromId: unknown, toId: unknown): boolean {
  const transfer = findUseTransfer(player, fromId, toId);
  if (!transfer) return false;
  adjustUse(player, transfer.donor, -1);
  adjustUse(player, transfer.recipient, 1);
  return true;
}
