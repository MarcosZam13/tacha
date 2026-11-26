# Plan: MyInventory (SCRUM-105)

Deriva de [SPEC.md](SPEC.md).

## Datos: migración `065_my_inventory.sql`

- `inventory_estimates()`: el cálculo de la 061/063 por producto, con `expected_out_at` (null sin fecha), `is_pending` y `is_dismissed`. `security invoker`, `search_path = ''`.
- `get_inventory_suggestions()`: `language sql` sobre `inventory_estimates`: vencido, sin pendiente ni pospuesto, orden y tope de 20 (igual que la 064).
- `get_my_inventory()`: sin fecha o que todavía no se acaba; orden por fecha (sin fecha al final) y nombre; tope de 200.
- Prueba: `supabase/tests/065_my_inventory.test.sql`.

## Front

```
app/(app)/lista/inventario/page.tsx
features/my-inventory/
  MyInventory.tsx                       pantalla
  components/InventoryGroupSection.tsx  un grupo (presentacional)
  components/models/InventoryGroupSectionProps.interface.ts
  constants/my-inventory.constants.ts   RPC, estados, grupos, cortes y textos
  hooks/useMyInventoryViewModel.ts      carga, reintentar y estado
  models/InventoryItem.interface.ts
  models/MyInventoryViewModel.interface.ts
  services/my-inventory.service.ts      ensureSession + rpc
  utils/toDaysLeft.ts                   días que quedan
  utils/toInventoryGroups.ts            grupo, texto y agrupado
utils/calendarDaysBetween.ts            compartido con inventory-suggestions
```

Cambian: `constants/routes.constants.ts` (`LIST_INVENTORY`), `ShoppingListInner` (enlace del encabezado), `InventorySuggestions` (enlace de la fila), `toLastPurchaseText` (usa `calendarDaysBetween`) y `types/database.types.ts`.

## Decisiones

| # | Decisión | Alternativa | Por qué esta |
|---|---|---|---|
| D1 | Una función con el cálculo (`inventory_estimates`) | Copiar el cálculo en `get_my_inventory` | Ya se copió tres veces; así el inventario y las sugerencias nunca dicen cosas distintas |
| D2 | Agrupar en el cliente | Devolver el grupo desde la base | Los días se cuentan en el calendario del navegador, como "Lo compraste hace N días" |
| D3 | Cuarto grupo "Más adelante" | Meterlo en "Este mes" o no mostrarlo | Decidido con el equipo: lo otro engaña o esconde lo que hay en casa |
| D4 | Lo pendiente se muestra | Ocultarlo como en las sugerencias | Comprar más no quiere decir que se acabó |
| D5 | Enlaces desde General | Menú "Más" | El menú no existe todavía; es un cambio de toda la navegación |

## SCRUM-106: "Ya se acabó" y ajustar la fecha

### Datos: migración `067_adjust_inventory_items.sql`

- Tabla `inventory_adjustments` (lista, producto, la compra a la que se ata, `used_up` o `adjusted`, chip, fecha). RLS de lectura por listas visibles; sin escritura directa.
- `save_inventory_adjustment(...)`: interna, `security definer`, sin `execute` para nadie. Valida sesión, lista general y que la presentación esté en ella con una compra; guarda y borra lo pospuesto con la ✕.
- `mark_inventory_item_used_up(uuid)` y `adjust_inventory_item(uuid, text)`: las dos de la pantalla, sobre la interna.
- `inventory_estimates()`: el join con el ajuste de la última compra.
- Prueba: `supabase/tests/067_adjust_inventory_items.test.sql`.

### Front

```
features/my-inventory/
  components/InventoryItemRow.tsx                  nuevo: un producto con sus dos acciones y los chips
  components/models/InventoryItemRowProps.interface.ts
  components/InventoryGroupSection.tsx             usa InventoryItemRow
  hooks/useMyInventoryViewModel.ts                 acciones por fila
  services/my-inventory.service.ts                 markInventoryItemUsedUp, adjustInventoryItem
  constants/my-inventory.constants.ts              RPC y textos
```

Reutiliza `ShelfLifeChips` y `SHELF_LIFE_CHOICE` de `features/shopping-list/` (SCRUM-103), importados por alias.

### Decisiones

| # | Decisión | Alternativa | Por qué esta |
|---|---|---|---|
| D6 | Tabla aparte `inventory_adjustments` | Cambiar `shelf_life_choice` de la última compra en `list_items` | CA-03: no se toca la compra. Además "ya se acabó" no tiene dónde ir en `list_items` |
| D7 | No usar `household_inventory_items` (documento §6) | Crear esa tabla con `status` y `expires_at` | El inventario se calcula al momento desde las compras (065); una tabla con cada producto copiaría ese cálculo y se desfasaría. Esta solo guarda lo que el usuario corrigió. SCRUM-107 decide cómo guardar lo agregado a mano |
| D8 | El chip cuenta desde ahora | Desde la última compra | Responde "¿cuánto me queda?"; desde la compra, "pocos días" en algo comprado hace 10 días lo mandaría a sugerencias |
| D9 | El ajuste se ata a la última compra | Que dure para siempre | Una compra nueva es otra unidad con su propia duración (decidido con Melany el 2026-11-26) |
| D10 | "Ya se acabó" = se acaba ahora → sugerencia | Sacarlo de los dos lugares | Si se acabó, lo lógico es reponerlo (decidido con Melany el 2026-11-26) |
| D11 | Una función interna para validar y guardar | Copiar la validación en las dos | Una sola validación de seguridad que revisar |
| D12 | "Ya se acabó" esconde la fila antes de que responda la base | Esperar la respuesta | CA-01 "de inmediato"; si falla, vuelve con el error (como el ✓ de SCRUM-104) |
| D13 | Importar `ShelfLifeChips` y `SHELF_LIFE_CHOICE` desde `features/shopping-list/` | Moverlos ya a `components/` y `constants/` | CA-02 pide los mismos chips; moverlos toca SCRUM-103 entero y sus tests. A decidir con el equipo; si se acepta mover, ticket aparte |
| D14 | El texto "No se pudo guardar. Intenta de nuevo." se repite en esta feature | Importarlo de `shopping-list` | Es el texto de esta pantalla; si cambia uno, no tiene por qué cambiar el otro |

## SCRUM-107: agregar algo a mano

### Datos: migración `068_manual_inventory_items.sql`

- Tabla `inventory_manual_items` (lista, presentación, chip opcional, quién y cuándo). Una fila por cada vez que se agrega. RLS de lectura por listas visibles; sin escritura directa.
- `add_inventory_item(uuid, text default null)`: `security definer`. Sesión, chip válido, lista con `ensure_general_list_id` y que el producto sea uno que esa lista puede usar (032, 066). Guarda la fila.
- `inventory_estimates()`: las llegadas son lo tachado más lo agregado (`union all`).
- `save_inventory_adjustment(...)`: busca la presentación y la última llegada en las dos tablas, así "Ya se acabó" y "Ajustar fecha" sirven para lo agregado.
- Prueba: `supabase/tests/068_manual_inventory_items.test.sql`.

### Front

```
features/my-inventory/
  components/AddInventoryItemPanel.tsx                 nuevo: buscador, chips y Agregar/Cancelar
  components/models/AddInventoryItemPanelProps.interface.ts
  hooks/useAddInventoryItem.ts                         nuevo: estado del panel (usa hooks/useProductSearch)
  models/AddInventoryItemViewModel.interface.ts
  hooks/useMyInventoryViewModel.ts                     el panel, OBS-1 y OBS-2 de la #124
  MyInventory.tsx                                      el botón, el panel y el foco al cerrarlo
  services/my-inventory.service.ts                     addInventoryItem
```

Reutiliza `components/product-search/ProductSearch` y `hooks/useProductSearch` (compartidos) y `ShelfLifeChips` (D13).

### Decisiones

| # | Decisión | Alternativa | Por qué esta |
|---|---|---|---|
| D15 | Tabla `inventory_manual_items` con una fila por llegada | Una fila por producto en una tabla de inventario (`household_inventory_items`) | Igual que en D7: el inventario se calcula desde las llegadas. Así lo agregado entra al mismo cálculo y CA-02 se cumple sin código aparte |
| D16 | Lo agregado cuenta como una llegada (también para el promedio) | Que solo fije una fecha | "Las sugerencias también lo tengan en cuenta" (HU-71d); es lo mismo que comprarlo fuera de Tacha |
| D17 | Buscador del catálogo global (el de la lista) | `searchCatalogIncludingOwn` (con personales) | Es el que usa la lista general, y evita ofrecer en una familia un producto personal que la base va a rechazar. Los personales quedan fuera de alcance |
| D18 | Validar en la base qué producto puede usar la lista | Confiar en el buscador | La función es `security definer`: sin esta revisión aceptaría cualquier presentación |
| D19 | `ensure_general_list_id` (crea la lista si falta) | `find_general_list_id` y error si no hay | Alguien puede empezar por el inventario antes de usar la lista |
| D20 | Panel en la misma pantalla | Una pantalla nueva | Es un paso corto; así el producto aparece en su grupo sin navegar |
