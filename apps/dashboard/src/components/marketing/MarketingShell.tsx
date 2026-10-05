"use client";

import { LocaleProvider } from "@/lib/marketing/i18n";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
