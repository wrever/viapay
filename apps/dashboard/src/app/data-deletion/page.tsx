import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { panelLoginHref } from "@/lib/marketing/urls";
import "../marketing.css";

export const metadata: Metadata = {
  title: "Eliminación de datos · ViaPay",
  description:
    "Cómo solicitar la eliminación de datos personales en ViaPay (Meta / WhatsApp / cuenta).",
};

export default function DataDeletionRoute() {
  return (
    <MarketingShell>
      <LegalPage docId="data-deletion" loginHref={panelLoginHref()} />
    </MarketingShell>
  );
}
