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

### E2E-FECHAS-11: la carga que ya trae lo recién creado no lo duplica

- **Cubre:** SPEC §5, regla 8.
- **Pasos:** retener la respuesta de crear hasta que la carga, que ya trae la sublista, haya respondido.
- **Resultado:** la sublista se ve una sola vez.

### E2E-FECHAS-04: la sublista aparece en su día

- **Cubre:** HU-44 CA-01, CA-03, SPEC §8, regla 3.
- **Pasos:** con un usuario sin familia, crear una sublista en un mes lejano.
- **Resultado:** el calendario salta a ese mes y la sublista está en la celda de su día.

### E2E-FECHAS-05: tocar un día abre el formulario con esa fecha

- **Cubre:** HU-45 CA-01, SPEC §8, regla 4.
- **Pasos:** ir al mes siguiente y tocar el día 15.
- **Resultado:** se abre el formulario con esa fecha ya escrita.

### E2E-FECHAS-06: un día pasado no se puede tocar

- **Cubre:** SPEC §8, regla 4.
- **Pasos:** ir al mes anterior.
- **Resultado:** ningún día de ese mes tiene el botón de crear.


### E2E-FECHAS-08: tachar todo la completa

- **Cubre:** HU-46 CA-01, SPEC §9, reglas 1 y 4.
- **Pasos:** crear una sublista con dos productos, tachar los dos, destachar uno.
- **Resultado:** el estado pasa a "Completada" al tachar el último, y vuelve a "Pendiente" al destachar.

### E2E-FECHAS-09: cancelar no borra

- **Cubre:** HU-46 CA-02, SPEC §9, regla 3.
- **Pasos:** cancelar una sublista con productos y confirmar.
- **Resultado:** dice "Cancelada", los productos siguen, el buscador ya no está, y en el calendario sale tachada.

### E2E-FECHAS-10: reactivar

- **Cubre:** SPEC §9, regla 5.
- **Pasos:** reactivar la sublista cancelada.
- **Resultado:** vuelve el buscador y el estado se recalcula.
