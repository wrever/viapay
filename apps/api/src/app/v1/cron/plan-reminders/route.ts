import { jsonError, jsonOk } from "@/lib/http";
import { runPlanReminders } from "@/lib/notify-plan-reminder";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Local/dev: allow without secret; prod should set CRON_SECRET.
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  const header = req.headers.get("x-cron-secret");
  return header === secret;
}

export async function POST(req: Request) {
  try {
    if (!authorizeCron(req)) {
      return jsonError(
        Object.assign(new Error("Unauthorized"), { status: 401 }),
      );
    }
    const url = new URL(req.url);
    const dry = url.searchParams.get("dry_run") === "1";
    const result = await runPlanReminders({ dryRun: dry || undefined });
    return jsonOk(result);
  } catch (e) {
    return jsonError(e);
  }
}

export async function GET(req: Request) {
  return POST(req);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
