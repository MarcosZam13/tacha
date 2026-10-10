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
  models/
    ForgotPasswordViewModel.interface.ts
  services/
    password-recovery.service.ts           requestPasswordReset(email): devuelve un resultado, no lanza
  utils/
    validateForgotPasswordEmail.ts         función pura: correo → mensaje de error o nada
  constants/
    password-recovery.constants.ts         textos, estados, resultados, código de Supabase
  tests/
    validateForgotPasswordEmail.test.ts · password-recovery.service.test.ts
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
| Sin mover el foco a la confirmación; `role="status"` | Reutilizar `FocusedHeading` del login | Está dentro de `features/login/` y se promovería a `components/` tocando SCRUM-45 a 48, fuera del alcance. El `role="status"` hace que se anuncie igual; promoverlo queda como mejora |
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
