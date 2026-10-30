import { NextResponse } from "next/server";
import { loadSessionsRange, resolveRange } from "@/lib/fitness/api-v1";
import { jsonError, queryParams } from "@/lib/fitness/http";
import { v1RangeQuery } from "@/lib/validation/fitness";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 30;

export async function GET(request: Request) {
  const query = v1RangeQuery.safeParse(queryParams(request));
  if (!query.success) return jsonError(query.error.issues[0].message, 400);

  const range = resolveRange(query.data, DEFAULT_DAYS);
  if ("error" in range) return jsonError(range.error, 400);

  try {
    return NextResponse.json({ ...range, sessions: await loadSessionsRange(range) });
  } catch {
    return jsonError("Error al leer las sesiones", 500);
  }
}
