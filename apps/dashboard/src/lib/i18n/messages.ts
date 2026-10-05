import type { Locale } from "@viapay/prefs";

export type Messages = {
  theme: { toLight: string; toDark: string };
  locale: { switch: string };
  homeAria: string;
  signOut: string;
  mastheadTitle: string;
  mastheadBody: (fee: string) => string;
  stepCreateTitle: string;
  stepCreateBody: string;
  stepShareTitle: string;
  stepShareBody: string;
  stepPaidTitle: string;
  stepPaidBody: string;
  missingKey: string;
  footerNetwork: (network: string, fee: string) => string;
  footerTreasury: string;
  footerUnconfigured: string;
  loginTagline: string;
  loginTitle: string;
  loginDescOauth: string;
  loginDescLocal: string;
  continueGoogle: string;
  continueGithub: string;
  loginOauthHint: string;
  loginError: (code: string) => string;
  createTitle: string;
  createDesc: string;
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
  recentDesc: string;
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
  receiveTitle: (network: string) => string;
  receiveMerchantMissing: string;
  receiveMerchantUsdc: string;
  receiveTreasury: (short: string) => string;
  receiveResellerMissing: string;
  receiveResellerUsdc: string;
  receiveResellerTail: string;
  copyTrustline: string;
  faucetUsdc: string;
  webhooksTitle: string;
  webhooksDesc: string;
  webhooksSave: string;
  webhooksDeliveries: string;
  webhooksAttempts: (n: number) => string;
  webhooksCreateFail: string;
};

const es: Messages = {
  theme: { toLight: "Cambiar a modo claro", toDark: "Cambiar a modo oscuro" },
  locale: { switch: "Elegir idioma" },
  homeAria: "ViaPay, inicio",
  signOut: "Cerrar sesión",
  mastheadTitle: "Cobra con un link y reparte la comisión",
  mastheadBody: (fee) =>
    `Tú pones el monto. ViaPay se queda ${fee}, el revendedor se queda lo que acuerdes con él, y el resto llega directo a tu billetera. Todo en el mismo pago.`,
  stepCreateTitle: "Creas el link",
  stepCreateBody: "Monto, moneda y, si hace falta, el revendedor.",
  stepShareTitle: "Lo compartes",
  stepShareBody: "WhatsApp, mail, tu web, o la API para un agente.",
  stepPaidTitle: "Te pagan",
  stepPaidBody: "Ves la confirmación en cuanto entra.",
  missingKey: "Tu sesión no tiene clave de API. Cerrá sesión y volvé a entrar con Google o GitHub.",
  footerNetwork: (network, fee) => `Red ${network} · fee ViaPay ${fee} · tesorería `,
  footerTreasury: "tesorería",
  footerUnconfigured: "sin configurar",
  loginTagline: "Cobra en Stellar con un link. Sin código.",
  loginTitle: "Entrar al panel",
  loginDescOauth: "Entrá con tu cuenta de Google o GitHub para gestionar cobros.",
  loginDescLocal:
    "El acceso con Google/GitHub no está configurado en este entorno.",
  continueGoogle: "Continuar con Google",
  continueGithub: "Continuar con GitHub",
  loginOauthHint:
    "Configurá Supabase Auth (NEXT_PUBLIC_SUPABASE_URL y publishable key) para habilitar el login.",
  loginError: (code) => {
    if (code === "oauth") return "No pudimos completar el inicio de sesión. Probá de nuevo.";
    if (code === "link") return "Tu sesión es válida, pero no pudimos crear la cuenta de comercio.";
    if (code === "supabase") return "Auth no está disponible ahora. Reintentá en unos minutos.";
    return "Algo salió mal al entrar. Probá otra vez.";
  },
  createTitle: "Crear link de pago",
  createDesc:
    "En 10 segundos tienes un link para cobrar. Compártelo por WhatsApp, mail o tu web.",
  amount: "Monto",
  asset: "Moneda",
  whyOptional: "¿Por qué cobran? (opcional)",
  whyPlaceholder: "Ej. Pedido #1042",
  resellerToggle: "Reparte una comisión con un revendedor",
  resellerHint:
    "Para marketplaces o partners que traen la venta. Se paga en la misma transacción, antes de tu neto.",
  resellerPct: "Comisión del revendedor",
  resellerWallet: "Billetera del revendedor",
  feeVia: (bps) => `Fee ViaPay (${bps})`,
  feeReseller: (bps) => `Revendedor (${bps})`,
  youReceive: "Tú recibes",
  creating: "Creando…",
  createCta: "Crear link de pago",
  readyCopy: "Listo. Copia y comparte:",
  copied: "Copiado",
  copyLink: "Copiar link",
  openCheckout: "Abrir checkout",
  recentTitle: "Tus links recientes",
  recentDesc: "Estado en tiempo real. Cuando el cliente paga, pasa a pagado.",
  recentEmpty: "Aún no hay links. Crea el primero a la izquierda.",
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
  receiveTitle: (network) => `Antes de cobrar en ${network}`,
  receiveMerchantMissing: "Tu billetera no existe todavía. En testnet fóndeala con ",
  receiveMerchantUsdc:
    "USDC pide una línea de confianza. Ábrela desde tu billetera (Lobstr o Freighter) con el enlace SEP-7.",
  receiveTreasury: (short) =>
    `La tesorería (${short}…) no puede recibir el fee. Hay que fondearla y darle USDC antes de cobrar.`,
  receiveResellerMissing: "no existe en esta red",
  receiveResellerUsdc: "no puede recibir USDC",
  receiveResellerTail:
    ". Su comisión va en la misma transacción, así que el cobro falla hasta que pueda recibir.",
  copyTrustline: "Copiar trustline USDC",
  faucetUsdc: "Faucet USDC",
  webhooksTitle: "Avisos (webhooks)",
  webhooksDesc:
    "Cuando un cobro pasa a pagado, ViaPay avisa a tu URL. El secreto se muestra una sola vez.",
  webhooksSave: "Guardar",
  webhooksDeliveries: "Entregas",
  webhooksAttempts: (n) => `${n} intentos`,
  webhooksCreateFail: "No se pudo crear el webhook",
};

const en: Messages = {
  theme: { toLight: "Switch to light mode", toDark: "Switch to dark mode" },
  locale: { switch: "Choose language" },
  homeAria: "ViaPay, home",
  signOut: "Sign out",
  mastheadTitle: "Charge with a link and split the fee",
  mastheadBody: (fee) =>
    `You set the amount. ViaPay keeps ${fee}, the reseller keeps what you agree, and the rest goes straight to your wallet — all in the same payment.`,
  stepCreateTitle: "Create the link",
  stepCreateBody: "Amount, currency, and reseller if needed.",
  stepShareTitle: "Share it",
  stepShareBody: "WhatsApp, email, your site, or the API for an agent.",
  stepPaidTitle: "Get paid",
  stepPaidBody: "You see confirmation as soon as it lands.",
  missingKey: "Your session has no API key. Sign out and sign in again with Google or GitHub.",
  footerNetwork: (network, fee) => `Network ${network} · ViaPay fee ${fee} · treasury `,
  footerTreasury: "treasury",
  footerUnconfigured: "not configured",
  loginTagline: "Get paid on Stellar with a link. No code.",
  loginTitle: "Open the dashboard",
  loginDescOauth: "Sign in with Google or GitHub to manage your charges.",
  loginDescLocal: "Google/GitHub sign-in is not configured in this environment.",
  continueGoogle: "Continue with Google",
  continueGithub: "Continue with GitHub",
  loginOauthHint:
    "Configure Supabase Auth (NEXT_PUBLIC_SUPABASE_URL and publishable key) to enable login.",
  loginError: (code) => {
    if (code === "oauth") return "We couldn’t finish sign-in. Please try again.";
    if (code === "link") return "Your session is valid, but we couldn’t create the merchant account.";
    if (code === "supabase") return "Auth is unavailable right now. Try again in a moment.";
    return "Something went wrong signing in. Please try again.";
  },
  createTitle: "Create payment link",
  createDesc:
    "In 10 seconds you have a link to get paid. Share it on WhatsApp, email, or your site.",
  amount: "Amount",
  asset: "Currency",
  whyOptional: "What is this for? (optional)",
  whyPlaceholder: "e.g. Order #1042",
  resellerToggle: "Split a fee with a reseller",
  resellerHint:
    "For marketplaces or partners who bring the sale. Paid in the same transaction, before your net.",
  resellerPct: "Reseller fee",
  resellerWallet: "Reseller wallet",
  feeVia: (bps) => `ViaPay fee (${bps})`,
  feeReseller: (bps) => `Reseller (${bps})`,
  youReceive: "You receive",
  creating: "Creating…",
  createCta: "Create payment link",
  readyCopy: "Done. Copy and share:",
  copied: "Copied",
  copyLink: "Copy link",
  openCheckout: "Open checkout",
  recentTitle: "Your recent links",
  recentDesc: "Live status. When the customer pays, it becomes paid.",
  recentEmpty: "No links yet. Create the first one on the left.",
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
  receiveTitle: (network) => `Before charging on ${network}`,
  receiveMerchantMissing: "Your wallet doesn’t exist yet. On testnet fund it with ",
  receiveMerchantUsdc:
    "USDC needs a trustline. Open it from your wallet (Lobstr or Freighter) with the SEP-7 link.",
  receiveTreasury: (short) =>
    `Treasury (${short}…) can’t receive the fee. Fund it and add USDC before charging on-chain.`,
  receiveResellerMissing: "doesn’t exist on this network",
  receiveResellerUsdc: "can’t receive USDC",
  receiveResellerTail:
    ". Their cut is in the same transaction, so the charge fails until they can receive.",
  copyTrustline: "Copy USDC trustline",
  faucetUsdc: "USDC faucet",
  webhooksTitle: "Webhooks",
  webhooksDesc:
    "When a charge becomes paid, ViaPay POSTs to your URL. The secret is shown once.",
  webhooksSave: "Save",
  webhooksDeliveries: "Deliveries",
  webhooksAttempts: (n) => `${n} attempts`,
  webhooksCreateFail: "Could not create the webhook",
};

const pt: Messages = {
  theme: { toLight: "Mudar para modo claro", toDark: "Mudar para modo escuro" },
  locale: { switch: "Escolher idioma" },
  homeAria: "ViaPay, início",
  signOut: "Sair",
  mastheadTitle: "Cobre com um link e divida a comissão",
  mastheadBody: (fee) =>
    `Você define o valor. A ViaPay fica com ${fee}, o revendedor com o que vocês combinarem, e o resto vai direto para sua carteira — tudo no mesmo pagamento.`,
  stepCreateTitle: "Crie o link",
  stepCreateBody: "Valor, moeda e, se precisar, o revendedor.",
  stepShareTitle: "Compartilhe",
  stepShareBody: "WhatsApp, e-mail, seu site, ou a API para um agente.",
  stepPaidTitle: "Receba",
  stepPaidBody: "Você vê a confirmação assim que entrar.",
  missingKey: "Sua sessão não tem API key. Saia e entre de novo com Google ou GitHub.",
  footerNetwork: (network, fee) => `Rede ${network} · taxa ViaPay ${fee} · tesouraria `,
  footerTreasury: "tesouraria",
  footerUnconfigured: "sem configurar",
  loginTagline: "Cobre na Stellar com um link. Sem código.",
  loginTitle: "Entrar no painel",
  loginDescOauth: "Entre com Google ou GitHub para gerenciar suas cobranças.",
  loginDescLocal: "O acesso com Google/GitHub não está configurado neste ambiente.",
  continueGoogle: "Continuar com Google",
  continueGithub: "Continuar com GitHub",
  loginOauthHint:
    "Configure o Supabase Auth (NEXT_PUBLIC_SUPABASE_URL e publishable key) para habilitar o login.",
  loginError: (code) => {
    if (code === "oauth") return "Não foi possível concluir o login. Tente de novo.";
    if (code === "link") return "Sua sessão é válida, mas não pudemos criar a conta do comércio.";
    if (code === "supabase") return "Auth indisponível agora. Tente em alguns minutos.";
    return "Algo deu errado ao entrar. Tente novamente.";
  },
  createTitle: "Criar link de pagamento",
  createDesc:
    "Em 10 segundos você tem um link para cobrar. Compartilhe no WhatsApp, e-mail ou site.",
  amount: "Valor",
  asset: "Moeda",
  whyOptional: "Por que estão cobrando? (opcional)",
  whyPlaceholder: "Ex. Pedido #1042",
  resellerToggle: "Divida uma comissão com um revendedor",
  resellerHint:
    "Para marketplaces ou parceiros que trazem a venda. Paga na mesma transação, antes do seu líquido.",
  resellerPct: "Comissão do revendedor",
  resellerWallet: "Carteira do revendedor",
  feeVia: (bps) => `Taxa ViaPay (${bps})`,
  feeReseller: (bps) => `Revendedor (${bps})`,
  youReceive: "Você recebe",
  creating: "Criando…",
  createCta: "Criar link de pagamento",
  readyCopy: "Pronto. Copie e compartilhe:",
  copied: "Copiado",
  copyLink: "Copiar link",
  openCheckout: "Abrir checkout",
  recentTitle: "Seus links recentes",
  recentDesc: "Status em tempo real. Quando o cliente paga, fica como pago.",
  recentEmpty: "Ainda não há links. Crie o primeiro à esquerda.",
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
  receiveTitle: (network) => `Antes de cobrar em ${network}`,
  receiveMerchantMissing: "Sua carteira ainda não existe. Na testnet fondeie com ",
  receiveMerchantUsdc:
    "USDC precisa de trustline. Abra na sua carteira (Lobstr ou Freighter) com o link SEP-7.",
  receiveTreasury: (short) =>
    `A tesouraria (${short}…) não pode receber a taxa. Fondeie e adicione USDC antes de cobrar.`,
  receiveResellerMissing: "não existe nesta rede",
  receiveResellerUsdc: "não pode receber USDC",
  receiveResellerTail:
    ". A comissão vai na mesma transação, então a cobrança falha até poder receber.",
  copyTrustline: "Copiar trustline USDC",
  faucetUsdc: "Faucet USDC",
  webhooksTitle: "Avisos (webhooks)",
  webhooksDesc:
    "Quando uma cobrança fica paga, a ViaPay avisa sua URL. O segredo aparece uma vez.",
  webhooksSave: "Salvar",
  webhooksDeliveries: "Entregas",
  webhooksAttempts: (n) => `${n} tentativas`,
  webhooksCreateFail: "Não foi possível criar o webhook",
};

export const MESSAGES: Record<Locale, Messages> = { es, en, pt };
