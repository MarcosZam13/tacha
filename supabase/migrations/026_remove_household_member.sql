-- ============================================================================
-- SCRUM-61 (HU-36): eliminar a un familiar del household
--
-- Agrega una RPC, remove_household_member(member_user_id): el admin de un
-- household quita a otro integrante. Solo se borra la fila de esa persona en
-- household_members; con eso pierde el acceso, porque todo lo de la familia se
-- decide por membresía (households en 011; lists, list_items y requisitos en
-- 024). Sus datos personales (lista personal, recetas, planes y compras) no se
-- tocan, y lo que agregó a la lista de la familia queda en la familia (SPEC
-- regla 10). No hay triggers sobre household_members ni FKs hacia ella.
--
-- No crea tablas ni cambia políticas o permisos de tabla: household_members
-- sigue sin insert, update ni delete para el cliente. Esta función es la única
-- puerta para borrar a otro, y valida identidad, rol y familia adentro.
--
-- El enlace de invitación no se modifica (D1): es uno por familia, y
-- borrarlo dejaría sin acceso a otras personas invitadas.
--
-- Contrato (features/household/specs/SPEC.md §12). Devuelve:
--   'removed'             la persona ya no es miembro de la familia;
--   'member_not_found'    la persona no es miembro de la familia de quien llama
--                         (otra familia, sin familia, ya eliminada o inexistente);
--   'cannot_remove_self'  quien llama intentó eliminarse a sí mismo;
--   'not_admin'           quien llama no es admin de ninguna familia.
-- Sin cuenta registrada: 42501. member_user_id nulo: 22023.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- remove_household_member: una sola transacción. Bloqueos, siempre en este
-- orden, el mismo de leave_household (023) y accept_household_invite (014)
-- (features/household/specs/plan.md, SCRUM-61, "Concurrencia"):
--   1) la fila del enlace del household, si existe (for update);
--   2) la fila de households (for update).
-- Con los bloqueos tomados se vuelve a leer el rol de quien llama: pudo salir
-- o pasar el rol mientras esperaba. Así una eliminación no se cruza con una
-- salida, una transferencia del rol o una unión por enlace.
--
-- Si Postgres aborta la llamada (por ejemplo, un interbloqueo con otra
-- operación), la transacción se deshace entera. Reintentar es seguro: la
-- función vuelve a leer el estado real.
-- ----------------------------------------------------------------------------

create or replace function public.remove_household_member(member_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  admin_household_id uuid;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para eliminar a un integrante'
      using errcode = '42501';
  end if;

  if member_user_id is null then
    raise exception 'Falta el integrante a eliminar'
      using errcode = '22023';
  end if;

  -- 1. La familia donde quien llama es admin (sin bloqueo todavía). El cliente
  -- nunca manda household_id ni un rol. Va primero: quien no es admin recibe
  -- not_admin, pase el id que pase (también el suyo).
  select m.household_id into admin_household_id
  from public.household_members m
  where m.user_id = current_user_id
    and m.role = 'admin';

  if admin_household_id is null then
    return 'not_admin';
  end if;

  -- 2. Nunca a sí mismo (CA-01): para irse está leave_household (023).
  if member_user_id = current_user_id then
    return 'cannot_remove_self';
  end if;

  -- 3. Bloqueos, siempre enlace → household. Si no hay enlace, el primero no
  -- bloquea nada; uno nuevo necesita la FK sobre households, así que espera.
  perform 1
  from public.household_invite_links invite
  where invite.household_id = admin_household_id
  for update;

  perform 1
  from public.households h
  where h.id = admin_household_id
  for update;

  -- 4. Con los bloqueos tomados, quien llama tiene que seguir siendo el admin.
  if not exists (
    select 1
    from public.household_members m
    where m.user_id = current_user_id
      and m.household_id = admin_household_id
      and m.role = 'admin'
  ) then
    return 'not_admin';
  end if;

  -- 5. Solo un miembro de esta familia. Si no lo es (otra familia, sin familia,
  -- ya salió o ya se eliminó), no se borra nada y la respuesta es la misma en
  -- todos esos casos: no revela si el user_id existe ni dónde está.
  delete from public.household_members m
  where m.user_id = member_user_id
    and m.household_id = admin_household_id
    and m.role = 'member';

  if not found then
    return 'member_not_found';
  end if;

  return 'removed';
end;
$$;

-- Supabase da execute a anon y authenticated por defecto en las funciones de
-- public: se quita a public y anon y se deja solo a authenticated.
revoke execute on function public.remove_household_member(uuid) from public, anon;
grant execute on function public.remove_household_member(uuid) to authenticated;
