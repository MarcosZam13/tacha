// Reglas y niveles de fortaleza de contraseña. Los comparten el registro y el login.

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_LABEL = {
  STRENGTH: "Seguridad",
} as const;

export const PASSWORD_RULE = {
  DIGIT: "digit",
  LOWERCASE: "lowercase",
  MIN_LENGTH: "minLength",
  SPECIAL: "special",
  UPPERCASE: "uppercase",
} as const;

export type PasswordRuleType = (typeof PASSWORD_RULE)[keyof typeof PASSWORD_RULE];

// Orden en que se muestran los requisitos que faltan.
export const PASSWORD_RULES = [
  PASSWORD_RULE.MIN_LENGTH,
  PASSWORD_RULE.LOWERCASE,
  PASSWORD_RULE.UPPERCASE,
  PASSWORD_RULE.DIGIT,
  PASSWORD_RULE.SPECIAL,
] as const;

// Con la bandera `u`, \p{Ll} y \p{Lu} reconocen también ñ, á, é, etc.
export const PASSWORD_PATTERN = {
  DIGIT: /\d/,
  LOWERCASE: /\p{Ll}/u,
  SPECIAL: /[^\p{L}\p{N}]/u,
  UPPERCASE: /\p{Lu}/u,
} as const;

export const PASSWORD_REQUIREMENT_MESSAGE: Record<PasswordRuleType, string> = {
  [PASSWORD_RULE.DIGIT]: "Debe incluir al menos un número.",
  [PASSWORD_RULE.LOWERCASE]: "Debe incluir al menos una minúscula.",
  [PASSWORD_RULE.MIN_LENGTH]: `Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  [PASSWORD_RULE.SPECIAL]: "Debe incluir al menos un carácter especial.",
  [PASSWORD_RULE.UPPERCASE]: "Debe incluir al menos una mayúscula.",
};

export const PASSWORD_STRENGTH_LEVEL = {
  MEDIUM: "medium",
  STRONG: "strong",
  WEAK: "weak",
} as const;

export type PasswordStrengthLevelType =
  (typeof PASSWORD_STRENGTH_LEVEL)[keyof typeof PASSWORD_STRENGTH_LEVEL];

// Cantidad mínima de reglas cumplidas para alcanzar cada nivel; por debajo de MEDIUM_MIN es débil.
export const PASSWORD_STRENGTH_THRESHOLD = {
  MEDIUM_MIN: 3,
  STRONG_MIN: 5,
} as const;

export const PASSWORD_STRENGTH_LABEL: Record<PasswordStrengthLevelType, string> = {
  [PASSWORD_STRENGTH_LEVEL.MEDIUM]: "Media",
  [PASSWORD_STRENGTH_LEVEL.STRONG]: "Fuerte",
  [PASSWORD_STRENGTH_LEVEL.WEAK]: "Débil",
};
