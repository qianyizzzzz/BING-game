import fs from "node:fs";
import path from "node:path";

interface PackageJson {
  scripts?: Record<string, string>;
}

const projectRoot = process.cwd();
const failures: string[] = [];
const packageJson = readJson<PackageJson>("package.json");
const scripts = packageJson.scripts ?? {};

expectScript("public", "node scripts/public-play.mjs");
expectScript("public:no-build", "node scripts/public-play.mjs --skip-build");
expectScript("public:tunnel", "node scripts/public-play.mjs --tunnel-only --skip-build");
expectScript("verify:release", "npm run build && npm run verify:release:run");

for (const required of [
  "npm run test:ci",
  "npm run test:release-assets:dist",
  "npm run test:ui-agents:run",
  "npm run test:ui-agents:submit-ready:run",
  "npm run test:ui-agents:complex:run",
  "npm run test:character-browser:run"
]) {
  if (!scripts["verify:release:run"]?.includes(required)) {
    failures.push(`verify:release:run missing ${required}`);
  }
}

const publicPlayScript = readText("scripts/public-play.mjs");
for (const needle of [
  "ALLOW_TUNNEL_ORIGINS",
  "cloudflared",
  "trycloudflare",
  "--no-download",
  "--tunnel-only",
  "--port=3001",
  "http://localhost:${port}"
]) {
  expectContains(publicPlayScript, needle, "scripts/public-play.mjs");
}

const readme = readText("README.md");
for (const needle of [
  "npm run public",
  "npm run public:no-build",
  "http://localhost:5173",
  "http://localhost:3001",
  "docs/PUBLIC_PLAY.md",
  "docs/DEPLOYMENT.md"
]) {
  expectContains(readme, needle, "README.md");
}

const publicPlayDoc = readText("docs/PUBLIC_PLAY.md");
for (const needle of [
  "npm run public",
  "npm run public:no-build",
  "npm run public:tunnel",
  "Cloudflare Tunnel",
  "3001",
  "ALLOW_TUNNEL_ORIGINS",
  "PUBLIC_ORIGINS"
]) {
  expectContains(publicPlayDoc, needle, "docs/PUBLIC_PLAY.md");
}

const deploymentDoc = readText("docs/DEPLOYMENT.md");
for (const needle of [
  "npm run build",
  "npm run serve",
  "PUBLIC_DIR",
  "PUBLIC_ORIGINS",
  "ALLOW_TUNNEL_ORIGINS",
  "ACCOUNT_DATA_FILE",
  "localhost:3001"
]) {
  expectContains(deploymentDoc, needle, "docs/DEPLOYMENT.md");
}

const releaseChecklist = readText("docs/RELEASE_CHECKLIST.md");
for (const needle of [
  "npm run verify:release",
  "PUBLIC_ORIGINS",
  "ALLOW_TUNNEL_ORIGINS=false",
  "localhost:3001",
  "npm run public"
]) {
  expectContains(releaseChecklist, needle, "docs/RELEASE_CHECKLIST.md");
}

const envExample = readText(".env.example");
for (const needle of [
  "PORT=3001",
  "PUBLIC_DIR=apps/client/dist",
  "CLIENT_ORIGIN=http://localhost:5173",
  "PUBLIC_ORIGINS=",
  "CLIENT_ORIGINS=",
  "ALLOW_TUNNEL_ORIGINS=false",
  "ACCOUNT_DATA_FILE=data/accounts/accounts.json",
  "MATCH_DATA_DIR=data",
  "AI_POLICY_PATH=data/ai/ai-policy.json",
  "VITE_SERVER_URL=http://localhost:3001",
  "BING_PLAYTEST_URL=http://localhost:3001",
  "CLOUDFLARED_PATH=",
  "ARK_API_KEY=",
  "VOLCENGINE_ARK_API_KEY=",
  "SEEDANCE_PROVIDER=volcengine",
  "SEEDANCE_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3",
  "SEEDANCE_DEFAULT_MODEL=doubao-seedance-2-0-260128",
  "SEEDANCE_ESTIMATED_CNY_PER_TASK=3",
  "SEEDANCE_IMAGE_ROLES=first_frame,last_frame",
  "SEEDANCE_IMAGE_SLOTS=1,4",
  "PAID_API_PRIOR_SPEND_CNY=",
  "ACEDATACLOUD_API_TOKEN=",
  "ACEDATACLOUD_API_BASE_URL=https://api.acedata.cloud"
]) {
  expectContains(envExample, needle, ".env.example");
}

if (failures.length > 0) {
  console.error("public config audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("public config audit passed: public play scripts and docs are aligned");

function expectScript(name: string, expected: string): void {
  if (scripts[name] !== expected) {
    failures.push(`package.json script ${name} expected ${JSON.stringify(expected)}, got ${JSON.stringify(scripts[name])}`);
  }
}

function expectContains(source: string, needle: string, label: string): void {
  if (!source.includes(needle)) {
    failures.push(`${label}: missing ${needle}`);
  }
}

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readText(relativePath)) as T;
}
