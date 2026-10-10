import {
  classifyChargeDestination,
  createContact,
  findContactsByEmail,
  findContactsByName,
  findContactsByPhone,
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
import { networkSettlementReady, stellarNetwork } from "@/lib/chain";
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
import { lockExactPayAmount } from "@/lib/exact-pay";
import {
  parseEstadoQuery,
  resolveCobroCode,
} from "@/lib/cobro-codes";
import { buildRailParity } from "@/lib/rail-parity";
import { getCheckoutBaseUrl } from "@/lib/payments";
import { isValidStellarPubkey } from "@viapay/shared";

const MENU = `ViaPay — asistente comercio
Atajos:
• cobro 20000 pesos a juanito
• cobro 20000 pesos a juanito con hubby 7%
• cobro 20 xlm a mail@cliente.com
• estado VP-XXXX
1 Nuevo cobro (paso a paso)
2 Mis contactos
3 Estado (últimos cobros)
0 Ayuda

Vincular: vincular 123456
Alta contacto: Nuevo: Nombre|+569… · Contacto: Nombre|mail@x.com · Nuevo: Nombre +569…

proof-or-nothing: no aceptamos capturas. Solo Paid on-chain.`;

function helpText(): string {
  return `${MENU}

Ejemplos (Chile / LATAM):
• cobro 20000 pesos a juanito     → exact-pay: traba USDC ≈ 20 mil CLP
• cobro 15 mil pesos a +569…      → mismo, destino WhatsApp
• cobro 20000 pesos a juanito con G… 7%  → exact-split (reseller)
• cobro 20 usdc a mail@x.com      → crypto fijo (exact)
• estado VP-ABCD                 → ¿pagó? (anti-comprobante)

El pagador paga el crypto trabado (Freighter). Sin cuenta ViaPay.
Una captura JPG no confirma nada — solo Stellar.`;
}

async function resolveResellerAddress(
  accountId: string,
  query: string,
): Promise<{ address: string; label: string } | { error: string }> {
  const q = query.trim();
  if (isValidStellarPubkey(q)) {
    return { address: q, label: `${q.slice(0, 4)}…${q.slice(-4)}` };
  }
  const matches = await findContactsByName(accountId, q);
  for (const c of matches) {
    const fromNotes = c.notes?.match(/G[A-Z2-7]{55}/)?.[0];
    if (fromNotes && isValidStellarPubkey(fromNotes)) {
      return { address: fromNotes, label: c.display_name };
    }
  }
  return {
    error: `Reseller "${q}": usá una wallet G… (ej. con GDIN… 7%) o guardá la G… en notas del contacto.`,
  };
}

async function formatEstadoReply(
  row: Awaited<ReturnType<typeof getPaymentIntentById>>,
): Promise<string> {
  if (!row) return `No encontré ese cobro.\n\n${MENU}`;
  const site = getCheckoutBaseUrl();
  const code =
    row.metadata && typeof row.metadata.cobro_code === "string"
      ? row.metadata.cobro_code
      : null;
  const codeLine = code ? `Código: ${code}\n` : "";
  if (row.status !== "succeeded" || !row.stellar_tx_hash) {
    return `Estado: NO PAGADO (${row.status})
${codeLine}${row.amount} ${row.asset_code}
Id: ${row.id}
proof-or-nothing: una captura no cuenta. Esperá Paid on-chain.
Pagar: ${site}/c/${code ?? row.id}

${MENU}`;
  }
  const parity = await buildRailParity(row);
  const legs = [
    `neto comercio ${row.net_amount}`,
    `fee ViaPay ${row.fee_amount}`,
  ];
  if (row.reseller_fee_bps > 0) {
    legs.push(`reseller ${row.reseller_amount}`);
  }
  return `Estado: PAGADO ✓
${codeLine}${row.amount} ${row.asset_code}
split-glass: ${legs.join(" · ")}
rail-parity: ${parity.ok ? "ok" : "mismatch"}
Tx: ${row.stellar_tx_hash}
Recibo: ${site}/r/${row.id}
Parity: ${parity.links.parity}

${MENU}`;
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
  const money = draft.fiat_label
    ? `${draft.fiat_label} → ${draft.amount} ${draft.asset}`
    : `${draft.amount} ${draft.asset}`;
  const lines = [
    `Cobro listo ${draft.payment_intent_id}`,
    `${money} → ${draft.contact_name}`,
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
  const settleNetwork = stellarNetwork();
  if (!networkSettlementReady(settleNetwork)) {
    return resetIdle(
      phone,
      accountId,
      `La red ${settleNetwork} no está lista para liquidar cobros (falta payment-router). Revisá Integración / env.`,
    );
  }
  try {
    const meta: Record<string, unknown> = {
      invoice: {
        contact_id: draft.contact_id,
        recipient_name: draft.contact_name,
        channel: "whatsapp",
        source: "whatsapp",
        phone_e164: draft.contact_phone ?? null,
        email: draft.contact_email ?? null,
      },
    };
    if (draft.exact_pay) meta.exact_pay = draft.exact_pay;

    const row = await createPaymentIntent(auth, {
      amount: draft.amount,
      asset: draft.asset,
      network: settleNetwork,
      description: draft.fiat_label
        ? `Exact-pay ${draft.fiat_label} → ${draft.contact_name}`
        : `Cobro a ${draft.contact_name}`,
      external_user_id: draft.contact_id,
      metadata: meta,
      reseller_fee_bps: draft.reseller_fee_bps,
      reseller_address: draft.reseller_address,
    });
    const s = serializePaymentIntent(row);
    const chargeLabel = draft.fiat_label
      ? `${draft.fiat_label} (≈ ${row.amount} ${row.asset_code})`
      : `${row.amount} ${row.asset_code}`;
    const code = s.cobro_code ? `\nCódigo: ${s.cobro_code}` : "";
    const payShort = s.cobro_code
      ? `${getCheckoutBaseUrl()}/c/${s.cobro_code}`
      : s.checkout_url;
    const shareText = `${auth.accountName} te cobra ${chargeLabel} por ViaPay:${code}\n${payShort}\n(No envíes capturas: solo el link confirma el pago)`;
    const nextDraft: WaDraft = {
      ...draft,
      payment_intent_id: row.id,
      checkout_url: s.checkout_url,
      share_text: shareText,
      cobro_code: s.cobro_code ?? undefined,
    };
    if (!draft.contact_phone && !draft.contact_email) {
      await saveSession(phone, {
        account_id: accountId,
        state: "idle",
        draft: {},
      });
      const splitNote =
        row.reseller_fee_bps > 0
          ? `\nsplit-glass: neto ${row.net_amount} · fee ${row.fee_amount} · reseller ${row.reseller_amount}`
          : "";
      return `Listo. Cobro ${row.id}${s.cobro_code ? ` (${s.cobro_code})` : ""}
${row.amount} ${row.asset_code} → ${draft.contact_name}${splitNote}
Pagar: ${payShort}
estado ${s.cobro_code ?? row.id}

${MENU}`;
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

  // Anti-comprobante: estado VP-XXXX / pi_…
  const estadoQ = parseEstadoQuery(text);
  if (estadoQ && session.state === "idle") {
    let row = null;
    if (/^VP-/i.test(estadoQ)) {
      row = await resolveCobroCode(estadoQ);
      if (row && row.account_id !== accountId) row = null;
    } else {
      row = await getPaymentIntentById(estadoQ);
      if (row && row.account_id !== accountId) row = null;
    }
    return formatEstadoReply(row);
  }

  // Natural language charge (idle or mid-flow if clear intent)
  const natural = parseNaturalCharge(text);
  if (natural && (session.state === "idle" || session.state === "pick_contact")) {
    let lockedAmount = natural.amount;
    let lockedAsset = natural.asset;
    let exactPay: Record<string, unknown> | undefined;
    let fiatLabel: string | undefined;
    let resellerFeeBps: number | undefined;
    let resellerAddress: string | undefined;
    let resellerLabel: string | undefined;

    if (natural.scheme === "exact_pay" && natural.fiatAmount && natural.fiatCurrency) {
      try {
        const lock = await lockExactPayAmount({
          fiatAmount: natural.fiatAmount,
          fiatCurrency: natural.fiatCurrency,
          asset: natural.asset,
        });
        lockedAmount = lock.crypto_amount;
        lockedAsset = lock.asset;
        exactPay = lock as unknown as Record<string, unknown>;
        fiatLabel = `${lock.fiat_amount} ${lock.fiat_currency}`;
      } catch (e) {
        return `${e instanceof Error ? e.message : "No pude cotizar el fiat"}\nProbá crypto: cobro 20 usdc a nombre\n\n${MENU}`;
      }
    }

    if (natural.resellerFeeBps && natural.resellerQuery) {
      const resolved = await resolveResellerAddress(
        accountId,
        natural.resellerQuery,
      );
      if ("error" in resolved) {
        return `${resolved.error}\n\n${MENU}`;
      }
      resellerFeeBps = natural.resellerFeeBps;
      resellerAddress = resolved.address;
      resellerLabel = resolved.label;
    }

    const moneyLabel = fiatLabel
      ? `${fiatLabel} → ${lockedAmount} ${lockedAsset} (exact-pay)`
      : `${lockedAmount} ${lockedAsset}`;
    const splitLabel =
      resellerFeeBps && resellerLabel
        ? `\nexact-split: reseller ${resellerLabel} ${resellerFeeBps / 100}%`
        : "";

    const dest = classifyChargeDestination(natural.contactQuery);
    let c: ContactRow | null = null;

    if (dest.kind === "email") {
      const byEmail = await findContactsByEmail(accountId, dest.email);
      c =
        byEmail[0] ??
        (await createContact(accountId, {
          display_name: dest.email.split("@")[0] || dest.email,
          email: dest.email,
        }));
    } else if (dest.kind === "phone") {
      const byPhone = await findContactsByPhone(accountId, dest.phone);
      c =
        byPhone[0] ??
        (await createContact(accountId, {
          display_name: dest.phone,
          phone_e164: dest.phone,
        }));
    } else {
      const matches = await findContactsByName(accountId, dest.query);
      if (matches.length === 0) {
        return `No encontré contacto "${dest.query}".\nAlta: Nuevo: ${dest.query}|+569…\no Nuevo: ${dest.query}|mail@x.com\nO directo: cobro 20000 pesos a +569… / mail@x.com`;
      }
      if (matches.length > 1) {
        const lines = matches
          .slice(0, 8)
          .map((row, i) => `${i + 1}. ${row.display_name}`)
          .join("\n");
        await saveSession(phone, {
          account_id: accountId,
          state: "pick_contact",
          draft: {
            amount: lockedAmount,
            asset: lockedAsset,
            exact_pay: exactPay,
            fiat_label: fiatLabel,
            contact_query: dest.query,
          },
        });
        return `Varios contactos para "${dest.query}":\n${lines}\n\nElegí número (1-${Math.min(8, matches.length)}). Monto ya: ${moneyLabel}`;
      }
      c = matches[0]!;
    }

    const draft: WaDraft = {
      contact_id: c.id,
      contact_name: c.display_name,
      contact_phone: c.phone_e164,
      contact_email: c.email,
      amount: lockedAmount,
      asset: lockedAsset,
      exact_pay: exactPay,
      fiat_label: fiatLabel,
      reseller_fee_bps: resellerFeeBps,
      reseller_address: resellerAddress,
      reseller_label: resellerLabel,
    };
    await saveSession(phone, {
      account_id: accountId,
      state: "confirm",
      draft,
    });
    const via = c.phone_e164
      ? c.phone_e164
      : c.email
        ? c.email
        : c.display_name;
    return `¿Confirmás?\nCobrar ${moneyLabel}${splitLabel}\na ${draft.contact_name} (${via})\nSí / No`;
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
      const money = draft.fiat_label
        ? `${draft.fiat_label} → ${draft.amount} ${draft.asset} (exact-pay)`
        : `${draft.amount} ${draft.asset}`;
      return `¿Confirmás?\nCobrar ${money}\na ${draft.contact_name}\nSí / No`;
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
