import { DocsPage } from "@/components/marketing/DocsPage";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { panelLoginHref } from "@/lib/marketing/urls";
import "../marketing.css";

export default function DocsRoute() {
  return (
    <MarketingShell>
      <DocsPage loginHref={panelLoginHref()} />
    </MarketingShell>
  );
}
