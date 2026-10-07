import type { Locale } from "@viapay/prefs";

export type Messages = {
  theme: { toLight: string; toDark: string };
  locale: { switch: string };
  homeAria: string;
  signOut: string;
  mastheadTitle: (name: string) => string;
  missingKey: string;
  footerNetwork: (network: string, fee: string) => string;
  loginBack: string;
  loginTagline: string;
  loginTitle: string;
  loginDescOauth: string;
  loginDescLocal: string;
  continueGoogle: string;
  continueGithub: string;
  loginAccountHint: string;
  loginOauthHint: string;
  loginError: (code: string) => string;
  createTitle: string;
  amount: string;
  asset: string;
  whyOptional: string;
  whyPlaceholder: string;
  resellerToggle: string;
  resellerHint: string;
  resellerPct: string;
  resellerWallet: string;
  feeVia: (bps: string) => string;
  feeReseller: (bps: string) => string;
  youReceive: string;
  creating: string;
  createCta: string;
  readyCopy: string;
  copied: string;
  copyLink: string;
  openCheckout: string;
  recentTitle: string;
  recentEmpty: string;
  resellerLine: (bps: string, amount: string, asset: string, short: string) => string;
  copy: string;
  open: string;
  statusPending: string;
  statusPaid: string;
  statusCanceled: string;
  statusExpired: string;
  errResellerMax: (max: string) => string;
  errResellerAll: string;
  errResellerWallet: string;
  errNoKey: string;
  errCreate: string;
  errGeneric: string;
  warnResellerMissing: string;
  warnResellerUsdc: string;
  panelMetaAria: string;
  statsAria: string;
  statTotalCharges: string;
  statTotalHint: string;
  statReceived: string;
  statReceivedHint: (paid: number) => string;
  statPending: string;
  statPendingHint: string;
  statSucceeded: string;
  statSucceededHint: string;
  statCanceled: string;
  periodAria: string;
  periodToday: string;
  periodMonth: string;
  periodAll: string;
  overviewTitle: string;
  overviewDesc: string;
  overviewEmptyTitle: string;
  overviewEmptyBody: string;
  overviewEmptyCta: string;
  overviewPeriodEmpty: string;
  statsTitle: string;
  statsDesc: string;
  statsEmptyTitle: string;
  statsEmptyBody: string;
  statsPeriodEmpty: string;
  statsBreakdownAria: string;
  statsByAsset: string;
  statsFees: string;
  integrationEmptyTitle: string;
  historyTitle: string;
  historyEmpty: string;
  integrationTitle: string;
  integrationDesc: string;
  integrationKeyLabel: string;
  integrationKeyHint: string;
  integrationKeyExplain: string;
  integrationDocs: string;
  integrationWalletLabel: string;
  integrationWalletHint: string;
  integrationWalletSave: string;
  integrationWalletSaved: string;
  integrationWalletFail: string;
  integrationNoWallet: string;
  integrationPollHint: string;
  integrationUsersTitle: string;
  integrationUsersBody: string;
  integrationSnippetTitle: string;
  integrationSnippetCurl: string;
  integrationSnippetSdk: string;
  historyColWhen: string;
  historyColConcept: string;
  historyColAmount: string;
  historyColNet: string;
  historyColStatus: string;
  historyColActions: string;
  historyNoMemo: string;
  historyShowMore: (n: number) => string;
  navAria: string;
  navResumen: string;
  navCobros: string;
  navHistorial: string;
  navEstadisticas: string;
  navSwap: string;
  navIntegracion: string;
  navNotificaciones: string;
  cobrosGuideTitle: string;
  cobrosGuide1: string;
  cobrosGuide2: string;
  cobrosGuide3: string;
  noticesTitle: string;
  noticesDesc: string;
  noticesPoll: string;
  noticesPollList: string;
  noticesNoWebhook: string;
  walletGateBanner: string;
  walletGateTitle: string;
  walletGateBody: string;
  walletGateCta: string;
  walletGateBlocked: string;
  walletGateLockedHint: string;
  overviewRecentTitle: string;
  overviewRecentEmpty: string;
  overviewConversion: (paid: number, total: number) => string;
  overviewGoHistory: string;
  noticesBellAria: string;
  noticesBellPending: (n: number) => string;
  noticesBellHint: string;
  fiatSelectLabel: string;
  fiatSelectHint: string;
  fiatApprox: (formatted: string) => string;
  fiatUnavailable: string;
  swapTitle: string;
  swapDesc: string;
  swapPlusBadge: string;
  swapFrom: string;
  swapTo: string;
  swapFlip: string;
  swapGetQuote: string;
  swapQuoting: string;
  swapConnectAndSwap: string;
  swapExecute: string;
  swapSwapping: string;
  swapMissingKey: string;
  swapMissingKeyBody: string;
  swapMissingKeyWhere: string;
  swapQuoteFail: string;
  swapBuildFail: string;
  swapSendFail: string;
  swapWalletNeeded: string;
  swapWallet: string;
  swapQuoteLine: (
    amountIn: string,
    assetIn: string,
    amountOut: string,
    assetOut: string,
  ) => string;
  swapImpact: (pct: string) => string;
  swapSuccess: string;
  trustlineGateTitle: string;
  trustlineGateBody: string;
  trustlineGateWallet: string;
  trustlineAssetLabel: string;
  trustlineIssuer: string;
  trustlineActivateCta: string;
  trustlineActivating: string;
  trustlineConfirmXlm: string;
  trustlineWalletMismatch: string;
  trustlinePrepareFail: string;
  trustlineSubmitFail: string;
  trustlineUsdcBlocked: string;
  trustlinesTitle: string;
  trustlinesDesc: string;
  trustlinesXlmNote: string;
  trustlinesNoAction: string;
  trustlinesActive: string;
  trustlinesActivateCta: string;
  trustlinesNeedWallet: string;
  trustlinesUsdt0Placeholder: string;
  trustlinesSoon: string;
  treasurySameWalletWarn: string;
  anchorTitle: string;
  anchorBody: string;
  anchorHonest: string;
  anchorDiscover: string;
  anchorOpen: string;
  anchorNeedKey: string;
  anchorDiscoverFail: string;
  anchorMissingEndpoints: string;
  anchorSep10Sep24: string;
  anchorSepRunning: string;
  anchorSep24Fail: string;
  anchorJwtOk: string;
  anchorOpenInteractive: string;
  sepsTitle: string;
  sepsBody: string;
  sepsLoadFail: string;
  contactsTitle: string;
  contactsBody: string;
  contactsName: string;
  contactsPhone: string;
  contactsEmail: string;
  contactsAdd: string;
  contactsDelete: string;
  contactsLoadFail: string;
  contactsSaveFail: string;
  waTitle: string;
  waBody: string;
  waNotConfigured: string;
  waLinked: string;
  waStep1: string;
  waStep2: string;
  waStep3: string;
  waGenCode: string;
  waSendCode: string;
  waCodeExpires: string;
  waStatusFail: string;
  waCodeFail: string;
  invoiceContact: string;
  invoiceNoContact: string;
  invoiceContactHint: string;
  shareWhatsApp: string;
  shareEmail: string;
  invoiceWaText: (
    name: string,
    amount: string,
    asset: string,
    url: string,
  ) => string;
  invoiceMailSubject: (amount: string, asset: string) => string;
  historyTo: string;
};

const es: Messages = {
  theme: { toLight: "Cambiar a modo claro", toDark: "Cambiar a modo oscuro" },
  locale: { switch: "Elegir idioma" },
  homeAria: "ViaPay, inicio",
  signOut: "Cerrar sesión",
  mastheadTitle: (name) => `Hola, ${name}`,
  missingKey: "Tu sesión no tiene clave de API. Cerrá sesión y volvé a entrar con Google o GitHub.",
  footerNetwork: (network, fee) => `Red ${network} · fee ViaPay ${fee}`,
  loginBack: "Volver",
  loginTagline: "Cobra en Stellar con un link. Sin código.",
  loginTitle: "Entrar al panel",
  loginDescOauth: "Entrá con tu cuenta de Google o GitHub para gestionar cobros.",
  loginDescLocal:
    "El acceso con Google/GitHub no está configurado en este entorno.",
  continueGoogle: "Continuar con Google",
  continueGithub: "Continuar con GitHub",
  loginAccountHint:
    "Primera vez: se crea tu cuenta de comercio. Después, el mismo acceso.",
  loginOauthHint:
    "Configurá Supabase Auth (NEXT_PUBLIC_SUPABASE_URL y publishable key) para habilitar el login.",
  loginError: (code) => {
    if (code === "oauth") return "No pudimos completar el inicio de sesión. Probá de nuevo.";
    if (code === "link") return "Tu sesión es válida, pero no pudimos crear la cuenta de comercio.";
    if (code === "supabase") return "Auth no está disponible ahora. Reintentá en unos minutos.";
    return "Algo salió mal al entrar. Probá otra vez.";
  },
  createTitle: "Nuevo cobro",
  amount: "Monto",
  asset: "Moneda",
  whyOptional: "Concepto (opcional)",
  whyPlaceholder: "Ej. Pedido #1042",
  resellerToggle: "Comisión para un revendedor",
  resellerHint:
    "Marketplaces o partners. Se paga en la misma transacción, antes de tu neto.",
  resellerPct: "Comisión del revendedor",
  resellerWallet: "Billetera del revendedor",
  feeVia: (bps) => `Fee ViaPay (${bps})`,
  feeReseller: (bps) => `Revendedor (${bps})`,
  youReceive: "Tú recibes",
  creating: "Creando…",
  createCta: "Crear link",
  readyCopy:
    "Listo — un solo link (humano o agente). El navegador abre el pago; un agente recibe el 402:",
  copied: "Copiado",
  copyLink: "Copiar link",
  openCheckout: "Abrir checkout",
  recentTitle: "Links recientes",
  recentEmpty: "Todavía no hay cobros.",
  resellerLine: (bps, amount, asset, short) =>
    `Revendedor ${bps} · ${amount} ${asset} a ${short}…`,
  copy: "Copiar",
  open: "Abrir",
  statusPending: "Pendiente",
  statusPaid: "Pagado",
  statusCanceled: "Cancelado",
  statusExpired: "Expirado",
  errResellerMax: (max) =>
    `La comisión del revendedor no puede pasar de ${max}.`,
  errResellerAll: "Entre ViaPay y el revendedor se llevarían todo. Baja la comisión.",
  errResellerWallet: "Falta la billetera Stellar del revendedor (G…).",
  errNoKey: "No hay API key. Cerrá sesión y volvé a entrar.",
  errCreate: "No se pudo crear el link",
  errGeneric: "Error",
  warnResellerMissing: "Esa billetera no existe en esta red todavía.",
  warnResellerUsdc: "Esa billetera no puede recibir USDC. El cobro fallará.",
  panelMetaAria: "Estado de la cuenta",
  statsAria: "Resumen de cobros",
  statTotalCharges: "Cobros",
  statTotalHint: "Links creados en tu cuenta",
  statReceived: "Recibido",
  statReceivedHint: (paid) =>
    paid === 0 ? "Neto acreditado cuando pagan" : `${paid} pago${paid === 1 ? "" : "s"} confirmado${paid === 1 ? "" : "s"}`,
  statPending: "Pendientes",
  statPendingHint: "Esperando pago del cliente",
  statSucceeded: "Pagados",
  statSucceededHint: "Cobros con pago confirmado",
  statCanceled: "Cancelados / expirados",
  periodAria: "Período",
  periodToday: "Hoy",
  periodMonth: "Este mes",
  periodAll: "Todo",
  overviewTitle: "Resumen",
  overviewDesc: "Snapshot del período: ventas netas, cobros abiertos y conversión.",
  overviewEmptyTitle: "Todavía no hay actividad",
  overviewEmptyBody: "Creá tu primer link de cobro para ver números acá.",
  overviewEmptyCta: "Crear cobro",
  overviewPeriodEmpty: "Sin cobros en este período.",
  overviewRecentTitle: "Últimos pagos",
  overviewRecentEmpty: "Aún no hay pagos confirmados en este período.",
  overviewConversion: (paid, total) =>
    total === 0
      ? "Sin cobros"
      : `${paid} de ${total} cobros pagados (${Math.round((paid / total) * 100)}%)`,
  overviewGoHistory: "Ver historial",
  statsTitle: "Estadísticas",
  statsDesc: "Desglose por estado y activo en el período elegido.",
  statsEmptyTitle: "Sin datos todavía",
  statsEmptyBody: "Cuando haya cobros, vas a ver el desglose acá.",
  statsPeriodEmpty: "Sin cobros en este período.",
  statsBreakdownAria: "Conteo por estado",
  statsByAsset: "Por activo",
  statsFees: "Fees ViaPay",
  integrationEmptyTitle: "Integración no disponible",
  historyTitle: "Historial",
  historyEmpty: "Todavía no hay pagos recibidos.",
  integrationTitle: "Integración",
  integrationDesc:
    "Billetera de destino, trustlines (testnet), API key y cómo crear links de pago por código.",
  integrationKeyLabel: "API key secreta",
  integrationKeyHint: "Usala en Authorization: Bearer … solo en tu servidor.",
  integrationKeyExplain:
    "Hoy solo hay key secreta (sk_…). No hay publishable key: no crees cobros desde el navegador del pagador. Guardá la key en variables de entorno.",
  integrationDocs: "Ver docs",
  integrationWalletLabel: "Billetera de destino",
  integrationWalletHint: "Cuenta Stellar (G…) donde llega el neto.",
  integrationWalletSave: "Guardar billetera",
  integrationWalletSaved: "Billetera guardada",
  integrationWalletFail: "No se pudo guardar la billetera",
  integrationNoWallet:
    "Obligatorio: sin billetera de destino el dinero no puede llegar a tu cuenta.",
  integrationPollHint:
    "Consultá el estado con GET /v1/payment_intents/:id (o la lista).",
  integrationUsersTitle: "Usuarios de tu plataforma",
  integrationUsersBody:
    "Pasá external_user_id (o externalUserId / customerId) con el id de tu cliente. Queda guardado en el cobro para que puedas reconciliar quién pagó. No es un usuario de ViaPay.",
  integrationSnippetTitle: "Crear un link de pago",
  integrationSnippetCurl: "cURL",
  integrationSnippetSdk: "SDK JavaScript",
  historyColWhen: "Fecha",
  historyColConcept: "Concepto",
  historyColAmount: "Total",
  historyColNet: "Tu neto",
  historyColStatus: "Estado",
  historyColActions: "Acciones",
  historyNoMemo: "Sin concepto",
  historyShowMore: (n) => `Ver ${n} más`,
  navAria: "Secciones del panel",
  navResumen: "Resumen",
  navCobros: "Cobros",
  navHistorial: "Historial",
  navEstadisticas: "Estadísticas",
  navSwap: "Swap",
  navIntegracion: "Integración",
  navNotificaciones: "Notificaciones",
  cobrosGuideTitle: "Cómo cobrar",
  cobrosGuide1: "Creá el link con el monto y, si aplica, la comisión del revendedor.",
  cobrosGuide2: "Compartí el checkout ViaPay. El cliente firma en su wallet (Freighter, Lobstr, …).",
  cobrosGuide3:
    "Cuando pague, el cobro pasa a Pagado. Consultá el estado por id con la API.",
  noticesTitle: "Notificaciones",
  noticesDesc: "Sin webhooks obligatorios: consultá el estado del cobro por API.",
  noticesPoll:
    "Tras el pago, pedí el intent por id. status: succeeded y stellar_tx_hash confirman.",
  noticesPollList: "Para varios cobros, listá con auth Bearer:",
  noticesNoWebhook:
    "La API de webhooks sigue disponible si la necesitás, pero el panel no la requiere.",
  walletGateBanner:
    "Sin billetera de destino el dinero no puede llegar. Guardá tu cuenta Stellar (G…) para desbloquear el panel.",
  walletGateTitle: "Billetera de destino obligatoria",
  walletGateBody:
    "Sin una cuenta Stellar (G…) los fondos no tienen destino. Guardá tu billetera abajo para desbloquear el panel. Este aviso no se puede cerrar hasta entonces.",
  walletGateCta: "Configurar billetera",
  walletGateBlocked: "Configurá la billetera de destino para crear links.",
  walletGateLockedHint: "Guardá tu billetera de destino para usar esta sección.",
  noticesBellAria: "Notificaciones",
  noticesBellPending: (n) =>
    n === 1 ? "1 cobro pendiente" : `${n} cobros pendientes`,
  noticesBellHint: "Abrí Notificaciones para ver cómo consultar el estado por API.",
  fiatSelectLabel: "Moneda local",
  fiatSelectHint:
    "Se usa para mostrar equivalencias aproximadas de XLM/USDC en el panel y el checkout de este navegador.",
  fiatApprox: (formatted) => `≈ ${formatted}`,
  fiatUnavailable: "≈ —",
  swapTitle: "Swap XLM ↔ USDC",
  swapDesc:
    "Convertí XLM y USDC (plus). Cotizá, firmá con tu wallet y enviá la tx. No forma parte del cobro.",
  swapPlusBadge: "Plus",
  swapFrom: "De",
  swapTo: "A",
  swapFlip: "Invertir par",
  swapGetQuote: "Cotizar",
  swapQuoting: "Cotizando…",
  swapConnectAndSwap: "Conectar wallet y swap",
  swapExecute: "Firmar y swap",
  swapSwapping: "Enviando…",
  swapMissingKey: "Swap no configurado",
  swapMissingKeyBody:
    "Falta la variable de entorno en la API. Sin ella no hay cotización ni build.",
  swapMissingKeyWhere:
    "Vercel proyecto viapay-api → Environment Variables → SOROSWAP_API_KEY (también en .env local).",
  swapQuoteFail: "No se pudo cotizar",
  swapBuildFail: "No se pudo armar la transacción",
  swapSendFail: "No se pudo enviar la transacción",
  swapWalletNeeded: "Conectá una wallet Stellar para firmar.",
  swapWallet: "Wallet",
  swapQuoteLine: (amountIn, assetIn, amountOut, assetOut) =>
    `${amountIn} ${assetIn} → ≈ ${amountOut} ${assetOut}`,
  swapImpact: (pct) => `Impacto de precio ~${pct}%`,
  swapSuccess: "Swap enviado.",
  trustlineGateTitle: "Trustline USDC requerida",
  trustlineGateBody:
    "Tu billetera de destino aún no puede recibir este activo. Sin trustline activa no te llega nada del cobro. Activá la línea con Freighter o cobrá solo en XLM.",
  trustlineGateWallet: "Wallet guardada",
  trustlineAssetLabel: "Activo a activar",
  trustlineIssuer: "Issuer",
  trustlineActivateCta: "Activar trustline (Freighter)",
  trustlineActivating: "Firmando…",
  trustlineConfirmXlm: "Entendido — cobro solo en XLM por ahora",
  trustlineWalletMismatch:
    "Freighter está en otra cuenta. Conectá la misma G… que guardaste como destino.",
  trustlinePrepareFail: "No se pudo armar la trustline",
  trustlineSubmitFail: "No se pudo enviar la trustline",
  trustlineUsdcBlocked:
    "Activá la trustline USDC en tu wallet de destino antes de cobrar en USDC.",
  trustlinesTitle: "Trustlines (testnet)",
  trustlinesDesc:
    "Activá las líneas de crédito en tu billetera de destino para poder recibir cada activo. Firmás con Freighter (misma G… guardada arriba).",
  trustlinesXlmNote: "Nativo de Stellar — no requiere trustline.",
  trustlinesNoAction: "No requiere",
  trustlinesActive: "Activa",
  trustlinesActivateCta: "Activar",
  trustlinesNeedWallet:
    "Guardá una billetera de destino arriba antes de activar trustlines.",
  trustlinesUsdt0Placeholder:
    "Issuer / contrato testnet confiable aún no definido. Próximamente.",
  trustlinesSoon: "Pronto",
  treasurySameWalletWarn:
    "Esta G… es la tesorería de fees de ViaPay. Cambiá la wallet del comercio a otra cuenta para que el split se vea correcto en la demo.",
  anchorTitle: "Cash out (SEP-24 testnet)",
  anchorBody:
    "Descubrí el SDF Test Anchor (SEP-10/24) para el camino de retiro USDC → fiat de prueba.",
  anchorHonest:
    "Honestidad: la transferencia al anchor es testnet; el payout fiat está simulado. No es offramp bancario real.",
  anchorDiscover: "Descubrir anchor",
  anchorOpen: "Abrir test anchor",
  anchorNeedKey: "Necesitás una API key de sesión para descubrir el anchor.",
  anchorDiscoverFail: "No se pudo leer el stellar.toml del anchor",
  anchorMissingEndpoints:
    "El stellar.toml del anchor no expone WEB_AUTH ni TRANSFER_SERVER_SEP0024.",
  anchorSep10Sep24: "SEP-10 → SEP-24 (Freighter)",
  anchorSepRunning: "Autenticando…",
  anchorSep24Fail: "No se pudo abrir el flujo SEP-24 interactivo",
  anchorJwtOk: "JWT SEP-10 OK:",
  anchorOpenInteractive: "Abrir UI interactiva del anchor",
  sepsTitle: "SEPs Stellar (vivo)",
  sepsBody:
    "Matriz desde GET /v1/health: identidad, auth, cash-out demo, SAC y verified build.",
  sepsLoadFail: "No se pudo cargar el estado de SEPs",
  contactsTitle: "Contactos",
  contactsBody:
    "Agenda para invoices. Nombre + teléfono (WhatsApp) y/o email.",
  contactsName: "Nombre",
  contactsPhone: "Teléfono",
  contactsEmail: "Email",
  contactsAdd: "Agregar",
  contactsDelete: "Eliminar contacto",
  contactsLoadFail: "No se pudieron cargar los contactos",
  contactsSaveFail: "No se pudo guardar el contacto",
  waTitle: "Asistente WhatsApp",
  waBody:
    "Asistente propio vía Meta Cloud API. Menú 1/2/3 → mismo payment_intent / checkout Stellar que el panel.",
  waNotConfigured:
    "Meta WhatsApp no configurado en la API (META_WA_*). Igual podés crear cobros y compartir con wa.me desde el panel.",
  waLinked: "Número vinculado",
  waStep1: "Escribí al número Business de ViaPay en WhatsApp (el de Meta).",
  waStep2: "Generá un código abajo y mandá: vincular 123456",
  waStep3: "Menú: 1 Nuevo cobro → contacto → monto → activo → Sí",
  waGenCode: "Generar código de vínculo",
  waSendCode: "Enviá al bot:",
  waCodeExpires: "Vence",
  waStatusFail: "No se pudo leer el estado de WhatsApp",
  waCodeFail: "No se pudo generar el código",
  invoiceContact: "Cobrar a (opcional)",
  invoiceNoContact: "Sin contacto — solo link",
  invoiceContactHint:
    "Si elegís contacto, después podés abrir WhatsApp o email con el link listo.",
  shareWhatsApp: "Enviar por WhatsApp",
  shareEmail: "Enviar por email",
  invoiceWaText: (name, amount, asset, url) =>
    `Hola ${name}, te cobran ${amount} ${asset} por ViaPay:\n${url}`,
  invoiceMailSubject: (amount, asset) => `Cobro ViaPay ${amount} ${asset}`,
  historyTo: "Para",
};

const en: Messages = {
  theme: { toLight: "Switch to light mode", toDark: "Switch to dark mode" },
  locale: { switch: "Choose language" },
  homeAria: "ViaPay, home",
  signOut: "Sign out",
  mastheadTitle: (name) => `Hi, ${name}`,
  missingKey: "Your session has no API key. Sign out and sign in again with Google or GitHub.",
  footerNetwork: (network, fee) => `Network ${network} · ViaPay fee ${fee}`,
  loginBack: "Back",
  loginTagline: "Get paid on Stellar with a link. No code.",
  loginTitle: "Open the dashboard",
  loginDescOauth: "Sign in with Google or GitHub to manage your charges.",
  loginDescLocal: "Google/GitHub sign-in is not configured in this environment.",
  continueGoogle: "Continue with Google",
  continueGithub: "Continue with GitHub",
  loginAccountHint:
    "First time creates your merchant account. Next times, same sign-in.",
  loginOauthHint:
    "Configure Supabase Auth (NEXT_PUBLIC_SUPABASE_URL and publishable key) to enable login.",
  loginError: (code) => {
    if (code === "oauth") return "We couldn’t finish sign-in. Please try again.";
    if (code === "link") return "Your session is valid, but we couldn’t create the merchant account.";
    if (code === "supabase") return "Auth is unavailable right now. Try again in a moment.";
    return "Something went wrong signing in. Please try again.";
  },
  createTitle: "New charge",
  amount: "Amount",
  asset: "Currency",
  whyOptional: "Memo (optional)",
  whyPlaceholder: "e.g. Order #1042",
  resellerToggle: "Reseller fee",
  resellerHint:
    "Marketplaces or partners. Paid in the same transaction, before your net.",
  resellerPct: "Reseller fee",
  resellerWallet: "Reseller wallet",
  feeVia: (bps) => `ViaPay fee (${bps})`,
  feeReseller: (bps) => `Reseller (${bps})`,
  youReceive: "You receive",
  creating: "Creating…",
  createCta: "Create link",
  readyCopy:
    "Done — one link (human or agent). Browsers open checkout; agents get the 402:",
  copied: "Copied",
  copyLink: "Copy link",
  openCheckout: "Open checkout",
  recentTitle: "Recent links",
  recentEmpty: "No charges yet.",
  resellerLine: (bps, amount, asset, short) =>
    `Reseller ${bps} · ${amount} ${asset} to ${short}…`,
  copy: "Copy",
  open: "Open",
  statusPending: "Pending",
  statusPaid: "Paid",
  statusCanceled: "Canceled",
  statusExpired: "Expired",
  errResellerMax: (max) => `Reseller fee can’t exceed ${max}.`,
  errResellerAll: "ViaPay plus reseller would take everything. Lower the fee.",
  errResellerWallet: "Missing the reseller’s Stellar wallet (G…).",
  errNoKey: "No API key. Sign out and sign in again.",
  errCreate: "Could not create the link",
  errGeneric: "Error",
  warnResellerMissing: "That wallet doesn’t exist on this network yet.",
  warnResellerUsdc: "That wallet can’t receive USDC. The charge will fail.",
  panelMetaAria: "Account status",
  statsAria: "Charge summary",
  statTotalCharges: "Charges",
  statTotalHint: "Payment links on your account",
  statReceived: "Received",
  statReceivedHint: (paid) =>
    paid === 0 ? "Net credited when customers pay" : `${paid} confirmed payment${paid === 1 ? "" : "s"}`,
  statPending: "Pending",
  statPendingHint: "Waiting for customer payment",
  statSucceeded: "Paid",
  statSucceededHint: "Charges with confirmed payment",
  statCanceled: "Canceled / expired",
  periodAria: "Period",
  periodToday: "Today",
  periodMonth: "This month",
  periodAll: "All time",
  overviewTitle: "Overview",
  overviewDesc: "Period snapshot: net sales, open charges, and conversion.",
  overviewEmptyTitle: "No activity yet",
  overviewEmptyBody: "Create your first payment link to see numbers here.",
  overviewEmptyCta: "Create charge",
  overviewPeriodEmpty: "No charges in this period.",
  overviewRecentTitle: "Latest payments",
  overviewRecentEmpty: "No confirmed payments in this period yet.",
  overviewConversion: (paid, total) =>
    total === 0
      ? "No charges"
      : `${paid} of ${total} charges paid (${Math.round((paid / total) * 100)}%)`,
  overviewGoHistory: "View history",
  statsTitle: "Statistics",
  statsDesc: "Breakdown by status and asset for the selected period.",
  statsEmptyTitle: "No data yet",
  statsEmptyBody: "Once you have charges, the breakdown appears here.",
  statsPeriodEmpty: "No charges in this period.",
  statsBreakdownAria: "Counts by status",
  statsByAsset: "By asset",
  statsFees: "ViaPay fees",
  integrationEmptyTitle: "Integration unavailable",
  historyTitle: "History",
  historyEmpty: "No payments received yet.",
  integrationTitle: "Integration",
  integrationDesc:
    "Destination wallet, trustlines (testnet), API key, and how to create payment links in code.",
  integrationKeyLabel: "Secret API key",
  integrationKeyHint: "Use it as Authorization: Bearer … on your server only.",
  integrationKeyExplain:
    "Today you only get a secret key (sk_…). There is no publishable key — do not create charges from the payer's browser. Store the key in env vars.",
  integrationDocs: "View docs",
  integrationWalletLabel: "Destination wallet",
  integrationWalletHint: "Stellar account (G…) that receives the net.",
  integrationWalletSave: "Save wallet",
  integrationWalletSaved: "Wallet saved",
  integrationWalletFail: "Could not save the wallet",
  integrationNoWallet:
    "Required: without a destination wallet, funds cannot reach your account.",
  integrationPollHint:
    "Check status with GET /v1/payment_intents/:id (or the list).",
  integrationUsersTitle: "Your platform users",
  integrationUsersBody:
    "Pass external_user_id (or externalUserId / customerId) with your customer's id. It is stored on the charge so you can reconcile who paid. It is not a ViaPay user.",
  integrationSnippetTitle: "Create a payment link",
  integrationSnippetCurl: "cURL",
  integrationSnippetSdk: "JavaScript SDK",
  historyColWhen: "Date",
  historyColConcept: "Memo",
  historyColAmount: "Total",
  historyColNet: "Your net",
  historyColStatus: "Status",
  historyColActions: "Actions",
  historyNoMemo: "No memo",
  historyShowMore: (n) => `Show ${n} more`,
  navAria: "Dashboard sections",
  navResumen: "Overview",
  navCobros: "Charges",
  navHistorial: "History",
  navEstadisticas: "Statistics",
  navSwap: "Swap",
  navIntegracion: "Integration",
  navNotificaciones: "Notifications",
  cobrosGuideTitle: "How to get paid",
  cobrosGuide1: "Create the link with the amount and optional reseller fee.",
  cobrosGuide2: "Share the ViaPay checkout. The customer signs in their wallet (Freighter, Lobstr, …).",
  cobrosGuide3:
    "When paid, status becomes Paid. Poll status by id with the API.",
  noticesTitle: "Notifications",
  noticesDesc: "No webhooks required: poll charge status via the API.",
  noticesPoll:
    "After payment, GET the intent by id. status: succeeded and stellar_tx_hash confirm.",
  noticesPollList: "For several charges, list with Bearer auth:",
  noticesNoWebhook:
    "Webhook APIs still exist if you need them, but the dashboard does not require them.",
  walletGateBanner:
    "Without a destination wallet, funds cannot arrive. Save your Stellar account (G…) to unlock the panel.",
  walletGateTitle: "Destination wallet required",
  walletGateBody:
    "Without a Stellar account (G…) there is nowhere for funds to land. Save your wallet below to unlock the panel. This dialog cannot be dismissed until then.",
  walletGateCta: "Set destination wallet",
  walletGateBlocked: "Set a destination wallet to create payment links.",
  walletGateLockedHint: "Save your destination wallet to use this section.",
  noticesBellAria: "Notifications",
  noticesBellPending: (n) =>
    n === 1 ? "1 pending charge" : `${n} pending charges`,
  noticesBellHint: "Open Notifications to see how to poll status via the API.",
  fiatSelectLabel: "Local currency",
  fiatSelectHint:
    "Used for approximate XLM/USDC equivalents in the panel and checkout on this browser.",
  fiatApprox: (formatted) => `≈ ${formatted}`,
  fiatUnavailable: "≈ —",
  swapTitle: "Swap XLM ↔ USDC",
  swapDesc:
    "Convert XLM and USDC (plus). Quote, sign with your wallet, submit. Not part of charging.",
  swapPlusBadge: "Plus",
  swapFrom: "From",
  swapTo: "To",
  swapFlip: "Flip pair",
  swapGetQuote: "Get quote",
  swapQuoting: "Quoting…",
  swapConnectAndSwap: "Connect wallet & swap",
  swapExecute: "Sign & swap",
  swapSwapping: "Submitting…",
  swapMissingKey: "Swap not configured",
  swapMissingKeyBody:
    "Missing API env var. Without it there is no quote or build.",
  swapMissingKeyWhere:
    "Vercel project viapay-api → Environment Variables → SOROSWAP_API_KEY (and local .env).",
  swapQuoteFail: "Could not get a quote",
  swapBuildFail: "Could not build the transaction",
  swapSendFail: "Could not submit the transaction",
  swapWalletNeeded: "Connect a Stellar wallet to sign.",
  swapWallet: "Wallet",
  swapQuoteLine: (amountIn, assetIn, amountOut, assetOut) =>
    `${amountIn} ${assetIn} → ≈ ${amountOut} ${assetOut}`,
  swapImpact: (pct) => `Price impact ~${pct}%`,
  swapSuccess: "Swap submitted.",
  trustlineGateTitle: "USDC trustline required",
  trustlineGateBody:
    "Your destination wallet still can’t receive this asset. Without an active trustline, nothing from the charge reaches you. Open it with Freighter or charge in XLM only.",
  trustlineGateWallet: "Saved wallet",
  trustlineAssetLabel: "Asset to activate",
  trustlineIssuer: "Issuer",
  trustlineActivateCta: "Activate trustline (Freighter)",
  trustlineActivating: "Signing…",
  trustlineConfirmXlm: "Got it — charge in XLM only for now",
  trustlineWalletMismatch:
    "Freighter is on a different account. Connect the same G… you saved as destination.",
  trustlinePrepareFail: "Could not build the trustline",
  trustlineSubmitFail: "Could not submit the trustline",
  trustlineUsdcBlocked:
    "Activate the USDC trustline on your destination wallet before charging in USDC.",
  trustlinesTitle: "Trustlines (testnet)",
  trustlinesDesc:
    "Open credit lines on your destination wallet so you can receive each asset. You sign with Freighter (same G… saved above).",
  trustlinesXlmNote: "Stellar native — no trustline required.",
  trustlinesNoAction: "Not required",
  trustlinesActive: "Active",
  trustlinesActivateCta: "Activate",
  trustlinesNeedWallet:
    "Save a destination wallet above before activating trustlines.",
  trustlinesUsdt0Placeholder:
    "Reliable testnet issuer / contract not defined yet. Coming soon.",
  trustlinesSoon: "Soon",
  treasurySameWalletWarn:
    "This G… is ViaPay’s fee treasury. Set the merchant wallet to a different account so the split is clear in the demo.",
  anchorTitle: "Cash out (SEP-24 testnet)",
  anchorBody:
    "Discover the SDF Test Anchor (SEP-10/24) for a USDC → test fiat withdrawal path.",
  anchorHonest:
    "Honesty: the transfer to the anchor is testnet; fiat payout is simulated. Not a real bank offramp.",
  anchorDiscover: "Discover anchor",
  anchorOpen: "Open test anchor",
  anchorNeedKey: "You need a session API key to discover the anchor.",
  anchorDiscoverFail: "Could not read the anchor stellar.toml",
  anchorMissingEndpoints:
    "The anchor stellar.toml does not expose WEB_AUTH or TRANSFER_SERVER_SEP0024.",
  anchorSep10Sep24: "SEP-10 → SEP-24 (Freighter)",
  anchorSepRunning: "Authenticating…",
  anchorSep24Fail: "Could not open the SEP-24 interactive flow",
  anchorJwtOk: "SEP-10 JWT OK:",
  anchorOpenInteractive: "Open anchor interactive UI",
  sepsTitle: "Stellar SEPs (live)",
  sepsBody:
    "Matrix from GET /v1/health: identity, auth, cash-out demo, SAC, and verified build.",
  sepsLoadFail: "Could not load SEP status",
  contactsTitle: "Contacts",
  contactsBody:
    "Address book for invoices. Name + phone (WhatsApp) and/or email.",
  contactsName: "Name",
  contactsPhone: "Phone",
  contactsEmail: "Email",
  contactsAdd: "Add",
  contactsDelete: "Delete contact",
  contactsLoadFail: "Could not load contacts",
  contactsSaveFail: "Could not save contact",
  waTitle: "WhatsApp assistant",
  waBody:
    "Your own assistant on Meta Cloud API. Menu 1/2/3 → same payment_intent / Stellar checkout as the panel.",
  waNotConfigured:
    "Meta WhatsApp is not configured on the API (META_WA_*). You can still create charges and share via wa.me from the panel.",
  waLinked: "Linked number",
  waStep1: "Message ViaPay’s WhatsApp Business number (from Meta).",
  waStep2: "Generate a code below and send: vincular 123456",
  waStep3: "Menu: 1 New charge → contact → amount → asset → Yes",
  waGenCode: "Generate link code",
  waSendCode: "Send to the bot:",
  waCodeExpires: "Expires",
  waStatusFail: "Could not load WhatsApp status",
  waCodeFail: "Could not generate code",
  invoiceContact: "Charge to (optional)",
  invoiceNoContact: "No contact — link only",
  invoiceContactHint:
    "If you pick a contact, you can open WhatsApp or email with the link ready.",
  shareWhatsApp: "Send via WhatsApp",
  shareEmail: "Send via email",
  invoiceWaText: (name, amount, asset, url) =>
    `Hi ${name}, you are charged ${amount} ${asset} via ViaPay:\n${url}`,
  invoiceMailSubject: (amount, asset) => `ViaPay charge ${amount} ${asset}`,
  historyTo: "To",
};

const pt: Messages = {
  theme: { toLight: "Mudar para modo claro", toDark: "Mudar para modo escuro" },
  locale: { switch: "Escolher idioma" },
  homeAria: "ViaPay, início",
  signOut: "Sair",
  mastheadTitle: (name) => `Olá, ${name}`,
  missingKey: "Sua sessão não tem API key. Saia e entre de novo com Google ou GitHub.",
  footerNetwork: (network, fee) => `Rede ${network} · taxa ViaPay ${fee}`,
  loginBack: "Voltar",
  loginTagline: "Cobre na Stellar com um link. Sem código.",
  loginTitle: "Entrar no painel",
  loginDescOauth: "Entre com Google ou GitHub para gerenciar suas cobranças.",
  loginDescLocal: "O acesso com Google/GitHub não está configurado neste ambiente.",
  continueGoogle: "Continuar com Google",
  continueGithub: "Continuar com GitHub",
  loginAccountHint:
    "Na primeira vez cria a conta do comércio. Depois, o mesmo acesso.",
  loginOauthHint:
    "Configure o Supabase Auth (NEXT_PUBLIC_SUPABASE_URL e publishable key) para habilitar o login.",
  loginError: (code) => {
    if (code === "oauth") return "Não foi possível concluir o login. Tente de novo.";
    if (code === "link") return "Sua sessão é válida, mas não pudemos criar a conta do comércio.";
    if (code === "supabase") return "Auth indisponível agora. Tente em alguns minutos.";
    return "Algo deu errado ao entrar. Tente novamente.";
  },
  createTitle: "Nova cobrança",
  amount: "Valor",
  asset: "Moeda",
  whyOptional: "Conceito (opcional)",
  whyPlaceholder: "Ex. Pedido #1042",
  resellerToggle: "Comissão para um revendedor",
  resellerHint:
    "Marketplaces ou parceiros. Paga na mesma transação, antes do seu líquido.",
  resellerPct: "Comissão do revendedor",
  resellerWallet: "Carteira do revendedor",
  feeVia: (bps) => `Taxa ViaPay (${bps})`,
  feeReseller: (bps) => `Revendedor (${bps})`,
  youReceive: "Você recebe",
  creating: "Criando…",
  createCta: "Criar link",
  readyCopy:
    "Pronto — um só link (humano ou agente). O navegador abre o pagamento; um agente recebe o 402:",
  copied: "Copiado",
  copyLink: "Copiar link",
  openCheckout: "Abrir checkout",
  recentTitle: "Links recentes",
  recentEmpty: "Ainda não há cobranças.",
  resellerLine: (bps, amount, asset, short) =>
    `Revendedor ${bps} · ${amount} ${asset} para ${short}…`,
  copy: "Copiar",
  open: "Abrir",
  statusPending: "Pendente",
  statusPaid: "Pago",
  statusCanceled: "Cancelado",
  statusExpired: "Expirado",
  errResellerMax: (max) =>
    `A comissão do revendedor não pode passar de ${max}.`,
  errResellerAll: "ViaPay e o revendedor levariam tudo. Baixe a comissão.",
  errResellerWallet: "Falta a carteira Stellar do revendedor (G…).",
  errNoKey: "Sem API key. Saia e entre de novo.",
  errCreate: "Não foi possível criar o link",
  errGeneric: "Erro",
  warnResellerMissing: "Essa carteira ainda não existe nesta rede.",
  warnResellerUsdc: "Essa carteira não pode receber USDC. A cobrança vai falhar.",
  panelMetaAria: "Estado da conta",
  statsAria: "Resumo de cobranças",
  statTotalCharges: "Cobranças",
  statTotalHint: "Links criados na sua conta",
  statReceived: "Recebido",
  statReceivedHint: (paid) =>
    paid === 0
      ? "Líquido creditado quando pagam"
      : `${paid} pagamento${paid === 1 ? "" : "s"} confirmado${paid === 1 ? "" : "s"}`,
  statPending: "Pendentes",
  statPendingHint: "Aguardando pagamento do cliente",
  statSucceeded: "Pagos",
  statSucceededHint: "Cobranças com pagamento confirmado",
  statCanceled: "Cancelados / expirados",
  periodAria: "Período",
  periodToday: "Hoje",
  periodMonth: "Este mês",
  periodAll: "Tudo",
  overviewTitle: "Resumo",
  overviewDesc: "Snapshot do período: vendas líquidas, cobranças abertas e conversão.",
  overviewEmptyTitle: "Ainda sem atividade",
  overviewEmptyBody: "Crie seu primeiro link de cobrança para ver números aqui.",
  overviewEmptyCta: "Criar cobrança",
  overviewPeriodEmpty: "Sem cobranças neste período.",
  overviewRecentTitle: "Últimos pagamentos",
  overviewRecentEmpty: "Ainda não há pagamentos confirmados neste período.",
  overviewConversion: (paid, total) =>
    total === 0
      ? "Sem cobranças"
      : `${paid} de ${total} cobranças pagas (${Math.round((paid / total) * 100)}%)`,
  overviewGoHistory: "Ver histórico",
  statsTitle: "Estatísticas",
  statsDesc: "Detalhamento por status e ativo no período escolhido.",
  statsEmptyTitle: "Sem dados ainda",
  statsEmptyBody: "Quando houver cobranças, o detalhamento aparece aqui.",
  statsPeriodEmpty: "Sem cobranças neste período.",
  statsBreakdownAria: "Contagem por status",
  statsByAsset: "Por ativo",
  statsFees: "Taxas ViaPay",
  integrationEmptyTitle: "Integração indisponível",
  historyTitle: "Histórico",
  historyEmpty: "Ainda não há pagamentos recebidos.",
  integrationTitle: "Integração",
  integrationDesc:
    "Carteira de destino, trustlines (testnet), API key e como criar links de pagamento por código.",
  integrationKeyLabel: "API key secreta",
  integrationKeyHint: "Use em Authorization: Bearer … só no seu servidor.",
  integrationKeyExplain:
    "Hoje só existe key secreta (sk_…). Não há publishable key: não crie cobranças no navegador do pagador. Guarde a key em variáveis de ambiente.",
  integrationDocs: "Ver docs",
  integrationWalletLabel: "Carteira de destino",
  integrationWalletHint: "Conta Stellar (G…) que recebe o líquido.",
  integrationWalletSave: "Salvar carteira",
  integrationWalletSaved: "Carteira salva",
  integrationWalletFail: "Não foi possível salvar a carteira",
  integrationNoWallet:
    "Obrigatório: sem carteira de destino o dinheiro não pode chegar à sua conta.",
  integrationPollHint:
    "Consulte o status com GET /v1/payment_intents/:id (ou a lista).",
  integrationUsersTitle: "Usuários da sua plataforma",
  integrationUsersBody:
    "Passe external_user_id (ou externalUserId / customerId) com o id do seu cliente. Fica salvo na cobrança para reconciliar quem pagou. Não é um usuário ViaPay.",
  integrationSnippetTitle: "Criar um link de pagamento",
  integrationSnippetCurl: "cURL",
  integrationSnippetSdk: "SDK JavaScript",
  historyColWhen: "Data",
  historyColConcept: "Conceito",
  historyColAmount: "Total",
  historyColNet: "Seu líquido",
  historyColStatus: "Status",
  historyColActions: "Ações",
  historyNoMemo: "Sem conceito",
  historyShowMore: (n) => `Ver mais ${n}`,
  navAria: "Seções do painel",
  navResumen: "Resumo",
  navCobros: "Cobranças",
  navHistorial: "Histórico",
  navEstadisticas: "Estatísticas",
  navSwap: "Swap",
  navIntegracion: "Integração",
  navNotificaciones: "Notificações",
  cobrosGuideTitle: "Como cobrar",
  cobrosGuide1: "Crie o link com o valor e, se quiser, a comissão do revendedor.",
  cobrosGuide2: "Compartilhe o checkout ViaPay. O cliente assina na wallet (Freighter, Lobstr, …).",
  cobrosGuide3:
    "Quando pagar, fica Pago. Consulte o status por id com a API.",
  noticesTitle: "Notificações",
  noticesDesc: "Sem webhooks obrigatórios: consulte o status pela API.",
  noticesPoll:
    "Após o pagamento, peça o intent por id. status: succeeded e stellar_tx_hash confirmam.",
  noticesPollList: "Para várias cobranças, liste com Bearer auth:",
  noticesNoWebhook:
    "A API de webhooks ainda existe se precisar, mas o painel não exige.",
  walletGateBanner:
    "Sem carteira de destino o dinheiro não pode chegar. Salve sua conta Stellar (G…) para desbloquear o painel.",
  walletGateTitle: "Carteira de destino obrigatória",
  walletGateBody:
    "Sem uma conta Stellar (G…) os fundos não têm destino. Salve sua carteira abaixo para desbloquear o painel. Este aviso não pode ser fechado até então.",
  walletGateCta: "Configurar carteira",
  walletGateBlocked: "Configure a carteira de destino para criar links.",
  walletGateLockedHint: "Salve sua carteira de destino para usar esta seção.",
  noticesBellAria: "Notificações",
  noticesBellPending: (n) =>
    n === 1 ? "1 cobrança pendente" : `${n} cobranças pendentes`,
  noticesBellHint: "Abra Notificações para ver como consultar o status pela API.",
  fiatSelectLabel: "Moeda local",
  fiatSelectHint:
    "Usada para mostrar equivalentes aproximados de XLM/USDC no painel e no checkout neste navegador.",
  fiatApprox: (formatted) => `≈ ${formatted}`,
  fiatUnavailable: "≈ —",
  swapTitle: "Swap XLM ↔ USDC",
  swapDesc:
    "Converta XLM e USDC (plus). Cotize, assine com sua wallet e envie. Não faz parte da cobrança.",
  swapPlusBadge: "Plus",
  swapFrom: "De",
  swapTo: "Para",
  swapFlip: "Inverter par",
  swapGetQuote: "Cotizar",
  swapQuoting: "Cotizando…",
  swapConnectAndSwap: "Conectar wallet e swap",
  swapExecute: "Assinar e swap",
  swapSwapping: "Enviando…",
  swapMissingKey: "Swap não configurado",
  swapMissingKeyBody:
    "Falta a variável de ambiente na API. Sem ela não há cotação nem build.",
  swapMissingKeyWhere:
    "Vercel projeto viapay-api → Environment Variables → SOROSWAP_API_KEY (e .env local).",
  swapQuoteFail: "Não foi possível cotizar",
  swapBuildFail: "Não foi possível montar a transação",
  swapSendFail: "Não foi possível enviar a transação",
  swapWalletNeeded: "Conecte uma wallet Stellar para assinar.",
  swapWallet: "Wallet",
  swapQuoteLine: (amountIn, assetIn, amountOut, assetOut) =>
    `${amountIn} ${assetIn} → ≈ ${amountOut} ${assetOut}`,
  swapImpact: (pct) => `Impacto de preço ~${pct}%`,
  swapSuccess: "Swap enviado.",
  trustlineGateTitle: "Trustline USDC necessária",
  trustlineGateBody:
    "Sua carteira de destino ainda não pode receber este ativo. Sem trustline ativa, nada da cobrança chega a você. Ative com Freighter ou cobre só em XLM.",
  trustlineGateWallet: "Wallet salva",
  trustlineAssetLabel: "Ativo a ativar",
  trustlineIssuer: "Issuer",
  trustlineActivateCta: "Ativar trustline (Freighter)",
  trustlineActivating: "Assinando…",
  trustlineConfirmXlm: "Entendi — cobrar só em XLM por agora",
  trustlineWalletMismatch:
    "O Freighter está em outra conta. Conecte a mesma G… que você salvou como destino.",
  trustlinePrepareFail: "Não foi possível montar a trustline",
  trustlineSubmitFail: "Não foi possível enviar a trustline",
  trustlineUsdcBlocked:
    "Ative a trustline USDC na sua wallet de destino antes de cobrar em USDC.",
  trustlinesTitle: "Trustlines (testnet)",
  trustlinesDesc:
    "Ative as linhas de crédito na sua carteira de destino para receber cada ativo. Assine com Freighter (mesma G… salva acima).",
  trustlinesXlmNote: "Nativo da Stellar — não exige trustline.",
  trustlinesNoAction: "Não exige",
  trustlinesActive: "Ativa",
  trustlinesActivateCta: "Ativar",
  trustlinesNeedWallet:
    "Salve uma carteira de destino acima antes de ativar trustlines.",
  trustlinesUsdt0Placeholder:
    "Issuer / contrato testnet confiável ainda não definido. Em breve.",
  trustlinesSoon: "Em breve",
  treasurySameWalletWarn:
    "Esta G… é a tesouraria de fees da ViaPay. Troque a carteira do comércio por outra conta para o split ficar claro na demo.",
  anchorTitle: "Cash out (SEP-24 testnet)",
  anchorBody:
    "Descubra o SDF Test Anchor (SEP-10/24) para o caminho USDC → fiat de teste.",
  anchorHonest:
    "Honestidade: a transferência ao anchor é testnet; o payout fiat é simulado. Não é offramp bancário real.",
  anchorDiscover: "Descobrir anchor",
  anchorOpen: "Abrir test anchor",
  anchorNeedKey: "Você precisa de uma API key de sessão para descobrir o anchor.",
  anchorDiscoverFail: "Não foi possível ler o stellar.toml do anchor",
  anchorMissingEndpoints:
    "O stellar.toml do anchor não expõe WEB_AUTH nem TRANSFER_SERVER_SEP0024.",
  anchorSep10Sep24: "SEP-10 → SEP-24 (Freighter)",
  anchorSepRunning: "Autenticando…",
  anchorSep24Fail: "Não foi possível abrir o fluxo SEP-24 interativo",
  anchorJwtOk: "JWT SEP-10 OK:",
  anchorOpenInteractive: "Abrir UI interativa do anchor",
  sepsTitle: "SEPs Stellar (vivo)",
  sepsBody:
    "Matriz de GET /v1/health: identidade, auth, cash-out demo, SAC e verified build.",
  sepsLoadFail: "Não foi possível carregar o status dos SEPs",
  contactsTitle: "Contatos",
  contactsBody:
    "Agenda para invoices. Nome + telefone (WhatsApp) e/ou email.",
  contactsName: "Nome",
  contactsPhone: "Telefone",
  contactsEmail: "Email",
  contactsAdd: "Adicionar",
  contactsDelete: "Excluir contato",
  contactsLoadFail: "Não foi possível carregar os contatos",
  contactsSaveFail: "Não foi possível salvar o contato",
  waTitle: "Assistente WhatsApp",
  waBody:
    "Assistente próprio via Meta Cloud API. Menu 1/2/3 → mesmo payment_intent / checkout Stellar do painel.",
  waNotConfigured:
    "Meta WhatsApp não configurado na API (META_WA_*). Você ainda pode criar cobranças e compartilhar com wa.me no painel.",
  waLinked: "Número vinculado",
  waStep1: "Escreva para o número Business da ViaPay no WhatsApp (Meta).",
  waStep2: "Gere um código abaixo e envie: vincular 123456",
  waStep3: "Menu: 1 Nova cobrança → contato → valor → ativo → Sim",
  waGenCode: "Gerar código de vínculo",
  waSendCode: "Envie ao bot:",
  waCodeExpires: "Expira",
  waStatusFail: "Não foi possível ler o status do WhatsApp",
  waCodeFail: "Não foi possível gerar o código",
  invoiceContact: "Cobrar de (opcional)",
  invoiceNoContact: "Sem contato — só link",
  invoiceContactHint:
    "Se escolher um contato, depois pode abrir WhatsApp ou email com o link pronto.",
  shareWhatsApp: "Enviar pelo WhatsApp",
  shareEmail: "Enviar por email",
  invoiceWaText: (name, amount, asset, url) =>
    `Olá ${name}, cobrança de ${amount} ${asset} via ViaPay:\n${url}`,
  invoiceMailSubject: (amount, asset) => `Cobrança ViaPay ${amount} ${asset}`,
  historyTo: "Para",
};

export const MESSAGES: Record<Locale, Messages> = { es, en, pt };
