import { NextResponse } from "next/server";
import { jsonError, parseBody } from "@/lib/fitness/http";
import { createSession, loadSessionDto } from "@/lib/fitness/sessions";
import { loadHistory } from "@/lib/fitness/history";
import { createSessionInput, historyQuery } from "@/lib/validation/fitness";

export const dynamic = "force-dynamic";

// Completed sessions, newest first, paginated with an opaque cursor.
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = historyQuery.safeParse(params);
  if (!query.success) {
    return jsonError(query.error.issues[0].message, 400);
  }

  try {
    return NextResponse.json(await loadHistory(query.data));
  } catch {
    return jsonError("Error al leer el historial", 500);
  }
}

export async function POST(request: Request) {
  const parsed = await parseBody(request, createSessionInput);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await createSession(parsed.data.routineDayKey);
    if (!result.ok) {
      return result.reason === "conflict"
        ? jsonError("Ya hay una sesión en curso", 409)
        : jsonError("Día de rutina no encontrado", 404);
    }
    return NextResponse.json(await loadSessionDto(result.id), { status: 201 });
  } catch {
    return jsonError("Error al crear la sesión", 500);
  }
}
