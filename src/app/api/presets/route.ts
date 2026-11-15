import { NextResponse } from "next/server";
import { createPreset } from "@/lib/presets";
import { createPresetInput } from "@/lib/validation/preset";
import { presetErrorResponse } from "@/lib/preset-http";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = createPresetInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  try {
    const result = await createPreset(parsed.data);
    if (result.kind !== "ok") return presetErrorResponse(result);
    return NextResponse.json(result.preset, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Error al crear la plantilla" },
      { status: 500 }
    );
  }
}
