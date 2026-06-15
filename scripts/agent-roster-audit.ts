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
const auditedFiles = [
  ...expectedAgents.map((fileName) => path.join(agentRoot, fileName)),
  ...requiredDocs,
  ...interfaceDocs
];

const mojibakePatterns = [
  /[\uFFFD]/,
  /[锟斤拷]{2,}/,
  /[æçåéèäöüï]{2,}/i,
  /[娑閻閳閺閹濡]{2,}/,
  /[缇庢湳鏂囧鍔ㄧ敾瀛愭櫤鑳介€氬父]{4,}/
];

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
