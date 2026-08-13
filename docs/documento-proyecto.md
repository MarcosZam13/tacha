# Documento de Proyecto — Tacha (v1.0)

**Estado:** Propuesta formal — v1.0 · **Curso:** Introducción al Desarrollo Web · **Equipo:** 6 integrantes · **Última actualización:** Agosto 2026

Ver también: [README](../README.md)

> Pendiente de revisión por el resto del equipo antes de cerrarse — ver la sección 10, "Pendientes de definición".

## 1. Resumen ejecutivo

Tacha es una aplicación web para que un grupo de usuarios (familias, o grupos de amigos) administre listas de compras de forma colaborativa, con seguimiento de gastos y datos reales de productos/precios obtenidos mediante web scraping de sitios de supermercados. Es un proyecto de equipo para el curso de Introducción al Desarrollo Web, con énfasis en:

- Colaboración en tiempo real sobre listas compartidas (familiares o privadas).
- Finanzas domésticas: dashboard de gasto por producto, categoría, supermercado y periodo.
- Datos reales: catálogo de productos y precios poblado por scraping de sitios oficiales de supermercados costarricenses, no solo entrada manual.
- Planificación de comidas: un planificador semanal que conecta recetas, quién cocina cada día, y qué falta comprar.
- Accesibilidad desde cualquier dispositivo: web responsive, instalable como PWA, sin depender de tiendas de aplicaciones.

## 2. Objetivos del producto

- Permitir que un grupo (familia o amigos) coordine compras compartidas sin duplicar esfuerzo.
- Dar visibilidad financiera real: cuánto se gasta, dónde, en qué, y quién compró qué.
- Demostrar un pipeline de datos real (web scraping → base de datos → producto) como parte central del proyecto, no como añadido.
- Ofrecer una experiencia web responsive de calidad profesional, utilizable cómodamente tanto en desktop como en celular, sin necesitar una app nativa.
- Facilitar la planificación de comidas semanales conectada directamente con las listas de compra.

## 3. Alcance del proyecto (v1)

| Feature | Incluido | Notas |
|---|---|---|
| Gestión de usuarios, familias y perfiles | Sí | Auth + creación/pertenencia a household |
| Lista general con dashboard financiero | Sí | Gasto por día/producto/categoría/súper/persona |
| Sublistas por fecha (calendario) | Sí | Estado: pendiente / completada / cancelada; fusión opcional con la general |
| Listas privadas (no familiares) | Sí | Independientes del household, con invitados propios (ver sección 4.4, "Listas privadas") |
| Catálogo de productos y categorías | Sí | Poblado inicialmente por web scraping |
| Web scraping de productos/precios | Sí — prioridad alta | Motor central del proyecto, ver sección 4.7, "Web scraping" |
| Sugerencias de dónde comprar | Sí | Basado en precios obtenidos por scraping + historial propio |
| Historial de compras | Sí | Sesiones de compra por household/súper/día |
| Recetas y planificador semanal de comidas | Sí | Ver sección 4.9 |
| Inventario doméstico | Pendiente de diseño | Ver sección 4.10 — se define el enfoque antes de comprometerlo |
| Geolocalización / geofencing | Fuera de alcance | Descartado por complejidad para el contexto del curso |

### Roadmap post-curso (opcional, si el equipo decide continuar)

- Notificaciones push web
- Versión de app nativa/instalable más avanzada
- Inventario doméstico completo, si el enfoque ligero valida bien con usuarios reales

## 4. Requerimientos funcionales detallados

### 4.1 Gestión de usuarios, familias y perfiles

- Autenticación de usuarios (Supabase Auth).
- Un usuario puede pertenecer a uno o más households (familias), cada uno con su propio rol (admin/miembro).
- Perfil básico: nombre, foto opcional, household(s) a los que pertenece.
- Solo el admin de un household invita nuevos miembros.

### 4.2 Lista general y dashboard financiero

- Lista general infinita por household, con productos organizados por categoría.
- Catálogo de productos seleccionable con autocompletado (no texto libre exacto), cada producto con categoría asignada; posibilidad de crear producto nuevo con su categoría si no existe.
- Etiqueta de tamaño por item (ej. "1L", "paquete de 12"), específica de cada instancia en la lista.
- Unificación automática de cantidades cuando dos o más miembros agregan el mismo producto a la misma lista, con desglose de quién pidió cuánto.
- Tachado con registro de: quién compró, dónde, cuándo, cantidad — se distingue cantidad pedida de cantidad realmente comprada.
- Dashboard financiero: gasto total por día/semana/mes, desglose por categoría de producto, desglose por supermercado, desglose por persona (quién ha comprado más/gastado más), y productos específicos más comprados o más costosos.

### 4.3 Sublistas por fecha (con calendario)

- Vista de calendario para crear y visualizar listas asociadas a una fecha (viaje, evento familiar).
- Cada sublista tiene su propio total de gasto, independiente del total general.
- Estado de la sublista: pendiente, completada (todos los items comprados), o cancelada (el usuario puede cancelar explícitamente una sublista que ya no se va a comprar, sin que cuente como pendiente eternamente ni se borre el registro).
- Sesión de compra combinada (opcional): al iniciar una compra desde una sublista, se puede fusionar visualmente con la lista general — agrupando por producto en tres bloques (solo en general / repetidos en ambas, como filas independientes por lista / solo en la sublista), sin fusionar los registros de datos. Cada fila conserva su propia lista de origen, cantidad y estado.

### 4.4 Listas privadas (independientes del household)

Una lista privada:

- La crea cualquier usuario individual, no está atada a ningún household.
- El creador invita a quien quiera (amigos, compañeros de viaje) por correo o link — los invitados no necesitan ser miembros de ningún household del creador, ni familiares entre sí.
- Vive en una vista de calendario separada ("Mis listas privadas").
- Tiene la misma lógica de tachado, unificación de cantidades y estado (pendiente/completada/cancelada) que las sublistas familiares — se reutiliza el mismo motor de listas, solo cambia el modelo de quién tiene acceso.
- Implicación de arquitectura: el acceso a una lista no puede resolverse solo por pertenencia a un household. Se necesita una tabla de colaboradores por lista, independiente de los miembros del household (ver sección 6, "Modelo de datos").

### 4.5 Catálogo de productos y categorías

- Catálogo global compartido entre todos los usuarios + productos propios por household (si un household necesita algo muy específico que no está en el catálogo global).
- El catálogo global se puebla principalmente mediante el pipeline de web scraping (sección 4.7); el ingreso manual queda como fallback/complemento.

### 4.6 Historial de compras

- Sesiones de compra agrupadas por household + supermercado + día, con total editable (no se captura precio por item individual).
- Si una sesión queda sin total ingresado por un tiempo, se recuerda al usuario; si se ignora, queda visible en el historial como "sin total", editable en cualquier momento.
- Alimenta directamente el dashboard financiero de la sección 4.2.

### 4.7 Web scraping — motor de datos (prioridad alta del proyecto)

- Objetivo: extraer de sitios oficiales de supermercados costarricenses (a definir cuáles son técnicamente viables de scrapear) nombre de producto, categoría, precio y supermercado.
- Este pipeline alimenta: el catálogo de productos (sección 4.5) y los datos de precio usados en las sugerencias de dónde comprar (sección 4.8).
- Consideraciones a resolver como equipo antes de implementar:
  - Revisar robots.txt y términos de servicio de cada sitio antes de scrapear — documentar la decisión por cada supermercado incluido.
  - Frecuencia de actualización (scraping bajo demanda vs. programado) y dónde corre (script periódico, función serverless, etc.).
  - Los datos scrapeados deben pasar por una tabla de "staging" y un proceso de normalización/deduplicación antes de insertarse al catálogo real, para no ensuciarlo con productos duplicados o mal categorizados.
  - Es razonable que este componente sea el que más tiempo de desarrollo tome del equipo — vale la pena asignarlo a quien tenga más experiencia con scraping/backend.

### 4.8 Sugerencias de dónde comprar

- A partir de los precios obtenidos por scraping, sugerir el supermercado más barato para los productos pendientes de una lista.
- Complementa el historial propio de compra: si el usuario ya tiene el hábito de comprar cierto producto en cierto lugar, se muestran ambas señales (precio de mercado vs. hábito personal).

### 4.9 Recetas y planificador semanal de comidas

- Recetas: ingredientes ligados al catálogo de productos, porciones base, botón de "Agregar receta a lista" que aplica la lógica de unificación de cantidades de la sección 4.2.
- Planificador semanal: vista de calendario (semana actual + próxima) donde cada día tiene hasta 3 espacios (desayuno / almuerzo / cena), y cada espacio se asigna a:
  - Una receta del catálogo de recetas del household
  - Quién cocina ese día (un miembro del household)
  - Un multiplicador de porciones (si ese día son más o menos personas de lo habitual)
- "Agregar semana a la lista": botón que recorre todas las recetas planificadas de la semana y las agrega de una sola vez a la lista general (o a una lista de fecha específica), aplicando la misma unificación de cantidades — si el lunes y el miércoles ambos usan cebolla, se suman en un solo item, no se duplican.
- Vista de "qué falta": al ver el plan de la semana, cada receta muestra qué ingredientes ya están comprados/en casa vs. cuáles faltan.
- Con el plan semanal armado, la sugerencia de dónde comprar (sección 4.8) puede anticiparse a lo que se va a necesitar, no solo reaccionar a lo que ya está en la lista.

> Nota de alcance: el planificador semanal es un módulo grande — vale la pena asignarlo como módulo propio en el reparto de trabajo del equipo (sección 12), separado del módulo de "recetas" simple.

### 4.10 Inventario doméstico — pendiente de diseño

Se identificó como idea valiosa pero con un problema de UX real, no resuelto: pedirle al usuario que registre manualmente fechas de vencimiento o cantidades exactas de cada producto en casa es tedioso y probablemente no se usaría de forma consistente.

Enfoques a evaluar antes de comprometerlo a v1 (para decidir en una sesión de diseño aparte):

- **Inferencia pasiva:** en vez de que el usuario registre inventario a mano, se infiere qué probablemente queda en casa a partir del historial de compras + una estimación de "vida útil típica" por categoría de producto (ej. lácteos ~1 semana, enlatados ~meses) — sin pedir fechas de vencimiento reales.
- **Registro binario ligero:** un toggle simple de "se me acabó" sobre productos ya comprados antes, que dispara sugerencia de volver a agregarlo a la lista — mínima fricción, sin cantidades ni fechas.
- **Descartar del alcance actual** y dejarlo como propuesta futura, dado que resolverlo bien requiere investigación de UX que puede no caber en el tiempo del curso.

## 5. Requerimientos no funcionales

- Colaboración en tiempo real: los cambios hechos por un miembro (agregar, tachar, editar) deben reflejarse en los dispositivos de los demás sin refrescar manualmente.
- Responsive real: la misma aplicación debe verse y funcionar bien en desktop y en móvil — un diseño adaptado con los mismos componentes reorganizados, no una versión "recortada".
- PWA instalable: manifest + service worker, para que el usuario pueda instalar la app desde el navegador sin pasar por una tienda de apps.
- Separación clara entre datos de household y datos de listas privadas a nivel de permisos — un fallo aquí sería un problema serio de privacidad.
- Escalabilidad del modelo de datos, sin requerir migraciones destructivas para las features del roadmap futuro.

## 6. Modelo de datos (resumen conceptual)

> Nota de control de acceso: con las listas privadas, la lógica de "¿puede este usuario ver/editar esta lista?" ya no es solo pertenencia a un household — se vuelve una función más general que revisa membresía de household o membresía en `list_collaborators`, según el tipo de lista.

| Entidad | Descripción |
|---|---|
| `households` | Hogar/familia, contenedor raíz |
| `household_members` | Perfiles con rol (admin/miembro) dentro de un household |
| `categories` | Categorías de productos, globales |
| `product_catalog` | Catálogo de productos con categoría; `household_id` nullable (NULL = catálogo global, con valor = producto propio) |
| `product_catalog_staging` | Datos crudos obtenidos por scraping, antes de normalizar/deduplicar hacia `product_catalog` |
| `product_prices` | Precio de un producto en un supermercado en una fecha dada, obtenido por scraping — alimenta las sugerencias de dónde comprar |
| `stores` | Catálogo de supermercados por household |
| `lists` | Lista general, sublista por fecha, o lista privada (`type`: general / date / private); `status`: active / completed / cancelled; `owner_id` para listas privadas |
| `list_items` | Item dentro de una lista, con `quantity_requested`, `quantity_bought`, `size_label`, estado, quién compró, dónde y cuándo |
| `list_collaborators` | Control de acceso a listas privadas — independiente de `household_members`. Columnas: `list_id`, `user_id` (o email de invitado), `invited_at`, `accepted_at` |
| `purchase_sessions` | Agrupa compras por household + supermercado + día, con total editable |
| `recipes` | Receta con porciones base |
| `recipe_ingredients` | Ingrediente de una receta, ligado al catálogo de productos |
| `meal_plans` | Planificador semanal: `household_id`, `date`, `meal_type` (desayuno/almuerzo/cena), `recipe_id`, `assigned_cook` (FK a `household_members`), `servings_multiplier`. Tabla propia, no anotación sobre `lists`, porque un día puede tener hasta 3 comidas independientes. |

Reglas de negocio que deben vivir en la base de datos (funciones/triggers), no en el cliente:

- Merge de cantidades al agregar producto duplicado en una lista.
- Auto-completado de sublista/lista privada cuando todos sus items están comprados.
- Asignación/reutilización de sesión de compra activa por household + store + día.
- Normalización/deduplicación de productos scrapeados antes de pasar de staging al catálogo real.

## 7. Arquitectura técnica

| Capa | Elección | Justificación |
|---|---|---|
| Frontend | React + Next.js — **definido** (por Marcos, para destrabar la creación del repo; sujeto a confirmación del equipo completo) | Next.js aporta SSR/routing robusto y suele ser lo esperado en cursos de desarrollo web. |
| Responsive/PWA | CSS responsive (Flexbox/Grid) + `manifest.json` + service worker (Workbox o plugin nativo del framework elegido) | Requerimiento no funcional central |
| Backend / API | Supabase (Postgres) vía PostgREST + funciones RPC | Complejidad justa para el modelo de datos; RLS para separar datos por household y por lista privada |
| Tiempo real | Supabase Realtime | Necesario para el tachado colaborativo instantáneo |
| Estado remoto en cliente | TanStack Query | Cache, invalidación y optimistic updates |
| Auth | Supabase Auth | — |
| Estilos | Tailwind CSS — **definido** (misma salvedad que el framework) | Curva de aprendizaje más pareja para un equipo de 6 con niveles distintos de experiencia; más estándar y documentado que alternativas pensadas para compatibilidad nativa, que aquí no se necesita al ser 100% web |
| Web scraping | Node.js (Puppeteer/Playwright) o Python (BeautifulSoup/Scrapy) — pendiente de decisión del equipo, según quién lo implemente | Es el componente de mayor riesgo técnico del proyecto, vale la pena decidirlo temprano |

> Nota de decisión explícita: se descartó GraphQL (Hasura o pg_graphql) como capa de API. El modelo de datos es jerárquico y no tiene el problema de over/under-fetching que GraphQL resuelve; PostgREST + RPC de Postgres cubre la necesidad con menor complejidad operativa.

## 8. Referencias de producto (research de mercado)

Apps de lista de compras analizadas como referencia de patrones de UX (no de identidad visual, que es propia del equipo):

- **AnyList:** resuelve bien el catálogo con autocompletado y agrupación automática por categoría/pasillo.
- **Bring!:** identidad visual fuerte con ilustraciones planas y colores vivos diferenciados por categoría.
- **OurGroceries:** checkboxes grandes y táctiles, separación visual clara entre pendiente y comprado sin ocultar lo tachado.

**Conclusión de research:** la sincronización en tiempo real y la organización por categoría son, según fuentes de mercado, los factores que más determinan si un grupo confía o abandona este tipo de apps.

## 9. Dirección de diseño (UI/UX)

**Personalidad:** cálida y hogareña, evocando apps de cocina/familia — sin caer en lo infantil ni en el look genérico de fintech. Identidad visual construida desde cero para este proyecto.

**Tipografía:**
- Títulos: Fraunces (serif cálida, variable font).
- Cuerpo de texto: Public Sans.

**Paleta — Modo claro:**

| Uso | Color | Hex |
|---|---|---|
| Fondo base | Crema cálido | `#FBF6EE` |
| Superficie / cards | Blanco con borde sutil | `#FFFFFF` / borde `#E8DFD0` |
| Acento principal | Teal profundo | `#0E7C7B` |
| Acento secundario | Terracota | `#D97B4F` |
| Texto principal | Marrón casi negro | `#2B2420` |
| Texto secundario | Marrón grisáceo | `#8A7F70` |

**Paleta — Modo oscuro:**

| Uso | Color | Hex |
|---|---|---|
| Fondo base | Marrón muy oscuro (no negro puro) | `#1C1815` |
| Superficie / cards | — | `#26211C` |
| Acento principal | Teal claro/vibrante | `#3EC6C1` |
| Acento secundario | Terracota claro | `#E89A6C` |
| Texto principal | Crema claro | `#F5EFE6` |
| Texto secundario | — | `#B5A997` |

**Principios de UI aplicados:**
- Un solo color de acento saturado (teal) para acciones y estados activos; el terracota se reserva para etiquetas contextuales, nunca compite con el acento principal.
- Ambos modos (claro/oscuro) reciben el mismo nivel de cuidado.
- Checkboxes cuadrados redondeados (no circulares).
- Iconografía consistente estilo outline — sin emojis.
- Micro-interacciones intencionales: animación de check al marcar un item, animación de tachado progresivo.
- Espacio negativo generoso y agrupación clara por categoría.

**Adaptaciones responsive:**
- Desktop: navegación lateral fija (sidebar) con las secciones principales (General, Fechas, Listas privadas, Finanzas, Recetas, Historial).
- Mobile web: tabs inferiores, más usable en pantallas angostas que un sidebar.
- El dashboard financiero y el planificador semanal tienen su propio diseño de pantalla con gráficos y grillas, adaptado a cada tamaño (ver [mockup](mockup-web-v2.html)).

**Mockups de referencia:** prototipo interactivo (HTML) cubriendo vistas desktop y mobile web de: lista general con dashboard, finanzas completas, listas privadas con calendario y estados, y planificador semanal de comidas. Ver [mockup-web-v2.html](mockup-web-v2.html) — v2, todavía por mejorar según el propio equipo.

## 10. Pendientes de definición

- ~~Framework de React definitivo (Next.js vs. Vite)~~ — **Next.js**, definido para destrabar la creación del repo (ver sección 7); llevar a confirmación del equipo completo en la primera reunión.
- ~~Librería de estilos definitiva~~ — **Tailwind CSS**, misma salvedad que el punto anterior.
- Herramienta de web scraping (Node/Puppeteer vs. Python) y quién del equipo lo lidera
- Qué supermercados costarricenses son técnicamente viables de scrapear (revisar robots.txt de cada uno)
- Enfoque final del inventario doméstico (sección 4.10) — decidir antes de comprometerlo o descartarlo del todo
- Nombre/ícono de la app — se propone mantener "Tacha" salvo que el equipo completo prefiera cambiarlo

## 11. Próximos pasos inmediatos

- Revisión de este documento por todo el equipo — agregar comentarios, dudas, y ajustes antes de cerrarlo
- Reunión de equipo para cerrar las decisiones de la sección 10
- Diseñar el schema SQL completo (tablas + RLS + funciones de negocio)
- Definir división de trabajo entre los 6 integrantes según los módulos de este documento

## 12. Propuesta de división de trabajo (borrador, a confirmar en equipo)

Esta división es un punto de partida — el equipo debe ajustarla según intereses y experiencia previa de cada integrante.

| Módulo | Alcance |
|---|---|
| Auth + households + perfiles | Login, creación/invitación de miembros, roles |
| Listas (general + fecha + privadas) + tachado | El core colaborativo de la app |
| Dashboard financiero | Gráficos y agregaciones de gasto |
| Web scraping + catálogo | El pipeline de datos, probablemente el módulo más grande |
| Recetas + planificador semanal | Recetas, calendario de comidas, conexión con listas |
| Diseño/UI + PWA | Sistema de componentes, responsive, instalabilidad |
