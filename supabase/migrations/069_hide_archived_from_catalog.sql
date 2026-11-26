-- ============================================================================
-- 069: el catálogo global no muestra productos archivados
--
-- search_catalog ("Buscar" del catálogo y el buscador de la lista y recetas) y
-- list_catalog_by_category (chips de categoría) filtraban solo por "global"
-- (owner_id y household_id nulos), no por archived_at. Archivar un producto
-- global no lo sacaba de la búsqueda; search_catalog_including_own sí lo
-- filtra. Se detectó al archivar el producto de prueba "QA160 leche".
--
-- Cuerpo igual al de la 031 (versión vigente, comprobado por hash contra la
-- base el 2026-11-26) más la condición "pc.archived_at is null". Misma firma,
-- así que los permisos no cambian.
--
-- Cómo volver atrás: aplicar otra vez las dos funciones de la 031.
-- ============================================================================

create or replace function public.search_catalog(
  search_term text default '',
  household_id uuid default null
)
returns table (
  product_catalog_id uuid,
  name text,
  category text,
  variants jsonb
)
language plpgsql
stable
set search_path to 'public'
as $$
declare
  min_search_length constant integer := 2;
  normalized_term text;
  visible_store_ids uuid[];
begin
  normalized_term := trim(lower(search_term));

  if length(normalized_term) < min_search_length then
    return query select
      null::uuid, null::text, null::text, null::jsonb
      where false;
    return;
  end if;

  if household_id is null then
    select array_agg(id) into visible_store_ids
    from stores;
  else
    select array_agg(s.id) into visible_store_ids
    from stores s
    left join household_store_preferences hsp
      on hsp.store_id = s.id and hsp.household_id = household_id
    where coalesce(hsp.visible, true) = true;
  end if;

  return query
  with matching_products as (
    select pc.id as product_id, pc.name, pc.category_id, c.name as category_name
    from product_catalog pc
    left join categories c on c.id = pc.category_id
    where pc.household_id is null
      and pc.owner_id is null
      -- 069: un producto global archivado deja de salir (como en search_catalog_including_own).
      and pc.archived_at is null
      and (
        pc.name % normalized_term
        or pc.name ilike '%' || normalized_term || '%'
      )
  ),
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
$$;

create or replace function public.list_catalog_by_category(
  filter_category_id uuid default null,
  filter_household_id uuid default null
)
returns table (
  product_catalog_id uuid,
  name text,
  category text,
  variants jsonb
)
language plpgsql
stable
set search_path to 'public'
as $$
declare
  visible_store_ids uuid[];
begin
  if filter_household_id is null then
    select array_agg(id) into visible_store_ids
    from stores;
  else
    select array_agg(s.id) into visible_store_ids
    from stores s
    left join household_store_preferences hsp
      on hsp.store_id = s.id and hsp.household_id = filter_household_id
    where coalesce(hsp.visible, true) = true;
  end if;

  return query
  with matching_products as (
    select pc.id as product_id, pc.name, c.name as category_name
    from product_catalog pc
    left join categories c on c.id = pc.category_id
    where pc.household_id is null
      and pc.owner_id is null
      -- 069: un producto global archivado deja de salir (como en search_catalog_including_own).
      and pc.archived_at is null
      and (filter_category_id is null or pc.category_id = filter_category_id)
  ),
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
$$;
