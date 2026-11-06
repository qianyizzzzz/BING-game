import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, Page } from "playwright";
import { io, Socket } from "socket.io-client";
import { FUSION_RECIPES, getAllSkills, getFusionRecipe, isFusionImplemented, PublicGameState } from "@bing/shared";

const port = Number(process.env.FUSION_TEST_PORT ?? 3108);
const url = `http://127.0.0.1:${port}`;
const output = path.resolve("artifacts/playtests", `fusion-${Date.now()}`);
const data = path.resolve("data-test", `fusion-${Date.now()}`);
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(data, { recursive: true });
const serverLog = fs.openSync(path.join(output, "server.log"), "a");
const server = spawn(process.execPath, ["--import", "tsx", "apps/server/src/index.ts"], {
  cwd: process.cwd(), windowsHide: true, stdio: ["ignore", serverLog, serverLog],
  env: { ...process.env, PORT: String(port), CLIENT_ORIGIN: url, PUBLIC_ORIGINS: url,
    ACCOUNT_DATA_FILE: path.join(data, "accounts.json"), MATCH_DATA_DIR: data }
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let activePage: Page | undefined;
let diagnosticState: () => unknown = () => ({});
const sockets: Socket[] = [];
const errors: string[] = [];
const skillId = (name: string) => getAllSkills().find((skill) => skill.name === name)!.id;
function fusionSetup(id: string): { skills: string[]; prerequisites: string[] } {
  const recipe = getFusionRecipe(id);
  if (!recipe) return { skills: [id], prerequisites: [] };
  const children = recipe.materialOptions[0]!.map(fusionSetup);
  return {
    skills: children.flatMap((child) => child.skills),
    prerequisites: [...children.flatMap((child) => child.prerequisites), id]
  };
}
async function emit(socket: Socket, event: string, payload: unknown): Promise<any> {
  const response = await socket.timeout(10_000).emitWithAck(event, payload);
  assert.equal(response.ok, true, `${event}: ${response.error}`);
  return response.data;
}
async function connect(): Promise<Socket> {
  const socket = io(url, { transports: ["websocket"], reconnection: false });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  return socket;
}
async function waitHealth(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${url}/health`)).ok) return; } catch { }
    if (server.exitCode !== null) throw new Error(`Test server exited: ${server.exitCode}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Test server did not become ready");
}

try {
  await waitHealth();
  const a = await connect();
  const b = await connect();
  const created = await emit(a, "room:create", { playerName: "融合测试甲" });
  const roomId = created.roomId;
  const aId = created.playerId;
  const joined = await emit(b, "room:join", { roomId, playerName: "融合测试乙" });
  const bId = joined.playerId;
  await emit(a, "room:update_settings", { roomId, config: { skillMode: "test_select", skillCount: 2, turnTimeLimitSeconds: 180 } });
  await emit(a, "room:update_player_skills", { roomId, targetPlayerId: aId, skillIds: [skillId("神罩"), skillId("鬼罩")] });
  let stateA: PublicGameState = created.state;
  let stateB: PublicGameState = joined.state;
  diagnosticState = () => ({ a: { phase: stateA.phase, timing: stateA.activeTimingPhase, turn: stateA.turnNumber,
    players: stateA.players.map(({ id, skills, skillFusions }) => ({ id, skills, skillFusions })) },
    b: { phase: stateB.phase, timing: stateB.activeTimingPhase, turn: stateB.turnNumber } });
  a.on("room:state", (state) => { stateA = state; });
  b.on("room:state", (state) => { stateB = state; });

  const installedBrowser = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
  ].find((candidate) => fs.existsSync(candidate));
  browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"],
    ...(installedBrowser ? { executablePath: installedBrowser } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(({ roomId, playerId }) => {
    localStorage.setItem("bing.roomIdentity.v1", JSON.stringify({ roomId, playerId }));
    localStorage.setItem("bing.tutorial.skipped.v1", "true");
  }, { roomId, playerId: aId });
  const page = await context.newPage();
  activePage = page;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByText("房间准备 · 等待开始", { exact: true }).waitFor();
  await emit(a, "game:start", { roomId });
  const fusionControls = page.getByTestId("fusion-controls");
  await fusionControls.locator("summary").click();
  const fusionPanel = page.getByRole("region", { name: "融合与分解" });
  await fusionPanel.getByRole("button", { name: "免费融合", exact: true }).waitFor();
  await fusionPanel.getByRole("button", { name: "免费融合", exact: true }).click();
  await fusionPanel.getByRole("button", { name: "分解幻境双罩", exact: true }).waitFor();
  await page.waitForTimeout(200);
  assert.equal(stateA.players.find((player) => player.id === aId)?.cakes, 0);
  assert.equal(stateA.players.find((player) => player.id === aId)?.skillFusions?.length, 1);
  assert.equal(stateB.players.find((player) => player.id === aId)?.skillFusions, undefined);
  assert.equal(await fusionPanel.getByRole("button", { name: "分解幻境双罩", exact: true }).isDisabled(), true);
  assert.ok(!JSON.stringify(stateB).includes("幻境双罩"), "other player must not see the unexposed fusion");
  await fusionPanel.screenshot({ path: path.join(output, "fusion-desktop.png") });
  await fusionControls.locator("summary").click();

  await emit(b, "game:skip_to_next_action", { roomId });
  await page.getByTestId("skip-to-next-action").click();
  await page.getByTestId("submit-action").waitFor();
  await page.getByTestId("submit-action").click();
  const afterB = await emit(b, "game:submit_action", { roomId, action: { type: "gain_cake" } });
  stateB = afterB.state;
  for (let guard = 0; guard < 12 && stateB.activeTimingPhase !== "turn_end_action"; guard++) {
    assert.equal(stateB.phase, "action_window");
    await emit(a, "game:pass_action_window", { roomId });
    stateB = (await emit(b, "game:pass_action_window", { roomId })).state;
  }
  assert.equal(stateB.activeTimingPhase, "turn_end_action");
  const turnBefore = stateB.turnNumber;
  await page.getByTestId("enter-action-window").click();
  const guessSelect = page.locator("label").filter({ hasText: "技能（含融合）" }).locator("select");
  await guessSelect.waitFor();
  const guessOptions = await guessSelect.locator("option").allTextContents();
  assert.ok(guessOptions.some((text) => text.includes("幻境双罩")));
  await page.setViewportSize({ width: 390, height: 844 });
  if (!(await fusionControls.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await fusionControls.locator("summary").click();
  }
  await fusionPanel.scrollIntoViewIfNeeded();
  const box = await fusionPanel.boundingBox();
  assert.ok(box && box.x >= -1 && box.x + box.width <= 391, "fusion controls fit a 390px viewport");
  await fusionPanel.screenshot({ path: path.join(output, "fusion-mobile.png") });
  await fusionPanel.getByRole("button", { name: "分解幻境双罩", exact: true }).click();
  await fusionPanel.getByRole("button", { name: "融合并提交出招（2饼）", exact: true }).waitFor();
  await page.waitForTimeout(200);
  assert.equal(stateA.players.find((player) => player.id === aId)?.skillFusions?.length, 0);
  assert.equal(stateA.turnNumber, turnBefore, "decomposition does not consume or advance a turn");

  async function reachCollecting() {
    for (let guard = 0; guard < 12 && stateB.phase !== "collecting_actions"; guard++) {
      assert.equal(stateB.phase, "action_window");
      await emit(a, "game:pass_action_window", { roomId });
      stateB = (await emit(b, "game:pass_action_window", { roomId })).state;
    }
    assert.equal(stateB.phase, "collecting_actions");
  }
  await reachCollecting();
  await emit(a, "game:submit_action", { roomId, action: { type: "gain_cake" } });
  stateB = (await emit(b, "game:submit_action", { roomId, action: { type: "gain_cake" } })).state;
  await reachCollecting();
  await page.waitForFunction((turn) => document.querySelector('[data-testid="action-board"]')?.getAttribute("data-round-turn-number") === String(turn), stateB.roundTurnNumber);
  if (!(await fusionControls.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await fusionControls.locator("summary").click();
  }
  const paidFusion = fusionPanel.getByRole("button", { name: "融合并提交出招（2饼）", exact: true });
  await paidFusion.click();
  await page.waitForTimeout(200);
  assert.ok(stateA.pendingActionPlayerIds.includes(aId), "paid fusion is a submitted turn action");
  assert.equal(stateA.players.find((player) => player.id === aId)?.cakes, 2, "fusion cost waits for settlement");
  assert.equal(stateA.players.find((player) => player.id === aId)?.skillFusions?.length, 0);
  await emit(b, "game:submit_action", { roomId, action: { type: "gain_cake" } });
  await page.waitForTimeout(200);
  assert.equal(stateA.players.find((player) => player.id === aId)?.cakes, 0);
  assert.equal(stateA.players.find((player) => player.id === aId)?.skillFusions?.length, 1);
  assert.equal(stateB.players.find((player) => player.id === aId)?.skillFusions, undefined);

  for (const route of [`/api/matches/${roomId}`, `/api/matches/${roomId}/training-samples`, `/replay/${roomId}`, `/replay/${roomId}.txt`]) {
    const response = await fetch(url + route);
    assert.equal(response.status, 409, `unfinished game must not leak through ${route}`);
    assert.ok(!(await response.text()).includes("幻境双罩"));
  }

  const allEffectBatch = FUSION_RECIPES.filter(({ skill }) => isFusionImplemented(skill.id)).map(({ skill }) => skill.name);
  const requestedRecipes = process.env.FUSION_TEST_RECIPES?.split(",").map((name) => name.trim()).filter(Boolean);
  if (requestedRecipes) for (const name of requestedRecipes) assert.ok(allEffectBatch.includes(name), `Recipe unavailable: ${name}`);
  const effectBatch = requestedRecipes ? allEffectBatch.filter((name) => requestedRecipes.includes(name)) : allEffectBatch;
  for (const name of effectBatch) {
    const recipe = FUSION_RECIPES.find((item) => item.skill.name === name)!;
    const { skills, prerequisites } = fusionSetup(recipe.skill.id);
    const c = await connect();
    const d = await connect();
    const room = await emit(c, "room:create", { playerName: "新融合测试" });
    const opponent = await emit(d, "room:join", { roomId: room.roomId, playerName: "对手" });
    let extraPlayer: Socket | undefined;
    let extraPlayerId: string | undefined;
    if (name === "电闪雷鸣" || name === "冰火狂暴曲") {
      extraPlayer = await connect();
      extraPlayerId = (await emit(extraPlayer, "room:join", { roomId: room.roomId, playerName: "第二名攻击者" })).playerId;
    }
    if (name === "黑白板") for (const playerName of ["第三人", "第四人"]) {
      await emit(await connect(), "room:join", { roomId: room.roomId, playerName });
    }
    await emit(c, "room:update_settings", { roomId: room.roomId,
      config: { skillMode: "test_select", skillCount: skills.length + Number(["杀级换", "根源之目"].includes(name)), turnTimeLimitSeconds: 180, firstTurnNoAttack: false } });
    await emit(c, "room:update_player_skills", { roomId: room.roomId,
      targetPlayerId: room.playerId, skillIds: name === "杀级换" ? [...skills, skillId("毁灭之力")] :
        name === "根源之目" ? [...skills, skillId("钟")] : skills });
    if (name === "弹力球" || name === "根源之目") {
      await emit(d, "room:update_player_skills", { roomId: room.roomId, targetPlayerId: opponent.playerId,
        skillIds: name === "弹力球" ? [skillId("火眼金睛"), skillId("钟")] :
          FUSION_RECIPES.find((item) => item.skill.name === "弹力球")!.materialOptions[0] });
    }
    if (name === "灵魂修复") {
      await emit(d, "room:update_player_skills", { roomId: room.roomId,
        targetPlayerId: opponent.playerId, skillIds: [skillId("血之哀")] });
    }
    if (name === "辉月") {
      await emit(d, "room:update_player_skills", { roomId: room.roomId,
        targetPlayerId: opponent.playerId, skillIds: [skillId("青釭剑")] });
    }
    if (name === "空城计") {
      await emit(d, "room:update_player_skills", { roomId: room.roomId,
        targetPlayerId: opponent.playerId, skillIds: [skillId("卷子"), skillId("电击法术")] });
    }
    if (name === "自然之灵" || name === "纯净苍穹") {
      await emit(d, "room:update_player_skills", { roomId: room.roomId,
        targetPlayerId: opponent.playerId, skillIds: [skillId(name === "自然之灵" ? "火烧大地" : "冰漩决")] });
    }
    let latest: PublicGameState = room.state;
    c.on("room:state", (state) => { latest = state; });
    const batchContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await batchContext.addInitScript(({ roomId, playerId }) => {
      localStorage.setItem("bing.roomIdentity.v1", JSON.stringify({ roomId, playerId }));
      localStorage.setItem("bing.tutorial.skipped.v1", "true");
    }, { roomId: room.roomId, playerId: room.playerId });
    const batchPage = await batchContext.newPage();
    activePage = batchPage;
    diagnosticState = () => ({ name, latest });
    batchPage.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
    await batchPage.goto(url, { waitUntil: "domcontentloaded" });
    await batchPage.getByText("房间准备 · 等待开始", { exact: true }).waitFor();
    await emit(c, "game:start", { roomId: room.roomId });
    await batchPage.getByTestId("fusion-controls").locator("summary").click();
    const panel = batchPage.getByRole("region", { name: "融合与分解" });
    const recipeSelect = panel.getByRole("combobox", { name: "可配出的融合技能" });
    for (const prerequisite of prerequisites.slice(0, -1)) {
      await recipeSelect.selectOption(prerequisite);
      await panel.getByRole("button", { name: "免费融合", exact: true }).click();
      await panel.getByRole("button", { name: `分解${getFusionRecipe(prerequisite)!.skill.name}`, exact: true }).waitFor();
    }
    await panel.getByRole("option", { name, exact: true }).waitFor({ state: "attached" });
    await recipeSelect.selectOption(recipe.skill.id);
    if (name === "大雪球") {
      await batchPage.setViewportSize({ width: 390, height: 844 });
      assert.equal(await panel.getByRole("combobox", { name: "素材 1" }).count(), 1);
      assert.equal(await panel.getByRole("combobox", { name: "素材 2" }).count(), 1);
    }
    if (name === "枯萎") {
      const input = panel.getByTestId("wither-number-0");
      await input.fill("0");
      assert.equal(await panel.getByRole("button", { name: "保存第1份枯萎选数", exact: true }).isDisabled(), true);
      assert.equal(await panel.getByRole("button", { name: "免费融合", exact: true }).isDisabled(), true);
      await input.fill("2");
      assert.equal(await panel.getByRole("button", { name: "免费融合", exact: true }).isDisabled(), true);
      await panel.getByRole("button", { name: "保存第1份枯萎选数", exact: true }).click();
      await panel.getByText("已保存：2", { exact: true }).waitFor();
      const other = (await emit(d, "room:resume", { roomId: room.roomId, playerId: opponent.playerId })).state;
      assert.equal(other.players[0].witherSelections, undefined);
      assert.ok(!JSON.stringify(other).includes("开局选数"));
      await panel.screenshot({ path: path.join(output, "fusion-wither-choice-desktop.png") });
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await panel.screenshot({ path: path.join(output, "fusion-wither-choice-mobile.png") });
    }
    if (name === "贤者之书") {
      await panel.getByText("保留文明人与卷子；文明人因聊天触发的+2血效果待定，当前不生效。卷子保持原有规则。", { exact: true }).waitFor();
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await panel.screenshot({ path: path.join(output, "fusion-sage-book-pending-mobile.png") });
      await batchPage.setViewportSize({ width: 1280, height: 900 });
    }
    await panel.getByRole("button", { name: "免费融合", exact: true }).click();
    await panel.getByRole("button", { name: `分解${name}`, exact: true }).waitFor();
    if (name === "枯萎") {
      await panel.screenshot({ path: path.join(output, "fusion-wither-fused-mobile.png") });
      await batchPage.setViewportSize({ width: 1280, height: 900 });
    }
    assert.ok(latest.players.find((player) => player.id === room.playerId)?.skillFusions?.some((fusion) => fusion.skillId === recipe.skill.id));
    await panel.getByText(`已收录 ${FUSION_RECIPES.length} 条配方，已开放 ${allEffectBatch.length} 条。`, { exact: true }).waitFor();
    async function advanceRoom(snapshot: PublicGameState, stopAtEnd = false): Promise<PublicGameState> {
      for (let guard = 0; snapshot.phase === "action_window" && !(stopAtEnd && snapshot.activeTimingPhase === "turn_end_action") && guard < 30; guard++) {
        await emit(c, "game:pass_action_window", { roomId: room.roomId });
        snapshot = (await emit(d, "game:pass_action_window", { roomId: room.roomId })).state;
        if (extraPlayer) snapshot = (await emit(extraPlayer, "game:pass_action_window", { roomId: room.roomId })).state;
      }
      if (!stopAtEnd) {
        assert.equal(snapshot.phase, "collecting_actions");
        await batchPage.waitForFunction((turn) => document.querySelector('[data-testid="action-board"]')?.getAttribute("data-round-turn-number") === String(turn), snapshot.roundTurnNumber);
      }
      return snapshot;
    }
    async function collectCakes(turns: number) {
      await batchPage.getByTestId("fusion-controls").locator("summary").click();
      await emit(c, "game:skip_to_next_action", { roomId: room.roomId });
      let snapshot = (await emit(d, "game:skip_to_next_action", { roomId: room.roomId })).state;
      if (extraPlayer) snapshot = (await emit(extraPlayer, "game:skip_to_next_action", { roomId: room.roomId })).state;
      await advanceRoom(snapshot);
      for (let turn = 0; turn < turns; turn++) {
        await batchPage.getByTestId("submit-action").click();
        snapshot = (await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state;
        if (extraPlayer) snapshot = (await emit(extraPlayer, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state;
        await advanceRoom(snapshot);
      }
    }
    async function waitForRoom(check: () => boolean) {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (check()) return;
        await batchPage.waitForTimeout(50);
      }
      assert.ok(check(), "expected room state after browser action");
    }
    if (name === "弹力球" || name === "根源之目") {
      if (name === "根源之目") {
        const result = await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "skill", skillId: "common_fusion",
          targetSkillId: FUSION_RECIPES.find((item) => item.skill.name === "弹力球")!.skill.id,
          stacks: 1, fusionRequestId: `browser-ball-${Date.now()}` } });
        assert.equal(result.state.players.find((player: any) => player.id === opponent.playerId).skillFusions[0].skillId,
          FUSION_RECIPES.find((item) => item.skill.name === "弹力球")!.skill.id);
      }
      await collectCakes(1);
      if (name === "弹力球") {
        await batchPage.getByTestId("action-mode-defense").click();
        await batchPage.getByTestId("defense-select").selectOption("rebound");
        await batchPage.getByTestId("submit-action").click();
        latest = (await emit(d, "game:submit_action", { roomId: room.roomId,
          action: { type: "skill", skillId: skillId("钟"), stacks: 1, targetId: room.playerId } })).state;
      } else {
        await batchPage.getByTestId("action-mode-attack").click();
        await batchPage.getByTestId("attack-row-kind-0").selectOption(`skill:${skillId("钟")}`);
        await batchPage.getByTestId("submit-action").click();
        latest = (await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "defense", defense: "rebound" } })).state;
      }
      latest = await advanceRoom(latest, true);
      assert.ok(!latest.eventLog.some((event) => event.type === "attack_reflected"));
      if (name === "弹力球") {
        assert.deepEqual(latest.players.map((player) => player.hp), [6, 6]);
        assert.ok(latest.eventLog.some((event) => event.type === "attack_blocked" && event.targetId === room.playerId));
        assert.ok(!latest.players[1]!.buffs.some((buff) => buff.id === "jin_zhong_zhao"));
      } else {
        assert.equal(latest.players[1]!.hp, 5);
        assert.ok(latest.eventLog.some((event) => event.type === "rebound_broken" && event.targetId === opponent.playerId));
      }
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.screenshot({ path: path.join(output, `fusion-${name === "弹力球" ? "elastic-block" : "origin-pierce"}-desktop.png`) });
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.locator("section.action-board").scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, `fusion-${name === "弹力球" ? "elastic-block" : "origin-pierce"}-mobile.png`) });
    }
    if (name === "空城计") {
      await batchPage.getByTestId("fusion-controls").locator("summary").click();
      latest = await advanceRoom(latest);
      await batchPage.getByTestId("submit-action").click();
      latest = (await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "skill", skillId: skillId("卷子"), stacks: 1, targetId: room.playerId } })).state;
      latest = await advanceRoom(latest, true);
      assert.equal(latest.players[0]!.status, "alive");
      assert.equal(latest.players[0]!.hp, 6);
      assert.ok(latest.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "空城计"));
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.screenshot({ path: path.join(output, "fusion-empty-fortress-retirement-desktop.png") });
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.locator("section.action-board").scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, "fusion-empty-fortress-retirement-mobile.png") });
      latest = await advanceRoom(latest);
      assert.equal(latest.roundTurnNumber, 2);
      await batchPage.getByTestId("submit-action").click();
      latest = (await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "skill", skillId: skillId("电击法术"), stacks: 1, targetIds: [room.playerId] } })).state;
      latest = await advanceRoom(latest, true);
      assert.ok(latest.players[0]!.buffs.some((buff) => buff.id.startsWith("paralysis_next_action:")));
    }
    if (name === "冰火狂暴曲") {
      await batchPage.getByTestId("fusion-controls").locator("summary").click();
      latest = await advanceRoom(latest);
      for (const defense of ["small", "youtiao", "stone"]) {
        await emit(c, "game:submit_action", { roomId: room.roomId, action: { type: "defense", defense } });
        await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
        latest = (await emit(extraPlayer!, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state;
        latest = await advanceRoom(latest);
      }
      assert.equal(latest.players[0]!.buffs.find((buff) => buff.id === "ice_fire_mark")?.stacks, 1);
      for (let turn = 0; turn < 2; turn++) {
        await emit(c, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
        await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
        latest = (await emit(extraPlayer!, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state;
        latest = await advanceRoom(latest);
      }
      await emit(c, "game:submit_action", { roomId: room.roomId, action: { actions: [
        { type: "attack", attackId: "sha", stacks: 1, targetId: opponent.playerId },
        { type: "attack", attackId: "sha", stacks: 1, targetId: extraPlayerId }
      ] } });
      await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
      latest = (await emit(extraPlayer!, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state;
      await emit(c, "game:enter_action_window", { roomId: room.roomId });
      await batchPage.getByTestId("window-skill-select").selectOption(recipe.skill.id);
      const attackChoice = batchPage.getByTestId("mark-attack-select");
      assert.equal(await attackChoice.locator("option").count(), 2);
      await attackChoice.selectOption("1");
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await attackChoice.scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, "fusion-ice-fire-attack-choice-desktop.png") });
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await attackChoice.scrollIntoViewIfNeeded();
      const selectBox = await attackChoice.boundingBox();
      assert.ok(selectBox && selectBox.x >= 0 && selectBox.x + selectBox.width <= 391);
      await batchPage.screenshot({ path: path.join(output, "fusion-ice-fire-attack-choice-mobile.png") });
      await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
      await waitForRoom(() => latest.revealedAttackStats?.[room.playerId]?.[1]?.power === 2);
      assert.equal(latest.revealedAttackStats?.[room.playerId]?.[0]?.power, 1);
      latest = await advanceRoom(latest, true);
      assert.equal(latest.players[1]!.hp, 5);
      assert.equal(latest.players[2]!.hp, 4);
      assert.ok(!latest.players[1]!.buffs.some((buff) => buff.id === "frozen"));
      assert.equal(latest.players[2]!.buffs.find((buff) => buff.id === "frozen")?.stacks, 1);
    }
    if (name === "杀级换") {
      await collectCakes(3);
      await batchPage.getByTestId("action-mode-attack").click();
      await batchPage.getByTestId("submit-action").click();
      await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
      await emit(c, "game:enter_action_window", { roomId: room.roomId });
      for (const attackId of ["qin", "sha"]) {
        await batchPage.getByTestId("window-skill-select").selectOption(skillId("杀换"));
        await batchPage.locator(".stat-chip").filter({ hasText: "消耗" }).getByText("无耗饼", { exact: true }).waitFor();
        await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
        await waitForRoom(() => {
          const action = latest.revealedActions?.[room.playerId]?.actions[0];
          return action?.type === "attack" && action.attackId === attackId;
        });
        assert.equal(latest.players[0]!.cakes, 2);
      }
      await batchPage.getByTestId("window-skill-select").selectOption(skillId("毁灭之力"));
      await batchPage.getByTestId("attack-stat-modifier-select").selectOption("0:power_to_zero_level_times_4");
      await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
      await waitForRoom(() => latest.revealedAttackStats?.[room.playerId]?.[0]?.level === 4);
      await batchPage.getByTestId("window-skill-select").selectOption(skillId("级换"));
      assert.equal(await batchPage.getByTestId("attack-stat-modifier-select").locator("option").count(), 5);
      await batchPage.getByTestId("attack-stat-modifier-select").selectOption("0:rotate_cost_power_level");
      await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
      await waitForRoom(() => latest.revealedAttackStats?.[room.playerId]?.[0]?.cost === 0);
      assert.deepEqual(latest.revealedAttackStats?.[room.playerId]?.[0], { cost: 0, power: 4, level: 1 });
      assert.equal(latest.players[0]!.cakes, 2, "refund waits for the hit point");
      const end = await advanceRoom(latest, true);
      assert.equal(end.players[0]!.cakes, 3);
      assert.equal(end.players[1]!.hp, 2);
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.screenshot({ path: path.join(output, "fusion-sha-level-refund-desktop.png") });
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.locator("section.action-board").scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, "fusion-sha-level-refund-mobile.png") });
    }
    if (name === "野蛮人") {
      await collectCakes(1);
      for (let count = 1; count <= 2; count++) {
        await batchPage.getByTestId("submit-action").click();
        await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
        await emit(c, "game:enter_action_window", { roomId: room.roomId });
        await batchPage.getByTestId("window-skill-select").selectOption(skillId("逆转"));
        await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
        await waitForRoom(() => latest.players[0]!.buffs.some((buff) => buff.id === `skill_used:${skillId("逆转")}` && buff.stacks === count));
        await advanceRoom(latest);
      }
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.screenshot({ path: path.join(output, "fusion-barbarian-two-reversals.png") });
    }
    if (name === "贤者的庇护") {
      await collectCakes(7);
      await batchPage.getByTestId("submit-action").click();
      let snapshot = (await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "attack", attackId: "sha", stacks: 7, targetId: room.playerId } })).state;
      for (let guard = 0; snapshot.phase === "action_window" && snapshot.activeTimingPhase !== "revival_action" && guard < 20; guard++) {
        await emit(c, "game:pass_action_window", { roomId: room.roomId });
        snapshot = (await emit(d, "game:pass_action_window", { roomId: room.roomId })).state;
      }
      assert.equal(snapshot.activeTimingPhase, "revival_action");
      assert.equal(snapshot.players[0]!.hp, -1);
      await emit(c, "game:enter_action_window", { roomId: room.roomId });
      await batchPage.getByTestId("window-skill-select").selectOption(recipe.skill.id);
      await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
      await waitForRoom(() => latest.players[0]!.hp === 2);
      assert.ok(!latest.players[0]!.buffs.some((buff) => buff.id === "pending_death"));
      assert.ok(latest.eventLog.some((event) => event.type === "heal" && event.reason === name && event.recoveryKind === "revival"));
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.screenshot({ path: path.join(output, "fusion-sage-revival-desktop.png") });
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.getByTestId("action-board").scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, "fusion-sage-revival-mobile.png") });
    }
    if (name === "自然之灵") {
      await collectCakes(5);
      await batchPage.getByTestId("submit-action").click();
      const end = await advanceRoom((await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "attack", attackId: "huo_wu", stacks: 1, targetId: room.playerId } })).state, true);
      assert.equal(end.players[0]!.hp, 6);
      assert.ok(end.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "自然之灵"));
      const spell = (await emit(d, "game:submit_window_skill", { roomId: room.roomId,
        action: { type: "skill", skillId: skillId("火烧大地"), stacks: 1 } })).state;
      assert.equal(spell.players[0]!.hp, 6);
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.screenshot({ path: path.join(output, "fusion-nature-fire-immunity-desktop.png") });
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.getByTestId("action-board").scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, "fusion-nature-fire-immunity-mobile.png") });
    }
    if (name === "纯净苍穹") {
      await collectCakes(3);
      await batchPage.getByTestId("action-mode-defense").click();
      await batchPage.getByTestId("defense-select").selectOption("small");
      await batchPage.getByTestId("submit-action").click();
      await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "skill", skillId: skillId("冰漩决"), stacks: 1, targetIds: [room.playerId] } });
      // Hold the five-second prompt before waiting for the reveal animation and UI controls.
      await emit(c, "game:enter_action_window", { roomId: room.roomId });
      await batchPage.getByTestId("window-skill-select").selectOption(skillId("幻防"));
      await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
      await batchPage.locator(".poker-seat-viewer").getByText("免疫不良", { exact: true }).waitFor();
      assert.equal(latest.players[0]!.cakes, 1);
      const end = await advanceRoom(latest, true);
      assert.equal(end.players[0]!.hp, 5);
      assert.ok(!end.players[0]!.buffs.some((buff) => buff.id === "frozen"));
      assert.ok(end.players[0]!.buffs.some((buff) => buff.id === "temp_negative_status_immunity"));
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.screenshot({ path: path.join(output, "fusion-pure-sky-immunity-desktop.png") });
      const next = await advanceRoom(end);
      assert.ok(!next.players[0]!.buffs.some((buff) => buff.id === "temp_negative_status_immunity"));
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.getByTestId("submit-action").scrollIntoViewIfNeeded();
      assert.equal(await batchPage.getByTestId("submit-action").isEnabled(), true);
      await batchPage.screenshot({ path: path.join(output, "fusion-pure-sky-next-turn-mobile.png") });
    }
    if (name === "辉月") {
      await collectCakes(2);
      await batchPage.getByTestId("action-mode-attack").click();
      await batchPage.getByTestId("submit-action").click();
      await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "attack", attackId: "sha", stacks: 1, targetId: room.playerId } });
      await emit(c, "game:enter_action_window", { roomId: room.roomId });
      await batchPage.getByTestId("window-skill-select").selectOption(recipe.skill.id);
      await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
      await batchPage.locator(".poker-seat-viewer .seat-feedback-bubble").filter({ hasText: /^出招已取消$/ }).waitFor();
      assert.equal(latest.players[0]!.cakes, 2);
      assert.deepEqual(latest.revealedActions?.[room.playerId]?.actions, []);
      const end = await advanceRoom(latest, true);
      assert.equal(end.players[0]!.hp, 6);
      assert.equal(end.players[1]!.hp, 6);
      assert.ok(end.eventLog.some((event) => event.type === "attack_blocked" && event.protectionName === "辉月"));
      await batchPage.screenshot({ path: path.join(output, "fusion-moon-cancel-refund.png") });
      const skipped = await advanceRoom(end);
      assert.equal(skipped.pendingActionPlayerIds.includes(room.playerId), true);
      assert.equal(skipped.players[0]!.cakes, 2);
      assert.equal(await batchPage.getByTestId("submit-action").isDisabled(), true);
      await batchPage.getByText("辉月：自动空过，无需提交", { exact: true }).waitFor();
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.getByTestId("submit-action").scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, "fusion-moon-skip-mobile.png") });
      const rejected = await c.timeout(10_000).emitWithAck("game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
      assert.equal(rejected.ok, false);
      assert.ok(rejected.error.includes("辉月"));
      const secondEnd = await advanceRoom((await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "attack", attackId: "sha", stacks: 1, targetId: room.playerId } })).state, true);
      assert.equal(secondEnd.players[0]!.hp, 6);
      const ready = await advanceRoom(secondEnd);
      assert.equal(ready.pendingActionPlayerIds.includes(room.playerId), false);
      assert.equal(await batchPage.getByTestId("submit-action").isEnabled(), true);
      await batchPage.locator(".battle-stage-overlay").waitFor({ state: "hidden" });
      await batchPage.getByTestId("submit-action").scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, "fusion-moon-action-restored-mobile.png") });
    }
    if (name === "枯萎") {
      await collectCakes(2);
      const rejected = await c.timeout(10_000).emitWithAck("game:choose_wither_number", {
        roomId: room.roomId, selectionIndex: 0, value: 3
      });
      assert.equal(rejected.ok, false);
      assert.ok(rejected.error.includes("开局准备"));
      await batchPage.getByTestId("submit-action").click();
      const end = await advanceRoom((await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "attack", attackId: "sha", stacks: 2, targetId: room.playerId } })).state, true);
      assert.equal(end.players[0]!.hp, 6);
      assert.ok(end.eventLog.some((event) => event.type === "system" && event.message.includes("被衰竭抹除")));
      await batchPage.getByTestId("enter-action-window").click();
      await batchPage.getByTestId("fusion-controls").locator("summary").click();
      await panel.getByText("第1份选数：2（已锁定）", { exact: true }).waitFor();
      assert.equal(await panel.getByTestId("wither-number-0").count(), 0);
      await panel.screenshot({ path: path.join(output, "fusion-wither-locked.png") });
      await panel.getByRole("button", { name: "分解枯萎", exact: true }).click();
      await panel.getByRole("button", { name: "分解枯萎", exact: true }).waitFor({ state: "detached" });
      assert.equal(latest.players[0]!.witherSelections?.[0], 2);
      const opponentView = (await emit(d, "room:resume", { roomId: room.roomId, playerId: opponent.playerId })).state;
      assert.equal(opponentView.players[0].witherSelections, undefined);
    }
    if (name === "灵魂修复") {
      await collectCakes(1);
      await batchPage.getByTestId("submit-action").click();
      const end = await advanceRoom((await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "attack", attackId: "sha", stacks: 1, targetId: room.playerId } })).state, true);
      assert.equal(end.players[0]!.hp, 5);
      const next = await advanceRoom(end);
      assert.equal(next.roundNumber, 2);
      assert.equal(next.players[0]!.hp, 5);
      assert.equal(next.players[0]!.cakes, 1);
      assert.ok(!next.eventLog.some((event) => event.type === "heal" && event.reason === "灵魂修复"));
      await batchPage.getByTestId("submit-action").click();
      const continued = await advanceRoom((await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state);
      assert.equal(continued.roundNumber, 2);
      assert.equal(continued.players[0]!.hp, 5);
      await batchPage.getByTestId("submit-action").click();
      const secondEnd = await advanceRoom((await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "attack", attackId: "sha", stacks: 1, targetId: room.playerId } })).state, true);
      assert.equal(secondEnd.roundNumber, 2);
      assert.equal(secondEnd.players[0]!.hp, 4);
      const restored = await advanceRoom(secondEnd);
      assert.equal(restored.roundNumber, 3);
      assert.equal(restored.players[0]!.hp, 6);
      assert.ok(restored.eventLog.some((event) => event.type === "heal" && event.reason === "灵魂修复" &&
        event.recoveryKind === "full_restore" && event.roundNumber === 2));
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.getByTestId("submit-action").scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, "fusion-soul-repair-mobile.png") });
    }
    if (name === "电闪雷鸣") {
      assert.ok(extraPlayer && extraPlayerId);
      await collectCakes(2);
      await batchPage.getByTestId("submit-action").click();
      await emit(d, "game:submit_action", { roomId: room.roomId,
        action: { type: "attack", attackId: "sha", stacks: 1, targetId: room.playerId } });
      const end = await advanceRoom((await emit(extraPlayer, "game:submit_action", { roomId: room.roomId,
        action: { type: "attack", attackId: "sha", stacks: 2, targetId: room.playerId } })).state, true);
      assert.equal(end.players[0]!.hp, 5);
      assert.equal(end.players[0]!.buffs.find((buff) => buff.id === "guidao_charge")?.stacks, 1);
      await advanceRoom(end);
      await batchPage.getByTestId("action-mode-attack").click();
      await batchPage.getByTestId("attack-row-kind-0").selectOption(`skill:${skillId("鬼道")}`);
      assert.equal(await batchPage.getByTestId("submit-action").isEnabled(), true);
      await batchPage.screenshot({ path: path.join(output, "fusion-lightning-ghost-charge.png") });
      await batchPage.getByTestId("submit-action").click();
      await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
      const spent = await advanceRoom((await emit(extraPlayer, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state, true);
      assert.equal(spent.players[0]!.buffs.find((buff) => buff.id === "guidao_charge")?.stacks ?? 0, 0);
      assert.equal(spent.players[1]!.hp, 5);
    }
    if (name === "核战") {
      await collectCakes(0);
      await batchPage.getByTestId("action-mode-attack").click();
      await batchPage.getByTestId("attack-row-kind-0").selectOption("attack:he_bao");
      await batchPage.getByText("总消耗：0 饼", { exact: true }).waitFor();
      assert.equal(await batchPage.getByTestId("submit-action").isEnabled(), true);
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.getByTestId("submit-action").scrollIntoViewIfNeeded();
      await batchPage.screenshot({ path: path.join(output, "fusion-nuclear-mobile.png") });
      await batchPage.getByTestId("submit-action").click();
      const end = await advanceRoom((await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state, true);
      assert.equal(end.players[0]!.cakes, 0);
      assert.equal(end.players[1]!.hp, 0);
    }
    if (name === "虚幻") {
      await collectCakes(1);
      await batchPage.getByTestId("action-mode-defense").click();
      await batchPage.getByTestId("defense-select").selectOption("small");
      await batchPage.getByTestId("submit-action").click();
      await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } });
      await emit(c, "game:enter_action_window", { roomId: room.roomId });
      await batchPage.getByTestId("window-skill-select").selectOption(recipe.skill.id);
      await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
      await batchPage.waitForTimeout(150);
      assert.equal(latest.players[0]!.cakes, 0);
      assert.ok(latest.eventLog.some((event) => event.type === "action_switched" && event.skillId === recipe.skill.id &&
        event.after.type === "defense" && event.after.defense === "youtiao" && event.cost === 1));
      await batchPage.locator(".poker-seat-viewer .seat-feedback-bubble").filter({ hasText: /^油条$/ }).waitFor();
      await batchPage.screenshot({ path: path.join(output, "fusion-virtual-defense.png") });
    }
    if (name === "破天圣剑") {
      await collectCakes(1);
      await batchPage.getByTestId("action-mode-attack").click();
      await batchPage.getByTestId("submit-action").click();
      await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "defense", defense: "rebound", targetId: room.playerId } });
      await batchPage.getByTestId("enter-action-window").click();
      await batchPage.getByTestId("window-skill-select").selectOption(skillId("双刃剑"));
      await batchPage.getByLabel("双刃剑目标").selectOption("0:pierce");
      await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
      await batchPage.waitForTimeout(150);
      assert.equal(latest.players[0]!.hp, 4);
      const end = await advanceRoom(latest, true);
      assert.equal(end.players[0]!.hp, 4);
      assert.equal(end.players[1]!.hp, 5);
      await batchPage.screenshot({ path: path.join(output, "fusion-sword-pierce.png") });
    }
    if (name === "魔女斗篷") {
      await batchPage.getByTestId("fusion-controls").locator("summary").click();
      for (const material of ["暗影盾", "血水屏障"]) {
        await batchPage.getByTestId("window-skill-select").selectOption(skillId(material));
        await batchPage.getByRole("button", { name: "使用技能", exact: true }).click();
        await batchPage.waitForTimeout(200);
      }
      const self = latest.players.find((player) => player.id === room.playerId)!;
      assert.equal(self.buffs.find((buff) => buff.id === "defense_value")?.stacks, 16);
      assert.equal(self.hp, 5);
      await batchPage.screenshot({ path: path.join(output, "fusion-witch-effects.png") });
    }
    if (name === "斗战胜佛") {
      await batchPage.getByTestId("fusion-controls").locator("summary").click();
      await emit(c, "game:skip_to_next_action", { roomId: room.roomId });
      let otherState: PublicGameState = (await emit(d, "game:skip_to_next_action", { roomId: room.roomId })).state;
      async function advanceToAction() {
        for (let guard = 0; otherState.phase === "action_window" && guard < 15; guard++) {
          await emit(c, "game:pass_action_window", { roomId: room.roomId });
          otherState = (await emit(d, "game:pass_action_window", { roomId: room.roomId })).state;
        }
        assert.equal(otherState.phase, "collecting_actions");
        await batchPage.waitForFunction((turn) => document.querySelector('[data-testid="action-board"]')?.getAttribute("data-round-turn-number") === String(turn), otherState.roundTurnNumber);
      }
      await advanceToAction();
      for (let turn = 0; turn < 3; turn++) {
        await batchPage.getByTestId("submit-action").click();
        otherState = (await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "gain_cake" } })).state;
        await advanceToAction();
      }
      await batchPage.getByTestId("action-mode-attack").click();
      const attackSelect = batchPage.getByTestId("attack-row-kind-0");
      assert.ok((await attackSelect.locator("option").allTextContents()).some((text) => text.includes("金箍棒（斗战胜佛）")));
      await attackSelect.selectOption(`skill:${recipe.skill.id}`);
      await batchPage.setViewportSize({ width: 390, height: 844 });
      await batchPage.getByTestId("submit-action").scrollIntoViewIfNeeded();
      assert.equal(await batchPage.getByTestId("submit-action").isEnabled(), true);
      await batchPage.screenshot({ path: path.join(output, "fusion-cudgel-mobile.png") });
      await batchPage.getByTestId("submit-action").click();
      otherState = (await emit(d, "game:submit_action", { roomId: room.roomId, action: { type: "defense", defense: "small" } })).state;
      await advanceToAction();
      assert.ok(latest.eventLog.some((event) => event.type === "attack_blocked" && event.attackName === "金箍棒"));
      assert.equal(latest.players.find((player) => player.id === room.playerId)?.cakes, 0);
      assert.ok(latest.players.every((player) => player.hp === 6));
      await batchPage.setViewportSize({ width: 1280, height: 900 });
      await batchPage.screenshot({ path: path.join(output, "fusion-cudgel-desktop.png") });
    }
    await batchContext.close();
    console.log(`browser effect available: ${name}`);
  }
  assert.deepEqual(errors, []);
  const scenarioChecks: Record<string, string> = {
    "弹力球": "UI fusion and rebound block Eye-enhanced Zhong without reflection, damage or on-hit shield",
    "根源之目": "UI fusion retains Zhong selection and pierces the other player's Elastic Ball, dealing damage",
    "空城计": "absolute invulnerability blocks a retirement scroll on desktop and mobile; non-attack electric shock still applies paralysis on the second turn",
    "冰火狂暴曲": "mixed defenses grant one mark; desktop and mobile can select the second own attack; only its target takes enhanced damage and freeze",
    "杀级换": "free sha/qin switches, ordered destruction and triple rotation, five permutations and delayed one-cake refund",
    "野蛮人": "two ordinary reversals used through browser controls on separate turns",
    "贤者之书": "approved pending chat effect and retained materials displayed on mobile",
    "贤者的庇护": "lethal attack opens revival UI, sage protection selected and restores exactly two HP",
    "自然之灵": "nature spirit blocks fire attack and burning-earth spell damage on desktop and mobile",
    "纯净苍穹": "paid phantom defense grants immunity, ice vortex still damages but cannot freeze, immunity expires before next turn",
    "魔女斗篷": "witch cloak shield effects through browser controls",
    "斗战胜佛": "golden cudgel submitted from mobile controls, costs three cakes and is blocked by small defense",
    "核战": "zero-cake nuclear attack from mobile",
    "虚幻": "virtual defense switch from UI",
    "破天圣剑": "two-HP sword pierce from UI",
    "灵魂修复": "soul repair pays cakes at next round start and restores full HP only at that round's end under blood sorrow",
    "电闪雷鸣": "lightning immunity grants one ghost charge and browser can spend it",
    "枯萎": "wither opening choice, private storage, locked selection, mobile fusion, two-sha erasure and turn-end decomposition",
    "辉月": "moon cancels the revealed attack, refunds its paid cost, blocks qinggang, auto-skips the next turn and restores mobile submission afterward"
  };
  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({ passed: true, roomId,
    checks: ["opening free fusion", "opponent privacy", "turn-end decomposition", "fusion guessing options", "390px layout", "paid fusion consumes one complete action", "unfinished replay protection", "selected enabled fusion recipes selectable and playable",
      ...effectBatch.filter((name) => scenarioChecks[name]).map((name) => scenarioChecks[name])],
    effectBatch, enabledRecipeCount: allEffectBatch.length,
    screenshots: fs.readdirSync(output).filter((name) => name.endsWith(".png")), pageErrors: errors }, null, 2));
  console.log(`fusion browser checks passed: ${output}`);
} catch (error) {
  fs.writeFileSync(path.join(output, "failure-state.json"), JSON.stringify(diagnosticState(), null, 2));
  if (activePage) {
    await activePage.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => undefined);
    fs.writeFileSync(path.join(output, "failure-page.txt"), await activePage.locator("body").innerText().catch(() => "page unavailable"));
  }
  throw error;
} finally {
  for (const socket of sockets) socket.disconnect();
  await browser?.close();
  server.kill();
  fs.closeSync(serverLog);
}
