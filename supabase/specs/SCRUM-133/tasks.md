# Tasks — SCRUM-133

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md). Cada tarea termina en un punto de validación.

- [x] **0. Prerequisitos**: SCRUM-131 Done; ingesta de SCRUM-132 corrida (última el 2026-11-15) y cubre todas las madres del mapeo (SPEC §3.1).
- [x] **1. Re-verificar cifras y clasificar** contra la base (SPEC §2), solo lectura.
- [x] **2. Mapeos** de ingredientes (SPEC §3.1) y de ítems de lista (SPEC §3.2), con choques calculados: 0 en recetas, 1 en listas.
- [x] **3. Migración** `supabase/migrations/048_reset_catalog_old_mothers.sql` (plan §2). Número 048 libre al 2026-11-15 (base hasta 047, ninguna rama abierta con 048).
  - Validación (solo lectura, mismos `values` de la migración): todos los nombres del mapeo existen, todos los destinos existen, 0 referencias fuera del mapeo.
- [x] **4. Test SQL** `supabase/tests/048_reset_catalog_old_mothers.test.sql` (plan §4).
- [x] **5. Seed** `supabase/seed-demo-recipes.sql` con madres curadas (SPEC §3.1); el `join` ahora se limita al catálogo global (un producto propio puede llamarse "Leche").
  - Validación: los 7 nombres existen exactamente una vez en el catálogo global.
- [ ] **6. Backup** local fuera del repo (plan §3 paso 1).
- [ ] **7. Ensayo** migración + test dentro de `begin ... rollback` (plan §3 paso 2).
  - Validación: el `raise notice` da 36 recetas demo; ingredientes 1996 movidos y 1 borrado (2096 − 99 de las recetas demo − Magnesia); ítems 1 fusionado, 48 movidos y 25 borrados; 28 madres. El test imprime `048: 6 casos OK`. Cifras al 2026-11-15: si cambian, explicar la diferencia antes de aplicar.
- [ ] **8. Aviso al grupo y aplicar** la migración con su fila del historial (plan §3 pasos 3-4).
- [ ] **9. Verificar** (plan §4).
- [ ] **10. Reporte** `docs/catalogo-scraping/reporte-reset-SCRUM-133.md`.
- [ ] **11. Revisión**: subagentes `code-reviewer` y `security-reviewer`.
- [ ] **12. PR**: plantilla completa, Developer Notes con el aviso (SPEC §6), `in progress` → `waiting qa` y tarjeta de Jira.
