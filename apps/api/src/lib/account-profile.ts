import { getDb } from "./db";
import { getSupabaseAdmin, throwSb, usesSupabase } from "./supabase-admin";

export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  business_name: string | null;
  phone_e164: string | null;
  notify_email_paid: boolean;
  notify_wa_paid: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  merchant_wallet: string | null;
};

export type AccountProfilePatch = {
  name?: string;
  business_name?: string | null;
  phone_e164?: string | null;
  notify_email_paid?: boolean;
  notify_wa_paid?: boolean;
};

function mapRow(raw: Record<string, unknown>, merchantWallet: string | null): AccountProfile {
  return {
    id: String(raw.id),
    name: String(raw.name),
    email: String(raw.email),
    business_name:
      raw.business_name == null || raw.business_name === ""
        ? null
        : String(raw.business_name),
    phone_e164:
      raw.phone_e164 == null || raw.phone_e164 === ""
        ? null
        : String(raw.phone_e164),
    notify_email_paid: raw.notify_email_paid !== false && raw.notify_email_paid !== 0,
    notify_wa_paid: raw.notify_wa_paid !== false && raw.notify_wa_paid !== 0,
    status: String(raw.status ?? "active"),
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    merchant_wallet: merchantWallet,
  };
}

async function walletFor(accountId: string): Promise<string | null> {
  if (usesSupabase()) {
    const db = getSupabaseAdmin();
    const res = await db
      .from("wallets")
      .select("address")
      .eq("account_id", accountId)
      .order("verified_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    throwSb(res.error, "wallet lookup failed");
    return res.data?.address ? String(res.data.address) : null;
  }
  const row = getDb()
    .prepare(
      `select address from wallets where account_id = ?
       order by case when verified_at is null then 1 else 0 end, created_at asc
       limit 1`,
    )
    .get(accountId) as { address: string } | undefined;
  return row?.address ?? null;
}

export async function getAccountProfile(
  accountId: string,
): Promise<AccountProfile | null> {
  const wallet = await walletFor(accountId);

  if (usesSupabase()) {
    const db = getSupabaseAdmin();
    const res = await db
      .from("accounts")
      .select(
        "id, name, email, business_name, phone_e164, notify_email_paid, notify_wa_paid, status, created_at, updated_at",
      )
      .eq("id", accountId)
      .maybeSingle();
    throwSb(res.error, "account lookup failed");
    if (!res.data) return null;
    return mapRow(res.data as Record<string, unknown>, wallet);
  }

  const row = getDb()
    .prepare(
      `select id, name, email, business_name, phone_e164,
              notify_email_paid, notify_wa_paid, status, created_at, updated_at
       from accounts where id = ?`,
    )
    .get(accountId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapRow(row, wallet);
}

export async function updateAccountProfile(
  accountId: string,
  patch: AccountProfilePatch,
): Promise<AccountProfile> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name.length < 1 || name.length > 80) {
      throw Object.assign(new Error("name inválido (1–80)"), { status: 400 });
    }
    updates.name = name;
  }
  if (patch.business_name !== undefined) {
    const v = patch.business_name?.trim() || null;
    if (v && v.length > 120) {
      throw Object.assign(new Error("business_name demasiado largo"), {
        status: 400,
      });
    }
    updates.business_name = v;
  }
  if (patch.phone_e164 !== undefined) {
    const v = patch.phone_e164?.trim() || null;
    if (v && !/^\+[1-9]\d{6,14}$/.test(v)) {
      throw Object.assign(new Error("phone_e164 inválido (E.164)"), {
        status: 400,
      });
    }
    updates.phone_e164 = v;
  }
  if (patch.notify_email_paid !== undefined) {
    updates.notify_email_paid = Boolean(patch.notify_email_paid);
  }
  if (patch.notify_wa_paid !== undefined) {
    updates.notify_wa_paid = Boolean(patch.notify_wa_paid);
  }

  if (Object.keys(updates).length <= 1) {
    throw Object.assign(new Error("nada que actualizar"), { status: 400 });
  }

  if (usesSupabase()) {
    const db = getSupabaseAdmin();
    const res = await db
      .from("accounts")
      .update(updates)
      .eq("id", accountId)
      .select(
        "id, name, email, business_name, phone_e164, notify_email_paid, notify_wa_paid, status, created_at, updated_at",
      )
      .single();
    throwSb(res.error, "account update failed");
    if (!res.data) throw new Error("account update returned empty");
    const wallet = await walletFor(accountId);
    return mapRow(res.data as Record<string, unknown>, wallet);
  }

  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(updates)) {
    cols.push(`${k} = ?`);
    vals.push(typeof v === "boolean" ? (v ? 1 : 0) : v);
  }
  vals.push(accountId);
  getDb()
    .prepare(`update accounts set ${cols.join(", ")} where id = ?`)
    .run(...vals);

  const next = await getAccountProfile(accountId);
  if (!next) throw new Error("account missing after update");
  return next;
}
