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
    const template = await prisma.template.create({
      data: {
        name: parsed.data.name,
        tasks: {
          create: parsed.data.tasks.map((task, index) => ({
            title: task.title,
            suggestedTime: task.suggestedTime ?? null,
            order: index,
          })),
        },
      },
    });
    return NextResponse.json({ id: template.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Error al crear la plantilla" },
      { status: 500 }
    );
  }
}
