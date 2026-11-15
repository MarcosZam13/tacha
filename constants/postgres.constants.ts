// Códigos de error de Postgres que los servicios traducen a un resultado de la
// app en vez de un error genérico. Los usan recetas (SCRUM-95), modo compra
// (SCRUM-67), Finanzas (SCRUM-91) y el encargado de las listas (SCRUM-108).
// CHECK_VIOLATION: una RPC rechazó un dato que rompería una regla (en Finanzas,
// un periodo con ajustes en negativo).
// INVALID_TEXT_REPRESENTATION: un id de la URL que no es un uuid.
// INVALID_PARAMETER_VALUE: una RPC rechazó un valor que no es válido para esa fila (en las listas,
// un encargado sin acceso a la lista).
// NO_DATA_FOUND: una RPC no encontró la fila (no existe, se borró o es ajena).
export const POSTGRES_ERROR_CODE = {
  CHECK_VIOLATION: "23514",
  INVALID_PARAMETER_VALUE: "22023",
  INVALID_TEXT_REPRESENTATION: "22P02",
  NO_DATA_FOUND: "P0002",
} as const;
