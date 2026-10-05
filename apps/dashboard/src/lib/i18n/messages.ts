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
  integrationDocs: string;
  integrationWalletLabel: string;
  integrationWalletHint: string;
  integrationWalletSave: string;
  integrationWalletSaved: string;
  integrationWalletFail: string;
  integrationNoWallet: string;
  integrationPollHint: string;
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
  overviewRecentTitle: string;
  overviewRecentEmpty: string;
  overviewConversion: (paid: number, total: number) => string;
  overviewGoHistory: string;
  noticesBellAria: string;
  noticesBellPending: (n: number) => string;
  noticesBellHint: string;
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
  readyCopy: "Listo — copiá y compartí:",
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
  integrationDesc: "Billetera de destino y API key de tu comercio.",
  integrationKeyLabel: "API key",
  integrationKeyHint: "Usala en Authorization: Bearer …",
  integrationDocs: "Ver docs",
  integrationWalletLabel: "Billetera de destino",
  integrationWalletHint: "Cuenta Stellar (G…) donde llega el neto.",
  integrationWalletSave: "Guardar billetera",
  integrationWalletSaved: "Billetera guardada",
  integrationWalletFail: "No se pudo guardar la billetera",
  integrationNoWallet: "Configurá una billetera antes de crear cobros.",
  integrationPollHint:
    "Consultá el estado con GET /v1/payment_intents/:id (o la lista).",
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
    "Configurá tu billetera de destino (G…) en Integración antes de crear cobros.",
  walletGateTitle: "Falta tu billetera de destino",
  walletGateBody:
    "Sin una cuenta Stellar (G…) no podemos crear cobros: el neto no tendría dónde llegar.",
  walletGateCta: "Ir a Integración",
  walletGateBlocked: "Configurá la billetera de destino para crear links.",
  noticesBellAria: "Notificaciones",
  noticesBellPending: (n) =>
    n === 1 ? "1 cobro pendiente" : `${n} cobros pendientes`,
  noticesBellHint: "Abrí Notificaciones para ver cómo consultar el estado por API.",
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
  readyCopy: "Done — copy and share:",
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
  integrationDesc: "Destination wallet and API key for your merchant.",
  integrationKeyLabel: "API key",
  integrationKeyHint: "Use it as Authorization: Bearer …",
  integrationDocs: "View docs",
  integrationWalletLabel: "Destination wallet",
  integrationWalletHint: "Stellar account (G…) that receives the net.",
  integrationWalletSave: "Save wallet",
  integrationWalletSaved: "Wallet saved",
  integrationWalletFail: "Could not save the wallet",
  integrationNoWallet: "Set a destination wallet before creating charges.",
  integrationPollHint:
    "Check status with GET /v1/payment_intents/:id (or the list).",
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
    "Set your destination wallet (G…) in Integration before creating charges.",
  walletGateTitle: "Destination wallet required",
  walletGateBody:
    "Without a Stellar account (G…) we can’t create charges: there would be nowhere for the net to land.",
  walletGateCta: "Go to Integration",
  walletGateBlocked: "Set a destination wallet to create payment links.",
  noticesBellAria: "Notifications",
  noticesBellPending: (n) =>
    n === 1 ? "1 pending charge" : `${n} pending charges`,
  noticesBellHint: "Open Notifications to see how to poll status via the API.",
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
  readyCopy: "Pronto — copie e compartilhe:",
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
  integrationDesc: "Carteira de destino e API key do seu comércio.",
  integrationKeyLabel: "API key",
  integrationKeyHint: "Use em Authorization: Bearer …",
  integrationDocs: "Ver docs",
  integrationWalletLabel: "Carteira de destino",
  integrationWalletHint: "Conta Stellar (G…) que recebe o líquido.",
  integrationWalletSave: "Salvar carteira",
  integrationWalletSaved: "Carteira salva",
  integrationWalletFail: "Não foi possível salvar a carteira",
  integrationNoWallet: "Configure uma carteira antes de criar cobranças.",
  integrationPollHint:
    "Consulte o status com GET /v1/payment_intents/:id (ou a lista).",
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
    "Configure sua carteira de destino (G…) em Integração antes de criar cobranças.",
  walletGateTitle: "Falta a carteira de destino",
  walletGateBody:
    "Sem uma conta Stellar (G…) não podemos criar cobranças: o líquido não teria para onde chegar.",
  walletGateCta: "Ir para Integração",
  walletGateBlocked: "Configure a carteira de destino para criar links.",
  noticesBellAria: "Notificações",
  noticesBellPending: (n) =>
    n === 1 ? "1 cobrança pendente" : `${n} cobranças pendentes`,
  noticesBellHint: "Abra Notificações para ver como consultar o status pela API.",
};

export const MESSAGES: Record<Locale, Messages> = { es, en, pt };
