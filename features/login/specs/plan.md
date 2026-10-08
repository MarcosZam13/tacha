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

## SCRUM-48: aviso de contraseña débil en el login

### Archivos

**Parte 1: promover a la raíz el código de fortaleza de contraseña** (login es el segundo consumidor, `project-structure`). Es un movimiento sin cambio de comportamiento; `registro-manual` solo cambia sus imports.

```
constants/password.constants.ts       PASSWORD_RULE(S), PASSWORD_PATTERN, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENT_MESSAGE,
                                      PASSWORD_STRENGTH_LEVEL/THRESHOLD/LABEL y PASSWORD_LABEL (+ barrel constants/index.ts)
types/password.types.ts               PasswordStrength
utils/password.utils.ts               evaluatePasswordStrength
components/password-strength-meter/
  PasswordStrengthMeter.tsx           el medidor de la barra (solo presentación)
  models/PasswordStrengthMeterProps.interface.ts

features/registro-manual/             se borran sus copias y se actualizan los imports de:
  constants/registro.constants.ts · utils/validateRegistroForm.ts · hooks/useRegistroManualViewModel.ts
  models/RegistroManualViewModel.interface.ts · RegistroManual.tsx
```

**Parte 2: el aviso y el cambio de contraseña en el login**

```
features/login/
  Login.tsx                            elige entre LoginForm y WeakPasswordFlow según la fase (solo presentación)
  components/
    WeakPasswordFlow.tsx               decide entre aviso, formulario y confirmación según el estado (solo presentación)
    WeakPasswordNotice.tsx             título, explicación y los botones "Cambiar contraseña" / "Ahora no"
    ChangePasswordForm.tsx             nueva + repetir (con PasswordInput), medidor, guardar y volver
    PasswordChangedNotice.tsx          confirmación con "Continuar"
    FocusedHeading.tsx                 título que recibe el foco al aparecer (lo usan los tres pasos)
    LoginForm.tsx                      formulario de inicio de sesión (extraído de Login.tsx)
    models/                            props de los minis componentes (WeakPasswordFlow, WeakPasswordNotice,
                                       PasswordChangedNotice, ChangePasswordForm, FocusedHeading, LoginForm)
  hooks/
    useLoginViewModel.ts               + usa getStatusAfterLogin, limpia la contraseña y expone isWeakPassword / handleContinue
    useChangePasswordViewModel.ts      estado del cambio (notice | form | saving | done), valores, errores y envío
    useFocusHeadingOnMount.ts          ref de un título que recibe el foco al montarse (accesibilidad)
  models/
    ChangePasswordFormValues.interface.ts · ChangePasswordViewModel.interface.ts
  services/
    password.service.ts                updateUserPassword(): auth.updateUser, devuelve un resultado
  utils/
    validateChangePasswordForm.ts      validación pura: obligatoria, largo, coincidencia y nivel mínimo
    getStatusAfterLogin.ts             resultado del login + contraseña → estado (error, éxito o contraseña débil)
  constants/
    login.constants.ts                 + textos, mensajes, resultados, estados y códigos de error de Supabase
```

Sin tablas, RLS, RPC ni Edge Functions nuevas.

### Flujo

Escribo una contraseña débil e inicio sesión → `submitLogin` en `useLoginViewModel.ts` recibe `SUCCESS` del servicio → `getStatusAfterLogin` evalúa `values.password` con `evaluatePasswordStrength` (`utils/password.utils.ts`) → nivel débil → fase `weak-password` (y la contraseña escrita se borra del estado) en lugar de `router.push` → `Login.tsx` pinta `WeakPasswordFlow` → "Cambiar contraseña" → `useChangePasswordViewModel` pasa a `form` → escribo la nueva (el medidor reacciona) → guardar → `validateChangePasswordForm` → `updateUserPassword` (`password.service.ts`) → `auth.updateUser` → resultado → `done` → "Continuar" lleva a la app. "Ahora no" va directo a la app.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Evaluar la fortaleza en el cliente, después de un login exitoso | Evaluarla en la Edge Function y devolver una bandera | Es una ayuda al usuario, no una barrera: quien la salte solo evita el aviso. Hacerlo en el servidor obligaría a mover la lógica de reglas a Deno y duplicarla, con la contraseña viajando por más código |
| Evaluar solo si el login fue exitoso | Evaluar al escribir, antes de enviar | Evaluar antes revelaría la fortaleza de contraseñas de un intento fallido y mostraría el aviso a quien no entró |
| Promover el código de fortaleza a la raíz (`constants/`, `types/`, `utils/`, `components/`) | Importarlo desde `registro-manual` | Login es el segundo consumidor real; una feature no debe depender de los archivos internos de otra. Se hace igual que con el correo y con el buscador de productos (SCRUM-120) |
| Mover sin cambiar comportamiento, en una tarea aparte | Aprovechar para refactorizar el registro | Si el registro cambia de comportamiento junto con la mudanza, no se sabe si un fallo es de la mudanza o del cambio; se valida el registro igual que antes |
| Aviso no bloqueante con "Ahora no" | Obligar a cambiar la contraseña | La HU pide "ofrecer"; forzar el cambio sería una política de seguridad que nadie definió |
| El aviso reaparece en cada login débil | Recordar que el usuario lo rechazó (localStorage o base de datos) | Guardar la decisión necesita almacenamiento y una política (¿cuánto dura?); sin eso, el costo es solo ver el aviso otra vez |
| La nueva contraseña debe alcanzar el nivel intermedio | Aceptar cualquiera | Cambiar una contraseña débil por otra débil no cumple el propósito del aviso |
| `auth.updateUser` desde el cliente | Edge Function para cambiar la contraseña | Supabase ya autoriza el cambio con la sesión del usuario; una función nueva sería código y despliegue sin ganar seguridad |
| No pedir la contraseña actual | Pedirla de nuevo | Acaba de escribirla para iniciar sesión; pedirla otra vez es fricción sin ganancia |
| Hook propio para el cambio (`useChangePasswordViewModel`) | Meterlo en `useLoginViewModel` | El ViewModel del login ya maneja el envío, el reCAPTCHA y los errores; sumarle un segundo formulario lo convierte en un god ViewModel |
| Unión de estados `notice | form | saving | done` | Booleanos `isChanging`, `isSaving`, `isDone` | Tres booleanos admiten combinaciones imposibles (guardando y terminado a la vez); la unión no |
| "Contraseña vencida" fuera de alcance | Inventar una fecha de vencimiento | Supabase Auth no la lleva; exigiría una tabla de perfil con una fecha y una política de duración, que son decisiones de producto |
| Reusar `PasswordInput` (HU-23) para los dos campos nuevos | Un campo nuevo sin ojo | Ya existe, y el usuario escribe una contraseña nueva: es cuando más ayuda verla |
