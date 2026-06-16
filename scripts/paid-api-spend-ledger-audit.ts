import fs from "node:fs";
import path from "node:path";
import { readPaidApiPriorSpendCny } from "./paid-api-spend-ledger";

interface PaidApiSpendLedger {
  currency?: string;
  entries?: PaidApiSpendEntry[];
  updatedAt?: string;
}

interface PaidApiSpendEntry {
  actualCny?: number | null;
  estimatedCny?: number | null;
  id?: string;
  includeInSpend?: boolean;
  kind?: string;
  provider?: string;
  skillId?: string;
  skillName?: string;
  status?: string;
  taskId?: string;
}

const ledgerPath = path.resolve(stringArg("--ledger", "docs/PAID_API_SPEND_LEDGER.json"));
const failures: string[] = [];
const sensitivePatterns = [
  /authorization/i,
  /bearer\s+[a-z0-9._-]{12,}/i,
  /api[_-]?key/i,
  /secret/i,
  /token/i
];

const raw = fs.readFileSync(ledgerPath, "utf8");
const ledger = JSON.parse(raw) as PaidApiSpendLedger;

if (ledger.currency !== "CNY") {
  failures.push(`currency must be CNY, got ${JSON.stringify(ledger.currency)}`);
}

if (!ledger.updatedAt || !/^\d{4}-\d{2}-\d{2}$/.test(ledger.updatedAt)) {
  failures.push("updatedAt must use YYYY-MM-DD");
}

if (!Array.isArray(ledger.entries) || ledger.entries.length === 0) {
  failures.push("entries must be a non-empty array");
}

for (const pattern of sensitivePatterns) {
  if (pattern.test(raw)) {
    failures.push(`ledger contains sensitive-looking text matching ${pattern}`);
  }
}

for (const [index, entry] of (ledger.entries ?? []).entries()) {
  const label = entry.id ?? `entry[${index}]`;
  requireText(label, "id", entry.id);
  requireText(label, "provider", entry.provider);
  requireText(label, "kind", entry.kind);
  requireText(label, "status", entry.status);

  if (!entry.actualCny && !entry.estimatedCny) {
    failures.push(`${label}: actualCny or estimatedCny is required`);
  }
  assertNonNegative(label, "actualCny", entry.actualCny);
  assertNonNegative(label, "estimatedCny", entry.estimatedCny);

  if (entry.kind?.includes("seedance")) {
    requireText(label, "taskId", entry.taskId);
    requireText(label, "skillId", entry.skillId);
    requireText(label, "skillName", entry.skillName);
  }
}

const priorSpendCny = readPaidApiPriorSpendCny(ledgerPath);
if (priorSpendCny < 0) {
  failures.push(`prior spend must be non-negative, got ${priorSpendCny}`);
}

if (failures.length > 0) {
  console.error("paid API spend ledger audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `paid API spend ledger audit passed: ${(ledger.entries ?? []).length} entries, ${priorSpendCny.toFixed(2)} CNY counted`
);

function requireText(label: string, field: string, value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    failures.push(`${label}: ${field} is required`);
  }
}

function assertNonNegative(label: string, field: string, value: unknown): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    failures.push(`${label}: ${field} must be a non-negative number`);
  }
}

function stringArg(name: string, fallback: string): string {
  const prefix = `${name}=`;
  const matches = process.argv.filter((arg) => arg.startsWith(prefix));
  return matches.at(-1)?.slice(prefix.length) ?? fallback;
}
