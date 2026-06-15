import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../packages/shared/src/skills/registry";

interface PromptManifest {
  assetContract: {
    files: string[];
    root: string;
  };
  skills: Array<{
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

for (const fileName of requiredFiles) {
  if (!manifest.assetContract.files.includes(fileName)) {
    failures.push(`manifest asset contract missing ${fileName}`);
  }
}

for (const skill of manifest.skills) {
  if (!skillIds.has(skill.skillId)) {
    failures.push(`manifest contains unknown skill ${skill.skillId}`);
    continue;
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
    if (!spec.includes(`**${fileName}**`)) {
      failures.push(`spec missing ${fileName} marker`);
    }
  }

  if (!skill.seedancePrompt.includes(skill.skillId) || !skill.seedancePrompt.includes("0.8-1.6 second")) {
    failures.push(`${skill.skillId}: Seedance prompt missing skill id or duration contract`);
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
