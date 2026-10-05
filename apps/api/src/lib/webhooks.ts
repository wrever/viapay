import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { generatePrefixedId } from "@viapay/shared";
import { getDb } from "./db";
import { serializePaymentIntent, type PaymentIntentRow } from "./payments";
import { getSupabaseAdmin, throwSb, usesSupabase } from "./supabase-admin";

const MAX_ATTEMPTS = 5;
const TOLERANCE_SEC = 300;

export function webhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function signWebhook(secret: string, timestamp: number, body: string): string {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

export function verifyWebhookSignature(
  secret: string,
  header: string,
  body: string,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k, v];
    }),
  );
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!Number.isFinite(timestamp) || !signature) return false;
  if (Math.abs(nowSec - timestamp) > TOLERANCE_SEC) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createWebhookEndpoint(accountId: string, url: string) {
  assertWebhookUrl(url);
  const now = new Date().toISOString();
  const row = {
    id: generatePrefixedId("wh"),
    account_id: accountId,
    url,
    secret: webhookSecret(),
    status: "enabled",
    created_at: now,
  };

  if (usesSupabase()) {
    const ins = await getSupabaseAdmin().from("webhook_endpoints").insert(row);
    throwSb(ins.error, "webhook insert failed");
    return row;
  }

  getDb()
    .prepare(
      `insert into webhook_endpoints (id, account_id, url, secret, status, created_at)
       values (@id, @account_id, @url, @secret, @status, @created_at)`,
    )
    .run(row);
  return row;
}

export async function listWebhookEndpoints(accountId: string) {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("webhook_endpoints")
      .select("id, account_id, url, status, created_at")
      .eq("account_id", accountId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });
    throwSb(res.error, "list webhooks failed");
    return res.data ?? [];
  }
  return getDb()
    .prepare(
      `select id, account_id, url, status, created_at
       from webhook_endpoints where account_id = ? and status != 'deleted'
       order by created_at desc`,
    )
    .all(accountId);
}

export async function deleteWebhookEndpoint(accountId: string, id: string) {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("webhook_endpoints")
      .update({ status: "deleted" })
      .eq("id", id)
      .eq("account_id", accountId)
      .select("id");
    throwSb(res.error, "delete webhook failed");
    if (!res.data?.length) {
      throw Object.assign(new Error("Not found"), { status: 404 });
    }
    return;
  }
  const result = getDb()
    .prepare(
      `update webhook_endpoints set status = 'deleted' where id = ? and account_id = ?`,
    )
    .run(id, accountId);
  if (result.changes === 0) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
}

export async function listWebhookDeliveries(accountId: string) {
  if (usesSupabase()) {
    const events = await getSupabaseAdmin()
      .from("webhook_events")
      .select("id, type")
      .eq("account_id", accountId);
    throwSb(events.error, "list webhook events failed");
    const eventIds = (events.data ?? []).map((e) => e.id);
    if (eventIds.length === 0) return [];
    const eventType = new Map((events.data ?? []).map((e) => [e.id, e.type]));
    const deliveries = await getSupabaseAdmin()
      .from("webhook_deliveries")
      .select("id, status, attempts, last_error, created_at, event_id, endpoint_id")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
      .limit(20);
    throwSb(deliveries.error, "list deliveries failed");
    const endpointIds = [
      ...new Set((deliveries.data ?? []).map((d) => d.endpoint_id)),
    ];
    const endpoints =
      endpointIds.length === 0
        ? { data: [] as { id: string; url: string }[], error: null }
        : await getSupabaseAdmin()
            .from("webhook_endpoints")
            .select("id, url")
            .in("id", endpointIds);
    throwSb(endpoints.error, "list endpoints failed");
    const urlById = new Map((endpoints.data ?? []).map((e) => [e.id, e.url]));
    return (deliveries.data ?? []).map((d) => ({
      id: d.id,
      status: d.status,
      attempts: d.attempts,
      last_error: d.last_error,
      created_at: d.created_at,
      type: eventType.get(d.event_id) ?? "",
      url: urlById.get(d.endpoint_id) ?? "",
    }));
  }
  return getDb()
    .prepare(
      `select d.id, d.status, d.attempts, d.last_error, d.created_at, e.type, w.url
       from webhook_deliveries d
       join webhook_events e on e.id = d.event_id
       join webhook_endpoints w on w.id = d.endpoint_id
       where e.account_id = ?
       order by d.created_at desc
       limit 20`,
    )
    .all(accountId);
}

function assertWebhookUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw Object.assign(new Error("URL de webhook inválida"), { status: 400 });
  }
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !local) {
    throw Object.assign(new Error("El webhook debe ser https (localhost permitido)"), {
      status: 400,
    });
  }
}

export async function enqueuePaymentSucceeded(row: PaymentIntentRow) {
  if (usesSupabase()) {
    const db = getSupabaseAdmin();
    const endpoints = await db
      .from("webhook_endpoints")
      .select("id")
      .eq("account_id", row.account_id)
      .eq("status", "enabled");
    throwSb(endpoints.error, "list enabled webhooks failed");
    if (!endpoints.data?.length) return;
    const now = new Date().toISOString();
    const eventId = generatePrefixedId("evt");
    const payload = JSON.stringify({
      id: eventId,
      type: "payment_intent.succeeded",
      created_at: now,
      data: serializePaymentIntent(row),
    });
    const evt = await db.from("webhook_events").insert({
      id: eventId,
      account_id: row.account_id,
      type: "payment_intent.succeeded",
      payload,
      created_at: now,
    });
    throwSb(evt.error, "webhook event insert failed");
    const deliveries = endpoints.data.map((endpoint) => ({
      id: generatePrefixedId("whd"),
      event_id: eventId,
      endpoint_id: endpoint.id,
      status: "pending",
      attempts: 0,
      next_attempt_at: now,
      created_at: now,
    }));
    const ins = await db.from("webhook_deliveries").insert(deliveries);
    throwSb(ins.error, "webhook deliveries insert failed");
    void deliverDue().catch(() => undefined);
    return;
  }

  const endpoints = getDb()
    .prepare(
      `select id from webhook_endpoints where account_id = ? and status = 'enabled'`,
    )
    .all(row.account_id) as { id: string }[];
  if (endpoints.length === 0) return;
  const now = new Date().toISOString();
  const eventId = generatePrefixedId("evt");
  const payload = JSON.stringify({
    id: eventId,
    type: "payment_intent.succeeded",
    created_at: now,
    data: serializePaymentIntent(row),
  });
  const db = getDb();
  db.prepare(
    `insert into webhook_events (id, account_id, type, payload, created_at)
     values (?, ?, 'payment_intent.succeeded', ?, ?)`,
  ).run(eventId, row.account_id, payload, now);
  const insert = db.prepare(
    `insert into webhook_deliveries
      (id, event_id, endpoint_id, status, attempts, next_attempt_at, created_at)
     values (?, ?, ?, 'pending', 0, ?, ?)`,
  );
  for (const endpoint of endpoints) {
    insert.run(generatePrefixedId("whd"), eventId, endpoint.id, now, now);
  }
  void deliverDue().catch(() => undefined);
}

const BACKOFF_MS = [0, 30_000, 120_000, 600_000, 3_600_000];

export async function deliverDue() {
  type Due = {
    id: string;
    attempts: number;
    payload: string;
    url: string;
    secret: string;
    endpoint_status: string;
  };

  let due: Due[] = [];
  if (usesSupabase()) {
    const now = new Date().toISOString();
    const deliveries = await getSupabaseAdmin()
      .from("webhook_deliveries")
      .select("id, attempts, event_id, endpoint_id")
      .eq("status", "pending")
      .lte("next_attempt_at", now)
      .order("created_at", { ascending: true })
      .limit(10);
    throwSb(deliveries.error, "due deliveries failed");
    for (const d of deliveries.data ?? []) {
      const [event, endpoint] = await Promise.all([
        getSupabaseAdmin()
          .from("webhook_events")
          .select("payload")
          .eq("id", d.event_id)
          .maybeSingle(),
        getSupabaseAdmin()
          .from("webhook_endpoints")
          .select("url, secret, status")
          .eq("id", d.endpoint_id)
          .maybeSingle(),
      ]);
      if (!event.data || !endpoint.data) continue;
      due.push({
        id: d.id,
        attempts: d.attempts,
        payload: event.data.payload,
        url: endpoint.data.url,
        secret: endpoint.data.secret,
        endpoint_status: endpoint.data.status,
      });
    }
  } else {
    due = getDb()
      .prepare(
        `select d.id, d.attempts, e.payload, w.url, w.secret, w.status as endpoint_status
         from webhook_deliveries d
         join webhook_events e on e.id = d.event_id
         join webhook_endpoints w on w.id = d.endpoint_id
         where d.status = 'pending' and d.next_attempt_at <= ?
         order by d.created_at asc limit 10`,
      )
      .all(new Date().toISOString()) as Due[];
  }

  for (const delivery of due) {
    if (delivery.endpoint_status !== "enabled") {
      await markDelivery(delivery.id, "failed", delivery.attempts, "endpoint disabled", null);
      continue;
    }
    const timestamp = Math.floor(Date.now() / 1000);
    try {
      const res = await fetch(delivery.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ViaPay-Signature": signWebhook(delivery.secret, timestamp, delivery.payload),
        },
        body: delivery.payload,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        await markDelivery(delivery.id, "succeeded", delivery.attempts + 1, null, null);
      } else {
        await scheduleRetry(delivery.id, delivery.attempts + 1, `HTTP ${res.status}`);
      }
    } catch (error) {
      await scheduleRetry(
        delivery.id,
        delivery.attempts + 1,
        error instanceof Error ? error.message : "fetch failed",
      );
    }
  }
}

async function scheduleRetry(id: string, attempts: number, error: string) {
  if (attempts >= MAX_ATTEMPTS) {
    await markDelivery(id, "failed", attempts, error, null);
    return;
  }
  const next = new Date(Date.now() + (BACKOFF_MS[attempts] ?? 3_600_000)).toISOString();
  await markDelivery(id, "pending", attempts, error, next);
}

async function markDelivery(
  id: string,
  status: string,
  attempts: number,
  error: string | null,
  next: string | null,
) {
  if (usesSupabase()) {
    const upd = await getSupabaseAdmin()
      .from("webhook_deliveries")
      .update({
        status,
        attempts,
        last_error: error,
        next_attempt_at: next,
      })
      .eq("id", id);
    throwSb(upd.error, "mark delivery failed");
    return;
  }
  getDb()
    .prepare(
      `update webhook_deliveries
       set status = ?, attempts = ?, last_error = ?, next_attempt_at = ?
       where id = ?`,
    )
    .run(status, attempts, error, next, id);
}
