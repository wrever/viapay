export type DocChapter = {
  id: string;
  title: string;
  group: "start" | "product" | "integrate";
  lead: string;
  paragraphs: string[];
  bullets?: string[];
  steps?: { title: string; body: string }[];
  note?: string;
  /** Snippet keyed in DocsPage */
  code?: "api" | "sdk" | "x402";
};

export const DOC_CHAPTERS_ES: DocChapter[] = [
  {
    id: "overview",
    title: "Qué es ViaPay",
    group: "start",
    lead: "Cobros non-custodial en Stellar: el pagador firma, el dinero llega al instante a las wallets del comercio (y del partner si hay split). Sin custodiar claves ni fondos.",
    paragraphs: [
      "ViaPay es un checkout hosted más una API. Creás un cobro (payment intent), compartís el link o redirigís desde tu tienda, y el cliente paga con wallet Stellar o QR SEP-7. Un agente de IA puede pagar el mismo cobro por HTTP 402 (x402).",
      "Demo diaria en testnet. La liquidación on-chain va por el contrato Soroban payment-router (pay() sobre SAC SEP-41): hasta tres patas + evento Paid. Mainnet vivo para evidencia (CA4FJAYS…); el panel puede crear cobros mainnet cuando la API tiene PAYMENT_ROUTER_CONTRACT_ID_MAINNET.",
      "Sitio único: https://viapay.vercel.app (landing `/`, docs `/docs`, login `/login`, panel `/app`, checkout `/pay/[id]`, legal `/privacy` `/terms` `/data-deletion`). Local: panel+landing `:3000`. API `:3001`.",
    ],
    bullets: [
      "Sin custodia: ViaPay no guarda la clave del pagador.",
      "El pagador ve solo el total en el checkout; el desglose vive en el panel y en la API.",
      "Legal: política de privacidad, términos y eliminación de datos (Meta / WhatsApp).",
      "Invoices: contactos + WhatsApp (NL) + email Resend. Diferido: HSM/SMS, embed, plugins — docs/FUTURO.md.",
    ],
  },
  {
    id: "fees",
    title: "Comisiones y split",
    group: "start",
    lead: "Hasta tres patas en una sola transacción Stellar: ViaPay 1%, partner opcional, y el resto al comercio.",
    paragraphs: [
      "ViaPay cobra siempre 1% (100 basis points). Ese porcentaje lo fija el servidor (FEE_BPS); el body de la API no puede bajarlo ni quitarlo.",
      "Si hay marketplace o afiliado, pasás reseller_fee_bps (ej. 700 = 7%) y reseller_address (cuenta G…). El comercio recibe el neto. ViaPay + revendedor deben sumar menos del 100%.",
      "Ejemplo Hubby: curso de $20 → ~$0,20 a ViaPay, ~$1,40 al partner (7%), ~$18,40 al creador. Las tres patas siempre suman el total (redondeo hacia abajo en fee/partner; el comercio absorbe el resto).",
    ],
    bullets: [
      "Sin reseller: 99% comercio + 1% ViaPay.",
      "Con reseller: (100 − 1 − partner)% comercio + 1% ViaPay + partner%.",
      "Modo agente simple: mismo split 99/1. Modo agente con partner: ej. 96/1/3.",
    ],
    note: "La matemática está en calcFeeSplit (packages/shared). Un XDR firmado que no coincida con las patas esperadas se rechaza antes de Horizon.",
  },
  {
    id: "quickstart",
    title: "Primer cobro en dos minutos",
    group: "start",
    lead: "Sin código: panel → crear cobro → copiar link → pagar en testnet.",
    paragraphs: [
      "En local necesitás el monorepo corriendo (pnpm) y el seed con una API key de prueba (sk_test_…). En producción el panel vive junto al sitio; el login puede ser local o OAuth vía Supabase si está configurado.",
    ],
    steps: [
      {
        title: "Entrá al panel",
        body: "Abrí el dashboard y usá “Continuar en local” (o el login configurado). Vas a ver tus cobros y wallets de destino.",
      },
      {
        title: "Creá un cobro",
        body: "Indicá monto, asset (XLM o USDC testnet) y descripción opcional. Si querés split, agregá bps y dirección del partner.",
      },
      {
        title: "Compartí el checkout",
        body: "Copiá el checkout_url. El cliente abre ese link, ve el total y paga con Freighter, Lobstr, xBull, Pollar (si hay key) o QR móvil.",
      },
      {
        title: "Confirmá el pago",
        body: "Al firmar y enviar, la API valida destinos/montos/memo y marca succeeded. También podés reconciliar mirando Horizon si la wallet no llamó al callback.",
      },
    ],
  },
  {
    id: "link",
    title: "Link de cobro",
    group: "product",
    lead: "El modo más simple: creás el cobro, copiás el link y lo mandás por chat, mail o redes.",
    paragraphs: [
      "No hace falta integrar API. El checkout hosted muestra solo el total a pagar. El comercio ve el desglose (fee ViaPay y partner) en el panel.",
      "Opcional: al crear el cobro podés pasar success_url y cancel_url para que, al terminar o cancelar, el pagador vuelva a tu sitio con payment_intent y tx_hash en la query.",
    ],
    bullets: [
      "Ideal para freelancers, creadores y cobros one-off.",
      "El QR usa SEP-7 tx (transacción con split), no web+stellar:pay (eso mandaría el 100% a una sola cuenta).",
      "Si el asset es USDC y falta trustline, la misma tx puede incluir changeTrust.",
    ],
  },
  {
    id: "redirect",
    title: "Ecommerce con redirect",
    group: "product",
    lead: "El mínimo viable para tu plataforma: creás el cobro por API, mandás al comprador al checkout ViaPay y lo recibís de vuelta en success_url / cancel_url.",
    paragraphs: [
      "Flujo: carrito → POST /v1/payment_intents (o SDK createCheckout) con amount, asset, success_url y cancel_url → redirigís a checkout_url → tras pagar, ViaPay vuelve a success_url con payment_intent y tx_hash. Si cancela, va a cancel_url.",
      "Auth del comercio: Authorization: Bearer sk_test_…. API local: http://localhost:3001. Checkout: :3004.",
      "Referencia lista para probar: apps/shop (puerto 3005). Es una tienda de prueba que implementa exactamente este flujo.",
    ],
    steps: [
      {
        title: "Crear el intent",
        body: "POST /v1/payment_intents con amount (string Stellar, ej. \"20.0000000\"), asset, description opcional, success_url, cancel_url y, si aplica, reseller_*.",
      },
      {
        title: "Redirigir al humano",
        body: "Usá el checkout_url de la respuesta (window.location o 302). Guardá id si vas a consultar estado o esperar webhook.",
      },
      {
        title: "Cerrar el pedido",
        body: "En success_url leé payment_intent / tx_hash. En producción, confirmá también con el webhook payment_intent.succeeded.",
      },
    ],
    note: "Respuesta útil: id, client_secret, checkout_url, fee_amount, net_amount, reseller_amount. Demo local: pnpm --filter @viapay/shop dev",
  },
  {
    id: "split",
    title: "Split / marketplace",
    group: "product",
    lead: "Un solo pago on-chain reparte a comercio, ViaPay y partner (ej. Hubby).",
    paragraphs: [
      "Pasá reseller_fee_bps y reseller_address al crear el payment intent. No hace falta un segundo cobro ni un batch aparte.",
      "Caso curso $20 con partner 7%: ~0,20 ViaPay + ~1,40 partner + ~18,40 creador. En onchain el mismo split lo ejecuta payment-router (una invocación Soroban + evento Paid).",
    ],
    bullets: [
      "El pagador no ve el desglose en el checkout (solo el total).",
      "El panel y la API sí muestran fee, reseller y neto.",
      "Submit rechaza cualquier XDR que no sea la invocación al router con las patas esperadas.",
    ],
  },
  {
    id: "agent",
    title: "Pagos de agentes (x402)",
    group: "product",
    lead: "El mismo payment intent tiene otra puerta: GET responde 402; el agente firma y POST liquida.",
    paragraphs: [
      "GET /v1/x402/:id?client_secret=… → HTTP 402 con accepts[] (forma PaymentRequirements x402 v2) más un bloque viapay con desglose (rol, dirección, monto, bps) y URLs para liquidar.",
      "POST al mismo recurso con header X-PAYMENT (base64 JSON con payload.signed_xdr) o signed_xdr en el body → 200 y X-PAYMENT-RESPONSE. Con {\"reconcile\": true} busca un pago ya hecho en Horizon.",
      "No hay facilitator x402 aparte: el agente firma la transacción completa (mismas patas que el checkout humano, vía payment-router). Demo: examples/agent-pay.mjs.",
    ],
    bullets: [
      "Modo simple: 99% comercio / 1% ViaPay.",
      "Modo con partner: ej. 96 / 1 / 3 (configurable con reseller_*).",
      "Sin AGENT_SECRET_KEY el script de demo imprime el 402 y para.",
    ],
    code: "x402",
  },
  {
    id: "checkout",
    title: "Checkout hosted (humano)",
    group: "product",
    lead: "Endpoints que usa la UI del pagador — y que podés reutilizar si armás tu propio cliente.",
    paragraphs: [
      "GET /v1/checkout/:id?client_secret= — estado público, sep7_tx, y si las cuentas pueden recibir el asset.",
      "POST /v1/checkout/:id/prepare — arma el XDR sin firmar (source del pagador).",
      "POST /v1/checkout/:id/submit — envía el XDR firmado; la API verifica y manda a Horizon.",
      "POST /v1/checkout/:id/sep7 — callback de wallet móvil (form x-www-form-urlencoded, campo xdr).",
    ],
    note: "confirm solo existe en STELLAR_MODE=simulated. En on-chain responde 400.",
  },
  {
    id: "webhooks",
    title: "Webhooks",
    group: "product",
    lead: "Cuando el cobro pasa a succeeded, ViaPay avisa a tus endpoints con firma HMAC.",
    paragraphs: [
      "Alta: POST /v1/webhook_endpoints. El secreto se muestra una sola vez; guardalo. Lista y baja lógica con GET/DELETE.",
      "Header: ViaPay-Signature: t=<unix>,v1=<hex hmac-sha256>. Mensaje firmado: `${t}.${rawBody}`. Ventana de 5 minutos. Hasta 5 reintentos. Localhost http permitido; el resto exige https.",
      "Evento principal: payment_intent.succeeded. El SDK verifica con ViaPay.verifyWebhook(rawBody, header, secret).",
    ],
    bullets: [
      "GET /v1/webhook_deliveries lista y reintenta entregas vencidas.",
      "Usá webhooks para marcar pedidos pagados sin depender solo del redirect.",
    ],
  },
  {
    id: "api",
    title: "Crear un cobro por API",
    group: "integrate",
    lead: "POST /v1/payment_intents con tu API key. La respuesta trae checkout_url listo para redirigir.",
    paragraphs: [
      "Autenticación: Authorization: Bearer sk_test_…. CORS abierto en /v1/*.",
      "Campos frecuentes: amount, asset (USDC | XLM), description, success_url, cancel_url, reseller_fee_bps, reseller_address.",
      "También: GET /v1/payment_intents (lista y reconcilia pendientes en Horizon), GET /v1/health, GET /v1/readiness (Friendbot, trustlines, fee_bps, resellers).",
    ],
    code: "api",
    note: "OpenAPI en el repo: docs/openapi.yaml. Guía larga: docs/INTEGRATION.md.",
  },
  {
    id: "sdk",
    title: "SDK JavaScript",
    group: "integrate",
    lead: "Paquete @viapay/sdk: createPaymentLink, createCheckout, verifyWebhook y helpers x402.",
    paragraphs: [
      "Instanciá ViaPay con apiKey (secreta sk_…) y baseUrl. createPaymentLink crea un cobro único con externalUserId y te devuelve url (/pay/…), id y secret. createCheckout es el equivalente snake_case.",
      "Para agentes: parseX402Challenge sobre el JSON del 402, y encodePaymentHeader con el signed_xdr.",
    ],
    code: "sdk",
  },
  {
    id: "testnet",
    title: "Redes y readiness",
    group: "integrate",
    lead: "Demo en testnet; mainnet para evidencia y cobros opt-in.",
    paragraphs: [
      "USDC testnet (Circle): GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5. Mainnet USDC: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN. Tesorería: VIAPAY_TREASURY_ADDRESS.",
      "payment-router testnet CDI6XC5Q… · mainnet CA4FJAYS… (mismo wasm 2ef55539…). GET /v1/health → networks + seps.",
      "GET /v1/readiness reporta Friendbot, trustline, fee_bps y resellers. Cada cobro elige network (testnet|mainnet).",
    ],
    bullets: [
      "Wallets: Freighter, Lobstr, xBull (red del cobro).",
      "Prioridad: docs/AHORA.md. Diferido: docs/FUTURO.md.",
    ],
  },
];

export const DOC_CHAPTERS_EN: DocChapter[] = [
  {
    id: "overview",
    title: "What ViaPay is",
    group: "start",
    lead: "Non-custodial Stellar charges: the payer signs, funds land instantly in merchant (and partner) wallets. No custody of keys or balances.",
    paragraphs: [
      "ViaPay is a hosted checkout plus an API. You create a payment intent, share the link or redirect from your store, and the customer pays with a Stellar wallet or SEP-7 QR. An AI agent can pay the same charge over HTTP 402 (x402).",
      "Day-to-day demo on testnet. On-chain settlement uses the Soroban payment-router contract (pay() on SEP-41 SAC): up to three legs + Paid event. Mainnet is live for evidence (CA4FJAYS…); the panel can create mainnet charges when the API has PAYMENT_ROUTER_CONTRACT_ID_MAINNET.",
      "Single site: https://viapay.vercel.app (landing `/`, docs `/docs`, login `/login`, panel `/app`, checkout `/pay/[id]`, legal `/privacy` `/terms` `/data-deletion`). Local: panel+landing `:3000`. API `:3001`.",
    ],
    bullets: [
      "Non-custodial: ViaPay never holds the payer’s secret key.",
      "Checkout shows total only; fee breakdown lives in the dashboard and API.",
      "Legal: privacy policy, terms of service, and data-deletion instructions (Meta / WhatsApp).",
      "Invoices: contacts + WhatsApp (NL) + Resend email. Deferred: HSM/SMS, embed, plugins — docs/FUTURO.md.",
    ],
  },
  {
    id: "fees",
    title: "Fees and split",
    group: "start",
    lead: "Up to three legs in one Stellar transaction: ViaPay 1%, optional partner, remainder to the merchant.",
    paragraphs: [
      "ViaPay always takes 1% (100 bps). That rate is server-side (FEE_BPS); the API body cannot lower or remove it.",
      "For marketplaces, pass reseller_fee_bps (e.g. 700 = 7%) and reseller_address (G…). Merchant gets the net. ViaPay + reseller must stay under 100%.",
      "Hubby example: $20 course → ~$0.20 ViaPay, ~$1.40 partner (7%), ~$18.40 creator. Legs always sum to the total (fees round down; merchant absorbs remainder).",
    ],
    bullets: [
      "No reseller: 99% merchant + 1% ViaPay.",
      "With reseller: (100 − 1 − partner)% merchant + 1% ViaPay + partner%.",
      "Simple agent mode: 99/1. Agent + partner: e.g. 96/1/3.",
    ],
    note: "Math lives in calcFeeSplit (packages/shared). A signed XDR that doesn’t match expected legs is rejected before Horizon.",
  },
  {
    id: "quickstart",
    title: "First charge in two minutes",
    group: "start",
    lead: "No code: dashboard → create charge → copy link → pay on testnet.",
    paragraphs: [
      "Locally you need the monorepo running (pnpm) and seed data with a test API key (sk_test_…). Production login may be local or Supabase OAuth when configured.",
    ],
    steps: [
      {
        title: "Open the dashboard",
        body: "Use “Continue locally” (or configured login). You’ll see charges and destination wallets.",
      },
      {
        title: "Create a charge",
        body: "Set amount, asset (XLM or testnet USDC), optional description. For split, add partner bps and address.",
      },
      {
        title: "Share checkout",
        body: "Copy checkout_url. Customer opens it, sees the total, pays with Freighter, Lobstr, xBull, Pollar (if keyed), or mobile QR.",
      },
      {
        title: "Confirm payment",
        body: "After sign + submit, the API validates destinations/amounts/memo and marks succeeded. Horizon reconcile covers missed wallet callbacks.",
      },
    ],
  },
  {
    id: "link",
    title: "Payment link",
    group: "product",
    lead: "Simplest path: create the charge, copy the link, send it anywhere.",
    paragraphs: [
      "No API required. Hosted checkout shows only the total. Fee/partner breakdown is in the dashboard.",
      "Optional success_url / cancel_url return the payer to your site with payment_intent and tx_hash in the query.",
    ],
    bullets: [
      "Great for freelancers, creators, one-off invoices.",
      "QR is SEP-7 tx (split-aware), not web+stellar:pay (100% to one account).",
      "Missing USDC trustline can be added in the same transaction.",
    ],
  },
  {
    id: "redirect",
    title: "Ecommerce redirect",
    group: "product",
    lead: "Minimum viable for your platform: create the charge via API, send the buyer to ViaPay checkout, get them back on success_url / cancel_url.",
    paragraphs: [
      "Flow: cart → POST /v1/payment_intents (or SDK createCheckout) with amount, asset, success_url, cancel_url → redirect to checkout_url → after pay, ViaPay returns to success_url with payment_intent and tx_hash. Cancel goes to cancel_url.",
      "Merchant auth: Authorization: Bearer sk_test_…. Local API: http://localhost:3001. Checkout: :3004.",
      "Ready-to-run reference: apps/shop (port 3005). A fake store that implements this exact flow.",
    ],
    steps: [
      {
        title: "Create the intent",
        body: "POST /v1/payment_intents with Stellar amount string, asset, optional description, return URLs, and reseller_* if needed.",
      },
      {
        title: "Redirect the human",
        body: "Use checkout_url from the response (window.location or 302). Store id if you’ll poll or wait for webhooks.",
      },
      {
        title: "Close the order",
        body: "On success_url read payment_intent / tx_hash. In production, also confirm with payment_intent.succeeded webhook.",
      },
    ],
    note: "Useful fields: id, client_secret, checkout_url, fee_amount, net_amount, reseller_amount. Local demo: pnpm --filter @viapay/shop dev",
  },
  {
    id: "split",
    title: "Split / marketplace",
    group: "product",
    lead: "One on-chain payment splits to merchant, ViaPay, and partner (e.g. Hubby).",
    paragraphs: [
      "Pass reseller_fee_bps and reseller_address when creating the intent. No second charge or separate batch.",
      "$20 course with 7% partner: ~0.20 ViaPay + ~1.40 partner + ~18.40 creator. On-chain the same split runs through payment-router (one Soroban invoke + Paid event).",
    ],
    bullets: [
      "Payer never sees the breakdown in checkout (total only).",
      "Dashboard and API expose fee, reseller, and net.",
      "Submit rejects any XDR that is not the router invoke with the expected legs.",
    ],
  },
  {
    id: "agent",
    title: "Agent payments (x402)",
    group: "product",
    lead: "Same payment intent, other door: GET returns 402; agent signs and POST settles.",
    paragraphs: [
      "GET /v1/x402/:id?client_secret=… → HTTP 402 with accepts[] (x402 v2 PaymentRequirements shape) plus a viapay block (roles, addresses, amounts, bps) and settle URLs.",
      "POST with X-PAYMENT header (base64 JSON, payload.signed_xdr) or signed_xdr in body → 200 + X-PAYMENT-RESPONSE. {\"reconcile\": true} looks up an existing Horizon payment.",
      "No separate x402 facilitator: the agent signs the full multi-leg transaction. Demo: examples/agent-pay.mjs.",
    ],
    bullets: [
      "Simple mode: 99% merchant / 1% ViaPay.",
      "With partner: e.g. 96 / 1 / 3 via reseller_*.",
      "Without AGENT_SECRET_KEY the demo script prints the 402 and stops.",
    ],
    code: "x402",
  },
  {
    id: "checkout",
    title: "Hosted checkout (human)",
    group: "product",
    lead: "Endpoints used by the payer UI—reusable if you build your own client.",
    paragraphs: [
      "GET /v1/checkout/:id?client_secret= — public status, sep7_tx, receive readiness.",
      "POST /v1/checkout/:id/prepare — unsigned XDR for the payer source.",
      "POST /v1/checkout/:id/submit — signed XDR; API verifies and submits to Horizon.",
      "POST /v1/checkout/:id/sep7 — mobile wallet callback (form field xdr).",
    ],
    note: "confirm only works when STELLAR_MODE=simulated. On-chain returns 400.",
  },
  {
    id: "webhooks",
    title: "Webhooks",
    group: "product",
    lead: "When a charge becomes succeeded, ViaPay POSTs to your endpoints with an HMAC signature.",
    paragraphs: [
      "Create with POST /v1/webhook_endpoints. Secret is shown once—store it. List/soft-delete via GET/DELETE.",
      "Header: ViaPay-Signature: t=<unix>,v1=<hex hmac-sha256>. Signed message: `${t}.${rawBody}`. 5-minute window, up to 5 retries. localhost http allowed; otherwise https required.",
      "Main event: payment_intent.succeeded. SDK: ViaPay.verifyWebhook(rawBody, header, secret).",
    ],
    bullets: [
      "GET /v1/webhook_deliveries lists and retries overdue deliveries.",
      "Prefer webhooks to mark orders paid—don’t rely on redirect alone.",
    ],
  },
  {
    id: "api",
    title: "Create a charge via API",
    group: "integrate",
    lead: "POST /v1/payment_intents with your API key. Response includes checkout_url ready to redirect.",
    paragraphs: [
      "Auth: Authorization: Bearer sk_test_…. CORS open on /v1/*.",
      "Common fields: amount, asset (USDC | XLM), description, success_url, cancel_url, reseller_fee_bps, reseller_address.",
      "Also: GET /v1/payment_intents, GET /v1/health, GET /v1/readiness (Friendbot, trustlines, fee_bps, resellers).",
    ],
    code: "api",
    note: "OpenAPI: docs/openapi.yaml. Long guide: docs/INTEGRATION.md.",
  },
  {
    id: "sdk",
    title: "JavaScript SDK",
    group: "integrate",
    lead: "Package @viapay/sdk: createPaymentLink, createCheckout, verifyWebhook, and x402 helpers.",
    paragraphs: [
      "Construct ViaPay with apiKey (secret sk_…) and baseUrl. createPaymentLink creates a one-off charge with externalUserId and returns url (/pay/…), id, and secret. createCheckout is the snake_case equivalent.",
      "Agents: parseX402Challenge on the 402 JSON, encodePaymentHeader with signed_xdr.",
    ],
    code: "sdk",
  },
  {
    id: "testnet",
    title: "Networks and readiness",
    group: "integrate",
    lead: "Demo on testnet; mainnet for evidence and opt-in charges.",
    paragraphs: [
      "Testnet USDC (Circle): GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5. Mainnet USDC: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN. Treasury: VIAPAY_TREASURY_ADDRESS.",
      "payment-router testnet CDI6XC5Q… · mainnet CA4FJAYS… (same wasm 2ef55539…). GET /v1/health → networks + seps.",
      "GET /v1/readiness reports Friendbot, trustline, fee_bps, and resellers. Each charge chooses network (testnet|mainnet).",
    ],
    bullets: [
      "Wallets: Freighter, Lobstr, xBull (charge network).",
      "Product priority: docs/AHORA.md. Deferred: docs/FUTURO.md.",
    ],
  },
];

export const DOC_CHAPTERS_PT: DocChapter[] = [
  {
    id: "overview",
    title: "O que é a ViaPay",
    group: "start",
    lead: "Cobranças non-custodial na Stellar: o pagador assina e o dinheiro chega na hora às wallets do comércio (e do parceiro, se houver split). Sem custodiar chaves nem fundos.",
    paragraphs: [
      "ViaPay é um checkout hospedado mais uma API. Você cria um payment intent, compartilha o link ou redireciona da sua loja, e o cliente paga com wallet Stellar ou QR SEP-7. Um agente de IA pode pagar a mesma cobrança via HTTP 402 (x402).",
      "Demo diária na testnet. A liquidação on-chain vai pelo contrato Soroban payment-router (pay() sobre SAC SEP-41): até três pernas + evento Paid. Mainnet vivo para evidência (CA4FJAYS…); o painel pode criar cobranças mainnet quando a API tem PAYMENT_ROUTER_CONTRACT_ID_MAINNET.",
      "Site único: https://viapay.vercel.app (landing `/`, docs `/docs`, login `/login`, painel `/app`, checkout `/pay/[id]`, legal `/privacy` `/terms` `/data-deletion`). Local: painel+landing `:3000`. API `:3001`.",
    ],
    bullets: [
      "Sem custódia: a ViaPay não guarda a chave do pagador.",
      "No checkout o pagador vê só o total; o detalhe fica no painel e na API.",
      "Legal: privacidade, termos e eliminação de dados (Meta / WhatsApp).",
      "Invoices: contatos + WhatsApp (NL) + email Resend. Diferido: HSM/SMS, embed, plugins — docs/FUTURO.md.",
    ],
  },
  {
    id: "fees",
    title: "Taxas e split",
    group: "start",
    lead: "Até três pernas numa única transação Stellar: ViaPay 1%, parceiro opcional e o resto ao comércio.",
    paragraphs: [
      "A ViaPay cobra sempre 1% (100 bps). Essa taxa é do servidor (FEE_BPS); o body da API não pode baixá-la nem removê-la.",
      "Com marketplace, envie reseller_fee_bps (ex. 700 = 7%) e reseller_address (conta G…). O comércio recebe o líquido. ViaPay + revendedor devem somar menos de 100%.",
      "Exemplo Hubby: curso de $20 → ~$0,20 ViaPay, ~$1,40 parceiro (7%), ~$18,40 criador. As três pernas sempre somam o total.",
    ],
    bullets: [
      "Sem revendedor: 99% comércio + 1% ViaPay.",
      "Com revendedor: (100 − 1 − parceiro)% comércio + 1% ViaPay + parceiro%.",
      "Agente simples: 99/1. Agente com parceiro: ex. 96/1/3.",
    ],
    note: "A matemática está em calcFeeSplit (packages/shared). XDR assinado que não bata com as pernas esperadas é rejeitado antes do Horizon.",
  },
  {
    id: "quickstart",
    title: "Primeira cobrança em dois minutos",
    group: "start",
    lead: "Sem código: painel → criar cobrança → copiar link → pagar na testnet.",
    paragraphs: [
      "No local você precisa do monorepo (pnpm) e do seed com API key de teste (sk_test_…). Em produção o login pode ser local ou OAuth Supabase se configurado.",
    ],
    steps: [
      {
        title: "Abra o painel",
        body: "Use “Continuar no local” (ou o login configurado). Você verá cobranças e wallets de destino.",
      },
      {
        title: "Crie a cobrança",
        body: "Informe valor, asset (XLM ou USDC testnet) e descrição opcional. Para split, adicione bps e endereço do parceiro.",
      },
      {
        title: "Compartilhe o checkout",
        body: "Copie o checkout_url. O cliente abre, vê o total e paga com Freighter, Lobstr, xBull, Pollar (se houver key) ou QR.",
      },
      {
        title: "Confirme o pagamento",
        body: "Após assinar e enviar, a API valida destinos/valores/memo e marca succeeded. Também há reconciliação via Horizon.",
      },
    ],
  },
  {
    id: "link",
    title: "Link de cobrança",
    group: "product",
    lead: "O modo mais simples: crie a cobrança, copie o link e envie por onde quiser.",
    paragraphs: [
      "Não precisa de API. O checkout mostra só o total. O detalhe de taxas fica no painel.",
      "Opcional: success_url e cancel_url para devolver o pagador ao seu site com payment_intent e tx_hash na query.",
    ],
    bullets: [
      "Ideal para freelancers, criadores e cobranças avulsas.",
      "O QR usa SEP-7 tx (com split), não web+stellar:pay.",
      "Se faltar trustline USDC, a mesma tx pode incluir changeTrust.",
    ],
  },
  {
    id: "redirect",
    title: "Ecommerce com redirect",
    group: "product",
    lead: "Mínimo viável para sua plataforma: crie a cobrança pela API, mande o comprador ao checkout ViaPay e receba-o de volta em success_url / cancel_url.",
    paragraphs: [
      "Fluxo: carrinho → POST /v1/payment_intents (ou SDK createCheckout) com amount, asset, success_url e cancel_url → redirecione ao checkout_url → após pagar, a ViaPay volta ao success_url com payment_intent e tx_hash. Cancelamento vai ao cancel_url.",
      "Auth: Authorization: Bearer sk_test_…. API local: http://localhost:3001. Checkout: :3004.",
      "Referência pronta: apps/shop (porta 3005). Loja falsa com exatamente este fluxo.",
    ],
    steps: [
      {
        title: "Criar o intent",
        body: "POST /v1/payment_intents com amount, asset, description opcional, URLs de retorno e reseller_* se precisar.",
      },
      {
        title: "Redirecionar o humano",
        body: "Use o checkout_url da resposta (window.location ou 302). Guarde id se for consultar estado ou webhook.",
      },
      {
        title: "Fechar o pedido",
        body: "No success_url leia payment_intent / tx_hash. Em produção, confirme também com o webhook payment_intent.succeeded.",
      },
    ],
    note: "Resposta útil: id, client_secret, checkout_url, fee_amount, net_amount, reseller_amount. Demo: pnpm --filter @viapay/shop dev",
  },
  {
    id: "split",
    title: "Split / marketplace",
    group: "product",
    lead: "Um único pagamento on-chain reparte para comércio, ViaPay e parceiro (ex. Hubby).",
    paragraphs: [
      "Passe reseller_fee_bps e reseller_address ao criar o intent. Não precisa de segunda cobrança.",
      "Curso $20 com parceiro 7%: ~0,20 ViaPay + ~1,40 parceiro + ~18,40 criador. On-chain o mesmo split passa pelo payment-router (uma invocação Soroban + evento Paid).",
    ],
    bullets: [
      "O pagador não vê o detalhe no checkout (só o total).",
      "Painel e API mostram fee, reseller e líquido.",
      "O submit rejeita qualquer XDR que não seja a invocação do router com as pernas esperadas.",
    ],
  },
  {
    id: "agent",
    title: "Pagamentos de agentes (x402)",
    group: "product",
    lead: "O mesmo payment intent tem outra porta: GET responde 402; o agente assina e o POST liquida.",
    paragraphs: [
      "GET /v1/x402/:id?client_secret=… → HTTP 402 com accepts[] (formato PaymentRequirements x402 v2) mais bloco viapay com detalhe e URLs.",
      "POST com header X-PAYMENT (base64 JSON, payload.signed_xdr) ou signed_xdr no body → 200 + X-PAYMENT-RESPONSE. {\"reconcile\": true} busca pagamento já feito no Horizon.",
      "Sem facilitator x402 separado: o agente assina a tx completa. Demo: examples/agent-pay.mjs.",
    ],
    bullets: [
      "Modo simples: 99% comércio / 1% ViaPay.",
      "Com parceiro: ex. 96 / 1 / 3 via reseller_*.",
      "Sem AGENT_SECRET_KEY o script imprime o 402 e para.",
    ],
    code: "x402",
  },
  {
    id: "checkout",
    title: "Checkout hospedado (humano)",
    group: "product",
    lead: "Endpoints usados pela UI do pagador—reutilizáveis se você montar o próprio cliente.",
    paragraphs: [
      "GET /v1/checkout/:id?client_secret= — status público, sep7_tx, readiness.",
      "POST /v1/checkout/:id/prepare — XDR sem assinar.",
      "POST /v1/checkout/:id/submit — XDR assinado → Horizon.",
      "POST /v1/checkout/:id/sep7 — callback de wallet móvel (campo xdr).",
    ],
    note: "confirm só com STELLAR_MODE=simulated. On-chain responde 400.",
  },
  {
    id: "webhooks",
    title: "Webhooks",
    group: "product",
    lead: "Quando a cobrança vira succeeded, a ViaPay avisa seus endpoints com assinatura HMAC.",
    paragraphs: [
      "Alta: POST /v1/webhook_endpoints. O segredo aparece uma vez. Lista/baixa com GET/DELETE.",
      "Header: ViaPay-Signature: t=<unix>,v1=<hex hmac-sha256>. Mensagem: `${t}.${rawBody}`. Janela de 5 minutos, até 5 tentativas. localhost http ok; o resto exige https.",
      "Evento principal: payment_intent.succeeded. SDK: ViaPay.verifyWebhook(rawBody, header, secret).",
    ],
    bullets: [
      "GET /v1/webhook_deliveries lista e retenta entregas vencidas.",
      "Prefira webhooks para marcar pedidos pagos—não dependa só do redirect.",
    ],
  },
  {
    id: "api",
    title: "Criar cobrança pela API",
    group: "integrate",
    lead: "POST /v1/payment_intents com sua API key. A resposta traz checkout_url pronto para redirecionar.",
    paragraphs: [
      "Auth: Authorization: Bearer sk_test_…. CORS aberto em /v1/*.",
      "Campos comuns: amount, asset (USDC | XLM), description, success_url, cancel_url, reseller_fee_bps, reseller_address.",
      "Também: GET /v1/payment_intents, GET /v1/health, GET /v1/readiness.",
    ],
    code: "api",
    note: "OpenAPI: docs/openapi.yaml. Guia: docs/INTEGRATION.md.",
  },
  {
    id: "sdk",
    title: "SDK JavaScript",
    group: "integrate",
    lead: "Pacote @viapay/sdk: createPaymentLink, createCheckout, verifyWebhook e helpers x402.",
    paragraphs: [
      "Instancie ViaPay com apiKey (secreta sk_…) e baseUrl. createPaymentLink cria uma cobrança única com externalUserId e devolve url (/pay/…), id e secret. createCheckout é o equivalente snake_case.",
      "Agentes: parseX402Challenge no JSON do 402; encodePaymentHeader com signed_xdr.",
    ],
    code: "sdk",
  },
  {
    id: "testnet",
    title: "Redes e readiness",
    group: "integrate",
    lead: "Demo na testnet; mainnet para evidência e cobranças opt-in.",
    paragraphs: [
      "USDC testnet (Circle): GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5. Mainnet USDC: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN. Tesouraria: VIAPAY_TREASURY_ADDRESS.",
      "payment-router testnet CDI6XC5Q… · mainnet CA4FJAYS… (mesmo wasm 2ef55539…). GET /v1/health → networks + seps.",
      "GET /v1/readiness reporta Friendbot, trustline, fee_bps e resellers. Cada cobrança escolhe network (testnet|mainnet).",
    ],
    bullets: [
      "Wallets: Freighter, Lobstr, xBull (rede da cobrança).",
      "Prioridade: docs/AHORA.md. Diferido: docs/FUTURO.md.",
    ],
  },
];
