## 1. Problema
Mantener un sistema manual de planificación por bloques de tiempo (estilo *Deep
Work*) requiere reescribir a mano la estructura del día todos los días, incluso
cuando la mayoría de los días laborales se repiten. No hay forma de ver el
historial de cumplimiento ni de reutilizar un mismo esquema de tareas entre días
similares.

## 2. Usuarios
Uso personal (Ariel). Un solo usuario, sin multi-tenancy ni roles por ahora.

## 3. Funcionalidades (MVP)
- Vista "Hoy": lista de tareas del día con checkbox, generada automáticamente a
  partir de la plantilla que corresponde (por recurrencia o por defecto).
- Marcar una tarea como completada/pendiente con guardado automático inmediato.
- Cierre de día: al terminar el día (o al entrar al día siguiente), el estado
  final de las tareas de ese día queda guardado como snapshot histórico
  inmutable.
- CRUD de plantillas: cada plantilla es una lista ordenada de tareas
  (título + hora sugerida opcional).
- Asignar una plantilla a uno o más días de la semana (recurrencia).
- Marcar una plantilla como predeterminada, usada en días sin recurrencia
  configurada.
- Editar el plan del día actual manualmente (agregar/quitar una tarea puntual
  sin modificar la plantilla original).
- Historial: lista de días pasados con % de tareas completadas por día.

## 4. Datos
- **Template**: id, nombre, isDefault (bool), createdAt.
- **TemplateTask**: id, templateId, título, hora sugerida (opcional), orden.
- **TemplateRecurrence**: templateId, diaSemana (0-6). Relación N a N entre
  Template y días de la semana.
- **DailyPlan**: id, fecha (única por día), templateId usado (nullable si fue
  editado manualmente sin plantilla), cerrado (bool).
- **DailyTask**: id, dailyPlanId, título, hora sugerida, completado (bool),
  completedAt, orden.

## 5. Stack
- Next.js (App Router, TypeScript, Tailwind, carpeta `src/`).
- Backend: Next.js Route Handlers (`src/app/api/**`) dentro del mismo proyecto.
- ORM: Prisma.
- Base de datos: PostgreSQL gestionado en Prisma Postgres, provisionado desde
  el dashboard de Vercel (Storage), plan gratuito — accesible desde PC y
  celular una vez deployado, sin servidor propio que mantener.

## 6. Monetización
No aplica — herramienta de uso personal.

## 7. UI/UX
Minimalista, sin componentes ni pantallas de más. Una sola vista principal
("Hoy") con checklist de tareas, y dos vistas secundarias simples
(plantillas, historial). Tipografía serif, tonos cálidos (crema/tierra),
sin dashboards ni configuraciones innecesarias. Debe verse bien en móvil
(viewport angosto) sin sacrificar la vista diaria — es el uso principal
desde el celular.

## 8. Despliegue
Vercel, con Prisma Postgres (provisionado desde el dashboard de Vercel) como
base de datos — accesible desde PC y celular vía la URL pública una vez
deployado.
