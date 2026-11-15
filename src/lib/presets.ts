import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  presetToRoutine,
  type PresetBlock,
  type Routine,
} from "@/lib/default-blocks";
import { presetBlocks } from "@/lib/validation/preset";

export interface Preset {
  id: number;
  name: string;
  isDefault: boolean;
  blocks: PresetBlock[];
}

// Rows are written only through validated input; parsing again keeps a bad
// manual edit in the database from crashing the app.
function toPreset(row: {
  id: number;
  name: string;
  isDefault: boolean;
  blocks: Prisma.JsonValue;
}): Preset {
  const parsed = presetBlocks.safeParse(row.blocks);
  return {
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    blocks: parsed.success
      ? [...parsed.data].sort((a, b) => a.startTime.localeCompare(b.startTime))
      : [],
  };
}

export async function listPresets(): Promise<Preset[]> {
  const rows = await prisma.routinePreset.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return rows.map(toPreset);
}

// The routine of preset `id`, or of the default preset when `id` is omitted.
// Null when `id` does not exist; empty when no preset is marked default.
export async function getPresetRoutine(id?: number): Promise<Routine | null> {
  const row = await prisma.routinePreset.findFirst({
    where: id === undefined ? { isDefault: true } : { id },
  });
  if (row) return presetToRoutine(toPreset(row).blocks);
  return id === undefined ? presetToRoutine([]) : null;
}

export type PresetResult =
  | { kind: "ok"; preset: Preset }
  | { kind: "not-found" }
  | { kind: "name-taken" }
  | { kind: "is-default" };

function isNameTaken(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createPreset(input: {
  name: string;
  copyFromId?: number;
}): Promise<PresetResult> {
  try {
    const source =
      input.copyFromId === undefined
        ? null
        : await prisma.routinePreset.findUnique({
            where: { id: input.copyFromId },
          });
    if (input.copyFromId !== undefined && !source) return { kind: "not-found" };
    const row = await prisma.routinePreset.create({
      data: {
        name: input.name,
        blocks: source ? toPreset(source).blocks : [],
        isDefault: (await prisma.routinePreset.count()) === 0,
      },
    });
    return { kind: "ok", preset: toPreset(row) };
  } catch (error) {
    if (isNameTaken(error)) return { kind: "name-taken" };
    throw error;
  }
}

export async function updatePreset(
  id: number,
  input: { name?: string; blocks?: PresetBlock[]; isDefault?: true }
): Promise<PresetResult> {
  try {
    return await prisma.$transaction(async (tx): Promise<PresetResult> => {
      if (!(await tx.routinePreset.findUnique({ where: { id } }))) {
        return { kind: "not-found" };
      }
      if (input.isDefault) {
        await tx.routinePreset.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      const row = await tx.routinePreset.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.blocks !== undefined && { blocks: input.blocks }),
          ...(input.isDefault && { isDefault: true }),
        },
      });
      return { kind: "ok", preset: toPreset(row) };
    });
  } catch (error) {
    if (isNameTaken(error)) return { kind: "name-taken" };
    throw error;
  }
}

// The default preset can't be deleted: pick another default first.
export async function deletePreset(id: number): Promise<PresetResult> {
  const row = await prisma.routinePreset.findUnique({ where: { id } });
  if (!row) return { kind: "not-found" };
  if (row.isDefault) return { kind: "is-default" };
  await prisma.routinePreset.delete({ where: { id } });
  return { kind: "ok", preset: toPreset(row) };
}
