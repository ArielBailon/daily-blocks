import type { DayStatus } from "@/lib/arc/summary";

export const STATUS_LABELS: Record<DayStatus, string> = {
  green: "verde",
  yellow: "amarillo",
  red: "rojo",
  gray: "pendiente",
};

// Solid fills carry dark text; gray days are outlined only.
export const STATUS_CLASSES: Record<DayStatus, string> = {
  green: "bg-status-green text-accent-foreground",
  yellow: "bg-status-yellow text-accent-foreground",
  red: "bg-status-red text-accent-foreground",
  gray: "border border-muted text-foreground/60",
};
