import fs from "node:fs";
import path from "node:path";
import { chromium, Page } from "playwright";

interface AgentLog {
  name: string;
  role: string;
  observations: string[];
  issues: string[];
}

interface RunConfig {
  url: string;
  outDir: string;
}

const config = readConfig();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.resolve(config.outDir, `ui-agents-${timestamp}`);

fs.mkdirSync(runDir, { recursive: true });

const firstTimer: AgentLog = {
  name: "玩家 Agent A",
  role: "新手玩家",
  observations: [],
  issues: []
};
const competitor: AgentLog = {
  name: "玩家 Agent B",
  role: "竞技玩家",
  observations: [],
  issues: []
};
const producer: AgentLog = {
  name: "开发商 Agent",
  role: "制作人 / QA / 可维护性评审",
  observations: [],
  issues: []
};

const consoleErrors: string[] = [];
const failedActions: string[] = [];
let roomId = "";

const browser = await chromium.launch({ headless: true });

try {
  const playerA = await newAgentPage("first-timer");
  const playerB = await newAgentPage("competitor");

  await playerA.goto(config.url, { waitUntil: "networkidle" });
  await screenshot(playerA, "01-player-a-landing.png");
  firstTimer.observations.push("首屏已加载，用于检查品牌、创建房间入口和角色选择是否清楚。");

  await fillPlayerName(playerA, "新手玩家");
  await clickByTestId(playerA, "create-room");
  roomId = await readRoomId(playerA);
  firstTimer.observations.push(`成功创建房间：${roomId || "未读取到房号"}`);

  await playerB.goto(config.url, { waitUntil: "networkidle" });
  await fillPlayerName(playerB, "竞技玩家");
  await fillRoomId(playerB, roomId);
  await clickByTestId(playerB, "join-room");
  await playerB.waitForSelector(".poker-table-shell", { timeout: 15_000 });
  await screenshot(playerB, "02-player-b-joined.png");
  competitor.observations.push("成功加入房间，检查加入路径是否足够快。");

  await optionalClickByTestId(playerA, "add-ai");
  await clickByTestId(playerA, "start-game");
  await playerA.waitForSelector(".table-action-dock", { timeout: 15_000 });
  await playerB.waitForSelector(".table-action-dock", { timeout: 15_000 });
  producer.observations.push("房主能从大厅进入战斗桌面，行动 dock 已出现。");

  for (let turn = 1; turn <= 3; turn += 1) {
    await submitCakeTurn(playerA, turn, firstTimer);
    await submitCakeTurn(playerB, turn, competitor);
    await playerA.waitForTimeout(900);
  }

  await screenshot(playerA, "03-player-a-after-turns.png");
  await screenshot(playerB, "04-player-b-after-turns.png");

  await collectHeuristicFeedback(playerA, firstTimer, "新手玩家");
  await collectHeuristicFeedback(playerB, competitor, "竞技玩家");
  collectProducerFeedback();
} finally {
  await browser.close();
}

const reportPath = path.join(runDir, "report.md");
fs.writeFileSync(reportPath, renderReport(), "utf-8");
console.log(`UI playtest agent report written to ${reportPath}`);

async function newAgentPage(name: string): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: name === "competitor" ? 1280 : 390, height: name === "competitor" ? 800 : 844 },
    isMobile: name !== "competitor"
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`[${name}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(`[${name}] ${error.message}`);
  });
  return page;
}

async function fillPlayerName(page: Page, name: string): Promise<void> {
  const input = page.getByTestId("player-name-input").first();
  await input.fill(name);
}

async function fillRoomId(page: Page, value: string): Promise<void> {
  const roomInput = page.getByTestId("join-room-input").first();
  await roomInput.fill(value);
}

async function clickByTestId(page: Page, testId: string): Promise<void> {
  const target = page.getByTestId(testId).first();
  await target.click({ timeout: 10_000 });
}

async function optionalClickByTestId(page: Page, testId: string): Promise<void> {
  try {
    await clickByTestId(page, testId);
  } catch (error) {
    failedActions.push(`可选动作未完成：${testId} (${String(error)})`);
  }
}

async function readRoomId(page: Page): Promise<string> {
  await page.getByTestId("room-code").waitFor({ timeout: 15_000 });
  return (await page.getByTestId("room-code").first().innerText()).trim();
}

async function submitCakeTurn(page: Page, turn: number, agent: AgentLog): Promise<void> {
  try {
    await page.getByTestId("action-mode-gain-cake").first().click({ timeout: 10_000 });
    await page.getByTestId("submit-action").first().click({ timeout: 10_000 });
    agent.observations.push(`第 ${turn} 回合完成“吃饼”提交。`);
  } catch (error) {
    const message = `第 ${turn} 回合提交失败：${String(error)}`;
    failedActions.push(message);
    agent.issues.push(message);
  }
}

async function screenshot(page: Page, fileName: string): Promise<void> {
  await page.screenshot({ path: path.join(runDir, fileName), fullPage: false });
}

async function collectHeuristicFeedback(page: Page, agent: AgentLog, label: string): Promise<void> {
  const bodyText = await page.locator("body").innerText();

  if (!bodyText.includes("当前选择")) {
    agent.issues.push("行动面板没有暴露“当前选择”，玩家不容易确认将要提交什么。");
  }
  if (!bodyText.includes("第") || !bodyText.includes("回合")) {
    agent.issues.push("回合信息不明显，玩家可能无法判断当前节奏。");
  }
  if (!bodyText.includes("提交")) {
    agent.issues.push("主操作按钮不明显。");
  }
  if (agent.issues.length === 0) {
    agent.observations.push(`${label} 视角没有触发关键可用性告警。`);
  }
}

function collectProducerFeedback(): void {
  if (consoleErrors.length > 0) {
    producer.issues.push(`发现 ${consoleErrors.length} 条 console/page error，需要优先排查。`);
  }
  if (failedActions.length > 0) {
    producer.issues.push(`发现 ${failedActions.length} 个自动化操作失败，说明 UI selector 或流程可能不稳定。`);
  }
  if (!roomId) {
    producer.issues.push("未成功读取房号，创建/加入路径需要检查。");
  }
  if (producer.issues.length === 0) {
    producer.observations.push("自动化流程未发现阻断级错误。");
  }
}

function renderReport(): string {
  return [
    "# UI Playtest Agents Report",
    "",
    `- URL: ${config.url}`,
    `- Room: ${roomId || "未读取"}`,
    `- Time: ${new Date().toLocaleString("zh-CN")}`,
    "",
    renderAgent(firstTimer),
    renderAgent(competitor),
    renderAgent(producer),
    "## Console Errors",
    "",
    ...(consoleErrors.length > 0 ? consoleErrors.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "## Failed Actions",
    "",
    ...(failedActions.length > 0 ? failedActions.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "## Screenshots",
    "",
    "- `01-player-a-landing.png`",
    "- `02-player-b-joined.png`",
    "- `03-player-a-after-turns.png`",
    "- `04-player-b-after-turns.png`",
    ""
  ].join("\n");
}

function renderAgent(agent: AgentLog): string {
  return [
    `## ${agent.name}（${agent.role}）`,
    "",
    "### 观察",
    "",
    ...(agent.observations.length > 0 ? agent.observations.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "### 问题",
    "",
    ...(agent.issues.length > 0 ? agent.issues.map((item) => `- ${item}`) : ["- 无"]),
    ""
  ].join("\n");
}

function readConfig(): RunConfig {
  const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
  const outArg = process.argv.find((arg) => arg.startsWith("--out="));
  return {
    url: urlArg?.slice("--url=".length) || process.env.BING_PLAYTEST_URL || "http://localhost:3001",
    outDir: outArg?.slice("--out=".length) || path.resolve("artifacts", "playtests")
  };
}
