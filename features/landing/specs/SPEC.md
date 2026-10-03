# Spec: Landing pública

Tickets: SCRUM-23 (HU-01), SCRUM-24 (HU-02), SCRUM-30 (HU-08), SCRUM-31 (HU-09), SCRUM-33 (HU-11) · Historias: [historias-usuario.md](../../../docs/historias-usuario.md)

## Intención

Un visitante sin sesión llega a `/`, entiende para qué sirve Tacha, navega a las secciones públicas, llega al registro y encuentra cómo contactar al equipo.

## Alcance

- HU-01 (SCRUM-23): barra de navegación con logo, "Inicio" y "Registrarse".
- HU-02 (SCRUM-24): sección principal con título, descripción y botón "Empezar gratis".
- HU-08 (SCRUM-30): pie de página con información institucional y contacto; enlace "Contacto" en la navbar.
- HU-09 (SCRUM-31): enlace a Instagram en el pie de página.
- HU-11 (SCRUM-33): logotipo en el pie de página.

## Fuera del alcance

- "Iniciar sesión" (HU-22) y "Nosotros" (HU-12/13): Sprint 2, esas pantallas no existen.
- Correo de contacto: el equipo todavía no definió uno.

## Requerimientos

1. La navbar muestra solo secciones que existen; cada sección nueva agrega su enlace.
2. "Registrarse" y "Empezar gratis" llevan a `/registro`; el logo y "Inicio" llevan a `/`.
3. "Contacto" baja al pie de página.
4. Los enlaces externos se abren en otra pestaña con `rel="noopener noreferrer"`.
5. El logo mantiene sus proporciones.
6. `app/page.tsx` solo monta la feature.

## Casos límite

- Pantalla de 320px: sin scroll horizontal.
- Modo oscuro: colores con tokens `tacha-*`; el logo va dentro de un recuadro blanco para que se vea sobre fondo oscuro.

## Restricciones

- Componentes sin estado, sin ViewModel ([component-architecture](../../../.agents/skills/component-architecture/SKILL.md)).
- `app/` solo contiene la ruta ([project-structure](../../../.agents/skills/project-structure/SKILL.md)).
- Textos, rutas y URLs en constantes ([constants-standards](../../../.agents/skills/constants-standards/SKILL.md)).
- El logo es provisional (imagen de banco) hasta que haya uno oficial.

## Criterios de aceptación

- [ ] (HU-01) La navbar muestra logo, "Inicio" y "Registrarse", y cada opción lleva a su destino sin iniciar sesión.
- [ ] (HU-02) La sección principal presenta el propósito y su botón "Empezar gratis" lleva a /registro.
- [ ] (HU-08) El pie de página muestra información institucional y el medio de contacto.
- [ ] (HU-09) El pie de página tiene el enlace a Instagram, identificable por ícono, y abre la cuenta oficial.
- [ ] (HU-11) El pie de página muestra el logo sin deformarse, y lleva a /.
- [ ] Todo se ve bien en 320px y en desktop, en modo claro y oscuro.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
