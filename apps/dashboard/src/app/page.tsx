import { redirect } from "next/navigation";
import { DEFAULT_FEE_BPS } from "@viapay/shared";
import { DashboardHome } from "@/components/DashboardHome";
import type { Readiness } from "@/components/ReceiveNotice";
import { API } from "@/lib/config";
import { getApiKey, getDemoSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getDemoSession();
  if (!session) redirect("/login");
  const apiKey = await getApiKey();

  let payments: unknown[] = [];
  let readiness: Readiness | null = null;
  let webhooks: { id: string; url: string; status: string }[] = [];
  if (apiKey) {
    const headers = { Authorization: `Bearer ${apiKey}` };
    const [paymentsRes, readinessRes, webhookRes] = await Promise.all([
      fetch(`${API}/v1/payment_intents`, { headers, cache: "no-store" }),
      fetch(`${API}/v1/readiness`, { headers, cache: "no-store" }),
      fetch(`${API}/v1/webhook_endpoints`, { headers, cache: "no-store" }),
    ]);
    if (paymentsRes.ok) {
      const body = await paymentsRes.json();
      payments = body.data ?? [];
    }
    if (readinessRes.ok) readiness = await readinessRes.json();
    if (webhookRes.ok) {
      const body = await webhookRes.json();
      webhooks = body.data ?? [];
    }
  }

  const feeBps = readiness?.fee_bps ?? DEFAULT_FEE_BPS;

  return (
    <DashboardHome
      sessionName={session.name}
      apiKey={apiKey}
      payments={payments as never[]}
      readiness={readiness}
      webhooks={webhooks}
      feeBps={feeBps}
    />
  );
}
