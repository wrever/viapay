import { generatePrefixedId, resolveViaFeeBps } from "@viapay/shared";
import type { AuthContext } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin, throwSb, usesSupabase } from "@/lib/supabase-admin";

export type WaSessionState =
  | "idle"
  | "pick_contact"
  | "amount"
  | "asset"
  | "confirm"
  | "deliver";

export type WaDraft = {
  contact_id?: string;
  contact_name?: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  amount?: string;
  asset?: "XLM" | "USDC";
  /** NL disambiguation query */
  contact_query?: string;
  /** exact_pay lock from fiat quote (metadata.exact_pay) */
  exact_pay?: Record<string, unknown>;
  fiat_label?: string;
  /** exact-split reseller */
  reseller_fee_bps?: number;
  reseller_address?: string;
  reseller_label?: string;
  /** After charge created — delivery chooser */
  payment_intent_id?: string;
  checkout_url?: string;
  share_text?: string;
  cobro_code?: string;
};

export type WaSession = {
  phone_e164: string;
  account_id: string | null;
  state: WaSessionState;
  draft: WaDraft;
  updated_at: string;
};

export type WaLink = {
  id: string;
  account_id: string;
  phone_e164: string;
  status: string;
  linked_at: string;
};

function parseDraft(raw: unknown): WaDraft {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as WaDraft;
  }
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed && !Array.isArray(parsed)) {
      return parsed as WaDraft;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export async function getLinkByPhone(phoneE164: string): Promise<WaLink | null> {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("wa_links")
      .select("*")
      .eq("phone_e164", phoneE164)
      .eq("status", "active")
      .maybeSingle();
    throwSb(res.error, "wa_link lookup failed");
    if (!res.data) return null;
    return {
      id: String(res.data.id),
      account_id: String(res.data.account_id),
      phone_e164: String(res.data.phone_e164),
      status: String(res.data.status),
      linked_at: String(res.data.linked_at),
    };
  }
  const row = getDb()
    .prepare(
      `select * from wa_links where phone_e164 = ? and status = 'active'`,
    )
    .get(phoneE164) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    account_id: String(row.account_id),
    phone_e164: String(row.phone_e164),
    status: String(row.status),
    linked_at: String(row.linked_at),
  };
}

export async function getLinkForAccount(
  accountId: string,
): Promise<WaLink | null> {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("wa_links")
      .select("*")
      .eq("account_id", accountId)
      .eq("status", "active")
      .order("linked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    throwSb(res.error, "wa_link account lookup failed");
    if (!res.data) return null;
    return {
      id: String(res.data.id),
      account_id: String(res.data.account_id),
      phone_e164: String(res.data.phone_e164),
      status: String(res.data.status),
      linked_at: String(res.data.linked_at),
    };
  }
  const row = getDb()
    .prepare(
      `select * from wa_links where account_id = ? and status = 'active'
       order by linked_at desc limit 1`,
    )
    .get(accountId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    account_id: String(row.account_id),
    phone_e164: String(row.phone_e164),
    status: String(row.status),
    linked_at: String(row.linked_at),
  };
}

export async function createLinkCode(accountId: string): Promise<{
  code: string;
  expires_at: string;
}> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const id = generatePrefixedId("wac");
  const now = new Date();
  const expires = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const created = now.toISOString();

  if (usesSupabase()) {
    await getSupabaseAdmin()
      .from("wa_link_codes")
      .delete()
      .eq("account_id", accountId);
    const ins = await getSupabaseAdmin().from("wa_link_codes").insert({
      id,
      account_id: accountId,
      code,
      expires_at: expires,
      created_at: created,
    });
    throwSb(ins.error, "wa_link_code insert failed");
    return { code, expires_at: expires };
  }

  getDb()
    .prepare(`delete from wa_link_codes where account_id = ?`)
    .run(accountId);
  getDb()
    .prepare(
      `insert into wa_link_codes (id, account_id, code, expires_at, created_at)
       values (?, ?, ?, ?, ?)`,
    )
    .run(id, accountId, code, expires, created);
  return { code, expires_at: expires };
}

export async function consumeLinkCode(
  code: string,
  phoneE164: string,
): Promise<{ account_id: string } | null> {
  const now = new Date().toISOString();
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("wa_link_codes")
      .select("*")
      .eq("code", code)
      .gt("expires_at", now)
      .maybeSingle();
    throwSb(res.error, "wa_link_code lookup failed");
    if (!res.data) return null;
    const accountId = String(res.data.account_id);
    await getSupabaseAdmin()
      .from("wa_link_codes")
      .delete()
      .eq("account_id", accountId);

    // One active phone per account; one account per phone
    await getSupabaseAdmin()
      .from("wa_links")
      .update({ status: "revoked" })
      .eq("account_id", accountId)
      .eq("status", "active");
    await getSupabaseAdmin()
      .from("wa_links")
      .delete()
      .eq("phone_e164", phoneE164);

    const id = generatePrefixedId("wal");
    const ins = await getSupabaseAdmin().from("wa_links").insert({
      id,
      account_id: accountId,
      phone_e164: phoneE164,
      status: "active",
      linked_at: now,
      created_at: now,
    });
    throwSb(ins.error, "wa_link insert failed");
    return { account_id: accountId };
  }

  const row = getDb()
    .prepare(
      `select * from wa_link_codes where code = ? and expires_at > ?`,
    )
    .get(code, now) as { account_id: string } | undefined;
  if (!row) return null;
  getDb()
    .prepare(`delete from wa_link_codes where account_id = ?`)
    .run(row.account_id);
  getDb()
    .prepare(
      `update wa_links set status = 'revoked' where account_id = ? and status = 'active'`,
    )
    .run(row.account_id);
  getDb().prepare(`delete from wa_links where phone_e164 = ?`).run(phoneE164);
  const id = generatePrefixedId("wal");
  getDb()
    .prepare(
      `insert into wa_links (id, account_id, phone_e164, status, linked_at, created_at)
       values (?, ?, ?, 'active', ?, ?)`,
    )
    .run(id, row.account_id, phoneE164, now, now);
  return { account_id: row.account_id };
}

export async function getSession(phoneE164: string): Promise<WaSession> {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("wa_sessions")
      .select("*")
      .eq("phone_e164", phoneE164)
      .maybeSingle();
    throwSb(res.error, "wa_session lookup failed");
    if (!res.data) {
      return {
        phone_e164: phoneE164,
        account_id: null,
        state: "idle",
        draft: {},
        updated_at: new Date().toISOString(),
      };
    }
    return {
      phone_e164: String(res.data.phone_e164),
      account_id: (res.data.account_id as string | null) ?? null,
      state: (res.data.state as WaSessionState) ?? "idle",
      draft: parseDraft(res.data.draft),
      updated_at: String(res.data.updated_at),
    };
  }
  const row = getDb()
    .prepare(`select * from wa_sessions where phone_e164 = ?`)
    .get(phoneE164) as Record<string, unknown> | undefined;
  if (!row) {
    return {
      phone_e164: phoneE164,
      account_id: null,
      state: "idle",
      draft: {},
      updated_at: new Date().toISOString(),
    };
  }
  return {
    phone_e164: String(row.phone_e164),
    account_id: (row.account_id as string | null) ?? null,
    state: (row.state as WaSessionState) ?? "idle",
    draft: parseDraft(row.draft),
    updated_at: String(row.updated_at),
  };
}

export async function saveSession(
  phoneE164: string,
  patch: {
    account_id?: string | null;
    state: WaSessionState;
    draft?: WaDraft;
  },
): Promise<void> {
  const updated_at = new Date().toISOString();
  const draftJson = JSON.stringify(patch.draft ?? {});
  if (usesSupabase()) {
    const upsert = await getSupabaseAdmin().from("wa_sessions").upsert(
      {
        phone_e164: phoneE164,
        account_id: patch.account_id ?? null,
        state: patch.state,
        draft: draftJson,
        updated_at,
      },
      { onConflict: "phone_e164" },
    );
    throwSb(upsert.error, "wa_session upsert failed");
    return;
  }
  getDb()
    .prepare(
      `insert into wa_sessions (phone_e164, account_id, state, draft, updated_at)
       values (?, ?, ?, ?, ?)
       on conflict(phone_e164) do update set
         account_id = excluded.account_id,
         state = excluded.state,
         draft = excluded.draft,
         updated_at = excluded.updated_at`,
    )
    .run(
      phoneE164,
      patch.account_id ?? null,
      patch.state,
      draftJson,
      updated_at,
    );
}

export async function authContextForAccount(
  accountId: string,
): Promise<AuthContext | null> {
  if (usesSupabase()) {
    const acct = await getSupabaseAdmin()
      .from("accounts")
      .select("id, name")
      .eq("id", accountId)
      .maybeSingle();
    throwSb(acct.error, "account lookup failed");
    if (!acct.data) return null;
    const wallet = await getSupabaseAdmin()
      .from("wallets")
      .select("address")
      .eq("account_id", accountId)
      .order("verified_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    throwSb(wallet.error, "wallet lookup failed");
    return {
      accountId,
      apiKeyId: "whatsapp",
      mode: "test",
      feeBps: resolveViaFeeBps(process.env.FEE_BPS),
      merchantWallet: wallet.data?.address
        ? String(wallet.data.address)
        : null,
      accountName: String(acct.data.name),
    };
  }
  const acct = getDb()
    .prepare(`select id, name from accounts where id = ?`)
    .get(accountId) as { id: string; name: string } | undefined;
  if (!acct) return null;
  const wallet = getDb()
    .prepare(
      `select address from wallets where account_id = ?
       order by case when verified_at is null then 1 else 0 end, created_at asc
       limit 1`,
    )
    .get(accountId) as { address: string } | undefined;
  return {
    accountId,
    apiKeyId: "whatsapp",
    mode: "test",
    feeBps: resolveViaFeeBps(process.env.FEE_BPS),
    merchantWallet: wallet?.address ?? null,
    accountName: acct.name,
  };
}

/**
 * Claim a Meta wamid for processing. Returns false if already seen (retry).
 * Empty ids are treated as always-new (no dedup).
 */
export async function claimInboundMessage(input: {
  messageId: string;
  phoneE164: string;
  phoneNumberId: string | null;
}): Promise<boolean> {
  const messageId = input.messageId.trim();
  if (!messageId) return true;
  const created = new Date().toISOString();

  if (usesSupabase()) {
    const ins = await getSupabaseAdmin().from("wa_inbound_dedup").insert({
      message_id: messageId,
      phone_e164: input.phoneE164,
      phone_number_id: input.phoneNumberId,
      created_at: created,
    });
    if (ins.error) {
      // 23505 unique_violation → already processed
      if (ins.error.code === "23505") return false;
      throwSb(ins.error, "wa_inbound_dedup insert failed");
    }
    return true;
  }

  try {
    getDb()
      .prepare(
        `insert into wa_inbound_dedup (message_id, phone_e164, phone_number_id, created_at)
         values (?, ?, ?, ?)`,
      )
      .run(
        messageId,
        input.phoneE164,
        input.phoneNumberId,
        created,
      );
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE|unique/i.test(msg)) return false;
    throw e;
  }
}

export function parseVincularCode(body: string): string | null {
  const m = body.trim().match(/^vincular\s+(\d{6})$/i);
  return m?.[1] ?? null;
}

export { tryParseNewContact } from "./parse-contact";
