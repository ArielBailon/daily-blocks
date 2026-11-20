import { NextResponse } from "next/server";
import { jsonError, parseBody, parseId } from "@/lib/fitness/http";
import { applyAction } from "@/lib/focus/service";
import { focusActionInput } from "@/lib/validation/focus";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/focus/sessions/[id]">
) {
  const id = parseId((await ctx.params).id);
  if (id === null) return jsonError("Sesión no encontrada", 404);

  const parsed = await parseBody(request, focusActionInput);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await applyAction(id, parsed.data.action);
    if (!result.ok) return jsonError(result.error, result.status);
    return NextResponse.json({ session: result.session });
  } catch {
    return jsonError("Error al actualizar la sesión de foco", 500);
  }
}
