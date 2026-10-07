import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.method !== "OPTIONS") return NextResponse.next();
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, Idempotency-Key, X-PAYMENT, X-Client-Secret",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
    },
  });
}

export const config = { matcher: "/v1/:path*" };
