import {
  getAccountProfile,
  updateAccountProfile,
} from "@/lib/account-profile";
import { accountProfilePatchSchema } from "@/lib/account-profile-patch";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { meResponse } from "@/lib/me-response";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const profile = await getAccountProfile(auth.accountId);
    if (!profile) {
      return jsonError(
        Object.assign(new Error("account not found"), { status: 404 }),
      );
    }
    return jsonOk(meResponse(profile));
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = accountProfilePatchSchema.parse(await req.json());
    const account = await updateAccountProfile(auth.accountId, body);
    return jsonOk(meResponse(account));
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
