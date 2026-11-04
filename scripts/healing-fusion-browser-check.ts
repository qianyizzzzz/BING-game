import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { io, Socket } from "socket.io-client";
import { COMMON_FUSION_SKILL_ID, getAllSkills, getFusionSkillId, PlayerAction, PublicGameState } from "@bing/shared";

const port = Number(process.env.HEALING_FUSION_TEST_PORT ?? 3112), url = `http://127.0.0.1:${port}`;
const stamp = Date.now(), output = path.resolve("artifacts/playtests", `healing-fusions-${stamp}`);
const data = path.resolve("data-test", `healing-fusions-${stamp}`);
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
  const room = await emit(sockets[0]!, "room:create", { playerName: "不死鸟测试甲" });
  const roomId = room.roomId, ids = [room.playerId];
  for (let i = 1; i < 3; i++) ids.push((await emit(sockets[i]!, "room:join", { roomId, playerName: `回血测试${i}` })).playerId);
  await emit(sockets[0]!, "room:update_settings", { roomId, config: { skillMode: "test_select", skillCount: 3, turnTimeLimitSeconds: 180 } });
  const loadouts = [["浴火重生", "创伤聚合", "森林的低吟"], ["嗜血", "血之哀", "文明人"], ["天佑之魂", "文明人", "血之哀"]];
  for (let i = 0; i < 3; i++) await emit(sockets[i]!, "room:update_player_skills", {
    roomId, targetPlayerId: ids[i], skillIds: loadouts[i]!.map(skill)
  });
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH ??
    ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(fs.existsSync);
  browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"], ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(({ roomId, playerId }) => {
    localStorage.setItem("bing.roomIdentity.v1", JSON.stringify({ roomId, playerId }));
    localStorage.setItem("bing.tutorial.skipped.v1", "true");
  }, { roomId, playerId: ids[2]! });
  page = await context.newPage(); page.on("pageerror", (error) => errors.push(error.message));
  let state = (await emit(sockets[0]!, "game:start", { roomId })).state as PublicGameState;
  for (const [index, name] of [[0, "不死鸟之眼"], [1, "制裁之刃"]] as const) {
    state = (await emit(sockets[index]!, "game:submit_action", { roomId, action: {
      type: "skill", skillId: COMMON_FUSION_SKILL_ID, stacks: 1,
      targetSkillId: getFusionSkillId(name), fusionRequestId: `healing_fusion_${index}`
    } })).state;
  }
  async function fresh(index = 2): Promise<PublicGameState> {
    return (await emit(sockets[index]!, "room:resume", { roomId, playerId: ids[index] })).state;
  }
  async function advance(toEnd = false): Promise<void> {
    for (let guard = 0; state.phase === "action_window" && !(toEnd && state.activeTimingPhase === "turn_end_action") && guard < 60; guard++) {
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
  for (let i = 0; i < 3; i++) { await submit([gain, gain, gain]); await advance(); }
  await submit([{ type: "skill", skillId: skill("森林的低吟"), stacks: 1 }, gain, gain]);
  await advance(true);
  assert.equal(state.phase, "action_window"); assert.equal(state.activeTimingPhase, "turn_end_action");
  assert.deepEqual(state.players.map((player) => player.hp), [6, 12, 6]);
  const forest = state.eventLog.findLast((event) => event.type === "heal" && event.reason === "森林的低吟");
  assert.ok(forest?.type === "heal");
  assert.equal(forest.amount, 6); assert.equal(forest.targetId, ids[1]); assert.equal(forest.originalTargetId, ids[0]);
  state = await fresh();
  assert.equal(Object.hasOwn(state.players[0]!, "skillFusions"), false);
  // Open the skill window before loading the browser, avoiding the five-second prompt timeout.
  state = (await emit(sockets[2]!, "game:enter_action_window", { roomId })).state;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const select = page.getByTestId("window-skill-select"); await select.waitFor();
  await select.selectOption(skill("天佑之魂"));
  await select.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, "healing-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 }); await select.scrollIntoViewIfNeeded();
  const box = await select.boundingBox(); assert.ok(box && box.x >= -1 && box.x + box.width <= 391);
  await page.screenshot({ path: path.join(output, "healing-mobile.png") });
  await page.getByRole("button", { name: "使用技能", exact: true }).click();
  for (let i = 0; i < 60; i++) {
    state = await fresh(0);
    if (state.eventLog.some((event) => event.type === "heal" && event.reason === "天佑之魂")) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepEqual(state.players.map((player) => player.hp), [6, 18, 6]);
  const soul = state.eventLog.findLast((event) => event.type === "heal" && event.reason === "天佑之魂");
  assert.ok(soul?.type === "heal"); assert.equal(soul.amount, 6);
  assert.equal(soul.recoveryKind, "healing"); assert.equal(soul.targetId, ids[1]); assert.equal(soul.originalTargetId, ids[2]);
  await page.screenshot({ path: path.join(output, "healing-after-soul-mobile.png") });
  assert.deepEqual(errors, []);
  const result = { passed: true, amplifiedForestThenStolen: forest.amount, standingSoulStolen: soul.amount,
    finalHp: state.players.map((player) => player.hp), desktopAndMobile: true, errors, output };
  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} catch (error) {
  console.error(error);
  if (page) { await page.screenshot({ path: path.join(output, "failure.png") }).catch(() => {});
    fs.writeFileSync(path.join(output, "failure.html"), await page.content().catch(() => "unavailable")); }
  throw error;
} finally {
  sockets.forEach((socket) => socket.disconnect()); await browser?.close(); server.kill(); fs.closeSync(log);
}
