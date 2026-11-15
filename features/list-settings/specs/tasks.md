# Tasks — SCRUM-108 (HU-78)

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md). Orden sugerido; cada tarea termina en un punto de validación. El git (ramas, commits, push, PR) lo hace la persona dueña de la historia.

- [ ] **1. Abrir la PR de la historia** con esta SPEC (gitflow §2): rama `ticket/SCRUM-108-configuracion-encargado`, label `in progress` desde que se abre.
  - Validación: la PR existe con un solo label de estado y el check `gitflow` en verde.
- [ ] **2. Confirmar las decisiones con Marcos** (D1 a D4: qué listas, quién lo enciende, y si el selector de encargado entra aquí). Los cambios tocan su feature.
  - Validación: respuesta escrita en la PR; si cambia el alcance, se ajusta el SPEC antes de seguir.
- [ ] **3. Confirmar el número de migración** (`045` propuesto) contra `develop`, los PR abiertos y `select version, name from supabase_migrations.schema_migrations order by version;`.
  - Validación: el número está libre; se anota en la PR.
- [ ] **4. Migración `045` y su prueba SQL** (plan §3): `list_settings`, `assigned_to`, función auxiliar de acceso y las tres RPC.
  - Validación: la prueba SQL completa en el SQL Editor, dentro de `begin ... rollback`, sin error.
- [ ] **5. Aplicar la migración** en la base compartida, con el `insert` en `schema_migrations` en la misma transacción (supabase/README), avisando al grupo antes.
  - Validación: `select version, name ...` incluye la `045`. Hacerlo antes de pasar la PR a `waiting qa`.
- [ ] **6. Tipos:** actualizar `types/database.types.ts` (tabla, columna y las tres funciones).
  - Validación: `npx tsc --noEmit` sin errores.
- [ ] **7. Constantes y modelos** de `list-settings` y de `assignee-field`; `APP_ROUTE.LIST_SETTINGS`.
  - Validación: sin strings sueltos; `tsc` limpio.
- [ ] **8. Servicios** `list-settings.service.ts` y `assignee.service.ts` (resultado, sin lanzar), con sus tests.
  - Validación: tests de columnas, RPC y mapeo de errores por código pasan.
- [ ] **9. ViewModel y pantalla de Configuración** (`useListSettingsViewModel`, `ListSettings`, `ListSettingsRow`, `AssigneeSwitch`) y la ruta `app/(app)/perfil/configuracion/page.tsx`.
  - Validación: tests con Page Object (apagado por defecto, encender, error y reversión, estado vacío).
- [ ] **10. Enlace en el Perfil** (`ProfileSettingsLink`) entre "Cambiar contraseña" y "Cerrar sesión".
  - Validación: el test de Perfil muestra el enlace y apunta a `/perfil/configuracion`.
- [ ] **11. El campo de la fila** (`components/assignee-field/`) y conectarlo en `shopping-list` y `date-lists`.
  - Validación: tests de que el campo aparece solo con el ajuste encendido, que elegir guarda y que apagar no borra.
- [ ] **12. E2E** (`E2E.md` de la feature y `e2e/features/list-settings/`), sin cuentas ni sesiones reales de la base: validan la interfaz.
  - Validación: `NEXT_PUBLIC_SESSION_GUARD_ENABLED=false npx playwright test e2e/features/list-settings` en `chromium` y `mobile-chrome`.
- [ ] **13. Documentación:** `docs/documento-proyecto.md` §4.13 y §6 (qué quedó implementado, migración 045).
  - Validación: el documento y el SPEC no se contradicen.
- [ ] **14. Subagentes de revisión** antes de QA: `code-reviewer` (siempre), `security-reviewer` (toca RLS, RPC y permisos de columna, obligatorio) y `qa-checker`.
  - Validación: sin hallazgos críticos, altos o medios abiertos.
- [ ] **15. Validar contra los casos de aceptación del SPEC §13** a mano con una cuenta real, y con dos cuentas de la misma familia; `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Validación: todo marcado; la descripción de la PR con la evidencia.
- [ ] **16. Completar la PR** con la plantilla, la migración aplicada y capturas sin correos; label `waiting qa` y la tarjeta de Jira en el mismo momento.
