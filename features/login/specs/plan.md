# Plan técnico: login

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

## SCRUM-45: login con reCAPTCHA

### Archivos

```
features/login/
  Login.tsx                          entrada ("use client"): formulario (solo presentación)
  components/
    RecaptchaWidget.tsx              contenedor donde Google dibuja la casilla
  hooks/
    useLoginViewModel.ts             estado del formulario, handlers, envío y reinicio del widget
    useRecaptchaWidgetViewModel.ts   carga el script de Google, dibuja el widget, entrega el token
  models/
    EyeIconProps.interface.ts
    LoginFormValues.interface.ts     valores y errores del formulario
    LoginViewModel.interface.ts      lo que devuelve el hook
    LoginParams.interface.ts         parámetros del servicio
    LoginFunctionResponse.interface.ts   forma de la respuesta de la Edge Function (sesión y error)
    RecaptchaWidgetProps.interface.ts    props del widget (también los parámetros de su hook)
    RecaptchaWidgetViewModel.interface.ts  lo que devuelve el hook del widget
    RecaptchaWindow.interface.ts     tipo de window.grecaptcha, para no usar `any`
  services/
    login.service.ts                 loginWithRecaptcha(): invoca la Edge Function y guarda la sesión
  utils/
    validateLoginForm.ts             validación pura por campo
  constants/
    login.constants.ts               campos, textos, mensajes, rutas, resultados, estados, datos del widget
  specs/  SPEC.md · plan.md · tasks.md

supabase/functions/login-with-recaptcha/index.ts   verifica el token con Google y hace signInWithPassword
app/login/page.tsx                   ruta delgada: solo renderiza <Login />
.env.example                         + NEXT_PUBLIC_RECAPTCHA_SITE_KEY
supabase/README.md                   + la función y su secret
.gitignore                           + supabase/.temp/ (lo crea `supabase link`)
constants/email.constants.ts         EMAIL_PATTERN, compartido con registro-manual (+ barrel constants/index.ts)
utils/email.utils.ts                 normalizeEmail, compartido con registro-manual
```

### Datos

Sin tablas ni RLS nuevas. Secret de Supabase: `RECAPTCHA_SECRET_KEY`. `SUPABASE_URL` y `SUPABASE_ANON_KEY` las inyecta Supabase en las Edge Functions.

### Flujo

Completo la casilla → callback de Google en `useRecaptchaWidgetViewModel` → `setCaptchaToken` en `useLoginViewModel` → se habilita el botón → submit → `validateLoginForm` → `loginWithRecaptcha` (`login.service.ts`) → `functions.invoke("login-with-recaptcha")` → la función pide a Google la verificación → `signInWithPassword` → vuelve la sesión → `auth.setSession` → el ViewModel cambia a `success` y navega. Si algo falla: el resultado se traduce a un mensaje con un mapa de constantes y el widget se reinicia.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Edge Function que verifica y autentica | Verificar el captcha en el cliente | El cliente se puede manipular: si la verificación corre en el navegador, un script salta el captcha sin resolverlo |
| La función también hace `signInWithPassword` | Función solo verifica y el cliente autentica después | Con dos pasos el cliente puede llamar al segundo sin pasar por el primero; en uno solo, la ruta normal exige el token |
| Script de Google con hook propio | `react-google-recaptcha` | Una dependencia más para cargar un script y un callback; AGENTS.md pide no agregar librerías para algo chico |
| reCAPTCHA v2 casilla | v3 invisible con puntaje | La historia pide "completar" el reCAPTCHA y mostrar error si falla; v3 no tiene paso visible ni forma de "fallar" para el usuario |
| Resultado como unión de constantes, sin lanzar | Lanzar excepciones | Mismo patrón que `registerUser`; el ViewModel decide el mensaje con un mapa, sin `try/catch` disperso |
| Validación reusa patrón del registro | Copiar la regex | Una sola fuente del formato de correo; si cambia, cambia en los dos |
| Claves de prueba de Google por ahora | Esperar las reales | Sin claves reales no se puede probar nada; cambiarlas es solo variables de entorno |
| Redirección a la ruta principal definida en constante | `"/"` escrito en el hook | La ruta real puede cambiar; una constante se corrige en un solo lugar |
| Los fallos de credenciales salen como `invalid_credentials` (401), salvo `email_not_confirmed` | Reenviar siempre el `error.code` de Supabase | Un usuario con la contraseña correcta que no verificó el correo no debe ver "contraseña incorrecta" (pedido de QA). El costo: un llamador directo aprende que esa contraseña era válida; es inherente a que HU-24 pida un mensaje de cuenta no verificada. El resto de los códigos (cuenta bloqueada) se abre en SCRUM-47 |
| El límite de intentos de Supabase sale como `rate_limited` (429), con su propio mensaje | Tratarlo como credenciales malas o como error inesperado | Es otro problema: el usuario debe esperar, no corregir la contraseña |
| `EMAIL_PATTERN` y `normalizeEmail` en `constants/` y `utils/` | Importarlos desde `registro-manual` | Login es el segundo consumidor real; una feature no debe depender de las constantes internas de otra (project-structure) |
| Sin secret la función responde `server_misconfigured` (500) | Mandar `secret=""` a Google | Un secret faltante es un error nuestro; mostrarlo como "captcha inválido" esconde la causa |
| Timeout de 5 s al llamar a Google | `fetch` sin límite | Si Google se cuelga, la petición ocuparía recursos hasta el tope de la plataforma; sigue siendo fail-closed |

### Despliegue (manual, una vez)

1. Dashboard de Supabase → Edge Functions → Secrets: `RECAPTCHA_SECRET_KEY`.
2. Desplegar con la CLI: `supabase login`, `supabase link --project-ref <ref>` y `supabase functions deploy login-with-recaptcha --use-api`. El editor del dashboard no sirve: le pone un slug autogenerado a la función y no resuelve el import de `_shared/`.
3. `.env.local`: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (y reiniciar `npm run dev`).

### Antes de producción

- Reemplazar las claves de prueba de Google por las reales (site key y secret). Con la secret de prueba la verificación acepta cualquier token y el captcha no protege nada.
- Revisar el rate limit de Supabase Auth (Authentication → Rate Limits): es el único freno de fuerza bruta contra el endpoint de Auth directo.
- CORS de las Edge Functions está en `*` (`supabase/functions/_shared/http.ts`, compartido con las de ingesta); restringirlo al dominio de la app cuando exista.

## SCRUM-46: mostrar u ocultar la contraseña

### Archivos

```
features/login/
  Login.tsx                          + usa PasswordInput para el campo de contraseña e Input para el resto
  components/
    PasswordInput.tsx                campo de contraseña con botón de visibilidad (solo presentación)
    EyeIcon.tsx                      SVG del ojo, con o sin tachado
  hooks/
    usePasswordInputViewModel.ts     id del campo, visibilidad, tipo del input derivado y toggle
  models/
    PasswordInputProps.interface.ts        props del campo
    PasswordInputViewModel.interface.ts    lo que devuelve el hook
  constants/
    login.constants.ts               + INPUT_TYPE, PASSWORD_TOGGLE_LABEL; LOGIN_FORM_FIELDS usa INPUT_TYPE
```

No se toca `components/ui/` ni ningún archivo fuera de `features/login/`. Sin datos nuevos: no hay tablas, RPC ni cambios en la Edge Function.

### Flujo

Clic en el ojo → `onClick` de `PasswordInput.tsx` → `toggleVisibility` en `usePasswordInputViewModel.ts` → cambia `isVisible` → el hook recalcula `inputType` (`text` o `password`) y `PasswordInput` re-renderiza con otro `type`, otro ícono y otro `aria-label`. El valor sigue en el estado de `useLoginViewModel` (`values.password`), que el toggle nunca toca.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| `PasswordInput` local de la feature, sin tocar `Input` | Agregar un prop `trailingAction` a `Input` | `Input` lo usan otras pantallas; cambiar su estructura (hoy un `<label>` que envuelve todo) arriesga romper el trabajo de los demás por una historia de login |
| Componente local, no en `components/ui/` | Crearlo directo como primitivo compartido | Con un solo consumidor no hay segundo uso que justifique el costo de mantenerlo compartido; se promueve cuando el registro lo pida |
| Botón fuera del `<label>`, con `<label htmlFor>` y `useId` | Botón dentro del label, como hace `Input` | Un botón dentro de un `<label>` es HTML inválido, y el clic en el ojo podría enfocar el input |
| Estado de visibilidad dentro de `PasswordInput` (su propio hook) | Subirlo a `useLoginViewModel` | Solo afecta a este campo; subirlo obliga al ViewModel del formulario a conocer un detalle visual |
| `inputType` derivado de `isVisible` | Guardarlo en un segundo `useState` | Dos estados que deben ir juntos pueden contradecirse; uno derivado no |
| `aria-label` que cambia ("Mostrar" / "Ocultar"), sin `aria-pressed` | `aria-pressed` con etiqueta fija | Con las dos cosas el lector de pantalla anuncia algo contradictorio; la etiqueta que describe la acción es la más clara |
| SVG en línea para el ojo | Librería de íconos | Son dos dibujos; instalar una dependencia por eso es el patrón que AGENTS.md pide evitar |
| `type="button"` en el ojo | Dejar el tipo por defecto | Dentro de un `<form>` el tipo por defecto es `submit`: pulsar el ojo enviaría el formulario |
| Visibilidad no persiste | Guardarla en `localStorage` | La contraseña visible por defecto en la siguiente visita sería un riesgo de seguridad (hombro, pantalla compartida) sin ningún beneficio |

## SCRUM-47: mensajes de error en el login

### Archivos

```
features/login/
  constants/login.constants.ts       + ACCOUNT_BLOCKED en LOGIN_ERROR_MESSAGE, LOGIN_RESULT y LOGIN_API_CODE; entradas nuevas en los dos mapas
supabase/functions/login-with-recaptcha/index.ts   reenvía `user_banned` además de `email_not_confirmed`
features/login/specs/  SPEC.md · plan.md · tasks.md   casos 16 a 21
```

Sin archivos nuevos, sin tablas, sin cambios en `login.service.ts`, el ViewModel ni `Login.tsx`: el servicio traduce los códigos con `LOGIN_API_CODE_RESULT` y el ViewModel muestra el mensaje con `LOGIN_RESULT_MESSAGE`. Agregar un caso es solo agregar una entrada a los mapas. Eso es lo que se quiere demostrar.

### Flujo

Intento con una cuenta bloqueada → `signInWithPassword` en la Edge Function devuelve `error.code === "user_banned"` → la función lo reenvía en `401 { code: "user_banned" }` → `readErrorCode` en `login.service.ts` lo lee → `LOGIN_API_CODE_RESULT` lo traduce a `LOGIN_RESULT.ACCOUNT_BLOCKED` → `useLoginViewModel` busca el texto en `LOGIN_RESULT_MESSAGE` y lo guarda como `submitError` → `Login.tsx` lo pinta con `role="alert"`. El formulario sigue editable y el widget se reinicia, como en cualquier otro error.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| La función reenvía una lista corta de códigos de Supabase (`email_not_confirmed`, `user_banned`) y colapsa el resto a `invalid_credentials` | Reenviar todo `error.code` | Lo que no es una causa que el usuario pueda entender o resolver no debe filtrarse (mensajes internos, códigos de infraestructura); una lista cerrada también evita que un código nuevo de Supabase cambie lo que ve el usuario sin que nadie lo decida |
| Mapas de constantes `LOGIN_API_CODE_RESULT` y `LOGIN_RESULT_MESSAGE` | `switch` en el servicio o el ViewModel | Con `Record<LoginResultType, ...>` TypeScript no compila si se agrega un resultado sin su mensaje; con un `switch` se olvida en silencio |
| Código desconocido se muestra como error inesperado | Tratarlo como credenciales incorrectas | Decirle al usuario "contraseña incorrecta" cuando el problema es otro lo manda a cambiar una contraseña que está bien |
| Un solo mensaje para correo inexistente y contraseña incorrecta | Mensajes separados | Dos mensajes distintos revelan qué correos tienen cuenta; con uno solo el atacante no aprende nada |
| Se reenvía `user_banned` aunque Supabase lo devuelva con cualquier contraseña (limitación aceptada, SPEC §15) | Dejar de reenviarlo y mostrar el genérico a los baneados | Supabase comprueba el ban antes de la contraseña, así que quien llame directo a Auth lo ve igual: ocultarlo en la función no cierra la fuga y sí incumple el criterio de cuenta bloqueada de la HU-24. Afecta solo a cuentas baneadas a mano |
| "Cuenta inactiva" fuera de alcance | Inventar un estado de inactividad | Supabase Auth no lo tiene; modelarlo exige una tabla de perfil con estado de cuenta, que es una decisión de producto (documento del proyecto) y no de esta historia |
| Los mensajes solo informan, sin enlaces de reenvío ni soporte | Botón "reenviar correo" en el login | La HU-24 pide explicar por qué falló el login; el reenvío ya existe en `/registro` y agregarlo acá amplía el alcance |
| Texto de cuenta bloqueada sin canal de contacto específico | Poner un correo o enlace de soporte | No existe todavía un canal de soporte definido (hoy solo hay el Instagram del pie de página); inventar uno sería contenido falso |
