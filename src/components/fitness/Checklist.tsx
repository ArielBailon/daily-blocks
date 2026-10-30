"use client";

export function Checklist({
  title,
  items,
  checked,
  onChange,
}: {
  title: string;
  items: string[];
  checked: number[];
  onChange: (next: number[]) => void;
}) {
  if (items.length === 0) return null;

  function toggle(index: number) {
    onChange(
      checked.includes(index)
        ? checked.filter((i) => i !== index)
        : [...checked, index].sort((a, b) => a - b)
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-muted bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          {title}
        </h2>
        <span className="text-sm tabular-nums text-foreground/60">
          {checked.length}/{items.length}
        </span>
      </div>
      <ul className="flex flex-col">
        {items.map((text, i) => {
          const done = checked.includes(i);
          return (
            <li key={i}>
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                onClick={() => toggle(i)}
                className="flex min-h-11 w-full items-center gap-3 py-1 text-left"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                    done
                      ? "border-status-green bg-status-green text-accent-foreground"
                      : "border-muted"
                  }`}
                >
                  {done && "✓"}
                </span>
                <span className={done ? "text-foreground/50 line-through" : ""}>
                  {text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
