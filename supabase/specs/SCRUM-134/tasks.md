# Tareas — SCRUM-134

- [ ] 0. Equipo: confirmar la convención `NNN_` (SPEC, "Decisión de convención") y avisar que se va a escribir el historial. Daniel revisa, porque SCRUM-131 y 133 traen migraciones.
- [ ] 1. Exportar el historial actual a `historial-2026-10.sql`.
- [ ] 2. Verificar el mapeo (statements vs archivos, funciones de 006-011/013/014, agosto vs `schema.sql`).
- [ ] 2.1 Si hace falta, `000_baseline.sql`.
- [ ] 3. Conteo de objetos de `public` antes.
- [ ] 4. Ensayo de la transacción con `raise exception`.
- [ ] 5. Transacción real (con OK y aviso al grupo).
- [ ] 6. Conteo de objetos después + listado del historial; evidencia al PR.
- [ ] 7. `supabase/README.md`: sección Migraciones + tabla de equivalencias.
- [ ] 8. Regla en `CONTRIBUTING.md`, enlazada desde `gitflow` y `security-practices`.
- [ ] 9. Corregir `features/household/specs/plan.md` (paso de aplicar migración).
- [ ] 10. Actualizar el último criterio de SCRUM-134 en Jira (#38/#43 ya mergeados, no hay PRs abiertos con migraciones).
