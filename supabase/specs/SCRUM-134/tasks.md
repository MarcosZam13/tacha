# Tareas — SCRUM-134

- [x] 0. Equipo (Daniel confirmó y se avisó al grupo, 2026-10-08): confirmar la convención `NNN_` (SPEC, "Decisión de convención") y avisar que se va a escribir el historial. Daniel revisa, porque SCRUM-131 y 133 traen migraciones.
- [x] 1. Conteo de objetos de `public` antes (18 tablas, 26 políticas, 43 índices, 15 funciones, 14 filas de historial).
- [x] 2. Verificar el mapeo (funciones, tablas, políticas e índices contra el repo).
- [x] 2.1 `000_baseline.sql` con los seis índices de la entrada de agosto.
- [x] 3. Script de la reescritura con respaldo y ensayo: `reconcile-history.sql`.
- [x] 4. Ensayo del script (`ensayo := true`): `Ensayo OK (no se escribió nada): respaldo=14, historial=15`; después el historial seguía con 14 filas y sin tabla de respaldo.
- [x] 5. Script real (`ensayo := false`), 2026-10-08.
- [x] 6. Conteo después igual al de antes (18 tablas, 26 políticas, 43 índices, 15 funciones); historial `000`-`014` igual a `supabase/migrations/`; respaldo con 14 filas, todas con su SQL. Evidencia en el PR #53.
- [x] 7. `supabase/README.md`: sección Migraciones + tabla de equivalencias.
- [x] 8. Regla enlazada desde `CONTRIBUTING.md`, `gitflow` y `security-practices`.
- [x] 9. Corregir `features/household/specs/plan.md` (paso de aplicar migración).
- [x] 10. Actualizar el último criterio de SCRUM-134 en Jira (comentario del 2026-10-08) (#38/#43 ya mergeados, no hay PRs abiertos con migraciones).
