-- ============================================================================
-- SCRUM-87 (HU-56): corrige dos problemas encontrados por el subagente
-- `security-reviewer` al revisar 031, antes de mergear el PR.
--
--   1. RLS de product_catalog/product_catalog_variants/product_brands.
--
--      "public read product_catalog"/"public read variants" (schema.sql,
--      sección RLS) quedaron en `using (true)` desde antes de que existiera
--      owner_id: en ese momento "household_id is null" significaba siempre
--      "catálogo global", así que una policy abierta no exponía nada
--      privado. 031 agregó owner_id (producto personal, "personal por
--      defecto" de CA-03) y corrigió el filtro de search_catalog/
--      list_catalog_by_category para no mezclarlo con el catálogo global,
--      pero nunca tocó la policy de la tabla — SPEC.md §10 de esta historia
--      incluso lo decía explícito ("no se toca RLS ni se agrega ninguna
--      policy"), asumiendo que seguía siendo cierto. No lo era: cualquiera,
--      incluso sin sesión (anon), puede seguir leyendo la tabla directo
--      (`supabase.from('product_catalog').select(...)`, sin pasar por
--      ninguna RPC) y ver el nombre/categoría/marca/tamaño de un producto
--      personal que su dueño nunca compartió, además de su owner_id.
--      `features/my-products/services/my-products.service.ts`
--      (`queryManualProductsBy`) de hecho depende de esta policy para su
--      propia privacidad: consulta la tabla directo, no por RPC.
--
--      Se reemplazan las tres por el mismo criterio que ya usa `lists`
--      (`owner or household member reads lists`, 024): catálogo global
--      (household_id y owner_id null) + propio (owner_id = auth.uid()) +
--      household (vía household_members) — y, para variants/brands, "visible
--      si su padre es visible" (mismo patrón que `list_items` en 024: la
--      regla vive en un solo lugar, la tabla de arriba en la cadena).
--      Restringidas a `to authenticated`: todas las pantallas que leen
--      product_catalog (`/catalogo`) ya exigen sesión (no están en
--      PUBLIC_ROUTES de session-guard), así que no hace falta nada para
--      `anon` — se deja sin policy aplicable, no se revoca el grant de tabla
--      (mismo criterio que `lists`, que tampoco revoca SELECT de anon).
--
--   2. create_personal_product: owner_id y household_id a la vez cuando se
--      comparte.
--
--      El insert original dejaba owner_id = quien crea Y household_id = su
--      household cuando share_with_household es true — contradiciendo el
--      comentario de la propia función ("household_id solo se asigna si lo
--      pidió explícitamente...") y el de my-products.service.ts ("un
--      producto nunca tiene los dos a la vez, lo decide la RPC", que daba
--      por sentado lo que debía pasar, no lo que pasaba). Como
--      `listMyProducts()` consulta por household_id y por owner_id por
--      separado y concatena sin deduplicar, un producto compartido con el
--      household salía duplicado en "Mis productos" de quien lo creó. Se
--      corrige el insert: owner_id queda null cuando el producto se
--      comparte (household_id resuelto) y con el dueño cuando no se
--      comparte — ahora sí mutuamente excluyentes, como ya prometían los
--      comentarios. No hace falta un UPDATE de datos existentes: esta
--      función es la única puerta de escritura y el feature no está
--      mergeado todavía, así que no hay filas reales con el problema.
--
-- Contrato completo: features/my-products/specs/SPEC.md §10/§12 (corregidos
-- en el mismo PR) y plan.md (SCRUM-87, desviación 2026-10-29).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RLS.
-- ----------------------------------------------------------------------------

drop policy "public read product_catalog" on public.product_catalog;
drop policy "public read variants" on public.product_catalog_variants;
drop policy "public read brands" on public.product_brands;

create policy "read global catalog, own or household products"
  on public.product_catalog
  for select
  to authenticated
  using (
    (household_id is null and owner_id is null)
    or owner_id = (select auth.uid())
    or household_id in (
      select m.household_id from public.household_members m
      where m.user_id = (select auth.uid())
    )
  );

-- Visible si su producto es visible: la regla de arriba es la única que
-- importa (mismo patrón que "reads items of visible lists", 024).
create policy "read variants of visible products"
  on public.product_catalog_variants
  for select
  to authenticated
  using (
    exists (
      select 1 from public.product_catalog pc
      where pc.id = product_catalog_variants.product_catalog_id
    )
  );

-- Visible si su variante es visible (que a su vez depende de su producto).
create policy "read brands of visible variants"
  on public.product_brands
  for select
  to authenticated
  using (
    exists (
      select 1 from public.product_catalog_variants pcv
      where pcv.id = product_brands.product_catalog_variant_id
    )
  );

-- Nota para HU-57 (SCRUM-88, precios de producto manual): cuando ese ticket
-- empiece a insertar en product_prices para variantes de productos
-- personales, revisar si su policy actual (lectura pública) necesita el
-- mismo ajuste — hoy no lo necesita porque product_prices nunca tiene filas
-- para una variante de producto manual.

-- ----------------------------------------------------------------------------
-- 2. create_personal_product: owner_id null cuando se comparte.
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

  -- owner_id y household_id nunca a la vez (fix de esta migración): un
  -- producto compartido es del household, no "del household y además de
  -- quien lo creó" — listMyProducts() consulta cada columna por separado y
  -- concatena, así que las dos a la vez lo duplicaban en "Mis productos".
  insert into public.product_catalog (owner_id, household_id, category_id, name, source)
  values (
    case when resolved_household_id is null then current_user_id else null end,
    resolved_household_id,
    category_id,
    trimmed_name,
    'manual'
  )
  returning id into new_product_id;

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
