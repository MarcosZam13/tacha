-- ============================================================================
-- Prueba de la migración 059 (SCRUM-161): foto de una receta.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño), después de aplicar
-- 059 y 060 (que abre la foto a la familia). Todo pasa dentro de una transacción que termina en rollback: no deja
-- usuarios, recetas ni archivos en la base compartida. Si una regla no se
-- cumple, un `assert` corta con su mensaje; si termina sin error, pasó. Contra
-- la base sin 059 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes.
--
-- No prueba el límite de tamaño ni de tipo: los hace cumplir la API de Storage,
-- no la tabla. Acá solo se comprueba que el bucket los tiene puestos.
--
-- Datos:
--   A: receta recipe_a. Su nombre es la ruta de una foto en la carpeta de B: si
--      una política comparara recipes.name en vez de storage.objects.name, se
--      notaría.
--   B: receta recipe_b, con una foto photo_b que sube el rol dueño.
-- ============================================================================

begin;

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  recipe_a uuid := gen_random_uuid();
  recipe_b uuid := gen_random_uuid();
  photo_b text;
begin
  photo_b := recipe_b || '/' || gen_random_uuid() || '.jpg';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha', '{"name": "Beto"}');

  insert into public.recipes (id, owner_id, name, base_servings)
  values
    (recipe_a, user_a, photo_b, 2),
    (recipe_b, user_b, 'Receta B SCRUM-161', 2);

  insert into storage.objects (bucket_id, name, owner_id)
  values ('recipe-photos', photo_b, user_b::text);
  update public.recipes set photo_path = photo_b where id = recipe_b;

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.recipe_a', recipe_a::text, true);
  perform set_config('tacha_test.recipe_b', recipe_b::text, true);
  perform set_config('tacha_test.photo_b', photo_b, true);
  perform set_config('tacha_test.photo_a1', recipe_a || '/' || gen_random_uuid() || '.jpg', true);
  perform set_config('tacha_test.photo_a2', recipe_a || '/' || gen_random_uuid() || '.webp', true);
  -- Las versiones nuevas de Storage bloquean el delete directo si no se pide: la
  -- API lo pide sola, acá hace falta para probar la política.
  perform set_config('storage.allow_delete_query', 'true', true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Bucket, permisos y políticas.
-- ----------------------------------------------------------------------------

do $$
declare
  bucket_row storage.buckets%rowtype;
begin
  assert to_regprocedure('public.set_recipe_photo(uuid, text)') is not null,
    '1: no existe set_recipe_photo: falta aplicar la 059';

  select * into bucket_row from storage.buckets where id = 'recipe-photos';
  assert bucket_row.id is not null, '1: no existe el bucket recipe-photos';
  assert not bucket_row.public, '1: el bucket tiene que ser privado';
  assert bucket_row.file_size_limit = 5242880, '1: el límite tiene que ser 5 MB';
  assert bucket_row.allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']
    and cardinality(bucket_row.allowed_mime_types) = 3, '1: los tipos tienen que ser JPEG, PNG y WebP';

  assert not has_function_privilege('anon', 'public.set_recipe_photo(uuid, text)', 'execute'),
    '1: anon no ejecuta set_recipe_photo';
  assert has_function_privilege('authenticated', 'public.set_recipe_photo(uuid, text)', 'execute'),
    '1: authenticated ejecuta set_recipe_photo';
  assert (select p.prosecdef from pg_proc p where p.oid = 'public.set_recipe_photo(uuid, text)'::regprocedure),
    '1: set_recipe_photo es security definer (060): falta aplicar la 060';

  assert not has_column_privilege('authenticated', 'public.recipes', 'photo_path', 'update'), '1: photo_path no se cambia directo';
  assert not has_column_privilege('authenticated', 'public.recipes', 'photo_path', 'insert'), '1: photo_path no se inserta';
  assert not has_column_privilege('authenticated', 'public.recipes', 'image_url', 'update'), '1: image_url sigue cerrada';
  assert not has_column_privilege('authenticated', 'public.recipes', 'owner_id', 'update'), '1: owner_id sigue cerrada';

  assert (
    select count(*) = 3 and bool_and(roles = array['authenticated']::name[])
      and count(*) filter (where cmd in ('UPDATE', 'ALL')) = 0
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'recipe_photos_%'
  ), '1: tres políticas, solo authenticated y ninguna de update';
end $$;

-- ----------------------------------------------------------------------------
-- 2. A: sube solo a la carpeta de su receta y con un nombre exacto.
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

insert into storage.objects (bucket_id, name, owner_id)
values
  ('recipe-photos', current_setting('tacha_test.photo_a1'), current_setting('tacha_test.user_a')),
  ('recipe-photos', current_setting('tacha_test.photo_a2'), current_setting('tacha_test.user_a'));

do $$
declare
  bad_name text;
  own text := current_setting('tacha_test.recipe_a');
  some_id text := gen_random_uuid()::text;
begin
  foreach bad_name in array array[
    current_setting('tacha_test.recipe_b') || '/' || some_id || '.jpg',
    gen_random_uuid() || '/' || some_id || '.jpg',
    current_setting('tacha_test.user_a') || '/' || some_id || '.jpg',
    own || '/' || some_id || '.svg',
    own || '/' || some_id || '.jpg.html',
    own || '/foto.jpg',
    own || '/sub/' || some_id || '.jpg',
    own || '/../' || some_id || '.jpg',
    'no-es-uuid/' || some_id || '.jpg',
    some_id || '.jpg',
    'foto.jpg'
  ] loop
    begin
      insert into storage.objects (bucket_id, name, owner_id)
      values ('recipe-photos', bad_name, current_setting('tacha_test.user_a'));
      raise exception using errcode = 'P0004', message = '2: A pudo subir ' || bad_name;
    exception
      when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 3. A: ve y toca solo lo suyo.
-- ----------------------------------------------------------------------------

do $$
declare
  changed_count integer;
begin
  assert (
    select count(*) = 2 and bool_and(o.owner_id = current_setting('tacha_test.user_a'))
    from storage.objects o where o.bucket_id = 'recipe-photos'
  ), '3: A ve solo sus dos fotos';

  delete from storage.objects
  where bucket_id = 'recipe-photos' and name = current_setting('tacha_test.photo_b');
  get diagnostics changed_count = row_count;
  assert changed_count = 0, '3: A no borra la foto de B';

  update storage.objects set metadata = '{}'
  where bucket_id = 'recipe-photos';
  get diagnostics changed_count = row_count;
  assert changed_count = 0, '3: nadie reemplaza un archivo';
exception
  -- Sin permiso de update sobre la tabla también vale.
  when insufficient_privilege then null;
end $$;

-- ----------------------------------------------------------------------------
-- 4. set_recipe_photo: guarda, devuelve la anterior, quita y rechaza.
-- ----------------------------------------------------------------------------

do $$
declare
  own uuid := current_setting('tacha_test.recipe_a')::uuid;
  bad_path text;
  bad_recipe uuid;
begin
  assert public.set_recipe_photo(own, current_setting('tacha_test.photo_a1')) is null, '4: no había foto';
  assert public.set_recipe_photo(own, current_setting('tacha_test.photo_a2')) = current_setting('tacha_test.photo_a1'),
    '4: devuelve la anterior';
  assert (select photo_path = current_setting('tacha_test.photo_a2') from public.recipes where id = own),
    '4: queda la nueva';

  foreach bad_path in array array[
    current_setting('tacha_test.photo_b'),
    'https://ejemplo.com/pixel.jpg',
    own || '/' || gen_random_uuid() || '.svg',
    own || '/foto.jpg',
    own || '/' || gen_random_uuid() || E'.jpg\nx',
    ''
  ] loop
    begin
      perform public.set_recipe_photo(own, bad_path);
      raise exception using errcode = 'P0004', message = '4: aceptó la ruta ' || bad_path;
    exception
      when check_violation then null;
    end;

    begin
      update public.recipes set photo_path = bad_path where id = own;
      raise exception using errcode = 'P0004', message = '4: el update directo aceptó ' || bad_path;
    exception
      when insufficient_privilege then null;
    end;
  end loop;

  foreach bad_recipe in array array[current_setting('tacha_test.recipe_b')::uuid, gen_random_uuid(), null::uuid] loop
    begin
      perform public.set_recipe_photo(bad_recipe, null);
      raise exception using errcode = 'P0004', message = '4: cambió una receta que no es suya';
    exception
      when no_data_found then null;
    end;
  end loop;

  begin
    update public.recipes set image_url = 'https://ejemplo.com/pixel.jpg' where id = own;
    raise exception using errcode = 'P0004', message = '4: image_url se pudo escribir';
  exception
    when insufficient_privilege then null;
  end;

  assert public.set_recipe_photo(own, null) = current_setting('tacha_test.photo_a2'), '4: al quitar devuelve la anterior';
  assert (select photo_path is null from public.recipes where id = own), '4: quedó sin foto';
end $$;

-- ----------------------------------------------------------------------------
-- 4b. Con una receta ajena visible, A ve su foto pero no la borra ni la cambia
--     (la 060 decide eso por la membresía, no por lo visible). La política extra
--     se va con el rollback.
-- ----------------------------------------------------------------------------

reset role;
create policy "test_059_shared_recipes" on public.recipes for select to authenticated using (true);
set local role authenticated;

do $$
declare
  changed_count integer;
begin
  assert exists (
    select 1 from storage.objects
    where bucket_id = 'recipe-photos' and name = current_setting('tacha_test.photo_b')
  ), '4b: quien ve la receta ve su foto';

  delete from storage.objects
  where bucket_id = 'recipe-photos' and name = current_setting('tacha_test.photo_b');
  get diagnostics changed_count = row_count;
  assert changed_count = 0, '4b: borró la foto de una receta que ve pero no es suya';

  begin
    perform public.set_recipe_photo(current_setting('tacha_test.recipe_b')::uuid, null);
    raise exception using errcode = 'P0004', message = '4b: cambió la foto de una receta que ve pero no es suya';
  exception
    when no_data_found then null;
  end;
end $$;

reset role;
drop policy "test_059_shared_recipes" on public.recipes;
set local role authenticated;

-- ----------------------------------------------------------------------------
-- 5. A elimina la receta: sus archivos todavía se ven y se pueden borrar, y ya
--    no se puede subir a esa carpeta.
-- ----------------------------------------------------------------------------

do $$
declare
  changed_count integer;
begin
  delete from public.recipes where id = current_setting('tacha_test.recipe_a')::uuid;
  get diagnostics changed_count = row_count;
  assert changed_count = 1, '5: A borra su receta';

  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'recipe-photos',
      current_setting('tacha_test.recipe_a') || '/' || gen_random_uuid() || '.jpg',
      current_setting('tacha_test.user_a')
    );
    raise exception using errcode = 'P0004', message = '5: subió a la carpeta de una receta borrada';
  exception
    when insufficient_privilege then null;
  end;

  delete from storage.objects where bucket_id = 'recipe-photos';
  get diagnostics changed_count = row_count;
  assert changed_count = 2, '5: A borra sus dos archivos, borró ' || changed_count;
end $$;

-- ----------------------------------------------------------------------------
-- 6. B ve y borra la suya; anon y sin sesión, nada.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (
    select count(*) = 1 from storage.objects
    where bucket_id = 'recipe-photos' and name = current_setting('tacha_test.photo_b')
  ), '6: la foto de B sigue y B la ve';
end $$;

select set_config('request.jwt.claims', '{}', true);

do $$
begin
  perform public.set_recipe_photo(current_setting('tacha_test.recipe_b')::uuid, null);
  raise exception using errcode = 'P0004', message = '6: sin sesión cambió la foto';
exception
  when insufficient_privilege then null;
end $$;

reset role;
set local role anon;

do $$
begin
  assert not exists (select 1 from storage.objects where bucket_id = 'recipe-photos'), '6: anon no ve fotos';

  begin
    insert into storage.objects (bucket_id, name)
    values ('recipe-photos', current_setting('tacha_test.recipe_b') || '/' || gen_random_uuid() || '.jpg');
    raise exception using errcode = 'P0004', message = '6: anon pudo subir';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
