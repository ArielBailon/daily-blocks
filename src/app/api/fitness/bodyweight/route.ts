import { NextResponse } from "next/server";
import { listBodyWeight, upsertBodyWeight } from "@/lib/fitness/body";
import { jsonError, parseBody } from "@/lib/fitness/http";
import { localDateKey } from "@/lib/fitness/week";
import { bodyWeightInput, bodyWeightQuery } from "@/lib/validation/fitness";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = bodyWeightQuery.safeParse(params);
  if (!query.success) {
    return jsonError(query.error.issues[0].message, 400);
  }

  try {
    return NextResponse.json({ entries: await listBodyWeight(query.data) });
  } catch {
    return jsonError("Error al leer el peso", 500);
  }
}

export async function PUT(request: Request) {
  const parsed = await parseBody(request, bodyWeightInput);
  if ("response" in parsed) return parsed.response;

  const today = localDateKey();
  const date = parsed.data.date ?? today;
  if (date > today) {
    return jsonError("No se puede registrar el peso de un día futuro", 400);
  }

  try {
    return NextResponse.json(await upsertBodyWeight(date, parsed.data.kg));
  } catch {
    return jsonError("Error al guardar el peso", 500);
  }
}
