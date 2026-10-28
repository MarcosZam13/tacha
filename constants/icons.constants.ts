// Íconos de la app (SCRUM-145, DESIGN.md §2.4 "Iconos"). Librería única: lucide-react.
// Acá van solo el tamaño y el trazo comunes; qué ícono usa cada pantalla lo
// decide cada feature en sus propias constantes, igual que sus textos.
export const ICON_SIZE = {
  LARGE: "large",
  MEDIUM: "medium",
  SMALL: "small",
} as const;

export type IconSizeType = (typeof ICON_SIZE)[keyof typeof ICON_SIZE];

// Un solo grosor de trazo para toda la app (DESIGN.md 2.4: "iconografía outline
// consistente, un solo grosor de trazo").
export const ICON_STROKE_WIDTH = 2;
