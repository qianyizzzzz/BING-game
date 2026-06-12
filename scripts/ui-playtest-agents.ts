import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import zlib from "node:zlib";
import { chromium, type Browser, type Locator, type Page } from "playwright";

interface AgentLog {
  name: string;
  role: string;
  observations: string[];
  issues: string[];
}

interface RunConfig {
  autoServe: boolean;
  url: string;
  outDir: string;
}

const config = readConfig();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.resolve(config.outDir, `ui-agents-${timestamp}`);

fs.mkdirSync(runDir, { recursive: true });

const firstTimer: AgentLog = {
  name: "玩家 Agent A",
  role: "新手玩家",
  observations: [],
  issues: []
};
const competitor: AgentLog = {
  name: "玩家 Agent B",
  role: "竞技玩家",
  observations: [],
  issues: []
};
const producer: AgentLog = {
  name: "开发商 Agent",
  role: "制作人 / QA / 可维护性评审",
  observations: [],
  issues: []
};

const consoleErrors: string[] = [];
const failedActions: string[] = [];
const runNotes: string[] = [];
const visualChecks: string[] = [];
const visualIssues: string[] = [];
let roomId = "";
let serverProcess: ChildProcess | undefined;

if (config.autoServe) {
  serverProcess = await startServer(config.url);
}

try {
  const browser = await chromium.launch({ headless: true });
  const playerA = await newAgentPage(browser, "first-timer");
  const playerB = await newAgentPage(browser, "competitor");

  try {
    await openPlaytestHome(playerA);
    await screenshot(playerA, "01-player-a-landing.png");
    firstTimer.observations.push("首屏已加载，用于检查品牌、创建房间入口和角色选择是否清楚。");

    await fillPlayerName(playerA, "新手玩家");
    await clickByTestId(playerA, "create-room");
    roomId = await readRoomId(playerA);
    firstTimer.observations.push(`成功创建房间：${roomId || "未读取到房号"}`);

    await openPlaytestHome(playerB);
    await fillPlayerName(playerB, "竞技玩家");
    await fillRoomId(playerB, roomId);
    await clickByTestId(playerB, "join-room");
    await playerB.getByTestId("room-code").waitFor({ timeout: 15_000 });
    await screenshot(playerB, "02-player-b-joined.png");
    competitor.observations.push("成功加入房间，检查加入路径是否足够快。");

    await ensureGameCanStart(playerA);
    await clickByTestId(playerA, "start-game");
    await playerA.waitForSelector(".table-action-dock", { timeout: 15_000 });
    await playerB.waitForSelector(".table-action-dock", { timeout: 15_000 });
    producer.observations.push("房主能从大厅进入战斗桌面，行动 dock 已出现。");

    for (let turn = 1; turn <= 3; turn += 1) {
      await submitCakeTurn(playerA, turn, firstTimer);
      await submitCakeTurn(playerB, turn, competitor);
      await playerA.waitForTimeout(900);
      if (turn === 1) {
        await collectTargetPreviewCheck(playerA, firstTimer, "新手玩家");
        await collectTargetPreviewCheck(playerB, competitor, "竞技玩家");
      }
      await playerA.waitForTimeout(700);
    }

    await screenshot(playerA, "03-player-a-after-turns.png");
    await screenshot(playerB, "04-player-b-after-turns.png");

    await collectVisualHealth(playerA, firstTimer, "新手玩家");
    await collectVisualHealth(playerB, competitor, "竞技玩家");
    await collectHeuristicFeedback(playerA, firstTimer, "新手玩家");
    await collectHeuristicFeedback(playerB, competitor, "竞技玩家");
    collectProducerFeedback();
  } finally {
    await browser.close();
  }
} finally {
  stopServer(serverProcess);
}

const reportPath = path.join(runDir, "report.md");
fs.writeFileSync(reportPath, renderReport(), "utf-8");
console.log(`UI playtest agent report written to ${reportPath}`);

async function newAgentPage(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: name === "competitor" ? 1280 : 390, height: name === "competitor" ? 800 : 844 },
    isMobile: name !== "competitor"
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`[${name}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(`[${name}] ${error.message}`);
  });
  return page;
}

async function openPlaytestHome(page: Page): Promise<void> {
  await page.goto(config.url, { waitUntil: "domcontentloaded" });
  await page.getByTestId("player-name-input").waitFor({ timeout: 15_000 });
}

async function startServer(url: string): Promise<ChildProcess | undefined> {
  if (await isHealthy(url)) {
    runNotes.push("复用了已经运行的本地服务。");
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
  runNotes.push(`自动启动本地服务，日志：${path.basename(outputPath)}`);

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

async function fillPlayerName(page: Page, name: string): Promise<void> {
  const input = page.getByTestId("player-name-input").first();
  await input.fill(name);
}

async function fillRoomId(page: Page, value: string): Promise<void> {
  const roomInput = page.getByTestId("join-room-input").first();
  await roomInput.fill(value);
}

async function clickByTestId(page: Page, testId: string): Promise<void> {
  const target = page.getByTestId(testId).first();
  await activate(target);
}

async function optionalClickByTestId(page: Page, testId: string): Promise<void> {
  try {
    await clickByTestId(page, testId);
  } catch (error) {
    failedActions.push(`可选动作未完成：${testId} (${String(error)})`);
  }
}

async function ensureGameCanStart(page: Page): Promise<void> {
  const startButton = page.getByTestId("start-game").first();
  await startButton.waitFor({ state: "attached", timeout: 15_000 });
  if (await waitForEnabled(startButton, 1_000)) {
    return;
  }

  await optionalClickByTestId(page, "add-ai");
  if (!(await waitForEnabled(startButton, 15_000))) {
    const label = await startButton.innerText().catch(() => "开始");
    throw new Error(`开始按钮仍不可用：${label}`);
  }
}

async function readRoomId(page: Page): Promise<string> {
  await page.getByTestId("room-code").waitFor({ timeout: 15_000 });
  return (await page.getByTestId("room-code").first().innerText()).trim();
}

async function submitCakeTurn(page: Page, turn: number, agent: AgentLog): Promise<void> {
  try {
    await page.locator(".table-action-dock").first().waitFor({ state: "visible", timeout: 20_000 });
    const gainCake = page.getByTestId("action-mode-gain-cake").first();
    await activate(gainCake, 20_000);

    const submit = page.getByTestId("submit-action").first();
    if (!(await waitForEnabled(submit, 20_000))) {
      const label = await submit.innerText().catch(() => "未知按钮");
      const message = `第 ${turn} 回合提交按钮不可用：${label}`;
      failedActions.push(message);
      agent.issues.push(message);
      return;
    }
    await activate(submit, 20_000);
    agent.observations.push(`第 ${turn} 回合完成“吃饼”提交。`);
  } catch (error) {
    const message = `第 ${turn} 回合提交失败：${String(error)}`;
    failedActions.push(message);
    agent.issues.push(message);
  }
}

async function activate(locator: Locator, timeoutMs = 10_000): Promise<void> {
  await locator.waitFor({ state: "attached", timeout: timeoutMs });
  if (!(await waitForEnabled(locator, timeoutMs))) {
    const label = await locator.innerText().catch(() => "未知控件");
    throw new Error(`控件不可用：${label}`);
  }
  await locator.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.click();
    }
  });
}

async function waitForEnabled(locator: Locator, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await locator.isEnabled()) {
        return true;
      }
    } catch {
      // Retry until the UI settles after socket updates.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function screenshot(page: Page, fileName: string): Promise<void> {
  await page.screenshot({ path: path.join(runDir, fileName), fullPage: false });
}

async function collectHeuristicFeedback(page: Page, agent: AgentLog, label: string): Promise<void> {
  const bodyText = await page.locator("body").innerText();

  if (!bodyText.includes("当前选择")) {
    agent.issues.push("行动面板没有暴露“当前选择”，玩家不容易确认将要提交什么。");
  }
  if (!bodyText.includes("第") || !bodyText.includes("回合")) {
    agent.issues.push("回合信息不明显，玩家可能无法判断当前节奏。");
  }
  if (!bodyText.includes("提交")) {
    agent.issues.push("主操作按钮不明显。");
  }
  if (agent.issues.length === 0) {
    agent.observations.push(`${label} 视角没有触发关键可用性告警。`);
  }
}

async function collectVisualHealth(page: Page, agent: AgentLog, label: string): Promise<void> {
  const canvasHealth = await inspectCanvas(page);
  if (canvasHealth.ok) {
    const message = `${label}: 3D 牌桌 canvas 正常渲染（${canvasHealth.message}）。`;
    visualChecks.push(message);
    agent.observations.push(message);
  } else {
    const message = `${label}: 3D 牌桌 canvas 异常（${canvasHealth.message}）。`;
    visualIssues.push(message);
    agent.issues.push(message);
  }

  const overlaps = await findCriticalOverlaps(page);
  if (overlaps.length === 0) {
    const message = `${label}: 关键 HUD、读数和行动面板没有明显互相遮挡。`;
    visualChecks.push(message);
    agent.observations.push(message);
    return;
  }

  for (const overlap of overlaps) {
    const message = `${label}: ${overlap}`;
    visualIssues.push(message);
    agent.issues.push(message);
  }
}

async function collectTargetPreviewCheck(page: Page, agent: AgentLog, label: string): Promise<void> {
  try {
    await activate(page.getByTestId("action-mode-attack").first());
    const highlightedSeats = page.locator(".poker-seat-highlighted");
    await highlightedSeats.first().waitFor({ state: "visible", timeout: 5_000 });
    const count = await highlightedSeats.count();
    const message = `${label}: 选择攻击模式后 ${count} 个目标座位出现高亮预览。`;
    visualChecks.push(message);
    agent.observations.push(message);
  } catch (error) {
    const message = `${label}: 目标预览高亮检查失败：${String(error)}`;
    visualIssues.push(message);
    agent.issues.push(message);
  }
}

async function inspectCanvas(page: Page): Promise<{ ok: boolean; message: string }> {
  let lastResult: { ok: boolean; message: string } = { ok: false, message: "尚未检查" };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    lastResult = await inspectCanvasOnce(page);
    if (lastResult.ok || !lastResult.message.includes("canvas 边界")) {
      return lastResult;
    }
    await page.waitForTimeout(500);
  }
  return lastResult;
}

async function inspectCanvasOnce(page: Page): Promise<{ ok: boolean; message: string }> {
  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 10_000 });
  const box = await canvas.boundingBox();
  if (!box) {
    return { ok: false, message: "未读取到 canvas 边界" };
  }
  if (box.width < 120 || box.height < 120) {
    return { ok: false, message: `尺寸过小 ${Math.round(box.width)}x${Math.round(box.height)}` };
  }

  const image = await page.screenshot({
    animations: "allow",
    clip: {
      x: Math.max(0, Math.floor(box.x)),
      y: Math.max(0, Math.floor(box.y)),
      width: Math.max(1, Math.floor(box.width)),
      height: Math.max(1, Math.floor(box.height))
    }
  });
  const analysis = analyzePng(image);
  return {
    ok: analysis.visibleRatio > 0.04 && analysis.uniqueBuckets >= 6,
    message: `尺寸 ${analysis.width}x${analysis.height}，可见采样 ${Math.round(
      analysis.visibleRatio * 100
    )}%，色彩桶 ${analysis.uniqueBuckets}`
  };
}

interface PngAnalysis {
  height: number;
  uniqueBuckets: number;
  visibleRatio: number;
  width: number;
}

function analyzePng(buffer: Buffer): PngAnalysis {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return { height: 0, uniqueBuckets: 0, visibleRatio: 0, width: 0 };
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
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
    } else if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  const bytesPerPixel = pngBytesPerPixel(colorType);
  if (width <= 0 || height <= 0 || bitDepth !== 8 || bytesPerPixel === 0 || idatChunks.length === 0) {
    return { height, uniqueBuckets: 0, visibleRatio: 0, width };
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(height * stride);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = inflated.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    const output = pixels.subarray(y * stride, (y + 1) * stride);
    const previous = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : undefined;
    unfilterPngRow(filter, row, output, previous, bytesPerPixel);
  }

  const stepX = Math.max(1, Math.floor(width / 36));
  const stepY = Math.max(1, Math.floor(height / 36));
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
    const left = index >= bytesPerPixel ? output[index - bytesPerPixel] : 0;
    const up = previous ? previous[index] : 0;
    const upLeft = previous && index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
    const value = row[index];

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
    const value = buffer[offset];
    return [value, value, value, 255];
  }
  if (colorType === 2) {
    return [buffer[offset], buffer[offset + 1], buffer[offset + 2], 255];
  }
  if (colorType === 4) {
    const value = buffer[offset];
    return [value, value, value, buffer[offset + 1]];
  }
  return [buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]];
}

async function findCriticalOverlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const targets = [
      { label: "桌面状态 HUD", selector: ".battle-status-hud" },
      { label: "行动面板", selector: ".table-action-dock" },
      { label: "深度读数 HUD", selector: ".abyss-table-hud" }
    ];
    const rects = targets.flatMap((target) => {
      const element = document.querySelector(target.selector);
      if (!(element instanceof HTMLElement)) {
        return [];
      }
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return [];
      }
      return [{ ...target, rect }];
    });
    const issues: string[] = [];

    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const first = rects[i];
        const second = rects[j];
        const overlapWidth = Math.max(
          0,
          Math.min(first.rect.right, second.rect.right) - Math.max(first.rect.left, second.rect.left)
        );
        const overlapHeight = Math.max(
          0,
          Math.min(first.rect.bottom, second.rect.bottom) - Math.max(first.rect.top, second.rect.top)
        );
        const overlapArea = overlapWidth * overlapHeight;
        if (overlapArea <= 24) {
          continue;
        }

        const smallerArea = Math.min(first.rect.width * first.rect.height, second.rect.width * second.rect.height);
        if (overlapArea / smallerArea > 0.08) {
          issues.push(`${first.label} 与 ${second.label} 有明显重叠（约 ${Math.round(overlapArea)}px²）`);
        }
      }
    }

    return issues;
  });
}

function collectProducerFeedback(): void {
  if (consoleErrors.length > 0) {
    producer.issues.push(`发现 ${consoleErrors.length} 条 console/page error，需要优先排查。`);
  }
  if (failedActions.length > 0) {
    producer.issues.push(`发现 ${failedActions.length} 个自动化操作失败，说明 UI selector 或流程可能不稳定。`);
  }
  if (!roomId) {
    producer.issues.push("未成功读取房号，创建/加入路径需要检查。");
  }
  if (visualIssues.length > 0) {
    producer.issues.push(`发现 ${visualIssues.length} 个视觉 QA 告警，需要检查截图。`);
  }
  if (producer.issues.length === 0) {
    producer.observations.push("自动化流程未发现阻断级错误。");
  }
}

function renderReport(): string {
  return [
    "# UI Playtest Agents Report",
    "",
    `- URL: ${config.url}`,
    `- Room: ${roomId || "未读取"}`,
    `- Time: ${new Date().toLocaleString("zh-CN")}`,
    `- Server: ${config.autoServe ? "auto" : "external"}`,
    "",
    "## Run Notes",
    "",
    ...(runNotes.length > 0 ? runNotes.map((item) => `- ${item}`) : ["- 无"]),
    "",
    renderAgent(firstTimer),
    renderAgent(competitor),
    renderAgent(producer),
    "## Visual QA",
    "",
    ...(visualChecks.length > 0 ? visualChecks.map((item) => `- ${item}`) : ["- 无通过项"]),
    "",
    ...(visualIssues.length > 0 ? visualIssues.map((item) => `- ${item}`) : ["- 无告警"]),
    "",
    "## Console Errors",
    "",
    ...(consoleErrors.length > 0 ? consoleErrors.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "## Failed Actions",
    "",
    ...(failedActions.length > 0 ? failedActions.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "## Screenshots",
    "",
    "- `01-player-a-landing.png`",
    "- `02-player-b-joined.png`",
    "- `03-player-a-after-turns.png`",
    "- `04-player-b-after-turns.png`",
    ""
  ].join("\n");
}

function renderAgent(agent: AgentLog): string {
  return [
    `## ${agent.name}（${agent.role}）`,
    "",
    "### 观察",
    "",
    ...(agent.observations.length > 0 ? agent.observations.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "### 问题",
    "",
    ...(agent.issues.length > 0 ? agent.issues.map((item) => `- ${item}`) : ["- 无"]),
    ""
  ].join("\n");
}

function readConfig(): RunConfig {
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
  const outArg = process.argv.find((arg) => arg.startsWith("--out="));
  const noServer = process.argv.includes("--no-server");
  return {
    autoServe: !noServer && !urlArg,
    url: urlArg?.slice("--url=".length) || process.env.BING_PLAYTEST_URL || "http://localhost:3001",
    outDir: outArg?.slice("--out=".length) || path.resolve("artifacts", "playtests")
  };
}
