import fs from "node:fs";
import path from "node:path";

interface PaidApiSpendLedger {
  entries?: PaidApiSpendEntry[];
}

interface PaidApiSpendEntry {
  actualCny?: number | null;
  estimatedCny?: number | null;
  includeInSpend?: boolean;
  status?: string;
}

const defaultLedgerPath = "docs/PAID_API_SPEND_LEDGER.json";

export function readPaidApiPriorSpendCny(ledgerPath = defaultLedgerPath): number {
  const resolvedPath = path.resolve(ledgerPath);
  if (!fs.existsSync(resolvedPath)) {
    return 0;
  }

  const ledger = JSON.parse(fs.readFileSync(resolvedPath, "utf8")) as PaidApiSpendLedger;
  return (ledger.entries ?? []).reduce((sum, entry) => {
    if (entry.includeInSpend === false || entry.status === "failed" || entry.status === "cancelled") {
      return sum;
    }
    return sum + spendValue(entry, resolvedPath);
  }, 0);
}

function spendValue(entry: PaidApiSpendEntry, ledgerPath: string): number {
  const value = entry.actualCny ?? entry.estimatedCny ?? 0;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${ledgerPath}: paid API spend entries must use non-negative CNY values`);
  }
  return value;
}
