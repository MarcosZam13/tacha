# Plan técnico: registro con datos básicos

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

## Archivos

```
features/registro-manual/
  RegistroManual.tsx                   entrada ("use client"): formulario (solo presentación)
  hooks/
    useRegistroManualViewModel.ts      estado del formulario, handlers y envío
  models/
    RegistroFormValues.interface.ts    valores y errores del formulario
    RegistroManualViewModel.interface.ts  lo que devuelve el hook
    RegisterUserParams.interface.ts    parámetros del servicio
  services/
    registro.service.ts                registerUser(): auth.signUp de Supabase, devuelve un resultado
  utils/
    validateRegistroForm.ts            validación pura por campo
  constants/
    registro.constants.ts              textos, mensajes, patrón de correo, mínimo de contraseña, resultados
  specs/  SPEC.md · plan.md · tasks.md

services/supabase.client.ts            cliente único de la app (de SCRUM-62), no se toca
app/registro/page.tsx                  ruta delgada: solo renderiza <RegistroManual />
```

## Decisiones

- **Cliente de Supabase:** se reusa `getSupabaseClient()` (SCRUM-62). No se crea otro. La sesión queda en el navegador; si SCRUM-40 necesita sesión del lado del servidor se evalúa `@supabase/ssr` en ese ticket.
- **Nombre del usuario:** no hay tabla de perfiles todavía; se guarda en los metadatos del usuario (`options.data.name`).
- **Correo ya registrado:** con la confirmación de correo activa, Supabase no devuelve error (evita revelar qué correos existen); devuelve un usuario sin `identities`. El servicio cubre los dos casos.
- **Resultado sin excepciones:** `registerUser` devuelve `success`, `email-exists` o `error`; un mapa de constantes traduce cada uno a su mensaje.
- **Contraseña mínima de 8:** debe coincidir con la configuración de Supabase (Authentication → Providers → Email).
- **Sin `if`:** validaciones y resultados con ternarios y mapas de constantes.