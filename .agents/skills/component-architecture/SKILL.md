# Component Architecture — feature folders + ViewModel + SDD

Usar este skill al construir o revisar cualquier feature de UI. Adaptado de un repo de referencia enterprise en Next.js que el profesor del curso compartió.

Ver también: [constants-standards](../constants-standards/SKILL.md) · [unit-testing-standards](../unit-testing-standards/SKILL.md) · [clean-code-practices](../clean-code-practices/SKILL.md)

## 1. Una feature, una carpeta

Cada feature de UI vive en su propia carpeta en kebab-case bajo `app/components/`:

```
<feature-name>/
  FeatureName.tsx              ← entrada delgada: gate de loading/auth → Inner
  FeatureNameInner.tsx         ← opcional: cuerpo compuesto
  components/                  ← mini componentes locales (solo presentación)
  hooks/
    useFeatureNameViewModel.ts ← TODA la lógica: estado, efectos, handlers, datos derivados
  models/
    FeatureNameProps.interface.ts
  store/                       ← estado compartido de la feature, solo si de verdad se comparte
  constants/                   ← constantes propias de la feature (siguen constants-standards)
  specs/SPEC.md                ← contrato de la feature, ver §2
  tests/
    FeatureName.page.ts        ← Page Object, ver unit-testing-standards
    FeatureName.test.tsx
```

Reglas:

- Colocalizar hooks/models/tests de una feature dentro de su propia carpeta — no dispersarlos en un `hooks/`, `utils/` o `store/` global.
- Promover algo a una ubicación compartida solo cuando aparece un **segundo consumidor real** — nunca preventivamente.
- Respetar la taxonomía de carpetas que ya tenga el proyecto; no introducir una paralela (`containers/`, `views/`, `smart/`).

## 2. Spec-Driven Development — especificar antes de codear

Antes de una feature nueva o un cambio de comportamiento (no un simple retoque visual), escribir `specs/SPEC.md` dentro de la carpeta de la feature:

```md
# <Nombre de la feature / cambio>

## Intención
¿Para quién es esto, qué resultado debería obtener?

## Alcance / fuera de alcance

## Requerimientos

## Casos límite y errores

## Restricciones
Reusar componentes/constantes/store existentes; qué skills aplican.

## Criterios de aceptación
- [ ] …
```

Flujo: **Especificar → Planear → Tareas → Implementar → Validar.** Implementar tarea por tarea; antes de dar el trabajo por terminado, validar el resultado contra los criterios de aceptación — no contra una versión reinterpretada del pedido. Si los requerimientos cambian a mitad de la implementación, actualizar primero el spec, después el código.

## 3. Presentación vs. lógica — la separación ViewModel

| Archivo | Contiene |
|---|---|
| `FeatureName.tsx` | Solo presentación: estructura JSX, composición, conectar la salida del ViewModel a la UI |
| `hooks/useFeatureNameViewModel.ts` | Lógica: `useState`/reducers, efectos, handlers de eventos, valores derivados, orquestación de fetch de datos |

- Los `.tsx` nunca contienen `useState`/`useEffect`/llamadas a fetch/handlers no triviales directamente.
- Nombrado: `Archivo.tsx` → `hooks/useArchivoViewModel.ts`. Extensión `.ts`, salvo que el hook deba devolver JSX (evitar ese caso).
- Los componentes puramente presentacionales (props → JSX, nada más) no necesitan ViewModel — no forzar uno.
- Componentes y hooks son funciones flecha `const` con tipo de retorno explícito — nunca `function`.

**Incorrecto** — lógica embebida en el componente:

```tsx
const ShoppingList = ({ householdId }: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems(householdId).then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, [householdId]);

  if (isLoading) return <Spinner />;
  return <ItemGrid items={items} />;
};
```

**Correcto** — presentación + ViewModel:

```tsx
// ShoppingList.tsx
const ShoppingList = ({ householdId }: Props) => {
  const { isLoading, items } = useShoppingListViewModel({ householdId });
  if (isLoading) return <Spinner />;
  return <ItemGrid items={items} />;
};
```

```ts
// hooks/useShoppingListViewModel.ts
export const useShoppingListViewModel = ({ householdId }: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems(householdId).then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, [householdId]);

  return { isLoading, items };
};
```

## 4. Mantener el return principal legible — extraer mini componentes locales

El `return` principal del `.tsx` debería leerse de arriba a abajo como el esqueleto de una pantalla. Cuando crece más de una pantalla corta (regiones visuales distintas, ternarios anidados, markup repetido de card/fila), extraer **mini componentes locales**: solo presentación, privados de la feature, nombrados por región de UI (`ShoppingListToolbar`, `ShoppingListEmptyState`) — nunca vago (`Parte1`, `Helper`). El padre conecta las salidas del ViewModel a las props de los minis; los minis no re-derivan lógica propia. Promover un mini a componente compartido solo cuando una segunda feature necesita la misma UI.

## 5. SOLID mapeado a componentes, no abstracto

| Principio | Concretamente |
|---|---|
| S — Responsabilidad única | `.tsx` renderiza; `use*ViewModel` orquesta estado; hooks dedicados para fetch/validación; un slice de store para estado realmente compartido entre features |
| O — Abierto/cerrado | Extender vía props/composición/variantes — nunca copiar-pegar una feature existente "con retoques" |
| L — Liskov | Un `Button` compartido no navega + hace submit + hace fetch en secreto; eso se especializa en la capa de feature |
| I — Segregación de interfaces | Props/ViewModel chicos y enfocados; separar un hook cuando distintos consumidores solo necesitan un subconjunto |
| D — Inversión de dependencias | Los ViewModels dependen de constantes/tipos/selectores ya existentes, no de detalles de transporte/fetch hardcodeados en el JSX |

Patrones preferidos, cuando aplican: **ViewModel** (default para cualquier componente con lógica), **Composición** (siempre, sobre herencia), **Facade** (`use*Facade`/ViewModel delgado que coordina varios hooks de feature — fetch + validación + modal), **Container/Inner** (gate `Feature.tsx` + cuerpo `FeatureInner.tsx` cuando las ramas de loading/auth ensucian la presentación), **Adapter** (mapear la forma de la fila de API/DB a view models dentro de hooks/utils — nunca payloads crudos en JSX), **Observer/Store** (estado compartido vía el patrón único de estado del proyecto — nunca eventos ad hoc o prop drilling una vez que existe un store), **Strategy** (variantes de comportamiento vía props/constantes en vez de un `switch` grande en JSX), **State** (una unión explícita para modos de UI mutuamente excluyentes — `idle | loading | error | ready`, pasos de un wizard — en vez de varios booleanos superpuestos que pueden contradecirse).

Prohibido por defecto: god component/ViewModel (responsabilidades no relacionadas amontonadas), clonar una carpeta de feature "con retoques" en vez de reusar/componer, prop drilling cuando ya existe un store que cubre el caso, introducir una abstracción antes de que exista un segundo consumidor real, árboles de herencia para UI, lógica de fetch/mutación filtrada dentro del `.tsx`.

## 6. Checklist

- [ ] El trabajo no trivial tiene `specs/SPEC.md` (o los criterios de aceptación ya dados, persistidos ahí) y fue validado contra eso
- [ ] La feature vive en su propia carpeta kebab-case con `hooks/`, `models/`, `specs/`, `tests/` colocalizados
- [ ] El `return` principal del `.tsx` es una composición corta de minis locales/primitivos compartidos, no un monolito largo
- [ ] No quedó `useState`/`useEffect`/fetch/handlers no triviales en el `.tsx` — la lógica vive en `use<Nombre>ViewModel.ts`
- [ ] El diseño nombra un patrón intencional (ViewModel, composición, facade, store, …) — sin god components
- [ ] El comportamiento no trivial está cubierto por tests según [unit-testing-standards](../unit-testing-standards/SKILL.md)
