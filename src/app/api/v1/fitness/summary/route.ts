import { NextResponse } from "next/server";
import { loadSummary } from "@/lib/fitness/api-v1";
import { jsonError } from "@/lib/fitness/http";

// Read-only API for external analysis. Reads "today" and the database: never prerender.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadSummary());
  } catch {
    return jsonError("Error al calcular el resumen", 500);
  }
}
