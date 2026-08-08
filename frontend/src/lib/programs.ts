// Exact addresses from crates/preflight-core/src/contention/mod.rs::PROGRAMS
export const PROGRAM_ADDRESSES: Record<string, string> = {
  jupiter: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  pumpfun: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  raydium_amm: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  raydium_clmm: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  orca: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
  marinade: "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD",
  tensor: "TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp",
  magic_eden: "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K",
};

// Drop a matching file at frontend/public/logos/<name>.svg (or .png) —
// pages render without one, no broken-image icon, until you add it.
export const LOGO_PATH: Record<string, string> = {
  jupiter: "/logos/jupiter.svg",
  pumpfun: "/logos/pumpfun.png",
  raydium_amm: "/logos/raydium.svg",
  raydium_clmm: "/logos/raydium.svg",
  orca: "/logos/orca.svg",
  marinade: "/logos/marinade.png",
  tensor: "/logos/tensor.png",
  magic_eden: "/logos/magic_eden.svg",
};

export function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function explorerUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}`;
}
