# Plan E2E: lista general

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/shopping-list/shopping-list.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: el reducer, la validación de cantidades y los rangos de precio ya están cubiertos con tests unitarios (`features/shopping-list/tests/`). Acá solo va lo que un navegador real tiene que probar: que la pantalla, la sesión anónima, la base y RLS funcionan juntos, y que lo guardado sigue ahí después de recargar.

## Datos y entorno

- **Usuario:** cada test abre un navegador nuevo, así que la app crea un usuario anónimo nuevo. No comparte lista con nadie ni con otros tests.
- **Producto:** se busca `leche` y se elige el primer resultado. Supuesto: el catálogo de la base compartida tiene al menos un producto que coincide. Si la búsqueda no devuelve nada, la falla es de **entorno / datos de prueba**, no del test ni del producto.
- **Limpieza:** al terminar, cada test borra los items de la lista de su usuario anónimo con la API de Supabase y el token de esa sesión (RLS solo deja borrar lo propio). En la base queda el usuario anónimo y su lista vacía.
- **Servidor en frío:** si Playwright levanta `next dev` desde cero, la primera compilación de `/lista` con varios workers a la vez puede pasar los 5 s del `beforeEach` (falla al no ver "Tu lista está vacía" a tiempo). Es del **entorno**: levantar `npm run dev`, abrir `/lista` una vez y después correr la suite (Playwright reusa el servidor).
- **Límite de Supabase:** cada test crea un usuario anónimo. Muchas corridas seguidas desde la misma IP llegan al límite de `/signup` (429) y la pantalla muestra "No se pudo cargar tu lista". También es del **entorno**: esperar a que se libere, no reintentar en bucle.
- **Base:** la compartida del equipo. Por eso E2E todavía no corre en el CI (ver `.agents/skills/playwright-e2e`, "Setup en este repo").

## Escenarios

### E2E-LISTA-01: añadir un producto desde el buscador

- **Cubre:** HU-36a CA-01, CA-03, CA-04.
- **Precondición:** usuario anónimo nuevo, lista vacía.
- **Pasos:**
  1. Abrir `/lista`.
  2. Ver el mensaje "Tu lista está vacía. Busca un producto para empezar."
  3. Escribir `leche` en "Buscar producto".
  4. Elegir el primer resultado.
  5. Recargar la página.
- **Resultado esperado:** después del paso 4 aparece una fila con el nombre del producto elegido y cantidad `1`, sin recargar. Después del paso 5 la fila sigue ahí con cantidad `1`.

### E2E-LISTA-02: subir la cantidad con "+"

- **Cubre:** HU-36b CA-01, CA-02, CA-04.
- **Precondición:** usuario anónimo nuevo con un producto en la lista (pasos 1 a 4 de E2E-LISTA-01).
- **Pasos:**
  1. Tocar "Añadir uno" en la fila.
  2. Recargar la página.
- **Resultado esperado:** la cantidad pasa a `2` sin recargar y sigue en `2` después de recargar.

### E2E-LISTA-03: eliminar un producto (pendiente)

- **Cubre:** HU-36d CA-01, CA-02, CA-03.
- **Estado:** se implementa cuando SCRUM-65 (PR #34) esté en `develop`: hoy la rama no tiene el botón de eliminar.
- **Pasos previstos:** tocar "Eliminar" → la fila desaparece y aparece "Producto eliminado" con "Deshacer" → esperar a que el aviso se cierre → recargar → la fila no vuelve.

### E2E-LISTA-04: tachar y destachar un producto

- **Cubre:** HU-36e CA-02, CA-04 (y que el tachado se guarda en la base: migración `015`).
- **Precondición:** usuario anónimo nuevo con un producto en la lista (pasos 1 a 4 de E2E-LISTA-01).
- **Pasos:**
  1. Tocar el nombre del producto en la fila.
  2. Recargar la página.
  3. Tocar otra vez el nombre del producto.
  4. Recargar la página.
- **Resultado esperado:** después del paso 1 la fila está en la sección "Tachados hoy", marcada como presionada, y ya no está en "Pendientes", sin recargar. Después del paso 2 sigue en "Tachados hoy". Después del paso 3 vuelve a "Pendientes" y "Tachados hoy" desaparece. Después del paso 4 sigue en "Pendientes".
- **Sincronización (desde el tachado optimista, 2026-10-09):** la fila cambia de sección antes de que la base guarde. Antes de recargar se espera a que el botón de la fila vuelva a estar habilitado, que es la señal visible de que la base confirmó. Recargar antes daba un falso fallo intermitente (mobile-chrome).
- **Fuera del navegador:** que "+" o detalle no tachen (CA-02) lo garantiza que son botones hermanos, verificado a mano; el orden de las filas y los errores, en `tests/shopping-list.reducer.test.ts`; la medianoche local (CA-05), en `tests/startOfLocalDay.test.ts`.

### E2E-LISTA-05: modo compra de punta a punta

- **Cubre:** HU-36f CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07 (y que la compra se guarda en la base: migración `016`).
- **Precondición:** usuario anónimo nuevo con un producto en la lista (pasos 1 a 4 de E2E-LISTA-01).
- **Pasos:**
  1. Tocar "Iniciar compra" y elegir "MaxiPali" en el diálogo "¿Dónde estás comprando?".
  2. Tocar el nombre del producto.
  3. Tocar "Añadir uno" en esa fila.
  4. Tocar "Salir".
  5. Tocar "Iniciar compra" y elegir "MaxiPali" otra vez.
  6. En el panel "Cerrar compra", escribir `12500` en "Total gastado (₡)" y tocar "Cerrar compra".
- **Resultado esperado:**
  - Paso 1: la URL lleva `?compra=<id>` y la barra "Modo compra" dice MaxiPali; la lista es la misma (CA-01, CA-02).
  - Paso 2: la fila pasa a "Tachados hoy", igual que fuera de modo compra (CA-03).
  - Paso 3: la cantidad pasa a `2` y la fila dice "Pedido 1": cambió lo comprado, no lo pedido (CA-04).
  - Paso 4: la URL vuelve a `/lista`, sin la barra; la fila sigue tachada (CA-06).
  - Paso 5: la URL lleva el **mismo** id del paso 1: la compra se retomó (CA-05). Como no queda nada pendiente, aparece el panel "Cerrar compra" (CA-07).
  - Paso 6: la URL vuelve a `/lista`, sin la barra ni el panel.
- **Sincronización:** igual que E2E-LISTA-04, antes de tocar otra cosa en la fila se espera a que vuelva a estar habilitada (la base confirmó).
- **Datos que quedan:** la compra cerrada del usuario anónimo queda en `purchase_sessions` (la limpieza solo borra los items, como en los otros escenarios).
