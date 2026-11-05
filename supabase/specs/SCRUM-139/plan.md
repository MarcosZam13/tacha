# Plan — SCRUM-139

Ver [SPEC.md](SPEC.md). Skills que aplican: `clean-code-practices` (función plpgsql no trivial, cuidado con la condición nueva).

## 1. Archivos nuevos/tocados

```
supabase/migrations/044_fix_normalize_staging_tiebreak.sql   ← nuevo (número coordinado con el grupo; la 043 corresponde a otra historia)
supabase/tests/044_fix_normalize_staging_tiebreak.test.sql    ← nuevo, mismo patrón que 020
```

La migración hace `create or replace function normalize_staging_row` con el cuerpo completo de `020`. Solo cambian los dos `select ... into v_product_id` (§2 y §2b). Además, vuelve a aplicar el hardening de `020` (`search_path`, `revoke execute`) después del `create or replace`, igual que hizo `042`.

## 2. Cambios a la rama de categoría de `normalize_staging_row`

Bloque actual (SCRUM-131/SPEC §6, migración `020`):

```sql
select pmr.product_catalog_id into v_product_id
from product_mother_rules pmr
where pmr.vtex_category_prefix is not null
  and exists (
    select 1 from unnest(v_vtex_categories) cat
    where cat like pmr.vtex_category_prefix || '%'
  )
  and not exists (
    select 1 from unnest(pmr.exclude_keywords) ex
    where lower(v_staging.scraped_name) like '%' || lower(ex) || '%'
  )
order by
  length(pmr.vtex_category_prefix) desc,
  (
    select count(*) from unnest(pmr.match_keywords) kw
    where lower(v_staging.scraped_name) like '%' || lower(kw) || '%'
  ) desc
limit 1;
```

Reemplazo: agrega la condición de SPEC §3 ("ancho" = 2 segmentos de path o menos) y el desempate final por el id de la madre.

```sql
select pmr.product_catalog_id into v_product_id
from product_mother_rules pmr
where pmr.vtex_category_prefix is not null
  and exists (
    select 1 from unnest(v_vtex_categories) cat
    where cat like pmr.vtex_category_prefix || '%'
  )
  and not exists (
    select 1 from unnest(pmr.exclude_keywords) ex
    where lower(v_staging.scraped_name) like '%' || lower(ex) || '%'
  )
  -- Problema 2 (SPEC §1/§3): si el prefijo es ancho (2 segmentos de path o
  -- menos, ej. "/Alimentos Congelados/"), ya no basta con la categoría sola
  -- — tiene que aparecer al menos un match_keyword, igual que exige el
  -- respaldo por keyword más abajo.
  and (
    array_length(regexp_split_to_array(trim(both '/' from pmr.vtex_category_prefix), '/'), 1) > 2
    or exists (
      select 1 from unnest(pmr.match_keywords) kw
      where lower(v_staging.scraped_name) like '%' || lower(kw) || '%'
    )
  )
order by
  length(pmr.vtex_category_prefix) desc,
  (
    select count(*) from unnest(pmr.match_keywords) kw
    where lower(v_staging.scraped_name) like '%' || lower(kw) || '%'
  ) desc,
  pmr.product_catalog_id  -- Problema 1 (SPEC §1): desempate final determinístico (§3)
limit 1;
```

`regexp_split_to_array(trim(both '/' from prefix), '/')` sobre `/Alimentos Congelados/` da `{'Alimentos Congelados'}`: longitud 1, es ancho y exige keyword. Sobre `/Lácteos/Leche/Condensada/` da `{'Lácteos','Leche','Condensada'}`: longitud 3, no exige. Confirmado contra los 12 prefijos de `madres.json` el 2026-11-04 (tabla en SPEC §3).

## 2b. Cambio a la rama de respaldo por keyword

Mismo defecto que el Problema 1: el `order by` tiene una sola clave. Hay 24 nombres reales que empatan (SPEC §1). Solo se agrega la misma clave final:

```sql
order by
  (
    select count(*) from unnest(pmr.match_keywords) kw
    where lower(v_staging.scraped_name) like '%' || lower(kw) || '%'
  ) desc,
  pmr.product_catalog_id  -- Problema 1 (SPEC §1): mismo desempate que la rama de categoría
limit 1;
```

## 3. ¿Por qué `pmr.product_catalog_id` y no `pmr.id` ni el nombre?

- **`pmr.id` no es estable.** La premisa "IDs estables" de SCRUM-131 aplica a las **madres** (`product_catalog`), no a las **reglas**. El seed de `020` (generado por `scripts/generate-madres-migration.ts`) hace `delete from product_mother_rules` + `insert`, y `product_mother_rules.id` es `default gen_random_uuid()`. Cada vez que se regenere el seed (ej. el PR de datos que agregue las madres faltantes de SCRUM-132), las reglas reciben uuids nuevos y el orden entre dos reglas empatadas puede cambiar. Un producto escaneado un mes iría a una madre y el siguiente mes a otra. En la base real (2026-11-04) las 12 reglas tienen el mismo `created_at` que sus madres (2026-10-10): todavía no se re-sembraron nunca, pero el diseño lo permite.
- **`pmr.product_catalog_id` sí es estable.** El seed inserta las madres con upsert por nombre (`on conflict (name) ... do update set category_id`), que conserva el id existente, y nunca las borra. Ya está en la fila, sin join, y es un `uuid` con orden total, sin depender de collation.
- **`name` (de `product_catalog`)** también sería estable, pero necesita un join que hoy la consulta no tiene, y su orden depende de la collation (tildes: "Jabón", "Repostería").
- Las tres claves son igual de arbitrarias en cuál gana. La clave final solo garantiza que el resultado sea **el mismo** en cada corrida, no que sea **el correcto** (SPEC §4, efecto conocido). Elegir la madre "correcta" en un empate cambia cómo se puntúan los keywords, y eso queda fuera de alcance.

## 4. Tests (`supabase/tests/044_fix_normalize_staging_tiebreak.test.sql`, mismo patrón que `020_curated_mothers.test.sql`)

Casos:
- **Empate en rama de categoría:** con las 12 reglas actuales y el cambio de §2 no se puede armar un empate real en esta rama (verificado 2026-11-04). Los dos pares que comparten prefijo son anchos, así que con 0 hits ninguna regla entra. Con hits, cada par se separa por `exclude_keywords`: Dulces excluye "chocolate" y Leche excluye "coco". Por eso el test inserta, dentro de su transacción, dos madres y reglas sintéticas con el mismo prefijo de 3 segmentos y el mismo keyword, y una fila que matchea las dos. Correr el normalizador 2 veces y confirmar que las 2 veces da la madre de menor `product_catalog_id`.
- **Empate en rama de respaldo:** dos madres y reglas sintéticas sin prefijo y con el mismo keyword exclusivo, y filas sin categorías que matchean las dos. Correr 2 veces y confirmar que las 2 veces da la madre de menor `product_catalog_id`. Se usan madres sintéticas para que una madre nueva en `madres.json` no rompa el test. Además, un nombre real empatado ("Chocolate Milka de Leche - 90 g": Chocolate | Leche), corrido 2 veces: solo se confirma que las dos corridas den la misma madre, sin fijar cuál.
- **Over-matching bloqueado:** una fila sintética con categoría `/Alimentos Congelados/Pizzas/` (bajo el prefijo ancho de "Helado") y nombre "Pizza Congelada XYZ" (sin keyword de "helado" ni de ninguna otra madre). Debe quedar `pending`, no asignarse a "Helado".
- **Prefijo ancho con keyword sigue igual:** una fila con categoría `/Alimentos Congelados/Helados/` y "helado" en el nombre. Sigue matcheando "Helado" por categoría.
- **Regresión — prefijo de 3 segmentos sigue igual:** una fila con categoría `/Lácteos/Leche/Condensada/` y nombre sin "condensada". Sigue matcheando "Leche condensada" (3 segmentos, no exige keyword).
- **Hardening intacto:** después del `create or replace`, `normalize_staging_row` sigue con `search_path=public` y sin `execute` para `anon` ni `authenticated`.

En los casos de empate, cada corrida usa una fila distinta con los mismos datos: correr dos veces la misma fila no sirve, porque la segunda vez ya no está `pending` y el normalizador la rechaza sin elegir madre.

## 5. Verificación final (antes de pasar a `waiting qa`)

No se puede repetir la validación de SCRUM-131 (correr el normalizador en `begin...rollback` sobre filas reales con categorías): SCRUM-132 recortó `raw_json` y solo 2 de 250 filas conservan `product.categories` (2026-11-04). Se reemplaza por:

- **Chequeo estático sobre las filas `matched`:** para cada fila asignada a una madre con prefijo ancho, confirmar que el nombre contiene al menos un `match_keywords` de esa madre. Las que no lo contienen son las que cambian. Resultado esperado: las 10 filas del "efecto conocido" (SPEC §4). Consulta de solo lectura:

  ```sql
  select pc.name mother, s.scraped_name, count(*)
  from product_catalog_staging s
  join product_catalog_variants v on v.id = s.matched_variant_id
  join product_catalog pc on pc.id = v.product_catalog_id
  join product_mother_rules pmr on pmr.product_catalog_id = pc.id
  where s.status = 'matched'
    and array_length(regexp_split_to_array(trim(both '/' from pmr.vtex_category_prefix), '/'), 1) <= 2
    and not exists (
      select 1 from unnest(pmr.match_keywords) kw
      where lower(s.scraped_name) like '%' || lower(kw) || '%'
    )
  group by 1, 2 order by 1, 2;
  ```
- **Las 2 filas `pending` con categorías:** correr el normalizador nuevo sobre ellas en `begin...rollback` y reportar el resultado.
- `supabase/tests/044_fix_normalize_staging_tiebreak.test.sql` pasa completo, incluido correr los casos de empate 2+ veces.
- `select version, name from supabase_migrations.schema_migrations order by version;` incluye la fila nueva.
