import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, Page } from "playwright";
import { io, Socket } from "socket.io-client";
import { getAllSkills, getFusionSkillId, PublicGameState } from "@bing/shared";

const stamp = Date.now(), port = 3114, url = `http://127.0.0.1:${port}`;
const output = path.resolve(`artifacts/playtests/final-three-${stamp}`), data = path.resolve(`data-test/final-three-${stamp}`);
fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(data, { recursive: true });
const log = fs.openSync(path.join(output, "server.log"), "a");
const server = spawn(process.execPath, ["--import", "tsx", "apps/server/src/index.ts"], { cwd: process.cwd(), windowsHide: true,
  stdio: ["ignore", log, log], env: { ...process.env, PORT: String(port), CLIENT_ORIGIN: url, PUBLIC_ORIGINS: url,
    ACCOUNT_DATA_FILE: path.join(data, "accounts.json"), MATCH_DATA_DIR: data } });
const errors: string[] = [], sockets: Socket[] = [];
const skill = (name: string) => getAllSkills({ includeFusions: true }).find((s) => s.name === name)!.id;
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args: ["--enable-unsafe-swiftshader"] });
let page: Page | undefined;
async function emit(socket: Socket, event: string, payload: unknown): Promise<any> {
  const response = await socket.timeout(10000).emitWithAck(event, payload);
  assert.equal(response.ok, true, `${event}: ${response.error}`); return response.data;
}
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(url + "/health")).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 150)); }
  for (const name of ["沙皇", "天魔舞", "猥琐小叔叔"]) {
    const clients: Socket[] = [];
    for (let i = 0; i < 3; i++) { const socket = io(url, { transports: ["websocket"], reconnection: false });
      sockets.push(socket); clients.push(socket); await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); }); }
    const room = await emit(clients[0]!, "room:create", { playerName: `${name}测试` }), roomId = room.roomId, ids = [room.playerId];
    for (let i = 1; i < 3; i++) ids.push((await emit(clients[i]!, "room:join", { roomId, playerName: `对手${i}` })).playerId);
    await emit(clients[0]!, "room:update_settings", { roomId, config: { skillMode: "test_select", skillCount: 5, firstTurnNoAttack: false, turnTimeLimitSeconds: 180 } });
    const names = name === "沙皇" ? ["沙子", "沙子"] : name === "天魔舞" ? ["镜像法术", "乱舞"] : ["撸", "日"];
    await emit(clients[0]!, "room:update_player_skills", { roomId, targetPlayerId: ids[0], skillIds: names.map(skill) });
    if (name === "天魔舞") await emit(clients[1]!, "room:update_player_skills", { roomId, targetPlayerId: ids[1], skillIds: ["神罩", "鬼罩", "八卦阵"].map(skill) });
    let state = (await emit(clients[0]!, "game:start", { roomId })).state as PublicGameState;
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript(({ roomId, playerId }) => { localStorage.setItem("bing.roomIdentity.v1", JSON.stringify({ roomId, playerId }));
      localStorage.setItem("bing.tutorial.skipped.v1", "true"); }, { roomId, playerId: ids[0] });
    page = await context.newPage(); page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url, { waitUntil: "networkidle" });
    const controls = page.getByTestId("fusion-controls"); await controls.locator("summary").click();
    const panel = page.getByRole("region", { name: "融合与分解" });
    await panel.locator("select").selectOption(skill(name));
    await panel.getByRole("button", { name: "免费融合", exact: true }).click();
    const select = page.getByTestId("window-skill-select"); await select.waitFor();
    async function fresh(i = 0): Promise<PublicGameState> { return (await emit(clients[i]!, "room:resume", { roomId, playerId: ids[i] })).state; }
    async function advance(toEnd = false) {
      state = await fresh();
      for (let guard = 0; state.phase === "action_window" && !(toEnd && state.activeTimingPhase === "turn_end_action") && guard < 50; guard++) {
        for (let i = 0; i < 3; i++) { state = await fresh(i);
          if (state.phase !== "action_window" || toEnd && state.activeTimingPhase === "turn_end_action") return;
          if (!state.actionWindowPassPlayerIds.includes(ids[i])) state = (await emit(clients[i]!, "game:pass_action_window", { roomId })).state;
        }
      }
    }
    async function use(name: string, target: string, label: string) {
      await select.selectOption(skill(name));
      await page!.locator("label").filter({ hasText: label }).locator("select").selectOption(skill(target));
      await page!.getByRole("button", { name: "使用技能", exact: true }).click();
      await page!.waitForTimeout(100); state = await fresh();
    }
    if (name === "沙皇") {
      await use("沙皇", "幻境双罩", "强化沙子：选择二融合");
      assert.ok(state.players[0]!.skillFusions?.some((f) => f.skillId === skill("幻境双罩")));
      await page.setViewportSize({ width: 390, height: 844 });
      await use("沙子", "八卦阵", "普通沙子：选择小技能"); assert.ok(state.players[0]!.skills.includes(skill("八卦阵")));
    } else if (name === "猥琐小叔叔") {
      await select.selectOption(skill(name));
      const choices = page.locator("label").filter({ hasText: "选择额外技能" }).locator("select");
      assert.equal(await choices.locator("option").count(), 2);
      await page.setViewportSize({ width: 390, height: 844 }); await use(name, "丁", "选择额外技能");
      assert.ok(state.players[0]!.skills.includes(skill("丁")));
    } else {
      await emit(clients[1]!, "game:submit_action", { roomId, action: { type: "skill", skillId: "common_fusion", stacks: 1,
        targetSkillId: skill("幻境双罩"), fusionRequestId: `browser_mirror_${stamp}` } });
      await advance();
      for (let i = 0; i < 3; i++) await emit(clients[i]!, "game:submit_action", { roomId, action: { type: "gain_cake" } });
      await advance(true);
      for (const target of ["幻境双罩", "八卦阵"]) await emit(clients[0]!, "game:guess_skill", { roomId, targetPlayerId: ids[1], targetSkillId: skill(target) });
      await emit(clients[0]!, "game:enter_action_window", { roomId });
      await use("天魔舞", "幻境双罩", "已暴露技能");
      await page.setViewportSize({ width: 390, height: 844 }); await use("镜像法术", "八卦阵", "已暴露技能");
      assert.ok(state.players[0]!.skills.includes(skill("八卦阵")));
      assert.equal(state.players[0]!.buffs.find((b) => b.id === `skill_used:${skill("镜像法术")}`)?.stacks, 1);
    }
    await page.getByTestId("toggle-action-dock").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `${name}-mobile.png`) });
    await page.setViewportSize({ width: 1280, height: 900 }); await page.screenshot({ path: path.join(output, `${name}-desktop.png`) });
    if (name !== "天魔舞") {
      await advance();
      for (let i = 0; i < 3; i++) await emit(clients[i]!, "game:submit_action", { roomId, action: { type: "gain_cake" } });
      await advance(true);
    }
    await emit(clients[0]!, "game:enter_action_window", { roomId });
    if (!(await controls.evaluate((element) => (element as HTMLDetailsElement).open))) await controls.locator("summary").click();
    await page.getByRole("button", { name: `分解${name}`, exact: true }).click();
    state = await fresh(); assert.ok(!state.players[0]!.skillFusions?.some((f) => f.skillId === skill(name)));
    if (name === "猥琐小叔叔") assert.ok(!state.players[0]!.skills.includes(skill("丁")));
    else assert.ok(state.players[0]!.skillFusions?.some((f) => f.skillId === skill("幻境双罩")));
    await page.screenshot({ path: path.join(output, `${name}-decomposed.png`) });
    await context.close(); console.log(`ok - browser acquisition ${name}`);
  }
  assert.deepEqual(errors, []); fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({ passed: true, errors, output }, null, 2));
  console.log(`final three browser checks passed: ${output}`);
} catch (error) { await page?.screenshot({ path: path.join(output, "failure.png") }).catch(() => {}); throw error; }
finally { sockets.forEach((s) => s.disconnect()); await browser.close(); server.kill(); fs.closeSync(log); }
