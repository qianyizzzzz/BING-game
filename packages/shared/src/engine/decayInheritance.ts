import { clearFusionMarks, reconcileSkillFusions } from "../skills/fusion";
import type { GameState, PlayerState } from "../types";
import { grantDecayMarks } from "./decayHp";
import { ANNIHILATION_FUSION_ID, ANNIHILATION_MARK, DECAY_CONVERSION_ID, DECAY_MARK } from "./decayIds";
import { createBaseEvent, getActiveSkillCount, revealSkillOnTrigger } from "./gameFactory";
import { pruneRemovedSkillKnowledge, removeFusionTrees, removeSkillInstanceAt } from "./skillInventory";
import { shareSpace } from "./spaces";

const BLOOD_SORROW_ID = "1011";

/** The conversion consumes existing copies and is also applied to copies gained later. */
export function settleDecayConversions(state: GameState): void {
  const owners = state.players.filter((player) => player.kind !== "spectator" && player.status === "alive" &&
    getActiveSkillCount(player, DECAY_CONVERSION_ID));
  if (!owners.length) return;
  for (const target of state.players) {
    if (target.kind === "spectator") continue;
    const nearby = owners.filter((owner) => shareSpace(owner, target));
    if (!nearby.length) continue;
    const ownConversion = nearby.includes(target);
    const converted = new Set<PlayerState>();
    let bloodSorrow = 0;
    for (let index = target.skills.length - 1; index >= 0; index--) {
      if (target.skills[index] !== BLOOD_SORROW_ID) continue;
      removeSkillInstanceAt(target, index);
      bloodSorrow++;
    }
    if (bloodSorrow) {
      grantDecayMarks(target, ownConversion ? ANNIHILATION_MARK : DECAY_MARK, bloodSorrow);
      converted.add(ownConversion ? target : nearby[0]!);
    }
    const recipients = nearby.filter((owner) => owner.id !== target.id);
    const fusions = recipients.length ? (target.skillFusions ?? []).filter((fusion) => fusion.skillId === ANNIHILATION_FUSION_ID) : [];
    if (fusions.length) {
      for (const id of removeFusionTrees(target, fusions)) clearFusionMarks(target, id);
      for (const recipient of recipients) {
        grantDecayMarks(recipient, ANNIHILATION_MARK, fusions.length);
        converted.add(recipient);
      }
    }
    if (!converted.size) continue;
    reconcileSkillFusions(target);
    pruneRemovedSkillKnowledge(state, target);
    for (const owner of converted) revealSkillOnTrigger(state, owner.id, DECAY_CONVERSION_ID, "破败之道转化技能");
    state.eventLog.push({ ...createBaseEvent(state, "system"), type: "system",
      message: `破败之道转化了 ${target.name} 的${[
        bloodSorrow ? `${bloodSorrow} 份血之哀` : undefined,
        fusions.length ? `${fusions.length} 份寂灭` : undefined
      ].filter(Boolean).join("和")}` });
  }
}
