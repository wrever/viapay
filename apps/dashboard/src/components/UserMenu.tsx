"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, User, Wallet } from "lucide-react";
import { useLocale } from "@/lib/i18n";

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  }
  if (parts[0] && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const e = email.trim();
  if (e.length >= 2) return e.slice(0, 2).toUpperCase();
  return "VP";
}

export function UserMenu({
  name,
  email,
  onGoProfile,
  onGoIntegracion,
}: {
  name: string;
  email: string;
  onGoProfile: () => void;
  onGoIntegracion: () => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mark = initials(name, email);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-label={t.profileMenuAria}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-menu__avatar" aria-hidden>
          {mark}
        </span>
        <span className="user-menu__who">
          <span className="user-menu__name">{name}</span>
          <span className="user-menu__email">{email}</span>
        </span>
        <ChevronDown className="user-menu__chev size-3.5" aria-hidden />
      </button>

      {open && (
        <div className="user-menu__panel" role="menu">
          <div className="user-menu__head">
            <p className="user-menu__head-name">{name}</p>
            <p className="user-menu__head-email">{email}</p>
          </div>

          <button
            type="button"
            className="user-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onGoProfile();
            }}
          >
            <User className="size-3.5" aria-hidden />
            {t.profileMenuProfile}
          </button>
          <button
            type="button"
            className="user-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onGoIntegracion();
            }}
          >
            <Wallet className="size-3.5" aria-hidden />
            {t.profileMenuWallet}
          </button>

          <form action="/auth/signout" method="post" className="user-menu__signout">
            <button
              type="submit"
              className="user-menu__item user-menu__item--danger"
              role="menuitem"
            >
              <LogOut className="size-3.5" aria-hidden />
              {t.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
