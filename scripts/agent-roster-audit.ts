import fs from "node:fs";
import path from "node:path";

const agentRoot = path.resolve(".agents");
const expectedAgents = [
  "animation-designer.md",
  "art-director-blender.md",
  "competitive-player.md",
  "developer-qa.md",
  "literary-director.md",
  "new-player.md",
  "product-manager.md",
  "public-deployment.md"
];

const functionalNames = [
  "美术总监",
  "动画设计",
  "文学总监",
  "产品经理",
  "新手玩家",
  "竞技玩家",
  "开发商 / QA",
  "公网部署"
];

const forbiddenNames = [
  "Kuhn",
  "Fermat",
  "Noether",
  "Sagan",
  "Planck",
  "Darwin",
  "Descartes",
  "Rawls",
  "Plato",
  "Volta",
  "Huygens",
  "James",
  "Hume",
  "Bernoulli",
  "Lovelace",
  "Ptolemy",
  "Godel",
  "Bacon",
  "Gibbs",
  "Erdos",
  "Dewey",
  "Kant"
];

const requiredDocs = [
  "docs/SUBAGENT_ROSTER.md",
  "workflow/docs/03-agent-rules.md"
];
const interfaceDocs = [".agents/openai.yaml"];

const failures: string[] = [];
const actualAgents = fs
  .readdirSync(agentRoot)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort();

if (JSON.stringify(actualAgents) !== JSON.stringify([...expectedAgents].sort())) {
  failures.push(`unexpected .agents markdown files: ${actualAgents.join(", ")}`);
}

for (const filePath of [
  ...expectedAgents.map((fileName) => path.join(agentRoot, fileName)),
  ...requiredDocs,
  ...interfaceDocs
]) {
  const text = fs.readFileSync(filePath, "utf8");
  if (text.includes("\uFFFD")) {
    failures.push(`${filePath}: contains replacement character`);
  }
  for (const token of ["涓", "鐨", "鈫", "鏂", "鎶", "妗"]) {
    if (text.includes(token)) {
      failures.push(`${filePath}: contains likely mojibake token ${token}`);
    }
  }
}

for (const filePath of requiredDocs) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const name of functionalNames) {
    if (!text.includes(name)) {
      failures.push(`${filePath}: missing functional role ${name}`);
    }
  }
}

for (const filePath of interfaceDocs) {
  const text = fs.readFileSync(filePath, "utf8");
  if (!text.includes("BING 美术总监")) {
    failures.push(`${filePath}: missing interface display name`);
  }
}

for (const fileName of actualAgents) {
  if (forbiddenNames.some((name) => fileName.toLowerCase().includes(name.toLowerCase()))) {
    failures.push(`${fileName}: forbidden generic person-name agent file`);
  }
}

if (failures.length > 0) {
  console.error("agent roster audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`agent roster audit passed: ${actualAgents.length} functional agents`);
