import * as fs from "fs";
import * as path from "path";

interface FailedTx {
  signature: string;
  slot: number;
  blockTime: number | null;
  error: string;
  fee: number;
  writableAccounts: string[];
  firstFiveLogs: string[];
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p));
  return sorted[idx];
}

function categorizeError(rawError: string): string {
  if (rawError.includes("BlockhashNotFound")) return "Blockhash Expired";
  if (rawError.includes("InsufficientFunds")) return "Insufficient Funds";
  if (rawError.includes("Custom")) {
    const match = rawError.match(/"Custom":(\d+)/);
    return match ? `Custom Error ${match[1]}` : "Custom Error (unknown code)";
  }
  return "Other";
}

function analyze(label: string, filePath: string): { warnings: string[] } {
  const warnings: string[] = [];
  console.log(`\n--- ${label.toUpperCase()} ---`);

  if (!fs.existsSync(filePath)) {
    console.log(`FILE NOT FOUND: ${filePath}`);
    warnings.push(`${label}: data file missing`);
    return { warnings };
  }

  const data: FailedTx[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`Total transactions: ${data.length}`);

  if (data.length < 400) {
    warnings.push(`${label}: only ${data.length} transactions (fewer than 400)`);
  }

  // Error type breakdown
  const errorCounts: Record<string, number> = {};
  for (const tx of data) {
    const category = categorizeError(tx.error);
    errorCounts[category] = (errorCounts[category] ?? 0) + 1;
  }
  console.log("\nError type breakdown:");
  const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedErrors) {
    const pct = ((count / data.length) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${pct}%)`);
  }

  console.log("\nTop 5 raw error strings:");
  const rawCounts: Record<string, number> = {};
  for (const tx of data) rawCounts[tx.error] = (rawCounts[tx.error] ?? 0) + 1;
  const topRaw = Object.entries(rawCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [raw, count] of topRaw) {
    console.log(`  ${count}x  ${raw}`);
  }

  // Fee statistics
  const fees = data.map((tx) => tx.fee).sort((a, b) => a - b);
  console.log("\nFee statistics (lamports):");
  console.log(`  Min: ${fees[0] ?? 0}`);
  console.log(`  Median: ${median(fees)}`);
  console.log(`  p75: ${percentile(fees, 0.75)}`);
  console.log(`  Max: ${fees[fees.length - 1] ?? 0}`);

  // Writable accounts
  const avgWritable =
    data.reduce((sum, tx) => sum + tx.writableAccounts.length, 0) / (data.length || 1);
  console.log(`\nWritable accounts:`);
  console.log(`  Avg per transaction: ${avgWritable.toFixed(2)}`);

  const accountFreq: Record<string, number> = {};
  for (const tx of data) {
    for (const acc of tx.writableAccounts) {
      accountFreq[acc] = (accountFreq[acc] ?? 0) + 1;
    }
  }
  const topAccounts = Object.entries(accountFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log("  Top 5 most frequent accounts:");
  topAccounts.forEach(([acc, count], i) => {
    console.log(`    ${i + 1}. ${acc} — ${count} appearances`);
  });

  // Data quality
  const emptyWritable = data.filter((tx) => tx.writableAccounts.length === 0).length;
  const nullBlockTime = data.filter((tx) => tx.blockTime === null).length;
  const noLogs = data.filter((tx) => tx.firstFiveLogs.length === 0).length;

  console.log("\nData quality:");
  console.log(`  Transactions with empty writableAccounts: ${emptyWritable}`);
  console.log(`  Transactions with null blockTime: ${nullBlockTime}`);
  console.log(`  Transactions with no logs: ${noLogs}`);

  if (emptyWritable > 10) {
    warnings.push(`${label}: ${emptyWritable} transactions have empty writableAccounts (> 10)`);
  }
  if (sortedErrors.length === 0 || (sortedErrors.length === 1 && sortedErrors[0][0] === "Other")) {
    warnings.push(`${label}: error types are not diverse / all uncategorized`);
  }

  return { warnings };
}

function main() {
  const dataDir = path.join(__dirname, "data");
  const jupiterFile = path.join(dataDir, "jupiter_failed_txs.json");
  const pumpfunFile = path.join(dataDir, "pumpfun_failed_txs.json");

  const jupiterResult = analyze("jupiter", jupiterFile);
  const pumpfunResult = analyze("pumpfun", pumpfunFile);

  // ISSTA 2025 cross-check
  console.log("\n--- ISSTA 2025 CROSS-CHECK ---");
  if (fs.existsSync(jupiterFile)) {
    const jupData: FailedTx[] = JSON.parse(fs.readFileSync(jupiterFile, "utf-8"));
    const errorCounts: Record<string, number> = {};
    for (const tx of jupData) {
      const category = categorizeError(tx.error);
      errorCounts[category] = (errorCounts[category] ?? 0) + 1;
    }
    const dominant = Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0];
    console.log(
      `Dominant Jupiter error category in this dataset: ${dominant ? dominant[0] : "n/a"}`
    );
    console.log(
      "ISSTA 2025 paper claims dominant Jupiter error is 'price or profit not met' (a specific Custom error code)."
    );
    console.log(
      "Manual mapping required: inspect the top raw error strings above and cross-reference the custom error code against Jupiter's IDL/error list to confirm or contradict this."
    );
  } else {
    console.log("Cannot cross-check — jupiter data file missing.");
  }

  const allWarnings = [...jupiterResult.warnings, ...pumpfunResult.warnings];
  console.log("\n===================================");
  if (allWarnings.length === 0) {
    console.log("DATA VERIFIED: Both datasets ready for Week 1 backtesting.");
  } else {
    console.log("DATA WARNINGS:");
    for (const w of allWarnings) console.log(`  - ${w}`);
    console.log("(Warnings are informational — data is still usable.)");
  }
}

main();
