# Security Practices — Next.js + Supabase

Usar este skill al escribir o revisar autenticación, sesión, permisos de household, políticas RLS, Edge Functions, route handlers, formularios con input del usuario, o cualquier cosa que toque variables de entorno o credenciales. Lo aplica el subagente `security-reviewer` (`.claude/agents/security-reviewer.md`).

Ver también: [nextjs-enterprise-patterns](../nextjs-enterprise-patterns/SKILL.md) · [project-structure](../project-structure/SKILL.md)

El estándar: **todo valor que manda el cliente es hostil, y toda restricción que solo existe en la UI es decorativa hasta que la base de datos o el servidor la hacen cumplir.** Esconder un botón no es un control de seguridad: cualquiera puede llamar a la API de Supabase desde la consola del navegador con la anon key, que es pública.

## 1. Quién puede llegar a esto

Antes de escribir algo que toque auth, datos o input, responder:

- **¿Quién llega?** Visitante (sin sesión), Usuario autenticado, o admin del household (el único rol con permisos extra: invitar/eliminar miembros, transferir admin). No existe un administrador de plataforma.
- **¿Qué pasa si falta el control?** Leer datos de otro usuario < leer datos de otro household < escribir o borrar datos ajenos.
- **¿Dónde vive el control real?** En la política RLS de Postgres o en código de servidor (route handler, server action, Edge Function). Nunca solo en un componente.

## 2. Autenticación y sesión

- La sesión la valida Supabase Auth del lado del servidor. Nunca confiar en un `user_id`, `owner_id` o `household_id` que mande el cliente en el body: se deriva de `auth.uid()` en la política o de la sesión en el servidor.
- El cierre de sesión por inactividad (HU-27) es un requerimiento, no un extra: configurable, pero tiene que existir.
- Login, registro y recuperación no revelan si un correo existe ("correo no encontrado" vs "contraseña incorrecta" es una fuga). Mismo mensaje y tiempo de respuesta parecido en ambos casos.
- reCAPTCHA (login, formularios de contacto) se verifica **en el servidor** con la clave secreta. Validar solo el widget en el cliente no protege nada.
- Nunca loguear tokens, contraseñas ni el objeto de sesión completo, ni siquiera en un `console.log` de desarrollo.

## 3. Autorización: RLS es la primera línea, no la última

Tacha habla con Supabase directo desde el cliente (PostgREST/RPC con la anon key). Eso significa que **las políticas RLS son el control de acceso real**; el código de UI solo decide qué mostrar.

- Toda tabla nueva nace con RLS activado y sin políticas (deny por defecto). Los permisos se agregan explícitamente, nunca al revés.
- Patrón `owner_id` + `household_id` nullable (listas, grupos, productos personalizados, sesiones de compra, inventario): la política permite acceso si `owner_id = auth.uid()` **o** si el usuario es miembro del `household_id` de la fila. "Cualquier usuario autenticado" (`auth.role() = 'authenticated'`) casi nunca es la política correcta.
- Acciones de admin del household (eliminar miembro, transferir admin) se chequean en la política o en una función `security definer` que verifica el rol del que llama, no en el componente.
- Escalamiento de privilegios: en inserts/updates, el cliente no puede fijar `owner_id`, `role` o `household_id` a su gusto. Usar `with check` en la política o un default `auth.uid()`.
- Funciones `security definer` validan permisos adentro y fijan `search_path`; si no, saltan RLS para cualquiera que las llame.
- Deuda abierta conocida: `household_store_preferences` tiene RLS abierto (ver `docs/catalogo-scraping/TICKET-seguridad-household-store-preferences.md`). Se cierra cuando exista el módulo de household.

## 4. Validación de input e inyección

- Validar todo input externo (formulario, body de un route handler, parámetros de una Edge Function) en el borde, con un esquema (Zod o equivalente), antes de que llegue a una query o escritura.
- Nunca armar SQL concatenando input del usuario, ni en funciones de Postgres (`format()` con `%L`/`%I`, o parámetros) ni en Edge Functions.
- Evitar `dangerouslySetInnerHTML`. Si es inevitable, sanitizar antes (DOMPurify).
- Subidas de archivos (fotos de recetas, logos): validar tipo y tamaño en el servidor o en la política de Storage; el `accept=` del input no es un control.

## 5. Secretos y variables de entorno

- Toda variable con prefijo `NEXT_PUBLIC_` termina en el bundle del cliente y **la ve cualquiera**. La URL de Supabase y la anon key son públicas por diseño; la **service role key nunca** puede tener ese prefijo ni importarse desde un archivo que llegue al cliente.
- La service role key y la clave secreta de reCAPTCHA solo se leen en código de servidor: route handlers, server actions o Edge Functions (secrets de Supabase).
- Los `.env*` no se commitean (`.gitignore` ya lo cubre). Las variables que hacen falta para correr el proyecto se documentan en `.env.example`, sin valores reales.
- Nada de URLs o claves hardcodeadas como fallback en el código (ya pasó en el PR #1): si falta la variable, fallar con un error claro.

## 6. Checklist rápido (OWASP adaptado)

| Riesgo | Qué revisar |
|---|---|
| Control de acceso roto | Cada tabla/función tocada tiene RLS que verifica dueño o membresía, no solo "autenticado" (§3) |
| Inyección | Input validado con esquema, sin SQL armado con strings (§4) |
| Exposición de datos | Sin secretos en `NEXT_PUBLIC_`, sin tokens ni datos personales en logs (§5, §2) |
| Abuso de formularios | reCAPTCHA verificado en servidor en login y contacto (§2) |
| Dependencias vulnerables | `npm audit` sin altas/críticas nuevas antes de cada entregable |
| Configuración insegura | Sin páginas `(debug)` expuestas en producción, sin stack traces en respuestas de error |
| Fuerza bruta | Login, recuperación y endpoints caros con límite de intentos (Supabase Auth ya limita; Edge Functions propias no) |

## 7. En la práctica

1. Identificar qué rol llega al código tocado y qué debería poder hacer cada uno (§1).
2. Confirmar que el control real está en RLS o en servidor, no solo en un render condicional (§3).
3. Confirmar que todo input externo se valida antes de llegar a una query (§4).
4. Buscar `NEXT_PUBLIC_` cerca de cualquier cosa que parezca secreto (§5).
5. Reportar por severidad: **Crítica** (acceso roto, secreto expuesto) · **Alta** (escritura sin validar) · **Media** (sin rate limit, hardening) · **Baja** (defensa en profundidad). Nunca enterrar una crítica debajo de comentarios de estilo.
