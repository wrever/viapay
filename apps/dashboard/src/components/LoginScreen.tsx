"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="w-full max-w-md">
        <div className="prefs-bar justify-center mb-4">
          <SiteControls />
        </div>
        <Logo variant="stacked" width={176} className="gate__logo" />
        <p className="mb-7 text-center text-[var(--text-2)]">{t.loginTagline}</p>

        <Card>
          <CardHeader>
            <CardTitle>{t.loginTitle}</CardTitle>
            <CardDescription>
              {oauth ? t.loginDescOauth : t.loginDescLocal}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
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
              <p className="text-center text-sm text-red-500" role="alert">
                {t.loginError(error)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
