import { NextResponse } from "next/server";
import { allowLocalLogin, publicOrigin } from "@/lib/origin";

/** Local mock login removed from product. Opt-in only via VIAPAY_ALLOW_LOCAL_LOGIN=1. */
export async function GET(req: Request) {
  const origin = publicOrigin(req);
  if (!allowLocalLogin()) {
    return NextResponse.redirect(`${origin}/login`);
  }
  return NextResponse.redirect(`${origin}/login?error=local_disabled`);
}
