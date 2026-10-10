// Códigos de error de Postgres que los servicios traducen a un resultado de la
// app en vez de un error genérico. Los usan recetas (SCRUM-95) y modo compra
// (SCRUM-67).
// INVALID_TEXT_REPRESENTATION: un id de la URL que no es un uuid.
// NO_DATA_FOUND: una RPC no encontró la fila (no existe, se borró o es ajena).
export const POSTGRES_ERROR_CODE = {
  INVALID_TEXT_REPRESENTATION: "22P02",
  NO_DATA_FOUND: "P0002",
} as const;
