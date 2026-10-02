# Component Architecture — feature folders + ViewModel + SDD

Usar este skill al construir o revisar cualquier feature de UI. Adaptado de un repo de referencia enterprise en Next.js que el profesor del curso compartió.

Ver también: [constants-standards](../constants-standards/SKILL.md) · [unit-testing-standards](../unit-testing-standards/SKILL.md) · [clean-code-practices](../clean-code-practices/SKILL.md)

## 1. Una feature, una carpeta

Cada feature de UI vive en su propia carpeta en kebab-case bajo `features/` (en la raíz, nunca dentro de `app/`). Todo lo que solo usa esa feature — mini componentes, hooks, modelos, constantes, specs, tests — va adentro de su carpeta. `components/` queda solo para lo compartido entre features (`components/ui/`):

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
  specs/                       ← Spec-Driven Development, ver §2
    SPEC.md                    ← qué y por qué (contrato)
    plan.md                    ← cómo: archivos, datos, flujo, decisiones
    tasks.md                   ← pasos ordenados de implementación
  tests/
    FeatureName.page.ts        ← Page Object, ver unit-testing-standards
    FeatureName.test.tsx
```

Reglas:

- Colocalizar hooks/models/tests de una feature dentro de su propia carpeta — no dispersarlos en un `hooks/`, `utils/` o `store/` global.
- Promover algo a una ubicación compartida solo cuando aparece un **segundo consumidor real** — nunca preventivamente.
- Respetar la taxonomía de carpetas que ya tenga el proyecto; no introducir una paralela (`containers/`, `views/`, `smart/`).

## 2. Spec-Driven Development — especificar antes de codear

Antes de una feature nueva o un cambio de comportamiento (no un simple retoque visual), escribir `specs/SPEC.md` dentro de la carpeta de la feature, con la plantilla de 15 secciones que define el profesor del curso. Las secciones van todas y en este orden, para que el número de sección signifique lo mismo en cualquier spec; si una no aplica se deja escrita con "No aplica" y una razón corta. La sección 15 es la excepción: solo se escribe si de verdad hace falta.

```md
# Feature: <FeatureName>

## 1. Objetivo
Describe qué problema resuelve la feature.

## 2. Alcance
Qué sí incluye.
Qué no incluye.

## 3. Entradas
Lista de inputs, con su tipo.

Ejemplo:
- email: string
- password: string
- onSubmit: (credentials: LoginCredentials) => Promise<void>

## 4. Salidas
Qué produce la feature.

Ejemplo:
- ejecuta onSubmit con las credenciales
- muestra errores por campo
- actualiza el estado de la UI

## 5. Reglas de negocio
Lista exacta de reglas.

Ejemplo:
- email es obligatorio
- password es obligatoria
- password debe tener mínimo 8 caracteres
- no se envía si hay errores

## 6. Estados
Estados que puede tener la UI o la lógica. Se modelan como una unión derivada de constantes (ver §5 State y constants-standards §7), no como varios booleanos.

Ejemplo:
- idle
- loading
- success
- error
- empty

## 7. Errores
Errores posibles y cómo se muestran.

Ejemplo:
- email inválido
- credenciales incorrectas
- error del servidor

## 8. UI esperada
Elementos visuales mínimos obligatorios.

Ejemplo:
- input email
- input password
- botón submit
- mensaje de error por campo
- mensaje de error general

## 9. Accesibilidad
Reglas mínimas.

Ejemplo:
- label asociado a input
- mensajes de error legibles
- botones con texto claro

## 10. Restricciones técnicas
Ejemplo:
- TypeScript estricto, sin `any`
- Tailwind CSS con los tokens `tacha-*` (sin CSS Modules)
- no usar librerías externas de formularios
- separar UI, validación y constantes (ViewModel + `constants/`)
- no usar magic strings (constants-standards)

## 11. Dependencias
Qué usa esta feature.

Ejemplo:
- services/auth.service.ts
- features/login/constants/login.constants.ts
- @/components/ui (Button, Input)

## 12. Contratos externos
API, storage, eventos u otros contratos (tablas, RPC y políticas RLS de Supabase, si aplica).

## 13. Casos de aceptación
- Caso 1: login correcto
- Caso 2: email inválido
- Caso 3: password vacía
- Caso 4: error backend

## 14. Casos fuera de alcance
Lista explícita de cosas que no deben implementarse aquí.

## 15. Notas de implementación
Solo si realmente hace falta.
```

Cómo se usa la plantilla:

- Las secciones 1 a 14 describen el **qué** y el **por qué**; el cómo va en `plan.md`. Los detalles de implementación entran en el spec solo como restricción dura (§10) o como nota (§15).
- Los casos de aceptación (§13) salen de los criterios de la historia en `docs/historias-usuario.md` y de la historia en Jira. Cada caso se mapea a al menos un test ([unit-testing-standards](../unit-testing-standards/SKILL.md)).
- Los ejemplos de la plantilla son ilustrativos (un formulario de login); en cada spec se reemplazan por los de la feature.

### Specs existentes

La plantilla de 15 secciones aplica solo a las specs nuevas. Una spec escrita antes con el formato anterior (`# Spec: ...` con Intención, Alcance, Requerimientos, Casos límite, Restricciones y Criterios de aceptación) **no se migra por defecto**: se sigue leyendo y validando tal como está. Solo se reescribe con la plantilla nueva cuando su feature tenga un cambio de comportamiento que obligue a actualizar el spec.

Cómo distinguir una de otra: la plantilla nueva empieza con `# Feature: <Nombre>` y sus secciones están numeradas (`## 1. Objetivo`). Si no lo están, es del formato anterior. Esta regla no depende de una lista de features, así que no se desactualiza cuando aparecen specs nuevas.

Equivalencias, para leer una spec anterior con la plantilla nueva en mente:

| Formato anterior | Plantilla de 15 secciones |
|---|---|
| Intención | 1. Objetivo |
| Alcance / Fuera de alcance | 2. Alcance y 14. Casos fuera de alcance |
| Requerimientos | 5. Reglas de negocio |
| Casos límite y errores | 7. Errores y 13. Casos de aceptación |
| Restricciones | 10. Restricciones técnicas |
| Criterios de aceptación | 13. Casos de aceptación |

### Flujo

**Especificar → Planear → Tareas → Implementar → Validar**, y cada una de las tres primeras etapas deja su archivo en `specs/`:

1. **Especificar → `SPEC.md`** (plantilla de arriba): el *qué* y el *por qué*.
2. **Planear → `plan.md`**: el *cómo*, derivado del spec y de los skills que aplican. Contiene:
   - árbol de archivos a crear o tocar, con la responsabilidad de cada uno;
   - datos: tablas, columnas, RLS, RPCs o endpoints que se usan o se crean;
   - flujo: el recorrido de una acción del usuario por los archivos;
   - tabla de decisiones `Decisión | Alternativa | Por qué esta` (el porqué nombra una consecuencia concreta).
3. **Tareas → `tasks.md`**: checklist ordenada de unidades chicas de implementación, marcando las bloqueadas y de qué dependen. Si una feature abarca varias historias, agrupar las tareas por ticket (`SCRUM-{n}`).
4. **Implementar** tarea por tarea, marcándolas en `tasks.md`.
5. **Validar** contra los casos de aceptación de `SPEC.md` (§13; en las specs del formato anterior, "Criterios de aceptación"), no contra una versión reinterpretada del pedido.

Si los requerimientos cambian a mitad de la implementación, actualizar primero `SPEC.md` (y `plan.md` si cambia el cómo), después el código. Los tres archivos viajan en el mismo PR que el código de la feature.

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

- [ ] El trabajo no trivial tiene `specs/SPEC.md` (plantilla de 15 secciones, salvo specs del formato anterior), `specs/plan.md` y `specs/tasks.md`, y fue validado contra los casos de aceptación del spec
- [ ] La feature vive en su propia carpeta kebab-case con `hooks/`, `models/`, `specs/`, `tests/` colocalizados
- [ ] El `return` principal del `.tsx` es una composición corta de minis locales/primitivos compartidos, no un monolito largo
- [ ] No quedó `useState`/`useEffect`/fetch/handlers no triviales en el `.tsx` — la lógica vive en `use<Nombre>ViewModel.ts`
- [ ] El diseño nombra un patrón intencional (ViewModel, composición, facade, store, …) — sin god components
- [ ] El comportamiento no trivial está cubierto por tests según [unit-testing-standards](../unit-testing-standards/SKILL.md)
