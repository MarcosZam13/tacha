# Feature: SocialSignUp

Historias: HU-19 (SCRUM-42) y HU-20 (SCRUM-43). Criterios en [docs/historias-usuario.md](../../../docs/historias-usuario.md).

## 1. Objetivo
Permitir que un visitante cree su cuenta con Google o Facebook, sin llenar el formulario de registro manual.

## 2. Alcance
Incluye:
- Botones "Registrarse con Google" y "Registrarse con Facebook" en `/registro`.
- Redirección al flujo OAuth del proveedor elegido.
- Página de retorno `/registro/social`, que obtiene y valida al usuario contra Supabase Auth.
- Aviso con enlace al login cuando el correo ya está registrado.
- SCRUM-43: formulario `/registro/completar` que pide el nombre a una cuenta social nueva antes de entrar a la app.
- SCRUM-43: puerta de las pantallas privadas (`app/(app)/layout.tsx`): una cuenta social que no completó el registro va a `/registro/completar`.

No incluye: ver §14.

## 3. Entradas
- provider: `SocialProviderType` (`google` | `facebook`), al tocar un botón.
- Parámetros `error` de la URL de retorno (query o fragmento).
- Usuario devuelto por `auth.getUser()`: `email`, `identities`, `is_anonymous`, `user_metadata`, `app_metadata.provider`.
- name: string, en el formulario de `/registro/completar` (SCRUM-43).

## 4. Salidas
- Redirección al proveedor.
- Cuenta nueva: redirige a `/registro/completar` (SCRUM-43). Al enviar el formulario se guardan el nombre y la marca de registro completado, y se entra a `APP_ROUTE.LIST`.
- Correo ya registrado: desvincula la identidad nueva si la cuenta tiene otra, cierra la sesión y muestra el aviso.
- Error: muestra el mensaje con su enlace y cierra la sesión si el flujo creó una.

## 5. Reglas de negocio
- El usuario se valida con `getUser()` (consulta al servidor), no con datos leídos de la URL.
- Sin correo no hay registro: se trata como error y se cierra la sesión.
- El nombre lo pide el formulario de `/registro/completar`, con el que entregó el proveedor ya escrito y editable (SCRUM-43).
- El nombre es obligatorio y tiene el mismo máximo que el perfil (`USER_NAME_MAX_LENGTH`, 60 caracteres): uno vacío, de solo espacios o más largo no se guarda. Se guarda sin espacios al inicio ni al final, en `user_metadata.name` (`USER_METADATA_KEY.NAME`), el mismo dato del registro manual y del perfil.
- La marca `social_sign_up_completed_at` se guarda junto con el nombre, no al volver del proveedor. Una cuenta que abandona el formulario no tiene marca y, si repite el registro social, vuelve al formulario.
- Una cuenta social que no completó el registro no se considera activa: cualquier pantalla privada la envía a `/registro/completar` y no muestra su contenido. Funciona aunque el guard de sesión esté apagado; una sesión anónima, sin sesión o de correo pasa sin cambios (lo que le pase sin sesión lo decide el guard).
- "Antes de crear la cuenta" (segundo criterio de HU-20) se cumple como "antes de que la cuenta quede completa": Supabase crea el usuario al volver del proveedor, antes de cualquier formulario, y eso no se puede evitar sin dejar de usar su OAuth.
- `/registro/completar` solo muestra el formulario a una cuenta de Google o Facebook sin marca. Una cuenta de correo, o una que ya completó el registro, entra directo a la app.
- El correo ya existe si el usuario tiene más de una identidad o ya tiene la marca `social_sign_up_completed_at`.
- La marca solo decide qué aviso se muestra y si `/registro/completar` muestra el formulario; nunca da permisos, porque la persona puede editar `user_metadata`.
- La página de retorno solo evalúa el registro si este navegador inició el flujo desde los botones. Así, abrir `/registro/social` directo no cierra una sesión válida.
- Sin esa marca (por ejemplo, al volver con "atrás" desde el formulario), si la sesión es de una cuenta social que no completó el registro, la página envía a `/registro/completar` en vez de mostrar el error (SCRUM-43). Nunca cierra la sesión en ese caso.
- Una sesión anónima nunca cuenta como registro y no se cierra.

## 6. Estados
`SOCIAL_SIGN_UP_STATUS`: `checking`, `success`, `email-exists`, `error`.

`COMPLETE_SIGN_UP_STATUS` (SCRUM-43): `loading`, `no-account`, `ready`, `saving`.

## 7. Errores
| Error | Se muestra |
|---|---|
| El proveedor no puede iniciar el flujo | Mensaje debajo de los botones, que se vuelven a habilitar |
| La persona cancela, el proveedor falla o no entrega correo | "No pudimos completar el registro", con enlace a `/registro` |
| Página abierta sin haber iniciado el flujo | El mismo mensaje de error |
| Correo ya registrado | "Ya tenés una cuenta", con enlace a `/login` |
| Nombre vacío en el formulario (SCRUM-43) | "El nombre es obligatorio." debajo del campo; no se guarda |
| Nombre de más de 60 caracteres (SCRUM-43) | "El nombre no puede tener más de 60 caracteres." debajo del campo; no se guarda |
| No se pudo guardar el nombre, o no hay red (SCRUM-43) | "No pudimos guardar tu nombre. Intentá de nuevo."; el formulario sigue con lo escrito |
| `/registro/completar` sin un registro social en curso (SCRUM-43) | Mensaje con enlace a `/registro` |

## 8. UI esperada
- Dos botones secundarios debajo del formulario de registro.
- Spinner en la página de retorno mientras se valida.
- Título, mensaje y enlace cuando hay aviso.
- `/registro/completar` (SCRUM-43): título "Completá tu registro", descripción, campo "Nombre" obligatorio y botón "Continuar" ("Guardando..." mientras guarda).

## 9. Accesibilidad
- Botones nativos con texto claro, operables con teclado.
- Errores con `role="alert"`; el spinner tiene `role="status"` y etiqueta.

## 10. Restricciones técnicas
- TypeScript estricto, sin `any`; sin librerías nuevas.
- Lógica en ViewModels y textos en constantes.
- Los secrets de OAuth viven solo en Supabase, nunca en `.env*` ni con prefijo `NEXT_PUBLIC_`.

## 11. Dependencias
- `services/supabase.client.ts`, `services/session.service.ts`
- `constants/routes.constants.ts`, `constants/user-profile.constants.ts` (`USER_METADATA_KEY`, `USER_NAME_MAX_LENGTH`)
- `utils/toUserProfile.ts` (nombre que entregó el proveedor)
- `@/components/ui` (Button, Input, Spinner)
- `features/session-guard` (ruta pública) y `features/registro-manual` (muestra los botones)

## 12. Contratos externos
- `supabase.auth.signInWithOAuth`, `getUser`, `updateUser` y `unlinkIdentity`.
- `updateUser({ data: { name, social_sign_up_completed_at } })` al enviar el formulario (SCRUM-43).
- Google y Facebook habilitados en Authentication > Providers; `/registro/social` en las Redirect URLs de cada ambiente.
- Manual Linking activo solo si `unlinkIdentity` lo requiere.
- Sin tablas, RPC ni migraciones.

## 13. Casos de aceptación
- CA-01: se muestran los botones de Google y Facebook. *Cubierto por:* `SocialSignUpButtons.test.tsx`, E2E-SOCIAL-01.
- CA-02: cada botón redirige al flujo OAuth de su proveedor. *Cubierto por:* `social-sign-up.service.test.ts`, E2E-SOCIAL-02.
- CA-03: se obtiene y valida el usuario; sin correo, el registro no se completa. *Cubierto por:* `getSocialSignUpResult.test.ts`, `social-sign-up.service.test.ts`, prueba manual.
- CA-04: si el correo ya está registrado, se informa y se sugiere iniciar sesión. *Cubierto por:* `getSocialSignUpResult.test.ts`, `social-sign-up.service.test.ts`, `SocialSignUpCallback.test.tsx`, prueba manual.
- CA-05: una cuenta nueva entra a la app, después de completar su nombre (SCRUM-43). *Cubierto por:* `useSocialSignUpCallbackViewModel.test.ts`, `CompleteSignUp.test.tsx`, E2E-SOCIAL-05, prueba manual.
- CA-06: si la persona cancela o el proveedor falla, se muestra un error. *Cubierto por:* `social-sign-up.service.test.ts`, `SocialSignUpCallback.test.tsx`, E2E-SOCIAL-02.
- SCRUM-43 CA-01: después de un registro social nuevo se muestra el formulario con el nombre del proveedor. *Cubierto por:* `useSocialSignUpCallbackViewModel.test.ts`, `toCompleteSignUpAccount.test.ts`, `CompleteSignUp.test.tsx`, E2E-SOCIAL-04.
- SCRUM-43 CA-02: con el nombre vacío no se puede continuar y se muestra el error. *Cubierto por:* `validateSignUpName.test.ts`, `CompleteSignUp.test.tsx`, E2E-SOCIAL-04.
- SCRUM-43 CA-03: al continuar se guardan el nombre y la marca, y se entra a `/lista`. *Cubierto por:* `complete-sign-up.service.test.ts`, `CompleteSignUp.test.tsx`, E2E-SOCIAL-05, prueba manual.
- SCRUM-43 CA-04: una cuenta que ya completó el registro, o una cuenta de correo, no ve el formulario. *Cubierto por:* `toCompleteSignUpAccount.test.ts`, `CompleteSignUp.test.tsx`.
- SCRUM-43 CA-05: quien abandona el formulario, o vuelve con "atrás", y repite el registro social vuelve al formulario. *Cubierto por:* `social-sign-up.service.test.ts`, prueba manual.
- SCRUM-43 CA-06: una cuenta social que no completó el registro no ve las pantallas privadas: abrir `/lista` (o "Ir a mi lista" en la landing) lleva a `/registro/completar`. *Cubierto por:* `isSocialSignUpPending.test.ts`, `CompleteSignUpGate.test.tsx`, E2E-SOCIAL-06, prueba manual.

## 14. Casos fuera de alcance
- Bloquear en la base de datos (RLS) a una cuenta social que no completó el registro: ver §15.
- Términos y condiciones en el registro social (HU-21, SCRUM-44).
- Login con Google o Facebook desde `/login`.

## 15. Notas de implementación
- Supabase vincula automáticamente una identidad OAuth a la cuenta que ya tiene ese correo y luego inicia sesión, sin devolver error. Por eso el duplicado se detecta al volver y la vinculación se revierte con `unlinkIdentity`.
- Informar que el correo existe no lo revela a terceros, porque la persona ya se autenticó con ese correo.
- Riesgo a validar: si la cuenta manual tenía el correo sin confirmar, Supabase elimina esa identidad al vincular. La cuenta se ve como nueva y quien la creó con contraseña podría perder ese acceso.
- Al agregar login con Google o Facebook, revisar la desvinculación para no quitar identidades vinculadas a propósito.
- **SCRUM-43, alcance:** el formulario pide solo el nombre, porque es el único dato obligatorio del registro manual que un proveedor puede no entregar (el correo lo da el proveedor y una cuenta social no usa contraseña). El tercer criterio de HU-20 se cumple en la app con `CompleteSignUpGate`, en el layout de las pantallas privadas, y no con el guard de sesión: el guard está apagado salvo que `NEXT_PUBLIC_SESSION_GUARD_ENABLED` valga `true`, y su regla es no leer la sesión mientras está apagado. Es un control de interfaz: la marca vive en `user_metadata` y la persona la puede escribir con `updateUser`, y los datos los sigue protegiendo RLS. Un bloqueo en la base necesitaría guardar el estado donde la persona no lo pueda editar (`app_metadata`, desde el servidor) y revisarlo en las políticas RLS; queda pendiente.
- **SCRUM-43, a validar con cuentas reales:** Supabase podría volver a copiar los datos del proveedor en `user_metadata` en cada inicio de sesión con OAuth. Si es así, repetir el registro social con una cuenta ya completa pisaría el nombre editado en el formulario con el de Google o Facebook (la marca, que es una clave propia, se conserva). Comprobarlo en la prueba manual.
- **SCRUM-43, riesgo:** una cuenta de Google que abandonó el formulario y después intenta registrarse con Facebook y el mismo correo queda con dos identidades: ve "Ya tenés una cuenta" y se cierra la sesión. Mientras no exista el login social, solo puede completar el registro repitiéndolo con el primer proveedor.
- **SCRUM-43, sesión local y servidor:** la puerta decide con la sesión guardada en el navegador y el formulario con `getUser()`, que no actualiza esa sesión. Si el registro se completó en otro dispositivo, el formulario renueva la sesión (`refreshSession`) antes de entrar a la app; si la renovación falla, la puerta puede volver a mandar al formulario hasta que el token se renueve solo.
- **SCRUM-43, sin sesión a tiempo:** si la sesión no llega en `COMPLETE_SIGN_UP_GATE_TIMEOUT_MS` (5 s), la puerta se abre en vez de dejar la pantalla en blanco.
- **SCRUM-43, cuenta de correo reemplazada:** la puerta y el formulario deciden por `app_metadata.provider`, que es el primer proveedor de la cuenta. Una cuenta manual con el correo sin confirmar que Supabase reemplaza por Google al vincular conserva `provider: "email"`, así que no pasa por el formulario; ya tenía el nombre del registro manual.
- **SCRUM-43, solo en el navegador:** las pantallas privadas leen con la sesión del navegador. Si alguna empieza a pedir datos desde el servidor, la puerta no la protege: lo que protege los datos es RLS.
