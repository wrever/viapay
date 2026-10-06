import type { Locale } from "@viapay/prefs";

import {
  DOC_CHAPTERS_EN,
  DOC_CHAPTERS_ES,
  DOC_CHAPTERS_PT,
  type DocChapter,
} from "./docs-chapters";

export type { DocChapter };

export type Messages = {
  nav: {
    how: string;
    modes: string;
    docs: string;
    login: string;
    homeAria: string;
  };
  theme: {
    toLight: string;
    toDark: string;
  };
  locale: {
    switch: string;
  };
  hero: {
    headlineBefore: string;
    headlineEm: string;
    headlineAfter: string;
    lede: string;
    ctaPrimary: string;
    ctaSecondary: string;
    note: string;
  };
  how: {
    title: string;
    sub: string;
    steps: { step: string; title: string; body: string }[];
  };
  modes: {
    tabsAria: string;
    link: {
      label: string;
      title: string;
      sub: string;
      pays: string;
      merchant: string;
      merchantSmall: string;
      viapay: string;
      viapaySmall: string;
      foot: string;
      cta: string;
    };
    split: {
      label: string;
      title: string;
      sub: string;
      pays: string;
      merchant: string;
      merchantSmall: string;
      viapay: string;
      viapaySmall: string;
      reseller: string;
      resellerSmall: string;
      foot: string;
    };
    agent: {
      label: string;
      title: string;
      sub: string;
      pays: string;
      merchant: string;
      merchantSmall: string;
      viapay: string;
      viapaySmall: string;
      reseller: string;
      resellerSmall: string;
      footSimple: string;
      footSplit: string;
      cta: string;
      toggleAria: string;
      toggleSimple: string;
      toggleSplit: string;
    };
  };
  flow: {
    client: string;
    agent: string;
    merchant: string;
    viapay: string;
    reseller: string;
    ariaLink: string;
    ariaSplit: string;
    ariaAgent: string;
    ariaAgentSimple: string;
  };
  close: {
    title: string;
    body: string;
    cta: string;
  };
  foot: {
    blurb: string;
    product: string;
    developers: string;
    company: string;
    panel: string;
    docs: string;
    api: string;
    modes: string;
    redirect: string;
    support: string;
    rights: string;
  };
  docs: {
    modes: string;
    panel: string;
    developers: string;
    apiRef: string;
    searchPlaceholder: string;
    searchEmpty: string;
    searchAria: string;
    navStart: string;
    navProduct: string;
    navIntegrate: string;
    onThisPage: string;
    breadcrumbHome: string;
    breadcrumbDocs: string;
    eyebrow: string;
    title: string;
    lede: string;
    chapters: DocChapter[];
    openPanel: string;
    seeModes: string;
  };
  notFound: {
    title: string;
    body: string;
    cta: string;
  };
};

const es: Messages = {
  nav: {
    how: "Cómo funciona",
    modes: "Modos de uso",
    docs: "Docs",
    login: "Entrar al panel",
    homeAria: "ViaPay, inicio",
  },
  theme: {
    toLight: "Cambiar a modo claro",
    toDark: "Cambiar a modo oscuro",
  },
  locale: {
    switch: "Elegir idioma",
  },
  hero: {
    headlineBefore: "Cobra con un link. Lo paga una persona o ",
    headlineEm: "su agente",
    headlineAfter: ".",
    lede: "Creas el cobro, compartes el link. Paga tu cliente con su billetera o un agente de IA. ViaPay solo toma el 1%. Sin custodiar tu dinero: llega directo a tu billetera, al instante.",
    ctaPrimary: "Crear un cobro",
    ctaSecondary: "Ver cómo funciona",
    note: "Prueba hoy en Stellar · con USDC o XLM",
  },
  how: {
    title: "Así de simple",
    sub: "Sin instalar plugins ni programar. Abres el panel, creas el cobro y ya puedes cobrar.",
    steps: [
      {
        step: "Paso 1",
        title: "Dices cuánto cobras",
        body: "Eliges el monto y ViaPay te arma un link de pago listo para compartir.",
      },
      {
        step: "Paso 2",
        title: "Alguien paga",
        body: "Una persona paga con su billetera o escanea el QR. Un agente de IA puede pagar el mismo cobro solo.",
      },
      {
        step: "Paso 3",
        title: "El dinero te llega",
        body: "Entra a tu billetera y te avisamos cuando el pago quedó confirmado.",
      },
    ],
  },
  modes: {
    tabsAria: "Modos de uso",
    link: {
      label: "Link / tienda",
      title: "Un pago, dos destinos",
      sub: "Creas el link, tu cliente paga en ViaPay y vuelve a tu sitio. Ideal para tiendas y marketplaces sin armar un plugin.",
      pays: "Paga el cliente",
      merchant: "Tu billetera",
      merchantSmall: "lo que te corresponde · vuelve a tu tienda",
      viapay: "ViaPay",
      viapaySmall: "1% fijo",
      foot: "Sin plugin. Mandas el link, el cliente paga y vuelve a tu sitio cuando termina.",
      cta: "Crear un link de cobro →",
    },
    split: {
      label: "Split / marketplace",
      title: "Un pago, tres destinos",
      sub: "El cliente paga una sola vez. El dinero se reparte al instante: tu parte, el 1% de ViaPay y la comisión del partner que te trajo la venta. Nadie retiene el dinero en el medio.",
      pays: "Paga el cliente",
      merchant: "Tu billetera",
      merchantSmall: "tu parte del cobro",
      viapay: "ViaPay",
      viapaySmall: "1% fijo",
      reseller: "Partner / revendedor",
      resellerSmall: "el % que acuerdas al crear el cobro",
      foot: "Todo se reparte en el mismo pago. Tú no custodias el dinero de nadie: cada uno recibe lo suyo directo en su billetera.",
    },
    agent: {
      label: "Agente / IA",
      title: "El mismo cobro, pagado por un agente",
      sub: "Un agente de IA encuentra el cobro, ve cuánto hay que pagar y lo liquida solo. Puede ser solo con el 1% de ViaPay, o con un partner — igual que una persona.",
      pays: "Paga el agente",
      merchant: "Tu billetera",
      merchantSmall: "igual que si pagara una persona",
      viapay: "ViaPay",
      viapaySmall: "1% fijo",
      reseller: "Partner / revendedor",
      resellerSmall: "si lo configuraste al crear el cobro",
      footSimple:
        "Sin partner: el agente paga y el reparto es 99% a ti y 1% a ViaPay.",
      footSplit:
        "Con partner: el agente paga y el dinero se reparte en tres, igual que un humano.",
      cta: "Crear cobro y probarlo →",
      toggleAria: "Tipo de cobro del agente",
      toggleSimple: "Solo ViaPay",
      toggleSplit: "Con partner",
    },
  },
  flow: {
    client: "cliente",
    agent: "agente",
    merchant: "tú",
    viapay: "ViaPay",
    reseller: "partner",
    ariaLink:
      "El cliente paga en ViaPay: 99% a ti y 1% a ViaPay.",
    ariaSplit:
      "Un pago se reparte en tres: 96% a ti, 1% a ViaPay y 3% al partner.",
    ariaAgent:
      "Un agente paga el mismo cobro: 96% a ti, 1% a ViaPay y 3% al partner.",
    ariaAgentSimple:
      "Un agente paga el cobro sin partner: 99% a ti y 1% a ViaPay.",
  },
  close: {
    title: "Tu primer cobro, en dos minutos",
    body: "Entra al panel, crea un cobro y comparte el link. En minutos ves cómo se reparte el dinero.",
    cta: "Crear un cobro",
  },
  foot: {
    blurb:
      "Infraestructura de cobros en Stellar. Links de pago, split y checkout hosted sin custodiar fondos.",
    product: "Producto",
    developers: "Desarrolladores",
    company: "Empresa",
    panel: "Panel",
    docs: "Documentación",
    api: "Estado del servicio",
    modes: "Modos de uso",
    redirect: "Redirect ecommerce",
    support: "Soporte",
    rights: "© 2026 ViaPay. Todos los derechos reservados.",
  },
  docs: {
    modes: "Modos",
    panel: "Panel",
    developers: "Desarrolladores",
    apiRef: "Referencia API",
    searchPlaceholder: "Buscar en la documentación…",
    searchEmpty: "Sin resultados. Prueba con link, split, agente, webhook o comisión.",
    searchAria: "Buscar en la documentación",
    navStart: "Primeros pasos",
    navProduct: "Cómo cobrar",
    navIntegrate: "Integrar",
    onThisPage: "En esta página",
    breadcrumbHome: "Inicio",
    breadcrumbDocs: "Docs",
    eyebrow: "Documentación",
    title: "Cómo usar ViaPay hoy",
    lede: "Guía completa del producto demo: cobros non-custodial en Stellar, comisiones, links, redirect, split, checkout, webhooks, API, SDK y pagos de agentes (x402). Lo diferido (email, embed, plugins) no está aquí a propósito.",
    chapters: DOC_CHAPTERS_ES,
    openPanel: "Abrir el panel",
    seeModes: "Ver modos en la landing",
  },
  notFound: {
    title: "Esta página no existe",
    body: "El enlace puede estar mal o la página ya no está disponible.",
    cta: "Volver al inicio",
  },
};

const en: Messages = {
  nav: {
    how: "How it works",
    modes: "Modes",
    docs: "Docs",
    login: "Open dashboard",
    homeAria: "ViaPay, home",
  },
  theme: {
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
  },
  locale: {
    switch: "Choose language",
  },
  hero: {
    headlineBefore: "Get paid with a link. By a person or ",
    headlineEm: "their agent",
    headlineAfter: ".",
    lede: "Create the charge, share the link. Your customer pays with their wallet — or an AI agent does. ViaPay only takes 1%. We never hold your money: it lands in your wallet instantly.",
    ctaPrimary: "Create a charge",
    ctaSecondary: "See how it works",
    note: "Try it today on Stellar · USDC or XLM",
  },
  how: {
    title: "That simple",
    sub: "No plugins to install, no code required. Open the dashboard, create a charge, and you’re ready to get paid.",
    steps: [
      {
        step: "Step 1",
        title: "Say how much",
        body: "Pick the amount and ViaPay builds a payment link ready to share.",
      },
      {
        step: "Step 2",
        title: "Someone pays",
        body: "A person pays with their wallet or scans the QR. An AI agent can pay the same charge on its own.",
      },
      {
        step: "Step 3",
        title: "Money reaches you",
        body: "It lands in your wallet and we notify you when the payment is confirmed.",
      },
    ],
  },
  modes: {
    tabsAria: "Usage modes",
    link: {
      label: "Link / store",
      title: "One payment, two destinations",
      sub: "You create the link, your customer pays in ViaPay and returns to your site. Ideal for stores and marketplaces without building a plugin.",
      pays: "Customer pays",
      merchant: "Your wallet",
      merchantSmall: "your share · back to your store",
      viapay: "ViaPay",
      viapaySmall: "fixed 1%",
      foot: "No plugin. Send the link, they pay, they return to your site when done.",
      cta: "Create a payment link →",
    },
    split: {
      label: "Split / marketplace",
      title: "One payment, three destinations",
      sub: "The customer pays once. Money splits instantly: your share, ViaPay’s 1%, and the partner who brought the sale. Nobody holds the funds in between.",
      pays: "Customer pays",
      merchant: "Your wallet",
      merchantSmall: "your share of the charge",
      viapay: "ViaPay",
      viapaySmall: "fixed 1%",
      reseller: "Partner / reseller",
      resellerSmall: "the % you set when creating the charge",
      foot: "Everything splits in the same payment. You never hold anyone’s money — each party gets paid straight to their wallet.",
    },
    agent: {
      label: "Agent / AI",
      title: "The same charge, paid by an agent",
      sub: "An AI agent finds the charge, sees how much to pay, and settles it alone. With ViaPay’s 1% only, or with a partner — same as a person.",
      pays: "Agent pays",
      merchant: "Your wallet",
      merchantSmall: "same as if a person paid",
      viapay: "ViaPay",
      viapaySmall: "fixed 1%",
      reseller: "Partner / reseller",
      resellerSmall: "if you set it when creating the charge",
      footSimple:
        "No partner: the agent pays and the split is 99% to you and 1% to ViaPay.",
      footSplit:
        "With a partner: the agent pays and money splits three ways, just like a human.",
      cta: "Create a charge and try it →",
      toggleAria: "Agent charge type",
      toggleSimple: "ViaPay only",
      toggleSplit: "With partner",
    },
  },
  flow: {
    client: "customer",
    agent: "agent",
    merchant: "you",
    viapay: "ViaPay",
    reseller: "partner",
    ariaLink:
      "The customer pays in ViaPay: 99% to you and 1% to ViaPay.",
    ariaSplit:
      "One payment splits three ways: 96% to you, 1% to ViaPay, 3% to the partner.",
    ariaAgent:
      "An agent pays the same charge: 96% to you, 1% to ViaPay, 3% to the partner.",
    ariaAgentSimple:
      "An agent pays with no partner: 99% to you and 1% to ViaPay.",
  },
  close: {
    title: "Your first charge in two minutes",
    body: "Open the dashboard, create a charge, and share the link. In minutes you’ll see how the money splits.",
    cta: "Create a charge",
  },
  foot: {
    blurb:
      "Stellar payment infrastructure. Payment links, split, and hosted checkout without holding funds.",
    product: "Product",
    developers: "Developers",
    company: "Company",
    panel: "Dashboard",
    docs: "Documentation",
    api: "Service status",
    modes: "Modes",
    redirect: "Ecommerce redirect",
    support: "Support",
    rights: "© 2026 ViaPay. All rights reserved.",
  },
  docs: {
    modes: "Modes",
    panel: "Dashboard",
    developers: "Developers",
    apiRef: "API reference",
    searchPlaceholder: "Search the docs…",
    searchEmpty: "No results. Try link, split, agent, webhook, or fees.",
    searchAria: "Search documentation",
    navStart: "Get started",
    navProduct: "How to charge",
    navIntegrate: "Integrate",
    onThisPage: "On this page",
    breadcrumbHome: "Home",
    breadcrumbDocs: "Docs",
    eyebrow: "Documentation",
    title: "How to use ViaPay today",
    lede: "Full product guide for the demo: non-custodial Stellar charges, fees, links, redirect, split, checkout, webhooks, API, SDK, and agent payments (x402). Deferred work (email, embed, plugins) is intentionally not here.",
    chapters: DOC_CHAPTERS_EN,
    openPanel: "Open the dashboard",
    seeModes: "See modes on the landing",
  },
  notFound: {
    title: "This page doesn’t exist",
    body: "The link may be wrong, or this page is no longer available.",
    cta: "Back to home",
  },
};

const pt: Messages = {
  nav: {
    how: "Como funciona",
    modes: "Modos de uso",
    docs: "Docs",
    login: "Entrar no painel",
    homeAria: "ViaPay, início",
  },
  theme: {
    toLight: "Mudar para modo claro",
    toDark: "Mudar para modo escuro",
  },
  locale: {
    switch: "Escolher idioma",
  },
  hero: {
    headlineBefore: "Cobre com um link. Paga uma pessoa ou ",
    headlineEm: "seu agente",
    headlineAfter: ".",
    lede: "Crie a cobrança, compartilhe o link. O cliente paga com a carteira — ou um agente de IA. A ViaPay só fica com 1%. Sem custodiar seu dinheiro: chega direto na sua carteira, na hora.",
    ctaPrimary: "Criar uma cobrança",
    ctaSecondary: "Ver como funciona",
    note: "Experimente hoje na Stellar · USDC ou XLM",
  },
  how: {
    title: "Assim de simples",
    sub: "Sem instalar plugins nem programar. Abra o painel, crie a cobrança e já pode receber.",
    steps: [
      {
        step: "Passo 1",
        title: "Diga quanto cobra",
        body: "Escolha o valor e a ViaPay monta um link de pagamento pronto para compartilhar.",
      },
      {
        step: "Passo 2",
        title: "Alguém paga",
        body: "Uma pessoa paga com a carteira ou lê o QR. Um agente de IA pode pagar a mesma cobrança sozinho.",
      },
      {
        step: "Passo 3",
        title: "O dinheiro chega a você",
        body: "Entra na sua carteira e avisamos quando o pagamento for confirmado.",
      },
    ],
  },
  modes: {
    tabsAria: "Modos de uso",
    link: {
      label: "Link / loja",
      title: "Um pagamento, dois destinos",
      sub: "Você cria o link, o cliente paga na ViaPay e volta ao seu site. Ideal para lojas e marketplaces sem montar um plugin.",
      pays: "O cliente paga",
      merchant: "Sua carteira",
      merchantSmall: "sua parte · volta à sua loja",
      viapay: "ViaPay",
      viapaySmall: "1% fixo",
      foot: "Sem plugin. Envie o link, o cliente paga e volta ao seu site quando terminar.",
      cta: "Criar um link de cobrança →",
    },
    split: {
      label: "Split / marketplace",
      title: "Um pagamento, três destinos",
      sub: "O cliente paga uma vez. O dinheiro se divide na hora: sua parte, 1% da ViaPay e a comissão do parceiro que trouxe a venda. Ninguém segura o dinheiro no meio.",
      pays: "O cliente paga",
      merchant: "Sua carteira",
      merchantSmall: "sua parte da cobrança",
      viapay: "ViaPay",
      viapaySmall: "1% fixo",
      reseller: "Parceiro / revendedor",
      resellerSmall: "o % que você define ao criar a cobrança",
      foot: "Tudo se divide no mesmo pagamento. Você não custodia o dinheiro de ninguém: cada um recebe direto na carteira.",
    },
    agent: {
      label: "Agente / IA",
      title: "A mesma cobrança, paga por um agente",
      sub: "Um agente de IA encontra a cobrança, vê quanto pagar e liquida sozinho. Só com 1% da ViaPay, ou com um parceiro — igual a uma pessoa.",
      pays: "O agente paga",
      merchant: "Sua carteira",
      merchantSmall: "igual se uma pessoa pagasse",
      viapay: "ViaPay",
      viapaySmall: "1% fixo",
      reseller: "Parceiro / revendedor",
      resellerSmall: "se você configurou ao criar a cobrança",
      footSimple:
        "Sem parceiro: o agente paga e o rateio é 99% para você e 1% ViaPay.",
      footSplit:
        "Com parceiro: o agente paga e o dinheiro se divide em três, igual a um humano.",
      cta: "Criar cobrança e testar →",
      toggleAria: "Tipo de cobrança do agente",
      toggleSimple: "Só ViaPay",
      toggleSplit: "Com parceiro",
    },
  },
  flow: {
    client: "cliente",
    agent: "agente",
    merchant: "você",
    viapay: "ViaPay",
    reseller: "parceiro",
    ariaLink:
      "O cliente paga na ViaPay: 99% para você e 1% para a ViaPay.",
    ariaSplit:
      "Um pagamento se divide em três: 96% para você, 1% ViaPay e 3% ao parceiro.",
    ariaAgent:
      "Um agente paga a mesma cobrança: 96% para você, 1% ViaPay e 3% ao parceiro.",
    ariaAgentSimple:
      "Um agente paga sem parceiro: 99% para você e 1% ViaPay.",
  },
  close: {
    title: "Sua primeira cobrança em dois minutos",
    body: "Entre no painel, crie uma cobrança e compartilhe o link. Em minutos você vê como o dinheiro se divide.",
    cta: "Criar uma cobrança",
  },
  foot: {
    blurb:
      "Infraestrutura de cobranças na Stellar. Links de pagamento, split e checkout hospedado sem custodiar fundos.",
    product: "Produto",
    developers: "Desenvolvedores",
    company: "Empresa",
    panel: "Painel",
    docs: "Documentação",
    api: "Status do serviço",
    modes: "Modos de uso",
    redirect: "Redirect ecommerce",
    support: "Suporte",
    rights: "© 2026 ViaPay. Todos os direitos reservados.",
  },
  docs: {
    modes: "Modos",
    panel: "Painel",
    developers: "Desenvolvedores",
    apiRef: "Referência da API",
    searchPlaceholder: "Buscar na documentação…",
    searchEmpty: "Sem resultados. Tente link, split, agente, webhook ou taxa.",
    searchAria: "Buscar na documentação",
    navStart: "Primeiros passos",
    navProduct: "Como cobrar",
    navIntegrate: "Integrar",
    onThisPage: "Nesta página",
    breadcrumbHome: "Início",
    breadcrumbDocs: "Docs",
    eyebrow: "Documentação",
    title: "Como usar ViaPay hoje",
    lede: "Guia completo do produto demo: cobranças non-custodial na Stellar, taxas, links, redirect, split, checkout, webhooks, API, SDK e pagamentos de agentes (x402). O diferido (email, embed, plugins) não está aqui de propósito.",
    chapters: DOC_CHAPTERS_PT,
    openPanel: "Abrir o painel",
    seeModes: "Ver modos na landing",
  },
  notFound: {
    title: "Esta página não existe",
    body: "O link pode estar errado ou a página já não está disponível.",
    cta: "Voltar ao início",
  },
};

export const MESSAGES: Record<Locale, Messages> = { es, en, pt };
