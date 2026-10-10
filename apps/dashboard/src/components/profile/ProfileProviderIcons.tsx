"use client";

/** Compact provider marks for the security card. */
export function ProfileProviderIcons({ providers }: { providers: string[] }) {
  if (!providers.length) return null;
  return (
    <span className="profile-providers" aria-hidden>
      {providers.map((p) => (
        <span key={p} className={`profile-providers__pill is-${p.toLowerCase()}`}>
          {p.slice(0, 1).toUpperCase()}
        </span>
      ))}
    </span>
  );
}
