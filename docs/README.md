# Documentación ViaPay

Índice de docs del monorepo. Estado vivo del código: [`MEMORY.md`](./MEMORY.md).

| Doc | Para qué |
|---|---|
| [`AHORA.md`](./AHORA.md) | Qué demostrar en esta fase |
| [`FUTURO.md`](./FUTURO.md) | Qué queda diferido (HSM/SMS, embed, plugins) |
| [`01-NON-TECH-PAYMENT-LINKS.md`](./01-NON-TECH-PAYMENT-LINKS.md) | Flujo merchant / comprador sin código |
| [`INTEGRATION.md`](./INTEGRATION.md) | API, SDK, redirect, split, webhooks, x402 |
| [`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md) | Diagrama y decisiones |
| [`DEPLOY.md`](./DEPLOY.md) | Supabase, Vercel, envs |
| [`openapi.yaml`](./openapi.yaml) | Contrato OpenAPI de la API |
| [`HACKATHON.md`](./HACKATHON.md) | Paquete para jurado / demo |
| [`WIN_PLAN.md`](./WIN_PLAN.md) | Plan victoria General Track |
| [`submission/`](./submission/) | SEPs, demo 90s, evidence, competitors |

## Sitio prod (URLs públicas)

Base: `https://viapay.vercel.app` (`apps/dashboard`).

| Ruta | Contenido |
|---|---|
| `/` | Landing |
| `/docs` | Documentación de producto (ES/EN/PT) |
| `/login` | OAuth comercio |
| `/app` | Panel |
| `/pay/[id]` | Checkout pagador |
| `/privacy` | Política de privacidad |
| `/terms` | Términos y condiciones |
| `/data-deletion` | Instrucciones de eliminación de datos (Meta) |

API: `https://viapay-api.vercel.app` · health `GET /v1/health`.

Docs in-app: `https://viapay.vercel.app/docs`.
