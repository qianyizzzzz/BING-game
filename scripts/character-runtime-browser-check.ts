import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import zlib from "node:zlib";
import { chromium, type Browser, type Locator, type Page } from "playwright";
import { CHARACTER_ROSTER, type CharacterProfile } from "../apps/client/src/lib/characters.js";

interface RunConfig {
  autoServe: boolean;
  outDir: string;
  url: string;
}

interface SceneSample {
  characterCount: number;
  characterMinHeightRatio: number;
  characterMinVisibleRatio: number;
  characterScreenBboxes: string;
  clientHeight: number;
  clientWidth: number;
  colorBuckets: number;
  opaquePixels: number;
  pixelCheck: "screenshot" | "unreadable";
  visibleRatio: number;
}

interface CharacterRuntimeResult {
  characterId: string;
  characterName: string;
  consoleIssues: string[];
  expectedModel: string;
  observedModels: string[];
  roomId: string;
  scene?: SceneSample;
  screenshot?: string;
}

const config = readConfig();
const selectedCharacterIds = readSelectedCharacterIds();
const activeRoster = selectedCharacterIds
  ? CHARACTER_ROSTER.filter((character) => selectedCharacterIds.has(character.id))
  : CHARACTER_ROSTER;
const unknownCharacterIds = selectedCharacterIds
  ? [...selectedCharacterIds].filter((id) => !CHARACTER_ROSTER.some((character) => character.id === id))
  : [];
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.resolve(config.outDir, `character-runtime-${timestamp}`);
const failures: string[] = [];
const results: CharacterRuntimeResult[] = [];
let serverProcess: ChildProcess | undefined;

fs.mkdirSync(runDir, { recursive: true });

if (unknownCharacterIds.length > 0) {
  failures.push(`unknown character filter: ${unknownCharacterIds.join(", ")}`);
}

if (config.autoServe) {
  serverProcess = await startServer(config.url);
}

try {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [index, character] of activeRoster.entries()) {
      results.push(await verifyCharacter(browser, character, index));
    }
  } finally {
    await browser.close();
  }
} finally {
  stopServer(serverProcess);
}

const reportPath = path.join(runDir, "report.md");
fs.writeFileSync(reportPath, renderReport(), "utf-8");

if (failures.length > 0) {
  console.error(`character runtime browser check failed: ${failures.length} issue(s)`);
  for (const failure of failures) {
    console.error(`fail - ${failure}`);
  }
  console.error(`report - ${reportPath}`);
  process.exitCode = 1;
} else {
  console.log(`character runtime browser check passed: ${activeRoster.length} characters`);
  console.log(`report - ${reportPath}`);
}

async function verifyCharacter(
  browser: Browser,
  character: CharacterProfile,
  index: number
): Promise<CharacterRuntimeResult> {
  const expectedModel = path.basename(new URL(character.modelUrl, config.url).pathname);
  const consoleIssues: string[] = [];
  const observedModels = new Set<string>();
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const spectatorContext = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const host = await hostContext.newPage();
  const spectator = await spectatorContext.newPage();
  attachIssueLogging(host, `${character.id}:host`, consoleIssues);
  attachIssueLogging(spectator, `${character.id}:spectator`, consoleIssues);

  let roomId = "";
  let scene: SceneSample | undefined;
  let screenshot: string | undefined;

  try {
    await openPlaytestHome(host);
    await selectCharacter(host, character);
    await fillPlayerName(host, `角色验证-${index + 1}`);
    await clickByTestId(host, "create-room");
    roomId = await readRoomId(host);

    const expectedModelResponse = spectator
      .waitForResponse((response) => {
        const url = response.url();
        if (!url.endsWith(".glb")) {
          return false;
        }
        const modelName = path.basename(new URL(url).pathname);
        observedModels.add(modelName);
        return response.status() < 400 && modelName === expectedModel;
      }, { timeout: 60_000 })
      .then(
        () => undefined,
        (error) => new Error(`${expectedModel} model response timed out; observed=${[...observedModels].sort().join(",") || "none"}; ${errorMessage(error)}`)
      );

    await openPlaytestHome(spectator);
    await fillRoomId(spectator, roomId);
    await clickByTestId(spectator, "spectate-room");
    await waitForRoomLobby(spectator, "观战房间");
    const modelResponseError = await expectedModelResponse;
    if (modelResponseError) {
      throw modelResponseError;
    }
    scene = await waitForRenderableScene(spectator);

    screenshot = `${String(index + 1).padStart(2, "0")}-${character.id}.png`;
    await spectator.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: false,
      path: path.join(runDir, screenshot),
      timeout: 60_000
    });

    if (!scene || scene.clientWidth < 300 || scene.clientHeight < 180) {
      failures.push(`${character.id}: 3D canvas size is too small`);
    } else if (scene.characterCount < 1) {
      failures.push(`${character.id}: character runtime bbox metadata missing`);
    } else if (scene.characterMinHeightRatio < 0.12) {
      failures.push(`${character.id}: character screen height ratio is too small (${scene.characterMinHeightRatio})`);
    } else if (scene.characterMinVisibleRatio < 0.55) {
      failures.push(`${character.id}: character bbox is heavily clipped (${scene.characterMinVisibleRatio})`);
    } else if (scene.pixelCheck === "screenshot" && (scene.visibleRatio <= 0.04 || scene.colorBuckets < 6)) {
      failures.push(`${character.id}: 3D scene screenshot sample looks blank`);
    }
  } catch (error) {
    failures.push(`${character.id}: ${errorMessage(error)}`);
  } finally {
    await hostContext.close();
    await spectatorContext.close();
  }

  return {
    characterId: character.id,
    characterName: character.name,
    consoleIssues,
    expectedModel,
    observedModels: [...observedModels].sort(),
    roomId,
    scene,
    screenshot
  };
}

async function openPlaytestHome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto(config.url, { waitUntil: "domcontentloaded" });
  await page.getByTestId("player-name-input").waitFor({ timeout: 20_000 });
}

async function selectCharacter(page: Page, character: CharacterProfile): Promise<void> {
  await clickByTestId(page, `character-option-${character.id}`);
  await clickByTestId(page, "confirm-character");
  await page.waitForFunction(
    (characterId) => {
      const raw = window.localStorage.getItem("bing.account.v1");
      if (!raw) {
        return false;
      }
      try {
        const account = JSON.parse(raw);
        return account.characterId === characterId;
      } catch {
        return false;
      }
    },
    character.id,
    { timeout: 5_000 }
  );
}

async function fillPlayerName(page: Page, name: string): Promise<void> {
  const input = page.getByTestId("player-name-input").first();
  await input.fill(name);
  if (!(await waitForInputValue(input, name, 5_000))) {
    throw new Error(`玩家名没有稳定写入：${name}`);
  }
}

async function fillRoomId(page: Page, value: string): Promise<void> {
  const input = page.getByTestId("join-room-input").first();
  await input.fill(value);
  if (!(await waitForInputValue(input, value, 5_000))) {
    throw new Error(`房号没有稳定写入：${value}`);
  }
  if (!(await waitForEnabled(page.getByTestId("spectate-room").first(), 10_000))) {
    throw new Error(`观战按钮没有变为可用：${value}`);
  }
}

async function clickByTestId(page: Page, testId: string): Promise<void> {
  await activate(page.getByTestId(testId).first());
}

async function activate(locator: Locator, timeoutMs = 10_000): Promise<void> {
  await locator.waitFor({ state: "attached", timeout: timeoutMs });
  if (!(await waitForEnabled(locator, timeoutMs))) {
    const label = await locator.innerText().catch(() => "未知控件");
    throw new Error(`控件不可用：${label}`);
  }
  await locator.scrollIntoViewIfNeeded({ timeout: timeoutMs });
  await locator.dispatchEvent("click", undefined, { timeout: timeoutMs });
}

async function waitForEnabled(locator: Locator, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await locator.isEnabled()) {
        return true;
      }
    } catch {
      // Retry while React/socket state settles.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function waitForInputValue(locator: Locator, expected: string, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if ((await locator.inputValue()).trim() === expected) {
        return true;
      }
    } catch {
      // Retry while React controlled inputs flush.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

async function readRoomId(page: Page): Promise<string> {
  await page.getByTestId("room-code").waitFor({ timeout: 20_000 });
  return (await page.getByTestId("room-code").first().innerText()).trim();
}

async function waitForRoomLobby(page: Page, actionLabel: string): Promise<void> {
  const roomCode = page.getByTestId("room-code").first();
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (await roomCode.isVisible().catch(() => false)) {
      return;
    }

    const message = await readStatusMessage(page);
    if (message) {
      throw new Error(`${actionLabel}失败：${message}`);
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`${actionLabel}后未进入房间`);
}

async function readStatusMessage(page: Page): Promise<string> {
  const message = page.locator("p").filter({ hasText: /失败|不存在|无法|连接服务器失败|请求失败/ }).first();
  if (!(await message.isVisible().catch(() => false))) {
    return "";
  }
  return (await message.innerText()).trim();
}

async function waitForRenderableScene(page: Page): Promise<SceneSample> {
  const scene = page.locator(".table-scene-3d").first();
  await scene.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(
    () => {
      const element = document.querySelector(".table-scene-3d");
      return element instanceof HTMLElement && Number(element.dataset.characterRuntimeCount ?? "0") > 0;
    },
    undefined,
    { timeout: 20_000 }
  );
  await page.waitForTimeout(900);
  const box = await scene.boundingBox();
  if (!box) {
    throw new Error("未找到 3D scene bounding box");
  }
  const runtimeMetrics = await scene.evaluate((element) => ({
    characterCount: Number(element.getAttribute("data-character-runtime-count") ?? "0"),
    characterMinHeightRatio: Number(element.getAttribute("data-character-min-height-ratio") ?? "0"),
    characterMinVisibleRatio: Number(element.getAttribute("data-character-min-visible-ratio") ?? "0"),
    characterScreenBboxes: element.getAttribute("data-character-screen-bboxes") ?? ""
  }));

  try {
    const image = await scene.screenshot({
      animations: "disabled",
      timeout: 60_000
    });
    const analysis = analyzePng(image);
    return {
      ...runtimeMetrics,
      clientHeight: Math.round(box.height),
      clientWidth: Math.round(box.width),
      colorBuckets: analysis.uniqueBuckets,
      opaquePixels: analysis.visibleSamples,
      pixelCheck: "screenshot",
      visibleRatio: analysis.visibleRatio
    };
  } catch {
    return {
      ...runtimeMetrics,
      clientHeight: Math.round(box.height),
      clientWidth: Math.round(box.width),
      colorBuckets: 0,
      opaquePixels: 0,
      pixelCheck: "unreadable",
      visibleRatio: 0
    };
  }
}

interface PngAnalysis {
  height: number;
  uniqueBuckets: number;
  visibleRatio: number;
  visibleSamples: number;
  width: number;
}

function analyzePng(buffer: Buffer): PngAnalysis {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return { height: 0, uniqueBuckets: 0, visibleRatio: 0, visibleSamples: 0, width: 0 };
  }

  let offset = pngSignature.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) {
      break;
    }

    if (type === "IHDR") {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8] ?? 0;
      colorType = buffer[dataStart + 9] ?? 0;
    } else if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  const bytesPerPixel = pngBytesPerPixel(colorType);
  if (width <= 0 || height <= 0 || bitDepth !== 8 || bytesPerPixel === 0 || idatChunks.length === 0) {
    return { height, uniqueBuckets: 0, visibleRatio: 0, visibleSamples: 0, width };
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(height * stride);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset] ?? 0;
    sourceOffset += 1;
    const row = inflated.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    const output = pixels.subarray(y * stride, (y + 1) * stride);
    const previous = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : undefined;
    unfilterPngRow(filter, row, output, previous, bytesPerPixel);
  }

  const stepX = Math.max(1, Math.floor(width / 48));
  const stepY = Math.max(1, Math.floor(height / 48));
  const buckets = new Set<string>();
  let totalSamples = 0;
  let visibleSamples = 0;

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const pixelOffset = y * stride + x * bytesPerPixel;
      const [red, green, blue, alpha] = readPngPixel(pixels, pixelOffset, colorType);
      totalSamples += 1;
      if (alpha > 0 && red + green + blue > 18) {
        visibleSamples += 1;
        buckets.add(`${red >> 5}:${green >> 5}:${blue >> 5}`);
      }
    }
  }

  return {
    height,
    uniqueBuckets: buckets.size,
    visibleRatio: totalSamples > 0 ? visibleSamples / totalSamples : 0,
    visibleSamples,
    width
  };
}

function pngBytesPerPixel(colorType: number): number {
  if (colorType === 0) {
    return 1;
  }
  if (colorType === 2) {
    return 3;
  }
  if (colorType === 4) {
    return 2;
  }
  if (colorType === 6) {
    return 4;
  }
  return 0;
}

function unfilterPngRow(
  filter: number,
  row: Buffer,
  output: Buffer,
  previous: Buffer | undefined,
  bytesPerPixel: number
): void {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? output[index - bytesPerPixel] ?? 0 : 0;
    const up = previous ? previous[index] ?? 0 : 0;
    const upLeft = previous && index >= bytesPerPixel ? previous[index - bytesPerPixel] ?? 0 : 0;
    const value = row[index] ?? 0;

    if (filter === 0) {
      output[index] = value;
    } else if (filter === 1) {
      output[index] = (value + left) & 0xff;
    } else if (filter === 2) {
      output[index] = (value + up) & 0xff;
    } else if (filter === 3) {
      output[index] = (value + Math.floor((left + up) / 2)) & 0xff;
    } else if (filter === 4) {
      output[index] = (value + paethPredictor(left, up, upLeft)) & 0xff;
    } else {
      output[index] = value;
    }
  }
}

function paethPredictor(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }
  if (upDistance <= upLeftDistance) {
    return up;
  }
  return upLeft;
}

function readPngPixel(buffer: Buffer, offset: number, colorType: number): [number, number, number, number] {
  if (colorType === 0) {
    const value = buffer[offset] ?? 0;
    return [value, value, value, 255];
  }
  if (colorType === 2) {
    return [buffer[offset] ?? 0, buffer[offset + 1] ?? 0, buffer[offset + 2] ?? 0, 255];
  }
  if (colorType === 4) {
    const value = buffer[offset] ?? 0;
    return [value, value, value, buffer[offset + 1] ?? 0];
  }
  return [
    buffer[offset] ?? 0,
    buffer[offset + 1] ?? 0,
    buffer[offset + 2] ?? 0,
    buffer[offset + 3] ?? 0
  ];
}

function attachIssueLogging(page: Page, label: string, consoleIssues: string[]): void {
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleIssues.push(`[${label}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`[${label}] ${error.message}`);
  });
}

async function startServer(url: string): Promise<ChildProcess | undefined> {
  if (await isHealthy(url)) {
    return undefined;
  }

  const targetUrl = new URL(url);
  const outputPath = path.join(runDir, "server.log");
  const logStream = fs.createWriteStream(outputPath, { flags: "a" });
  const tsxCli = path.resolve("node_modules", "tsx", "dist", "cli.mjs");
  const child = spawn(process.execPath, [tsxCli, "apps/server/src/index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: targetUrl.port || process.env.PORT || "3001"
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  child.stdout?.pipe(logStream, { end: false });
  child.stderr?.pipe(logStream, { end: false });

  let ready = false;
  const launchFailure = new Promise<never>((_, reject) => {
    child.once("error", (error) => {
      logStream.end();
      if (!ready) {
        reject(error);
      }
    });
    child.once("exit", (code, signal) => {
      logStream.end();
      if (!ready) {
        reject(new Error(`本地服务提前退出：code=${code ?? "null"} signal=${signal ?? "null"}`));
      }
    });
  });

  try {
    await Promise.race([waitForHealth(url, 30_000), launchFailure]);
    ready = true;
    return child;
  } catch (error) {
    stopServer(child);
    throw error;
  }
}

async function waitForHealth(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isHealthy(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`本地服务未在 ${timeoutMs}ms 内启动：${url}`);
}

async function isHealthy(url: string): Promise<boolean> {
  try {
    const response = await fetch(new URL("/health", url));
    return response.ok;
  } catch {
    return false;
  }
}

function stopServer(child: ChildProcess | undefined): void {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    return;
  }

  child.kill("SIGTERM");
}

function renderReport(): string {
  const lines = [
    "# 角色运行时浏览器验证",
    "",
    `- URL: ${config.url}`,
    `- 时间: ${new Date().toLocaleString("zh-CN")}`,
    `- 输出目录: ${runDir}`,
    `- 结果: ${failures.length > 0 ? `失败 ${failures.length} 项` : `通过 ${results.length} 个角色`}`,
    "",
    "## 角色结果",
    ""
  ];

  for (const result of results) {
    const sceneText = result.scene
      ? `${result.scene.clientWidth}x${result.scene.clientHeight}, visible=${Math.round(result.scene.visibleRatio * 100)}%, samples=${result.scene.opaquePixels}, buckets=${result.scene.colorBuckets}, characters=${result.scene.characterCount}, minHeight=${Math.round(result.scene.characterMinHeightRatio * 100)}%, minVisible=${Math.round(result.scene.characterMinVisibleRatio * 100)}%, ${result.scene.pixelCheck}`
      : "未采样";
    lines.push(
      `- ${result.characterName} (${result.characterId})`,
      `  - 房间: ${result.roomId || "未读取"}`,
      `  - 期望模型: ${result.expectedModel}`,
      `  - 观察到模型: ${result.observedModels.length > 0 ? result.observedModels.join(", ") : "无"}`,
      `  - Canvas: ${sceneText}`,
      `  - BBox: ${result.scene?.characterScreenBboxes || "无"}`,
      `  - 截图: ${result.screenshot ? `\`${result.screenshot}\`` : "无"}`,
      `  - Console/Page Error: ${result.consoleIssues.length > 0 ? result.consoleIssues.length : "无"}`,
      ""
    );
  }

  lines.push("## 失败项", "");
  if (failures.length > 0) {
    lines.push(...failures.map((failure) => `- ${failure}`), "");
  } else {
    lines.push("- 无", "");
  }

  lines.push("## Console / Page Error", "");
  const consoleIssues = results.flatMap((result) => result.consoleIssues);
  if (consoleIssues.length > 0) {
    lines.push(...consoleIssues.map((issue) => `- ${issue}`), "");
  } else {
    lines.push("- 无", "");
  }

  return lines.join("\n");
}

function readConfig(): RunConfig {
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
  const outArg = process.argv.find((arg) => arg.startsWith("--out="));
  const noServer = process.argv.includes("--no-server");
  return {
    autoServe: !noServer && !urlArg,
    outDir: outArg?.slice("--out=".length) || path.resolve("artifacts", "playtests"),
    url: urlArg?.slice("--url=".length) || process.env.BING_PLAYTEST_URL || "http://localhost:3001"
  };
}

function readSelectedCharacterIds(): Set<string> | undefined {
  const characterArg = process.argv.find((arg) => arg.startsWith("--character="));
  if (!characterArg) {
    return undefined;
  }

  const selected = characterArg
    .slice("--character=".length)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return selected.length > 0 ? new Set(selected) : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
