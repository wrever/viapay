"use client";

import { useLocale } from "@/lib/i18n";

export function ProfileWalletChip({
  wallet,
  onGoWallet,
}: {
  wallet: string | null;
  onGoWallet: () => void;
}) {
  const { t } = useLocale();
  if (!wallet) {
    return (
      <button type="button" className="profile-wallet-chip is-empty" onClick={onGoWallet}>
        {t.profileShortcutWalletEmpty}
      </button>
    );
  }
  const short = `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
  return (
    <button
      type="button"
      className="profile-wallet-chip"
      onClick={onGoWallet}
      title={wallet}
    >
      {short}
    </button>
  );
}
