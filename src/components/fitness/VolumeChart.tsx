import { MUSCLE_GROUPS } from "@/lib/fitness/seed-data";
import type { MuscleVolume } from "@/lib/fitness/volume";

const VIEW_HEIGHT = 14;

const fmt = (n: number) => String(Number(n.toFixed(1)));

export function VolumeChart({
  done,
  planned,
}: {
  done: MuscleVolume;
  planned: MuscleVolume;
}) {
  const max =
    Math.ceil(
      Math.max(
        ...MUSCLE_GROUPS.flatMap((m) => [m.mavHigh, planned[m.key], done[m.key]])
      )
    ) + 1;
  const pct = (value: number) => (value / max) * 100;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {MUSCLE_GROUPS.map((m) => (
          <li
            key={m.key}
            className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2"
          >
            <span className="text-sm leading-tight">{m.label}</span>
            <svg
              viewBox={`0 0 100 ${VIEW_HEIGHT}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`${m.label}: ${fmt(done[m.key])} series hechas de ${fmt(planned[m.key])} planificadas. Rango MAV ${m.mavLow} a ${m.mavHigh}${m.mev > 0 ? `, MEV ${m.mev}` : ""}.`}
              className="h-5 w-full"
            >
              <rect
                x={pct(m.mavLow)}
                width={pct(m.mavHigh - m.mavLow)}
                height={VIEW_HEIGHT}
                className="fill-foreground/10"
              />
              <rect
                x="0.4"
                y="1"
                width={Math.max(pct(planned[m.key]) - 0.8, 0)}
                height={VIEW_HEIGHT - 2}
                className="fill-none stroke-accent/70"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <rect
                y="3.5"
                width={pct(done[m.key])}
                height={VIEW_HEIGHT - 7}
                className="fill-accent"
              />
              {m.mev > 0 && (
                <line
                  x1={pct(m.mev)}
                  x2={pct(m.mev)}
                  y1="0"
                  y2={VIEW_HEIGHT}
                  className="stroke-foreground"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            <span className="text-right text-sm tabular-nums">
              <span className="font-semibold">{fmt(done[m.key])}</span>
              <span className="text-foreground/60">/{fmt(planned[m.key])}</span>
            </span>
          </li>
        ))}
      </ul>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">
        <LegendItem label="Hechas">
          <rect y="3" width="16" height="6" className="fill-accent" />
        </LegendItem>
        <LegendItem label="Plan de la rutina">
          <rect
            x="0.5"
            y="0.5"
            width="15"
            height="11"
            className="fill-none stroke-accent/70"
          />
        </LegendItem>
        <LegendItem label="Rango MAV">
          <rect width="16" height="12" className="fill-foreground/10" />
        </LegendItem>
        <LegendItem label="MEV (mínimo)">
          <line x1="8" x2="8" y1="0" y2="12" className="stroke-foreground" strokeWidth="1.5" />
        </LegendItem>
      </ul>

      <p className="text-sm text-foreground/60">
        Series completadas por músculo en la semana: las directas cuentan 1 y
        las indirectas 0.5. Intenta quedar dentro de la banda MAV y por encima
        de la línea MEV.
      </p>
    </div>
  );
}

function LegendItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <svg viewBox="0 0 16 12" className="h-3 w-4" aria-hidden="true">
        {children}
      </svg>
      {label}
    </li>
  );
}
