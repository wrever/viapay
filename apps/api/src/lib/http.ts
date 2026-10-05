import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError, authenticateRequest } from "@/lib/auth";
import { getDb, migrate } from "@/lib/db";

let migrated = false;

export function ensureDb() {
  if (!migrated) {
    migrate(getDb());
    migrated = true;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "validation_error", details: error.flatten() },
      { status: 400 },
    );
  }
  const status =
    typeof error === "object" &&
    error &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
      ? (error as { status: number }).status
      : 500;
  const message = error instanceof Error ? error.message : "Internal error";
  return NextResponse.json({ error: message }, { status });
}

export function requireAuth(req: Request) {
  ensureDb();
  return authenticateRequest(req.headers.get("authorization"));
}
