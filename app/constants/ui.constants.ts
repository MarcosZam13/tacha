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
