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
- [ ] 10. Vista de historial — lista de días pasados con % de tareas
      completadas por día.
