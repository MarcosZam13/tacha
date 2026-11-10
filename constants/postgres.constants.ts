// Códigos de error de Postgres que los servicios traducen a un resultado de la
// app en vez de un error genérico. Los usan recetas (SCRUM-95), modo compra
// (SCRUM-67) y "¿Qué hiciste?" (SCRUM-115).
// INVALID_PARAMETER_VALUE: una RPC rechazó lo que se le pidió (ej. resolver el
// faltante de una fila que otro miembro ya destachó, SCRUM-115).
// INVALID_TEXT_REPRESENTATION: un id de la URL que no es un uuid.
// NO_DATA_FOUND: una RPC no encontró la fila (no existe, se borró o es ajena).
export const POSTGRES_ERROR_CODE = {
  INVALID_PARAMETER_VALUE: "22023",
  INVALID_TEXT_REPRESENTATION: "22P02",
  NO_DATA_FOUND: "P0002",
} as const;
