import type { CheckboxProps } from "./models/CheckboxProps.interface";

/**
 * Cuadrado redondeado (~7px, `rounded-tacha-checkbox`) — nunca circular
 * (DESIGN.md 2.4). En item-row esto es solo indicador visual, el área
 * táctil real es la fila completa; acá sigue siendo interactivo por si
 * se usa suelto (ej. formularios, "aceptar términos").
 */
export const Checkbox = ({ isChecked, onChange, label }: CheckboxProps): React.JSX.Element => (
  <label className="flex items-center gap-2 font-body text-sm text-tacha-text">
    <button
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      onClick={() => onChange(!isChecked)}
      className={`h-5 w-5 shrink-0 rounded-tacha-checkbox border-2 transition-colors ${
        isChecked ? "border-tacha-teal bg-tacha-teal" : "border-tacha-border bg-tacha-surface"
      }`}
    />
    {label ? <span>{label}</span> : null}
  </label>
);
