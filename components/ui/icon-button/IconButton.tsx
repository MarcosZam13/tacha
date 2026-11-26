import { ICON_BUTTON_TONE } from "@/constants";
import { Icon } from "../icon/Icon";
import type { IconButtonProps } from "./models/IconButtonProps.interface";

const TONE_CLASS_NAME: Record<string, string> = {
  [ICON_BUTTON_TONE.NEUTRAL]: "text-tacha-textsec hover:bg-tacha-chipbg hover:text-tacha-teal",
  [ICON_BUTTON_TONE.DANGER]: "text-tacha-danger hover:bg-tacha-danger/10",
};

/**
 * Botón de solo ícono para acciones secundarias (SCRUM-158: ver detalle,
 * eliminar). Sin borde, para que no compita con la acción principal de la fila.
 * El ícono es decorativo y el nombre accesible es `label`, en un sr-only, igual
 * que antes con los caracteres sueltos: los tests que buscan "Eliminar" o
 * "Ver detalle" siguen encontrando el mismo botón.
 * 44 × 44 px en celular (área táctil mínima, SCRUM-148); en desktop baja a 36.
 */
export const IconButton = ({
  icon,
  label,
  tone = ICON_BUTTON_TONE.NEUTRAL,
  isDisabled = false,
  onClick,
}: IconButtonProps): React.JSX.Element => (
  <button
    type="button"
    disabled={isDisabled}
    onClick={onClick}
    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-tacha-badge transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:h-9 md:w-9 ${TONE_CLASS_NAME[tone]}`}
  >
    <Icon icon={icon} />
    <span className="sr-only">{label}</span>
  </button>
);
