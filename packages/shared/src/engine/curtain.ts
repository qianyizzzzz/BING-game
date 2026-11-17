import type { AttackElement, DamageEvent, DefenseTag, GameState, PlayerState, SkillId } from "../types";
import { canGainStatus } from "./karmaSong";
import { bigCardHasAbility } from "../bigCards/abilities";
import { getBigCard } from "../bigCards/catalog";
import { getFusionRecipe, getRootFusions, reconcileSkillFusions } from "../skills/fusion";
import { getSkill } from "../skills/registry";
import { BIG_REVIVAL_SKILLS } from "../skills/revivalSkillIds";
import { canDiscardBigCard, detachBigCardAbility } from "./bigCards";
import { appendSkillInstances, ensureFusionSkillInventory, ensureSkillInventory, removeSkillInstanceAt } from "./skillInventory";
import { createBaseEvent, getActiveSkillCount } from "./gameFactory";
import { registerStateDefinition } from "./effectCategories";
import { CURTAIN_ACTS, CURTAIN_DARK_STATE, CURTAIN_LIGHT_BOOST, CURTAIN_MARK, CURTAIN_REBIRTH_ID, CURTAIN_REFLECT_PIERCE,
  CURTAIN_VEIL_ID, CURTAIN_VEILS } from "./curtainIds";

type RebirthElement = Exclude<AttackElement, "physical">;
const rebirthElements = new Set<AttackElement>(["fire", "ice", "electric", "poison"]);
const elementNames: Record<RebirthElement, string> = { fire: "火", ice: "冰", electric: "电", poison: "毒" };
const rebirthSkill = "1064";
registerStateDefinition({ id: CURTAIN_DARK_STATE, name: "高潮的永暗·光明系失效", categories: [] });
registerStateDefinition({ id: CURTAIN_LIGHT_BOOST, name: "高潮的永暗·有利数值×2（待接入）", categories: [] });

export function curtainVeilCount(player: Pick<PlayerState, "buffs">): number {
  return player.buffs.find((buff) => buff.id === CURTAIN_VEILS)?.stacks ?? 0;
}

export function changeCurtainVeils(player: PlayerState, delta: number): void {
  const current = player.buffs.find((buff) => buff.id === CURTAIN_VEILS);
  const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, (current?.stacks ?? 0) + delta));
  if (current) {
    if (count) current.stacks = count;
    else player.buffs = player.buffs.filter((buff) => buff !== current);
  } else if (count) player.buffs.push({ id: CURTAIN_VEILS, name: "光绮", stacks: count, uncleansable: true });
}

export function curtainSoundMarks(player: Pick<PlayerState, "buffs"> | undefined): number {
  return player?.buffs.find((buff) => buff.id === CURTAIN_MARK)?.stacks ?? 0;
}

export function addCurtainSoundMark(player: PlayerState): void {
  if (!canGainStatus(player)) return;
  const current = player.buffs.find((buff) => buff.id === CURTAIN_MARK);
  if (current) current.stacks = Math.min(3, current.stacks + 1);
  else player.buffs.push({ id: CURTAIN_MARK, name: "音刻印记", stacks: 1 });
}

function fatalElements(events: readonly DamageEvent[]): Set<RebirthElement> {
  return new Set(events.flatMap((event) => [...event.elements ?? [], ...event.element ? [event.element] : [],
    ...event.traits?.includes("fire") ? ["fire" as const] : []])
    .filter((element): element is RebirthElement => rebirthElements.has(element)));
}

export function grantCurtainRebirth(state: GameState, player: PlayerState, events: DamageEvent[]): void {
  const copies = getActiveSkillCount(player, CURTAIN_REBIRTH_ID);
  if (!copies || !events.length) return;
  const id = `curtain_rebirth_batch:${events.map((event) => event.id).sort().join(":")}`;
  if (player.buffs.some((buff) => buff.id === id)) return;
  const elements = fatalElements(events);
  if (!elements.size) return;
  player.buffs.push({ id, name: "谢幕光绮·本批致死已授予", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
  ensureSkillInventory(player);
  for (const element of elements) {
    const start = player.skillInventory!.length;
    appendSkillInstances(player, Array<SkillId>(copies).fill(rebirthSkill));
    for (const instance of player.skillInventory!.slice(start)) instance.curtainRebirthElement = element;
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: player.id,
      message: `${player.name} 获得 ${copies} 份${elementNames[element]}系浴火重生` });
  }
}

export function curtainRebirthElements(player: Pick<PlayerState, "skillInventory">): RebirthElement[] {
  return (player.skillInventory ?? []).flatMap((item) => item.skillId === rebirthSkill && item.curtainRebirthElement ? [item.curtainRebirthElement] : []);
}

export function revivalByRebirth(player: PlayerState, events: DamageEvent[]): "free" | "paid" | undefined {
  const active = getActiveSkillCount(player, rebirthSkill);
  if (!active) return undefined;
  const elements = fatalElements(events);
  const typed = curtainRebirthElements(player);
  const generic = active > typed.length;
  if (typed.some((element) => elements.has(element)) || generic && elements.has("fire")) return "free";
  if (generic) return "paid";
  return undefined;
}

function isRevivalSkill(id: SkillId): boolean {
  return BIG_REVIVAL_SKILLS.has(id) || Boolean(getSkill(id)?.typeTags.includes("复活技"));
}

export function revivalSources(player: PlayerState) {
  const fusions = getRootFusions(player).filter((fusion) => isRevivalSkill(fusion.skillId));
  const discardedMaterials = new Set(fusions.flatMap((fusion) => fusion.materialInstanceIds ?? []));
  const small = player.skills.flatMap((id, index) => {
    if (!isRevivalSkill(id)) return [];
    const instanceId = player.skillInventory?.[index]?.instanceId;
    if (instanceId && discardedMaterials.has(instanceId)) return [];
    const cover = instanceId ? player.skillFusions?.find((fusion) => fusion.materialInstanceIds?.includes(instanceId)) : undefined;
    if (cover && !getFusionRecipe(cover.skillId)?.retainedMaterialIds.includes(id)) return [];
    return [index];
  });
  const big = (player.bigCards ?? []).flatMap((card) => (getBigCard(card.cardId)?.abilities ?? []).flatMap(({ id }) =>
    id !== CURTAIN_VEIL_ID && isRevivalSkill(id) && bigCardHasAbility(card, id) ? [{ card, id }] : []));
  return { fusions, small, big, discardedMaterials };
}

export function curtainDiscardQuote(player: PlayerState): { count: number; veils: number; blocked: boolean } {
  const { fusions, small, big } = revivalSources(player);
  const other = fusions.length + small.length + big.length;
  const veils = curtainVeilCount(player);
  return { count: Math.min(Number.MAX_SAFE_INTEGER, other + veils), veils,
    blocked: Boolean(other && player.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_discard")) ||
      big.some(({ card }) => !canDiscardBigCard(player, card))) };
}

export function discardCurtainRevivalSkills(player: PlayerState): ReturnType<typeof curtainDiscardQuote> {
  ensureFusionSkillInventory(player);
  const quote = curtainDiscardQuote(player);
  if (quote.blocked) return quote;
  const { fusions, small, big, discardedMaterials } = revivalSources(player);
  const selected = new Set(small);
  for (let index = player.skills.length - 1; index >= 0; index--) {
    if (selected.has(index) || discardedMaterials.has(player.skillInventory![index]!.instanceId)) removeSkillInstanceAt(player, index);
  }
  const fusionIds = new Set(fusions.map(({ id }) => id));
  if (player.skillFusions) player.skillFusions = player.skillFusions.filter(({ id }) => !fusionIds.has(id));
  for (const { card, id } of big) detachBigCardAbility(player, card, id);
  reconcileSkillFusions(player);
  changeCurtainVeils(player, -quote.veils);
  return quote;
}

export function curtainFinaleDefense(veils: number): DefenseTag {
  return veils >= 1000 ? "unblockable" : veils >= 75 ? "rebound" : "any";
}

export function recordCurtainAct(player: PlayerState, cardId: string, skillId: SkillId): void {
  if (!(CURTAIN_ACTS as readonly string[]).includes(skillId)) return;
  const id = `curtain_act:${cardId}:${skillId}`;
  if (!player.buffs.some((buff) => buff.id === id)) player.buffs.push({ id, name: "谢幕光绮·已演出", stacks: 1, uncleansable: true });
}

export function curtainEncoreReady(player: Pick<PlayerState, "buffs">, cardId: string | undefined): boolean {
  return Boolean(cardId && CURTAIN_ACTS.every((skillId) => player.buffs.some((buff) => buff.id === `curtain_act:${cardId}:${skillId}`)));
}

export function applyCurtainEncore(player: PlayerState, cardId: string): void {
  const card = player.bigCards?.find((entry) => entry.instanceId === cardId);
  if (!card) return;
  for (const id of CURTAIN_ACTS) detachBigCardAbility(player, card, id);
  const veils = curtainVeilCount(player);
  changeCurtainVeils(player, veils ** 2 - veils);
  const charge = player.buffs.find((buff) => buff.id === CURTAIN_REFLECT_PIERCE);
  if (charge) charge.stacks++;
  else player.buffs.push({ id: CURTAIN_REFLECT_PIERCE, name: "尾声的明星·下一次攻击无视反弹", stacks: 1 });
}

export function applyCurtainDarkness(state: GameState): void {
  const ends = state.roundNumber + 3;
  for (const player of state.players) {
    if (!canGainStatus(player)) continue;
    const current = player.buffs.find((buff) => buff.stateType === CURTAIN_DARK_STATE);
    if (current) current.expiresAtRound = Math.max(current.expiresAtRound ?? 0, ends);
    else player.buffs.push({ id: CURTAIN_DARK_STATE, stateType: CURTAIN_DARK_STATE, name: "高潮的永暗·光明系失效", stacks: 1, expiresAtRound: ends });
    const boost = player.buffs.find((buff) => buff.stateType === CURTAIN_LIGHT_BOOST);
    if (boost) boost.startsAtRound = ends;
    else player.buffs.push({ id: CURTAIN_LIGHT_BOOST, stateType: CURTAIN_LIGHT_BOOST, name: "高潮的永暗·光明系有利数值×2（待接入）",
      stacks: 1, startsAtRound: ends });
  }
}

export function markCurtainReflection(state: GameState, player: PlayerState, index: number): void {
  const id = `curtain_reflect_used:${state.turnNumber}:${index}`;
  if (player.buffs.some((buff) => buff.id === id)) return;
  const charge = player.buffs.find((buff) => buff.id === CURTAIN_REFLECT_PIERCE);
  if (!charge) return;
  if (--charge.stacks === 0) player.buffs = player.buffs.filter((buff) => buff !== charge);
  player.buffs.push({ id, name: "尾声的明星·本次攻击无视反弹", stacks: 1, expiresAtTurn: state.turnNumber + 1 });
}
