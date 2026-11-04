# Plan E2E: sublistas por fecha

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/date-lists/date-lists.spec.ts`.

Nivel más bajo que alcanza: las fechas y la validación del formulario están en `features/date-lists/tests/`, y permisos y reglas de la base en `supabase/tests/038_create_date_lists.test.sql`.

## Datos y entorno

- **Usuario:** cada test abre un navegador nuevo, así que la app crea un usuario anónimo nuevo, sin familia: su sublista es personal.
- **Producto:** se busca `leche` y se elige el primer resultado. Supuesto: el catálogo de la base compartida tiene al menos uno.
- **Limpieza:** se borran los items con el token de esa sesión. La fila de la sublista queda, porque `lists` no tiene política de borrado; es de un usuario anónimo que nadie más ve.

## Escenarios

### E2E-FECHAS-01: crear una sublista

- **Cubre:** HU-45 CA-01, CA-02.
- **Pasos:** abrir `/fechas`, tocar "+ Nueva sublista", escribir nombre y fecha, crear.
- **Resultado:** sin recargar aparece la sublista con su nombre y el estado "Pendiente".

### E2E-FECHAS-02: el formulario no acepta una fecha pasada

- **Cubre:** SPEC §5, regla 2.
- **Pasos:** escribir un nombre y una fecha pasada, crear.
- **Resultado:** se ve el error y el formulario sigue abierto.

### E2E-FECHAS-03: agregar un producto

- **Cubre:** HU-45 CA-03, SPEC §5, regla 6.
- **Pasos:** crear una sublista, abrirla y agregar el mismo producto dos veces con el buscador.
- **Resultado:** una sola fila, con cantidad 2.

### E2E-FECHAS-07: la carga inicial que llega tarde no borra lo recién creado

- **Cubre:** SPEC §5, regla 8.
- **Pasos:** retener la respuesta de la carga hasta que termine de crearse una sublista.
- **Resultado:** la sublista sigue en pantalla cuando llega la carga.
