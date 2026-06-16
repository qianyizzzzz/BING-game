import fs from "node:fs";
import path from "node:path";

interface PaidApiSpendLedger {
  currency: "CNY";
  entries: PaidApiSpendEntry[];
  updatedAt: string;
}

interface PaidApiSpendEntry {
  actualCny: number | null;
  estimatedCny: number;
  id: string;
  kind: string;
  model?: string;
  notes?: string;
  provider: string;
  skillId: string;
  skillName: string;
  status: string;
  taskId: string;
}

interface SeedanceTaskManifest {
  apiProvider?: string;
  options?: {
    estimatedCnyPerTask?: number;
    model?: string;
  };
  tasks?: Array<{
    estimatedCny?: number;
    response?: unknown;
    skillId?: string;
    skillName?: string;
  }>;
}

interface SeedanceSettleReport {
  settled?: Array<{
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

const ledgerPath = path.resolve(stringArg("--ledger", "docs/PAID_API_SPEND_LEDGER.json"));
const manifestPath = path.resolve(stringArg("--manifest", "artifacts/seedance/effect-generation-tasks.json"));
const settleReportPath = path.resolve(stringArg("--settle-report", "artifacts/seedance/effect-settle-report.json"));

const ledger = readLedger(ledgerPath);
const manifest = readJsonIfExists<SeedanceTaskManifest>(manifestPath);
const settleReport = readJsonIfExists<SeedanceSettleReport>(settleReportPath);
const skillNamesById = readSkillNamesById();
const nextEntries = buildSeedanceEntries(manifest, settleReport);
const syncResult = syncLedgerEntries(ledger, nextEntries);

if (syncResult.added === 0 && syncResult.updated === 0) {
  console.log(`paid API spend ledger already up to date: ${path.relative(process.cwd(), ledgerPath)}`);
  process.exit(0);
}

ledger.updatedAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
console.log(
  `synced paid API spend ledger: ${syncResult.added} added, ${syncResult.updated} updated -> ${path.relative(
    process.cwd(),
    ledgerPath
  )}`
);

function buildSeedanceEntries(
  manifest: SeedanceTaskManifest | undefined,
  settleReport: SeedanceSettleReport | undefined
): PaidApiSpendEntry[] {
  if (!manifest?.tasks?.length) {
    return [];
  }

  const settledByTaskId = new Map(
    (settleReport?.settled ?? [])
      .map((item) => [item.taskId ?? item.queryResponse?.id, item] as const)
      .filter((item): item is [string, NonNullable<SeedanceSettleReport["settled"]>[number]] => Boolean(item[0]))
  );

  return manifest.tasks.flatMap((task) => {
    const taskId = taskIdFromResponse(task.response);
    if (!taskId || !task.skillId || !task.skillName) {
      return [];
    }

    const settled = settledByTaskId.get(taskId);
    const status = settled?.queryResponse?.status ?? statusFromResponse(task.response) ?? "submitted";
    const skillName = canonicalSkillName(task.skillId, settled?.skillName ?? task.skillName);
    return [
      {
        actualCny: null,
        estimatedCny: task.estimatedCny ?? manifest.options?.estimatedCnyPerTask ?? 0,
        id: `seedance-${task.skillId}-${taskId}`,
        kind: "seedance_video",
        model: settled?.queryResponse?.model ?? modelFromResponse(task.response) ?? manifest.options?.model,
        notes: "Synced from local Seedance task manifest; excludes prompt payloads, URLs, and API credentials.",
        provider: manifest.apiProvider ?? "unknown",
        skillId: task.skillId,
        skillName,
        status,
        taskId
      }
    ];
  });
}

function syncLedgerEntries(
  ledgerToUpdate: PaidApiSpendLedger,
  incomingEntries: PaidApiSpendEntry[]
): { added: number; updated: number } {
  const existingByTaskId = new Map(ledgerToUpdate.entries.map((entry) => [entry.taskId, entry]));
  let added = 0;
  let updated = 0;

  for (const incoming of incomingEntries) {
    const existing = existingByTaskId.get(incoming.taskId);
    if (!existing) {
      ledgerToUpdate.entries.push(incoming);
      existingByTaskId.set(incoming.taskId, incoming);
      added += 1;
      continue;
    }

    const before = JSON.stringify(existing);
    existing.model = incoming.model ?? existing.model;
    existing.provider = incoming.provider || existing.provider;
    existing.skillName = canonicalSkillName(existing.skillId, incoming.skillName || existing.skillName);
    existing.status = incoming.status || existing.status;
    if (existing.estimatedCny === 0 && incoming.estimatedCny > 0) {
      existing.estimatedCny = incoming.estimatedCny;
    }
    if (JSON.stringify(existing) !== before) {
      updated += 1;
    }
  }

  return { added, updated };
}

function taskIdFromResponse(response: unknown): string | undefined {
  if (!isRecord(response)) {
    return undefined;
  }
  return stringField(response, "id") ?? stringField(response, "task_id") ?? stringField(response, "taskId");
}

function statusFromResponse(response: unknown): string | undefined {
  return isRecord(response) ? stringField(response, "status") : undefined;
}

function modelFromResponse(response: unknown): string | undefined {
  return isRecord(response) ? stringField(response, "model") : undefined;
}

function stringField(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readLedger(filePath: string): PaidApiSpendLedger {
  if (!fs.existsSync(filePath)) {
    return {
      currency: "CNY",
      entries: [],
      updatedAt: new Date().toISOString().slice(0, 10)
    };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PaidApiSpendLedger;
}

function readJsonIfExists<T>(filePath: string): T | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readSkillNamesById(): Map<string, string> {
  const promptManifestPath = path.resolve("docs/EFFECT_ANIMATION_PROMPTS.json");
  const manifest = readJsonIfExists<{ skills?: Array<{ name?: string; skillId?: string }> }>(promptManifestPath);
  return new Map(
    (manifest?.skills ?? [])
      .filter((skill): skill is { name: string; skillId: string } => Boolean(skill.skillId && skill.name))
      .map((skill) => [skill.skillId, skill.name])
  );
}

function canonicalSkillName(skillId: string, fallback: string | undefined): string {
  return skillNamesById.get(skillId) ?? fallback ?? skillId;
}

function stringArg(name: string, fallback: string): string {
  const prefix = `${name}=`;
  const matches = process.argv.filter((arg) => arg.startsWith(prefix));
  return matches.at(-1)?.slice(prefix.length) ?? fallback;
}
