# Tacha

App web colaborativa de listas de compras para grupos (familias o amigos): listas compartidas con tachado en tiempo real, dashboard financiero, catálogo de productos/precios poblado por web scraping de supermercados costarricenses, y un planificador semanal de comidas conectado a las listas.

Proyecto de equipo (6 integrantes) para el curso de Introducción al Desarrollo Web.

## Documentación

- [Documento de Proyecto](docs/documento-proyecto.md) — resumen, requerimientos funcionales/no funcionales, modelo de datos, arquitectura, dirección de diseño, división de trabajo.
- [Mockup interactivo](docs/mockup-web-v2.html) — prototipo HTML (desktop + mobile web, modo claro/oscuro). v2, todavía por mejorar.
- [Flujo de Git, labels de PR y tablero](CONTRIBUTING.md) — cómo se trabaja en este repo.

## Stack

- **Frontend:** Next.js + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + Realtime + RLS) vía PostgREST/RPC
- **Estado remoto:** TanStack Query
- **PWA:** instalable, sin dependencia de tiendas de apps

Ver [sección 7 del documento de proyecto](docs/documento-proyecto.md#7-arquitectura-técnica) para el detalle y las justificaciones.

## Pendiente antes de empezar a codear

Ver [sección 10 del documento de proyecto](docs/documento-proyecto.md#10-pendientes-de-definición) — herramienta de web scraping y quién la lidera, qué supermercados son viables de scrapear, y el enfoque del inventario doméstico. Son decisiones de equipo, no unilaterales.

## Cómo contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md) antes de tu primer PR: branching, formato de commits, labels y la plantilla de PR.

## Convenciones de código (para vos y para tu agente de IA)

Este repo define sus reglas en [AGENTS.md](AGENTS.md) — arquitectura de componentes, constantes, testing, patrones de Next.js, código limpio. Si usás Claude Code, Cursor o Copilot, cada uno ya tiene su puente (`CLAUDE.md`, `.cursor/rules/skills.mdc`, `.github/copilot-instructions.md`) apuntando ahí, así que las convenciones se aplican solas sin que tengas que copiarlas a mano. Leelo antes de tu primera feature — evita que cada quien de los 6 resuelva lo mismo distinto.
