import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Locator, type Page } from "playwright";

interface RunConfig {
  autoServe: boolean;
  outDir: string;
  url: string;
}

interface BattleStatus {
  countdown: string;
  countdownSeconds: number | null;
  main: string;
  phase: string;
  progress: string;
  prompt: string;
}

interface SummaryState {
  actionLabel: string;
  cakeDeltaCount: number;
  resourceDeltaCount: number;
  resourceDeltas: string;
  stepCount: number;
  text: string;
}

interface RecorderEvidence {
  humanGainCakeSamples: number;
  matchPhase: string;
  matchTurnNumber: number;
  trainingSamples: number;
}

interface StartedServer {
  process: ChildProcess | undefined;
  recorderRoot: string;
  reused: boolean;
}

interface TrainingSample {
  playerId: string;
  playerKind: string;
  action: {
    actions?: Array<{ type?: string }>;
    type?: string;
  };
  state?: {
    turnNumber?: number;
  };
}

interface MatchState {
  phase?: string;
  turnNumber?: number;
}

const TURN_LIMIT_SECONDS = 5;
const config = readConfig();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.resolve(config.outDir, `timeout-fallback-${timestamp}`);
const observations: string[] = [];
const issues: string[] = [];
const consoleIssues: string[] = [];
const screenshots: string[] = [];
let roomId = "";
let recorderRoot = defaultRecorderRoot();
let serverProcess: ChildProcess | undefined;
let serverWasReused = false;

fs.mkdirSync(runDir, { recursive: true });

if (config.autoServe) {
  const started = await startServer(config.url);
  serverProcess = started.process;
  recorderRoot = started.recorderRoot;
  serverWasReused = started.reused;
}

try {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  attachIssueLogging(page, "timeout-player");

  try {
    await openHome(page);
    await fillPlayerName(page, "限时玩家");
    await clickByTestId(page, "create-room");
    roomId = await readRoomId(page);
    observations.push(`创建短限时房间：${roomId}。`);

    await setTurnLimit(page, TURN_LIMIT_SECONDS);
    await clickByTestId(page, "add-ai");
    await waitForEnabled(page.getByTestId("start-game").first(), 15_000);
    await screenshot(page, "01-timeout-lobby.png");
    observations.push(`房主设置回合限时 ${TURN_LIMIT_SECONDS}s，并加入 1 名 AI。`);

    await clickByTestId(page, "start-game");
    await waitForActionDock(page);
    const startedStatus = await readBattleStatus(page);
    if (startedStatus.countdownSeconds === null || startedStatus.countdownSeconds > TURN_LIMIT_SECONDS) {
      throw new Error(`开局倒计时不符合 ${TURN_LIMIT_SECONDS}s 设置：${startedStatus.countdown}`);
    }
    await screenshot(page, "02-timeout-start.png");
    observations.push(
      `进入第 1 回合，初始倒计时=${startedStatus.countdown}，进度=${startedStatus.progress}。`
    );

    await waitForCountdownAtMost(page, 3, 8_000);
    const tickingStatus = await readBattleStatus(page);
    observations.push(`真人玩家未操作，倒计时继续推进到 ${tickingStatus.countdown}。`);

    const recorderEvidence = await waitForRecorderEvidence(roomId, recorderRoot, serverWasReused ? 2_500 : 12_000);
    if (recorderEvidence) {
      if (recorderEvidence.matchTurnNumber < 2 || recorderEvidence.humanGainCakeSamples < 1) {
        throw new Error(`复盘证据不完整：${JSON.stringify(recorderEvidence)}`);
      }
      observations.push(
        `复盘/训练样本已记录：matchTurn=${recorderEvidence.matchTurnNumber}，phase=${recorderEvidence.matchPhase}，真人 gain_cake 样本=${recorderEvidence.humanGainCakeSamples}/${recorderEvidence.trainingSamples}。`
      );
    } else if (serverWasReused) {
      observations.push("复用了外部本地服务，未读取到本次隔离复盘文件；本轮以 DOM 推进和截图为准。");
    } else {
      throw new Error(`未读取到短限时房间复盘文件：${roomId}`);
    }

    await waitForTurnAtLeast(page, 2, 8_000);
    await page.waitForTimeout(900);
    const afterTimeoutStatus = await readBattleStatus(page);
    const summary = await readSummaryState(page);
    await screenshot(page, "03-after-timeout-fallback.png");

    if (summary.stepCount <= 0) {
      observations.push("纯吃饼兜底没有 battle step，桌面保持“暂无结算”；复盘样本用于确认自动行动。");
    } else if (summary.resourceDeltaCount <= 0 || summary.cakeDeltaCount <= 0) {
      observations.push(`桌面结算摘要没有饼变化 chip：${JSON.stringify(summary)}`);
    }

    observations.push(
      `超时后自动推进到 ${afterTimeoutStatus.main}，行动面板重新可用，结算=${summary.actionLabel}，资源变化=${summary.resourceDeltas}。`
    );
  } catch (error) {
    issues.push(errorMessage(error));
    await screenshot(page, "99-timeout-error.png").catch(() => undefined);
  } finally {
    await context.close();
    await browser.close();
  }
} finally {
  stopServer(serverProcess);
}

const reportPath = path.join(runDir, "report.md");
fs.writeFileSync(reportPath, renderReport(), "utf-8");
console.log(`timeout fallback smoke report written to ${reportPath}`);

if (issues.length > 0 || consoleIssues.length > 0) {
  throw new Error(`timeout fallback smoke failed: issues=${issues.length}, console=${consoleIssues.length}`);
}

async function openHome(page: Page): Promise<void> {
  await page.goto(config.url, { waitUntil: "domcontentloaded" });
  await page.getByTestId("player-name-input").waitFor({ timeout: 20_000 });
}

async function fillPlayerName(page: Page, name: string): Promise<void> {
  const input = page.getByTestId("player-name-input").first();
  await input.fill(name);
  await waitForInputValue(input, name, 5_000);
}

async function setTurnLimit(page: Page, seconds: number): Promise<void> {
  await clickByTestId(page, "toggle-settings");
  const input = page.locator('[data-testid="settings-panel"] input[type="number"]').first();
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await input.fill(String(seconds));
  await waitForInputValue(input, String(seconds), 5_000);
  await page.waitForTimeout(500);
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
  await locator.dispatchEvent("click", undefined, { timeout: timeoutMs });
}

async function waitForEnabled(locator: Locator, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await locator.isEnabled({ timeout: 500 })) {
        return true;
      }
    } catch {
      // Retry while React and socket state settle.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function waitForInputValue(locator: Locator, expected: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if ((await locator.inputValue().catch(() => "")).trim() === expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`输入没有稳定写入：${expected}`);
}

async function readRoomId(page: Page): Promise<string> {
  await page.getByTestId("room-code").waitFor({ timeout: 20_000 });
  return (await page.getByTestId("room-code").first().innerText()).trim();
}

async function waitForActionDock(page: Page): Promise<void> {
  await page.locator(".table-action-dock").first().waitFor({ state: "visible", timeout: 20_000 });
}

async function waitForCountdownAtMost(page: Page, seconds: number, timeoutMs: number): Promise<void> {
  await page.waitForFunction(
    (targetSeconds) => {
      const cells = Array.from(document.querySelectorAll(".battle-status-grid > div")).map((element) => ({
        label: element.querySelector("span")?.textContent?.trim() ?? "",
        value: element.querySelector("strong")?.textContent?.trim() ?? ""
      }));
      const countdown = cells.find((cell) => cell.label.includes("倒计时"))?.value ?? "";
      const match = countdown.match(/\d+/);
      const value = match ? Number(match[0]) : null;
      return value !== null && value <= targetSeconds;
    },
    seconds,
    { timeout: timeoutMs }
  );
}

async function waitForTurnAtLeast(page: Page, turnNumber: number, timeoutMs: number): Promise<void> {
  await page.waitForFunction(
    (minimumTurn) => {
      const main = document.querySelector(".battle-status-main strong")?.textContent?.trim() ?? "";
      const turnMatch = main.match(/第\s*(\d+)\s*回合/);
      const currentTurn = turnMatch ? Number(turnMatch[1]) : 0;
      return currentTurn >= minimumTurn;
    },
    turnNumber,
    { timeout: timeoutMs }
  );
}

async function readBattleStatus(page: Page): Promise<BattleStatus> {
  return page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll(".battle-status-grid > div")).map((element) => ({
      label: element.querySelector("span")?.textContent?.trim() ?? "",
      value: element.querySelector("strong")?.textContent?.trim() ?? "",
      detail: element.querySelector("small")?.textContent?.trim() ?? ""
    }));
    let countdown = "";
    let progress = "";
    for (const cell of cells) {
      if (cell.label.includes("倒计时")) {
        countdown = cell.value;
      }
      if (cell.label.includes("桌面进度")) {
        progress = cell.value;
      }
    }
    const countdownMatch = countdown.match(/\d+/);
    return {
      countdown,
      countdownSeconds: countdownMatch ? Number(countdownMatch[0]) : null,
      main: document.querySelector(".battle-status-main strong")?.textContent?.trim() ?? "",
      phase: document.querySelector(".poker-table-phase")?.textContent?.trim() ?? "",
      progress,
      prompt: document.querySelector(".battle-status-prompt")?.textContent?.trim() ?? ""
    };
  });
}

async function readSummaryState(page: Page): Promise<SummaryState> {
  return page.getByTestId("battle-turn-summary").first().evaluate((element) => {
    const dataset = element instanceof HTMLElement ? element.dataset : {};
    return {
      actionLabel: dataset.actionLabel ?? "",
      cakeDeltaCount: Number(dataset.cakeDeltaCount ?? "0"),
      resourceDeltaCount: Number(dataset.resourceDeltaCount ?? "0"),
      resourceDeltas: dataset.resourceDeltas ?? "",
      stepCount: Number(dataset.stepCount ?? "0"),
      text: element.textContent?.replace(/\s+/g, " ").trim() ?? ""
    };
  });
}

async function screenshot(page: Page, fileName: string): Promise<void> {
  await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    path: path.join(runDir, fileName),
    timeout: 60_000
  });
  if (!screenshots.includes(fileName)) {
    screenshots.push(fileName);
  }
}

function attachIssueLogging(page: Page, name: string): void {
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text().trim();
      if (text !== "Failed to load resource: net::ERR_CONNECTION_CLOSED") {
        consoleIssues.push(`[${name}] ${text}`);
      }
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`[${name}] ${error.message}`);
  });
}

async function startServer(url: string): Promise<StartedServer> {
  if (await isHealthy(url)) {
    observations.push("复用了已经运行的本地服务。");
    return {
      process: undefined,
      recorderRoot: defaultRecorderRoot(),
      reused: true
    };
  }

  const targetUrl = new URL(url);
  const outputPath = path.join(runDir, "server.log");
  const isolatedRecorderRoot = path.join(runDir, "match-data");
  const logStream = fs.createWriteStream(outputPath, { flags: "a" });
  const tsxCli = path.resolve("node_modules", "tsx", "dist", "cli.mjs");
  const child = spawn(process.execPath, [tsxCli, "apps/server/src/index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MATCH_DATA_DIR: isolatedRecorderRoot,
      PORT: targetUrl.port || process.env.PORT || "3001"
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  child.stdout?.pipe(logStream, { end: false });
  child.stderr?.pipe(logStream, { end: false });
  observations.push(`自动启动本地服务，日志：${path.basename(outputPath)}，复盘目录：${path.basename(isolatedRecorderRoot)}。`);

  try {
    await waitForHealth(url, 30_000);
    return {
      process: child,
      recorderRoot: isolatedRecorderRoot,
      reused: false
    };
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

async function waitForRecorderEvidence(
  id: string,
  rootDir: string,
  timeoutMs: number
): Promise<RecorderEvidence | undefined> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const evidence = readRecorderEvidence(id, rootDir);
    if (evidence && evidence.matchTurnNumber >= 2 && evidence.humanGainCakeSamples >= 1) {
      return evidence;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return readRecorderEvidence(id, rootDir);
}

function readRecorderEvidence(id: string, rootDir: string): RecorderEvidence | undefined {
  const safeId = safeFileName(id);
  const matchPath = path.join(rootDir, "matches", `${safeId}.json`);
  const trainingPath = path.join(rootDir, "training", `${safeId}.jsonl`);
  if (!fs.existsSync(matchPath) || !fs.existsSync(trainingPath)) {
    return undefined;
  }

  const match = JSON.parse(fs.readFileSync(matchPath, "utf-8")) as MatchState;
  const samples = fs
    .readFileSync(trainingPath, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TrainingSample);
  const humanGainCakeSamples = samples.filter(
    (sample) => sample.playerKind === "human" && sample.state?.turnNumber === 1 && sampleIncludesGainCake(sample)
  ).length;

  return {
    humanGainCakeSamples,
    matchPhase: match.phase ?? "unknown",
    matchTurnNumber: match.turnNumber ?? 0,
    trainingSamples: samples.length
  };
}

function sampleIncludesGainCake(sample: TrainingSample): boolean {
  if (sample.action.type === "gain_cake") {
    return true;
  }
  return Boolean(sample.action.actions?.some((action) => action.type === "gain_cake"));
}

function renderReport(): string {
  return [
    "# 短限时自动兜底 Smoke",
    "",
    `- URL: ${config.url}`,
    `- Room: ${roomId || "未创建"}`,
    `- Turn limit: ${TURN_LIMIT_SECONDS}s`,
    `- Time: ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    `- 输出目录: ${runDir}`,
    "",
    "## 观察",
    "",
    ...listOrNone(observations),
    "",
    "## 问题",
    "",
    ...listOrNone(issues),
    "",
    "## Console / Page Error",
    "",
    ...listOrNone(consoleIssues),
    "",
    "## Screenshots",
    "",
    ...listOrNone(screenshots.map((item) => `\`${item}\``)),
    ""
  ].join("\n");
}

function listOrNone(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- 无"];
}

function readConfig(): RunConfig {
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="))?.slice("--url=".length);
  const outDirArg = process.argv.find((arg) => arg.startsWith("--out-dir="))?.slice("--out-dir=".length);
  const noServer = process.argv.includes("--no-server");
  return {
    autoServe: !noServer && !urlArg,
    outDir: outDirArg ?? "artifacts/playtests",
    url: urlArg ?? "http://localhost:3001"
  };
}

function defaultRecorderRoot(): string {
  return process.env.MATCH_DATA_DIR ? path.resolve(process.env.MATCH_DATA_DIR) : path.resolve("data");
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
