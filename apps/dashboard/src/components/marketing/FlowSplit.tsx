"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/marketing/i18n";

export type FlowKind = "split" | "link" | "agent" | "agent-simple";

type Leg = {
  path: string;
  drawClass: "flow__draw--a" | "flow__draw--b" | "flow__draw--c";
  tokenClass: "flow__token--a" | "flow__token--b" | "flow__token--c";
  tokenR: number;
  pinY: number;
  labelKey: "merchant" | "viapay" | "reseller";
  pct: string;
};

/** Destination pins sit at x=300; labels live to the right so thick strokes never cover them. */
const PIN_X = 300;
const LABEL_X = 316;

const SPLIT_STEM = "M24 150 H110";
const SPLIT_LEGS: Leg[] = [
  {
    path: "M110 150 C 190 150, 220 48, 300 48",
    drawClass: "flow__draw--a",
    tokenClass: "flow__token--a",
    tokenR: 7,
    pinY: 48,
    labelKey: "merchant",
    pct: "96%",
  },
  {
    path: "M110 150 H300",
    drawClass: "flow__draw--b",
    tokenClass: "flow__token--b",
    tokenR: 4,
    pinY: 150,
    labelKey: "viapay",
    pct: "1%",
  },
  {
    path: "M110 150 C 190 150, 220 252, 300 252",
    drawClass: "flow__draw--c",
    tokenClass: "flow__token--c",
    tokenR: 5,
    pinY: 252,
    labelKey: "reseller",
    pct: "3%",
  },
];

const LINK_STEM = "M24 120 H110";
const LINK_LEGS: Leg[] = [
  {
    path: "M110 120 C 190 120, 230 48, 300 48",
    drawClass: "flow__draw--a",
    tokenClass: "flow__token--a",
    tokenR: 7,
    pinY: 48,
    labelKey: "merchant",
    pct: "99%",
  },
  {
    path: "M110 120 C 190 120, 230 192, 300 192",
    drawClass: "flow__draw--b",
    tokenClass: "flow__token--b",
    tokenR: 4,
    pinY: 192,
    labelKey: "viapay",
    pct: "1%",
  },
];

/** Agent: straight rail into the x402 hub, then the fork (2 or 3 legs). */
const AGENT_TRUNK = "M24 150 H150";
const AGENT_LEGS: Leg[] = [
  {
    path: "M174 150 C 230 150, 250 48, 300 48",
    drawClass: "flow__draw--a",
    tokenClass: "flow__token--a",
    tokenR: 7,
    pinY: 48,
    labelKey: "merchant",
    pct: "96%",
  },
  {
    path: "M174 150 H300",
    drawClass: "flow__draw--b",
    tokenClass: "flow__token--b",
    tokenR: 4,
    pinY: 150,
    labelKey: "viapay",
    pct: "1%",
  },
  {
    path: "M174 150 C 230 150, 250 252, 300 252",
    drawClass: "flow__draw--c",
    tokenClass: "flow__token--c",
    tokenR: 5,
    pinY: 252,
    labelKey: "reseller",
    pct: "3%",
  },
];

const AGENT_SIMPLE_LEGS: Leg[] = [
  {
    path: "M174 150 C 230 150, 250 70, 300 70",
    drawClass: "flow__draw--a",
    tokenClass: "flow__token--a",
    tokenR: 7,
    pinY: 70,
    labelKey: "merchant",
    pct: "99%",
  },
  {
    path: "M174 150 C 230 150, 250 210, 300 210",
    drawClass: "flow__draw--b",
    tokenClass: "flow__token--b",
    tokenR: 4,
    pinY: 210,
    labelKey: "viapay",
    pct: "1%",
  },
];

const KIND_META: Record<
  FlowKind,
  {
    legs: Leg[];
    viewH: number;
    sourceY: number;
    sourceKey: "client" | "agent";
    ariaKey: "ariaLink" | "ariaSplit" | "ariaAgent" | "ariaAgentSimple";
    stem?: string;
    hub?: boolean;
  }
> = {
  split: {
    legs: SPLIT_LEGS,
    viewH: 300,
    sourceY: 150,
    sourceKey: "client",
    ariaKey: "ariaSplit",
    stem: SPLIT_STEM,
  },
  link: {
    legs: LINK_LEGS,
    viewH: 240,
    sourceY: 120,
    sourceKey: "client",
    ariaKey: "ariaLink",
    stem: LINK_STEM,
  },
  agent: {
    legs: AGENT_LEGS,
    viewH: 300,
    sourceY: 150,
    sourceKey: "agent",
    ariaKey: "ariaAgent",
    stem: AGENT_TRUNK,
    hub: true,
  },
  "agent-simple": {
    legs: AGENT_SIMPLE_LEGS,
    viewH: 280,
    sourceY: 150,
    sourceKey: "agent",
    ariaKey: "ariaAgentSimple",
    stem: AGENT_TRUNK,
    hub: true,
  },
};

/** Animated payment flow. Shared by Link, Split and Agent modes on the landing. */
export function FlowSplit({ kind = "link" }: { kind?: FlowKind }) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  const { t } = useLocale();
  const cfg = KIND_META[kind];
  const flow = t.flow;

  useEffect(() => {
    setRun(false);
  }, [kind]);

  useEffect(() => {
    const node = ref.current;
    if (!node || run) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRun(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [run, kind]);

  return (
    <div
      className="flow"
      ref={ref}
      data-run={run ? "true" : "false"}
      data-kind={kind}
    >
      <svg
        viewBox={`0 0 460 ${cfg.viewH}`}
        className="flow__svg"
        role="img"
        aria-label={flow[cfg.ariaKey]}
      >
        {cfg.stem && (
          <>
            <path className="flow__track" d={cfg.stem} />
            <path
              className="flow__draw flow__draw--stem"
              d={cfg.stem}
              pathLength={1}
            />
          </>
        )}

        {cfg.legs.map((leg) => (
          <path
            className="flow__track"
            d={leg.path}
            key={`t-${leg.labelKey}-${leg.pct}`}
          />
        ))}
        {cfg.legs.map((leg) => (
          <path
            key={`d-${leg.labelKey}-${leg.pct}`}
            className={`flow__draw ${leg.drawClass}`}
            d={leg.path}
            pathLength={1}
          />
        ))}
        {cfg.legs.map((leg) => (
          <circle
            key={`tok-${leg.labelKey}-${leg.pct}`}
            className={`flow__token ${leg.tokenClass}`}
            r={leg.tokenR}
          />
        ))}

        <circle className="flow__source" cx="24" cy={cfg.sourceY} r="9" />
        <text className="flow__from" x="24" y={cfg.sourceY + 28}>
          {flow[cfg.sourceKey]}
        </text>

        {cfg.hub && (
          <g className="flow__hub">
            <circle cx="150" cy="150" r="24" />
            <text x="150" y="144">
              402
            </text>
            <text className="flow__hub-sub" x="150" y="158">
              x402
            </text>
          </g>
        )}

        <g className="flow__pin">
          {cfg.legs.map((leg) => (
            <g key={`pin-${leg.labelKey}-${leg.pct}`}>
              <circle cx={PIN_X} cy={leg.pinY} r="6" />
              <text className="flow__pin-label" x={LABEL_X} y={leg.pinY - 6}>
                {flow[leg.labelKey]}
              </text>
              <text className="flow__pct" x={LABEL_X} y={leg.pinY + 12}>
                {leg.pct}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
