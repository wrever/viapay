import { redirect, notFound } from "next/navigation";

type CodeInfo = {
  status?: string;
  pay_url?: string;
  checkout_url?: string;
  payment_intent?: string;
  receipt_url?: string | null;
  error?: string;
};

async function loadCode(code: string): Promise<CodeInfo | null> {
  const api = (
    process.env.NEXT_PUBLIC_VIAPAY_API_URL || "https://viapay-api.vercel.app"
  ).replace(/\/$/, "");
  try {
    const res = await fetch(`${api}/v1/codes/${encodeURIComponent(code)}`, {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    return (await res.json()) as CodeInfo;
  } catch {
    return null;
  }
}

export default async function CobroCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const info = await loadCode(code);
  if (!info) notFound();

  if (info.status === "succeeded" && info.receipt_url) {
    redirect(info.receipt_url);
  }
  // Prefer hosted /pay (human). checkout_url is the agent gateway.
  if (info.pay_url) {
    redirect(info.pay_url);
  }
  if (info.checkout_url) {
    redirect(info.checkout_url);
  }
  notFound();
}
