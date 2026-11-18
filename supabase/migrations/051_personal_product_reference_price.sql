-- ============================================================================
-- SCRUM-88 (HU-57): tienda y precio de referencia de un producto personalizado.
--
-- Esta migración:
--   1. Agrega a product_catalog_variants tres columnas opcionales:
--      reference_price, reference_store_id (uno de los 3 supermercados de
--      `stores`) y reference_store_name (una tienda escrita a mano, ej.
--      "Carnicería Los Ángeles"). La tienda es una u otra, nunca las dos.
--   2. Reemplaza create_personal_product (032) por la misma función con tres
--      parámetros opcionales más, para guardarlas al crear. El supermercado
--      llega por su slug (maxipali/walmart/masxmenos, los mismos que ya
--      conoce el cliente en constants/stores.constants.ts) y la función lo
--      traduce al id de `stores`: el formulario no tiene que leer la tabla.
--
-- Por qué en la variante y no en product_prices (CA-03, "el precio manual
-- nunca se mezcla con los de scraping"):
--   - product_prices.store_id solo admite los 3 supermercados (check de
--     stores.slug) y exige una marca (product_brand_id not null): una tienda
--     escrita a mano o un producto sin marca no caben.
--   - Su policy de lectura es pública (using true): el precio de un producto
--     personal sin compartir quedaría a la vista de cualquiera.
--   - latest_prices, que sale de product_prices, alimenta los rangos de
--     "Buscar" (search_catalog, list_catalog_by_category) y el desglose por
--     supermercado del detalle: un precio manual ahí se mezclaría con los del
--     scraping, justo lo que prohíbe CA-03.
--   Guardado en la variante, el precio queda bajo la misma RLS que el
--   producto (032) y ninguna consulta de precios de scraping lo puede leer.
--
-- Contrato completo: features/my-products/specs/SPEC.md (secciones HU-57) y
-- plan.md. Decisión registrada en docs/documento-proyecto.md §4.5.1 y §6.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columnas de referencia en product_catalog_variants.
--
-- Nullable las tres: son opcionales (CA-01) y las variantes del catálogo
-- curado nunca las usan. reference_store_id usa on delete set null: si algún
-- día se quitara un supermercado, el producto conserva su precio.
-- ----------------------------------------------------------------------------
alter table public.product_catalog_variants
  add column reference_price numeric(12, 2),
  add column reference_store_id uuid references public.stores (id) on delete set null,
  add column reference_store_name text,
  add constraint product_catalog_variants_reference_price_positive
    check (reference_price is null or reference_price > 0),
  add constraint product_catalog_variants_reference_store_name_length
    check (reference_store_name is null or char_length(btrim(reference_store_name)) between 1 and 80),
  add constraint product_catalog_variants_reference_store_one_kind
    check (reference_store_id is null or reference_store_name is null);

-- ----------------------------------------------------------------------------
-- 2. create_personal_product con tienda y precio de referencia.
--
-- Se borra la firma de 6 parámetros y se crea la de 9: con "create or
-- replace" quedarían las dos como sobrecargas. Los 3 parámetros nuevos tienen
-- default null, así que una llamada con los 6 de antes (la app de develop
-- antes de este PR) sigue funcionando igual.
-- Todo lo demás es idéntico a 032: mismas validaciones, mismos errores y
-- owner_id/household_id mutuamente excluyentes.
-- ----------------------------------------------------------------------------
drop function public.create_personal_product(text, uuid, text, numeric, text, boolean);

create function public.create_personal_product(
  product_name text,
  category_id uuid,
  base_unit text,
  base_quantity numeric,
  brand_name text default null,
  share_with_household boolean default false,
  reference_price numeric default null,
  reference_store_slug text default null,
  reference_store_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_store_name_length constant integer := 80;
  current_user_id uuid := auth.uid();
  member_household_id uuid;
  resolved_household_id uuid;
  trimmed_name text := trim(product_name);
  trimmed_brand_name text := trim(brand_name);
  trimmed_store_name text := trim(reference_store_name);
  resolved_store_id uuid;
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

  -- HU-57: tienda y precio, los dos opcionales (CA-01).
  if reference_price is not null and reference_price <= 0 then
    raise exception 'El precio de referencia tiene que ser mayor a 0'
      using errcode = '22023';
  end if;

  if trimmed_store_name = '' then
    trimmed_store_name := null;
  end if;

  if trimmed_store_name is not null and char_length(trimmed_store_name) > max_store_name_length then
    raise exception 'El nombre de la tienda es demasiado largo'
      using errcode = '22023';
  end if;

  if reference_store_slug is not null and trimmed_store_name is not null then
    raise exception 'Elegí un supermercado o escribí una tienda, no las dos'
      using errcode = '22023';
  end if;

  if reference_store_slug is not null then
    select s.id into resolved_store_id
    from public.stores s
    where s.slug = reference_store_slug;

    if resolved_store_id is null then
      raise exception 'La tienda no es válida'
        using errcode = '22023';
    end if;
  end if;

  -- household_id solo se asigna si lo pidió explícitamente y de verdad
  -- pertenece a uno; nunca automático por la sola membresía (HU-56, CA-03).
  if share_with_household then
    select m.household_id into member_household_id
    from public.household_members m
    where m.user_id = current_user_id;

    resolved_household_id := member_household_id;
  else
    resolved_household_id := null;
  end if;

  -- owner_id y household_id nunca a la vez (032).
  insert into public.product_catalog (owner_id, household_id, category_id, name, source)
  values (
    case when resolved_household_id is null then current_user_id else null end,
    resolved_household_id,
    category_id,
    trimmed_name,
    'manual'
  )
  returning id into new_product_id;

  insert into public.product_catalog_variants (
    product_catalog_id,
    name,
    base_unit,
    base_quantity,
    reference_price,
    reference_store_id,
    reference_store_name
  )
  values (
    new_product_id,
    trimmed_name || ' — ' || base_quantity::text || ' ' || base_unit,
    base_unit,
    base_quantity,
    reference_price,
    resolved_store_id,
    trimmed_store_name
  )
  returning id into new_variant_id;

  if trimmed_brand_name is not null then
    insert into public.product_brands (product_catalog_variant_id, name)
    values (new_variant_id, trimmed_brand_name);
  end if;

  return new_product_id;
end;
$$;

revoke execute on function public.create_personal_product(text, uuid, text, numeric, text, boolean, numeric, text, text) from public, anon;
grant execute on function public.create_personal_product(text, uuid, text, numeric, text, boolean, numeric, text, text) to authenticated;
