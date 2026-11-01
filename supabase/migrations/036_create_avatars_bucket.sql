-- ============================================================================
-- SCRUM-53 (HU-30): fotos de perfil
--
-- Crea el bucket `avatars` y las políticas de storage.objects que lo protegen.
-- El nombre y la URL de la foto viven en auth.users.raw_user_meta_data
-- (`name`, `avatar_url`); no hay tabla nueva.
--
-- Bucket:
--   - público: las fotos se ven por su URL, sin pedir permiso a la API. La
--     ruta lleva un uuid por subida (<user_id>/<uuid>.<ext>), no es adivinable.
--   - file_size_limit y allowed_mime_types los hace cumplir Storage en el
--     servidor: el `accept` del input y la validación del cliente son solo
--     el mensaje temprano (security-practices §4).
--
-- Políticas (authenticated, sobre su propia carpeta = auth.uid()):
--   - select e insert y delete. Cada subida es un objeto nuevo y el anterior
--     se borra, así que no hay política de update.
--   - select propio hace falta para que delete funcione; no permite listar ni
--     leer la carpeta de otra persona por la API.
--   - Quien no sea authenticated (anon) no puede escribir nada.
--
-- Los límites repiten features/profile/constants/profile.constants.ts.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars_select_own_folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
