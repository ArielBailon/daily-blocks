import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateKey, resolveToday } from "@/lib/date";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/days/[date]/blocks">
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

  try {
    // Only open plans can be cleared; the check and the delete are one statement.
    const { count } = await prisma.block.deleteMany({
      where: { dailyPlan: { date, closed: false } },
    });
    if (count === 0) {
      const plan = await prisma.dailyPlan.findUnique({ where: { date } });
      if (plan?.closed) {
        return NextResponse.json(
          { error: "Este día ya está cerrado y no se puede editar." },
          { status: 409 }
        );
      }
    }
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Error al vaciar el día" },
      { status: 500 }
    );
  }
}
