"use client";

import { Bell, KeyRound, Wallet } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { ProfileSection } from "./ProfileSection";

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
    <ProfileSection
      title={t.profileShortcutsTitle}
      desc={t.profileShortcutsDesc}
      testId="profile-shortcuts"
    >
      <div className="profile-shortcuts">
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
    </ProfileSection>
  );
}
