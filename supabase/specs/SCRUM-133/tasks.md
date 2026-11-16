# Tasks — SCRUM-133

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md). Cada tarea termina en un punto de validación.

- [x] **0. Prerequisitos**: SCRUM-131 Done; ingesta de SCRUM-132 corrida (última el 2026-11-15) y cubre todas las madres del mapeo (SPEC §3.1).
- [x] **1. Re-verificar cifras y clasificar** contra la base (SPEC §2), solo lectura.
- [x] **2. Mapeos** de ingredientes (SPEC §3.1) y de ítems de lista (SPEC §3.2), con choques calculados: 0 en recetas, 1 en listas.
- [ ] **3. Migración** `supabase/migrations/NNN_reset_catalog_old_mothers.sql` (plan §2), con número libre confirmado.
- [ ] **4. Test SQL** `supabase/tests/NNN_reset_catalog_old_mothers.test.sql` (plan §4).
- [ ] **5. Seed** `supabase/seed-demo-recipes.sql` con madres curadas (SPEC §3.1).
  - Validación: los 11 nombres existen como madres curadas.
- [ ] **6. Backup** local fuera del repo (plan §3 paso 1).
- [ ] **7. Ensayo** migración + test dentro de `begin ... rollback` (plan §3 paso 2).
  - Validación: conteos iguales a SPEC §2/§3.2 (o diferencias explicadas).
- [ ] **8. Aviso al grupo y aplicar** la migración con su fila del historial (plan §3 pasos 3-4).
- [ ] **9. Verificar** (plan §4).
- [ ] **10. Reporte** `docs/catalogo-scraping/reporte-reset-SCRUM-133.md`.
- [ ] **11. Revisión**: subagentes `code-reviewer` y `security-reviewer`.
- [ ] **12. PR**: plantilla completa, Developer Notes con el aviso (SPEC §6), `in progress` → `waiting qa` y tarjeta de Jira.
