# Tareas — SCRUM-134

- [ ] 0. Equipo: confirmar la convención `NNN_` (SPEC, "Decisión de convención") y avisar que se va a escribir el historial. Daniel revisa, porque SCRUM-131 y 133 traen migraciones.
- [x] 1. Conteo de objetos de `public` antes (18 tablas, 26 políticas, 43 índices, 15 funciones, 14 filas de historial).
- [x] 2. Verificar el mapeo (funciones, tablas, políticas e índices contra el repo).
- [x] 2.1 `000_baseline.sql` con los seis índices de la entrada de agosto.
- [x] 3. Script de la reescritura con respaldo y ensayo: `reconcile-history.sql`.
- [ ] 4. Ensayo del script (`ensayo := true`).
- [ ] 5. Script real (`ensayo := false`), después del aviso al grupo.
- [ ] 6. Conteo de objetos después + listado del historial; evidencia al PR.
- [x] 7. `supabase/README.md`: sección Migraciones + tabla de equivalencias.
- [x] 8. Regla enlazada desde `CONTRIBUTING.md`, `gitflow` y `security-practices`.
- [x] 9. Corregir `features/household/specs/plan.md` (paso de aplicar migración).
- [ ] 10. Actualizar el último criterio de SCRUM-134 en Jira (#38/#43 ya mergeados, no hay PRs abiertos con migraciones).
