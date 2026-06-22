import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const readmePath = path.join(projectRoot, "README.md");
const readme = fs.readFileSync(readmePath, "utf8");
const failures: string[] = [];

const requiredSections = [
  "# BING Game / 饼",
  "## 现在可以玩什么",
  "## 快速开始",
  "## 公网联机",
  "## 项目状态",
  "## 美术方向",
  "## 工程门禁",
  "## 目录",
  "## 文档",
  "## 费用与素材边界"
];

const requiredPhrases = [
  "所有玩家先暗中选择行动，锁定后一起亮牌结算",
  "docs/screenshots/table-desktop.png",
  "技能 gallery",
  "不止 65 个技能",
  "油画纸面 + 透明装置 + 手绘搞怪动物角色",
  "当前 GLB 仍是技术占位，不能宣传为最终美术",
  "功能命名的 BING 子智能体",
  "累计估算达到或超过 10 RMB 时必须先确认",
  "Seedance settle 报告只保留安全摘要"
];

const requiredCommands = [
  "npm install",
  "npm run dev",
  "npm run public",
  "npm run public:no-build",
  "npm run test:ci",
  "npm run test:readme",
  "npm run test:visual-style",
  "npm run test:skill-gallery",
  "npm run test:effect-budget",
  "npm run seedance:effects:submit -- --estimated-cny-per-task=3"
];

const requiredLinks = [
  "docs/screenshots/table-desktop.png",
  "docs/PUBLIC_PLAY.md",
  "docs/DEPLOYMENT.md",
  "docs/UI_DESIGN_PLAN.md",
  "docs/SUBAGENT_UI_REVIEW.md",
  "docs/EFFECT_ASSET_STATUS.md",
  "docs/EFFECT_GENERATION_BATCH_PLAN.md",
  "workflow/tasks/TASK-007-oil-paint-effect-pipeline.md",
  "docs/SEEDANCE_MCP_SETUP.md",
  "docs/CHARACTER_ASSET_AUDIT.md",
  "docs/ASSET_RIGHTS.md",
  "docs/SUBAGENT_ROSTER.md",
  "workflow/docs/01-visual-bible.md",
  "workflow/prompts/prompt-goal-combos.md"
];

const forbiddenTokens = [
  "\uFFFD",
  "涓",
  "鏄",
  "妤",
  "缂",
  "閸",
  "鐪熶汉比例",
  "真人比例",
  "半写实",
  "深渊牌桌",
  "深渊遗物",
  "三国",
  "中二"
];

for (const section of requiredSections) {
  expectContains(readme, section, "README section");
}

for (const phrase of requiredPhrases) {
  expectContains(readme, phrase, "README phrase");
}

for (const command of requiredCommands) {
  expectContains(readme, command, "README command");
}

for (const link of requiredLinks) {
  expectContains(readme, link, "README link");
  if (!fs.existsSync(path.join(projectRoot, link))) {
    failures.push(`README link target missing: ${link}`);
  }
}

for (const token of forbiddenTokens) {
  if (readme.includes(token)) {
    failures.push(`README contains forbidden or mojibake token ${JSON.stringify(token)}`);
  }
}

const chineseCharCount = Array.from(readme).filter((char) => /[\u4e00-\u9fff]/.test(char)).length;
if (chineseCharCount < 650) {
  failures.push(`README should be primarily Chinese; found only ${chineseCharCount} CJK characters`);
}

const tableRows = readme.match(/^\| .* \|$/gm) ?? [];
if (tableRows.length < 18) {
  failures.push(`README should keep status and command tables; found ${tableRows.length} table rows`);
}

const bulletCount = readme.match(/^- /gm)?.length ?? 0;
if (bulletCount < 14) {
  failures.push(`README should keep scannable bullet lists; found ${bulletCount} bullets`);
}

const marketingWords = ["赋能", "极致", "沉浸式体验", "无限可能", "重新定义"];
for (const word of marketingWords) {
  if (readme.includes(word)) {
    failures.push(`README should avoid generic marketing phrase: ${word}`);
  }
}

if (failures.length > 0) {
  console.error("README audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`README audit passed: ${chineseCharCount} Chinese characters, ${tableRows.length} table rows`);

function expectContains(source: string, needle: string, label: string): void {
  if (!source.includes(needle)) {
    failures.push(`${label}: missing ${needle}`);
  }
}
