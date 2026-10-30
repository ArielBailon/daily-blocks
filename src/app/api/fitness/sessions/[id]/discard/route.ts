import { NextResponse } from "next/server";
import { jsonError, parseId } from "@/lib/fitness/http";
import { discardSession, loadSessionDto } from "@/lib/fitness/sessions";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/fitness/sessions/[id]/discard">
) {
  const id = parseId((await ctx.params).id);
  if (id === null) return jsonError("Sesión no encontrada", 404);

  try {
    const result = await discardSession(id);
    if (result === "not-found") return jsonError("Sesión no encontrada", 404);
    if (result === "closed") {
      return jsonError("Esta sesión ya no está en curso.", 409);
    }
    return NextResponse.json(await loadSessionDto(id));
  } catch {
    return jsonError("Error al descartar la sesión", 500);
  }
}
