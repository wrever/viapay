import {
  createContact,
  findContactsByName,
  listContacts,
  type ContactRow,
} from "@/lib/contacts";
import type { AuthContext } from "@/lib/auth";
import {
  createPaymentIntent,
  getPaymentIntentById,
  listPaymentIntents,
  serializePaymentIntent,
} from "@/lib/payments";
import {
  authContextForAccount,
  consumeLinkCode,
  getLinkByPhone,
  getSession,
  parseVincularCode,
  saveSession,
  tryParseNewContact,
  type WaDraft,
  type WaSessionState,
} from "./store";
import { sendMetaWhatsAppText, waMeUrl } from "./meta";
import {
  emailConfigured,
  sendInvoiceEmail,
} from "@/lib/email/resend";
import {
  mailtoInvoiceUrl,
  merchantOnboardingText,
  parseNaturalCharge,
} from "./parse-charge";

const MENU = `ViaPay — asistente comercio
Atajo: cobro 20 xlm a juanito
1 Nuevo cobro (paso a paso)
2 Mis contactos
3 Estado (últimos cobros)
0 Ayuda

Vincular: vincular 123456
Alta contacto: Nuevo: Nombre|+569… o Nuevo: Nombre|mail@x.com`;

function helpText(): string {
  return `${MENU}

Ejemplos:
• cobro 20 xlm a juanito
• cobrar 5.5 usdc a mi contacto llamado María

Después elegís enviar el link por WhatsApp o email.
El pagador no necesita cuenta ViaPay — solo abre el link.`;
}

async function resetIdle(
  phone: string,
  accountId: string | null,
  msg: string,
): Promise<string> {
  await saveSession(phone, {
    account_id: accountId,
    state: "idle",
    draft: {},
  });
  return msg;
}

function formatContacts(contacts: ContactRow[]): string {
  if (contacts.length === 0) {
    return "No tenés contactos. Alta: Nuevo: Juanito|+56911223344";
  }
  const lines = contacts
    .slice(0, 8)
    .map((c, i) => {
      const dest = c.phone_e164 ?? c.email ?? "—";
      return `${i + 1}. ${c.display_name} (${dest})`;
    });
  return `Contactos:\n${lines.join("\n")}\n\nNuevo: Nombre|+56…`;
}

function deliverPrompt(draft: WaDraft): string {
  const hasPhone = Boolean(draft.contact_phone);
  const hasEmail = Boolean(draft.contact_email);
  const lines = [
    `Cobro listo ${draft.payment_intent_id}`,
    `${draft.amount} ${draft.asset} → ${draft.contact_name}`,
    `Pagar: ${draft.checkout_url}`,
    "",
    "¿Cómo se lo mandamos?",
  ];
  if (hasPhone) lines.push("1 WhatsApp");
  if (hasEmail) lines.push("2 Email");
  lines.push("3 Solo dejar el link (ya está arriba)");
  if (!hasPhone && !hasEmail) {
    return `${lines.slice(0, 4).join("\n")}\nEl contacto no tiene teléfono ni email. Copiá el link.\n\n${MENU}`;
  }
  return lines.join("\n");
}

async function createChargeAndAskDeliver(input: {
  phone: string;
  accountId: string;
  auth: AuthContext;
  draft: WaDraft;
}): Promise<string> {
  const { phone, accountId, auth, draft } = input;
  if (!auth.merchantWallet) {
    return resetIdle(
      phone,
      accountId,
      "Falta wallet de destino. Guardala en Integración del panel.",
    );
  }
  if (!draft.amount || !draft.asset || !draft.contact_name) {
    return resetIdle(phone, accountId, `Sesión incompleta.\n\n${MENU}`);
  }
  try {
    const row = await createPaymentIntent(auth, {
      amount: draft.amount,
      asset: draft.asset,
      description: `Cobro a ${draft.contact_name}`,
      external_user_id: draft.contact_id,
      metadata: {
        invoice: {
          contact_id: draft.contact_id,
          recipient_name: draft.contact_name,
          channel: "whatsapp",
          source: "whatsapp",
          phone_e164: draft.contact_phone ?? null,
          email: draft.contact_email ?? null,
        },
      },
    });
    const s = serializePaymentIntent(row);
    const shareText = `${auth.accountName} te cobra ${row.amount} ${row.asset_code} por ViaPay:\n${s.checkout_url}`;
    const nextDraft: WaDraft = {
      ...draft,
      payment_intent_id: row.id,
      checkout_url: s.checkout_url,
      share_text: shareText,
    };
    if (!draft.contact_phone && !draft.contact_email) {
      await saveSession(phone, {
        account_id: accountId,
        state: "idle",
        draft: {},
      });
      return `Listo. Cobro ${row.id}\n${row.amount} ${row.asset_code} → ${draft.contact_name}\nPagar: ${s.checkout_url}\n\n${MENU}`;
    }
    await saveSession(phone, {
      account_id: accountId,
      state: "deliver",
      draft: nextDraft,
    });
    return deliverPrompt(nextDraft);
  } catch (e) {
    await saveSession(phone, {
      account_id: accountId,
      state: "idle",
      draft: {},
    });
    return `${e instanceof Error ? e.message : "Error al crear cobro"}\n\n${MENU}`;
  }
}

async function handleDeliverChoice(input: {
  phone: string;
  accountId: string;
  draft: WaDraft;
  lower: string;
  merchantName: string;
}): Promise<string> {
  const { phone, accountId, draft, lower, merchantName } = input;
  const wantWa =
    lower === "1" ||
    lower === "wsp" ||
    lower === "wa" ||
    lower.includes("whatsapp");
  const wantEmail =
    lower === "2" || lower === "mail" || lower.includes("email") || lower.includes("correo");
  const wantSkip =
    lower === "3" ||
    lower === "no" ||
    lower === "skip" ||
    lower.includes("solo") ||
    lower.includes("link");

  if (wantSkip) {
    return resetIdle(
      phone,
      accountId,
      `Ok. Link: ${draft.checkout_url}\n\n${MENU}`,
    );
  }

  if (wantWa) {
    if (!draft.contact_phone || !draft.share_text || !draft.checkout_url) {
      return "Ese contacto no tiene WhatsApp. Probá 2 Email o 3 Solo link.";
    }
    try {
      await sendMetaWhatsAppText({
        toPhoneE164: draft.contact_phone,
        body: draft.share_text,
      });
      return resetIdle(
        phone,
        accountId,
        `Enviado por WhatsApp a ${draft.contact_name} (${draft.contact_phone}).\n\n${MENU}`,
      );
    } catch (e) {
      const wa = waMeUrl(draft.contact_phone, draft.share_text);
      const why = e instanceof Error ? e.message : "Meta no pudo enviar";
      return resetIdle(
        phone,
        accountId,
        `No pude enviar directo (${why}).\nAbrí este chat y mandalo vos (1 toque):\n${wa}\n\n${MENU}`,
      );
    }
  }

  if (wantEmail) {
    if (!draft.contact_email || !draft.share_text || !draft.checkout_url) {
      return "Ese contacto no tiene email. Probá 1 WhatsApp o 3 Solo link.";
    }
    if (emailConfigured()) {
      const sent = await sendInvoiceEmail({
        to: draft.contact_email,
        merchantName,
        amount: draft.amount ?? "",
        asset: draft.asset ?? "",
        checkoutUrl: draft.checkout_url,
        recipientName: draft.contact_name,
      });
      if (sent.ok) {
        return resetIdle(
          phone,
          accountId,
          `Email enviado a ${draft.contact_name} (${draft.contact_email}).\n\n${MENU}`,
        );
      }
      const mail = mailtoInvoiceUrl({
        email: draft.contact_email,
        subject: `Cobro ViaPay ${draft.amount} ${draft.asset}`,
        body: draft.share_text,
      });
      return resetIdle(
        phone,
        accountId,
        `Resend falló (${sent.error}). Abrí el correo vos:\n${mail}\n\n${MENU}`,
      );
    }
    const mail = mailtoInvoiceUrl({
      email: draft.contact_email,
      subject: `Cobro ViaPay ${draft.amount} ${draft.asset}`,
      body: draft.share_text,
    });
    return resetIdle(
      phone,
      accountId,
      `Email aún sin Resend (falta RESEND_API_KEY). Abrí el correo:\n${mail}\n\n${MENU}`,
    );
  }

  return deliverPrompt(draft);
}

export async function handleWhatsAppInbound(input: {
  fromPhone: string;
  body: string;
}): Promise<string> {
  const text = input.body.trim();
  const phone = input.fromPhone;
  const lower = text.toLowerCase();

  // Link account anytime
  const code = parseVincularCode(text);
  if (code) {
    const linked = await consumeLinkCode(code, phone);
    if (!linked) {
      return `Código inválido o vencido.\n\n${merchantOnboardingText()}`;
    }
    await saveSession(phone, {
      account_id: linked.account_id,
      state: "idle",
      draft: {},
    });
    return `Listo. WhatsApp vinculado a tu cuenta ViaPay.\n\n${MENU}`;
  }

  const link = await getLinkByPhone(phone);
  let session = await getSession(phone);
  if (link) {
    session = {
      ...session,
      account_id: link.account_id,
    };
  }

  if (!session.account_id) {
    if (
      /registrar|registro|cuenta|crear|login|entrar|quiero cobrar|soy comercio|vincular/i.test(
        lower,
      ) ||
      lower === "hola" ||
      lower === "hi" ||
      lower === "buenas"
    ) {
      return merchantOnboardingText();
    }
    return merchantOnboardingText();
  }

  const accountId = session.account_id;
  const auth = await authContextForAccount(accountId);
  if (!auth) {
    return "Cuenta no encontrada. Volvé a vincular desde el panel.";
  }

  // Global cancel
  if (lower === "0" || lower === "menu" || lower === "cancelar") {
    return resetIdle(phone, accountId, helpText());
  }

  // Quick new contact
  const nuevo = tryParseNewContact(text);
  if (nuevo) {
    try {
      const c = await createContact(accountId, nuevo);
      return `Contacto guardado: ${c.display_name}.\nPodés: cobro 20 xlm a ${c.display_name}\n\n${MENU}`;
    } catch (e) {
      return e instanceof Error ? e.message : "No pude guardar el contacto.";
    }
  }

  if (session.state === "deliver") {
    return handleDeliverChoice({
      phone,
      accountId,
      draft: session.draft,
      lower,
      merchantName: auth.accountName,
    });
  }

  // Natural language charge (idle or mid-flow if clear intent)
  const natural = parseNaturalCharge(text);
  if (natural && (session.state === "idle" || session.state === "pick_contact")) {
    const matches = await findContactsByName(accountId, natural.contactQuery);
    if (matches.length === 0) {
      return `No encontré contacto "${natural.contactQuery}".\nAlta: Nuevo: ${natural.contactQuery}|+569…\no Nuevo: ${natural.contactQuery}|mail@x.com`;
    }
    if (matches.length > 1) {
      const lines = matches
        .slice(0, 8)
        .map((c, i) => `${i + 1}. ${c.display_name}`)
        .join("\n");
      await saveSession(phone, {
        account_id: accountId,
        state: "pick_contact",
        draft: {
          amount: natural.amount,
          asset: natural.asset,
          contact_query: natural.contactQuery,
        },
      });
      return `Varios contactos para "${natural.contactQuery}":\n${lines}\n\nElegí número (1-${Math.min(8, matches.length)}). Monto ya: ${natural.amount} ${natural.asset}`;
    }
    const c = matches[0]!;
    const draft: WaDraft = {
      contact_id: c.id,
      contact_name: c.display_name,
      contact_phone: c.phone_e164,
      contact_email: c.email,
      amount: natural.amount,
      asset: natural.asset,
    };
    await saveSession(phone, {
      account_id: accountId,
      state: "confirm",
      draft,
    });
    return `¿Confirmás?\nCobrar ${draft.amount} ${draft.asset} a ${draft.contact_name}\nSí / No`;
  }

  if (session.state === "idle") {
    if (lower === "1") {
      const contacts = await listContacts(accountId);
      await saveSession(phone, {
        account_id: accountId,
        state: "pick_contact",
        draft: {},
      });
      return `${formatContacts(contacts)}\n\nElegí número de contacto (1-8) o Nuevo: Nombre|+56…\nAtajo: cobro 20 xlm a nombre`;
    }
    if (lower === "2" || (lower.includes("contacto") && !lower.includes("cobr"))) {
      const contacts = await listContacts(accountId);
      return `${formatContacts(contacts)}\n\n${MENU}`;
    }
    if (lower === "3" || lower === "estado") {
      const rows = await listPaymentIntents(accountId);
      const recent = rows.slice(0, 3);
      if (recent.length === 0) return `Sin cobros aún.\n\n${MENU}`;
      const lines = recent.map((r) => {
        const inv = r.metadata?.invoice as
          | { recipient_name?: string }
          | undefined;
        const who = inv?.recipient_name ? ` → ${inv.recipient_name}` : "";
        return `• ${r.id} ${r.amount} ${r.asset_code}${who} [${r.status}]`;
      });
      return `Últimos cobros:\n${lines.join("\n")}\n\n${MENU}`;
    }
    if (lower.startsWith("pi_")) {
      const row = await getPaymentIntentById(text.split(/\s+/)[0]!);
      if (!row || row.account_id !== accountId) {
        return `No encontré ese cobro.\n\n${MENU}`;
      }
      const s = serializePaymentIntent(row);
      return `${row.id}: ${row.amount} ${row.asset_code} — ${row.status}\n${s.checkout_url}\n\n${MENU}`;
    }
    return helpText();
  }

  if (session.state === "pick_contact") {
    const pickList = session.draft.contact_query
      ? (await findContactsByName(accountId, session.draft.contact_query)).slice(
          0,
          8,
        )
      : (await listContacts(accountId)).slice(0, 8);
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > pickList.length) {
      return `Número inválido.\n${formatContacts(pickList)}`;
    }
    const c = pickList[n - 1]!;
    const draft: WaDraft = {
      ...session.draft,
      contact_id: c.id,
      contact_name: c.display_name,
      contact_phone: c.phone_e164,
      contact_email: c.email,
      contact_query: undefined,
    };
    if (draft.amount && draft.asset) {
      await saveSession(phone, {
        account_id: accountId,
        state: "confirm",
        draft,
      });
      return `¿Confirmás?\nCobrar ${draft.amount} ${draft.asset} a ${draft.contact_name}\nSí / No`;
    }
    await saveSession(phone, {
      account_id: accountId,
      state: "amount",
      draft,
    });
    return `Cobrar a ${c.display_name}.\n¿Monto? (ej. 20)`;
  }

  if (session.state === "amount") {
    const raw = text.replace(",", ".");
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) {
      return "Monto inválido. Ejemplos: 20 o 5.5";
    }
    if (num > 1_000_000) {
      return "Monto demasiado alto. Máximo 1000000 por cobro por WhatsApp.";
    }
    const amount = num.toFixed(7);
    if (!/^\d+\.\d{7}$/.test(amount) || Number(amount) <= 0) {
      return "Monto inválido. Ejemplos: 20 o 5.5";
    }
    const draft: WaDraft = {
      ...session.draft,
      amount,
    };
    await saveSession(phone, {
      account_id: accountId,
      state: "asset",
      draft,
    });
    return `Monto ${draft.amount}.\nActivo:\n1 XLM\n2 USDC`;
  }

  if (session.state === "asset") {
    let asset: "XLM" | "USDC" | null = null;
    if (lower === "1" || lower === "xlm") asset = "XLM";
    if (lower === "2" || lower === "usdc") asset = "USDC";
    if (!asset) return "Elegí 1 (XLM) o 2 (USDC).";
    const draft: WaDraft = { ...session.draft, asset };
    await saveSession(phone, {
      account_id: accountId,
      state: "confirm",
      draft,
    });
    return `¿Confirmás?\nCobrar ${draft.amount} ${asset} a ${draft.contact_name}\nSí / No`;
  }

  if (session.state === "confirm") {
    if (lower === "no" || lower === "n") {
      return resetIdle(phone, accountId, `Cancelado.\n\n${MENU}`);
    }
    if (
      lower !== "si" &&
      lower !== "sí" &&
      lower !== "yes" &&
      lower !== "s" &&
      lower !== "ok" &&
      lower !== "dale" &&
      lower !== "confirmar"
    ) {
      return "Respondé Sí o No.";
    }
    return createChargeAndAskDeliver({
      phone,
      accountId,
      auth,
      draft: session.draft,
    });
  }

  await saveSession(phone, {
    account_id: accountId,
    state: "idle" satisfies WaSessionState,
    draft: {},
  });
  return helpText();
}
