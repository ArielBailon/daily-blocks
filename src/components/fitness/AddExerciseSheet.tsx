"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeSearch } from "@/lib/fitness/draft";
import { MUSCLE_GROUPS, type MuscleKey } from "@/lib/fitness/seed-data";

export type CatalogExercise = {
  id: number;
  name: string;
  primaryMuscle: MuscleKey | null;
};

export function AddExerciseSheet({
  open,
  catalog,
  busy,
  onPick,
  onClose,
}: {
  open: boolean;
  catalog: CatalogExercise[];
  busy: boolean;
  onPick: (exerciseId: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setQuery("");
      el.showModal();
    }
    if (!open && el.open) el.close();
  }, [open]);

  const groups = useMemo(() => {
    const needle = normalizeSearch(query);
    const matches = catalog.filter((e) =>
      normalizeSearch(e.name).includes(needle)
    );
    return MUSCLE_GROUPS.map((m) => ({
      key: m.key,
      label: m.label,
      items: matches
        .filter((e) => e.primaryMuscle === m.key)
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    })).filter((g) => g.items.length > 0);
  }, [catalog, query]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      aria-label="Añadir ejercicio"
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-hidden rounded-t-2xl border border-muted bg-surface p-0 text-foreground backdrop:bg-black/60 lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-96 lg:rounded-none lg:rounded-l-2xl"
    >
      <div className="flex max-h-[85dvh] flex-col lg:h-dvh lg:max-h-none">
        <div className="flex items-center gap-2 border-b border-muted p-4">
          <input
            type="search"
            autoComplete="off"
            placeholder="Buscar ejercicio"
            aria-label="Buscar ejercicio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-lg border border-muted bg-background px-3 outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-muted px-4 text-sm transition-colors hover:border-accent"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {groups.length === 0 ? (
            <p className="text-foreground/60">Ningún ejercicio coincide.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                  <section key={group.key}>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                      {group.label}
                    </h3>
                    <ul>
                      {group.items.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onPick(e.id)}
                            className="min-h-11 w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-foreground/5 disabled:opacity-50"
                          >
                            {e.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
