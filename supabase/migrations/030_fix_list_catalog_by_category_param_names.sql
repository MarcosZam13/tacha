-- ============================================================================
-- SCRUM-84: corrección post-aplicación de la migración 029.
--
-- La función list_catalog_by_category quedó con dos parámetros cuyo nombre
-- choca con una columna real de las tablas que usa sin calificar
-- (category_id con product_catalog.category_id; household_id con
-- household_store_preferences.household_id, mismo patrón latente que ya
-- existe en search_catalog, no corregido acá — fuera de alcance). PL/pgSQL
-- no lo valida al crear la función, solo al ejecutar el SELECT por primera
-- vez: "ERROR 42702: column reference ... is ambiguous". Se encontró al
-- correr supabase/tests/029_list_catalog_by_category.test.sql contra la
-- base real, con la 029 ya aplicada y registrada en
-- supabase_migrations.schema_migrations — por eso no se edita esa migración
-- (regla de supabase/README.md#migraciones, mismo patrón que la 021
-- corrigiendo a la 020), se reemplaza la función completa acá.
--
-- Único cambio real: category_id → filter_category_id,
-- household_id → filter_household_id, en la firma y en las dos referencias
-- sin calificar dentro del cuerpo. Misma agregación, mismo contrato de
-- salida, sin cambios de comportamiento.
--
-- Postgres no permite renombrar un parámetro con CREATE OR REPLACE FUNCTION
-- aunque el tipo no cambie (42P13: cannot change name of input parameter) —
-- hay que DROP primero. No hay nada que dependa de esta función todavía
-- (sin RLS, sin otras funciones que la llamen, sin frontend aún), así que
-- es seguro.
-- ============================================================================

drop function if exists list_catalog_by_category(uuid, uuid);

create or replace function list_catalog_by_category(
  filter_category_id uuid default null,
  filter_household_id uuid default null
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
$$ language plpgsql stable security invoker;

comment on function list_catalog_by_category(uuid, uuid) is
  'Lista el catálogo global, opcionalmente filtrado por categoría. No toca search_catalog: mismo contrato de salida y misma agregación de marcas/rango de precio. Si household_id se pasa, filtra tiendas según household_store_preferences.';

-- Se vuelve a fijar por completitud (create or replace function no conserva
-- los atributos de ALTER FUNCTION de la versión anterior si el cuerpo
-- cambia de forma significativa en algunos motores; en Postgres sí se
-- conserva, pero se reafirma acá para que quede explícito en esta
-- migración, no solo heredado de la 029).
alter function list_catalog_by_category(uuid, uuid) set search_path = public;
