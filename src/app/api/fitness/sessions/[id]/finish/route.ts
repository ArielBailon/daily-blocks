import { NextResponse } from "next/server";
import { jsonError, parseId } from "@/lib/fitness/http";
import { finishSession, loadSessionDto } from "@/lib/fitness/sessions";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/fitness/sessions/[id]/finish">
) {
  const id = parseId((await ctx.params).id);
  if (id === null) return jsonError("Sesión no encontrada", 404);

  try {
    const result = await finishSession(id);
    if (!result.ok) {
      if (result.reason === "not-found") {
        return jsonError("Sesión no encontrada", 404);
      }
      if (result.reason === "closed") {
        return jsonError("Esta sesión ya no está en curso.", 409);
      }
      return jsonError("Completa al menos una serie para terminar", 400);
    }
    return NextResponse.json(await loadSessionDto(id));
  } catch {
    return jsonError("Error al terminar la sesión", 500);
  }
}
