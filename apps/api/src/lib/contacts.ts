import { generatePrefixedId } from "@viapay/shared";
import { getDb } from "./db";
import { getSupabaseAdmin, throwSb, usesSupabase } from "./supabase-admin";

export type ContactRow = {
  id: string;
  account_id: string;
  display_name: string;
  phone_e164: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let p = raw.trim().replace(/^whatsapp:/i, "").replace(/[\s()-]/g, "");
  if (!p.startsWith("+")) {
    if (/^\d{8,15}$/.test(p)) p = `+${p}`;
    else return null;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(p)) return null;
  return p;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const e = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

function mapRow(raw: Record<string, unknown>): ContactRow {
  return {
    id: String(raw.id),
    account_id: String(raw.account_id),
    display_name: String(raw.display_name),
    phone_e164: (raw.phone_e164 as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    notes: (raw.notes as string | null) ?? null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export function serializeContact(row: ContactRow) {
  return {
    id: row.id,
    object: "contact" as const,
    display_name: row.display_name,
    phone_e164: row.phone_e164,
    email: row.email,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listContacts(accountId: string): Promise<ContactRow[]> {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("contacts")
      .select("*")
      .eq("account_id", accountId)
      .order("display_name", { ascending: true })
      .limit(100);
    throwSb(res.error, "list contacts failed");
    return (res.data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  }
  const rows = getDb()
    .prepare(
      `select * from contacts where account_id = ? order by display_name asc limit 100`,
    )
    .all(accountId) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export async function getContact(
  accountId: string,
  id: string,
): Promise<ContactRow | null> {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("contacts")
      .select("*")
      .eq("account_id", accountId)
      .eq("id", id)
      .maybeSingle();
    throwSb(res.error, "get contact failed");
    return res.data ? mapRow(res.data as Record<string, unknown>) : null;
  }
  const row = getDb()
    .prepare(`select * from contacts where account_id = ? and id = ?`)
    .get(accountId, id) as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export async function createContact(
  accountId: string,
  input: {
    display_name: string;
    phone_e164?: string | null;
    email?: string | null;
    notes?: string | null;
  },
): Promise<ContactRow> {
  const name = input.display_name.trim();
  if (name.length < 1 || name.length > 80) {
    throw Object.assign(new Error("display_name inválido"), { status: 400 });
  }
  const phone = normalizePhone(input.phone_e164 ?? null);
  const email = normalizeEmail(input.email ?? null);
  if (!phone && !email) {
    throw Object.assign(new Error("Pasá phone_e164 o email del contacto"), {
      status: 400,
    });
  }
  const id = generatePrefixedId("ct");
  const now = new Date().toISOString();
  const row: ContactRow = {
    id,
    account_id: accountId,
    display_name: name,
    phone_e164: phone,
    email,
    notes: input.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  if (usesSupabase()) {
    const ins = await getSupabaseAdmin().from("contacts").insert(row);
    throwSb(ins.error, "contact insert failed");
    return row;
  }
  getDb()
    .prepare(
      `insert into contacts (id, account_id, display_name, phone_e164, email, notes, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.account_id,
      row.display_name,
      row.phone_e164,
      row.email,
      row.notes,
      row.created_at,
      row.updated_at,
    );
  return row;
}

export async function updateContact(
  accountId: string,
  id: string,
  input: {
    display_name?: string;
    phone_e164?: string | null;
    email?: string | null;
    notes?: string | null;
  },
): Promise<ContactRow> {
  const existing = await getContact(accountId, id);
  if (!existing) {
    throw Object.assign(new Error("Contacto no encontrado"), { status: 404 });
  }
  const display_name =
    input.display_name !== undefined
      ? input.display_name.trim()
      : existing.display_name;
  if (display_name.length < 1 || display_name.length > 80) {
    throw Object.assign(new Error("display_name inválido"), { status: 400 });
  }
  const phone =
    input.phone_e164 !== undefined
      ? normalizePhone(input.phone_e164)
      : existing.phone_e164;
  const email =
    input.email !== undefined
      ? normalizeEmail(input.email)
      : existing.email;
  if (!phone && !email) {
    throw Object.assign(new Error("El contacto necesita phone_e164 o email"), {
      status: 400,
    });
  }
  const notes =
    input.notes !== undefined ? input.notes?.trim() || null : existing.notes;
  const updated_at = new Date().toISOString();
  const row: ContactRow = {
    ...existing,
    display_name,
    phone_e164: phone,
    email,
    notes,
    updated_at,
  };

  if (usesSupabase()) {
    const upd = await getSupabaseAdmin()
      .from("contacts")
      .update({
        display_name: row.display_name,
        phone_e164: row.phone_e164,
        email: row.email,
        notes: row.notes,
        updated_at: row.updated_at,
      })
      .eq("id", id)
      .eq("account_id", accountId);
    throwSb(upd.error, "contact update failed");
    return row;
  }
  getDb()
    .prepare(
      `update contacts set display_name = ?, phone_e164 = ?, email = ?, notes = ?, updated_at = ?
       where id = ? and account_id = ?`,
    )
    .run(
      row.display_name,
      row.phone_e164,
      row.email,
      row.notes,
      row.updated_at,
      id,
      accountId,
    );
  return row;
}

export async function deleteContact(
  accountId: string,
  id: string,
): Promise<void> {
  if (usesSupabase()) {
    const del = await getSupabaseAdmin()
      .from("contacts")
      .delete()
      .eq("id", id)
      .eq("account_id", accountId);
    throwSb(del.error, "contact delete failed");
    return;
  }
  const r = getDb()
    .prepare(`delete from contacts where id = ? and account_id = ?`)
    .run(id, accountId);
  if (r.changes === 0) {
    throw Object.assign(new Error("Contacto no encontrado"), { status: 404 });
  }
}
