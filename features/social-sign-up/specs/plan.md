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
