import Link from "next/link";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_intent?: string; tx_hash?: string }>;
}) {
  const q = await searchParams;

  return (
    <div className="shell">
      <header className="top">
        <Link className="top__brand" href="/">
          North Shop
        </Link>
        <p className="top__meta">Pago recibido</p>
      </header>

      <div className="panel">
        <h1>Pago confirmado</h1>
        <p>
          ViaPay te redirigió acá con los query params del cobro. En producción
          marcarías el pedido como pagado (y/o esperarías el webhook).
        </p>
        <dl>
          <div>
            <dt>payment_intent</dt>
            <dd>{q.payment_intent ?? "—"}</dd>
          </div>
          <div>
            <dt>tx_hash</dt>
            <dd>{q.tx_hash ?? "—"}</dd>
          </div>
        </dl>
        <div className="actions">
          <Link className="btn btn--primary" href="/">
            Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}
