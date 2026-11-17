import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Browser, type Locator, type Page } from "playwright";
import { CHARACTER_ROSTER, type CharacterProfile } from "../apps/client/src/lib/characters.js";

interface RunConfig {
  autoServe: boolean;
  outDir: string;
  url: string;
}

interface CharacterRuntimeResult {
  characterId: string;
  characterName: string;
  consoleIssues: string[];
  avatarUrl: string;
  roomId: string;
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
  await stopServer(serverProcess);
}

const reportPath = path.join(runDir, "report.md");
fs.writeFileSync(reportPath, renderReport(), "utf-8");

if (failures.length > 0) {
  console.error(`character runtime browser check failed: ${failures.length} issue(s)`);
  for (const failure of failures) {
    console.error(`fail - ${failure}`);
  }
  console.error(`report - ${reportPath}`);
  process.exit(1);
} else {
  console.log(`character runtime browser check passed: ${activeRoster.length} characters`);
  console.log(`report - ${reportPath}`);
  process.exit(0);
}

async function verifyCharacter(
  browser: Browser,
  character: CharacterProfile,
  index: number
): Promise<CharacterRuntimeResult> {
  const consoleIssues: string[] = [];
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const spectatorContext = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const host = await hostContext.newPage();
  const spectator = await spectatorContext.newPage();
  attachIssueLogging(host, `${character.id}:host`, consoleIssues);
  attachIssueLogging(spectator, `${character.id}:spectator`, consoleIssues);

  let roomId = "";
  let screenshot: string | undefined;

  try {
    await openPlaytestHome(host);
    if (await host.locator(".hero-page video").count()) {
      throw new Error("首页仍有背景视频");
    }
    await selectCharacter(host, character);
    await waitForAvatar(host.locator(".character-select-preview img"), character.avatarUrl);
    await waitForAvatar(host.locator(".account-avatar img"), character.avatarUrl);
    await fillPlayerName(host, `角色验证-${index + 1}`);
    await clickByTestId(host, "create-room");
    roomId = await readRoomId(host);
    await startLobbyGame(host);

    await openPlaytestHome(spectator);
    await fillRoomId(spectator, roomId);
    await clickByTestId(spectator, "spectate-room");
    await waitForRoomLobby(spectator, "观战房间");
    const hostSeat = spectator.locator(`.poker-seat[data-player-name="角色验证-${index + 1}"]`);
    await waitForAvatar(hostSeat.locator("img"), character.avatarUrl);

    screenshot = `${String(index + 1).padStart(2, "0")}-${character.id}.png`;
    await spectator.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: false,
      path: path.join(runDir, screenshot),
      timeout: 60_000
    });

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
    avatarUrl: character.avatarUrl,
    roomId,
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

async function startLobbyGame(page: Page): Promise<void> {
  const startedAt = Date.now();

  while (!(await isDomEnabled(page, "start-game"))) {
    if (Date.now() - startedAt > 30_000) {
      throw new Error("room did not become startable within 30s");
    }
    if (await isDomEnabled(page, "add-ai")) {
      await clickDomTestId(page, "add-ai");
    }
    await page.waitForTimeout(750);
  }

  await clickDomTestId(page, "start-game");
  await page.getByTestId("table-turn-summary").getByText(/开局准备|第 \d+ 轮/).waitFor({ timeout: 20_000 });
}

async function isDomEnabled(page: Page, testId: string): Promise<boolean> {
  return page.evaluate((targetTestId) => {
    const element = document.querySelector(`[data-testid="${targetTestId}"]`);
    return element instanceof HTMLButtonElement && !element.disabled;
  }, testId);
}

async function clickDomTestId(page: Page, testId: string): Promise<void> {
  const clicked = await page.evaluate((targetTestId) => {
    const element = document.querySelector(`[data-testid="${targetTestId}"]`);
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    element.click();
    return true;
  }, testId);
  if (!clicked) {
    throw new Error(`missing control: ${testId}`);
  }
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

async function waitForAvatar(image: Locator, avatarUrl: string): Promise<void> {
  await image.waitFor({ state: "visible", timeout: 10_000 });
  const element = await image.elementHandle();
  await image.page().waitForFunction(
    ([img, url]) => img instanceof HTMLImageElement &&
      img.getAttribute("src") === url && img.complete && img.naturalWidth > 0,
    [element, avatarUrl] as const,
    { timeout: 10_000 }
  );
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

async function stopServer(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.killed) {
    return;
  }

  const exited = waitForProcessExit(child, 5_000);
  if (process.platform === "win32" && child.pid) {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    await Promise.race([waitForProcessExit(killer, 5_000), exited]);
    return;
  }

  child.kill("SIGTERM");
  await exited;
}

function waitForProcessExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
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
    lines.push(
      `- ${result.characterName} (${result.characterId})`,
      `  - 房间: ${result.roomId || "未读取"}`,
      `  - 元素头像: ${result.avatarUrl}`,
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
