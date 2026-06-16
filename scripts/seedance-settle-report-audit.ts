import fs from "node:fs";
import path from "node:path";

interface SeedanceSettleReport {
  settled?: Array<{
    downloaded?: string[];
    queryResponse?: {
      id?: string;
      model?: string;
      status?: string;
    };
    skillId?: string;
    skillName?: string;
    status?: string;
    taskId?: string;
  }>;
}

const reportPath = path.resolve(stringArg("--report", "artifacts/seedance/effect-settle-report.json"));
const failures: string[] = [];

if (!fs.existsSync(reportPath)) {
  console.log(`Seedance settle report audit skipped: ${path.relative(process.cwd(), reportPath)} does not exist`);
  process.exit(0);
}

const raw = fs.readFileSync(reportPath, "utf8");
const report = JSON.parse(raw) as SeedanceSettleReport;

for (const pattern of [
  /https?:\/\//i,
  /authorization/i,
  /bearer\s+[a-z0-9._-]{12,}/i,
  /api[_-]?key/i,
  /secret/i,
  /(?:access|refresh|session)[_-]?token/i,
  /[?&]token=/i,
  /X-Tos-/i,
  /Signature=/i,
  /Credential=/i
]) {
  if (pattern.test(raw)) {
    failures.push(`report contains sensitive-looking text matching ${pattern}`);
  }
}

for (const [index, item] of (report.settled ?? []).entries()) {
  const label = item.taskId ?? item.queryResponse?.id ?? `settled[${index}]`;
  requireText(label, "skillId", item.skillId);
  requireText(label, "skillName", item.skillName);
  requireText(label, "status", item.status);
  requireText(label, "taskId", item.taskId ?? item.queryResponse?.id);

  if (item.queryResponse) {
    requireText(label, "queryResponse.status", item.queryResponse.status);
    if (!item.queryResponse.id && !item.taskId) {
      failures.push(`${label}: queryResponse.id or taskId is required`);
    }
  }
}

if (failures.length > 0) {
  console.error("Seedance settle report audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Seedance settle report audit passed: ${(report.settled ?? []).length} settled tasks`);

function requireText(label: string, field: string, value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    failures.push(`${label}: ${field} is required`);
  }
}

function stringArg(name: string, fallback: string): string {
  const prefix = `${name}=`;
  const matches = process.argv.filter((arg) => arg.startsWith(prefix));
  return matches.at(-1)?.slice(prefix.length) ?? fallback;
}
