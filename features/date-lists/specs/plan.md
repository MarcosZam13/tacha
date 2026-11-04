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
