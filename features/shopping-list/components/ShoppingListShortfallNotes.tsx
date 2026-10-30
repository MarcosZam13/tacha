import type { ShoppingListShortfallNotesProps } from "./models/ShoppingListShortfallNotesProps.interface";

/**
 * Avisos de faltante de receta o plan bajo el producto (HU-76). Solo texto,
 * chico y secundario: sin botones ni acciones (CA-02). No se tacha con la
 * fila: lo tachado es el producto, el faltante sigue pendiente (SCRUM-115).
 * Es una lista para que el lector de pantalla anuncie cuántos son.
 */
export const ShoppingListShortfallNotes = ({ id, notes }: ShoppingListShortfallNotesProps): React.JSX.Element => (
  <ul
    id={id}
    className="px-3 pb-2 font-body text-xs text-tacha-textsec"
  >
    {notes.map((note) => (
      <li key={note}>{note}</li>
    ))}
  </ul>
);
