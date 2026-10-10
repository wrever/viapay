"use client";

import type { ReactNode } from "react";

export function ProfileSaveBar({ children }: { children: ReactNode }) {
  return <div className="profile-form__actions profile-save-bar">{children}</div>;
}
