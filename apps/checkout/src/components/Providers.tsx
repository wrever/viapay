"use client";

import { LocaleProvider } from "@/lib/i18n";
import { PollarShell } from "@/components/PollarShell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <PollarShell>{children}</PollarShell>
    </LocaleProvider>
  );
}
