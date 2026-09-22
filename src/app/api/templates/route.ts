import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { templateInput } from "@/lib/validation/template";

export async function POST(request: Request) {
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
    const weekdays = [...new Set(parsed.data.recurrence)];
    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.template.create({
        data: {
          name: parsed.data.name,
          isDefault: parsed.data.isDefault,
          tasks: {
            create: parsed.data.tasks.map((task, index) => ({
              title: task.title,
              suggestedTime: task.suggestedTime ?? null,
              order: index,
            })),
          },
        },
      });
      if (parsed.data.isDefault) {
        await tx.template.updateMany({
          where: { isDefault: true, NOT: { id: created.id } },
          data: { isDefault: false },
        });
      }
      for (const weekday of weekdays) {
        await tx.templateRecurrence.upsert({
          where: { weekday },
          update: { templateId: created.id },
          create: { weekday, templateId: created.id },
        });
      }
      return created;
    });
    return NextResponse.json({ id: template.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Error al crear la plantilla" },
      { status: 500 }
    );
  }
}
