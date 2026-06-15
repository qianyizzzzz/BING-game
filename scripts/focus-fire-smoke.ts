import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright";

interface RunConfig {
  autoServe: boolean;
  outDir: string;
  url: string;
}

interface ActorSpec {
  id: string;
  isMobile: boolean;
  name: string;
  viewport: {
    height: number;
    width: number;
  };
}

interface ActorRuntime extends ActorSpec {
  context: BrowserContext;
  page: Page;
  viewerId: string;
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
  targetCount: string;
  targetIds: string;
  viewerId: string;
}

interface SeatState {
  cakes: number;
  hp: number;
  id: string;
  name: string;
}

const config = readConfig();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.resolve(config.outDir, `focus-fire-${timestamp}`);
const actorSpecs: ActorSpec[] = [
  { id: "host", name: "Focus Host", viewport: { width: 390, height: 844 }, isMobile: true },
  { id: "attacker-a", name: "Focus A", viewport: { width: 1280, height: 800 }, isMobile: false },
  { id: "attacker-b", name: "Focus B", viewport: { width: 1024, height: 768 }, isMobile: false },
  { id: "target", name: "Focus Target", viewport: { width: 430, height: 932 }, isMobile: true }
];
const observations: string[] = [];
const issues: string[] = [];
const consoleIssues: string[] = [];
const screenshots: string[] = [];
let roomId = "";
let serverProcess: ChildProcess | undefined;

fs.mkdirSync(runDir, { recursive: true });
logStep(`run directory ${runDir}`);

if (config.autoServe) {
  serverProcess = await startServer(config.url);
}

try {
  const browser = await chromium.launch({ headless: true });
  const actors: ActorRuntime[] = [];

  try {
    for (const spec of actorSpecs) {
      const context = await browser.newContext({ viewport: spec.viewport, isMobile: spec.isMobile });
      const page = await context.newPage();
      attachIssueLogging(page, spec.id);
      actors.push({ ...spec, context, page, viewerId: "" });
    }

    const [host, ...guests] = actors;
    if (!host) {
      throw new Error("missing host actor");
    }

    await createRoom(host);
    await configureLongTurnTimer(host.page);
    for (const guest of guests) {
      await joinRoom(guest, roomId);
    }
    logStep("all guests joined");
    await waitForSeatCount(host.page, actors.length);
    await screenshot(host.page, "01-four-player-lobby.png");
    observations.push(`Four human browser contexts joined room ${roomId}; turn timer set to 60 seconds.`);

    await clickByTestId(host.page, "start-game");
    logStep("game started");
    const firstTurnStates = await Promise.all(
      actors.map(async (actor) => {
        const board = await waitForSubmitReady(actor.page, `${actor.id} first turn`);
        actor.viewerId = board.viewerId;
        return board;
      })
    );
    observations.push(
      `Initial action boards ready: ${firstTurnStates
        .map((state) => `${state.viewerId}:${state.selectedAction}`)
        .join(", ")}.`
    );

    await submitTurnAndWaitForNext({
      actors,
      finalActor: actors[actors.length - 1]!,
      label: "cake setup",
      previous: firstTurnStates[0]!
    });
    logStep("cake setup submitted");
    await Promise.all(actors.map((actor) => waitForSubmitReady(actor.page, `${actor.id} second turn`)));
    await screenshot(host.page, "02-after-cake-turn.png");
    logStep("second turn ready");

    const beforeFocusSeats = await readSeatStates(host.page);
    const target = actors.find((actor) => actor.id === "target");
    if (!target?.viewerId) {
      throw new Error("target actor did not expose viewer id");
    }
    const targetBefore = requireSeat(beforeFocusSeats, target.viewerId);
    const attackers = actors.filter((actor) => actor.id !== "target");
    observations.push(
      `Focus target before attack: ${targetBefore.name} hp=${targetBefore.hp}, cakes=${targetBefore.cakes}.`
    );

    for (const attacker of attackers) {
      const preview = await configureShaAttack(attacker.page, target.viewerId);
      observations.push(
        `${attacker.name} selected sha against ${targetBefore.name}: targets=${preview.targetIds || "none"}, selected=${preview.selectedAction}.`
      );
    }
    logStep("focus attack selected");
    await screenshot(attackers[0]!.page, "03-focus-fire-selected.png");

    const secondTurnState = await readActionBoardState(host.page);
    for (const attacker of attackers) {
      await clickSubmitAction(attacker.page);
      await waitForSubmittedBoard(attacker.page, `${attacker.id} focus submitted`);
    }

    await waitForSubmitReady(target.page, "target focus response");
    await clickSubmitAction(target.page);
    await waitForAdvancedReady(host.page, secondTurnState, "after focus fire");
    logStep("focus fire resolved");
    await screenshot(host.page, "04-after-focus-fire.png");

    const afterFocusSeats = await readSeatStates(host.page);
    const targetAfter = requireSeat(afterFocusSeats, target.viewerId);
    const hpDelta = targetAfter.hp - targetBefore.hp;
    const cakeDelta = targetAfter.cakes - targetBefore.cakes;
    observations.push(
      `Focus target after attack: ${targetAfter.name} hp=${targetAfter.hp} (${formatDelta(
        hpDelta
      )}), cakes=${targetAfter.cakes} (${formatDelta(cakeDelta)}).`
    );

    if (targetAfter.hp >= targetBefore.hp) {
      throw new Error(
        `focus target did not lose HP: before=${JSON.stringify(targetBefore)}, after=${JSON.stringify(targetAfter)}`
      );
    }

    const attackerSummaries = attackers.map((attacker) => {
      const before = requireSeat(beforeFocusSeats, attacker.viewerId);
      const after = requireSeat(afterFocusSeats, attacker.viewerId);
      return `${attacker.name} cakes ${before.cakes}->${after.cakes}`;
    });
    observations.push(`Attacker resource check: ${attackerSummaries.join("; ")}.`);
  } catch (error) {
    issues.push(errorMessage(error));
    await Promise.all(
      actors.map((actor) => screenshot(actor.page, `99-${actor.id}-error.png`).catch(() => undefined))
    );
  } finally {
    await Promise.all(actors.map((actor) => actor.context.close().catch(() => undefined)));
    await browser.close();
  }
} finally {
  stopServer(serverProcess);
}

const reportPath = path.join(runDir, "report.md");
fs.writeFileSync(reportPath, renderReport(), "utf-8");
console.log(`focus-fire smoke report written to ${reportPath}`);

if (issues.length > 0 || consoleIssues.length > 0) {
  throw new Error(`focus-fire smoke failed: issues=${issues.length}, console=${consoleIssues.length}`);
}

async function createRoom(actor: ActorRuntime): Promise<void> {
  await openHome(actor.page);
  await fillPlayerName(actor.page, actor.name);
  await confirmCharacterIfVisible(actor.page);
  await clickByTestId(actor.page, "create-room");
  roomId = await readRoomId(actor.page);
}

async function joinRoom(actor: ActorRuntime, room: string): Promise<void> {
  await openHome(actor.page);
  await fillPlayerName(actor.page, actor.name);
  await confirmCharacterIfVisible(actor.page);
  await fillRoomId(actor.page, room);
  await clickByTestId(actor.page, "join-room");
  await waitForRoomLobby(actor.page);
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

async function confirmCharacterIfVisible(page: Page): Promise<void> {
  const confirm = page.getByTestId("confirm-character").first();
  if (!(await confirm.isVisible({ timeout: 1_000 }).catch(() => false))) {
    return;
  }
  await activate(confirm, 10_000);
}

async function configureLongTurnTimer(page: Page): Promise<void> {
  await ensureSettingsPanelOpen(page);
  const input = page.getByTestId("settings-turn-time-limit").first();
  await input.waitFor({ state: "attached", timeout: 10_000 });
  await input.evaluate((element) => {
    const inputElement = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(inputElement, "60");
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    inputElement.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await waitForInputValue(input, "60", 5_000);
  await page.waitForTimeout(500);
}

async function ensureSettingsPanelOpen(page: Page): Promise<void> {
  const panel = page.getByTestId("settings-panel").first();
  if (await panel.isVisible().catch(() => false)) {
    return;
  }
  await clickByTestId(page, "toggle-settings");
  await panel.waitFor({ state: "visible", timeout: 10_000 });
}

async function clickByTestId(page: Page, testId: string): Promise<void> {
  await activateTestId(page, testId);
}

async function activate(locator: Locator, timeoutMs = 10_000): Promise<void> {
  await locator.waitFor({ state: "attached", timeout: timeoutMs });
  if (!(await waitForEnabled(locator, timeoutMs))) {
    const label = await locator.innerText().catch(() => "unknown control");
    throw new Error(`control is disabled: ${label}`);
  }
  await locator.dispatchEvent("click", undefined, { timeout: timeoutMs });
}

async function activateTestId(page: Page, testId: string, timeoutMs = 20_000): Promise<void> {
  const selector = `[data-testid="${testId}"]`;
  await page.waitForFunction(
    ({ selector: targetSelector }) => {
      const element = document.querySelector(targetSelector);
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const disabled =
        element instanceof HTMLButtonElement ||
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
          ? element.disabled
          : element.getAttribute("aria-disabled") === "true";
      return !disabled;
    },
    { selector },
    { timeout: timeoutMs }
  );
  const clicked = await page.evaluate(({ selector: targetSelector }) => {
    const element = document.querySelector(targetSelector);
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    element.scrollIntoView({ block: "center", inline: "center" });
    element.click();
    return true;
  }, { selector });
  if (!clicked) {
    throw new Error(`missing control: ${testId}`);
  }
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

async function waitForSeatCount(page: Page, count: number): Promise<void> {
  await page.waitForFunction(
    (expected) => document.querySelectorAll(".poker-seat[data-player-id]").length >= expected,
    count,
    { timeout: 30_000 }
  );
}

async function submitTurnAndWaitForNext({
  actors,
  finalActor,
  label,
  previous
}: {
  actors: ActorRuntime[];
  finalActor: ActorRuntime;
  label: string;
  previous: ActionBoardState;
}): Promise<void> {
  for (const actor of actors.filter((item) => item.id !== finalActor.id)) {
    await clickSubmitAction(actor.page);
    await waitForSubmittedBoard(actor.page, `${actor.id} ${label} submitted`);
  }

  await clickSubmitAction(finalActor.page);
  await waitForAdvancedReady(actors[0]!.page, previous, label);
}

async function waitForSubmitReady(page: Page, label: string): Promise<ActionBoardState> {
  await page.waitForFunction(
    () => {
      const board = document.querySelector('[data-testid="action-board"]');
      return board instanceof HTMLElement && board.dataset.submitReady === "true" && board.dataset.canSubmit === "true";
    },
    undefined,
    { timeout: 45_000 }
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

async function waitForAdvancedReady(page: Page, previous: ActionBoardState, label: string): Promise<ActionBoardState> {
  const previousRound = Number(previous.roundNumber);
  const previousTurn = Number(previous.roundTurnNumber);
  await page.waitForFunction(
    ({ round, turn }) => {
      const board = document.querySelector('[data-testid="action-board"]');
      if (!(board instanceof HTMLElement)) {
        return false;
      }
      const nextRound = Number(board.dataset.roundNumber ?? "0");
      const nextTurn = Number(board.dataset.roundTurnNumber ?? "0");
      const advanced = nextRound > round || nextTurn > turn;
      return advanced && board.dataset.submitReady === "true" && board.dataset.alreadySubmitted === "false";
    },
    { round: previousRound, turn: previousTurn },
    { timeout: 30_000 }
  );
  const state = await readActionBoardState(page);
  if (state.readyState !== "ready") {
    throw new Error(`${label} did not reach a ready action board: ${JSON.stringify(state)}`);
  }
  return state;
}

async function readActionBoardState(page: Page): Promise<ActionBoardState> {
  return page.evaluate(() => {
    const element = document.querySelector('[data-testid="action-board"]');
    if (!(element instanceof HTMLElement)) {
      throw new Error("action board is missing");
    }
    const strip = document.querySelector('[data-testid="action-command-strip"]');
    return {
      actionInvalid: element.getAttribute("data-action-invalid") ?? "",
      alreadySubmitted: element.getAttribute("data-already-submitted") ?? "",
      canSubmit: element.getAttribute("data-can-submit") ?? "",
      lockedAction: element.getAttribute("data-locked-action") ?? "",
      readyState: element.getAttribute("data-ready-state") ?? "",
      roundNumber: element.getAttribute("data-round-number") ?? "",
      roundTurnNumber: element.getAttribute("data-round-turn-number") ?? "",
      selectedAction: element.getAttribute("data-selected-action") ?? "",
      submitReady: element.getAttribute("data-submit-ready") ?? "",
      targetCount: strip instanceof HTMLElement ? strip.getAttribute("data-target-count") ?? "" : "",
      targetIds: strip instanceof HTMLElement ? strip.getAttribute("data-target-ids") ?? "" : "",
      viewerId: element.getAttribute("data-viewer-id") ?? ""
    };
  });
}

async function configureShaAttack(page: Page, targetId: string): Promise<ActionBoardState> {
  await waitForSubmitReady(page, "before attack selection");
  await activate(page.getByTestId("action-mode-attack").first(), 20_000);
  await selectByTestId(page, "attack-row-kind-0", "attack:sha");
  await selectByTestId(page, "attack-row-target-0", targetId);
  await page.waitForFunction(
    (expectedTargetId) => {
      const board = document.querySelector('[data-testid="action-board"]');
      const strip = document.querySelector('[data-testid="action-command-strip"]');
      return (
        board instanceof HTMLElement &&
        strip instanceof HTMLElement &&
        board.dataset.submitReady === "true" &&
        board.dataset.canSubmit === "true" &&
        board.dataset.actionInvalid === "false" &&
        (strip.dataset.targetIds ?? "").split(",").includes(expectedTargetId)
      );
    },
    targetId,
    { timeout: 20_000 }
  );
  return readActionBoardState(page);
}

async function selectByTestId(page: Page, testId: string, value: string): Promise<void> {
  const select = page.getByTestId(testId).first();
  await select.waitFor({ state: "attached", timeout: 20_000 });
  if (!(await waitForEnabled(select, 20_000))) {
    throw new Error(`select is disabled: ${testId}`);
  }
  await select.selectOption(value);
}

async function clickSubmitAction(page: Page): Promise<void> {
  try {
    await activateTestId(page, "submit-action", 20_000);
  } catch (error) {
    const board = await readActionBoardState(page).catch(() => undefined);
    throw new Error(`submit button click failed: ${errorMessage(error)}; board=${JSON.stringify(board)}`);
  }
}

async function readSeatStates(page: Page): Promise<SeatState[]> {
  await waitForSeatCount(page, actorSpecs.length);
  return page.evaluate(() =>
    Array.from(document.querySelectorAll(".poker-seat[data-player-id]")).map((element) => {
      const item = element as HTMLElement;
      return {
        cakes: Number(item.dataset.playerCakes ?? "0"),
        hp: Number(item.dataset.playerHp ?? "0"),
        id: item.dataset.playerId ?? "",
        name: item.dataset.playerName ?? ""
      };
    })
  );
}

function requireSeat(seats: SeatState[], playerId: string): SeatState {
  const seat = seats.find((item) => item.id === playerId);
  if (!seat) {
    throw new Error(`missing seat for player ${playerId}: ${JSON.stringify(seats)}`);
  }
  return seat;
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
      if (
        text !== "Failed to load resource: net::ERR_CONNECTION_CLOSED" &&
        text !== "Failed to load resource: net::ERR_CONNECTION_TIMED_OUT"
      ) {
        consoleIssues.push(`[${name}] ${text}`);
      }
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`[${name}] ${error.message}`);
  });
}

function logStep(message: string): void {
  const line = `[focus-fire] ${new Date().toISOString()} ${message}`;
  console.log(line);
  fs.appendFileSync(path.join(runDir, "progress.log"), `${line}\n`, "utf-8");
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
    "# Focus-Fire Smoke",
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
    url: urlArg ?? process.env.BING_PLAYTEST_URL ?? "http://localhost:3001"
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
