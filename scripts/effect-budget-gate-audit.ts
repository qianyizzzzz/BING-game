import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readPaidApiPriorSpendCny } from "./paid-api-spend-ledger";

interface BudgetSummary {
  cappedForSpendLimit: boolean;
  priorSpendCny: number;
  requiresPermission: boolean;
  skippedByBudgetCap: number;
  spendLimitCny: number;
  totalEstimatedCnyWithPrior: number;
}

interface KeyframePlan {
  budget: BudgetSummary;
  count: number;
  totals: {
    skippedByBudgetCap: number;
  };
}

interface SeedancePlan {
  budget: BudgetSummary;
  count: number;
  skipped: Array<{ reason: string }>;
  totalSelectedBeforeBudgetCap: number;
}

const root = path.resolve(".");
const failures: string[] = [];
const tempDir = path.resolve("artifacts/seedance/effect-budget-gate-audit");
const tempLedgerPath = path.join(tempDir, "paid-api-spend-ledger.json");
const tempManifestPath = path.join(tempDir, "effect-generation-tasks.json");
const tempSettleReportPath = path.join(tempDir, "effect-settle-report.json");
const currentPriorSpendCny = readPaidApiPriorSpendCny();

fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(
  tempLedgerPath,
  `${JSON.stringify({ currency: "CNY", entries: [], updatedAt: "2026-06-16" }, null, 2)}\n`,
  "utf8"
);
fs.writeFileSync(
  tempManifestPath,
  `${JSON.stringify(
    {
      apiProvider: "volcengine",
      options: {
        estimatedCnyPerTask: 3,
        model: "doubao-seedance-2-0-260128"
      },
      tasks: [
        {
          estimatedCny: 3,
          response: {
            id: "cgt-20260616032151-pr4n7",
            model: "doubao-seedance-2-0-260128",
            status: "succeeded"
          },
          skillId: "skill_78_18866",
          skillName: "火球"
        }
      ]
    },
    null,
    2
  )}\n`,
  "utf8"
);
fs.writeFileSync(
  tempSettleReportPath,
  `${JSON.stringify(
    {
      settled: [
        {
          queryResponse: {
            id: "cgt-20260616032151-pr4n7",
            model: "doubao-seedance-2-0-260128",
            status: "succeeded"
          },
          skillId: "skill_78_18866",
          skillName: "火球",
          status: "downloaded",
          taskId: "cgt-20260616032151-pr4n7"
        }
      ]
    },
    null,
    2
  )}\n`,
  "utf8"
);
runTsxScript("scripts/sync-paid-api-spend-ledger.ts", [
  `--ledger=${tempLedgerPath}`,
  `--manifest=${tempManifestPath}`,
  `--settle-report=${tempSettleReportPath}`
]);
runTsxScript("scripts/paid-api-spend-ledger-audit.ts", [`--ledger=${tempLedgerPath}`]);

const syncedLedgerRaw = fs.readFileSync(tempLedgerPath, "utf8");
const syncedLedger = JSON.parse(syncedLedgerRaw) as {
  entries: Array<{ estimatedCny?: number; taskId?: string }>;
};
expectEqual("synced ledger entries", syncedLedger.entries.length, 1);
expectEqual("synced ledger task id", syncedLedger.entries[0]?.taskId, "cgt-20260616032151-pr4n7");
expectEqual("synced ledger estimate", syncedLedger.entries[0]?.estimatedCny, 3);
expectEqual("synced ledger excludes signed URLs", /video_url|X-Tos-Signature|data:image|Authorization/i.test(syncedLedgerRaw), false);

runTsxScript("scripts/effect-keyframe-batch.ts", [
  "--offset-skills=0",
  "--limit-skills=10",
  "--estimated-cny-per-frame=0.5"
]);

const keyframePlan = readJson<KeyframePlan>("artifacts/effects/keyframe-generation-plan.json");
const expectedKeyframeCount = cappedTaskCount(40, currentPriorSpendCny, 0.5, 10);
expectEqual("keyframe count", keyframePlan.count, expectedKeyframeCount);
expectEqual("keyframe prior spend", keyframePlan.budget.priorSpendCny, currentPriorSpendCny);
expectEqual(
  "keyframe cumulative estimate",
  keyframePlan.budget.totalEstimatedCnyWithPrior,
  currentPriorSpendCny + expectedKeyframeCount * 0.5
);
expectEqual("keyframe skipped by cap", keyframePlan.budget.skippedByBudgetCap, 40 - expectedKeyframeCount);
expectEqual("keyframe totals skipped by cap", keyframePlan.totals.skippedByBudgetCap, 40 - expectedKeyframeCount);
expectEqual("keyframe permission flag", keyframePlan.budget.requiresPermission, false);

runTsxScript("scripts/seedance-effect-batch.ts", [
  "--provider=volcengine",
  "--offset=0",
  "--limit=5",
  "--estimated-cny-per-task=3",
  "--include-missing-keyframes"
]);

const seedancePlan = readJson<SeedancePlan>("artifacts/seedance/effect-generation-plan.json");
const expectedSeedanceCount = cappedTaskCount(5, currentPriorSpendCny, 3, 10);
expectEqual("Seedance count", seedancePlan.count, expectedSeedanceCount);
expectEqual("Seedance selected before cap", seedancePlan.totalSelectedBeforeBudgetCap, 5);
expectEqual("Seedance prior spend", seedancePlan.budget.priorSpendCny, currentPriorSpendCny);
expectEqual(
  "Seedance cumulative estimate",
  seedancePlan.budget.totalEstimatedCnyWithPrior,
  currentPriorSpendCny + expectedSeedanceCount * 3
);
expectEqual("Seedance skipped by cap", seedancePlan.budget.skippedByBudgetCap, 5 - expectedSeedanceCount);
expectEqual(
  "Seedance budget skip rows",
  seedancePlan.skipped.filter((item) => item.reason === "budget_cap").length,
  5 - expectedSeedanceCount
);
expectEqual("Seedance permission flag", seedancePlan.budget.requiresPermission, false);

if (failures.length > 0) {
  console.error("effect budget gate audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("effect budget gate audit passed: cumulative 10 RMB cap is enforced in dry-run plans");

function runTsxScript(scriptPath: string, args: string[]): void {
  execFileSync("node", ["node_modules/tsx/dist/cli.mjs", scriptPath, ...args], {
    cwd: root,
    stdio: "pipe"
  });
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(root, relativePath), "utf8")) as T;
}

function expectEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function cappedTaskCount(
  plannedTaskCount: number,
  priorSpendCny: number,
  estimatedCnyPerTask: number,
  spendLimitCny: number
): number {
  const remainingCny = spendLimitCny - priorSpendCny;
  const maxTasksUnderLimit = Math.max(0, Math.ceil(remainingCny / estimatedCnyPerTask) - 1);
  return Math.min(plannedTaskCount, maxTasksUnderLimit);
}
