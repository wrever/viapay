import type { Metadata } from "next";
import { CheckoutLocaleProvider } from "@/lib/checkout/i18n";
import { PollarShell } from "@/components/checkout/PollarShell";
import "../checkout.css";

export const metadata: Metadata = {
  title: "Pagar con ViaPay",
  description: "Paga en Stellar firmando una sola transacción.",
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <CheckoutLocaleProvider>
      <PollarShell>
        <div className="checkout-page">{children}</div>
      </PollarShell>
    </CheckoutLocaleProvider>
  );
}
