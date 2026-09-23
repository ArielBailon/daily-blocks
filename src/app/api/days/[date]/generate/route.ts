import { NextResponse } from "next/server";
import { parseDateKey, resolveToday } from "@/lib/date";
import { closePastPlans, generateDay } from "@/lib/daily-plan";
import { generateDayInput } from "@/lib/validation/day";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/days/[date]/generate">
) {
  const { date: dateParam } = await ctx.params;
  const date = parseDateKey(dateParam);
  if (!date) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  const { date: today } = resolveToday();
  if (date.getTime() < today.getTime()) {
    return NextResponse.json(
      { error: "Solo se puede planificar hoy o un día futuro" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = generateDayInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    await closePastPlans(today);
    const result = await generateDay({
      date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      confirmRemoval: parsed.data.confirmRemoval === true,
    });

    if (result.kind === "closed") {
      return NextResponse.json(
        { error: "Este día ya está cerrado y no se puede editar." },
        { status: 409 }
      );
    }
    if (result.kind === "needs-confirmation") {
      return NextResponse.json(
        {
          error: `Hay ${result.count} ${
            result.count === 1 ? "bloque" : "bloques"
          } con contenido fuera del nuevo rango.`,
          needsConfirmation: true,
          count: result.count,
        },
        { status: 409 }
      );
    }

    const { plan } = result;
    return NextResponse.json({
      startTime: plan.startTime,
      endTime: plan.endTime,
      blocks: plan.blocks.map((b) => ({
        id: b.id,
        startTime: b.startTime,
        activity: b.activity,
        completed: b.completed,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Error al generar el día" },
      { status: 500 }
    );
  }
}
