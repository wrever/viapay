import { z } from "zod";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { deployEscrow } from "@/lib/integrations";

const schema = z.object({
  signer: z.string().regex(/^G[A-Z2-7]{55}$/),
  service_provider: z.string().regex(/^G[A-Z2-7]{55}$/),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  amount: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    requireAuth(req);
    const body = schema.parse(await req.json());
    const deployed = await deployEscrow({
      signer: body.signer,
      serviceProvider: body.service_provider,
      title: body.title,
      description: body.description ?? body.title,
      amount: body.amount,
    });
    return jsonOk(deployed, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
