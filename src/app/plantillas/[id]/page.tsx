import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TemplateForm } from "@/components/plantillas/TemplateForm";

export const dynamic = "force-dynamic";

export default async function EditarPlantillaPage(
  props: PageProps<"/plantillas/[id]">
) {
  const { id: idParam } = await props.params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    notFound();
  }

  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { order: "asc" } },
      recurrences: true,
    },
  });
  if (!template) {
    notFound();
  }

  return (
    <TemplateForm
      mode="edit"
      templateId={template.id}
      initialName={template.name}
      initialTasks={template.tasks.map((task) => ({
        title: task.title,
        suggestedTime: task.suggestedTime ?? "",
      }))}
      initialWeekdays={template.recurrences.map((r) => r.weekday)}
    />
  );
}
