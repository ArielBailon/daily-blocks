import { NextResponse } from "next/server";
import { parseDateKey, resolveToday } from "@/lib/date";
import { saveMiscTasks } from "@/lib/daily-plan";
import { miscTasksInput } from "@/lib/validation/day";

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/days/[date]/misc-tasks">
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

  const parsed = miscTasksInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const result = await saveMiscTasks({ date, tasks: parsed.data.tasks });
    if (result.kind === "closed") {
      return NextResponse.json(
        { error: "Este día ya está cerrado y no se puede editar." },
        { status: 409 }
      );
    }
    return NextResponse.json({ tasks: result.tasks });
  } catch {
    return NextResponse.json(
      { error: "Error al guardar las tareas" },
      { status: 500 }
    );
  }
}
