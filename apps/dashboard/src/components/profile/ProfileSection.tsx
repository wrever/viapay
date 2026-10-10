"use client";

import type { ReactNode } from "react";

/** Shared card chrome for profile subsections. */
export function ProfileSection({
  id,
  title,
  desc,
  children,
  danger,
  testId,
}: {
  id?: string;
  title: ReactNode;
  desc?: string;
  children: ReactNode;
  danger?: boolean;
  testId?: string;
}) {
  return (
    <section
      className={`profile-card${danger ? " profile-card--danger" : ""}`}
      id={id}
      data-testid={testId}
    >
      <header className="profile-card__head">
        <h3 className="profile-card__title">{title}</h3>
        {desc ? <p className="profile-card__desc">{desc}</p> : null}
      </header>
      <div className="profile-card__body">{children}</div>
    </section>
  );
}
