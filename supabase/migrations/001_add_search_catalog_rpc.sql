-- ============================================================================
-- Spec 2: Función RPC search_catalog
--
-- Función de lectura pura que busca en el catálogo normalizado y devuelve
-- productos madre con sus variantes, marcas y rango de precios.
--
-- Invocable vía PostgREST: POST /rest/v1/rpc/search_catalog
-- Con anon key (sin necesidad de service_role).
-- ============================================================================

create or replace function search_catalog(
  search_term text default '',
  household_id uuid default null
)
returns table (
  product_catalog_id uuid,
  name text,
  category text,
  variants jsonb
) as $$
declare
  min_search_length constant integer := 2;
  normalized_term text;
  visible_store_ids uuid[];
begin
  -- Normalizar término de búsqueda (trim + lowercase)
  normalized_term := trim(lower(search_term));

  -- Si el término tiene menos de 2 caracteres, devolver array vacío
  if length(normalized_term) < min_search_length then
    return query select
      null::uuid, null::text, null::text, null::jsonb
      where false;  -- devuelve 0 filas
    return;
  end if;

  -- Determinar tiendas visibles para este household
  if household_id is null then
    -- Sin household_id: todas las 3 tiendas
    select array_agg(id) into visible_store_ids
    from stores;
  else
    -- Con household_id: aplicar filtro de household_store_preferences
    -- (NULL visible = true por defecto, si no hay fila)
    select array_agg(s.id) into visible_store_ids
    from stores s
    left join household_store_preferences hsp
      on hsp.store_id = s.id and hsp.household_id = household_id
    where coalesce(hsp.visible, true) = true;
  end if;

  -- Buscar productos con búsqueda por similitud pg_trgm
  return query
  with matching_products as (
    select pc.id as product_id, pc.name, pc.category_id, c.name as category_name
    from product_catalog pc
    left join categories c on c.id = pc.category_id
    where pc.household_id is null  -- solo catálogo global, no productos custom
      and (
        pc.name % normalized_term  -- pg_trgm similitud
        or pc.name ilike '%' || normalized_term || '%'
      )
  ),
  -- FIX QA bug #3 (2026-09-04): la versión anterior hacía
  -- "join product_brands ... cross join stores" y agrupaba todo junto —
  -- con 2 marcas × 3 tiendas, json_agg(brands) repetía cada marca 3 veces
  -- (una por cada fila que aportaba el cross join). Se separa el cálculo de
  -- "brands" (agregación sobre product_brands, sin tiendas de por medio) del
  -- cálculo de "price_by_store" (agregación sobre stores, sin marcas de por
  -- medio) en dos CTEs independientes, evitando el producto cartesiano.
  variant_brands as (
    select
      pcv.id as variant_id,
      json_agg(
        json_build_object(
          'brand_id', pb.id,
          'name', pb.name,
          'logo_url', pb.logo_url
        )
      ) as brands
    from matching_products mp
    join product_catalog_variants pcv on pcv.product_catalog_id = mp.product_id
    left join product_brands pb on pb.product_catalog_variant_id = pcv.id
    group by pcv.id
  ),
  variant_prices as (
    select
      pcv.id as variant_id,
      json_object_agg(
        s.slug,
        json_build_object(
          'min', (
            select min(lp.price)
            from latest_prices lp
            where lp.product_catalog_variant_id = pcv.id
              and lp.store_id = s.id
              and lp.is_available = true
          ),
          'max', (
            select max(lp.price)
            from latest_prices lp
            where lp.product_catalog_variant_id = pcv.id
              and lp.store_id = s.id
              and lp.is_available = true
          )
        )
      ) as price_by_store
    from matching_products mp
    join product_catalog_variants pcv on pcv.product_catalog_id = mp.product_id
    cross join stores s
    where s.id = any(visible_store_ids)
    group by pcv.id
  ),
  product_variants as (
    select
      mp.product_id,
      pcv.id as variant_id,
      pcv.name as variant_name,
      pcv.base_unit,
      pcv.base_quantity,
      pcv.image_url,
      coalesce(vb.brands, '[]'::json) as brands,
      vp.price_by_store
    from matching_products mp
    join product_catalog_variants pcv on pcv.product_catalog_id = mp.product_id
    left join variant_brands vb on vb.variant_id = pcv.id
    left join variant_prices vp on vp.variant_id = pcv.id
  )
  -- FIX (2026-09-04, encontrado al validar con datos reales de scraping):
  -- la función declara "returns table (..., variants jsonb)" pero json_agg()
  -- devuelve el tipo "json", no "jsonb" — Postgres no hace ese cast implícito
  -- en un RETURN QUERY y la función fallaba en cualquier búsqueda con
  -- resultados. Se agrega el cast ::jsonb explícito.
  select
    mp.product_id,
    mp.name,
    mp.category_name,
    (json_agg(
      json_build_object(
        'variant_id', pv.variant_id,
        'name', pv.variant_name,
        'base_unit', pv.base_unit,
        'base_quantity', pv.base_quantity,
        'image_url', pv.image_url,
        'brands', pv.brands,
        'price_ranges', pv.price_by_store
      )
    ))::jsonb as variants
  from matching_products mp
  join product_variants pv on pv.product_id = mp.product_id
  group by mp.product_id, mp.name, mp.category_name
  order by mp.name;
end;
$$ language plpgsql stable security invoker;

-- Comentario de documentación
comment on function search_catalog(text, uuid) is
  'Busca en el catálogo normalizado. Devuelve productos madre con variantes, marcas y rango de precios. ' ||
  'Si household_id se pasa, filtra tiendas según household_store_preferences.';
