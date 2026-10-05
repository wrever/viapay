"use client";

import { Logo } from "@/components/Logo";
import { ModesPanel } from "@/components/ModesPanel";
import { SiteControls, useLocale } from "@/lib/i18n";

export function HomePage({
  loginHref,
  apiUrl,
}: {
  loginHref: string;
  apiUrl: string;
}) {
  const { t } = useLocale();

  return (
    <>
      <section className="hero">
        <div className="shell">
          <nav className="nav rise rise--1">
            <a className="brand" href="/" aria-label={t.nav.homeAria}>
              <Logo variant="horizontal" width={128} alt="" />
            </a>
            <div className="nav__links">
              <a href="#como-funciona">{t.nav.how}</a>
              <a href="#modos">{t.nav.modes}</a>
              <a href="/docs">{t.nav.docs}</a>
            </div>
            <div className="nav__end">
              <SiteControls />
              <a className="btn btn--quiet btn--sm" href={loginHref}>
                {t.nav.login}
              </a>
            </div>
          </nav>

          <div className="hero__grid">
            <div>
              <h1 className="hero__headline rise rise--2">
                {t.hero.headlineBefore}
                <em>{t.hero.headlineEm}</em>
                {t.hero.headlineAfter}
              </h1>
              <p className="hero__lede rise rise--3">{t.hero.lede}</p>
              <div className="hero__actions rise rise--4">
                <a className="btn btn--primary" href={loginHref}>
                  {t.hero.ctaPrimary}
                </a>
                <a className="btn btn--quiet" href="#modos">
                  {t.hero.ctaSecondary}
                </a>
              </div>
              <p className="hero__note via-label rise rise--4">{t.hero.note}</p>
            </div>

            <div className="hero__stage" aria-hidden="true">
              <span className="hero__halo" />
              <Logo
                variant="icon"
                width={520}
                className="hero__logo"
                alt=""
              />
            </div>
          </div>
        </div>
      </section>

      <main id="contenido">
        <section className="band band--sunk" id="como-funciona">
          <div className="shell">
            <div className="band__head">
              <h2 className="band__title">{t.how.title}</h2>
              <p className="band__sub">{t.how.sub}</p>
            </div>

            <ol className="rail">
              {t.how.steps.map((step) => (
                <li className="station" key={step.step}>
                  <p className="station__step">{step.step}</p>
                  <h3 className="station__title">{step.title}</h3>
                  <p className="station__body">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band" id="modos">
          <div className="shell">
            <ModesPanel loginHref={loginHref} apiUrl={apiUrl} />
          </div>
        </section>

        <section className="band close">
          <div className="shell close__inner">
            <span className="close__mark">
              <Logo variant="icon" width={120} alt="" />
            </span>
            <div>
              <h2 className="close__title">{t.close.title}</h2>
              <p className="close__body">{t.close.body}</p>
            </div>
            <a className="btn btn--primary" href={loginHref}>
              {t.close.cta}
            </a>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="shell">
          <div className="foot__grid">
            <div className="foot__brand">
              <a className="brand" href="/" aria-label={t.nav.homeAria}>
                <Logo variant="horizontal" width={112} alt="" />
              </a>
              <p>{t.foot.blurb}</p>
            </div>

            <div className="foot__col">
              <p className="foot__label">{t.foot.product}</p>
              <a href="#modos">{t.foot.modes}</a>
              <a href="/docs">{t.foot.docs}</a>
              <a href={loginHref}>{t.foot.panel}</a>
            </div>

            <div className="foot__col">
              <p className="foot__label">{t.foot.developers}</p>
              <a href="/docs#api">{t.docs.apiRef}</a>
              <a href="/docs#redirect">{t.foot.redirect}</a>
              <a href="/docs">{t.foot.docs}</a>
            </div>

            <div className="foot__col">
              <p className="foot__label">{t.foot.company}</p>
              <a href={`${apiUrl}/v1/health`}>{t.foot.api}</a>
              <a href="mailto:hello@viapay.dev">{t.foot.support}</a>
            </div>
          </div>

          <div className="foot__bottom">
            <p className="foot__rights">{t.foot.rights}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
