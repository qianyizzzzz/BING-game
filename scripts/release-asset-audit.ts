import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const includeDist = process.argv.includes("--dist");

const roots = [
  path.join(projectRoot, "apps", "client", "public"),
  ...(includeDist ? [path.join(projectRoot, "apps", "client", "dist")] : [])
];

const forbiddenPatterns = [
  { pattern: /\.blend\d?$/i, reason: "Blender source files must stay outside static web assets." },
  {
    pattern: /(^|[\\/])assets[\\/]characters[\\/]source([\\/]|$)/i,
    reason: "Character source scenes must live under tools/blender/source."
  }
];

const findings: string[] = [];

for (const root of roots) {
  if (!existsSync(root)) {
    if (includeDist) {
      findings.push(`${relative(root)} is missing; run the client build before --dist audit.`);
    }
    continue;
  }

  for (const filePath of walkFiles(root)) {
    const normalized = filePath.replaceAll("\\", "/");
    for (const { pattern, reason } of forbiddenPatterns) {
      if (pattern.test(normalized)) {
        findings.push(`${relative(filePath)}: ${reason}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("release asset audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(
  `release asset audit passed: checked ${roots.map(relative).join(", ")}`
);

function walkFiles(root: string): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    const filePath = path.join(root, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      files.push(...walkFiles(filePath));
    } else if (stat.isFile()) {
      files.push(filePath);
    }
  }

  return files;
}

function relative(filePath: string): string {
  return path.relative(projectRoot, filePath).replaceAll("\\", "/");
}
