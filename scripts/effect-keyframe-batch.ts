import fs from "node:fs";
import path from "node:path";

interface EffectPromptManifest {
  skills: EffectPromptSkill[];
  totals?: {
    playableSkills: number;
    totalSkills: number;
    visualOnlySkills: number;
  };
}

interface EffectPromptSkill {
  archetype: string;
  assetDir: string;
  category: string;
  keyframes: EffectPromptKeyframe[];
  mechanicCue: string;
  name: string;
  playSummary: string;
  seedancePrompt: string;
  skillId: string;
  triggerSummary: string;
}

interface EffectPromptKeyframe {
  file: string;
  phase: string;
  prompt: string;
}

interface KeyframeBatchOptions {
  limitFrames: number;
  limitSkills: number;
  offsetFrames: number;
  offsetSkills: number;
  onlyMissing: boolean;
  outDir: string;
  promptManifest: string;
}

interface KeyframeTask {
  archetype: string;
  category: string;
  file: string;
  frameIndex: number;
  mechanicCue: string;
  phase: string;
  prompt: string;
  skillId: string;
  skillName: string;
  targetPath: string;
}

const options = readOptions();
const manifestPath = path.resolve(options.promptManifest);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as EffectPromptManifest;
const selectedSkills = manifest.skills.slice(
  options.offsetSkills,
  options.offsetSkills + options.limitSkills
);

const tasks = selectedSkills
  .flatMap((skill) => buildSkillTasks(skill))
  .slice(options.offsetFrames, options.offsetFrames + options.limitFrames);

const outDir = path.resolve(options.outDir);
fs.mkdirSync(outDir, { recursive: true });
const planPath = path.join(outDir, "keyframe-generation-plan.json");
const jsonlPath = path.join(outDir, "keyframe-generation-plan.jsonl");

fs.writeFileSync(
  planPath,
  JSON.stringify(
    {
      count: tasks.length,
      generatedAt: new Date().toISOString(),
      options,
      promptManifest: manifestPath,
      selectedSkillCount: selectedSkills.length,
      tasks,
      totals: {
        manifestSkills: manifest.skills.length,
        manifestTotalFrames: manifest.skills.reduce(
          (sum, skill) => sum + skill.keyframes.length,
          0
        ),
        selectedFramesBeforeFrameLimit: selectedSkills.reduce(
          (sum, skill) => sum + buildSkillTasks(skill).length,
          0
        ),
        ...manifest.totals
      }
    },
    null,
    2
  ),
  "utf-8"
);

fs.writeFileSync(
  jsonlPath,
  `${tasks.map((task) => JSON.stringify(task)).join("\n")}\n`,
  "utf-8"
);

console.log(`planned ${tasks.length} keyframe image tasks -> ${planPath}`);
console.log(`wrote jsonl -> ${jsonlPath}`);

function buildSkillTasks(skill: EffectPromptSkill): KeyframeTask[] {
  return skill.keyframes
    .map((keyframe, index) => {
      const targetPath = path.normalize(path.join(skill.assetDir, keyframe.file));
      return {
        archetype: skill.archetype,
        category: skill.category,
        file: keyframe.file,
        frameIndex: index + 1,
        mechanicCue: skill.mechanicCue,
        phase: keyframe.phase,
        prompt: keyframe.prompt,
        skillId: skill.skillId,
        skillName: skill.name,
        targetPath
      };
    })
    .filter((task) => !options.onlyMissing || !fs.existsSync(path.resolve(task.targetPath)));
}

function readOptions(): KeyframeBatchOptions {
  return {
    limitFrames: numberArg("--limit-frames", Number.MAX_SAFE_INTEGER),
    limitSkills: numberArg("--limit-skills", 5),
    offsetFrames: numberArg("--offset-frames", 0),
    offsetSkills: numberArg("--offset-skills", 0),
    onlyMissing: !process.argv.includes("--include-existing"),
    outDir: stringArg("--out-dir", "artifacts/effects"),
    promptManifest: stringArg("--prompt-manifest", "docs/EFFECT_ANIMATION_PROMPTS.json")
  };
}

function numberArg(name: string, fallback: number): number {
  const raw = stringArg(name, "");
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return Math.floor(value);
}

function stringArg(name: string, fallback: string): string {
  const prefix = `${name}=`;
  const matches = process.argv.filter((arg) => arg.startsWith(prefix));
  return matches.at(-1)?.slice(prefix.length) ?? fallback;
}
