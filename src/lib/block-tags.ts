// Block tags, in the same order as the BlockTag enum in prisma/schema.prisma.
// Client components import from here instead of the generated Prisma client.

export const BLOCK_TAGS = [
  "DEEP",
  "LINKEDIN",
  "GYM",
  "WALK",
  "PROTEIN",
  "APPLY",
  "INTERVIEW",
  "SCREENS_OFF",
  "BED",
] as const;

export type BlockTag = (typeof BLOCK_TAGS)[number];

export const BLOCK_TAG_LABELS: Record<BlockTag, string> = {
  DEEP: "Deep",
  LINKEDIN: "LinkedIn",
  GYM: "Gym",
  WALK: "Caminata",
  PROTEIN: "Proteína",
  APPLY: "Postular",
  INTERVIEW: "Entrevista",
  SCREENS_OFF: "Pantallas",
  BED: "Cama",
};
