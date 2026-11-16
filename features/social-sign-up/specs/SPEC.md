# Feature: SocialSignUp

Historia: HU-19 (SCRUM-42). Criterios en [docs/historias-usuario.md](../../../docs/historias-usuario.md).

## 1. Objetivo
Permitir que un visitante cree su cuenta con Google o Facebook, sin llenar el formulario de registro manual.

## 2. Alcance
Incluye:
- Botones "Registrarse con Google" y "Registrarse con Facebook" en `/registro`.
- Redirección al flujo OAuth del proveedor elegido.
- Página de retorno `/registro/social`, que obtiene y valida al usuario contra Supabase Auth.
- Aviso con enlace al login cuando el correo ya está registrado.

No incluye: ver §14.

## 3. Entradas
- provider: `SocialProviderType` (`google` | `facebook`), al tocar un botón.
- Parámetros `error` de la URL de retorno (query o fragmento).
- Usuario devuelto por `auth.getUser()`: `email`, `identities`, `is_anonymous`, `user_metadata`.

## 4. Salidas
- Redirección al proveedor.
- Cuenta nueva: guarda la marca de registro completado y redirige a `APP_ROUTE.LIST`.
- Correo ya registrado: desvincula la identidad nueva si la cuenta tiene otra, cierra la sesión y muestra el aviso.
- Error: muestra el mensaje con su enlace y cierra la sesión si el flujo creó una.

## 5. Reglas de negocio
- El usuario se valida con `getUser()` (consulta al servidor), no con datos leídos de la URL.
- Sin correo no hay registro: se trata como error y se cierra la sesión.
- Un nombre faltante no bloquea: pedirlo es HU-20 (SCRUM-43).
- El correo ya existe si el usuario tiene más de una identidad o ya tiene la marca `social_sign_up_completed_at`.
- La marca solo decide qué aviso se muestra; nunca da permisos, porque la persona puede editar `user_metadata`.
- La página de retorno solo evalúa si este navegador inició el flujo desde los botones. Así, abrir `/registro/social` directo no cierra una sesión válida.
- Una sesión anónima nunca cuenta como registro y no se cierra.

## 6. Estados
`SOCIAL_SIGN_UP_STATUS`: `checking`, `success`, `email-exists`, `error`.

## 7. Errores
| Error | Se muestra |
|---|---|
| El proveedor no puede iniciar el flujo | Mensaje debajo de los botones, que se vuelven a habilitar |
| La persona cancela, el proveedor falla, no entrega correo o no se puede guardar la marca | "No pudimos completar el registro", con enlace a `/registro` |
| Página abierta sin haber iniciado el flujo | El mismo mensaje de error |
| Correo ya registrado | "Ya tenés una cuenta", con enlace a `/login` |

## 8. UI esperada
- Dos botones secundarios debajo del formulario de registro.
- Spinner en la página de retorno mientras se valida.
- Título, mensaje y enlace cuando hay aviso.

## 9. Accesibilidad
- Botones nativos con texto claro, operables con teclado.
- Errores con `role="alert"`; el spinner tiene `role="status"` y etiqueta.

## 10. Restricciones técnicas
- TypeScript estricto, sin `any`; sin librerías nuevas.
- Lógica en ViewModels y textos en constantes.
- Los secrets de OAuth viven solo en Supabase, nunca en `.env*` ni con prefijo `NEXT_PUBLIC_`.

## 11. Dependencias
- `services/supabase.client.ts`, `services/session.service.ts`
- `constants/routes.constants.ts`
- `@/components/ui` (Button, Spinner)
- `features/session-guard` (ruta pública) y `features/registro-manual` (muestra los botones)

## 12. Contratos externos
- `supabase.auth.signInWithOAuth`, `getUser`, `updateUser` y `unlinkIdentity`.
- Google y Facebook habilitados en Authentication > Providers; `/registro/social` en las Redirect URLs de cada ambiente.
- Manual Linking activo solo si `unlinkIdentity` lo requiere.
- Sin tablas, RPC ni migraciones.

## 13. Casos de aceptación
- CA-01: se muestran los botones de Google y Facebook. *Cubierto por:* `SocialSignUpButtons.test.tsx`, E2E-SOCIAL-01.
- CA-02: cada botón redirige al flujo OAuth de su proveedor. *Cubierto por:* `social-sign-up.service.test.ts`, E2E-SOCIAL-02.
- CA-03: se obtiene y valida el usuario; sin correo, el registro no se completa. *Cubierto por:* `getSocialSignUpResult.test.ts`, `social-sign-up.service.test.ts`, prueba manual.
- CA-04: si el correo ya está registrado, se informa y se sugiere iniciar sesión. *Cubierto por:* `getSocialSignUpResult.test.ts`, `social-sign-up.service.test.ts`, `SocialSignUpCallback.test.tsx`, prueba manual.
- CA-05: una cuenta nueva entra a la app. *Cubierto por:* `useSocialSignUpCallbackViewModel.test.ts`, prueba manual.
- CA-06: si la persona cancela o el proveedor falla, se muestra un error. *Cubierto por:* `social-sign-up.service.test.ts`, `SocialSignUpCallback.test.tsx`, E2E-SOCIAL-02.

## 14. Casos fuera de alcance
- Completar datos faltantes (HU-20, SCRUM-43).
- Términos y condiciones en el registro social (HU-21, SCRUM-44).
- Login con Google o Facebook desde `/login`.

## 15. Notas de implementación
- Supabase vincula automáticamente una identidad OAuth a la cuenta que ya tiene ese correo y luego inicia sesión, sin devolver error. Por eso el duplicado se detecta al volver y la vinculación se revierte con `unlinkIdentity`.
- Informar que el correo existe no lo revela a terceros, porque la persona ya se autenticó con ese correo.
- Riesgo a validar: si la cuenta manual tenía el correo sin confirmar, Supabase elimina esa identidad al vincular. La cuenta se ve como nueva y quien la creó con contraseña podría perder ese acceso.
- Al agregar login con Google o Facebook, revisar la desvinculación para no quitar identidades vinculadas a propósito.
