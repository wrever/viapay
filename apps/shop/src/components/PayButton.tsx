"use client";

import { useState } from "react";

export function PayButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      window.location.assign(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar el pago");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn--primary"
        onClick={pay}
        disabled={loading}
      >
        {loading ? "Creando cobro…" : "Pagar con ViaPay"}
      </button>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
