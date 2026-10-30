import { NextResponse } from "next/server";
import { loadRoutine } from "@/lib/fitness/api-v1";
import { jsonError } from "@/lib/fitness/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadRoutine());
  } catch {
    return jsonError("Error al leer la rutina", 500);
  }
}
