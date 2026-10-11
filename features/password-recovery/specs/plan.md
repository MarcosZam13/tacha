# Plan técnico: recuperación de contraseña

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

## SCRUM-51: recuperación de contraseña

### Archivos

```
features/password-recovery/
  ForgotPassword.tsx                       entrada ("use client"): formulario o confirmación (solo presentación)
  components/
    ForgotPasswordForm.tsx                 título, campo de correo, botón y enlace al login
    ForgotPasswordSent.tsx                 confirmación genérica y los dos enlaces
    models/  ForgotPasswordFormProps.interface.ts · ForgotPasswordSentProps.interface.ts
  hooks/
    useForgotPasswordViewModel.ts          valor, validación derivada, estado del envío
    useFocusHeadingOnMount.ts              ref de un título que recibe el foco al montarse (copia de la del login)
  models/
    ForgotPasswordViewModel.interface.ts
  services/
    password-recovery.service.ts           requestPasswordReset(email): devuelve un resultado, no lanza
  utils/
    validateForgotPasswordEmail.ts         función pura: correo → mensaje de error o nada
  constants/
    password-recovery.constants.ts         textos, estados, resultados, código de Supabase
  tests/
    validateForgotPasswordEmail.test.ts · password-recovery.service.test.ts · useForgotPasswordViewModel.test.ts
    ForgotPasswordForm.test.tsx · ForgotPasswordSent.test.tsx · ForgotPassword.page.ts
  specs/  SPEC.md · plan.md · tasks.md

app/recuperar-contrasena/page.tsx          solo la ruta (metadata + <ForgotPassword />)
constants/routes.constants.ts              + AUTH_ROUTE (login, recuperar, actualizar contraseña)
features/login/components/LoginForm.tsx    + enlace "¿Olvidaste tu contraseña?"
features/session-guard/constants/session-guard.constants.ts   + /recuperar-contrasena en PUBLIC_ROUTES
```

### Datos

Sin tablas, RLS, RPC ni Edge Functions: no hay migración. Hay configuración manual en el dashboard de Supabase (Redirect URLs y plantilla del correo).

### Flujo

Toco "¿Olvidaste tu contraseña?" en `LoginForm` → `/recuperar-contrasena` → `ForgotPassword.tsx` con `useForgotPasswordViewModel`. Escribo el correo: `handleChange` actualiza el valor y `validateForgotPasswordEmail` se recalcula en cada render. Envío: `handleSubmit` valida de nuevo, pasa a `submitting` y llama a `requestPasswordReset(email)` (`password-recovery.service.ts`), que llama a `auth.resetPasswordForEmail(email, { redirectTo })` y traduce la respuesta a `sent` o `error`. `sent` → `ForgotPasswordSent`.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| `features/password-recovery/` para HU-28 y HU-29 | Dentro de `features/login/` o una feature por historia | Son un solo flujo (pedir el correo, fijar la nueva contraseña) y un mismo epic de Jira, distinto de "Login". `login/` ya tiene ~50 archivos |
| Misma confirmación exista o no la cuenta | Decir "correo no encontrado" | Lo exige el criterio y es seguridad: si la pantalla distingue, cualquiera puede listar quién tiene cuenta |
| El límite de envíos se muestra como confirmación genérica | Mensaje propio "esperá un momento" | Supabase limita cada cuenta a 1 correo por minuto; solo una cuenta existente produce ese límite, así que un mensaje propio revelaría que la cuenta existe con pedir dos veces seguidas. Costo: con el tope global agotado, la persona espera un correo que no llega |
| El servicio devuelve un resultado y no lanza | `try/catch` en el ViewModel | Mismo patrón que `updateUserPassword` y `login.service`: el que llama decide qué mostrar |
| Errores derivados en cada render | Guardarlos en estado | Cambian solos al escribir; un estado se desincroniza (patrón del login) |
| Estado como unión `idle \| submitting \| sent \| error` | Booleanos `isSending` e `isSent` | Dos booleanos admiten "enviando y enviado a la vez" |
| `redirectTo` con `window.location.origin` | Variable de entorno con el dominio | Funciona igual en local y desplegado sin configurar nada más, y el origen no sale de la URL de la página |
| Rutas en `constants/routes.constants.ts` (`AUTH_ROUTE`) | Texto suelto en cada archivo o constantes en la feature | Las usan tres lugares: el enlace del login, el guard y esta feature; importar de la feature desde `login/` los amarraría |
| Sin reCAPTCHA | Agregarlo como en el login | No está en los criterios y suma una Edge Function. El límite de Supabase cubre el abuso básico |
| Ruta `/recuperar-contrasena` en español | `/forgot-password` | Coherente con `/registro`, `/terminos`, `/nosotros` |
| Foco al título de la confirmación (`useFocusHeadingOnMount` propio) | Importar `FocusedHeading` del login, o promoverlo a `components/` | Importar de otra feature está prohibido y promoverlo tocaría SCRUM-45 a 48. Costo: ~10 líneas duplicadas; se unifican al tocar el login |
| Los errores 5xx de Supabase se muestran como confirmación | Mostrarlos como error | Supabase solo intenta mandar el correo si la cuenta existe, así que un fallo del envío solo pasa con cuentas reales y delataría cuáles. Costo: con el servicio caído la persona ve "enviado" y espera un correo que no llega |
| "Usar otro correo" en la confirmación | Un temporizador de reenvío | Un temporizador es un estado y un efecto más; el límite lo aplica Supabase |

### Conceptos nuevos

- **Respuesta genérica** y enumeración de usuarios (por qué importa, y cómo un límite de envíos puede delatar una cuenta).
- **`resetPasswordForEmail`** y la lista de Redirect URLs del proyecto.
- **Flujo implícito** de Supabase: el token llega en el fragmento `#` de la URL.
- **Resultado en vez de excepción** en un servicio.

### Puesta en marcha

1. Dashboard de Supabase → Authentication → URL Configuration: agregar `http://localhost:3000/actualizar-contrasena` (y la URL desplegada) a Redirect URLs.
2. No tocar la plantilla del correo: sin un SMTP propio Supabase no deja editarla y usa la predeterminada, que ya trae el enlace.
3. Probar con el correo de un miembro de la organización de Supabase (el SMTP por defecto no entrega a otros) y con uno inexistente, y pedir cada uno dos veces seguidas.
4. Antes de usarlo con usuarios reales: configurar un SMTP propio en Supabase (Authentication → SMTP Settings). Con el SMTP por defecto solo reciben el correo los miembros de la organización (verificado).

## SCRUM-52: vista de actualización de contraseña

### Archivos

**Parte 1: promover lo que comparten el login y esta feature** (segundo consumidor, `project-structure`). Es un movimiento sin cambio de comportamiento, con `git mv` donde se pueda; el login solo cambia sus imports. La lista exacta se fija al leer los imports reales.

```
components/password-input/            PasswordInput, EyeIcon y su ViewModel (hoy en features/login/components y hooks)
constants/password.constants.ts       + INPUT_TYPE, PASSWORD_TOGGLE_LABEL, AUTOCOMPLETE y las constantes de campos, mensajes y resultados del cambio de contraseña
utils/validateNewPasswordForm.ts      (antes features/login/utils/validateChangePasswordForm.ts) y sus tipos de valores y errores
services/password.service.ts          updateUserPassword (antes features/login/services/password.service.ts)
features/login/                       importa de lo anterior; las pruebas del login siguen pasando sin cambios
```

**Parte 2: la vista de actualización**

```
features/password-recovery/
  ResetPassword.tsx                     entrada ("use client"): elige qué mostrar según el estado (solo presentación)
  components/
    ResetPasswordForm.tsx               nueva + repetir (PasswordInput), medidor, error general, guardar
    ResetPasswordInvalid.tsx            "enlace no válido" y "Pedir un enlace nuevo"
    ResetPasswordDone.tsx               confirmación y botón "Iniciar sesión"
    models/                             props de los componentes
  hooks/
    useResetPasswordViewModel.ts        estado, valores, validación derivada, guardado, redirección
  services/
    password-recovery.service.ts        + subscribeToRecoveryEvents(): eventos de sesión (INITIAL_SESSION, PASSWORD_RECOVERY)
  utils/
    getRecoveryLinkStatus.ts            función pura: fragmento de la URL → recovery | error | none
  constants/
    password-recovery.constants.ts      + textos, estados y parámetros de la vista de actualización
  models/                               ResetPasswordViewModel
  tests/                                getRecoveryLinkStatus, el ViewModel, los componentes y el servicio
  specs/  SPEC.md · plan.md · tasks.md · E2E.md

app/actualizar-contrasena/page.tsx      solo la ruta
services/session.service.ts             + signOutEverywhere() (alcance global)
features/session-guard/constants/session-guard.constants.ts   + /actualizar-contrasena en PUBLIC_ROUTES
```

### Datos

Sin tablas, RLS, RPC ni Edge Functions: no hay migración. El plazo del enlace lo fija Supabase (Authentication → Email OTP Expiration).

### Flujo

Abro el enlace del correo → Supabase redirige a `/actualizar-contrasena#access_token=...&type=recovery` → `ResetPassword.tsx` con `useResetPasswordViewModel`. Al montar, `getRecoveryLinkStatus(window.location.hash)` lee el fragmento antes de que el cliente de Supabase lo procese (el efecto de la página corre antes que el del guard, que es quien crea el cliente): `none` o `error` → estado `invalid`. Con `recovery` el estado sigue en `verifying` y el hook se suscribe a los eventos de sesión: `PASSWORD_RECOVERY` → `ready`; `INITIAL_SESSION` con el fragmento todavía en la URL → `invalid` (Supabase solo lo borra cuando acepta el enlace). Escribo la contraseña: `validateNewPasswordForm` y `evaluatePasswordStrength` se recalculan en cada render. Guardo: `updateUserPassword` → éxito → `signOutEverywhere()` → estado `done`; un efecto programa `router.replace("/login")` a los 3 segundos y el botón "Iniciar sesión" lo hace de inmediato.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Leer el fragmento de la URL al montar | Preguntarle a Supabase si hay sesión | Con un enlace vencido supabase-js no emite ningún evento y el error solo está en la URL. Y una sesión ya iniciada no prueba que haya enlace |
| `ready` solo con `PASSWORD_RECOVERY`, o con `INITIAL_SESSION` si el fragmento ya se borró | `ready` con cualquier sesión | Una persona con sesión iniciada que abre un enlace roto recibe su sesión vieja en `INITIAL_SESSION`: tomarla por la de recuperación dejaría cambiar la contraseña con un enlace inválido |
| Un mensaje único para vencido, usado e inexistente | Mensajes distintos | Supabase da el mismo error en los tres (`otp_expired`) y distinguirlos no cambia lo que la persona puede hacer: pedir otro enlace |
| Cierre global tras guardar (`signOutEverywhere`) | Solo el local, o no cerrar | Cambiar la contraseña no cierra las sesiones que otra persona tenga abiertas; quien recupera puede haber perdido la cuenta. Costo: cierra también los demás dispositivos |
| Redirección a los 3 s **y** botón inmediato | Solo temporizador, o solo botón | El criterio pide que se redirija; un temporizador sin salida no deja leer a quien necesita más tiempo (WCAG 2.2.1) |
| Promover `PasswordInput`, la validación y el servicio a carpetas compartidas | Importar de `features/login/`, o copiarlos | Una feature no importa de otra, y copiar ~150 líneas obliga a mantener dos validaciones de contraseña que tienen que coincidir. Es la regla de SCRUM-48 (promover al segundo consumidor) |
| Promover en una tarea aparte, sin cambiar el login | Aprovechar para refactorizar | Si el login cambia de comportamiento junto con la mudanza, no se sabe si un fallo es de una cosa o de la otra |
| ViewModel propio (`useResetPasswordViewModel`) | Reusar `useChangePasswordViewModel` del login | El del login tiene los pasos `notice \| form \| saving \| done` de otra pantalla y llama al servicio con la sesión del login; este tiene `verifying` e `invalid` y la redirección |
| Estado como unión `verifying \| ready \| invalid \| saving \| done` | Booleanos sueltos | Evita "verificando y válido a la vez" |
| Reutilizar los textos de validación del cambio de contraseña del login | Mensajes nuevos | La regla es la misma que el registro y el login: tres mensajes distintos para lo mismo confunden |
| Sin pedir la contraseña actual | Pedirla | Quien recupera la contraseña no la tiene: es el punto de la recuperación |

### Conceptos nuevos

- **Flujo implícito de Supabase:** el token llega en el fragmento `#` y supabase-js lo procesa y lo borra al cargar la página.
- **Eventos de sesión** `INITIAL_SESSION` y `PASSWORD_RECOVERY`, y por qué el primero no prueba que hubo enlace.
- **Orden de los efectos** en React (los hijos corren antes que los padres) y por qué importa para leer la URL antes de crear el cliente de Supabase.
- **Cierre de sesión global** frente al local.
- **Temporizador con salida** (WCAG 2.2.1) y su limpieza en un efecto.
