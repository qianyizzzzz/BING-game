import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../packages/shared/src/skills/registry";

const effectRoot = path.resolve("apps/client/public/assets/effects");
const statusPath = path.resolve("docs/EFFECT_ASSET_STATUS.md");
const requiredFiles = [
  "keyframe-01.png",
  "keyframe-02.png",
  "keyframe-03.png",
  "keyframe-04.png",
  "poster.png",
  "effect.webm",
  "effect.mp4"
] as const;
const requiredSampleSkillId = "skill_78_18866";
const failures: string[] = [];

const audits = getAllSkills()
  .sort((a, b) => a.sourceRow - b.sourceRow || a.id.localeCompare(b.id))
  .map((skill) => {
    const missing: string[] = [];
    const invalid: string[] = [];
    for (const fileName of requiredFiles) {
      const filePath = path.join(effectRoot, skill.id, fileName);
      if (!fs.existsSync(filePath)) {
        missing.push(fileName);
        continue;
      }
      const reason = validateAsset(fileName, filePath);
      if (reason) {
        invalid.push(`${fileName} (${reason})`);
      }
    }
    return {
      complete: missing.length === 0 && invalid.length === 0,
      invalid,
      missing,
      skillId: skill.id,
      skillName: skill.name
    };
  });

const completeSkills = audits.filter((audit) => audit.complete);
const sample = audits.find((audit) => audit.skillId === requiredSampleSkillId);
const invalidAssets = audits.reduce((sum, audit) => sum + audit.invalid.length, 0);
const totalMissingFiles = audits.reduce((sum, audit) => sum + audit.missing.length, 0);
const missingSkills = audits.filter((audit) => audit.missing.length > 0).length;

if (audits.length !== 120) {
  failures.push(`expected 120 skills, got ${audits.length}`);
}

if (!sample?.complete) {
  failures.push(`${requiredSampleSkillId} sample effect must remain complete`);
}

if (completeSkills.length < 1) {
  failures.push("at least one complete effect sample is required");
}

if (invalidAssets > 0) {
  for (const audit of audits.filter((item) => item.invalid.length > 0)) {
    failures.push(`${audit.skillId} ${audit.skillName}: invalid ${audit.invalid.join(", ")}`);
  }
}

if (totalMissingFiles === 0) {
  failures.push("stage audit expected missing files until the full paid animation batch is complete");
}

auditStatusDoc({
  completeSkills: completeSkills.length,
  missingSkills,
  totalMissingFiles,
  totalSkills: audits.length
});

if (failures.length > 0) {
  console.error("effect asset stage audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `effect asset stage audit passed: ${completeSkills.length}/${audits.length} complete, ${totalMissingFiles} files missing`
);

function auditStatusDoc(summary: {
  completeSkills: number;
  missingSkills: number;
  totalMissingFiles: number;
  totalSkills: number;
}): void {
  const status = fs.readFileSync(statusPath, "utf8");
  expectStatusLine(status, `| 技能总数 | ${summary.totalSkills} |`);
  expectStatusLine(status, `| 已有完整落盘资产的技能 | ${summary.completeSkills} |`);
  expectStatusLine(status, `| 缺任意资产文件的技能 | ${summary.missingSkills} |`);
  expectStatusLine(status, `合计缺失资产文件：${summary.totalMissingFiles}。`);
  expectStatusLine(status, `| \`${requiredSampleSkillId}\` 火球 |`);
}

function expectStatusLine(status: string, needle: string): void {
  if (!status.includes(needle)) {
    failures.push(`docs/EFFECT_ASSET_STATUS.md missing current status text: ${needle}`);
  }
}

function validateAsset(fileName: string, filePath: string): string | undefined {
  if (fileName.endsWith(".png")) {
    const info = readPngInfo(filePath);
    if (!info) {
      return "invalid_png";
    }
    if (info.width !== 768 || info.height !== 768) {
      return `png_size_${info.width}x${info.height}`;
    }
    return undefined;
  }
  if (fileName.endsWith(".mp4")) {
    return hasMp4Signature(filePath) ? undefined : "invalid_mp4_signature";
  }
  if (fileName.endsWith(".webm")) {
    return hasWebmSignature(filePath) ? undefined : "invalid_webm_signature";
  }
  return undefined;
}

function readPngInfo(filePath: string): { height: number; width: number } | undefined {
  const header = readBytes(filePath, 0, 24);
  if (
    header.length < 24 ||
    header[0] !== 0x89 ||
    header[1] !== 0x50 ||
    header[2] !== 0x4e ||
    header[3] !== 0x47 ||
    header[4] !== 0x0d ||
    header[5] !== 0x0a ||
    header[6] !== 0x1a ||
    header[7] !== 0x0a
  ) {
    return undefined;
  }
  return {
    height: header.readUInt32BE(20),
    width: header.readUInt32BE(16)
  };
}

function hasMp4Signature(filePath: string): boolean {
  return readBytes(filePath, 0, 32).includes(Buffer.from("ftyp"));
}

function hasWebmSignature(filePath: string): boolean {
  const header = readBytes(filePath, 0, 4);
  return header.length === 4 && header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
}

function readBytes(filePath: string, position: number, length: number): Buffer {
  const file = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const read = fs.readSync(file, buffer, 0, length, position);
    return buffer.subarray(0, read);
  } finally {
    fs.closeSync(file);
  }
}
