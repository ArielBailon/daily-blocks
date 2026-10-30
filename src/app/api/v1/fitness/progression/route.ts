import { NextResponse } from "next/server";
import { loadProgression } from "@/lib/fitness/api-v1";
import { jsonError, queryParams } from "@/lib/fitness/http";
import { v1ProgressionQuery } from "@/lib/validation/fitness";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;

export async function GET(request: Request) {
  const query = v1ProgressionQuery.safeParse(queryParams(request));
  if (!query.success) return jsonError(query.error.issues[0].message, 400);

  try {
    const result = await loadProgression(
      query.data.exercise,
      query.data.limit ?? DEFAULT_LIMIT
    );
    return result
      ? NextResponse.json(result)
      : jsonError("Ejercicio no encontrado", 404);
  } catch {
    return jsonError("Error al leer la progresión", 500);
  }
}
