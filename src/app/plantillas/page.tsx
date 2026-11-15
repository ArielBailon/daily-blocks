import { listPresets } from "@/lib/presets";
import { PresetEditor } from "@/components/plantillas/PresetEditor";

export const dynamic = "force-dynamic";

export default async function PlantillasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  const presets = await listPresets();
  const selected =
    presets.find((p) => String(p.id) === id) ??
    presets.find((p) => p.isDefault) ??
    presets[0];

  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <h1 className="text-3xl font-bold">Plantillas</h1>
        <p className="text-sm text-foreground/60">
          &ldquo;Generar día&rdquo; carga en los bloques vacíos la plantilla que
          elijas; la predeterminada viene preseleccionada.
        </p>
        <PresetEditor
          key={selected?.id ?? "none"}
          presets={presets}
          selected={selected ?? null}
        />
      </div>
    </main>
  );
}
