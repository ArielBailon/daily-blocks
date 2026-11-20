import { NextResponse } from "next/server";
import { jsonError, parseBody } from "@/lib/fitness/http";
import { startSession } from "@/lib/focus/service";
import { startFocusInput } from "@/lib/validation/focus";

export async function POST(request: Request) {
  const parsed = await parseBody(request, startFocusInput);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await startSession(parsed.data);
    if (!result.ok) return jsonError(result.error, result.status);
    return NextResponse.json(
      { session: result.session, coverage: result.coverage },
      { status: 201 }
    );
  } catch {
    return jsonError("Error al iniciar la sesión de foco", 500);
  }
}
