# Tareas: landing pública

Deriva de [plan.md](plan.md). Cada ticket es una PR; se hacen en orden porque cada uno usa código del anterior.

## SCRUM-23: barra de navegación
- [x] 1. Logo en `public/logo-marca/logo.png`.
- [x] 2. Constantes, modelos y `ButtonLink`, `Logo`, `PublicNavbar`.
- [x] 3. `Landing.tsx` y `app/page.tsx`.
- [ ] 4. Probar en 320px y desktop, claro y oscuro; tsc, lint, build.

## SCRUM-24: sección principal
- [ ] 1. `HERO_TEXT` y `HeroSection.tsx`.
- [ ] 2. Montarla en `Landing.tsx`.
- [ ] 3. Probar; tsc, lint, build.

## SCRUM-30: información del pie de página
- [ ] 1. Constantes del footer y enlace "Contacto".
- [ ] 2. `PublicFooter.tsx` y montarlo en `Landing.tsx`.
- [ ] 3. Probar; tsc, lint, build.

## SCRUM-31: redes sociales
- [ ] 1. `SocialLinks.tsx` y columna en el footer.
- [ ] 2. Probar; tsc, lint, build.

## SCRUM-33: logotipo en el pie de página
- [ ] 1. `Logo` en el footer.
- [ ] 2. Probar; tsc, lint, build.

## Pendiente cuando el proyecto tenga runner de tests
- [ ] Tests de componentes según unit-testing-standards.


## SCRUM-25: información introductoria
- [x] 1. SPEC con la plantilla de 15 secciones, plan y tareas.
- [x] 2. PlatformFeature, constantes, IntroSection en Landing.
- [x] 3. Probar en 320px y desktop, claro y oscuro; tsc, lint, test, build.

## SCRUM-26: leer más (bloqueada por SCRUM-25)
- [x] 1. MoreInfoSection y enlace "Leer más".
- [x] 2. Probar.


## SCRUM-27: testimonios (bloqueada por SCRUM-26)
- [x] 1. Modelo, constantes, ViewModel, carrusel.
- [x] 2. Tests con Page Object.
- [x] 3. Probar.

## SCRUM-29: demo de uso (bloqueada por SCRUM-27)
- [x] 1. DemoSection con el texto "Aquí va la demo, pendiente".
- [x] 2. Probar.
- [ ] Pendiente: video real (CA-03 a CA-05).

## SCRUM-32: términos y condiciones (bloqueada por SCRUM-29)
- [x] 1. terms.constants, Terms, ruta /terminos.
- [x] 2. BackButton + ViewModel + test.
- [x] 3. Enlace en el footer y PUBLIC_ROUTES.

## SCRUM-34: misión y visión (bloqueada por SCRUM-32)
- [x] 1. PublicLayout (Landing, Terms y About), About, MissionVisionSection, ruta /nosotros, enlaces "Nosotros", PUBLIC_ROUTES.

## SCRUM-35: información de la organización (bloqueada por SCRUM-34)
- [ ] 1. OrganizationSection.

