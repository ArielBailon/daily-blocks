import { NextResponse } from "next/server";
import { getGoal, updateGoal } from "@/lib/fitness/body";
import { jsonError, parseBody } from "@/lib/fitness/http";
import { goalUpdateInput } from "@/lib/validation/fitness";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getGoal());
  } catch {
    return jsonError("Error al leer la meta", 500);
  }
}

export async function PATCH(request: Request) {
  const parsed = await parseBody(request, goalUpdateInput);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await updateGoal(parsed.data);
    return result.ok
      ? NextResponse.json(result.goal)
      : jsonError(result.error, 400);
  } catch {
    return jsonError("Error al guardar la meta", 500);
  }
}
