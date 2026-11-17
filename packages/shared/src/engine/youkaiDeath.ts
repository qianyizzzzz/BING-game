import type { DamageEvent, GameState, PlayerId, PlayerState, SkillId } from "../types";
import { reconcileSkillFusions } from "../skills/fusion";
import { getSkill } from "../skills/registry";
import { canReceiveBigCard, grantFreshBigCard, loseBigCardAbility } from "./bigCards";
import { changeCurtainVeils, curtainVeilCount, revivalSources } from "./curtain";
import { CURTAIN_VEIL_ID } from "./curtainIds";
import { effectCategoryIsSuppressed, registerEffectCategories } from "./effectCategories";
import { createBaseEvent, findPlayer, getActiveSkillCount } from "./gameFactory";
import { grantInitializedSkill } from "./skillAcquisition";
import { ensureFusionSkillInventory, pruneRemovedSkillKnowledge, removeFusionTrees, removeSkillInstanceAt } from "./skillInventory";
import { addYoukaiLayers } from "./youkai";
import { YOUKAI_SOUL_ID } from "./youkaiIds";

registerEffectCategories(YOUKAI_SOUL_ID, ["skill_absorption"]);

function absorbRevivalSkill(state: GameState, recipient: PlayerState, owner: PlayerState): SkillId | undefined {
  if (effectCategoryIsSuppressed(recipient, "skill_absorption") ||
    !canReceiveBigCard(recipient, "skill_absorption") || !canReceiveBigCard(recipient, "skill_gain") ||
    !canReceiveBigCard(owner, "skill_absorption") ||
    owner.buffs.some((buff) => buff.immuneEffectCategories?.includes("skill_loss"))) return;

  ensureFusionSkillInventory(owner);
  const { fusions, small, big } = revivalSources(owner);
  const veils = curtainVeilCount(owner);
  const count = fusions.length + small.length + big.length + veils;
  if (!count) return;
  let chosen = Math.floor(Math.random() * count);
  const fusion = fusions[chosen];
  if (fusion) {
    removeFusionTrees(owner, [fusion]);
    reconcileSkillFusions(owner);
    pruneRemovedSkillKnowledge(state, owner);
    grantInitializedSkill(state, recipient.id, fusion.skillId, "夺魄吸纳", false, fusion.materialSkillIds);
    return fusion.skillId;
  }
  chosen -= fusions.length;
  const index = small[chosen];
  if (index !== undefined) {
    const instance = owner.skillInventory![index]!;
    const { skillId, curtainRebirthElement } = instance;
    removeSkillInstanceAt(owner, index);
    reconcileSkillFusions(owner);
    pruneRemovedSkillKnowledge(state, owner);
    grantInitializedSkill(state, recipient.id, skillId, "夺魄吸纳", false);
    const added = recipient.skillInventory?.at(-1);
    if (curtainRebirthElement && added) added.curtainRebirthElement = curtainRebirthElement;
    return skillId;
  }
  const ability = big[chosen - small.length];
  if (ability) {
    if (!loseBigCardAbility(owner, ability.card, ability.id)) return;
    pruneRemovedSkillKnowledge(state, owner);
    grantFreshBigCard(state, recipient, ability.card, { onlyAbilityId: ability.id });
    return ability.id;
  }
  if (veils) {
    changeCurtainVeils(owner, -1);
    changeCurtainVeils(recipient, 1);
    return CURTAIN_VEIL_ID;
  }
}

export function rewardYoukaiOrdinaryKill(state: GameState, target: PlayerState, events: readonly DamageEvent[], directSourceId?: PlayerId): void {
  const killers = new Set(events.flatMap(({ sourceId }) => sourceId ? [sourceId] : []));
  if (directSourceId) killers.add(directSourceId);
  killers.delete(target.id);
  for (const id of killers) {
    const source = findPlayer(state, id);
    const copies = getActiveSkillCount(source, YOUKAI_SOUL_ID);
    if (!source || !copies) continue;
    addYoukaiLayers(source, 5 * copies);
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: source.id,
      message: `${source.name} 的夺魄吸纳使妖力沉淀增加 ${5 * copies} 层` });
    for (let copy = 0; copy < copies; copy++) {
      const skillId = absorbRevivalSkill(state, source, target);
      if (!skillId) break;
      state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system", privatePlayerId: source.id,
        message: `${source.name} 从 ${target.name} 吸取了复活技 ${getSkill(skillId)?.name ?? skillId}` });
    }
  }
}
