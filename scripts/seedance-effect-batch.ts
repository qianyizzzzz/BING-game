import fs from "node:fs";
import path from "node:path";

interface EffectPromptSpec {
  prompt: string;
  skillId: string;
  skillName: string;
}

interface BatchOptions {
  dryRun: boolean;
  limit: number;
  model: string;
  offset: number;
  outDir: string;
  ratio: string;
  resolution: string;
  serviceTier: string;
}

interface SubmittedTask {
  payload: Record<string, unknown>;
  response?: unknown;
  skillId: string;
  skillName: string;
  submittedAt?: string;
}

const asyncCallbackUrl = "https://api.acedata.cloud/health";
const apiBaseUrl = process.env.ACEDATACLOUD_API_BASE_URL ?? "https://api.acedata.cloud";
const apiToken = process.env.ACEDATACLOUD_API_TOKEN ?? "";
const specPath = path.resolve("docs/EFFECT_ANIMATION_SPEC.md");

const options = readOptions();
const specs = parseEffectPrompts(fs.readFileSync(specPath, "utf-8"));
if (specs.length === 0) {
  throw new Error(`No Seedance prompts found in ${specPath}`);
}

const selected = specs.slice(options.offset, options.offset + options.limit);
const outDir = path.resolve(options.outDir);
fs.mkdirSync(outDir, { recursive: true });

const tasks: SubmittedTask[] = [];

for (const spec of selected) {
  const payload = buildPayload(spec, options);
  const task: SubmittedTask = {
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
      count: tasks.length,
      dryRun: options.dryRun,
      generatedAt: new Date().toISOString(),
      options,
      sourceSpec: specPath,
      totalSpecs: specs.length,
      tasks
    },
    null,
    2
  ),
  "utf-8"
);

console.log(
  `${options.dryRun ? "planned" : "submitted"} ${tasks.length} Seedance effect tasks -> ${manifestPath}`
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
  return {
    callback_url: asyncCallbackUrl,
    camerafixed: true,
    content: [
      {
        text: spec.prompt,
        type: "text"
      }
    ],
    execution_expires_after: 172800,
    frames: 29,
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
    dryRun: !submit,
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

function stringArg(name: string, fallback: string): string {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}
