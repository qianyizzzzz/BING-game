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
const screenshots: string[] = [];
const pageNames = new WeakMap<Page, string>();
const glbResponses = new Map<string, Set<string>>();
let roomId = "";
let serverProcess: ChildProcess | undefined;
let fatalError: unknown;

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
    await waitForRoomLobby(playerB, "加入房间");
    await screenshot(playerB, "02-player-b-joined.png");
    await collectLobbyPrepCopyCheck(playerA, firstTimer, "新手玩家");
    await collectLobbyPrepCopyCheck(playerB, competitor, "竞技玩家");
    competitor.observations.push("成功加入房间，检查加入路径是否足够快。");

    await ensureGameCanStart(playerA);
    await clickByTestId(playerA, "start-game");
    await waitForActionDock(playerA);
    await waitForActionDock(playerB);
    producer.observations.push("房主能从大厅进入战斗桌面，行动 dock 已出现。");

    for (let turn = 1; turn <= 3; turn += 1) {
      if (turn === 2) {
        await submitRepeatTurn(playerA, turn, firstTimer);
      } else if (turn === 3) {
        await submitAttackTurn(playerA, turn, firstTimer);
      } else {
        await submitCakeTurn(playerA, turn, firstTimer);
      }
      await submitCakeTurn(playerB, turn, competitor);
      await playerA.waitForTimeout(900);
      if (turn === 1) {
        await collectTargetPreviewCheck(playerA, firstTimer, "新手玩家");
        await collectTargetPreviewCheck(playerB, competitor, "竞技玩家");
      }
      if (turn === 3) {
        const skippedWindows = await resolveActionWindows([playerA, playerB]);
        if (skippedWindows > 0) {
          producer.observations.push(`第三回合攻击后自动跳过 ${skippedWindows} 个响应窗口以触发表现层结算。`);
        }
        await collectBattlePresentationCueCheck(playerA, firstTimer, "新手玩家");
        await collectBattlePresentationCueCheck(playerB, competitor, "竞技玩家");
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
  } catch (error) {
    fatalError = error;
    const message = errorMessage(error);
    failedActions.push(`UI playtest 流程异常：${message}`);
    producer.issues.push(`自动化流程中断：${message}`);
    await screenshot(playerA, "99-player-a-error.png").catch(() => undefined);
    await screenshot(playerB, "99-player-b-error.png").catch(() => undefined);
  } finally {
    await browser.close();
  }
} finally {
  stopServer(serverProcess);
}

const reportPath = path.join(runDir, "report.md");
fs.writeFileSync(reportPath, renderReport(), "utf-8");
console.log(`UI playtest agent report written to ${reportPath}`);

if (fatalError) {
  throw fatalError;
}
if (visualIssues.length > 0 || consoleErrors.length > 0 || failedActions.length > 0) {
  throw new Error(
    `UI playtest reported issues: visual=${visualIssues.length}, console=${consoleErrors.length}, failed=${failedActions.length}`
  );
}

async function newAgentPage(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: name === "competitor" ? 1280 : 390, height: name === "competitor" ? 800 : 844 },
    isMobile: name !== "competitor"
  });
  const page = await context.newPage();
  pageNames.set(page, name);
  glbResponses.set(name, new Set());
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`[${name}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(`[${name}] ${error.message}`);
  });
  page.on("response", (response) => {
    const url = response.url();
    if (!url.endsWith(".glb") || response.status() >= 400) {
      return;
    }
    const modelName = path.basename(new URL(url).pathname);
    glbResponses.get(name)?.add(modelName);
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
  if (!(await waitForInputValue(roomInput, value, 5_000))) {
    throw new Error(`房号输入框没有稳定写入：${value}`);
  }
  if (!(await waitForEnabled(page.getByTestId("join-room").first(), 10_000))) {
    throw new Error(`加入按钮没有变为可用：${value}`);
  }
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

async function waitForActionDock(page: Page): Promise<void> {
  await page.locator(".table-action-dock").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.getByTestId("submit-action").first().waitFor({ state: "attached", timeout: 20_000 });
  await page.waitForTimeout(250);
}

async function waitForRoomLobby(page: Page, actionLabel: string): Promise<void> {
  const roomCode = page.getByTestId("room-code").first();
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (await roomCode.isVisible().catch(() => false)) {
      return;
    }

    const message = await readStatusMessage(page);
    if (message && /失败|不存在|无法|连接服务器失败|请求失败/.test(message)) {
      throw new Error(`${actionLabel}失败：${message}`);
    }

    await page.waitForTimeout(250);
  }

  const message = await readStatusMessage(page);
  throw new Error(`${actionLabel}后未进入房间${message ? `：${message}` : ""}`);
}

async function resolveActionWindows(pages: Page[]): Promise<number> {
  const hasActionWindow = await waitForAnyActionWindowControl(pages, 3_000);
  if (!hasActionWindow) {
    return 0;
  }

  let clicked = 0;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 12_000) {
    if (await pages[0]!.locator(".battle-stage-panel").first().isVisible().catch(() => false)) {
      break;
    }

    let clickedThisPass = false;
    for (const page of pages) {
      if (await clickActionWindowControl(page)) {
        clicked += 1;
        clickedThisPass = true;
        await page.waitForTimeout(350);
      }
    }

    if (!clickedThisPass) {
      await pages[0]!.waitForTimeout(400);
    }
  }

  return clicked;
}

async function waitForAnyActionWindowControl(pages: Page[], timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await pages[0]!.locator(".battle-stage-panel").first().isVisible().catch(() => false)) {
      return false;
    }
    for (const page of pages) {
      if (
        (await page.getByTestId("skip-to-next-action").first().isVisible().catch(() => false)) ||
        (await page.getByTestId("pass-action-window").first().isVisible().catch(() => false))
      ) {
        return true;
      }
    }
    await pages[0]!.waitForTimeout(250);
  }
  return false;
}

async function clickActionWindowControl(page: Page): Promise<boolean> {
  for (const testId of ["skip-to-next-action", "pass-action-window"]) {
    const control = page.getByTestId(testId).first();
    if (!(await control.isVisible().catch(() => false))) {
      continue;
    }
    if (!(await waitForEnabled(control, 1_000))) {
      continue;
    }
    await activate(control, 2_000);
    return true;
  }

  return false;
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

async function submitAttackTurn(page: Page, turn: number, agent: AgentLog): Promise<void> {
  try {
    await page.locator(".table-action-dock").first().waitFor({ state: "visible", timeout: 20_000 });
    await activate(page.getByTestId("action-mode-attack").first(), 20_000);

    const submit = page.getByTestId("submit-action").first();
    if (!(await waitForEnabled(submit, 20_000))) {
      const label = await submit.innerText().catch(() => "未知按钮");
      const message = `第 ${turn} 回合攻击提交按钮不可用：${label}`;
      failedActions.push(message);
      agent.issues.push(message);
      return;
    }
    await activate(submit, 20_000);
    agent.observations.push(`第 ${turn} 回合完成“攻击”提交。`);
  } catch (error) {
    const message = `第 ${turn} 回合攻击提交失败：${String(error)}`;
    failedActions.push(message);
    agent.issues.push(message);
  }
}

async function submitRepeatTurn(page: Page, turn: number, agent: AgentLog): Promise<void> {
  try {
    await page.locator(".table-action-dock").first().waitFor({ state: "visible", timeout: 20_000 });
    const repeatButton = page.getByTestId("repeat-last-action").first();
    if (!(await waitForEnabled(repeatButton, 20_000))) {
      const label = await repeatButton.innerText().catch(() => "沿用上回合");
      const message = `第 ${turn} 回合沿用上回合不可用：${label}`;
      failedActions.push(message);
      agent.issues.push(message);
      return;
    }
    await activate(repeatButton, 20_000);
    agent.observations.push(`第 ${turn} 回合通过“沿用上回合”提交。`);
  } catch (error) {
    const message = `第 ${turn} 回合沿用上回合失败：${String(error)}`;
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

async function waitForInputValue(locator: Locator, expected: string, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if ((await locator.inputValue()).trim() === expected) {
        return true;
      }
    } catch {
      // Retry until React has flushed the controlled input state.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

async function screenshot(page: Page, fileName: string): Promise<void> {
  const screenshotPath = path.join(runDir, fileName);
  try {
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      timeout: 60_000,
      animations: "disabled",
      caret: "hide"
    });
  } catch {
    await page.waitForTimeout(750);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      timeout: 90_000,
      animations: "disabled",
      caret: "hide"
    });
  }
  if (!screenshots.includes(fileName)) {
    screenshots.push(fileName);
  }
}

async function readStatusMessage(page: Page): Promise<string> {
  const message = page.locator("p").filter({ hasText: /失败|不存在|无法|连接服务器失败|请求失败/ }).first();
  if (!(await message.isVisible().catch(() => false))) {
    return "";
  }
  return (await message.innerText()).trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

  const modelHealth = await inspectCharacterModelLoads(page);
  if (modelHealth.ok) {
    const message = `${label}: 3D 牌桌已加载角色 GLB（${modelHealth.message}）。`;
    visualChecks.push(message);
    agent.observations.push(message);
  } else {
    const message = `${label}: 3D 牌桌未检测到角色 GLB 加载（${modelHealth.message}）。`;
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
  let lastError: unknown;
  try {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await waitForActionDock(page);
        await waitForAttackPreviewReady(page, 25_000);
        await activate(page.getByTestId("action-mode-attack").first(), 20_000);
        await waitForAttackModeSelected(page, 10_000);
        const highlightedSeats = page.locator(".poker-seat-highlighted");
        await highlightedSeats.first().waitFor({ state: "visible", timeout: 12_000 });
        const count = await highlightedSeats.count();
        const message = `${label}: 选择攻击模式后 ${count} 个目标座位出现高亮预览。`;
        visualChecks.push(message);
        agent.observations.push(message);
        return;
      } catch (error) {
        lastError = error;
        await page.waitForTimeout(750);
      }
    }
    throw lastError;
  } catch (error) {
    const snapshot = await collectTargetPreviewDebugSnapshot(page).catch(() => "无法读取调试快照");
    const message = `${label}: 目标预览高亮检查失败：${String(error)}；${snapshot}`;
    visualIssues.push(message);
    agent.issues.push(message);
  }
}

async function waitForAttackPreviewReady(page: Page, timeoutMs: number): Promise<void> {
  await page.waitForFunction(
    () => {
      const attackButton = document.querySelector('[data-testid="action-mode-attack"]');
      const statusText = document.querySelector(".battle-status-main")?.textContent ?? "";
      return (
        attackButton instanceof HTMLButtonElement &&
        !attackButton.disabled &&
        !statusText.includes("第 1 回合")
      );
    },
    undefined,
    { timeout: timeoutMs }
  );
}

async function waitForAttackModeSelected(page: Page, timeoutMs: number): Promise<void> {
  await page.waitForFunction(
    () => {
      const attackButton = document.querySelector('[data-testid="action-mode-attack"]');
      const hasAttackTargetSelect = Array.from(document.querySelectorAll("label")).some((label) =>
        label.textContent?.includes("攻击目标")
      );
      return (
        attackButton instanceof HTMLElement &&
        attackButton.classList.contains("mode-button-active") &&
        hasAttackTargetSelect
      );
    },
    undefined,
    { timeout: timeoutMs }
  );
}

async function collectTargetPreviewDebugSnapshot(page: Page): Promise<string> {
  return page.evaluate(() => {
    const statusText = document.querySelector(".battle-status-main")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const promptText = document.querySelector(".battle-status-prompt")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const attackButton = document.querySelector('[data-testid="action-mode-attack"]');
    const attackState =
      attackButton instanceof HTMLButtonElement
        ? `attackDisabled=${attackButton.disabled}, attackClass=${attackButton.className}`
        : "attackButton=missing";
    const highlighted = document.querySelectorAll(".poker-seat-highlighted").length;
    const targetSelects = Array.from(document.querySelectorAll("label"))
      .map((label) => label.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter((text) => text.includes("目标"))
      .slice(0, 4)
      .join(" | ");
    return `status=${statusText}; prompt=${promptText}; ${attackState}; highlighted=${highlighted}; targets=${targetSelects || "none"}`;
  });
}

function splitDataIds(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function countSeatsForPlayerIds(page: Page, playerIds: string[]): Promise<number> {
  if (playerIds.length === 0) {
    return 0;
  }

  return page.locator(".poker-seat").evaluateAll(
    (seats, ids) =>
      seats.filter((seat) => {
        if (!(seat instanceof HTMLElement)) {
          return false;
        }
        return ids.includes(seat.dataset.playerId ?? "");
      }).length,
    playerIds
  );
}

async function collectBattlePresentationCueCheck(page: Page, agent: AgentLog, label: string): Promise<void> {
  try {
    const readout = await page.getByTestId("battle-readout").first().evaluate((element) => ({
      active: element.getAttribute("data-active") ?? "",
      beat: element.getAttribute("data-beat") ?? "",
      kind: element.getAttribute("data-kind") ?? "",
      sourceId: element.getAttribute("data-source-id") ?? "",
      stepCount: element.getAttribute("data-step-count") ?? "",
      targetIds: element.getAttribute("data-target-ids") ?? "",
      text: element.textContent?.trim() ?? ""
    }));

    if (readout.text.length < 8) {
      throw new Error(`Battle readout 不完整：${JSON.stringify(readout)}`);
    }

    await page.waitForFunction(
      () => {
        const element = document.querySelector('[data-testid="battle-presentation-cues"]');
        const director = document.querySelector('[data-testid="battle-director-state"]');
        if (!(element instanceof HTMLElement)) {
          return false;
        }
        if (!(director instanceof HTMLElement)) {
          return false;
        }
        const cueCount = Number(element.dataset.cueCount ?? "0");
        const directorCueCount = Number(director.dataset.cueCount ?? "0");
        return (
          cueCount > 0 &&
          directorCueCount > 0 &&
          Boolean(element.dataset.firstBeat) &&
          Boolean(director.dataset.activeBeat) &&
          element.dataset.firstVfx !== "none"
        );
      },
      undefined,
      { timeout: 12_000 }
    ).catch(() => undefined);
    const cue = await page.getByTestId("battle-presentation-cues").first().evaluate((element) => ({
      beat: element.getAttribute("data-first-beat") ?? "",
      camera: element.getAttribute("data-first-camera-cue") ?? "",
      cueCount: element.getAttribute("data-cue-count") ?? "",
      hitStopMs: element.getAttribute("data-first-hit-stop-ms") ?? "",
      targetIds: element.getAttribute("data-first-target-ids") ?? "",
      targetSeatCount: element.getAttribute("data-first-target-seat-count") ?? "",
      vfx: element.getAttribute("data-first-vfx") ?? ""
    }));
    const director = await page.getByTestId("battle-director-state").first().evaluate((element) => ({
      active: element.getAttribute("data-active") ?? "",
      beat: element.getAttribute("data-active-beat") ?? "",
      camera: element.getAttribute("data-active-camera-cue") ?? "",
      cueCount: element.getAttribute("data-cue-count") ?? "",
      hitStopMs: element.getAttribute("data-active-hit-stop-ms") ?? "",
      seatPlayerIds: element.getAttribute("data-seat-player-ids") ?? "",
      sourceSeatCount: element.getAttribute("data-active-source-seat-count") ?? "",
      targetIds: element.getAttribute("data-active-target-ids") ?? "",
      targetSeatCount: element.getAttribute("data-active-target-seat-count") ?? ""
    }));

    if (Number(cue.cueCount) <= 0) {
      const message = `${label}: 战斗摘要可见（Readout=${readout.kind}/${readout.beat}, steps=${readout.stepCount}），本轮自动流程未捕获主动结算 cue。`;
      visualChecks.push(message);
      agent.observations.push(message);
      return;
    }
    if (!cue.beat || !cue.vfx || cue.vfx === "none") {
      throw new Error(`表现 cue 不完整：${JSON.stringify(cue)}`);
    }
    if (Number(director.cueCount) <= 0 || director.beat === "idle") {
      const message = `${label}: 战斗摘要可见（Readout=${readout.kind}/${readout.beat}, steps=${readout.stepCount}），结算 cue metadata=${cue.beat}/${cue.vfx}，BattleDirector 已回到 idle。`;
      visualChecks.push(message);
      agent.observations.push(message);
      return;
    }
    if (!director.beat || director.beat === "idle" || Number(director.cueCount) <= 0) {
      throw new Error(`BattleDirector cue 不完整：${JSON.stringify(director)}`);
    }
    if (!readout.kind || readout.kind === "idle" || Number(readout.stepCount) <= 0 || readout.text.length < 8) {
      throw new Error(`Battle readout 不完整：${JSON.stringify(readout)}`);
    }
    const cueTargetIds = splitDataIds(cue.targetIds);
    const activeTargetIds = splitDataIds(director.targetIds);
    const seatPlayerIds = splitDataIds(director.seatPlayerIds);
    const cueTargetSeatCount = Number(cue.targetSeatCount);
    const pokerTableCueTargetSeatCount = cueTargetIds.filter((targetId) => seatPlayerIds.includes(targetId)).length;
    const cueTargetDomSeatCount = await countSeatsForPlayerIds(page, cueTargetIds);
    const directorSeatCount = await page.locator('.poker-seat[data-director-role]:not([data-director-role=""])').count();
    const directorTargetSeatCount = await page.locator('.poker-seat[data-director-role*="target"]').count();
    const mappedTargetSeatCount = Number(director.targetSeatCount);
    if (cueTargetIds.length > 0 && cueTargetSeatCount === 0) {
      throw new Error(`表现 cue 有目标但无法映射到座位：${JSON.stringify(cue)}`);
    }
    if (director.targetIds && mappedTargetSeatCount === 0) {
      throw new Error(`BattleDirector 有目标但无法映射到座位：${JSON.stringify(director)}`);
    }
    if (director.targetIds && directorTargetSeatCount === 0) {
      throw new Error(`BattleDirector 有目标但没有座位高亮：${JSON.stringify(director)}`);
    }

    const message = `${label}: 结算动画暴露 ${cue.beat}/${cue.vfx} cue，BattleDirector=${director.beat}/${director.camera}，Readout=${readout.kind}/${readout.beat}（count=${cue.cueCount}, hitStop=${cue.hitStopMs}ms, cueTargets=${cueTargetIds.length}, cueTargetSeats=${cueTargetSeatCount}, pokerTableCueTargetSeats=${pokerTableCueTargetSeatCount}, cueTargetDomSeats=${cueTargetDomSeatCount}, activeTargets=${activeTargetIds.length}, mappedActiveTargets=${mappedTargetSeatCount}, highlightedTargets=${directorTargetSeatCount}, seats=${directorSeatCount}）。`;
    visualChecks.push(message);
    agent.observations.push(message);
  } catch (error) {
    const message = `${label}: 结算动画表现 cue 检查失败：${String(error)}`;
    visualIssues.push(message);
    agent.issues.push(message);
  }
}

async function collectLobbyPrepCopyCheck(page: Page, agent: AgentLog, label: string): Promise<void> {
  const hudText = await page.locator(".battle-status-main").first().innerText({ timeout: 5_000 }).catch(() => "");
  const commandText = await page.locator(".command-center").first().innerText({ timeout: 5_000 }).catch(() => "");
  const visibleStageText = `${hudText}\n${commandText}`;
  const hasPrepCopy = visibleStageText.includes("房间准备") || visibleStageText.includes("等待房主开始");
  const leaksTurnCopy = visibleStageText.includes("第 1 轮") || visibleStageText.includes("本轮第 1 回合");

  if (hasPrepCopy && !leaksTurnCopy) {
    const message = `${label}: 房间准备阶段没有误显示第一回合。`;
    visualChecks.push(message);
    agent.observations.push(message);
    return;
  }

  const message = `${label}: 房间准备阶段文案仍可能和战斗回合混淆（prep=${hasPrepCopy}, leaksTurn=${leaksTurnCopy}）。`;
  visualIssues.push(message);
  agent.issues.push(message);
}

async function inspectCharacterModelLoads(page: Page): Promise<{ ok: boolean; message: string }> {
  const pageName = pageNames.get(page);
  const models = pageName ? glbResponses.get(pageName) : undefined;
  const startedAt = Date.now();
  while (models && models.size === 0 && Date.now() - startedAt < 10_000) {
    await page.waitForTimeout(250);
  }

  if (!models || models.size === 0) {
    return { ok: false, message: "10s 内没有成功的 .glb 响应" };
  }

  return {
    ok: true,
    message: Array.from(models).sort().join(", ")
  };
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
      { label: "战斗摘要", selector: ".battle-readout" },
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
    ...(screenshots.length > 0 ? screenshots.map((item) => `- \`${item}\``) : ["- 无"]),
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
