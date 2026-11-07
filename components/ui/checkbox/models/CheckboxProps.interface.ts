export interface CheckboxProps {
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
  label?: string;
  // Nombre para lectores de pantalla cuando no hay texto visible al lado.
  ariaLabel?: string;
  isDisabled?: boolean;
}
