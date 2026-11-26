# Tasks — SCRUM-138

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md). Orden sugerido; cada tarea termina en un punto de validación.

- [X] **1. Confirmar las 8 filas reales de SPEC §2** con una query de solo lectura contra `scrap-bd` (sin autorización especial, es `select`), para verificar que el texto exacto no cambió desde que se escribió el ticket.
  - Validación: las 8 filas siguen `rejected` con los mismos `scraped_size_text`.
- [X] **2. Coordinar el número de migración** y escribir `supabase/migrations/042_fix_parse_size_text_units.sql` (plan.md §2).
- [X] **3. Probar con `begin...rollback`** las 8 queries de SPEC §2 más los casos de regresión (plan.md §4), ajustando el regex hasta que las 8 parseen correctamente sin romper ningún caso existente.
- [X] **4. Escribir `supabase/tests/042_fix_parse_size_text_units.test.sql`** (plan.md §4).
- [X] **5. Confirmar el caso de multipack `6p`/`5p`** — confirmado: "6p 6000gr" parsea (g, 6000), el "6p" no se cuela como base_quantity. No hizo falta ningún ajuste al regex. (plan.md §3) y documentar el resultado acá (si hizo falta algún ajuste o no).
- [X] **6. Aplicar la migración en serio** — aplicada 2026-11-02 por Daniel contra `scrap-bd`, con autorización explícita y aviso al grupo del número 042. Verificado: `042/fix_parse_size_text_units` en `supabase_migrations.schema_migrations`; las filas reales de SPEC §2 que seguían `rejected` ya parsean correctamente (`500grea`→`(g,500)`, `1 gal`→`(ml,3785)`, `60 Gr`→`(g,60)`, `8 uds`→`(unidad,8)`).
- [X] **7. Subagentes de revisión** antes de QA: `code-reviewer` (la función plpgsql y el test SQL).
- [X] **8. Completar la PR:** descripción con la plantilla del repo, label `in progress` → `waiting qa`, mover la tarjeta de Jira. Mencionar en la descripción que SCRUM-139 es el otro prerequisito de SCRUM-132 y que ambos se coordinaron juntos.
