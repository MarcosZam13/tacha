-- ============================================================================
-- SCRUM-110 (HU-73): crear un grupo de productos.
--
-- Partes:
-- 1. search_catalog_including_own: la búsqueda del editor de grupos. Igual que
--    search_catalog (031), pero también trae mis productos personalizados y
--    los compartidos por mi familia. search_catalog no cambia: es un contrato
--    fijado por SCRUM-131 (mismo camino que list_catalog_by_category).
-- 2. create_product_group: crea el grupo y sus productos en una transacción.
--    Es el único camino para escribir grupos: la 054 no le da INSERT al
--    cliente, porque una política no impediría falsear owner_id/household_id
--    ni meter un producto ajeno en un grupo compartido.
-- 3. get_personal_product_usage (052): suma cuántos grupos usan el producto.
-- 4. delete_personal_product (052): un producto que está en un grupo se
--    archiva en vez de borrarse. Sin esto, borrarlo fallaría por la FK de
--    product_group_items (054, sin on delete).
--
-- Contrato: features/product-groups/specs/SPEC.md (HU-73) §12.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. search_catalog_including_own
--
-- Misma forma de retorno, misma agregación de marcas y precios y mismo mínimo
-- de 2 caracteres que search_catalog, con dos diferencias:
--   - No filtra household_id/owner_id: es invoker, así que la RLS de
--     product_catalog (032) ya limita a global + mío + de mi familia. Sí
--     filtra los archivados (052): ya no se pueden agregar a nada nuevo.
--   - Cada producto trae is_personal (personal sin compartir: owner_id con
--     valor). Un grupo compartido no puede tenerlo (parte 2).
-- ----------------------------------------------------------------------------
create function public.search_catalog_including_own(
  search_term text default '',
  household_id uuid default null
)
returns table (
  product_catalog_id uuid,
  name text,
  category text,
  is_personal boolean,
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
      null::uuid, null::text, null::text, null::boolean, null::jsonb
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
    select
      pc.id as product_id,
      pc.name,
      pc.category_id,
      c.name as category_name,
      pc.owner_id is not null as is_personal
    from product_catalog pc
    left join categories c on c.id = pc.category_id
    where pc.archived_at is null
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
    mp.is_personal,
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
  group by mp.product_id, mp.name, mp.category_name, mp.is_personal
  order by mp.name;
end;
$$;

-- Sin sesión no hay productos propios: solo authenticated (los usuarios
-- anónimos de Supabase también entran como authenticated).
revoke execute on function public.search_catalog_including_own(text, uuid) from public, anon;
grant execute on function public.search_catalog_including_own(text, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. create_product_group
--
-- item_list = [{ "variant_id": uuid, "quantity": int }, ...]; la posición de
-- cada producto es su orden en el array. Errores:
--   42501: sin sesión.
--   22023: nombre, cantidad de productos, cantidad de cada uno, producto
--          repetido o producto personal en un grupo compartido.
--   P0002: una presentación que no existe, que no es visible para quien
--          llama o cuyo producto está archivado.
-- security definer: la visibilidad se valida a mano, porque saltea la RLS.
-- ----------------------------------------------------------------------------
create function public.create_product_group(
  group_name text,
  share_with_household boolean,
  item_list jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Espejo de PRODUCT_GROUP_LIMIT (features/product-groups/constants/) y de
  -- los checks de la 054.
  max_name_length constant integer := 60;
  max_items constant integer := 50;
  min_quantity constant integer := 1;
  max_quantity constant integer := 99;
  current_user_id uuid := auth.uid();
  trimmed_name text := btrim(group_name);
  item_count integer;
  item jsonb;
  item_quantity numeric;
  variant_ids uuid[] := '{}';
  quantities integer[] := '{}';
  member_household_id uuid;
  target_household_id uuid;
  visible_count integer;
  personal_names text;
  new_group_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para crear un grupo'
      using errcode = '42501';
  end if;

  if trimmed_name is null or trimmed_name = '' then
    raise exception 'El nombre del grupo es obligatorio'
      using errcode = '22023';
  end if;

  if char_length(trimmed_name) > max_name_length then
    raise exception 'El nombre del grupo es demasiado largo'
      using errcode = '22023';
  end if;

  if item_list is null or jsonb_typeof(item_list) <> 'array' or jsonb_array_length(item_list) = 0 then
    raise exception 'Agrega al menos un producto'
      using errcode = '22023';
  end if;

  item_count := jsonb_array_length(item_list);
  if item_count > max_items then
    raise exception 'Un grupo puede tener hasta 50 productos'
      using errcode = '22023';
  end if;

  -- Cada producto: un objeto con variant_id (texto uuid) y quantity (entero
  -- de 1 a 99). Se revisa de a uno porque un cast inválido no se puede
  -- filtrar en una sola consulta sin que falle con un error crudo.
  for item in select value from jsonb_array_elements(item_list) loop
    if jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item -> 'variant_id') is distinct from 'string'
      or jsonb_typeof(item -> 'quantity') is distinct from 'number' then
      raise exception 'Cada producto necesita una presentación y una cantidad'
        using errcode = '22023';
    end if;

    item_quantity := (item ->> 'quantity')::numeric;
    if item_quantity <> trunc(item_quantity) or item_quantity < min_quantity or item_quantity > max_quantity then
      raise exception 'La cantidad de cada producto tiene que ser un entero de 1 a 99'
        using errcode = '22023';
    end if;

    begin
      variant_ids := variant_ids || (item ->> 'variant_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'Cada producto necesita una presentación y una cantidad'
          using errcode = '22023';
    end;
    quantities := quantities || item_quantity::integer;
  end loop;

  if (select count(distinct variant_id) from unnest(variant_ids) as v(variant_id)) <> item_count then
    raise exception 'Un producto aparece dos veces en el grupo'
      using errcode = '22023';
  end if;

  -- Un usuario pertenece a lo sumo a una familia (PK de household_members).
  select hm.household_id into member_household_id
  from public.household_members hm
  where hm.user_id = current_user_id;

  -- Personal por defecto (CA-03); compartido solo si lo pidió y tiene familia.
  target_household_id := case
    when share_with_household and member_household_id is not null then member_household_id
  end;

  -- Visible = del catálogo global, mío, o compartido con mi familia; y nunca
  -- archivado. Mismo criterio que la RLS de product_catalog (032).
  select count(*) into visible_count
  from unnest(variant_ids) as v(variant_id)
  join public.product_catalog_variants pcv on pcv.id = v.variant_id
  join public.product_catalog pc on pc.id = pcv.product_catalog_id
  where pc.archived_at is null
    and (
      (pc.household_id is null and pc.owner_id is null)
      or pc.owner_id = current_user_id
      or (member_household_id is not null and pc.household_id = member_household_id)
    );

  if visible_count <> item_count then
    raise exception 'Alguno de los productos ya no está disponible'
      using errcode = 'P0002';
  end if;

  -- Un grupo compartido no puede tener productos personales sin compartir:
  -- los otros miembros no podrían verlos.
  if target_household_id is not null then
    select string_agg(distinct pc.name, ', ' order by pc.name) into personal_names
    from unnest(variant_ids) as v(variant_id)
    join public.product_catalog_variants pcv on pcv.id = v.variant_id
    join public.product_catalog pc on pc.id = pcv.product_catalog_id
    where pc.owner_id is not null;

    if personal_names is not null then
      raise exception 'Para compartir el grupo, quita estos productos personales: %', personal_names
        using errcode = '22023';
    end if;
  end if;

  insert into public.product_groups (owner_id, household_id, name)
  values (current_user_id, target_household_id, trimmed_name)
  returning id into new_group_id;

  insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
  select new_group_id, item_rows.variant_id, item_rows.quantity, (item_rows.item_order - 1)::integer
  from unnest(variant_ids, quantities) with ordinality as item_rows(variant_id, quantity, item_order);

  return new_group_id;
end;
$$;

revoke execute on function public.create_product_group(text, boolean, jsonb) from public, anon;
grant execute on function public.create_product_group(text, boolean, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. get_personal_product_usage: suma group_count.
--
-- Cambia el tipo de retorno, así que se borra y se vuelve a crear (con los
-- mismos permisos que en la 052). Cuenta todos los grupos que tienen alguna
-- presentación del producto, también los de otros miembros: igual que con las
-- recetas, devuelve solo cantidades.
-- ----------------------------------------------------------------------------
drop function public.get_personal_product_usage(uuid);

create function public.get_personal_product_usage(target_product_id uuid)
returns table (active_list_count integer, recipe_count integer, group_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión'
      using errcode = '42501';
  end if;

  if not public.can_manage_personal_product(target_product_id) then
    raise exception 'No encontramos ese producto'
      using errcode = '42501';
  end if;

  return query
  select
    (
      select count(distinct li.list_id)::integer
      from public.list_items li
      join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
      join public.lists l on l.id = li.list_id
      where pcv.product_catalog_id = target_product_id
        and l.status = 'active'
    ),
    (
      select count(distinct ri.recipe_id)::integer
      from public.recipe_ingredients ri
      where ri.product_catalog_id = target_product_id
    ),
    (
      select count(distinct pgi.group_id)::integer
      from public.product_group_items pgi
      join public.product_catalog_variants pcv on pcv.id = pgi.product_catalog_variant_id
      where pcv.product_catalog_id = target_product_id
    );
end;
$$;

revoke execute on function public.get_personal_product_usage(uuid) from public, anon;
grant execute on function public.get_personal_product_usage(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. delete_personal_product: un producto en un grupo también se archiva.
--
-- Misma firma que en la 052: create or replace conserva sus permisos.
-- ----------------------------------------------------------------------------
create or replace function public.delete_personal_product(target_product_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_in_use boolean;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para eliminar un producto'
      using errcode = '42501';
  end if;

  if not public.can_manage_personal_product(target_product_id) then
    raise exception 'No encontramos ese producto'
      using errcode = '42501';
  end if;

  select
    exists (
      select 1
      from public.list_items li
      join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
      where pcv.product_catalog_id = target_product_id
    )
    or exists (
      select 1 from public.recipe_ingredients ri
      where ri.product_catalog_id = target_product_id
    )
    or exists (
      select 1
      from public.list_item_shortfall_snapshots s
      join public.product_catalog_variants pcv on pcv.id = s.previous_variant_id
      where pcv.product_catalog_id = target_product_id
    )
    -- SCRUM-110: un grupo de productos (054).
    or exists (
      select 1
      from public.product_group_items pgi
      join public.product_catalog_variants pcv on pcv.id = pgi.product_catalog_variant_id
      where pcv.product_catalog_id = target_product_id
    )
  into is_in_use;

  if is_in_use then
    update public.product_catalog
    set archived_at = now()
    where id = target_product_id;

    return 'archived';
  end if;

  -- Cascada: variantes, marcas y precios (020).
  delete from public.product_catalog
  where id = target_product_id;

  return 'deleted';
end;
$$;
