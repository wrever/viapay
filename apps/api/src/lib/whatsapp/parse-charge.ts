import type { FiatCode } from "@/lib/rates";

export type NaturalCharge = {
  scheme: "exact" | "exact_pay";
  /** Crypto amount (7 dec) when scheme=exact; unused for exact_pay until lock. */
  amount: string;
  /** Settlement asset on Stellar. */
  asset: "XLM" | "USDC";
  /** Contact name, email, or phone as typed after a/to/para. */
  contactQuery: string;
  fiatAmount?: string;
  fiatCurrency?: FiatCode;
  /** Optional marketplace reseller cut (exact-split). */
  resellerFeeBps?: number;
  resellerQuery?: string;
};

const FIAT_ALIASES: Record<string, FiatCode> = {
  clp: "CLP",
  peso: "CLP",
  pesos: "CLP",
  "peso chileno": "CLP",
  "pesos chilenos": "CLP",
  chile: "CLP",
  ars: "ARS",
  "peso argentino": "ARS",
  "pesos argentinos": "ARS",
  cop: "COP",
  "peso colombiano": "COP",
  "pesos colombianos": "COP",
  bob: "BOB",
  boliviano: "BOB",
  bolivianos: "BOB",
  mxn: "MXN",
  "peso mexicano": "MXN",
  "pesos mexicanos": "MXN",
  pen: "PEN",
  sol: "PEN",
  soles: "PEN",
  usd: "USD",
  dolar: "USD",
  dolares: "USD",
  dollar: "USD",
  dollars: "USD",
};

/**
 * Parse phrases like:
 * - "cobro 20 xlm a juanito"
 * - "cobro 20000 pesos a maria"
 * - "cobro 20000 clp en usdc a +569…"
 * - "cobrar 15 mil pesos chilenos a mail@x.com"
 * - "cobro 20000 pesos a juanito con hubby 7%"
 */
export function parseNaturalCharge(body: string): NaturalCharge | null {
  const text = body.trim().replace(/\s+/g, " ");
  if (!/^(?:cobr[ao]|cobrar|charge)\b/i.test(text)) return null;

  const { core, resellerFeeBps, resellerQuery } = stripResellerSuffix(text);

  const fiat = parseFiatCharge(core);
  if (fiat) {
    return { ...fiat, resellerFeeBps, resellerQuery };
  }

  const crypto = parseCryptoCharge(core);
  if (crypto) {
    return { ...crypto, resellerFeeBps, resellerQuery };
  }

  return null;
}

/** "… con hubby 7%" | "… con reseller 700 bps" | "… + hubby 7%" */
function stripResellerSuffix(text: string): {
  core: string;
  resellerFeeBps?: number;
  resellerQuery?: string;
} {
  const m = text.match(
    /\s+(?:con|with|\+)\s+([A-Za-z0-9_.-]{2,40})\s+(\d+(?:[.,]\d+)?)\s*(%|bps|pb)?\s*$/i,
  );
  if (!m) return { core: text };
  const resellerQuery = m[1]!.trim();
  let n = Number(m[2]!.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return { core: text };
  const unit = (m[3] || "%").toLowerCase();
  const resellerFeeBps =
    unit === "bps" || unit === "pb" ? Math.round(n) : Math.round(n * 100);
  if (resellerFeeBps <= 0 || resellerFeeBps >= 9900) return { core: text };
  const core = text.slice(0, m.index).trim();
  return { core, resellerFeeBps, resellerQuery };
}

function parseCryptoCharge(text: string): NaturalCharge | null {
  const re =
    /^(?:cobr[ao]|cobrar|charge)\s+(\d+(?:[.,]\d+)?)\s*(xlm|usdc)\s+(?:a|al|to|para)(?:\s+mi)?(?:\s+contacto)?(?:\s+llamad[oa])?\s+(.+)$/i;
  const m = text.match(re);
  if (!m) return null;
  const rawAmt = m[1]!.replace(",", ".");
  const num = Number(rawAmt);
  if (!Number.isFinite(num) || num <= 0 || num > 1_000_000) return null;
  const asset = m[2]!.toUpperCase() === "USDC" ? "USDC" : "XLM";
  const contactQuery = m[3]!.trim().replace(/[.?!,]+$/, "");
  if (contactQuery.length < 1 || contactQuery.length > 80) return null;
  return {
    scheme: "exact",
    amount: num.toFixed(7),
    asset,
    contactQuery,
  };
}

function parseFiatCharge(text: string): NaturalCharge | null {
  // cobro 20000 pesos [chilenos] [en usdc|xlm] a DEST
  // cobro 20.5 mil clp a DEST
  // cobro 15000 clp en usdc a DEST
  const re =
    /^(?:cobr[ao]|cobrar|charge)\s+(\d+(?:[.,]\d+)?)\s*(mil\s+)?(pesos?\s+chilenos?|pesos?\s+argentinos?|pesos?\s+colombianos?|pesos?\s+mexicanos?|pesos?|clp|ars|cop|bob|mxn|pen|soles?|bolivianos?|usd|d[oó]lares?|dollars?)\s*(?:(?:en|in|settle|liquidar(?:\s+en)?)\s+)?(usdc|xlm)?\s*(?:a|al|to|para)(?:\s+mi)?(?:\s+contacto)?(?:\s+llamad[oa])?\s+(.+)$/i;
  const m = text.match(re);
  if (!m) return null;

  let fiatNum = Number(m[1]!.replace(",", "."));
  if (m[2]) fiatNum *= 1000;
  if (!Number.isFinite(fiatNum) || fiatNum <= 0 || fiatNum > 5e8) return null;

  const fiatKey = m[3]!.trim().toLowerCase().replace(/\s+/g, " ");
  const fiatCurrency = FIAT_ALIASES[fiatKey];
  if (!fiatCurrency) return null;

  const settleRaw = m[4]?.toUpperCase();
  const asset: "XLM" | "USDC" =
    settleRaw === "XLM" ? "XLM" : "USDC"; /* default USDC for fiat quotes */

  const contactQuery = m[5]!.trim().replace(/[.?!,]+$/, "");
  if (contactQuery.length < 1 || contactQuery.length > 80) return null;

  return {
    scheme: "exact_pay",
    amount: "0", // filled after lockExactPayAmount
    asset,
    contactQuery,
    fiatAmount: String(fiatNum),
    fiatCurrency,
  };
}

export function mailtoInvoiceUrl(input: {
  email: string;
  subject: string;
  body: string;
}): string {
  return `mailto:${input.email}?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(input.body)}`;
}

export function panelLoginUrl(): string {
  const base =
    process.env.VIAPAY_CHECKOUT_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_VIAPAY_CHECKOUT_URL?.replace(/\/$/, "") ??
    "https://viapay.vercel.app";
  return `${base}/login`;
}

export function merchantOnboardingText(): string {
  const login = panelLoginUrl();
  return `Para COBRAR por este chat necesitás una cuenta ViaPay vinculada.

1) Creá o entrá: ${login}
2) Panel → Cobros → Generar código WhatsApp
3) Volvé y escribí: vincular 123456
4) Guardá tu wallet G… en Integración

Si te van a COBRAR a vos (sos el pagador), no hace falta cuenta: te llega el link y pagás con Freighter.

¿Ya tenés código? Pegalo acá: vincular 123456`;
}
