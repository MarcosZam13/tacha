-- ============================================================================
-- SCRUM-56 (HU-33): household mínimo y link de invitación
--
-- Crea households, household_members y household_invite_links, y tres RPC:
--   - create_household(name): crea el household y deja a quien llama como admin;
--   - create_household_invite(): genera o regenera el link del household;
--   - get_household_invite(): lee el link vigente (o vencido) del household.
--
-- Modelo según docs/documento-proyecto.md §6 y features/household/specs/plan.md.
-- Usar el link para unirse (buscar el token, validar expires_at, agregar como
-- member) es HU-34 (SCRUM-57) y no está acá.
--
-- Control de acceso: el cliente solo puede LEER su propia membresía y su
-- household. Toda escritura, y cualquier acceso a los tokens, pasa por las
-- RPC, que validan adentro quién llama. Ninguna recibe household_id ni
-- user_id: se derivan de auth.uid().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tablas
-- ----------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  -- Mismo criterio que recipes_name_check (008): el largo se mide completo,
  -- para que no se pueda rellenar con espacios, y recortado no puede quedar vacío.
  name text not null check (char_length(name) <= 60 and char_length(btrim(name)) >= 1),
  created_at timestamptz not null default now()
);

-- user_id es la clave primaria: un usuario pertenece como máximo a un
-- household (documento-proyecto §4.1). Un segundo household para el mismo
-- usuario choca acá, en la base, sin depender de la UI.
create table public.household_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  -- 'member' lo va a usar HU-34 al aceptar una invitación.
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- Índice de la FK (como recipes_owner_id_idx en 006): borrar un household
-- borra en cascada sus miembros, y sin índice eso recorre toda la tabla.
create index household_members_household_id_idx
  on public.household_members (household_id);

-- household_id es la clave primaria: un solo link por household. Regenerar
-- reemplaza esta fila, así que el token anterior deja de existir.
-- El token va en claro para que el admin pueda volver a copiarlo al recargar
-- (CA-03) sin regenerarlo; la tabla no tiene ninguna política (ver abajo).
create table public.household_invite_links (
  household_id uuid primary key references public.households (id) on delete cascade,
  -- unique: HU-34 va a buscar el household por el token.
  token uuid not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS y permisos: nacen activados y sin políticas (deny por defecto); se abre
-- solo la lectura de lo propio. RLS decide qué filas; los grant/revoke deciden
-- qué operaciones. Supabase da por defecto todos los permisos de tabla a anon
-- y authenticated, así que se quitan explícitamente y se devuelve solo select
-- donde hace falta.
-- ----------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invite_links enable row level security;

revoke all on public.households, public.household_members, public.household_invite_links
  from public, anon, authenticated;

grant select on public.households, public.household_members to authenticated;
-- household_invite_links: sin ningún permiso para anon ni authenticated. Solo
-- las RPC de abajo (security definer, dueñas de la tabla) la leen y escriben.

-- Solo la membresía propia. No consulta otras tablas, así que no hay
-- recursión. Ver a los demás miembros es HU-35.
create policy "user reads own membership"
  on public.household_members for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Solo el household al que pertenece. La subconsulta pasa por la política de
-- household_members (solo ve su propia fila), así que no puede ver otros.
create policy "member reads own household"
  on public.households for select
  to authenticated
  using (
    exists (
      select 1 from public.household_members m
      where m.household_id = households.id and m.user_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- RPC. Las tres son security definer: las tablas no aceptan escrituras del
-- cliente y la de invitaciones ni siquiera lecturas, así que la función es la
-- única puerta. Con security invoker habría que abrir insert en
-- household_members, y cualquiera podría insertarse como admin de un
-- household ajeno. Por eso cada una valida adentro:
--   - que haya sesión (auth.uid() no nulo);
--   - que no sea un usuario anónimo (claim is_anonymous del JWT; ver
--     features/shopping-list/specs/plan.md, deuda "Anónimo = authenticated");
--   - el rol, en las que operan sobre el link.
-- set search_path = '' y nombres calificados: nadie puede hacer que la función
-- use una tabla o función propia con el mismo nombre.
-- ----------------------------------------------------------------------------

-- create_household: household + membresía admin, todo o nada (la función corre
-- en una sola transacción: si falla el segundo insert, se deshace el primero).
create or replace function public.create_household(household_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_household_id uuid;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para crear un household'
      using errcode = '42501';
  end if;

  -- El check de la tabla valida el nombre; acá solo se recortan los espacios
  -- de los bordes, como save_recipe (007).
  insert into public.households (name)
  values (btrim(household_name))
  returning id into created_household_id;

  -- Si el usuario ya tiene household, la clave primaria de household_members
  -- lo rechaza y el household recién creado se deshace con la transacción.
  insert into public.household_members (user_id, household_id, role)
  values (current_user_id, created_household_id, 'admin');

  return created_household_id;
end;
$$;

revoke execute on function public.create_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;

-- create_household_invite: genera o regenera el link del household del admin.
-- Un solo insert ... on conflict sobre la clave primaria household_id:
--   - sin link: inserta la fila;
--   - con link: reemplaza token, vencimiento y fecha en la MISMA fila, así que
--     el token anterior deja de existir en esta misma operación.
-- Con dos llamadas a la vez, la segunda espera el bloqueo de la fila de la
-- primera y después la reemplaza: siempre queda una sola fila (la última).
create or replace function public.create_household_invite()
returns table (token uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
-- token y expires_at son a la vez columnas de la tabla y columnas de salida:
-- ante un nombre sin calificar, usar la columna (el fix de 002 fue por este
-- mismo choque). Además todas las referencias van calificadas con alias.
declare
  current_user_id uuid := auth.uid();
  admin_household_id uuid;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para invitar'
      using errcode = '42501';
  end if;

  select m.household_id into admin_household_id
  from public.household_members m
  where m.user_id = current_user_id and m.role = 'admin';

  if admin_household_id is null then
    raise exception 'Solo el admin del household puede invitar'
      using errcode = '42501';
  end if;

  -- Token y vencimiento los decide la base: el cliente no manda ninguno.
  return query
  insert into public.household_invite_links as invite (household_id, token, expires_at)
  values (admin_household_id, gen_random_uuid(), now() + interval '7 days')
  on conflict (household_id) do update
    set token = excluded.token,
        expires_at = excluded.expires_at,
        created_at = now()
  returning invite.token, invite.expires_at;
end;
$$;

revoke execute on function public.create_household_invite() from public, anon;
grant execute on function public.create_household_invite() to authenticated;

-- get_household_invite: el link del household del admin, vigente o vencido
-- (la pantalla necesita mostrar "Expirado"). No filtra por expires_at: la
-- validez real del token al usarlo la decide HU-34. Sin link, no devuelve filas.
create or replace function public.get_household_invite()
returns table (token uuid, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  current_user_id uuid := auth.uid();
  admin_household_id uuid;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para ver la invitación'
      using errcode = '42501';
  end if;

  select m.household_id into admin_household_id
  from public.household_members m
  where m.user_id = current_user_id and m.role = 'admin';

  if admin_household_id is null then
    raise exception 'Solo el admin del household puede ver la invitación'
      using errcode = '42501';
  end if;

  return query
  select invite.token, invite.expires_at
  from public.household_invite_links invite
  where invite.household_id = admin_household_id;
end;
$$;

revoke execute on function public.get_household_invite() from public, anon;
grant execute on function public.get_household_invite() to authenticated;
