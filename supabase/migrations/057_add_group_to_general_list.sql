-- ============================================================================
-- SCRUM-111 (HU-74): agregar un grupo de productos a la lista.
--
-- add_group_to_general_list copia los productos de un grupo a la lista
-- general: la de la familia si el usuario pertenece a una, si no la personal
-- (ensure_general_list_id, 024). Por cada producto, en el orden del grupo:
--   - misma presentación pendiente en la lista → suma la cantidad (CA-02);
--   - otra presentación del mismo producto → fila aparte (CA-03);
--   - una fila ya tachada no se reabre: se crea una pendiente nueva (035).
-- Las tres reglas ya las hace add_units_to_list_item (035): acá solo se usa.
--
-- Sin reconciliación ni faltantes: un producto de grupo ya es una unidad de
-- compra, no una medida de receta (docs/documento-proyecto.md §4.9.1). Por
-- eso no escribe list_item_recipe_requirements.
--
-- Los productos archivados (052) o que el usuario ya no puede ver (salió de
-- la familia) se saltan y se nombran en la respuesta, en vez de hacer fallar
-- el grupo entero. La lista no guarda ninguna referencia al grupo: editarlo o
-- borrarlo después no cambia la lista.
--
-- security invoker, como add_recipe_to_general_list (024): la RLS de
-- product_groups, product_catalog_variants y list_items hace el trabajo.
-- Mismo bloqueo por lista que recetas, así un grupo y una receta agregados a
-- la vez a la misma lista no se pisan.
--
-- Contrato: features/product-groups/specs/SPEC.md (HU-74) §12.
-- ============================================================================

create function public.add_group_to_general_list(target_group_id uuid)
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
  added_names text[] := '{}';
  skipped_names text[] := '{}';
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

  for group_item in
    select
      gi.product_catalog_variant_id,
      gi.quantity,
      -- Nulos si la RLS oculta la presentación (producto que ya no puede ver).
      pcv.id as visible_variant_id,
      pc.name as product_name,
      pc.archived_at
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

    perform public.add_units_to_list_item(general_list_id, group_item.product_catalog_variant_id, group_item.quantity);
    added_names := array_append(added_names, group_item.product_name);
  end loop;

  return jsonb_build_object('added', to_jsonb(added_names), 'skipped', to_jsonb(skipped_names));
end;
$$;

revoke execute on function public.add_group_to_general_list(uuid) from public, anon;
grant execute on function public.add_group_to_general_list(uuid) to authenticated;
