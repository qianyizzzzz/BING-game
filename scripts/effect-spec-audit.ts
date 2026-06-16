import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../packages/shared/src/skills/registry";

interface PromptManifest {
  assetContract: {
    files: string[];
    root: string;
  };
  generatedAt?: string;
  skills: Array<{
    assetDir?: string;
    keyframes: Array<{ file: string; phase: string; prompt: string }>;
    name: string;
    seedancePrompt: string;
    skillId: string;
  }>;
  totals: {
    playableSkills: number;
    totalSkills: number;
    visualOnlySkills: number;
  };
}

const specPath = path.resolve("docs/EFFECT_ANIMATION_SPEC.md");
const promptManifestPath = path.resolve("docs/EFFECT_ANIMATION_PROMPTS.json");
const skillIds = new Set(getAllSkills().map((skill) => skill.id));
const requiredFiles = [
  "keyframe-01.png",
  "keyframe-02.png",
  "keyframe-03.png",
  "keyframe-04.png",
  "poster.png",
  "effect.webm",
  "effect.mp4"
];
const requiredKeyframePhases = ["起势", "爆发", "扩散", "残留"];
const requiredSeedancePromptFragments = [
  "keyframe-01",
  "keyframe-02",
  "keyframe-03",
  "keyframe-04",
  "oil painting",
  "transparent acrylic",
  "Readability constraint",
  "no text",
  "no logo",
  "no watermark",
  "Avoid:",
  "plastic 3D"
];

const failures: string[] = [];
const mojibakePatterns = [
  /[\uFFFD]/,
  /[锟斤拷]{2,}/,
  /[æçåéèäöüï]{2,}/i,
  /[娑閻閳閺閹濡]{2,}/,
  /[鎶閿闄鎺琚鍔]{2,}/,
  /\?{3,}/
];

const spec = readText(specPath);
const manifest = readJson<PromptManifest>(promptManifestPath);

assertNoMojibake(specPath, spec);
assertNoMojibake(promptManifestPath, JSON.stringify(manifest));

if (manifest.totals.totalSkills !== skillIds.size) {
  failures.push(`manifest totals.totalSkills=${manifest.totals.totalSkills}, expected ${skillIds.size}`);
}

if (manifest.skills.length !== skillIds.size) {
  failures.push(`manifest skills length=${manifest.skills.length}, expected ${skillIds.size}`);
}

if (!manifest.assetContract.root || !manifest.assetContract.root.includes("apps/client/public/assets/effects")) {
  failures.push(`manifest asset contract root is not the effects public asset root: ${manifest.assetContract.root}`);
}

if (manifest.generatedAt && !/^\d{4}-\d{2}-\d{2}/.test(manifest.generatedAt)) {
  failures.push(`manifest generatedAt is not ISO-like: ${manifest.generatedAt}`);
}

for (const fileName of requiredFiles) {
  if (!manifest.assetContract.files.includes(fileName)) {
    failures.push(`manifest asset contract missing ${fileName}`);
  }
}

const seenSkillIds = new Set<string>();
for (const skill of manifest.skills) {
  if (seenSkillIds.has(skill.skillId)) {
    failures.push(`manifest contains duplicate skill ${skill.skillId}`);
  }
  seenSkillIds.add(skill.skillId);

  if (!skillIds.has(skill.skillId)) {
    failures.push(`manifest contains unknown skill ${skill.skillId}`);
    continue;
  }

  if (skill.assetDir && !skill.assetDir.endsWith(`/assets/effects/${skill.skillId}/`)) {
    failures.push(`${skill.skillId}: assetDir does not point to its effect folder`);
  }

  if (!spec.includes(`### ${skill.skillId}`)) {
    failures.push(`spec missing section for ${skill.skillId}`);
  }

  if (skill.keyframes.length !== 4) {
    failures.push(`${skill.skillId}: expected 4 keyframes, got ${skill.keyframes.length}`);
  }

  for (let index = 1; index <= 4; index += 1) {
    const fileName = `keyframe-0${index}.png`;
    const keyframe = skill.keyframes[index - 1];
    if (keyframe?.file !== fileName) {
      failures.push(`${skill.skillId}: keyframe ${index} file mismatch`);
    }
    if (!keyframe?.phase || !keyframe.prompt.includes(skill.skillId)) {
      failures.push(`${skill.skillId}: keyframe ${index} prompt missing phase or skill id`);
    }
    if (!keyframe?.phase.includes(requiredKeyframePhases[index - 1]!)) {
      failures.push(`${skill.skillId}: keyframe ${index} phase missing ${requiredKeyframePhases[index - 1]}`);
    }
    if (!keyframe?.prompt.includes(`keyframe ${index}/4`)) {
      failures.push(`${skill.skillId}: keyframe ${index} prompt missing keyframe ${index}/4 contract`);
    }
    const hasOilStyle = Boolean(keyframe?.prompt.includes("oil-paint") || keyframe?.prompt.includes("hand-painted oil"));
    const hasAcrylicStyle = Boolean(
      keyframe?.prompt.includes("transparent acrylic") || keyframe?.prompt.includes("translucent acrylic")
    );
    if (!hasOilStyle || !hasAcrylicStyle) {
      failures.push(`${skill.skillId}: keyframe ${index} prompt missing oil-paint / acrylic style contract`);
    }
    if (!spec.includes(`**${fileName}**`)) {
      failures.push(`spec missing ${fileName} marker`);
    }
  }

  if (!skill.seedancePrompt.includes(skill.skillId) || !skill.seedancePrompt.includes("0.8-1.6 second")) {
    failures.push(`${skill.skillId}: Seedance prompt missing skill id or duration contract`);
  }
  for (const fragment of requiredSeedancePromptFragments) {
    if (!skill.seedancePrompt.includes(fragment)) {
      failures.push(`${skill.skillId}: Seedance prompt missing ${fragment}`);
    }
  }
}

const manifestSkillIds = new Set(manifest.skills.map((skill) => skill.skillId));
for (const skillId of skillIds) {
  if (!manifestSkillIds.has(skillId)) {
    failures.push(`manifest missing skill ${skillId}`);
  }
}

if (failures.length > 0) {
  console.error("effect spec audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`effect spec audit passed: ${manifest.skills.length} skills, 4 keyframes each`);

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function assertNoMojibake(filePath: string, text: string): void {
  for (const pattern of mojibakePatterns) {
    if (pattern.test(text)) {
      failures.push(`${filePath}: contains likely mojibake (${pattern})`);
      return;
    }
  }
}
