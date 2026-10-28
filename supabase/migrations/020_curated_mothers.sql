-- ============================================================================
-- SCRUM-131: lista curada de productos madre y reglas de mapeo en la
-- normalización.
--
-- Ver supabase/specs/SCRUM-131/SPEC.md y plan.md para el detalle completo.
-- Origen: docs/catalogo-scraping/DECISION-SCRUM-126-poblacion-del-catalogo.md,
-- con la corrección de 2026-10-09 sobre el orden de señales (categoría de
-- VTEX antes que keyword) — justificada en spec-03-normalizacion-staging.md
-- Requirement 2 y en evidencia real de las 100 filas de staging (SPEC §2).
--
-- Qué hace esta migración:
-- 1. Tabla nueva product_mother_rules (reglas de mapeo por madre curada).
-- 2. Partial unique index en product_catalog(name) para poder hacer upsert
--    por nombre en el catálogo global sin duplicar ni tocar las 28 madres
--    viejas (que son SKU completo, no genéricas — no colisionan por nombre).
-- 3. Seed de categories / product_catalog / product_mother_rules con las 12
--    madres del primer lote (SPEC §3), generado por
--    scripts/generate-madres-migration.ts a partir de supabase/data/madres.json.
-- 4. Reescritura de normalize_staging_row: ya no crea madres nuevas; asigna
--    a una madre curada por categoría de VTEX (señal principal) o keyword
--    (respaldo/desempate) — algoritmo completo en SPEC §6. Si no hay match,
--    la fila queda pending (no se toca).
-- 5. Hardening de seguridad (comentario de Marcos, 2026-10-06):
--    - search_path fijo en las 4 funciones de catálogo/normalización.
--    - execute revocado de anon/authenticated/public en las 3 funciones de
--      normalización (solo las corre el batch con service role — search_catalog
--      se queda como está, la usa el frontend directo con la anon key).
--    - insert/update/delete/truncate revocado de anon/authenticated en las
--      tablas del catálogo. Verificado con una consulta real (2026-10-09):
--      anon y authenticated tenían hoy insert/update/delete/truncate en
--      categories, stores, product_catalog, product_catalog_variants,
--      product_brands, product_catalog_staging y product_prices (grant por
--      defecto de Supabase en tablas nuevas). RLS ya bloqueaba insert/
--      update/delete porque solo existe policy de select — pero TRUNCATE no
--      lo cubre RLS (es un chequeo a nivel de tabla, no de fila), así que
--      cualquier cliente autenticado podía vaciar el catálogo completo hoy.
--      Se incluye "stores" en el revoke aunque SPEC §4 no lo menciona
--      explícitamente: es la misma clase de tabla de catálogo y la misma
--      exposición (3 filas fijas, truncable hoy por cualquiera).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla product_mother_rules
-- ----------------------------------------------------------------------------
create table if not exists product_mother_rules (
  id                    uuid primary key default gen_random_uuid(),
  product_catalog_id    uuid not null references product_catalog(id) on delete cascade,
  match_keywords        text[] not null default '{}',
  exclude_keywords      text[] not null default '{}',
  vtex_category_prefix  text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_mother_rules_product_catalog
  on product_mother_rules(product_catalog_id);

-- Tabla nueva: nace con RLS activado y sin políticas (deny por defecto para
-- anon/authenticated). No la usa el frontend — solo la lee
-- normalize_staging_row, que corre con service role (ver sección 5 abajo).
alter table product_mother_rules enable row level security;

-- ----------------------------------------------------------------------------
-- 2. Partial unique index para upsert por nombre en el catálogo global
-- ----------------------------------------------------------------------------
-- Las 28 madres viejas son SKU completo ("Jabón Dove Leche de Coco - 90 g"),
-- nunca van a colisionar por nombre con una madre curada genérica ("Jabón").
-- Este índice solo aplica al catálogo global (household_id is null) — el
-- catálogo por household, cuando exista, no se toca.
create unique index if not exists idx_product_catalog_global_name
  on product_catalog(name)
  where household_id is null;

-- ----------------------------------------------------------------------------
-- 3. Seed: categorías, product_catalog (madres) y product_mother_rules
--    Generado por scripts/generate-madres-migration.ts desde
--    supabase/data/madres.json — no editar a mano, regenerar desde el JSON.
-- ----------------------------------------------------------------------------

-- Seed de categorías (una por categoría distinta de la lista curada).
insert into categories (name) values
  ('Lácteos'),
  ('Repostería'),
  ('Dulces y Chocolates'),
  ('Cereales'),
  ('Higiene y Belleza'),
  ('Abarrotes'),
  ('Congelados')
on conflict (name) do nothing;

-- Seed de product_catalog global con las madres curadas.
-- Upsert por nombre: nunca duplica ni borra las 28 madres viejas (coinciden
-- con la partial unique index idx_product_catalog_global_name de arriba).
insert into product_catalog (name, category_id, household_id, source) values
  ('Leche', (select id from categories where name = 'Lácteos'), null, 'manual'),
  ('Leche condensada', (select id from categories where name = 'Lácteos'), null, 'manual'),
  ('Leche evaporada', (select id from categories where name = 'Lácteos'), null, 'manual'),
  ('Leche de coco', (select id from categories where name = 'Lácteos'), null, 'manual'),
  ('Crema de leche', (select id from categories where name = 'Repostería'), null, 'manual'),
  ('Chocolate', (select id from categories where name = 'Dulces y Chocolates'), null, 'manual'),
  ('Cereal', (select id from categories where name = 'Cereales'), null, 'manual'),
  ('Dulces', (select id from categories where name = 'Dulces y Chocolates'), null, 'manual'),
  ('Jabón', (select id from categories where name = 'Higiene y Belleza'), null, 'manual'),
  ('Arroz', (select id from categories where name = 'Abarrotes'), null, 'manual'),
  ('Helado', (select id from categories where name = 'Congelados'), null, 'manual'),
  ('Repostería', (select id from categories where name = 'Repostería'), null, 'manual')
on conflict (name) where household_id is null
do update set category_id = excluded.category_id;

-- Seed de product_mother_rules — una fila por madre curada.
-- Idempotente: borra las reglas de estas madres antes de insertar, para
-- poder re-aplicar esta migración contra una base limpia sin duplicar.
delete from product_mother_rules
where product_catalog_id in (
  select id from product_catalog where name = any(
    array['Leche', 'Leche condensada', 'Leche evaporada', 'Leche de coco', 'Crema de leche', 'Chocolate', 'Cereal', 'Dulces', 'Jabón', 'Arroz', 'Helado', 'Repostería']::text[]
  ) and household_id is null
);

insert into product_mother_rules (product_catalog_id, match_keywords, exclude_keywords, vtex_category_prefix) values
  ((select id from product_catalog where name = 'Leche' and household_id is null), array['leche']::text[], array['magnesia', 'jabon', 'jabón', 'condensada', 'evaporada', 'coco']::text[], '/Lácteos/Leche/'),
  ((select id from product_catalog where name = 'Leche condensada' and household_id is null), array['leche condensada', 'condensada']::text[], '{}'::text[], '/Lácteos/Leche/Condensada/'),
  ((select id from product_catalog where name = 'Leche evaporada' and household_id is null), array['leche evaporada', 'evaporada']::text[], '{}'::text[], '/Lácteos/Leche/Evaporada/'),
  ((select id from product_catalog where name = 'Leche de coco' and household_id is null), array['leche de coco', 'coco']::text[], '{}'::text[], '/Lácteos/Leche/'),
  ((select id from product_catalog where name = 'Crema de leche' and household_id is null), array['crema de leche']::text[], '{}'::text[], '/Abarrotes/Harinas y Repostería/Repostería/'),
  ((select id from product_catalog where name = 'Chocolate' and household_id is null), array['chocolate']::text[], '{}'::text[], '/Abarrotes/Dulces y Chocolates/'),
  ((select id from product_catalog where name = 'Cereal' and household_id is null), array['cereal', 'cereales']::text[], '{}'::text[], '/Abarrotes/Cereales y Barras/'),
  ((select id from product_catalog where name = 'Dulces' and household_id is null), array['dulce', 'dulces', 'caramelo', 'caramelos']::text[], array['chocolate']::text[], '/Abarrotes/Dulces y Chocolates/'),
  ((select id from product_catalog where name = 'Jabón' and household_id is null), array['jabon', 'jabón']::text[], '{}'::text[], '/Higiene y Belleza/Cuidado Corporal/Jabón y gel corporal/'),
  ((select id from product_catalog where name = 'Arroz' and household_id is null), array['arroz']::text[], '{}'::text[], '/Abarrotes/Arroz, Frijol y Semillas/'),
  ((select id from product_catalog where name = 'Helado' and household_id is null), array['helado', 'helados']::text[], '{}'::text[], '/Alimentos Congelados/'),
  ((select id from product_catalog where name = 'Repostería' and household_id is null), array['torta', 'pastel', 'reposteria', 'repostería']::text[], '{}'::text[], '/Panadería y tortillería/Repostería y Pastelería/')
;

-- ----------------------------------------------------------------------------
-- 4. normalize_staging_row — reescritura: asigna a madre curada, no crea
--    madres. Orden de señales: categoría de VTEX primero, keyword como
--    respaldo/desempate (SPEC §6).
-- ----------------------------------------------------------------------------
create or replace function normalize_staging_row(staging_id uuid)
returns table (
  success boolean,
  product_catalog_id uuid,
  product_variant_id uuid,
  product_brand_id uuid,
  error_message text
) as $$
declare
  v_staging record;
  v_product_id uuid;
  v_variant_id uuid;
  v_brand_id uuid;
  v_base_unit text;
  v_base_quantity numeric;
  v_brand_name text;
  v_price numeric;
  v_vtex_categories text[];
begin
  -- Obtener fila de staging
  select * into v_staging
  from product_catalog_staging
  where id = staging_id
  limit 1;

  if v_staging is null then
    return query select false, null::uuid, null::uuid, null::uuid, 'Staging row not found'::text;
    return;
  end if;

  if v_staging.status != 'pending' then
    return query select false, null::uuid, null::uuid, null::uuid,
      format('Row already processed (status=%L)', v_staging.status)::text;
    return;
  end if;

  begin
    -- Parsear tamaño (sin cambios respecto a la migración 002)
    select * into v_base_unit, v_base_quantity
    from parse_size_text(v_staging.scraped_size_text);

    if v_base_unit is null then
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
      return query select false, null::uuid, null::uuid, null::uuid,
        format('Could not parse size: %L', v_staging.scraped_size_text)::text;
      return;
    end if;

    -- Categorías de VTEX de esta fila (raw_json.product.categories), ej.
    -- ["/Lácteos/Leche/Leche Entera/", "/Lácteos/Leche/", "/Lácteos/"].
    select array_agg(value) into v_vtex_categories
    from jsonb_array_elements_text(
      coalesce(v_staging.raw_json -> 'product' -> 'categories', '[]'::jsonb)
    );

    -- Señal principal: categoría de VTEX. Entre las reglas cuyo
    -- vtex_category_prefix coincide con alguna categoría de la fila (prefijo
    -- exacto, no solo substring) y que no tienen ningún exclude_keyword en
    -- scraped_name, gana la de prefijo más específico (más largo); si sigue
    -- empatada, la de más match_keywords coincidentes (desempate real: "Leche
    -- de coco" vs. "Leche", mismo prefijo "/Lácteos/Leche/" — ver SPEC §3/§6).
    select pmr.product_catalog_id into v_product_id
    from product_mother_rules pmr
    where pmr.vtex_category_prefix is not null
      and exists (
        select 1 from unnest(v_vtex_categories) cat
        where cat like pmr.vtex_category_prefix || '%'
      )
      and not exists (
        select 1 from unnest(pmr.exclude_keywords) ex
        where lower(v_staging.scraped_name) like '%' || lower(ex) || '%'
      )
    order by
      length(pmr.vtex_category_prefix) desc,
      (
        select count(*) from unnest(pmr.match_keywords) kw
        where lower(v_staging.scraped_name) like '%' || lower(kw) || '%'
      ) desc
    limit 1;

    -- Respaldo: si no hay categoría utilizable o ninguna regla la cubre,
    -- decidir solo por match_keywords (sin que aparezca ningún exclude_keyword).
    if v_product_id is null then
      select pmr.product_catalog_id into v_product_id
      from product_mother_rules pmr
      where exists (
          select 1 from unnest(pmr.match_keywords) kw
          where lower(v_staging.scraped_name) like '%' || lower(kw) || '%'
        )
        and not exists (
          select 1 from unnest(pmr.exclude_keywords) ex
          where lower(v_staging.scraped_name) like '%' || lower(ex) || '%'
        )
      order by (
        select count(*) from unnest(pmr.match_keywords) kw
        where lower(v_staging.scraped_name) like '%' || lower(kw) || '%'
      ) desc
      limit 1;
    end if;

    -- Sin match: la fila queda pending (no se toca, no se fuerza a encajar
    -- en ninguna madre — SPEC §3, caso "Leche De Magnesia Phillips").
    if v_product_id is null then
      return query select false, null::uuid, null::uuid, null::uuid,
        'No curated mother matched — row stays pending'::text;
      return;
    end if;

    -- Buscar o crear variant (igual que antes, pero product_catalog_id viene
    -- de la madre curada — nunca se inserta una madre nueva).
    select pcv.id into v_variant_id
    from product_catalog_variants pcv
    where pcv.product_catalog_id = v_product_id
      and pcv.base_unit = v_base_unit
      and pcv.base_quantity = v_base_quantity
    limit 1;

    if v_variant_id is null then
      insert into product_catalog_variants (product_catalog_id, name, base_unit, base_quantity, image_url)
      values (v_product_id, v_staging.scraped_name || ' — ' || v_staging.scraped_size_text,
              v_base_unit, v_base_quantity, v_staging.image_url)
      returning id into v_variant_id;
    end if;

    -- Manejar brand (si es null o vacío, usar "Genérica")
    v_brand_name := coalesce(trim(v_staging.scraped_brand), 'Genérica');

    select pb.id into v_brand_id
    from product_brands pb
    where pb.product_catalog_variant_id = v_variant_id
      and pb.name = v_brand_name
    limit 1;

    if v_brand_id is null then
      insert into product_brands (product_catalog_variant_id, name)
      values (v_variant_id, v_brand_name)
      returning id into v_brand_id;
    end if;

    v_price := (v_staging.raw_json -> 'offer' ->> 'Price')::numeric;

    if v_price is null then
      v_price := (v_staging.raw_json ->> 'Price')::numeric;
    end if;

    if v_price is null then
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
      return query select false, v_product_id, v_variant_id, v_brand_id,
        'Could not extract price from raw_json'::text;
      return;
    end if;

    insert into product_prices (product_catalog_variant_id, product_brand_id, store_id, price, source)
    values (v_variant_id, v_brand_id, v_staging.store_id, v_price, 'scraped');

    update product_catalog_staging
    set status = 'matched',
        matched_variant_id = v_variant_id,
        matched_brand_id = v_brand_id
    where id = staging_id;

    return query select true, v_product_id, v_variant_id, v_brand_id, null::text;

  exception when others then
    begin
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
    exception when others then
      null;
    end;

    return query select false, null::uuid, null::uuid, null::uuid,
      'Error processing row: ' || sqlerrm;
    return;
  end;
end;
$$ language plpgsql;

comment on function normalize_staging_row(uuid) is
  'Procesa UNA fila de product_catalog_staging. Asigna a una madre curada (product_mother_rules) por categoría de VTEX (señal principal) o match_keywords (respaldo/desempate) — nunca crea una madre nueva. Sin match, la fila queda pending. Marca matched/rejected según corresponda. SCRUM-131, ver supabase/specs/SCRUM-131/SPEC.md §6.';

-- ----------------------------------------------------------------------------
-- 5. Hardening de seguridad (comentario de Marcos, 2026-10-06)
-- ----------------------------------------------------------------------------

-- search_path fijo en las 4 funciones de catálogo/normalización — defensa en
-- profundidad contra un search_path manipulado en la sesión que llama.
alter function parse_size_text(text) set search_path = public;
alter function normalize_staging_row(uuid) set search_path = public;
alter function normalize_pending_staging(int) set search_path = public;
alter function search_catalog(text, uuid) set search_path = public;

-- execute revocado de anon/authenticated/public en las 3 funciones de
-- normalización: solo las corre el batch mensual (SCRUM-132) con service
-- role, que no pasa por estos grants. search_catalog se queda como está —
-- la llama el frontend directo con la anon key (ver migración 001).
revoke execute on function parse_size_text(text) from anon, authenticated, public;
revoke execute on function normalize_staging_row(uuid) from anon, authenticated, public;
revoke execute on function normalize_pending_staging(int) from anon, authenticated, public;

-- insert/update/delete/truncate revocado de anon/authenticated en las tablas
-- del catálogo (mismo patrón que la migración 009). select se mantiene: lo
-- usan las policies "public read ..." de schema.sql para que el frontend
-- lea el catálogo con la anon key.
revoke insert, update, delete, truncate on categories, stores, product_catalog,
  product_catalog_variants, product_brands, product_catalog_staging, product_prices
  from anon, authenticated;

-- product_mother_rules es nueva y no tiene políticas (RLS deny por defecto,
-- sección 1 arriba) — este revoke es cinturón y tirantes contra el grant por
-- defecto que Supabase da a anon/authenticated en tablas nuevas del schema
-- public, igual que pasaba con las tablas de arriba antes de esta migración.
revoke all on product_mother_rules from anon, authenticated;
