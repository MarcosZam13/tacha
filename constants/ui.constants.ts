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
