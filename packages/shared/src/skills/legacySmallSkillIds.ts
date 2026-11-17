import { LEGACY_SMALL_SKILL_IDS } from "./generatedSmallSkillAliases";

const legacySkillToken = /\b(?:skill_\d+_\d+|huo_yan_dao|zhu_que_yu_shan)\b/g;
const legacyIdsByCanonical = new Map(Object.entries(LEGACY_SMALL_SKILL_IDS).map(([legacy, canonical]) => [canonical, legacy]));

export function canonicalSmallSkillId(id: string): string {
  return Object.hasOwn(LEGACY_SMALL_SKILL_IDS, id) ? LEGACY_SMALL_SKILL_IDS[id]! : id;
}

export function legacySmallSkillId(id: string): string {
  return legacyIdsByCanonical.get(id) ?? id;
}

function translateSkillTokens(value: string): string {
  return value.replace(legacySkillToken, canonicalSmallSkillId);
}

/** Read older replays, training samples and policy keys without rewriting their files. */
export function readSkillRecordJson<T>(json: string): T {
  const record: unknown = JSON.parse(json);
  return (json.search(legacySkillToken) >= 0 ? migrateRecord(record) : record) as T;
}

function migrateRecord(value: unknown, field = ""): unknown {
  if (typeof value === "string") {
    if (field === "id") return translateSkillTokens(value);
    if (field === "skills" || field === "attackId" || /(?:skill|ability)ids?$/i.test(field)) {
      return canonicalSmallSkillId(value);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => migrateRecord(item, field));
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    const canonical = translateSkillTokens(key);
    // If both forms exist, the already migrated entry takes precedence.
    if (canonical !== key && Object.hasOwn(value, canonical)) return [];
    return [[canonical, migrateRecord(child, key)]];
  }));
}
