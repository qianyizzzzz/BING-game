import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../packages/shared/src/skills/registry";

interface SkillEffectAssetAudit {
  complete: boolean;
  existing: string[];
  invalid: InvalidEffectAsset[];
  missing: string[];
  skillId: string;
  skillName: string;
}

interface InvalidEffectAsset {
  file: string;
  reason: string;
}

interface PngInfo {
  height: number;
  width: number;
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
] as const;
const requiredPngSize = {
  height: numberArg("--png-height", 768),
  width: numberArg("--png-width", 768)
};
const jsonOnly = process.argv.includes("--json");

const audits: SkillEffectAssetAudit[] = getAllSkills()
  .sort((a, b) => a.sourceRow - b.sourceRow || a.id.localeCompare(b.id))
  .map((skill) => {
    const existing: string[] = [];
    const invalid: InvalidEffectAsset[] = [];
    const missing: string[] = [];

    for (const fileName of requiredFiles) {
      const filePath = path.join(effectRoot, skill.id, fileName);
      if (!fs.existsSync(filePath)) {
        missing.push(fileName);
        continue;
      }

      existing.push(fileName);
      const invalidReason = validateAsset(fileName, filePath);
      if (invalidReason) {
        invalid.push({ file: fileName, reason: invalidReason });
      }
    }

    return {
      complete: missing.length === 0 && invalid.length === 0,
      existing,
      invalid,
      missing,
      skillId: skill.id,
      skillName: skill.name
    };
  });

const completeCount = audits.filter((audit) => audit.complete).length;
const missingCount = audits.filter((audit) => audit.missing.length > 0).length;
const invalidCount = audits.filter((audit) => audit.invalid.length > 0).length;
const summary = {
  completeSkills: completeCount,
  effectRoot,
  invalidAssets: audits.reduce((sum, audit) => sum + audit.invalid.length, 0),
  invalidByFile: Object.fromEntries(
    requiredFiles.map((fileName) => [
      fileName,
      audits.filter((audit) => audit.invalid.some((item) => item.file === fileName)).length
    ])
  ),
  invalidSkills: invalidCount,
  missingByFile: Object.fromEntries(
    requiredFiles.map((fileName) => [
      fileName,
      audits.filter((audit) => audit.missing.includes(fileName)).length
    ])
  ),
  missingSkills: missingCount,
  requiredFiles,
  requiredPngSize,
  totalMissingFiles: audits.reduce((sum, audit) => sum + audit.missing.length, 0),
  totalSkills: audits.length
};

console.log(JSON.stringify(jsonOnly ? { ...summary, audits } : summary, null, 2));

if ((missingCount > 0 || invalidCount > 0) && !jsonOnly) {
  console.log("\nEffect asset gaps:");
  for (const audit of audits.filter((item) => !item.complete)) {
    const invalid = audit.invalid.map((item) => `${item.file} (${item.reason})`);
    console.log(
      `- ${audit.skillId} ${audit.skillName}: missing=[${audit.missing.join(", ")}] invalid=[${invalid.join(", ")}]`
    );
  }
  process.exitCode = 1;
}

function validateAsset(fileName: string, filePath: string): string | undefined {
  if (fileName.endsWith(".png")) {
    const info = readPngInfo(filePath);
    if (!info) {
      return "invalid_png";
    }
    if (info.width !== requiredPngSize.width || info.height !== requiredPngSize.height) {
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

function readPngInfo(filePath: string): PngInfo | undefined {
  const file = fs.openSync(filePath, "r");
  try {
    const header = Buffer.alloc(24);
    const read = fs.readSync(file, header, 0, header.length, 0);
    if (read < header.length) {
      return undefined;
    }
    if (
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
  } finally {
    fs.closeSync(file);
  }
}

function hasMp4Signature(filePath: string): boolean {
  const header = readBytes(filePath, 0, 32);
  return header.includes(Buffer.from("ftyp"));
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

function numberArg(name: string, fallback: number): number {
  const raw = stringArg(name, "");
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return Math.floor(value);
}

function stringArg(name: string, fallback: string): string {
  const prefix = `${name}=`;
  const matches = process.argv.filter((arg) => arg.startsWith(prefix));
  return matches.at(-1)?.slice(prefix.length) ?? fallback;
}
