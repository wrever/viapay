import { redirect } from "next/navigation";
import { DEFAULT_FEE_BPS } from "@viapay/shared";
import { DashboardHome } from "@/components/DashboardHome";
import type { DashboardPayment } from "@/lib/payment-types";
import type { Readiness } from "@/lib/readiness";
import { API } from "@/lib/config";
import { getApiKey, getDemoSession } from "@/lib/session";
import { createSupabase, supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function apiReachable() {
  // En Vercel, localhost no existe: no intentar fetch (evita Application error).
  if (process.env.VERCEL && /localhost|127\.0\.0\.1/i.test(API)) {
    return false;
  }
  return Boolean(API);
}

async function loadPanelData(apiKey: string) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const [paymentsRes, readinessRes] = await Promise.all([
    fetch(`${API}/v1/payment_intents`, { headers, cache: "no-store" }),
    fetch(`${API}/v1/readiness`, { headers, cache: "no-store" }),
  ]);

  let payments: unknown[] = [];
  let readiness: Readiness | null = null;

  if (paymentsRes.ok) {
    const body = await paymentsRes.json();
    payments = body.data ?? [];
  }
  if (readinessRes.ok) readiness = await readinessRes.json();

  return { payments, readiness };
}

/** If panel cookies vanished but Supabase Auth is still alive, re-hydrate. */
async function ensurePanelSession() {
  const session = await getDemoSession();
  if (session) return session;
  if (!supabaseConfigured()) return null;
  try {
    const supabase = await createSupabase();
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) {
      redirect("/auth/restore?next=/app");
    }
  } catch {
    /* fall through to login */
  }
  return null;
}

export default async function HomePage() {
  const session = await ensurePanelSession();
  if (!session) redirect("/login");
  const apiKey = await getApiKey();

  let payments: unknown[] = [];
  let readiness: Readiness | null = null;

  if (apiKey && apiReachable()) {
    try {
      ({ payments, readiness } = await loadPanelData(apiKey));
    } catch {
      // API caída o inalcanzable: el panel sigue usable sin datos remotes.
    }
  }

  const feeBps = readiness?.fee_bps ?? DEFAULT_FEE_BPS;

  return (
    <DashboardHome
      sessionName={session.name}
      sessionEmail={session.email}
      apiKey={apiKey}
      payments={payments as DashboardPayment[]}
      readiness={readiness}
      feeBps={feeBps}
    />
  );
}
