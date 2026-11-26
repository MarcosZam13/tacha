import type { ShoppingListShortfallNotesProps } from "./models/ShoppingListShortfallNotesProps.interface";

/**
 * Avisos de faltante de receta o plan bajo el producto (HU-76). Solo texto,
 * chico y secundario: sin botones ni acciones (CA-02). No se tacha con la
 * fila: lo tachado es el producto, el faltante sigue pendiente (SCRUM-115).
 * Es una lista para que el lector de pantalla anuncie cuántos son. La key
 * suma la posición porque dos recetas con el mismo nombre y faltante darían el
 * mismo texto; la lista no se reordena, así que la posición es estable.
 */
export const ShoppingListShortfallNotes = ({ id, notes }: ShoppingListShortfallNotesProps): React.JSX.Element => (
  <ul
    id={id}
    className="px-3 pb-2 font-body text-xs text-tacha-textsec"
  >
    {notes.map((note, position) => (
      <li key={`${position}-${note}`}>{note}</li>
    ))}
  </ul>
);
