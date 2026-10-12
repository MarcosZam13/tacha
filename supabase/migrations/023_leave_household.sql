-- ============================================================================
-- SCRUM-58 (HU-34c): salir de mi household
--
-- Agrega dos RPC:
--   - get_household_members(): los miembros del household del admin que llama,
--     para elegir a quién pasarle el rol antes de salir;
--   - leave_household(new_admin_user_id): sale del household. Si sale el admin
--     y hay otros miembros, le pasa el rol al elegido en la misma transacción;
--     si es el único miembro, elimina el household (la cascada de la 011 se
--     lleva su membresía y su link; purchase_sessions queda con household_id
--     en null por la FK de la 016).
--
-- No crea tablas ni cambia políticas o permisos de tabla: household_members
-- sigue sin insert, update ni delete para el cliente. Estas funciones son la
-- única puerta, y validan identidad, membresía y rol adentro.
--
-- Contrato (features/household/specs/SPEC.md §12). leave_household devuelve:
--   'left'                salió (miembro, o admin que pasó el rol);
--   'household_deleted'   era el admin y único miembro: el household se eliminó;
--   'transfer_required'   admin con otros miembros que no eligió a nadie;
--   'invalid_new_admin'   el elegido no es otro miembro de ese household;
--   'not_member'          quien llama no pertenece a ningún household.
-- Sin cuenta registrada: excepción 42501 en las dos funciones, como en la 011.
--
-- Listas: no toca lists, recipes ni meal_plans. Qué pasa con las listas
-- compartidas al salir es un contrato pendiente de HU-34b (SCRUM-59).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_household_members: solo el admin, solo su household. El nombre sale de
-- los metadatos que guarda el registro; nunca se devuelve el correo.
-- ----------------------------------------------------------------------------
create or replace function public.get_household_members()
returns table (user_id uuid, display_name text, role text, is_current_user boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
-- user_id y role son a la vez columnas de salida y de la tabla: ante un
-- nombre sin calificar, usar la columna. Además todo va calificado con alias.
declare
  current_user_id uuid := auth.uid();
  admin_household_id uuid;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para ver los miembros'
      using errcode = '42501';
  end if;

  select m.household_id into admin_household_id
  from public.household_members m
  where m.user_id = current_user_id and m.role = 'admin';

  -- Ver a todos los miembros es HU-35: acá solo el admin, para elegir.
  if admin_household_id is null then
    raise exception 'Solo el admin del household puede ver los miembros'
      using errcode = '42501';
  end if;

  return query
  select
    m.user_id,
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    m.role,
    m.user_id = current_user_id
  from public.household_members m
  join auth.users u on u.id = m.user_id
  where m.household_id = admin_household_id
  order by m.created_at, m.user_id;
end;
$$;

revoke execute on function public.get_household_members() from public, anon;
grant execute on function public.get_household_members() to authenticated;

-- ----------------------------------------------------------------------------
-- leave_household: una sola transacción. Bloqueos, siempre en este orden y sin
-- importar el rol (features/household/specs/plan.md, "Concurrencia"):
--   1) la fila del link del household, si existe (for update);
--   2) la fila de households (for update).
-- Es el mismo orden en que accept_household_invite (014) toma los suyos (link
-- for share, después la FK sobre households), así que una salida y una unión
-- sobre el mismo household se ejecutan una después de otra. El orden no
-- depende del rol leído antes de bloquear porque ese rol puede cambiar
-- mientras se espera (el admin le pasó el rol a quien está saliendo).
--
-- Si aun así Postgres aborta la llamada (por ejemplo, un interbloqueo con
-- otra operación que tome los bloqueos en otro orden), la transacción se
-- deshace entera: nunca queda un rol pasado sin la salida, ni una salida sin
-- el rol pasado, ni un household a medio borrar. Reintentar es seguro: la
-- función vuelve a leer el estado real.
-- ----------------------------------------------------------------------------
create or replace function public.leave_household(new_admin_user_id uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  member_household_id uuid;
  member_role text;
  other_member_count integer;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para salir de un household'
      using errcode = '42501';
  end if;

  -- 1. A qué household pertenece (sin bloqueo todavía).
  select m.household_id into member_household_id
  from public.household_members m
  where m.user_id = current_user_id;

  if member_household_id is null then
    return 'not_member';
  end if;

  -- 2. Bloqueos, siempre link → household. Si no hay link, el primero no
  -- bloquea nada: un link nuevo de este household necesita la FK sobre
  -- households, así que espera al segundo bloqueo.
  perform 1
  from public.household_invite_links invite
  where invite.household_id = member_household_id
  for update;

  perform 1
  from public.households h
  where h.id = member_household_id
  for update;

  -- 3. Con los bloqueos tomados se vuelve a leer: la membresía pudo cambiar
  -- mientras esperaba (salió en otra pestaña, o le pasaron el rol de admin).
  select m.role into member_role
  from public.household_members m
  where m.user_id = current_user_id
    and m.household_id = member_household_id;

  if member_role is null then
    return 'not_member';
  end if;

  -- 4. Miembro: sale. new_admin_user_id no aplica y se ignora.
  if member_role = 'member' then
    delete from public.household_members m
    where m.user_id = current_user_id
      and m.household_id = member_household_id;

    return 'left';
  end if;

  -- 5. Admin: depende de si quedan otros miembros.
  select count(*) into other_member_count
  from public.household_members m
  where m.household_id = member_household_id
    and m.user_id <> current_user_id;

  -- Único miembro: se elimina el household. new_admin_user_id se ignora.
  -- La cascada (011) borra su membresía y su link; purchase_sessions queda
  -- con household_id en null (016). No se tocan listas, recetas ni planes.
  if other_member_count = 0 then
    delete from public.households h
    where h.id = member_household_id;

    return 'household_deleted';
  end if;

  if new_admin_user_id is null then
    return 'transfer_required';
  end if;

  -- 6. Transferencia. El mismo update valida al elegido: tiene que ser otro
  -- miembro de este household. Si no lo es (o desapareció justo antes, por
  -- ejemplo porque se borró su cuenta), no se actualiza ninguna fila y no se
  -- toca nada más.
  update public.household_members m
  set role = 'admin'
  where m.user_id = new_admin_user_id
    and m.household_id = member_household_id
    and m.user_id <> current_user_id;

  if not found then
    return 'invalid_new_admin';
  end if;

  -- En la misma transacción: el admin anterior sale. Nadie ve el household
  -- con dos admins ni sin admin.
  delete from public.household_members m
  where m.user_id = current_user_id
    and m.household_id = member_household_id;

  return 'left';
end;
$$;

-- Supabase da execute a anon y authenticated por defecto en las funciones de
-- public: se quita a public y anon y se deja solo a authenticated.
revoke execute on function public.leave_household(uuid) from public, anon;
grant execute on function public.leave_household(uuid) to authenticated;
