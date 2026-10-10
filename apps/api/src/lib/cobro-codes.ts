/**
 * Short human codes VP-XXXX → payment_intent (anti-comprobante status checks).
 */
import { getDb } from "./db";
import { getSupabaseAdmin, throwSb, usesSupabase } from "./supabase-admin";
import type { PaymentIntentRow } from "./payments";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCobroCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    out += ALPHABET[b % ALPHABET.length]!;
  }
  return `VP-${out}`;
}

export async function attachCobroCode(
  paymentIntentId: string,
  code: string,
): Promise<void> {
  const now = new Date().toISOString();
  if (usesSupabase()) {
    const sb = getSupabaseAdmin();
    const res = await sb.from("payment_codes").upsert(
      {
        code,
        payment_intent_id: paymentIntentId,
        created_at: now,
      },
      { onConflict: "code" },
    );
    throwSb(res.error, "payment_codes upsert failed");
    return;
  }
  getDb()
    .prepare(
      `insert or replace into payment_codes (code, payment_intent_id, created_at) values (?, ?, ?)`,
    )
    .run(code, paymentIntentId, now);
}

export async function resolveCobroCode(
  codeRaw: string,
): Promise<PaymentIntentRow | null> {
  const code = codeRaw.trim().toUpperCase();
  if (!/^VP-[A-Z0-9]{4,8}$/.test(code)) return null;

  let intentId: string | null = null;
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_codes")
      .select("payment_intent_id")
      .eq("code", code)
      .maybeSingle();
    throwSb(res.error, "payment_codes lookup failed");
    intentId = (res.data?.payment_intent_id as string) || null;
  } else {
    const row = getDb()
      .prepare(`select payment_intent_id from payment_codes where code = ?`)
      .get(code) as { payment_intent_id?: string } | undefined;
    intentId = row?.payment_intent_id ?? null;
  }
  if (!intentId) return null;
  // Dynamic import avoids circular dep with payments.ts (create → attachCobroCode).
  const { getPaymentIntentById } = await import("./payments");
  return getPaymentIntentById(intentId);
}

export function parseEstadoQuery(text: string): string | null {
  const t = text.trim();
  const m = t.match(/^(?:estado|status|check)\s+(VP-[A-Za-z0-9]{4,8}|pi_[A-Za-z0-9_]+)\s*$/i);
  if (m) return m[1]!;
  if (/^VP-[A-Za-z0-9]{4,8}$/i.test(t)) return t;
  return null;
}
