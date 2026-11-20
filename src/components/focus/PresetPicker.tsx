"use client";

import { useEffect, useRef, useState } from "react";
import { BLOCK_MINUTES, fromMinutes, toMinutes } from "@/lib/blocks";
import { blocksCovered, FIXED_PRESETS, type FixedPresetKey } from "@/lib/focus/config";
import { parseStoredCustom, validateCustom } from "@/lib/focus/custom";
import { suggestPreset } from "@/lib/focus/suggest";
import type { StartRequest } from "@/lib/focus/types";
import { useFocus } from "./FocusProvider";

type Choice = FixedPresetKey | "CUSTOM";

const STORAGE_KEY = "daily-blocks:focus-custom";
const FIXED_KEYS = Object.keys(FIXED_PRESETS) as FixedPresetKey[];
const INPUT_CLASS =
  "w-24 rounded-lg border border-muted bg-background px-3 py-2 tabular-nums outline-none focus:border-accent aria-invalid:border-accent";

function readStoredCustom() {
  try {
    return parseStoredCustom(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeCustom(workMinutes: number, breakMinutes: number) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ workMinutes, breakMinutes })
    );
  } catch {
    // Remembering the values is only a convenience.
  }
}

export function PresetPicker({
  blockId,
  onClose,
}: {
  blockId: number;
  onClose: () => void;
}) {
  const { blocks, busy, start } = useFocus();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const index = Math.max(
    0,
    blocks.findIndex((b) => b.id === blockId)
  );

  const [choice, setChoice] = useState<Choice>(() => suggestPreset(blocks, index));
  const [suggested] = useState(choice);
  const [stored] = useState(readStoredCustom);
  const [work, setWork] = useState(stored?.work ?? "25");
  const [rest, setRest] = useState(stored?.rest ?? "5");
  const [error, setError] = useState<{
    field: "work" | "break" | "form";
    message: string;
  } | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const custom = validateCustom(work, rest);
  const requested =
    choice === "CUSTOM"
      ? custom.ok
        ? blocksCovered(custom.workMinutes, custom.breakMinutes)
        : null
      : blocksCovered(
          FIXED_PRESETS[choice].workMinutes,
          FIXED_PRESETS[choice].breakMinutes
        );
  const available = blocks.length - index;
  const covered = requested === null ? null : Math.min(requested, available);
  const lastCovered = covered ? blocks[index + covered - 1] : null;
  const rangeEnd = lastCovered
    ? fromMinutes(toMinutes(lastCovered.startTime) + BLOCK_MINUTES)
    : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    let request: StartRequest;
    if (choice === "CUSTOM") {
      if (!custom.ok) {
        setError({ field: custom.field, message: custom.message });
        return;
      }
      request = {
        blockId,
        preset: "CUSTOM",
        workMinutes: custom.workMinutes,
        breakMinutes: custom.breakMinutes,
      };
    } else {
      request = { blockId, preset: choice };
    }
    setError(null);
    const result = await start(request);
    if (!result.ok) {
      setError({ field: "form", message: result.error });
      return;
    }
    if (request.preset === "CUSTOM") {
      storeCustom(request.workMinutes, request.breakMinutes);
    }
    dialogRef.current?.close();
  }

  const fieldError = (field: "work" | "break") =>
    error?.field === field ? error.message : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={`focus-title-${blockId}`}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-muted bg-surface p-5 text-foreground backdrop:bg-black/60"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 id={`focus-title-${blockId}`} className="text-xl">
          Iniciar foco en {blocks[index]?.startTime}
        </h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs uppercase tracking-wide text-foreground/60">
            Preset
          </legend>
          {FIXED_KEYS.map((key) => (
            <label key={key} className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name={`focus-preset-${blockId}`}
                checked={choice === key}
                onChange={() => setChoice(key)}
                className="h-4 w-4 accent-accent"
              />
              <span>
                {FIXED_PRESETS[key].label}{" "}
                <span className="text-foreground/60 tabular-nums">
                  {FIXED_PRESETS[key].workMinutes}/{FIXED_PRESETS[key].breakMinutes} min
                </span>
                {key === suggested && (
                  <span className="ml-2 text-xs text-accent">sugerido</span>
                )}
              </span>
            </label>
          ))}
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name={`focus-preset-${blockId}`}
              checked={choice === "CUSTOM"}
              onChange={() => setChoice("CUSTOM")}
              className="h-4 w-4 accent-accent"
            />
            <span>Personalizado</span>
          </label>
        </fieldset>

        {choice === "CUSTOM" && (
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`focus-work-${blockId}`}
                className="text-xs uppercase tracking-wide text-foreground/60"
              >
                Trabajo (min)
              </label>
              <input
                id={`focus-work-${blockId}`}
                type="number"
                inputMode="numeric"
                value={work}
                onChange={(e) => setWork(e.target.value)}
                aria-invalid={fieldError("work") !== null}
                aria-describedby={`focus-error-${blockId}`}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`focus-break-${blockId}`}
                className="text-xs uppercase tracking-wide text-foreground/60"
              >
                Descanso (min)
              </label>
              <input
                id={`focus-break-${blockId}`}
                type="number"
                inputMode="numeric"
                value={rest}
                onChange={(e) => setRest(e.target.value)}
                aria-invalid={fieldError("break") !== null}
                aria-describedby={`focus-error-${blockId}`}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        )}

        <div className="text-sm text-foreground/70" aria-live="polite">
          {covered !== null && requested !== null ? (
            <>
              <p>
                Cubre {covered} {covered === 1 ? "bloque" : "bloques"}
                {rangeEnd && ` (${blocks[index].startTime} - ${rangeEnd})`}.
              </p>
              {covered < requested && (
                <p className="text-accent">
                  Solo caben {covered} de {requested} bloques.
                </p>
              )}
            </>
          ) : (
            <p>Completa los minutos para ver los bloques que cubre.</p>
          )}
        </div>

        <p
          id={`focus-error-${blockId}`}
          role="alert"
          className="min-h-5 text-sm text-accent"
        >
          {error?.message}
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 rounded-lg border border-muted px-4 text-sm transition-colors hover:border-accent"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-lg bg-accent px-5 text-sm text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
          >
            {busy ? "Iniciando…" : "Iniciar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
