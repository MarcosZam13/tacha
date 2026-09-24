# Documento de Proyecto — Tacha

Ver también: [README](../README.md) · [historias-usuario.md](historias-usuario.md) · [sprints.md](sprints.md) · [DESIGN.md](DESIGN.md)

**Estado:** Propuesta formal — v2.2 · **Curso:** Introducción al Desarrollo Web · **Equipo:** 6 integrantes · **Última actualización:** 2026-08-19 (decisiones de la reunión de equipo del 2026-08-16 + segunda reunión del 2026-08-18 + pasada de alineación del 2026-08-19)

> Reunión de equipo completa el domingo 2026-08-16 (~2.5h): se confirmó el stack y la base de datos (sección 7) — queda pendiente solo la confirmación del profesor. Se cerraron varias de las preguntas de la [sección 10](#10-pendientes-de-definición) original; el resto de definiciones nuevas quedan en esa misma sección.
>
> Además, el 2026-08-18 se agregaron dos requerimientos nuevos propuestos por Marcos — [grupos de productos](#411-grupos-de-productos-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) y [mis productos personalizados](#451-mis-productos-personalizados-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) — aceptados para destrabar el diseño de interfaz de hoy (mismo criterio que se usó con Next.js/Tailwind antes de la reunión del 2026-08-16, ver sección 7) y **confirmados por el equipo completo el 2026-08-19**, ya como parte cerrada del alcance de trabajo.
>
> El mismo 2026-08-18, en una segunda reunión, el equipo desglosó los requerimientos en épicas/historias de usuario/criterios de aceptación — ver [historias-usuario.md](historias-usuario.md) (v2.0, completo, en revisión de equipo). Ese desglose sacó a la luz requerimientos del profesor para la landing pública y la autenticación que no estaban documentados acá (sección 4.12), afinó cómo se resuelve la unificación de marca en el catálogo (secciones 4.5, 4.8), y corrigió el alcance real de la reconciliación de cantidades (secciones 4.3, 4.9.1, 4.11).
>
> **2026-08-19 (primera pasada):** el equipo confirmó el alcance del rol "Administrador" (ver [historias-usuario.md, sección Roles](historias-usuario.md#roles)) y la decisión sobre listas personales al unirse a un household (sección 4.1 más abajo) — ambas cerraban preguntas abiertas de la [sección 10](#10-pendientes-de-definición).
>
> **2026-08-19 (segunda pasada, v2.2):** al revisar el desglose completo de historias de usuario, Marcos confirmó varios ajustes que cambian el rumbo original en algunos puntos — se documentan acá para que quede una sola fuente de verdad, no dos versiones distintas de la misma idea:
> - Un usuario pertenece como máximo a **un** household, no a varios (simplifica 4.1 — ya no hace falta selector de household en la interfaz).
> - Los ingredientes de una receta quedan ligados a su producto desde que se crea la receta, con cantidad y unidad propias — no como "medida suelta" a resolver después (4.9, 4.9.1).
> - "Modo compra" se simplifica a selector de supermercado + la misma lista de siempre, con toda la fila tocable para tachar (no solo un checkbox) — no es una pantalla nueva compleja (4.2.2, nueva).
> - El registro de quién/dónde/cuándo/cuánto de cada compra aplica también dentro de listas privadas, no solo en household (4.2, 4.6).
> - El inventario doméstico se amplía con seguimiento real de vencimientos y una pantalla propia "Mi inventario", revirtiendo parcialmente el enfoque "solo sugerencias" del 2026-08-16 (4.10).
> - Se agregó la sección 4.13 (Configuración), que faltaba, para el ajuste de "encargado" por lista.
> - Se resolvió qué pasa si el admin de un household sale (4.1).
> - El modelo de datos de la sección 6 se alineó con todo lo anterior — se armó antes del documento final y de las historias de usuario, así que esta es la primera pasada real de coherencia entre los tres.
>
> **2026-08-27:** Daniel (responsable del módulo de catálogo + web scraping, sección 12) entregó su rediseño del schema de ese módulo — ver [modulo-catalogo-scraping.md](catalogo-scraping/README.md). Su pregunta sobre `stores` ("por household" era ambiguo: ¿household elige entre las 3 tiendas soportadas, o define tiendas propias arbitrarias?) quedó resuelta por el equipo: es lo primero. `stores` se mantiene como catálogo fijo de 3 filas sembradas (MaxiPali, Walmart CR, MasXMenos), y se agrega `household_store_preferences` como tabla puente — ver fila actualizada más abajo.

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
| Gestión de usuarios, familias y perfiles | Sí | Auth + creación/pertenencia a household — **pertenecer a un household es opcional**, ver [4.1 Gestión de usuarios, familias y perfiles](#41-gestión-de-usuarios-familias-y-perfiles) |
| Lista general con dashboard financiero | Sí | Gasto por día/producto/categoría/súper/persona; existe también para un usuario sin household (uso solo) |
| Sublistas por fecha (calendario) | Sí | Estado: pendiente / completada / cancelada; fusión opcional con la general; también disponible sin household |
| Listas privadas (no familiares) | Sí | Independientes del household siempre, con invitados propios (ver [4.4 Listas privadas (independientes del household)](#44-listas-privadas-independientes-del-household)) |
| Catálogo de productos y categorías | Sí | Poblado inicialmente por web scraping; con imagen, marca y variantes de tamaño (ver [4.5 Catálogo de productos y categorías](#45-catálogo-de-productos-y-categorías)) |
| Web scraping de productos/precios | Sí — prioridad alta | Motor central del proyecto, ver [4.7 Web scraping — motor de datos (prioridad alta del proyecto)](#47-web-scraping--motor-de-datos-prioridad-alta-del-proyecto) |
| Sugerencias de dónde comprar | Sí | Basado en precios obtenidos por scraping + historial propio |
| Historial de compras | Sí | Sesiones de compra por household/súper/día, edición rápida (ver [4.6 Historial de compras](#46-historial-de-compras)) |
| Recetas y planificador semanal de comidas | Sí | Ver [4.9 Recetas y planificador semanal de comidas](#49-recetas-y-planificador-semanal-de-comidas) |
| Inventario doméstico | Sí — opcional, no obligatorio | Ampliado 2026-08-19 con seguimiento real de vencimientos y pantalla propia "Mi inventario" (antes solo sugerencias pasivas); sigue sin ser obligatorio para el resto de la app. Ver [4.10 Inventario doméstico](#410-inventario-doméstico) |
| Grupos de productos | Sí | Agregar varios productos frecuentes a la lista de un solo toque, sin buscar uno por uno. Ver [4.11 Grupos de productos (aceptado 2026-08-18, confirmado por el equipo 2026-08-19)](#411-grupos-de-productos-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) |
| Mis productos personalizados | Sí | Ver, editar y agregar productos propios no cubiertos por el scraping. Ver [4.5.1 Mis productos personalizados (aceptado 2026-08-18, confirmado por el equipo 2026-08-19)](#451-mis-productos-personalizados-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) |
| Landing pública, About y autenticación extendida | Sí | Requerimiento del profesor + reunión de equipo 2026-08-18: página pública para visitantes ("Mirones"), reCAPTCHA, OAuth (Google/Facebook), JWT, recuperación de contraseña. Ver [4.12](#412-acceso-público-y-autenticación-extendida-landing-about-auth) |
| Geolocalización / geofencing | Fuera de alcance | Descartado por complejidad para el contexto del curso |

### Roadmap post-curso (opcional, si el equipo decide continuar)

- Notificaciones push web
- Versión de app nativa/instalable más avanzada
- Inventario doméstico completo, si el enfoque ligero valida bien con usuarios reales

## 4. Requerimientos funcionales detallados

### 4.1 Gestión de usuarios, familias y perfiles

- Autenticación de usuarios (Supabase Auth).
- **Decisión 2026-08-16: pertenecer a un household es opcional.** La app es completamente usable sin estar asociado a ninguna familia — un usuario solo tiene su propia lista general y sus sublistas por fecha, además de las listas privadas (que ya eran independientes del household). Ver implicación de modelo de datos en [6. Modelo de datos (resumen conceptual)](#6-modelo-de-datos-resumen-conceptual).
- **Cardinalidad de household (decidido 2026-08-19, simplifica una decisión previa):** un usuario pertenece, como máximo, a **un solo household** a la vez — no a varios. Se prefirió esta simplicidad explícitamente para no necesitar un selector de "household activo" en la interfaz (ver [historias-usuario.md](historias-usuario.md)). Dentro de ese household tiene un rol (admin/miembro). No está obligado a pertenecer a ninguno para usar el resto de la app, y puede salir del suyo para unirse a otro (nunca pertenece a dos a la vez).
- Perfil básico: nombre, foto opcional, el household al que pertenece (puede ser ninguno).
- Solo el admin de un household invita nuevos miembros.
- **Invitación por link (detallado 2026-08-18):** el admin genera un link de invitación al household (mismo mecanismo que ya se usaba para listas privadas, sección 4.4), en vez de invitar por correo uno por uno. El admin puede consultar la lista de familiares y eliminar a un miembro. La lista de miembros se puede buscar y se carga por partes si el household crece mucho.
- **Salir del household y household sin admin (decidido 2026-08-19):** cualquier miembro puede salir de su household en cualquier momento. Si quien sale es el admin y hay otros miembros, debe elegir a quién transferir el rol antes de salir (no puede quedar un household sin admin). Si el admin es el único miembro y sale, el household se elimina junto con su link de invitación — no queda un household vacío dando vueltas.
- **Listas personales al unirse a un household (decidido 2026-08-19, cierra el pendiente del 2026-08-16):** cuando un usuario que ya tenía lista general y/o sublistas propias se une o crea un household, se le pregunta si quiere mantenerlas como personales o pasarlas al household — la decisión se toma una sola vez, al momento de unirse, y aplica al conjunto de listas personales que tenía hasta ese momento (no lista por lista). Si elige mantenerlas personales, siguen siendo solo suyas. Si elige pasarlas, quedan visibles para todo el household, igual que si las hubiera creado ya siendo parte de él. Cualquier lista que cree después de unirse sigue las reglas normales del household, sin volver a preguntarle. Ver flujo en [historias-usuario.md](historias-usuario.md#epic-grupo-familiar-household) y pantalla en [DESIGN.md 7.15](DESIGN.md#715-crear-o-unirse-a-un-household).
- **Rol "Administrador" (confirmado 2026-08-19):** no existe un rol de administración global de la plataforma — "Administrador" se refiere únicamente al rol `admin` dentro de un household (`household_members.role`), con las capacidades ya descritas arriba (invitar, consultar y eliminar miembros). No hay alcance adicional pendiente de definir.

### 4.2 Lista general y dashboard financiero

- **Los 3 tipos de lista (general, sublista por fecha, privada) existen siempre; solo la general y la sublista por fecha se asocian a un household, y únicamente si el usuario pertenece a uno** (decisión 2026-08-16). Sin household, esas dos siguen existiendo pero son personales (`household_id` nulo, `owner_id` = el usuario). Las listas privadas nunca se asocian a un household — ver [4.4 Listas privadas (independientes del household)](#44-listas-privadas-independientes-del-household).
- Lista general infinita por household (o personal si no hay household), con productos organizados por categoría — el orden por categoría se prioriza para que reproduzca un recorrido lógico de compra (ver [4.5 Catálogo de productos y categorías](#45-catálogo-de-productos-y-categorías)).
- Catálogo de productos seleccionable con autocompletado (no texto libre exacto), cada producto con categoría asignada; posibilidad de crear producto nuevo con su categoría si no existe.
- Etiqueta de tamaño por item (ej. "1L", "paquete de 12"), específica de cada instancia en la lista — corresponde a una variante del catálogo, ver [4.5 Catálogo de productos y categorías](#45-catálogo-de-productos-y-categorías).
- Unificación automática de cantidades cuando dos o más miembros agregan el mismo producto **con la misma unidad/tamaño** a la misma lista, con desglose de quién pidió cuánto. Cuando la unificación cruza recetas o el plan semanal (tamaños/unidades no directamente comparables, ej. litros vs. caja), no se sigue esta regla automática — se aplica la reconciliación asistida de la [sección 4.9](#49-recetas-y-planificador-semanal-de-comidas).
- Tachado con registro de: quién compró, dónde, cuándo, cantidad — se distingue cantidad pedida de cantidad realmente comprada. La edición de qué se compró (cantidad/tamaño real) tiene que ser rápida, sin fricción, porque alimenta directamente las finanzas (ver [4.6 Historial de compras](#46-historial-de-compras)). **Este registro por persona aplica también dentro de una lista privada, no solo en household (afinado 2026-08-19)** — ej. en un viaje con amigos, cada quien ve quién compró qué y cuánto gastó, útil para que el grupo se organice entre ellos (Tacha no calcula ni cobra nada, solo muestra el dato).

#### 4.2.2 Modo compra — interfaz simplificada (agregado 2026-08-19)

Corrige el rumbo original de "modo compra": la idea del equipo no es una pantalla nueva compleja, sino **simplificar** la vista de lista que ya existe al momento de comprar.

- Al iniciar una compra, lo único que se pide primero es elegir el supermercado (selector simple). El resto de la pantalla reusa el mismo formato de lista de siempre (agrupada por categoría, mismo `item-row`), sin agregar controles nuevos.
- **Tachar deja de depender de un checkbox como único punto de toque:** toda la fila del producto es el área táctil — tocar en cualquier parte de la fila (fuera de los controles de cantidad) tacha/destacha el producto. El checkbox cuadrado redondeado sigue existiendo como indicador visual del estado (tachado/pendiente), pero ya no es el único lugar donde hay que acertarle con el dedo. Este mismo criterio aplica a la lista general fuera de modo compra, no solo durante la compra.
- Al tachar, el sistema registra automáticamente quién lo compró (el usuario actual), cuándo (fecha/hora de la sesión) y dónde (el supermercado elegido al iniciar); la cantidad realmente comprada se puede ajustar en el mismo toque (ver edición rápida post-compra, [DESIGN.md 7.5](DESIGN.md#75-edición-rápida-de-item-comprado-al-tachar)).
- Estos datos (quién, dónde, cuándo, cuánto) son los que alimentan tanto el historial de compras ([4.6](#46-historial-de-compras)) como el desglose por persona del dashboard financiero ([4.2](#42-lista-general-y-dashboard-financiero)) — y ahora también dentro de una lista privada, no solo en household.
- **Edición rápida de un item ya en la lista (antes de comprarlo):** cambiar cantidad, cambiar de variante (tamaño o marca, ej. pasar de "caja 1L" a "galón" del mismo producto) o quitar el item — todo en 1-2 toques desde la fila misma, sin abrir una pantalla aparte. Es la misma necesidad de baja fricción que motiva los [grupos de productos](#411-grupos-de-productos-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19): cuanto más rápido se agregan y ajustan varios items, menos fricción para usar la lista todos los días.
- Dashboard financiero: gasto total por día/semana/mes, desglose por categoría de producto, desglose por supermercado, desglose por persona (quién ha comprado más/gastado más), y productos específicos más comprados o más costosos. El usuario debe ver siempre presente el aviso de que los precios son estimados (ver [4.6 Historial de compras](#46-historial-de-compras)).

#### 4.2.1 Interacciones concretas de la fila de producto (detallado 2026-08-18, desde el desglose de historias de usuario)

Ver [historias-usuario.md](historias-usuario.md) para las HU/CA originales de este detalle.

- Barra de búsqueda arriba de la lista con resultados en tiempo real; al seleccionar un resultado, se agrega con cantidad por defecto = 1, sin recargar la pantalla.
- Cantidad con controles "+"/"-" junto al número; "+" incrementa de a 1, "-" decrementa de a 1 sin poder bajar de 1 (para bajar a 0, se usa eliminar, no el "-").
- Tocar la fila (fuera del checkbox y de los controles de cantidad) abre el detalle del producto: marca(s), presentación/variante y precio de referencia.
- Eliminar tiene su propio ícono; al eliminar se remueve de inmediato y aparece un toast breve "Producto eliminado" con opción de deshacer.
- El checkbox de tachado es reversible: tocarlo de nuevo destacha el producto sin perder su lugar en la lista.
- **Jerarquía visual de la fila (para no saturarla):** siempre visibles: nombre + tamaño, cantidad, precio. En una segunda línea, texto más chico: tag de origen (general/sublista/receta/grupo) — solo si hay mezcla de orígenes en la lista, si todo es de la lista general no se muestra; y "encargado" (quién debe comprar ese item) — solo si esa función está activada, es opcional y se activa por lista (general, sublista o privada) desde configuración. El ícono del supermercado solo aparece cuando hay un filtro de "más barato" o "más cercano" activo.
- **Presupuesto estimado (nuevo 2026-08-18):** un número grande y editable, calculado por defecto como la suma de los precios mínimos de cada item de la lista entre todos los supermercados rastreados — es el ancla que el usuario ajusta rápido por día/semana/mes para auto-administrarse. Si el usuario filtra o selecciona un supermercado específico, el estimado se recalcula usando el rango de precios de ese supermercado en particular. Es un dato distinto del gasto real editable de la [sección 4.6](#46-historial-de-compras): el estimado mira hacia adelante (antes de comprar), el gasto real mira hacia atrás (después de comprar) — el dashboard financiero muestra ambos uno al lado del otro para que el usuario vea si se desvió.

### 4.3 Sublistas por fecha (con calendario)

- Vista de calendario para crear y visualizar listas asociadas a una fecha (viaje, evento familiar).
- Cada sublista tiene su propio total de gasto, independiente del total general.
- Estado de la sublista: pendiente, completada (todos los items comprados), o cancelada (el usuario puede cancelar explícitamente una sublista que ya no se va a comprar, sin que cuente como pendiente eternamente ni se borre el registro).
- Sesión de compra combinada (opcional): al iniciar una compra desde una sublista, se puede fusionar visualmente con la lista general — agrupando por producto en tres bloques (solo en general / repetidos en ambas, como filas independientes por lista / solo en la sublista), sin fusionar los registros de datos. Cada fila conserva su propia lista de origen, cantidad y estado.
- **Corrección 2026-08-18:** esta fusión **no** pasa por la reconciliación asistida de la [sección 4.9.1](#491-reconciliación-de-cantidades-al-combinar-listas-decisión-2026-08-16-alcance-corregido-2026-08-18) — un item de sublista ya es una unidad concreta de un `product_catalog_variants` (mismo producto+tamaño), así que si el mismo producto está en ambas listas, sumar cantidades es directo, sin ambigüedad. La reconciliación solo hace falta cuando el origen es una medida cruda sin unidad de catálogo asociada (recetas/plan semanal, ver 4.9.1).

### 4.4 Listas privadas (independientes del household)

Una lista privada:

- La crea cualquier usuario individual, no está atada a ningún household.
- El creador invita a quien quiera (amigos, compañeros de viaje) por correo o link — los invitados no necesitan ser miembros de ningún household del creador, ni familiares entre sí.
- Vive en una vista de calendario separada ("Mis listas privadas").
- Tiene la misma lógica de tachado, unificación de cantidades y estado (pendiente/completada/cancelada) que las sublistas familiares — se reutiliza el mismo motor de listas, solo cambia el modelo de quién tiene acceso.
- Implicación de arquitectura: el acceso a una lista no puede resolverse solo por pertenencia a un household. Se necesita una tabla de colaboradores por lista, independiente de los miembros del household (ver [6. Modelo de datos (resumen conceptual)](#6-modelo-de-datos-resumen-conceptual)).

### 4.5 Catálogo de productos y categorías

- Catálogo global compartido entre todos los usuarios + productos propios por household (si un household necesita algo muy específico que no está en el catálogo global).
- El catálogo global se puebla principalmente mediante el pipeline de web scraping ([sección 4.7](#47-web-scraping--motor-de-datos-prioridad-alta-del-proyecto)); el ingreso manual queda como fallback/complemento.
- **Decisión 2026-08-16 — catálogo estilo Uber Eats:** buscar "leche" debe mostrar tarjetas con foto, nombre y las distintas presentaciones/tamaños disponibles (caja 1L, caja 200ml, galón, etc.), no una sola fila de texto.
- **Corrección 2026-08-18 — "producto madre" y marca como detalle, no como variante:** en la reunión del 2026-08-18 el equipo notó que tener una variante de catálogo por cada combinación producto+marca+tamaño (ej. 10 productos distintos solo para "leche") es tedioso de elegir para un usuario común, y peor para adultos mayores — además el súper puede no tener esa marca puntual el día que el usuario compra. Se unifica por **tamaño**, no por marca: `product_catalog` pasa a ser el "producto madre" (ej. "Leche"), y `product_catalog_variants` sigue siendo por tamaño (ej. "Leche — caja 1L", "Leche — galón") pero ya **no** incluye la marca en su identidad. La marca se mueve al detalle del producto: un listado corto de marcas disponibles (con logo) y, al lado de cada una, el precio aproximado por supermercado. El tamaño sí se mantiene como variantes de catálogo independientes (leche en caja, en bolsa o en galón aparecen por separado), porque el tamaño sí es cantidad real que entra en las finanzas y en la reconciliación de la [sección 4.9.1](#491-reconciliación-de-cantidades-al-combinar-listas-decisión-2026-08-16-alcance-corregido-2026-08-18) — la marca no.
- Implicación directa para el scraping (sección 4.7): el pipeline sigue capturando datos a nivel de marca+tamaño+súper (es lo que realmente hay en las páginas scrapeadas, incluida la URL de imagen), pero el catálogo los agrupa por producto madre + tamaño para mostrarlos — riesgo a validar con quien lidere ese módulo.
- Búsqueda y navegación priorizan categoría por encima de todo: filtro/browse por categoría como primer nivel, y las listas se ordenan y agrupan por categoría (no alfabético ni por fecha de agregado) para que el usuario pueda recorrer la tienda en un orden lógico al comprar.

#### 4.5.1 Mis productos personalizados (aceptado 2026-08-18, confirmado por el equipo 2026-08-19)

> Propuesta de Marcos, aceptada el 2026-08-18 para destrabar el diseño de interfaz y **confirmada por el equipo completo el 2026-08-19**.

Ya existía la idea de "producto propio por household" (primer bullet de esta sección), pero sin una pantalla propia ni la posibilidad de asociarlo a una tienda específica. Se propone una sección dedicada — "Mis productos" — donde el usuario ve, edita y agrega productos que él conoce pero que no están en el catálogo global scrapeado, por ejemplo algo que solo se consigue en una carnicería puntual o en un súper que el pipeline de scraping no cubre.

- Un producto personalizado se crea igual que cualquier otro (nombre, marca, categoría, variantes de tamaño), pero queda marcado como `source: manual` en vez de `source: scraped` — ver [6. Modelo de datos (resumen conceptual)](#6-modelo-de-datos-resumen-conceptual).
- Opcionalmente se le puede asociar una tienda conocida (ej. "Carnicería Los Ángeles") y un precio de referencia que el propio usuario ingresa — esto reusa `product_prices`, solo que con `source: manual` en vez de venir del scraping, para no mezclar señales de confianza distinta cuando se calculan las [sugerencias de dónde comprar](#48-sugerencias-de-dónde-comprar).
- Visualmente debe distinguirse del catálogo global (ej. un badge "Agregado por mí") para que el usuario sepa que ese precio no viene de scraping y puede estar desactualizado — mismo espíritu que el aviso de precios estimados de la [sección 4.6](#46-historial-de-compras).
- **Visibilidad (decidido 2026-08-18):** un producto personalizado sigue el mismo patrón `owner_id` + `household_id` nullable que las listas (sección 4.1/4.2) — personal si el usuario no pertenece a household o no lo comparte explícitamente, visible para todo el household si sí. Mismo criterio aplicado a [grupos de productos](#411-grupos-de-productos-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) más abajo, para no mantener dos modelos de acceso distintos por una diferencia que no lo amerita.

### 4.6 Historial de compras

- Sesiones de compra agrupadas por household + supermercado + día, con total editable (no se captura precio por item individual) — **confirmado en la reunión 2026-08-16** como la mejor solución práctica: pedir precio por producto sería más exacto para el desglose por categoría, pero es demasiada fricción; el total editable a mano es el balance elegido, aceptando que introduce una desviación entre el total real y el desglose por categoría/producto que se muestra en el dashboard.
- El historial se puede ver y filtrar por día, semana o mes, mostrando el total gastado de ese periodo — y ese total (igual que el de cada sesión individual) es editable directamente, sin tener que entrar producto por producto, porque el usuario suele terminar gastando distinto de lo que la app calculó.
- Editar qué se compró realmente (cantidad y tamaño/variante, ej. "1 galón" en vez de "2 cajas pequeñas") tiene que ser rápido y de baja fricción en el momento del tachado — esta distinción sí importa para las finanzas aunque no se capture precio por item.
- Si una sesión queda sin total ingresado por un tiempo, se recuerda al usuario; si se ignora, queda visible en el historial como "sin total", editable en cualquier momento.
- **Filtrado de compra (agregado 2026-08-18):** además del filtro por periodo (día/semana/mes), el historial se puede filtrar por supermercado y por categoría de producto.
- **Aviso obligatorio y siempre visible al usuario:** los precios no son fijos ni garantizados — Tacha no está asociado a ningún supermercado, los precios del catálogo vienen de scraping y pueden no coincidir con lo que se cobra en caja. Debe quedar claro en el dashboard y cerca de cualquier precio sugerido.
- Alimenta directamente el dashboard financiero de la [sección 4.2](#42-lista-general-y-dashboard-financiero).

### 4.7 Web scraping — motor de datos (prioridad alta del proyecto)

- Objetivo: extraer de sitios oficiales de supermercados costarricenses (a definir cuáles son técnicamente viables de scrapear) nombre de producto, categoría, precio y supermercado.
- Este pipeline alimenta: el catálogo de productos ([4.5](#45-catálogo-de-productos-y-categorías)) y los datos de precio usados en las sugerencias de dónde comprar ([4.8](#48-sugerencias-de-dónde-comprar)).
- Consideraciones a resolver como equipo antes de implementar:
  - Revisar robots.txt y términos de servicio de cada sitio antes de scrapear — documentar la decisión por cada supermercado incluido.
  - Frecuencia de actualización (scraping bajo demanda vs. programado) y dónde corre (script periódico, función serverless, etc.).
  - Los datos scrapeados deben pasar por una tabla de "staging" y un proceso de normalización/deduplicación antes de insertarse al catálogo real, para no ensuciarlo con productos duplicados o mal categorizados.
  - Es razonable que este componente sea el que más tiempo de desarrollo tome del equipo — vale la pena asignarlo a quien tenga más experiencia con scraping/backend.

### 4.8 Sugerencias de dónde comprar

- A partir de los precios obtenidos por scraping, sugerir el supermercado más barato para los productos pendientes de una lista.
- Complementa el historial propio de compra: si el usuario ya tiene el hábito de comprar cierto producto en cierto lugar, se muestran ambas señales (precio de mercado vs. hábito personal).
- **Precio por producto — rango, no promedio (decidido 2026-08-18):** ya que la marca se unificó al producto madre (sección 4.5), el precio de un producto+tamaño en un supermercado se muestra como **rango** entre las marcas disponibles ahí (ej. "₡800–₡1200"), no como promedio — un promedio esconde que el usuario puede llevarse la opción barata. Por defecto (sin filtro de supermercado activo) se muestra el rango agregado entre todos los supermercados rastreados; si el usuario filtra o selecciona un supermercado específico, el rango se recalcula solo con ese supermercado. En el detalle del producto se muestra el desglose completo: precio aproximado por cada supermercado, con su ícono, de forma visual (no una tabla plana).

### 4.9 Recetas y planificador semanal de comidas

- Recetas: porciones base y una lista de ingredientes. **Al crear o editar una receta (afinado 2026-08-19):** por cada ingrediente, el usuario elige un producto del catálogo (el producto madre, ej. "Leche" — no una presentación/tamaño concreto) y le asigna una cantidad cruda con su unidad (ej. "500 ml", "3 unidades", "2 tazas"). Esto es lo que deja al ingrediente ya vinculado a un producto desde el momento en que se crea la receta, sin necesitar ninguna pantalla aparte para resolverlo después. Botón de "Agregar receta a lista" que aplica la lógica de unificación de cantidades de la [sección 4.2](#42-lista-general-y-dashboard-financiero).
- Planificador semanal: vista de calendario (semana actual + próxima) donde cada día tiene hasta 3 espacios (desayuno / almuerzo / cena), y cada espacio se asigna a:
  - Una receta del catálogo de recetas del household
  - Quién cocina ese día (un miembro del household)
  - Un multiplicador de porciones (si ese día son más o menos personas de lo habitual)
- "Agregar semana a la lista": botón que recorre todas las recetas planificadas de la semana y las agrega de una sola vez a la lista general (o a una lista de fecha específica), aplicando la misma unificación de cantidades — si el lunes y el miércoles ambos usan cebolla, se suman en un solo item, no se duplican.
- Vista de "qué falta": al ver el plan de la semana, cada receta muestra qué ingredientes ya están comprados/en casa vs. cuáles faltan.
- Con el plan semanal armado, la sugerencia de dónde comprar ([4.8](#48-sugerencias-de-dónde-comprar)) puede anticiparse a lo que se va a necesitar, no solo reaccionar a lo que ya está en la lista.

> Nota de alcance: el planificador semanal es un módulo grande — vale la pena asignarlo como módulo propio en el reparto de trabajo del equipo ([sección 12](#12-propuesta-de-división-de-trabajo-borrador-a-confirmar-en-equipo)), separado del módulo de "recetas" simple.

### 4.9.1 Reconciliación de cantidades al combinar listas (decisión 2026-08-16, alcance corregido 2026-08-18)

Problema discutido en la reunión: al agregar una receta o el plan semanal completo a la lista general, las cantidades no siempre se pueden sumar de forma automática y confiable. **Afinado 2026-08-19, en conjunto con la sección 4.9:** como cada ingrediente ya queda ligado a su producto madre con cantidad y unidad desde que se crea la receta, la app sabe de una vez si esa unidad es un conteo simple o una medida de volumen/peso, y con eso decide sola si hace falta o no la reconciliación asistida de abajo. Con unidades sueltas (ej. "3 cebollas") la suma es trivial y directa, sin ningún paso adicional. Con productos por volumen/peso que existen en múltiples presentaciones (ej. leche: caja de 1L, caja de 200ml, galón de 3.78L) la app **no puede decidir bien por el usuario** — si ya tiene apuntada 1 caja pequeña y la receta necesita 2 litros más el plan semanal, la decisión de comprar otra caja pequeña vs. un galón (más barato por litro) depende de matices que la app no conoce con certeza.

> **Corrección de alcance (2026-08-18):** esta reconciliación **solo aplica a recetas y al plan semanal**, no a sublistas ([4.3](#43-sublistas-por-fecha-con-calendario)) ni a [grupos de productos](#411-grupos-de-productos-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) (4.11). La diferencia: un ingrediente de receta es una **medida cruda** ("500ml de leche") sin unidad de catálogo asociada, mientras que un item de lista, de sublista o de grupo **ya es una unidad concreta** de un `product_catalog_variants` ("1 caja de 1L"). Combinar dos cosas que ya son unidades concretas del mismo producto+tamaño es una suma directa, sin ambigüedad — la ambigüedad nace específicamente de convertir una medida cruda en una decisión de compra, y eso solo pasa con recetas/plan semanal.

**Decisión del equipo: la app calcula el déficit, el usuario elige qué hacer — y en el momento en que realmente lo sabe, no antes.** Flujo en dos etapas (revisado 2026-08-18, ver [historias-usuario.md](historias-usuario.md)):

1. Todo producto por volumen/peso normaliza su cantidad a una unidad base (ml, g) en el catálogo, independientemente de en qué presentación se vende — ver `product_catalog_variants` en [6. Modelo de datos (resumen conceptual)](#6-modelo-de-datos-resumen-conceptual).
2. **Al combinar (receta → lista, o semana → lista):** no hay modal de decisión. Se suma en unidad base contra lo que el usuario ya tenía apuntado, y si no alcanza, se muestra un **tag pasivo e informativo** bajo el item ya existente en la lista: "+ se necesitan 500ml más para Receta X" — nada que decidir todavía, porque a esta altura el usuario ni siquiera fue a comprar.
3. **Al tachar ese item específico:** ahí es cuando el usuario sabe qué hizo realmente. Aparece un paso corto y rápido tipo "¿Qué hiciste?" con acciones de un toque: "Agregué otra igual", "Cambié a una más grande/otra presentación" (mostrando las opciones del catálogo, idealmente ordenadas por precio — [4.8](#48-sugerencias-de-dónde-comprar)), o "Ya tenía suficiente" (descarta el tag sin agregar nada). No se le pregunta al usuario que prediga el futuro al armar la lista — se le pregunta cuando ya compró.
4. No se intenta adivinar ni auto-convertir a la presentación "óptima" en ningún momento — la app nunca decide sola cuál presentación comprar.

Esto convierte un problema de cálculo que "no siempre puede salir bien" en una decisión asistida en el momento correcto: la app hace el trabajo aritmético y lo muestra sin interrumpir, la persona decide el matiz de compra recién cuando de verdad lo sabe.

### 4.10 Inventario doméstico

**Decisión 2026-08-16, ampliada 2026-08-19:** se incluye en v1 como función opcional, nunca obligatoria — eso no cambia. Lo que sí cambia es el alcance: el equipo decidió que solo sugerencias pasivas se quedaban cortas, y quiere un inventario real donde el usuario pueda ver qué tiene en casa y cuándo se le vence. **El riesgo de UX que motivó la versión ligera del 2026-08-16 sigue siendo válido y hay que seguir evitándolo** — por eso el diseño de esta ampliación mantiene todo como opcional y de un toque en vez de formularios, en lugar de simplemente agregar un campo de fecha obligatorio.

**Enfoque (revisado 2026-08-19): capa de inferencia + captura rápida opcional + una pantalla de inventario real.**

- **La inferencia pasiva se mantiene como motor por defecto**, igual que antes: a partir del historial de compras + una "vida útil típica" por categoría, la app estima en silencio qué productos probablemente siguen en casa y cuándo se les acabaría la vida útil — sin pedir nada al usuario para que esto funcione.
- **Captura rápida de vencimiento al tachar un producto (nueva, opcional):** justo cuando el usuario marca un producto como comprado, puede — sin obligación — indicar cuánto le va a durar con chips de un toque ("Vence en pocos días", "2-4 semanas", "1-3 meses", "No vence / no aplica"), en vez de un selector de fecha exacta. Si no toca nada, la app sigue usando su estimación por categoría igual que antes.
- **Pantalla "Mi inventario" (nueva):** a diferencia del widget de sugerencias de un toque (que se queda en la vista General), esta es una pantalla propia donde el usuario ve todo lo que la app cree que tiene en casa, agrupado por urgencia (vence pronto / este mes / sin fecha estimada). Desde ahí puede: marcar un producto como "ya se acabó" (lo saca del inventario antes de su fecha estimada), ajustar cuándo cree que se le va a vencer, o agregar manualmente algo que ya tenía en casa y no vino de una compra hecha en Tacha (ej. algo que ya tenía antes de usar la app).
- El widget de sugerencias de un toque ("¿Se te acabó la leche?") sigue existiendo en la vista General tal como se diseñó — sigue siendo la interacción principal del día a día; "Mi inventario" es para quien quiera más detalle o control, no reemplaza el atajo rápido.
- Ninguna otra funcionalidad (listas, recetas, finanzas) depende de que el inventario esté completo o actualizado — sigue siendo una herramienta, nunca un requisito.

### 4.11 Grupos de productos (aceptado 2026-08-18, confirmado por el equipo 2026-08-19)

> Propuesta de Marcos, surgida después de la reunión de equipo del 2026-08-16 — aceptada el 2026-08-18 para poder generar la interfaz en [DESIGN.md](DESIGN.md) sin dejar huecos, y **confirmada por el equipo completo el 2026-08-19**.

**Problema que resuelve:** hay productos que un usuario compra casi siempre juntos o el mismo día, por una rutina propia — ej. cada 15 días: arroz, frijoles, carnes. Hoy la única forma de agregarlos a la lista es uno por uno desde el catálogo (sección 4.5), aunque siempre sean el mismo combo. Recetas (sección 4.9) ya resuelve un problema parecido para "ingredientes de una preparación", pero un grupo de productos no es una receta — no tiene porciones ni se cocina, es simplemente un combo de compra frecuente.

- Un grupo de productos es una lista corta y nombrada por el usuario (ej. "Mercado quincenal", "Desayunos de la semana") de productos del catálogo (globales, de household, o [personalizados](#451-mis-productos-personalizados-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19)), cada uno con una cantidad/variante por defecto.
- Botón "Agregar grupo a lista", igual en espíritu al "Agregar receta a lista" de la sección 4.9 — agrega todos los productos del grupo de una sola vez, sin tener que buscar producto por producto en el catálogo.
- **Corrección 2026-08-18:** a diferencia de recetas/plan semanal, un producto de grupo ya es una unidad concreta de catálogo (mismo caso que sublistas, ver [4.9.1](#491-reconciliación-de-cantidades-al-combinar-listas-decisión-2026-08-16-alcance-corregido-2026-08-18)) — si ya está en la lista, se suma la cantidad directamente, sin pantalla de reconciliación.
- Un grupo se crea/edita desde una sección propia ("Mis grupos"), con alta rápida de productos (mismo patrón de búsqueda estilo catálogo de la sección 4.5, no un formulario largo).
- **Visibilidad (decidido 2026-08-18):** mismo patrón `owner_id` + `household_id` nullable que las listas (sección 4.1/4.2) y que [productos personalizados](#451-mis-productos-personalizados-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) — un grupo es personal por defecto, y se puede compartir con el household si el usuario pertenece a uno. Se reusa el patrón existente en vez de inventar un modelo de acceso distinto.
- No incluye por ahora recordatorios ni periodicidad automática (el "cada 15 días" queda como hábito del usuario, no como una function que la app programe) — se deja como idea de roadmap si el equipo quiere retomarla más adelante, no como parte de esta propuesta.

### 4.12 Acceso público y autenticación extendida (landing, about, auth)

> Requerimiento del profesor del curso + desglose de la reunión de equipo del 2026-08-18. Detalle completo en historias de usuario y criterios de aceptación en [historias-usuario.md](historias-usuario.md) — acá solo el resumen funcional.

**Landing pública (rol Visitante / "Mirones"):** la app debe poder verse sin loguearse, en vez de mandar directo a la pantalla de login. Incluye:
- Barra de navegación pública y sección principal (hero) con llamada a la acción.
- Sección introductoria con opción "Leer más" hacia información ampliada.
- Testimonios (carrusel si aplica).
- Formulario de contacto protegido con reCAPTCHA.
- Demo/video de uso de la plataforma.
- Footer: información institucional, redes sociales, términos y condiciones, logotipo.
- Página "Acerca de" (About): misión y visión, información de la organización, formulario de contacto propio (reCAPTCHA).

**Registro:**
- Manual: nombre, correo, contraseña + repetir contraseña; validación de coincidencia en tiempo real; medidor visual de fortaleza de contraseña; verificación de correo por código/link con expiración y opción de reenvío; checkbox de aceptación de términos y condiciones (no marcado por defecto).
- Social (Google/Facebook, OAuth): mismo resultado que el manual, con paso adicional para completar datos que el proveedor no entrega y el mismo checkbox de términos y condiciones. Si el correo ya existe, se informa y se sugiere iniciar sesión en vez de registrarse de nuevo.

**Login:**
- Protegido con reCAPTCHA.
- Mostrar/ocultar contraseña (ícono de ojo).
- Mensajes de error genéricos para credenciales inválidas (no revelar cuál campo falló) y específicos para cuenta no verificada/bloqueada/inactiva.
- Sesión protegida con token (JWT) con expiración; cierre de sesión automático por inactividad, con tiempo configurable y aviso al usuario.

**Recuperación de contraseña:** solicitud por correo, envío de link/código con expiración, vista de nueva contraseña con el mismo feedback de fortaleza que el registro, mensaje de confirmación genérico (no revela si el correo existe, por seguridad).

**Implicación de modelo de datos:** reCAPTCHA, OAuth, JWT y expiración de sesión los resuelve Supabase Auth de forma nativa — no requieren tablas propias. Sí hace falta una tabla para las invitaciones de household por link (ver [4.1](#41-gestión-de-usuarios-familias-y-perfiles)) — ver [6. Modelo de datos (resumen conceptual)](#6-modelo-de-datos-resumen-conceptual).

### 4.13 Configuración (agregado 2026-08-19)

Requerimiento que ya existía implícito en otras secciones (el "encargado" de la [sección 4.2.1](#421-interacciones-concretas-de-la-fila-de-producto-detallado-2026-08-18-desde-el-desglose-de-historias-de-usuario)) pero que no tenía una pantalla propia — se detectó el hueco al revisar el desglose completo de historias de usuario.

- Pantalla de "Configuración" accesible desde el perfil, con ajustes que aplican por lista (general, sublista o privada), no de forma global a toda la cuenta.
- Primer ajuste: activar o desactivar la función de "encargado" (quién debe comprar cada item) para una lista específica. Apagado por defecto.
- Queda como el lugar natural donde agregar más ajustes por lista a futuro (ej. notificaciones), sin tener que inventar otra pantalla cada vez.

## 5. Requerimientos no funcionales

- Colaboración en tiempo real: los cambios hechos por un miembro (agregar, tachar, editar) deben reflejarse en los dispositivos de los demás sin refrescar manualmente.
- Responsive real: la misma aplicación debe verse y funcionar bien en desktop y en móvil — un diseño adaptado con los mismos componentes reorganizados, no una versión "recortada".
- PWA instalable: manifest + service worker, para que el usuario pueda instalar la app desde el navegador sin pasar por una tienda de apps.
- Separación clara entre datos de household y datos de listas privadas a nivel de permisos — un fallo aquí sería un problema serio de privacidad.
- Escalabilidad del modelo de datos, sin requerir migraciones destructivas para las features del roadmap futuro.

## 6. Modelo de datos (resumen conceptual)

> Nota de control de acceso: la lógica de "¿puede este usuario ver/editar esta lista?" no es solo pertenencia a un household — se vuelve una función general que revisa, según el caso: `owner_id` (dueño directo, incluye el caso de usuario sin household), membresía de household (si `lists.household_id` no es nulo), o membresía en `list_collaborators` (listas privadas). Con la decisión 2026-08-16 de permitir uso sin household, `owner_id` deja de ser exclusivo de listas privadas y pasa a estar siempre presente en `lists`.

> **Nota 2026-08-19:** este modelo se armó antes del documento final y de las historias de usuario — las filas marcadas "revisado 2026-08-19" son ajustes de esta pasada de alineación, no diseño original.

| Entidad | Descripción |
|---|---|
| `households` | Hogar/familia, contenedor raíz |
| `household_members` | Perfiles con rol (admin/miembro) dentro de un household. **Revisado 2026-08-19:** con la decisión de que un usuario pertenece como máximo a un household, esta tabla lleva una restricción de unicidad por `user_id` (nunca dos filas activas para el mismo usuario) — si en la práctica termina siendo siempre 1 fila por usuario, es igual de válido simplificarlo a `household_id` + `role` como columnas directas en el perfil del usuario en vez de una tabla aparte; decisión de implementación, no de producto |
| `categories` | Categorías de productos, globales |
| `product_catalog` | **"Producto madre"** (ej. "Leche") con nombre y categoría; `household_id` nullable (NULL = catálogo global, con valor = producto propio). Ya **no** incluye marca en su identidad — corrección 2026-08-18, ver [4.5](#45-catálogo-de-productos-y-categorías) |
| `product_catalog_variants` | Presentación/tamaño concreto de un producto madre (ej. "Leche — caja 1L", "Leche — galón"), con `base_unit` (ml/g/unidad) y `base_quantity` normalizada — es lo que se busca y muestra estilo catálogo con imagen, y lo que hace posible la reconciliación de cantidades de la [sección 4.9.1](#491-reconciliación-de-cantidades-al-combinar-listas-decisión-2026-08-16-alcance-corregido-2026-08-18) |
| `product_brands` | **Nueva (2026-08-18):** marca concreta de un `product_catalog_variants` (ej. "Dos Pinos", "Coronado"), con logo — vive como detalle del producto, no como variante propia del catálogo (ver [4.5](#45-catálogo-de-productos-y-categorías)) |
| `product_catalog_staging` | Datos crudos obtenidos por scraping (marca + tamaño + súper + URL de imagen, tal como aparece en el sitio scrapeado), antes de normalizar/deduplicar hacia `product_catalog` / `product_catalog_variants` / `product_brands` |
| `product_prices` | Precio de una variante+marca de producto en un supermercado en una fecha dada — el scraping sigue siendo granular por marca, el catálogo solo agrega esa granularidad para mostrar un rango (mínimo–máximo) por variante+súper (ver [4.8](#48-sugerencias-de-dónde-comprar)). `source`: `scraped` o `manual` — **manual es nuevo (aceptado 2026-08-18)**, para cuando el propio usuario ingresa el precio de un [producto personalizado](#451-mis-productos-personalizados-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19); las sugerencias de dónde comprar deben poder distinguir ambas fuentes, no tratarlas con la misma confianza |
| `stores` | Catálogo fijo de supermercados soportados — 3 filas sembradas (MaxiPali, Walmart CR, MasXMenos), sin `household_id`. **Corrección 2026-08-27:** "por household" en la redacción original era ambiguo; el equipo confirmó que un household elige cuáles de las 3 tiendas seguir, no define tiendas propias — el scraper solo cubre esas 3. Ver [modulo-catalogo-scraping.md](catalogo-scraping/README.md) |
| `household_store_preferences` | **Nueva (2026-08-27):** tabla puente — `household_id`, `store_id`, `visible` (boolean). Qué tiendas del catálogo fijo sigue/muestra cada household (ej. un household que nunca compra en Walmart puede ocultarla). Resuelve la ambigüedad de `stores` — ver [modulo-catalogo-scraping.md](catalogo-scraping/README.md) |
| `lists` | Lista general, sublista por fecha, o lista privada (`type`: general / date / private); `status`: active / completed / cancelled; `owner_id` siempre presente (dueño individual); `household_id` **nullable** — NULL cuando el usuario no pertenece a household o la lista es privada, con valor solo para listas `general`/`date` de un usuario en un household (decisión 2026-08-16, ver [4.1](#41-gestión-de-usuarios-familias-y-perfiles) y [4.2](#42-lista-general-y-dashboard-financiero)) |
| `list_items` | Item dentro de una lista, referenciando una `product_catalog_variants`, con `quantity_requested`, `quantity_bought`, estado, `bought_by` (quién compró), `purchase_session_id` (de donde salen el dónde y el cuándo) y `assigned_to` nullable — "encargado" de comprar ese item, opcional y activable por lista desde la pantalla de Configuración ([4.13](#413-configuración-agregado-2026-08-19), vía `list_settings`) |
| `list_collaborators` | Control de acceso a listas privadas — independiente de `household_members`. Columnas: `list_id`, `user_id` (o email de invitado), `invited_at`, `accepted_at` |
| `household_invite_links` | **Nueva (2026-08-18):** invitación a un household por link, en vez de por correo uno por uno — `household_id`, `token`, `created_by`, `expires_at`. Ver [4.1](#41-gestión-de-usuarios-familias-y-perfiles) |
| `purchase_sessions` | Sesión de compra en un supermercado, en una fecha, con total editable. **Revisado 2026-08-19:** sigue el mismo patrón que `lists` — `owner_id` siempre presente (quien inició la compra) y `household_id` nullable; además `list_id` nullable para cuando la sesión nace de una lista privada (para no mezclar sus compras con las del household del dueño). Necesario porque "modo compra" (ver [4.2.2](#422-modo-compra--interfaz-simplificada-agregado-2026-08-19)) ahora aplica igual a usuarios sin household y a listas privadas, no solo a compras de household |
| `recipes` | Receta con porciones base |
| `recipe_ingredients` | Ingrediente de una receta. **Revisado 2026-08-19:** se liga al producto madre (`product_catalog`), **no** a una `product_catalog_variants` — porque una receta expresa una medida cruda (ej. "500 ml"), no una presentación concreta (ver [4.9](#49-recetas-y-planificador-semanal-de-comidas)). Columnas propias `quantity_value` + `quantity_unit` (ml/g/unidad) en vez de heredar la cantidad de una variante |
| `meal_plans` | Planificador semanal: `household_id`, `date`, `meal_type` (desayuno/almuerzo/cena), `recipe_id`, `assigned_cook` (FK a `household_members`), `servings_multiplier`. Tabla propia, no anotación sobre `lists`, porque un día puede tener hasta 3 comidas independientes. |
| `product_groups` | Grupo nombrado de productos frecuentes (ej. "Mercado quincenal"). Mismo patrón de dueño que `lists`: `owner_id` siempre presente, `household_id` nullable — personal por defecto, compartido con el household si el usuario lo asocia. Ver [4.11](#411-grupos-de-productos-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) |
| `product_group_items` | Producto dentro de un grupo, referenciando una `product_catalog_variants` con su cantidad por defecto — mismo rol que `recipe_ingredients` pero sin porciones ni multiplicador, y sí ligado a una variante concreta (a diferencia de `recipe_ingredients`) porque un producto de grupo ya es una unidad de compra, no una medida cruda |
| `household_inventory_items` | **Nueva (2026-08-19, amplía el inventario doméstico):** producto que la app cree que el usuario tiene en casa. Mismo patrón de dueño que `lists`/`product_groups`: `owner_id` siempre presente, `household_id` nullable. Columnas: `product_catalog_id`, `source` (`purchase` — vino de un tachado — o `manual`), `expires_at` nullable (si el usuario dio una fecha/rango con los chips rápidos) o `estimated_expires_at` (calculada por categoría si no la dio), `status` (`active`/`consumed`/`discarded`). Ver [4.10](#410-inventario-doméstico) |
| `list_settings` | **Nueva (2026-08-19):** ajustes por lista de la pantalla de Configuración — hoy solo `list_id` + `assignee_enabled` (boolean, si el "encargado" está activo para esa lista). Ver [4.13](#413-configuración-agregado-2026-08-19) |

Reglas de negocio que deben vivir en la base de datos (funciones/triggers), no en el cliente:

- Merge automático de cantidades solo cuando el producto duplicado en una lista es exactamente la misma variante (mismo `product_catalog_variants.id`) — no hay merge automático entre variantes distintas del mismo producto base, eso pasa por la reconciliación asistida de la [sección 4.9.1](#491-reconciliación-de-cantidades-al-combinar-listas-decisión-2026-08-16-alcance-corregido-2026-08-18), y esa reconciliación solo se dispara si `recipe_ingredients.quantity_unit` es de volumen/peso — si es un conteo simple, la suma es directa.
- Auto-completado de sublista/lista privada cuando todos sus items están comprados.
- Asignación/reutilización de sesión de compra activa por owner/household + store + día.
- Normalización/deduplicación de productos scrapeados antes de pasar de staging al catálogo real (incluye asignar cada fila de staging a un `product_catalog` + `product_catalog_variants` correspondiente).
- **Nueva (2026-08-19):** al tachar un item, además de crear/actualizar el `purchase_sessions` correspondiente, se crea o actualiza su fila en `household_inventory_items` (con `source: purchase`), usando la fecha dada por el usuario si la dio, o la vida útil típica de su categoría si no.
- **Nueva (2026-08-19):** si el admin de un household sale y hay otros miembros, la transferencia de rol es obligatoria antes de completar la salida (no puede quedar el household sin admin); si es el único miembro, el household se elimina junto con su `household_invite_links` activo.

## 7. Arquitectura técnica propuesta

| Capa | Elección | Justificación |
|---|---|---|
| Frontend | React + Next.js — **confirmado por todo el equipo el 2026-08-16** (propuesto inicialmente por Marcos para destrabar la creación del repo) | Next.js aporta SSR/routing robusto y suele ser lo esperado en cursos de desarrollo web. |
| Responsive/PWA | CSS responsive (Flexbox/Grid) + `manifest.json` + service worker (Workbox o plugin nativo del framework elegido) | Requerimiento no funcional central |
| Backend / API | Supabase (Postgres) vía PostgREST + funciones RPC — **confirmado por todo el equipo el 2026-08-16** | Complejidad justa para el modelo de datos; RLS para separar datos por household y por lista privada |
| Tiempo real | Supabase Realtime | Necesario para el tachado colaborativo instantáneo |
| Estado remoto en cliente | TanStack Query | Cache, invalidación y optimistic updates |
| Auth | Supabase Auth | — |
| Estilos | Tailwind CSS — **confirmado por todo el equipo el 2026-08-16** | Curva de aprendizaje más pareja para un equipo de 6 con niveles distintos de experiencia; más estándar y documentado que alternativas pensadas para compatibilidad nativa, que aquí no se necesita al ser 100% web |
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

**Mockups de referencia:** prototipo interactivo (HTML) cubriendo vistas desktop y mobile web de: lista general con dashboard, finanzas completas, listas privadas con calendario y estados, y planificador semanal de comidas. Ver [mockups/mockup-web-v2.html](mockup-web-v2.html) — v2, todavía por mejorar según el propio equipo.

## 10. Pendientes de definición

- ~~Framework de React definitivo (Next.js vs. Vite)~~ — **Next.js**, confirmado por todo el equipo en la reunión 2026-08-16.
- ~~Librería de estilos definitiva~~ — **Tailwind CSS**, confirmado el 2026-08-16.
- ~~Base de datos~~ — **Supabase**, confirmado por todo el equipo el 2026-08-16.
- ~~Enfoque del inventario doméstico~~ — **incluido en v1, opcional** (sección 4.10), decidido el 2026-08-16; el diseño de detalle del enfoque combinado propuesto sigue abierto.
- **Confirmación del profesor** sobre stack + DB — el equipo ya decidió, falta la aprobación formal del curso antes de tratarlo como cerrado.
- ~~Herramienta de web scraping y quién lo lidera~~ — **resuelto:** Daniel lidera el módulo; el pipeline son Edge Functions de Supabase que consultan la API de VTEX de MaxiPali, Walmart y MasXMenos (ver [catalogo-scraping/](catalogo-scraping/README.md), mergeado en el PR #1).
- Qué supermercados costarricenses son técnicamente viables de scrapear (revisar robots.txt de cada uno), y si esos sitios exponen imagen de producto de forma consistente (nuevo requisito del catálogo, sección 4.5) — riesgo a validar temprano con Daniel.
- ~~Qué pasa con las listas personales de un usuario que se une a un household después de haber usado la app solo~~ — **decidido el 2026-08-19** (sección 4.1): se le pregunta una vez, al unirse, si quiere mantenerlas personales o pasarlas al household.
- ~~Grupos de productos y Mis productos personalizados~~ — **aceptados el 2026-08-18** (secciones 4.11 y 4.5.1) para destrabar el diseño de hoy, y **confirmados por el equipo completo el 2026-08-19**, incluida la visibilidad personal/household.
- ~~Rol "Administrador"~~ — **confirmado el 2026-08-19** (sección 4.1): es solo el rol de admin dentro de un household, sin panel de administración global.
- Nombre/ícono de la app — se propone mantener "Tacha" salvo que el equipo completo prefiera cambiarlo.
- **Contenido institucional de la landing/About (agregado 2026-08-18):** misión, visión, información de la organización, redes sociales, texto de términos y condiciones — contenido real que alguien del equipo tiene que redactar, no es una decisión técnica (sección 4.12).
- **Duración del timeout de sesión por inactividad** (agregado 2026-08-18) — el requerimiento del profesor pide que sea configurable, pero falta fijar el valor por defecto (sección 4.12).
- **Credenciales de OAuth (Google/Facebook) y de reCAPTCHA** (agregado 2026-08-18) — hay que registrar la app en ambos proveedores antes de poder implementar el registro social y el reCAPTCHA (sección 4.12).
- ~~Desglosar en HU/CA el resto de módulos listados en historias-usuario.md~~ — **completado el 2026-08-19**, ver [historias-usuario.md](historias-usuario.md) (v2.0), incluida una síntesis de flujo de usuario (navegación + botón de entrada por epic) para revisar con el equipo completo antes de la próxima ronda de Stitch.

## 11. Próximos pasos inmediatos

- Confirmación del profesor sobre stack y base de datos (sección 7)
- Generación de interfaz de alta fidelidad con Stitch AI a partir de [DESIGN.md](DESIGN.md), sobre los requerimientos ya cerrados en este documento
- Diseñar el schema SQL completo (tablas + RLS + funciones de negocio), incorporando `product_catalog_variants`, `product_brands`, `household_invite_links` y `lists.household_id` nullable (sección 6)
- Cerrar el resto de la [sección 10](#10-pendientes-de-definición) (scraping técnico, supermercados viables, contenido institucional, timeout de sesión, credenciales OAuth/reCAPTCHA)
- Revisar en equipo el flujo de usuario y la síntesis de navegación/botones de [historias-usuario.md](historias-usuario.md#flujo-de-usuario--síntesis-para-revisión-de-equipo) antes de la próxima ronda de Stitch, e incorporar en DESIGN.md el paso de "mantener o pasar al household mis listas" (sección 4.1) en el flujo de unirse a un household (7.15)
- Corregir el mockup (`mockup-web-v2.html`) y la nueva generación de Stitch contra los requerimientos cerrados en este documento
- Continuar el desglose de historias de usuario en [historias-usuario.md](historias-usuario.md) para los módulos que faltan

## 12. División de trabajo

Definida en la reunión de equipo del 2026-08-16 — reemplaza el borrador anterior.

> **Asignación vigente por historia:** esta tabla es la división original por módulo. El 2026-08-21 se rebalanceó moviendo bloques completos (registro social y formularios de contacto a Melany, household a Laura, grupos de productos a Daniel). El dueño real de cada historia y su sprint están en Jira y en [sprints.md](sprints.md).

| Integrante | Módulo | Alcance |
|---|---|---|
| Daniel | Web scraping + catálogo | Terminar el pipeline de scraping y el catálogo (productos, variantes, imágenes) — el módulo de mayor riesgo técnico |
| Melany | Diseño UI + inventario | Sistema de componentes/diseño visual e implementación del inventario doméstico opcional (sección 4.10) |
| Laura | Dashboard financiero | Gráficos y agregaciones de gasto (sección 4.2, 4.6) |
| Esteban | Auth, households, perfiles | Login, creación/invitación de miembros, roles (sección 4.1) |
| Roberto | Recetas y planificador semanal | Recetas, calendario de comidas, conexión con listas (sección 4.9) |
| Marcos | Listas y PWA | Lista general, sublistas, listas privadas, tachado, PWA/responsive (secciones 4.2–4.4) |

> [Grupos de productos](#411-grupos-de-productos-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) y [productos personalizados](#451-mis-productos-personalizados-aceptado-2026-08-18-confirmado-por-el-equipo-2026-08-19) ya están aceptados (sección 3), pero ambas features tocan más de un módulo — grupos vive del lado de listas (Marcos) pero depende del catálogo (Daniel) para buscar/seleccionar productos, y "mis productos" extiende directamente el catálogo de Daniel. Coordinar entre ambos antes de implementar, no asignarlo unilateralmente acá.
