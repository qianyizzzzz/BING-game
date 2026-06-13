import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Locator, type Page } from "playwright";

interface RunConfig {
  autoServe: boolean;
  outDir: string;
  url: string;
}

interface RoomIdentity {
  playerId: string;
  roomId: string;
}

const config = readConfig();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.resolve(config.outDir, `reconnect-spectator-${timestamp}`);
const observations: string[] = [];
const issues: string[] = [];
const consoleIssues: string[] = [];
const screenshots: string[] = [];
let serverProcess: ChildProcess | undefined;

fs.mkdirSync(runDir, { recursive: true });

if (config.autoServe) {
  serverProcess = await startServer(config.url);
}

try {
  const browser = await chromium.launch({ headless: true });
  const hostContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const spectatorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const spectator = await spectatorContext.newPage();
  attachIssueLogging(host, "host");
  attachIssueLogging(guest, "guest");
  attachIssueLogging(spectator, "spectator");

  try {
    await openHome(host);
    await fillPlayerName(host, "重连玩家");
    await clickByTestId(host, "create-room");
    const roomId = await readRoomId(host);
    const hostIdentity = await readSavedIdentity(host);
    observations.push(`房主创建房间：${roomId}，playerId=${hostIdentity.playerId}`);

    await openHome(guest);
    await fillPlayerName(guest, "继续提交玩家");
    await fillRoomId(guest, roomId);
    await clickByTestId(guest, "join-room");
    await waitForRoomLobby(guest, "加入房间");
    observations.push("第二名真人玩家加入房间。");

    await clickByTestId(host, "start-game");
    await waitForActionDock(host);
    await waitForActionDock(guest);
    observations.push("两名真人玩家进入行动阶段。");

    await reloadRoomPage(host, "房主出招前刷新");
    await assertIdentityStable(host, hostIdentity, "房主出招前刷新");
    await assertSingleViewerSeat(host, hostIdentity.playerId, "房主出招前刷新");
    observations.push("房主出招前 reload 后仍恢复同一个 playerId，未出现重复座位。");

    await submitCakeTurn(host, "房主");
    await waitForSubmittedState(host, hostIdentity.playerId);
    await reloadRoomPage(host, "房主提交后刷新");
    await assertIdentityStable(host, hostIdentity, "房主提交后刷新");
    await waitForSubmittedState(host, hostIdentity.playerId);
    observations.push("房主提交后 reload，已提交状态仍保留。");

    await openHome(spectator);
    await fillPlayerName(spectator, "观战玩家");
    await fillRoomId(spectator, roomId);
    await clickByTestId(spectator, "spectate-room");
    await waitForSpectatorView(spectator);
    const spectatorIdentity = await readSavedIdentity(spectator);
    await assertNoActionDock(spectator, "观战加入后");
    await screenshot(spectator, "01-spectator-action-phase.png");
    observations.push(`观战者在开局后加入，playerId=${spectatorIdentity.playerId}，且没有出招面板。`);

    await reloadRoomPage(spectator, "观战刷新");
    await assertIdentityStable(spectator, spectatorIdentity, "观战刷新");
    await waitForSpectatorView(spectator);
    await assertNoActionDock(spectator, "观战刷新后");
    observations.push("观战者 reload 后仍保持观战身份，不能出招。");

    await submitCakeTurn(guest, "第二名玩家");
    await waitForReadyActionDock(host);
    await waitForSpectatorView(spectator);
    await assertNoActionDock(spectator, "结算推进后观战");
    await screenshot(host, "02-host-after-reconnect.png");
    await screenshot(spectator, "03-spectator-after-resolution.png");
    observations.push("第二名玩家继续提交后，重连房主收到下一回合广播，观战端仍同步且不能出招。");
  } catch (error) {
    const message = errorMessage(error);
    issues.push(message);
    await screenshot(host, "99-host-error.png").catch(() => undefined);
    await screenshot(guest, "99-guest-error.png").catch(() => undefined);
    await screenshot(spectator, "99-spectator-error.png").catch(() => undefined);
  } finally {
    await hostContext.close();
    await guestContext.close();
    await spectatorContext.close();
    await browser.close();
  }
} finally {
  stopServer(serverProcess);
}

const reportPath = path.join(runDir, "report.md");
fs.writeFileSync(reportPath, renderReport(), "utf-8");
console.log(`reconnect spectator smoke report written to ${reportPath}`);

if (issues.length > 0 || consoleIssues.length > 0) {
  throw new Error(`reconnect spectator smoke failed: issues=${issues.length}, console=${consoleIssues.length}`);
}

async function openHome(page: Page): Promise<void> {
  await page.goto(config.url, { waitUntil: "domcontentloaded" });
  await page.getByTestId("player-name-input").waitFor({ timeout: 20_000 });
}

async function reloadRoomPage(page: Page, label: string): Promise<void> {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("room-code").waitFor({ timeout: 20_000 });
  const message = await readStatusMessage(page);
  if (message) {
    throw new Error(`${label}失败：${message}`);
  }
}

async function fillPlayerName(page: Page, name: string): Promise<void> {
  const input = page.getByTestId("player-name-input").first();
  await input.fill(name);
  await waitForInputValue(input, name, 5_000);
}

async function fillRoomId(page: Page, value: string): Promise<void> {
  const input = page.getByTestId("join-room-input").first();
  await input.fill(value);
  await waitForInputValue(input, value, 5_000);
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

async function waitForActionDock(page: Page): Promise<void> {
  await page.locator(".table-action-dock").first().waitFor({ state: "visible", timeout: 20_000 });
}

async function waitForReadyActionDock(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const command = document.querySelector('[data-testid="action-command-strip"]');
      return command instanceof HTMLElement && command.dataset.readyState === "ready";
    },
    undefined,
    { timeout: 25_000 }
  );
}

async function waitForSubmittedState(page: Page, playerId: string): Promise<void> {
  await page.waitForFunction(
    (id) => {
      const seat = document.querySelector(`.poker-seat[data-player-id="${id}"]`);
      const command = document.querySelector('[data-testid="action-command-strip"]');
      return (
        seat?.classList.contains("poker-seat-submitted") ||
        (command instanceof HTMLElement && command.dataset.readyState === "waiting")
      );
    },
    playerId,
    { timeout: 20_000 }
  );
}

async function waitForSpectatorView(page: Page): Promise<void> {
  await page.getByTestId("room-code").waitFor({ timeout: 20_000 });
  await page.locator(".spectator-rail").filter({ hasText: "观战玩家" }).first().waitFor({
    state: "visible",
    timeout: 20_000
  });
}

async function assertNoActionDock(page: Page, label: string): Promise<void> {
  await page.waitForTimeout(600);
  const count = await page.locator(".table-action-dock").count();
  if (count > 0) {
    throw new Error(`${label}不应出现出招面板`);
  }
}

async function assertSingleViewerSeat(page: Page, playerId: string, label: string): Promise<void> {
  const viewerSeatCount = await page.locator(`.poker-seat[data-player-id="${playerId}"]`).count();
  if (viewerSeatCount !== 1) {
    throw new Error(`${label}后座位数量异常：playerId=${playerId} count=${viewerSeatCount}`);
  }
}

async function assertIdentityStable(page: Page, expected: RoomIdentity, label: string): Promise<void> {
  const actual = await readSavedIdentity(page);
  if (actual.roomId !== expected.roomId || actual.playerId !== expected.playerId) {
    throw new Error(`${label}后 identity 变化：expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

async function readSavedIdentity(page: Page): Promise<RoomIdentity> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("bing.roomIdentity.v1");
    if (!raw) {
      throw new Error("missing saved room identity");
    }
    const parsed = JSON.parse(raw) as Partial<RoomIdentity>;
    if (typeof parsed.roomId !== "string" || typeof parsed.playerId !== "string") {
      throw new Error(`invalid saved room identity: ${raw}`);
    }
    return {
      roomId: parsed.roomId,
      playerId: parsed.playerId
    };
  });
}

async function submitCakeTurn(page: Page, label: string): Promise<void> {
  await waitForActionDock(page);
  const gainCake = page.getByTestId("action-mode-gain-cake").first();
  if (await gainCake.isVisible().catch(() => false)) {
    await activate(gainCake, 20_000);
  }
  await activate(page.getByTestId("submit-action").first(), 20_000);
  observations.push(`${label}提交吃饼。`);
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

async function startServer(url: string): Promise<ChildProcess | undefined> {
  if (await isHealthy(url)) {
    observations.push("复用了已经运行的本地服务。");
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
  observations.push(`自动启动本地服务，日志：${path.basename(outputPath)}`);

  try {
    await waitForHealth(url, 30_000);
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
  return [
    "# 重连与观战 Smoke",
    "",
    `- URL: ${config.url}`,
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
