import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { dashboardUrl } from "@/lib/urls";

export default function LoginBridgePage() {
  const dash = dashboardUrl();
  if (dash) {
    redirect(`${dash}/login`);
  }

  return (
    <main className="lost">
      <div>
        <Logo variant="icon" width={168} className="lost__logo" alt="" />
        <h1>Panel de comercio</h1>
        <p>
          Este sitio es la landing y la documentación. El panel (login y cobros)
          es otra app: en local vive en{" "}
          <code style={{ fontSize: "0.9em" }}>http://localhost:3000/login</code>
          . En producción hay que desplegar <code>apps/dashboard</code> y setear{" "}
          <code>NEXT_PUBLIC_VIAPAY_DASHBOARD_URL</code>.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "center",
            marginTop: "1.25rem",
          }}
        >
          <Link className="btn btn--primary" href="/">
            Volver al inicio
          </Link>
          <Link className="btn btn--quiet" href="/docs">
            Ver documentación
          </Link>
        </div>
      </div>
    </main>
  );
}
