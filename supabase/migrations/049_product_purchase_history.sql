-- ============================================================================
-- SCRUM-93 (HU-62): frecuencia e historial de compra por producto
--
-- Contrato y reglas: features/finance/specs/SPEC.md §5 (reglas 72 a 102) y §12.
--
-- Partes:
-- 1. Extensión unaccent en el esquema extensions (D41). En la base compartida no
--    estaba instalada (comprobado el 2026-11-16); si ya existe, no se toca.
-- 2. normalize_product_name: el nombre normalizado de D40 (sin espacios en los
--    extremos, en minúsculas y sin tildes). Es la única copia de esa regla.
-- 3. get_purchased_products: los productos comprados, agrupados por nombre
--    normalizado (D39), con su conteo por fila (D29), en bloques (D35) y con
--    búsqueda (D33).
-- 4. get_product_purchases: las compras de un producto (CA-02).
--
-- Seguridad (D36, revisada por security-reviewer el 2026-11-16):
-- - Las dos RPC son security invoker: leen con la RLS de quien llama
--   (purchase_sessions 016, list_items 024, product_catalog y variantes 032).
--   No amplían ningún acceso y no cambian ninguna política.
-- - Rechazan la sesión anónima dentro de su propio cuerpo (42501), con la misma
--   comprobación de require_registered_user (040). No pueden llamarla porque
--   authenticated no tiene execute sobre ella.
-- - Sin SQL dinámico: todo dato del cliente entra como parámetro. La búsqueda usa
--   position(), así que % y _ son texto.
-- - normalize_product_name es security definer y authenticated puede ejecutarla,
--   porque las RPC la llaman con el rol de quien consulta. No lee tablas: solo
--   transforma el texto que recibe.
--
-- Errores: sin cuenta registrada, 42501. Parámetros inválidos, 22023.
--
-- Número 049: elegido por la dueña de la historia y comunicado al equipo el
-- 2026-11-16.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. unaccent (D41). Antes de aplicar se comprueba en qué esquema está (plan,
--    "Datos"): si alguien ya la instaló en otro esquema, este archivo se ajusta a
--    ese esquema y no la mueve. Es una extensión de confianza: no hace falta
--    cambiar permisos sobre ella.
-- ----------------------------------------------------------------------------

create extension if not exists unaccent with schema extensions;

-- ----------------------------------------------------------------------------
-- 2. Nombre normalizado (D40).
-- - stable y no immutable: unaccent depende de un diccionario y es STABLE. Por
--   eso no se usa en índices ni en columnas generadas.
-- - Forma de dos argumentos con el diccionario calificado: con search_path = ''
--   la de un argumento no encuentra el diccionario.
-- - security definer: no depende del permiso usage sobre el esquema extensions.
-- - Consecuencia aceptada de D41: la ñ pasa a n.
-- ----------------------------------------------------------------------------

create function public.normalize_product_name(name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(extensions.unaccent('extensions.unaccent'::regdictionary, name)));
$$;

revoke execute on function public.normalize_product_name(text) from public, anon;
grant execute on function public.normalize_product_name(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Productos comprados (CA-01).
--
-- Devuelve { total_count, products }. Cada producto:
-- - product_key: el nombre normalizado, que lo identifica (D39). null si el
--   producto madre no se puede leer (regla 96);
-- - product_catalog_variant_id: la presentación, solo si no está disponible;
-- - product_name: el nombre que se muestra (D43). null si no está disponible;
-- - appearance_count: filas de list_items en compras cerradas propias (D29);
-- - last_purchased_at: el closed_at más reciente.
--
-- Orden (D33): apariciones, compra más reciente, nombre (sin nombre al final) y
-- la clave, para que sea estable.
--
-- Topes (D44 y security-reviewer, hallazgos 5 y 8): page_limit de 1 a 50,
-- page_offset de 0 a 10 000 y search_text de 100 caracteres como máximo,
-- medidos sobre el texto recibido, antes de normalizarlo.
-- ----------------------------------------------------------------------------

create function public.get_purchased_products(search_text text, page_limit integer, page_offset integer)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  normalized_search text;
  result jsonb;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada'
      using errcode = '42501';
  end if;

  if page_limit is null or page_limit < 1 or page_limit > 50 then
    raise exception 'El tamaño del bloque no es válido'
      using errcode = '22023';
  end if;

  if page_offset is null or page_offset < 0 or page_offset > 10000 then
    raise exception 'El inicio del bloque no es válido'
      using errcode = '22023';
  end if;

  if char_length(coalesce(search_text, '')) > 100 then
    raise exception 'La búsqueda es demasiado larga'
      using errcode = '22023';
  end if;

  -- Vacío después de recortar significa "sin búsqueda" (regla 93).
  normalized_search := coalesce(public.normalize_product_name(search_text), '');

  with appearances as (
    select
      li.product_catalog_variant_id,
      s.closed_at,
      pc.id as product_catalog_id,
      pc.name as catalog_name,
      (pc.owner_id is null and pc.household_id is null) as is_global,
      public.normalize_product_name(pc.name) as product_key
    from public.purchase_sessions s
    -- La RLS de list_items deja solo los artículos de listas visibles (D36).
    join public.list_items li on li.purchase_session_id = s.id
    -- Sin producto madre visible, las dos uniones quedan en null (regla 96).
    left join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
    left join public.product_catalog pc on pc.id = pcv.product_catalog_id
    where s.owner_id = auth.uid()
      and s.closed_at is not null
  ),
  products as (
    select
      a.product_key,
      case when a.product_key is null then a.product_catalog_variant_id end as unavailable_variant_id,
      count(*) as appearance_count,
      max(a.closed_at) as last_purchased_at,
      -- D43: si hay globales, el del menor id entre ellos (la fecha queda en null
      -- para los globales); si no, el de la aparición más reciente y, si empatan,
      -- el menor id. Solo elige el nombre: la agrupación es por product_key.
      (array_agg(
        a.catalog_name
        order by
          a.is_global desc,
          case when not a.is_global then a.closed_at end desc nulls last,
          a.product_catalog_id
      ))[1] as product_name
    from appearances a
    group by
      a.product_key,
      case when a.product_key is null then a.product_catalog_variant_id end
  ),
  ordered as (
    select
      p.*,
      row_number() over (
        order by
          p.appearance_count desc,
          p.last_purchased_at desc,
          p.product_name asc nulls last,
          coalesce(p.product_key, p.unavailable_variant_id::text)
      ) as list_position
    from products p
    -- Sin comodines: % y _ se buscan como texto. Un no disponible no tiene clave,
    -- así que no aparece cuando hay búsqueda.
    where normalized_search = ''
      or position(normalized_search in p.product_key) > 0
  )
  select jsonb_build_object(
    'total_count', (select count(*) from ordered),
    'products', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'product_key', o.product_key,
            'product_catalog_variant_id', o.unavailable_variant_id,
            'product_name', o.product_name,
            'appearance_count', o.appearance_count,
            'last_purchased_at', o.last_purchased_at
          )
          order by o.list_position
        )
        from ordered o
        where o.list_position > page_offset
          and o.list_position <= page_offset + page_limit
      ),
      '[]'::jsonb
    )
  )
  into result;

  return result;
end;
$$;

revoke execute on function public.get_purchased_products(text, integer, integer) from public, anon;
grant execute on function public.get_purchased_products(text, integer, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Compras de un producto (CA-02).
--
-- Recibe exactamente uno de los dos (security-reviewer, hallazgo 6):
-- - target_product_key: el product_key que devolvió la lista, comparado por
--   igualdad. El cliente no normaliza nada. Hasta 500 caracteres (D44), porque
--   los nombres del catálogo no tienen largo máximo;
-- - target_variant_id: la presentación de un "Producto no disponible".
--
-- Una fila por compra cerrada propia que lo incluye (regla 89), de la más
-- reciente a la más antigua y después por id (regla 88). Una clave o una
-- presentación que no está en ninguna compra propia devuelve vacío: no se
-- distingue "no existe" de "no es tuyo".
-- ----------------------------------------------------------------------------

create function public.get_product_purchases(target_product_key text, target_variant_id uuid)
returns table (
  id uuid,
  closed_at timestamptz,
  total_amount numeric,
  store_name text,
  appearance_count integer,
  variant_names text[]
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada'
      using errcode = '42501';
  end if;

  if (target_product_key is null) = (target_variant_id is null) then
    raise exception 'Se espera un producto o una presentación'
      using errcode = '22023';
  end if;

  if target_product_key is not null
    and (btrim(target_product_key) = '' or char_length(target_product_key) > 500) then
    raise exception 'El producto no es válido'
      using errcode = '22023';
  end if;

  return query
  select
    s.id,
    s.closed_at,
    s.total_amount,
    st.display_name,
    count(*)::integer,
    coalesce(
      array_agg(distinct pcv.name order by pcv.name) filter (where pcv.name is not null),
      '{}'::text[]
    )
  from public.purchase_sessions s
  join public.list_items li on li.purchase_session_id = s.id
  left join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
  left join public.product_catalog pc on pc.id = pcv.product_catalog_id
  left join public.stores st on st.id = s.store_id
  where s.owner_id = auth.uid()
    and s.closed_at is not null
    and (
      (target_product_key is not null
        and public.normalize_product_name(pc.name) = target_product_key)
      or (target_variant_id is not null
        and pc.id is null
        and li.product_catalog_variant_id = target_variant_id)
    )
  group by s.id, s.closed_at, s.total_amount, st.display_name
  order by s.closed_at desc, s.id;
end;
$$;

revoke execute on function public.get_product_purchases(text, uuid) from public, anon;
grant execute on function public.get_product_purchases(text, uuid) to authenticated;
