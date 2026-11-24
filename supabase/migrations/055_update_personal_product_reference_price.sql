-- ============================================================================
-- SCRUM-89 (HU-58, tarea 22.3): editar la tienda y el precio de referencia.
--
-- HU-57 (SCRUM-88, migración 051) agregó a la variante reference_price,
-- reference_store_id y reference_store_name, pero solo create_personal_product
-- los escribe. update_personal_product (052/053) suma ahora los mismos tres
-- parámetros opcionales que create_personal_product:
--   - new_reference_price: precio, o null (sin precio);
--   - new_reference_store_slug: uno de los supermercados de `stores`;
--   - new_reference_store_name: una tienda escrita a mano.
--
-- Editar reemplaza lo que había: un parámetro en null borra ese dato. Es la
-- misma regla que la marca (052): el formulario manda siempre el estado
-- completo del producto.
--
-- Mismas validaciones y mismos errores que 051. Con parámetros nuevos,
-- `create or replace` crearía una sobrecarga en vez de reemplazar: se borra
-- la firma de 6 parámetros, igual que hizo 051 con create_personal_product.
-- Una llamada con los 6 de antes sigue funcionando (los nuevos tienen
-- default null), pero borra la tienda y el precio.
-- ============================================================================

drop function public.update_personal_product(uuid, text, uuid, text, numeric, text);

create function public.update_personal_product(
  target_product_id uuid,
  new_product_name text,
  new_category_id uuid,
  new_base_unit text,
  new_base_quantity numeric,
  new_brand_name text default null,
  new_reference_price numeric default null,
  new_reference_store_slug text default null,
  new_reference_store_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Espejo de REFERENCE_STORE_NAME_MAX_LENGTH (constants/create-product-form.constants.ts).
  max_store_name_length constant integer := 80;
  -- numeric(12,2) de base_quantity y reference_price: 10 dígitos enteros,
  -- 10^10 ya no entra. Sin este tope, la base respondería un desborde crudo (22003).
  numeric_limit constant numeric := 10000000000;
  trimmed_name text := trim(new_product_name);
  trimmed_brand_name text := trim(new_brand_name);
  trimmed_store_name text := trim(new_reference_store_name);
  resolved_store_id uuid;
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

  if new_base_quantity >= numeric_limit then
    raise exception 'La cantidad de tamaño es demasiado grande'
      using errcode = '22023';
  end if;

  -- HU-57: tienda y precio, los dos opcionales (mismas reglas que 051).
  if new_reference_price is not null
    and (new_reference_price <= 0 or new_reference_price = 'NaN'::numeric) then
    raise exception 'El precio de referencia tiene que ser mayor a 0'
      using errcode = '22023';
  end if;

  if new_reference_price is not null and new_reference_price >= numeric_limit then
    raise exception 'El precio de referencia es demasiado alto'
      using errcode = '22023';
  end if;

  if trimmed_store_name = '' then
    trimmed_store_name := null;
  end if;

  if trimmed_store_name is not null and char_length(trimmed_store_name) > max_store_name_length then
    raise exception 'El nombre de la tienda es demasiado largo'
      using errcode = '22023';
  end if;

  if new_reference_store_slug is not null and trimmed_store_name is not null then
    raise exception 'Elegí un supermercado o escribí una tienda, no las dos'
      using errcode = '22023';
  end if;

  if new_reference_store_slug is not null then
    select s.id into resolved_store_id
    from public.stores s
    where s.slug = new_reference_store_slug;

    if resolved_store_id is null then
      raise exception 'La tienda no es válida'
        using errcode = '22023';
    end if;
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

  -- trim_scale: sin ceros de sobra, mismo formato que create_personal_product (053).
  update public.product_catalog_variants
  set name = trimmed_name || ' — ' || trim_scale(rounded_quantity)::text || ' ' || new_base_unit,
      base_unit = new_base_unit,
      base_quantity = rounded_quantity,
      reference_price = new_reference_price,
      reference_store_id = resolved_store_id,
      reference_store_name = trimmed_store_name
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

revoke execute on function public.update_personal_product(uuid, text, uuid, text, numeric, text, numeric, text, text) from public, anon;
grant execute on function public.update_personal_product(uuid, text, uuid, text, numeric, text, numeric, text, text) to authenticated;
