-- ============================================================================
-- SCRUM-63 (HU-36b): ajustar la cantidad de un item de la lista
--
-- El cliente manda un delta (+1 / -1), no la cantidad final: la suma se hace
-- en una sola sentencia en la base, así dos toques rápidos o dos pestañas no
-- se pisan. El mínimo de 1 lo garantiza el check de list_items
-- (quantity_requested >= 1) de la migración 004.
-- ============================================================================

create or replace function public.change_item_quantity(target_item_id uuid, quantity_delta integer)
returns public.list_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed_item public.list_items;
begin
  if quantity_delta not in (-1, 1) then
    raise exception 'La cantidad solo cambia de a 1'
      using errcode = '22023';
  end if;

  -- security invoker: la política "owner updates items of own lists" decide
  -- qué filas puede tocar quien llama; un item ajeno no se encuentra.
  update public.list_items
  set quantity_requested = quantity_requested + quantity_delta
  where id = target_item_id
  returning * into changed_item;

  if changed_item.id is null then
    raise exception 'El producto no está en tu lista'
      using errcode = 'P0002';
  end if;

  return changed_item;
end;
$$;

revoke execute on function public.change_item_quantity(uuid, integer) from public, anon;
grant execute on function public.change_item_quantity(uuid, integer) to authenticated;

-- El UPDATE directo (PostgREST) solo puede tocar la cantidad: nadie mueve un
-- item a otra lista ni le cambia la variante. Las dos RPC siguen funcionando
-- porque solo actualizan quantity_requested. Un PATCH directo todavía puede
-- fijar una cantidad >= 1 sobre filas propias; la regla de ±1 es de producto.
revoke update on public.list_items from authenticated;
grant update (quantity_requested) on public.list_items to authenticated;
