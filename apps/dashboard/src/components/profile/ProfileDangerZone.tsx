"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { ProfileSection } from "./ProfileSection";

export function ProfileDangerZone() {
  const { t } = useLocale();
  const [confirming, setConfirming] = useState(false);

  return (
    <ProfileSection
      title={t.profileDangerTitle}
      desc={t.profileDangerDesc}
      danger
      testId="profile-session"
    >
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
    </ProfileSection>
  );
}
