# Plan E2E: grupos de productos

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/product-groups/product-groups.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: los estados de la pantalla (cargando, error, reintentar, tarjetas, etiqueta "Compartido") están en `features/product-groups/tests/`; quién ve qué grupo (RLS con familias) está en `supabase/tests/054_create_product_groups.test.sql`. Acá solo va lo que un navegador real tiene que probar: que la navegación, la sesión anónima, la base y la RLS funcionan juntas.

## Datos y entorno

- **Usuario:** cada test abre un navegador nuevo, así que la app crea un usuario anónimo nuevo, sin grupos.
- **Limpieza:** ningún escenario de HU-72 crea datos. En la base queda el usuario anónimo.
- **Base:** la compartida del equipo, con la migración `054` aplicada. Sin ella, "Mis grupos" muestra el error de carga: la falla es de **entorno**, no del test.
- **Límite de Supabase:** cada test crea un usuario anónimo; muchas corridas seguidas llegan al límite de `/signup` (429). Es del **entorno** (ver `features/shopping-list/specs/E2E.md`).

## Escenarios

### E2E-GRUPOS-01: entrar a "Mis grupos" desde General

- **Cubre:** HU-72 CA-01 (caso 1).
- **Precondición:** usuario anónimo nuevo.
- **Pasos:**
  1. Abrir `/lista`.
  2. Tocar "Gestionar mis grupos".
- **Resultado esperado:** la URL es `/lista/grupos`, se ve el título "Mis grupos" y el menú sigue marcando "General".

### E2E-GRUPOS-02: estado vacío y volver a la lista

- **Cubre:** HU-72 CA-02 (caso 5).
- **Precondición:** usuario anónimo nuevo, sin grupos.
- **Pasos:**
  1. Abrir `/lista/grupos`.
  2. Tocar "Volver a la lista".
- **Resultado esperado:** en el paso 1 se ve "Agrupá los productos que siempre comprás juntos". Después del paso 2 la URL es `/lista`.

### E2E-GRUPOS-06: agregar un grupo a la lista (pendiente: necesita HU-73 en `develop`)

- **Cubre:** HU-74 CA-01, CA-02 y CA-03 (casos 18, 19, 20 y 22).
- **Precondición:** usuario anónimo nuevo. El grupo se crea con la pantalla de HU-73: el cliente no puede escribir grupos directo.
- **Pasos:**
  1. Crear un grupo con dos veces la misma presentación de "Leche" (queda ×2) y un "Chocolate".
  2. En "Mis grupos", tocar "Agregar a lista" en su tarjeta.
  3. Tocar "Ver lista".
- **Resultado esperado:** la tarjeta dice "Agregamos 2 productos de «…» a tu lista." y la lista general tiene la Leche ×2 y el Chocolate ×1. Agregar el grupo otra vez deja la Leche ×4, sin filas nuevas.
