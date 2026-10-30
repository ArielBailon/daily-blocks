import { NextResponse } from "next/server";
import { loadVolumeReport } from "@/lib/fitness/api-v1";
import { jsonError, queryParams } from "@/lib/fitness/http";
import { v1WeekQuery } from "@/lib/validation/fitness";

export const dynamic = "force-dynamic";

// `week` may be any date; it is normalized to the Monday of its week.
export async function GET(request: Request) {
  const query = v1WeekQuery.safeParse(queryParams(request));
  if (!query.success) return jsonError(query.error.issues[0].message, 400);

  try {
    return NextResponse.json(await loadVolumeReport(query.data.week));
  } catch {
    return jsonError("Error al calcular el volumen", 500);
  }
}
