-- ============================================================================
-- SCRUM-115 (HU-77), corrección de QA (BUG-1 de la PR #82)
--
-- undo_shortfall_resolution_and_uncheck (037) no reescribe una compra
-- cerrada: sobre una fila de una compra ya cerrada solo destacha, sin volver
-- a la presentación y cantidad de antes (regla 45 de
-- features/shopping-list/specs/SPEC.md §18). Pero
-- get_general_list_shortfall_snapshots (037) seguía devolviendo la foto de
-- esa fila, así que la pantalla abría el diálogo "La fila vuelve a …" y
-- prometía algo que la base no hace.
--
-- Esta migración vuelve a definir solo esa función para que no devuelva las
-- fotos de filas que están en una compra cerrada. Sin foto, la pantalla
-- destacha directo, sin diálogo: lo mismo que hace la base. Misma firma,
-- misma seguridad y mismos permisos que en la 037. La foto se queda en la
-- tabla (la borra el trigger de la 037 al destachar).
-- ============================================================================

create or replace function public.get_general_list_shortfall_snapshots(local_day_start timestamptz)
returns table (
  list_item_id uuid,
  previous_base_quantity numeric,
  previous_base_unit text,
  previous_quantity_requested integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  general_list_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para ver la lista'
      using errcode = '42501';
  end if;

  perform public.assert_local_day_start(local_day_start);

  general_list_id := public.find_general_list_id();
  if general_list_id is null then
    return;
  end if;

  return query
  select s.list_item_id, v.base_quantity, v.base_unit, s.previous_quantity_requested
  from public.list_item_shortfall_snapshots s
  join public.list_items li on li.id = s.list_item_id
  join public.product_catalog_variants v on v.id = s.previous_variant_id
  where li.list_id = general_list_id
    and (li.checked_at is null or li.checked_at >= local_day_start)
    -- Una fila de una compra cerrada no se deshace (037, regla 45): sin foto
    -- para la pantalla, no hay diálogo que prometa volver a como estaba.
    and not exists (
      select 1 from public.purchase_sessions ps
      where ps.id = li.purchase_session_id
        and ps.closed_at is not null
    )
  order by li.created_at, li.id;
end;
$$;

revoke execute on function public.get_general_list_shortfall_snapshots(timestamptz) from public, anon;
grant execute on function public.get_general_list_shortfall_snapshots(timestamptz) to authenticated;
