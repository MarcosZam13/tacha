# Plan E2E: lista general

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/shopping-list/shopping-list.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: el reducer, la validación de cantidades y los rangos de precio ya están cubiertos con tests unitarios (`features/shopping-list/tests/`). Acá solo va lo que un navegador real tiene que probar: que la pantalla, la sesión anónima, la base y RLS funcionan juntos, y que lo guardado sigue ahí después de recargar.

## Datos y entorno

- **Usuario:** cada test abre un navegador nuevo, así que la app crea un usuario anónimo nuevo. No comparte lista con nadie ni con otros tests.
- **Producto:** se busca `leche` y se elige el primer resultado. Supuesto: el catálogo de la base compartida tiene al menos un producto que coincide. Si la búsqueda no devuelve nada, la falla es de **entorno / datos de prueba**, no del test ni del producto.
- **Limpieza:** al terminar, cada test borra los items de la lista de su usuario anónimo con la API de Supabase y el token de esa sesión (RLS solo deja borrar lo propio). En la base queda el usuario anónimo y su lista vacía.
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
