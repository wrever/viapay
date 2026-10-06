import type { Locale } from "@viapay/prefs";

export type Messages = {
  theme: { toLight: string; toDark: string };
  locale: { switch: string };
  totalLabel: string;
  methodAria: string;
  walletTab: string;
  qrTab: string;
  connectWallet: string;
  openingWallets: string;
  walletConnected: string;
  walletEmbedded: string;
  disconnect: string;
  signAndPay: string;
  signing: string;
  walletHint: string;
  walletHintUsdc: string;
  qrAlt: string;
  qrGenerating: string;
  qrReady: string;
  qrFallback: string;
  qrFallbackError: string;
  checkPayment: string;
  checking: string;
  notSeenYet: string;
  qrHint: string;
  cancel: string;
  paidTitle: string;
  txLabel: string;
  viewOnExpert: string;
  problemTitle: string;
  incompleteLink: string;
  loadError: string;
  checkFailed: string;
  prepareFailed: string;
  submitFailed: string;
  connectFailed: string;
  genericError: string;
  warnMerchantMissing: string;
  warnMerchantAsset: (asset: string) => string;
  warnTreasuryAsset: (asset: string) => string;
  warnResellerAsset: (asset: string) => string;
  pollarPay: string;
  pollarConnected: (short: string) => string;
  indexTitle: string;
  indexBody: string;
};

const es: Messages = {
  theme: {
    toLight: "Cambiar a modo claro",
    toDark: "Cambiar a modo oscuro",
  },
  locale: {
    switch: "Elegir idioma",
  },
  totalLabel: "Total a pagar",
  methodAria: "Método de pago",
  walletTab: "Billetera",
  qrTab: "Código QR",
  connectWallet: "Conectar billetera Stellar",
  openingWallets: "Abriendo billeteras…",
  walletConnected: "Billetera conectada",
  walletEmbedded: "Billetera embebida",
  disconnect: "Desconectar",
  signAndPay: "Firmar y pagar",
  signing: "Firmando…",
  walletHint: "Freighter, Lobstr, xBull y otras vía Stellar Wallets Kit.",
  walletHintUsdc: " Si falta, la firma también abre la línea de confianza de USDC.",
  qrAlt: "Código QR con la transacción de pago",
  qrGenerating: "Generando QR…",
  qrReady: "Escanea el código con Lobstr o Freighter en el teléfono.",
  qrFallback: "Este código enviaría todo al comercio.",
  qrFallbackError: "No se pudo armar el pago completo.",
  checkPayment: "Comprobar pago",
  checking: "Comprobando…",
  notSeenYet:
    "Todavía no vemos el pago en la red. Si acabas de firmar, espera unos segundos.",
  qrHint:
    "El teléfono necesita alcanzar el servicio de ViaPay. En local, usa un túnel.",
  cancel: "Cancelar y volver",
  paidTitle: "Pago confirmado",
  txLabel: "Transacción en Stellar",
  viewOnExpert: "Verla en stellar.expert",
  problemTitle: "Este cobro no se puede pagar",
  incompleteLink:
    "Este link viene incompleto. Pide al comercio que te mande uno nuevo.",
  loadError: "No pudimos cargar este cobro. Vuelve a intentarlo en un momento.",
  checkFailed: "No se pudo comprobar el pago",
  prepareFailed: "No se pudo armar el pago",
  submitFailed: "No se pudo enviar el pago",
  connectFailed: "No se pudo conectar la billetera",
  genericError: "Error",
  warnMerchantMissing:
    "La billetera del comercio todavía no existe en esta red. El pago no puede llegar hasta que esté lista.",
  warnMerchantAsset: (asset) =>
    `El comercio no puede recibir ${asset}. Tiene que configurar su cuenta antes de que pagues.`,
  warnTreasuryAsset: (asset) =>
    `Este cobro todavía no se puede completar en ${asset}. La tesorería de ViaPay aún no puede recibir ese activo.`,
  warnResellerAsset: (asset) =>
    `Este cobro todavía no se puede completar en ${asset}. El revendedor no puede recibir ese activo.`,
  pollarPay: "Pagar sin extensión (Pollar)",
  pollarConnected: (short) => `Billetera embebida ${short}`,
  indexTitle: "Acá se pagan los cobros",
  indexBody: "Abre el link que te compartió el comercio. Tiene la forma /pay/pi_…",
};

const en: Messages = {
  theme: {
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
  },
  locale: {
    switch: "Choose language",
  },
  totalLabel: "Amount due",
  methodAria: "Payment method",
  walletTab: "Wallet",
  qrTab: "QR code",
  connectWallet: "Connect Stellar wallet",
  openingWallets: "Opening wallets…",
  walletConnected: "Wallet connected",
  walletEmbedded: "Embedded wallet",
  disconnect: "Disconnect",
  signAndPay: "Sign and pay",
  signing: "Signing…",
  walletHint: "Freighter, Lobstr, xBull and others via Stellar Wallets Kit.",
  walletHintUsdc: " If needed, signing also opens the USDC trustline.",
  qrAlt: "QR code with the payment transaction",
  qrGenerating: "Generating QR…",
  qrReady: "Scan with Lobstr or Freighter on your phone.",
  qrFallback: "This code would send everything to the merchant.",
  qrFallbackError: "Could not build the full payment.",
  checkPayment: "Check payment",
  checking: "Checking…",
  notSeenYet:
    "We don’t see the payment on the network yet. If you just signed, wait a few seconds.",
  qrHint:
    "Your phone needs to reach the ViaPay service. Locally, use a tunnel.",
  cancel: "Cancel and go back",
  paidTitle: "Payment confirmed",
  txLabel: "Stellar transaction",
  viewOnExpert: "View on stellar.expert",
  problemTitle: "This charge can’t be paid",
  incompleteLink:
    "This link is incomplete. Ask the merchant to send you a new one.",
  loadError: "We couldn’t load this charge. Try again in a moment.",
  checkFailed: "Could not check the payment",
  prepareFailed: "Could not prepare the payment",
  submitFailed: "Could not submit the payment",
  connectFailed: "Could not connect the wallet",
  genericError: "Error",
  warnMerchantMissing:
    "The merchant wallet doesn’t exist on this network yet. Payment can’t arrive until it’s ready.",
  warnMerchantAsset: (asset) =>
    `The merchant can’t receive ${asset}. They need to set up their account before you pay.`,
  warnTreasuryAsset: (asset) =>
    `This charge can’t be completed in ${asset} yet. ViaPay’s treasury still can’t receive that asset.`,
  warnResellerAsset: (asset) =>
    `This charge can’t be completed in ${asset} yet. The reseller can’t receive that asset.`,
  pollarPay: "Pay without an extension (Pollar)",
  pollarConnected: (short) => `Embedded wallet ${short}`,
  indexTitle: "This is where charges get paid",
  indexBody: "Open the link the merchant shared with you. It looks like /pay/pi_…",
};

const pt: Messages = {
  theme: {
    toLight: "Mudar para modo claro",
    toDark: "Mudar para modo escuro",
  },
  locale: {
    switch: "Escolher idioma",
  },
  totalLabel: "Total a pagar",
  methodAria: "Método de pagamento",
  walletTab: "Carteira",
  qrTab: "Código QR",
  connectWallet: "Conectar carteira Stellar",
  openingWallets: "Abrindo carteiras…",
  walletConnected: "Carteira conectada",
  walletEmbedded: "Carteira embutida",
  disconnect: "Desconectar",
  signAndPay: "Assinar e pagar",
  signing: "Assinando…",
  walletHint: "Freighter, Lobstr, xBull e outras via Stellar Wallets Kit.",
  walletHintUsdc: " Se faltar, a assinatura também abre a trustline de USDC.",
  qrAlt: "Código QR com a transação de pagamento",
  qrGenerating: "Gerando QR…",
  qrReady: "Escaneie com Lobstr ou Freighter no celular.",
  qrFallback: "Este código enviaria tudo ao comércio.",
  qrFallbackError: "Não foi possível montar o pagamento completo.",
  checkPayment: "Verificar pagamento",
  checking: "Verificando…",
  notSeenYet:
    "Ainda não vemos o pagamento na rede. Se você acabou de assinar, espere alguns segundos.",
  qrHint:
    "O celular precisa alcançar o serviço da ViaPay. Em local, use um túnel.",
  cancel: "Cancelar e voltar",
  paidTitle: "Pagamento confirmado",
  txLabel: "Transação na Stellar",
  viewOnExpert: "Ver no stellar.expert",
  problemTitle: "Esta cobrança não pode ser paga",
  incompleteLink:
    "Este link está incompleto. Peça ao comércio que envie um novo.",
  loadError: "Não foi possível carregar esta cobrança. Tente de novo em breve.",
  checkFailed: "Não foi possível verificar o pagamento",
  prepareFailed: "Não foi possível preparar o pagamento",
  submitFailed: "Não foi possível enviar o pagamento",
  connectFailed: "Não foi possível conectar a carteira",
  genericError: "Erro",
  warnMerchantMissing:
    "A carteira do comércio ainda não existe nesta rede. O pagamento não chega até ela estar pronta.",
  warnMerchantAsset: (asset) =>
    `O comércio não pode receber ${asset}. Precisa configurar a conta antes de você pagar.`,
  warnTreasuryAsset: (asset) =>
    `Esta cobrança ainda não pode ser concluída em ${asset}. A tesouraria da ViaPay ainda não pode receber esse ativo.`,
  warnResellerAsset: (asset) =>
    `Esta cobrança ainda não pode ser concluída em ${asset}. O revendedor não pode receber esse ativo.`,
  pollarPay: "Pagar sem extensão (Pollar)",
  pollarConnected: (short) => `Carteira embutida ${short}`,
  indexTitle: "Aqui se pagam as cobranças",
  indexBody: "Abra o link que o comércio compartilhou. Tem o formato /pay/pi_…",
};

export const MESSAGES: Record<Locale, Messages> = { es, en, pt };
