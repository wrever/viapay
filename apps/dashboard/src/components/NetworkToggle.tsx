"use client";

import { useLocale } from "@/lib/i18n";

type Network = "testnet" | "mainnet";

/** Compact Testnet / Mainnet control for the dash top bar. */
export function NetworkToggle({
  value,
  onChange,
  mainnetReady,
}: {
  value: Network;
  onChange: (next: Network) => void;
  mainnetReady: boolean;
}) {
  const { t } = useLocale();

  return (
    <div
      className="net-toggle"
      role="group"
      aria-label={t.networkLabel}
      title={t.networkHint}
    >
      <button
        type="button"
        className={`net-toggle__btn${value === "testnet" ? " is-active" : ""}`}
        aria-pressed={value === "testnet"}
        onClick={() => onChange("testnet")}
      >
        {t.networkTestnet}
      </button>
      <button
        type="button"
        className={`net-toggle__btn${value === "mainnet" ? " is-active" : ""}`}
        aria-pressed={value === "mainnet"}
        disabled={!mainnetReady}
        title={
          mainnetReady ? t.networkHint : t.networkMainnetUnavailable
        }
        onClick={() => {
          if (mainnetReady) onChange("mainnet");
        }}
      >
        {t.networkMainnet}
      </button>
    </div>
  );
}
