import { NextResponse } from "next/server";
import { jsonError } from "@/lib/fitness/http";
import { getActiveSession } from "@/lib/focus/service";

export const dynamic = "force-dynamic";

// Also settles a session whose time ran out, so reading it can write.
export async function GET() {
  try {
    return NextResponse.json({ session: await getActiveSession() });
  } catch {
    return jsonError("Error al leer la sesión de foco", 500);
  }
}
