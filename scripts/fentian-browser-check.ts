import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { io, Socket } from "socket.io-client";
import { PublicGameState, PlayerAction, FENTIAN_ATTACK_ID, LAVA_ARMOR_ID, FENSHI_FLAMES_ID,
  ANNIHILATION_CANNON_ID, GATHER_ELEMENT_ID, KUISHI_ID, SPIRIT_GUIDANCE_ID, getFusionSkillId } from "@bing/shared";

const port = await new Promise<number>((resolve, reject) => {
  const probe = net.createServer(); probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => { const address = probe.address() as net.AddressInfo; probe.close(() => resolve(address.port)); });
});
const url = `http://127.0.0.1:${port}`, stamp = Date.now();
const output = path.resolve(`artifacts/playtests/fentian-${stamp}`), data = path.resolve(`data-test/fentian-browser-${stamp}`);
fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(data, { recursive: true });
const log = fs.openSync(path.join(output, "server.log"), "a");
const server = spawn(process.execPath, ["--import", "tsx", "apps/server/src/index.ts"], { cwd: process.cwd(), windowsHide: true,
  stdio: ["ignore", log, log], env: { ...process.env, PORT: String(port), CLIENT_ORIGIN: url, PUBLIC_ORIGINS: url,
    ACCOUNT_DATA_FILE: path.join(data, "accounts.json"), MATCH_DATA_DIR: data } });
const sockets: Socket[] = [], contexts: BrowserContext[] = [], errors: string[] = [];
let browser: Browser | undefined;
async function emit(socket: Socket, event: string, payload: unknown): Promise<any> {
  const response = await socket.timeout(10000).emitWithAck(event, payload); assert.equal(response.ok, true, `${event}: ${response.error}`); return response.data;
}
async function connect(): Promise<Socket> {
  const socket = io(url, { transports: ["websocket"], reconnection: false }); sockets.push(socket);
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); }); return socket;
}
let roomId = ""; const ids: string[] = [];
const fresh = async (viewer = 0) => (await emit(sockets[viewer]!, "room:resume", { roomId, playerId: ids[viewer] })).state as PublicGameState;
async function progress(stop?: string): Promise<PublicGameState> {
  for (let guard = 0; guard < 80; guard++) {
    let state = await fresh();
    if (state.phase !== "action_window" || state.activeTimingPhase === stop) return state;
    const index = ids.findIndex((id) => state.players.some((player) => player.id === id && player.status === "alive") && !state.actionWindowPassPlayerIds.includes(id));
    assert.ok(index >= 0, `Stalled ${state.activeTimingPhase}`);
    await emit(sockets[index]!, "game:pass_action_window", { roomId });
  }
  throw new Error("Stage progression did not complete");
}
async function turn(actions: PlayerAction[], stop?: string) {
  const state = await progress(); assert.equal(state.phase, "collecting_actions");
  for (const [index, action] of actions.entries()) await emit(sockets[index]!, "game:submit_action", { roomId, action });
  return progress(stop);
}
const cake: PlayerAction = { type: "gain_cake" };
async function gainTo(amount: number) {
  for (let guard = 0; guard < 20; guard++) {
    if ((await fresh()).players[0]!.cakes >= amount) return;
    await turn([cake, cake]);
  }
  throw new Error("Could not accumulate cakes");
}
async function expand(page: Page) {
  const toggle = page.getByTestId("toggle-action-dock");
  if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
}
async function readCards(page: Page) {
  const entry = page.getByTestId("read-big-cards");
  if (await entry.isVisible()) await entry.click(); else await page.getByRole("tab", { name: "大卡", exact: true }).click();
}
async function noOverflow(page: Page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
}
try {
  let healthy = false;
  for (let i = 0; i < 80; i++) { try { if ((await fetch(url + "/health")).ok) { healthy = true; break; } } catch {} await new Promise((r) => setTimeout(r, 150)); }
  assert.ok(healthy);
  const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  browser = await chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}), args: ["--enable-unsafe-swiftshader"] });
  const a = await connect(), b = await connect();
  const room = await emit(a, "room:create", { playerName: "焚天测试玩家" }); roomId = room.roomId; ids.push(room.playerId);
  ids.push((await emit(b, "room:join", { roomId, playerName: "手机测试玩家" })).playerId);
  await emit(a, "room:update_settings", { roomId, config: { skillMode: "big_test_select", skillCount: 2, firstTurnNoAttack: false } });
  await emit(a, "room:update_player_skills", { roomId, targetPlayerId: ids[0], skillIds: ["10501", "10505"] });
  await emit(b, "room:update_player_skills", { roomId, targetPlayerId: ids[1], skillIds: ["10501", "10504"] });
  await emit(a, "game:start", { roomId });
  for (const [index, viewport] of [{ width: 1280, height: 900 }, { width: 390, height: 844 }].entries()) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" }); contexts.push(context);
    await context.addInitScript(({ roomId, playerId }) => {
      localStorage.setItem("bing.roomIdentity.v1", JSON.stringify({ roomId, playerId })); localStorage.setItem("bing.tutorial.skipped.v1", "true");
    }, { roomId, playerId: ids[index]! });
    const page = await context.newPage(); page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: "networkidle" });
  }
  const pageA = contexts[0]!.pages()[0]!, pageB = contexts[1]!.pages()[0]!;
  await expand(pageA);
  const peekOriginal = (await fresh()).players[1]!.bigCards?.find((card) => card.cardId === "10504");
  assert.ok(peekOriginal);
  assert.equal((await fresh(1)).players[0]!.bigCards?.length, 0);
  await pageA.getByTestId("enter-action-window").click();
  await pageA.getByTestId("window-skill-select").selectOption(KUISHI_ID);
  await pageA.getByText("选择并公开声明要复制的大卡").locator("select").selectOption(peekOriginal.instanceId);
  await pageA.getByRole("button", { name: "使用技能", exact: true }).click();
  for (let i = 0; i < 30 && !(await fresh(1)).players[0]!.bigCards?.length; i++) await new Promise((resolve) => setTimeout(resolve, 100));
  assert.deepEqual((await fresh(1)).players[0]!.bigCards?.map((card) => card.cardId), ["10504"]);
  await noOverflow(pageA);
  let state = await progress();
  assert.ok(state.players[0]!.skillFusions?.some((fusion) => fusion.skillId === getFusionSkillId("天火之狱")));
  await expand(pageA);
  await pageA.getByTestId("action-mode-attack").click();
  await pageA.getByTestId("attack-row-kind-0").selectOption(`skill:${SPIRIT_GUIDANCE_ID}`);
  await pageA.getByText("出招无效目标（可不选）").locator("select").selectOption(ids[1]!);
  await expand(pageB);
  await pageB.getByTestId("action-mode-attack").click();
  await pageB.getByTestId("attack-row-kind-0").selectOption(`skill:${ANNIHILATION_CANNON_ID}`);
  await pageB.getByText("立即退游目标（可不选）").locator("select").selectOption(ids[0]!);
  assert.equal(await pageB.getByTestId("submit-action").isDisabled(), true, "聚不足时禁止发炮");
  await gainTo(2);
  await expand(pageB);
  await pageB.getByTestId("action-mode-skill").click();
  await pageB.getByTestId("skill-action-select").selectOption(GATHER_ELEMENT_ID);
  await pageB.getByTestId("submit-action").click();
  await emit(a, "game:submit_action", { roomId, action: cake });
  await progress();
  await expand(pageB);
  await pageB.getByTestId("juneng-status").getByText("聚元素 1").waitFor();
  await noOverflow(pageB);
  await gainTo(4); await expand(pageA); await pageA.getByTestId("action-mode-skill").click();
  await pageA.getByTestId("skill-action-select").selectOption(LAVA_ARMOR_ID);
  await pageA.getByTestId("skill-optional-target-0").selectOption(ids[1]!);
  await pageA.getByTestId("skill-optional-target-1").selectOption(ids[0]!);
  await noOverflow(pageA); await pageA.screenshot({ path: path.join(output, "armor-targets-desktop.png"), fullPage: true });
  await pageA.getByTestId("submit-action").click();
  await emit(b, "game:submit_action", { roomId, action: { type: "attack", attackId: "sha", stacks: 1, targetId: ids[0] } });
  state = await progress("turn_end_action");
  assert.equal(state.players[0]!.buffs.find((buff) => buff.id === "defense_value")?.stacks, 4);
  assert.ok(state.eventLog.some((event) => event.type === "attack_reflected" && event.reflectedTargetId === ids[1]));
  await readCards(pageB); assert.match(await pageB.getByTestId("big-card-statuses").innerText(), /减伤与回避失效/);
  await noOverflow(pageB); await progress();

  await gainTo(4); await expand(pageA); await pageA.getByTestId("action-mode-attack").click();
  await pageA.getByTestId("attack-row-kind-0").selectOption(`skill:${FENTIAN_ATTACK_ID}`);
  await pageA.getByTestId("attack-row-target-0").selectOption(ids[1]!);
  assert.match(await pageA.getByTestId("attack-row-0").innerText(), /4\+3\+2/);
  await pageA.screenshot({ path: path.join(output, "attack-desktop.png"), fullPage: true });
  await pageA.getByTestId("submit-action").click(); await emit(b, "game:submit_action", { roomId, action: cake });
  state = await progress("turn_end_action");
  assert.deepEqual(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "焚天君燚").map((event) => event.type === "damage" ? event.amount : 0), [4, 3, 2]);
  const target = state.players[1]!;
  assert.ok(target.buffs.some((buff) => buff.stateType === "burning"));
  await readCards(pageB); assert.match(await pageB.getByTestId("big-card-statuses").innerText(), /烧伤/);
  await pageB.screenshot({ path: path.join(output, "burning-mobile.png"), fullPage: true });
  state = await progress(); const round = state.roundNumber;
  assert.equal(state.players[1]!.hp, 5);
  state = await turn([cake, cake]); assert.equal(state.players[1]!.hp, 4); assert.equal(state.roundNumber, round);
  assert.ok(state.eventLog.filter((event) => event.type === "damage" && event.attackName === "烧伤").every((event) => event.type === "damage" && !event.sourceId));
  const identity = state.players[0]!.bigCards;
  await pageA.reload({ waitUntil: "networkidle" }); assert.deepEqual((await fresh()).players[0]!.bigCards, identity);

  await gainTo(5); await expand(pageA); await pageA.getByTestId("action-mode-skill").click();
  await pageA.getByTestId("skill-action-select").selectOption(FENSHI_FLAMES_ID);
  await pageA.getByTestId("submit-action").click(); await emit(b, "game:submit_action", { roomId, action: cake });
  state = await progress(); assert.equal(state.players[0]!.buffs.filter((buff) => buff.stateType === "fenshi_flames").length, 1);
  await gainTo(5); await expand(pageA); await pageA.getByTestId("action-mode-attack").click();
  await pageA.getByTestId("attack-row-kind-0").selectOption("attack:huo_wu");
  await pageA.getByTestId("attack-row-0").locator('input[type="number"]').first().fill("5");
  await pageA.getByTestId("attack-row-target-0").selectOption(ids[1]!);
  await pageA.getByTestId("submit-action").click(); await emit(b, "game:submit_action", { roomId, action: cake });
  state = await progress("turn_end_action");
  state = await fresh(1); // Card identities are private to their owner.
  assert.equal(state.players[1]!.bigCards!.length, 1); assert.equal(state.players[1]!.hp, 6);
  assert.equal(state.eventLog.filter((event) => event.type === "system" && event.removalKind === "burn").length, 1);
  if (!state.players[1]!.bigCards!.some((card) => card.cardId === "10501")) assert.ok(!state.players[1]!.skillFusions?.some((fusion) =>
    fusion.skillId === getFusionSkillId("天火之狱")));
  await readCards(pageB); await noOverflow(pageB);
  await pageB.screenshot({ path: path.join(output, "revival-burn-card-mobile.png"), fullPage: true });
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, "report.md"), "# 焚天君燚联机测试\n\n结果：通过。\n\n- 双玩家桌面 1280px / 手机 390px，控制台无未捕获异常，无横向溢出。\n- 实际获得天火之狱；熔岩天甲可选两名目标、增加防御并将攻击弹回发出者。\n- 行动界面显示并提交4+3+2攻击；命中后状态可见。\n- 独立烧伤在命中当回合和下一回合末结算，无来源、不重开。\n- 焚世烈焰火伤致死后，目标浴火复活并被烧去一张大卡；继承来源清理正确。\n- 重连保留大卡实例。\n\n炽焰仍为明确的待实现接口。\n");
  console.log(`Fentian browser checks passed: ${output}`);
} catch (error) {
  for (const [index, context] of contexts.entries()) await context.pages()[0]?.screenshot({ path: path.join(output, `failure-${index}.png`), fullPage: true }).catch(() => {});
  throw error;
} finally {
  sockets.forEach((socket) => socket.disconnect()); await browser?.close(); server.kill(); fs.closeSync(log);
}
