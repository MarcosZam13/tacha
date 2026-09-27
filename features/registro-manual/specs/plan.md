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

## SCRUM-39: feedback de seguridad de contraseña

```
features/registro-manual/
  components/PasswordStrengthMeter.tsx   barra + etiqueta + requisitos que faltan (solo presentación)
  components/models/PasswordStrengthMeterProps.interface.ts
  utils/evaluatePasswordStrength.ts      función pura: contraseña → nivel y requisitos faltantes
  constants/registro.constants.ts        reglas, niveles, etiquetas y mensajes
```

- **Reglas y niveles:** 5 reglas; nivel por cantidad cumplida (0-2 débil, 3-4 media, 5 fuerte).
- **Unicode:** las reglas usan `\p{Ll}`, `\p{Lu}` y `[^\p{L}\p{N}]` (con la bandera `u`), para que `ñ` y `á` cuenten bien.
- **Solo informa:** no bloquea el envío; el único bloqueo es el mínimo de 8 que ya existe.
- **Accesibilidad:** el nivel también se escribe ("Débil", "Media", "Fuerte") y la barra lleva atributos ARIA; no depende solo del color.
- **Colores:** rojo/terracota a teal (`docs/DESIGN.md` §7.14), con los tokens `tacha-*`.
- **Reuso futuro:** la recuperación de contraseña (HU-28/29) usará la misma barra; se promueve a `components/` cuando exista ese segundo uso, no antes.

## SCRUM-41: aceptación de términos y condiciones

```
features/registro-manual/
  RegistroManual.tsx                 agrega el Checkbox + enlace + Modal debajo de los campos
  hooks/useRegistroManualViewModel.ts   + acceptedTerms, handleAcceptedTermsChange, isTermsModalOpen, etc.
  constants/registro.constants.ts    texto del checkbox, del enlace, título del modal, placeholder legal
```

## Decisiones

- **Reuso:** `Checkbox` y `Modal` ya existen en `components/ui/`; no se crea ningún componente nuevo.
- **Estado del modal:** vive en el mismo ViewModel del registro, como un booleano más (abierto/cerrado), no en un store aparte — es un solo checkbox de una sola pantalla.
- **Bloqueo:** el checkbox se suma a `isSubmitDisabled`, igual que los demás campos obligatorios.
- **Texto legal:** placeholder hasta que el equipo redacte los términos reales; se anota en el PR para que no se confunda con contenido definitivo.