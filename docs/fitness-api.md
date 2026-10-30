# API de lectura de Fitness

API de solo lectura con el historial de entrenamiento y peso, pensada para
consultar el progreso desde otra herramienta (por ejemplo, un agente que
analice los datos).

- Prefijo: `/api/v1/fitness`
- Solo `GET`. Cualquier otro método responde `405`.
- Sin autenticación (la app es personal). No se envían cabeceras CORS, así que
  los navegadores de otros orígenes no pueden leerla; se consume desde un
  servidor o un cliente HTTP.
- Respuestas en JSON. Errores: `{ "error": "mensaje en español" }` con `400`
  (parámetros inválidos), `404` (ejercicio inexistente) o `500`.

## Convenciones

- **Fechas de calendario** (`date`, `from`, `to`, `week`): `YYYY-MM-DD` en la
  zona America/Guayaquil. No dependen de UTC.
- **Marcas de tiempo** (`startedAt`, `finishedAt`): ISO 8601 en UTC.
- **Pesos**: kg, como número. `weightKg: 0` en una serie significa peso corporal.
- **Semana**: lunes a domingo.
- **e1RM**: estimación de 1RM con Epley, `peso × (1 + reps / 30)`.
- **Valores sin datos**: se devuelven como `null` (por ejemplo, sin registros de
  peso no se inventa un valor).
- **Series**: solo se incluyen series completadas, de sesiones terminadas
  (`COMPLETED`), salvo en `volume`, que también cuenta la sesión en curso.

## Resumen

`GET /api/v1/fitness/summary`

Estado actual del peso y del entrenamiento. Sin parámetros.

```bash
curl https://<tu-dominio>/api/v1/fitness/summary
```

```json
{
  "asOf": "2026-10-30",
  "bodyWeight": { "currentKg": 76.1, "lastEntryDate": "2026-10-30" },
  "goal": {
    "startKg": 80,
    "goalLowKg": 69,
    "goalHighKg": 70,
    "targetRateKgPerWeek": 0.5,
    "phase": "CUT",
    "startedOn": "2026-10-30"
  },
  "remainingKg": 6.1,
  "pace": { "last2WeeksKgPerWeek": -0.5, "last4WeeksKgPerWeek": -0.48 },
  "projection": {
    "atTargetRate": { "weeks": 14, "arrivalDate": "2027-01-31" },
    "atCurrentPace": { "weeks": 14, "arrivalDate": "2027-02-04" },
    "targetKg": 69.5
  },
  "streakDays": 1,
  "sessions": { "thisWeek": 1, "total": 2 },
  "topPRs": [
    {
      "exercise": "press-inclinado-barra",
      "name": "Press inclinado con barra",
      "weightKg": 62.5,
      "reps": 8,
      "e1rm": 79.17,
      "date": "2026-10-30"
    }
  ],
  "adherence": { "windowWeeks": 4, "scheduled": 20, "done": 2, "ratio": 0.1, "extraSessions": 0 }
}
```

- `remainingKg`: kg hasta el borde de la meta (`goalHighKg` en CUT, `goalLowKg`
  en BULK); `0` si ya está dentro.
- `pace.*KgPerWeek`: cambio promedio por semana entre el primer y el último
  registro de la ventana. Negativo es bajar. `null` si hay menos de dos
  registros en días distintos.
- `projection.atTargetRate`: semanas (redondeadas hacia arriba) y fecha de
  llegada al punto medio de la meta (`targetKg`) al ritmo objetivo.
  `atCurrentPace` usa el ritmo real de 4 semanas y es `null` si el ritmo va en
  contra de la meta. `projection` es `null` sin registros de peso.
- `streakDays`: días de entreno consecutivos. Los días programados (lun, mar,
  mié, vie, sáb) sin sesión cortan la racha, los de descanso no, y hoy sin
  entrenar todavía no corta.
- `topPRs`: hasta 5 ejercicios con mejor e1RM histórico.
- `adherence`: en las últimas 4 semanas, `scheduled` son los días programados,
  `done` los que tuvieron sesión y `ratio` es `done / scheduled`.
  `extraSessions` cuenta sesiones en días de descanso. Hoy solo cuenta como
  programado si ya tiene sesión.

## Sesiones

`GET /api/v1/fitness/sessions?from=YYYY-MM-DD&to=YYYY-MM-DD`

Sesiones terminadas con sus ejercicios y series, en orden cronológico.

| Parámetro | Descripción |
|---|---|
| `from` | Opcional. Por defecto, 30 días antes de `to`. |
| `to` | Opcional. Por defecto, hoy. |

El rango no puede superar 366 días.

```bash
curl "https://<tu-dominio>/api/v1/fitness/sessions?from=2026-10-19&to=2026-10-30"
```

```json
{
  "from": "2026-10-19",
  "to": "2026-10-30",
  "sessions": [
    {
      "id": 12,
      "date": "2026-10-23",
      "name": "Vie · Upper",
      "startedAt": "2026-10-30T18:23:58.822Z",
      "finishedAt": "2026-10-30T18:24:07.294Z",
      "durationMin": 1,
      "exercises": [
        {
          "exercise": "press-inclinado-barra",
          "name": "Press inclinado con barra",
          "target": "3 × 8–10 · RIR 2",
          "isPR": false,
          "bestSet": { "weightKg": 60, "reps": 8, "e1rm": 76 },
          "sets": [
            { "setNumber": 1, "weightKg": 60, "reps": 8 },
            { "setNumber": 2, "weightKg": 60, "reps": 8 },
            { "setNumber": 3, "weightKg": 57.5, "reps": 8 }
          ]
        }
      ]
    }
  ]
}
```

`isPR` es `true` cuando la mejor serie superó el e1RM máximo previo de ese
ejercicio. La primera vez que se hace un ejercicio nunca es PR.

## Peso corporal

`GET /api/v1/fitness/bodyweight?from=YYYY-MM-DD&to=YYYY-MM-DD`

| Parámetro | Descripción |
|---|---|
| `from` | Opcional. Por defecto, 90 días antes de `to`. |
| `to` | Opcional. Por defecto, hoy. |

```bash
curl "https://<tu-dominio>/api/v1/fitness/bodyweight?from=2026-10-01"
```

```json
{
  "from": "2026-10-01",
  "to": "2026-10-30",
  "entries": [
    { "date": "2026-10-02", "kg": 78 },
    { "date": "2026-10-16", "kg": 77.1 },
    { "date": "2026-10-23", "kg": 76.7 },
    { "date": "2026-10-30", "kg": 76.1 }
  ]
}
```

Orden cronológico, un registro por fecha, hasta 500 entradas.

## Volumen semanal

`GET /api/v1/fitness/volume?week=YYYY-MM-DD`

| Parámetro | Descripción |
|---|---|
| `week` | Opcional. Cualquier fecha; se normaliza al lunes de su semana. Por defecto, la semana actual. |

```bash
curl "https://<tu-dominio>/api/v1/fitness/volume?week=2026-10-26"
```

```json
{
  "week": "2026-10-26",
  "weekEnd": "2026-11-01",
  "muscles": [
    {
      "key": "pecho",
      "label": "Pecho",
      "done": 6,
      "planned": 15,
      "mev": 8,
      "mavLow": 12,
      "mavHigh": 20,
      "status": "below_mev"
    }
  ]
}
```

- `done`: series completadas en la semana. Una serie directa cuenta 1 y una
  indirecta 0.5. Incluye la sesión en curso y excluye las descartadas.
- `planned`: series semanales de la rutina para ese músculo.
- `status`: `below_mev` si `done < mev`, `above_mav` si `done > mavHigh`, y
  `in_mav` en cualquier otro caso (entre `mev` y `mavHigh`).
- Hay un elemento por cada uno de los 14 grupos musculares.

## Progresión de un ejercicio

`GET /api/v1/fitness/progression?exercise=<slug>&limit=N`

| Parámetro | Descripción |
|---|---|
| `exercise` | Obligatorio. Slug del ejercicio (se obtiene de `routine` o `sessions`). |
| `limit` | Opcional. Últimas N sesiones, de 1 a 200. Por defecto, 20. |

```bash
curl "https://<tu-dominio>/api/v1/fitness/progression?exercise=press-inclinado-barra&limit=5"
```

```json
{
  "exercise": {
    "slug": "press-inclinado-barra",
    "name": "Press inclinado con barra",
    "muscles": { "pecho": 1, "triceps": 0.5, "deltFront": 0.5 }
  },
  "sessions": [
    {
      "date": "2026-10-23",
      "bestSet": { "weightKg": 60, "reps": 8 },
      "e1rm": 76,
      "maxWeightKg": 60
    },
    {
      "date": "2026-10-30",
      "bestSet": { "weightKg": 62.5, "reps": 8 },
      "e1rm": 79.17,
      "maxWeightKg": 62.5
    }
  ]
}
```

Una entrada por sesión, en orden cronológico. `bestSet` es la serie con mayor
e1RM y `maxWeightKg` el mayor peso de la sesión. Un ejercicio sin sesiones
devuelve `sessions: []`; un slug inexistente devuelve `404`.

## Rutina

`GET /api/v1/fitness/routine`

Rutina vigente con sus puntos de referencia de volumen. Sin parámetros.

```bash
curl https://<tu-dominio>/api/v1/fitness/routine
```

```json
{
  "days": [
    {
      "key": "push",
      "label": "Lun · Push",
      "subtitle": "Pecho · hombro · tríceps",
      "dayOfWeek": 1,
      "exercises": [
        {
          "order": 1,
          "exercise": "press-inclinado-barra",
          "name": "Press inclinado con barra",
          "sets": 3,
          "reps": "8",
          "rir": 2,
          "note": null,
          "muscles": { "pecho": 1, "triceps": 0.5, "deltFront": 0.5 }
        }
      ],
      "warmup": ["5 min bici o elíptica suave"],
      "cooldown": ["Pectoral en marco de puerta 2×30 s/lado"]
    }
  ],
  "restDays": [4, 7],
  "landmarks": [
    {
      "key": "pecho",
      "label": "Pecho",
      "mev": 8,
      "mavLow": 12,
      "mavHigh": 20,
      "plannedSetsPerWeek": 15
    }
  ]
}
```

- `dayOfWeek` y `restDays`: 1 es lunes y 7 domingo.
- `muscles`: `1` es músculo directo y `0.5` indirecto.
- `reps` es texto porque puede ser un rango (`"8–10"`).
- `landmarks`: MEV (mínimo efectivo) y rango MAV (volumen adaptativo máximo),
  en series por semana.
