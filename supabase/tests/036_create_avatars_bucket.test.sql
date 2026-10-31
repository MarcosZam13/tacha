-- ============================================================================
-- Prueba de la migración 036 (SCRUM-53): bucket `avatars` y sus políticas.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño), después de aplicar
-- 036. Transacción con rollback (mismo patrón que
-- supabase/tests/032_fix_product_catalog_rls.test.sql): no deja nada en la
-- base compartida.
--
-- Datos:
--   A y B: usuarios registrados distintos.
--
-- Casos:
--   1. El bucket existe, es público, limita a 2 MB y a JPEG/PNG/WebP.
--   2. A sube a su carpeta.
--   3. A NO puede subir a la carpeta de B (42501).
--   4. A NO ve lo que hay en la carpeta de B.
--   5. A borra su objeto; el de B no se toca.
--   6. anon no puede subir (42501).
-- ============================================================================

begin;

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  bucket_row storage.buckets%rowtype;
begin
  select * into bucket_row from storage.buckets where id = 'avatars';
  assert bucket_row.id is not null, '1: no existe el bucket avatars';
  assert bucket_row.public, '1: el bucket debería ser público';
  assert bucket_row.file_size_limit = 2097152, '1: el límite debería ser 2 MB';
  assert bucket_row.allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']
    and cardinality(bucket_row.allowed_mime_types) = 3,
    '1: los tipos permitidos deberían ser JPEG, PNG y WebP';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha', '{"name": "Beto"}');

  -- El objeto de B lo crea el rol dueño (salta RLS) para tener algo que A no deba ver.
  insert into storage.objects (bucket_id, name, owner)
  values ('avatars', user_b || '/foto.png', user_b);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
end;
$$;

-- ----------------------------------------------------------------------------
-- Como A (authenticated).
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

-- 2. A sube a su carpeta.
insert into storage.objects (bucket_id, name, owner)
values ('avatars', current_setting('tacha_test.user_a') || '/mia.png', current_setting('tacha_test.user_a')::uuid);

-- 3. A NO puede subir a la carpeta de B.
do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('avatars', current_setting('tacha_test.user_b') || '/intruso.png', current_setting('tacha_test.user_a')::uuid);
    raise exception '3: A pudo subir a la carpeta de B';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- 4. A solo ve su propia carpeta.
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from storage.objects where bucket_id = 'avatars';
  assert visible_count = 1, '4: A debería ver solo su objeto, vio ' || visible_count;
end;
$$;

-- 5. A borra el suyo; el de B no se ve ni se borra.
do $$
declare
  deleted_count integer;
begin
  delete from storage.objects where bucket_id = 'avatars';
  get diagnostics deleted_count = row_count;
  assert deleted_count = 1, '5: A debería borrar 1 objeto, borró ' || deleted_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- Como anon.
-- ----------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);

-- 6. anon no puede subir.
do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    values ('avatars', gen_random_uuid() || '/anon.png');
    raise exception '6: anon pudo subir';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

-- 5 (cierre). El objeto de B sigue ahí.
do $$
begin
  assert (select count(*) from storage.objects
          where bucket_id = 'avatars' and name = current_setting('tacha_test.user_b') || '/foto.png') = 1,
    '5: el objeto de B no debería haberse borrado';
end;
$$;

rollback;
