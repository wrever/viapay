"use client";

import { Logo } from "@/components/Logo";
import { SiteControls, useLocale } from "@/lib/i18n";

export function CheckoutProblem({
  message,
  kind,
}: {
  message?: string;
  kind?: "incomplete" | "load";
}) {
  const { t } = useLocale();
  const text =
    message ??
    (kind === "incomplete" ? t.incompleteLink : t.loadError);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="prefs-bar">
        <SiteControls />
      </div>
      <div className="receipt">
        <Logo variant="icon" width={208} className="receipt__mark" alt="" />
        <div className="receipt__body">
          <span className="brand-lockup">
            <Logo variant="horizontal" width={104} />
          </span>
          <h1 className="title mt-5 text-xl">{t.problemTitle}</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>
            {text}
          </p>
        </div>
      </div>
    </main>
  );
}
