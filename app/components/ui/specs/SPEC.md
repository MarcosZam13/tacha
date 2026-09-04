# Primitivos base de UI

## Intención
Dar a cualquier integrante del equipo (Melany, Laura, Esteban, Roberto, Marcos) un set mínimo de primitivos visuales consistentes con DESIGN.md, para que cada módulo (auth, catálogo, finanzas, recetas, listas, inventario) los componga en vez de reinventar botones/inputs/modales sueltos por pantalla.

## Alcance
- Button, Input/FormField, Modal, Spinner, Checkbox, CategoryLabel, Chip/Badge, StatCard, ItemRow — los 9 "componentes base a mantener consistentes" de DESIGN.md sección 5.
- Puramente presentacionales (props → JSX), sin fetch, sin estado de servidor, sin lógica de negocio de ningún módulo específico.

## Fuera de alcance
- Componentes específicos de un módulo (catalog-card, group-card, expiry-chip, inventory-item-row, etc. — DESIGN.md sección 5, "componentes nuevos") — le corresponden al dueño de cada módulo, construidos ENCIMA de estos primitivos.
- Integración con Supabase/TanStack Query — estos primitivos no saben que existen.
- Estado compartido de cliente (todavía no decidido por el equipo, ver nextjs-enterprise-patterns §3).

## Requerimientos
- Tipados con TypeScript, props explícitas por componente en `models/*Props.interface.ts`.
- Consumen los tokens de `app/globals.css` (`bg-tacha-*`, `text-tacha-*`, `border-tacha-*`, `rounded-tacha-*`) — cero hex hardcodeado dentro de un componente.
- Checkbox cuadrado redondeado (`rounded-tacha-checkbox`), nunca circular.
- `ItemRow`: toda la fila es el área táctil (onClick en el contenedor), el checkbox es solo indicador visual — requisito de UX ya decidido por el equipo (DESIGN.md 2.4, ajuste 2026-08-19), no opcional.
- Un solo acento saturado por pantalla: `teal` para acción/estado activo, `terracotta` reservado para montos/etiquetas contextuales — los primitivos exponen ambos como variantes, pero no deciden por sí solos cuál usar en cada pantalla (eso lo decide quien los consume).

## Casos límite y errores
- `Input`/`FormField` en estado de error: borde y helper text distinguibles sin depender solo del color (ver accesibilidad — texto de error explícito, no solo borde rojo).
- `Modal` cierra con click en el overlay y con Escape; no atrapa el foco todavía (fuera de alcance de esta primera pasada — anotado como pendiente).
- `Button` deshabilitado: opacidad reducida + `cursor-not-allowed`, sin depender solo de quitar el handler.

## Restricciones
Seguir component-architecture (presentación pura, sin ViewModel porque no hay lógica), constants-standards (`BUTTON_VARIANT`, `CHIP_TONE`, `FORM_FIELD_STATE`, `SPINNER_SIZE` en `app/constants/ui.constants.ts`), nextjs-enterprise-patterns (tipos nullable centralizados en `app/types/nullable.types.ts`), clean-code-practices (nombrado, sin abreviaciones, estructura por dominio).

## Criterios de aceptación
- [x] Los 9 primitivos existen, tipados, sin strings/hex mágicos.
- [x] Consumibles vía `app/components/ui/<primitivo>/<Primitivo>.tsx`.
- [x] Página de demo (`app/(demo)/ui-kit/page.tsx`) renderiza todas las variantes — sustituto de Storybook mientras el proyecto no lo tenga configurado.
- [ ] Tests de componente (unit-testing-standards) — no incluidos en esta primera pasada, ver nota en el PR.
