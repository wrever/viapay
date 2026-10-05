"use client";

import { Logo } from "@/components/Logo";
import { useLocale } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <main className="lost">
      <div>
        <Logo variant="icon" width={168} className="lost__logo" alt="" />
        <h1>{t.notFound.title}</h1>
        <p>{t.notFound.body}</p>
        <a className="btn btn--primary" href="/">
          {t.notFound.cta}
        </a>
      </div>
    </main>
  );
}
