# Sprints — Tacha

Ver también: [documento-proyecto.md](documento-proyecto.md) · [historias-usuario.md](historias-usuario.md) · [CONTRIBUTING.md](../CONTRIBUTING.md)

**Fuente de verdad: el tablero de Jira** (proyecto `SCRUM`). Este archivo es una foto del plan para tenerlo a mano en el repo; si algo no coincide, gana Jira. Actualizarlo cuando se mueva una historia de sprint.

## Calendario

Sprints de una semana, de lunes a lunes. La revisión de cada sprint es el lunes en que termina, y ese mismo día arranca el siguiente.

| Sprint | Del | Al (revisión) | Historias | Puntos |
|---|---|---|---|---|
| Sprint 1 | lun 21 sep | lun 28 sep | 16 | 43 |
| Sprint 2 | lun 28 sep | lun 5 oct | 24 | 74 |
| Sprint 3 | lun 5 oct | lun 12 oct | 14 | 56 |
| Sprint 4 | lun 12 oct | lun 19 oct | 18 | 61 |
| Sprint 5 | lun 19 oct | lun 26 oct | 9 | 35 |
| Sprint 6 | lun 26 oct | lun 2 nov | 9 | 29 |
| Sprint 7 | lun 2 nov | lun 9 nov | 3 | 9 |

Después del Sprint 7 (a partir del lunes 9 nov) quedan las semanas de colchón, integración entre módulos y testing/deploy del plan original: no tienen historias asignadas a propósito. Si algo se atrasa, se recupera ahí antes de recortar alcance.

## Carga por persona y sprint (puntos)

| Sprint | Marcos | Melany | Daniel | Laura | Esteban | Roberto |
|---|---|---|---|---|---|---|
| 1 | 7 | 6 | — | 6 | 14 | 10 |
| 2 | 13 | 12 | 8 | 15 | 14 | 12 |
| 3 | 8 | 8 | 12 | 4 | 11 | 13 |
| 4 | 13 | 10 | 6 | 11 | 8 | 13 |
| 5 | 8 | — | 7 | 17 | 3 | — |
| 6 | 11 | 10 | 8 | — | — | — |
| 7 | — | 9 | — | — | — | — |
| **Total** | **60** | **55** | **41** | **53** | **50** | **48** |

Daniel no tiene historias en el Sprint 1 porque arranca con el pipeline de scraping (infraestructura, sin historia propia), que ya está mergeado.

## Sprint 1 (lun 21 sep → lun 28 sep)

| Ticket | Historia | Responsable | Pts |
|---|---|---|---|
| SCRUM-62 | HU-36a: Buscar y añadir producto | Marcos | 5 |
| SCRUM-63 | HU-36b: Ajustar cantidad | Marcos | 2 |
| SCRUM-23 | HU-01: Barra de navegación | Melany | 1 |
| SCRUM-24 | HU-02: Sección principal (Hero Section) | Melany | 2 |
| SCRUM-30 | HU-08: Información del pie de página | Melany | 1 |
| SCRUM-31 | HU-09: Redes sociales | Melany | 1 |
| SCRUM-33 | HU-11: Logotipo | Melany | 1 |
| SCRUM-56 | HU-33: Crear link de invitación al household | Laura | 3 |
| SCRUM-57 | HU-34: Unirse a un household por link | Laura | 3 |
| SCRUM-37 | HU-14b: Registro con datos básicos | Esteban | 3 |
| SCRUM-38 | HU-15: Validar coincidencia de contraseña | Esteban | 2 |
| SCRUM-39 | HU-16: Feedback de seguridad de contraseña | Esteban | 3 |
| SCRUM-40 | HU-17: Verificación de correo electrónico | Esteban | 5 |
| SCRUM-41 | HU-18: Aceptación de términos y condiciones | Esteban | 1 |
| SCRUM-94 | HU-63: Ver catálogo de recetas del household | Roberto | 2 |
| SCRUM-95 | HU-64: Crear o editar una receta | Roberto | 8 |

## Sprint 2 (lun 28 sep → lun 5 oct)

| Ticket | Historia | Responsable | Pts |
|---|---|---|---|
| SCRUM-64 | HU-36c: Ver detalle de producto | Marcos | 3 |
| SCRUM-65 | HU-36d: Eliminar producto | Marcos | 2 |
| SCRUM-66 | HU-36e: Tachar/destachar producto | Marcos | 8 |
| SCRUM-25 | HU-03: Información introductoria | Melany | 1 |
| SCRUM-26 | HU-04: Consultar información ampliada | Melany | 2 |
| SCRUM-27 | HU-05: Testimonios | Melany | 2 |
| SCRUM-29 | HU-07: Demo de uso | Melany | 3 |
| SCRUM-32 | HU-10: Términos y condiciones | Melany | 2 |
| SCRUM-34 | HU-12: Misión y visión | Melany | 1 |
| SCRUM-35 | HU-13: Información de la organización | Melany | 1 |
| SCRUM-83 | HU-51: Buscar productos en el catálogo global | Daniel | 5 |
| SCRUM-84 | HU-52: Filtrar catálogo por categoría | Daniel | 3 |
| SCRUM-58 | HU-34c: Salir de mi household | Laura | 5 |
| SCRUM-59 | HU-34b: Decidir qué hacer con mi lista personal al unirme a un household | Laura | 5 |
| SCRUM-60 | HU-35: Consultar familiares del household | Laura | 2 |
| SCRUM-61 | HU-36: Eliminar un familiar del household | Laura | 3 |
| SCRUM-45 | HU-22: Inicio de sesión con validación reCAPTCHA | Esteban | 3 |
| SCRUM-46 | HU-23: Mostrar/ocultar contraseña | Esteban | 1 |
| SCRUM-47 | HU-24: Mensajes de error en login | Esteban | 2 |
| SCRUM-48 | HU-25: Feedback de seguridad de contraseña en login | Esteban | 3 |
| SCRUM-49 | HU-26: Token de seguridad de sesión | Esteban | 5 |
| SCRUM-96 | HU-64b: Eliminar una receta | Roberto | 2 |
| SCRUM-97 | HU-65: Agregar receta a la lista | Roberto | 5 |
| SCRUM-98 | HU-66: Ver qué falta de una receta | Roberto | 5 |

## Sprint 3 (lun 5 oct → lun 12 oct)

| Ticket | Historia | Responsable | Pts |
|---|---|---|---|
| SCRUM-67 | HU-36f: Modo compra | Marcos | 8 |
| SCRUM-28 | HU-06: Formulario de contacto (reCAPTCHA) | Melany | 5 |
| SCRUM-36 | HU-14: Contacto desde About (reCAPTCHA) | Melany | 3 |
| SCRUM-85 | HU-53: Ver detalle de un producto (marcas y precio por supermercado) | Daniel | 5 |
| SCRUM-86 | HU-55: Ver mis productos personalizados | Daniel | 2 |
| SCRUM-87 | HU-56: Crear un producto personalizado | Daniel | 5 |
| SCRUM-69 | HU-37: Ver gasto total por periodo | Laura | 3 |
| SCRUM-75 | HU-43: Aviso de precios estimados | Laura | 1 |
| SCRUM-50 | HU-27: Cierre de sesión por inactividad | Esteban | 5 |
| SCRUM-51 | HU-28: Recuperación de contraseña | Esteban | 3 |
| SCRUM-52 | HU-29: Vista de actualización de contraseña | Esteban | 3 |
| SCRUM-99 | HU-67: Ver calendario semanal de comidas | Roberto | 3 |
| SCRUM-100 | HU-68: Asignar receta, cocinero y porciones a un espacio del plan | Roberto | 5 |
| SCRUM-101 | HU-69: Agregar la semana completa a la lista | Roberto | 5 |

## Sprint 4 (lun 12 oct → lun 19 oct)

| Ticket | Historia | Responsable | Pts |
|---|---|---|---|
| SCRUM-76 | HU-44: Ver calendario de sublistas | Marcos | 5 |
| SCRUM-77 | HU-45: Crear sublista en una fecha | Marcos | 3 |
| SCRUM-78 | HU-46: Ver y gestionar el estado de una sublista | Marcos | 3 |
| SCRUM-79 | HU-47: Ver total de gasto de una sublista | Marcos | 2 |
| SCRUM-42 | HU-19: Registro mediante proveedor externo | Melany | 5 |
| SCRUM-43 | HU-20: Completar datos faltantes tras registro social | Melany | 3 |
| SCRUM-44 | HU-21: Aceptación de términos y condiciones en registro social | Melany | 2 |
| SCRUM-88 | HU-57: Asociar tienda y precio de referencia | Daniel | 3 |
| SCRUM-89 | HU-58: Editar o eliminar un producto personalizado | Daniel | 3 |
| SCRUM-90 | HU-59: Ver historial de sesiones de compra | Laura | 3 |
| SCRUM-91 | HU-60: Editar el total de una sesión o periodo | Laura | 3 |
| SCRUM-92 | HU-61: Ver sesiones sin total ingresado | Laura | 2 |
| SCRUM-93 | HU-62: Filtrar historial por supermercado y categoría | Laura | 3 |
| SCRUM-53 | HU-30: Editar datos de perfil | Esteban | 3 |
| SCRUM-54 | HU-31: Cambiar contraseña | Esteban | 3 |
| SCRUM-55 | HU-32: Cerrar sesión (logout) | Esteban | 2 |
| SCRUM-114 | HU-76: Ver aviso pasivo de faltante de receta/plan | Roberto | 5 |
| SCRUM-115 | HU-77: Resolver el faltante al tachar el item | Roberto | 8 |

## Sprint 5 (lun 19 oct → lun 26 oct)

| Ticket | Historia | Responsable | Pts |
|---|---|---|---|
| SCRUM-68 | HU-36g: Combinar lista general y sublista (fusión visual al comprar) | Marcos | 8 |
| SCRUM-109 | HU-72: Ver "Mis grupos" | Daniel | 2 |
| SCRUM-110 | HU-73: Crear un grupo de productos | Daniel | 5 |
| SCRUM-70 | HU-38: Ver gastos por household o listas privadas | Laura | 3 |
| SCRUM-71 | HU-39: Ver gastos por categoría de producto | Laura | 5 |
| SCRUM-72 | HU-40: Ver gastos por supermercado | Laura | 3 |
| SCRUM-73 | HU-41: Ver gastos por persona | Laura | 3 |
| SCRUM-74 | HU-42: Ver productos más comprados y más costosos | Laura | 3 |
| SCRUM-108 | HU-78: Activar el "encargado" para una lista | Esteban | 3 |

## Sprint 6 (lun 26 oct → lun 2 nov)

| Ticket | Historia | Responsable | Pts |
|---|---|---|---|
| SCRUM-80 | HU-48: Crear lista privada | Marcos | 3 |
| SCRUM-81 | HU-49: Invitar colaboradores a una lista privada | Marcos | 5 |
| SCRUM-82 | HU-50: Gestionar una lista privada (tachado, estado) | Marcos | 3 |
| SCRUM-102 | HU-70: Ver sugerencias de inventario | Melany | 5 |
| SCRUM-103 | HU-70b: Indicar cuánto le va a durar un producto al comprarlo | Melany | 3 |
| SCRUM-104 | HU-71: Confirmar o descartar una sugerencia | Melany | 2 |
| SCRUM-111 | HU-74: Agregar un grupo a la lista | Daniel | 3 |
| SCRUM-112 | HU-75: Editar un grupo existente | Daniel | 3 |
| SCRUM-113 | HU-75b: Eliminar un grupo | Daniel | 2 |

## Sprint 7 (lun 2 nov → lun 9 nov)

| Ticket | Historia | Responsable | Pts |
|---|---|---|---|
| SCRUM-105 | HU-71b: Ver mi inventario completo | Melany | 3 |
| SCRUM-106 | HU-71c: Marcar un producto como agotado o ajustar su vencimiento | Melany | 3 |
| SCRUM-107 | HU-71d: Agregar algo a mi inventario manualmente | Melany | 3 |
