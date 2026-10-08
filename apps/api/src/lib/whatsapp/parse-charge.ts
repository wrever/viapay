export type NaturalCharge = {
  amount: string;
  asset: "XLM" | "USDC";
  contactQuery: string;
};

/**
 * Parse phrases like:
 * - "cobro 20 xlm a juanito"
 * - "cobrar 20.5 USDC a mi contacto llamado Juan Pérez"
 * - "charge 10 xlm to maria"
 */
export function parseNaturalCharge(body: string): NaturalCharge | null {
  const text = body.trim().replace(/\s+/g, " ");
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
    amount: num.toFixed(7),
    asset,
    contactQuery,
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

