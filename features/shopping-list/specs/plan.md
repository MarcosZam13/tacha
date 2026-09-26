# Plan técnico: lista general (buscar, añadir, ajustar cantidad)

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

> **Verificado el 2026-09-25** contra la base real (MCP de Supabase): el catálogo tiene datos (28 productos, 39 variantes); no existen `lists`, `list_items`, `households` ni `profiles`; las políticas de lectura del catálogo aplican a todos los roles, así que la búsqueda funciona con la sesión anónima (rol `authenticated`). Sesiones anónimas habilitadas en el proyecto.

## Archivos

```
features/shopping-list/
  ShoppingList.tsx                     entrada ("use client"): compone buscador + lista (solo presentación)
  components/
    ProductSearch.tsx                  input + lista de resultados
    ShoppingListRow.tsx                una fila: nombre, tamaño y QuantityStepper
    QuantityStepper.tsx                "−" cantidad "+" (botones hermanos, nunca anidados; se deshabilitan mientras la fila espera)
    ShoppingListEmptyState.tsx         lista vacía
    models/                            props de los mini componentes
  hooks/
    useShoppingListViewModel.ts        facade: une useShoppingList + useProductSearch para la vista
    useShoppingList.ts                 useReducer + carga inicial (useEffect) + addItem
    useProductSearch.ts                texto, debounce, protección contra respuestas viejas; resto derivado
  models/
    ShoppingListItem.interface.ts
    ShoppingListState.interface.ts
    ShoppingListAction.type.ts         unión discriminada de acciones del reducer
    CatalogSearchResult.interface.ts   resultado ya aplanado a una fila por variante: variantId, productName, sizeLabel
    CatalogSearchVariant.interface.ts  forma del jsonb `variants` que devuelve search_catalog
  services/
    catalog.service.ts                 searchCatalog(): RPC search_catalog, aplana variantes (descarta price_ranges)
    shopping-list.service.ts           getGeneralList(), addItemToGeneralList(), changeItemQuantity()
  utils/
    shopping-list.reducer.ts           reducer puro + estado inicial (no es un hook: no va en hooks/)
    formatSizeLabel.ts                 275 + "g" → "275 g"
  constants/
    shopping-list.constants.ts         textos, debounce, mínimo de caracteres, nombres de tablas/RPC, acciones
  specs/  SPEC.md · plan.md · tasks.md

services/supabase.client.ts            único cliente de Supabase de la app + ensureSession() (sesión anónima)
types/database.types.ts                tipos generados desde el esquema real (regenerar tras cada migración)
supabase/migrations/004_create_lists.sql
app/lista/page.tsx                     ruta delgada: solo renderiza <ShoppingList />
```

Todo lo que solo usa esta feature vive dentro de `features/shopping-list/`; afuera quedan solo el cliente de Supabase (lo usará toda la app), los tipos de la base y la ruta.

Dependencia nueva: `@supabase/supabase-js` (hoy el repo llama a PostgREST con `fetch` a mano; con auth y RLS de por medio, el cliente oficial maneja la sesión y el token).

## Datos

Tablas (según documento-proyecto §6, solo las columnas que este sprint usa):

- `lists`: `id`, `owner_id` (→ `auth.users`, siempre), `household_id` (nullable, en este sprint siempre `null`), `type` (`general` / `date` / `private`), `status` (`active` / `completed` / `cancelled`), `created_at`.
- `list_items`: `id`, `list_id`, `product_catalog_variant_id`, `quantity_requested` (`check >= 1`), `created_at`; `unique (list_id, product_catalog_variant_id)`.
- RLS en ambas, deny por defecto: este sprint solo abre select/insert de `lists` y select/insert/update de `list_items`, siempre con `owner_id = auth.uid()`; el insert de `lists` exige además `household_id is null` hasta que existan households. Eliminar llega en Sprint 2.
- Índice único parcial: una sola lista `general` por dueño sin household (también evita dos listas si llegan dos RPC a la vez).
- RPC `add_item_to_general_list(target_variant_id)`, `security invoker` (RLS sigue aplicando) y `search_path` fijo: busca o crea la lista general del usuario e inserta el item; si ya existe, suma 1 (`on conflict do update`). Devuelve la fila con la cantidad final. Solo `authenticated` puede ejecutarla. La regla de merge vive en la base, como pide documento-proyecto §6.

### Qué se muestra de cada resultado

`search_catalog` devuelve el producto madre con un arreglo `variants`. En los datos reales el `name` de la variante viene duplicado ("Chocolate Milka de Leche - 90 g — Chocolate Milka de Leche - 90 g", efecto de la normalización del scraper) y el nombre del producto ya trae el tamaño. Por eso cada resultado muestra **el nombre del producto** y un tamaño armado con `base_quantity` + `base_unit` ("90 g"), no el nombre de la variante. `price_ranges` se ignora: comparar precios no es de esta historia.

## Flujo

1. Al montar, `useShoppingList` pide la lista general (`useEffect`) → `dispatch({ type: "loaded" })`.
2. Escribir en el buscador → `useProductSearch` espera el debounce → `searchCatalog()` → resultados. Si llega una respuesta de una búsqueda vieja, se descarta.
3. Elegir un resultado → `addItem()` (RPC) → la base devuelve el item con su cantidad final → `dispatch({ type: "itemUpserted" })`.
4. "+" o "−" → `dispatch(QUANTITY_CHANGE_STARTED)` (la fila queda pendiente y sus botones se deshabilitan) → `changeItemQuantity(itemId, ±1)` → RPC `change_item_quantity` → la base suma el delta y devuelve la cantidad final → `dispatch(QUANTITY_CHANGED)`. Si falla: `QUANTITY_CHANGE_FAILED` (la cantidad no cambia, aparece el error). El "−" se deshabilita en 1 (UI) y la base lo rechaza igual (`check`).

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| `useReducer` para la lista | `useState` | Varias acciones con reglas (y en Sprint 2 llegan eliminar y tachar); las reglas quedan en una función pura testeable sin React |
| Servicio + `useEffect` en el hook | TanStack Query | Es el patrón del repo de referencia del profesor (component-architecture §3) y TanStack no está instalado; adoptarlo es decisión de todo el equipo, no de una feature (nextjs-enterprise-patterns §3) |
| Ningún `dispatch` síncrono dentro del efecto | Poner `isLoading: true` al inicio del efecto | El estado inicial ya arranca cargando; evita renders en cascada. El lint (`set-state-in-effect`) no lo vigila para `dispatch`, así que es una regla nuestra |
| `useEffect` + debounce + bandera de cancelación | Buscar en cada tecla | Una petición por pausa de escritura, y una respuesta vieja nunca pisa a la nueva |
| Merge de duplicados en la base (RPC) | Revisar en el cliente si ya existe | Dos pestañas o dos miembros del household agregando a la vez no duplican filas; lo pide el documento del proyecto |
| Mínimo 1 en UI **y** en la base | Solo en la UI | La UI es comodidad; la base es la garantía |
| Esperar respuesta del servidor antes de actualizar | Actualización optimista | Más simple de explicar y sin rollback; se puede optimizar después si se siente lento |
| Buscador dentro de la feature | Componente compartido | Solo hay un consumidor hoy; se promueve cuando exista el segundo |
| Mostrar nombre del producto + tamaño | Mostrar el nombre de la variante | El nombre de la variante viene duplicado en los datos reales |

### SCRUM-63: ajustar cantidad

- RPC `change_item_quantity(target_item_id, quantity_delta)` (migración `005_change_item_quantity.sql`): `security invoker` (usa la política de update de `list_items`), solo acepta `-1` o `1`, hace `quantity_requested = quantity_requested + delta` en una sola sentencia y devuelve la fila. Si el item no existe o no es del usuario, lanza error (RLS lo deja invisible).

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Mandar un delta (±1) a una RPC | `update` con la cantidad final calculada en el cliente | Dos toques rápidos o dos pestañas mandarían la misma cantidad final y se perdería uno; con el delta la base suma cada toque |
| Deshabilitar los botones de la fila mientras espera | Dejar tocar y encolar | Sin eso, dos respuestas de la misma fila pueden llegar en desorden y la pantalla mostraría una cantidad vieja |
| Pendientes por fila (`pendingItemIds`) | Un solo `isUpdating` para toda la lista | Cambiar una fila no bloquea las demás |
| Elegir en el buscador un producto que ya está en la lista = mismo +1 que el botón | Llamar `add_item_to_general_list` igual | Pasa por el mismo bloqueo por fila; si no, un añadir y un "+" en paralelo sobre la misma fila podrían dejar en pantalla una cantidad vieja |
| `Button` de components/ui con texto solo para lectores de pantalla | `<button>` propio con `aria-label` | Reusar el primitivo (nextjs-enterprise-patterns §1); el "−" solo no dice nada a un lector de pantalla |

## Deuda conocida (revisión de seguridad, 2026-09-25)

Viene de la sesión anónima provisional; se cierra cuando exista el registro:

- **Cuentas anónimas sin CAPTCHA:** cualquiera con la anon key puede crear usuarios anónimos en bucle (Supabase los limita por IP). Antes de producción: CAPTCHA en Auth › Attack Protection (y `captchaToken` en `signInAnonymously`), revisar el rate limit y limpiar anónimos viejos.
- **Anónimo = `authenticated`:** las políticas de este sprint no distinguen anónimos de registrados, y hoy eso es lo buscado. La migración de households tiene que exigir `coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) = false` en toda acción que requiera cuenta real (crear o unirse a un household).
