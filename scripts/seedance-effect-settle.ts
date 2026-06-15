import fs from "node:fs";
import path from "node:path";

interface GenerationManifest {
  tasks: GenerationTask[];
}

interface GenerationTask {
  response?: unknown;
  skillId: string;
  skillName: string;
}

interface SettledTask {
  downloaded: string[];
  queryResponse?: unknown;
  skillId: string;
  skillName: string;
  status: "missing_task_id" | "pending" | "failed" | "downloaded";
  taskId?: string;
}

const apiBaseUrl = process.env.ACEDATACLOUD_API_BASE_URL ?? "https://api.acedata.cloud";
const apiToken = process.env.ACEDATACLOUD_API_TOKEN ?? "";
const manifestPath = path.resolve(
  stringArg("--manifest", "artifacts/seedance/effect-generation-tasks.json")
);
const outDir = path.resolve(stringArg("--out-dir", "apps/client/public/assets/effects"));
const poll = process.argv.includes("--poll");
const maxPolls = numberArg("--max-polls", poll ? 24 : 1);
const pollDelayMs = numberArg("--poll-delay-ms", 10_000);

if (!apiToken) {
  throw new Error("ACEDATACLOUD_API_TOKEN is required to settle Seedance tasks");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as GenerationManifest;
const settled: SettledTask[] = [];

for (const task of manifest.tasks) {
  const taskId = extractTaskId(task.response);
  if (!taskId) {
    settled.push({
      downloaded: [],
      skillId: task.skillId,
      skillName: task.skillName,
      status: "missing_task_id"
    });
    continue;
  }

  const result = await waitForTask(taskId);
  const status = taskStatus(result);
  if (status !== "succeeded") {
    settled.push({
      downloaded: [],
      queryResponse: result,
      skillId: task.skillId,
      skillName: task.skillName,
      status: status === "failed" ? "failed" : "pending",
      taskId
    });
    continue;
  }

  const urls = extractResultUrls(result);
  const downloaded = await downloadTaskAssets(task.skillId, urls);
  settled.push({
    downloaded,
    queryResponse: result,
    skillId: task.skillId,
    skillName: task.skillName,
    status: downloaded.length > 0 ? "downloaded" : "pending",
    taskId
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
  const response = await fetch(`${apiBaseUrl}/seedance/tasks`, {
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
): Promise<string[]> {
  const skillDir = path.join(outDir, skillId);
  fs.mkdirSync(skillDir, { recursive: true });
  const downloaded: string[] = [];

  if (urls.videoUrl) {
    const videoPath = path.join(skillDir, "effect.mp4");
    await downloadFile(urls.videoUrl, videoPath);
    downloaded.push(videoPath);
  }

  if (urls.posterUrl) {
    const posterPath = path.join(skillDir, "poster.png");
    await downloadFile(urls.posterUrl, posterPath);
    downloaded.push(posterPath);
  }

  return downloaded;
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

function extractResultUrls(value: unknown): { posterUrl?: string; videoUrl?: string } {
  const urls = findUrls(value);
  return {
    posterUrl: urls.find((url) => /\.(png|jpg|jpeg|webp)(\?|$)/i.test(url)),
    videoUrl: urls.find((url) => /\.(mp4|webm|mov)(\?|$)/i.test(url))
  };
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

function stringArg(name: string, fallback: string): string {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}
