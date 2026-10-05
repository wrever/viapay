import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="shell">
      <header className="top">
        <Link className="top__brand" href="/">
          North Shop
        </Link>
        <p className="top__meta">Pago cancelado</p>
      </header>

      <div className="panel">
        <h1>Volviste sin pagar</h1>
        <p>
          El comprador usó el enlace de cancelación del checkout. El pedido
          sigue pendiente; puede reintentar cuando quiera.
        </p>
        <div className="actions">
          <Link className="btn btn--primary" href="/">
            Reintentar compra
          </Link>
          <Link className="btn btn--quiet" href="/">
            Seguir mirando
          </Link>
        </div>
      </div>
    </div>
  );
}
