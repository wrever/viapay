import {
  createContact,
  listContacts,
  type ContactRow,
} from "@/lib/contacts";
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
import { waMeUrl } from "./meta";

const MENU = `ViaPay — asistente
1 Nuevo cobro
2 Mis contactos
3 Estado (últimos cobros)
0 Ayuda

Vincular cuenta: vincular 123456
Alta contacto: Nuevo: Nombre|+54911…`;

function helpText(): string {
  return `${MENU}

Flujo cobro: elegí contacto → monto → activo → confirmá.
Liquidación on-chain en Stellar (Freighter / payment-router).
Al cliente le reenviás el link (o abrís wa.me desde el mensaje).`;
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
    return "No tenés contactos. Alta: Nuevo: Juanito|+5491122334455";
  }
  const lines = contacts
    .slice(0, 8)
    .map((c, i) => {
      const dest = c.phone_e164 ?? c.email ?? "—";
      return `${i + 1}. ${c.display_name} (${dest})`;
    });
  return `Contactos:\n${lines.join("\n")}\n\nNuevo: Nombre|+54…`;
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
      return "Código inválido o vencido. Generá uno nuevo en el panel ViaPay → Cobros → WhatsApp.";
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
    return `Este número no está vinculado a ViaPay.\n1) Panel → Cobros → Generar código\n2) Escribí aquí: vincular 123456`;
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
      return `Contacto guardado: ${c.display_name}.\n\n${MENU}`;
    } catch (e) {
      return e instanceof Error ? e.message : "No pude guardar el contacto.";
    }
  }

  if (session.state === "idle") {
    if (lower === "1" || lower.includes("cobro")) {
      const contacts = await listContacts(accountId);
      await saveSession(phone, {
        account_id: accountId,
        state: "pick_contact",
        draft: {},
      });
      return `${formatContacts(contacts)}\n\nElegí número de contacto (1-8) o Nuevo: Nombre|+54…`;
    }
    if (lower === "2" || lower.includes("contacto")) {
      const contacts = await listContacts(accountId);
      return `${formatContacts(contacts)}\n\n${MENU}`;
    }
    if (lower === "3" || lower.includes("estado")) {
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
    const contacts = await listContacts(accountId);
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > Math.min(8, contacts.length)) {
      return `Número inválido.\n${formatContacts(contacts)}`;
    }
    const c = contacts[n - 1]!;
    const draft: WaDraft = {
      contact_id: c.id,
      contact_name: c.display_name,
      contact_phone: c.phone_e164,
      contact_email: c.email,
    };
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
    const draft: WaDraft = {
      ...session.draft,
      amount: num.toFixed(7),
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
    if (lower !== "si" && lower !== "sí" && lower !== "yes" && lower !== "s") {
      return "Respondé Sí o No.";
    }
    if (!auth.merchantWallet) {
      return resetIdle(
        phone,
        accountId,
        "Falta wallet de destino. Guardala en Integración del panel.",
      );
    }
    const draft = session.draft;
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
      let forward = "";
      if (draft.contact_phone) {
        forward = `\nAbrí chat con ${draft.contact_name}:\n${waMeUrl(draft.contact_phone, shareText)}`;
      } else if (draft.contact_email) {
        forward = `\nEmail del contacto: ${draft.contact_email} (copiá el link)`;
      }
      await saveSession(phone, {
        account_id: accountId,
        state: "idle",
        draft: {},
      });
      return `Listo. Cobro ${row.id}\n${row.amount} ${row.asset_code} → ${draft.contact_name}\nPagar: ${s.checkout_url}${forward}\n\n${MENU}`;
    } catch (e) {
      await saveSession(phone, {
        account_id: accountId,
        state: "idle",
        draft: {},
      });
      return `${e instanceof Error ? e.message : "Error al crear cobro"}\n\n${MENU}`;
    }
  }

  await saveSession(phone, {
    account_id: accountId,
    state: "idle" satisfies WaSessionState,
    draft: {},
  });
  return helpText();
}
