# Feature: Landing

## 1. Objetivo
Que un visitante sin sesión entienda qué es Tacha, conozca a la organización y sus reglas de uso, confíe en ella (testimonios) y llegue al registro.

## 2. Alcance
Incluye:
- Sprint 1: HU-01 navbar, HU-02 hero, HU-08 footer, HU-09 redes, HU-11 logo.
- Sprint 2: HU-03 intro (SCRUM-25), HU-04 leer más (SCRUM-26), HU-05 testimonios (SCRUM-27), HU-07 sección de demo con marcador "Aquí va la demo" (SCRUM-29), HU-10 términos (SCRUM-32), HU-12 misión y visión (SCRUM-34), HU-13 organización (SCRUM-35).

No incluye: formularios de contacto (HU-06, HU-14), "Iniciar sesión" en la navbar (HU-22), el video de la demo.

## 3. Entradas
- testimonials: TestimonialList (lista no vacía) → TestimonialsCarousel
- Clic en "Leer más", en las flechas del carrusel y en "Volver".
- Sin datos de servidor: todo el contenido sale de constantes.

## 4. Salidas
- "Leer más" lleva a la sección ampliada (#mas-informacion).
- Las flechas cambian el testimonio visible.
- "Volver" regresa a la página anterior, o a / si no hay página anterior.

## 5. Reglas de negocio
- La información ampliada detalla los mismos puntos de la intro (una sola fuente de datos).
- El carrusel es circular: después del último viene el primero y viceversa.
- Con un solo testimonio no se muestran controles.
- /, /terminos y /nosotros son rutas públicas (PUBLIC_ROUTES del session guard).
- Todo enlace de la navbar o el footer apunta a una página que existe.

## 6. Estados
- Carrusel: índice del testimonio activo (0..n-1).
- Resto de la feature: sin estado.

## 7. Errores
- Se entra a /terminos directo (pestaña nueva): "Volver" lleva a /.

## 8. UI esperada
- Intro: título, descripción, 3 tarjetas, enlace "Leer más".
- Información ampliada: un bloque por cada punto de la intro y "Volver arriba".
- Demo: recuadro con el texto "Aquí va la demo".
- Testimonios: inicial, nombre, ubicación, cita, flechas y posición "1 de 3".
- Footer: enlaces "Términos y condiciones" y "Nosotros".
- /terminos: botón "Volver", título, fecha y secciones numeradas.
- /nosotros: título, Misión y Visión en bloques separados, "Quiénes somos".

## 9. Accesibilidad
- Un h1 por página; h2 por sección; h3 por bloque.
- Las flechas tienen aria-label; el testimonio se anuncia con aria-live="polite".
- La etiqueta de "Leer más" incluye el texto visible.

## 10. Restricciones técnicas
- TypeScript estricto, sin any; Tailwind con tokens tacha-*.
- Sin librerías de carrusel.
- "use client" solo en TestimonialsCarousel y BackButton; su lógica va en un ViewModel.
- Textos, rutas e IDs en constantes.

## 11. Dependencias
- features/landing/constants/landing.constants.ts, carousel.constants.ts, terms.constants.ts
- @/components/ui (Button), @/constants (BUTTON_VARIANT)
- features/session-guard/constants/session-guard.constants.ts (PUBLIC_ROUTES)

## 12. Contratos externos
No aplica: no hay llamadas a Supabase ni APIs.

## 13. Casos de aceptación
- Caso 1 (HU-03): / muestra "¿Qué es Tacha?" con 3 puntos, sin sesión.
- Caso 2 (HU-04): "Leer más" baja a la información ampliada con los mismos 3 puntos; "Volver arriba" e "Inicio" regresan.
- Caso 3 (HU-05): se ve un testimonio con nombre y ubicación; las flechas cambian de testimonio en forma circular.
- Caso 4 (HU-07): la sección de demo se ve sin sesión con el texto "Aquí va la demo". CA-03 a CA-05 quedan pendientes hasta tener el video.
- Caso 5 (HU-10): el footer lleva a /terminos sin sesión; "Volver" regresa a la página anterior.
- Caso 6 (HU-12): /nosotros muestra Misión y Visión en bloques separados.
- Caso 7 (HU-13): /nosotros muestra el origen, el propósito y las características de la organización.
- Caso 8: sin scroll horizontal en 320px; se ve bien en modo claro y oscuro.
- Caso 9: tsc, lint, test y build pasan.

## 14. Casos fuera de alcance
- El video de la demo y sus controles.
- Autoplay del carrusel.
- Contenido editable desde una base de datos.
- Formularios de contacto (HU-06, HU-14).

## 15. Notas de implementación
Los textos de misión, visión, términos y testimonios son un borrador hasta que el equipo los valide.
