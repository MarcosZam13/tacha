# Next.js/React Enterprise Patterns

Router + convenciones restantes para este proyecto (Next.js + Supabase) que no ameritan su propio skill. Adaptado de un repo de referencia enterprise en Next.js que el profesor del curso compartió.

Ver también: [clean-code-practices](../clean-code-practices/SKILL.md)

Este es el punto de entrada para convenciones específicas de React/Next.js en este repo. Los tres temas más pesados tienen su propio skill — abrirlos cuando aplican:

| Skill | Usar cuando |
|---|---|
| [component-architecture](../component-architecture/SKILL.md) | Construir/revisar cualquier feature de UI: estructura de carpetas, Spec-Driven Development, separación ViewModel, SOLID/patrones |
| [constants-standards](../constants-standards/SKILL.md) | Un string o número mágico está por entrar a un diff |
| [unit-testing-standards](../unit-testing-standards/SKILL.md) | Escribir o revisar tests de componente/unitarios |

Este skill cubre lo que queda: búsqueda de reutilización primero, tipado nullable, estado compartido, el patrón de mutaciones, y el baseline mecánico de estilo.

## 1. Reutilizar antes de construir — gate de decisión de componentes

Antes de escribir un `<button>`, `<img>`, `<section>` crudo, un spinner a mano, o un modal/tabla improvisados: buscar primero en la librería de componentes compartidos del proyecto. Componer/configurar (props, `className`, variantes, children) sobre clonar; extender un wrapper delgado sobre la base compartida antes de escribir desde cero; construir nuevo solo **sobre** primitivos existentes, nunca como duplicado nativo-HTML.

Si un componente nuevo parece un primitivo de UI (con forma de botón/input/modal/spinner), darle una story de Storybook o una página de desarrollo aislada una vez que el proyecto tenga eso configurado.

## 2. Tipos nullable explícitos, no `| null` ad hoc

Centralizar tipos utilitarios nullable semánticos en vez de repetir `T | null | undefined` en todos lados:

```ts
type Nullable<T> = T | null | undefined;   // todavía no resuelto en ningún sentido
type NullableRef<T> = T | null;            // refs, "definitivamente ausente"
type NullableUndefined<T> = T | undefined; // opcional, nunca explícitamente null
```

Comunica intención (¿puede vaciarse intencionalmente vs. simplemente no cargó todavía?) en vez de un `| null` genérico repetido sin distinción.

## 3. Estado compartido de cliente — elegir un patrón y exigirlo

Dos tipos de estado necesitan dos respuestas distintas, y mezclarlas es el error de manejo de estado más común:

- **Estado de servidor** (datos que viven en la base de datos y pueden quedar obsoletos): el acceso a datos vive en un **servicio** (`services/`) y el ViewModel de la feature lo llama desde un `useEffect`, igual que el repo de referencia del profesor ([component-architecture §3](../component-architecture/SKILL.md#3-presentación-vs-lógica--la-separación-viewmodel)). Reglas del efecto:
  - Nunca llamar un setter (`setX`/`dispatch`) de forma síncrona en el cuerpo del efecto: el estado inicial ya arranca en "cargando" y el setter se llama recién cuando responde el servicio. La regla `react-hooks/set-state-in-effect` lo marca para `useState`, pero **no** para `dispatch` de `useReducer`: ahí la regla depende de quien escribe.
  - Toda petición que pueda quedar vieja (cambio de parámetros, desmontaje) se descarta con una bandera de cancelación en el cleanup.
  - **TanStack Query** queda como opción a evaluar por el equipo (caché, invalidación, deduplicación). No está instalado; si se adopta, se decide para todo el proyecto y se actualiza esta sección, no se introduce en una sola feature.
- **Estado compartido solo de cliente** (modo de UI, household activo seleccionado, modal abierto/cerrado entre componentes): **todavía no decidido por el equipo** (Context vs. Zustand son las opciones más simples dado que no se eligió Redux). Mientras no se decida: colocalizar el estado dentro de la feature que lo dueña (`useState`/`useReducer` local); no introducir un segundo patrón de estado compartido ad hoc a mitad de proyecto. En cuanto el equipo elija, actualizar esta sección.

## 4. Patrón tipado de mutaciones de datos

Sin importar la operación (Supabase RPC, una función de PostgREST, un endpoint propio), mantener la misma forma:

1. Interfaces `Payload` y `Response` explícitas por operación, nunca `unknown`/`any`.
2. La función del servicio es genérica sobre ambas: `(payload: Payload) => Promise<Response>`, y el ViewModel la llama y maneja el resultado.
3. Los errores tienen una forma tipada (`MutationError` o similar) manejada explícitamente — nunca un `catch {}` silencioso.

```ts
export interface AddListItemPayload {
  listId: string;
  productId: string;
  quantity: number;
}

export interface AddListItemResponse {
  itemId: string;
}
```

Mantener estas interfaces en un lugar predecible (`types/mutations/` o colocalizadas por feature) en vez de inline en cada call site.

## 5. Baseline mecánico de estilo

- Componentes/hooks como funciones flecha con tipo de retorno explícito — nunca declaraciones `function` (ver [component-architecture §3](../component-architecture/SKILL.md#3-presentación-vs-lógica--la-separación-viewmodel)).
- Sin abreviaciones: `error` no `err`, `response` no `res`, `request` no `req`, `callback` no `cb`, `context` no `ctx`, `event` no `evt`; una variable `data` sola está prohibida — prefijar con el dominio (`householdData`, `shoppingItems`). Ver la tabla completa en [clean-code-practices](../clean-code-practices/SKILL.md#1-nombrado).
- Baseline de lint/format: `no-console`, `no-var`, `prefer-const`, `eqeqeq`, `consistent-return`, `no-shadow`, `default-param-last`, comillas dobles, punto y coma obligatorio. Prettier con `printWidth` ajustado (60-80) y un atributo JSX por línea — mantiene los diffs fáciles de revisar en PR aunque se vea más largo en el editor.

## Aplicando esto en la práctica

1. Feature nueva → empezar con [component-architecture §2](../component-architecture/SKILL.md#2-spec-driven-development--especificar-antes-de-codear) (spec) antes de tocar código.
2. Cualquier string/número literal → [constants-standards](../constants-standards/SKILL.md) antes de que entre al diff.
3. Comportamiento no trivial → tests según [unit-testing-standards](../unit-testing-standards/SKILL.md) antes de dar la tarea por terminada.
4. Estado de servidor → servicio + `useEffect` en el ViewModel (TanStack Query a evaluar por el equipo). Estado de cliente compartido → ver §3, sin decidir todavía.
