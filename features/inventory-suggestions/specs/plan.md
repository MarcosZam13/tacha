# Plan: InventorySuggestions (SCRUM-102)

Deriva de [SPEC.md](SPEC.md).

## Datos (migración 061)

- **`category_shelf_life`** (`category_id` PK → `categories`, `shelf_life_days` 1 a 365). RLS: `authenticated` solo lee; `anon` sin permisos. Se carga por nombre de categoría.
- **`get_inventory_suggestions()`**, `plpgsql stable security invoker`, `search_path = ''`:
  1. Sin `auth.uid()`: 42501.
  2. `find_general_list_id()`; sin lista: vacío.
  3. Compras: `list_items` tachados de esa lista, con su producto madre y su día.
  4. Por producto: la presentación de la última compra, la última fecha, los días distintos y el rango.
  5. Duración: promedio si hay 2 días o más; si no, la categoría o 14.
  6. Filtra lo vencido, lo de hace más de 180 días y lo pendiente; ordena y corta en 20.
- Prueba: `supabase/tests/061_inventory_suggestions.test.sql` (rollback al final).

## Decisiones

| # | Decisión | Por qué |
|---|---|---|
| D1 | Calcular al momento, sin tabla de inventario | Nada de SCRUM-102 lo elige el usuario: todo sale de lo tachado. La tabla llega con SCRUM-103 |
| D2 | Por producto, con la presentación de la última compra | Coincide con `household_inventory_items` (por producto). Comprar 1 L y 2 L es el mismo consumo |
| D3 | Duración por categoría en una tabla, no en el código | El PO la puede ajustar sin una PR |
| D4 | 14 días sin categoría | Valor medio entre los de las categorías; los productos personales no siempre tienen categoría |
| D5 | Ventana de 180 días | Lo que no se compra hace medio año probablemente ya no se usa |
| D6 | Si falla, no se muestra nada | CA-03: la lista no depende de las sugerencias |
| D7 | Componente propio montado en `ShoppingListInner` | La lista no cambia su ViewModel; las sugerencias tienen el suyo |

## Front

```
features/inventory-suggestions/
  InventorySuggestions.tsx                    región + fila deslizable
  components/InventorySuggestionCard.tsx      tarjeta (presentacional)
  components/models/InventorySuggestionCardProps.interface.ts
  constants/inventory-suggestions.constants.ts
  hooks/useInventorySuggestionsViewModel.ts   carga una vez; error → []
  models/InventorySuggestion.interface.ts
  models/InventorySuggestionCardViewModel.interface.ts
  models/InventorySuggestionsViewModel.interface.ts
  services/inventory-suggestions.service.ts   ensureSession + rpc
  utils/toInventorySuggestions.ts             fila → modelo
  utils/toLastPurchaseText.ts                 "Lo compraste hace N días"
```

`types/database.types.ts` suma la tabla y la RPC.

## Pruebas

- Unitarias: `toLastPurchaseText`, el servicio y el componente con su Page Object (carga, vacío, error).
- E2E: [E2E.md](E2E.md).
- SQL: la prueba de la 061.

## SCRUM-104: confirmar o descartar

### Datos: migración `064_dismiss_inventory_suggestions.sql`

- `inventory_suggestion_dismissals` (`list_id`, `product_catalog_id`, `dismissed_until`, `dismissed_by`, `updated_at`; PK lista + producto). RLS: lectura de listas visibles; sin escritura directa.
- `dismiss_inventory_suggestion(target_variant_id)`: `security definer`, `search_path = ''`; valida sesión, presentación y lista; `insert ... on conflict do update` con ahora + 7 días.
- `get_inventory_suggestions()`: la de la `063` más `not exists` de lo pospuesto.
- Prueba: `supabase/tests/064_dismiss_inventory_suggestions.test.sql`.

### Front

- `InventorySuggestions` recibe `onConfirm` (el `addItem` de la lista) y `pendingVariantIds` (`models/InventorySuggestionsProps.interface.ts`).
- `useInventorySuggestionsViewModel`: saca la tarjeta al tocar; si el ✓ devuelve `false` o la ✕ falla, la devuelve con el mensaje.
- `InventorySuggestionCard`: ✓ y ✕ con nombre accesible.
- `useShoppingList.addItem` devuelve `true`/`false`; `useShoppingListViewModel` expone `onConfirmSuggestion` y `pendingVariantIds`.

### Decisiones

| # | Decisión | Por qué |
|---|---|---|
| D8 | El ✓ usa el `addItem` de la lista | Aparece en "Pendientes" sin recargar y con el mismo manejo de errores que el buscador |
| D9 | La ✕ por producto, 7 días, por lista | Decidido con el equipo: pospone para toda la familia; vence solo, así no es permanente |
| D10 | Tabla sin escritura directa y función `security definer` | Nadie puede posponer para siempre ni en otra lista |
| D11 | Ocultar lo pendiente también en el cliente | La base no lo sabe si se agregó después de cargar la fila; evita sumar otra unidad con el ✓ |
