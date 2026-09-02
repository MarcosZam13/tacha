# Spec: Preferencias de Tienda por Household

## Intención

Componente de UI + lógica que permite al usuario elegir cuáles de las 3 tiendas (MaxiPali, Walmart Costa Rica, MasXMenos) quiere seguir viendo en el catálogo y otros módulos. Esta preferencia afecta:
- El rango de precio mostrado en búsquedas (spec-02)
- Potencialmente, las sugerencias de dónde comprar (futuro)

## Alcance

- Componente con lista de 3 tiendas + toggles de visibilidad
- Lectura: mostrar estado actual (sin fila = visible por defecto)
- Escritura: upsert en `household_store_preferences` al cambiar toggle
- No tocar precios ni staging (es solo filtro de visualización)
- Ocultar tienda(s) es válido aunque inusual (sin advertencia)

## Fuera de alcance

- No implementar "sugerencias de dónde comprar" completa
- No construir módulo `households`/`household_members` (lo hace Esteban)
- No advertir si todas las tiendas se ocultan

## Requerimientos

1. Lectura: patrón `left join` + `coalesce(visible, true)` (tienda sin fila = visible)
2. Escritura: upsert sobre clave primaria `(household_id, store_id)`
3. Mostrar `display_name` de tiendas (ej. "Walmart Costa Rica"), no slug
4. Reutilizar la misma consulta en otros módulos (catálogo, listas, dashboard)

## Casos límite

- Household sin filas previas → todas tiendas visibles
- Doble click rápido en toggle → upsert maneja sin error de duplicado
- Usuario sin household → no mostrar componente (not render)
- Políticas RLS aún abiertas (temporales) → funciona hoy, se endurecerá después

## Restricciones

- Usar tabla `household_store_preferences` existente (no crear paralela)
- Consulta de lectura debe ejecutarse vía PostgREST directo
- Documentar query SQL para reutilización

## Criterios de aceptación

- [ ] Household nuevo sin filas muestra 3 tiendas con toggle activado
- [ ] Desactivar toggle de Walmart → crea/actualiza fila `(household_id, store_id_walmart, visible=false)`
- [ ] Activar toggle actualiza a `visible=true`, sin duplicado
- [ ] `search_catalog(term, household_id)` excluye precios de tienda oculta
- [ ] Doble click rápido no genera error de clave duplicada
