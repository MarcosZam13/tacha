-- ============================================================================
-- SCRUM-163 (fix): un grupo no mete productos personales sin compartir en la
-- lista de la familia.
--
-- Un producto personal sin compartir solo lo ve su dueño (RLS de la 032). Si
-- entra a la lista de la familia, para el resto de los miembros esa fila
-- llega sin producto (antes, la lista entera no les cargaba).
--
-- add_group_to_general_list (057) queda igual, salvo una regla más: si la
-- lista general es la de una familia (lists.household_id no nulo), los
-- productos personales sin compartir del grupo (product_catalog.owner_id no
-- nulo) se saltan y se devuelven aparte en "personal", para que la pantalla
-- explique por qué. Mismo criterio que la regla 7 de grupos compartidos
-- (056) y que las recetas compartidas (SCRUM-162). Sin familia, nada cambia.
--
-- Misma firma, mismos permisos: create or replace conserva los grants.
-- Número de migración provisional: se fija al aplicarla (el primero libre).
-- Contrato: features/product-groups/specs/SPEC.md (HU-74) §12 y
-- features/shopping-list/specs/SPEC.md (SCRUM-163).
-- ============================================================================

create or replace function public.add_group_to_general_list(target_group_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- El nombre de un producto que el usuario ya no puede ver tampoco se puede
  -- leer (RLS): se nombra de forma genérica.
  unavailable_product_name constant text := 'un producto que ya no está disponible';
  found_group_id uuid;
  general_list_id uuid;
  group_item record;
  general_list_household_id uuid;
  added_names text[] := '{}';
  skipped_names text[] := '{}';
  personal_names text[] := '{}';
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para agregar grupos a la lista'
      using errcode = '42501';
  end if;

  -- RLS oculta los grupos ajenos: no existe y no es tuyo dan el mismo error.
  select g.id into found_group_id
  from public.product_groups g
  where g.id = target_group_id;

  if found_group_id is null then
    raise exception 'Grupo no encontrado'
      using errcode = 'P0002';
  end if;

  general_list_id := public.ensure_general_list_id();
  perform pg_advisory_xact_lock(hashtextextended(general_list_id::text, 0));

  -- SCRUM-163: ¿la lista es la de una familia? (la lee la RLS de lists).
  select l.household_id into general_list_household_id
  from public.lists l
  where l.id = general_list_id;

  for group_item in
    select
      gi.product_catalog_variant_id,
      gi.quantity,
      -- Nulos si la RLS oculta la presentación (producto que ya no puede ver).
      pcv.id as visible_variant_id,
      pc.name as product_name,
      pc.archived_at,
      pc.owner_id as product_owner_id
    from public.product_group_items gi
    left join public.product_catalog_variants pcv on pcv.id = gi.product_catalog_variant_id
    left join public.product_catalog pc on pc.id = pcv.product_catalog_id
    where gi.group_id = found_group_id
    order by gi.position
  loop
    if group_item.visible_variant_id is null or group_item.product_name is null then
      skipped_names := array_append(skipped_names, unavailable_product_name);
      continue;
    end if;

    if group_item.archived_at is not null then
      skipped_names := array_append(skipped_names, group_item.product_name);
      continue;
    end if;

    -- SCRUM-163: un producto personal sin compartir (owner_id no nulo; uno
    -- compartido queda con owner_id null, 032) no entra a la lista de la
    -- familia: el resto de los miembros no lo podría ver.
    if general_list_household_id is not null and group_item.product_owner_id is not null then
      personal_names := array_append(personal_names, group_item.product_name);
      continue;
    end if;

    perform public.add_units_to_list_item(general_list_id, group_item.product_catalog_variant_id, group_item.quantity);
    added_names := array_append(added_names, group_item.product_name);
  end loop;

  return jsonb_build_object(
    'added', to_jsonb(added_names),
    'skipped', to_jsonb(skipped_names),
    'personal', to_jsonb(personal_names)
  );
end;
$$;
