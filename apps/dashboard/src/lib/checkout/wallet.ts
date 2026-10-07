"use client";

import { useCallback, useState } from "react";

type KitNetwork = "testnet" | "mainnet" | "local";

let kitReady = false;

async function loadKit() {
  const [{ StellarWalletsKit }, { Networks }, { defaultModules }] =
    await Promise.all([
      import("@creit.tech/stellar-wallets-kit/sdk"),
      import("@creit.tech/stellar-wallets-kit/types"),
      import("@creit.tech/stellar-wallets-kit/modules/utils"),
    ]);
  return { StellarWalletsKit, Networks, defaultModules };
}

export function useStellarWallet(network: KitNetwork = "testnet") {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    const { StellarWalletsKit, Networks, defaultModules } = await loadKit();
    const selected =
      network === "mainnet"
        ? Networks.PUBLIC
        : network === "local"
          ? Networks.STANDALONE
          : Networks.TESTNET;
    if (!kitReady) {
      StellarWalletsKit.init({
        modules: defaultModules(),
        network: selected,
      });
      kitReady = true;
    } else {
      StellarWalletsKit.setNetwork(selected);
    }
    const { address: next } = await StellarWalletsKit.authModal();
    setAddress(next);
    return next;
  }, [network]);

  const disconnect = useCallback(async () => {
    const { StellarWalletsKit } = await loadKit();
    await StellarWalletsKit.disconnect();
    setAddress(null);
  }, []);

  const sign = useCallback(
    async (
      xdr: string,
      networkPassphrase: string,
      fromAddress?: string,
    ) => {
      const { StellarWalletsKit } = await loadKit();
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase,
        address: fromAddress ?? address ?? undefined,
      });
      return signedTxXdr;
    },
    [address],
  );

  return { address, error, setError, connect, disconnect, sign };
}
