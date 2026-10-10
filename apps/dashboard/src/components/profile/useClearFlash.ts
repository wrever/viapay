"use client";

import { useEffect, useState } from "react";

/** Flash a success/error flag and clear it after `ms`. */
export function useClearFlash(ms = 2500) {
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    if (!flag) return;
    const id = window.setTimeout(() => setFlag(false), ms);
    return () => window.clearTimeout(id);
  }, [flag, ms]);

  return [flag, setFlag] as const;
}
