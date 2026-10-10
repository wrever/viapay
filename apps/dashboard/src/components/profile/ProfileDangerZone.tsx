"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";

export function ProfileDangerZone() {
  const { t } = useLocale();
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="profile-card profile-card--danger" data-testid="profile-session">
      <header className="profile-card__head">
        <h3 className="profile-card__title">{t.profileDangerTitle}</h3>
        <p className="profile-card__desc">{t.profileDangerDesc}</p>
      </header>
      <div className="profile-card__body">
        {!confirming ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirming(true)}
          >
            <LogOut className="size-4" aria-hidden />
            {t.signOut}
          </Button>
        ) : (
          <div className="profile-signout-confirm">
            <p className="profile-field-hint">{t.profileSignOutConfirm}</p>
            <div className="profile-form__actions">
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="destructive">
                  <LogOut className="size-4" aria-hidden />
                  {t.signOut}
                </Button>
              </form>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(false)}
              >
                {t.profileCancel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
