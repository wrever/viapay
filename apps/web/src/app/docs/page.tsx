import { DocsPage } from "@/components/DocsPage";
import { panelLoginHref } from "@/lib/urls";

export default function DocsRoute() {
  return <DocsPage loginHref={panelLoginHref()} />;
}
