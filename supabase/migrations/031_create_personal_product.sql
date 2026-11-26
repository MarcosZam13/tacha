-- ============================================================================
-- SCRUM-87 (HU-56): crear un producto personalizado.
--
-- Esta migración:
--   1. Agrega owner_id (nullable) a product_catalog, mismo patrón owner_id +
--      household_id nullable que ya usa lists (004). Nullable porque los 12
--      productos madre curados en SCRUM-131 (020) nunca tienen dueño y
--      quedan con owner_id = null para siempre — así no se confunden con un
--      producto personal que también puede tener household_id = null
--      (CA-03, "personal por defecto").
--   2. Acota idx_product_catalog_global_name (020) a owner_id is null —
--      ver sección 1 abajo para el por qué, hallado al verificar esta
--      migración contra la base real.
--   3. Corrige search_catalog (001) y list_catalog_by_category (última
--      versión: 030): ambas asumían que "household_id is null" significaba
--      siempre catálogo global — cierto hasta esta migración, falso desde
--      que existe un producto personal sin compartir (también
--      household_id is null, CA-03). Sin este ajuste, "Buscar" y sus chips
--      de categoría mostrarían el producto personal de cualquier usuario
--      mezclado con el catálogo global de todos. Mismo criterio aplicado en
--      el índice del punto 2: se agrega "and owner_id is null" a su único
--      filtro de catálogo global, sin tocar nada más de cada función.
--      (normalize_staging_row, 002, tenía el mismo filtro originalmente,
--      pero 020 ya reemplazó por completo su forma de elegir el producto
--      madre — hoy busca por product_mother_rules, nunca por similitud
--      directa contra product_catalog con ese filtro — verificado contra
--      pg_get_functiondef en la base real: no le queda nada que corregir.)
--   4. create_personal_product: función nueva security definer, única
--      puerta de escritura para productos personalizados (anon/authenticated
--      no tienen INSERT sobre product_catalog/product_catalog_variants,
--      confirmado contra information_schema.role_table_grants). Resuelve
--      household_id internamente vía auth.uid() contra household_members,
--      nunca recibido como parámetro — mismo criterio de seguridad que
--      ensure_general_list_id (024). Inserta producto + variante (+ marca si
--      hay) en una sola transacción y devuelve el id del producto creado.
--
-- Contrato completo: features/my-products/specs/SPEC.md §12 y plan.md
-- (SCRUM-87). Decisión de arquitectura registrada en
-- docs/documento-proyecto.md §6 y §4.5.1 (2026-10-28).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. owner_id en product_catalog, y el índice de 020 acotado a owner_id null.
--
-- idx_product_catalog_global_name (020) es un unique index parcial en
-- (name) where household_id is null, pensado solo para el catálogo global
-- curado (su propio comentario: "el catálogo por household, cuando exista,
-- no se toca") — household_id is null significaba únicamente "catálogo
-- global" cuando se escribió. Con owner_id, household_id is null también
-- va a significar "producto personal sin compartir" (CA-03, el caso por
-- defecto), y ese índice chocaría: un producto personal con el mismo nombre
-- que uno de los 40 productos globales existentes, o que el producto
-- personal de otro usuario, fallaría con un unique_violation crudo en vez
-- de la validación de create_personal_product.
--
-- Se reemplaza por el mismo índice con owner_id is null agregado: sigue
-- protegiendo exactamente lo mismo que protegía (sin nombres duplicados en
-- el catálogo global curado, para el upsert de SCRUM-131/132, que nunca
-- escriben owner_id), y deja fuera a cualquier producto personal
-- (owner_id is not null), que nunca debió estar cubierto por esta regla.
-- ----------------------------------------------------------------------------
alter table public.product_catalog
  add column owner_id uuid references auth.users (id) on delete cascade;

create index idx_product_catalog_owner
  on public.product_catalog (owner_id);

drop index public.idx_product_catalog_global_name;

create unique index idx_product_catalog_global_name
  on public.product_catalog (name)
  where household_id is null and owner_id is null;

-- ----------------------------------------------------------------------------
-- 2. search_catalog y list_catalog_by_category:
--    "catálogo global" pasa a ser household_id is null AND owner_id is null.
--
-- Las dos funciones ya existían antes de esta migración y comparten el
-- mismo filtro ("where pc.household_id is null") para decir "solo el
-- catálogo global curado, no algo propio de un household" — verificado
-- contra pg_get_functiondef en la base real, no solo contra el archivo de
-- cada migración (030 es la versión vigente de list_catalog_by_category, no
-- 029; normalize_staging_row, 002, tenía este mismo filtro pero 020 ya lo
-- reemplazó por completo con un criterio distinto — ver el punto 3 del
-- encabezado arriba — así que no entra en esta sección). Hallado al
-- verificar esta migración, no estaba en el SPEC/plan:
--
--   - search_catalog (001): resultados de "Buscar". Sin el ajuste, el
--     producto personal de cualquier usuario (household_id is null por
--     defecto, CA-03) aparecería en la búsqueda de todos los demás.
--   - list_catalog_by_category (030, SCRUM-84): chips de categoría de
--     "Buscar". Mismo problema, mismo filtro.
--
-- "create or replace" conserva los permisos ya otorgados (mismo criterio
-- que ya usó 024 al reemplazar funciones existentes) — no hace falta volver
-- a otorgar ningún grant. Cada función se reemplaza completa (Postgres no
-- tiene ALTER FUNCTION para tocar solo el cuerpo), pero el único cambio real
-- en las dos es agregar "and pc.owner_id is null" a ese filtro — se
-- preserva el resto exactamente (su propio search_path, su propio criterio
-- STABLE, sin agregar "security definer" a ninguna: siguen siendo las
-- mismas, solo con el filtro corregido).
--
-- Retrocompatible por diseño, no solo en la intención: hoy, antes de esta
-- migración, product_catalog no tiene ninguna fila con owner_id (la columna
-- no existe hasta el punto 1 de arriba), así que "owner_id is null" es
-- verdad para absolutamente todo lo que ya existe — estas dos funciones
-- devuelven exactamente los mismos resultados que devuelven hoy para todo
-- dato ya cargado. El filtro nuevo solo empieza a excluir algo el día que
-- create_personal_product inserte la primera fila con owner_id distinto de
-- null.
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3. create_personal_product.
--
-- Valida product_name/category_id/base_unit/base_quantity del lado del
-- servidor (CA-02 reforzado, no solo en el formulario). share_with_household
-- solo tiene efecto si quien llama de verdad pertenece a un household —
-- nunca automático por la sola membresía (CA-03, mismo criterio que
-- decide_personal_lists, 024).
-- ----------------------------------------------------------------------------
create or replace function public.create_personal_product(
  product_name text,
  category_id uuid,
  base_unit text,
  base_quantity numeric,
  brand_name text default null,
  share_with_household boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  member_household_id uuid;
  resolved_household_id uuid;
  trimmed_name text := trim(product_name);
  trimmed_brand_name text := trim(brand_name);
  new_product_id uuid;
  new_variant_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para crear un producto'
      using errcode = '42501';
  end if;

  if trimmed_name is null or trimmed_name = '' then
    raise exception 'El nombre del producto es obligatorio'
      using errcode = '22023';
  end if;

  if category_id is null or not exists (
    select 1 from public.categories c where c.id = category_id
  ) then
    raise exception 'La categoría no es válida'
      using errcode = '22023';
  end if;

  if base_unit is null or base_unit not in ('ml', 'g', 'unidad') then
    raise exception 'La unidad de tamaño no es válida'
      using errcode = '22023';
  end if;

  if base_quantity is null or base_quantity <= 0 then
    raise exception 'La cantidad de tamaño tiene que ser mayor a 0'
      using errcode = '22023';
  end if;

  if trimmed_brand_name = '' then
    trimmed_brand_name := null;
  end if;

  -- household_id solo se asigna si lo pidió explícitamente y de verdad
  -- pertenece a uno; nunca automático por la sola membresía (CA-03).
  if share_with_household then
    select m.household_id into member_household_id
    from public.household_members m
    where m.user_id = current_user_id;

    resolved_household_id := member_household_id;
  else
    resolved_household_id := null;
  end if;

  insert into public.product_catalog (owner_id, household_id, category_id, name, source)
  values (current_user_id, resolved_household_id, category_id, trimmed_name, 'manual')
  returning id into new_product_id;

  -- El nombre de la variante no se muestra en "Mis productos" (toCatalogCards
  -- recalcula el tamaño mostrado desde base_quantity/base_unit), pero la
  -- columna es not null: queda con el mismo criterio "{producto} — {tamaño}"
  -- que ya usan las variantes del catálogo curado.
  insert into public.product_catalog_variants (product_catalog_id, name, base_unit, base_quantity)
  values (
    new_product_id,
    trimmed_name || ' — ' || base_quantity::text || ' ' || base_unit,
    base_unit,
    base_quantity
  )
  returning id into new_variant_id;

  if trimmed_brand_name is not null then
    insert into public.product_brands (product_catalog_variant_id, name)
    values (new_variant_id, trimmed_brand_name);
  end if;

  return new_product_id;
end;
$$;

revoke execute on function public.create_personal_product(text, uuid, text, numeric, text, boolean) from public, anon;
grant execute on function public.create_personal_product(text, uuid, text, numeric, text, boolean) to authenticated;
