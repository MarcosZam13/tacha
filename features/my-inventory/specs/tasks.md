# Tareas: MyInventory

Deriva de [plan.md](plan.md).

## SCRUM-105: ver mi inventario completo

- [x] 1. Migración `065` (`inventory_estimates`, `get_inventory_suggestions` sobre ella, `get_my_inventory`) y su prueba SQL.
- [x] 2. Tipos, ruta `/lista/inventario`, constantes, modelos, servicio y utilidades (`calendarDaysBetween` compartida).
- [x] 3. ViewModel, `InventoryGroupSection` y `MyInventory`.
- [x] 4. Enlaces desde el encabezado de General y desde la fila de sugerencias.
- [x] 5. Pruebas unitarias y E2E-MINV-01 a 03.
- [ ] 6. Avisar al equipo el número 065, aplicarla (después de la 064) y correr su prueba SQL.
- [ ] 7. Validar a mano con productos de distintas fechas y chips.
- [x] 8. Revisar con `code-reviewer`, `security-reviewer` y `qa-checker`. Corregido: lo pospuesto con la ✕ ("todavía lo tengo") aparece en el inventario, en "Vence pronto" (antes no salía en ningún lado); lo que se acabó y está pendiente queda fuera de los dos, escrito en la SPEC; texto neutro del error sin sesión; orden de los tipos; enlace exacto en el E2E; estado del ViewModel con guard clauses. Tests nuevos: permisos, 42501 de las sugerencias, familia, 180 días, archivado, borde exacto y empate por nombre (SQL); `toDaysLeft` (unitario); E2E-MINV-04 (entrada desde la fila de sugerencias).
- [ ] 9. Después del merge de #121 y #122: traer `develop` y resolver los conflictos de `InventorySuggestions.tsx`, sus constantes y tests, `ShoppingListInner.tsx`, `types/database.types.ts` y `docs/documento-proyecto.md` (dejar las dos partes); volver a correr todos los tests y los E2E de sugerencias e inventario.
