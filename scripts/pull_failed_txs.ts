import dotenv from "dotenv";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: "../.env" });

const RPC_URL = process.env.HELIUS_RPC_URL;
if (!RPC_URL) {
  throw new Error("HELIUS_RPC_URL not set in .env");
}

const connection = new Connection(RPC_URL, "confirmed");

const PROGRAMS = [
  { name: "jupiter", id: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" },
  { name: "pumpfun", id: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P" },
];

interface FailedTx {
  signature: string;
  slot: number;
  blockTime: number | null;
  error: string;
  fee: number;
  writableAccounts: string[];
  firstFiveLogs: string[];
}

async function pullProgram(program: { name: string; id: string }): Promise<FailedTx[]> {
  const sigs = await connection.getSignaturesForAddress(new PublicKey(program.id), {
    limit: 1000,
  });

  const failed = sigs.filter((s) => s.err !== null);
  const targets = failed.slice(0, 300);

  const results: FailedTx[] = [];

  for (let i = 0; i < targets.length; i++) {
    const sig = targets[i];
    const tx = await connection.getTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      console.warn(`[${program.name}] WARNING: getTransaction returned null for ${sig.signature}`);
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    const message = tx.transaction.message;
    const accountKeys = message.getAccountKeys({
      accountKeysFromLookups: tx.meta?.loadedAddresses,
    });

    const writableAccounts: string[] = [];
    for (let idx = 0; idx < accountKeys.length; idx++) {
      if (message.isAccountWritable(idx)) {
        const key = accountKeys.get(idx);
        if (key) writableAccounts.push(key.toBase58());
      }
    }

    results.push({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime ?? null,
      error: JSON.stringify(sig.err),
      fee: tx.meta?.fee ?? 0,
      writableAccounts,
      firstFiveLogs: tx.meta?.logMessages?.slice(0, 5) ?? [],
    });

    if ((i + 1) % 25 === 0) {
      console.log(`[${program.name}] Progress: ${i + 1}/${targets.length}`);
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  return results;
}

async function main() {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const counts: Record<string, number> = {};

  for (const program of PROGRAMS) {
    console.log(`\n=== Pulling ${program.name} ===`);
    const results = await pullProgram(program);
    const outPath = path.join(dataDir, `${program.name}_failed_txs.json`);
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    counts[program.name] = results.length;
  }

  console.log(`\nJupiter: ${counts["jupiter"]} transactions saved`);
  console.log(`Pump.fun: ${counts["pumpfun"]} transactions saved`);
  console.log("Done. Check scripts/data/");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
