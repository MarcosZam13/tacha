-- ============================================================================
-- Prueba de la migración 028 (SCRUM-28): contact_messages.
--
-- Cómo se corre: completo en el SQL Editor, después de aplicar 028. Todo pasa
-- dentro de una transacción que termina en rollback: no deja filas en la base
-- compartida. Si una regla no se cumple, un `assert` o `raise` corta con su
-- mensaje; si termina sin error, pasó. Contra la base sin 028 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedaría la
-- fila de prueba del paso 4 en la base compartida.
-- ============================================================================

begin;

-- 1. RLS activado.
do $$
begin
  assert (
    select c.relrowsecurity
    from pg_class c
    where c.oid = 'public.contact_messages'::regclass
  ), 'contact_messages tiene que tener RLS activado';
end $$;

-- 2. Un visitante (anon, la key pública) no puede escribir ni leer.
set local role anon;
do $$
begin
  begin
    insert into public.contact_messages (name, email, message, source)
    values ('Bot', 'bot@correo.com', 'Mensaje automatizado.', 'landing');
    raise exception 'anon pudo insertar en contact_messages';
  exception when insufficient_privilege then
    null; -- esperado: 42501
  end;

  begin
    perform 1 from public.contact_messages;
    raise exception 'anon pudo leer contact_messages';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

-- 3. Un usuario con sesión tampoco: el contacto no depende de tener cuenta.
set local role authenticated;
do $$
begin
  begin
    insert into public.contact_messages (name, email, message, source)
    values ('Ana', 'ana@correo.com', 'Hola, quiero saber más.', 'landing');
    raise exception 'authenticated pudo insertar en contact_messages';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

-- 4. La service role (la que usa la Edge Function) sí puede insertar.
set local role service_role;
insert into public.contact_messages (name, email, message, source)
values ('Ana', 'ana@correo.com', 'Hola, quiero saber más de Tacha.', 'landing');
reset role;

-- 5. Los check rechazan lo que el cliente y la función ya rechazan.
do $$
declare
  invalid_row record;
begin
  for invalid_row in
    select *
    from (values
      ('nombre de 1 carácter', ' A ', 'ana@correo.com', 'Hola, quiero saber más.', 'landing'),
      ('correo sin dominio', 'Ana', 'ana@', 'Hola, quiero saber más.', 'landing'),
      ('correo con mayúsculas', 'Ana', 'Ana@Correo.com', 'Hola, quiero saber más.', 'landing'),
      ('mensaje corto', 'Ana', 'ana@correo.com', 'Hola', 'landing'),
      ('mensaje largo', 'Ana', 'ana@correo.com', repeat('a', 1001), 'landing'),
      ('origen desconocido', 'Ana', 'ana@correo.com', 'Hola, quiero saber más.', 'otro')
    ) as cases (label, name, email, message, source)
  loop
    begin
      insert into public.contact_messages (name, email, message, source)
      values (invalid_row.name, invalid_row.email, invalid_row.message, invalid_row.source);
      raise exception 'se aceptó una fila inválida: %', invalid_row.label;
    exception when check_violation then
      null;
    end;
  end loop;
end $$;

rollback;
