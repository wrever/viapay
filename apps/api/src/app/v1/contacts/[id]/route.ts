import { z } from "zod";
import {
  deleteContact,
  serializeContact,
  updateContact,
} from "@/lib/contacts";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";

const patchSchema = z.object({
  display_name: z.string().trim().min(1).max(80).optional(),
  phone_e164: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(200).optional().nullable(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    const email =
      body.email === "" ? null : body.email === undefined ? undefined : body.email;
    const row = await updateContact(auth.accountId, id, {
      display_name: body.display_name,
      phone_e164: body.phone_e164,
      email,
      notes: body.notes,
    });
    return jsonOk(serializeContact(row));
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(_req);
    const { id } = await ctx.params;
    await deleteContact(auth.accountId, id);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
