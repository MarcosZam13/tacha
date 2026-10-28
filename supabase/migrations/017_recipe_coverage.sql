-- ============================================================================
-- SCRUM-98 (HU-66): ver qué falta de una receta
--
-- 1. RPC get_recipe_coverage: por cada ingrediente de una receta, si está
--    cubierto o si falta (y por qué), con las reglas 29 a 31 de
--    features/recipes/specs/SPEC.md. Solo lee.
-- 2. list_items entra a la publicación de Realtime: el panel "Ver qué falta"
--    se entera de que cambió la lista (CA-02) y vuelve a llamar a la RPC.
--
-- No hay tablas, columnas ni políticas nuevas. Lee lo que ya existe:
-- list_items.checked_at (015) y list_item_recipe_requirements (013).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_recipe_coverage
--
-- security invoker: corre con los permisos de quien llama, así que RLS sigue
-- siendo el control (una receta ajena no se ve, una lista ajena no se lee).
-- stable: solo lee, y su resultado no cambia dentro de una misma consulta.
--
-- Una fila del producto es una fila de la lista general con alguna
-- presentación (product_catalog_variants) del producto madre del ingrediente.
-- Por ingrediente:
--   - sin filas                                   → missing / notInList
--   - alguna fila sin tachar                      → missing / notChecked
--   - todas tachadas y faltante registrado > 0    → missing / short
--   - todas tachadas y sin faltante               → covered
-- Si coinciden sin tachar y faltante, gana notChecked (regla 30).
-- El faltante suma solo los registros de ESTA receta y de la unidad del
-- ingrediente: no mezcla ml con g si la receta se editó (regla 24).
-- No compara cantidades compradas contra la receta (regla 31): eso lo decidió
-- add_recipe_to_general_list al agregar.
--
-- Devuelve, en el orden de position:
--   [{ ingredient_id, product_name, quantity_value, quantity_unit,
--      status: "covered" | "missing",
--      reason: null | "notInList" | "notChecked" | "short",
--      missing_quantity: number | null }]   -- solo viene con "short"
-- ----------------------------------------------------------------------------

create or replace function public.get_recipe_coverage(target_recipe_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  found_recipe_id uuid;
  general_list_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para revisar una receta'
      using errcode = '42501';
  end if;

  -- RLS oculta las recetas ajenas: no existe y no es tuya dan el mismo error.
  select r.id into found_recipe_id
  from public.recipes r
  where r.id = target_recipe_id;

  if found_recipe_id is null then
    raise exception 'Receta no encontrada'
      using errcode = 'P0002';
  end if;

  -- Si todavía no tiene lista general queda en null: ninguna fila coincide
  -- con "list_id = null" y todos los ingredientes salen notInList. No se crea
  -- una lista desde una consulta de solo lectura.
  select l.id into general_list_id
  from public.lists l
  where l.owner_id = current_user_id
    and l.type = 'general'
    and l.household_id is null;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'ingredient_id', summary.ingredient_id,
          'product_name', summary.product_name,
          'quantity_value', summary.quantity_value,
          'quantity_unit', summary.quantity_unit,
          'status', case when summary.reason is null then 'covered' else 'missing' end,
          'reason', summary.reason,
          'missing_quantity', case when summary.reason = 'short' then summary.missing_total end
        )
        order by summary.position
      )
      from (
        select
          ri.id as ingredient_id,
          ri.position,
          pc.name as product_name,
          ri.quantity_value,
          ri.quantity_unit,
          counts.missing_total,
          case
            when counts.row_count = 0 then 'notInList'
            when counts.unchecked_count > 0 then 'notChecked'
            when counts.missing_total > 0 then 'short'
          end as reason
        from public.recipe_ingredients ri
        join public.product_catalog pc on pc.id = ri.product_catalog_id
        cross join lateral (
          select
            count(li.id) as row_count,
            count(li.id) filter (where li.checked_at is null) as unchecked_count,
            coalesce(sum(req.missing), 0) as missing_total
          from public.list_items li
          join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
          left join lateral (
            select sum(r.quantity_missing) as missing
            from public.list_item_recipe_requirements r
            where r.list_item_id = li.id
              and r.recipe_id = found_recipe_id
              and r.quantity_unit = ri.quantity_unit
          ) req on true
          where li.list_id = general_list_id
            and v.product_catalog_id = ri.product_catalog_id
        ) counts
        where ri.recipe_id = found_recipe_id
      ) summary
    ),
    '[]'::jsonb
  );
end;
$$;

revoke execute on function public.get_recipe_coverage(uuid) from public, anon;
grant execute on function public.get_recipe_coverage(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Realtime sobre list_items
--
-- Realtime aplica la RLS de list_items a los eventos de insert y update: cada
-- usuario recibe solo los de sus propias filas. Los eventos de delete NO se
-- filtran por RLS (limitación de Supabase) y traen solo la llave primaria, sin
-- datos de la fila. El cliente no usa el contenido de ningún evento: es solo
-- la señal para volver a llamar a get_recipe_coverage, así que un delete ajeno
-- a lo sumo provoca una consulta de más. Queda para la revisión de seguridad.
--
-- Idempotente: si list_items ya estaba en la publicación, no hace nada.
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'list_items'
  ) then
    alter publication supabase_realtime add table public.list_items;
  end if;
end;
$$;
