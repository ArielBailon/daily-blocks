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
- [ ] 19. Bloques por defecto al generar el día — de lunes a sábado, "Generar
      día" precarga los bloques fijos del Winter Arc (actividad + etiqueta)
      solo en bloques vacíos que caen dentro del rango; los domingos no se
      precarga nada. Rango por defecto 06:30–22:00 todos los días. Es una
      constante en código: no vuelven las plantillas.
- [ ] 20. Motor de reglas y vista Winter Arc — reglas R1–R5 evaluadas con
      funciones puras a partir de etiquetas y checks; estado del día (verde,
      amarillo, rojo, gris), racha "nunca fallar dos veces seguidas" y ritmo
      semanal de gym y postulaciones (solo en semanas completas); nueva
      sección "Winter Arc" con "Día X de 90", grilla de 90 días con detalle
      por regla y % por regla.
- [ ] 21. API de lectura — `GET /api/days?from&to` (días con bloques,
      etiquetas y tareas varias, máximo 120 días) y `GET /api/arc/stats` (el
      mismo cálculo de la vista Winter Arc). Solo lectura.
