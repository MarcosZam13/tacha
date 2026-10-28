-- ============================================================================
-- SCRUM-84: filtro de catálogo por categoría.
--
-- Ver features/catalog/specs/SPEC.md y plan.md (secciones marcadas "HU-52")
-- para el detalle completo de la decisión y por qué es una función nueva en
-- vez de tocar search_catalog.
--
-- Qué hace esta migración:
-- 1. Función nueva list_catalog_by_category(category_id, household_id):
--    lista el catálogo global, opcionalmente filtrado por categoría. No es
--    una búsqueda de texto, así que no tiene el mínimo de 2 caracteres que
--    sí aplica a search_catalog (001_add_search_catalog_rpc.sql).
-- 2. No toca search_catalog (contrato congelado desde SCRUM-131, confirmado
--    otra vez en el ticket de Jira de SCRUM-131: "search_catalog keeps its
--    contract") ni ninguna tabla existente: cero RLS, cero grants nuevos —
--    reusa los que ya dejó la migración 020 (lectura pública en categories/
--    product_catalog/product_catalog_variants/product_brands/product_prices,
--    sin insert/update/delete/truncate para anon/authenticated). El EXECUTE
--    por defecto queda abierto para anon/authenticated, igual que
--    search_catalog (020 lo deja así a propósito — comentario de esa
--    migración: "search_catalog se queda como está, la usa el frontend
--    directo con la anon key").
-- 3. El cálculo de tiendas visibles por household_id se duplica (no se
--    extrae como helper compartido con search_catalog) para no volver a
--    tocar el cuerpo de una función ya aprobada por QA en otra historia —
--    ver plan.md, tabla de Decisiones.
-- 4. search_path fijo desde esta misma migración (search_catalog lo recibió
--    después, en la 020; acá se evita ese hueco desde el día 1).
-- ============================================================================

create or replace function list_catalog_by_category(
  category_id uuid default null,
  household_id uuid default null
)
returns table (
  product_catalog_id uuid,
  name text,
  category text,
  variants jsonb
) as $$
declare
  visible_store_ids uuid[];
begin
  -- Tiendas visibles para este household. Mismo cálculo que search_catalog
  -- (001_add_search_catalog_rpc.sql) — duplicado a propósito, ver cabecera.
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
    select pc.id as product_id, pc.name, c.name as category_name
    from product_catalog pc
    left join categories c on c.id = pc.category_id
    where pc.household_id is null  -- solo catálogo global, igual que search_catalog
      and (category_id is null or pc.category_id = category_id)  -- único filtro distinto a search_catalog
  ),
  -- variant_brands / variant_prices / product_variants: mismos tres CTE que
  -- ya tiene search_catalog, copiados tal cual (misma agregación de marcas y
  -- rango de precio por tienda; evita repetir el bug que corrigió el
  -- "FIX QA bug #3" de 001_add_search_catalog_rpc.sql si se reescribiera
  -- distinto acá).
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
$$ language plpgsql stable security invoker;

comment on function list_catalog_by_category(uuid, uuid) is
  'Lista el catálogo global, opcionalmente filtrado por categoría. No toca search_catalog: mismo contrato de salida y misma agregación de marcas/rango de precio. Si household_id se pasa, filtra tiendas según household_store_preferences.';

-- search_path fijo, mismo patrón que dejó la migración 020 para las otras
-- funciones de catálogo — defensa en profundidad contra un search_path
-- manipulado en la sesión que llama.
alter function list_catalog_by_category(uuid, uuid) set search_path = public;

-- No hace falta ningún grant/revoke: EXECUTE queda con el default (abierto a
-- anon/authenticated), igual que search_catalog. No es una función de
-- escritura ni de normalización, así que no aplica el revoke que sí les
-- tocó a normalize_staging_row/normalize_pending_staging/parse_size_text.
