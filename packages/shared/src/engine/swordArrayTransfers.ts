import { getBigCard } from "../bigCards/catalog";
import { reconcileSkillFusions } from "../skills/fusion";
import { getSkill } from "../skills/registry";
import type { GameState, PlayerState } from "../types";
import { canReceiveBigCard, grantFreshBigCard, loseBigCardAbility, pruneLostSkillKnowledge, transferDevouredBigCard } from "./bigCards";
import { revivalSources } from "./curtain";
import { effectCategoryIsSuppressed, registerEffectCategories } from "./effectCategories";
import { createBaseEvent } from "./gameFactory";
import { addSpareLife, takeNewestSpareLife } from "./kaige";
import { portableLife } from "./lifeEffects";
import { grantInitializedSkill } from "./skillAcquisition";
import { ensureFusionSkillInventory, removeSkillInstanceAt } from "./skillInventory";
import { SWORD_ARRAY_DEVOUR_ID, SWORD_ARRAY_LIFE_ID } from "./swordArrayIds";

registerEffectCategories(SWORD_ARRAY_LIFE_ID, ["life_absorption", "skill_absorption"]);
registerEffectCategories(SWORD_ARRAY_DEVOUR_ID, ["skill_devour"]);

export function stealSwordArrayRevivalAndLives(state: GameState, source: PlayerState, target: PlayerState): boolean {
  if (source.id === target.id) return false;
  let changed = false;
  const immune = (category: "life_absorption" | "life_loss" | "skill_loss") =>
    target.buffs.some((buff) => buff.immuneEffectCategories?.includes(category));
  if (!effectCategoryIsSuppressed(source, "life_absorption") && !immune("life_absorption") && !immune("life_loss")) {
    let spare = takeNewestSpareLife(target);
    while (spare) {
      addSpareLife(source, portableLife(target, spare), state);
      changed = true;
      spare = takeNewestSpareLife(target);
    }
  }
  if (effectCategoryIsSuppressed(source, "skill_absorption") || immune("skill_loss") ||
    !canReceiveBigCard(source, "skill_absorption") || !canReceiveBigCard(target, "skill_absorption")) return changed;

  ensureFusionSkillInventory(target);
  const { fusions, small, big, discardedMaterials } = revivalSources(target);
  const takenSmall = new Set(small);
  const freshSmall = small.map((index) => target.skills[index]!);
  for (let index = target.skills.length - 1; index >= 0; index--) {
    if (takenSmall.has(index) || discardedMaterials.has(target.skillInventory![index]!.instanceId))
      removeSkillInstanceAt(target, index);
  }
  reconcileSkillFusions(target);
  for (const id of freshSmall) grantInitializedSkill(state, source.id, id, "长生·分魂", false);
  for (const fusion of fusions)
    grantInitializedSkill(state, source.id, fusion.skillId, "长生·分魂", false, fusion.materialSkillIds);
  let takenBig = false;
  for (const { card, id } of big) {
    if (!loseBigCardAbility(target, card, id)) continue;
    grantFreshBigCard(state, source, card, { onlyAbilityId: id });
    takenBig = true;
  }
  if (freshSmall.length || fusions.length || takenBig) {
    pruneLostSkillKnowledge(state, target);
    changed = true;
  }
  return changed;
}

export function devourSwordArrayCard(state: GameState, source: PlayerState, target: PlayerState): boolean {
  if (source.id === target.id || effectCategoryIsSuppressed(source, "skill_devour")) return false;
  const eligible = target.bigCards?.filter((card) => !card.onlyAbilityId && getBigCard(card.cardId)) ?? [];
  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  if (!chosen || !transferDevouredBigCard(state, source, target, chosen)) return false;
  state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: source.id,
    message: `${source.name} 吞噬了 ${target.name} 的大卡 ${getBigCard(chosen.cardId)?.name ?? chosen.cardId}` });
  return true;
}
