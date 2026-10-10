"use client";

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
            <dd className="profile-mono">{profile.id}</dd>
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
