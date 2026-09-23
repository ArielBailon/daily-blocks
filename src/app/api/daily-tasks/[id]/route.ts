import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveToday } from "@/lib/date";
import { dailyTaskCompletionInput } from "@/lib/validation/daily-task";

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) ? id : null;
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/daily-tasks/[id]">
) {
  const { id: idParam } = await ctx.params;
  const id = parseId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = dailyTaskCompletionInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const { date: today } = resolveToday();
    // Only today's open plan is editable; the check and the write are one statement.
    const { count } = await prisma.dailyTask.updateMany({
      where: { id, dailyPlan: { date: today, closed: false } },
      data: {
        completed: parsed.data.completed,
        completedAt: parsed.data.completed ? new Date() : null,
      },
    });

    const task = await prisma.dailyTask.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 }
      );
    }
    if (count === 0) {
      return NextResponse.json(
        { error: "Este día ya está cerrado y no se puede editar." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      id: task.id,
      completed: task.completed,
      completedAt: task.completedAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar la tarea" },
      { status: 500 }
    );
  }
}
