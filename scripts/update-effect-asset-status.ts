import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../packages/shared/src/skills/registry";

interface PromptManifest {
  skills?: Array<{
    keyframes?: Array<{ file: string }>;
    seedancePrompt?: string;
    skillId?: string;
  }>;
}

interface SkillAssetAudit {
  complete: boolean;
  existing: string[];
  invalid: string[];
  missing: string[];
  skillId: string;
  skillName: string;
}

const effectRoot = path.resolve("apps/client/public/assets/effects");
const statusPath = path.resolve("docs/EFFECT_ASSET_STATUS.md");
const promptManifestPath = path.resolve("docs/EFFECT_ANIMATION_PROMPTS.json");
const requiredFiles = [
  "keyframe-01.png",
  "keyframe-02.png",
  "keyframe-03.png",
  "keyframe-04.png",
  "poster.png",
  "effect.webm",
  "effect.mp4"
] as const;

const manifest = readJson<PromptManifest>(promptManifestPath);
const skills = getAllSkills().sort((a, b) => a.sourceRow - b.sourceRow || a.id.localeCompare(b.id));
const audits = skills.map((skill): SkillAssetAudit => {
  const existing: string[] = [];
  const invalid: string[] = [];
  const missing: string[] = [];

  for (const fileName of requiredFiles) {
    const filePath = path.join(effectRoot, skill.id, fileName);
    if (!fs.existsSync(filePath)) {
      missing.push(fileName);
      continue;
    }
    existing.push(fileName);
    const reason = validateAsset(fileName, filePath);
    if (reason) {
      invalid.push(`${fileName} (${reason})`);
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

const keyframeAndPosterReady = audits.filter((audit) =>
  ["keyframe-01.png", "keyframe-02.png", "keyframe-03.png", "keyframe-04.png", "poster.png"].every((fileName) =>
    audit.existing.includes(fileName)
  )
);
const completeSkills = audits.filter((audit) => audit.complete);
const invalidAssets = audits.reduce((sum, audit) => sum + audit.invalid.length, 0);
const missingByFile = Object.fromEntries(
  requiredFiles.map((fileName) => [fileName, audits.filter((audit) => audit.missing.includes(fileName)).length])
);
const totalMissingFiles = audits.reduce((sum, audit) => sum + audit.missing.length, 0);
const promptSkills = manifest.skills ?? [];
const keyframePromptCount = promptSkills.reduce((sum, skill) => sum + (skill.keyframes?.length ?? 0), 0);
const seedancePromptCount = promptSkills.filter((skill) => skill.seedancePrompt).length;
const readyRows = keyframeAndPosterReady.length
  ? keyframeAndPosterReady.map(
      (audit) =>
        `| \`${audit.skillId}\` ${audit.skillName} | ${formatFiles(audit.existing)} | ${formatFiles(audit.missing)} | 可作为 Seedance 关键帧输入验证样例 |`
    )
  : ["| 暂无 | 暂无 | 暂无 | 需要先生成关键帧 |"];

const markdown = `# BING 技能特效资产状态

更新时间：${new Date().toISOString().slice(0, 10)}

## 当前结论

特效文档和 Prompt 清单已经覆盖全部 ${skills.length} 个技能，但最终可在游戏中播放的动画资产还没有完成。当前有 ${keyframeAndPosterReady.length} 个技能具备 4 张关键帧和 poster，可作为 Seedance 输入样例；${completeSkills.length} 个技能具备完整 \`effect.webm\` / \`effect.mp4\` 动画资产。

这份状态由 \`npm.cmd run effects:status\` 生成，统计口径和 \`npm.cmd run test:effect-assets -- --json\` 对齐。

## 覆盖情况

| 项目 | 数量 |
| --- | ---: |
| 技能总数 | ${skills.length} |
| 已有逐技能特效文档 / Prompt 的技能 | ${promptSkills.length} |
| 关键帧 Prompt 总数 | ${keyframePromptCount} |
| Seedance Prompt 总数 | ${seedancePromptCount} |
| 已有完整落盘资产的技能 | ${completeSkills.length} |
| 已有 4 张关键帧和 poster 的技能 | ${keyframeAndPosterReady.length} |
| 缺任意资产文件的技能 | ${audits.filter((audit) => audit.missing.length > 0).length} |
| 坏文件 / 尺寸错误 | ${invalidAssets} |

## 已有小样

| 技能 | 已有文件 | 缺失文件 | 备注 |
| --- | --- | --- | --- |
${readyRows.join("\n")}

## 当前缺口

| 文件 | 缺失数量 |
| --- | ---: |
${requiredFiles.map((fileName) => `| \`${fileName}\` | ${missingByFile[fileName]} |`).join("\n")}

合计缺失资产文件：${totalMissingFiles}。

## 安全命令

只生成计划，不调用付费 API：

\`\`\`powershell
npm.cmd run test:effect-assets -- --json
npm.cmd run effects:status
npm.cmd run effects:keyframes:plan -- --offset-skills=0 --limit-skills=5 --estimated-cny-per-frame=0.5
npm.cmd run seedance:effects:plan -- --provider=volcengine --offset=76 --limit=1 --estimated-cny-per-task=3
\`\`\`

提交 Seedance 前必须带预算估算：

\`\`\`powershell
npm.cmd run seedance:effects:submit -- --provider=volcengine --offset=76 --limit=1 --estimated-cny-per-task=3
\`\`\`

估算总额达到或超过 10 RMB 时，必须先向用户确认是否继续；获得明确许可后才可以继续提交付费任务。
`;

fs.writeFileSync(statusPath, markdown, "utf8");
console.log(`updated ${path.relative(process.cwd(), statusPath)}: ${skills.length} skills, ${totalMissingFiles} missing files`);

function formatFiles(files: string[]): string {
  return files.length ? files.map((fileName) => `\`${fileName}\``).join("、") : "无";
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function validateAsset(fileName: string, filePath: string): string | undefined {
  if (fileName.endsWith(".png")) {
    const info = readPngInfo(filePath);
    if (!info) return "invalid_png";
    if (info.width !== 768 || info.height !== 768) return `png_size_${info.width}x${info.height}`;
    return undefined;
  }
  if (fileName.endsWith(".mp4")) return hasMp4Signature(filePath) ? undefined : "invalid_mp4_signature";
  if (fileName.endsWith(".webm")) return hasWebmSignature(filePath) ? undefined : "invalid_webm_signature";
  return undefined;
}

function readPngInfo(filePath: string): { height: number; width: number } | undefined {
  const header = fs.readFileSync(filePath).subarray(0, 24);
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
  return fs.readFileSync(filePath).subarray(0, 32).includes(Buffer.from("ftyp"));
}

function hasWebmSignature(filePath: string): boolean {
  const header = fs.readFileSync(filePath).subarray(0, 4);
  return header.length === 4 && header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
}
