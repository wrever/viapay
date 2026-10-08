"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteControls, useLocale } from "@/lib/marketing/i18n";
import {
  LEGAL_PATHS,
  LEGAL_SUPPORT_EMAIL,
  getLegalBundle,
  getLegalDoc,
  type LegalDocId,
} from "@/lib/marketing/legal";

const DOC_ORDER: LegalDocId[] = ["privacy", "terms", "data-deletion"];

export function LegalPage({
  docId,
  loginHref,
}: {
  docId: LegalDocId;
  loginHref: string;
}) {
  const { locale, t } = useLocale();
  const bundle = getLegalBundle(locale);
  const doc = getLegalDoc(locale, docId);

  return (
    <div className="docs-shell">
      <header className="docs-top">
        <div className="docs-top__inner">
          <div className="docs-top__brand">
            <Link className="brand" href="/" aria-label={t.nav.homeAria}>
              <Logo variant="horizontal" width={112} alt="" />
            </Link>
            <span className="docs-top__divider" aria-hidden="true" />
            <nav className="docs-top__nav" aria-label={bundle.navLabel}>
              <Link href="/privacy">{bundle.privacy.title}</Link>
              <Link href="/terms">{bundle.terms.title}</Link>
              <Link href="/data-deletion">{bundle["data-deletion"].title}</Link>
            </nav>
          </div>
          <div className="nav__end">
            <nav className="docs-top__nav docs-top__nav--quiet">
              <Link href="/docs">{t.docs.breadcrumbDocs}</Link>
              <a href={loginHref}>{t.docs.panel}</a>
            </nav>
            <SiteControls />
          </div>
        </div>
      </header>

      <div className="docs-layout">
        <aside className="docs-side" aria-label={bundle.related}>
          <p className="docs-side__label">{bundle.related}</p>
          {DOC_ORDER.map((id) => (
            <Link
              key={id}
              href={LEGAL_PATHS[id]}
              className={
                id === docId
                  ? "docs-side__link docs-side__link--active"
                  : "docs-side__link"
              }
            >
              {bundle[id].title}
            </Link>
          ))}
          <p className="docs-side__label">{bundle.contact}</p>
          <a className="docs-side__link" href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>
            {LEGAL_SUPPORT_EMAIL}
          </a>
        </aside>

        <main className="docs-main">
          <nav className="docs-crumbs" aria-label="breadcrumb">
            <Link href="/">{bundle.home}</Link>
            <span aria-hidden="true">/</span>
            <span className="docs-crumbs__now">{doc.title}</span>
          </nav>

          <p className="docs__eyebrow">{bundle.navLabel}</p>
          <h1 className="docs__title">{doc.title}</h1>
          <p className="legal__updated">
            {bundle.updatedLabel}: {doc.updated}
          </p>
          <p className="docs__lede">{doc.lede}</p>

          {doc.sections.map((section) => (
            <section
              key={section.id}
              className="docs__block"
              id={section.id}
            >
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 56)}>{p}</p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="docs__list">
                  {section.bullets.map((b) => (
                    <li key={b.slice(0, 56)}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
