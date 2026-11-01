// Pantallas que informan que tienen cambios sin guardar (SCRUM-55). Cada una usa su propio id para retirar
// solo su aviso al guardarse o al desmontarse, sin borrar el de otra. Se suma una clave por pantalla.
export const UNSAVED_CHANGES_SOURCE = {
  PROFILE: "profile",
} as const;

export type UnsavedChangesSourceType =
  (typeof UNSAVED_CHANGES_SOURCE)[keyof typeof UNSAVED_CHANGES_SOURCE];
