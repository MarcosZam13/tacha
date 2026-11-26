# Plan: SCRUM-77

1. Migración 038 con su prueba SQL: columnas, check, índice y 2 RPC.
2. `create_date_list` es `security definer`, igual que `ensure_general_list_id`: la política de insert de `lists` solo admite la lista general. Las reglas se comprueban dentro de la función.
3. `add_item_to_date_list` es `security invoker`: la RLS decide qué lista se ve, y una lista ajena no se encuentra.
4. Feature `features/date-lists`: servicio, dos hooks ViewModel y componentes de presentación.
5. Reutiliza `ProductSearch`, `useProductSearch`, `QuantityStepper`, `Modal`, `Input` y `changeListItemQuantity`. Tras agregar, cambiar o eliminar se vuelve a leer la lista: es lo más simple de defender y todavía no hay tachado ni modo compra que pidan actualización fina.
6. Ruta en `APP_ROUTE` y entrada "Fechas" en la navegación, después de General (DESIGN §3.1).

## SCRUM-76: calendario

- `utils/calendarMonth.ts`: funciones puras del mes, sin React y sin `new Date(texto)`.
- `hooks/useDateCalendar.ts`: solo guarda el mes visible. Días y agenda se calculan de `lists` en cada render.
- `components/DateCalendar.tsx`: presentación. Reutiliza `useCreateDateListForm` con una fecha inicial.
- Sin librería de calendario: una grilla de 7 columnas y una función de 30 líneas alcanzan.

## SCRUM-78: estado

- `supabase/migrations/043_date_list_status.sql`: trigger que deriva "completada", RPC para cancelar y reactivar, y `add_item_to_date_list` que ya acepta completadas.
- `services/date-lists.service.ts`: el detalle trae también los tachados. Tachar reutiliza `set_list_item_checked`, la misma RPC de la lista general.
- `hooks/useDateListDetailViewModel.ts`: sigue el patrón de `runChange`, que vuelve a leer la sublista. Por eso el estado nuevo aparece sin que el cliente lo calcule.
- `components/ui/checkbox`: recibe `ariaLabel` e `isDisabled`, porque en la fila no hay texto visible al lado.

## SCRUM-79: total de gasto

- `supabase/migrations/050_date_list_spent_total.sql`: columna `lists.spent_total` con su `check`, y la RPC `set_date_list_total(target_list_id, new_total)`. `security definer` con `search_path` vacío, como `set_date_list_cancelled` (043): misma regla de acceso, mismo error si no existe o no es suya (P0002), y 55000 si está cancelada.
- `supabase/tests/050_date_list_spent_total.test.sql`: pruebas con rollback (acceso, cancelada, montos inválidos, permisos).
- `services/date-lists.service.ts`: `spent_total` en los dos `select` y `setDateListTotal`.
- `hooks/useDateListTotalEditor.ts`: el estado del campo (abierto, texto, error), aparte del ViewModel del detalle para no inflarlo. Guarda con el mismo `runChange`, que vuelve a leer la sublista.
- `components/DateListTotal.tsx`: muestra el total o "Sin total" y el lápiz; abierto, el campo con Guardar y Cancelar. Valida con `parseColonesAmount` y muestra con `formatColones`, los dos de `features/finance/utils/`, por alias. No se mueven a `utils/` para no tocar archivos de Finanzas mientras #102 (SCRUM-93) está abierto.
- `components/DateListCard.tsx`: "· ₡12 500" junto a la fecha cuando hay total.
