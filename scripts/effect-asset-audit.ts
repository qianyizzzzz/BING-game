import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../packages/shared/src/skills/registry";

interface SkillEffectAssetAudit {
  complete: boolean;
  existing: string[];
  missing: string[];
  skillId: string;
  skillName: string;
}

const effectRoot = path.resolve("apps/client/public/assets/effects");
const requiredFiles = [
  "keyframe-01.png",
  "keyframe-02.png",
  "keyframe-03.png",
  "keyframe-04.png",
  "poster.png",
  "effect.webm",
  "effect.mp4"
];
const jsonOnly = process.argv.includes("--json");

const audits: SkillEffectAssetAudit[] = getAllSkills()
  .sort((a, b) => a.sourceRow - b.sourceRow || a.id.localeCompare(b.id))
  .map((skill) => {
    const existing = requiredFiles.filter((fileName) =>
      fs.existsSync(path.join(effectRoot, skill.id, fileName))
    );
    const missing = requiredFiles.filter(
      (fileName) => !fs.existsSync(path.join(effectRoot, skill.id, fileName))
    );
    return {
      complete: missing.length === 0,
      existing,
      missing,
      skillId: skill.id,
      skillName: skill.name
    };
  });

const completeCount = audits.filter((audit) => audit.complete).length;
const missingCount = audits.length - completeCount;
const summary = {
  completeSkills: completeCount,
  effectRoot,
  missingByFile: Object.fromEntries(
    requiredFiles.map((fileName) => [
      fileName,
      audits.filter((audit) => audit.missing.includes(fileName)).length
    ])
  ),
  missingSkills: missingCount,
  requiredFiles,
  totalMissingFiles: audits.reduce((sum, audit) => sum + audit.missing.length, 0),
  totalSkills: audits.length
};

console.log(JSON.stringify(jsonOnly ? { ...summary, audits } : summary, null, 2));

if (missingCount > 0 && !jsonOnly) {
  console.log("\nMissing effect assets:");
  for (const audit of audits.filter((item) => !item.complete)) {
    console.log(`- ${audit.skillId} ${audit.skillName}: ${audit.missing.join(", ")}`);
  }
  process.exitCode = 1;
}
