import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { templateInput } from "@/lib/validation/template";

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) ? id : null;
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/templates/[id]">
) {
  const { id: idParam } = await ctx.params;
  const id = parseId(idParam);
  if (id === null) {
    return NextResponse.json(
      { error: "Plantilla no encontrada" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = templateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.template.update({
        where: { id },
        data: { name: parsed.data.name },
      });
      await tx.templateTask.deleteMany({ where: { templateId: id } });
      if (parsed.data.tasks.length > 0) {
        await tx.templateTask.createMany({
          data: parsed.data.tasks.map((task, index) => ({
            templateId: id,
            title: task.title,
            suggestedTime: task.suggestedTime ?? null,
            order: index,
          })),
        });
      }
    });
    return NextResponse.json({ id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Plantilla no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Error al actualizar la plantilla" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/templates/[id]">
) {
  const { id: idParam } = await ctx.params;
  const id = parseId(idParam);
  if (id === null) {
    return NextResponse.json(
      { error: "Plantilla no encontrada" },
      { status: 404 }
    );
  }

  try {
    await prisma.template.delete({ where: { id } });
    return NextResponse.json({ id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Plantilla no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Error al eliminar la plantilla" },
      { status: 500 }
    );
  }
}
