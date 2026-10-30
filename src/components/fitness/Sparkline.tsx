const WIDTH = 100;
const HEIGHT = 32;
const PAD = 3;

export function Sparkline({
  values,
  label,
  className = "text-accent",
}: {
  values: number[];
  label: string;
  className?: string;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (WIDTH - PAD * 2);
    const y = HEIGHT - PAD - ((v - min) / range) * (HEIGHT - PAD * 2);
    return [x, y] as const;
  });

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={`h-12 w-full ${className}`}
    >
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
