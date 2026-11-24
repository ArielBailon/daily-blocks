# ActivityWatch en daily-blocks

daily-blocks puede mostrar qué hiciste en la PC durante cada bloque leyendo
[ActivityWatch](https://activitywatch.net/), que corre en tu PC en
`http://localhost:5600`.

La integración es 100% del navegador: la app en Vercel no puede llegar a tu PC,
así que es el navegador de la PC el que consulta ActivityWatch directamente.
Nada de ActivityWatch se envía a daily-blocks ni se guarda en su base de datos;
los títulos de ventana y las URLs nunca salen del navegador.

Por ahora es solo para escritorio: en pantallas angostas (el celular) no se
muestra nada ni se hace ninguna consulta.

## Estado en la barra de navegación

- Un punto discreto: ActivityWatch está conectado.
- "ActivityWatch no disponible": ActivityWatch está apagado o el navegador lo
  bloquea por CORS. Desde la app no se puede distinguir entre los dos casos.
  Revisa que ActivityWatch esté corriendo y que la configuración de abajo esté
  aplicada.

## Configurar CORS (Windows, aw-server en Python)

ActivityWatch solo acepta pedidos del navegador desde los orígenes que tenga
permitidos. Esta configuración es para el servidor en Python (`aw-server`), el
que viene en el instalador de ActivityWatch v0.13. Puedes confirmar la versión
en `http://localhost:5600/api/0/info`.

1. Cierra ActivityWatch desde el ícono de la bandeja del sistema (Quit).
2. Abre este archivo (cambia `<usuario>` por tu usuario de Windows):

   ```text
   C:\Users\<usuario>\AppData\Local\activitywatch\activitywatch\aw-server\aw-server.toml
   ```

3. En la sección `[server]`, quita el `#` de `cors_origins` y deja los dos
   orígenes separados por coma:

   ```toml
   [server]
   cors_origins = "https://daily-blocks-mu.vercel.app,http://localhost:3000"
   ```

   No cambies la sección `[server-testing]`.

4. Abre ActivityWatch de nuevo.

Para comprobarlo, este comando debe responder con
`Access-Control-Allow-Origin: http://localhost:3000`:

```bash
curl -s -o /dev/null -D - -H "Origin: http://localhost:3000" http://localhost:5600/api/0/info
```

> Si usas el servidor en Rust (`aw-server-rust`), el archivo es
> `C:\Users\<usuario>\AppData\Local\activitywatch\aw-server-rust\config.toml`
> y la clave es `cors`, una lista, en el nivel superior del archivo. Esta app
> se probó con el servidor en Python.

## Permiso de red local en Chrome

La primera vez que abras `https://daily-blocks-mu.vercel.app` con
ActivityWatch corriendo, Chrome puede preguntar si el sitio puede acceder a
dispositivos de tu red local. Acepta para que la integración funcione. Si lo
rechazaste, puedes cambiarlo en la configuración del sitio (el ícono a la
izquierda de la URL).

## Otra dirección de ActivityWatch

Si ActivityWatch no corre en `http://localhost:5600`, define
`NEXT_PUBLIC_AW_URL` con su dirección (por ejemplo en `.env.local`, o en las
variables de entorno de Vercel). Se incorpora al compilar, así que hay que
volver a desplegar después de cambiarla.

## Categorías

Se usan las categorías que tengas configuradas en ActivityWatch
(Settings > Categorization). Si no se pueden leer, se usan las categorías por
defecto de ActivityWatch. Cuentan como distracción `Media > Games`,
`Media > Video`, `Media > Social Media` y `Media > Music`, con sus
subcategorías.
