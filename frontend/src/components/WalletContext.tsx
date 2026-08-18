import { useMemo } from "react";
import type { ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";

/** Public mainnet endpoint — read-only, used purely so the adapter has a
 *  connection. Preflight's own analysis runs server-side against Helius. */
const ENDPOINT = "https://api.mainnet-beta.solana.com";

export function WalletContextProvider({ children }: { children: ReactNode }) {
  // Wallet-standard capable wallets are auto-detected; these cover the rest.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
