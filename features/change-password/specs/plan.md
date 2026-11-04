# Plan técnico: cambiar contraseña

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

## SCRUM-54: cambiar contraseña

### Archivos

```
features/change-password/
  ChangePassword.tsx                       entrada ("use client"): título, formulario y enlace de vuelta (solo presentación)
  components/
    ChangePasswordForm.tsx                 los tres campos, el medidor, el mensaje general y guardar
    ChangePasswordFeedback.tsx             confirmación (status) o error general (alert)
    models/                                props de los componentes
  hooks/
    useChangePasswordViewModel.ts          valores, errores derivados, guardado
  models/
    ChangePasswordViewModel.interface.ts
    ChangePasswordParams.interface.ts      { currentPassword, newPassword }
  services/
    change-password.service.ts             changePassword(params): verifica la actual y cambia; devuelve un resultado
  utils/
    validateChangePasswordForm.ts          función pura: valores → errores (suma "actual obligatoria" y "distinta de la actual")
  constants/
    change-password.constants.ts           textos, estados, resultados y códigos de Supabase de esta pantalla
  tests/                                   ver tasks.md
  specs/  SPEC.md · plan.md · tasks.md

features/profile/components/ProfileChangePasswordLink.tsx   el acceso "Cambiar contraseña"
features/profile/Profile.tsx                                + el enlace bajo el formulario
features/profile/constants/profile.constants.ts             + texto del enlace
constants/routes.constants.ts                               + APP_ROUTE.CHANGE_PASSWORD = "/perfil/contrasena"
app/(app)/perfil/contrasena/page.tsx                        solo la ruta (metadata + <ChangePassword />)
```

### Datos

Sin tablas, RLS, RPC ni Edge Functions: no hay migración. Tampoco hay que cambiar nada en el dashboard de Supabase.

### Flujo

Abro Perfil → "Cambiar contraseña" (`next/link`) → `/perfil/contrasena` → `ChangePassword.tsx` con `useChangePasswordViewModel`. Escribo: `handleChange(campo)` actualiza el valor y limpia los errores del intento anterior; `validateChangePasswordForm` y `evaluatePasswordStrength` se recalculan en cada render. Guardo: `handleSubmit` valida otra vez, pasa a `saving` y llama a `changePassword` (`change-password.service.ts`):

1. `auth.getUser()` para el correo; sin correo (cuenta anónima) o con error → `error`.
2. `auth.signInWithPassword({ email, password: actual })`: si falla con `invalid_credentials` → `wrong-current-password`; con 429 → `too-many-attempts`; otro fallo → `error`. No se cambia nada.
3. Solo con la actual verificada, `updateUserPassword(nueva)` (el servicio compartido) y su resultado (`success`, `same-password`, `rejected`, `error`) se devuelve tal cual.

El ViewModel pone `saved` y vacía los campos con `success`; con `wrong-current-password` deja el mensaje bajo el primer campo; con cualquier otro, un mensaje general.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Verificar la actual con `signInWithPassword` | `updateUser({ password, current_password })` | `current_password` solo se exige si se activa una opción del dashboard de Supabase, que el repo no controla: con ella apagada o distinta en otro entorno, CA-05 y la seguridad dependerían de un ajuste manual. `signInWithPassword` verifica siempre, en el servidor. Costo: reemplaza la sesión local por otra de la misma cuenta |
| Verificar antes de cambiar, en dos llamadas | Confiar en la sesión abierta | Quien toma un navegador con la sesión abierta podría cambiar la contraseña y quedarse con la cuenta; pedir la actual lo impide |
| El servicio devuelve un resultado y no lanza | `try/catch` en el ViewModel | Mismo patrón que `updateUserPassword`, `login.service` y `saveProfile`: el que llama decide qué mostrar |
| Reutilizar `updateUserPassword`, `validateNewPasswordForm`, `PasswordInput` y el medidor | Copiarlos o hacer uno nuevo | Ya son compartidos (SCRUM-52); una segunda validación de contraseña tendría que mantenerse igual que el registro |
| Feature propia `features/change-password/` | Dentro de `features/profile/` o `features/login/` | Es otra historia con su flujo y su ViewModel; `profile` no debe crecer en cada historia de la cuenta, y `login` ya tiene ~50 archivos y su propio cambio de contraseña (forzado, otro contexto) |
| Ruta propia `/perfil/contrasena` | Sección dentro de `/perfil` o un modal | Una pantalla por tarea simplifica el foco y el botón "atrás"; el formulario de perfil guarda otra cosa (nombre y foto) y mezclarlos obligaría a manejar dos botones de guardar |
| Errores derivados en cada render | Guardarlos en estado | Cambian solos al escribir; un estado se desincroniza (patrón del login y de SCRUM-52) |
| Estado como unión `idle \| saving \| saved` | Booleanos | Dos booleanos admiten "guardando y guardado a la vez" |
| Error de la actual bajo su campo, los demás como mensaje general | Todo en un mensaje general | CA-05 pide un error específico; la persona ve de inmediato qué campo corregir |
| No cerrar las demás sesiones | Llamar `revokeOtherSessions` | No lo piden los criterios y suma un fallo posible (red) a un cambio que ya tuvo éxito. Queda anotado como mejora (§14) |

### Conceptos nuevos

- **Reautenticar antes de una acción sensible** y por qué la sesión abierta no basta.
- **`signInWithPassword` frente a `current_password`**, y qué depende de la configuración del proyecto.
- **Reemplazo de sesión** al volver a iniciar con la misma cuenta, y los eventos de sesión que emite.
- **Códigos de error de Auth** (`invalid_credentials`, 429) y por qué la pantalla traduce en vez de mostrar el texto.

### Puesta en marcha

1. No hay migración ni configuración.
2. Probar con una cuenta real: contraseña actual incorrecta, nueva igual a la actual, nueva débil, nueva distinta en "Repetir", y el cambio exitoso; después cerrar sesión e iniciar con la nueva.
