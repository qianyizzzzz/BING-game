import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { io, Socket } from "socket.io-client";
import { getAllSkills, PlayerAction, PublicGameState } from "@bing/shared";

const port = Number(process.env.ATTACK_SCOPE_TEST_PORT ?? 3113), url = `http://127.0.0.1:${port}`, stamp = Date.now();
const output = path.resolve("artifacts/playtests", `attack-scope-${stamp}`), data = path.resolve("data-test", `attack-scope-${stamp}`);
fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(data, { recursive: true });
const log = fs.openSync(path.join(output, "server.log"), "a");
const server = spawn(process.execPath, ["--import", "tsx", "apps/server/src/index.ts"], {
  cwd: process.cwd(), windowsHide: true, stdio: ["ignore", log, log],
  env: { ...process.env, PORT: String(port), CLIENT_ORIGIN: url, PUBLIC_ORIGINS: url,
    ACCOUNT_DATA_FILE: path.join(data, "accounts.json"), MATCH_DATA_DIR: data }
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let page: Awaited<ReturnType<NonNullable<typeof browser>["newPage"]>> | undefined;
const sockets: Socket[] = [], errors: string[] = [];
const skill = (name: string) => getAllSkills().find((entry) => entry.name === name)!.id;
async function emit(socket: Socket, event: string, payload: unknown): Promise<any> {
  const response = await socket.timeout(10_000).emitWithAck(event, payload);
  assert.equal(response.ok, true, `${event}: ${response.error}`); return response.data;
}
try {
  let healthy = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${url}/health`)).ok) { healthy = true; break; } } catch { }
    if (server.exitCode !== null) throw new Error(`Test server exited: ${server.exitCode}`);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.ok(healthy);
  for (let i = 0; i < 3; i++) {
    const socket = io(url, { transports: ["websocket"], reconnection: false }); sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  }
  const room = await emit(sockets[0]!, "room:create", { playerName: "攻击测试甲" });
  const roomId = room.roomId, ids = [room.playerId];
  for (let i = 1; i < 3; i++) ids.push((await emit(sockets[i]!, "room:join", { roomId, playerName: `印记测试${i}` })).playerId);
  await emit(sockets[0]!, "room:update_settings", { roomId, config: { skillMode: "test_select", skillCount: 3, firstTurnNoAttack: false, turnTimeLimitSeconds: 180 } });
  const loadouts = [["净化之风", "圣", "抠"], ["十字守护", "冰箭雨", "六芒星"], ["文明人"]];
  for (let i = 0; i < 3; i++) await emit(sockets[i]!, "room:update_player_skills", { roomId, targetPlayerId: ids[i], skillIds: loadouts[i]!.map(skill) });
  let state = (await emit(sockets[0]!, "game:start", { roomId })).state as PublicGameState;
  async function fresh(index = 0): Promise<PublicGameState> {
    return (await emit(sockets[index]!, "room:resume", { roomId, playerId: ids[index] })).state;
  }
  async function advance(toEnd = false): Promise<void> {
    for (let guard = 0; state.phase === "action_window" && !(toEnd && state.activeTimingPhase === "turn_end_action") && guard < 80; guard++) {
      for (let i = 0; i < 3; i++) {
        state = await fresh(i);
        if (state.phase !== "action_window" || toEnd && state.activeTimingPhase === "turn_end_action") return;
        if (!state.actionWindowPassPlayerIds.includes(ids[i]!)) state = (await emit(sockets[i]!, "game:pass_action_window", { roomId })).state;
      }
    }
    assert.ok(toEnd ? state.activeTimingPhase === "turn_end_action" : state.phase === "collecting_actions");
  }
  async function submit(actions: PlayerAction[]): Promise<void> {
    for (let i = 0; i < 3; i++) state = (await emit(sockets[i]!, "game:submit_action", { roomId, action: actions[i] })).state;
  }
  const gain = { type: "gain_cake" } as const;
  await advance();
  for (let i = 0; i < 2; i++) { await submit([gain, gain, gain]); await advance(); }
  await submit([gain, { type: "attack", attackId: "wan_jian", stacks: 1 }, gain]); await advance();
  await submit([gain, gain, gain]); await advance();
  await submit([{ type: "attack", attackId: "sha", stacks: 1, targetId: ids[1] }, gain, gain]); await advance(true);
  assert.deepEqual(state.players.map((player) => player.hp), [4, 5, 4]);
  state = (await emit(sockets[0]!, "game:submit_window_skill", { roomId, action: { type: "skill", skillId: skill("净化之风"), stacks: 1 } })).state;
  assert.equal(state.activeTimingPhase, "turn_damage_modify");
  state = (await emit(sockets[1]!, "game:enter_action_window", { roomId })).state;
  const item = state.pendingDamageItems!.find((entry) => entry.targetId === ids[1])!;
  assert.equal(item.spellDamage, true); assert.equal(item.fromAttack, false);
  for (const name of ["十字守护", "冰箭雨"]) {
    const response = await sockets[1]!.timeout(10_000).emitWithAck("game:submit_window_skill", {
      roomId, action: { type: "skill", skillId: skill(name), stacks: 1, targetDamageId: item.id }
    });
    assert.equal(response.ok, false); assert.match(response.error, /只能作用于攻击伤害/);
  }
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH ??
    ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(fs.existsSync);
  browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"], ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(({ roomId, playerId }) => {
    localStorage.setItem("bing.roomIdentity.v1", JSON.stringify({ roomId, playerId }));
    localStorage.setItem("bing.tutorial.skipped.v1", "true");
  }, { roomId, playerId: ids[1]! });
  page = await context.newPage(); page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const select = page.getByTestId("window-skill-select"); await select.waitFor();
  for (const name of ["十字守护", "冰箭雨"]) {
    await select.selectOption(skill(name));
    const button = page.getByRole("button", { name: "使用技能", exact: true });
    await button.waitFor(); assert.equal(await button.isDisabled(), true, `${name} must not target a spell`);
  }
  await select.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, "spell-marks-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 }); await select.scrollIntoViewIfNeeded();
  const box = await select.boundingBox(); assert.ok(box && box.x >= -1 && box.x + box.width <= 391);
  await page.screenshot({ path: path.join(output, "spell-marks-mobile.png") });
  assert.deepEqual(errors, []);
  const result = { passed: true, serverRejectedSpellMarks: true, desktopAndMobileRejectedSpellMarks: true, errors, output };
  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} catch (error) {
  console.error(error);
  if (page) { await page.screenshot({ path: path.join(output, "failure.png") }).catch(() => {});
    fs.writeFileSync(path.join(output, "failure.html"), await page.content().catch(() => "unavailable")); }
  throw error;
} finally {
  sockets.forEach((socket) => socket.disconnect()); await browser?.close(); server.kill(); fs.closeSync(log);
}
