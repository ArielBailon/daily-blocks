## 1. Problema
Mantener un sistema manual de planificación por bloques de tiempo (estilo *Deep
Work*) requiere reescribir a mano la estructura del día todos los días. No hay
forma de registrar qué bloques se cumplieron ni de consultar después cómo fue
cada día.

## 2. Usuarios
Uso personal (Ariel). Un solo usuario, sin multi-tenancy ni roles por ahora.

## 3. Funcionalidades (MVP)
- Vista "Hoy" como planificación por bloques: elegir la fecha (hoy o una
  futura, por defecto hoy) y el rango del día (inicio y fin, solo :00 o :30,
  por defecto 07:30 a 18:00). "Generar día" crea bloques de 30 minutos
  conservando lo ya escrito; pide confirmación antes de borrar bloques con
  texto que quedan fuera del rango. "Vaciar" limpia el día tras confirmar.
- Cada bloque tiene una actividad de texto libre y un checkbox para marcar si
  se completó, con guardado automático. En días futuros el checkbox está
  deshabilitado hasta que llegue el día.
- "Tareas varias": registro de texto del día (añadir y quitar tareas
  pequeñas), sin checkbox, con guardado automático.
- Cierre de día: al terminar el día (o al entrar al día siguiente), el día
  queda como snapshot inmutable; los días pasados no se pueden editar.
- Historial: elegir una fecha pasada y ver sus bloques, checks y tareas
  varias en solo lectura.
- Se retiran las plantillas (con su recurrencia y predeterminada) y la lista
  de tareas anterior de Hoy.

## 4. Datos
- **DailyPlan**: id, fecha (única por día), cerrado (bool), hora de inicio y
  hora de fin (HH:MM; por defecto 07:30 y 18:00), tareas varias (lista
  ordenada de textos, vacía por defecto).
- **Block**: id, dailyPlanId, hora de inicio (HH:MM, única dentro de su día),
  actividad (texto, puede estar vacía), completado (bool).
- Se eliminan Template, TemplateTask, TemplateRecurrence y DailyTask, con sus
  datos.

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
Minimalista, sin componentes ni pantallas de más. Tema oscuro en toda la app
(fondo casi negro, tarjetas con borde sutil, acento terracota), títulos serif
y texto sans. Navegación: Hoy e Historial. Hoy replica la referencia
`blueprint/reference/planificacion-por-bloques.png`: formulario de fecha,
inicio y fin con "Generar día" y "Vaciar"; grilla de bloques con la hora en
24 h (las en punto en negrita, las medias atenuadas), la actividad y un
checkbox por fila; panel lateral "Tareas varias"; pie "Se guarda
automáticamente". Debe verse bien en móvil (viewport angosto) — es el uso
principal desde el celular.

## 8. Despliegue
Vercel, con Prisma Postgres (provisionado desde el dashboard de Vercel) como
base de datos — accesible desde PC y celular vía la URL pública una vez
deployado.
