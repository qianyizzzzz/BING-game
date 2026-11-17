import type { SkillId } from "../types";
import { BUBBLE_FATE } from "./bubbleDreamIds";
import { YIYUAN_GOD } from "./yiyuanIds";

const unignorable = new Set<SkillId>([BUBBLE_FATE, YIYUAN_GOD]);

export function registerUnignorableSkill(skillId: SkillId): void {
  unignorable.add(skillId);
}

export function isSkillIgnorable(skillId: SkillId): boolean {
  return !unignorable.has(skillId);
}
