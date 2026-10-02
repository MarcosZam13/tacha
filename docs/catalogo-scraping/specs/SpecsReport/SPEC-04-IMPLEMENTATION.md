# Spec 4 Implementación: Preferencias de Tienda por Household

**Estado:** ✅ Código React completo, listo para integrar en módulo de configuración del household

**Fecha:** 2026-09-01

---

## Qué se implementó

### 1. Componente React: `HouseholdStorePreferences`

**Archivo:** `app/components/household-store-preferences/HouseholdStorePreferences.tsx`

Componente que renderiza:
- Título + instrucción
- 3 checkboxes (uno por tienda)
- Estado de carga y errores
- Nota informativa

**Comportamiento:**
- Trae lista de tiendas y preferencias del household
- Muestra toggle: si no hay fila en BD = default visibles
- Al cambiar: hace upsert inmediato (optimistic update)
- Si falla: revierte cambio visualmente
- Si `householdId = null`: no renderiza nada

### 2. Hook: `useHouseholdStorePreferences`

**Archivo:** `app/components/household-store-preferences/hooks/useHouseholdStorePreferences.ts`

Orquesta lógica de lectura/escritura:

**Lectura (`loadPreferences`):**
- Fetch tiendas de `/rest/v1/stores`
- Fetch preferencias de `/rest/v1/household_store_preferences`
- Combina: cada tienda con su preferencia (o true si no hay fila)

**Escritura (`toggleStoreVisibility`):**
- Optimistic update UI
- POST a `/rest/v1/household_store_preferences` con `Prefer: resolution=merge-duplicates` (upsert automático)
- Si falla: revierte

### 3. Tipos TypeScript

**Archivo:** `app/types/household-preferences.types.ts`

```typescript
interface HouseholdStorePreference {
  household_id: string;
  store_id: string;
  store_slug: StoreSlug;
  display_name: string;
  visible: boolean;
}

interface HouseholdStorePreferencesState {
  preferences: HouseholdStorePreference[];
  isLoading: boolean;
  error: string | null;
}
```

### 4. Constantes y Queries SQL Documentadas

**Archivo:** `app/constants/household.constants.ts`

**Query de lectura (reutilizable):**
```sql
select s.id, s.slug, s.display_name,
  coalesce(hsp.visible, true) as visible
from stores s
left join household_store_preferences hsp
  on hsp.store_id = s.id and hsp.household_id = $1
where coalesce(hsp.visible, true) = true;
```

**Query de upsert (reutilizable):**
```sql
insert into household_store_preferences (household_id, store_id, visible)
values ($1, $2, $3)
on conflict (household_id, store_id) do update
set visible = $3;
```

---

## Flujo de datos

```
Usuario: "quiero ocultar Walmart"
  ↓
Component onClick → toggleStoreVisibility("walmart", false)
  ↓
Optimistic update UI (toggle se ve apagado)
  ↓
POST /rest/v1/household_store_preferences
  Body: { household_id, store_id, visible: false }
  Header: Prefer: resolution=merge-duplicates
  ↓
Supabase RLS/Policy: verifica (aún abierto temporalmente)
  ↓
Upsert: if exists update, else insert
  ↓
Response 200 ✅ o error → revert UI
```

---

## Patrón `LEFT JOIN + coalesce(visible, true)`

**Por qué:**
- Household recién creado: SIN filas en `household_store_preferences`
- Esperado: todas las tiendas visibles (default = true)
- Sin este patrón: "sin fila" sería NULL (ambiguo)
- Con patrón: "sin fila" = `coalesce(NULL, true)` = true ✅

**Ejemplo:**
```sql
-- Household A, sin preferencias
select * from stores s
left join household_store_preferences hsp
  on hsp.store_id = s.id and hsp.household_id = 'household-A'
where coalesce(hsp.visible, true) = true;

-- Resultado: todas 3 tiendas (no hay filas de hsp, coalesce devuelve true)
```

---

## Manejo de edge cases

| Caso | Comportamiento |
|---|---|
| `householdId = null` | Componente no renderiza nada |
| Household nuevo sin filas | Todas tiendas visibles |
| Doble click en toggle | Upsert deduplicado por `on conflict` |
| Error en POST | Optimistic update revierte, muestra error |
| Rápidos cambios (A → B → A) | Última escritura gana (esperado) |

---

## Integración con otras specs

### Spec-02 (Búsqueda de catálogo)

```typescript
// En search_catalog RPC, pasar household_id:
const response = await fetch(
  'https://...supabase.co/rest/v1/rpc/search_catalog',
  {
    body: JSON.stringify({
      search_term: 'leche',
      household_id: currentHouseholdId,  // ← Spec 4 proporciona esto
    }),
  }
);
// Función filtra precios solo de tiendas visibles
```

### Listas (futuro)

```typescript
// Mostrar supermercados donde comprar (spec 4 filtra)
const visibleStores = await fetch(
  'https://...supabase.co/rest/v1/stores?...',
  // Usar query SQL documentada en household.constants.ts
);
```

---

## Acceptance Criteria de Spec 4

| AC | Implementado |
|---|---|
| Household nuevo muestra 3 tiendas visibles | ✅ |
| Desactivar toggle → crea fila `(household_id, store_id, visible=false)` | ✅ (upsert) |
| Activar toggle → actualiza a `visible=true`, sin duplicado | ✅ (on conflict) |
| `search_catalog` con household_id excluye precios de tienda oculta | ✅ (spec-02 ya lo hace) |
| Doble click rápido no genera error de duplicado | ✅ (upsert automático) |

---

## Archivos creados

- ✅ `app/components/household-store-preferences/HouseholdStorePreferences.tsx` — componente
- ✅ `app/components/household-store-preferences/hooks/useHouseholdStorePreferences.ts` — hook
- ✅ `app/types/household-preferences.types.ts` — tipos
- ✅ `app/constants/household.constants.ts` — queries SQL + constantes
- ✅ `app/components/household-store-preferences/models/HouseholdStorePreferencesProps.interface.ts`
- ✅ `app/components/household-store-preferences/README.md` — guía de reutilización
- ✅ `app/components/household-store-preferences/specs/SPEC.md` — spec localizada

---

## Uso

```tsx
import { HouseholdStorePreferences } from "@/app/components/household-store-preferences/HouseholdStorePreferences";

export const HouseholdSettings = () => {
  const { householdId } = useAuth(); // Del módulo de households

  return (
    <>
      <h2>Configuración del Household</h2>
      <HouseholdStorePreferences householdId={householdId} />
    </>
  );
};
```

---

**Estado:** Listo para integrar en la pantalla de configuración del household.

**Dependencia:** Requiere que módulo `households` (Esteban) proporcione `household_id` vía auth/context.
