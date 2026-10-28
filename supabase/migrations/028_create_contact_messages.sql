-- ============================================================================
-- SCRUM-28 (HU-06) y SCRUM-36 (HU-14): mensajes del formulario de contacto
--
-- Crea contact_messages. La única forma de escribir es la Edge Function
-- submit-contact-message, que verifica el reCAPTCHA con Google y usa la
-- service role (que salta RLS). Por eso la tabla:
--   - tiene RLS activado y ninguna política (deny por defecto);
--   - no da ningún permiso a anon ni a authenticated.
-- Quien llame a PostgREST con la anon key (que es pública) para saltarse el
-- reCAPTCHA recibe 42501.
--
-- Los check repiten los límites del cliente
-- (features/landing/constants/contact.constants.ts) y de la Edge Function:
-- son la última línea si alguna de las dos se desalinea.
--
-- `source` acepta 'landing' (HU-06) y 'about' (HU-14) desde ya: las dos
-- historias son de la misma épica y así HU-14 no necesita otra migración.
-- ============================================================================

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (char_length(btrim(name)) between 2 and 100),
  email text not null
    check (
      char_length(email) <= 254
      and email = lower(btrim(email))
      and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    ),
  message text not null
    check (char_length(btrim(message)) between 10 and 1000),
  source text not null
    check (source in ('about', 'landing')),
  created_at timestamptz not null default now()
);

comment on table public.contact_messages is
  'Mensajes del formulario de contacto (HU-06, HU-14). Solo escribe la Edge Function submit-contact-message.';

-- Para el límite de envíos por correo de la Edge Function y para leer los más
-- nuevos primero desde el Table Editor.
create index contact_messages_email_created_at_idx
  on public.contact_messages (email, created_at desc);

alter table public.contact_messages enable row level security;

-- Supabase da permisos por defecto a anon y authenticated en las tablas nuevas
-- de public: se quitan explícitamente. service_role conserva los suyos.
revoke all on table public.contact_messages from public, anon, authenticated;
