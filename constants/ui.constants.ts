export const BUTTON_VARIANT = {
  DESTRUCTIVE: "destructive",
  PRIMARY: "primary",
  SECONDARY: "secondary",
} as const;

export type ButtonVariantType = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

export const CHIP_TONE = {
  NEUTRAL: "neutral",
  TEAL: "teal",
  TERRACOTTA: "terracotta",
  // Mismo fondo y borde que TERRACOTTA, con texto de contraste AA (SCRUM-92, D27).
  TERRACOTTA_STRONG: "terracottaStrong",
} as const;

export type ChipToneType = (typeof CHIP_TONE)[keyof typeof CHIP_TONE];

export const FORM_FIELD_STATE = {
  DEFAULT: "default",
  ERROR: "error",
} as const;

export type FormFieldStateType = (typeof FORM_FIELD_STATE)[keyof typeof FORM_FIELD_STATE];

export const SPINNER_SIZE = {
  LARGE: "large",
  MEDIUM: "medium",
  SMALL: "small",
} as const;

export type SpinnerSizeType = (typeof SPINNER_SIZE)[keyof typeof SPINNER_SIZE];

// Teclas que maneja el Modal compartido (SCRUM-142): Escape pide cerrar y Tab no deja salir el foco.
export const KEYBOARD_KEY = {
  ESCAPE: "Escape",
  TAB: "Tab",
} as const;

// Espera antes de devolver el foco a un Modal abierto cuando sale con un clic fuera o un botón que se
// deshabilita (SCRUM-142, D3). 0 ms es "en la próxima tarea": corre después de que React aplique un cierre
// del mismo evento, así la vuelta no pisa un foco que la pantalla movió a propósito justo antes de cerrar.
export const MODAL_FOCUS_RETURN_DELAY_MS = 0;

// Candidatos a recibir el foco con Tab dentro de un diálogo (SCRUM-142, regla 6). Los deshabilitados,
// tabindex="-1" y lo que está dentro de [hidden] o [inert] los descarta getFocusableElements.
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[tabindex]",
  "[contenteditable]:not([contenteditable='false'])",
].join(",");

// Valores del atributo `type` de los inputs de un formulario: el tipo decide el teclado del celular y si se oculta el texto.
export const INPUT_TYPE = {
  EMAIL: "email",
  PASSWORD: "password",
  TEXT: "text",
} as const;

// Valores del atributo `autocomplete` de los campos de contraseña: ayudan a los gestores de contraseñas.
export const AUTOCOMPLETE = {
  CURRENT_PASSWORD: "current-password",
  NEW_PASSWORD: "new-password",
} as const;

export type AutocompleteType = (typeof AUTOCOMPLETE)[keyof typeof AUTOCOMPLETE];

// Tamaños del avatar de perfil (foto o iniciales): el chico va en la navegación, el grande en la pantalla de perfil.
export const AVATAR_SIZE = {
  LARGE: "large",
  SMALL: "small",
} as const;

export type AvatarSizeType = (typeof AVATAR_SIZE)[keyof typeof AVATAR_SIZE];
