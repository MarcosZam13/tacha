# Constants Standards — sin strings ni números mágicos

Usar este skill cada vez que un componente, hook, o lógica de negocio esté por introducir un string literal o un número mágico sin explicar. Adaptado de un repo de referencia enterprise en Next.js que el profesor del curso compartió.

Ver también: [component-architecture](../component-architecture/SKILL.md)

## 1. Reemplazar literales por constantes

Nunca usar un string crudo o un número sin explicar en componentes, hooks o lógica de negocio cuando ya existe (o debería existir) una constante. No es solo estilo: un typo en un string repetido (`"pendign"` vs `"pending"`) compila bien y falla en silencio en runtime; un typo en una referencia a constante falla en tiempo de compilación.

**Incorrecto:**

```ts
if (status === "pending") { ... }
const debounceMs = 300;
```

**Correcto:**

```ts
import { LIST_STATUS, TIMEOUT_MS } from "@/app/constants";

if (status === LIST_STATUS.PENDING) { ... }
const debounceMs = TIMEOUT_MS.DEBOUNCE.SEARCH;
```

**Excepciones permitidas** (no inventar una constante para esto): `0`/`1`/`-1` como índice, incremento, o sentinela de "ninguno"; límites de loop atados directo a `array.length`; clases utilitarias que ya cubren el valor (spacing/sizing de Tailwind).

## 2. `as const` en todo objeto de constantes

```ts
// Incorrecto — se ensancha a `string`, mutable
export const LIST_STATUS = {
  PENDING: "pending",
};

// Correcto — tipos literales, forma congelada
export const LIST_STATUS = {
  PENDING: "pending",
} as const;
```

## 3. Claves ordenadas alfabéticamente dentro de cada objeto

Mantiene el objeto fácil de escanear, evita duplicados silenciosos, y genera diffs limpios.

```ts
// Correcto
export const LIST_STATUS = {
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  PENDING: "pending",
} as const;
```

## 4. Un dominio semántico por objeto — nunca un mega-objeto

No armar un único objeto `CONSTANTS` o `STRINGS` plano para toda la app. Separar por dominio para que cada consumidor importe solo lo que necesita:

```ts
// Incorrecto
export const APP = { LIST_PENDING: "pending", BUTTON_PRIMARY: "primary", TOAST_ERROR_MS: 8000 };

// Correcto
export const LIST_STATUS = { PENDING: "pending" } as const;
export const BUTTON_VARIANT = { PRIMARY: "primary" } as const;
export const TOAST_TIMEOUT_MS = { ERROR: 8000 } as const;
```

## 5. Claves en `SCREAMING_SNAKE_CASE` que describen el significado

Nunca abreviar una clave salvo que el valor mismo esté abreviado, y las claves numéricas describen el **significado**, nunca el dígito:

```ts
// Incorrecto
export const TIME = { LH: 23, DEBOUNCE_MS: 300 };

// Correcto
export const TIME = {
  LAST_HOUR: 23,
} as const;

export const TIMEOUT_MS = {
  DEBOUNCE: { SEARCH: 300 },
} as const;
```

## 6. Exportar desde un solo barrel

Toda constante se re-exporta desde un único `app/constants/index.ts`. Nunca dejar un valor de dominio compartido como un `const x = 300` local dentro de un componente — si se usa más de una vez, o si un typo ahí sería un bug real, pertenece a `constants/`.

## 7. Derivar tipos con `typeof` + `keyof`, nunca escribir una unión a mano

```ts
// Incorrecto — se desincroniza del objeto con el tiempo
export type ListStatusType = "pending" | "completed" | "cancelled";

// Correcto
export const LIST_STATUS = {
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  PENDING: "pending",
} as const;

export type ListStatusType = (typeof LIST_STATUS)[keyof typeof LIST_STATUS];
```

## 8. Números mágicos — agrupación anidada para valores relacionados

Al centralizar literales numéricos (timeouts, tamaños, límites), anidar por subdominio en vez de colapsar en un objeto plano; mantener orden alfabético en cada nivel de anidación:

```ts
export const TIMEOUT_MS = {
  DEBOUNCE: {
    SEARCH: 300,
    SELECT: 150,
  },
  POLLING: {
    SHORT: 5_000,
    STANDARD: 30_000,
  },
  TOAST: {
    ERROR: 8_000,
    SUCCESS: 4_000,
  },
} as const;
```

Incluir la unidad en el objeto o en el nombre de la clave cuando pueda haber ambigüedad (`TIMEOUT_MS`, `MAX_FILE_SIZE_BYTES`) — nunca dejar un número suelto donde la unidad haya que adivinarla por contexto.

## Aplicando esto en la práctica

1. Ver un string/número crudo a punto de entrar a un diff → revisar si ya existe una constante que lo cubra (buscar primero, no duplicar).
2. Si ninguna aplica, extender el objeto de dominio más cercano, o crear uno nuevo siguiendo §§2–8.
3. Re-exportar desde el barrel.
4. Nunca introducir un segundo archivo plano de "constantes varias" — todo valor tiene un hogar en un dominio semántico.
