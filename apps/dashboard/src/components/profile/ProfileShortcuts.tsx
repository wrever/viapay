"use client";

import { Bell, KeyRound, Wallet } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function ProfileShortcuts({
  wallet,
  onGoWallet,
  onGoNotices,
}: {
  wallet: string | null;
  onGoWallet: () => void;
  onGoNotices: () => void;
}) {
  const { t } = useLocale();
  const short =
    wallet && wallet.length > 12
      ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}`
      : wallet;

  return (
    <section className="profile-card">
      <header className="profile-card__head">
        <h3 className="profile-card__title">{t.profileShortcutsTitle}</h3>
        <p className="profile-card__desc">{t.profileShortcutsDesc}</p>
      </header>
      <div className="profile-card__body profile-shortcuts">
        <button type="button" className="profile-shortcut" onClick={onGoWallet}>
          <Wallet className="size-4" aria-hidden />
          <span>
            <span className="profile-shortcut__label">{t.profileShortcutWallet}</span>
            <span className="profile-shortcut__meta">
              {short ?? t.profileShortcutWalletEmpty}
            </span>
          </span>
        </button>
        <button type="button" className="profile-shortcut" onClick={onGoWallet}>
          <KeyRound className="size-4" aria-hidden />
          <span>
            <span className="profile-shortcut__label">{t.profileShortcutKey}</span>
            <span className="profile-shortcut__meta">{t.profileShortcutKeyHint}</span>
          </span>
        </button>
        <button type="button" className="profile-shortcut" onClick={onGoNotices}>
          <Bell className="size-4" aria-hidden />
          <span>
            <span className="profile-shortcut__label">{t.profileShortcutNotices}</span>
            <span className="profile-shortcut__meta">
              {t.profileShortcutNoticesHint}
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}
