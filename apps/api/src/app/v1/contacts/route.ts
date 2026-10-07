import { z } from "zod";
import {
  createContact,
  listContacts,
  serializeContact,
} from "@/lib/contacts";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";

const createSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  phone_e164: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  notes: z.string().trim().max(200).optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const rows = await listContacts(auth.accountId);
    return jsonOk({ data: rows.map(serializeContact) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = createSchema.parse(await req.json());
    const row = await createContact(auth.accountId, body);
    return jsonOk(serializeContact(row), { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
