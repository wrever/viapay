import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { panelLoginHref } from "@/lib/marketing/urls";
import "../marketing.css";

export const metadata: Metadata = {
  title: "Términos y condiciones · ViaPay",
  description:
    "Términos de uso de ViaPay: panel, API, checkout, split, x402 y asistente de WhatsApp.",
};

export default function TermsRoute() {
  return (
    <MarketingShell>
      <LegalPage docId="terms" loginHref={panelLoginHref()} />
    </MarketingShell>
  );
}
