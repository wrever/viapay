"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { SiteControls, useLocale } from "@/lib/i18n";

export function LoginScreen({
  oauth,
  error,
}: {
  oauth: boolean;
  error?: string | null;
}) {
  const { t } = useLocale();

  return (
    <main className="gate">
      <div className="gate__card">
        <div className="prefs-bar mb-5 justify-center">
          <SiteControls />
        </div>
        <Logo variant="stacked" width={168} className="gate__logo" />
        <p className="gate__tagline">{t.loginTagline}</p>

        <div className="gate__panel">
          <h1 className="panel-title">{t.loginTitle}</h1>
          <p>{oauth ? t.loginDescOauth : t.loginDescLocal}</p>

          <div className="gate__actions">
            {oauth ? (
              <>
                <Button asChild size="lg" className="w-full">
                  <Link href="/auth/oauth?provider=google">
                    {t.continueGoogle}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full">
                  <Link href="/auth/oauth?provider=github">
                    {t.continueGithub}
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-center text-sm text-[var(--text-2)]">
                {t.loginOauthHint}
              </p>
            )}
            {error && (
              <p
                className="text-center text-sm text-[var(--error)]"
                role="alert"
              >
                {t.loginError(error)}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
