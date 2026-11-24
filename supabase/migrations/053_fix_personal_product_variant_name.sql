-- ============================================================================
-- SCRUM-89 (HU-58): nombre de la variante al editar un producto personalizado.
--
-- update_personal_product (052) arma el nombre de la variante con
-- round(cantidad, 2)::text, que siempre deja dos decimales: al editar un
-- producto de 500 g, el nombre quedaba "Queso — 500.00 g", mientras que
-- create_personal_product lo deja "Queso — 500 g". trim_scale quita los ceros
-- de sobra: 500 → "500", 1.234 → "1.23", 1.2 → "1.2", igual que al crear.
--
-- Única diferencia con 052: la expresión del nombre de la variante. Misma
-- firma, así que se reemplaza y conserva sus permisos (revoke de anon y
-- public, grant a authenticated).
-- ============================================================================

create or replace function public.update_personal_product(
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

  -- trim_scale: sin ceros de sobra, mismo formato que create_personal_product.
  update public.product_catalog_variants
  set name = trimmed_name || ' — ' || trim_scale(rounded_quantity)::text || ' ' || new_base_unit,
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
