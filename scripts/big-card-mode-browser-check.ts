import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { io, Socket } from "socket.io-client";
import { getBigCard, PublicGameState } from "@bing/shared";

const port = await new Promise<number>((resolve, reject) => {
  const probe = net.createServer(); probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => { const address = probe.address() as net.AddressInfo; probe.close(() => resolve(address.port)); });
});
const url = `http://127.0.0.1:${port}`;
const output = path.resolve(`artifacts/playtests/big-card-modes-${Date.now()}`);
const data = path.resolve(`data-test/big-card-browser-${Date.now()}`);
fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(data, { recursive: true });
const log = fs.openSync(path.join(output, "server.log"), "a");
const server = spawn(process.execPath, ["--import", "tsx", "apps/server/src/index.ts"], {
  cwd: process.cwd(), windowsHide: true, stdio: ["ignore", log, log],
  env: { ...process.env, PORT: String(port), CLIENT_ORIGIN: url, PUBLIC_ORIGINS: url,
    ACCOUNT_DATA_FILE: path.join(data, "accounts.json"), MATCH_DATA_DIR: data }
});
const sockets: Socket[] = [], contexts: BrowserContext[] = [], errors: string[] = [];
let browser: Browser | undefined;
async function emit(socket: Socket, event: string, payload: unknown): Promise<any> {
  const response = await socket.timeout(10000).emitWithAck(event, payload);
  assert.equal(response.ok, true, `${event}: ${response.error}`); return response.data;
}
async function connect(): Promise<Socket> {
  const socket = io(url, { transports: ["websocket"], reconnection: false }); sockets.push(socket);
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); }); return socket;
}
async function openPlayer(roomId: string, playerId: string, mobile = false): Promise<Page> {
  const context = await browser!.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, reducedMotion: "reduce" });
  contexts.push(context);
  await context.addInitScript(({ roomId, playerId }) => {
    localStorage.setItem("bing.roomIdentity.v1", JSON.stringify({ roomId, playerId }));
    localStorage.setItem("bing.tutorial.skipped.v1", "true");
  }, { roomId, playerId });
  const page = await context.newPage(); page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" }); await page.getByRole("button", { name: "改名", exact: true }).waitFor();
  return page;
}
async function noHorizontalOverflow(page: Page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Horizontal overflow at ${page.viewportSize()?.width}px`);
}
function timer(state: PublicGameState) {
  const deadline = state.phase === "action_window" ? state.actionWindowDeadlineAt : state.turnDeadlineAt;
  assert.ok(deadline && deadline - Date.now() > 290000 && deadline - Date.now() <= 300000, `Wrong timer: ${deadline}`);
}
try {
  let healthy = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${url}/health`)).ok) { healthy = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.ok(healthy, "Test server failed to start");
  const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  browser = await chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}), args: ["--enable-unsafe-swiftshader"] });
  const a = await connect(), b = await connect();
  const room = await emit(a, "room:create", { playerName: "大卡房主" });
  const guest = await emit(b, "room:join", { roomId: room.roomId, playerName: "手机玩家" });
  const withAi = await emit(a, "room:add_ai", { roomId: room.roomId });
  const aiId = withAi.state.players.find((player: any) => player.kind === "ai").id;
  const pageA = await openPlayer(room.roomId, room.playerId);
  await pageA.getByTestId("toggle-settings").click();
  const modes = pageA.getByTestId("settings-skill-mode");
  assert.deepEqual(await modes.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value)),
    ["none", "small_intro", "test_select", "big_random", "big_test_select"]);
  await pageA.getByTestId("settings-turn-time-limit").fill("75");
  await modes.selectOption("big_test_select");
  await pageA.getByTestId("settings-skill-count").selectOption("2");
  await pageA.getByTestId("big-card-add-" + room.playerId).waitFor();
  assert.equal(await pageA.getByTestId("settings-turn-time-limit").inputValue(), "300");
  assert.ok(await pageA.getByTestId("settings-turn-time-limit").isDisabled());
  assert.equal(await pageA.getByTestId("test-skill-panel").count(), 0);
  assert.equal(await pageA.getByTestId(`big-card-add-${guest.playerId}`).count(), 0);
  await pageA.getByTestId(`big-card-search-${room.playerId}`).fill("10501");
  await pageA.getByTestId(`big-card-add-${room.playerId}`).selectOption("10501");
  await pageA.getByTestId(`big-card-detail-10501`).waitFor();
  await pageA.getByTestId(`big-card-add-${room.playerId}`).selectOption("20920");
  await pageA.getByTestId("big-card-detail-20920").waitFor();
  await pageA.getByTestId(`big-card-remove-${room.playerId}-1`).click();
  await pageA.getByTestId("big-card-detail-20920").waitFor({ state: "detached" });
  await pageA.getByTestId(`big-card-add-${room.playerId}`).selectOption("20920");
  await pageA.getByTestId(`big-card-add-${aiId}`).selectOption("10502");
  const pageB = await openPlayer(room.roomId, guest.playerId, true);
  await pageB.getByTestId(`big-card-add-${guest.playerId}`).selectOption("20813");
  await pageB.getByTestId("big-card-detail-20813").locator("summary").click();
  await pageA.getByTestId("big-card-detail-10501").locator("summary").click();
  assert.equal(await pageA.getByText("1050103", { exact: true }).count(), 1);
  assert.equal(await pageA.getByText(getBigCard("10501")!.abilities[2]!.description, { exact: true }).count(), 1);
  await noHorizontalOverflow(pageA); await noHorizontalOverflow(pageB);
  await pageA.screenshot({ path: path.join(output, "specified-desktop.png"), fullPage: true });
  await pageB.screenshot({ path: path.join(output, "specified-mobile.png"), fullPage: true });
  await pageA.getByTestId("start-game").click();
  await pageA.getByRole("tab", { name: "大卡", exact: true }).click();
  await pageA.getByTestId("big-card-detail-20920").waitFor();
  await pageA.waitForFunction(() => document.querySelector('[data-testid="toggle-action-dock"]')?.getAttribute("aria-expanded") === "false");
  await pageA.getByTestId("big-card-detail-10501").locator("summary").click();
  assert.ok(await pageA.getByText("1050103", { exact: true }).isVisible());
  assert.equal(await pageA.getByTestId("big-card-detail-20813").count(), 0);
  assert.equal(await pageA.getByTestId("big-card-detail-10502").count(), 0);
  let state: PublicGameState = (await emit(a, "room:resume", { roomId: room.roomId, playerId: room.playerId })).state;
  timer(state);
  assert.equal(state.players[0]!.skills.length, 2);
  assert.deepEqual(state.players[1]!.bigCards, []);
  state = (await emit(a, "game:enter_action_window", { roomId: room.roomId })).state; timer(state);
  for (let guard = 0; state.phase === "action_window" && guard < 12; guard++) {
    for (const [socket, playerId] of [[a, room.playerId], [b, guest.playerId]] as const) {
      state = (await emit(socket, "room:resume", { roomId: room.roomId, playerId })).state;
      if (state.phase === "action_window" && !state.actionWindowPassPlayerIds.includes(playerId)) {
        state = (await emit(socket, "game:pass_action_window", { roomId: room.roomId })).state;
      }
    }
  }
  assert.equal(state.phase, "collecting_actions"); timer(state);
  state = (await emit(a, "room:resume", { roomId: room.roomId, playerId: room.playerId })).state;
  const owned = state.players[0]!.bigCards;
  await emit(a, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
  state = (await emit(b, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state; timer(state);
  await pageA.reload({ waitUntil: "networkidle" });
  state = (await emit(a, "room:resume", { roomId: room.roomId, playerId: room.playerId })).state;
  assert.deepEqual(state.players[0]!.bigCards, owned, "Resume must retain instance identity"); timer(state);
  await pageA.getByRole("tab", { name: "大卡", exact: true }).click();
  await pageA.getByTestId("big-card-detail-10501").locator("summary").click();
  await pageB.getByTestId("read-big-cards").click();
  await pageB.getByTestId("big-card-detail-20813").locator("summary").click();
  await noHorizontalOverflow(pageA);
  await pageA.screenshot({ path: path.join(output, "game-desktop.png"), fullPage: true });
  await pageB.screenshot({ path: path.join(output, "game-mobile.png"), fullPage: true });

  const randomHost = await connect(), randomGuest = await connect();
  const randomRoom = await emit(randomHost, "room:create", { playerName: "随机大卡房主" });
  await emit(randomGuest, "room:join", { roomId: randomRoom.roomId, playerName: "随机玩家" });
  const randomPage = await openPlayer(randomRoom.roomId, randomRoom.playerId);
  await randomPage.getByTestId("toggle-settings").click();
  await randomPage.getByTestId("settings-skill-mode").selectOption("big_random");
  await randomPage.getByTestId("settings-skill-count").selectOption("3");
  await randomPage.getByTestId("big-card-pending-notice").waitFor();
  assert.equal(await randomPage.locator('[data-testid^="big-card-add-"]').count(), 0);
  await randomPage.getByTestId("start-game").click();
  await randomPage.getByTestId("read-big-cards").click();
  await randomPage.locator('[data-testid^="big-card-detail-"]').first().waitFor();
  await randomPage.locator('[data-testid^="big-card-detail-"]').first().locator("summary").click();
  const randomState = (await emit(randomHost, "room:resume", { roomId: randomRoom.roomId, playerId: randomRoom.playerId })).state as PublicGameState;
  assert.equal(randomState.players[0]!.bigCards!.length, 3);
  assert.ok(randomState.players[0]!.bigCards!.every((card) => getBigCard(card.cardId)?.kind === "native")); timer(randomState);
  await randomPage.screenshot({ path: path.join(output, "random-desktop.png"), fullPage: true });
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, "report.md"), `# 大技能模式联调报告\n\n结果：通过。\n\n- 新增两种模式，原三种选项保留。\n- 双玩家 + AI 指定大卡、搜索 ID、移除卡牌、展开子技能原文正常。\n- 1280px / 390px 无横向溢出，浏览器无未捕获异常。\n- 随机模式仅分配原生大卡。\n- 出招、准备与技能行动窗口均为 300 秒。\n- 重连保留卡牌实例，其他玩家卡面隐藏。\n- 大卡标注待实现，未开放卡面效果。\n`);
  console.log(`Big-card browser checks passed: ${output}`);
} catch (error) {
  for (const [index, context] of contexts.entries()) await context.pages()[0]?.screenshot({ path: path.join(output, `failure-${index}.png`), fullPage: true }).catch(() => {});
  throw error;
} finally {
  sockets.forEach((socket) => socket.disconnect());
  await browser?.close(); server.kill(); fs.closeSync(log);
}
