import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDateKey, resolveToday } from "@/lib/date";
import { blockUpdateInput } from "@/lib/validation/day";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/days/[date]/blocks/[id]">
) {
  const { date: dateParam, id: idParam } = await ctx.params;
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

  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "Bloque no encontrado" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = blockUpdateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { activity, completed, tag } = parsed.data;
  if (completed !== undefined && date.getTime() > today.getTime()) {
    return NextResponse.json(
      { error: "Solo se pueden marcar bloques de hoy" },
      { status: 400 }
    );
  }
  // Typed against Prisma's input so the tag list can't drift from the enum.
  const data: Prisma.BlockUpdateManyMutationInput = {
    ...(activity !== undefined && { activity }),
    ...(completed !== undefined && { completed }),
    ...(tag !== undefined && { tag }),
  };

  try {
    // Only open plans for this date are editable; the check and the write are one statement.
    const { count } = await prisma.block.updateMany({
      where: { id, dailyPlan: { date, closed: false } },
      data,
    });

    const block = await prisma.block.findFirst({
      where: { id, dailyPlan: { date } },
    });
    if (!block) {
      return NextResponse.json(
        { error: "Bloque no encontrado" },
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
      id: block.id,
      startTime: block.startTime,
      activity: block.activity,
      completed: block.completed,
      tag: block.tag,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al guardar el bloque" },
      { status: 500 }
    );
  }
}
