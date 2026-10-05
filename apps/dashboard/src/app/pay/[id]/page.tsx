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

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10">
      <PayPanel intent={intent} />
    </main>
  );
}
