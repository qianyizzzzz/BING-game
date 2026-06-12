import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
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

    await optionalClickByTestId(playerA, "add-ai");
    await clickByTestId(playerA, "start-game");
    await playerA.waitForSelector(".table-action-dock", { timeout: 15_000 });
    await playerB.waitForSelector(".table-action-dock", { timeout: 15_000 });
    producer.observations.push("房主能从大厅进入战斗桌面，行动 dock 已出现。");

    for (let turn = 1; turn <= 3; turn += 1) {
      await submitCakeTurn(playerA, turn, firstTimer);
      await submitCakeTurn(playerB, turn, competitor);
      await playerA.waitForTimeout(900);
    }

    await screenshot(playerA, "03-player-a-after-turns.png");
    await screenshot(playerB, "04-player-b-after-turns.png");

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

async function readRoomId(page: Page): Promise<string> {
  await page.getByTestId("room-code").waitFor({ timeout: 15_000 });
  return (await page.getByTestId("room-code").first().innerText()).trim();
}

async function submitCakeTurn(page: Page, turn: number, agent: AgentLog): Promise<void> {
  try {
    await page.locator(".table-action-dock").first().waitFor({ state: "visible", timeout: 10_000 });
    const gainCake = page.getByTestId("action-mode-gain-cake").first();
    await activate(gainCake);

    const submit = page.getByTestId("submit-action").first();
    if (!(await waitForEnabled(submit, 10_000))) {
      const label = await submit.innerText().catch(() => "未知按钮");
      const message = `第 ${turn} 回合提交按钮不可用：${label}`;
      failedActions.push(message);
      agent.issues.push(message);
      return;
    }
    await activate(submit);
    agent.observations.push(`第 ${turn} 回合完成“吃饼”提交。`);
  } catch (error) {
    const message = `第 ${turn} 回合提交失败：${String(error)}`;
    failedActions.push(message);
    agent.issues.push(message);
  }
}

async function activate(locator: Locator, timeoutMs = 10_000): Promise<void> {
  await locator.waitFor({ state: "visible", timeout: timeoutMs });
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
      if ((await locator.isVisible()) && (await locator.isEnabled())) {
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
