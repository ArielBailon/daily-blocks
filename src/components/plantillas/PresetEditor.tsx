"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BLOCK_TAGS,
  BLOCK_TAG_LABELS,
  type BlockTag,
} from "@/lib/block-tags";
import {
  buildBlockTimes,
  fromMinutes,
  isOnTheHour,
  toMinutes,
} from "@/lib/blocks";
import { DEFAULT_END, DEFAULT_START } from "@/lib/default-blocks";

interface PresetData {
  id: number;
  name: string;
  isDefault: boolean;
  blocks: { startTime: string; activity: string; tag: BlockTag | null }[];
}

type Row = { activity: string; tag: BlockTag | null };

const FIELD_CLASS =
  "rounded-lg border border-muted bg-surface px-3 py-2 outline-none focus:border-accent";
const BUTTON_CLASS =
  "rounded-lg border border-muted px-4 py-2 text-sm transition-colors enabled:hover:border-accent disabled:opacity-50";
const OPTION_CLASS = "bg-surface text-left text-sm text-foreground";

// Rows shown: the usual day range, widened to cover any block outside it.
function rowTimes(blocks: PresetData["blocks"]) {
  const minutes = blocks.map((b) => toMinutes(b.startTime));
  const start = Math.min(toMinutes(DEFAULT_START), ...minutes);
  const end = Math.max(toMinutes(DEFAULT_END), ...minutes);
  return buildBlockTimes(fromMinutes(start), fromMinutes(end));
}

export function PresetEditor({
  presets,
  selected,
}: {
  presets: PresetData[];
  selected: PresetData | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(selected?.name ?? "");
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      (selected?.blocks ?? []).map((b) => [
        b.startTime,
        { activity: b.activity, tag: b.tag },
      ])
    )
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null
  );

  async function call(
    url: string,
    method: string,
    body?: unknown
  ): Promise<{ ok: boolean; data: { error?: string; id?: number } | null }> {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ text: data?.error ?? "Error inesperado", ok: false });
      }
      return { ok: res.ok, data };
    } catch {
      setMessage({ text: "Error de conexión", ok: false });
      return { ok: false, data: null };
    } finally {
      setBusy(false);
    }
  }

  function guardDiscard() {
    return (
      !dirty || window.confirm("Hay cambios sin guardar. ¿Descartarlos?")
    );
  }

  function handleSelect(id: string) {
    if (!guardDiscard()) return;
    router.push(`/plantillas?id=${id}`);
  }

  function setRow(time: string, patch: Partial<Row>) {
    setRows((prev) => ({
      ...prev,
      [time]: { ...(prev[time] ?? { activity: "", tag: null }), ...patch },
    }));
    setDirty(true);
    setMessage(null);
  }

  async function handleSave() {
    if (!selected) return;
    const blocks = Object.entries(rows)
      .filter(([, r]) => r.activity.trim() !== "" || r.tag !== null)
      .map(([startTime, r]) => ({
        startTime,
        activity: r.activity.trim(),
        tag: r.tag,
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const { ok } = await call(`/api/presets/${selected.id}`, "PATCH", {
      name,
      blocks,
    });
    if (ok) {
      setDirty(false);
      setMessage({ text: "Guardada", ok: true });
      router.refresh();
    }
  }

  async function handleCreate(copy: boolean) {
    if (!guardDiscard()) return;
    const suggestion = copy && selected ? `${selected.name} (copia)` : "";
    const input = window.prompt("Nombre de la nueva plantilla", suggestion);
    if (input === null) return;
    const { ok, data } = await call("/api/presets", "POST", {
      name: input,
      ...(copy && selected ? { copyFromId: selected.id } : {}),
    });
    if (ok && data?.id) {
      setDirty(false);
      router.push(`/plantillas?id=${data.id}`);
    }
  }

  async function handleMakeDefault() {
    if (!selected || !guardDiscard()) return;
    const { ok } = await call(`/api/presets/${selected.id}`, "PATCH", {
      isDefault: true,
    });
    if (ok) {
      setDirty(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`¿Eliminar la plantilla "${selected.name}"?`)) return;
    const { ok } = await call(`/api/presets/${selected.id}`, "DELETE");
    if (ok) {
      setDirty(false);
      router.push("/plantillas");
      router.refresh();
    }
  }

  if (!selected) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-foreground/60">No hay plantillas todavía.</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleCreate(false)}
          className={BUTTON_CLASS}
        >
          Nueva plantilla
        </button>
        {message && <Message {...message} />}
      </div>
    );
  }

  const times = rowTimes(selected.blocks);
  // Rows added while editing can't leave the shown range, so `times` is stable.

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="preset-select"
            className="text-xs uppercase tracking-wide text-foreground/60"
          >
            Plantilla
          </label>
          <select
            id="preset-select"
            value={selected.id}
            onChange={(e) => handleSelect(e.target.value)}
            className={FIELD_CLASS}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isDefault ? " (predeterminada)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="preset-name"
            className="text-xs uppercase tracking-wide text-foreground/60"
          >
            Nombre
          </label>
          <input
            id="preset-name"
            type="text"
            maxLength={50}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
              setMessage(null);
            }}
            className={FIELD_CLASS}
          />
        </div>
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={handleSave}
          className="rounded-lg bg-accent px-5 py-2 text-accent-foreground transition-colors enabled:hover:bg-accent/85 disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleCreate(false)}
          className={BUTTON_CLASS}
        >
          Nueva vacía
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleCreate(true)}
          className={BUTTON_CLASS}
        >
          Duplicar
        </button>
        <button
          type="button"
          disabled={busy || selected.isDefault}
          onClick={handleMakeDefault}
          className={BUTTON_CLASS}
        >
          {selected.isDefault ? "Es la predeterminada" : "Hacer predeterminada"}
        </button>
        <button
          type="button"
          disabled={busy || selected.isDefault}
          onClick={handleDelete}
          className={BUTTON_CLASS}
        >
          Eliminar
        </button>
      </div>

      {message && <Message {...message} />}

      <div className="overflow-hidden rounded-xl border border-muted bg-surface">
        <ol>
          {times.map((time) => {
            const row = rows[time] ?? { activity: "", tag: null };
            return (
              <li
                key={time}
                className={`flex border-b border-muted last:border-b-0 focus-within:ring-1 focus-within:ring-inset focus-within:ring-accent/40 ${
                  isOnTheHour(time) ? "bg-foreground/[0.025]" : ""
                }`}
              >
                <div className="flex w-20 shrink-0 flex-col items-end justify-center border-r border-muted px-3 py-2">
                  <span
                    className={`text-sm tabular-nums ${
                      isOnTheHour(time)
                        ? "font-semibold text-foreground"
                        : "text-foreground/60"
                    }`}
                  >
                    {time}
                  </span>
                  <select
                    value={row.tag ?? ""}
                    aria-label={`Etiqueta ${time}`}
                    onChange={(e) =>
                      setRow(time, {
                        tag: e.target.value === "" ? null : (e.target.value as BlockTag),
                      })
                    }
                    className={`w-full cursor-pointer appearance-none truncate bg-transparent text-right text-xs [text-align-last:right] outline-none ${
                      row.tag ? "text-accent" : "text-foreground/40"
                    }`}
                  >
                    <option value="" className={OPTION_CLASS}>
                      —
                    </option>
                    {BLOCK_TAGS.map((t) => (
                      <option key={t} value={t} className={OPTION_CLASS}>
                        {BLOCK_TAG_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  maxLength={200}
                  value={row.activity}
                  aria-label={`Actividad ${time}`}
                  onChange={(e) => setRow(time, { activity: e.target.value })}
                  className="min-h-12 min-w-0 flex-1 bg-transparent px-3 py-3 outline-none"
                />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Message({ text, ok }: { text: string; ok: boolean }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`text-sm ${ok ? "text-foreground/60" : "text-accent"}`}
    >
      {text}
    </p>
  );
}
