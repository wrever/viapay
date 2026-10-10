"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AccountProfile } from "@/lib/account-types";
import { useLocale } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/relative-time";
import { ProfileSection } from "./ProfileSection";

function fmtDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProfileAccountMeta({ profile }: { profile: AccountProfile }) {
  const { t, locale } = useLocale();
  const tag = locale === "en" ? "en" : locale === "pt" ? "pt-BR" : "es";
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(profile.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <ProfileSection
      title={t.profileMetaTitle}
      desc={t.profileMetaDesc}
      testId="profile-meta"
    >
      <dl className="profile-meta">
        <div>
          <dt>{t.profileMetaId}</dt>
          <dd className="profile-meta__row">
            <span className="profile-mono">{profile.id}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void copyId()}
            >
              {copied ? t.copied : t.copy}
            </Button>
          </dd>
        </div>
        <div>
          <dt>{t.profileMetaStatus}</dt>
          <dd>{profile.status}</dd>
        </div>
        <div>
          <dt>{t.profileMetaCreated}</dt>
          <dd>{fmtDate(profile.created_at, tag)}</dd>
        </div>
        <div>
          <dt>{t.profileMetaUpdated}</dt>
          <dd>
            {fmtDate(profile.updated_at, tag)}
            <span className="profile-meta__rel">
              {" "}
              ({formatRelativeTime(profile.updated_at, tag)})
            </span>
          </dd>
        </div>
      </dl>
    </ProfileSection>
  );
}
