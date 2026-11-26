-- ============================================================================
-- SCRUM-79 (HU-47): el total de gasto de una sublista.
--
-- Un monto propio de la sublista, que la persona escribe (D1): las sublistas no
-- tienen modo compra y ninguna compra está ligada a una lista. No cuenta en
-- Finanzas (D2): no lo lee get_period_finance ni ninguna función de 040.
-- Spec: features/date-lists/specs/SPEC.md, §10.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- La columna. Nula = "Sin total". El check repite las reglas del monto de una
-- compra (assert_valid_spending_total, 040) y la deja solo en sublistas: la
-- general nunca tiene total propio. lists no tiene política de update, así que
-- el cliente no la puede escribir directo; solo set_date_list_total.
-- ----------------------------------------------------------------------------
alter table public.lists
  add column spent_total numeric,
  add constraint lists_spent_total_check check (
    spent_total is null
    or (
      type = 'date'
      and spent_total >= 0
      and spent_total <= 9999999999
      and spent_total = trunc(spent_total)
    )
  );

comment on column public.lists.spent_total is
  'Total gastado de una sublista (SCRUM-79), en colones enteros. Nulo = sin total. No cuenta en Finanzas.';

-- ----------------------------------------------------------------------------
-- set_date_list_total: agrega o cambia el total. Mismo acceso que
-- set_date_list_cancelled (043): la dueña si no tiene familia, cualquier
-- integrante si es de la familia. Mismo error si no existe o no es suya, para no
-- revelar que existe. Una cancelada se puede leer pero no cambiar (regla 4).
-- ----------------------------------------------------------------------------
create or replace function public.set_date_list_total(target_list_id uuid, new_total numeric)
returns public.lists
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_list public.lists;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para cambiar una sublista'
      using errcode = '42501';
  end if;

  -- Vacío no es un monto (regla 1). NaN, negativo, con decimales o enorme: 22023.
  perform public.assert_valid_spending_total(new_total);

  select l.* into target_list
  from public.lists l
  where l.id = target_list_id
    and l.type = 'date'
    and (
      (l.household_id is null and l.owner_id = current_user_id)
      or l.household_id in (
        select m.household_id from public.household_members m
        where m.user_id = current_user_id
      )
    )
  for update;

  if target_list.id is null then
    raise exception 'La sublista no existe o no es tuya'
      using errcode = 'P0002';
  end if;

  if target_list.status = 'cancelled' then
    raise exception 'Una sublista cancelada no cambia su total'
      using errcode = '55000';
  end if;

  update public.lists l
  set spent_total = new_total
  where l.id = target_list.id
  returning l.* into target_list;

  return target_list;
end;
$$;

revoke execute on function public.set_date_list_total(uuid, numeric) from public, anon;
grant execute on function public.set_date_list_total(uuid, numeric) to authenticated;
