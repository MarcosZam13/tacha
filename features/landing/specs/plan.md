# Plan técnico: landing pública

Deriva de [SPEC.md](SPEC.md). Pasos en [tasks.md](tasks.md).

## Archivos

```
features/landing/
  Landing.tsx                  arma la página: navbar, hero y footer
  components/
    PublicNavbar.tsx           navbar (HU-01)
    Logo.tsx                   logo enlazado al inicio (HU-01, HU-11)
    ButtonLink.tsx             enlace con forma de botón (navbar y hero)
    HeroSection.tsx            sección principal (HU-02)
    PublicFooter.tsx           pie de página (HU-08)
    SocialLinks.tsx            redes sociales (HU-09)
  models/NavLink.interface.ts  forma de un enlace de la navbar
  constants/landing.constants.ts  textos, rutas y URLs
public/logo-marca/logo.png     logo provisional
app/page.tsx                   ruta: renderiza <Landing />
```

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Todo dentro de `features/landing/` | Navbar y footer en una carpeta compartida | Hoy hay una sola página pública; se comparten cuando exista About |
| `ButtonLink` (enlace con estilo de botón) | `<Link><Button/></Link>` | Un botón dentro de un enlace es HTML inválido |
| Enlaces de la navbar desde un array de constantes | Escribir cada enlace a mano | Agregar una sección es una línea, sin tocar el componente |
| En móvil los enlaces bajan de fila | Menú hamburguesa con estado | Sin estado no hace falta `"use client"` ni ViewModel |
| Logo guardado en `public/` | Cargarlo desde otra web | No depende de otro sitio ni requiere configuración extra |
| Contacto por Instagram | Inventar un correo | Un correo falso sería un enlace roto |

## Sprint 2

features/landing/
  About.tsx                    página /nosotros (HU-12, HU-13)
  Terms.tsx                    página /terminos (HU-10)
  components/
    PublicLayout.tsx           navbar + main + footer; se extrae en SCRUM-34, cuando haya 3 páginas
    IntroSection.tsx           HU-03, más el enlace "Leer más" (HU-04)
    MoreInfoSection.tsx        HU-04
    DemoSection.tsx            HU-07 (marcador)
    TestimonialsSection.tsx    HU-05, server: título + carrusel
    TestimonialsCarousel.tsx   HU-05, "use client"
    TestimonialCard.tsx, CarouselArrowButton.tsx
    BackButton.tsx             HU-10, "use client"
    MissionVisionSection.tsx   HU-12
    OrganizationSection.tsx    HU-13
  models/PlatformFeature.interface.ts  forma de un punto de la intro
  hooks/useTestimonialsCarouselViewModel.ts, useBackButtonViewModel.ts
  constants/carousel.constants.ts, terms.constants.ts
  tests/                       carrusel (Page Object) y BackButton
app/terminos/page.tsx, app/nosotros/page.tsx

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| "Leer más" como ancla (#mas-informacion) | Página /mas-informacion | Lo define DESIGN.md 7.16; una ruta más sería otra página pública que registrar en el guard |
| Intro y ampliada leen el mismo PLATFORM_FEATURES | Dos listas de textos | CA-04 de HU-04 se cumple por construcción: no pueden desincronizarse |
| Puntos de la intro en un array de constantes | Escribir cada tarjeta a mano | Agregar un punto es una línea, sin tocar el componente |
| Testimonios como prop del carrusel | Importar la constante adentro | El test usa sus propios datos y no se rompe al cambiar los textos |
| TestimonialList es una tupla no vacía | Array normal | Una lista vacía no compila; con [] el % 0 daría NaN |
| Solo el carrusel y BackButton son "use client" | Toda la landing cliente | El resto se renderiza en el servidor y manda menos JS |
| Demo como marcador de texto | Video ahora | El video todavía no existe; la sección queda lista para reemplazar |
| BackButton con router.back() y fallback a / | Enlace fijo a / | CA-05 pide volver a la página de origen |
| About y Términos dentro de features/landing | Features nuevas | Comparten layout y constantes; precedente en recipes/ |
