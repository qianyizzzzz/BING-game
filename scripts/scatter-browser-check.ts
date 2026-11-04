import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { io, Socket } from "socket.io-client";
import { getAllSkills, PublicGameState, PlayerAction } from "@bing/shared";

const port = Number(process.env.SCATTER_TEST_PORT ?? 3109);
const url = `http://127.0.0.1:${port}`;
const output = path.resolve("artifacts/playtests", `scatter-${Date.now()}`);
const data = path.resolve("data-test", `scatter-${Date.now()}`);
fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(data, { recursive: true });
const log = fs.openSync(path.join(output, "server.log"), "a");
const server = spawn(process.execPath, ["--import", "tsx", "apps/server/src/index.ts"], {
  cwd: process.cwd(), windowsHide: true, stdio: ["ignore", log, log],
  env: { ...process.env, PORT: String(port), CLIENT_ORIGIN: url, PUBLIC_ORIGINS: url,
    ACCOUNT_DATA_FILE: path.join(data, "accounts.json"), MATCH_DATA_DIR: data }
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let page: Awaited<ReturnType<NonNullable<typeof browser>["newPage"]>> | undefined;
const sockets: Socket[] = [];
const errors: string[] = [];
let latest: PublicGameState | undefined;
async function emit(socket: Socket, event: string, payload: unknown): Promise<any> {
  const response = await socket.timeout(10_000).emitWithAck(event, payload);
  assert.equal(response.ok, true, `${event}: ${response.error}`); return response.data;
}
const skill = (name: string) => getAllSkills().find((entry) => entry.name === name)!.id;
try {
  let healthy = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${url}/health`)).ok) { healthy = true; break; } } catch { }
    if (server.exitCode !== null) throw new Error(`Server exited: ${server.exitCode}`);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.ok(healthy);
  for (let i = 0; i < 4; i++) {
    const socket = io(url, { transports: ["websocket"], reconnection: false }); sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  }
  const room = await emit(sockets[0]!, "room:create", { playerName: "散弹测试甲" });
  const roomId = room.roomId;
  const ids = [room.playerId];
  for (let i = 1; i < 4; i++) ids.push((await emit(sockets[i]!, "room:join", { roomId, playerName: ["", "散弹测试乙", "散弹测试丙", "散弹测试丁"][i] })).playerId);
  await emit(sockets[0]!, "room:update_settings", { roomId, config: { skillMode: "test_select", skillCount: 2, firstTurnNoAttack: false, turnTimeLimitSeconds: 180 } });
  const skills = [["绝对值", "文明人"], ["散弹", "绝弹"], ["散弹", "绝弹"], ["鬼道", "绝对值"]];
  for (let i = 0; i < 4; i++) await emit(sockets[i]!, "room:update_player_skills", { roomId, targetPlayerId: ids[i], skillIds: skills[i]!.map(skill) });
  sockets[3]!.on("room:state", (state) => { latest = state; });
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(fs.existsSync);
  browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"], ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(({ roomId, playerId }) => {
    localStorage.setItem("bing.roomIdentity.v1", JSON.stringify({ roomId, playerId }));
    localStorage.setItem("bing.tutorial.skipped.v1", "true");
  }, { roomId, playerId: ids[3]! });
  page = await context.newPage(); page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByText("房间准备 · 等待开始", { exact: true }).waitFor();
  let state = (await emit(sockets[0]!, "game:start", { roomId })).state as PublicGameState;
  async function advance(current: PublicGameState): Promise<PublicGameState> {
    for (let guard = 0; current.phase === "action_window" && guard < 30; guard++) {
      for (const socket of sockets) {
        current = (await emit(socket, "room:resume", { roomId, playerId: ids[sockets.indexOf(socket)] })).state;
        if (current.phase !== "action_window") break;
        if (current.actionWindowPassPlayerIds.includes(ids[sockets.indexOf(socket)]!)) continue;
        current = (await emit(socket, "game:pass_action_window", { roomId })).state;
      }
    }
    assert.equal(current.phase, "collecting_actions"); return current;
  }
  async function turn(actions: PlayerAction[]): Promise<PublicGameState> {
    let result = state;
    for (let i = 0; i < 4; i++) result = (await emit(sockets[i]!, "game:submit_action", { roomId, action: actions[i] })).state;
    return advance(result);
  }
  const gain = { type: "gain_cake" } as const;
  const shot = { type: "attack", attackId: "sha", stacks: 1, targetId: ids[1]! } as const;
  const b = { type: "defense", defense: "rebound", targetId: ids[2]! } as const;
  const c = { type: "defense", defense: "rebound", targetId: ids[1]! } as const;
  state = await advance(state);
  state = await turn([gain, gain, gain, gain]);
  state = await turn([shot, b, c, { type: "defense", defense: "small" }]);
  const self = state.players.find((player) => player.id === ids[3])!;
  assert.equal(self.buffs.find((buff) => buff.id === "guidao_charge")?.infinite, true);
  assert.equal(state.players.find((player) => player.id === ids[0])!.hpIsInfinite, true);
  await page.getByRole("tab", { name: "技能", exact: true }).click();
  await page.getByText("鬼道剩余 ∞ 次", { exact: false }).first().waitFor();
  await page.locator(`[data-player-id="${ids[0]}"]`).getByText("∞", { exact: true }).waitFor();
  await page.locator(".battle-stage-overlay").waitFor({ state: "hidden", timeout: 20_000 });
  assert.ok((await page.locator("body").innerText()).includes("受伤∞"));
  await page.screenshot({ path: path.join(output, "infinite-ghost-desktop.png"), fullPage: true });
  // A new round resets cakes; earn one before triggering scatter again.
  state = await turn([gain, gain, gain, gain]);
  state = await turn([shot, b, c, gain]);
  assert.equal(state.players.find((player) => player.id === ids[0])!.hpIsInfinite, true);
  assert.equal(state.players.find((player) => player.id === ids[3])!.hpIsInfinite, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(`[data-player-id="${ids[3]}"]`).getByText("∞", { exact: true }).waitFor();
  await page.getByTestId("action-mode-attack").click();
  await page.getByTestId("attack-row-kind-0").selectOption(`skill:${skill("鬼道")}`);
  const submit = page.getByTestId("submit-action");
  assert.ok(await submit.isEnabled()); await submit.scrollIntoViewIfNeeded();
  await page.locator(".battle-stage-overlay").waitFor({ state: "hidden", timeout: 20_000 });
  await page.screenshot({ path: path.join(output, "infinite-hp-ghost-mobile.png"), fullPage: true });
  await submit.click();
  let after = state;
  for (let i = 0; i < 3; i++) after = (await emit(sockets[i]!, "game:submit_action", { roomId, action: gain })).state;
  state = await advance(after);
  assert.equal(state.players.find((player) => player.id === ids[3])!.buffs.find((buff) => buff.id === "guidao_charge")?.infinite, true);
  assert.ok(state.eventLog.some((event) => event.type === "skill_used" && event.playerId === ids[3] && event.skillId === skill("鬼道")));
  assert.ok(state.eventLog.some((event) => event.type === "damage" && event.infiniteCopies));
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({ passed: true, roomId, checks: ["four real socket sessions", "two-scatter infinite loop", "small defense grants infinite ghost", "absolute HP infinity survives another infinite hit", "1280px infinity display", "390px ghost submission", "ghost stays infinite after spending", "no page errors"], pageErrors: errors, state }, null, 2));
  console.log(`scatter browser checks passed: ${output}`);
} catch (error) {
  fs.writeFileSync(path.join(output, "failure.json"), JSON.stringify({ state: latest, error: String(error), pageErrors: errors }, null, 2));
  if (page) {
    await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => undefined);
    fs.writeFileSync(path.join(output, "failure-page.txt"), await page.locator("body").innerText().catch(() => "unavailable"));
  }
  throw error;
} finally {
  for (const socket of sockets) socket.disconnect(); await browser?.close(); server.kill(); fs.closeSync(log);
}
