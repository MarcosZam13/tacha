import { ICON_SIZE, ICON_STROKE_WIDTH } from "@/constants";
import type { IconProps } from "./models/IconProps.interface";

const SIZE_CLASS_NAME: Record<string, string> = {
  [ICON_SIZE.SMALL]: "h-4 w-4",
  [ICON_SIZE.MEDIUM]: "h-5 w-5",
  [ICON_SIZE.LARGE]: "h-6 w-6",
};

/**
 * Un ícono de lucide-react con el tamaño y el trazo de la app (SCRUM-145).
 * Siempre es decorativo (aria-hidden): el nombre accesible lo pone el botón
 * o el texto de al lado, así los tests que buscan por nombre no cambian.
 * lucide-react 1.55 ya agrega aria-hidden solo; lo dejamos explícito para no
 * depender de ese detalle de la librería.
 * Toma el color del texto del padre (currentColor): para pintarlo, se pinta
 * el botón, p. ej. `text-tacha-danger`.
 */
export const Icon = ({ icon: IconGlyph, size = ICON_SIZE.MEDIUM }: IconProps): React.JSX.Element => (
  <IconGlyph
    aria-hidden="true"
    focusable="false"
    strokeWidth={ICON_STROKE_WIDTH}
    className={`shrink-0 ${SIZE_CLASS_NAME[size]}`}
  />
);
