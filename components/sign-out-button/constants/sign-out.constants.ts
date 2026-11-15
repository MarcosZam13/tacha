export const SIGN_OUT_TEXT = {
  CANCEL: "Seguir editando",
  CONFIRM: "Cerrar sesión",
  CONFIRM_BODY: "Tenés cambios sin guardar. Si cerrás sesión, se pierden.",
  CONFIRM_TITLE: "¿Cerrar sesión?",
  SIGNING_OUT: "Cerrando sesión...",
  TRIGGER: "Cerrar sesión",
} as const;

export const SIGN_OUT_STATUS = {
  CONFIRMING: "confirming",
  IDLE: "idle",
  SIGNING_OUT: "signingOut",
} as const;

export type SignOutStatusType = (typeof SIGN_OUT_STATUS)[keyof typeof SIGN_OUT_STATUS];
