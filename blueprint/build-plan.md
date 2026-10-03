- [x] 1. Layout base y navegación — shell de la app con secciones "Hoy",
      "Plantillas" e "Historial" navegables.
- [x] 2. Esquema de datos en Prisma — modelos Template, TemplateTask,
      TemplateRecurrence, DailyPlan y DailyTask migrados a PostgreSQL
      (Prisma Postgres, vía Vercel Storage).
- [x] 3. CRUD de plantillas — crear, editar y eliminar una plantilla con su
      lista ordenada de tareas (título + hora sugerida).
- [x] 4. Recurrencia por día de semana — asignar una plantilla a uno o más
      días de la semana desde la UI de plantillas.
- [x] 5. Plantilla predeterminada — marcar una plantilla como default, usada
      cuando el día no tiene recurrencia asignada.
- [x] 6. Generación automática del plan diario — al abrir "Hoy" sin plan
      existente para la fecha, se crea a partir de la plantilla que
      corresponde (recurrente o default).
- [x] 7. Vista "Hoy" con checkboxes — listar las tareas del día con checkbox,
      marcar completada/pendiente con guardado automático inmediato.
- [x] 8. Cierre de día — snapshot del estado final de las tareas del día
      cuando termina (o al detectar el cambio de fecha), sin permitir editar
      un día ya cerrado.
- [x] 9. Edición manual del día actual — agregar o quitar una tarea puntual
      del plan de hoy sin modificar la plantilla original.
- [x] 10. Vista de historial — lista de días pasados con % de tareas
      completadas por día.
- [x] 11. Tema oscuro global — paleta oscura (fondo casi negro, tarjetas con
      borde sutil, acento terracota), títulos serif y texto sans en toda la app.
- [x] 12. Modelo del día por bloques — el plan del día guarda hora de inicio y
      fin (por defecto 07:30–18:00) y un registro de "tareas varias" (lista de
      texto); nuevo modelo de bloque (hora de inicio, actividad, completado).
      Migración aditiva, sin tocar lo existente.
- [x] 13. Planificación por bloques en "Hoy" — elegir fecha (hoy o futura),
      inicio y fin (solo :00/:30); "Generar día" crea los bloques de 30 min
      conservando lo ya escrito (pide confirmación antes de borrar bloques
      con texto que quedan fuera del rango); "Vaciar" limpia el día con
      confirmación; cada bloque tiene actividad de texto libre y checkbox de
      completado con guardado automático; en días futuros el checkbox está
      deshabilitado.
    - [x] 13a. Pantalla de bloques para hoy — "Hoy" pasa al diseño de la
          referencia para el día de hoy: inicio y fin + "Generar día" (crea
          los bloques conservando lo escrito; confirma antes de borrar
          bloques con texto fuera del rango) y la grilla con horas en 24 h.
          Se quita la lista de tareas anterior de Hoy.
    - [x] 13b. Editar bloques — escribir la actividad de cada bloque y marcar
          su checkbox, con guardado automático.
    - [x] 13c. Fecha y Vaciar — elegir hoy o un día futuro (fecha en la URL,
          `/` siempre abre hoy), checkbox deshabilitado en días futuros y
          "Vaciar" con confirmación.
- [x] 14. Tareas varias — panel lateral para anotar tareas del día como lista
      de texto (añadir y quitar), con guardado automático.
- [x] 15. Historial por fecha — elegir una fecha pasada y ver sus bloques,
      checks y tareas varias en solo lectura.
- [x] 16. Retirar plantillas y el modelo viejo — quitar la sección Plantillas,
      sus rutas y la generación por plantilla, y eliminar las tablas
      Template, TemplateTask, TemplateRecurrence y DailyTask con sus datos.
- [x] 17. App instalable (PWA) — manifest con nombre, colores del tema oscuro e
      íconos, para poder instalar la app en el celular y abrirla a pantalla
      completa (sin barra del navegador); sin conexión muestra una pantalla
      simple de "Sin conexión" (no hay lectura ni edición offline).
- [x] 18. Etiquetas de bloque — cada bloque puede llevar una etiqueta opcional
      (DEEP, LINKEDIN, GYM, WALK, PROTEIN, APPLY, INTERVIEW, SCREENS_OFF, BED),
      elegida en "Hoy" con un selector compacto que se guarda solo; Historial
      la muestra en solo lectura. Migración aditiva, sin tocar lo existente.
- [x] 19. Bloques por defecto al generar el día — "Generar día" precarga una
      rutina fija según el día de la semana (normal de lunes, martes,
      miércoles, viernes y sábado; jueves; domingo) solo en bloques vacíos que
      caen dentro del rango. Rango por defecto 06:30–23:30 todos los días. Es
      una constante en código: no vuelven las plantillas.
- [x] 20. Motor de reglas y vista Winter Arc — ajustar etiquetas y rutina,
      evaluar las reglas con funciones puras y mostrarlas en una sección nueva.
      Se construye en tres pasos (20a–20c).
    - [x] 20a. Etiquetas y rutina del Winter Arc — la etiqueta APPLY pasa a
          JOB_HUNTING ("Job Hunting") y se quitan INTERVIEW, LINKEDIN y BED
          (migración que conserva los datos: los bloques con una etiqueta
          quitada quedan sin etiqueta).
          La rutina por defecto suma "Job Applying" (etiqueta Job Hunting) a
          las 17:00 y 17:30 de los días normales, "Protein shake" (etiqueta
          PROTEIN) a las 18:00 el jueves y el domingo, y la etiqueta
          SCREENS_OFF en la lectura nocturna (22:00–23:00, todos los días).
    - [x] 20b. Motor de reglas — funciones puras con tests, sin interfaz.
          Diarias: DEEP (lunes a sábado: 8 bloques DEEP con check, solo
          cuentan tramos de 2 bloques seguidos o más; un bloque sin check
          corta el tramo) y SCREENS_OFF (todos los días: al menos 2 bloques
          con check). Semanales (lunes a domingo, solo semanas completas):
          GYM (5 días con todos sus bloques GYM con check; el domingo sirve
          para recuperar), WALK (2 días con todos sus bloques WALK con
          check) y JOB_HUNTING (al menos 4 bloques con check). Estado del
          día: verde si cumple todas las diarias que le aplican, amarillo si
          cumple algunas, rojo si ninguna; gris para hoy, días futuros y días
          antes del reto; un día pasado del reto sin plan es rojo. Racha
          "nunca fallar dos veces seguidas": cuentan verdes y amarillos, un
          rojo aislado no suma ni corta, dos rojos seguidos la reinician y
          hoy pendiente no la corta. Inicio del reto 2026-10-03, 90 días.
    - [x] 20c. Vista Winter Arc — nueva sección con "Día X de 90", rachas,
          semana actual con el ritmo de gym, paseos y postulaciones, grilla de
          90 días con detalle por regla y % por regla.
- [x] 21. API de lectura — `GET /api/days?from&to` (días con bloques,
      etiquetas y tareas varias, máximo 120 días) y `GET /api/arc/stats` (el
      mismo cálculo de la vista Winter Arc). Solo lectura.
