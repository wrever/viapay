"use client";

import { useLocale } from "@/lib/i18n";

export function ProfileStatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const active = status === "active";
  return (
    <span
      className={`profile-status${active ? " is-active" : ""}`}
      title={t.profileMetaStatus}
    >
      {status}
    </span>
  );
}
