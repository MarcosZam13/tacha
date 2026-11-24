-- ============================================================================
-- Prueba de la migración 049 (SCRUM-93): frecuencia e historial por producto.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 049. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, productos, listas ni compras en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 049 falla en el paso 0.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Las RPC se llaman con `set local role authenticated` y request.jwt.claims de
-- cada persona, nunca como el dueño de las tablas: así corren con la RLS real y
-- con los permisos de authenticated (security-reviewer). Como dueño, los fallos
-- de permisos de normalize_product_name no aparecerían.
--
-- Solo cuenta filas de sus propios usuarios: en la base compartida puede haber
-- datos reales. Los nombres de producto empiezan con "zz049", que no está en el
-- catálogo, para no chocar con el índice único de nombres globales (020).
--
-- Las compras se crean cerradas por el dueño de la tabla, con fechas fijas, y
-- sus artículos se tachan con el trigger de 015 apagado solo para ese paso: es
-- la única forma de fabricar varias fechas en una transacción (como en 015).
--
-- Qué comprueba (features/finance/specs/plan.md, SCRUM-93, "Pruebas"):
--   1. permisos de las RPC y de normalize_product_name;
--   2. sin sesión y sesión anónima: 42501;
--   3. normalización (D40 y D41) como authenticated;
--   4. conteo por fila y agrupación por nombre normalizado (D29 y D39);
--   5. nombre que se muestra (D43), con los desempates;
--   6. lo que no cuenta: compras abiertas, artículos sin compra y listas que no se ven;
--   7. producto no disponible (regla 96);
--   8. orden (D33);
--   9. búsqueda: normalizada, % y _ como texto, vacía y largo (D44);
--  10. bloques, total_count y topes;
--  11. detalle: filas, apariciones, presentaciones, orden, total nulo;
--  12. entradas del detalle y largo de la clave (D44);
--  13. aislamiento entre personas;
--  14. datos que cambian: destachar baja el conteo y no cambia el total (regla 90).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño). Los ids viajan entre pasos en variables de la
--    transacción (set_config(..., true)).
-- ----------------------------------------------------------------------------

do $$
begin
  assert to_regprocedure('public.get_purchased_products(text, integer, integer)') is not null,
    'falta get_purchased_products: aplicar 049 antes de esta prueba';
  assert to_regprocedure('public.get_product_purchases(text, uuid)') is not null,
    'falta get_product_purchases: aplicar 049 antes de esta prueba';
  assert to_regprocedure('public.normalize_product_name(text)') is not null,
    'falta normalize_product_name: aplicar 049 antes de esta prueba';
end $$;

-- Cambia de usuario: se llama con el rol dueño, antes de `set local role`.
create function pg_temp.as_user(user_key text, is_anonymous boolean default false)
returns void
language sql
as $$
  select set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', current_setting('tacha_test.' || user_key), 'role', 'authenticated', 'is_anonymous', is_anonymous
    )::text,
    true
  );
$$;

create function pg_temp.id_of(key text)
returns uuid
language sql
as $$
  select current_setting('tacha_test.' || key)::uuid;
$$;

create function pg_temp.new_user(user_key text)
returns uuid
language plpgsql
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email)
  values (new_id, 'authenticated', 'authenticated', new_id || '@prueba.tacha');
  perform set_config('tacha_test.' || user_key, new_id::text, true);
  return new_id;
end;
$$;

-- Producto madre con una presentación. owner_key null = catálogo global.
create function pg_temp.new_product(product_key text, product_name text, owner_key text, variant_names text[])
returns void
language plpgsql
as $$
declare
  new_product_id uuid;
  new_variant_id uuid;
  variant_name text;
  variant_index integer := 0;
begin
  insert into public.product_catalog (name, owner_id, household_id, source)
  values (
    product_name,
    case when owner_key is null then null else pg_temp.id_of(owner_key) end,
    null,
    'manual'
  )
  returning id into new_product_id;
  perform set_config('tacha_test.' || product_key, new_product_id::text, true);

  foreach variant_name in array variant_names loop
    variant_index := variant_index + 1;
    insert into public.product_catalog_variants (product_catalog_id, name, base_unit, base_quantity)
    values (new_product_id, variant_name, 'unidad', 1)
    returning id into new_variant_id;
    perform set_config('tacha_test.' || product_key || '_v' || variant_index, new_variant_id::text, true);
  end loop;
end;
$$;

create function pg_temp.new_list(list_key text, user_key text)
returns void
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into public.lists (owner_id, type) values (pg_temp.id_of(user_key), 'private') returning id into new_id;
  perform set_config('tacha_test.' || list_key, new_id::text, true);
end;
$$;

-- Compra con fecha fija. closed null = abierta.
create function pg_temp.new_purchase(purchase_key text, user_key text, closed timestamptz, spent numeric)
returns void
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into public.purchase_sessions (owner_id, store_id, started_at, closed_at, total_amount)
  values (
    pg_temp.id_of(user_key),
    (select s.id from public.stores s order by s.slug limit 1),
    coalesce(closed, now()) - interval '1 hour',
    closed,
    spent
  )
  returning id into new_id;
  perform set_config('tacha_test.' || purchase_key, new_id::text, true);
end;
$$;

-- Un artículo tachado en una compra (purchase_key null = tachado sin compra).
create function pg_temp.new_item(item_key text, list_key text, variant_key text, purchase_key text, bought integer default 1)
returns void
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested, checked_at,
                                 purchase_session_id, quantity_bought)
  values (
    pg_temp.id_of(list_key),
    pg_temp.id_of(variant_key),
    bought,
    now(),
    case when purchase_key is null then null else pg_temp.id_of(purchase_key) end,
    case when purchase_key is null then null else bought end
  )
  returning id into new_id;
  perform set_config('tacha_test.' || item_key, new_id::text, true);
end;
$$;

select pg_temp.new_user('user_a');
select pg_temp.new_user('user_b');

-- Globales: leche (dos presentaciones), azúcar, piña, dos sales con el mismo
-- nombre normalizado, un nombre con %, un nombre largo (más de 100).
select pg_temp.new_product('leche', 'zz049 Leche', null, array['zz049 1 L', 'zz049 2 L']);
select pg_temp.new_product('azucar_global', 'zz049 Azúcar', null, array['zz049 Azúcar 1 kg']);
select pg_temp.new_product('pina_global', 'zz049 Piña', null, array['zz049 Piña unidad']);
select pg_temp.new_product('sal_1', 'zz049 Sal', null, array['zz049 Sal 500 g']);
select pg_temp.new_product('sal_2', 'zz049 sál', null, array['zz049 sál 1 kg']);
select pg_temp.new_product('jugo', 'zz049 Jugo 100% natural', null, array['zz049 Jugo 1 L']);
select pg_temp.new_product('largo', 'zz049 ' || repeat('Producto con un nombre muy largo ', 5), null, array['zz049 Largo']);
-- Personales de A: azúcar y pina (se juntan con los globales), y dos panes sin global.
select pg_temp.new_product('azucar_personal', 'zz049 azucar ', 'user_a', array['zz049 Azúcar propia']);
select pg_temp.new_product('pina_personal', 'zz049 Pina', 'user_a', array['zz049 Pina propia']);
select pg_temp.new_product('pan_1', 'zz049 Pan', 'user_a', array['zz049 Pan bolsa']);
select pg_temp.new_product('pan_2', 'zz049 PAN', 'user_a', array['zz049 Pan grande']);
-- Personal de B: A no lo puede leer (032). En una lista de A sale "no disponible".
select pg_temp.new_product('secreto', 'zz049 Secreto', 'user_b', array['zz049 Secreto 1']);

select pg_temp.new_list('list_a', 'user_a');
select pg_temp.new_list('list_b', 'user_b');

select pg_temp.new_purchase('p1', 'user_a', '2026-11-01 10:00+00', null);     -- sin total
select pg_temp.new_purchase('p2', 'user_a', '2026-11-05 10:00+00', 15000);
select pg_temp.new_purchase('p3', 'user_a', '2026-11-09 10:00+00', 0);
select pg_temp.new_purchase('p_open', 'user_a', null, null);                  -- abierta
select pg_temp.new_purchase('p_b', 'user_b', '2026-11-07 10:00+00', 9000);

alter table public.list_items disable trigger list_items_stamp_check;

-- Leche: p1 una fila de 3 unidades (1 aparición); p2 dos filas de 1 L y una de 2 L (3).
select pg_temp.new_item('i_leche_p1', 'list_a', 'leche_v1', 'p1', 3);
select pg_temp.new_item('i_leche_p2_a', 'list_a', 'leche_v1', 'p2');
select pg_temp.new_item('i_leche_p2_b', 'list_a', 'leche_v1', 'p2');
select pg_temp.new_item('i_leche_p2_c', 'list_a', 'leche_v2', 'p2');
-- No cuentan: la compra abierta y un tachado sin compra.
select pg_temp.new_item('i_leche_open', 'list_a', 'leche_v1', 'p_open');
select pg_temp.new_item('i_leche_sin_compra', 'list_a', 'leche_v2', null);
-- Azúcar: global en p1, personal en p3 (más reciente). Se muestra el global.
select pg_temp.new_item('i_azucar_g', 'list_a', 'azucar_global_v1', 'p1');
select pg_temp.new_item('i_azucar_p', 'list_a', 'azucar_personal_v1', 'p3');
-- Piña: global en p1, personal "Pina" en p2.
select pg_temp.new_item('i_pina_g', 'list_a', 'pina_global_v1', 'p1');
select pg_temp.new_item('i_pina_p', 'list_a', 'pina_personal_v1', 'p2');
-- Sal: los dos globales. El de menor id va en la compra más antigua y el de
-- mayor id en la más reciente, para que el caso distinga D43 de "la más reciente".
select pg_temp.new_item('i_sal_old', 'list_a',
  case when pg_temp.id_of('sal_1') < pg_temp.id_of('sal_2') then 'sal_1_v1' else 'sal_2_v1' end, 'p1');
select pg_temp.new_item('i_sal_new', 'list_a',
  case when pg_temp.id_of('sal_1') < pg_temp.id_of('sal_2') then 'sal_2_v1' else 'sal_1_v1' end, 'p3');
-- Pan: dos personales sin global; "zz049 PAN" es el más reciente.
select pg_temp.new_item('i_pan_1', 'list_a', 'pan_1_v1', 'p1');
select pg_temp.new_item('i_pan_2', 'list_a', 'pan_2_v1', 'p3');
-- Jugo y largo: una aparición cada uno.
select pg_temp.new_item('i_jugo', 'list_a', 'jugo_v1', 'p2');
select pg_temp.new_item('i_largo', 'list_a', 'largo_v1', 'p3');
-- No disponible: el personal de B, en una lista y una compra de A.
select pg_temp.new_item('i_secreto_a', 'list_a', 'secreto_v1', 'p2');
-- Lista que A no ve (de B) colgada de una compra de A: no cuenta (024, D36).
select pg_temp.new_item('i_lista_ajena', 'list_b', 'leche_v1', 'p3');
-- Lo de B, en su propia compra.
select pg_temp.new_item('i_b', 'list_b', 'secreto_v1', 'p_b');

alter table public.list_items enable trigger list_items_stamp_check;

-- La sal que se muestra es la de menor id (D43), sin importar cuál se creó primero.
select set_config(
  'tacha_test.sal_expected',
  (select pc.name from public.product_catalog pc
   where pc.id in (pg_temp.id_of('sal_1'), pg_temp.id_of('sal_2'))
   order by pc.id limit 1),
  true
);
-- ----------------------------------------------------------------------------
-- 1. Permisos.
-- ----------------------------------------------------------------------------

do $$
begin
  assert has_function_privilege('authenticated', 'public.get_purchased_products(text, integer, integer)', 'execute'),
    'authenticated tiene que poder leer la lista';
  assert has_function_privilege('authenticated', 'public.get_product_purchases(text, uuid)', 'execute'),
    'authenticated tiene que poder leer el detalle';
  assert has_function_privilege('authenticated', 'public.normalize_product_name(text)', 'execute'),
    'authenticated tiene que poder normalizar (las RPC son security invoker)';
  assert not has_function_privilege('anon', 'public.get_purchased_products(text, integer, integer)', 'execute'),
    'anon no puede leer la lista';
  assert not has_function_privilege('anon', 'public.get_product_purchases(text, uuid)', 'execute'),
    'anon no puede leer el detalle';
  assert not has_function_privilege('anon', 'public.normalize_product_name(text)', 'execute'),
    'anon no puede normalizar';
  assert (select p.prosecdef from pg_proc p where p.oid = 'public.get_purchased_products(text, integer, integer)'::regprocedure) = false,
    'la lista es security invoker (D36)';
  assert (select p.prosecdef from pg_proc p where p.oid = 'public.get_product_purchases(text, uuid)'::regprocedure) = false,
    'el detalle es security invoker (D36)';
  assert (select p.provolatile from pg_proc p where p.oid = 'public.normalize_product_name(text)'::regprocedure) = 's',
    'la normalización es stable, no immutable';
end $$;

set local role anon;

do $$
begin
  begin
    perform public.get_purchased_products('', 10, 0);
    assert false, 'anon leyó la lista';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.get_product_purchases('zz049 leche', null);
    assert false, 'anon leyó el detalle';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión y sesión anónima (con el id de A): 42501, antes de validar.
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{}', true);
set local role authenticated;

do $$
begin
  begin
    perform public.get_purchased_products('', 10, 0);
    assert false, 'sin sesión se leyó la lista';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sin sesión: el 42501 es por falta de cuenta';
  end;
  begin
    perform * from public.get_product_purchases(null, null);
    assert false, 'sin sesión se validaron los parámetros primero';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select pg_temp.as_user('user_a', true);
set local role authenticated;

do $$
begin
  begin
    perform public.get_purchased_products('', 10, 0);
    assert false, 'una sesión anónima leyó la lista';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_purchased_products(repeat('x', 500), 0, -1);
    assert false, 'una sesión anónima recibió 22023 antes que 42501';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.get_product_purchases('zz049 leche', null);
    assert false, 'una sesión anónima leyó el detalle';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 3 a 8. Lista completa, como A (authenticated, con search_path real).
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_a');
set local role authenticated;

do $$
declare
  page jsonb := public.get_purchased_products('', 50, 0);
  products jsonb := page -> 'products';
  leche jsonb;
  azucar jsonb;
  pina jsonb;
  sal jsonb;
  pan jsonb;
  unavailable jsonb;
begin
  -- 3. Normalización (D40, D41), como authenticated: detecta los hallazgos 1 y 2.
  assert public.normalize_product_name('  Azúcar ') = 'azucar', 'quita espacios, mayúsculas y tildes';
  assert public.normalize_product_name('Piña') = 'pina', 'la ñ pasa a n (consecuencia aceptada de D41)';
  assert public.normalize_product_name(null) is null, 'null queda null';

  select p into leche from jsonb_array_elements(products) p where p ->> 'product_key' = 'zz049 leche';
  select p into azucar from jsonb_array_elements(products) p where p ->> 'product_key' = 'zz049 azucar';
  select p into pina from jsonb_array_elements(products) p where p ->> 'product_key' = 'zz049 pina';
  select p into sal from jsonb_array_elements(products) p where p ->> 'product_key' = 'zz049 sal';
  select p into pan from jsonb_array_elements(products) p where p ->> 'product_key' = 'zz049 pan';
  select p into unavailable from jsonb_array_elements(products) p where p ->> 'product_key' is null;

  -- 4. Conteo por fila (D29) y agrupación por nombre normalizado (D39).
  assert (page ->> 'total_count')::integer = 8,
    format('A tiene 8 productos (leche, azúcar, piña, sal, pan, jugo, largo, no disponible); hay %s', page ->> 'total_count');
  assert jsonb_array_length(products) = 8, 'el bloque de 50 trae los 8';
  assert (leche ->> 'appearance_count')::integer = 4,
    'leche: 1 fila en p1 (3 unidades) + 3 filas en p2; no cuentan la compra abierta, el tachado sin compra ni la lista ajena';
  assert (leche ->> 'last_purchased_at')::timestamptz = '2026-11-05 10:00+00', 'leche: su compra más reciente es p2';
  assert leche -> 'product_catalog_variant_id' = 'null'::jsonb, 'un producto disponible no trae presentación';
  assert (azucar ->> 'appearance_count')::integer = 2, 'el azúcar global y el personal se juntan';
  assert (pina ->> 'appearance_count')::integer = 2, 'Piña y Pina se juntan';
  assert (sal ->> 'appearance_count')::integer = 2, 'las dos sales globales se juntan';
  assert (pan ->> 'appearance_count')::integer = 2, 'los dos panes personales se juntan';

  -- 5. Nombre que se muestra (D43).
  assert azucar ->> 'product_name' = 'zz049 Azúcar', 'con un global, su nombre, aunque el personal sea más reciente';
  assert pina ->> 'product_name' = 'zz049 Piña', 'con un global, su nombre';
  assert sal ->> 'product_name' = current_setting('tacha_test.sal_expected'),
    'entre varios globales, el del menor product_catalog.id, no el más reciente';
  assert pan ->> 'product_name' = 'zz049 PAN', 'sin global, el de la aparición más reciente';

  -- 7. No disponible (regla 96): sin clave ni nombre, con su presentación.
  assert unavailable is not null, 'el producto personal de B en una compra de A sale como no disponible';
  assert unavailable -> 'product_name' = 'null'::jsonb, 'un no disponible no tiene nombre';
  assert (unavailable ->> 'product_catalog_variant_id')::uuid = pg_temp.id_of('secreto_v1'),
    'un no disponible trae su presentación';
  assert (unavailable ->> 'appearance_count')::integer = 1, 'el no disponible cuenta su fila';
  assert not exists (select 1 from jsonb_array_elements(products) p where p ->> 'product_name' = 'zz049 Secreto'),
    'el nombre de un producto que A no puede leer no aparece';

  -- 8. Orden (D33): apariciones, más reciente, nombre, sin nombre al final.
  assert products -> 0 ->> 'product_key' = 'zz049 leche', 'leche (4) va primero';
  -- Con 1 aparición: largo (p3), jugo (p2) y el no disponible (p2), que va
  -- después de jugo porque no tiene nombre.
  assert (select array_agg(p ->> 'product_key' order by ord)
          from jsonb_array_elements(products) with ordinality as t(p, ord)
          where (p ->> 'appearance_count')::integer = 1)
         is not distinct from
         array[public.normalize_product_name('zz049 ' || repeat('Producto con un nombre muy largo ', 5)),
               'zz049 jugo 100% natural', null]::text[],
    'con 1 aparición: primero la compra más reciente; sin nombre al final del empate';
  assert (select array_agg(p ->> 'product_key' order by ord)
          from jsonb_array_elements(products) with ordinality as t(p, ord)
          where (p ->> 'appearance_count')::integer = 2
            and (p ->> 'last_purchased_at')::timestamptz = '2026-11-09 10:00+00')
         = array['zz049 azucar', 'zz049 pan', 'zz049 sal']::text[],
    'empate en apariciones y fecha: por nombre';
  assert (select max(ord) from jsonb_array_elements(products) with ordinality as t(p, ord)
          where p ->> 'product_key' = 'zz049 pina')
       > (select max(ord) from jsonb_array_elements(products) with ordinality as t(p, ord)
          where p ->> 'product_key' = 'zz049 sal'),
    'empate en apariciones: la compra más reciente va antes';
end $$;

-- ----------------------------------------------------------------------------
-- 9. Búsqueda.
-- ----------------------------------------------------------------------------

do $$
declare
  page jsonb;
begin
  page := public.get_purchased_products('  ZZ049 AZUCAR ', 50, 0);
  assert (page ->> 'total_count')::integer = 1 and page -> 'products' -> 0 ->> 'product_name' = 'zz049 Azúcar',
    '"azucar" encuentra "Azúcar": sin mayúsculas, espacios de los extremos ni tildes';

  page := public.get_purchased_products('ech', 50, 0);
  assert (page ->> 'total_count')::integer = 1 and page -> 'products' -> 0 ->> 'product_key' = 'zz049 leche',
    'coincidencia parcial';

  page := public.get_purchased_products('100%', 50, 0);
  assert (page ->> 'total_count')::integer = 1 and page -> 'products' -> 0 ->> 'product_key' = 'zz049 jugo 100% natural',
    '% se busca como texto';

  page := public.get_purchased_products('%', 50, 0);
  assert (page ->> 'total_count')::integer = 1, '% solo encuentra nombres con %';

  page := public.get_purchased_products('zz049_', 50, 0);
  assert (page ->> 'total_count')::integer = 0, '_ se busca como texto, no como comodín';

  page := public.get_purchased_products('zz049 secreto', 50, 0);
  assert (page ->> 'total_count')::integer = 0, 'la búsqueda no encuentra productos que A no puede leer';

  page := public.get_purchased_products('zzz-sin-resultados', 50, 0);
  assert (page ->> 'total_count')::integer = 0 and page -> 'products' = '[]'::jsonb, 'sin resultados: lista vacía';

  page := public.get_purchased_products('   ', 50, 0);
  assert (page ->> 'total_count')::integer = 8, 'solo espacios es "sin búsqueda" y trae también el no disponible';

  page := public.get_purchased_products(null, 50, 0);
  assert (page ->> 'total_count')::integer = 8, 'null es "sin búsqueda"';

  page := public.get_purchased_products('zz049 ' || repeat('x', 94), 50, 0);
  assert (page ->> 'total_count')::integer = 0, '100 caracteres son válidos (D44)';

  begin
    perform public.get_purchased_products(repeat('x', 101), 50, 0);
    assert false, 'una búsqueda de 101 caracteres se aceptó';
  exception when invalid_parameter_value then null;
  end;

  -- El largo se mide antes de recortar: 99 letras y 2 espacios son 101.
  begin
    perform public.get_purchased_products(' ' || repeat('x', 99) || ' ', 50, 0);
    assert false, 'el largo se midió después de recortar';
  exception when invalid_parameter_value then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 10. Bloques y topes.
-- ----------------------------------------------------------------------------

do $$
declare
  full_list jsonb := public.get_purchased_products('', 50, 0) -> 'products';
  first_page jsonb := public.get_purchased_products('', 3, 0);
  second_page jsonb := public.get_purchased_products('', 3, 3);
  last_page jsonb := public.get_purchased_products('', 3, 6);
  past_end jsonb := public.get_purchased_products('', 3, 100);
begin
  assert (first_page ->> 'total_count')::integer = 8 and jsonb_array_length(first_page -> 'products') = 3,
    'el primer bloque trae 3 y el total de todos';
  assert first_page -> 'products' || (second_page -> 'products') || (last_page -> 'products') = full_list,
    'los bloques, unidos, son la lista completa en el mismo orden';
  assert jsonb_array_length(last_page -> 'products') = 2, 'el último bloque trae lo que queda';
  assert (past_end ->> 'total_count')::integer = 8 and past_end -> 'products' = '[]'::jsonb,
    'un offset más allá del final: lista vacía con el total';
  assert (public.get_purchased_products('', 1, 10000) -> 'products') = '[]'::jsonb, 'el offset tope es válido';

  begin
    perform public.get_purchased_products('', 0, 0);
    assert false, 'page_limit 0 se aceptó';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.get_purchased_products('', 51, 0);
    assert false, 'page_limit 51 se aceptó';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.get_purchased_products('', null, 0);
    assert false, 'page_limit nulo se aceptó';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.get_purchased_products('', 10, -1);
    assert false, 'page_offset negativo se aceptó';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.get_purchased_products('', 10, 10001);
    assert false, 'page_offset sobre el tope se aceptó';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.get_purchased_products('', 10, null);
    assert false, 'page_offset nulo se aceptó';
  exception when invalid_parameter_value then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 11. Detalle.
-- ----------------------------------------------------------------------------

do $$
declare
  rows_leche jsonb;
  long_key text := (
    select p ->> 'product_key'
    from jsonb_array_elements(public.get_purchased_products('muy largo', 50, 0) -> 'products') p
  );
begin
  select jsonb_agg(to_jsonb(r)) into rows_leche from public.get_product_purchases('zz049 leche', null) r;

  assert jsonb_array_length(rows_leche) = 2, 'leche: una fila por compra (p2 y p1)';
  assert (rows_leche -> 0 ->> 'id')::uuid = pg_temp.id_of('p2') and (rows_leche -> 1 ->> 'id')::uuid = pg_temp.id_of('p1'),
    'de la más reciente a la más antigua (regla 88)';
  assert (rows_leche -> 0 ->> 'appearance_count')::integer = 3 and (rows_leche -> 1 ->> 'appearance_count')::integer = 1,
    'apariciones por compra';
  assert (select sum((r ->> 'appearance_count')::integer) from jsonb_array_elements(rows_leche) r) = 4,
    'la suma de apariciones es el conteo de la lista (regla 89)';
  assert rows_leche -> 0 -> 'variant_names' = '["zz049 1 L", "zz049 2 L"]'::jsonb, 'presentaciones de la compra, sin repetir';
  assert (rows_leche -> 0 ->> 'total_amount')::numeric = 15000, 'total de la compra completa';
  assert rows_leche -> 1 -> 'total_amount' = 'null'::jsonb, 'una compra sin total devuelve null';
  assert rows_leche -> 0 ->> 'store_name' is not null, 'trae el supermercado';

  assert (select count(*) from public.get_product_purchases('zz049 azucar', null)) = 2,
    'el detalle junta las presentaciones de todos los productos con el mismo nombre';
  assert (select r.appearance_count from public.get_product_purchases(null, pg_temp.id_of('secreto_v1')) r) = 1,
    'el detalle de un no disponible, por su presentación';
  assert (select r.variant_names from public.get_product_purchases(null, pg_temp.id_of('secreto_v1')) r) = '{}'::text[],
    'un no disponible no muestra el nombre de su presentación';
  assert (select count(*) from public.get_product_purchases(null, pg_temp.id_of('leche_v1'))) = 0,
    'la presentación de un producto visible no se consulta por id: va por su clave';

  -- D44: una clave real de más de 100 caracteres tiene detalle.
  assert char_length(long_key) > 100, 'el producto largo tiene una clave de más de 100';
  assert (select count(*) from public.get_product_purchases(long_key, null)) = 1, 'una clave de más de 100 tiene su detalle';
end $$;

-- ----------------------------------------------------------------------------
-- 12. Entradas del detalle (hallazgo 6 y D44): 22023.
-- ----------------------------------------------------------------------------

do $$
begin
  begin
    perform * from public.get_product_purchases('zz049 leche', pg_temp.id_of('secreto_v1'));
    assert false, 'se aceptaron los dos parámetros';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform * from public.get_product_purchases(null, null);
    assert false, 'se aceptó ningún parámetro';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform * from public.get_product_purchases('', null);
    assert false, 'se aceptó una clave vacía';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform * from public.get_product_purchases('   ', null);
    assert false, 'se aceptó una clave en blanco';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform * from public.get_product_purchases(repeat('x', 501), null);
    assert false, 'se aceptó una clave de 501 caracteres';
  exception when invalid_parameter_value then null;
  end;
  assert (select count(*) from public.get_product_purchases(repeat('x', 500), null)) = 0,
    'una clave de 500 caracteres es válida (D44)';
  assert (select count(*) from public.get_product_purchases('zz049 no existe', null)) = 0,
    'una clave que no está en ninguna compra devuelve vacío';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 13. Aislamiento: B no ve lo de A, y A no ve lo de B.
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_b');
set local role authenticated;

do $$
declare
  page jsonb := public.get_purchased_products('', 50, 0);
begin
  assert (page ->> 'total_count')::integer = 1 and page -> 'products' -> 0 ->> 'product_key' = 'zz049 secreto',
    'B solo ve su producto, en su compra; no la leche de A ni el artículo de su lista en la compra de A';
  assert (select count(*) from public.get_product_purchases('zz049 leche', null)) = 0, 'B no ve las compras de A';
  assert (select count(*) from public.get_product_purchases(null, pg_temp.id_of('secreto_v1'))) = 0,
    'B ve su producto, así que no es un no disponible para B';
  assert (select count(*) from public.get_product_purchases('zz049 secreto', null)) = 1, 'B ve su propia compra';
end $$;

reset role;
select pg_temp.as_user('user_a');
set local role authenticated;

do $$
begin
  assert (select count(*) from public.get_product_purchases('zz049 secreto', null)) = 0,
    'A no puede consultar el producto de B por su clave';
end $$;

-- ----------------------------------------------------------------------------
-- 14. Datos que cambian (regla 90): destachar baja el conteo; el total no cambia.
-- ----------------------------------------------------------------------------

update public.list_items set checked_at = null where id = pg_temp.id_of('i_leche_p2_c');

do $$
declare
  leche jsonb;
begin
  select p into leche
  from jsonb_array_elements(public.get_purchased_products('zz049 leche', 50, 0) -> 'products') p;
  assert (leche ->> 'appearance_count')::integer = 3, 'destachar la fila de 2 L baja el conteo a 3';
  assert (select r.variant_names from public.get_product_purchases('zz049 leche', null) r
          where r.id = pg_temp.id_of('p2')) = '{"zz049 1 L"}'::text[],
    'la presentación destachada sale del detalle';
  assert (select s.total_amount from public.purchase_sessions s where s.id = pg_temp.id_of('p2')) = 15000,
    'el total de la compra no cambia';
end $$;

reset role;

select set_config('tacha_test.done', 'ok', true);

rollback;
