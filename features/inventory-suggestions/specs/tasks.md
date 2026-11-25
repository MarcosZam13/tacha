# Tareas: InventorySuggestions

Deriva de [plan.md](plan.md).

## SCRUM-102: ver sugerencias de inventario

- [x] 1. Migración 061: `category_shelf_life` y `get_inventory_suggestions`, y su prueba SQL.
- [x] 2. Tipos en `types/database.types.ts`.
- [x] 3. Constantes, modelos, servicio y utilidades.
- [x] 4. ViewModel y componentes; montaje en `ShoppingListInner`.
- [x] 5. Pruebas unitarias y E2E-INV-01 a 04.
- [ ] 6. Avisar al equipo el número 061, aplicar la migración y correr la prueba SQL.
- [ ] 7. Confirmar con el PO las duraciones por categoría.
- [ ] 8. Validar con datos reales: tachar, fechar una fila propia de prueba y ver la sugerencia.
- [x] 9. Revisar con `code-reviewer`, `security-reviewer` y `qa-checker`. Corregido: día de Costa Rica, productos archivados, permisos explícitos de `category_shelf_life`, orden sin posición, fila debajo de la barra del modo compra, casos SQL (mismo día a horas distintas, borde de la duración, aislamiento con lista propia) y E2E que esperan la respuesta de la RPC.
