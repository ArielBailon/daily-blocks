// Block tags, in the same order as the BlockTag enum in prisma/schema.prisma.
// Client components import from here instead of the generated Prisma client.

export const BLOCK_TAGS = [
  "DEEP",
  "GYM",
  "WALK",
  "PROTEIN",
  "JOB_HUNTING",
  "SCREENS_OFF",
] as const;

export type BlockTag = (typeof BLOCK_TAGS)[number];

export const BLOCK_TAG_LABELS: Record<BlockTag, string> = {
  DEEP: "Deep",
  GYM: "Gym",
  WALK: "Caminata",
  PROTEIN: "Proteína",
  JOB_HUNTING: "Job Hunting",
  SCREENS_OFF: "Pantallas",
};
