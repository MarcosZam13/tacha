import type { ItemRowProps } from "./models/ItemRowProps.interface";

/**
 * Fila de producto: checkbox + nombre + meta + badge. Toda la fila es el
 * área táctil para tachar/destachar (DESIGN.md 2.4, ajuste 2026-08-19) — el
 * checkbox visual es solo indicador de estado, no el único punto táctil, así
 * que no lleva su propio onClick separado del contenedor.
 */
export const ItemRow = ({ isChecked, onToggle, name, meta, badge }: ItemRowProps): React.JSX.Element => (
  <button
    type="button"
    onClick={onToggle}
    className="flex w-full items-center gap-3 rounded-tacha-badge px-3 py-2 text-left transition-colors hover:bg-tacha-chipbg/40"
  >
    <span
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 rounded-tacha-checkbox border-2 ${
        isChecked ? "border-tacha-teal bg-tacha-teal" : "border-tacha-border bg-tacha-surface"
      }`}
    />
    <span className="flex-1">
      <span
        className={`block font-body text-sm ${
          isChecked ? "text-tacha-textsec line-through" : "text-tacha-text"
        }`}
      >
        {name}
      </span>
      {meta ? <span className="block font-body text-xs text-tacha-textsec">{meta}</span> : null}
    </span>
    {badge}
  </button>
);
