import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { generatePrefixedId } from "@viapay/shared";
import { getDb } from "./db";
import { serializePaymentIntent, type PaymentIntentRow } from "./payments";

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

export function createWebhookEndpoint(accountId: string, url: string) {
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
  getDb()
    .prepare(
      `insert into webhook_endpoints (id, account_id, url, secret, status, created_at)
       values (@id, @account_id, @url, @secret, @status, @created_at)`,
    )
    .run(row);
  return row;
}

export function listWebhookEndpoints(accountId: string) {
  return getDb()
    .prepare(
      `select id, account_id, url, status, created_at
       from webhook_endpoints where account_id = ? and status != 'deleted'
       order by created_at desc`,
    )
    .all(accountId);
}

export function deleteWebhookEndpoint(accountId: string, id: string) {
  const result = getDb()
    .prepare(
      `update webhook_endpoints set status = 'deleted' where id = ? and account_id = ?`,
    )
    .run(id, accountId);
  if (result.changes === 0) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
}

export function listWebhookDeliveries(accountId: string) {
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

export function enqueuePaymentSucceeded(row: PaymentIntentRow) {
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
  const due = getDb()
    .prepare(
      `select d.id, d.attempts, e.payload, w.url, w.secret, w.status as endpoint_status
       from webhook_deliveries d
       join webhook_events e on e.id = d.event_id
       join webhook_endpoints w on w.id = d.endpoint_id
       where d.status = 'pending' and d.next_attempt_at <= ?
       order by d.created_at asc limit 10`,
    )
    .all(new Date().toISOString()) as Array<{
    id: string;
    attempts: number;
    payload: string;
    url: string;
    secret: string;
    endpoint_status: string;
  }>;

  for (const delivery of due) {
    if (delivery.endpoint_status !== "enabled") {
      markDelivery(delivery.id, "failed", delivery.attempts, "endpoint disabled", null);
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
        markDelivery(delivery.id, "succeeded", delivery.attempts + 1, null, null);
      } else {
        scheduleRetry(delivery.id, delivery.attempts + 1, `HTTP ${res.status}`);
      }
    } catch (error) {
      scheduleRetry(
        delivery.id,
        delivery.attempts + 1,
        error instanceof Error ? error.message : "fetch failed",
      );
    }
  }
}

function scheduleRetry(id: string, attempts: number, error: string) {
  if (attempts >= MAX_ATTEMPTS) {
    markDelivery(id, "failed", attempts, error, null);
    return;
  }
  const next = new Date(Date.now() + (BACKOFF_MS[attempts] ?? 3_600_000)).toISOString();
  markDelivery(id, "pending", attempts, error, next);
}

function markDelivery(
  id: string,
  status: string,
  attempts: number,
  error: string | null,
  next: string | null,
) {
  getDb()
    .prepare(
      `update webhook_deliveries
       set status = ?, attempts = ?, last_error = ?, next_attempt_at = ?
       where id = ?`,
    )
    .run(status, attempts, error, next, id);
}
