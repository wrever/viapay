import { z } from "zod";
import {
  getAccountProfile,
  updateAccountProfile,
} from "@/lib/account-profile";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";

const patchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    business_name: z.string().max(120).nullable().optional(),
    phone_e164: z.string().max(20).nullable().optional(),
    notify_email_paid: z.boolean().optional(),
    notify_wa_paid: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "empty_patch" });

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const profile = await getAccountProfile(auth.accountId);
    if (!profile) {
      return jsonError(
        Object.assign(new Error("account not found"), { status: 404 }),
      );
    }
    return jsonOk({ account: profile });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = patchSchema.parse(await req.json());
    const account = await updateAccountProfile(auth.accountId, body);
    return jsonOk({ account });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
