# Tasks — SCRUM-138

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md). Orden sugerido; cada tarea termina en un punto de validación.

- [ ] **1. Confirmar las 8 filas reales de SPEC §2** con una query de solo lectura contra `scrap-bd` (sin autorización especial, es `select`), para verificar que el texto exacto no cambió desde que se escribió el ticket.
  - Validación: las 8 filas siguen `rejected` con los mismos `scraped_size_text`.
- [ ] **2. Coordinar el número de migración** y escribir `supabase/migrations/0NN_fix_parse_size_text_units.sql` (plan.md §2).
- [ ] **3. Probar con `begin...rollback`** las 8 queries de SPEC §2 más los casos de regresión (plan.md §4), ajustando el regex hasta que las 8 parseen correctamente sin romper ningún caso existente.
- [ ] **4. Escribir `supabase/tests/0NN_fix_parse_size_text_units.test.sql`** (plan.md §4).
- [ ] **5. Confirmar el caso de multipack `6p`/`5p`** (plan.md §3) y documentar el resultado acá (si hizo falta algún ajuste o no).
- [ ] **6. Aplicar la migración en serio** — autorización explícita de Daniel y aviso al grupo antes de correrla.
  - Validación: `select version, name from supabase_migrations.schema_migrations order by version;` incluye la fila nueva; las 8 filas de staging, si siguen en `rejected`, se pueden re-normalizar manualmente para confirmar que ahora matchean (no reemplaza la corrida real de SCRUM-132).
- [ ] **7. Subagentes de revisión** antes de QA: `code-reviewer` (la función plpgsql y el test SQL).
- [ ] **8. Completar la PR:** descripción con la plantilla del repo, label `in progress` → `waiting qa`, mover la tarjeta de Jira. Mencionar en la descripción que SCRUM-139 es el otro prerequisito de SCRUM-132 y que ambos se coordinaron juntos.
