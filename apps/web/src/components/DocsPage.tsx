"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { SiteControls, useLocale } from "@/lib/i18n";
import type { DocChapter } from "@/lib/i18n/messages";

const SNIPPETS = {
  api: `curl -X POST $VIAPAY_API/v1/payment_intents \\
  -H "Authorization: Bearer sk_test_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "20.0000000",
    "asset": "USDC",
    "success_url": "https://tu-tienda.example/gracias",
    "cancel_url": "https://tu-tienda.example/carrito",
    "reseller_fee_bps": 700,
    "reseller_address": "G…"
  }'`,
  sdk: `import { ViaPay } from "@viapay/sdk";

const via = new ViaPay({ apiKey, baseUrl });
const checkout = await via.createCheckout({
  amount: "20.0000000",
  asset: "USDC",
  success_url: "https://tu-tienda.example/gracias",
  reseller_fee_bps: 700,
  reseller_address: "G…",
});
// window.location = checkout.url;

const ok = await ViaPay.verifyWebhook(rawBody, signatureHeader, secret);`,
  x402: `GET  /v1/x402/:id?client_secret=…  → 402 + accepts[] + viapay.breakdown
POST /v1/x402/:id
  Header: X-PAYMENT: <base64 JSON { payload: { signed_xdr } }>
  → 200 + X-PAYMENT-RESPONSE

# Demo: node examples/agent-pay.mjs`,
} as const;

function chapterSearchText(c: DocChapter): string {
  const parts = [
    c.title,
    c.lead,
    ...c.paragraphs,
    ...(c.bullets ?? []),
    ...(c.steps?.flatMap((s) => [s.title, s.body]) ?? []),
    c.note ?? "",
    c.code ? SNIPPETS[c.code] : "",
  ];
  return parts.join(" ").toLowerCase();
}

function ChapterBody({ chapter }: { chapter: DocChapter }) {
  return (
    <section key={chapter.id} className="docs__block" id={chapter.id}>
      <h2>{chapter.title}</h2>
      <p className="docs__lead">{chapter.lead}</p>
      {chapter.paragraphs.map((p) => (
        <p key={p.slice(0, 48)}>{p}</p>
      ))}
      {chapter.steps && chapter.steps.length > 0 && (
        <ol className="docs__steps">
          {chapter.steps.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.body}</span>
            </li>
          ))}
        </ol>
      )}
      {chapter.bullets && chapter.bullets.length > 0 && (
        <ul className="docs__list">
          {chapter.bullets.map((b) => (
            <li key={b.slice(0, 48)}>{b}</li>
          ))}
        </ul>
      )}
      {chapter.code && <pre className="docs__code">{SNIPPETS[chapter.code]}</pre>}
      {chapter.note && <p className="docs__note">{chapter.note}</p>}
    </section>
  );
}

export function DocsPage({ loginHref }: { loginHref: string }) {
  const { t } = useLocale();
  const d = t.docs;
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("overview");

  const chapters = d.chapters;
  const byGroup = useMemo(() => {
    const start = chapters.filter((c) => c.group === "start");
    const product = chapters.filter((c) => c.group === "product");
    const integrate = chapters.filter((c) => c.group === "integrate");
    return { start, product, integrate };
  }, [chapters]);

  const toc = useMemo(
    () => chapters.map((c) => ({ id: c.id, title: c.title })),
    [chapters],
  );

  const catalog = useMemo(() => {
    const label = (group: DocChapter["group"]) => {
      if (group === "start") return d.navStart;
      if (group === "product") return d.navProduct;
      return d.navIntegrate;
    };
    return chapters.map((c) => ({
      id: c.id,
      title: c.title,
      body: chapterSearchText(c),
      group: label(c.group),
    }));
  }, [chapters, d.navStart, d.navProduct, d.navIntegrate]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.body.includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }, [catalog, query]);

  useEffect(() => {
    const ids = toc.map((item) => item.id);
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.2, 0.5, 0.8] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [toc]);

  function goTo(id: string) {
    setQuery("");
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeTitle = toc.find((item) => item.id === activeId)?.title ?? d.title;

  function NavLinks({ items }: { items: DocChapter[] }) {
    return (
      <>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={
              activeId === item.id
                ? "docs-side__link docs-side__link--active"
                : "docs-side__link"
            }
            onClick={() => setActiveId(item.id)}
          >
            {item.title}
          </a>
        ))}
      </>
    );
  }

  return (
    <div className="docs-shell">
      <header className="docs-top">
        <div className="docs-top__inner">
          <div className="docs-top__brand">
            <Link className="brand" href="/" aria-label={t.nav.homeAria}>
              <Logo variant="horizontal" width={112} alt="" />
            </Link>
            <span className="docs-top__divider" aria-hidden="true" />
            <nav className="docs-top__nav" aria-label={d.developers}>
              <Link href="/docs">{d.developers}</Link>
              <Link href="/docs">{d.breadcrumbDocs}</Link>
              <a href="#api">{d.apiRef}</a>
            </nav>
          </div>
          <div className="nav__end">
            <nav className="docs-top__nav docs-top__nav--quiet">
              <Link href="/#modos">{d.modes}</Link>
              <a href={loginHref}>{d.panel}</a>
            </nav>
            <SiteControls />
          </div>
        </div>
      </header>

      <div className="docs-layout">
        <aside className="docs-side" aria-label={d.navStart}>
          <form
            className="docs-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (results[0]) goTo(results[0].id);
            }}
          >
            <label className="sr-only" htmlFor="docs-search">
              {d.searchAria}
            </label>
            <span className="docs-search__icon" aria-hidden="true">
              ⌕
            </span>
            <input
              id="docs-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={d.searchPlaceholder}
              autoComplete="off"
            />
            {query.trim() && (
              <div className="docs-search__results" role="listbox">
                {results.length === 0 ? (
                  <p className="docs-search__empty">{d.searchEmpty}</p>
                ) : (
                  results.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      role="option"
                      className="docs-search__hit"
                      onClick={() => goTo(hit.id)}
                    >
                      <span>{hit.title}</span>
                      <small>{hit.group}</small>
                    </button>
                  ))
                )}
              </div>
            )}
          </form>

          <p className="docs-side__label">{d.navStart}</p>
          <NavLinks items={byGroup.start} />

          <p className="docs-side__label">{d.navProduct}</p>
          <NavLinks items={byGroup.product} />

          <p className="docs-side__label">{d.navIntegrate}</p>
          <NavLinks items={byGroup.integrate} />
        </aside>

        <main id="docs-main" className="docs-main">
          <nav className="docs-crumbs" aria-label="breadcrumb">
            <Link href="/">{d.breadcrumbHome}</Link>
            <span aria-hidden="true">/</span>
            <Link href="/docs">{d.breadcrumbDocs}</Link>
            <span aria-hidden="true">/</span>
            <span className="docs-crumbs__now">{activeTitle}</span>
          </nav>

          <p className="via-label docs__eyebrow">{d.eyebrow}</p>
          <h1 className="docs__title">{d.title}</h1>
          <p className="docs__lede">{d.lede}</p>

          {chapters.map((chapter) => (
            <ChapterBody key={chapter.id} chapter={chapter} />
          ))}

          <div className="docs__actions">
            <a className="btn btn--primary" href={loginHref}>
              {d.openPanel}
            </a>
            <Link className="btn btn--quiet" href="/#modos">
              {d.seeModes}
            </Link>
          </div>
        </main>

        <aside className="docs-toc" aria-label={d.onThisPage}>
          <p className="docs-side__label">{d.onThisPage}</p>
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={
                activeId === item.id
                  ? "docs-toc__link docs-toc__link--active"
                  : "docs-toc__link"
              }
            >
              {item.title}
            </a>
          ))}
        </aside>
      </div>
    </div>
  );
}
