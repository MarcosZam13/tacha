export interface AssigneeSwitchProps {
  isChecked: boolean;
  isDisabled: boolean;
  /** Nombre accesible: dice a qué lista pertenece ("Encargado, Lista general"). */
  label: string;
  onToggle: () => void;
}
