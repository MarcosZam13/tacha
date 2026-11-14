-- ============================================================================
-- Migración 045 (SCRUM-132): normalize_staging_row más estricto, después de
-- la primera corrida completa del script de ingesta mensual.
--
-- La corrida del 2026-11-13 metió en las madres curadas productos que no les
-- corresponden (acondicionador "Leche Pal Pelo" en "Leche", gomitas
-- "Cocodrilo" en "Leche de coco", levadura en "Crema de leche", jabón
-- lavaplatos en "Jabón"), 43 precios en ₡0 y una presentación de 2838 L. Ver
-- supabase/specs/SCRUM-132/tasks.md, tarea 10. Causas y arreglo:
--   1. El respaldo por keyword corría aunque la fila tuviera categorías de
--      VTEX que no cubre ninguna regla: así entraban productos de cualquier
--      departamento. Ahora el respaldo solo corre si la fila no trae
--      categorías; con categorías y sin regla que las cubra, queda pending.
--   2. Los keywords se buscaban como substring ("coco" en "Cocodrilo" y
--      "cocoa"). Ahora tienen que aparecer como palabra completa
--      (matches_mother_keyword). Los exclude_keywords siguen como substring
--      (excluir de más es el lado seguro).
--   3. La rama de categoría exigía keyword solo con prefijos de 2 segmentos o
--      menos (SCRUM-139), pero "/Abarrotes/Harinas y Repostería/Repostería/"
--      (3 segmentos) metía toda la repostería en "Crema de leche". Ahora toda
--      regla exige al menos un keyword, con cualquier prefijo.
--   4. Se aceptaba cualquier precio no nulo. VTEX manda Price = 0 cuando el
--      producto está agotado: ahora se rechaza un precio <= 0 o una oferta
--      con IsAvailable = false.
--   5. "1,8 kg" se leía como 8 kg (la coma decimal cortaba el número) y no
--      había tope de tamaño ("2838 L" en el nombre de la tienda). Ahora la
--      coma decimal se lee como punto antes de parse_size_text, y se rechaza
--      un tamaño <= 0 ("1,000 ml" parsea como 0 ml) o de más de 50 L o 50 kg.
--
-- La firma no cambia (create or replace). Se vuelve a aplicar el hardening de
-- la 020 (search_path y revoke execute), igual que en la 042 y la 044.
--
-- Como el keyword ahora es obligatorio y por palabra completa, dos reglas
-- suman keywords (mismo cambio en supabase/data/madres.json):
--   - "Crema de leche": + "crema" ("Crema dulce Dos Pinos para batir" no dice
--     "crema de leche").
--   - "Repostería": + "pasteleria", "pastelería" ("pastel" ya no matchea
--     dentro de "Pastelería").
-- ============================================================================

update product_mother_rules pmr
set match_keywords = array['crema de leche', 'crema']
from product_catalog pc
where pc.id = pmr.product_catalog_id
  and pc.name = 'Crema de leche'
  and pc.household_id is null
  and pc.owner_id is null;

update product_mother_rules pmr
set match_keywords = array['torta', 'pastel', 'reposteria', 'repostería', 'pasteleria', 'pastelería']
from product_catalog pc
where pc.id = pmr.product_catalog_id
  and pc.name = 'Repostería'
  and pc.household_id is null
  and pc.owner_id is null;

-- Keyword como palabra completa, sin distinguir mayúsculas. Los caracteres
-- que no son letra, número ni espacio se escapan para que un keyword nunca
-- se interprete como expresión regular.
create or replace function matches_mother_keyword(p_name text, p_keyword text)
returns boolean as $$
  select coalesce(p_name, '') ~* (
    '\m' || regexp_replace(p_keyword, '([^[:alnum:][:space:]])', '\\\1', 'g') || '\M'
  );
$$ language sql immutable;

comment on function matches_mother_keyword(text, text) is
  'true si p_keyword aparece en p_name como palabra completa (sin distinguir mayúsculas). Lo usa normalize_staging_row (migración 045, SCRUM-132).';

alter function matches_mother_keyword(text, text) set search_path = public;
revoke execute on function matches_mother_keyword(text, text) from anon, authenticated, public;

create or replace function normalize_staging_row(staging_id uuid)
returns table (
  success boolean,
  product_catalog_id uuid,
  product_variant_id uuid,
  product_brand_id uuid,
  error_message text
) as $$
declare
  -- Tope de tamaño (ml o g): ninguna presentación de supermercado pasa de
  -- 50 L o 50 kg; más que eso es un error del nombre en la tienda.
  c_max_base_quantity constant numeric := 50000;
  v_staging record;
  v_product_id uuid;
  v_variant_id uuid;
  v_brand_id uuid;
  v_base_unit text;
  v_base_quantity numeric;
  v_brand_name text;
  v_price numeric;
  v_is_available boolean;
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
    -- Parsear tamaño. Causa 5: coma decimal ("1,8 kg", "99,5%") → punto,
    -- solo con 1 o 2 decimales para no tocar un separador de miles.
    select * into v_base_unit, v_base_quantity
    from parse_size_text(
      regexp_replace(v_staging.scraped_size_text, '(\d),(\d{1,2})(?!\d)', '\1.\2', 'g')
    );

    if v_base_unit is null then
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
      return query select false, null::uuid, null::uuid, null::uuid,
        format('Could not parse size: %L', v_staging.scraped_size_text)::text;
      return;
    end if;

    -- Causa 5: tamaño imposible. También <= 0: "1,000 ml" (coma de miles)
    -- parsea como 0 ml.
    if v_base_quantity <= 0
       or (v_base_unit in ('ml', 'g') and v_base_quantity > c_max_base_quantity) then
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
      return query select false, null::uuid, null::uuid, null::uuid,
        format('Size out of range: %s %s (%L)', v_base_quantity, v_base_unit, v_staging.scraped_size_text)::text;
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
    -- exacto), que no tienen ningún exclude_keyword en scraped_name y que
    -- tienen al menos un match_keyword como palabra completa (causas 2 y 3),
    -- gana la de prefijo más específico (más largo); si sigue empatada, la de
    -- más match_keywords coincidentes ("Leche de coco" vs. "Leche", mismo
    -- prefijo — SCRUM-131 SPEC §3/§6); si aún empata, la de menor
    -- product_catalog_id (SCRUM-139).
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
      and exists (
        select 1 from unnest(pmr.match_keywords) kw
        where matches_mother_keyword(v_staging.scraped_name, kw)
      )
    order by
      length(pmr.vtex_category_prefix) desc,
      (
        select count(*) from unnest(pmr.match_keywords) kw
        where matches_mother_keyword(v_staging.scraped_name, kw)
      ) desc,
      pmr.product_catalog_id
    limit 1;

    -- Respaldo por keyword, solo si la fila no trae ninguna categoría de VTEX
    -- (causa 1): con categorías y sin regla que las cubra, la fila es de otro
    -- departamento y queda pending.
    if v_product_id is null and coalesce(array_length(v_vtex_categories, 1), 0) = 0 then
      select pmr.product_catalog_id into v_product_id
      from product_mother_rules pmr
      where exists (
          select 1 from unnest(pmr.match_keywords) kw
          where matches_mother_keyword(v_staging.scraped_name, kw)
        )
        and not exists (
          select 1 from unnest(pmr.exclude_keywords) ex
          where lower(v_staging.scraped_name) like '%' || lower(ex) || '%'
        )
      order by
        (
          select count(*) from unnest(pmr.match_keywords) kw
          where matches_mother_keyword(v_staging.scraped_name, kw)
        ) desc,
        pmr.product_catalog_id
      limit 1;
    end if;

    -- Sin match: la fila queda pending (no se toca, no se fuerza a encajar
    -- en ninguna madre — SCRUM-131 SPEC §3, caso "Leche De Magnesia Phillips").
    if v_product_id is null then
      return query select false, null::uuid, null::uuid, null::uuid,
        'No curated mother matched — row stays pending'::text;
      return;
    end if;

    -- Causa 4: precio y disponibilidad, antes de crear variante o marca, para
    -- no dejar variantes sin ningún precio.
    v_price := (v_staging.raw_json -> 'offer' ->> 'Price')::numeric;

    if v_price is null then
      v_price := (v_staging.raw_json ->> 'Price')::numeric;
    end if;

    v_is_available := coalesce((v_staging.raw_json -> 'offer' ->> 'IsAvailable')::boolean, true);

    if v_price is null or v_price <= 0 or not v_is_available then
      update product_catalog_staging
      set status = 'rejected'
      where id = staging_id;
      return query select false, v_product_id, null::uuid, null::uuid,
        format('No usable price (price=%s, available=%s)', coalesce(v_price::text, 'null'), v_is_available)::text;
      return;
    end if;

    -- Buscar o crear variant (product_catalog_id viene de la madre curada —
    -- nunca se inserta una madre nueva).
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
    v_brand_name := coalesce(nullif(trim(v_staging.scraped_brand), ''), 'Genérica');

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
  'Procesa UNA fila de product_catalog_staging. Asigna a una madre curada (product_mother_rules) por categoría de VTEX más al menos un match_keyword como palabra completa; el respaldo solo por keyword corre únicamente si la fila no trae categorías. Rechaza precio <= 0, ofertas no disponibles y tamaños de más de 50 L/kg. Nunca crea una madre nueva; sin match, la fila queda pending. SCRUM-131, SCRUM-139 y SCRUM-132 (migración 045).';

-- Repetir el hardening de la migración 020. El search_path hay que volver a
-- fijarlo (create or replace lo borra); el revoke es defensa en profundidad.
alter function normalize_staging_row(uuid) set search_path = public;
revoke execute on function normalize_staging_row(uuid) from anon, authenticated, public;
