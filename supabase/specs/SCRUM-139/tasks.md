# Tasks — SCRUM-139

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md). Orden sugerido; cada tarea termina en un punto de validación.

- [x] **1. Confirmar el umbral de "prefijo ancho"** contra los 12 prefijos reales de `supabase/data/madres.json` (SPEC §3, plan.md §2): 8 anchos y 4 de 3 segmentos. Las 12 tienen `match_keywords` no vacíos. Si se agregan madres a `madres.json` antes de aplicar, repetir el chequeo.
- [x] **2. Escribir `supabase/migrations/044_fix_normalize_staging_tiebreak.sql`** (plan.md §2 y §2b). Número coordinado con el grupo: la `043` corresponde a otra historia y sus objetos ya están en la base (verificado 2026-11-05).
- [x] **3. Probar con `begin...rollback`** contra la base real: los casos sintéticos de empate (las dos ramas) y de over-matching (plan.md §4), más las 2 filas `pending` que conservan categorías (plan.md §5).
- [x] **4. Escribir `supabase/tests/044_fix_normalize_staging_tiebreak.test.sql`** (plan.md §4), incluido correr los casos de empate más de una vez para confirmar determinismo.
- [x] **5. Chequeo estático de regresión** sobre las filas `matched` (plan.md §5): solo cambian las del efecto conocido de SPEC §4.
- [ ] **6. Aplicar la migración en serio**, con autorización explícita de Daniel y aviso al grupo antes de correrla.
  - Validación: `select version, name from supabase_migrations.schema_migrations order by version;` incluye la fila nueva.
- [ ] **7. Subagentes de revisión** antes de QA: `code-reviewer` (la función plpgsql y el test SQL).
- [ ] **8. Completar la PR:** descripción con la plantilla del repo, label `in progress` → `waiting qa`, mover la tarjeta de Jira. Mencionar en la descripción que SCRUM-138 es el otro prerequisito de SCRUM-132 y que ambos se coordinaron juntos.
