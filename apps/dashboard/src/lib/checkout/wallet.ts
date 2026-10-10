"use client";

import { useCallback, useEffect, useState } from "react";

type KitNetwork = "testnet" | "mainnet" | "local";

let kitReady = false;
let kitNetwork: KitNetwork | null = null;

async function loadKit() {
  const [{ StellarWalletsKit }, { Networks }, { defaultModules }] =
    await Promise.all([
      import("@creit.tech/stellar-wallets-kit/sdk"),
      import("@creit.tech/stellar-wallets-kit/types"),
      import("@creit.tech/stellar-wallets-kit/modules/utils"),
    ]);
  return { StellarWalletsKit, Networks, defaultModules };
}

async function ensureKitNetwork(network: KitNetwork) {
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
  } else if (kitNetwork !== network) {
    StellarWalletsKit.setNetwork(selected);
  }
  kitNetwork = network;
}

export function useStellarWallet(network: KitNetwork = "testnet") {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureKitNetwork(network).catch(() => undefined);
  }, [network]);

  const connect = useCallback(async () => {
    setError(null);
    await ensureKitNetwork(network);
    const { StellarWalletsKit } = await loadKit();
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
      await ensureKitNetwork(network);
      const { StellarWalletsKit } = await loadKit();
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase,
        address: fromAddress ?? address ?? undefined,
      });
      return signedTxXdr;
    },
    [address, network],
  );

  const signMessage = useCallback(
    async (message: string, fromAddress?: string) => {
      await ensureKitNetwork(network);
      const { StellarWalletsKit } = await loadKit();
      const { signedMessage, signerAddress } = await StellarWalletsKit.signMessage(
        message,
        { address: fromAddress ?? address ?? undefined },
      );
      return { signedMessage, signerAddress };
    },
    [address, network],
  );

  return { address, error, setError, connect, disconnect, sign, signMessage };
}
