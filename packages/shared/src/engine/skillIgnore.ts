import type { SkillId } from "../types";
import { isEmptyCitySkillSuspended } from "./illusionRules";
import { hasPig, PIG_ID } from "./beastTraits";
import { isSkillIgnorable } from "./skillIgnoreRules";

export { isSkillIgnorable } from "./skillIgnoreRules";

export type SkillIgnore = { all: true } | { skillId: SkillId } | { skillCounts: Readonly<Record<SkillId, number>> } |
  { fusionSkillIds: readonly SkillId[] };

const masks = new WeakMap<object, SkillIgnore[]>();

export function appendSkillIgnoreCounts(mask: SkillIgnore | undefined, more: Readonly<Record<SkillId, number>>): SkillIgnore | undefined {
  if (!Object.keys(more).length || mask && "all" in mask) return mask;
  const counts = mask && "skillCounts" in mask ? { ...mask.skillCounts } : {};
  if (mask && "skillId" in mask) counts[mask.skillId] = 1;
  if (mask && "fusionSkillIds" in mask) for (const id of mask.fusionSkillIds) counts[id] = Number.MAX_SAFE_INTEGER;
  for (const [id, count] of Object.entries(more)) counts[id] = Math.min(Number.MAX_SAFE_INTEGER, (counts[id] ?? 0) + count);
  return { skillCounts: counts };
}

export function ignoresSkill(mask: SkillIgnore | undefined, skillId: SkillId): boolean {
  return Boolean(mask && isSkillIgnorable(skillId) && ("all" in mask ||
    ("skillId" in mask ? mask.skillId === skillId : "skillCounts" in mask ? (mask.skillCounts[skillId] ?? 0) > 0 :
      mask.fusionSkillIds.includes(skillId))));
}

export function isSkillIgnored(owner: object | undefined, skillId: SkillId): boolean {
  return ignoredSkillCopies(owner, skillId) > 0;
}

export function ignoredSkillCopies(owner: object | undefined, skillId: SkillId): number {
  if (skillId !== PIG_ID && hasPig(owner as Parameters<typeof hasPig>[0])) return Infinity;
  if (isEmptyCitySkillSuspended(owner, skillId)) return Infinity;
  const active = owner && masks.get(owner);
  if (!active || !isSkillIgnorable(skillId)) return 0;
  if (active.some((mask) => "all" in mask || "fusionSkillIds" in mask && mask.fusionSkillIds.includes(skillId))) return Infinity;
  const single = active.some((mask) => "skillId" in mask && mask.skillId === skillId) ? 1 : 0;
  return active.reduce((total, mask) => total + ("skillCounts" in mask ? mask.skillCounts[skillId] ?? 0 : 0), single);
}

export function ignoresFusionFamily(owner: object, skillId: SkillId): boolean {
  return isSkillIgnorable(skillId) &&
    (masks.get(owner)?.some((mask) => "fusionSkillIds" in mask && mask.fusionSkillIds.includes(skillId)) ?? false);
}

/** The mask belongs only to this effect and never alters the target's actual inventory. */
export function withSkillsIgnored<T>(owner: object | undefined, mask: SkillIgnore | undefined, effect: () => T): T {
  if (!owner || !mask) return effect();
  const active = masks.get(owner) ?? [];
  active.push(mask);
  masks.set(owner, active);
  try {
    return effect();
  } finally {
    active.pop();
    if (!active.length) masks.delete(owner);
  }
}
