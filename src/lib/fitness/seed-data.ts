// Fitness catalog and routine. Pure data, no imports: prisma/seed.ts upserts it
// and the weekly-volume logic reads the planned sets from ROUTINE.

export type MuscleKey =
  | "pecho"
  | "espalda"
  | "deltLat"
  | "deltPost"
  | "deltFront"
  | "biceps"
  | "triceps"
  | "cuads"
  | "isquios"
  | "gluteo"
  | "aductores"
  | "pantorrilla"
  | "abdomen"
  | "trapecio"
  | "antebrazo";

export type MuscleMap = Partial<Record<MuscleKey, 1 | 0.5>>;

export const MUSCLE_GROUPS: {
  key: MuscleKey;
  label: string;
  mev: number;
  mavLow: number;
  mavHigh: number;
}[] = [
  { key: "pecho", label: "Pecho", mev: 8, mavLow: 12, mavHigh: 20 },
  { key: "espalda", label: "Espalda", mev: 10, mavLow: 14, mavHigh: 22 },
  { key: "deltLat", label: "Deltoide lateral", mev: 8, mavLow: 16, mavHigh: 22 },
  { key: "deltPost", label: "Deltoide posterior", mev: 6, mavLow: 10, mavHigh: 16 },
  { key: "deltFront", label: "Deltoide frontal", mev: 0, mavLow: 6, mavHigh: 8 },
  { key: "biceps", label: "Bíceps", mev: 8, mavLow: 14, mavHigh: 20 },
  { key: "triceps", label: "Tríceps", mev: 6, mavLow: 10, mavHigh: 14 },
  { key: "cuads", label: "Cuádriceps", mev: 8, mavLow: 12, mavHigh: 18 },
  { key: "isquios", label: "Isquios", mev: 6, mavLow: 10, mavHigh: 16 },
  { key: "gluteo", label: "Glúteo", mev: 0, mavLow: 4, mavHigh: 12 },
  { key: "aductores", label: "Aductores", mev: 0, mavLow: 4, mavHigh: 10 },
  { key: "pantorrilla", label: "Pantorrilla", mev: 8, mavLow: 12, mavHigh: 16 },
  { key: "abdomen", label: "Abdomen", mev: 0, mavLow: 16, mavHigh: 20 },
  { key: "trapecio", label: "Trapecio", mev: 0, mavLow: 12, mavHigh: 20 },
  { key: "antebrazo", label: "Antebrazo", mev: 0, mavLow: 4, mavHigh: 8 },
];

export type ExerciseSeed = {
  slug: string;
  name: string;
  muscles: MuscleMap;
  isElbowFriendly?: boolean;
};

// Routine exercises first, then the alternatives offered only in "Añadir ejercicio".
export const EXERCISES: ExerciseSeed[] = [
  { slug: "press-inclinado-barra", name: "Press inclinado con barra", muscles: { pecho: 1, deltFront: 0.5, triceps: 0.5 } },
  { slug: "press-plano-mancuernas", name: "Press plano con mancuernas", muscles: { pecho: 1, deltFront: 0.5, triceps: 0.5 } },
  { slug: "aperturas-maquina", name: "Aperturas en máquina", muscles: { pecho: 1 } },
  { slug: "press-hombro-maquina", name: "Press de hombro en máquina", muscles: { deltFront: 1, deltLat: 0.5, triceps: 0.5 } },
  { slug: "elevaciones-laterales-maquina", name: "Elevaciones laterales en máquina", muscles: { deltLat: 1 } },
  { slug: "antebrazo-polea-alta-neutro", name: "Antebrazo en polea alta, agarre neutro", muscles: { antebrazo: 1 } },
  { slug: "curl-inverso-extension-muneca", name: "Curl inverso / extensión de muñeca", muscles: { antebrazo: 1 } },
  { slug: "jalon-triceps-unilateral-polea", name: "Jalón de tríceps unilateral en polea", muscles: { triceps: 1 } },
  { slug: "extension-triceps-tras-nuca-polea", name: "Extensión de tríceps tras nuca en polea (cuerda)", muscles: { triceps: 1 } },
  { slug: "elevaciones-piernas-l", name: "Elevaciones de piernas en L", muscles: { abdomen: 1 } },
  { slug: "dominadas", name: "Dominadas", muscles: { espalda: 1, biceps: 0.5 } },
  { slug: "jalon-pecho-maquina", name: "Jalón al pecho en máquina", muscles: { espalda: 1, biceps: 0.5 } },
  { slug: "remo-sentado-maquina-neutro", name: "Remo sentado en máquina, agarre neutro", muscles: { espalda: 1, deltPost: 0.5, biceps: 0.5 } },
  { slug: "pullover-polea-de-pie", name: "Pullover en polea de pie", muscles: { espalda: 1 } },
  { slug: "pec-deck-inverso", name: "Pec deck inverso", muscles: { deltPost: 1 } },
  { slug: "curl-bayesiano-polea", name: "Curl bayesiano en polea", muscles: { biceps: 1 } },
  { slug: "curl-martillo-mancuernas", name: "Curl martillo con mancuernas", muscles: { biceps: 1 } },
  { slug: "encogimientos-barra", name: "Encogimientos con barra", muscles: { trapecio: 1 } },
  { slug: "prensa-piernas", name: "Prensa de piernas", muscles: { cuads: 1, gluteo: 0.5 } },
  { slug: "extension-cuadriceps", name: "Extensión de cuádriceps", muscles: { cuads: 1 } },
  { slug: "curl-femoral-sentado", name: "Curl femoral sentado", muscles: { isquios: 1 } },
  { slug: "aduccion-cadera-maquina", name: "Aducción de cadera en máquina", muscles: { aductores: 1 } },
  { slug: "elevacion-talones-de-pie", name: "Elevación de talones de pie", muscles: { pantorrilla: 1 } },
  { slug: "hiperextensiones-banco-45", name: "Hiperextensiones en banco 45°", muscles: { gluteo: 0.5, isquios: 0.5 } },
  { slug: "crunch-polea-arrodillado", name: "Crunch en polea arrodillado", muscles: { abdomen: 1 } },
  { slug: "remo-en-t", name: "Remo en T", muscles: { espalda: 1, deltPost: 0.5, biceps: 0.5 } },
  { slug: "jalon-unilateral-arrodillado-polea", name: "Jalón unilateral arrodillado en polea", muscles: { espalda: 1 } },
  { slug: "face-pull-polea", name: "Face pull en polea", muscles: { deltPost: 1, trapecio: 0.5 } },
  { slug: "peso-muerto-rumano", name: "Peso muerto rumano", muscles: { isquios: 1, gluteo: 0.5 } },
  { slug: "prensa-pies-altos-separados", name: "Prensa con pies altos y separados", muscles: { gluteo: 1, cuads: 0.5 } },
  { slug: "hiperextensiones-45-gluteo", name: "Hiperextensiones 45° con énfasis en glúteo", muscles: { gluteo: 1, isquios: 0.5 } },
  { slug: "abduccion-cadera-maquina", name: "Abducción de cadera en máquina", muscles: { gluteo: 1 } },
  { slug: "elevacion-talones-sentado", name: "Elevación de talones sentado", muscles: { pantorrilla: 1 } },
  // Alternatives
  { slug: "extension-triceps-maquina", name: "Extensión de tríceps en máquina", muscles: { triceps: 1 } },
  { slug: "press-pecho-maquina", name: "Press de pecho en máquina", muscles: { pecho: 1, deltFront: 0.5, triceps: 0.5 } },
  { slug: "elevaciones-laterales-mancuernas", name: "Elevaciones laterales con mancuernas", muscles: { deltLat: 1 } },
  { slug: "elevacion-lateral-polea", name: "Elevación lateral en polea", muscles: { deltLat: 1 } },
  { slug: "remo-mancuerna-una-mano", name: "Remo con mancuerna a una mano", muscles: { espalda: 1, deltPost: 0.5, biceps: 0.5 } },
  { slug: "curl-inclinado-mancuernas", name: "Curl inclinado con mancuernas", muscles: { biceps: 1 } },
  { slug: "sentadilla-hack", name: "Sentadilla hack", muscles: { cuads: 1, gluteo: 0.5 } },
  { slug: "sentadilla-bulgara", name: "Sentadilla búlgara", muscles: { cuads: 1, gluteo: 1 } },
  { slug: "curl-femoral-acostado", name: "Curl femoral acostado", muscles: { isquios: 1 } },
  { slug: "press-pallof", name: "Press Pallof", muscles: { abdomen: 1 } },
];

export type RoutineExerciseSeed = {
  slug: string;
  sets: number;
  reps: string;
  rir: number;
  note?: string;
};

export type RoutineDaySeed = {
  key: "push" | "pull" | "legsA" | "upper" | "legsB";
  label: string;
  subtitle: string;
  // 1 = Monday ... 7 = Sunday
  dayOfWeek: number;
  exercises: RoutineExerciseSeed[];
  warmup: string[];
  cooldown: string[];
};

export const DRILL_9090 =
  "90/90 supino con pies en banco · 3–5 min de respiración diafragmática (inhala 4 s, exhala 6 s, lumbar apoyada)";

export const ROUTINE: RoutineDaySeed[] = [
  {
    key: "push",
    label: "Lun · Push",
    subtitle: "Pecho · hombro · tríceps",
    dayOfWeek: 1,
    exercises: [
      { slug: "press-inclinado-barra", sets: 3, reps: "8", rir: 2 },
      { slug: "press-plano-mancuernas", sets: 3, reps: "8", rir: 2 },
      { slug: "aperturas-maquina", sets: 3, reps: "8", rir: 1 },
      { slug: "press-hombro-maquina", sets: 3, reps: "8", rir: 2 },
      { slug: "elevaciones-laterales-maquina", sets: 4, reps: "12", rir: 1 },
      { slug: "jalon-triceps-unilateral-polea", sets: 3, reps: "10", rir: 2, note: "+ isométrico de 30 s al final de cada serie" },
      { slug: "extension-triceps-tras-nuca-polea", sets: 3, reps: "12–15", rir: 3, note: "Sustituye al rompecráneos. Excéntrica de 3 s, sin rebote abajo. Si molesta el codo, cambia a extensión en máquina." },
      { slug: "elevaciones-piernas-l", sets: 3, reps: "10", rir: 1 },
    ],
    warmup: [
      "5 min bici o elíptica suave",
      "Rotación externa con banda 2×12",
      "Band pull-aparts 2×15",
      "Flexiones escapulares 1×10",
      "Aproximación press inclinado 50 % × 8 y 70 % × 4",
    ],
    cooldown: [
      "Pectoral en marco de puerta 2×30 s/lado",
      "Deltoide anterior en pared 30 s/lado",
      "Tríceps suave tras nuca 30 s, sin dolor en el codo",
      DRILL_9090,
    ],
  },
  {
    key: "pull",
    label: "Mar · Pull",
    subtitle: "Espalda · bíceps · antebrazo",
    dayOfWeek: 2,
    exercises: [
      { slug: "dominadas", sets: 3, reps: "6", rir: 2, note: "Si logras 3×8 limpias, añade lastre" },
      { slug: "jalon-pecho-maquina", sets: 3, reps: "10", rir: 2 },
      { slug: "remo-sentado-maquina-neutro", sets: 3, reps: "10", rir: 2 },
      { slug: "pullover-polea-de-pie", sets: 3, reps: "12", rir: 1 },
      { slug: "pec-deck-inverso", sets: 3, reps: "12–15", rir: 1 },
      { slug: "curl-bayesiano-polea", sets: 3, reps: "10", rir: 1 },
      { slug: "curl-martillo-mancuernas", sets: 3, reps: "10", rir: 1, note: "También trabaja antebrazo" },
      { slug: "antebrazo-polea-alta-neutro", sets: 3, reps: "12–15", rir: 2, note: "Excéntrica de 2–3 s; carga ligera, prioriza la técnica" },
      { slug: "curl-inverso-extension-muneca", sets: 3, reps: "12–15", rir: 2, note: "Braquiorradial y extensores de los dedos. Excéntrica de 2–3 s; carga ligera, prioriza la técnica" },
    ],
    warmup: [
      "5 min remo ergómetro o elíptica",
      "Colgado pasivo 2×20 s",
      "Dislocaciones con banda 1×10",
      "Gato-camello 1×8",
      "Face pull ligero 1×15",
      "Aproximación dominadas 1×3 asistidas",
    ],
    cooldown: [
      "Dorsal colgado o en rack 2×30 s",
      "Bíceps en pared 30 s/lado",
      "Trapecio superior 30 s/lado",
      DRILL_9090,
    ],
  },
  {
    key: "legsA",
    label: "Mié · Legs A",
    subtitle: "Cuádriceps",
    dayOfWeek: 3,
    exercises: [
      { slug: "prensa-piernas", sets: 4, reps: "12", rir: 2 },
      { slug: "extension-cuadriceps", sets: 4, reps: "12", rir: 1 },
      { slug: "curl-femoral-sentado", sets: 3, reps: "12", rir: 1 },
      { slug: "aduccion-cadera-maquina", sets: 3, reps: "10", rir: 1 },
      { slug: "elevacion-talones-de-pie", sets: 6, reps: "12", rir: 1, note: "Pausa de 1 s abajo, en estiramiento" },
      { slug: "elevaciones-laterales-maquina", sets: 4, reps: "12", rir: 1 },
      { slug: "hiperextensiones-banco-45", sets: 3, reps: "8", rir: 2 },
      { slug: "elevaciones-piernas-l", sets: 3, reps: "10", rir: 1 },
      { slug: "crunch-polea-arrodillado", sets: 3, reps: "12", rir: 1 },
    ],
    warmup: [
      "5 min bici estática",
      "Balanceo de pierna frontal y lateral 10/lado",
      "Movilidad 90/90 dinámica 6/lado",
      "Rodilla a la pared 10/lado",
      "Sentadilla goblet ligera 1×10",
      "Aproximación prensa 50 % × 10 y 70 % × 5",
    ],
    cooldown: [
      "Cuádriceps de pie 30 s/lado",
      "Flexor de cadera semiarrodillado 30 s/lado",
      "Aductores en mariposa 45 s",
      "Gemelo en pared 30 s/lado",
      DRILL_9090,
    ],
  },
  {
    key: "upper",
    label: "Vie · Upper",
    subtitle: "Torso completo",
    dayOfWeek: 5,
    exercises: [
      { slug: "press-inclinado-barra", sets: 3, reps: "8–10", rir: 2 },
      { slug: "remo-en-t", sets: 3, reps: "8", rir: 2 },
      { slug: "aperturas-maquina", sets: 3, reps: "10–12", rir: 1 },
      { slug: "jalon-unilateral-arrodillado-polea", sets: 3, reps: "10", rir: 1 },
      { slug: "elevaciones-laterales-maquina", sets: 4, reps: "12–15", rir: 1 },
      { slug: "face-pull-polea", sets: 3, reps: "12–15", rir: 1 },
      { slug: "encogimientos-barra", sets: 3, reps: "10", rir: 1 },
      { slug: "curl-bayesiano-polea", sets: 3, reps: "10", rir: 1, note: "Superserie A1 con el tríceps" },
      { slug: "jalon-triceps-unilateral-polea", sets: 3, reps: "10", rir: 2, note: "Superserie A2 · + isométrico de 30 s" },
    ],
    warmup: [
      "5 min elíptica",
      "Rotación externa con banda 2×12",
      "Band pull-aparts 2×15",
      "Colgado pasivo 1×20 s",
      "Aproximación press inclinado 50 % × 8 y 70 % × 4",
    ],
    cooldown: [
      "Pectoral en marco de puerta 30 s/lado",
      "Dorsal en rack 30 s/lado",
      "Deltoide posterior cruzado 30 s/lado",
      DRILL_9090,
    ],
  },
  {
    key: "legsB",
    label: "Sáb · Legs B",
    subtitle: "Posterior",
    dayOfWeek: 6,
    exercises: [
      { slug: "peso-muerto-rumano", sets: 3, reps: "8", rir: 2, note: "Barra pegada a las piernas; baja hasta que la cadera deja de ir hacia atrás." },
      { slug: "curl-femoral-sentado", sets: 4, reps: "10–12", rir: 1 },
      { slug: "prensa-pies-altos-separados", sets: 4, reps: "10–12", rir: 2 },
      { slug: "hiperextensiones-45-gluteo", sets: 2, reps: "10–12", rir: 1 },
      { slug: "extension-cuadriceps", sets: 3, reps: "12–15", rir: 1 },
      { slug: "abduccion-cadera-maquina", sets: 3, reps: "12", rir: 1 },
      { slug: "elevacion-talones-sentado", sets: 6, reps: "15", rir: 1 },
      { slug: "elevaciones-laterales-maquina", sets: 4, reps: "12", rir: 1 },
      { slug: "crunch-polea-arrodillado", sets: 4, reps: "12", rir: 1 },
      { slug: "elevaciones-piernas-l", sets: 3, reps: "10", rir: 1 },
    ],
    warmup: [
      "5 min caminadora inclinada",
      "Bisagra de cadera con palo 1×10",
      "Puente de glúteo 1×15",
      "Inchworm 1×5",
      "Balanceo de pierna 10/lado",
      "Aproximación RDL barra vacía × 10 y 60 % × 6",
    ],
    cooldown: [
      "Isquios supino con banda 45 s/lado",
      "Glúteo en figura 4 45 s/lado",
      "Flexor de cadera semiarrodillado 30 s/lado",
      "Sóleo en pared, rodilla flexionada, 30 s/lado",
      DRILL_9090,
    ],
  },
];

export const DEFAULT_GOAL = {
  startKg: 80,
  goalLowKg: 69,
  goalHighKg: 70,
  targetRateKgPerWeek: 0.5,
  phase: "CUT" as const,
};
