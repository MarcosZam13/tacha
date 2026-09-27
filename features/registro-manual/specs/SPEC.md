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
- HU-16 (SCRUM-39): feedback de seguridad de la contraseña: barra de fortaleza y requisitos que faltan.
- HU-18 (SCRUM-41): checkbox de términos y condiciones.


## Fuera del alcance (van en su propio ticket)

- HU-17 (SCRUM-40): correo de verificación y estado "pendiente de verificación".
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
13. Se muestra un checkbox "Acepto los términos y condiciones", no marcado por defecto.
14. Junto al checkbox hay un enlace "Ver términos y condiciones" que abre un modal con el texto completo.
15. El botón de registro permanece deshabilitado mientras el checkbox no esté marcado.

## Casos límite y errores

- Espacios al inicio o final en nombre y correo: se recortan antes de validar.
- Correo con mayúsculas: se normaliza a minúsculas.
- Doble clic en "Registrarme": una sola solicitud.
- Falla de red o error de Supabase: mensaje genérico, sin exponer el error técnico.
- Correo ya registrado: mensaje específico, sin borrar lo que el usuario escribió.
- Contraseña vacía: no se muestra el indicador. Borrar el contenido lo oculta.
- Letras con tilde o eñe (`ñ`, `á`) cuentan como minúscula o mayúscula.
- "Carácter especial" es cualquier carácter que no sea letra ni número.
- Abrir el modal y cerrarlo sin aceptar: el checkbox conserva su estado previo.
- El texto de términos es un marcador de posición hasta que el equipo defina el contenido legal real (ver Developer Notes del PR).


## Restricciones

- Estructura: `features/registro-manual/` con presentación en `.tsx` y toda la lógica en `hooks/useRegistroManualViewModel.ts` ([component-architecture](../../../.agents/skills/component-architecture/SKILL.md)).
- `app/` solo contiene la ruta ([project-structure](../../../.agents/skills/project-structure/SKILL.md)).
- Textos, límites y mensajes en constantes, nunca sueltos ([constants-standards](../../../.agents/skills/constants-standards/SKILL.md)).
- Auth y formularios: cumplir [security-practices](../../../.agents/skills/security-practices/SKILL.md). La contraseña nunca se registra en logs ni se guarda en el estado más de lo necesario.
- Variables de entorno de Supabase solo con las `NEXT_PUBLIC_*` del `.env.example`.
- El mensaje "Ya existe una cuenta con este correo." revela qué correos están registrados
  (enumeración de cuentas). Se mantiene porque HU-14b lo exige; decisión pendiente de confirmar.
- Reusar `Checkbox` y `Modal` de `components/ui/`, sin crear componentes nuevos para eso.



## Criterios de aceptación

- [x] El formulario muestra nombre, correo, contraseña y repetir contraseña.
- [x] El botón de registro está deshabilitado mientras falte algún campo.
- [x] Un correo con formato inválido muestra un mensaje claro y no se envía.
- [x] Un correo ya registrado muestra un mensaje y no crea una cuenta.
- [x] Un registro válido crea el usuario en Supabase Auth.
- [x] Doble clic en el botón no genera dos solicitudes.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
- [x] Si las contraseñas no coinciden, aparece el mensaje mientras el usuario escribe.
- [x] El botón queda deshabilitado mientras no coincidan.
- [x] Al coincidir, el mensaje desaparece y el botón se habilita (si el resto está completo).
- [x] Al escribir en "Contraseña" aparece una barra con nivel débil, media o fuerte.
- [x] El nivel sube al cumplir más reglas.
- [x] Se listan los requisitos que faltan, y desaparecen al cumplirse.
- [x] Con las 5 reglas cumplidas el nivel es fuerte y no hay lista.
- [x] Con la contraseña vacía no se muestra nada.
- [x] El indicador no bloquea el envío del formulario.
- [x] El checkbox aparece sin marcar al cargar la página.
- [x] El botón de registro está deshabilitado mientras el checkbox no esté marcado.
- [x] Marcar el checkbox habilita el botón (si el resto del formulario está completo).
- [x] El enlace "Ver términos y condiciones" abre un modal con el texto.
- [x] Cerrar el modal no cambia el estado del checkbox.
