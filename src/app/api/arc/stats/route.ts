import { NextResponse } from "next/server";
import { resolveToday, toDateKey } from "@/lib/date";
import { loadArcPlans } from "@/lib/arc/load";
import { computeArc } from "@/lib/arc/summary";
import { arcProgress } from "@/lib/arc/view";

// Reads "today" and the database on every request: never prerender.
export const dynamic = "force-dynamic";

export async function GET() {
  const today = toDateKey(resolveToday().date);

  try {
    const summary = computeArc(await loadArcPlans(), today);
    return NextResponse.json({
      today,
      progress: arcProgress(today),
      summary,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al calcular el Winter Arc" },
      { status: 500 }
    );
  }
}
