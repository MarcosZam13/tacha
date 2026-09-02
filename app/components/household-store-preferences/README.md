# Household Store Preferences — Selección de tiendas por household

Componente que permite al usuario elegir cuáles de las 3 tiendas (MaxiPali, Walmart, MasXMenos) quiere ver en el catálogo y otros módulos.

## Uso

```tsx
import { HouseholdStorePreferences } from "@/app/components/household-store-preferences/HouseholdStorePreferences";

export const MyPage = () => {
  const householdId = "..."; // desde auth/context

  return (
    <HouseholdStorePreferences householdId={householdId} />
  );
};
```

## Comportamiento

- **Household sin filas en `household_store_preferences`:** todas las tiendas aparecen visibles (default = true)
- **Al cambiar toggle:** hace upsert en la BD (no falla si es la primera vez)
- **Sin householdId:** no renderiza nada (es configuración de household, no tiene sentido sin household)

## Queries SQL para reutilización (otros módulos)

### Leer tiendas visibles de un household

```sql
select s.id as store_id,
  s.slug as store_slug,
  s.display_name,
  coalesce(hsp.visible, true) as visible
from stores s
left join household_store_preferences hsp
  on hsp.store_id = s.id and hsp.household_id = $1
where coalesce(hsp.visible, true) = true
order by s.slug asc;
```

**Parámetro:** `$1 = household_id` (uuid)

**Devuelve:** todas las tiendas que el household debe ver (filtradas por visible=true)

**Cómo usarlo:**
- Catálogo (spec-02): al llamar `search_catalog`, pasar el `household_id`
- Listas: filtrar supermercados según esta consulta
- Dashboard: mostrar precios solo de tiendas visibles

### Actualizar preferencia (upsert)

```sql
insert into household_store_preferences (household_id, store_id, visible)
values ($1, $2, $3)
on conflict (household_id, store_id) do update
set visible = $3;
```

**Parámetros:**
- `$1 = household_id`
- `$2 = store_id` (uuid)
- `$3 = visible` (boolean)

**Comportamiento:**
- Si no existe fila: inserta
- Si existe: actualiza el campo `visible`
- Nunca duplica gracias a `on conflict`

## Constantes y documentación

Ver:
- `app/constants/household.constants.ts` — queries SQL documentadas
- `app/types/household-preferences.types.ts` — tipos TypeScript

## Próximos módulos que usan esto

- **Catálogo (spec-02):** `search_catalog(term, household_id)` filtra precios por tiendas visibles
- **Listas:** mostrar supermercados donde comprar basado en preferencias
- **Dashboard:** rango de precio y sugerencias de dónde comprar
