import { NextResponse } from "next/server";
import { jsonError, parseBody, parseId } from "@/lib/fitness/http";
import { loadSessionDto, updateDraft } from "@/lib/fitness/sessions";
import { prisma } from "@/lib/prisma";
import { sessionUpdateInput } from "@/lib/validation/fitness";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/fitness/sessions/[id]">
) {
  const id = parseId((await ctx.params).id);
  if (id === null) return jsonError("Sesión no encontrada", 404);

  try {
    const session = await loadSessionDto(id);
    return session
      ? NextResponse.json(session)
      : jsonError("Sesión no encontrada", 404);
  } catch {
    return jsonError("Error al leer la sesión", 500);
  }
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/fitness/sessions/[id]">
) {
  const id = parseId((await ctx.params).id);
  if (id === null) return jsonError("Sesión no encontrada", 404);

  const parsed = await parseBody(request, sessionUpdateInput);
  if ("response" in parsed) return parsed.response;

  try {
    const input = parsed.data;
    const result = await updateDraft(id, input);
    if (!result.ok) {
      if (result.reason === "not-found") {
        return jsonError("Sesión no encontrada", 404);
      }
      if (result.reason === "closed") {
        return jsonError("Esta sesión ya no está en curso.", 409);
      }
      return jsonError("Ejercicio inválido para esta sesión", 400);
    }
    // Autosaves are frequent and the client already holds the state; only a new
    // exercise needs the server's ids and "previous" sets back.
    return NextResponse.json(
      input.addExercise ? await loadSessionDto(id) : { ok: true }
    );
  } catch {
    return jsonError("Error al guardar la sesión", 500);
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/fitness/sessions/[id]">
) {
  const id = parseId((await ctx.params).id);
  if (id === null) return jsonError("Sesión no encontrada", 404);

  try {
    const { count } = await prisma.workoutSession.deleteMany({ where: { id } });
    return count > 0
      ? new NextResponse(null, { status: 204 })
      : jsonError("Sesión no encontrada", 404);
  } catch {
    return jsonError("Error al eliminar la sesión", 500);
  }
}
