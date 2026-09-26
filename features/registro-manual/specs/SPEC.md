# Spec: Registro con datos básicos (HU-14b)

Ticket: SCRUM-37 · Epic: Registro manual · Historia: [HU-14b](../../../docs/historias-usuario.md)

## Intención

Un visitante crea una cueta en tacha con nombre, correo y contraseña. Es la base del flujo del registro manual: las HU-15 a HU-18 se montan sobre este formulario.


## Alcance

- Ruta '/registro' con el formulario: nombre, correo, contraseña, y repetir contraseña.
- Botón de registro deshabilitado hasta que todos los campos obligatorios estén completos.
- Mensajes de error claros por campo(campo vacío, formato inválido)
- Envío a Supabase Auth ('signUp') con manejo de errores.
- Rechazo del registro si el correo ya existe, con manejo visible.
- Reusar 'Input' y 'Button' de 'components/ui/'.

## Fuera del alcance (van en su propio ticket)

- HU-15 (SCRUM-38): validación en tiempo real de que las contraseñas coincidan.
- HU-16 (SCRUM-39): barra de fortaleza de contraseña.
- HU-17 (SCRUM-40): correo de verificación y estado "pendiente de verificación".
- HU-18 (SCRUM-41): checkbox de términos y condiciones.
- Registro con Google/Facebook (HU-19 a HU-21).


## Requerimientos 

1. Campos obligatorios: nombre, correo, contraseña, repetir contraseña.
2. El botón "Registrarme" solo si los 4 campos tienen contenido.
3. Cada campo inválido muestra su mensaje debajo del campo.
4. El correo se valida con formato válido antes de enviar.
5. Si supabase responde que el correo ya existe, se muestra un mensaje y no se crea la cuenta. 
6. Durante el envío el botón muestra el estado de carga y no admite un segundo clic.
7. La página 'app/registro/page.tsx es delgada: solo monta la feature.


## Casos límite y errores

- Espacios al inicio o final en nombre y correo: se recortan antes de validar.
- Correo con mayúsculas: se normaliza a minúsculas.
- Doble clic en "Registrarme": una sola solicitud.
- Falla de red o error de Supabase: mensaje genérico, sin exponer el error técnico.
- Correo ya registrado: mensaje específico, sin borrar lo que el usuario escribió.


## Restricciones

- Estructura: `components/registro-manual/` con presentación en `.tsx` y toda la lógica en `hooks/useRegistroManualViewModel.ts` ([component-architecture](../../../.agents/skills/component-architecture/SKILL.md)).
- `app/` solo contiene la ruta ([project-structure](../../../.agents/skills/project-structure/SKILL.md)).
- Textos, límites y mensajes en constantes, nunca sueltos ([constants-standards](../../../.agents/skills/constants-standards/SKILL.md)).
- Auth y formularios: cumplir [security-practices](../../../.agents/skills/security-practices/SKILL.md). La contraseña nunca se registra en logs ni se guarda en el estado más de lo necesario.
- Variables de entorno de Supabase solo con las `NEXT_PUBLIC_*` del `.env.example`.


## Criterios de aceptación

- [ ] El formulario muestra nombre, correo, contraseña y repetir contraseña.
- [ ] El botón de registro está deshabilitado mientras falte algún campo.
- [ ] Un correo con formato inválido muestra un mensaje claro y no se envía.
- [ ] Un correo ya registrado muestra un mensaje y no crea una cuenta.
- [ ] Un registro válido crea el usuario en Supabase Auth.
- [ ] Doble clic en el botón no genera dos solicitudes.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.

