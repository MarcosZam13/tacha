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
| Todo fallo de credenciales sale como `invalid_credentials` (401) | Reenviar el `error.code` de Supabase | El SPEC §7 pide un mensaje genérico; reenviar códigos adelanta SCRUM-47 y le dice a un llamador directo que la contraseña era válida (`email_not_confirmed`) |
| El límite de intentos de Supabase sale como `rate_limited` (429) | Tratarlo como credenciales malas | Es otro problema: el usuario debe esperar, no corregir la contraseña |
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
