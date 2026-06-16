import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

interface GenerationManifest {
  apiProvider?: ApiProvider;
  tasks: GenerationTask[];
}

interface GenerationTask {
  response?: unknown;
  skillId: string;
  skillName: string;
}

interface SettledTask {
  downloaded: string[];
  queryResponse?: SafeTaskResponse;
  skillId: string;
  skillName: string;
  status: "missing_task_id" | "pending" | "failed" | "partial" | "downloaded";
  taskId?: string;
  warnings?: string[];
}

interface SafeTaskResponse {
  created_at?: number;
  duration?: number;
  id?: string;
  model?: string;
  ratio?: string;
  resolution?: string;
  status?: string;
  updated_at?: number;
  usage?: {
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface DownloadResult {
  downloaded: string[];
  hasCompleteSet: boolean;
  warnings: string[];
}

type ApiProvider = "acedata" | "volcengine";

const showHelp = process.argv.includes("--help") || process.argv.includes("-h");
const manifestPath = path.resolve(
  stringArg("--manifest", "artifacts/seedance/effect-generation-tasks.json")
);
const outDir = path.resolve(stringArg("--out-dir", "apps/client/public/assets/effects"));
const poll = process.argv.includes("--poll");
const maxPolls = numberArg("--max-polls", poll ? 24 : 1);
const pollDelayMs = numberArg("--poll-delay-ms", 10_000);
const ffmpegPath = stringArg("--ffmpeg", process.env.FFMPEG_PATH ?? bundledFfmpegPath() ?? "ffmpeg");
const skipWebm = process.argv.includes("--skip-webm");

if (showHelp) {
  printHelp();
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as GenerationManifest;
const apiProvider = apiProviderArg("--provider", manifest.apiProvider);
const apiBaseUrl = stringArg("--api-base-url", defaultApiBaseUrl(apiProvider));
const apiToken = defaultApiToken(apiProvider);
if (!apiToken) {
  throw new Error(tokenErrorMessage(apiProvider));
}
const settled: SettledTask[] = [];
const skillNamesById = readSkillNamesById();

for (const task of manifest.tasks) {
  const taskId = extractTaskId(task.response);
  if (!taskId) {
    settled.push({
      downloaded: [],
      skillId: task.skillId,
      skillName: canonicalSkillName(task.skillId, task.skillName),
      status: "missing_task_id"
    });
    continue;
  }

  const result = await waitForTask(taskId);
  const status = taskStatus(result);
  if (status !== "succeeded") {
    settled.push({
      downloaded: [],
      queryResponse: sanitizeTaskResponse(result),
      skillId: task.skillId,
      skillName: canonicalSkillName(task.skillId, task.skillName),
      status: status === "failed" ? "failed" : "pending",
      taskId
    });
    continue;
  }

  const urls = extractResultUrls(result);
  const downloadResult = await downloadTaskAssets(task.skillId, urls);
  const downloadStatus = statusForDownload(downloadResult);
  settled.push({
    downloaded: downloadResult.downloaded,
    queryResponse: sanitizeTaskResponse(result),
    skillId: task.skillId,
    skillName: canonicalSkillName(task.skillId, task.skillName),
    status: downloadStatus,
    taskId,
    warnings: downloadResult.warnings.length > 0 ? downloadResult.warnings : undefined
  });
}

const reportPath = path.resolve("artifacts/seedance/effect-settle-report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      manifestPath,
      outDir,
      settled
    },
    null,
    2
  ),
  "utf-8"
);

console.log(`settled ${settled.length} Seedance tasks -> ${reportPath}`);
if (settled.some((item) => item.status !== "downloaded")) {
  process.exitCode = 1;
}

async function waitForTask(taskId: string): Promise<unknown> {
  let last: unknown;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    last = await queryTask(taskId);
    const status = taskStatus(last);
    if (status === "succeeded" || status === "failed" || !poll) {
      return last;
    }
    await sleep(pollDelayMs);
  }
  return last;
}

async function queryTask(taskId: string): Promise<unknown> {
  if (apiProvider === "volcengine") {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/contents/generations/tasks/${taskId}`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${apiToken}`
      },
      method: "GET"
    });
    const data = await readJsonOrText(response);
    if (!response.ok) {
      throw new Error(`Seedance task API ${response.status}: ${JSON.stringify(data)}`);
    }
    return data;
  }

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/seedance/tasks`, {
    body: JSON.stringify({
      action: "retrieve",
      id: taskId
    }),
    headers: {
      accept: "application/json",
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json"
    },
    method: "POST"
  });
  const data = await readJsonOrText(response);
  if (!response.ok) {
    throw new Error(`Seedance task API ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function downloadTaskAssets(
  skillId: string,
  urls: { posterUrl?: string; videoUrl?: string }
): Promise<DownloadResult> {
  const skillDir = path.join(outDir, skillId);
  fs.mkdirSync(skillDir, { recursive: true });
  const downloaded: string[] = [];
  const warnings: string[] = [];
  let videoSourcePath: string | undefined;

  if (urls.videoUrl) {
    const ext = extensionFromUrl(urls.videoUrl);
    const videoPath =
      ext === ".webm"
        ? path.join(skillDir, "effect.webm")
        : ext === ".mov"
          ? path.join(skillDir, "source.mov")
          : path.join(skillDir, "effect.mp4");
    await downloadFile(urls.videoUrl, videoPath);
    downloaded.push(videoPath);
    videoSourcePath = videoPath;

    if (ext === ".mov") {
      warnings.push("video_saved_as_source_mov; mp4 transcode is not implemented");
    }
    if (ext === ".webm" && !fs.existsSync(path.join(skillDir, "effect.mp4"))) {
      warnings.push("effect_mp4_missing; Seedance returned webm only");
    }
  }

  if (urls.posterUrl) {
    const ext = extensionFromUrl(urls.posterUrl);
    const posterPath =
      ext === ".png" || ext === "" ? path.join(skillDir, "poster.png") : path.join(skillDir, `poster-source${ext}`);
    await downloadFile(urls.posterUrl, posterPath);
    downloaded.push(posterPath);
    if (posterPath.endsWith("poster-source")) {
      warnings.push("poster_source_extension_missing");
    }
    if (!posterPath.endsWith("poster.png")) {
      warnings.push(`poster_not_png; saved as ${path.basename(posterPath)}`);
    }
  }

  const webmPath = path.join(skillDir, "effect.webm");
  const mp4Path = path.join(skillDir, "effect.mp4");
  if (fs.existsSync(mp4Path) && (!fs.existsSync(webmPath) || isOlderThan(webmPath, mp4Path))) {
    if (skipWebm) {
      warnings.push("webm_conversion_skipped");
    } else {
      const warning = convertMp4ToWebm(mp4Path, webmPath);
      if (warning) {
        warnings.push(warning);
      } else {
        downloaded.push(webmPath);
      }
    }
  }

  if (!urls.videoUrl) {
    warnings.push("missing_video_url");
  }
  if (!urls.posterUrl && !fs.existsSync(path.join(skillDir, "poster.png"))) {
    warnings.push("missing_poster_url");
  }
  if (videoSourcePath && !fs.existsSync(mp4Path)) {
    warnings.push(`effect_mp4_missing; source=${path.basename(videoSourcePath)}`);
  }
  if (!fs.existsSync(webmPath)) {
    warnings.push("effect_webm_missing");
  }

  return {
    downloaded,
    hasCompleteSet:
      fs.existsSync(path.join(skillDir, "poster.png")) &&
      fs.existsSync(mp4Path) &&
      fs.existsSync(webmPath),
    warnings: [...new Set(warnings)]
  };
}

function isOlderThan(candidatePath: string, sourcePath: string): boolean {
  return fs.statSync(candidatePath).mtimeMs < fs.statSync(sourcePath).mtimeMs;
}

async function downloadFile(url: string, targetPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed ${response.status}: ${url}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  fs.writeFileSync(targetPath, bytes);
}

function extractTaskId(value: unknown): string | undefined {
  return findStringByKey(value, new Set(["task_id", "taskId", "id"]));
}

function sanitizeTaskResponse(value: unknown): SafeTaskResponse | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return {
    created_at: numberField(value, "created_at"),
    duration: numberField(value, "duration"),
    id: findStringByKey(value, new Set(["task_id", "taskId", "id"])),
    model: findStringByKey(value, new Set(["model"])),
    ratio: findStringByKey(value, new Set(["ratio"])),
    resolution: findStringByKey(value, new Set(["resolution"])),
    status: findStringByKey(value, new Set(["status", "state"])),
    updated_at: numberField(value, "updated_at"),
    usage: sanitizeUsage(value)
  };
}

function sanitizeUsage(value: unknown): SafeTaskResponse["usage"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const usage = (value as Record<string, unknown>).usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) {
    return undefined;
  }
  return {
    completion_tokens: numberField(usage, "completion_tokens"),
    total_tokens: numberField(usage, "total_tokens")
  };
}

function numberField(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "number" && Number.isFinite(field) ? field : undefined;
}

function extractResultUrls(value: unknown): { posterUrl?: string; videoUrl?: string } {
  const urls = findUrls(value);
  return {
    posterUrl: urls.find((url) => /\.(png|jpg|jpeg|webp)(\?|$)/i.test(url)),
    videoUrl: urls.find((url) => /\.(mp4|webm|mov)(\?|$)/i.test(url))
  };
}

function statusForDownload(result: DownloadResult): SettledTask["status"] {
  if (result.hasCompleteSet) {
    return "downloaded";
  }
  return result.downloaded.length > 0 ? "partial" : "pending";
}

function convertMp4ToWebm(mp4Path: string, webmPath: string): string | undefined {
  const result = spawnSync(
    ffmpegPath,
    ["-y", "-i", mp4Path, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "35", "-an", webmPath],
    { encoding: "utf-8" }
  );
  if (result.status === 0 && fs.existsSync(webmPath)) {
    return undefined;
  }
  fs.rmSync(webmPath, { force: true });
  const detail = result.error?.message ?? result.stderr ?? "unknown ffmpeg error";
  return `webm_conversion_failed; ${oneLine(detail).slice(0, 240)}`;
}

function extensionFromUrl(url: string): string {
  try {
    return path.extname(new URL(url).pathname).toLowerCase();
  } catch {
    return path.extname(url.split("?")[0] ?? "").toLowerCase();
  }
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function taskStatus(value: unknown): "pending" | "succeeded" | "failed" {
  const status = (findStringByKey(value, new Set(["status", "state"])) ?? "").toLowerCase();
  if (["succeeded", "success", "completed", "done"].includes(status)) {
    return "succeeded";
  }
  if (["failed", "error", "cancelled", "canceled"].includes(status)) {
    return "failed";
  }
  return "pending";
}

function findStringByKey(value: unknown, keys: Set<string>): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, keys);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  for (const [key, child] of Object.entries(value)) {
    if (keys.has(key) && typeof child === "string" && child.trim()) {
      return child;
    }
    const found = findStringByKey(child, keys);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function findUrls(value: unknown): string[] {
  if (typeof value === "string") {
    return /^https?:\/\//.test(value) ? [value] : [];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(findUrls);
  }
  return Object.values(value).flatMap(findUrls);
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function apiProviderArg(name: string, fallback?: ApiProvider): ApiProvider {
  const explicit = stringArg(name, process.env.SEEDANCE_PROVIDER ?? fallback ?? "");
  const inferred =
    explicit ||
    (process.env.ARK_API_KEY || process.env.VOLCENGINE_ARK_API_KEY ? "volcengine" : "acedata");
  if (inferred !== "acedata" && inferred !== "volcengine") {
    throw new Error(`${name} must be acedata or volcengine`);
  }
  return inferred;
}

function defaultApiBaseUrl(provider: ApiProvider): string {
  if (provider === "volcengine") {
    return (
      process.env.VOLCENGINE_ARK_API_BASE_URL ??
      process.env.SEEDANCE_API_BASE_URL ??
      "https://ark.cn-beijing.volces.com/api/v3"
    );
  }
  return process.env.ACEDATACLOUD_API_BASE_URL ?? "https://api.acedata.cloud";
}

function defaultApiToken(provider: ApiProvider): string {
  if (provider === "volcengine") {
    return process.env.VOLCENGINE_ARK_API_KEY ?? process.env.ARK_API_KEY ?? "";
  }
  return process.env.ACEDATACLOUD_API_TOKEN ?? "";
}

function tokenErrorMessage(provider: ApiProvider): string {
  if (provider === "volcengine") {
    return "ARK_API_KEY or VOLCENGINE_ARK_API_KEY is required to settle Seedance tasks";
  }
  return "ACEDATACLOUD_API_TOKEN is required to settle Seedance tasks";
}

function bundledFfmpegPath(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    const ffmpeg = require("@ffmpeg-installer/ffmpeg") as { path?: string };
    return ffmpeg.path;
  } catch {
    return undefined;
  }
}

function readSkillNamesById(): Map<string, string> {
  const promptManifestPath = path.resolve("docs/EFFECT_ANIMATION_PROMPTS.json");
  const manifest = readJsonIfExists<{ skills?: Array<{ name?: string; skillId?: string }> }>(promptManifestPath);
  return new Map(
    (manifest?.skills ?? [])
      .filter((skill): skill is { name: string; skillId: string } => Boolean(skill.skillId && skill.name))
      .map((skill) => [skill.skillId, skill.name])
  );
}

function canonicalSkillName(skillId: string, fallback: string): string {
  return skillNamesById.get(skillId) ?? fallback;
}

function readJsonIfExists<T>(filePath: string): T | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function stringArg(name: string, fallback: string): string {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function printHelp(): void {
  console.log(`Settle Seedance effect tasks.

Usage:
  npm run seedance:effects:settle -- --manifest=artifacts/seedance/effect-generation-tasks.json

Options:
  --manifest=<path>       Seedance generation manifest.
  --provider=<name>       acedata or volcengine. Defaults to manifest/env inference.
  --api-base-url=<url>    Override the provider API base URL.
  --out-dir=<path>        Effect asset output directory.
  --poll                  Poll until each task succeeds/fails.
  --max-polls=<count>     Maximum poll attempts.
  --poll-delay-ms=<ms>    Delay between poll attempts.
  --ffmpeg=<path>         ffmpeg executable for mp4 -> webm conversion.
  --skip-webm             Download only; record missing webm in the report.

Report safety:
  The settle report stores only a safe task summary. It does not write temporary video URLs,
  signed URL parameters, prompt payloads, Bearer tokens, or API keys.
`);
}
