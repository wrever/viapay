import { PayButton } from "@/components/PayButton";
import { PRODUCTS } from "@/lib/catalog";

export default function ShopHome() {
  return (
    <div className="shell">
      <header className="top">
        <a className="top__brand" href="/">
          North Shop
        </a>
        <p className="top__meta">Tienda de prueba · redirect ViaPay</p>
      </header>

      <section className="hero">
        <h1>Probá el cobro con redirect</h1>
        <p>
          Esta app simula tu plataforma: crea un payment intent con{" "}
          <code>success_url</code> y <code>cancel_url</code>, manda al comprador
          al checkout ViaPay y vuelve acá cuando termina.
        </p>
      </section>

      <div className="grid">
        {PRODUCTS.map((product) => (
          <article key={product.id} className="card">
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <p className="card__price">{product.priceLabel}</p>
            <PayButton productId={product.id} />
          </article>
        ))}
      </div>

      <p className="note">
        Configurá <code>VIAPAY_API_KEY</code> en <code>apps/shop/.env.local</code>{" "}
        (sale de <code>pnpm db:seed</code> → <code>data/seed.local.json</code>).
        API en <code>:3001</code>, checkout en <code>:3004</code>, esta tienda en{" "}
        <code>:3005</code>.
      </p>
    </div>
  );
}
