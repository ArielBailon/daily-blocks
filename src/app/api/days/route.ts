import { NextResponse } from "next/server";
import { toDateKey } from "@/lib/date";
import { getDayPlansInRange } from "@/lib/daily-plan";
import { parseDayRange } from "@/lib/validation/day-range";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = parseDayRange(searchParams.getAll("from"), searchParams.getAll("to"));
  if (!range.ok) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  try {
    const plans = await getDayPlansInRange(range.from, range.to);
    return NextResponse.json({
      days: plans.map((plan) => ({
        date: toDateKey(plan.date),
        blocks: plan.blocks.map((b) => ({
          startTime: b.startTime,
          activity: b.activity,
          completed: b.completed,
          tag: b.tag,
        })),
        miscTasks: plan.miscTasks,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Error al leer los días" },
      { status: 500 }
    );
  }
}
