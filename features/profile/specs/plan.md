# Plan técnico: perfil

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

## SCRUM-53: editar datos de perfil

### Archivos

```
features/profile/
  Profile.tsx                          entrada ("use client"): cabecera + formulario (solo presentación)
  components/
    ProfileForm.tsx                    nombre, foto, guardar y el mensaje de estado
    ProfilePhotoField.tsx              vista previa, "Cambiar foto" / "Quitar foto" y el input de archivo oculto
    ProfileSaveFeedback.tsx            confirmación o error (role="status" / "alert")
    models/                            props de los componentes
  hooks/
    useProfileViewModel.ts             borrador de nombre, foto pendiente, validación derivada, guardado
  models/
    ProfileViewModel.interface.ts
  services/
    profile.service.ts                 saveProfile(payload): sube, actualiza el metadata y limpia lo viejo
  utils/
    validateProfileName.ts             función pura: nombre → mensaje de error o nada
    validateAvatarFile.ts              función pura: archivo → mensaje de error o nada
    getAvatarStoragePath.ts            función pura: URL pública → ruta del objeto (para borrar el anterior)
  constants/
    profile.constants.ts               textos, estados, resultados, reglas de la foto, bucket
  tests/                               ver tasks.md
  specs/  SPEC.md · plan.md · tasks.md

Compartido (segundo consumidor real: la navegación y esta pantalla)
  components/profile-avatar/ProfileAvatar.tsx   foto o iniciales, con tamaños
  hooks/useUserProfile.ts                       perfil de la sesión, se actualiza solo con USER_UPDATED
  types/profile.types.ts                        UserProfile { name, avatarUrl }
  utils/toUserProfile.ts                        Session.user → UserProfile (lee user_metadata)
  utils/toInitials.ts                           antes features/household/utils/toMemberInitials.ts
  constants/user-profile.constants.ts           USER_METADATA_KEY { AVATAR_URL, NAME }

Navegación
  components/app-shell/hooks/useAppShellViewModel.ts   + profile e isProfileActive
  components/app-shell/components/AppSidebar.tsx       + enlace al perfil al pie
  components/app-shell/components/AppTopBar.tsx        nuevo: cabecera mobile con marca y avatar
  components/app-shell/AppShell.tsx                    + AppTopBar
  constants/routes.constants.ts                        + APP_ROUTE.PROFILE = "/perfil"

app/(app)/perfil/page.tsx              solo la ruta (metadata + <Profile />)
supabase/migrations/036_create_avatars_bucket.sql
```

### Datos

Sin tablas. El nombre y la foto viven en `auth.users.raw_user_meta_data` (donde ya vive el nombre del registro). Migración `036`:

- Bucket `avatars`: público, 2 MB, `image/jpeg`, `image/png`, `image/webp`.
- `storage.objects`: políticas `select`, `insert` y `delete` para `authenticated` cuando `bucket_id = 'avatars'` y la primera carpeta del nombre es `auth.uid()`. Sin `update`.

### Flujo

Abro `/perfil` desde el pie del sidebar → `Profile.tsx` con `useProfileViewModel`, que lee `useUserProfile()` (suscripción a `subscribeToSessionChanges`). El nombre mostrado es `draftName ?? profile.name`: el borrador es `undefined` hasta que escribo, así que no hay efecto que copie el perfil al formulario. Elijo una foto: `validateAvatarFile` la revisa; si es válida se guarda `{ file, previewUrl }` (`URL.createObjectURL`) y un efecto revoca la URL anterior al cambiar o desmontar. Guardo: `handleSubmit` valida otra vez, pasa a `saving` y llama a `saveProfile({ name, photo })`:

1. Si hay foto nueva, la sube a `avatars/<user.id>/<uuid>.<ext>`; si falla devuelve `PHOTO_ERROR` y no toca nada más.
2. `auth.updateUser({ data: { name, avatar_url } })`; si falla y subió una foto, la borra y devuelve `ERROR`.
3. Con éxito, borra el objeto anterior (si lo había y cambió) sin esperar su resultado.

Supabase emite `USER_UPDATED`; `useUserProfile` recibe la sesión nueva y el sidebar, la cabecera mobile y el perfil se redibujan. El ViewModel limpia el borrador y pasa a `saved`.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Nombre y foto en `user_metadata` | Tabla `profiles` con trigger | El registro y las RPC de household ya leen `raw_user_meta_data ->> 'name'`; una tabla segunda obliga a migrar datos y sincronizar dos fuentes. Costo: el metadata lo escribe el cliente, así que `avatar_url` no es de fiar para otros usuarios (por eso no se muestra a los demás integrantes) |
| La sesión de Supabase es el estado compartido (`useUserProfile`) | Context o Zustand | El equipo no eligió patrón de estado de cliente; `USER_UPDATED` ya es el canal de cambio y no hay nada que guardar ni sincronizar |
| Bucket público con nombres `<uid>/<uuid>.<ext>` | Bucket privado con URLs firmadas | La URL no es adivinable y no hay datos sensibles; las firmadas caducan y obligan a renovarlas en cada vista. Costo: quien tenga la URL ve la foto |
| Cada subida es un objeto nuevo y se borra el anterior | `upsert` sobre un nombre fijo | Un nombre nuevo rompe la caché del navegador y el CDN al instante; con nombre fijo el sidebar mostraría la foto vieja. Además evita una política `update` |
| Subir antes de actualizar el metadata, y deshacer si falla | Actualizar primero | Un fallo entre los dos pasos deja un archivo suelto (limpiable) y no un perfil apuntando a un archivo inexistente |
| Tipo y tamaño validados en el bucket y en el cliente | Solo el `accept` del input | `accept` no es un control (security-practices §4); el bucket rechaza lo demás aunque se llame a la API a mano. El cliente solo da el mensaje antes |
| Borrador `undefined` hasta que se escribe | `useEffect` que copia el perfil al estado | Un efecto que setea estado es lo que `react-hooks/set-state-in-effect` prohíbe, y se desincroniza si el perfil cambia en otra pestaña |
| Estado como unión `idle \| saving \| saved \| error` | Booleanos `isSaving` e `isSaved` | Dos booleanos admiten "guardando y guardado a la vez" |
| Promover `toMemberInitials` a `utils/toInitials.ts` | Copiarlo o importar de `features/household` | Una feature no importa de otra, y `components/` no importa de `features/`. Es el segundo consumidor (project-structure) |
| Cabecera delgada en mobile con el avatar | Sexta pestaña o menú "Más" | DESIGN.md §3.2 limita a 5 pestañas y "Más" aún no existe; la cabecera no toca la barra de pestañas |
| Sin recorte ni redimensionado | Librería de recorte | No está en los criterios; el límite de 2 MB y `object-cover` cubren el caso |

### Conceptos nuevos

- **Supabase Storage:** buckets, objetos y políticas sobre `storage.objects`; `storage.foldername`.
- **`user_metadata` frente a una tabla propia** y por qué el cliente puede escribirlo.
- **`USER_UPDATED`** y cómo un evento reemplaza a un store compartido.
- **`URL.createObjectURL`** y por qué hay que revocarla.
- **Orden de pasos para fallar seguro** (subir → actualizar → limpiar).

### Puesta en marcha

1. Aplicar `036` antes de pasar el PR a `waiting qa`, en una transacción con su fila del historial (supabase/README.md#migraciones). Avisar al grupo antes.
2. Probar con una foto JPEG, una de más de 2 MB, un PDF renombrado a `.jpg` y quitar la foto.
