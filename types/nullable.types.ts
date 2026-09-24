/** Todavía no resuelto en ningún sentido — ausente o pendiente de cargar. */
export type Nullable<T> = T | null | undefined;

/** Definitivamente ausente (ej. refs). */
export type NullableRef<T> = T | null;

/** Opcional, nunca explícitamente vaciado a null. */
export type NullableUndefined<T> = T | undefined;
