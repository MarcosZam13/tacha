# Plan técnico: login

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

## SCRUM-45: login con reCAPTCHA

### Archivos

```
features/login/
  Login.tsx                          entrada ("use client"): formulario (solo presentación)
  components/
    RecaptchaWidget.tsx              contenedor donde Google dibuja la casilla
    models/RecaptchaWidgetProps.interface.ts
  hooks/
    useLoginViewModel.ts             estado del formulario, handlers, envío y reinicio del widget
    useRecaptchaWidget.ts            carga el script de Google, dibuja el widget, entrega el token
  models/
    LoginFormValues.interface.ts     valores y errores del formulario
    LoginViewModel.interface.ts      lo que devuelve el hook
    LoginParams.interface.ts         parámetros del servicio
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
```

### Datos

Sin tablas ni RLS nuevas. Secret de Supabase: `RECAPTCHA_SECRET_KEY`. `SUPABASE_URL` y `SUPABASE_ANON_KEY` las inyecta Supabase en las Edge Functions.

### Flujo

Completo la casilla → callback de Google en `useRecaptchaWidget` → `setCaptchaToken` en `useLoginViewModel` → se habilita el botón → submit → `validateLoginForm` → `loginWithRecaptcha` (`login.service.ts`) → `functions.invoke("login-with-recaptcha")` → la función pide a Google la verificación → `signInWithPassword` → vuelve la sesión → `auth.setSession` → el ViewModel cambia a `success` y navega. Si algo falla: el resultado se traduce a un mensaje con un mapa de constantes y el widget se reinicia.

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
| Redirección a la ruta principal definida en constante | `"/"` escrito en el hook | Hoy `/` es una página vacía y la ruta real puede cambiar; una constante se corrige en un solo lugar |

### Despliegue (manual, una vez)

1. Dashboard de Supabase → Edge Functions → secrets: `RECAPTCHA_SECRET_KEY`.
2. Desplegar `login-with-recaptcha` desde la CLI (`supabase functions deploy login-with-recaptcha`) o pegando el código en el editor del dashboard; la CLI no está instalada en esta máquina.
3. `.env.local`: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
