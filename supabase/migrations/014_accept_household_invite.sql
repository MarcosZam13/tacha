-- ============================================================================
-- SCRUM-57 (HU-34): unirse a un household con el link de invitación
--
-- Agrega una RPC: accept_household_invite(invite_token) une a quien llama al
-- household del link, como 'member', si el link existe y no venció.
--
-- No crea tablas ni cambia políticas o permisos de tabla: usa las de la
-- migración 011. household_members sigue sin insert para el cliente y
-- household_invite_links sigue cerrada; esta función es la única puerta para
-- entrar a un household ajeno, y valida todo adentro.
--
-- El cliente manda solo el token. Quién se une sale de auth.uid(), a qué
-- household sale de la fila del link y el rol es siempre 'member'.
--
-- Contrato (features/household/specs/SPEC.md §12). Devuelve uno de:
--   'joined'              se agregó la membresía;
--   'already_member'      ya era de ese household (doble clic, otra pestaña,
--                         o el admin abriendo su propio link);
--   'in_other_household'  ya es de otro household: primero tiene que salir (HU-34c);
--   'expired'             el link existe pero venció (aunque ya sea miembro);
--   'invalid'             token sin formato de UUID o que no existe (incluye el
--                         token viejo de un link regenerado).
-- Sin cuenta registrada: excepción 42501, como las RPC de la 011.
-- ============================================================================

create or replace function public.accept_household_invite(invite_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invite_household_id uuid;
  invite_expires_at timestamptz;
  current_household_id uuid;
begin
  -- 1. Solo cuentas registradas. Los anónimos de Supabase usan el rol
  -- authenticated, así que el grant no alcanza: se revisa el claim del JWT
  -- (mismo bloque que en la 011).
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para unirse a un household'
      using errcode = '42501';
  end if;

  -- 2. Formato: se compara con un regex antes de convertir a uuid, así un
  -- texto cualquiera responde 'invalid' en vez de lanzar 22P02.
  if invite_token is null
    or invite_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return 'invalid';
  end if;

  -- 3. El link y su household. "for share" bloquea la fila hasta el final de
  -- la transacción: una regeneración simultánea (create_household_invite, que
  -- hace update de esta fila) espera, así nunca se acepta un token que en ese
  -- mismo instante deja de existir.
  select invite.household_id, invite.expires_at
    into invite_household_id, invite_expires_at
  from public.household_invite_links invite
  where invite.token = invite_token::uuid
  for share;

  if not found then
    return 'invalid';
  end if;

  -- 4. Vencimiento con el reloj de la base. Va antes que la membresía: con un
  -- link vencido la respuesta es 'expired' aunque ya sea de ese household.
  -- clock_timestamp() y no now(): now() es la hora en que empezó la
  -- transacción, y si esta llamada esperó el bloqueo del paso 3 quedaría
  -- atrasada; clock_timestamp() es la hora real de este momento.
  if invite_expires_at <= clock_timestamp() then
    return 'expired';
  end if;

  -- 5. Un household por usuario: user_id es la clave primaria de
  -- household_members. Si ya tiene una fila, no se inserta nada. Con dos
  -- llamadas a la vez, la segunda espera a la primera y tampoco inserta.
  insert into public.household_members (user_id, household_id, role)
  values (current_user_id, invite_household_id, 'member')
  on conflict (user_id) do nothing;

  if found then
    return 'joined';
  end if;

  -- 6. No insertó: ya tenía household. ¿Es este u otro?
  select m.household_id
    into current_household_id
  from public.household_members m
  where m.user_id = current_user_id;

  -- Caso excepcional: la membresía desapareció entre el insert y este select
  -- (por ejemplo, la cuenta se borró en ese instante y el cascade se la llevó).
  -- Sin esta guarda, null = invite_household_id no es true y se respondería
  -- 'in_other_household', que sería falso. Se lanza un error: la página lo
  -- muestra como una falla que se puede reintentar.
  if current_household_id is null then
    raise exception 'No se pudo confirmar la membresía después de unirse'
      using errcode = 'P0001';
  end if;

  if current_household_id = invite_household_id then
    return 'already_member';
  end if;

  return 'in_other_household';
end;
$$;

-- Supabase da execute a anon y authenticated por defecto en las funciones de
-- public: se quita a public y anon y se deja solo a authenticated.
revoke execute on function public.accept_household_invite(text) from public, anon;
grant execute on function public.accept_household_invite(text) to authenticated;
