# Plan técnico: lista general (buscar, añadir, ajustar cantidad)

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

> **Pendiente de verificar antes de implementar la capa de datos:** el esquema real de la base (puede ir adelante de `supabase/schema.sql`) y si las sesiones anónimas quedan habilitadas en el proyecto. Si alguna de las dos cambia, se actualiza este plan primero.

## Archivos

```
components/shopping-list/
  ShoppingList.tsx                     entrada: compone buscador + lista (solo presentación)
  components/
    ProductSearch.tsx                  input + lista de resultados
    ShoppingListRow.tsx                una fila: nombre, variante, controles de cantidad
    QuantityStepper.tsx                "−" cantidad "+" (botones hermanos, nunca anidados)
    ShoppingListEmptyState.tsx         lista vacía
  hooks/
    useShoppingListViewModel.ts        facade: une useShoppingList + useProductSearch para la vista
    useShoppingList.ts                 useReducer + carga inicial (useEffect) + acciones que llaman al servicio
    shoppingList.reducer.ts            reducer puro: todas las reglas de cómo cambia la lista
    useProductSearch.ts                texto, debounce, protección contra respuestas viejas
  models/
    ShoppingListItem.interface.ts
    ShoppingListAction.type.ts         unión de acciones del reducer
    CatalogSearchResult.interface.ts   resultado ya aplanado a una fila por variante
  constants/
    shopping-list.constants.ts         textos, límites (mínimo 1), debounce, mínimo de caracteres
  specs/  SPEC.md · plan.md · tasks.md

services/                              (carpeta nueva en la raíz, según project-structure)
  supabase.client.ts                   un solo cliente de Supabase para toda la app
  catalog.service.ts                   searchCatalog(): llama al RPC search_catalog y aplana variantes
  shopping-list.service.ts             getGeneralList(), addItem(), updateQuantity()

supabase/migrations/004_create_lists.sql
app/lista/page.tsx                     ruta delgada: solo renderiza <ShoppingList />
```

Dependencia nueva: `@supabase/supabase-js` (hoy el repo llama a PostgREST con `fetch` a mano; con auth y RLS de por medio, el cliente oficial maneja la sesión y el token).

## Datos

Tablas (según documento-proyecto §6, solo las columnas que este sprint usa):

- `lists`: `id`, `owner_id` (→ `auth.users`, siempre), `household_id` (nullable, en este sprint siempre `null`), `type` (`general` / `date` / `private`), `status` (`active` / `completed` / `cancelled`), `created_at`.
- `list_items`: `id`, `list_id`, `product_catalog_variant_id`, `quantity_requested` (`check >= 1`), `created_at`; `unique (list_id, product_catalog_variant_id)`.
- RLS en ambas: el usuario solo ve y modifica listas donde `owner_id = auth.uid()` (household y colaboradores se suman cuando existan esas tablas).
- RPC `add_item_to_general_list(variant_id)`: busca o crea la lista general del usuario e inserta el item; si ya existe, suma 1 (`on conflict do update`). La regla de merge vive en la base, como pide documento-proyecto §6.

## Flujo

1. Al montar, `useShoppingList` pide la lista general (`useEffect`) → `dispatch({ type: "loaded" })`.
2. Escribir en el buscador → `useProductSearch` espera el debounce → `searchCatalog()` → resultados. Si llega una respuesta de una búsqueda vieja, se descarta.
3. Elegir un resultado → `addItem()` (RPC) → la base devuelve el item con su cantidad final → `dispatch({ type: "itemUpserted" })`.
4. "+" o "−" → `updateQuantity()` → `dispatch({ type: "quantityChanged" })`. El "−" se deshabilita en 1 (UI) y la base lo rechaza igual (`check`).

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| `useReducer` para la lista | `useState` | Varias acciones con reglas (y en Sprint 2 llegan eliminar y tachar); las reglas quedan en una función pura testeable sin React |
| `useEffect` + debounce + bandera de cancelación | Buscar en cada tecla | Una petición por pausa de escritura, y una respuesta vieja nunca pisa a la nueva |
| Merge de duplicados en la base (RPC) | Revisar en el cliente si ya existe | Dos pestañas o dos miembros del household agregando a la vez no duplican filas; lo pide el documento del proyecto |
| Mínimo 1 en UI **y** en la base | Solo en la UI | La UI es comodidad; la base es la garantía |
| Esperar respuesta del servidor antes de actualizar | Actualización optimista | Más simple de explicar y sin rollback; se puede optimizar después si se siente lento |
| Buscador dentro de la feature | Componente compartido | Solo hay un consumidor hoy; se promueve cuando exista el segundo |
