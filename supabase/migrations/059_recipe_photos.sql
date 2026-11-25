-- ============================================================================
-- SCRUM-161 (HU-63 CA-01): foto de una receta.
--
-- 1. recipes.photo_path: la ruta del archivo en Storage, nunca una URL (con
--    recetas compartidas, una URL ajena serviría de píxel de rastreo).
-- 2. set_recipe_photo: guarda la ruta y devuelve la anterior en la misma
--    operación, para poder borrar ese archivo.
-- 3. Bucket privado recipe-photos y sus políticas.
--
-- image_url no se reutiliza ni se borra: el código de main todavía la lee y la
-- dibuja como URL. Sigue cerrada a escritura (008).
--
-- No cambia save_recipe, las políticas de recipes ni el bucket avatars.
-- Los límites repiten features/recipes/constants/recipes.constants.ts.
-- Spec: features/recipes/specs/SPEC.md, sección 16.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La columna. El check vale también para una escritura directa: la ruta solo
--    puede ser de la carpeta de esa misma receta.
-- ----------------------------------------------------------------------------
alter table public.recipes
  add column photo_path text,
  add constraint recipes_photo_path_check check (
    photo_path is null
    or photo_path ~ (
      '^' || id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );

-- Solo update: una receta nueva nace sin foto, porque la ruta lleva su id. Qué
-- filas, lo decide la política de 007 (la dueña); qué columnas, esto (008).
grant update (photo_path) on public.recipes to authenticated;

-- ----------------------------------------------------------------------------
-- 2. set_recipe_photo. Sin ruta quita la foto. security invoker: la RLS decide
--    qué receta ve y cambia quien llama, y una ajena da el mismo error que una
--    que no existe. Una ruta que no es de esa receta la rechaza el check (23514).
--    El bloqueo de la fila evita que dos cambios a la vez devuelvan la misma
--    ruta anterior y dejen un archivo sin dueño.
-- ----------------------------------------------------------------------------
create or replace function public.set_recipe_photo(target_recipe_id uuid, new_photo_path text default null)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous_photo_path text;
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere una sesión para cambiar la foto'
      using errcode = '42501';
  end if;

  select r.photo_path into previous_photo_path
  from public.recipes r
  where r.id = target_recipe_id
  for update;

  if not found then
    raise exception 'Receta no encontrada'
      using errcode = 'P0002';
  end if;

  update public.recipes
  set photo_path = new_photo_path
  where id = target_recipe_id;

  return previous_photo_path;
end;
$$;

revoke execute on function public.set_recipe_photo(uuid, text) from public, anon;
grant execute on function public.set_recipe_photo(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Bucket privado. El tamaño y el tipo los hace cumplir Storage en el
--    servidor (security-practices §4); la pantalla solo avisa antes.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-photos',
  'recipe-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Políticas. La carpeta es el id de la receta: <recipe_id>/<uuid>.<ext>.
-- Dos cuidados:
--   - recipes también tiene una columna name: dentro del exists hay que escribir
--     storage.objects.name, o se compararía el nombre de la receta;
--   - la carpeta se convierte a uuid dentro de un case que antes mira su forma,
--     para que un nombre raro dé "no" y no un error de conversión.

-- Leer (y firmar enlaces): quien ve la receta, por la RLS de recipes, o quien
-- subió el archivo (hace falta para borrarlo cuando la receta ya no existe).
create policy "recipe_photos_select_visible_recipe_or_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'recipe-photos'
    and (
      owner_id = (select auth.uid())::text
      or exists (
        select 1 from public.recipes r
        where r.id = case
          when storage.objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
            then split_part(storage.objects.name, '/', 1)::uuid
        end
      )
    )
  );

-- Subir: solo a la carpeta de una receta propia, con un nombre exacto.
create policy "recipe_photos_insert_own_recipe"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'recipe-photos'
    and exists (
      select 1 from public.recipes r
      where r.owner_id = (select auth.uid())
        and r.id = case
          when storage.objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
            then split_part(storage.objects.name, '/', 1)::uuid
        end
    )
  );

-- Borrar: quien lo subió (Storage pone owner_id con la sesión). No mira la
-- receta: al eliminarla, el archivo se borra después. Sin política de update:
-- cada subida es un archivo nuevo.
create policy "recipe_photos_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'recipe-photos'
    and owner_id = (select auth.uid())::text
  );
