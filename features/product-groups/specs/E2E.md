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
