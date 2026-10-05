import { z } from "zod";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { discoverAnchor, integrationStatus } from "@/lib/integrations";

export async function GET(req: Request) {
  try {
    requireAuth(req);
    const domain = process.env.ANCHOR_HOME_DOMAIN;
    let anchor = null;
    if (domain) {
      try {
        anchor = await discoverAnchor(domain);
      } catch (error) {
        anchor = {
          error: error instanceof Error ? error.message : "anchor lookup failed",
        };
      }
    }
    return jsonOk({
      data: integrationStatus(),
      anchor,
      contract_id: process.env.PAYMENT_ROUTER_CONTRACT_ID ?? null,
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    requireAuth(req);
    const body = z.object({ domain: z.string().min(3) }).parse(await req.json());
    return jsonOk(await discoverAnchor(body.domain));
  } catch (e) {
    return jsonError(e);
  }
}
