# Tareas: registro con datos básicos

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-37: registro con datos básicos

- [x] 1. Constantes de la feature (`constants/registro.constants.ts`).
- [x] 2. Modelos: valores del formulario, parámetros del servicio, retorno del ViewModel.
- [x] 3. Validación pura (`utils/validateRegistroForm.ts`).
- [x] 4. Servicio de alta (`services/registro.service.ts`) con el cliente de `services/supabase.client.ts`.
- [x] 5. ViewModel (`hooks/useRegistroManualViewModel.ts`).
- [ ] 6. Presentación: `RegistroManual.tsx` con `Input` y `Button` de `components/ui/`.
- [ ] 7. Ruta `app/registro/page.tsx`.
- [ ] 8. Validar los criterios de aceptación del SPEC en el navegador; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Pendiente cuando el proyecto tenga runner de tests

- [ ] Tests unitarios de `utils/validateRegistroForm.ts` (función pura) y del ViewModel, según unit-testing-standards.

## Historias que se montan sobre esta (cada una en su PR, en `on hold` hasta que esta se mergee)

- SCRUM-38 (HU-15): coincidencia de contraseña.
- SCRUM-39 (HU-16): fortaleza de contraseña.
- SCRUM-41 (HU-18): términos y condiciones.
- SCRUM-40 (HU-17): verificación de correo.