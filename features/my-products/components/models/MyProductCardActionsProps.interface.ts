export interface MyProductCardActionsProps {
  onDelete: () => void;
  onEdit: () => void;
  /** Para el nombre accesible de cada botón ("Editar Queso casero"): hay uno por tarjeta. */
  productName: string;
}
