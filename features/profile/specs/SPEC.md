# Feature: Profile

Historia: **SCRUM-53 (HU-30) — Editar datos de perfil**. Criterios en [docs/historias-usuario.md](../../../docs/historias-usuario.md). `Cambiar contraseña` (HU-31, SCRUM-54) y `Cerrar sesión` (HU-32, SCRUM-55) se suman a esta misma pantalla en sus propios PRs.

## 1. Objetivo

Que la persona autenticada vea y edite su nombre y su foto de perfil, y que el cambio se refleje al instante en la navegación de la app (sidebar en desktop, cabecera en mobile). Sin foto se muestra un avatar con iniciales.

## 2. Alcance

Incluye:

- Ruta privada `/perfil` con el nombre y la foto actuales y un formulario para editarlos (CA-01, CA-02).
- Validación del nombre obligatorio antes de guardar (CA-03).
- Subir una foto (opcional) y quitarla para volver a las iniciales (CA-05). Quitarla no está en los criterios, pero sin eso subir una foto sería irreversible.
- Confirmación visual al guardar y reflejo inmediato en la navegación (CA-04).
- Punto de entrada: pie del sidebar (desktop) y cabecera delgada con el avatar (mobile).
- Bucket de Storage `avatars` con sus políticas (migración `036`).

No incluye: ver el apartado 14.

## 3. Entradas

- `name: string` — texto del campo "Nombre".
- `photo: File` — archivo elegido (opcional), `image/jpeg`, `image/png` o `image/webp`, de hasta 2 MB.
- Acción "Quitar foto".
- Sesión de Supabase Auth: `user.id` y `user_metadata` (`name`, `avatar_url`).

## 4. Salidas

- `user_metadata.name` y `user_metadata.avatar_url` actualizados en Supabase Auth.
- Un objeto nuevo en `avatars/<user_id>/<uuid>.<ext>` cuando se sube una foto; el anterior se borra.
- Mensaje de confirmación o de error.
- La navegación muestra el nombre y la foto nuevos sin recargar.

## 5. Reglas de negocio

1. El nombre es obligatorio: se recorta (`trim`) y no puede quedar vacío. Máximo 60 caracteres.
2. La foto es opcional. Tipos permitidos: JPEG, PNG y WebP. Máximo 2 MB. Un archivo que no cumple no se acepta y se avisa por qué.
3. Sin foto se muestran las iniciales del nombre (las dos primeras palabras).
4. Guardar está deshabilitado si el nombre no es válido, si no hay cambios, o mientras se guarda.
5. Si la foto no se puede subir, no se cambia nada (ni siquiera el nombre): el guardado es todo o nada desde el punto de vista de la persona.
6. La carpeta del archivo es el `user.id` de la sesión; el cliente no elige a nombre de quién sube (lo hace cumplir la política de Storage).
7. El nombre que se guarda es el mismo `user_metadata.name` que escribió el registro y que leen las RPC de household: no hay una segunda fuente.

## 6. Estados

Del guardado: `idle | saving | saved | error`. Se modelan con una unión derivada de constantes (constants-standards §7).

Del perfil cargado (hook compartido): `null` mientras no hay sesión conocida; `UserProfile` con la sesión.

## 7. Errores

| Caso | Cómo se muestra |
|---|---|
| Nombre vacío | Mensaje bajo el campo; el botón queda deshabilitado |
| Nombre de más de 60 caracteres | Mensaje bajo el campo |
| Foto de tipo no permitido | Mensaje bajo la foto; el archivo no se elige |
| Foto de más de 2 MB | Mensaje bajo la foto; el archivo no se elige |
| No se pudo subir la foto | Mensaje general; no se cambia nada |
| No se pudo guardar (red o servidor) | Mensaje general con opción de reintentar |

Ningún mensaje muestra el texto de error de Supabase.

## 8. UI esperada

- Cabecera con `ProfileAvatar` grande (foto o iniciales) y el nombre.
- Campo "Nombre" (obligatorio).
- Botón "Cambiar foto" (abre el selector de archivos) y, si hay foto, "Quitar foto".
- Vista previa de la foto elegida antes de guardar.
- Botón "Guardar cambios".
- Región con la confirmación "Cambios guardados" / el error.
- Entrada en el sidebar: avatar + nombre, con enlace a `/perfil`. En mobile: cabecera con la marca y el avatar como enlace.

## 9. Accesibilidad

- Cada campo con `label` asociado; los errores ligados con `aria-describedby`.
- La confirmación y los errores en una región `role="status"` / `role="alert"`.
- La foto lleva `alt` vacío cuando es decorativa junto al nombre; el enlace del sidebar tiene nombre accesible ("Mi perfil, <nombre>").
- El selector de archivos se abre con un botón real; el `input type="file"` está oculto sin quitarlo del árbol de accesibilidad para el botón que lo dispara.
- El enlace activo lleva `aria-current="page"`.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`. Tailwind con tokens `tacha-*`.
- Lógica en `useProfileViewModel`; los `.tsx` solo presentan.
- Sin strings ni números mágicos: todo en `constants/` (límites, tipos MIME, bucket, claves del metadata).
- Sin librería de formularios ni de recorte de imágenes.
- Sin estado global nuevo: la sesión de Supabase es la fuente de verdad y el evento `USER_UPDATED` avisa a quien escuche (`nextjs-enterprise-patterns` §3).
- Migración con el número `036`, aplicada antes de `waiting qa` (supabase/README.md#migraciones).

## 11. Dependencias

- `@/services/supabase.client`, `@/services/session.service` (`subscribeToSessionChanges`).
- `@/components/ui` (Button, Input), `@/components/app-shell` (consume el hook y el avatar compartidos).
- `@/constants` (`APP_ROUTE.PROFILE`), `@/types/nullable.types`.
- `utils/toInitials.ts` (promovido desde `features/household/utils/toMemberInitials.ts`, segundo consumidor real).

## 12. Contratos externos

- **Auth:** `auth.updateUser({ data: { name, avatar_url } })` (fusiona con el metadata existente; `avatar_url: null` borra la clave). Emite `USER_UPDATED`.
- **Storage:** bucket `avatars`, público para lectura de objetos por URL; `file_size_limit` 2 MB y `allowed_mime_types` fijados en el bucket. Políticas en `storage.objects` para `authenticated`: `select`, `insert` y `delete` solo en la carpeta `auth.uid()`. Sin política de `update` (cada subida es un objeto nuevo).
- **RLS:** no hay tablas nuevas.

## 13. Casos de aceptación

| # | Caso | Criterio |
|---|---|---|
| 1 | Entrar al perfil desde la navegación | CA-01 |
| 2 | La vista muestra nombre y foto actuales (o iniciales) con opción de editarlos | CA-02 |
| 3 | Guardar con el nombre vacío no es posible y se explica por qué | CA-03 |
| 4 | Guardar un nombre válido muestra "Cambios guardados" y el sidebar/cabecera cambian sin recargar | CA-04 |
| 5 | Sin foto se ven las iniciales; la foto es opcional | CA-05 |
| 6 | Subir una foto la muestra en el perfil y en la navegación | CA-04 |
| 7 | Una foto de tipo no permitido o de más de 2 MB se rechaza con un mensaje | Regla 2 |
| 8 | Quitar la foto vuelve a las iniciales | Regla 3 |
| 9 | Si falla la subida, el nombre no cambia y se muestra el error | Regla 5 |
| 10 | Sin cambios, "Guardar cambios" está deshabilitado | Regla 4 |

## 14. Casos fuera de alcance

- Cambiar contraseña (SCRUM-54), cerrar sesión (SCRUM-55), tarjeta de household y acceso a Configuración (HU-33 en adelante, HU-78).
- Cambiar el correo.
- Recortar, girar o redimensionar la foto en el navegador.
- Mostrar la foto de los demás integrantes en la lista de household (las RPC de household devuelven solo el nombre; las iniciales se mantienen ahí).
- Menú "Más" de mobile (DESIGN.md §3.2): se usa la cabecera con avatar hasta que haya más de 5 secciones.
- Borrar las fotos huérfanas si la persona cierra la pestaña a mitad del guardado.

## 15. Notas de implementación

- `avatar_url` se guarda como la URL pública completa; la ruta del objeto se deduce de ella para borrar el anterior.
- La pestaña mobile requiere revisión de diseño (Melany): la cabecera con avatar es una propuesta mientras no exista "Más".
