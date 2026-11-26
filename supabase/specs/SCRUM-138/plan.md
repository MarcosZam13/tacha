# Plan — SCRUM-138

Ver [SPEC.md](SPEC.md). Skills que aplican: `clean-code-practices` (función plpgsql no trivial), `constants-standards` (el factor de conversión de galón no puede ser un número mágico suelto).

## 1. Archivos nuevos/tocados

```
supabase/migrations/0NN_fix_parse_size_text_units.sql   ← nuevo (número a coordinar)
supabase/tests/0NN_fix_parse_size_text_units.test.sql    ← nuevo, mismo patrón que 020
```

## 2. Cambios a `parse_size_text` (migración nueva, `create or replace function`)

Agregar antes del branch de "UNIDADES" existente (mismo estilo que los branches actuales, `regexp_match` + `\M`):

```sql
-- GRAMOS: agregar alias "gr" al patrón existente (antes era solo g|gramo|gramos)
-- y tolerar el sufijo de ruido "ea" de VTEX (ver SPEC §2 — causa raíz confirmada
-- en el código, no en nuestro scraping): "500grea" debe matchear igual que "500g".
match_groups := regexp_match(normalized, '(\d+\.?\d*)\s*(g|gr|gramo|gramos)(ea)?\M');
if match_groups is not null then
  quantity := match_groups[1]::numeric;
  return query select 'g'::text, quantity;
  return;
end if;

-- GALONES: "1 gal", "1 galon", "1 galones" → ml (factor documentado, no mágico)
-- 1 gal (US líquido) ≈ 3785 ml — mismo patrón que litros→ml, kg→g.
match_groups := regexp_match(normalized, '(\d+\.?\d*)\s*(gal|galon|galones)\M');
if match_groups is not null then
  quantity := match_groups[1]::numeric;
  return query select 'ml'::text, (quantity * 3785)::numeric;
  return;
end if;

-- UNIDADES: agregar alias "uds" al patrón existente de unidad/u/und
-- (branch ya existente, solo se extiende la alternancia del regex)
```

El factor `3785` se deja como literal comentado (mismo estilo que el resto de la función, que ya usa `* 1000` para litros→ml y kg→g sin una tabla de constantes aparte) — revisar contra `constants-standards` si el equipo prefiere una tabla `unit_conversions` en vez de literales en la función; de momento se sigue el patrón ya establecido por consistencia con el resto de `parse_size_text`.

**Orden de los branches importa:** el de gramos (con el `(ea)?` opcional) debe ir antes que cualquier branch que pudiera matchear parcialmente "500grea" de otra forma — revisar que el regex engine de Postgres no haga backtracking raro con la alternancia `g|gr|...` (probar explícitamente "500gr" y "500gramos" además de "500grea" en el test, para confirmar que `g|gr` no corta "gramos" a mitad de palabra gracias al `\M` final).

## 3. Multipack (`6p`, `5p`) — solo confirmar, no necesariamente cambiar

Correr `parse_size_text` contra "Arroz Precocido Tio Pelon 6p 6000gr" con los patrones nuevos y confirmar que el resultado es `('g', 6000)`, no algo derivado de "6p". Si el regex de gramos encuentra "6000gr" como su primer match en el string (`regexp_match` sin flag global devuelve el primer match de izquierda a derecha), "6p" nunca entra en juego porque no hay ningún branch que reconozca "p" como unidad — documentar el resultado en `tasks.md`, no hace falta tocar código si se confirma que no rompe nada.

## 4. Tests (`supabase/tests/0NN_fix_parse_size_text_units.test.sql`, mismo patrón que `020_curated_mothers.test.sql`)

Casos:
- Las 8 filas reales de SPEC §2, con su `scraped_size_text` exacto → unidad/cantidad esperada.
- Regresión: 2-3 casos que ya funcionaban antes (`"1 Litro"`, `"500 ml"`, `"1 kg"`) siguen devolviendo lo mismo.
- `"6p 6000gr"` → `('g', 6000)`, confirmando que el multipack no se cuela.

## 5. Verificación final (antes de pasar a `waiting qa`)

- `begin...rollback` contra la base real, corriendo las 8 queries de SPEC §2 antes y después del `create or replace`.
- `supabase/tests/0NN_fix_parse_size_text_units.test.sql` pasa completo.
- `select version, name from supabase_migrations.schema_migrations order by version;` incluye la fila nueva.
