import { normalizePhone } from "@/lib/contacts";

/** Parse WA "add contact" lines into name + phone/email. */
export function tryParseNewContact(body: string): {
  display_name: string;
  phone_e164?: string;
  email?: string;
} | null {
  const trimmed = body.trim();
  const labeled = trimmed.match(
    /^(?:nuevo(?:\s+contacto)?|contacto|agregar\s+contacto)\s*[:：]\s*(.+)$/i,
  );
  const spaced = labeled
    ? null
    : trimmed.match(/^agregar\s+contacto\s+(.+)$/i);
  const rest = (labeled?.[1] ?? spaced?.[1] ?? "").trim();
  if (!rest) return null;
  return parseContactPayload(rest);
}

function parseContactPayload(rest: string): {
  display_name: string;
  phone_e164?: string;
  email?: string;
} | null {
  if (rest.includes("|")) {
    const parts = rest.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    const display_name = parts[0];
    const second = parts[1];
    const phone = normalizePhone(second);
    if (phone) return { display_name, phone_e164: phone };
    if (second.includes("@")) return { display_name, email: second };
    return null;
  }

  const phoneAtEnd = rest.match(/^(.+?)\s+(\+?\d[\d\s().-]{7,})$/);
  if (phoneAtEnd) {
    const phone = normalizePhone(phoneAtEnd[2]);
    if (phone) {
      return { display_name: phoneAtEnd[1].trim(), phone_e164: phone };
    }
  }

  const emailAtEnd = rest.match(/^(.+?)\s+(\S+@\S+\.\S+)$/);
  if (emailAtEnd) {
    return {
      display_name: emailAtEnd[1].trim(),
      email: emailAtEnd[2],
    };
  }

  return null;
}
