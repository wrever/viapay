/** Persist display name into the httpOnly panel session cookie. */
export async function syncSessionDisplayName(name: string): Promise<boolean> {
  const res = await fetch("/auth/session-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.ok;
}
