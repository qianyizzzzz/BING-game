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
const readableDocs = ["README.md"];
const interfaceDocs = [".agents/openai.yaml"];
const auditedFiles = [
  ...expectedAgents.map((fileName) => path.join(agentRoot, fileName)),
  ...requiredDocs,
  ...readableDocs,
  ...interfaceDocs
];

const mojibakePatterns = [
  /[\uFFFD]/,
  /[\u951f\u65a4\u62f7]{2,}/,
  /[忙莽氓茅猫盲枚眉茂]{2,}/i,
  /[\u5a11\u95fb\u95b3\u95ba\u95b9\u6fe1]{2,}/,
  /[\u7f07\u5ea2\u6e73\u93c2\u56e7\u3127\u657e\u701b\u612d\u6ae4\u9473\u20ac\u6c2b]{4,}/
];
const mojibakeNeedles = [
  [0x701b, 0x612d, 0x6ae4],
  [0x7f07, 0x5ea2, 0x6e73],
  [0x93c2, 0x56e7],
  [0x9354, 0x3127, 0x657e],
  [0x6d5c, 0x0443, 0x6427],
  [0x7ed4, 0x70b4, 0x59a7],
  [0x934f, 0xe102, 0x7d89]
].map((codes) => String.fromCharCode(...codes));

const failures: string[] = [];
const actualAgents = fs
  .readdirSync(agentRoot)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort();

if (JSON.stringify(actualAgents) !== JSON.stringify([...expectedAgents].sort())) {
  failures.push(`unexpected .agents markdown files: ${actualAgents.join(", ")}`);
}

for (const filePath of auditedFiles) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const pattern of mojibakePatterns) {
    if (pattern.test(text)) {
      failures.push(`${filePath}: contains likely mojibake (${pattern})`);
      break;
    }
  }
  for (const needle of mojibakeNeedles) {
    if (text.includes(needle)) {
      failures.push(`${filePath}: contains likely mojibake sample`);
      break;
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

for (const filePath of auditedFiles) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const name of forbiddenNames) {
    if (filePath.endsWith(".agents")) {
      continue;
    }
    if (text.includes(`# ${name}`) || text.includes(`| ${name} |`)) {
      failures.push(`${filePath}: forbidden generic person-name agent ${name}`);
    }
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
