import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodayPlanForEdit } from "@/lib/daily-plan";
import { dailyTaskCreateInput } from "@/lib/validation/daily-task";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = dailyTaskCreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const plan = await getOrCreateTodayPlanForEdit();
    if (plan.closed) {
      return NextResponse.json(
        { error: "Este día ya está cerrado y no se puede editar." },
        { status: 409 }
      );
    }

    const { _max } = await prisma.dailyTask.aggregate({
      where: { dailyPlanId: plan.id },
      _max: { order: true },
    });
    const task = await prisma.dailyTask.create({
      data: {
        dailyPlanId: plan.id,
        title: parsed.data.title,
        suggestedTime: parsed.data.suggestedTime ?? null,
        completed: false,
        order: (_max.order ?? -1) + 1,
      },
    });

    return NextResponse.json(
      {
        id: task.id,
        title: task.title,
        suggestedTime: task.suggestedTime,
        completed: task.completed,
        order: task.order,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Error al añadir la tarea" },
      { status: 500 }
    );
  }
}
