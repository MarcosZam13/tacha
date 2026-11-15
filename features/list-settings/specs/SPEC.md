# Feature: Configuración de la lista — activar el "encargado" (SCRUM-108 / HU-78)

Ticket: [SCRUM-108](https://tacha.atlassian.net/browse/SCRUM-108) · Historia: HU-78 en [historias-usuario.md](../../../docs/historias-usuario.md) · Dueño: Esteban · Sprint 5

Ver también: [documento-proyecto.md §4.2.1](../../../docs/documento-proyecto.md#421-interacciones-concretas-de-la-fila-de-producto-detallado-2026-08-18-desde-el-desglose-de-historias-de-usuario) (el "encargado" en la fila) · [§4.13](../../../docs/documento-proyecto.md#413-configuración-agregado-2026-08-19) (Configuración) · [§6](../../../docs/documento-proyecto.md#6-modelo-de-datos-resumen-conceptual) (`list_settings` y `list_items.assigned_to`) · [shopping-list/specs/SPEC.md](../../shopping-list/specs/SPEC.md) · [date-lists/specs/SPEC.md](../../date-lists/specs/SPEC.md)

> **Nota de nombres:** SCRUM-78 en Jira es otra historia (HU-46, estado de una sublista, de Marcos). Esta es **HU-78 = SCRUM-108**.

## 1. Objetivo

Hoy la fila de producto no tiene "encargado" (quién debe comprarlo) y no existe una pantalla de Configuración. Esta historia agrega las dos cosas:

- Una pantalla **Configuración**, accesible desde el perfil, con un ajuste **por lista** (no global): el interruptor "Encargado", apagado por defecto.
- Cuando el interruptor está encendido para una lista, cada fila de esa lista muestra el campo **Encargado**, donde se elige a quién le toca comprar ese producto. Al apagarlo, el campo se oculta **sin borrar** lo ya asignado.

La función es opcional a propósito: la mayoría de las listas no la necesita, y encendida por lista evita saturar la fila (documento-proyecto §4.2.1, "jerarquía visual de la fila").

## 2. Alcance

**Sí incluye:**

- Ruta `/perfil/configuracion` y un enlace "Configuración" en la pantalla de Perfil.
- La pantalla lista las listas que la persona ve (la lista general, personal o de la familia, y las sublistas por fecha), cada una con su interruptor "Encargado".
- Guardar el ajuste por lista y recordarlo (`list_settings`).
- El campo "Encargado" en la fila de la **lista general** (`/lista`) y en la fila de la **sublista por fecha** (`/fechas/[listId]`), solo si el ajuste de esa lista está encendido.
- Elegir el encargado entre las personas con acceso a la lista, o dejarlo "Sin asignar".
- Migración nueva: tabla `list_settings`, columna `list_items.assigned_to` y las RPC que las escriben.

**No incluye:** ver [§14](#14-casos-fuera-de-alcance).

## 3. Entradas

| Entrada | Tipo | De dónde |
|---|---|---|
| Interruptor "Encargado" de una lista | `boolean` | toque en el interruptor de esa lista (Configuración) |
| Lista a configurar | id de una lista visible (`uuid`) | la fila de la lista en Configuración |
| Encargado de un producto | id de usuario (`uuid`) o ninguno | selector del campo "Encargado" en la fila |
| Ajuste de la lista abierta | `assigneeEnabled: boolean` | lectura de `list_settings` al abrir `/lista` o `/fechas/[listId]` |
| Personas con acceso a la lista | `{ userId, displayName, isCurrentUser }[]` | `get_list_assignee_candidates` (la familia con familia, o la propia persona sin ella) |

## 4. Salidas

- Un interruptor por lista que se guarda al tocarlo y se ve igual al volver a entrar.
- En la fila, el campo "Encargado" con el nombre elegido o "Sin asignar", mientras el ajuste esté encendido.
- Al elegir a alguien, la fila lo muestra de inmediato y queda guardado.
- Al apagar el ajuste, el campo desaparece de las filas de esa lista; al encenderlo de nuevo, los encargados que ya estaban vuelven a verse.

## 5. Reglas de negocio

1. **Por lista, apagado por defecto (CA-01, CA-02).** Cada lista tiene su propio ajuste. Una lista sin fila en `list_settings` cuenta como apagada; la fila se crea la primera vez que se enciende o apaga.
2. **Qué listas se configuran hoy (D1).** La lista general que la persona ve y las sublistas por fecha que ve. Las listas privadas (SCRUM-80) no existen todavía: cuando lleguen heredan la pantalla, porque el ajuste cuelga de `lists.id` y no de su tipo.
3. **Quién puede cambiarlo (D2).** Cualquier persona que vea la lista, con la misma regla de acceso que la política de `lists` (024): la dueña si `household_id` es nulo, los integrantes si no. En una familia el ajuste es de la lista, así que lo ven todos y afecta a todos, igual que tachar o agregar productos.
4. **El campo (CA-03, D3).** Con el ajuste encendido, cada fila de esa lista muestra "Encargado: {nombre}" o "Sin asignar". Con el ajuste apagado no se muestra nada.
5. **Quién puede ser encargado (D4).** Solo quien tiene acceso a la lista: los integrantes de la familia, o la dueña si la lista es personal. La base rechaza a cualquier otra persona.
6. **Opcional (D5).** Un producto nuevo empieza "Sin asignar". Se puede volver a "Sin asignar" desde el mismo selector.
7. **Apagar no borra (CA-03).** `assigned_to` no se toca al apagar el ajuste. Al volver a encenderlo, los productos recuperan su encargado.
8. **Un encargado que ya no tiene acceso (D6).** Si alguien deja la familia, su nombre ya no está entre las personas con acceso: la fila muestra "Sin asignar" y no hay error. El dato queda guardado y no se reescribe solo.
9. **Un solo selector abierto a la vez** en la lista; abrir otro cierra el anterior. Elegir guarda de inmediato, sin botón de confirmar.
10. **Qué no cambia.** Cambiar el encargado no tacha, no cambia cantidades ni la presentación, no toca compras ya cerradas ni las finanzas.
11. **Otra pestaña (D7).** Un cambio hecho en otra pestaña o por otro integrante se ve al recargar. Fuera de alcance, como SCRUM-155 (tiempo real).
12. **La fila se carga con el ajuste.** La lista pide el ajuste junto con sus productos; mientras llega no se muestra el campo (no parpadea apagado→encendido sin motivo): se muestra solo cuando ya se sabe que está encendido.

## 6. Estados

Se modelan como uniones derivadas de constantes (constants-standards §7), no como booleanos sueltos.

| Pantalla | Estados | Notas |
|---|---|---|
| Configuración | `loading` · `ready` · `empty` · `error` | `empty` si la persona todavía no tiene ninguna lista |
| Interruptor de una lista | `idle` · `saving` · `failed` | `saving` lo deshabilita; `failed` lo deja como estaba y muestra el error |
| Selector de encargado | `closed` · `open` · `saving` · `failed` | `saving` deshabilita las opciones; `failed` deja el selector abierto con el error |

## 7. Errores

| Caso | Qué se muestra |
|---|---|
| Falla al cargar las listas | "No se pudieron cargar tus listas. Intenta de nuevo." con "Reintentar" |
| Falla al guardar el interruptor | "No se pudo guardar el ajuste. Intenta de nuevo." junto a esa lista; el interruptor vuelve a su valor anterior |
| Falla al guardar el encargado | "No se pudo asignar al encargado. Intenta de nuevo." dentro del selector, que sigue abierto |
| El producto ya no está o la persona elegida ya no tiene acceso | El selector sigue abierto con "Tu lista se actualizó." o "Esa persona ya no tiene acceso a la lista. Elige a otra." (`role="alert"`), y se vuelven a leer los encargados |
| La lista ya no existe al guardar el interruptor | "Esa lista ya no existe. Tu lista se actualizó." junto a la lista, y se vuelve a leer la pantalla |
| Persona sin sesión (`42501`) | Se muestra como el error genérico de cada guardado ("No se pudo guardar el ajuste…" o "No se pudo asignar al encargado…"). La sesión vencida la resuelve el guard de sesión que ya envuelve las rutas privadas, no esta pantalla |
| Falla al cargar el ajuste, los encargados o las personas de la lista | El campo "Encargado" no se muestra y la lista sigue funcionando igual: es opcional y no debe estorbar a la lista |

Se reconoce el error por `error.code` de la RPC, nunca por el texto.

## 8. UI esperada

- **Perfil:** un enlace "Configuración" bajo el enlace "Cambiar contraseña" (y sobre "Cerrar sesión"), con el mismo estilo de texto.
- **Configuración (`/perfil/configuracion`):** título "Configuración"; subtítulo corto ("Ajustes por lista"); una sección "Encargado" con una explicación de una línea ("Asigna quién debe comprar cada producto. Se activa lista por lista."); una fila por lista con su nombre (para una sublista, nombre y fecha) y un interruptor. Enlace "Volver al perfil".
- **Fila de producto** (con el ajuste encendido): en la segunda línea, texto pequeño, "Encargado: {nombre}" o "Sin asignar", que es un botón que abre el selector (jerarquía visual de documento-proyecto §4.2.1: no compite con nombre, cantidad ni precio).
- **Selector de encargado:** un panel pequeño (el `Modal` compartido) con "Sin asignar" y una opción por cada persona de la lista, marcando la actual; "Cancelar".
- Mobile: la fila y el selector caben en 375 px sin scroll horizontal; el interruptor es táctil (mínimo 44 px).

## 9. Accesibilidad

- El interruptor es un `<button role="switch" aria-checked>` con nombre accesible "Encargado, {nombre de la lista}" (no solo "Activado"); no depende del color.
- Cada fila de Configuración es un elemento de una lista (`<ul>`), con el nombre de la lista visible como texto.
- El campo "Encargado" en la fila es un botón con nombre completo ("Encargado: Ana. Cambiar"). El selector usa el `Modal` compartido: `role="dialog"`, `aria-modal`, Escape cierra y el foco vuelve al botón de la fila.
- Errores y avisos de cambios ajenos ("Tu lista se actualizó.") con `role="alert"`, igual que en §7.
- Solo teclado: llegar al interruptor con Tab y activarlo con Espacio o Enter.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; Tailwind con los tokens `tacha-*`; sin librerías nuevas.
- Presentación / ViewModel (`.tsx` sin lógica, `use*ViewModel`); sin magic strings: constantes con `as const` y uniones derivadas (constants-standards).
- Servicios que devuelven resultado (no lanzan) para los guardados, como `change-password` y `profile`.
- La estructura va en `features/list-settings/` (pantalla) y `components/assignee-field/` (el campo de la fila, compartido por `shopping-list` y `date-lists`, que no pueden importarse entre sí: project-structure).
- Las RPC son `security definer` con `search_path = ''`, toman a la persona de `auth.uid()` y nunca reciben un id de persona para decidir el acceso (security-practices).
- Una migración nueva; la ya registrada no se edita (supabase/README, «Cómo se aplica una migración»).

## 11. Dependencias

- `features/shopping-list/` (la fila y el ViewModel de la lista general) y `features/date-lists/` (la fila de la sublista): se les agrega el campo. **Son de Marcos**: él revisa.
- `get_list_assignee_candidates` (nueva) para los nombres: `get_household_members` (023) solo la puede llamar la admin y aquí lo necesita cualquier integrante; `lists` y la política 024 para el acceso; `features/profile/` para el enlace.
- `@/components/ui` (`Modal`, `Button`, `Spinner`), `@/constants` (`APP_ROUTE`) y `@/services/supabase.client`.

## 12. Contratos externos

Detalle y decisiones en [plan.md](plan.md). Resumen (migración `047`, **el número ya se confirmó con el equipo; se vuelve a revisar contra la base y los PR abiertos antes de crearla**):

- **`list_settings`** (`list_id` PK → `lists` `on delete cascade`, `assignee_enabled boolean not null default false`): RLS activada, `select` solo para quien ve la lista, **sin permisos de escritura** para el cliente.
- **`list_items.assigned_to uuid null`** → `auth.users` con `on delete set null`; sin permiso de escritura directo para el cliente.
- **`set_list_assignee_enabled(target_list_id uuid, enabled boolean)`**: crea o actualiza la fila y devuelve el ajuste. Sin sesión `42501`; lista no visible `P0002`.
- **`set_list_item_assignee(target_item_id uuid, new_assignee uuid)`**: asigna o, con `null`, quita al encargado. Sin sesión `42501`; producto no visible `P0002`; encargado sin acceso a la lista `22023`.
- **`get_list_assignee_candidates(target_list_id uuid)`**: las personas con acceso a esa lista (`user_id`, `display_name`, `is_current_user`), con la misma regla de acceso que las demás.
- `types/database.types.ts` y `docs/documento-proyecto.md` (§6 y §4.13) se actualizan en este PR.

## 13. Casos de aceptación

**CA de la historia**

- [ ] **CA-01:** desde el Perfil hay un enlace "Configuración" que abre una pantalla con los ajustes **por lista** (la general y cada sublista), no uno global.
- [ ] **CA-02:** cada lista tiene un interruptor "Encargado", apagado por defecto; encender uno no cambia las demás listas.
- [ ] **CA-03:** al encenderlo, cada fila de esa lista muestra el campo "Encargado"; al apagarlo deja de mostrarse y lo ya asignado **no se borra** (al volver a encenderlo, sigue ahí).

**Casos de cada flujo (funcional, negativo y límite)**

- [ ] Una lista nueva, o una sin fila en `list_settings`, aparece apagada.
- [ ] El ajuste se guarda: recargar la pantalla o salir y volver muestra el mismo valor.
- [ ] El campo aparece en la lista general y en una sublista por fecha, cada una según su propio ajuste.
- [ ] Elegir a un integrante lo guarda y la fila lo muestra; elegir "Sin asignar" lo quita.
- [ ] Apagar, recargar y volver a encender recupera los encargados (regla 7).
- [ ] En una familia, el ajuste y los encargados los ve otro integrante (a mano con dos cuentas).
- [ ] **Negativo:** la base rechaza asignar a alguien sin acceso a la lista (`22023`), cambiar el ajuste de una lista no visible (`P0002`) y cualquier llamada sin sesión (`42501`); `anon` sin `execute`.
- [ ] **Negativo:** el cliente no puede escribir `list_settings` ni `list_items.assigned_to` directamente (con un `PATCH`/`INSERT`).
- [ ] **Límite:** una persona sin ninguna lista ve el estado vacío; un encargado que salió de la familia se ve como "Sin asignar".
- [ ] Falla al guardar: el interruptor vuelve a su valor anterior y el error se ve; el selector queda abierto y permite reintentar.
- [ ] Teclado y mobile: el interruptor y el selector se usan solo con teclado; todo cabe en 375 px.
- [ ] Tests automáticos (Vitest) del camino feliz y de al menos un negativo o límite por unidad; E2E con el flujo completo.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` pasan; la prueba SQL de la migración corre completa.

## 14. Casos fuera de alcance

- Listas privadas y sus colaboradores (SCRUM-80, SCRUM-81): heredan la pantalla cuando existan.
- Notificar al encargado, recordatorios o filtrar la lista "por encargado". Un ajuste por lista de notificaciones queda para otra historia (documento-proyecto §4.13).
- Tiempo real: ver el cambio de otro integrante sin recargar (SCRUM-155).
- Asignar el encargado de varios productos a la vez, o por defecto a toda la lista.
- Que el encargado sea alguien sin cuenta o fuera de la familia.
- Cambiar quién puede modificar el ajuste (hoy cualquiera con acceso a la lista).
- Exigir una cuenta registrada para configurar: una sesión anónima puede usar las listas, y por tanto sus ajustes, igual que `set_list_item_checked` (035). La pantalla solo se alcanza desde el Perfil.
- Otros ajustes en Configuración: la pantalla queda preparada para sumarlos, pero esta historia solo agrega "Encargado".
- Mostrar al encargado en otras pantallas (finanzas, historial, recetas).
- La lista personal que se mantiene al unirse a una familia (SCRUM-59, D4): su sección en `/lista` no muestra el campo, así que Configuración no la ofrece (un interruptor que no cambia nada confunde).

## 15. Notas de implementación

- La pantalla de Perfil ya tiene un enlace a "Cambiar contraseña" (SCRUM-54) y el botón de cerrar sesión (SCRUM-55): el enlace nuevo va entre los dos.
- El campo de la fila lo comparten dos features que no pueden importarse entre sí; por eso vive en `components/assignee-field/` (precedente: `components/password-input/`).
- Decisiones propuestas por la dueña de la historia que **hay que confirmar con Marcos antes de implementar** (afectan su feature): D1 (qué listas), D2 (cualquiera con acceso puede encender el ajuste), D3 y D4 (el selector de encargado entra en esta historia, no solo el interruptor).
