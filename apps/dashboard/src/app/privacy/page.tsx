import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { panelLoginHref } from "@/lib/marketing/urls";
import "../marketing.css";

export const metadata: Metadata = {
  title: "Política de privacidad · ViaPay",
  description:
    "Política de privacidad de ViaPay: cobros non-custodial en Stellar, panel, API y WhatsApp.",
};

export default function PrivacyRoute() {
  return (
    <MarketingShell>
      <LegalPage docId="privacy" loginHref={panelLoginHref()} />
    </MarketingShell>
  );
}
