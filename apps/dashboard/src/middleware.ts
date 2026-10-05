import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Supabase Site URL mal configurada a veces deja `?code=` en `/`.
 * Mandamos el code al callback real.
 */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  if (code && (pathname === "/" || pathname === "")) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app"],
};
