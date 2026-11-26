-- ============================================================================
-- Migración 044 (SCRUM-139): normalize_staging_row con desempate
-- determinístico y prefijo de categoría ancho exigiendo keyword.
--
-- Ver supabase/specs/SCRUM-139/SPEC.md y plan.md para la evidencia real y el
-- detalle de cada decisión. Resumen:
--   - Problema 1: los dos `order by` (rama de categoría y respaldo por
--     keyword) podían terminar empatados, y Postgres no garantiza qué fila
--     devuelve `limit 1` en un empate — la misma fila podía ir a una madre
--     distinta en cada corrida. Se agrega `pmr.product_catalog_id` como clave
--     final en ambas ramas (por qué ese id y no `pmr.id`: plan.md §3).
--   - Problema 2: un prefijo ancho (2 segmentos de path o menos, ej.
--     "/Alimentos Congelados/") ya no alcanza solo — tiene que aparecer al
--     menos un match_keyword de la madre en scraped_name (SPEC §3).
--
-- El resto del cuerpo es el de la migración 020, sin cambios. La firma no
-- cambia (create or replace). Igual que la 042, se vuelve a aplicar al final
-- el hardening de la 020: el search_path es necesario, porque create or
-- replace sin cláusula SET reemplaza la configuración de la función y lo
-- borra; el revoke execute se repite como defensa en profundidad.
-- ============================================================================

create or replace function normalize_staging_row(staging_id uuid)
returns table (
  success boolean,
  product_catalog_id uuid,
  product_variant_id uuid,
  product_brand_id uuid,
  error_message text
) as $$
declare
  v_staging record;
  v_product_id uuid;
  v_variant_id uuid;
  v_brand_id uuid;
  v_base_unit text;
  v_base_quantity numeric;
  v_brand_name text;
  v_price numeric;
  v_vtex_categories text[];
begin
  -- Obtener fila de staging
  select * into v_staging
  from product_catalog_staging
  where id = staging_id
  limit 1;

  if v_staging is null then
    return query select false, null::uuid, null::uuid, null::uuid, 'Staging row not found'::text;
    return;
  end if;

  if v_staging.status != 'pending' then
    return query select false, null::uuid, null::uuid, null::uuid,
      format('Row already processed (status=%L)', v_staging.status)::text;
    return;
  end if;

  begin
    -- Parsear tamaño (sin cambios respecto a la migración 002)
    select * into v_base_unit, v_base_quantity
    from parse_size_text(v_staging.scraped_size_text);

    if v_base_unit is null then
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
      return query select false, null::uuid, null::uuid, null::uuid,
        format('Could not parse size: %L', v_staging.scraped_size_text)::text;
      return;
    end if;

    -- Categorías de VTEX de esta fila (raw_json.product.categories), ej.
    -- ["/Lácteos/Leche/Leche Entera/", "/Lácteos/Leche/", "/Lácteos/"].
    select array_agg(value) into v_vtex_categories
    from jsonb_array_elements_text(
      coalesce(v_staging.raw_json -> 'product' -> 'categories', '[]'::jsonb)
    );

    -- Señal principal: categoría de VTEX. Entre las reglas cuyo
    -- vtex_category_prefix coincide con alguna categoría de la fila (prefijo
    -- exacto, no solo substring) y que no tienen ningún exclude_keyword en
    -- scraped_name, gana la de prefijo más específico (más largo); si sigue
    -- empatada, la de más match_keywords coincidentes (desempate real: "Leche
    -- de coco" vs. "Leche", mismo prefijo "/Lácteos/Leche/" — ver SCRUM-131
    -- SPEC §3/§6); si aún empata, la de menor product_catalog_id (SCRUM-139).
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
      -- Problema 2 (SCRUM-139 SPEC §1/§3): si el prefijo es ancho (2
      -- segmentos de path o menos, ej. "/Alimentos Congelados/"), ya no basta
      -- con la categoría sola — tiene que aparecer al menos un match_keyword,
      -- igual que exige el respaldo por keyword más abajo.
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
      pmr.product_catalog_id  -- Problema 1 (SCRUM-139 SPEC §1): desempate final determinístico
    limit 1;

    -- Respaldo: si no hay categoría utilizable o ninguna regla la cubre,
    -- decidir solo por match_keywords (sin que aparezca ningún exclude_keyword).
    if v_product_id is null then
      select pmr.product_catalog_id into v_product_id
      from product_mother_rules pmr
      where exists (
          select 1 from unnest(pmr.match_keywords) kw
          where lower(v_staging.scraped_name) like '%' || lower(kw) || '%'
        )
        and not exists (
          select 1 from unnest(pmr.exclude_keywords) ex
          where lower(v_staging.scraped_name) like '%' || lower(ex) || '%'
        )
      order by
        (
          select count(*) from unnest(pmr.match_keywords) kw
          where lower(v_staging.scraped_name) like '%' || lower(kw) || '%'
        ) desc,
        pmr.product_catalog_id  -- Problema 1 (SCRUM-139 SPEC §1): mismo desempate que la rama de categoría
      limit 1;
    end if;

    -- Sin match: la fila queda pending (no se toca, no se fuerza a encajar
    -- en ninguna madre — SPEC §3, caso "Leche De Magnesia Phillips").
    if v_product_id is null then
      return query select false, null::uuid, null::uuid, null::uuid,
        'No curated mother matched — row stays pending'::text;
      return;
    end if;

    -- Buscar o crear variant (igual que antes, pero product_catalog_id viene
    -- de la madre curada — nunca se inserta una madre nueva).
    select pcv.id into v_variant_id
    from product_catalog_variants pcv
    where pcv.product_catalog_id = v_product_id
      and pcv.base_unit = v_base_unit
      and pcv.base_quantity = v_base_quantity
    limit 1;

    if v_variant_id is null then
      insert into product_catalog_variants (product_catalog_id, name, base_unit, base_quantity, image_url)
      values (v_product_id, v_staging.scraped_name || ' — ' || v_staging.scraped_size_text,
              v_base_unit, v_base_quantity, v_staging.image_url)
      returning id into v_variant_id;
    end if;

    -- Manejar brand (si es null o vacío, usar "Genérica")
    v_brand_name := coalesce(trim(v_staging.scraped_brand), 'Genérica');

    select pb.id into v_brand_id
    from product_brands pb
    where pb.product_catalog_variant_id = v_variant_id
      and pb.name = v_brand_name
    limit 1;

    if v_brand_id is null then
      insert into product_brands (product_catalog_variant_id, name)
      values (v_variant_id, v_brand_name)
      returning id into v_brand_id;
    end if;

    v_price := (v_staging.raw_json -> 'offer' ->> 'Price')::numeric;

    if v_price is null then
      v_price := (v_staging.raw_json ->> 'Price')::numeric;
    end if;

    if v_price is null then
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
      return query select false, v_product_id, v_variant_id, v_brand_id,
        'Could not extract price from raw_json'::text;
      return;
    end if;

    insert into product_prices (product_catalog_variant_id, product_brand_id, store_id, price, source)
    values (v_variant_id, v_brand_id, v_staging.store_id, v_price, 'scraped');

    update product_catalog_staging
    set status = 'matched',
        matched_variant_id = v_variant_id,
        matched_brand_id = v_brand_id
    where id = staging_id;

    return query select true, v_product_id, v_variant_id, v_brand_id, null::text;

  exception when others then
    begin
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
    exception when others then
      null;
    end;

    return query select false, null::uuid, null::uuid, null::uuid,
      'Error processing row: ' || sqlerrm;
    return;
  end;
end;
$$ language plpgsql;

comment on function normalize_staging_row(uuid) is
  'Procesa UNA fila de product_catalog_staging. Asigna a una madre curada (product_mother_rules) por categoría de VTEX (señal principal) o match_keywords (respaldo/desempate) — nunca crea una madre nueva. Sin match, la fila queda pending. Marca matched/rejected según corresponda. SCRUM-131 (supabase/specs/SCRUM-131/SPEC.md §6); SCRUM-139: desempate final por product_catalog_id y prefijo ancho (≤ 2 segmentos) exige keyword (supabase/specs/SCRUM-139/SPEC.md).';

-- Repetir el hardening de la migración 020. El search_path hay que volver a
-- fijarlo (create or replace lo borra); el revoke es defensa en profundidad.
alter function normalize_staging_row(uuid) set search_path = public;
revoke execute on function normalize_staging_row(uuid) from anon, authenticated, public;
