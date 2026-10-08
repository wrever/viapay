import type { Locale } from "@viapay/prefs";

export type LegalDocId = "privacy" | "terms" | "data-deletion";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDoc = {
  id: LegalDocId;
  title: string;
  updated: string;
  lede: string;
  sections: LegalSection[];
};

type LegalBundle = {
  privacy: LegalDoc;
  terms: LegalDoc;
  "data-deletion": LegalDoc;
  navLabel: string;
  home: string;
  related: string;
  contact: string;
  updatedLabel: string;
};

const SUPPORT = "hello@viapay.dev";
const SITE = "https://viapay.vercel.app";
const UPDATED = "8 de octubre de 2026";
const UPDATED_EN = "October 8, 2026";
const UPDATED_PT = "8 de outubro de 2026";

const es: LegalBundle = {
  navLabel: "Legal",
  home: "Inicio",
  related: "Documentos relacionados",
  contact: "Contacto",
  updatedLabel: "Última actualización",
  privacy: {
    id: "privacy",
    title: "Política de privacidad",
    updated: UPDATED,
    lede:
      "ViaPay es infraestructura de cobros non-custodial en Stellar. Esta política explica qué datos tratamos, para qué y cómo podés ejercer tus derechos. Aplica al sitio, al panel del comercio, a la API y al asistente de WhatsApp.",
    sections: [
      {
        id: "responsable",
        title: "1. Responsable",
        paragraphs: [
          `El responsable del tratamiento es ViaPay (producto demo / infraestructura de pagos). Contacto: ${SUPPORT}. Sitio: ${SITE}.`,
        ],
      },
      {
        id: "datos",
        title: "2. Datos que tratamos",
        paragraphs: [
          "Solo pedimos lo necesario para operar el servicio. Según el uso, podemos tratar:",
        ],
        bullets: [
          "Cuenta del comercio: email y datos de sesión vía autenticación (p. ej. OAuth / Supabase Auth).",
          "Configuración del comercio: billetera Stellar pública (dirección G…), preferencias (idioma, moneda local de referencia) y claves API generadas por ViaPay.",
          "Cobros: montos, activo (XLM/USDC), estado del pago, metadatos opcionales (p. ej. external_user_id), URLs de retorno y hash de transacción on-chain cuando el pago se completa.",
          "Contactos del panel: nombre, teléfono E.164 y email si el comercio los carga para compartir links.",
          "WhatsApp (Meta Cloud API): número vinculado, códigos de vínculo, estado de sesión del menú de cobros y el contenido de mensajes necesarios para crear o listar facturas. No custodamos claves privadas de WhatsApp ni de Stellar.",
          "Datos técnicos: logs de servidor, IP aproximada, user-agent y eventos de error para seguridad y operación.",
        ],
      },
      {
        id: "no-custodia",
        title: "3. Lo que no custodamos",
        paragraphs: [
          "ViaPay no guarda claves privadas de billeteras Stellar ni fondos de usuarios. Los pagos se firman en la billetera del pagador (o agente) y se liquidan on-chain. Las direcciones G… son públicas por diseño de la red Stellar.",
        ],
      },
      {
        id: "finalidad",
        title: "4. Finalidades",
        paragraphs: ["Usamos los datos para:"],
        bullets: [
          "Crear y gestionar cobros, checkout hosted y liquidación (incluido split / x402).",
          "Autenticar comercios y proteger cuentas (API keys, sesiones).",
          "Permitir compartir links (WhatsApp / email) y el asistente de facturas por WhatsApp.",
          "Cumplir obligaciones legales, prevenir fraude y mantener la seguridad del servicio.",
          "Mejorar el producto a partir de métricas agregadas o de error (sin vender datos personales).",
        ],
      },
      {
        id: "base",
        title: "5. Base legal",
        paragraphs: [
          "Tratamos datos para ejecutar el contrato de servicio (prestación de cobros), por interés legítimo en seguridad y operación, y —cuando aplique— por consentimiento (p. ej. mensajes de WhatsApp iniciados o aceptados por el usuario según las reglas de Meta).",
        ],
      },
      {
        id: "encargados",
        title: "6. Encargados y terceros",
        paragraphs: [
          "Podemos compartir datos con proveedores que nos permiten operar el servicio, bajo contratos o condiciones equivalentes:",
        ],
        bullets: [
          "Hosting y edge (p. ej. Vercel).",
          "Base de datos y auth (Supabase / Postgres).",
          "Mensajería WhatsApp Business vía Meta Platforms (Cloud API).",
          "Red Stellar / indexadores públicos (direcciones y transacciones son visibles on-chain).",
        ],
      },
      {
        id: "conservacion",
        title: "7. Conservación",
        paragraphs: [
          "Conservamos datos de cuenta y cobros mientras el comercio use el servicio y el tiempo adicional necesario para auditoría, disputas o requisitos legales. Los logs técnicos se rotan según práctica operativa. Podés pedir eliminación según la página de Eliminación de datos.",
        ],
      },
      {
        id: "derechos",
        title: "8. Derechos",
        paragraphs: [
          `Podés solicitar acceso, rectificación, portabilidad o eliminación de datos personales escribiendo a ${SUPPORT}. Si usás WhatsApp con ViaPay, también podés dejar de interactuar o pedir desvincular tu número. Los datos publicados en la blockchain de Stellar no pueden borrarse de la red pública.`,
        ],
      },
      {
        id: "menores",
        title: "9. Menores",
        paragraphs: [
          "El servicio está dirigido a comercios y usuarios mayores de 18 años (o la mayoría de edad local). No recopilamos de forma consciente datos de menores.",
        ],
      },
      {
        id: "cambios",
        title: "10. Cambios",
        paragraphs: [
          "Podemos actualizar esta política. La fecha de “Última actualización” al inicio indica la versión vigente. El uso continuado del servicio después de un cambio material implica aceptar la versión publicada.",
        ],
      },
    ],
  },
  terms: {
    id: "terms",
    title: "Términos y condiciones",
    updated: UPDATED,
    lede:
      "Estos términos rigen el uso de ViaPay: sitio, panel, API, checkout y asistente de WhatsApp. Al crear una cuenta o usar el servicio, aceptás estas condiciones.",
    sections: [
      {
        id: "servicio",
        title: "1. El servicio",
        paragraphs: [
          "ViaPay ofrece infraestructura para crear links de cobro y liquidar pagos en la red Stellar sin custodiar fondos del comercio ni del pagador. Incluye panel web, API HTTP, checkout hosted, pagos de agentes (x402) y, cuando está configurado, un asistente de facturas por WhatsApp Cloud API.",
          "El producto puede operar en modo demo / testnet según la configuración desplegada. Las funciones disponibles están descritas en la documentación del sitio.",
        ],
      },
      {
        id: "cuenta",
        title: "2. Cuenta y elegibilidad",
        paragraphs: [
          "Debés proporcionar información veraz, mantener la confidencialidad de tus API keys y ser mayor de edad con capacidad legal para contratar. Sos responsable de la actividad bajo tu cuenta.",
        ],
      },
      {
        id: "non-custodial",
        title: "3. Non-custodial y riesgo",
        paragraphs: [
          "ViaPay no es un banco, no es un exchange y no custodia claves privadas. Los fondos van a las billeteras que configures (comercio, tesorería ViaPay por fee, revendedor opcional). Las transacciones en Stellar son irreversibles una vez confirmadas.",
          "Sos responsable de verificar direcciones, montos, trustlines y de cumplir la regulación aplicable a tu negocio (impuestos, KYC/AML si te corresponde, consumidor, etc.).",
        ],
      },
      {
        id: "fees",
        title: "4. Comisiones",
        paragraphs: [
          "ViaPay cobra un fee de plataforma (por defecto 1% del cobro, salvo que se indique otra cosa en el entorno). Podés configurar una comisión de revendedor adicional al crear un cobro. El comercio recibe el resto tras las comisiones.",
        ],
      },
      {
        id: "whatsapp",
        title: "5. WhatsApp",
        paragraphs: [
          "Si activás el asistente de WhatsApp, aceptás las políticas de Meta/WhatsApp Business además de estas. Debés usar el canal solo para comunicaciones legítimas con usuarios que puedan recibir mensajes según las reglas de Meta. ViaPay puede suspender el canal ante abuso o incumplimiento.",
        ],
      },
      {
        id: "uso-prohibido",
        title: "6. Uso prohibido",
        paragraphs: [
          "No podés usar ViaPay para fraude, lavado de dinero, contenido ilegal, eludir sanciones, spam, ingeniería inversa abusiva o sobrecargar deliberadamente la infraestructura. Nos reservamos el derecho de suspender o terminar el acceso ante indicios de abuso.",
        ],
      },
      {
        id: "propiedad",
        title: "7. Propiedad intelectual",
        paragraphs: [
          "ViaPay, su marca, UI y código propio siguen siendo de sus titulares. Se te otorga una licencia limitada, no exclusiva y revocable para usar el servicio según estos términos. El código open source del monorepo, si aplica, se rige por su licencia publicada.",
        ],
      },
      {
        id: "disponibilidad",
        title: "8. Disponibilidad y cambios",
        paragraphs: [
          "El servicio se ofrece “tal cual” y puede cambiar, interrumpirse o retirarse (incluido modo demo). No garantizamos uptime continuo ni compatibilidad perpetua con terceros (billeteras, Meta, Stellar, hosting).",
        ],
      },
      {
        id: "limitacion",
        title: "9. Limitación de responsabilidad",
        paragraphs: [
          "En la máxima medida permitida por la ley, ViaPay no responde por daños indirectos, lucro cesante, pérdida de datos o fondos perdidos por error del usuario, fallas de red, terceros o fuerza mayor. La responsabilidad total agregada, si existiera, no excederá lo efectivamente pagado a ViaPay en fees en los 3 meses previos al reclamo (o USD 100 si no hubo fees).",
        ],
      },
      {
        id: "ley",
        title: "10. Ley y contacto",
        paragraphs: [
          `Salvo norma imperativa en contrario, estos términos se interpretan de buena fe conforme a prácticas comerciales internacionales de software B2B. Contacto: ${SUPPORT}.`,
        ],
      },
    ],
  },
  "data-deletion": {
    id: "data-deletion",
    title: "Eliminación de datos",
    updated: UPDATED,
    lede:
      "Instrucciones para solicitar la eliminación de datos personales asociados a ViaPay, incluyendo datos vinculados a Facebook / Meta Login o WhatsApp Business, según corresponda.",
    sections: [
      {
        id: "como",
        title: "1. Cómo pedir la eliminación",
        paragraphs: [
          `Escribí a ${SUPPORT} con el asunto “Eliminación de datos ViaPay” e incluí:`,
        ],
        bullets: [
          "Email de la cuenta del comercio (si aplica).",
          "Número de WhatsApp en formato E.164 si pedís borrar la vinculación del asistente.",
          "Identificador de usuario de Facebook / Meta si Meta te redirigió aquí desde “Eliminar mis datos”.",
          "Confirmación de que sos el titular de la cuenta o tenés mandato para el pedido.",
        ],
      },
      {
        id: "plazo",
        title: "2. Plazo",
        paragraphs: [
          "Confirmaremos la recepción en un plazo razonable y eliminaremos o anonimizaremos los datos personales en nuestros sistemas operativos (cuentas, contactos, sesiones WhatsApp, claves API asociadas) dentro de 30 días, salvo retención legal o disputa abierta.",
        ],
      },
      {
        id: "que-se-borra",
        title: "3. Qué se elimina",
        paragraphs: ["Cuando sea posible, eliminamos o anonimizamos:"],
        bullets: [
          "Perfil de cuenta y sesiones.",
          "Contactos cargados en el panel.",
          "Vínculos y sesiones del asistente WhatsApp.",
          "API keys activas (se revocan).",
          "Metadatos personales en cobros cuando no sean necesarios para integridad del historial.",
        ],
      },
      {
        id: "que-queda",
        title: "4. Qué no se puede borrar del todo",
        paragraphs: [
          "Las transacciones y direcciones publicadas en Stellar permanecen en la blockchain pública. Registros mínimos de facturación, seguridad o cumplimiento pueden conservarse el tiempo que exija la ley. Logs agregados sin identificadores pueden permanecer.",
        ],
      },
      {
        id: "meta",
        title: "5. Usuarios de Meta / Facebook",
        paragraphs: [
          "Si llegaste desde la configuración de Meta (“Descargar tus datos” / eliminación), este documento es la URL de instrucciones de eliminación de ViaPay. Tras tu email, procesaremos el pedido como se describe arriba. También podés revocar permisos de la app desde tu cuenta de Facebook o WhatsApp Business.",
        ],
      },
    ],
  },
};

const en: LegalBundle = {
  navLabel: "Legal",
  home: "Home",
  related: "Related documents",
  contact: "Contact",
  updatedLabel: "Last updated",
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    updated: UPDATED_EN,
    lede:
      "ViaPay is non-custodial payment infrastructure on Stellar. This policy explains what data we process, why, and how you can exercise your rights. It covers the site, merchant dashboard, API, and WhatsApp assistant.",
    sections: [
      {
        id: "controller",
        title: "1. Controller",
        paragraphs: [
          `The data controller is ViaPay (demo / payments infrastructure product). Contact: ${SUPPORT}. Site: ${SITE}.`,
        ],
      },
      {
        id: "data",
        title: "2. Data we process",
        paragraphs: [
          "We only collect what is needed to run the service. Depending on use, we may process:",
        ],
        bullets: [
          "Merchant account: email and session data via authentication (e.g. OAuth / Supabase Auth).",
          "Merchant settings: public Stellar wallet (G… address), preferences (locale, reference fiat), and API keys issued by ViaPay.",
          "Charges: amounts, asset (XLM/USDC), payment status, optional metadata (e.g. external_user_id), return URLs, and on-chain transaction hash when paid.",
          "Dashboard contacts: name, E.164 phone, and email if the merchant adds them to share links.",
          "WhatsApp (Meta Cloud API): linked number, link codes, invoice-menu session state, and message content needed to create or list invoices. We do not custody WhatsApp or Stellar private keys.",
          "Technical data: server logs, approximate IP, user-agent, and error events for security and operations.",
        ],
      },
      {
        id: "non-custody",
        title: "3. What we do not custody",
        paragraphs: [
          "ViaPay does not store Stellar wallet private keys or user funds. Payments are signed in the payer’s (or agent’s) wallet and settle on-chain. G… addresses are public by design on Stellar.",
        ],
      },
      {
        id: "purposes",
        title: "4. Purposes",
        paragraphs: ["We use data to:"],
        bullets: [
          "Create and manage charges, hosted checkout, and settlement (including split / x402).",
          "Authenticate merchants and protect accounts (API keys, sessions).",
          "Enable link sharing (WhatsApp / email) and the WhatsApp invoice assistant.",
          "Meet legal duties, prevent fraud, and keep the service secure.",
          "Improve the product using aggregated or error metrics (we do not sell personal data).",
        ],
      },
      {
        id: "lawful",
        title: "5. Lawful basis",
        paragraphs: [
          "We process data to perform the service contract, for legitimate interests in security and operations, and — where applicable — consent (e.g. WhatsApp messages started or accepted under Meta’s rules).",
        ],
      },
      {
        id: "processors",
        title: "6. Processors and third parties",
        paragraphs: [
          "We may share data with providers that help us operate the service:",
        ],
        bullets: [
          "Hosting and edge (e.g. Vercel).",
          "Database and auth (Supabase / Postgres).",
          "WhatsApp Business messaging via Meta Platforms (Cloud API).",
          "Stellar network / public indexers (addresses and txs are visible on-chain).",
        ],
      },
      {
        id: "retention",
        title: "7. Retention",
        paragraphs: [
          "We keep account and charge data while the merchant uses the service and for as long as needed for audit, disputes, or legal requirements. Technical logs are rotated operationally. You may request deletion per the Data Deletion page.",
        ],
      },
      {
        id: "rights",
        title: "8. Rights",
        paragraphs: [
          `You may request access, rectification, portability, or deletion of personal data by emailing ${SUPPORT}. If you use WhatsApp with ViaPay, you may stop interacting or ask to unlink your number. Data published on the Stellar blockchain cannot be erased from the public network.`,
        ],
      },
      {
        id: "minors",
        title: "9. Minors",
        paragraphs: [
          "The service is intended for merchants and users 18+ (or local age of majority). We do not knowingly collect children’s data.",
        ],
      },
      {
        id: "changes",
        title: "10. Changes",
        paragraphs: [
          "We may update this policy. The “Last updated” date shows the current version. Continued use after a material change means you accept the published version.",
        ],
      },
    ],
  },
  terms: {
    id: "terms",
    title: "Terms of Service",
    updated: UPDATED_EN,
    lede:
      "These terms govern use of ViaPay: site, dashboard, API, checkout, and WhatsApp assistant. By creating an account or using the service, you accept these conditions.",
    sections: [
      {
        id: "service",
        title: "1. The service",
        paragraphs: [
          "ViaPay provides infrastructure to create payment links and settle charges on Stellar without custodying merchant or payer funds. It includes a web dashboard, HTTP API, hosted checkout, agent payments (x402), and — when configured — a WhatsApp Cloud API invoice assistant.",
          "The product may run in demo / testnet mode depending on deployment. Available features are described in the site documentation.",
        ],
      },
      {
        id: "account",
        title: "2. Account and eligibility",
        paragraphs: [
          "You must provide accurate information, keep API keys confidential, and be of legal age and capacity to contract. You are responsible for activity under your account.",
        ],
      },
      {
        id: "non-custodial",
        title: "3. Non-custodial and risk",
        paragraphs: [
          "ViaPay is not a bank or exchange and does not custody private keys. Funds go to the wallets you configure (merchant, ViaPay fee treasury, optional reseller). Stellar transactions are irreversible once confirmed.",
          "You are responsible for verifying addresses, amounts, trustlines, and complying with regulation applicable to your business.",
        ],
      },
      {
        id: "fees",
        title: "4. Fees",
        paragraphs: [
          "ViaPay charges a platform fee (default 1% of the charge unless the environment states otherwise). You may set an additional reseller fee when creating a charge. The merchant receives the remainder after fees.",
        ],
      },
      {
        id: "whatsapp",
        title: "5. WhatsApp",
        paragraphs: [
          "If you enable the WhatsApp assistant, you also accept Meta/WhatsApp Business policies. Use the channel only for legitimate communications allowed under Meta’s rules. ViaPay may suspend the channel for abuse or non-compliance.",
        ],
      },
      {
        id: "prohibited",
        title: "6. Prohibited use",
        paragraphs: [
          "You may not use ViaPay for fraud, money laundering, illegal content, sanctions evasion, spam, abusive reverse engineering, or deliberate infrastructure overload. We may suspend or terminate access upon signs of abuse.",
        ],
      },
      {
        id: "ip",
        title: "7. Intellectual property",
        paragraphs: [
          "ViaPay, its brand, UI, and proprietary code remain with their owners. You receive a limited, non-exclusive, revocable license to use the service under these terms. Open-source monorepo code, if any, is governed by its published license.",
        ],
      },
      {
        id: "availability",
        title: "8. Availability and changes",
        paragraphs: [
          "The service is provided “as is” and may change, pause, or be withdrawn (including demo mode). We do not guarantee continuous uptime or perpetual third-party compatibility.",
        ],
      },
      {
        id: "liability",
        title: "9. Limitation of liability",
        paragraphs: [
          "To the fullest extent permitted by law, ViaPay is not liable for indirect damages, lost profits, data loss, or funds lost due to user error, network/third-party failures, or force majeure. Aggregate liability, if any, shall not exceed fees actually paid to ViaPay in the 3 months before the claim (or USD 100 if no fees).",
        ],
      },
      {
        id: "law",
        title: "10. Law and contact",
        paragraphs: [
          `Unless mandatory law provides otherwise, these terms are interpreted in good faith under international B2B software practice. Contact: ${SUPPORT}.`,
        ],
      },
    ],
  },
  "data-deletion": {
    id: "data-deletion",
    title: "Data Deletion",
    updated: UPDATED_EN,
    lede:
      "Instructions to request deletion of personal data associated with ViaPay, including data linked to Facebook / Meta Login or WhatsApp Business where applicable.",
    sections: [
      {
        id: "how",
        title: "1. How to request deletion",
        paragraphs: [
          `Email ${SUPPORT} with subject “ViaPay Data Deletion” and include:`,
        ],
        bullets: [
          "Merchant account email (if applicable).",
          "WhatsApp number in E.164 if you want the assistant linkage removed.",
          "Facebook / Meta user id if Meta sent you here from “Delete my data”.",
          "Confirmation that you own the account or are authorized to request deletion.",
        ],
      },
      {
        id: "timing",
        title: "2. Timing",
        paragraphs: [
          "We will acknowledge receipt within a reasonable time and delete or anonymize personal data in our operational systems (accounts, contacts, WhatsApp sessions, associated API keys) within 30 days, except for legal retention or open disputes.",
        ],
      },
      {
        id: "what",
        title: "3. What we delete",
        paragraphs: ["Where possible, we delete or anonymize:"],
        bullets: [
          "Account profile and sessions.",
          "Contacts stored in the dashboard.",
          "WhatsApp assistant links and sessions.",
          "Active API keys (revoked).",
          "Personal metadata on charges when not required for ledger integrity.",
        ],
      },
      {
        id: "remain",
        title: "4. What cannot be fully erased",
        paragraphs: [
          "Transactions and addresses published on Stellar remain on the public blockchain. Minimal billing, security, or compliance records may be kept as required by law. Aggregated logs without identifiers may remain.",
        ],
      },
      {
        id: "meta",
        title: "5. Meta / Facebook users",
        paragraphs: [
          "If you arrived from Meta settings (“Download your information” / deletion), this page is ViaPay’s data-deletion instructions URL. After your email, we process the request as described above. You may also revoke the app’s permissions from your Facebook or WhatsApp Business account.",
        ],
      },
    ],
  },
};

const pt: LegalBundle = {
  navLabel: "Legal",
  home: "Início",
  related: "Documentos relacionados",
  contact: "Contato",
  updatedLabel: "Última atualização",
  privacy: {
    id: "privacy",
    title: "Política de privacidade",
    updated: UPDATED_PT,
    lede:
      "ViaPay é infraestrutura de cobranças non-custodial na Stellar. Esta política explica quais dados tratamos, para quê e como exercer seus direitos. Aplica-se ao site, painel do comércio, API e assistente de WhatsApp.",
    sections: [
      {
        id: "responsavel",
        title: "1. Responsável",
        paragraphs: [
          `O responsável pelo tratamento é a ViaPay (produto demo / infraestrutura de pagamentos). Contato: ${SUPPORT}. Site: ${SITE}.`,
        ],
      },
      {
        id: "dados",
        title: "2. Dados que tratamos",
        paragraphs: [
          "Pedimos apenas o necessário para operar o serviço. Conforme o uso, podemos tratar:",
        ],
        bullets: [
          "Conta do comércio: email e dados de sessão via autenticação (p. ex. OAuth / Supabase Auth).",
          "Configuração: carteira Stellar pública (endereço G…), preferências e chaves API emitidas pela ViaPay.",
          "Cobranças: valores, ativo (XLM/USDC), status, metadados opcionais, URLs de retorno e hash on-chain quando pago.",
          "Contatos do painel: nome, telefone E.164 e email se o comércio os cadastrar.",
          "WhatsApp (Meta Cloud API): número vinculado, códigos, estado de sessão do menu e conteúdo de mensagens necessário para faturas. Não custodamos chaves privadas.",
          "Dados técnicos: logs, IP aproximado, user-agent e erros para segurança e operação.",
        ],
      },
      {
        id: "nao-custodia",
        title: "3. O que não custodamos",
        paragraphs: [
          "A ViaPay não guarda chaves privadas de carteiras Stellar nem fundos. Os pagamentos são assinados na carteira do pagador (ou agente) e liquidados on-chain.",
        ],
      },
      {
        id: "finalidades",
        title: "4. Finalidades",
        paragraphs: ["Usamos os dados para:"],
        bullets: [
          "Criar e gerir cobranças, checkout hospedado e liquidação (incluindo split / x402).",
          "Autenticar comércios e proteger contas.",
          "Permitir compartilhar links e o assistente de faturas por WhatsApp.",
          "Cumprir obrigações legais, prevenir fraude e manter a segurança.",
          "Melhorar o produto com métricas agregadas (não vendemos dados pessoais).",
        ],
      },
      {
        id: "base",
        title: "5. Base legal",
        paragraphs: [
          "Tratamos dados para executar o contrato de serviço, por interesse legítimo em segurança/operação e — quando aplicável — consentimento (p. ex. WhatsApp sob regras da Meta).",
        ],
      },
      {
        id: "terceiros",
        title: "6. Operadores e terceiros",
        paragraphs: ["Podemos compartilhar dados com provedores que nos permitem operar:"],
        bullets: [
          "Hosting e edge (p. ex. Vercel).",
          "Banco e auth (Supabase / Postgres).",
          "Mensagens WhatsApp Business via Meta (Cloud API).",
          "Rede Stellar / indexadores públicos.",
        ],
      },
      {
        id: "retencao",
        title: "7. Conservação",
        paragraphs: [
          "Conservamos dados enquanto o comércio usa o serviço e o tempo adicional necessário para auditoria, disputas ou lei. Você pode pedir exclusão conforme a página de Eliminação de dados.",
        ],
      },
      {
        id: "direitos",
        title: "8. Direitos",
        paragraphs: [
          `Você pode solicitar acesso, retificação, portabilidade ou exclusão escrevendo para ${SUPPORT}. Dados publicados na blockchain Stellar não podem ser apagados da rede pública.`,
        ],
      },
      {
        id: "menores",
        title: "9. Menores",
        paragraphs: [
          "O serviço é destinado a maiores de 18 anos (ou maioridade local). Não coletamos dados de menores de forma consciente.",
        ],
      },
      {
        id: "mudancas",
        title: "10. Alterações",
        paragraphs: [
          "Podemos atualizar esta política. A data de “Última atualização” indica a versão vigente.",
        ],
      },
    ],
  },
  terms: {
    id: "terms",
    title: "Termos e condições",
    updated: UPDATED_PT,
    lede:
      "Estes termos regem o uso da ViaPay: site, painel, API, checkout e assistente de WhatsApp. Ao criar uma conta ou usar o serviço, você aceita estas condições.",
    sections: [
      {
        id: "servico",
        title: "1. O serviço",
        paragraphs: [
          "A ViaPay oferece infraestrutura para criar links de cobrança e liquidar pagamentos na Stellar sem custodiar fundos. Inclui painel, API HTTP, checkout hospedado, pagamentos de agentes (x402) e, quando configurado, assistente de faturas por WhatsApp Cloud API.",
        ],
      },
      {
        id: "conta",
        title: "2. Conta e elegibilidade",
        paragraphs: [
          "Você deve fornecer informações verdadeiras, manter a confidencialidade das API keys e ter capacidade legal para contratar. É responsável pela atividade da sua conta.",
        ],
      },
      {
        id: "non-custodial",
        title: "3. Non-custodial e risco",
        paragraphs: [
          "A ViaPay não é banco nem exchange e não custodia chaves privadas. Os fundos vão para as carteiras que você configurar. Transações Stellar são irreversíveis após confirmação. Você é responsável por endereços, montantes, trustlines e conformidade regulatória do seu negócio.",
        ],
      },
      {
        id: "taxas",
        title: "4. Taxas",
        paragraphs: [
          "A ViaPay cobra uma taxa de plataforma (padrão 1% da cobrança, salvo indicação em contrário). Você pode configurar taxa de revendedor adicional. O comércio recebe o restante após as taxas.",
        ],
      },
      {
        id: "whatsapp",
        title: "5. WhatsApp",
        paragraphs: [
          "Se ativar o assistente de WhatsApp, aceita também as políticas da Meta/WhatsApp Business. Use o canal apenas para comunicações legítimas permitidas. A ViaPay pode suspender o canal em caso de abuso.",
        ],
      },
      {
        id: "proibido",
        title: "6. Uso proibido",
        paragraphs: [
          "Não use a ViaPay para fraude, lavagem de dinheiro, conteúdo ilegal, evasão de sanções, spam ou sobrecarga deliberada. Podemos suspender ou encerrar o acesso.",
        ],
      },
      {
        id: "pi",
        title: "7. Propriedade intelectual",
        paragraphs: [
          "ViaPay, marca, UI e código próprio permanecem com seus titulares. Você recebe licença limitada, não exclusiva e revogável para usar o serviço nestes termos.",
        ],
      },
      {
        id: "disponibilidade",
        title: "8. Disponibilidade",
        paragraphs: [
          "O serviço é oferecido “como está” e pode mudar, pausar ou ser retirado. Não garantimos uptime contínuo nem compatibilidade perpétua com terceiros.",
        ],
      },
      {
        id: "limitacao",
        title: "9. Limitação de responsabilidade",
        paragraphs: [
          "Na máxima medida permitida por lei, a ViaPay não responde por danos indiretos, lucros cessantes ou fundos perdidos por erro do usuário, falhas de rede/terceiros ou força maior. A responsabilidade agregada, se houver, não excederá as taxas efetivamente pagas à ViaPay nos 3 meses anteriores (ou USD 100 se não houver taxas).",
        ],
      },
      {
        id: "lei",
        title: "10. Lei e contato",
        paragraphs: [
          `Salvo norma imperativa em contrário, estes termos interpretam-se de boa-fé conforme práticas B2B de software. Contato: ${SUPPORT}.`,
        ],
      },
    ],
  },
  "data-deletion": {
    id: "data-deletion",
    title: "Eliminação de dados",
    updated: UPDATED_PT,
    lede:
      "Instruções para solicitar a eliminação de dados pessoais associados à ViaPay, incluindo dados ligados a Facebook / Meta Login ou WhatsApp Business.",
    sections: [
      {
        id: "como",
        title: "1. Como pedir",
        paragraphs: [
          `Escreva para ${SUPPORT} com o assunto “Eliminação de dados ViaPay” e inclua:`,
        ],
        bullets: [
          "Email da conta do comércio (se aplicável).",
          "Número de WhatsApp em E.164 se quiser desvincular o assistente.",
          "ID de usuário Facebook / Meta se a Meta o redirecionou para cá.",
          "Confirmação de que é o titular ou está autorizado.",
        ],
      },
      {
        id: "prazo",
        title: "2. Prazo",
        paragraphs: [
          "Confirmaremos o recebimento em prazo razoável e eliminaremos ou anonimizaremos os dados pessoais nos sistemas operacionais em até 30 dias, salvo retenção legal ou disputa aberta.",
        ],
      },
      {
        id: "o-que",
        title: "3. O que é eliminado",
        paragraphs: ["Quando possível, eliminamos ou anonimizamos:"],
        bullets: [
          "Perfil de conta e sessões.",
          "Contatos do painel.",
          "Vínculos e sessões do assistente WhatsApp.",
          "API keys ativas (revogadas).",
          "Metadados pessoais em cobranças quando não forem necessários à integridade do histórico.",
        ],
      },
      {
        id: "permanece",
        title: "4. O que não pode ser apagado por completo",
        paragraphs: [
          "Transações e endereços na Stellar permanecem na blockchain pública. Registros mínimos de faturação, segurança ou conformidade podem ser conservados conforme a lei.",
        ],
      },
      {
        id: "meta",
        title: "5. Usuários Meta / Facebook",
        paragraphs: [
          "Se chegou pelas definições da Meta, esta página é a URL de instruções de eliminação da ViaPay. Após o email, processamos o pedido como descrito. Também pode revogar permissões da app na conta Facebook ou WhatsApp Business.",
        ],
      },
    ],
  },
};

const BUNDLES: Record<Locale, LegalBundle> = { es, en, pt };

export function getLegalBundle(locale: Locale): LegalBundle {
  return BUNDLES[locale] ?? es;
}

export function getLegalDoc(locale: Locale, id: LegalDocId): LegalDoc {
  return getLegalBundle(locale)[id];
}

export const LEGAL_PATHS: Record<LegalDocId, string> = {
  privacy: "/privacy",
  terms: "/terms",
  "data-deletion": "/data-deletion",
};

export const LEGAL_SUPPORT_EMAIL = SUPPORT;
