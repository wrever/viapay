"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";

export function ProfileDangerZone() {
  const { t } = useLocale();

  return (
    <section className="profile-card profile-card--danger">
      <header className="profile-card__head">
        <h3 className="profile-card__title">{t.profileDangerTitle}</h3>
        <p className="profile-card__desc">{t.profileDangerDesc}</p>
      </header>
      <div className="profile-card__body">
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="destructive">
            <LogOut className="size-4" aria-hidden />
            {t.signOut}
          </Button>
        </form>
      </div>
    </section>
  );
}
