import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Locator, type Page } from "playwright";

interface RunConfig {
  autoServe: boolean;
  outDir: string;
  url: string;
}

interface ActionBoardState {
  actionInvalid: string;
  alreadySubmitted: string;
  canSubmit: string;
  lockedAction: string;
  readyState: string;
  roundNumber: string;
  roundTurnNumber: string;
  selectedAction: string;
  submitReady: string;
  viewerId: string;
}

const config = readConfig();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.resolve(config.outDir, `action-submit-${timestamp}`);
const observations: string[] = [];
const issues: string[] = [];
const consoleIssues: string[] = [];
const screenshots: string[] = [];
let serverProcess: ChildProcess | undefined;
let roomId = "";

fs.mkdirSync(runDir, { recursive: true });

if (config.autoServe) {
  serverProcess = await startServer(config.url);
}

try {
  const browser = await chromium.launch({ headless: true });
  const hostContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  attachIssueLogging(host, "host");
  attachIssueLogging(guest, "guest");

  try {
    await openHome(host);
    await fillPlayerName(host, "Submit Host");
    await confirmCharacterIfVisible(host);
    await clickByTestId(host, "create-room");
    roomId = await readRoomId(host);
    observations.push(`Host created room ${roomId}.`);

    await openHome(guest);
    await fillPlayerName(guest, "Submit Guest");
    await confirmCharacterIfVisible(guest);
    await fillRoomId(guest, roomId);
    await clickByTestId(guest, "join-room");
    await waitForRoomLobby(guest);
    observations.push("Guest joined the room.");

    await screenshot(host, "01-submit-lobby.png");
    await clickByTestId(host, "start-game");
    const hostReady = await waitForSubmitReady(host, "host initial action");
    const guestReady = await waitForSubmitReady(guest, "guest initial action");
    observations.push(
      `Both action boards are submit-ready: host=${hostReady.viewerId}/${hostReady.selectedAction}; guest=${guestReady.viewerId}/${guestReady.selectedAction}.`
    );

    await clickSubmitAction(host);
    const hostLocked = await waitForSubmittedBoard(host, "host submitted");
    await screenshot(host, "02-host-submitted.png");
    observations.push(`Host submission locked: ${hostLocked.lockedAction}.`);

    const guestStillReady = await waitForSubmitReady(guest, "guest after host submit");
    if (guestStillReady.alreadySubmitted !== "false") {
      throw new Error(`Guest should still be able to submit after host lock: ${JSON.stringify(guestStillReady)}`);
    }
    observations.push("Guest remains submit-ready after host locks, so one player lock does not freeze the other client.");

    await clickSubmitAction(guest);
    const guestLocked = await waitForSubmittedBoard(guest, "guest submitted");
    observations.push(`Guest submission locked: ${guestLocked.lockedAction}.`);

    await waitForNextTurnReady(host, Number(hostReady.roundTurnNumber) + 1);
    const hostNext = await readActionBoardState(host);
    await screenshot(host, "03-next-turn-ready.png");
    if (hostNext.submitReady !== "true" || hostNext.alreadySubmitted !== "false") {
      throw new Error(`Host did not return to a ready board on the next turn: ${JSON.stringify(hostNext)}`);
    }
    observations.push(`After both submissions, host reached next ready board: round=${hostNext.roundNumber}/${hostNext.roundTurnNumber}.`);
  } catch (error) {
    issues.push(errorMessage(error));
    await screenshot(host, "99-host-error.png").catch(() => undefined);
    await screenshot(guest, "99-guest-error.png").catch(() => undefined);
  } finally {
    await hostContext.close();
    await guestContext.close();
    await browser.close();
  }
} finally {
  stopServer(serverProcess);
}

const reportPath = path.join(runDir, "report.md");
fs.writeFileSync(reportPath, renderReport(), "utf-8");
console.log(`action submit smoke report written to ${reportPath}`);

if (issues.length > 0 || consoleIssues.length > 0) {
  throw new Error(`action submit smoke failed: issues=${issues.length}, console=${consoleIssues.length}`);
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

async function fillRoomId(page: Page, value: string): Promise<void> {
  const input = page.getByTestId("join-room-input").first();
  await input.fill(value);
  await waitForInputValue(input, value, 5_000);
}

async function clickByTestId(page: Page, testId: string): Promise<void> {
  await activate(page.getByTestId(testId).first());
}

async function confirmCharacterIfVisible(page: Page): Promise<void> {
  const confirm = page.getByTestId("confirm-character").first();
  if (!(await confirm.isVisible({ timeout: 1_000 }).catch(() => false))) {
    return;
  }
  await activate(confirm, 10_000);
}

async function activate(locator: Locator, timeoutMs = 10_000): Promise<void> {
  await locator.waitFor({ state: "attached", timeout: timeoutMs });
  if (!(await waitForEnabled(locator, timeoutMs))) {
    const label = await locator.innerText().catch(() => "unknown control");
    throw new Error(`control is disabled: ${label}`);
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
  throw new Error(`input value did not settle: ${expected}`);
}

async function readRoomId(page: Page): Promise<string> {
  await page.getByTestId("room-code").waitFor({ timeout: 20_000 });
  return (await page.getByTestId("room-code").first().innerText()).trim();
}

async function waitForRoomLobby(page: Page): Promise<void> {
  const roomCode = page.getByTestId("room-code").first();
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (await roomCode.isVisible().catch(() => false)) {
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new Error("guest did not enter the room");
}

async function waitForSubmitReady(page: Page, label: string): Promise<ActionBoardState> {
  await page.getByTestId("action-board").first().waitFor({ state: "attached", timeout: 25_000 });
  await page.waitForFunction(
    () => {
      const board = document.querySelector('[data-testid="action-board"]');
      return board instanceof HTMLElement && board.dataset.submitReady === "true" && board.dataset.canSubmit === "true";
    },
    undefined,
    { timeout: 25_000 }
  );
  const state = await readActionBoardState(page);
  if (!state.viewerId || !state.selectedAction || state.readyState !== "ready") {
    throw new Error(`${label} has incomplete action board metadata: ${JSON.stringify(state)}`);
  }
  return state;
}

async function waitForSubmittedBoard(page: Page, label: string): Promise<ActionBoardState> {
  await page.waitForFunction(
    () => {
      const board = document.querySelector('[data-testid="action-board"]');
      return (
        board instanceof HTMLElement &&
        board.dataset.alreadySubmitted === "true" &&
        board.dataset.readyState === "waiting" &&
        Boolean(board.dataset.lockedAction)
      );
    },
    undefined,
    { timeout: 20_000 }
  );
  const state = await readActionBoardState(page);
  if (!state.lockedAction) {
    throw new Error(`${label} did not expose locked action metadata: ${JSON.stringify(state)}`);
  }
  return state;
}

async function waitForNextTurnReady(page: Page, minimumTurn: number): Promise<void> {
  await page.waitForFunction(
    (turn) => {
      const board = document.querySelector('[data-testid="action-board"]');
      return (
        board instanceof HTMLElement &&
        Number(board.dataset.roundTurnNumber ?? "0") >= turn &&
        board.dataset.submitReady === "true" &&
        board.dataset.alreadySubmitted === "false"
      );
    },
    minimumTurn,
    { timeout: 30_000 }
  );
}

async function readActionBoardState(page: Page): Promise<ActionBoardState> {
  return page.getByTestId("action-board").first().evaluate((element) => ({
    actionInvalid: element.getAttribute("data-action-invalid") ?? "",
    alreadySubmitted: element.getAttribute("data-already-submitted") ?? "",
    canSubmit: element.getAttribute("data-can-submit") ?? "",
    lockedAction: element.getAttribute("data-locked-action") ?? "",
    readyState: element.getAttribute("data-ready-state") ?? "",
    roundNumber: element.getAttribute("data-round-number") ?? "",
    roundTurnNumber: element.getAttribute("data-round-turn-number") ?? "",
    selectedAction: element.getAttribute("data-selected-action") ?? "",
    submitReady: element.getAttribute("data-submit-ready") ?? "",
    viewerId: element.getAttribute("data-viewer-id") ?? ""
  }));
}

async function clickSubmitAction(page: Page): Promise<void> {
  const submit = page.getByTestId("submit-action").first();
  await submit.waitFor({ state: "attached", timeout: 20_000 });
  if (!(await waitForEnabled(submit, 20_000))) {
    const board = await readActionBoardState(page).catch(() => undefined);
    throw new Error(`submit button not enabled: ${JSON.stringify(board)}`);
  }
  await submit.scrollIntoViewIfNeeded({ timeout: 20_000 }).catch(() => undefined);
  await submit.click({ force: true, timeout: 20_000 });
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
    observations.push("Reused an already running local service.");
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
  observations.push(`Started local service, log=${path.basename(outputPath)}.`);

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
  throw new Error(`local service did not start within ${timeoutMs}ms: ${url}`);
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
    "# Action Submit Metadata Smoke",
    "",
    `- URL: ${config.url}`,
    `- Room: ${roomId || "not created"}`,
    `- Time: ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    `- Output: ${runDir}`,
    "",
    "## Observations",
    "",
    ...listOrNone(observations),
    "",
    "## Issues",
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
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- None"];
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
