import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

interface EffectPromptSpec {
  assetDir?: string;
  currentAssets?: {
    complete: boolean;
    existing: string[];
    missing: string[];
  };
  keyframes?: Array<{ file: string; phase: string; prompt: string }>;
  prompt: string;
  skillId: string;
  skillName: string;
}

interface BatchOptions {
  allowOverBudget: boolean;
  cnySpendLimit: number;
  dryRun: boolean;
  estimatedCnyPerTask: number;
  includeMissingKeyframes: boolean;
  keyframeInputMode: "data-url" | "metadata-only";
  limit: number;
  model: string;
  offset: number;
  outDir: string;
  ratio: string;
  resolution: string;
  serviceTier: string;
}

interface SubmittedTask {
  estimatedCny?: number;
  payload: Record<string, unknown>;
  response?: unknown;
  skillId: string;
  skillName: string;
  submittedAt?: string;
}

interface SkippedTask {
  missingKeyframes: string[];
  reason: string;
  skillId: string;
  skillName: string;
}

const asyncCallbackUrl = "https://api.acedata.cloud/health";
const apiBaseUrl = process.env.ACEDATACLOUD_API_BASE_URL ?? "https://api.acedata.cloud";
const apiToken = process.env.ACEDATACLOUD_API_TOKEN ?? "";
const specPath = path.resolve("docs/EFFECT_ANIMATION_SPEC.md");
const promptManifestPath = path.resolve("docs/EFFECT_ANIMATION_PROMPTS.json");

const options = readOptions();
const specs = readEffectPromptSpecs();
if (specs.length === 0) {
  throw new Error(`No Seedance prompts found in ${promptManifestPath} or ${specPath}`);
}

const candidateSpecs = specs.slice(options.offset, options.offset + options.limit);
const skipped: SkippedTask[] = [];
const selected = candidateSpecs.filter((spec) => {
  const missingKeyframes = missingRequiredKeyframes(spec);
  if (options.includeMissingKeyframes || missingKeyframes.length === 0) {
    return true;
  }
  skipped.push({
    missingKeyframes,
    reason: "missing_keyframes",
    skillId: spec.skillId,
    skillName: spec.skillName
  });
  return false;
});

if (!options.dryRun && selected.length > 0) {
  enforceBudgetGate(selected.length, options);
}

const outDir = path.resolve(options.outDir);
fs.mkdirSync(outDir, { recursive: true });

const tasks: SubmittedTask[] = [];

for (const spec of selected) {
  const payload = buildPayload(spec, options);
  const task: SubmittedTask = {
    estimatedCny: options.estimatedCnyPerTask > 0 ? options.estimatedCnyPerTask : undefined,
    payload,
    skillId: spec.skillId,
    skillName: spec.skillName
  };

  if (!options.dryRun) {
    if (!apiToken) {
      throw new Error("ACEDATACLOUD_API_TOKEN is required when using --submit");
    }
    task.response = await submitSeedanceTask(payload);
    task.submittedAt = new Date().toISOString();
  }

  tasks.push(task);
}

const manifestPath = path.join(
  outDir,
  options.dryRun ? "effect-generation-plan.json" : "effect-generation-tasks.json"
);
fs.writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      apiBaseUrl,
      budget: buildBudgetSummary(tasks.length, options),
      count: tasks.length,
      dryRun: options.dryRun,
      generatedAt: new Date().toISOString(),
      options,
      skipped,
      sourceSpec: fs.existsSync(promptManifestPath) ? promptManifestPath : specPath,
      totalSpecs: specs.length,
      tasks
    },
    null,
    2
  ),
  "utf-8"
);

console.log(
  `${options.dryRun ? "planned" : "submitted"} ${tasks.length} Seedance effect tasks, skipped ${skipped.length} -> ${manifestPath}`
);

function parseEffectPrompts(markdown: string): EffectPromptSpec[] {
  const headingPattern = /^### ([^:\uFF1A\s]+)[:\uFF1A](.+)$/gm;
  const headings = Array.from(markdown.matchAll(headingPattern));
  const specs: EffectPromptSpec[] = [];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]!;
    const nextHeading = headings[index + 1];
    const start = heading.index ?? 0;
    const end = nextHeading?.index ?? markdown.length;
    const section = markdown.slice(start, end);
    const prompt = extractSeedancePrompt(section);
    if (!prompt) {
      continue;
    }

    specs.push({
      prompt,
      skillId: heading[1]!,
      skillName: heading[2]!.trim()
    });
  }

  return specs;
}

function readEffectPromptSpecs(): EffectPromptSpec[] {
  if (fs.existsSync(promptManifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(promptManifestPath, "utf-8")) as {
      skills?: Array<{
        assetDir?: string;
        currentAssets?: {
          complete: boolean;
          existing: string[];
          missing: string[];
        };
        keyframes?: Array<{ file: string; phase: string; prompt: string }>;
        name?: string;
        seedancePrompt?: string;
        skillId?: string;
      }>;
    };
    const specs =
      manifest.skills
        ?.filter((skill) => skill.skillId && skill.name && skill.seedancePrompt)
        .map((skill) => ({
          assetDir: skill.assetDir,
          currentAssets: skill.currentAssets,
          keyframes: skill.keyframes,
          prompt: skill.seedancePrompt!,
          skillId: skill.skillId!,
          skillName: skill.name!
        })) ?? [];
    if (specs.length > 0) {
      return specs;
    }
  }

  return parseEffectPrompts(fs.readFileSync(specPath, "utf-8"));
}

function extractSeedancePrompt(section: string): string | undefined {
  const markerIndex = section.indexOf("#### Seedance");
  if (markerIndex < 0) {
    return undefined;
  }

  const promptSection = section.slice(markerIndex);
  const fenceStart = promptSection.indexOf("```text");
  if (fenceStart < 0) {
    return undefined;
  }

  const promptStart = fenceStart + "```text".length;
  const fenceEnd = promptSection.indexOf("```", promptStart);
  if (fenceEnd < 0) {
    return undefined;
  }

  return promptSection.slice(promptStart, fenceEnd).trim();
}

function buildPayload(spec: EffectPromptSpec, opts: BatchOptions): Record<string, unknown> {
  const keyframeInputs = buildKeyframeInputs(spec, opts);
  return {
    callback_url: asyncCallbackUrl,
    camerafixed: true,
    content: [
      {
        text: spec.prompt,
        type: "text"
      },
      ...keyframeInputs
        .filter((input) => input.url)
        .map((input) => ({
          image_url: {
            url: input.url
          },
          type: "image_url"
        }))
    ],
    execution_expires_after: 172800,
    frames: 29,
    metadata: {
      assetDir: spec.assetDir,
      estimatedCny: opts.estimatedCnyPerTask > 0 ? opts.estimatedCnyPerTask : undefined,
      expectedKeyframes: spec.keyframes?.map((keyframe) => keyframe.file),
      keyframeInputMode: opts.keyframeInputMode,
      keyframeInputs: keyframeInputs.map(({ url: _url, ...rest }) => rest),
      spendLimitCny: opts.cnySpendLimit,
      skillId: spec.skillId,
      skillName: spec.skillName
    },
    model: opts.model,
    ratio: opts.ratio,
    resolution: opts.resolution,
    return_last_frame: true,
    service_tier: opts.serviceTier,
    watermark: false
  };
}

async function submitSeedanceTask(payload: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}/seedance/videos`, {
    body: JSON.stringify(payload),
    headers: {
      accept: "application/json",
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json"
    },
    method: "POST"
  });

  const data = await readJsonOrText(response);
  if (!response.ok) {
    throw new Error(`Seedance API ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readOptions(): BatchOptions {
  const submit = process.argv.includes("--submit");
  return {
    allowOverBudget: process.argv.includes("--allow-over-budget"),
    cnySpendLimit: numberArg("--cny-spend-limit", 10),
    dryRun: !submit,
    estimatedCnyPerTask: decimalArg(
      "--estimated-cny-per-task",
      Number(process.env.SEEDANCE_ESTIMATED_CNY_PER_TASK ?? 0)
    ),
    includeMissingKeyframes: process.argv.includes("--include-missing-keyframes"),
    keyframeInputMode: keyframeInputModeArg("--keyframe-input-mode", "data-url"),
    limit: numberArg("--limit", 5),
    model: stringArg("--model", "doubao-seedance-1-0-pro-fast-251015"),
    offset: numberArg("--offset", 0),
    outDir: stringArg("--out-dir", "artifacts/seedance"),
    ratio: stringArg("--ratio", "16:9"),
    resolution: stringArg("--resolution", "480p"),
    serviceTier: stringArg("--service-tier", "flex")
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

function decimalArg(name: string, fallback: number): number {
  const raw = stringArg(name, "");
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return value;
}

function missingRequiredKeyframes(spec: EffectPromptSpec): string[] {
  const keyframes = spec.keyframes ?? [];
  if (!spec.assetDir || keyframes.length === 0) {
    return ["keyframe-01.png", "keyframe-02.png", "keyframe-03.png", "keyframe-04.png"];
  }

  return keyframes
    .map((keyframe) => keyframe.file)
    .filter((fileName) => /^keyframe-\d+\.png$/i.test(fileName))
    .filter((fileName) => !fs.existsSync(path.resolve(spec.assetDir!, fileName)));
}

function buildKeyframeInputs(
  spec: EffectPromptSpec,
  opts: BatchOptions
): Array<{
  bytes: number;
  file: string;
  mimeType: string;
  phase: string;
  sha256: string;
  sourcePath: string;
  url?: string;
}> {
  if (!spec.assetDir || !spec.keyframes) {
    return [];
  }

  return spec.keyframes
    .filter((keyframe) => /^keyframe-\d+\.png$/i.test(keyframe.file))
    .flatMap((keyframe) => {
      const sourcePath = path.resolve(spec.assetDir!, keyframe.file);
      if (!fs.existsSync(sourcePath)) {
        return [];
      }

      const bytes = fs.readFileSync(sourcePath);
      const mimeType = mimeTypeForFile(sourcePath);
      return [
        {
          bytes: bytes.length,
          file: keyframe.file,
          mimeType,
          phase: keyframe.phase,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          sourcePath,
          url:
            opts.keyframeInputMode === "data-url"
              ? `data:${mimeType};base64,${bytes.toString("base64")}`
              : undefined
        }
      ];
    });
}

function mimeTypeForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function enforceBudgetGate(taskCount: number, opts: BatchOptions): void {
  if (opts.estimatedCnyPerTask <= 0) {
    throw new Error(
      "--estimated-cny-per-task is required when using --submit so the 10 RMB spend gate can be enforced"
    );
  }

  const estimatedTotal = taskCount * opts.estimatedCnyPerTask;
  if (!opts.allowOverBudget && estimatedTotal >= opts.cnySpendLimit) {
    throw new Error(
      `Seedance submit blocked: estimated spend ${estimatedTotal.toFixed(2)} RMB reaches or exceeds ${opts.cnySpendLimit.toFixed(2)} RMB. Ask the user for permission before continuing, then rerun with --allow-over-budget if approved.`
    );
  }
}

function buildBudgetSummary(taskCount: number, opts: BatchOptions): {
  allowOverBudget: boolean;
  estimatedCnyPerTask: number;
  estimatedTotalCny: number;
  spendLimitCny: number;
} {
  return {
    allowOverBudget: opts.allowOverBudget,
    estimatedCnyPerTask: opts.estimatedCnyPerTask,
    estimatedTotalCny: taskCount * opts.estimatedCnyPerTask,
    spendLimitCny: opts.cnySpendLimit
  };
}

function keyframeInputModeArg(
  name: string,
  fallback: "data-url" | "metadata-only"
): "data-url" | "metadata-only" {
  const raw = stringArg(name, fallback);
  if (raw !== "data-url" && raw !== "metadata-only") {
    throw new Error(`${name} must be data-url or metadata-only`);
  }
  return raw;
}

function stringArg(name: string, fallback: string): string {
  const prefix = `${name}=`;
  const matches = process.argv.filter((arg) => arg.startsWith(prefix));
  return matches.at(-1)?.slice(prefix.length) ?? fallback;
}
