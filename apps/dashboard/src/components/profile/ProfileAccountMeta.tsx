"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AccountProfile } from "@/lib/account-types";
import { useLocale } from "@/lib/i18n";

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
    <section className="profile-card">
      <header className="profile-card__head">
        <h3 className="profile-card__title">{t.profileMetaTitle}</h3>
        <p className="profile-card__desc">{t.profileMetaDesc}</p>
      </header>
      <div className="profile-card__body">
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
            <dd>{fmtDate(profile.updated_at, tag)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
