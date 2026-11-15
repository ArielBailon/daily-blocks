import { NextResponse } from "next/server";
import { deletePreset, updatePreset } from "@/lib/presets";
import { updatePresetInput } from "@/lib/validation/preset";
import { presetErrorResponse } from "@/lib/preset-http";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const NOT_FOUND = { error: "Plantilla no encontrada" };

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/presets/[id]">
) {
  const id = parseId((await ctx.params).id);
  if (id === null) return NextResponse.json(NOT_FOUND, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = updatePresetInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  try {
    const result = await updatePreset(id, parsed.data);
    if (result.kind !== "ok") return presetErrorResponse(result);
    return NextResponse.json(result.preset);
  } catch {
    return NextResponse.json(
      { error: "Error al guardar la plantilla" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/presets/[id]">
) {
  const id = parseId((await ctx.params).id);
  if (id === null) return NextResponse.json(NOT_FOUND, { status: 404 });
  try {
    const result = await deletePreset(id);
    if (result.kind !== "ok") return presetErrorResponse(result);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar la plantilla" },
      { status: 500 }
    );
  }
}
