import { CheckoutProblem } from "@/components/checkout/CheckoutProblem";
import { PayPanel } from "@/components/checkout/PayPanel";
import { API } from "@/lib/config";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cs?: string; client_secret?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const cs = sp.cs ?? sp.client_secret;

  if (!cs) {
    return <CheckoutProblem kind="incomplete" />;
  }

  if (process.env.VERCEL && /localhost|127\.0\.0\.1/i.test(API)) {
    return <CheckoutProblem kind="load" />;
  }

  const res = await fetch(
    `${API}/v1/checkout/${id}?client_secret=${encodeURIComponent(cs)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return (
      <CheckoutProblem message={(body as { error?: string }).error} />
    );
  }

  const intent = await res.json();
  const x402Url =
    typeof intent.x402_url === "string"
      ? intent.x402_url
      : `${API}/v1/x402/${id}?client_secret=${encodeURIComponent(cs)}`;

  return (
    <>
      {/* Machine-readable: agents that open the human checkout discover x402 here. */}
      <link rel="payment" href={x402Url} />
      <link
        rel="alternate"
        type="application/vnd.viapay.x402+json"
        href={x402Url}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://viapay.vercel.app/ns",
            "@type": "PaymentIntent",
            id: intent.id,
            amount: intent.amount,
            asset: intent.asset,
            status: intent.status,
            checkout_url: intent.checkout_url ?? x402Url,
            pay_url: intent.pay_url ?? undefined,
            x402_url: x402Url,
          }),
        }}
      />
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10">
        <PayPanel intent={intent} />
      </main>
    </>
  );
}
