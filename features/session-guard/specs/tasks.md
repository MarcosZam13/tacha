# Tareas: SessionGuard

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-49: token de seguridad de sesión

- [ ] 1. Constantes: interruptor, rutas públicas, ruta del login, estados y etiqueta del indicador (`constants/session-guard.constants.ts`).
- [ ] 2. Modelos: props del guard y retorno del ViewModel (`models/`).
- [ ] 3. Funciones puras: `utils/getSessionStatus.ts` y `utils/isPublicRoute.ts`.
- [ ] 4. Servicio: `services/session.service.ts` (`getCurrentSession`, `subscribeToSessionChanges`).
- [ ] 5. ViewModel: `hooks/useSessionGuardViewModel.ts`.
- [ ] 6. Presentación: `SessionGuard.tsx` con el `Spinner` de `@/components/ui`.
- [ ] 7. Montarlo en `app/layout.tsx` y documentar la variable en `.env.example` (comentada, apagado por defecto).
- [ ] 8. Revisar en el dashboard de Supabase la duración del token de acceso (JWT expiry) y anotar el valor en SPEC §15.
- [ ] 9. Validar con el interruptor **apagado** los casos 11 y 12 del SPEC; `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [ ] 10. Validar con el interruptor **encendido** (`NEXT_PUBLIC_SESSION_GUARD_ENABLED=true` y reiniciar `npm run dev`) los casos 1 a 10 del SPEC.
- [ ] 11. Dejar el interruptor otra vez apagado antes del commit (`.env.local` no se commitea, pero revisarlo).
- [ ] 12. (Fuera del PR) Abrir el ticket de Jira "Activar el guard de sesión", con responsable y fecha, y avisar al equipo.
