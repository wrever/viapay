"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { PollarProvider, usePollar } from "@pollar/react";
import { useCheckoutLocale } from "@/lib/checkout/i18n";

const POLLAR_KEY = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

type PollarNetwork = "testnet" | "mainnet";

/**
 * Embed Pollar only when a publishable key exists.
 * `network` must match the charge (layout defaults to testnet; PayPanel overrides).
 */
export function PollarShell({
  children,
  network = "testnet",
}: {
  children: ReactNode;
  network?: "testnet" | "mainnet" | "local";
}) {
  if (!POLLAR_KEY) return children;
  const stellarNetwork: PollarNetwork =
    network === "mainnet" ? "mainnet" : "testnet";
  return (
    <PollarProvider client={{ apiKey: POLLAR_KEY, stellarNetwork }}>
      {children}
    </PollarProvider>
  );
}

export type PollarSession = {
  address: string;
  sign: (xdr: string) => Promise<string>;
};

export function PollarLoginButton({
  onSession,
  network = "testnet",
}: {
  onSession: (session: PollarSession) => void;
  /** Mainnet cobros use Freighter; hide Pollar until the key is mainnet-capable. */
  network?: "testnet" | "mainnet" | "local";
}) {
  if (!POLLAR_KEY) return null;
  if (network === "mainnet") return null;
  return <PollarLoginInner onSession={onSession} />;
}

function PollarLoginInner({
  onSession,
}: {
  onSession: (session: PollarSession) => void;
}) {
  const { t } = useCheckoutLocale();
  const { openLoginModal, wallet, signTx } = usePollar();
  const onSessionRef = useRef(onSession);
  onSessionRef.current = onSession;

  useEffect(() => {
    if (!wallet?.address) return;
    const address = wallet.address;
    onSessionRef.current({
      address,
      sign: async (xdr) => {
        const signed = await signTx(xdr);
        if (signed.status !== "signed") {
          throw new Error(signed.message ?? t.prepareFailed);
        }
        return signed.signedXdr;
      },
    });
  }, [wallet?.address, signTx, t.prepareFailed]);

  const address = wallet?.address;
  return (
    <button
      type="button"
      onClick={() => openLoginModal()}
      className="flex h-11 w-full items-center justify-center rounded-[var(--r-md)] border border-[var(--border)] text-sm font-bold text-[var(--text)]"
    >
      {address
        ? t.pollarConnected(`${address.slice(0, 4)}…${address.slice(-4)}`)
        : t.pollarPay}
    </button>
  );
}
