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

## SCRUM-104: confirmar o descartar una sugerencia

- [x] 10. Migración `064` (tabla, `dismiss_inventory_suggestion`, `get_inventory_suggestions` sin lo pospuesto) y su prueba SQL.
- [x] 11. Tipos, constantes, servicio `dismissInventorySuggestion`, ViewModel con ✓ y ✕, tarjeta con botones.
- [x] 12. `addItem` devuelve si agregó; `onConfirmSuggestion` y `pendingVariantIds` en la lista.
- [x] 13. Pruebas unitarias y E2E-INV-05 a 07. Corregido de paso: los nombres ocultos de los botones agrandaban la página (tarjeta `relative`).
- [ ] 14. Avisar al equipo el número 064, aplicarla (después de la 063) y correr su prueba SQL.
- [ ] 15. Validar a mano: ✓ agrega con cantidad 1; ✕ saca la tarjeta y no vuelve al recargar; en familia, para los dos miembros.
- [x] 16. Revisar con `code-reviewer`, `security-reviewer` y `qa-checker`. Corregido: la ✕ solo acepta una presentación con historial en la lista (no sirve para saber si existe una ajena); textos del Page Object desde las constantes; el ✓ que rechaza devuelve la tarjeta. Tests nuevos: por producto y lectura con RLS (SQL), pendiente agregado después de cargar y ✓ que rechaza (unitarios), el buscador busca con la fila a la vista (E2E-INV-07). Diferencia aceptada: el cliente oculta lo pendiente por presentación (SPEC regla 15).
