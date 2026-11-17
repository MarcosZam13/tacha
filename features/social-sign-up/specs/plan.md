# Plan: SocialSignUp

Deriva de [SPEC.md](SPEC.md).

## Archivos

- `features/social-sign-up/SocialSignUpCallback.tsx`: página de retorno, con spinner o aviso.
- `features/social-sign-up/components/SocialSignUpButtons.tsx`: botones de los proveedores.
- `features/social-sign-up/constants/social-sign-up.constants.ts`: proveedores, estados, textos y claves.
- `features/social-sign-up/hooks/`: un ViewModel para los botones y otro para la página de retorno.
- `features/social-sign-up/models/`: interfaces de ViewModels y aviso.
- `features/social-sign-up/services/social-sign-up.service.ts`: habla con Supabase Auth.
- `features/social-sign-up/utils/`: decide si la cuenta es nueva y lee el error de la URL.
- `app/registro/social/page.tsx`: ruta delgada.
- `constants/routes.constants.ts`: `AUTH_ROUTE.REGISTER` y `AUTH_ROUTE.SOCIAL_SIGN_UP`.
- `features/session-guard/constants/session-guard.constants.ts`: la ruta de retorno es pública.
- `features/registro-manual/RegistroManual.tsx`: muestra los botones.
- `e2e/features/social-sign-up/`: pruebas de punta a punta.

## Datos

Sin tablas ni migraciones. `sessionStorage` guarda que el flujo salió de este navegador y con qué proveedor. `user_metadata.social_sign_up_completed_at` guarda que la cuenta completó el registro social.

## Flujo

1. Clic en un botón → `useSocialSignUpButtonsViewModel` → `startSocialSignUp` → guarda la marca del flujo y llama a `signInWithOAuth`.
2. El proveedor autentica y vuelve a `/registro/social`; supabase-js guarda la sesión.
3. `useSocialSignUpCallbackViewModel` → `completeSocialSignUp` → revisa la marca y el error de la URL → `getUser()` → `getSocialSignUpResult`.
4. Cuenta nueva: guarda la marca de la cuenta y `router.replace(APP_ROUTE.LIST)`.
5. Correo existente: desvincula si hay otra identidad, cierra la sesión y muestra el aviso.

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Marca en `user_metadata` | Comparar fechas con un margen | La fecha obliga a adivinar un margen; la marca distingue la cuenta sin depender del tiempo |
| Desvincular con `unlinkIdentity` | Dejar la identidad vinculada | Evita que el proveedor quede como forma de entrar a una cuenta que no lo pidió |
| Desvincular después de volver | Edge Function que valida antes de crear la sesión | Mucho más código, y con Facebook no hay un camino simple |
| Página cliente de retorno | Route handler con intercambio de código | El cliente de la app guarda la sesión en el navegador; un handler de servidor exigiría otro manejo de sesión |
| `getUser()` | `getSession()` | `getUser()` valida contra el servidor; `getSession()` solo lee lo guardado en el navegador |
| Marca del flujo en `sessionStorage` | Sin marca | Sin ella, un enlace directo a la página de retorno podría cerrar una sesión válida |
| Reusar `signOutUser` | Llamar a `auth.signOut` otra vez | Ya maneja alcance local y tiempo límite |
| Promesa guardada en `useRef` | Sin ref | StrictMode corre el efecto dos veces, y la marca se consume en la primera |
| Reactivar botones en `pageshow` | Ignorarlo | Al volver con "atrás", el navegador puede restaurar la página con los botones deshabilitados |

## SCRUM-43: completar datos tras el registro social

### Archivos
- `constants/routes.constants.ts`: `AUTH_ROUTE.COMPLETE_SIGN_UP` (`/registro/completar`).
- `features/social-sign-up/constants/complete-sign-up.constants.ts`: estados, resultados, textos y errores del formulario.
- `features/social-sign-up/models/CompleteSignUpAccount.interface.ts` y `CompleteSignUpViewModel.interface.ts`.
- `features/social-sign-up/utils/toCompleteSignUpAccount.ts`: decide si la cuenta ve el formulario.
- `features/social-sign-up/utils/validateSignUpName.ts`: el nombre es obligatorio y tiene un máximo.
- `constants/user-profile.constants.ts`: `USER_NAME_MAX_LENGTH`, que pasa del perfil a constantes compartidas porque ahora lo usan dos features.
- `features/social-sign-up/services/complete-sign-up.service.ts`: lee la cuenta y guarda el nombre con la marca.
- `features/social-sign-up/services/social-sign-up.service.ts`: el retorno ya no guarda la marca.
- `features/social-sign-up/hooks/useSocialSignUpCallbackViewModel.ts`: la cuenta nueva va a `/registro/completar`.
- `features/social-sign-up/hooks/useCompleteSignUpViewModel.ts` y `CompleteSignUp.tsx`: el formulario.
- `features/social-sign-up/components/CompleteSignUpForm.tsx` y `CompleteSignUpNoAccount.tsx`: minicomponentes de presentación.
- `app/registro/completar/page.tsx`: ruta delgada.
- `features/social-sign-up/utils/isSocialSignUpPending.ts`: una cuenta social sin la marca.
- `features/social-sign-up/CompleteSignUpGate.tsx` y `hooks/useCompleteSignUpGateViewModel.ts`: la puerta de las pantallas privadas.
- `app/(app)/layout.tsx`: envuelve el shell con la puerta.
- `e2e/features/social-sign-up/complete-sign-up.*`: E2E-SOCIAL-04, 05 y 06.

### Flujo
1. `/registro/social` valida la cuenta nueva y hace `router.replace(AUTH_ROUTE.COMPLETE_SIGN_UP)`.
2. `useCompleteSignUpViewModel` → `getCompleteSignUpAccount` → `getUser()` → `toCompleteSignUpAccount`.
3. Pendiente: formulario con el nombre del proveedor. Completa o cuenta de correo: `router.replace(APP_ROUTE.LIST)`.
4. "Continuar" → `validateSignUpName` → `saveCompletedSignUp` (`updateUser` con nombre y marca) → `router.replace(APP_ROUTE.LIST)`.
5. Pantalla privada → `CompleteSignUpGate` → `useCompleteSignUpGateViewModel` → sesión local (`onAuthStateChange`) → `isSocialSignUpPending` → si está pendiente, `router.replace(AUTH_ROUTE.COMPLETE_SIGN_UP)`; si no, la pantalla.
6. Si el formulario ve con `getUser()` una cuenta que ya no tiene nada que completar, renueva la sesión (`refreshSession`) antes de entrar: así la puerta, que lee la sesión local, no la vuelve a mandar al formulario.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Pedir solo el nombre | Pedir más datos | Es el único dato obligatorio del registro que el proveedor puede no entregar |
| Mostrar siempre el formulario, con el nombre escrito | Mostrarlo solo si falta el nombre | Un solo camino para todas las cuentas sociales, y HU-21 agrega los términos en esta misma pantalla |
| Guardar la marca al enviar el formulario | Guardarla al volver del proveedor | Quien abandona el formulario no queda marcado como completo y vuelve a él |
| Guardar nombre y marca en un solo `updateUser` | Dos llamadas | Si falla, no queda una cuenta con nombre y sin marca, ni al revés |
| Validación propia del nombre, con el máximo compartido `USER_NAME_MAX_LENGTH` | Importar la validación del registro manual o del perfil | Son pocas líneas con sus propios mensajes; el máximo sí se comparte, para que el perfil acepte después el nombre guardado acá |
| `/registro/completar` no es pública | Agregarla a `PUBLIC_ROUTES` | Necesita una sesión; sin ella, el guard envía al login como en cualquier pantalla privada |
| Puerta propia en `app/(app)/layout.tsx` | Ampliar el guard de sesión | El guard está apagado por defecto y su SPEC pide que apagado no lea la sesión (caso 12); la puerta funciona siempre, solo envuelve las pantallas privadas y `/registro/completar` queda fuera del grupo, así que la puerta no se envuelve a sí misma. El único bucle posible (sesión local vieja frente a `getUser()`) se corta renovando la sesión |
| La navbar de la landing sigue mostrando "Ir a mi lista" | Cambiarla a "Completar registro" | La puerta ya lleva al formulario desde `/lista`; cambiar la navbar chocaría con el PR de SCRUM-159, que edita el mismo ViewModel |
| Spinner mientras llega la sesión | Mostrar el contenido y redirigir después | Una cuenta incompleta no debe ver la pantalla privada ni un instante; para el resto, la sesión local llega en milisegundos |
| Tope de 5 s (`COMPLETE_SIGN_UP_GATE_TIMEOUT_MS`) para abrir la puerta si la sesión no llega | Esperar sin límite | Si la renovación del token se cuelga, la pantalla quedaría en blanco; abrir de más no expone datos porque RLS los protege |
| `isSocialSignUpPending` exige correo | Mirar solo proveedor y marca | Una cuenta sin correo iría a un formulario que no la acepta y quedaría sin salida |
