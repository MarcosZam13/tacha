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
