import { HomePage } from "@/components/HomePage";
import { panelLoginHref } from "@/lib/urls";

const API =
  process.env.NEXT_PUBLIC_VIAPAY_API_URL ?? "http://localhost:3001";

export default function Home() {
  return <HomePage loginHref={panelLoginHref()} apiUrl={API} />;
}
