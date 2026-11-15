import { NextResponse } from "next/server";
import type { PresetResult } from "@/lib/presets";

export function presetErrorResponse(
  result: Exclude<PresetResult, { kind: "ok" }>
) {
  switch (result.kind) {
    case "not-found":
      return NextResponse.json(
        { error: "Plantilla no encontrada" },
        { status: 404 }
      );
    case "name-taken":
      return NextResponse.json(
        { error: "Ya existe una plantilla con ese nombre" },
        { status: 409 }
      );
    case "is-default":
      return NextResponse.json(
        {
          error:
            "No se puede eliminar la plantilla predeterminada. Marca otra primero.",
        },
        { status: 409 }
      );
  }
}
