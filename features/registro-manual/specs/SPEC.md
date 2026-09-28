# Spec: Registro con datos básicos (HU-14b)

Ticket: SCRUM-37 · Epic: Registro manual · Historia: [HU-14b](../../../docs/historias-usuario.md)

## Intención

Un visitante crea una cuenta en tacha con nombre, correo y contraseña. Es la base del flujo del registro manual: las HU-15 a HU-18 se montan sobre este formulario.


## Alcance

- Ruta `/registro` con el formulario: nombre, correo, contraseña, y repetir contraseña.
- Botón de registro deshabilitado hasta que todos los campos obligatorios estén completos.
- Mensajes de error claros por campo (campo vacío, formato inválido).
- Envío a Supabase Auth (`signUp`) con manejo de errores.
- Rechazo del registro si el correo ya existe, con mensaje visible.
- Reusar `Input` y `Button` de `components/ui/`.
- HU-15 (SCRUM-38): validación en tiempo real de que las contraseñas coincidan.
- HU-16 (SCRUM-39): barra de fortaleza de contraseña.
- HU-17 (SCRUM-40): verificación de correo: pantalla de "pendiente de verificación", reenvío del correo y página que recibe
enlace de confirmación.

## Fuera del alcance (van en su propio ticket)

- HU-18 (SCRUM-41): checkbox de términos y condiciones.
- Registro con Google/Facebook (HU-19 a HU-21).


## Requerimientos 

1. Campos obligatorios: nombre, correo, contraseña, repetir contraseña.
2. El botón "Registrarme" se habilita solo si los 4 campos tienen contenido.
3. Cada campo inválido muestra su mensaje debajo del campo.
4. El correo se valida con formato válido antes de enviar.
5. Si Supabase responde que el correo ya existe, se muestra un mensaje y no se crea la cuenta.
6. Durante el envío el botón muestra el estado de carga y no admite un segundo clic.
7. La página `app/registro/page.tsx` es delgada: solo monta la feature.
8. Si las contraseñas no coinciden se muestra "Las contraseñas no coinciden." y el botón queda deshabilitado.
9. Mientras se escribe en "Contraseña" se evalúa contra 5 reglas: mínimo 8 caracteres, una minúscula, una mayúscula, un número y un carácter especial.
10. Se muestra una barra de progreso con el nivel: débil (0 a 2 reglas), media (3 a 4) o fuerte (las 5), con la etiqueta escrita.
11. Debajo de la barra se listan solo los requisitos que faltan, por ejemplo "Debe incluir al menos un número."
12. El indicador solo aparece cuando el campo tiene contenido y no bloquea el registro (solo sigue bloqueando el mínimo de 8 que ya existe).
13. Al completar el registro se muestra la pantalla "pendiente de verificación" con el correo escrito y la indicación de confirmar desde el correo. Reemplaza al mensaje "¡Cuenta creada!".
14. El correo con el enlace lo envía Supabase Auth al registrarse (con "Confirm email" activo). La cuenta queda sin confirmar hasta abrir el enlace.
15. El registro envía `emailRedirectTo` apuntando a `/registro/verificado`, para que el enlace lleve a la página de confirmación.
16. La pantalla pendiente ofrece "Reenviar correo". Tras usarlo el botón queda deshabilitado con una cuenta regresiva de 60 segundos (el mínimo que Supabase impone entre envíos).
17. La ruta `/registro/verificado` muestra "Correo confirmado" cuando el enlace es válido.
18. Si el enlace expiró o no es válido, `/registro/verificado` muestra el mensaje de expiración y un campo de correo con "Reenviar correo".
19. El correo del usuario nunca viaja en la URL: se conserva en el estado de la pantalla. 

## Casos límite y errores

- Espacios al inicio o final en nombre y correo: se recortan antes de validar.
- Correo con mayúsculas: se normaliza a minúsculas.
- Doble clic en "Registrarme": una sola solicitud.
- Falla de red o error de Supabase: mensaje genérico, sin exponer el error técnico.
- Correo ya registrado: mensaje específico, sin borrar lo que el usuario escribió.
- Contraseña vacía: no se muestra el indicador. Borrar el contenido lo oculta.
- Letras con tilde o eñe (`ñ`, `á`) cuentan como minúscula o mayúscula.
- "Carácter especial" es cualquier carácter que no sea letra ni número.
- Reenvío antes de los 60 s, o límite de envíos de Supabase (429): mensaje genérico ("Esperá un momento antes de reenviar") sin exponer el error técnico.
- El correo del reenvío se valida con el mismo formato y se normaliza igual que en el registro.
- Reenviar a un correo que no existe o ya está confirmado: se muestra el mismo mensaje de éxito, sin revelar si existe la cuenta.
- Recargar `/registro/verificado` con un enlace ya usado: se muestra el mensaje de enlace inválido o expirado.
- Abrir `/registro/verificado` sin enlace: se muestra el mensaje de enlace inválido, no un error.



## Restricciones

- Estructura: `features/registro-manual/` con presentación en `.tsx` y toda la lógica en `hooks/useRegistroManualViewModel.ts` ([component-architecture](../../../.agents/skills/component-architecture/SKILL.md)).
- `app/` solo contiene la ruta ([project-structure](../../../.agents/skills/project-structure/SKILL.md)).
- Textos, límites y mensajes en constantes, nunca sueltos ([constants-standards](../../../.agents/skills/constants-standards/SKILL.md)).
- Auth y formularios: cumplir [security-practices](../../../.agents/skills/security-practices/SKILL.md). La contraseña nunca se registra en logs ni se guarda en el estado más de lo necesario.
- Variables de entorno de Supabase solo con las `NEXT_PUBLIC_*` del `.env.example`.
- El mensaje "Ya existe una cuenta con este correo." revela qué correos están registrados (enumeración de cuentas). Se mantiene porque HU-14b lo exige; decisión pendiente de confirmar.
- El tiempo de expiración del enlace lo configura Supabase (Authentication → Email OTP expiration); la app no lo define.
- `/registro/verificado` debe estar en la lista de Redirect URLs de Supabase (URL Configuration).



## Criterios de aceptación

- [x] El formulario muestra nombre, correo, contraseña y repetir contraseña.
- [x] El botón de registro está deshabilitado mientras falte algún campo.
- [x] Un correo con formato inválido muestra un mensaje claro y no se envía.
- [x] Un correo ya registrado muestra un mensaje y no crea una cuenta.
- [x] Un registro válido crea el usuario en Supabase Auth.
- [x] Doble clic en el botón no genera dos solicitudes.
- [x] Si las contraseñas no coinciden, aparece el mensaje mientras el usuario escribe.
- [x] El botón queda deshabilitado mientras no coincidan.
- [x] Al coincidir, el mensaje desaparece y el botón se habilita (si el resto está completo).
- [x] Al escribir en "Contraseña" aparece una barra con nivel débil, media o fuerte.
- [x] El nivel sube al cumplir más reglas.
- [x] Se listan los requisitos que faltan, y desaparecen al cumplirse.
- [x] Con las 5 reglas cumplidas el nivel es fuerte y no hay lista.
- [x] Con la contraseña vacía no se muestra nada.
- [x] El indicador no bloquea el envío del formulario.
- [x] Un registro válido muestra la pantalla "pendiente de verificación" con el correo del usuario.
- [x] El usuario recibe el correo de confirmación de Supabase.
- [x] "Reenviar correo" envía un correo nuevo y se deshabilita 60 segundos con cuenta regresiva.
- [x] El enlace del correo lleva a `/registro/verificado` y muestra "Correo confirmado".
- [x] Con un enlace expirado se muestra el mensaje de expiración y se puede pedir un correo nuevo.
- [x] El correo no aparece en la URL.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
