import { NextResponse } from "next/server";
import { resolveRange } from "@/lib/fitness/api-v1";
import { listBodyWeight } from "@/lib/fitness/body";
import { jsonError, queryParams } from "@/lib/fitness/http";
import { v1RangeQuery } from "@/lib/validation/fitness";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 90;
const MAX_ENTRIES = 500;

export async function GET(request: Request) {
  const query = v1RangeQuery.safeParse(queryParams(request));
  if (!query.success) return jsonError(query.error.issues[0].message, 400);

  const range = resolveRange(query.data, DEFAULT_DAYS);
  if ("error" in range) return jsonError(range.error, 400);

  try {
    const entries = await listBodyWeight({ ...range, limit: MAX_ENTRIES });
    return NextResponse.json({ ...range, entries });
  } catch {
    return jsonError("Error al leer el peso", 500);
  }
}
