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
- [x] 1. OrganizationSection.

## SCRUM-28: formulario de contacto en la landing (reCAPTCHA)
- [x] 1. SPEC, plan, tareas y E2E.md.
- [x] 2. Mover RecaptchaWidget a components/recaptcha-widget y sus constantes a constants/recaptcha.constants.ts; el login sigue funcionando.
- [x] 3. Migración 028 + prueba SQL; aplicarla con su fila del historial antes de waiting qa.
- [x] 4. _shared/recaptcha.ts (lo usa solo submit-contact-message; login-with-recaptcha no se toca).
- [x] 5. Edge Function submit-contact-message; deploy.
- [x] 6. Constantes, modelos, utils, servicio y ViewModel del contacto.
- [x] 7. ContactSection, ContactForm, ContactMessageField, ContactSuccess; montar en Landing; "Contacto" de la navbar al formulario.
- [x] 8. Tests: validateContactForm, contact.service, useContactFormViewModel, ContactSection (POM).
- [x] 9. E2E-CONTACTO-01 a 03.
- [x] 10. Probar en 320px y desktop, claro y oscuro; tsc, lint, test, build, e2e.

## SCRUM-36: contacto desde About
- [x] 1. CONTACT_SOURCE.ABOUT; ContactSection en About.tsx.
- [x] 2. Test del ViewModel con source about; E2E en /nosotros.
- [x] 3. Probar; tsc, lint, test, build, e2e.

