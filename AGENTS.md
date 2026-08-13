# AGENTS.md — Tacha

Fuente única de verdad para cómo se construye este repo. Cualquier agente de IA (Claude Code, Cursor, Copilot) que edite código acá sigue este contrato.

**Protocolo obligatorio:** antes de escribir o revisar código no trivial, escanear la tabla de skills de abajo y abrir cada uno que aplique al cambio — no es opcional, no es "si hay tiempo".

**Regla de oro:** si un skill y cualquier otro documento (README, comentario, este archivo) no coinciden, gana el skill. Nunca copiar contenido de un skill a otro lugar del repo — solo referenciarlo.

## Rol por defecto

Actuar como ingeniero senior Next.js/React/TypeScript. Nunca volver a patrones junior:

- UI tipada con strings sueltos cuando ya existen constantes o tipos unión.
- Prop drilling cuando ya existe un store para ese estado.
- Librerías o wrappers innecesarios para resolver algo en una línea.
- Refactors amplios no pedidos, fuera del alcance del cambio.
- Explicaciones largas en vez de entregar el cambio pedido.

## Catálogo de skills

| Skill | Cuándo aplica |
|---|---|
| [component-architecture](.agents/skills/component-architecture/SKILL.md) | Construir o revisar cualquier feature de UI — estructura de carpetas, Spec-Driven Development, separación Presentación/ViewModel |
| [constants-standards](.agents/skills/constants-standards/SKILL.md) | Un string o número sin explicar está por entrar a un diff |
| [unit-testing-standards](.agents/skills/unit-testing-standards/SKILL.md) | Escribir o revisar tests de componentes/unitarios |
| [nextjs-enterprise-patterns](.agents/skills/nextjs-enterprise-patterns/SKILL.md) | Reutilización de componentes, tipos nullable, estado compartido, patrón de mutaciones, baseline de lint |
| [clean-code-practices](.agents/skills/clean-code-practices/SKILL.md) | Cualquier código no trivial — naming, tamaño de funciones, estructura de repo, cuándo usar un patrón de diseño |

## Flujo de trabajo — Spec-Driven Development

Antes de una feature nueva o un cambio de comportamiento no trivial (no aplica a retoques puramente visuales): escribir `specs/SPEC.md` dentro de la carpeta de la feature. Flujo: **Especificar → Planear → Tareas → Implementar → Validar** contra los criterios de aceptación del spec, no contra lo que se creyó entender del pedido. Detalle completo en [component-architecture §2](.agents/skills/component-architecture/SKILL.md#2-spec-driven-development--specify-before-you-code).

## Git y Pull Requests

Ver [CONTRIBUTING.md](CONTRIBUTING.md) en la raíz — modelo de ramas, formato de commits, labels de estado de PR, plantilla.

## Producto

Ver [docs/documento-proyecto.md](docs/documento-proyecto.md) — requerimientos funcionales/no funcionales, modelo de datos, arquitectura, dirección de diseño.

## Stack (referencia rápida)

Next.js · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Realtime + RLS) vía PostgREST/RPC · TanStack Query para estado de servidor. El patrón de estado compartido puramente de cliente (modales, selección activa) todavía no está decidido por el equipo — ver [nextjs-enterprise-patterns §3](.agents/skills/nextjs-enterprise-patterns/SKILL.md#3-estado-compartido-de-cliente--elegir-un-patrón-y-exigirlo) antes de introducir uno nuevo ad hoc.
