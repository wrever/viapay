/** Simple in-memory sliding window (per isolate). Enough for basic abuse guard. */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Throws `{ status: 429 }` when the key exceeds `limit` hits in `windowMs`.
 */
export function assertRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw Object.assign(new Error("Demasiadas solicitudes. Probá en un momento."), {
      status: 429,
    });
  }
}

/** Swap quote/build/send: 40 requests / minute / IP. */
export function assertSwapRateLimit(req: Request): void {
  assertRateLimit(`swap:${clientIp(req)}`, 40, 60_000);
}
