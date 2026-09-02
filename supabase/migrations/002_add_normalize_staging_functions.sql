-- ============================================================================
-- Spec 3: Normalización de staging → catálogo
--
-- Procesa filas crudas de scraping (product_catalog_staging) y las convierte
-- en producto+variante+marca+precio en el catálogo normalizado.
--
-- Dos funciones:
-- 1. normalize_staging_row(staging_id) — procesa UNA fila
-- 2. normalize_pending_staging(batch_size) — orquesta un lote
-- ============================================================================

-- ============================================================================
-- Función auxiliar: parsear scraped_size_text a base_unit y base_quantity
-- ============================================================================
create or replace function parse_size_text(size_text text)
returns table (
  base_unit text,
  base_quantity numeric
) as $$
declare
  normalized text;
  quantity numeric;
begin
  if size_text is null or trim(size_text) = '' then
    return;  -- null result si no se puede parsear
  end if;

  normalized := trim(lower(size_text));

  -- Patrones comunes en español costarricense de supermercado
  -- Formato: cantidad unit

  -- LITROS: "1 l", "1l", "1.5 l", "1500ml" → ml + quantity*1000
  if normalized ~ '^\d+\.?\d*\s*(l|litro|litros)$' then
    quantity := (regexp_matches(normalized, '(\d+\.?\d*)', 'g'))[1]::numeric;
    return query select 'ml'::text, (quantity * 1000)::numeric;
    return;
  end if;

  if normalized ~ '^\d+\s*(ml|mililitro|mililitros)$' then
    quantity := (regexp_matches(normalized, '(\d+)', 'g'))[1]::numeric;
    return query select 'ml'::text, quantity;
    return;
  end if;

  -- GRAMOS: "500 g", "500g", "1 kg" → g + quantity (convertir kg a g)
  if normalized ~ '^\d+\.?\d*\s*(g|gramo|gramos)$' then
    quantity := (regexp_matches(normalized, '(\d+\.?\d*)', 'g'))[1]::numeric;
    return query select 'g'::text, quantity;
    return;
  end if;

  if normalized ~ '^\d+\.?\d*\s*(kg|kilogramo|kilogramos)$' then
    quantity := (regexp_matches(normalized, '(\d+\.?\d*)', 'g'))[1]::numeric;
    return query select 'g'::text, (quantity * 1000)::numeric;
    return;
  end if;

  -- UNIDADES: "paquete x6", "pack x12", "unidad", "6 unidades"
  if normalized ~ 'paquete\s*x\s*\d+' or normalized ~ 'pack\s*x\s*\d+' then
    quantity := (regexp_matches(normalized, '(\d+)', 'g'))[1]::numeric;
    return query select 'unidad'::text, quantity;
    return;
  end if;

  if normalized ~ '^\d+\s*(unidades?|u|und)$' then
    quantity := (regexp_matches(normalized, '(\d+)', 'g'))[1]::numeric;
    return query select 'unidad'::text, quantity;
    return;
  end if;

  if normalized = 'unidad' or normalized = 'u' or normalized = 'und' then
    return query select 'unidad'::text, 1::numeric;
    return;
  end if;

  -- Si no reconoce el patrón: no devuelve nada (fila se rechaza)
end;
$$ language plpgsql immutable;

-- ============================================================================
-- Función principal: procesa UNA fila de staging
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
  v_similarity_threshold constant numeric := 0.4;
  v_best_match record;
  v_best_similarity numeric := 0;
  v_brand_name text;
  v_price numeric;
  v_store_id uuid;
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
    -- Parsear tamaño
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

    -- Buscar product_catalog similar
    -- Criteria: similarity > threshold, y si hay categoría, debe coincidir
    select pc.id, similarity(pc.name, v_staging.scraped_name)
    into v_product_id, v_best_similarity
    from product_catalog pc
    where pc.household_id is null  -- solo catálogo global
      and similarity(pc.name, v_staging.scraped_name) > v_similarity_threshold
    order by similarity(pc.name, v_staging.scraped_name) desc, pc.created_at desc
    limit 1;

    -- Si no hay match similar: crear nuevo product_catalog
    if v_product_id is null then
      insert into product_catalog (name, category_id, source)
      values (v_staging.scraped_name, null, 'scraped')
      returning id into v_product_id;
    end if;

    -- Buscar o crear variant
    select id into v_variant_id
    from product_catalog_variants
    where product_catalog_id = v_product_id
      and base_unit = v_base_unit
      and base_quantity = v_base_quantity
    limit 1;

    if v_variant_id is null then
      insert into product_catalog_variants (product_catalog_id, name, base_unit, base_quantity, image_url)
      values (v_product_id, v_staging.scraped_name || ' — ' || v_staging.scraped_size_text,
              v_base_unit, v_base_quantity, v_staging.image_url)
      returning id into v_variant_id;
    end if;

    -- Manejar brand (si es null o vacío, usar "Genérica")
    v_brand_name := coalesce(trim(v_staging.scraped_brand), 'Genérica');

    -- Buscar o crear brand
    select id into v_brand_id
    from product_brands
    where product_catalog_variant_id = v_variant_id
      and name = v_brand_name
    limit 1;

    if v_brand_id is null then
      insert into product_brands (product_catalog_variant_id, name)
      values (v_variant_id, v_brand_name)
      returning id into v_brand_id;
    end if;

    -- Extraer precio del raw_json (asume estructura VTEX: offer.spotPrice)
    v_price := (v_staging.raw_json -> 'offer' ->> 'spotPrice')::numeric;

    if v_price is null then
      -- Fallback: intentar otros paths comunes
      v_price := (v_staging.raw_json ->> 'price')::numeric;
    end if;

    if v_price is null then
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
      return query select false, v_product_id, v_variant_id, v_brand_id,
        'Could not extract price from raw_json'::text;
      return;
    end if;

    -- Insertar precio (source = 'scraped', captured_at ahora)
    insert into product_prices (product_catalog_variant_id, product_brand_id, store_id, price, source)
    values (v_variant_id, v_brand_id, v_staging.store_id, v_price, 'scraped');

    -- Marcar fila como matched
    update product_catalog_staging
    set status = 'matched',
        matched_variant_id = v_variant_id,
        matched_brand_id = v_brand_id
    where id = staging_id;

    return query select true, v_product_id, v_variant_id, v_brand_id, null::text;

  exception when others then
    -- Error en la fila: rechazar sin romper el batch
    begin
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
    exception when others then
      null;  -- ignorar si update también falla
    end;

    return query select false, null::uuid, null::uuid, null::uuid,
      'Error processing row: ' || sqlerrm;
    return;
  end;
end;
$$ language plpgsql;

-- ============================================================================
-- Función orquestadora: procesa un lote de filas pending
-- ============================================================================
create or replace function normalize_pending_staging(batch_size int default 50)
returns table (
  processed bigint,
  matched bigint,
  rejected bigint
) as $$
declare
  v_batch_size int;
  v_staging_ids uuid[];
  v_staging_id uuid;
  v_result record;
  v_success_count bigint := 0;
  v_reject_count bigint := 0;
begin
  -- Validar batch_size
  v_batch_size := greatest(0, batch_size);

  if v_batch_size = 0 then
    return query select 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  -- Obtener IDs de filas pending (hasta batch_size)
  select array_agg(id) into v_staging_ids
  from (
    select id
    from product_catalog_staging
    where status = 'pending'
    order by scraped_at asc
    limit v_batch_size
  ) t;

  if v_staging_ids is null or array_length(v_staging_ids, 1) is null then
    return query select 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  -- Procesar cada fila
  foreach v_staging_id in array v_staging_ids loop
    select * into v_result
    from normalize_staging_row(v_staging_id);

    if v_result.success then
      v_success_count := v_success_count + 1;
    else
      v_reject_count := v_reject_count + 1;
    end if;
  end loop;

  return query select
    array_length(v_staging_ids, 1)::bigint,
    v_success_count,
    v_reject_count;
end;
$$ language plpgsql;

-- ============================================================================
-- Documentación
-- ============================================================================
comment on function normalize_staging_row(uuid) is
  'Procesa UNA fila de product_catalog_staging. ' ||
  'Busca/crea product_catalog, product_catalog_variants, product_brands y product_prices. ' ||
  'Marca la fila como matched (success) o rejected (error). ' ||
  'Maneja excepciones sin romper el batch.';

comment on function normalize_pending_staging(int) is
  'Procesa lote de hasta batch_size filas con status=pending. ' ||
  'Devuelve { processed, matched, rejected }. ' ||
  'Idempotente: correr dos veces sin nuevo staging no cambia nada.';

comment on function parse_size_text(text) is
  'Parsea scraped_size_text a base_unit (ml/g/unidad) y base_quantity. ' ||
  'Reconoce: "1 L", "500 ml", "500 g", "1 kg", "paquete x6", "unidad". ' ||
  'Si no reconoce: devuelve NULL (fila se rechaza).';
