-- ============================================================================
-- SCRUM-89 (HU-58): editar o eliminar un producto personalizado.
--
-- Esta migración:
--   1. Agrega product_catalog.archived_at (nullable): un producto
--      personalizado "eliminado" que todavía usa alguna lista o receta queda
--      archivado en vez de borrarse (ver punto 4).
--   2. can_manage_personal_product: regla única de quién puede editar o
--      eliminar un producto personalizado. Interna, sin grant al cliente.
--   3. get_personal_product_usage: cuántas listas activas y cuántas recetas
--      usan el producto, para el aviso de CA-02.
--   4. update_personal_product y delete_personal_product: las únicas puertas
--      de escritura, igual que create_personal_product (031/032): anon y
--      authenticated no tienen UPDATE ni DELETE sobre product_catalog,
--      product_catalog_variants ni product_brands (020, revoke).
--
-- Quién puede editar o eliminar (punto 2):
--   - Un producto personal sin compartir: su dueño (owner_id = auth.uid()).
--   - Un producto compartido: cualquier miembro actual de su household. Al
--     compartir, create_personal_product deja owner_id en null (032), así que
--     no queda registrado quién lo creó; es el mismo criterio que las listas
--     del household (024), que edita cualquier miembro.
--   - Nunca un producto del catálogo global (owner_id y household_id null)
--     ni uno ya archivado.
--
-- Por qué archivar y no borrar siempre (punto 4, decisión del dueño de la
-- historia): list_items.product_catalog_variant_id y
-- recipe_ingredients.product_catalog_id apuntan al producto sin on delete
-- (verificado contra la base real), así que un producto en uso no se puede
-- borrar sin antes borrar ítems de listas (con su historial de compras) e
-- ingredientes de recetas. Archivado, desaparece de "Mis productos" y todo
-- lo que lo usa sigue funcionando. Si nada lo usa, se borra de verdad.
--
-- Editar no cambia si el producto está compartido: dejar de compartirlo
-- rompería las listas de los demás miembros, y re-decidirlo ya quedó fuera
-- de alcance en SCRUM-87 (features/my-products/specs/SPEC.md §14).
--
-- Los parámetros llevan prefijo (target_, new_) para no llamarse igual que
-- las columnas que actualizan: en un "update ... set category_id =
-- category_id", plpgsql no sabría si es la columna o el parámetro.
--
-- Contrato completo: features/my-products/specs/SPEC.md (secciones HU-58) y
-- plan.md. Decisión registrada en docs/documento-proyecto.md §6.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. archived_at.
-- ----------------------------------------------------------------------------
alter table public.product_catalog
  add column archived_at timestamptz;

-- ----------------------------------------------------------------------------
-- 2. Quién puede editar o eliminar un producto personalizado.
--
-- security definer para leer household_members sin depender de la RLS de
-- quien llama; solo la usan las funciones de abajo (sin grant al cliente).
-- ----------------------------------------------------------------------------
create function public.can_manage_personal_product(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.product_catalog pc
    where pc.id = target_product_id
      and pc.source = 'manual'
      and pc.archived_at is null
      and (
        pc.owner_id = auth.uid()
        or pc.household_id in (
          select m.household_id from public.household_members m
          where m.user_id = auth.uid()
        )
      )
  );
$$;

revoke execute on function public.can_manage_personal_product(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Uso del producto, para el aviso de CA-02.
--
-- security definer porque las recetas solo las ve su dueño (RLS de recipes):
-- en un producto compartido, el aviso tiene que contar también las recetas
-- de los demás miembros. Devuelve solo cantidades, nunca nombres ni ids.
-- "Listas activas" = listas con status 'active' que tienen al menos un ítem
-- de alguna variante del producto (CA-02: "lista ... activa").
-- ----------------------------------------------------------------------------
create function public.get_personal_product_usage(target_product_id uuid)
returns table (active_list_count integer, recipe_count integer)
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
    );
end;
$$;

revoke execute on function public.get_personal_product_usage(uuid) from public, anon;
grant execute on function public.get_personal_product_usage(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4a. Editar.
--
-- Mismas validaciones que create_personal_product. Un producto personalizado
-- tiene una sola variante (la crea create_personal_product), así que se
-- actualiza esa; su nombre se recalcula con el mismo criterio
-- "{producto} — {tamaño}". La marca se reemplaza: sin marca nueva, se borra
-- la que hubiera (product_brands no tiene precios del scraping en un
-- producto personal, así que el cascade de product_prices no borra nada real).
-- ----------------------------------------------------------------------------
create function public.update_personal_product(
  target_product_id uuid,
  new_product_name text,
  new_category_id uuid,
  new_base_unit text,
  new_base_quantity numeric,
  new_brand_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- numeric(12,2) de base_quantity: 10 dígitos enteros, 10^10 ya no entra.
  -- Sin este tope, la base respondería un desborde crudo (22003).
  base_quantity_limit constant numeric := 10000000000;
  trimmed_name text := trim(new_product_name);
  trimmed_brand_name text := trim(new_brand_name);
  rounded_quantity numeric;
  target_variant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para editar un producto'
      using errcode = '42501';
  end if;

  if not public.can_manage_personal_product(target_product_id) then
    raise exception 'No encontramos ese producto'
      using errcode = '42501';
  end if;

  if trimmed_name is null or trimmed_name = '' then
    raise exception 'El nombre del producto es obligatorio'
      using errcode = '22023';
  end if;

  if new_category_id is null or not exists (
    select 1 from public.categories c where c.id = new_category_id
  ) then
    raise exception 'La categoría no es válida'
      using errcode = '22023';
  end if;

  if new_base_unit is null or new_base_unit not in ('ml', 'g', 'unidad') then
    raise exception 'La unidad de tamaño no es válida'
      using errcode = '22023';
  end if;

  if new_base_quantity is null or new_base_quantity <= 0 or new_base_quantity = 'NaN'::numeric then
    raise exception 'La cantidad de tamaño tiene que ser mayor a 0'
      using errcode = '22023';
  end if;

  if new_base_quantity >= base_quantity_limit then
    raise exception 'La cantidad de tamaño es demasiado grande'
      using errcode = '22023';
  end if;

  -- El nombre de la variante usa el mismo valor que guarda la columna
  -- numeric(12,2), no el que llegó (1.234 se guarda 1.23).
  rounded_quantity := round(new_base_quantity, 2);

  if trimmed_brand_name = '' then
    trimmed_brand_name := null;
  end if;

  update public.product_catalog
  set name = trimmed_name,
      category_id = new_category_id
  where id = target_product_id;

  update public.product_catalog_variants
  set name = trimmed_name || ' — ' || rounded_quantity::text || ' ' || new_base_unit,
      base_unit = new_base_unit,
      base_quantity = rounded_quantity
  where product_catalog_id = target_product_id
  returning id into target_variant_id;

  -- create_personal_product siempre crea la variante; si faltara, es un error
  -- de datos y no se sigue con la marca (falla toda la transacción).
  if target_variant_id is null then
    raise exception 'El producto no tiene variante de tamaño'
      using errcode = 'P0002';
  end if;

  delete from public.product_brands
  where product_catalog_variant_id = target_variant_id;

  if trimmed_brand_name is not null then
    insert into public.product_brands (product_catalog_variant_id, name)
    values (target_variant_id, trimmed_brand_name);
  end if;
end;
$$;

revoke execute on function public.update_personal_product(uuid, text, uuid, text, numeric, text) from public, anon;
grant execute on function public.update_personal_product(uuid, text, uuid, text, numeric, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4b. Eliminar: borra si nada lo usa, archiva si algo lo usa.
--
-- "Algo lo usa" = cualquier ítem de lista (de cualquier estado: una lista
-- completada guarda el historial de compras), cualquier ingrediente de
-- receta o cualquier snapshot de faltante (list_item_shortfall_snapshots,
-- que deshace un cambio de variante). Devuelve 'deleted' o 'archived'.
-- ----------------------------------------------------------------------------
create function public.delete_personal_product(target_product_id uuid)
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

revoke execute on function public.delete_personal_product(uuid) from public, anon;
grant execute on function public.delete_personal_product(uuid) to authenticated;
