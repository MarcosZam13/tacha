# Plan E2E: app shell

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/app-shell/app-shell.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: la regla de ítem activo (`isRouteActive`), los enlaces y `aria-current` están cubiertos con tests unitarios y de componente (`components/app-shell/tests/`); el redirect del login (`resolvePostLoginRoute`) y el botón de la navbar pública (`PublicNavbarCta`) también. Acá va lo que solo un navegador real prueba: que el grupo de rutas monta el shell, que la navegación cambia de pantalla sin escribir la URL, y que la navegación visible es la que corresponde al ancho (sidebar en desktop, tabs en Pixel 7).

## Datos y entorno

- **Usuario:** sesión anónima nueva por test (la crea `/lista` al cargar). El session guard (SCRUM-49) está apagado por defecto (`NEXT_PUBLIC_SESSION_GUARD_ENABLED`), así que las rutas privadas abren sin cuenta registrada.
- **Sin datos propios:** el shell no lee ni escribe en la base; no hace falta limpieza.
- **Fuera de E2E:** el login real (CA-02) y la navbar con sesión registrada (CA-03) piden una cuenta con contraseña y reCAPTCHA; quedan cubiertos por `features/login/tests/resolvePostLoginRoute.test.ts` y `features/landing/tests/PublicNavbarCta.test.tsx`, y por la prueba manual de QA.

## Escenarios

### E2E-SHELL-01: navegar entre las secciones de la app

- **Cubre:** SCRUM-135 CA-01, CA-04.
- **Precondición:** sesión anónima nueva. Corre en desktop (`chromium`, sidebar) y en Pixel 7 (`mobile-chrome`, tabs).
- **Pasos:**
  1. Abrir `/lista`.
  2. En la navegación visible "Secciones de la app", tocar "Recetas", después "Catálogo", después "Mi familia", después "General".
- **Resultado esperado:** después de cada toque la URL es la de la sección (`/recetas`, `/catalogo`, `/household`, `/lista`) y solo ese ítem está marcado como página actual (`aria-current="page"`).

### E2E-SHELL-02: las páginas públicas no tienen el shell

- **Cubre:** SCRUM-135 CA-05.
- **Precondición:** ninguna (no crea sesión).
- **Pasos:** abrir `/`.
- **Resultado esperado:** no existe la navegación "Secciones de la app"; está la navbar pública ("Navegación principal").
