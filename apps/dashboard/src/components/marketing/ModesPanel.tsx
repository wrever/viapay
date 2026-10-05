"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FlowSplit } from "@/components/marketing/FlowSplit";
import { useLocale } from "@/lib/marketing/i18n";

type Mode = "link" | "split" | "agent";

const ORDER: Mode[] = ["link", "split", "agent"];
/** While the section is off-screen, advance every N ms. */
const ROTATE_MS = 4800;
/** Enough of the block must be visible to count as “watching”. */
const WATCH_RATIO = 0.28;

export function ModesPanel({
  loginHref,
  apiUrl,
}: {
  loginHref: string;
  apiUrl: string;
}) {
  const [mode, setMode] = useState<Mode>("link");
  const [watching, setWatching] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const base = useId();
  const { t } = useLocale();
  const modes: { id: Mode; label: string; title: string; sub: string }[] = [
    {
      id: "link",
      label: t.modes.link.label,
      title: t.modes.link.title,
      sub: t.modes.link.sub,
    },
    {
      id: "split",
      label: t.modes.split.label,
      title: t.modes.split.title,
      sub: t.modes.split.sub,
    },
    {
      id: "agent",
      label: t.modes.agent.label,
      title: t.modes.agent.title,
      sub: t.modes.agent.sub,
    },
  ];
  const current = modes.find((m) => m.id === mode)!;

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const visible =
          entry.isIntersecting && entry.intersectionRatio >= WATCH_RATIO;
        setWatching(visible);
      },
      {
        threshold: [0, 0.1, 0.2, 0.28, 0.4, 0.55, 0.75],
        rootMargin: "-8% 0px -8% 0px",
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    // User is looking at the section → only change when they click a tab.
    if (watching) return;

    const tick = window.setInterval(() => {
      setMode((prev) => ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length]!);
    }, ROTATE_MS);

    return () => window.clearInterval(tick);
  }, [watching]);

  function selectMode(next: Mode) {
    setMode(next);
  }

  return (
    <div
      className="modes"
      ref={rootRef}
      data-watching={watching ? "true" : "false"}
    >
      <div className="modes__bar" role="tablist" aria-label={t.modes.tabsAria}>
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            id={`${base}-tab-${m.id}`}
            aria-selected={mode === m.id}
            aria-controls={`${base}-panel-${m.id}`}
            className="modes__tab"
            data-active={mode === m.id ? "true" : "false"}
            onClick={() => selectMode(m.id)}
          >
            <span className="modes__tab-label">{m.label}</span>
            {mode === m.id && (
              <span className="modes__tab-progress" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      <div className="band__head modes__head">
        <h2 className="band__title" id={`${base}-title`}>
          {current.title}
        </h2>
        <p className="band__sub">{current.sub}</p>
      </div>

      <div
        className="modes__panel"
        role="tabpanel"
        id={`${base}-panel-${mode}`}
        aria-labelledby={`${base}-tab-${mode}`}
        key={mode}
      >
        {mode === "link" && <LinkMode loginHref={loginHref} />}
        {mode === "split" && <SplitMode />}
        {mode === "agent" && (
          <AgentMode loginHref={loginHref} apiUrl={apiUrl} />
        )}
      </div>
    </div>
  );
}

function Pct({
  children,
  accent,
}: {
  children: string;
  accent?: boolean;
}) {
  return (
    <span className={accent ? "leg__pct leg__pct--accent" : "leg__pct"}>
      {children}
    </span>
  );
}

function LinkMode({ loginHref }: { loginHref: string }) {
  const { t } = useLocale();
  const m = t.modes.link;

  return (
    <div className="split">
      <div className="receipt">
        <p className="receipt__label">{m.pays}</p>
        <p className="receipt__total">
          49,00<small>USDC</small>
        </p>
        <div className="leg">
          <p className="leg__who">
            {m.merchant} <Pct>99%</Pct>
            <small>{m.merchantSmall}</small>
          </p>
          <span className="leg__amount">48,51</span>
        </div>
        <div className="leg">
          <p className="leg__who">
            {m.viapay} <Pct>1%</Pct>
            <small>{m.viapaySmall}</small>
          </p>
          <span className="leg__amount">0,49</span>
        </div>
        <p className="receipt__foot">{m.foot}</p>
        <a className="modes__cta" href={loginHref}>
          {m.cta}
        </a>
      </div>

      <FlowSplit kind="link" />
    </div>
  );
}

function SplitMode() {
  const { t } = useLocale();
  const m = t.modes.split;

  return (
    <div className="split">
      <div className="receipt">
        <p className="receipt__label">{m.pays}</p>
        <p className="receipt__total">
          100,00<small>USDC</small>
        </p>
        <div className="leg">
          <p className="leg__who">
            {m.merchant} <Pct>96%</Pct>
            <small>{m.merchantSmall}</small>
          </p>
          <span className="leg__amount">96,00</span>
        </div>
        <div className="leg">
          <p className="leg__who">
            {m.viapay} <Pct>1%</Pct>
            <small>{m.viapaySmall}</small>
          </p>
          <span className="leg__amount">1,00</span>
        </div>
        <div className="leg">
          <p className="leg__who">
            {m.reseller} <Pct accent>3%</Pct>
            <small>{m.resellerSmall}</small>
          </p>
          <span className="leg__amount">3,00</span>
        </div>
        <p className="receipt__foot">{m.foot}</p>
      </div>

      <FlowSplit kind="split" />
    </div>
  );
}

function AgentMode({
  loginHref,
}: {
  loginHref: string;
  apiUrl: string;
}) {
  const { t } = useLocale();
  const m = t.modes.agent;
  const [withPartner, setWithPartner] = useState(false);

  return (
    <div className="split">
      <div className="receipt">
        <div
          className="modes__switch"
          role="tablist"
          aria-label={m.toggleAria}
        >
          <button
            type="button"
            role="tab"
            aria-selected={!withPartner}
            className="modes__switch-btn"
            onClick={() => setWithPartner(false)}
          >
            {m.toggleSimple}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={withPartner}
            className="modes__switch-btn"
            onClick={() => setWithPartner(true)}
          >
            {m.toggleSplit}
          </button>
        </div>

        <p className="receipt__label">{m.pays}</p>
        <p className="receipt__total">
          100,00<small>USDC</small>
        </p>

        {withPartner ? (
          <>
            <div className="leg">
              <p className="leg__who">
                {m.merchant} <Pct>96%</Pct>
                <small>{m.merchantSmall}</small>
              </p>
              <span className="leg__amount">96,00</span>
            </div>
            <div className="leg">
              <p className="leg__who">
                {m.viapay} <Pct>1%</Pct>
                <small>{m.viapaySmall}</small>
              </p>
              <span className="leg__amount">1,00</span>
            </div>
            <div className="leg">
              <p className="leg__who">
                {m.reseller} <Pct accent>3%</Pct>
                <small>{m.resellerSmall}</small>
              </p>
              <span className="leg__amount">3,00</span>
            </div>
            <p className="receipt__foot">{m.footSplit}</p>
          </>
        ) : (
          <>
            <div className="leg">
              <p className="leg__who">
                {m.merchant} <Pct>99%</Pct>
                <small>{m.merchantSmall}</small>
              </p>
              <span className="leg__amount">99,00</span>
            </div>
            <div className="leg">
              <p className="leg__who">
                {m.viapay} <Pct>1%</Pct>
                <small>{m.viapaySmall}</small>
              </p>
              <span className="leg__amount">1,00</span>
            </div>
            <p className="receipt__foot">{m.footSimple}</p>
          </>
        )}

        <a className="modes__cta" href={loginHref}>
          {m.cta}
        </a>
      </div>

      <FlowSplit kind={withPartner ? "agent" : "agent-simple"} />
    </div>
  );
}
