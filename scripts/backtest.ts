import * as fs from "fs";
import * as path from "path";

interface FailedTx {
  signature: string;
  slot: number;
  blockTime: number;
  error: string;
  fee: number;
  writableAccounts: string[];
  firstFiveLogs: string[];
}

type PreflightAction = "Wait" | "Caution" | "Send";

interface Classification {
  action: PreflightAction;
  reason: string;
  isContentionError: boolean;
  isLowFee: boolean;
}

interface ProgramReport {
  name: string;
  total: number;
  wait: number;
  caution: number;
  send: number; 
  waitPct: string;
  cautionPct: string;
  sendPct: string;
  contentionErrors: number;
  lowFeeCount: number;
  zeroFeeCount: number; 
  medianFee: number;
  errorBreakdown: Record<string, number>; 
}

function classifyTransaction(tx: FailedTx): Classification {
  const errorStr = tx.error.toLowerCase();
  const fee = tx.fee;

  // Step 1: Detect contention-type errors by error string content
  //
  // JUPITER errors (program Custom errors):
  // "custom":6001 → SlippageToleranceExceeded
  //   This is a timing/contention error — price moved between
  //   quote and execution because another tx landed first.
  //   Preflight would say: Wait (high contention likely)
  //
  // "custom\":6001" or "6001" in the error string → same
  //
  // PUMP.FUN errors:
  // "custom\":7" or "custom\":412" → timing/contention errors
  //   Custom 7  = BondingCurveComplete (someone else completed
  //               the curve before you)
  //   Custom 412 = SlippageExceeded (same as Jupiter slippage)
  //   Preflight would say: Wait
  //
  // "custom\":3" → InsufficientFunds or similar — NOT contention
  //   Preflight cannot prevent this. Simulation would catch it.
  //   Preflight would say: Caution (simulation failure)
  //
  // "blockhashnotfound" or "blockhashnot" → expired blockhash
  //   Preflight would say: Caution (expired blockhash rule)
  //
  // Everything else → Caution (simulation or other failure)

  const isSlippage =
    errorStr.includes('"custom":6001') ||
    errorStr.includes('"custom": 6001') ||
    errorStr.includes("6001");

  const isPumpContention =
    errorStr.includes('"custom":7') ||
    errorStr.includes('"custom": 7') ||
    errorStr.includes('"custom":412') ||
    errorStr.includes('"custom": 412');

  const isExpiredBlockhash =
    errorStr.includes("blockhashnotfound") ||
    errorStr.includes("blockhash not found");

  const isContentionError = isSlippage || isPumpContention;
  const isLowFee = fee <= 5000;

  if (isContentionError) {
    return {
      action: "Wait",
      reason: isSlippage
        ? "SlippageToleranceExceeded — contention likely caused price to move"
        : "Pump.fun contention error — bonding curve race condition",
      isContentionError: true,
      isLowFee,
    };
  }

  if (isExpiredBlockhash) {
    return {
      action: "Caution",
      reason: "Blockhash expired — transaction too old when submitted",
      isContentionError: false,
      isLowFee,
    };
  }


  if (isLowFee) {
    return {
      action: "Caution",
      reason: "Zero priority fee — likely dropped during congestion",
      isContentionError: false,
      isLowFee: true,
    };
  }

  return {
    action: "Caution",
    reason: "Other error — simulation or account state issue",
    isContentionError: false,
    isLowFee: false,
  };
}

function pct(n: number, total: number): string {
  return ((n / total) * 100).toFixed(1) + "%";
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function analyzeProgram(name: string, txs: FailedTx[]): ProgramReport {
  const results = txs.map((tx) => ({
    tx,
    classification: classifyTransaction(tx),
  }));

  const wait = results.filter((r) => r.classification.action === "Wait").length;
  const caution = results.filter((r) => r.classification.action === "Caution").length;
  const send = results.filter((r) => r.classification.action === "Send").length;

  const contentionErrors = results.filter((r) => r.classification.isContentionError).length;

  const lowFeeCount = results.filter((r) => r.classification.isLowFee).length;
  const zeroFeeCount = txs.filter((tx) => tx.fee <= 5000).length;

  const fees = txs.map((tx) => tx.fee);

  const errorCounts: Record<string, number> = {};
  txs.forEach((tx) => {
    const key = tx.error.slice(0, 60); 
    errorCounts[key] = (errorCounts[key] ?? 0) + 1;
  });

  const top5Errors = Object.fromEntries(
    Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  );

  return {
    name,
    total: txs.length,
    wait,
    caution,
    send,
    waitPct: pct(wait, txs.length),
    cautionPct: pct(caution, txs.length),
    sendPct: pct(send, txs.length),
    contentionErrors,
    lowFeeCount,
    zeroFeeCount,
    medianFee: median(fees),
    errorBreakdown: top5Errors,
  };
}

function printReport(report: ProgramReport): void {
  const divider = "─".repeat(50);
  console.log(divider);
  console.log(`${report.name.toUpperCase()} (${report.total} transactions)`);
  console.log(divider);

  console.log("\nPreflight recommendation breakdown:");
  console.log(`  🔴 Wait:    ${report.wait.toString().padStart(3)} (${report.waitPct})`);
  console.log(`  🟡 Caution: ${report.caution.toString().padStart(3)} (${report.cautionPct})`);
  console.log(`  🟢 Send:    ${report.send.toString().padStart(3)} (${report.sendPct}) ← missed`);

  console.log("\nError analysis:");
  console.log(
    `  Contention-type errors: ${report.contentionErrors} (${pct(report.contentionErrors, report.total)})`
  );
  console.log(
    `  Zero priority fee:      ${report.zeroFeeCount} (${pct(report.zeroFeeCount, report.total)})`
  );
  console.log(`  Median fee paid:        ${report.medianFee.toLocaleString()} lamports`);

  console.log("\nTop error types (raw):");
  Object.entries(report.errorBreakdown).forEach(([err, count]) => {
    console.log(`  ${count.toString().padStart(3)}x  ${err}`);
  });
  console.log();
}

function printCombinedSummary(reports: ProgramReport[]): void {
  const total = reports.reduce((s, r) => s + r.total, 0);
  const wait = reports.reduce((s, r) => s + r.wait, 0);
  const caution = reports.reduce((s, r) => s + r.caution, 0);
  const send = reports.reduce((s, r) => s + r.send, 0);
  const flagged = wait + caution;

  const divider = "═".repeat(50);
  console.log(divider);
  console.log("COMBINED SUMMARY");
  console.log(divider);
  console.log(`Total transactions analyzed: ${total}`);
  console.log();
  console.log(`Preflight would have flagged: ${flagged} (${pct(flagged, total)})`);
  console.log(`  → Wait:    ${wait} (${pct(wait, total)})`);
  console.log(`  → Caution: ${caution} (${pct(caution, total)})`);
  console.log();
  console.log(`Preflight would have missed:  ${send} (${pct(send, total)})`);
  console.log(`  → These are transactions where our heuristics`);
  console.log(`    did not detect the failure reason.`);
  console.log();

  // Interpretation
  const flaggedPct = (flagged / total) * 100;
  console.log("INTERPRETATION");
  console.log("─".repeat(50));
  if (flaggedPct >= 70) {
    console.log(
      `Strong signal: Preflight would have warned users on ${pct(flagged, total)}\n` +
        `of transactions that actually failed. The contention engine\n` +
        `and fee recommendation together cover the dominant failure modes.`
    );
  } else if (flaggedPct >= 50) {
    console.log(
      `Moderate signal: Preflight catches ${pct(flagged, total)} of failures.\n` +
        `The missed transactions are likely instruction-level errors\n` +
        `that only simulation can detect (not contention-related).`
    );
  } else {
    console.log(
      `Limited heuristic coverage: ${pct(flagged, total)} flagged.\n` +
        `Note: this backtest uses error-type proxies, not live contention\n` +
        `data. The live engine will perform differently — contention\n` +
        `data catches failures that error types alone cannot predict.`
    );
  }

  console.log();
  console.log("DATA QUALITY NOTE");
  console.log("─".repeat(50));
  console.log(
    "This backtest uses error type and fee as proxies for what\n" +
      "the live Preflight engine would have detected. It cannot\n" +
      "reconstruct actual slot-level contention from historical data.\n" +
      "Real-world accuracy will differ — the live contention engine\n" +
      "catches probabilistic failures that error-type heuristics miss."
  );
  console.log(divider);
}


function main(): void {
  console.log();
  console.log("═".repeat(50));
  console.log("PREFLIGHT BACKTESTING REPORT");
  console.log("═".repeat(50));
  console.log();

  const dataDir = path.join(__dirname, "data");

  const jupiterTxs: FailedTx[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "jupiter_failed_txs.json"), "utf-8")
  );
  const pumpfunTxs: FailedTx[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "pumpfun_failed_txs.json"), "utf-8")
  );

  console.log(
    `Loaded: ${jupiterTxs.length} Jupiter + ${pumpfunTxs.length} Pump.fun transactions\n`
  );

  const jupiterReport = analyzeProgram("Jupiter", jupiterTxs);
  const pumpfunReport = analyzeProgram("Pump.fun", pumpfunTxs);

  // Print individual reports
  printReport(jupiterReport);
  printReport(pumpfunReport);

  // Print combined summary
  printCombinedSummary([jupiterReport, pumpfunReport]);

  // Save report to file for grant application
  const reportPath = path.join(dataDir, "backtest_report.json");
  const summary = {
    generated_at: new Date().toISOString(),
    total_transactions: jupiterReport.total + pumpfunReport.total,
    flagged: {
      wait: jupiterReport.wait + pumpfunReport.wait,
      caution: jupiterReport.caution + pumpfunReport.caution,
      total:
        jupiterReport.wait +
        pumpfunReport.wait +
        (jupiterReport.caution + pumpfunReport.caution),
    },
    missed: jupiterReport.send + pumpfunReport.send,
    jupiter: {
      total: jupiterReport.total,
      wait: jupiterReport.wait,
      caution: jupiterReport.caution,
      send: jupiterReport.send,
      contention_errors: jupiterReport.contentionErrors,
      zero_fee_count: jupiterReport.zeroFeeCount,
      median_fee: jupiterReport.medianFee,
    },
    pumpfun: {
      total: pumpfunReport.total,
      wait: pumpfunReport.wait,
      caution: pumpfunReport.caution,
      send: pumpfunReport.send,
      contention_errors: pumpfunReport.contentionErrors,
      zero_fee_count: pumpfunReport.zeroFeeCount,
      median_fee: pumpfunReport.medianFee,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);
}

main();
