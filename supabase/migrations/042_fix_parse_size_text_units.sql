-- ============================================================================
-- Migración 042 (SCRUM-138): parse_size_text reconoce "gr", "uds", "gal" y
-- tolera el sufijo de ruido de scraping "ea" pegado a gramos ("500grea").
--
-- Ver supabase/specs/SCRUM-138/SPEC.md y plan.md para la evidencia real y el
-- detalle de cada decisión. Resumen:
--   - Alias "gr" para gramos (junto a g/gramo/gramos).
--   - Alias "uds" para unidades (junto a unidad/u/und).
--   - Patrón nuevo para galones (gal/galon/galones), convertido a ml
--     (1 gal ≈ 3785 ml, factor documentado en docs/documento-proyecto.md
--     §4.7 — mismo patrón que litros→ml y kg→g, no una unidad "gal" aparte).
--   - El branch de gramos tolera un sufijo "ea" pegado sin espacio (ruido de
--     VTEX en item.nameComplete, confirmado en catalogRepository.ts:60 — no
--     es un bug de nuestro scraping): "500grea" → 500 g.
--
-- La firma de la función no cambia (create or replace). Como la migración
-- 020 ya fijó search_path y revocó execute de anon/authenticated/public
-- sobre esta función (hardening de Marcos, 2026-10-06), se vuelven a aplicar
-- ambos al final por si acaso create or replace no los conservara — no
-- cuesta nada repetirlos y evita una regresión de seguridad silenciosa.
-- ============================================================================

create or replace function parse_size_text(size_text text)
returns table (
  base_unit text,
  base_quantity numeric
) as $$
declare
  normalized text;
  quantity numeric;
  match_groups text[];
begin
  if size_text is null or trim(size_text) = '' then
    return;  -- null result si no se puede parsear
  end if;

  normalized := trim(lower(size_text));

  -- Patrones comunes en español costarricense de supermercado.
  -- Sin anclas: el tamaño puede aparecer en cualquier parte del nombre
  -- completo del producto (ej. "Leche Entera Dos Pinos 1 Litro").

  -- LITROS: "1 l", "1l", "1.5 l", "1 litro" → ml + quantity*1000
  match_groups := regexp_match(normalized, '(\d+\.?\d*)\s*(l|litro|litros)\M');
  if match_groups is not null then
    quantity := match_groups[1]::numeric;
    return query select 'ml'::text, (quantity * 1000)::numeric;
    return;
  end if;

  -- MILILITROS: "500 ml", "500ml", "1500 mililitros"
  match_groups := regexp_match(normalized, '(\d+\.?\d*)\s*(ml|mililitro|mililitros)\M');
  if match_groups is not null then
    quantity := match_groups[1]::numeric;
    return query select 'ml'::text, quantity;
    return;
  end if;

  -- KILOGRAMOS: "1 kg", "1.5 kilogramos" → g (convertido)
  match_groups := regexp_match(normalized, '(\d+\.?\d*)\s*(kg|kilogramo|kilogramos)\M');
  if match_groups is not null then
    quantity := match_groups[1]::numeric;
    return query select 'g'::text, (quantity * 1000)::numeric;
    return;
  end if;

  -- GRAMOS: "500 g", "500g", "500 gramos", abreviatura "gr" (SCRUM-138) y
  -- sufijo de ruido "ea" pegado sin espacio (SCRUM-138, ver SPEC §2 — causa
  -- raíz confirmada en catalogRepository.ts, no en nuestro scraping):
  -- "500grea" debe matchear igual que "500g".
  match_groups := regexp_match(normalized, '(\d+\.?\d*)\s*(g|gr|gramo|gramos)(ea)?\M');
  if match_groups is not null then
    quantity := match_groups[1]::numeric;
    return query select 'g'::text, quantity;
    return;
  end if;

  -- GALONES (SCRUM-138): "1 gal", "1 galon", "1 galones" → ml.
  -- 1 gal (US líquido) ≈ 3785 ml — mismo patrón que litros→ml y kg→g,
  -- decisión en docs/documento-proyecto.md §4.7 (2026-11-01).
  match_groups := regexp_match(normalized, '(\d+\.?\d*)\s*(gal|galon|galones)\M');
  if match_groups is not null then
    quantity := match_groups[1]::numeric;
    return query select 'ml'::text, (quantity * 3785)::numeric;
    return;
  end if;

  -- UNIDADES: "paquete x6", "pack x12"
  match_groups := regexp_match(normalized, 'paquete\s*x\s*(\d+)');
  if match_groups is not null then
    return query select 'unidad'::text, match_groups[1]::numeric;
    return;
  end if;

  match_groups := regexp_match(normalized, 'pack\s*x\s*(\d+)');
  if match_groups is not null then
    return query select 'unidad'::text, match_groups[1]::numeric;
    return;
  end if;

  -- "6 unidades", "6 u", "6 und", abreviatura "uds" (SCRUM-138)
  match_groups := regexp_match(normalized, '(\d+)\s*(unidades?|u|und|uds)\M');
  if match_groups is not null then
    return query select 'unidad'::text, match_groups[1]::numeric;
    return;
  end if;

  -- "unidad" sola, sin cantidad explícita
  if normalized ~ '\munidad\M' or normalized ~ '\mu\M' or normalized ~ '\mund\M' then
    return query select 'unidad'::text, 1::numeric;
    return;
  end if;

  -- Si no reconoce ningún patrón: no devuelve nada (fila se rechaza)
end;
$$ language plpgsql immutable;

comment on function parse_size_text(text) is
  'Extrae unidad base (ml/g/unidad) y cantidad desde el texto de tamaño scrapeado. SCRUM-138: agrega alias "gr"/"uds", patrón de galones (→ml) y tolera el sufijo de ruido "ea" de VTEX pegado a gramos. Ver supabase/specs/SCRUM-138/SPEC.md.';

-- Repetir el hardening de la migración 020 por si create or replace no lo
-- conservara (defensa en profundidad, sin costo).
alter function parse_size_text(text) set search_path = public;
revoke execute on function parse_size_text(text) from anon, authenticated, public;
