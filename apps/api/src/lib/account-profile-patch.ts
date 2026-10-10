import { z } from "zod";

/** Shared Zod body for PATCH /v1/me (kept tiny for reuse/tests). */
export const accountProfilePatchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    business_name: z.string().max(120).nullable().optional(),
    phone_e164: z.string().max(20).nullable().optional(),
    notify_email_paid: z.boolean().optional(),
    notify_wa_paid: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "empty_patch" });

export type AccountProfilePatchBody = z.infer<typeof accountProfilePatchSchema>;
