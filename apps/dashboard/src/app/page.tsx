import { HomePage } from "@/components/marketing/HomePage";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { panelLoginHref } from "@/lib/marketing/urls";
import "./marketing.css";

const API =
  process.env.NEXT_PUBLIC_VIAPAY_API_URL ?? "http://localhost:3001";

export default function LandingPage() {
  return (
    <MarketingShell>
      <HomePage loginHref={panelLoginHref()} apiUrl={API} />
    </MarketingShell>
  );
}
