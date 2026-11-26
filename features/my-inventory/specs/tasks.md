# Tareas: MyInventory

Deriva de [plan.md](plan.md).

## SCRUM-105: ver mi inventario completo

- [x] 1. Migración `065` (`inventory_estimates`, `get_inventory_suggestions` sobre ella, `get_my_inventory`) y su prueba SQL.
- [x] 2. Tipos, ruta `/lista/inventario`, constantes, modelos, servicio y utilidades (`calendarDaysBetween` compartida).
- [x] 3. ViewModel, `InventoryGroupSection` y `MyInventory`.
- [x] 4. Enlaces desde el encabezado de General y desde la fila de sugerencias.
- [x] 5. Pruebas unitarias y E2E-MINV-01 a 03.
- [x] 6. Avisar al equipo el número 065, aplicarla (después de la 064) y correr su prueba SQL.
- [x] 7. Validar a mano con productos de distintas fechas y chips.
- [x] 8. Revisar con `code-reviewer`, `security-reviewer` y `qa-checker`. Corregido: lo pospuesto con la ✕ ("todavía lo tengo") aparece en el inventario, en "Vence pronto" (antes no salía en ningún lado); lo que se acabó y está pendiente queda fuera de los dos, escrito en la SPEC; texto neutro del error sin sesión; orden de los tipos; enlace exacto en el E2E; estado del ViewModel con guard clauses. Tests nuevos: permisos, 42501 de las sugerencias, familia, 180 días, archivado, borde exacto y empate por nombre (SQL); `toDaysLeft` (unitario); E2E-MINV-04 (entrada desde la fila de sugerencias).
- [x] 9. Después del merge de #121 y #122: traer `develop` y resolver los conflictos de `InventorySuggestions.tsx`, sus constantes y tests, `ShoppingListInner.tsx`, `types/database.types.ts` y `docs/documento-proyecto.md` (dejar las dos partes); volver a correr todos los tests y los E2E de sugerencias e inventario.

## SCRUM-106: "Ya se acabó" y ajustar la fecha

- [x] 1. SPEC §16, plan y tareas.
- [x] 2. Migración `067` (tabla `inventory_adjustments`, función interna, `mark_inventory_item_used_up`, `adjust_inventory_item`, `inventory_estimates` con el ajuste) y su prueba SQL.
- [x] 3. Tipos, constantes y servicio.
- [x] 4. ViewModel con las acciones por fila, `InventoryItemRow` con los chips de SCRUM-103.
- [x] 5. Pruebas unitarias y E2E-MINV-05 y 06.
- [ ] 6. Avisar al equipo el número 067, aplicarla (después de la 065) y correr su prueba SQL.
- [ ] 7. Validar a mano: "Ya se acabó" pasa a "¿Se te acabó?"; cada chip; volver a comprar; en familia.
- [x] 8. Revisar con `code-reviewer`, `security-reviewer` y `qa-checker`. Seguridad sin hallazgos (se agregó `service_role` al revoke de la interna). Corregido: el foco ya no se pierde (título después de "Ya se acabó"; "Ajustar fecha" después de un chip) y se avisa al lector de pantalla; si falla la recarga después de un chip, la lista queda y solo esa fila avisa; botones de 40 px; sin sangría doble en los chips. Escrito en la SPEC: desmarcar la compra, tope de 20 sugerencias, sin tiempo real. Tests nuevos: foco y avisos, un solo panel de chips, "No vence", error en una sola fila con reintento, recarga fallida (unitarios); la ✕ después de "Ya se acabó" y el chip que borra lo pospuesto (SQL).
